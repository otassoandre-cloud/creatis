/* ===== VERCEL FUNCTION — Proxy Repurpose (transcription + contenu multi-plateforme) =====
   POST /api/repurpose
   Body: { url }   ← URL YouTube de la vidéo
   Env: REPURPOSE_SERVICE_URL, REPURPOSE_SERVICE_SECRET, GROQ_API_KEY
   Flow: Cloud Run (yt-dlp + faster-whisper → transcript) → Groq (génération contenu)
*/

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();
const REPURPOSE_SERVICE_URL = (process.env.REPURPOSE_SERVICE_URL || '').trim();
const REPURPOSE_SERVICE_SECRET = (process.env.REPURPOSE_SERVICE_SECRET || '').trim();
const GROQ_KEY = (process.env.GROQ_API_KEY || '').trim();
const TOGETHER_KEY = (process.env.TOGETHER_API_KEY || '').trim();
const GEMINI_KEY = (process.env.GEMINI_API_KEY || '').trim();
const RESIDENTIAL_PROXY_URL = (process.env.RESIDENTIAL_PROXY_URL || '').trim();
// Cookies YouTube (exportés depuis un navigateur connecté) pour accéder aux vidéos géo-restreintes
const YOUTUBE_COOKIES = (process.env.YOUTUBE_COOKIES || '').trim();

// Fetch proxy pour les appels YouTube (contourne le bot detection sur IPs datacenter)
// Promise singleton : tous les appelants concurrents attendent la même promesse → pas de race condition
let _proxyAgentPromise = null;

async function _getProxyAgent() {
  if (!RESIDENTIAL_PROXY_URL) return null;
  if (!_proxyAgentPromise) {
    _proxyAgentPromise = (async () => {
      try {
        const { HttpsProxyAgent } = await import('https-proxy-agent');
        const agent = new HttpsProxyAgent(RESIDENTIAL_PROXY_URL, { keepAlive: true, maxSockets: 5 });
        console.log('[proxy] Residential proxy actif (keepAlive)');
        return agent;
      } catch (e) {
        console.warn('[proxy] https-proxy-agent indispo:', e.message);
        return null;
      }
    })();
  }
  return _proxyAgentPromise;
}

// Cookies de bypass consentement GDPR YouTube (requis pour IPs européennes)
const CONSENT_COOKIES = 'CONSENT=YES+1; SOCS=CAISHAgCEhJnd3NfMjAyNDA2MjItMF9SQzEaAmZyIAEaBgiA';

// Fetch YouTube avec cookies + proxy résidentiel si configurés
async function _fetchYT(url, opts = {}) {
  const hasCookie = opts.headers?.Cookie || opts.headers?.cookie;
  if (url.includes('youtube.com') && !hasCookie) {
    const cookieVal = YOUTUBE_COOKIES ? `${CONSENT_COOKIES}; ${YOUTUBE_COOKIES}` : CONSENT_COOKIES;
    opts = { ...opts, headers: { ...opts.headers, 'Cookie': cookieVal } };
  }
  const agent = await _getProxyAgent();
  if (agent) {
    const nodeFetch = require('node-fetch');
    try {
      const r = await nodeFetch(url, { ...opts, agent });
      if (r.status < 400) {
        // Détecter les pages d'erreur proxy (Webshare quota dépassé, etc.)
        const body = await r.text();
        if (body.includes('Bandwidth Limit') || body.includes('bandwidth limit') || body.includes('proxy activity is suspended')) {
          console.warn('[proxy] quota dépassé — retry direct');
        } else {
          return new Response(body, { status: r.status, headers: Object.fromEntries(r.headers.entries()) });
        }
      } else {
        console.warn(`[proxy] ${r.status} — retry direct`);
      }
    } catch (e) {
      console.warn('[proxy] erreur réseau — retry direct:', e.message);
    }
  }
  return fetch(url, { ...opts });
}

// Credits par plan
const CREDITS = { gratuit: 0, starter: 5, pro: 20, studio: 20 };

/* Quotas mensuels — DOIT rester aligné avec CONFIG.PLANS dans js/config.js.
   `videos` = analyses lancées, `clips` = clips exportés. On plafonne les deux : une analyse coûte
   surtout du CPU de transcription, un export coûte du téléchargement + de l'encodage. Ne limiter
   que les exports laissait quelqu'un analyser 200 vidéos sans rien exporter — le poste le plus cher. */
const QUOTAS = {
  // Gratuit : 1 analyse pour voir ses clips en aperçu, mais AUCUN téléchargement.
  gratuit: { videos: 2,  clips: 0   },
  starter: { videos: 5,  clips: 20  },
  pro:     { videos: 30, clips: 150 },
  studio:  { videos: 30, clips: 150 },
};

const _moisCourant = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}`; };

/* Compteur du mois en cours : si la clé de reset stockée n'est pas le mois courant, le compteur
   est périmé et vaut 0. Évite d'avoir à faire tourner un cron de remise à zéro. */
function _compteurDuMois(valeur, cleReset) {
  return cleReset === _moisCourant() ? (valeur || 0) : 0;
}

/* Vérifie le quota de vidéos analysées. Retourne null si OK, sinon la réponse d'erreur à renvoyer. */
function verifierQuotaVideos(userData) {
  const plan = userData?.plan || 'gratuit';
  const max = (QUOTAS[plan] || QUOTAS.gratuit).videos;
  const used = _compteurDuMois(userData?.videos_count, userData?.videos_reset);
  if (used < max) return null;
  if (plan === 'gratuit') {
    return { status: 403, body: { ok: false, error: 'upgrade_required', message: 'Passe à Pro pour analyser de nouvelles vidéos' } };
  }
  return { status: 429, body: {
    ok: false, error: 'quota_atteint',
    message: `Limite atteinte : ${max} vidéos analysées ce mois-ci. Le compteur repart le 1er du mois — ou passe au plan supérieur.`,
    videos_used: used, videos_max: max, plan
  } };
}

async function verifyToken(token) {
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    if (!payload.sub || (payload.exp && Date.now() / 1000 > payload.exp)) return null;
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY }
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u?.id ? { id: u.id, email: u.email } : null;
  } catch { return null; }
}

async function getUserPlan(userId) {
  if (!process.env.SUPABASE_SERVICE_KEY) return 'gratuit';
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=plan,repurpose_count,repurpose_reset,videos_count,videos_reset`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    });
    if (!r.ok) return 'gratuit';
    const rows = await r.json();
    return rows?.[0] || { plan: 'gratuit', repurpose_count: 0 };
  } catch { return { plan: 'gratuit', repurpose_count: 0 }; }
}

async function incrementRepurposeCount(userId) {
  if (!process.env.SUPABASE_SERVICE_KEY) return;
  try {
    // Récupérer le count avant increment pour détecter la 1ère analyse
    const before = await getUserPlan(userId);
    // BUG CORRIGÉ : on envoyait la CHAÎNE "repurpose_count + 1" dans le PATCH. PostgREST n'évalue
    // pas les expressions SQL dans un body JSON — il tentait de caster ce texte en entier, échouait
    // en 400, et l'erreur était avalée par le catch. Le compteur d'analyses n'a donc jamais été
    // incrémenté. On lit puis on écrit la valeur, comme le fait déjà logClipExport.
    // Ce compteur suit les VIDÉOS ANALYSÉES (videos_count), distinct des clips exportés
    // (repurpose_count), pour pouvoir plafonner les deux séparément.
    const moisCourant = _moisCourant();
    const dejaFait = _compteurDuMois(before?.videos_count, before?.videos_reset);
    await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ videos_count: dejaFait + 1, videos_reset: moisCourant })
    });
    // Email de relance 1h après la 1ère analyse gratuite
    if ((before?.repurpose_count || 0) === 0 && before?.plan === 'gratuit') {
      _scheduleClipsRelanceEmail(userId).catch(() => {});
    }
  } catch {}
}

async function _scheduleClipsRelanceEmail(userId) {
  if (!process.env.SUPABASE_SERVICE_KEY || !process.env.BREVO_API_KEY) return;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=email,nom`, {
      headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` }
    });
    const rows = await r.json();
    const user = rows?.[0];
    if (!user?.email) return;
    const nom = user.nom || user.email.split('@')[0] || 'Créateur';
    // Délai 1h (Vercel serverless ne peut pas sleep — on envoie après 1h via scheduled email)
    // Pour l'instant : envoi immédiat avec messaging "dans 1h" → à remplacer par un cron
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY.trim() },
      body: JSON.stringify({
        sender: { email: 'contact@creatis.app', name: 'Créatis' },
        to: [{ email: user.email, name: nom }],
        subject: `${nom}, tes clips viraux sont prêts 🎬`,
        htmlContent: `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0a0f0a;color:#fff;padding:32px;border-radius:12px;">
          <div style="font-size:22px;font-weight:900;margin-bottom:8px;">Créatis<span style="color:#10b981;">.</span></div>
          <h2 style="font-size:20px;margin:0 0 12px;">Tes 3 clips sont prêts, ${nom} 🎬</h2>
          <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 20px;">
            Tu viens de créer tes premiers clips viraux. Mais ta vidéo contient encore <strong style="color:#fff;">7+ moments forts</strong> que l'IA a identifiés — et que tu n'as pas encore débloqués.
          </p>
          <div style="background:#111;border:1px solid #222;border-radius:10px;padding:16px;margin-bottom:20px;">
            <div style="font-size:13px;color:#10b981;font-weight:700;margin-bottom:8px;">🔒 Clips encore disponibles dans ta vidéo</div>
            <div style="color:#aaa;font-size:13px;">Score 94 · Score 91 · Score 89 · Score 87…</div>
          </div>
          <a href="https://creatis.app/app.html" style="display:inline-block;background:#10b981;color:#000;font-weight:800;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:15px;margin-bottom:20px;">
            Débloquer tous mes clips — 9,95€ →
          </a>
          <p style="color:#555;font-size:12px;">Offre -50% le 1er mois · Annulable à tout moment</p>
        </div>`
      })
    });
  } catch {}
}

function extractVideoId(url) {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /shorts\/([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function _parseInnertubeStreams(data, videoId, clientName) {
  if (!data.streamingData) {
    const status = data.playabilityStatus?.status || '?';
    const reason = data.playabilityStatus?.reason || data.playabilityStatus?.messages?.[0] || status;
    console.warn(`[Innertube/${clientName}] no streamingData status=${status} reason="${reason}"`);
    throw new Error(reason);
  }
  console.log(`[Innertube/${clientName}] status=${data.playabilityStatus?.status} formats=${data.streamingData.formats?.length||0} adaptive=${data.streamingData.adaptiveFormats?.length||0}`);

  const combined = (data.streamingData.formats || []).filter(f => f.url);
  if (combined.length) {
    combined.sort((a, b) => (b.height||0) - (a.height||0));
    const best = combined.find(f => (f.height||999) <= 720) || combined[combined.length - 1];
    console.log(`[Innertube/${clientName}] combined itag=${best.itag} height=${best.height}`);
    return { video_url: best.url };
  }

  const adaptive = data.streamingData.adaptiveFormats || [];
  const videoStream = adaptive.filter(f => f.url && f.mimeType?.startsWith('video/mp4') && (f.height||0) <= 720)
    .sort((a, b) => (b.height||0) - (a.height||0))[0];
  const audioStream = adaptive.filter(f => f.url && f.mimeType?.startsWith('audio/mp4'))
    .sort((a, b) => (b.bitrate||0) - (a.bitrate||0))[0];
  if (videoStream && audioStream) {
    console.log(`[Innertube/${clientName}] adaptive video=${videoStream.height}p audio=${audioStream.bitrate}bps`);
    return { video_url: videoStream.url, audio_url: audioStream.url };
  }
  // audio-only fallback (pour transcription seule)
  if (audioStream) {
    console.log(`[Innertube/${clientName}] audio-only ${audioStream.bitrate}bps`);
    return { video_url: audioStream.url };
  }
  throw new Error('No usable stream URL');
}

async function getInnertubeStreamUrl(videoId) {
  // ANDROID sans gl/hl en premier : bypass geo-restriction côté Innertube API
  const CLIENTS = [
    {
      name: 'ANDROID',
      clientName: '3',
      version: '20.10.38',
      ua: 'com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip',
      extra: { androidSdkVersion: 34, osName: 'Android', osVersion: '14' },
      noGl: true,
    },
    {
      name: 'IOS',
      clientName: '5',
      version: '19.45.4',
      ua: 'com.google.ios.youtube/19.45.4 (iPhone14,5; U; CPU iOS 16_0 like Mac OS X)',
      extra: { deviceModel: 'iPhone14,5', osName: 'iPhone', osVersion: '16.0.0.20A362' },
      apiKey: 'AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUA',
      noGl: true,
    },
    {
      name: 'MWEB',
      clientName: '2',
      version: '2.20231121.01.00',
      ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
      extra: {},
    },
    {
      name: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
      clientName: '85',
      version: '2.0',
      ua: 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/6.0 TV Safari/538.1',
      extra: {},
      embedUrl: 'https://www.youtube.com',
    },
    {
      name: 'WEB_EMBEDDED_PLAYER',
      clientName: '56',
      version: '1.20231201.01.00',
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      extra: {},
      embedUrl: 'https://www.youtube.com',
    },
  ];

  let lastErr = null;
  for (const client of CLIENTS) {
    try {
      console.log(`[Innertube] trying ${client.name}...`);
      const clientCtx = {
        clientName: client.name,
        clientVersion: client.version,
        ...(client.noGl ? {} : { hl: 'fr', gl: 'FR' }),
        ...client.extra,
      };
      const body = {
        videoId,
        context: {
          client: clientCtx,
          ...(client.embedUrl ? { thirdParty: { embedUrl: client.embedUrl } } : {}),
        },
      };
      const endpoint = client.apiKey
        ? `https://www.youtube.com/youtubei/v1/player?key=${client.apiKey}`
        : 'https://www.youtube.com/youtubei/v1/player';
      const r = await _fetchYT(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': client.ua,
          'X-YouTube-Client-Name': client.clientName,
          'X-YouTube-Client-Version': client.version,
        },
        body: JSON.stringify(body),
        timeout: 15000,
      });
      if (!r.ok) { lastErr = new Error(`HTTP ${r.status}`); console.warn(`[Innertube/${client.name}] HTTP ${r.status}`); continue; }
      const data = await r.json();
      return _parseInnertubeStreams(data, videoId, client.name);
    } catch (e) {
      console.warn(`[Innertube/${client.name}] failed: ${e.message}`);
      lastErr = e;
    }
  }
  throw lastErr || new Error('All Innertube clients failed');
}

async function _fetchYouTubePage(videoId) {
  const r = await _fetchYT(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
    },
    timeout: 9000,
  });
  if (!r.ok) throw new Error(`YouTube inaccessible (${r.status})`);
  return r.text();
}

function _parseCaptionTracks(html) {
  const m = html.match(/"captionTracks":\s*(\[.*?\])/s);
  if (!m) return null;
  try {
    return JSON.parse(m[1].replace(/\\u0026/g, '&').replace(/\\\\/g, '\\').replace(/\\"/g, '"'));
  } catch { return null; }
}

// Retourne les segments avec timestamps (pour l'identification de clips)
// Méthode A : page YouTube + piste ASR (LANGUE ORIGINALE — évite les sous-titres traduits).
// Meilleure pour la langue, mais l'IP Vercel est parfois bot-bloquée → on la time-boxe.
async function _captionsViaPage(videoId) {
  const html = await _fetchYouTubePage(videoId);
  const titleMatch = html.match(/<title>([^<]+)<\/title>/) || html.match(/"title":"([^"]{3,120})"/);
  const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').replace(/\\u[\dA-F]{4}/gi, c => String.fromCharCode(parseInt(c.slice(2), 16))) : '';
  const tracks = _parseCaptionTracks(html);
  if (!tracks?.length) return null;
  // Sélection identique à celle de _captionsViaNpm — elles divergeaient, et c'est CE chemin-ci qui
  // gagne la course. Il prenait la 1re piste ASR quelle que soit sa langue : sur une vidéo française
  // dont l'auteur a déclaré l'audio en anglais (ou qui porte une piste anglaise), on récupérait des
  // sous-titres anglais sur un contenu français. Une piste dont l'URL contient `tlang=` est une
  // TRADUCTION automatique — jamais l'original, donc exclue partout.
  const original = t => !/\btlang=/.test(t.baseUrl || '');
  const track = tracks.find(t => t.languageCode === 'fr' && t.kind === 'asr' && original(t))
    || tracks.find(t => t.languageCode === 'fr' && original(t))
    || tracks.find(t => t.kind === 'asr' && original(t))
    || tracks.find(original)
    || tracks[0];
  if (!track?.baseUrl) return null;
  const captionsUrl = track.baseUrl.replace(/\\u0026/g, '&') + '&fmt=json3';
  const cr = await _fetchYT(captionsUrl, { signal: AbortSignal.timeout(7000) });
  if (!cr.ok) return null;
  const data = await cr.json();
  const segments = (data.events || [])
    .filter(e => e.segs && e.tStartMs != null)
    .map(e => ({
      start: e.tStartMs / 1000,
      end: (e.tStartMs + (e.dDurationMs || 2000)) / 1000,
      text: e.segs.map(s => (s.utf8 || '').replace(/\n/g, ' ')).join('').trim(),
    }))
    .filter(s => s.text);
  if (!segments.length) return null;
  console.log(`[captions/page] ${segments.length} segments lang=${track.languageCode}`);
  return { segments, title, duration: segments[segments.length - 1].end };
}

// Méthode B : Railway (IP différente + cookies → contourne le bot-check, prépare fr/en).
async function _captionsViaRailway(videoId) {
  if (!REPURPOSE_SERVICE_URL) return null;
  const r = await fetch(`${REPURPOSE_SERVICE_URL}/transcript/${videoId}`, {
    headers: { 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) return null;
  const d = await r.json();
  if (!d.segments?.length) return null;
  console.log(`[captions/railway] ${d.segments.length} segments lang=${d.language}`);
  return { segments: d.segments, title: '', duration: d.segments[d.segments.length - 1].end };
}

// Méthode C (dernier recours) : npm générique (ne contrôle pas la langue).
async function _captionsViaNpm(videoId) {
  const { YoutubeTranscript } = require('youtube-transcript');
  const raw = await YoutubeTranscript.fetchTranscript(videoId, { fetch: _fetchYT });
  if (!raw?.length) return null;
  const segments = raw.map(s => ({
    start: s.offset / 1000,
    end: (s.offset + s.duration) / 1000,
    text: (s.text || '').replace(/\n/g, ' ').trim(),
  })).filter(s => s.text);
  if (!segments.length) return null;
  console.log(`[captions/npm] ${segments.length} segments (fallback générique)`);
  return { segments, title: '', duration: segments[segments.length - 1].end };
}

async function getYouTubeTranscriptSegments(videoId) {
  // PARALLÈLE : page (langue originale) ET Railway lancés en même temps → on obtient la latence
  // du plus rapide au lieu d'une cascade séquentielle (avant : jusqu'à 7s + 15s + npm empilés
  // quand l'IP Vercel était bot-bloquée). C'est LE fix « bloqué sur transcription ».
  const pageP    = _captionsViaPage(videoId).catch(e => { console.warn('[captions/page] fail:', e.message); return null; });
  const railwayP = _captionsViaRailway(videoId).catch(e => { console.warn('[captions/railway] fail:', e.message); return null; });

  // Préfère la page si elle répond vite (≤9s, meilleure langue) ; sinon prend Railway dès qu'il
  // est prêt (déjà en cours, aucun temps d'attente ajouté).
  const pageFast = await Promise.race([pageP, new Promise(r => setTimeout(() => r('__timeout__'), 9000))]);
  if (pageFast && pageFast !== '__timeout__' && pageFast.segments?.length) return pageFast;

  const railway = await railwayP;
  if (railway?.segments?.length) return railway;

  const pageLate = await pageP;
  if (pageLate?.segments?.length) return pageLate;

  try {
    const npm = await _captionsViaNpm(videoId);
    if (npm?.segments?.length) return npm;
  } catch (e) { console.warn('[captions/npm] fail:', e.message); }

  throw new Error('Pas de sous-titres disponibles pour cette vidéo');
}

// Transcription via Groq Whisper à partir d'une URL audio directe (Innertube CDN)
async function transcribeAudioUrl(audioUrl) {
  console.log('[whisper] downloading audio from CDN...');
  const audioRes = await fetch(audioUrl, { signal: AbortSignal.timeout(60000) });
  if (!audioRes.ok) throw new Error(`Audio CDN ${audioRes.status}`);
  const buf = Buffer.from(await audioRes.arrayBuffer());
  const sizeMb = buf.length / 1_048_576;
  console.log(`[whisper] ${sizeMb.toFixed(1)} MB → Groq`);
  if (sizeMb > 24) throw new Error(`Audio trop grand: ${sizeMb.toFixed(1)} MB`);

  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'audio/mp4' }), 'audio.mp4');
  form.append('model', 'whisper-large-v3');
  form.append('response_format', 'verbose_json');

  const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}` },
    body: form,
    signal: AbortSignal.timeout(120000),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(`Groq Whisper: ${e.error?.message || r.status}`); }
  const d = await r.json();
  const segments = (d.segments || []).map(s => ({ start: parseFloat(s.start), end: parseFloat(s.end), text: s.text.trim() }));
  console.log(`[whisper] ${segments.length} segments`);
  return { segments, duration: d.duration || 0 };
}

// Découpe les segments en morceaux CONTIGUS d'environ chunkChars caractères, avec un léger
// chevauchement — contrairement à un échantillonnage épars (1 segment sur N), ça garde à chaque
// fois un contexte local cohérent (nécessaire pour juger si un clip a un début/fin propre) tout
// en couvrant la vidéo entière au fil des morceaux, pas juste les 8-10 premières minutes.
function _chunkSegmentsForClips(segments, chunkChars = 7500, overlap = 5, maxChunks = 8) {
  const chunks = [];
  let cur = [], curLen = 0, chunkStart = 0, i = 0;
  while (i < segments.length) {
    const s = segments[i];
    cur.push(s);
    curLen += (s.text || '').length + 20;
    const isLast = i === segments.length - 1;
    if (curLen >= chunkChars || isLast) {
      chunks.push(cur);
      if (isLast) break;
      i = Math.max(chunkStart, i - overlap + 1) + 1;
      chunkStart = i;
      cur = []; curLen = 0;
    } else {
      i++;
    }
  }
  return chunks.slice(0, maxChunks);
}

async function _mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function _buildClipsPrompt(transcript, title, n, isChunk, extraHint = '') {
  return `Tu es un expert en création de contenu viral sur YouTube Shorts et TikTok. Analyse cet${isChunk ? ' EXTRAIT de' : 'te'} transcription et sélectionne les ${n} MEILLEURS moments qui feront le plus de vues.

CRITÈRES DE SÉLECTION (par ordre de priorité) :
1. HOOK fort dès les 3 premières secondes — phrase qui accroche immédiatement ("j'ai failli mourir", "personne ne le sait mais...", chiffre choc, question rhétorique)
2. ÉMOTION intense — surprise, rire, choc, admiration, révélation
3. AUTONOME — le clip se comprend sans contexte, commence et finit proprement sur une idée complète
4. TENSION ou CURIOSITÉ — l'audience veut savoir la suite
5. RÉPARTITION — couvre différentes parties de la vidéo, pas tous au même endroit

ÉVITER : moments trop longs sans action, transitions, intros/outros, passages plats sans émotion.${extraHint}

Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
{"clips":[{"start_time":12.5,"end_time":67.0,"title":"titre accrocheur court","hook":"phrase d'accroche courte et percutante (max 8-10 mots) que TU rédiges pour donner envie de regarder — pas besoin d'être une citation exacte du transcript, reformule/résume l'idée choc du clip (ex: \"Il a perdu 50 000€ en 3 minutes\")","score":88}]}

Règles : durée 30-90s, score 0-100 (sois exigeant : score 90+ = vraiment viral), ne coupe pas au milieu d'une phrase.

Transcription "${title}"${isChunk ? ' (extrait)' : ''} :
${transcript}`;
}

// Classifie le type de contenu (podcast, tuto, débat...) pour adapter les critères de viralité —
// un extrait de tutoriel ne se juge pas comme un extrait de débat. Un seul appel léger, réutilisé
// pour tous les morceaux du découpage.
async function _classifyContentType(sampleText) {
  if (!GROQ_KEY || !sampleText) return null;
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: `Classe ce contenu. Choisis un type parmi : podcast, interview, tutoriel, conférence, commentaire, débat, vlog, autre. Réponds UNIQUEMENT en JSON, sans markdown :\n{"content_type":"...","hint":"1 phrase sur ce qui rend CE type de contenu viral en clip court"}\n\nExtrait :\n${sampleText.slice(0, 2000)}` }],
        temperature: 0.3, max_tokens: 200, response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(10000), // indice optionnel : ne doit pas retarder le vrai travail
    });
    if (!r.ok) return null;
    const d = await r.json();
    const raw = d.choices?.[0]?.message?.content?.trim() || '';
    return JSON.parse(raw);
  } catch { return null; }
}

// Traduit les pics de volume audio tombant dans la fenêtre [start,end] d'un morceau en un indice
// textuel pour le LLM — signal invisible à l'écrit (cri, rire, réaction) qu'une analyse texte-only rate.
function _energyHintForRange(energyPeaks, start, end) {
  if (!energyPeaks?.length) return '';
  const inRange = energyPeaks.filter(t => t >= start && t <= end).map(t => Math.round(t));
  if (!inRange.length) return '';
  return `\n\nPICS DE VOLUME AUDIO détectés (indice supplémentaire — cri, rire, réaction forte, souvent invisible dans le texte) aux secondes : ${inRange.slice(0, 40).join(', ')}. À qualité égale, privilégie les clips qui contiennent un de ces pics.`;
}

// Chaîne de fallback Groq → Gemini → Together, retourne le texte brut du LLM ou null si tout échoue.
// Chaque étage est borné à ~30 s (et non 60) : un modèle qui n'a pas répondu en 30 s ne répondra
// pas, et trois étages à 60 s faisaient monter l'analyse à 180 s rien que pour le LLM — on a mesuré
// une analyse à 230 s en production. Pire cas désormais ~95 s pour toute la cascade.
async function _callClipLLM(prompt, _dbg) {
  let r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 4096, response_format: { type: 'json_object' } }),
    signal: AbortSignal.timeout(30000),
  });
  _dbg.groq_status = r.status;
  if (r.ok) _dbg.provider = 'groq';

  if (!r.ok && GEMINI_KEY) {
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 4096, responseMimeType: 'application/json' } }),
      signal: AbortSignal.timeout(30000),
    });
    _dbg.gemini_status = geminiRes.status;
    if (geminiRes.ok) {
      const gd = await geminiRes.json();
      const gt = gd.candidates?.[0]?.content?.parts?.[0]?.text || '';
      _dbg.provider = 'gemini';
      r = { ok: true, json: async () => ({ choices: [{ message: { content: gt } }] }) };
    } else { r = geminiRes; }
  }

  if (!r.ok && TOGETHER_KEY) {
    const tr = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOGETHER_KEY}` },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        messages: [
          { role: 'system', content: 'Tu es un expert YouTube Shorts. Réponds UNIQUEMENT avec du JSON valide, sans aucun texte avant ou après.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7, max_tokens: 4096
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (tr.ok) {
      const td = await tr.json();
      const tt = td.choices?.[0]?.message?.content || '';
      _dbg.provider = 'together';
      r = { ok: true, json: async () => ({ choices: [{ message: { content: tt } }] }) };
    } else { r = tr; }
  }

  if (!r.ok) return null;
  const raw = (await r.json()).choices?.[0]?.message?.content?.trim() || '';
  return raw;
}

function _parseClipsFromRaw(raw, videoId) {
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  const jsonStr = firstBrace !== -1 && lastBrace > firstBrace ? raw.slice(firstBrace, lastBrace + 1) : raw;
  let clips = [];
  try {
    const parsed = JSON.parse(jsonStr);
    clips = parsed.clips || parsed.extraits || parsed.results || parsed.moments || parsed.viral_clips || parsed.top_clips || (Array.isArray(parsed) ? parsed : []);
  } catch {
    const s = raw.indexOf('['), e = raw.lastIndexOf(']');
    if (s !== -1 && e > s) try { clips = JSON.parse(raw.slice(s, e + 1)); } catch {}
  }
  return clips
    .map(c => ({
      video_id: videoId,
      // Accepte noms EN et FR
      start: parseFloat(c.start_time ?? c.start ?? c.debut ?? c.temps_debut ?? c.begin ?? c.timestamp_start ?? c.heure_debut),
      end: parseFloat(c.end_time ?? c.end ?? c.fin ?? c.temps_fin ?? c.finish ?? c.timestamp_end ?? c.heure_fin),
      title: c.title || c.titre || c.name || c.nom || '',
      hook: c.hook || c.accroche || c.description || c.extrait || '',
      score: parseInt(c.score ?? c.note ?? c.viral_score ?? c.rating ?? c.score_viral) || 80
    }))
    .filter(c => !isNaN(c.start) && !isNaN(c.end) && c.end > c.start)
    .map(c => {
      // Étendre les clips trop courts à 60s (certains LLM retournent des clips de 5-10s)
      const minDur = 30, targetDur = 60, maxDur = 90;
      const dur = c.end - c.start;
      const end = dur < minDur ? c.start + targetDur : Math.min(c.end, c.start + maxDur);
      return { ...c, end };
    });
}

// Garde-fou anti-chevauchement en code (pas seulement dans le prompt) — nécessaire dès que
// plusieurs morceaux sont fusionnés, et rattrape aussi le cas où le modèle suit mal la consigne.
function _dedupeClips(clips) {
  const sorted = [...clips].sort((a, b) => (b.score || 0) - (a.score || 0));
  const kept = [];
  for (const c of sorted) {
    const dur = c.end - c.start;
    const overlaps = kept.some(k => Math.min(c.end, k.end) - Math.max(c.start, k.start) > 0.5 * dur);
    if (!overlaps) kept.push(c);
  }
  return kept;
}

function _uniformFallbackClips(segments, videoId, nClips, _dbg) {
  const totalDur = segments[segments.length - 1].end || segments[segments.length - 1].start + 30;
  return Array.from({ length: nClips }, (_, i) => {
    const start = Math.floor((totalDur / (nClips + 1)) * (i + 1));
    const seg = segments.find(s => s.start >= start) || segments[Math.floor(i / nClips * segments.length)];
    const s = seg ? seg.start : start;
    return { video_id: videoId, start: s, end: Math.min(s + 60, totalDur), title: `Moment ${i + 1}`, hook: seg?.text?.substring(0, 80) || '', score: 70, _dbg };
  });
}

// Identification des clips viraux via LLM (Groq → Gemini → Together), en plusieurs passes pour
// couvrir toute la vidéo sur les contenus longs.
async function identifyViralClips(segments, videoId, title, nClips, energyPeaks = []) {
  const _dbg = { groq: !!GROQ_KEY, gemini: !!GEMINI_KEY, together: !!TOGETHER_KEY, segments: segments.length, provider: 'none', groq_status: null, gemini_status: null, raw_sample: '', chunks: 0, content_type: null, energy_peaks: energyPeaks.length };
  console.log(`[clips] start — GROQ:${_dbg.groq} GEMINI:${_dbg.gemini} TOGETHER:${_dbg.together} segments:${_dbg.segments} energy_peaks:${energyPeaks.length}`);

  if (segments.length === 0) throw new Error('Transcription vide');

  const chunks = _chunkSegmentsForClips(segments);
  _dbg.chunks = chunks.length;
  const isChunked = chunks.length > 1;
  const perChunkN = isChunked ? Math.max(2, Math.min(nClips, 4)) : nClips;
  console.log(`[clips] ${chunks.length} morceau(x) (${_dbg.segments} segments)`);

  let contentHint = '';
  const typeInfo = await _classifyContentType(chunks[0].map(s => s.text).join(' '));
  if (typeInfo?.content_type) {
    contentHint = `\n\nType de contenu détecté : ${typeInfo.content_type}. ${typeInfo.hint || ''}`;
    _dbg.content_type = typeInfo.content_type;
  }

  /* BUDGET DE TEMPS GLOBAL. Chaque morceau déclenche sa propre cascade LLM (jusqu'à ~95 s), et les
     morceaux passent 3 par 3 : une vidéo longue = plusieurs vagues = 200 s et plus. Mesuré en
     production : une analyse à 230 s, et des échecs en série dès que le client coupe avant.
     Passé le budget, on arrête de lancer de nouveaux morceaux et on rend ce qu'on a déjà.
     Six clips issus des premiers morceaux valent infiniment mieux qu'une erreur au bout de 2 min. */
  const BUDGET_MS = 210000;
  const _debut = Date.now();
  let _abandonnes = 0;

  const chunkResults = await _mapWithConcurrency(chunks, 3, async (chunkSegs) => {
    if (Date.now() - _debut > BUDGET_MS) { _abandonnes++; return []; }
    try {
      const transcript = chunkSegs.map(s => `[${s.start.toFixed(1)}s] ${s.text}`).join('\n');
      const energyHint = _energyHintForRange(energyPeaks, chunkSegs[0].start, chunkSegs[chunkSegs.length - 1].end);
      const prompt = _buildClipsPrompt(transcript, title, perChunkN, isChunked, contentHint + energyHint);
      const raw = await _callClipLLM(prompt, _dbg);
      if (!raw) return [];
      _dbg.raw_sample = raw.slice(0, 200);
      return _parseClipsFromRaw(raw, videoId);
    } catch (e) {
      console.warn('[clips] morceau échoué:', e.message);
      return [];
    }
  });
  _dbg.chunks_abandonnes = _abandonnes;
  _dbg.duree_llm_ms = Date.now() - _debut;
  if (_abandonnes) console.warn(`[clips] budget ${BUDGET_MS}ms dépassé — ${_abandonnes}/${chunks.length} morceaux abandonnés`);

  const allClips = chunkResults.flat();
  console.log(`[clips] ${allClips.length} candidats avant dédoublonnage, sample:`, JSON.stringify(allClips[0] || {}).slice(0, 200));
  let clips = _dedupeClips(allClips);

  // Fallback : LLM n'a rien retourné d'utilisable sur AUCUN morceau → découpage uniforme
  if (clips.length === 0) {
    _dbg.provider = _dbg.provider + '_empty';
    console.warn('[clips] 0 clips après parsing, découpage uniforme. debug:', JSON.stringify(_dbg));
    return _uniformFallbackClips(segments, videoId, nClips, _dbg);
  }

  return clips.slice(0, nClips).map(c => ({ ...c, _dbg }));
}

// Reclassement visuel des clips candidats via Gemini Vision — combine le score texte (transcript)
// avec un signal visuel réel (expression, action à l'écran, cadrage) sur UNE frame par candidat.
// Ne prétend pas "regarder toute la vidéo" (source souvent longue, ça coûterait trop cher/trop
// lent) : affine seulement la sélection déjà pré-filtrée par le texte. Retourne null en best-effort
// (jamais bloquant) si Gemini est indisponible ou si le parsing échoue — l'appelant garde alors le
// classement texte tel quel.
async function rankClipsVisual(candidates, frames, nFinal) {
  if (!GEMINI_KEY) return null;
  const frameByIndex = new Map(frames.map(f => [f.i, f.data]));
  const parts = [{ text:
    `Tu es un expert en montage de clips viraux courts (TikTok/Reels/Shorts). Voici ${candidates.length} extraits candidats issus d'une même vidéo source, chacun avec son titre, son "hook" (accroche) et une frame représentative. Pour chaque candidat, évalue le potentiel viral RÉEL en te basant sur l'image (expression du visage, action à l'écran, qualité de cadrage, texte/graphismes visibles) ET les infos fournies. Choisis les ${nFinal} meilleurs et classe-les du meilleur au moins bon.\n\nRéponds UNIQUEMENT en JSON strict, sans texte autour, format exact :\n{"ranking":[{"i":<index du candidat>,"visual_score":<0-100>,"reason":"<1 phrase courte en français>"}]}\n(le tableau "ranking" doit contenir exactement ${nFinal} entrées, triées du meilleur au moins bon)\n\nCandidats :` }];
  for (const c of candidates) {
    const data = frameByIndex.get(c.i);
    if (!data) continue;
    parts.push({ text: `Candidat ${c.i} — titre: "${c.title}", hook: "${c.hook}", score texte: ${c.text_score ?? 'N/A'}` });
    parts.push({ inline_data: { mime_type: 'image/jpeg', data } });
  }
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.4, maxOutputTokens: 2048, responseMimeType: 'application/json' } }),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) { console.warn('[rank_clips_visual] Gemini', r.status, (await r.text().catch(() => '')).slice(0, 200)); return null; }
  const gd = await r.json();
  const raw = gd?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  try {
    const parsed = JSON.parse(raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim());
    const ranking = Array.isArray(parsed?.ranking) ? parsed.ranking : null;
    if (!ranking?.length) return null;
    return ranking.filter(x => typeof x.i === 'number').map(x => x.i);
  } catch (e) {
    console.warn('[rank_clips_visual] parse échoué:', e.message, raw.slice(0, 200));
    return null;
  }
}

async function getYouTubeTranscript(videoId) {
  const html = await _fetchYouTubePage(videoId);

  const titleMatch = html.match(/<title>([^<]+)<\/title>/) || html.match(/"title":"([^"]{3,120})"/);
  const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').replace(/\\u[\dA-F]{4}/gi, c => String.fromCharCode(parseInt(c.slice(2), 16))) : '';

  const tracks = _parseCaptionTracks(html);
  if (!tracks?.length) {
    throw new Error('Pas de sous-titres disponibles pour cette vidéo. Active les sous-titres automatiques sur YouTube, ou utilise une vidéo avec des sous-titres.');
  }

  // Une piste dont l'URL porte `tlang=` est une traduction automatique, pas l'original.
  const estOriginal = t => !/\btlang=/.test(t.baseUrl || '');
  const track = tracks.find(t => t.languageCode === 'fr' && t.kind === 'asr' && estOriginal(t))
    || tracks.find(t => t.languageCode === 'fr' && estOriginal(t))
    || tracks.find(t => t.kind === 'asr' && estOriginal(t))
    || tracks.find(estOriginal)
    || tracks[0];

  if (!track?.baseUrl) throw new Error('Aucune piste de sous-titres trouvable');

  const captionsUrl = track.baseUrl.replace(/\\u0026/g, '&') + '&fmt=json3';
  const captionsRes = await fetch(captionsUrl, { signal: AbortSignal.timeout(10000) });
  if (!captionsRes.ok) throw new Error('Impossible de récupérer les sous-titres');

  const captionsData = await captionsRes.json();
  const events = captionsData.events || [];
  const transcript = events
    .filter(e => e.segs)
    .map(e => e.segs.map(s => (s.utf8 || '').replace(/\n/g, ' ')).join(''))
    .filter(t => t.trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!transcript || transcript.length < 50) throw new Error('Transcription trop courte — vidéo peut-être sans paroles');

  const durationSec = events.length ? Math.round((events[events.length - 1].tStartMs || 0) / 1000) : 0;
  const duration = durationSec > 0 ? `${Math.floor(durationSec / 60)}m${durationSec % 60}s` : '';

  return { transcript, title, duration, r2_url: null };
}

// Fallback Railway: yt-dlp + proxy + Groq Whisper → segments horodatés
async function transcribeViaRailway(youtubeUrl) {
  if (!REPURPOSE_SERVICE_URL) throw new Error('Service Railway non configuré');
  console.log('[clips] fallback Railway transcription...');
  const r = await fetch(`${REPURPOSE_SERVICE_URL}/transcribe-segments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
    body: JSON.stringify({ youtube_url: youtubeUrl }),
    signal: AbortSignal.timeout(240000),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail || `Railway transcription (${r.status})`);
  }
  return r.json();
}

async function transcribeWithCloudRun(url) {
  const r = await fetch(`${REPURPOSE_SERVICE_URL}/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(180000)
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail || `Erreur transcription (${r.status})`);
  }
  return r.json();
}

async function generateContent(transcript, title, duration) {
  const prompt = `RÔLE : Tu es un expert en content marketing multiplateforme pour créateurs YouTube. Tu transformes des transcriptions vidéo en contenu viral optimisé pour chaque réseau.

VIDÉO : "${title || 'Vidéo YouTube'}" (${duration || '?'})

TRANSCRIPTION (extrait) :
${transcript.substring(0, 6000)}

MISSION : Génère du contenu multiplateforme prêt à publier basé sur cette vidéo.

## 🐦 TWEETS (5 tweets)
Pour chaque tweet : texte complet prêt à copier (max 280 caractères), avec emojis, hook fort et CTA vers la vidéo.
Format : [TWEET 1] ... [TWEET 2] ...

## 💼 POSTS LINKEDIN (3 posts)
Angle professionnel, storytelling, insights actionnables. 150-300 mots. Hook fort en première ligne. Terminer par une question pour engager.
Format : [LINKEDIN 1] ... [LINKEDIN 2] ...

## ⚡ IDÉES SHORTS (3 concepts)
Pour chaque Short : titre (<60 car), hook (0-3 sec), structure 45 secondes, CTA final.
Format : [SHORT 1] Titre: | Hook: | Structure: | CTA:

## 🖼️ CONCEPTS MINIATURES (3 idées)
Texte overlay, émotion du visage, couleurs dominantes, élément déclencheur de clic.
Format : [MINIATURE 1] Texte: | Émotion: | Style:

Réponds directement sans introduction. Tout en français.`;

  let r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.8, max_tokens: 4096 })
  });
  if ((r.status === 429 || r.status === 402) && GEMINI_KEY) {
    console.warn(`[content] Groq ${r.status}, fallback Gemini Flash`);
    const gr = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.8, maxOutputTokens: 4096 } })
    });
    if (!gr.ok) throw new Error('Erreur génération contenu');
    const gd = await gr.json();
    return gd.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  if (!r.ok) throw new Error('Erreur génération contenu');
  const data = await r.json();
  return data.choices?.[0]?.message?.content || '';
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  const isAllowed = origin.includes('creatis.app') || origin.includes('localhost') || origin.includes('vercel.app');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();


  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const contentType = req.headers['content-type'] || '';

  // ── Lire le body EN PREMIER avant tout await (évite de manquer les data events) ──
  const rawChunks = [];
  for await (const chunk of req) rawChunks.push(chunk);
  const rawBody = Buffer.concat(rawChunks);

  // ── Proxy multipart vers Railway (upload-video, transcribe-audio, reframe-clip) ──
  if (contentType.includes('multipart/form-data')) {
    if (!REPURPOSE_SERVICE_URL) return res.status(503).json({ error: 'Service non configuré' });
    const railwayEndpoint = (req.query && req.query.railway) || 'upload-video';
    // upload-video et transcribe-audio publics (analyse gratuite) ; reframe-clip = export Pro uniquement
    if (railwayEndpoint === 'reframe-clip') {
      const authUser2 = await verifyToken(token);
      if (!authUser2 && !isLocal) return res.status(401).json({ error: 'Connexion requise pour exporter' });
    }
    if (!['upload-video', 'transcribe-audio', 'reframe-clip'].includes(railwayEndpoint)) {
      return res.status(400).json({ error: 'Endpoint invalide' });
    }
    try {
      // Pour reframe-clip : injecter le plan vérifié côté serveur (le client ne peut pas le falsifier)
      let railwayTarget = `${REPURPOSE_SERVICE_URL}/${railwayEndpoint}`;
      if (railwayEndpoint === 'reframe-clip' && authUser2) {
        const planInfo = await getUserPlan(authUser2.id);
        railwayTarget += `?plan=${planInfo?.plan || 'gratuit'}`;
      }
      const railwayRes = await fetch(railwayTarget, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}`, 'Content-Type': contentType },
        body: rawBody,
      });
      if (railwayEndpoint === 'reframe-clip') {
        const buf = Buffer.from(await railwayRes.arrayBuffer());
        res.setHeader('Content-Type', railwayRes.headers.get('content-type') || 'video/mp4');
        return res.status(railwayRes.status).send(buf);
      }
      const data = await railwayRes.json().catch(() => ({ ok: false, error: 'Réponse invalide' }));
      return res.status(railwayRes.status).json(data);
    } catch (err) {
      return res.status(502).json({ error: `Proxy: ${err.message}` });
    }
  }

  // ── Parser le JSON body depuis le buffer déjà lu ──
  let body = {};
  try { body = JSON.parse(rawBody.toString('utf8')); } catch {}

  const mode = body.mode || 'text';
  const url = body.url || '';

  // Modes publics — pas d'auth requise (analyse gratuite, paywall au téléchargement)
  const PUBLIC_MODES = new Set(['upload-token', 'clips', 'rank_clips_visual', 'upload-status', 'log_lead', 'notify_clips_ready', 'debug_log']);
  const authUser = PUBLIC_MODES.has(mode) ? null : await verifyToken(token);
  if (!PUBLIC_MODES.has(mode) && !authUser && !isLocal) {
    return res.status(401).json({ error: 'Connexion requise pour utiliser Repurpose Vidéo' });
  }

  // ── Modes sans URL — traiter immédiatement avant tout autre check ──

  // Email "tes clips sont prêts"
  if (mode === 'notify_clips_ready') {
    const _au = await verifyToken(token);
    if (_au && process.env.BREVO_API_KEY) {
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${_au.id}&select=email,nom`, {
          headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` }
        });
        const user = (await r.json())?.[0];
        if (user?.email) {
          const nom = user.nom || user.email.split('@')[0] || 'Créateur';
          const count = body.count || 0;
          const name = body.name || 'ta vidéo';
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY.trim() },
            body: JSON.stringify({
              sender: { email: 'contact@creatis.app', name: 'Créatis' },
              to: [{ email: user.email, name: nom }],
              subject: `Tes ${count} clips de "${name}" sont prêts 🎬`,
              htmlContent: `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0a0f0a;color:#fff;padding:32px;border-radius:12px;">
                <div style="font-size:22px;font-weight:900;margin-bottom:8px;">Créatis<span style="color:#10b981;">.</span></div>
                <h2 style="font-size:20px;margin:0 0 12px;">Tes ${count} clips viraux sont prêts, ${nom} 🎬</h2>
                <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 24px;">
                  L'analyse de <strong style="color:#fff;">"${name}"</strong> est terminée. Tes clips t'attendent sur Créatis.
                </p>
                <a href="https://creatis.app/clips-v2.html${body.generation_id ? `?g=${encodeURIComponent(body.generation_id)}` : ''}" style="display:inline-block;background:#10b981;color:#000;font-weight:800;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:15px;">
                  Voir mes clips →
                </a>
              </div>`
            })
          });
        }
      } catch {}
    }
    return res.status(200).json({ ok: true });
  }

  // Debug temporaire : le client poste ici les infos de diagnostic qu'on ne peut pas voir depuis
  // la console du téléphone de l'utilisateur — juste loggé côté serveur, à retirer une fois le
  // bug de lecture mobile résolu.
  if (mode === 'debug_log') {
    console.log('[debug_log]', JSON.stringify(body.data || {}).slice(0, 500));
    return res.status(200).json({ ok: true });
  }

  // Upload token : credentials Railway pour upload direct
  if (mode === 'upload-token') {
    if (!REPURPOSE_SERVICE_URL) return res.status(503).json({ error: 'Service Railway non configuré' });
    return res.status(200).json({ ok: true, railway_url: REPURPOSE_SERVICE_URL, token: REPURPOSE_SERVICE_SECRET });
  }

  // Proxy polling statut upload (évite CORS mobile)
  if (mode === 'upload-status') {
    const jobId = body.job_id;
    if (!jobId) return res.status(400).json({ error: 'job_id requis' });
    if (!REPURPOSE_SERVICE_URL) return res.status(503).json({ error: 'Service non configuré' });
    try {
      const r = await fetch(`${REPURPOSE_SERVICE_URL}/upload-status/${encodeURIComponent(jobId)}`, {
        headers: { 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` }
      });
      const data = await r.json().catch(() => ({ status: 'error' }));
      return res.status(r.status).json(data);
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  }

  // Clips depuis fichier uploadé (segments déjà transcrits, pas d'URL YouTube)
  /* Traduction des sous-titres d'un clip. On ne retranscrit pas : on traduit les segments déjà
     transcrits, ce qui garde EXACTEMENT le même minutage. L'audio n'est pas touché — la vidéo
     reste dans sa langue d'origine, seuls les sous-titres changent. */
  /* Le client confirme qu'il a bien REÇU et AFFICHÉ ses clips → seulement là on décompte une
     vidéo du quota. Avant, le décompte se faisait dès que le serveur avait fini son travail : si
     la réponse n'arrivait jamais au navigateur (coupure réseau, onglet fermé), l'utilisateur
     perdait un crédit sur un écran d'erreur. Cas réel : quelqu'un a brûlé ses 2 vidéos gratuites
     sur deux analyses échouées, puis s'est fait bloquer par le paywall sans avoir vu un seul clip. */
  if (mode === 'confirmer_analyse') {
    const _auC = await verifyToken(token);
    if (!_auC) return res.status(200).json({ ok: true, ignore: 'non authentifié' });
    await incrementRepurposeCount(_auC.id);
    return res.status(200).json({ ok: true });
  }

  /* Historique des générations — indispensable, pas confortable.
     Avant, une analyse ne vivait que dans le localStorage du navigateur : une seule à la fois,
     purgée au bout de 4 h, et invisible depuis un autre appareil. L'email « Tes clips sont prêts »
     renvoyait vers une page vide dès qu'il était ouvert sur le téléphone. On ne stocke que les
     métadonnées (bornes, titres, scores) : les vidéos se re-téléchargent depuis la source. */
  if (mode === 'save_generation') {
    const _auG = await verifyToken(token);
    if (!_auG) return res.status(200).json({ ok: true, ignore: 'non authentifié' });
    if (!process.env.SUPABASE_SERVICE_KEY) return res.status(200).json({ ok: true, ignore: 'stockage indisponible' });
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/clip_generations`, {
        method: 'POST',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: _auG.id,
          nom: (body.name || 'Vidéo').slice(0, 200),
          source_type: body.youtube_url ? 'youtube' : 'upload',
          youtube_url: body.youtube_url || null,
          video_id: body.video_id || null,
          nb_clips: Array.isArray(body.clips) ? body.clips.length : 0,
          clips: body.clips || [],
          /* AUCUNE troncature. La limite de 200 amputait toute vidéo de plus de ~6 minutes :
             une heure de parole produit ~1800 cues, donc les clips situés au-delà revenaient
             sans le moindre sous-titre à la réouverture. Une génération rouverte doit se
             comporter exactement comme l'analyse d'origine, quelle que soit la durée.
             Le client allège déjà la charge si nécessaire (il retire les timings mot par mot
             avant de toucher au texte) ; couper ici annulerait ce travail. */
          segments: Array.isArray(body.segments) ? body.segments : [],
          plan: body.plan || null
        })
      });
      if (!r.ok) return res.status(200).json({ ok: false, error: (await r.text()).slice(0, 200) });
      const row = (await r.json())?.[0];
      return res.status(200).json({ ok: true, id: row?.id || null });
    } catch (e) {
      return res.status(200).json({ ok: false, error: String(e).slice(0, 200) });
    }
  }

  if (mode === 'list_generations') {
    const _auL = await verifyToken(token);
    if (!_auL) return res.status(401).json({ error: 'non authentifié' });
    if (!process.env.SUPABASE_SERVICE_KEY) return res.status(200).json({ generations: [] });
    try {
      // Sans les colonnes lourdes (clips/segments) : la liste doit rester légère à charger.
      const r = await fetch(`${SUPABASE_URL}/rest/v1/clip_generations?user_id=eq.${_auL.id}` +
        `&select=id,nom,created_at,nb_clips,source_type,youtube_url&order=created_at.desc&limit=50`, {
        headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` }
      });
      if (!r.ok) return res.status(200).json({ generations: [] });
      return res.status(200).json({ generations: await r.json() });
    } catch {
      return res.status(200).json({ generations: [] });
    }
  }

  if (mode === 'get_generation') {
    const _auX = await verifyToken(token);
    if (!_auX) return res.status(401).json({ error: 'non authentifié' });
    if (!body.id) return res.status(400).json({ error: 'id requis' });
    if (!process.env.SUPABASE_SERVICE_KEY) return res.status(404).json({ error: 'introuvable' });
    try {
      // Le filtre user_id est ce qui empêche de lire la génération de quelqu'un d'autre en
      // devinant un identifiant : on utilise la clé de service, donc RLS ne s'applique pas ici.
      const r = await fetch(`${SUPABASE_URL}/rest/v1/clip_generations?id=eq.${encodeURIComponent(body.id)}` +
        `&user_id=eq.${_auX.id}&select=*&limit=1`, {
        headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` }
      });
      if (!r.ok) return res.status(404).json({ error: 'introuvable' });
      const row = (await r.json())?.[0];
      if (!row) return res.status(404).json({ error: 'introuvable' });
      return res.status(200).json({ generation: row });
    } catch {
      return res.status(404).json({ error: 'introuvable' });
    }
  }

  if (mode === 'translate_segments') {
    const { segments, target_lang } = body;
    if (!Array.isArray(segments) || !segments.length) return res.status(400).json({ error: 'segments requis' });
    if (!GROQ_KEY) return res.status(500).json({ error: 'Clé Groq non configurée' });
    const cible = target_lang === 'en' ? 'anglais' : 'français';
    // On borne : un clip de 60 s dépasse rarement 60 segments, au-delà c'est un appel abusif.
    const textes = segments.slice(0, 120).map(s => String(s.text || '').trim());

    const prompt = `Traduis en ${cible} chaque ligne du tableau JSON ci-dessous.

RÈGLES STRICTES :
- Renvoie UNIQUEMENT un tableau JSON de chaînes, rien d'autre, aucun commentaire.
- Le tableau de sortie doit contenir EXACTEMENT ${textes.length} éléments, dans le même ordre.
- Une ligne de sous-titre = une ligne traduite. Ne fusionne ni ne découpe jamais deux lignes.
- Garde la longueur proche de l'original : ce sont des sous-titres, ils doivent tenir à l'écran.
- Conserve le ton parlé, les noms propres et les nombres à l'identique.
- Si une ligne est déjà en ${cible}, renvoie-la telle quelle.

Entrée :
${JSON.stringify(textes, null, 0)}`;

    /* Chaîne de repli identique au reste du fichier : Groq est limité à 30 requêtes/minute sur le
       plan gratuit et renvoie 429 dès qu'on enchaîne — sans repli, la traduction échouait
       simplement sous les yeux de l'utilisateur. Groq → Gemini Flash → Together. */
    async function _traduireAvecRepli() {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,           // traduction : on veut de la fidélité, pas de la créativité
          max_tokens: 4096,
          response_format: { type: 'json_object' }
        }),
        signal: AbortSignal.timeout(45000)
      });
      if (r.ok) return (await r.json()).choices?.[0]?.message?.content || '';

      if (GEMINI_KEY) {
        console.warn(`[translate] Groq ${r.status} → repli Gemini Flash`);
        const g = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 4096 } }),
          signal: AbortSignal.timeout(45000)
        });
        if (g.ok) {
          const gd = await g.json();
          const gt = gd.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (gt) return gt;
        }
        console.warn('[translate] Gemini indisponible aussi');
      }

      if (TOGETHER_KEY) {
        console.warn('[translate] → repli Together');
        const t = await fetch('https://api.together.xyz/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOGETHER_KEY}` },
          body: JSON.stringify({
            model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
            messages: [
              { role: 'system', content: 'Réponds UNIQUEMENT avec un tableau JSON valide de chaînes, sans aucun texte avant ou après.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.2, max_tokens: 4096
          }),
          signal: AbortSignal.timeout(60000)
        });
        if (t.ok) return (await t.json()).choices?.[0]?.message?.content || '';
      }

      throw new Error(r.status === 429
        ? 'les 3 services de traduction sont saturés — réessaie dans une minute'
        : `service de traduction indisponible (${r.status})`);
    }

    try {
      const brut = await _traduireAvecRepli();
      // Le modèle renvoie tantôt un tableau nu, tantôt un objet qui l'enveloppe — on gère les deux.
      let arr;
      try {
        const parsed = JSON.parse(brut);
        arr = Array.isArray(parsed) ? parsed : (Object.values(parsed).find(Array.isArray) || null);
      } catch { arr = (brut.match(/\[[\s\S]*\]/) || [null])[0] ? JSON.parse(brut.match(/\[[\s\S]*\]/)[0]) : null; }
      if (!Array.isArray(arr)) throw new Error('Réponse de traduction illisible');
      // Alignement 1:1 obligatoire — sinon les sous-titres se décalent du son. En cas de
      // désalignement on garde l'original pour les lignes manquantes plutôt que de tout décaler.
      const out = textes.map((orig, i) => {
        const t = typeof arr[i] === 'string' ? arr[i].trim() : '';
        return t || orig;
      });
      console.log(`[translate] ${out.length}/${textes.length} lignes → ${cible}`);
      return res.status(200).json({ ok: true, target_lang: target_lang === 'en' ? 'en' : 'fr', texts: out });
    } catch (err) {
      console.error('[translate] échec:', err.message);
      return res.status(502).json({ error: `Traduction impossible : ${err.message}` });
    }
  }

  if (mode === 'clips' && body.segments?.length && body.video_id) {
    if (!GROQ_KEY) return res.status(500).json({ error: 'Clé Groq non configurée' });
    const _au = await verifyToken(token);
    if (_au) {
      const _refus = verifierQuotaVideos(await getUserPlan(_au.id));
      if (_refus) return res.status(_refus.status).json(_refus.body);
    }
    try {
      const clips = await identifyViralClips(body.segments, body.video_id, body.title || '', body.n_clips || 5, body.energy_peaks || []);
      const clipsWithId = clips.map(c => ({ ...c, video_id: body.video_id }));
      const _debug = clips[0]?._dbg || null;
      // Décompte APRÈS succès uniquement : une analyse qui échoue ne doit pas coûter un crédit.
      // Ce chemin (upload de fichier) ne décomptait rien du tout — le quota vidéos n'était donc
      // jamais appliqué, `videos_count` restait à 0 et n'importe qui pouvait analyser sans limite.
      // Décompte retiré d'ici : voir mode 'confirmer_analyse'. Le serveur pouvait terminer
      // l'analyse et incrémenter alors que le client, lui, n'avait jamais reçu la réponse —
      // l'utilisateur perdait son quota sur un écran d'erreur. C'est maintenant le client qui
      // confirme la réception, une fois les clips réellement affichés.
      return res.status(200).json({ ok: true, mode: 'clips', status: 'done', _debug,
        result: { clips: clipsWithId, title: body.title || '', duration: body.duration || 0, youtube_url: `upload:${body.video_id}`, segments: body.segments }
      });
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  }

  // Affinage visuel des clips candidats (best-effort, jamais bloquant côté client)
  if (mode === 'rank_clips_visual' && Array.isArray(body.candidates) && Array.isArray(body.frames)) {
    try {
      const nFinal = Math.max(1, Math.min(body.n_final || 10, body.candidates.length));
      const order = await rankClipsVisual(body.candidates, body.frames, nFinal);
      if (!order) return res.status(200).json({ ok: false, error: 'Analyse visuelle indisponible' });
      return res.status(200).json({ ok: true, order });
    } catch (err) {
      return res.status(200).json({ ok: false, error: err.message });
    }
  }

  if (mode === 'raw_segment') {
    // Lance le téléchargement du segment brut sur Railway
    // allow_api_fallback: false => JAMAIS l'API payante (utilisé par le préchargement en arrière-plan
    // pour ne pas brûler de crédits en silence si le chemin gratuit est momentanément bot-bloqué).
    const { video_id, start, end, allow_api_fallback } = body;
    if (!video_id || start == null || end == null) return res.status(400).json({ error: 'video_id, start, end requis' });
    if (!REPURPOSE_SERVICE_URL) return res.status(503).json({ error: 'Service Railway non configuré' });
    try {
      const r = await fetch(`${REPURPOSE_SERVICE_URL}/raw-segment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
        body: JSON.stringify({ video_id, start, end, allow_api_fallback: allow_api_fallback !== false }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.detail || 'Erreur Railway' });
      return res.status(200).json(data);
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  }

  if (mode === 'raw_segment_status') {
    const { job_id } = body;
    if (!job_id) return res.status(400).json({ error: 'job_id requis' });
    if (!REPURPOSE_SERVICE_URL) return res.status(503).json({ error: 'Service Railway non configuré' });
    try {
      const r = await fetch(`${REPURPOSE_SERVICE_URL}/raw-segment-status/${job_id}`, {
        headers: { 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
        signal: AbortSignal.timeout(10000),
      });
      const data = await r.json();
      if (data.status === 'done') {
        // On retourne l'URL directe du fichier (endpoint public sur Railway)
        data.file_url = `${REPURPOSE_SERVICE_URL}/raw-segment-file/${job_id}/clip.mp4`;
      }
      return res.status(r.ok ? 200 : r.status).json(data);
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  }

  // Aperçu serveur d'un clip issu d'un fichier local déjà pré-uploadé (mobile) — évite au
  // navigateur de chercher une position profonde dans le fichier source entier (peu fiable sur
  // certains iPhone), en découpant juste ce clip côté Railway (petit fichier, démarre à 0).
  if (mode === 'preview_clip') {
    const { video_id, start, end } = body;
    console.log(`[preview_clip] video_id:${video_id} start:${start} end:${end}`);
    if (!video_id || start == null || end == null) return res.status(400).json({ error: 'video_id, start, end requis' });
    if (!REPURPOSE_SERVICE_URL) return res.status(503).json({ error: 'Service Railway non configuré' });
    try {
      const r = await fetch(`${REPURPOSE_SERVICE_URL}/preview-clip-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
        body: JSON.stringify({ video_id, start, end }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await r.json();
      console.log(`[preview_clip] Railway status:${r.status}`, JSON.stringify(data).slice(0, 200));
      if (!r.ok) return res.status(r.status).json({ error: data.detail || 'Erreur Railway' });
      return res.status(200).json(data);
    } catch (err) {
      console.log(`[preview_clip] erreur:`, err.message);
      return res.status(502).json({ error: err.message });
    }
  }

  if (mode === 'preview_clip_status') {
    const { job_id } = body;
    if (!job_id) return res.status(400).json({ error: 'job_id requis' });
    if (!REPURPOSE_SERVICE_URL) return res.status(503).json({ error: 'Service Railway non configuré' });
    try {
      const r = await fetch(`${REPURPOSE_SERVICE_URL}/preview-clip-status/${job_id}`, {
        headers: { 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
        signal: AbortSignal.timeout(10000),
      });
      const data = await r.json();
      if (data.status === 'done') {
        data.file_url = `${REPURPOSE_SERVICE_URL}/preview-clip-file/${job_id}/clip.mp4`;
      }
      return res.status(r.ok ? 200 : r.status).json(data);
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  }

  if (mode === 'clip_stream_url') {
    // Proxy vers Railway /stream-url (fallback si raw_segment pas utilisé)
    const { video_id } = body;
    if (!video_id) return res.status(400).json({ error: 'video_id requis' });
    if (!REPURPOSE_SERVICE_URL) return res.status(503).json({ error: 'Service Railway non configuré' });
    try {
      const r = await fetch(`${REPURPOSE_SERVICE_URL}/stream-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
        body: JSON.stringify({ video_id }),
        signal: AbortSignal.timeout(35000),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.detail || 'Erreur Railway stream-url' });
      return res.status(200).json(data);
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  }

  if (mode === 'clip_export') {
    const { video_id, start, end } = body;
    if (!video_id || start == null || end == null) return res.status(400).json({ error: 'video_id, start, end requis' });
    if (!REPURPOSE_SERVICE_URL) return res.status(503).json({ error: 'Service non configuré' });
    try {
      const r = await fetch(`${REPURPOSE_SERVICE_URL}/clip-export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
        body: JSON.stringify({ video_id, start, end }),
        signal: AbortSignal.timeout(15000)
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || `Erreur service (${r.status})`);
      return res.status(200).json({ ok: true, job_id: data.job_id });
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  }

  if (mode === 'clip_export_status') {
    const { job_id } = body;
    if (!job_id) return res.status(400).json({ error: 'job_id manquant' });
    if (!REPURPOSE_SERVICE_URL) return res.status(503).json({ error: 'Service non configuré' });
    try {
      const r = await fetch(`${REPURPOSE_SERVICE_URL}/clip-export-status/${job_id}`, {
        headers: { 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
        signal: AbortSignal.timeout(10000)
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || `Erreur statut (${r.status})`);
      if (data.status === 'done' && data.download_url) {
        data.download_url = `${REPURPOSE_SERVICE_URL}${data.download_url}`;
      }
      return res.status(200).json({ ok: true, ...data });
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  }

  if (mode === 'shorts_start') {
    // Architecture séquentielle : 1 clip-export à la fois pour éviter OOM Cloud Run
    const { url, n_clips, clips: preClips } = body;
    if (!url) return res.status(400).json({ error: 'url manquante' });
    if (!REPURPOSE_SERVICE_URL) return res.status(503).json({ error: 'Service non configuré' });
    try {
      const isUploadUrl = url.startsWith('upload:');
      const uploadVideoId = isUploadUrl ? url.slice('upload:'.length) : null;
      const videoId = isUploadUrl ? uploadVideoId : extractVideoId(url);
      if (!videoId) return res.status(400).json({ error: 'URL YouTube invalide' });

      let clips = preClips?.filter(c => {
        const s = c.start_time ?? c.start; const e = c.end_time ?? c.end;
        return (e - s) >= 5;
      }).map(c => {
        const s = c.start_time ?? c.start; const e = c.end_time ?? c.end;
        return { ...c, start: s, end: Math.min(Math.max(e, s + 30), s + 90) };
      }) || null;
      if (!clips?.length) {
        if (isUploadUrl) throw new Error('Clips requis pour les vidéos uploadées');
        if (!GROQ_KEY) throw new Error('Clé Groq non configurée');
        const transcript = await getYouTubeTranscriptSegments(videoId);
        clips = await identifyViralClips(transcript.segments, videoId, transcript.title, n_clips || 3);
      }

      const maxClips = Math.min(clips.length, n_clips || 3);
      const selected = clips.slice(0, maxClips).map(clip => ({
        // Pour les uploads, conserver le video_id du clip (u_xxx) ; pour YouTube, utiliser videoId
        video_id: isUploadUrl ? (clip.video_id || videoId) : videoId,
        start: clip.start_time ?? clip.start,
        end: clip.end_time ?? clip.end,
        meta: { title: clip.title, hook: clip.hook_sentence || clip.hook, score: clip.score,
                start: clip.start_time ?? clip.start, end: clip.end_time ?? clip.end }
      }));

      // Lance SEULEMENT le premier clip (séquentiel pour éviter OOM)
      const first = selected[0];
      const r = await fetch(`${REPURPOSE_SERVICE_URL}/clip-export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
        body: JSON.stringify({ video_id: first.video_id, start: first.start, end: first.end }),
        signal: AbortSignal.timeout(15000)
      });
      const data = await r.json();
      if (!r.ok || !data.job_id) throw new Error(data.detail || 'Erreur démarrage export');

      console.log(`[shorts_start] job 1/${selected.length} lancé: ${data.job_id}`);
      return res.status(200).json({
        ok: true,
        job_ids: [{ job_id: data.job_id, meta: first.meta }],
        pending_clips: selected.slice(1)   // les 2 clips restants à lancer après
      });
    } catch (err) {
      console.error('[shorts_start]', err.message);
      return res.status(502).json({ error: err.message });
    }
  }

  if (mode === 'shorts_status') {
    // done_clips : clips déjà complétés, accumulés côté client pour éviter de re-vérifier
    const { job_ids, pending_clips = [], done_clips = [], total_clips } = body;
    if (!job_ids?.length) return res.status(400).json({ error: 'job_ids manquant' });
    if (!REPURPOSE_SERVICE_URL) return res.status(503).json({ error: 'Service non configuré' });
    try {
      // Ne vérifie QUE le job actif (1 seul à la fois) — évite l'accumulation qui timeout Vercel
      const activeJob = job_ids[job_ids.length - 1]; // toujours le dernier lancé
      const statusRes = await fetch(`${REPURPOSE_SERVICE_URL}/clip-export-status/${activeJob.job_id}`, {
        headers: { 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
        signal: AbortSignal.timeout(8000)
      }).catch(e => null);

      const st = statusRes?.ok ? await statusRes.json().catch(() => ({ status: 'processing' })) : { status: 'processing' };
      const total = total_clips || (done_clips.length + job_ids.length + pending_clips.length);

      console.log(`[shorts_status] job=${activeJob.job_id.slice(0,8)} status=${st.status} done=${done_clips.length} pending=${pending_clips.length}`);

      if (st.status === 'error') {
        // Clip échoué → on l'ignore et on passe au suivant si disponible
        if (pending_clips.length > 0) {
          const next = pending_clips[0];
          const r = await fetch(`${REPURPOSE_SERVICE_URL}/clip-export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
            body: JSON.stringify({ video_id: next.video_id, start: next.start, end: next.end }),
            signal: AbortSignal.timeout(12000)
          });
          const data = await r.json();
          if (data.job_id) {
            return res.status(200).json({ ok: true, status: 'processing',
              progress: `Short ${done_clips.length + 1}/${total} — Démarrage…`,
              job_ids: [{ job_id: data.job_id, meta: next.meta }],
              pending_clips: pending_clips.slice(1), done_clips, total_clips: total });
          }
        }
        // Plus de clips ou impossible de lancer → retourner ce qu'on a
        if (!done_clips.length) throw new Error(st.error || 'Export échoué');
        return res.status(200).json({ ok: true, status: 'done', clips: done_clips });
      }

      if (st.status === 'done') {
        const newClip = {
          ...activeJob.meta,
          download_url: `${REPURPOSE_SERVICE_URL}${st.download_url}`,
          filename: st.download_url?.split('/').pop() || `short_${done_clips.length + 1}.mp4`,
          duration: Math.round((activeJob.meta?.end || 0) - (activeJob.meta?.start || 0)),
        };
        const newDone = [...done_clips, newClip];

        if (pending_clips.length === 0) {
          return res.status(200).json({ ok: true, status: 'done', clips: newDone });
        }
        // Lance le clip suivant
        const next = pending_clips[0];
        try {
          const r = await fetch(`${REPURPOSE_SERVICE_URL}/clip-export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
            body: JSON.stringify({ video_id: next.video_id, start: next.start, end: next.end }),
            signal: AbortSignal.timeout(12000)
          });
          const data = await r.json();
          if (data.job_id) {
            console.log(`[shorts_status] clip suivant lancé: ${data.job_id}`);
            return res.status(200).json({ ok: true, status: 'processing',
              progress: `Short ${newDone.length + 1}/${total} — Démarrage…`,
              job_ids: [{ job_id: data.job_id, meta: next.meta }],
              pending_clips: pending_clips.slice(1), done_clips: newDone, total_clips: total });
          }
        } catch (e) { console.warn('[shorts_status] erreur lancement suivant:', e.message); }
        return res.status(200).json({ ok: true, status: 'done', clips: newDone });
      }

      // En cours de traitement
      const progressMsg = st.progress || 'traitement…';
      return res.status(200).json({
        ok: true, status: 'processing',
        progress: `Short ${done_clips.length + 1}/${total} — ${progressMsg}`,
        job_ids, pending_clips, done_clips, total_clips: total
      });
    } catch (err) {
      return res.status(502).json({ status: 'error', error: err.message });
    }
  }

  if (mode === 'clips_status') {
    const { session_id } = body;
    if (!session_id) return res.status(400).json({ error: 'session_id manquant' });
    if (!REPURPOSE_SERVICE_URL) return res.status(503).json({ error: 'Service non configuré' });
    try {
      const r = await fetch(`${REPURPOSE_SERVICE_URL}/status/${session_id}`, {
        headers: { 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
        signal: AbortSignal.timeout(10000)
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.detail || `Erreur statut (${r.status})`);
      }
      const job = await r.json();
      if (job.status === 'done' && job.result?.clips) {
        job.result.clips = job.result.clips.map(clip => ({
          ...clip,
          download_url: `${REPURPOSE_SERVICE_URL}${clip.download_url}`
        }));
        if (authUser) await incrementRepurposeCount(authUser.id);
      }
      return res.status(200).json({ ok: true, mode: 'clips_status', ...job });
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  }

  // Vérifier plan + crédits (sauf pour clips qui a son propre quota)
  if (authUser && mode === 'text') {
    const userData = await getUserPlan(authUser.id);
    const plan = userData.plan || 'gratuit';
    const maxCredits = CREDITS[plan] ?? 0;
    if (maxCredits === 0) {
      return res.status(403).json({
        error: 'Repurpose Vidéo est disponible à partir du plan Pro',
        upgrade_required: true
      });
    }
    const now = new Date();
    const resetKey = `${now.getFullYear()}-${now.getMonth()}`;
    const currentReset = userData.repurpose_reset || '';
    const count = currentReset === resetKey ? (userData.repurpose_count || 0) : 0;
    if (count >= maxCredits) {
      return res.status(429).json({
        error: `Limite Repurpose atteinte (${maxCredits}/mois). Renouvellement le 1er du mois.`,
        credits_used: count,
        credits_max: maxCredits
      });
    }
  }
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL YouTube manquante' });
  }

  const youtubePattern = /^https?:\/\/(www\.)?(youtube\.com\/(watch\?.*v=|shorts\/)|youtu\.be\/)/;
  if (!youtubePattern.test(url)) {
    return res.status(400).json({ error: 'URL invalide — entre une URL YouTube (youtube.com ou youtu.be)' });
  }

  // ── Mode CLIPS : traitement synchrone sur Vercel ──
  if (mode === 'clips') {
    if (!GROQ_KEY) return res.status(500).json({ error: 'Clé Groq non configurée' });
    const _au2 = await verifyToken(token);
    if (_au2) {
      const _refus2 = verifierQuotaVideos(await getUserPlan(_au2.id));
      if (_refus2) return res.status(_refus2.status).json(_refus2.body);
    }
    const { n_clips } = body;
    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ error: 'URL YouTube invalide' });

    /* CHRONOMÉTRAGE ÉTAPE PAR ÉTAPE. Environ une analyse YouTube sur trois échoue avec des messages
       réseau bruts (« Load failed », « Failed to fetch ») à des durées irrégulières — 37 s, 97 s —
       qui ne correspondent à aucun seuil. Sans mesurer chaque étape, on ne peut que supposer : trois
       hypothèses ont été formulées le 30/07, deux étaient fausses. Ces repères apparaissent dans les
       logs Vercel ET dans la réponse (`_temps`), donc lisibles même sans accès aux logs. */
    const _t0 = Date.now();
    const _temps = {};
    const _etape = (nom) => { _temps[nom] = Date.now() - _t0; console.log(`[clips][${videoId}] ${nom} à ${_temps[nom]}ms`); };

    try {
      let segments, title = '', duration = 0;

      let pageTitle = '';
      _fetchYouTubePage(videoId).then(html => {
        const m = html.match(/<title>([^<]+)<\/title>/) || html.match(/"title":"([^"]{3,120})"/);
        if (m) pageTitle = m[1].replace(' - YouTube', '');
      }).catch(() => {});

      try {
        const r = await getYouTubeTranscriptSegments(videoId);
        segments = r.segments; title = r.title || pageTitle; duration = r.duration;
        _temps.source_transcription = 'sous-titres';
        _etape('transcription');
        console.log(`[clips] captions OK: ${segments.length} segments`);
      } catch (e) {
        _etape('sous_titres_echec');
        console.warn('[clips] captions failed, fallback Railway Whisper:', e.message);
        try {
          const r = await transcribeViaRailway(url);
          if (!r.segments?.length) throw new Error('Transcription vide');
          segments = r.segments; title = r.title || pageTitle; duration = r.duration;
          _temps.source_transcription = 'whisper-railway';
          _etape('transcription');
          console.log(`[clips] Railway Whisper OK: ${segments.length} segments`);
        } catch (e2) {
          _etape('transcription_echec_total');
          console.error(`[clips][${videoId}] ÉCHEC transcription — temps: ${JSON.stringify(_temps)}`);
          throw new Error(`Transcription impossible — ${e2.message}. Utilise l'option "Uploader une vidéo" pour les vidéos sans sous-titres.`);
        }
      }

      if (!segments?.length) return res.status(502).json({ error: 'Transcription vide — vidéo sans paroles ?' });
      _temps.nb_segments = segments.length;
      _temps.duree_video_s = Math.round(duration || 0);

      // 3. Identification clips via Groq LLM
      const clips = await identifyViralClips(segments, videoId, title, n_clips || 10);
      _etape('identification_clips');
      console.log(`[clips] ${clips.length} clips identifiés pour ${videoId}`);
      _temps.total_ms = Date.now() - _t0;
      _temps.poids_reponse_ko = Math.round(Buffer.byteLength(JSON.stringify({ clips, segments: body.include_segments ? segments : undefined })) / 1024);
      console.log(`[clips][${videoId}] TERMINÉ — ${JSON.stringify(_temps)}`);

      // Décompte APRÈS succès uniquement (chemin URL YouTube) — même raison que ci-dessus.
      // Décompte retiré d'ici : voir mode 'confirmer_analyse'. Le serveur pouvait terminer
      // l'analyse et incrémenter alors que le client, lui, n'avait jamais reçu la réponse —
      // l'utilisateur perdait son quota sur un écran d'erreur. C'est maintenant le client qui
      // confirme la réception, une fois les clips réellement affichés.

      return res.status(200).json({
        ok: true, mode: 'clips', status: 'done',
        _temps,
        result: { clips, title, duration, youtube_url: url, segments: body.include_segments ? segments : undefined }
      });
    } catch (err) {
      _temps.total_ms = Date.now() - _t0;
      console.error(`[clips][${videoId}] FATAL: ${err.message} — temps: ${JSON.stringify(_temps)}`);
      return res.status(502).json({ error: err.message, _temps });
    }
  }


  if (!GROQ_KEY) {
    return res.status(500).json({ error: 'Clé Groq non configurée' });
  }

  try {
    // Étape 1 : transcription — sous-titres YouTube directement, ou service si configuré
    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ error: 'Impossible d\'extraire l\'ID de la vidéo YouTube' });

    let transcription;
    if (REPURPOSE_SERVICE_URL) {
      transcription = await transcribeWithCloudRun(url);
    } else {
      transcription = await getYouTubeTranscript(videoId);
    }
    const { transcript, title, duration, r2_url } = transcription;

    if (!transcript) throw new Error('Transcription vide — la vidéo n\'a peut-être pas de paroles');

    // Étape 2 : génération contenu multi-plateforme via Groq
    const content = await generateContent(transcript, title, duration);

    // Créditer l'usage
    if (authUser) await incrementRepurposeCount(authUser.id);

    return res.status(200).json({
      ok: true,
      title,
      duration,
      transcript_url: r2_url || null,
      transcript_excerpt: transcript.substring(0, 500),
      content
    });

  } catch (err) {
    console.error('[Repurpose] Erreur:', err.message);
    return res.status(502).json({ error: err.message });
  }
};

