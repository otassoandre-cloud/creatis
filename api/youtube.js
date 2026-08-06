/* ===== CRÉATIS — YouTube API (channel + video + video-meta TikTok/Instagram) ===== */
/* POST /api/youtube  Body: { type: 'channel', input } | { type: 'video', videoUrl } | { type: 'video-meta', url } */

const YT_API = 'https://www.googleapis.com/youtube/v3';
const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const REPURPOSE_SERVICE_URL = (process.env.REPURPOSE_SERVICE_URL || '').trim();
const REPURPOSE_SERVICE_SECRET = (process.env.REPURPOSE_SERVICE_SECRET || '').trim();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_URL || 'https://creatis.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { type } = req.body || {};
  if (type === 'channel') return handleChannel(req, res);
  if (type === 'video') return handleVideo(req, res);
  if (type === 'video-meta') return handleVideoMeta(req, res);
  if (type === 'latest-video') return handleLatestVideo(req, res);
  return res.status(400).json({ error: 'Paramètre "type" requis : "channel", "video", "video-meta" ou "latest-video"' });
}

/* ============================================================
 * LATEST-VIDEO — "la dernière vidéo de X" → URL analysable
 * Utilisé par la commande vocale de clips-v2.
 *
 * Coût en quota (10 000 unités/jour pour TOUT le site) :
 *   search.list = 100 · channels?forHandle = 1 · playlistItems = 1 · videos = 1
 * D'où la résolution en cascade : channelId fourni par le client > cache
 * d'instance > handle > recherche par nom. Le champ `channel_id` renvoyé doit
 * être mémorisé côté client : la 2ᵉ demande sur le même créateur coûte 2 unités
 * au lieu de 102.
 * ============================================================ */

const _cacheChaines = new Map(); // nom normalisé → channelId, vit tant que l'instance est chaude

async function handleLatestVideo(req, res) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'YOUTUBE_API_KEY non configurée',
      setup: 'Ajoute YOUTUBE_API_KEY dans les variables Vercel — console.cloud.google.com → APIs → YouTube Data API v3 → Credentials → API Key'
    });
  }

  const { query, channelId: channelIdConnu, minDuration, titre } = req.body || {};
  const nom = (query || '').trim();
  const dureeMin = Number.isFinite(+minDuration) ? Math.max(0, +minDuration) : 300;
  if (!nom && !channelIdConnu) return res.status(400).json({ error: 'query ou channelId requis' });

  const cle = nom.toLowerCase().replace(/\s+/g, ' ');
  let quota = 0;

  try {
    // ── 1. Résolution de la chaîne, du moins cher au plus cher ──
    let channelId = (channelIdConnu || '').trim();
    let channelTitle = '';

    if (!/^UC[\w-]{22}$/.test(channelId)) channelId = '';
    if (!channelId && _cacheChaines.has(cle)) channelId = _cacheChaines.get(cle);

    if (!channelId) {
      // Un nom prononcé (« Yomi Denzel ») n'est pas un handle, mais le handle d'un créateur
      // EST presque toujours son nom sans espaces (@yomidenzel). On tente ces variantes à
      // 1 unité pièce avant de payer les 100 unités de search.list : sans ça une commande
      // vocale coûtait 50× le prix d'un lien collé à la main, pour un résultat identique.
      for (const handle of _candidatsHandle(nom)) {
        const params = new URLSearchParams({ part: 'snippet', forHandle: handle, key: apiKey });
        const r = await fetch(`${YT_API}/channels?${params}`);
        const data = await r.json(); quota += 1;
        _checkApiError(data);
        const item = data.items?.[0];
        if (!item) continue;
        // Un handle deviné peut tomber sur un homonyme. On n'accepte que si le titre renvoyé
        // correspond au nom demandé — sinon mieux vaut payer la vraie recherche que lancer
        // l'analyse sur la vidéo du mauvais créateur.
        if (!_titreCorrespond(item.snippet?.title, nom)) continue;
        channelId = item.id; channelTitle = item.snippet?.title || '';
        break;
      }
    }

    // Une chaîne devinée par son handle peut être un homonyme SANS vidéos : « underscore »
    // tombe sur une chaîne vide alors que la vraie s'appelle « Underscore_ ». Le titre
    // correspond, la chaîne existe, et pourtant il n'y a rien à analyser. On retient donc que
    // cette piste est une supposition, pour pouvoir payer la vraie recherche si elle échoue.
    const devine = !!channelId && !channelIdConnu && !_cacheChaines.has(cle);

    const chercherParNom = async () => {
      const params = new URLSearchParams({ part: 'snippet', type: 'channel', maxResults: 5, q: nom, key: apiKey });
      const r = await fetch(`${YT_API}/search?${params}`);
      const data = await r.json(); quota += 100;
      _checkApiError(data);
      const item = (data.items || [])[0];
      return {
        id: item?.id?.channelId || item?.snippet?.channelId || '',
        titre: item?.snippet?.title || ''
      };
    };

    if (!channelId) {
      const t = await chercherParNom();
      channelId = t.id; channelTitle = t.titre;
    }

    if (!channelId) {
      return res.status(404).json({ error: `Aucune chaîne trouvée pour « ${nom} »`, quota_used: quota });
    }

    // ── 2. Chercher la vidéo. Si la chaîne venait d'un handle deviné et ne donne rien, on
    // recommence avec la vraie recherche : l'homonyme vide ne doit pas faire échouer la
    // commande alors que la bonne chaîne existe.
    let scan = await _derniereVideoLongue(channelId, channelTitle, apiKey, dureeMin, titre);
    quota += scan.quota;

    if (!scan.trouvee && devine) {
      const t = await chercherParNom();
      if (t.id && t.id !== channelId) {
        channelId = t.id; channelTitle = t.titre;
        scan = await _derniereVideoLongue(channelId, channelTitle, apiKey, dureeMin, titre);
        quota += scan.quota;
      }
    }

    if (cle && channelId) _cacheChaines.set(cle, channelId);

    if (!scan.inspectees) {
      return res.status(404).json({ error: 'Cette chaîne n\'a aucune vidéo publique', quota_used: quota });
    }
    if (!scan.trouvee) {
      return res.status(404).json({
        error: `Aucune vidéo d'au moins ${Math.round(dureeMin / 60)} min parmi les ${scan.inspectees} dernières de ${channelTitle || nom} — cette chaîne ne publie que des formats courts`,
        channel_id: channelId,
        quota_used: quota
      });
    }

    return res.status(200).json({ ...scan.trouvee, videos_inspectees: scan.inspectees, quota_used: quota });

  } catch (e) {
    const msg = e.message || 'Erreur YouTube';
    const estQuota = /quota/i.test(msg);
    return res.status(estQuota ? 429 : 500).json({ error: msg, quota_used: quota });
  }
}

/* Remonte la playlist « uploads » d'une chaîne (UC… → UU…, déduite sans appel API) jusqu'à
   trouver une vidéo assez longue.

   Une seule page de 15 ne suffit PAS : Yomi Denzel poste 4 Shorts par jour, sa dernière vidéo
   de 16 min était déjà en 15ᵉ position — le lendemain elle sortait de la fenêtre et la commande
   répondait « aucune vidéo longue » alors qu'elle existait. Pages de 50 (même coût qu'une page
   de 15 : 1 unité), 4 pages max = 200 vidéos, ~8 unités. */
async function _derniereVideoLongue(channelId, channelTitle, apiKey, dureeMin, titreVoulu) {
  const cible = _normNom(titreVoulu || '');
  const playlistId = 'UU' + channelId.slice(2);
  const MAX_PAGES = 4;
  let pageToken = '', inspectees = 0, trouvee = null, quota = 0;

  for (let page = 0; page < MAX_PAGES && !trouvee; page++) {
    const pParams = new URLSearchParams({ part: 'contentDetails', playlistId, maxResults: 50, key: apiKey });
    if (pageToken) pParams.set('pageToken', pageToken);
    const pRes = await fetch(`${YT_API}/playlistItems?${pParams}`);
    const pData = await pRes.json(); quota += 1;
    if (pData.error && pRes.status === 404) return { trouvee: null, inspectees: 0, quota };
    _checkApiError(pData);

    const ids = (pData.items || []).map(i => i.contentDetails?.videoId).filter(Boolean);
    if (!ids.length) break;
    inspectees += ids.length;

    // Durées + titres de la page entière, un seul appel (1 unité)
    const vParams = new URLSearchParams({ part: 'contentDetails,snippet', id: ids.join(','), key: apiKey });
    const vRes = await fetch(`${YT_API}/videos?${vParams}`);
    const vData = await vRes.json(); quota += 1;
    _checkApiError(vData);

    // Filtre : assez longue, ni live ni première
    const retenues = (vData.items || [])
      .filter(v => (v.snippet?.liveBroadcastContent || 'none') === 'none')
      .map(v => ({
        channel_id: channelId,
        channel_title: v.snippet?.channelTitle || channelTitle,
        video_id: v.id,
        url: `https://www.youtube.com/watch?v=${v.id}`,
        title: v.snippet?.title || '',
        thumbnail: v.snippet?.thumbnails?.medium?.url || '',
        duration_seconds: _dureeIsoEnSecondes(v.contentDetails?.duration),
        published_at: v.snippet?.publishedAt || ''
      }))
      .filter(v => v.duration_seconds >= dureeMin);

    if (cible) {
      // Vidéo demandée par son titre : on la cherche dans la page, du plus précis au plus
      // souple. Les titres YouTube sont bourrés d'emojis et de majuscules, et la dictée ne
      // rend ni la ponctuation ni la casse — la comparaison se fait donc sur le titre
      // normalisé, et un simple mot suffit à désigner la bonne vidéo.
      const exact = retenues.find(v => _normNom(v.title) === cible);
      const inclus = retenues.find(v => _normNom(v.title).includes(cible));
      const choisie = exact || inclus;
      if (choisie) { trouvee = choisie; break; }
      // pas dans cette page : on continue de remonter la playlist
    } else if (retenues.length) {
      // La playlist descend déjà du plus récent au plus ancien : la 1ʳᵉ page qui contient une
      // vidéo longue contient LA bonne. On retrie quand même, videos.list ne garantit pas l'ordre.
      retenues.sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
      trouvee = retenues[0];
    }

    pageToken = pData.nextPageToken || '';
    if (!pageToken) break;
  }
  return { trouvee, inspectees, quota };
}

function _extraireHandle(entree) {
  const s = (entree || '').trim();
  const m = s.match(/youtube\.com\/@([\w.-]+)/);
  if (m) return '@' + m[1];
  if (s.startsWith('@') && !/\s/.test(s)) return s;
  return null;
}

/* Minuscules, accents retirés, ponctuation retirée — pour comparer un nom dicté
   (« Yomi Denzel », « yomi denzel ») à un titre de chaîne (« Yomi Denzel »). */
function _normNom(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

/* Handles à essayer pour un nom dicté, du plus probable au moins probable.
   Un @handle ou une URL explicite court-circuite les devinettes. */
function _candidatsHandle(nom) {
  const explicite = _extraireHandle(nom);
  if (explicite) return [explicite];
  const base = _normNom(nom);
  // Les handles YouTube font 3 à 30 caractères — hors bornes, inutile de dépenser une unité.
  if (base.length < 3 || base.length > 30) return [];
  const mots = (nom || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const cands = ['@' + base];
  if (mots.length > 1 && mots.join('.').length <= 30) cands.push('@' + mots.join('.'));
  return cands;
}

/* Le titre renvoyé par YouTube correspond-il vraiment au nom demandé ? */
function _titreCorrespond(titre, nom) {
  const a = _normNom(titre), b = _normNom(nom);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function _dureeIsoEnSecondes(duree) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(duree || '');
  if (!m) return 0;
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
}

/* ============================================================
 * VIDEO-META HANDLER — TikTok / Instagram via Railway yt-dlp
 * ============================================================ */
async function handleVideoMeta(req, res) {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'url requis' });
  if (!REPURPOSE_SERVICE_URL) return res.status(503).json({ error: 'Service Railway non configuré' });
  try {
    const r = await fetch(`${REPURPOSE_SERVICE_URL}/video-meta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}`,
      },
      body: JSON.stringify({ url }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

/* ============================================================
 * CHANNEL HANDLER
 * ============================================================ */
async function handleChannel(req, res) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'YOUTUBE_API_KEY non configurée',
      setup: 'Ajoute YOUTUBE_API_KEY dans les variables Vercel — console.cloud.google.com → APIs → YouTube Data API v3 → Credentials → API Key'
    });
  }

  const { input } = req.body || {};
  if (!input) return res.status(400).json({ error: 'Paramètre "input" requis (URL ou @handle)' });

  try {
    const { type: inputType, value } = _parseInput(input.trim());
    const chaine = await _getChaine(inputType, value, apiKey);
    if (!chaine) return res.status(404).json({ error: `Chaîne introuvable pour "${input}" — vérifie l'URL ou le @handle` });

    const topVideos = await _getTopVideos(chaine.id, apiKey);
    const recentes = await _getVideosRecentes(chaine.id, apiKey);
    const analyse = _analyser(chaine, topVideos);

    return res.status(200).json({ chaine, topVideos, videosRecentes: recentes, analyse, timestampCollecte: Date.now() });
  } catch (err) {
    console.error('[youtube channel] Erreur:', err.message);
    return res.status(500).json({ error: err.message || 'Erreur lors de l\'analyse de la chaîne' });
  }
}

/* ============================================================
 * VIDEO HANDLER
 * ============================================================ */
async function handleVideo(req, res) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'YOUTUBE_API_KEY manquante' });

  const { videoUrl } = req.body || {};
  if (!videoUrl) return res.status(400).json({ error: 'videoUrl requis' });

  const videoId = _extraireVideoId(videoUrl.trim());
  if (!videoId) return res.status(400).json({ error: `URL invalide — impossible d'extraire l'ID vidéo de : ${videoUrl}` });

  try {
    const [video, comments] = await Promise.all([_fetchVideo(videoId, apiKey), _fetchComments(videoId, apiKey)]);
    if (!video) return res.status(404).json({ error: 'Vidéo introuvable ou privée' });

    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
    let transcript = null;
    let transcriptSource = 'none';

    if (geminiKey) {
      transcript = await _analyserAvecGemini(videoId, video, geminiKey);
      if (transcript) transcriptSource = 'gemini';
    }

    if (!transcript) {
      transcript = await _fetchTranscriptVTT(videoId);
      if (transcript) transcriptSource = 'vtt';
    }

    return res.status(200).json({ video, comments, transcript, transcriptSource, videoId });
  } catch (err) {
    console.error('[youtube video]', err.message);
    return res.status(500).json({ error: err.message });
  }
}

/* ============================================================
 * CHANNEL HELPERS
 * ============================================================ */
function _parseInput(input) {
  const handleMatch = input.match(/youtube\.com\/@([\w.-]+)/);
  if (handleMatch) return { type: 'handle', value: '@' + handleMatch[1] };

  const channelIdMatch = input.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
  if (channelIdMatch) return { type: 'id', value: channelIdMatch[1] };

  const customMatch = input.match(/youtube\.com\/(?:c\/|user\/)([\w.-]+)/);
  if (customMatch) return { type: 'search', value: customMatch[1] };

  if (input.startsWith('@')) return { type: 'handle', value: input };
  if (input.startsWith('UC') && input.length > 10) return { type: 'id', value: input };
  return { type: 'search', value: input };
}

async function _getChaine(type, value, apiKey) {
  let params;

  if (type === 'handle') {
    params = new URLSearchParams({ part: 'snippet,statistics', forHandle: value, key: apiKey });
    const r = await fetch(`${YT_API}/channels?${params}`);
    const data = await r.json();
    _checkApiError(data);
    const item = data.items?.[0];
    if (item) return _formatChaine(item);
  }

  if (type === 'id') {
    params = new URLSearchParams({ part: 'snippet,statistics', id: value, key: apiKey });
    const r = await fetch(`${YT_API}/channels?${params}`);
    const data = await r.json();
    _checkApiError(data);
    const item = data.items?.[0];
    if (item) return _formatChaine(item);
  }

  if (type === 'search') {
    params = new URLSearchParams({ part: 'snippet', q: value, type: 'channel', maxResults: 1, key: apiKey });
    const r = await fetch(`${YT_API}/search?${params}`);
    const data = await r.json();
    _checkApiError(data);
    const channelId = data.items?.[0]?.id?.channelId;
    if (!channelId) return null;
    return _getChaine('id', channelId, apiKey);
  }

  return null;
}

function _formatChaine(item) {
  return {
    id: item.id,
    nom: item.snippet?.title || '',
    description: item.snippet?.description?.substring(0, 500) || '',
    avatar: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
    abonnes: parseInt(item.statistics?.subscriberCount || 0),
    vues: parseInt(item.statistics?.viewCount || 0),
    videos: parseInt(item.statistics?.videoCount || 0),
    pays: item.snippet?.country || 'FR'
  };
}

async function _getTopVideos(channelId, apiKey) {
  try {
    const searchParams = new URLSearchParams({ part: 'snippet', channelId, type: 'video', order: 'viewCount', maxResults: 10, key: apiKey });
    const searchRes = await fetch(`${YT_API}/search?${searchParams}`);
    const searchData = await searchRes.json();
    _checkApiError(searchData);

    const ids = (searchData.items || []).map(v => v.id?.videoId).filter(Boolean).join(',');
    if (!ids) return [];

    const videoParams = new URLSearchParams({ part: 'snippet,statistics,contentDetails', id: ids, key: apiKey });
    const videoRes = await fetch(`${YT_API}/videos?${videoParams}`);
    const videoData = await videoRes.json();

    return (videoData.items || []).map(v => ({
      id: v.id,
      titre: v.snippet?.title || '',
      description: v.snippet?.description?.substring(0, 300) || '',
      tags: v.snippet?.tags || [],
      vues: parseInt(v.statistics?.viewCount || 0),
      likes: parseInt(v.statistics?.likeCount || 0),
      commentaires: parseInt(v.statistics?.commentCount || 0),
      duree: v.contentDetails?.duration || '',
      miniature: v.snippet?.thumbnails?.maxres?.url || v.snippet?.thumbnails?.high?.url || '',
      datePublication: v.snippet?.publishedAt || ''
    }));
  } catch { return []; }
}

async function _getVideosRecentes(channelId, apiKey) {
  try {
    const params = new URLSearchParams({ part: 'snippet', channelId, type: 'video', order: 'date', maxResults: 5, key: apiKey });
    const res = await fetch(`${YT_API}/search?${params}`);
    const data = await res.json();
    return (data.items || []).map(v => ({
      id: v.id?.videoId,
      titre: v.snippet?.title || '',
      miniature: v.snippet?.thumbnails?.medium?.url || '',
      date: v.snippet?.publishedAt || ''
    }));
  } catch { return []; }
}

function _analyser(chaine, topVideos) {
  const titres = topVideos.map(v => v.titre);

  const patterns = {
    avecChiffres: titres.filter(t => /\d/.test(t)).length,
    questions: titres.filter(t => /\?/.test(t) || /^(comment|pourquoi|quand)/i.test(t)).length,
    avecEmojis: titres.filter(t => /\p{Emoji}/u.test(t)).length,
    personnels: titres.filter(t => /j['']ai|mon |ma |mes /i.test(t)).length,
    listicles: titres.filter(t => /top\s*\d|\d\s+(raisons|astuces|erreurs|conseils)/i.test(t)).length
  };
  const dominant = Object.entries(patterns).sort((a, b) => b[1] - a[1])[0]?.[0] || 'varié';

  const durees = topVideos.map(v => {
    const m = v.duree?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return 0;
    return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0);
  }).filter(d => d > 0);
  const dureeMoy = durees.length ? Math.round(durees.reduce((s, d) => s + d, 0) / durees.length) : 0;
  const format = dureeMoy < 60 ? 'Short' : dureeMoy < 300 ? 'Court (1-5 min)' : dureeMoy < 900 ? 'Moyen (5-15 min)' : dureeMoy < 1800 ? 'Long (15-30 min)' : 'Très long (30+ min)';

  const tagMap = {};
  for (const v of topVideos) for (const t of (v.tags || [])) tagMap[t.toLowerCase()] = (tagMap[t.toLowerCase()] || 0) + 1;
  const tagsFrequents = Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([t]) => t);

  const taux = topVideos.map(v => v.vues > 0 ? ((v.likes + v.commentaires) / v.vues) * 100 : 0);
  const tauxEngagement = taux.length ? Math.round((taux.reduce((s, t) => s + t, 0) / taux.length) * 10) / 10 : 0;

  const texteNiche = [chaine.description, ...titres.slice(0, 5), ...tagsFrequents.slice(0, 10)].join(' ').toLowerCase();
  const niches = [
    { nom: 'Finance & Investissement', mots: ['bourse','finance','investissement','crypto','trading','épargne','argent'] },
    { nom: 'Développement Personnel', mots: ['productivité','mindset','discipline','motivation','succès','habitudes'] },
    { nom: 'Gaming', mots: ['gaming','jeux','gameplay','fps','stream','esport','minecraft'] },
    { nom: 'Tech & IA', mots: ['tech','code','programmation','ia','intelligence artificielle','startup'] },
    { nom: 'Fitness & Santé', mots: ['fitness','musculation','sport','nutrition','régime','entraînement'] },
    { nom: 'Cuisine & Food', mots: ['recette','cuisine','gastronomie','pâtisserie','chef','plat'] },
    { nom: 'Voyage & Aventure', mots: ['voyage','travel','aventure','backpack','expatrié','nomade'] },
    { nom: 'Entrepreneuriat & Business', mots: ['entrepreneur','business','startup','freelance','marketing','revenus'] },
    { nom: 'Lifestyle & Vlogs', mots: ['vlog','lifestyle','routine','haul','déco','beauté','mode'] },
    { nom: 'Éducation & Tutoriels', mots: ['tutoriel','tuto','apprendre','formation','cours','guide'] }
  ];
  let meilleure = { nom: 'Contenu Général', score: 0 };
  for (const n of niches) {
    const score = n.mots.filter(m => texteNiche.includes(m)).length;
    if (score > meilleure.score) meilleure = { nom: n.nom, score };
  }

  return {
    nicheDetectee: meilleure.nom,
    tauxEngagement,
    stylesTitres: {
      formatDominant: dominant,
      longueurMoyenne: titres.length ? Math.round(titres.reduce((s, t) => s + t.length, 0) / titres.length) : 0,
      exemples: titres,
      conseil: `Format dominant : ${dominant}`
    },
    formatsGagnants: { formatPrincipal: format, dureeMoyenneMin: Math.round(dureeMoy / 60) },
    tagsFrequents,
    tonCreateur: { style: 'tutoiement', chaleur: 'professionnel', utiliseTutoiement: true, utiliseSouvemojis: false, exemples: [] },
    heuresPublication: 'Non déterminé',
    motsClesDescription: tagsFrequents.slice(0, 15)
  };
}

function _checkApiError(data) {
  if (data.error) {
    const msg = data.error.message || 'Erreur YouTube API';
    if (data.error.code === 403) throw new Error('Clé API YouTube invalide ou quota dépassé — vérifie YOUTUBE_API_KEY dans Vercel');
    if (data.error.code === 400) throw new Error(`Requête invalide : ${msg}`);
    throw new Error(msg);
  }
}

/* ============================================================
 * VIDEO HELPERS
 * ============================================================ */
async function _analyserAvecGemini(videoId, video, geminiKey) {
  try {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const prompt = `Tu regardes cette vidéo YouTube intégralement. Donne une analyse complète et fidèle en français :

1. TRANSCRIPT : Retranscris les passages clés et les idées principales dites dans la vidéo (le plus fidèle possible au contenu réel).
2. STRUCTURE : Plan de la vidéo (intro, parties principales, conclusion).
3. INSIGHTS : Les 5-10 idées, conseils, ou informations les plus importantes dites dans la vidéo.
4. AMBIANCE : Ton du créateur, style de narration, éléments visuels marquants.
5. CITATIONS : 3-5 phrases ou citations marquantes dites mot pour mot dans la vidéo.

Sois exhaustif et précis. Base-toi uniquement sur ce qui est dit et montré dans la vidéo.`;

    const body = {
      contents: [{ parts: [{ fileData: { mimeType: 'video/mp4', fileUri: youtubeUrl } }, { text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
    };

    const r = await fetch(`${GEMINI_API}?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.warn('[Gemini video]', r.status, err?.error?.message || '');
      return null;
    }

    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? text.substring(0, 12000) : null;
  } catch (e) {
    console.warn('[Gemini video] erreur:', e.message);
    return null;
  }
}

function _extraireVideoId(input) {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return null;
}

async function _fetchVideo(id, key) {
  const url = `${YT_API}/videos?id=${id}&part=snippet,statistics,contentDetails&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) return null;

  const s = item.snippet;
  const st = item.statistics;
  const dur = _parseDuration(item.contentDetails?.duration);

  return {
    id,
    titre: s.title,
    description: (s.description || '').substring(0, 3000),
    tags: s.tags || [],
    categorie: s.categoryId,
    datePublication: s.publishedAt ? new Date(s.publishedAt).toLocaleDateString('fr-FR') : '',
    vues: parseInt(st.viewCount || 0).toLocaleString('fr-FR'),
    likes: parseInt(st.likeCount || 0).toLocaleString('fr-FR'),
    nombreCommentaires: parseInt(st.commentCount || 0).toLocaleString('fr-FR'),
    duree: dur,
    miniature: s.thumbnails?.maxres?.url || s.thumbnails?.high?.url || ''
  };
}

async function _fetchComments(id, key) {
  try {
    const url = `${YT_API}/commentThreads?videoId=${id}&part=snippet&maxResults=50&order=relevance&key=${key}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map(item => {
      const c = item.snippet.topLevelComment.snippet;
      return {
        auteur: c.authorDisplayName,
        texte: c.textDisplay.replace(/<[^>]+>/g, '').substring(0, 500),
        likes: parseInt(c.likeCount || 0),
        date: c.publishedAt ? new Date(c.publishedAt).toLocaleDateString('fr-FR') : ''
      };
    }).sort((a, b) => b.likes - a.likes);
  } catch { return []; }
}

async function _fetchTranscriptVTT(id) {
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${id}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      }
    });
    const html = await pageRes.text();
    const match = html.match(/"captionTracks":(\[.*?\])/s);
    if (!match) return null;

    let tracks;
    try { tracks = JSON.parse(match[1]); } catch { return null; }

    const track = tracks.find(t => t.languageCode === 'fr' && !t.kind)
      || tracks.find(t => t.languageCode === 'fr')
      || tracks.find(t => t.languageCode === 'en' && !t.kind)
      || tracks.find(t => t.languageCode === 'en')
      || tracks[0];

    if (!track?.baseUrl) return null;

    const captionRes = await fetch(track.baseUrl + '&fmt=vtt');
    const vtt = await captionRes.text();

    const texte = vtt
      .replace(/WEBVTT[\s\S]*?\n\n/, '')
      .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}[^\n]*/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'")
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .reduce((acc, line) => { if (acc[acc.length - 1] !== line) acc.push(line); return acc; }, [])
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .substring(0, 8000);

    return texte || null;
  } catch { return null; }
}

function _parseDuration(iso) {
  if (!iso) return '';
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return '';
  const h = parseInt(m[1] || 0), min = parseInt(m[2] || 0), s = parseInt(m[3] || 0);
  if (h > 0) return `${h}h${String(min).padStart(2, '0')}min`;
  return `${min}:${String(s).padStart(2, '0')}`;
}
