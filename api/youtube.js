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
  return res.status(400).json({ error: 'Paramètre "type" requis : "channel", "video" ou "video-meta"' });
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
