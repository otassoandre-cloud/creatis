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
      if (r.status < 400) return r;
      console.warn(`[proxy] ${r.status} — retry direct`);
    } catch (e) {
      console.warn('[proxy] erreur réseau — retry direct:', e.message);
    }
  }
  return fetch(url, { ...opts });
}

// Credits par plan
const CREDITS = { gratuit: 0, pro: 5, studio: 20 };

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
    const r = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=plan,repurpose_count,repurpose_reset`, {
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
    await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ repurpose_count: `repurpose_count + 1` })
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
    timeout: 15000,
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
async function getYouTubeTranscriptSegments(videoId) {
  // Méthode 1 : youtube-transcript npm — ANDROID sans gl/hl + proxy résidentiel
  try {
    const { YoutubeTranscript } = require('youtube-transcript');
    const raw = await YoutubeTranscript.fetchTranscript(videoId, { fetch: _fetchYT });
    if (raw?.length) {
      const segments = raw.map(s => ({
        start: s.offset / 1000,
        end: (s.offset + s.duration) / 1000,
        text: (s.text || '').replace(/\n/g, ' ').trim(),
      })).filter(s => s.text);
      if (segments.length) {
        console.log(`[captions/npm] OK ${segments.length} segments`);
        return { segments, title: '', duration: segments[segments.length - 1].end };
      }
    }
  } catch (e) {
    console.warn('[captions/npm] failed:', e.message);
  }

  // Méthode 2 : fetch page via proxy + extraction caption tracks
  const html = await _fetchYouTubePage(videoId);
  const titleMatch = html.match(/<title>([^<]+)<\/title>/) || html.match(/"title":"([^"]{3,120})"/);
  const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').replace(/\\u[\dA-F]{4}/gi, c => String.fromCharCode(parseInt(c.slice(2), 16))) : '';

  const tracks = _parseCaptionTracks(html);
  if (!tracks?.length) throw new Error('Pas de sous-titres disponibles pour cette vidéo');

  const track = tracks.find(t => t.languageCode === 'fr' && t.kind === 'asr')
    || tracks.find(t => t.languageCode === 'fr')
    || tracks.find(t => t.kind === 'asr')
    || tracks[0];
  if (!track?.baseUrl) throw new Error('Aucune piste de sous-titres trouvable');

  const captionsUrl = track.baseUrl.replace(/\\u0026/g, '&') + '&fmt=json3';
  const cr = await _fetchYT(captionsUrl, { signal: AbortSignal.timeout(10000) });
  if (!cr.ok) throw new Error('Impossible de récupérer les sous-titres');

  const data = await cr.json();
  const segments = (data.events || [])
    .filter(e => e.segs && e.tStartMs != null)
    .map(e => ({
      start: e.tStartMs / 1000,
      end: (e.tStartMs + (e.dDurationMs || 2000)) / 1000,
      text: e.segs.map(s => (s.utf8 || '').replace(/\n/g, ' ')).join('').trim(),
    }))
    .filter(s => s.text);

  if (!segments.length) throw new Error('Sous-titres vides');
  console.log(`[captions/fetch] ${segments.length} segments, lang=${track.languageCode}, title="${title}"`);
  return { segments, title, duration: segments[segments.length - 1].end };
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

// Identification des clips viraux via Groq LLM
async function identifyViralClips(segments, videoId, title, nClips) {
  const transcript = segments
    .map(s => `[${s.start.toFixed(1)}s] ${s.text}`)
    .join('\n')
    .substring(0, 8000);

  const prompt = `Tu es un expert YouTube Shorts. Identifie les ${nClips} meilleurs moments viraux dans cette transcription.

Réponds UNIQUEMENT en JSON :
{"clips":[{"start_time":12.5,"end_time":67.0,"title":"titre court","hook":"phrase accroche","score":88}]}

Règles : durée 30-90s, score 0-100, ne coupe pas au milieu d'une phrase.

Transcription "${title}" :
${transcript}`;

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 2048 }),
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) throw new Error('Groq LLM error');
  const raw = (await r.json()).choices?.[0]?.message?.content?.trim() || '';
  const json = raw.replace(/^```(?:json)?\s*|\s*```$/gm, '').trim();
  let clips = [];
  try { clips = JSON.parse(json).clips || []; }
  catch { const s = json.indexOf('{'), e = json.lastIndexOf('}'); if (s !== -1 && e !== -1) clips = JSON.parse(json.slice(s, e+1)).clips || []; }
  return clips.map(c => ({ video_id: videoId, start: parseFloat(c.start_time), end: parseFloat(c.end_time), title: c.title, hook: c.hook, score: parseInt(c.score) || 80 }));
}

async function getYouTubeTranscript(videoId) {
  const html = await _fetchYouTubePage(videoId);

  const titleMatch = html.match(/<title>([^<]+)<\/title>/) || html.match(/"title":"([^"]{3,120})"/);
  const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').replace(/\\u[\dA-F]{4}/gi, c => String.fromCharCode(parseInt(c.slice(2), 16))) : '';

  const tracks = _parseCaptionTracks(html);
  if (!tracks?.length) {
    throw new Error('Pas de sous-titres disponibles pour cette vidéo. Active les sous-titres automatiques sur YouTube, ou utilise une vidéo avec des sous-titres.');
  }

  const track = tracks.find(t => t.languageCode === 'fr' && t.kind === 'asr')
    || tracks.find(t => t.languageCode === 'fr')
    || tracks.find(t => t.kind === 'asr')
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

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 4096
    })
  });
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

  // Auth requise (Repurpose = Pro uniquement)
  const authUser = await verifyToken(token);
  if (!authUser && !isLocal) {
    return res.status(401).json({ error: 'Connexion requise pour utiliser Repurpose Vidéo' });
  }

  let body = req.body || {};
  // Fallback : Vercel peut livrer le body en string brut
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const mode = body.mode || 'text';
  const url = body.url || '';

  // ── Modes sans URL — traiter immédiatement avant tout autre check ──
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
    // Nouvelle architecture : /clip-export × N (pas de Gemini dans Cloud Run)
    // Les clips sont identifiés dans Vercel (Groq) et passés directement
    const { url, n_clips, clips: preClips } = body;
    if (!url) return res.status(400).json({ error: 'url manquante' });
    if (!REPURPOSE_SERVICE_URL) return res.status(503).json({ error: 'Service non configuré' });
    try {
      const videoId = extractVideoId(url);
      if (!videoId) return res.status(400).json({ error: 'URL YouTube invalide' });

      // Utilise les clips pré-identifiés par le mode clips (Groq) ou les identifie maintenant
      let clips = preClips;
      if (!clips?.length) {
        console.log('[shorts_start] pas de clips pré-identifiés, identification via Groq...');
        if (!GROQ_KEY) throw new Error('Clé Groq non configurée');
        const transcript = await getYouTubeTranscriptSegments(videoId);
        clips = await identifyViralClips(transcript.segments, videoId, transcript.title, n_clips || 3);
      }

      const maxClips = Math.min(clips.length, n_clips || 3);
      const selected = clips.slice(0, maxClips);

      // Lance les exports en parallèle sur Cloud Run (endpoint /clip-export, sans Gemini)
      const exportResults = await Promise.all(selected.map(clip =>
        fetch(`${REPURPOSE_SERVICE_URL}/clip-export`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
          body: JSON.stringify({ video_id: videoId, start: clip.start_time ?? clip.start, end: clip.end_time ?? clip.end }),
          signal: AbortSignal.timeout(15000)
        }).then(r => r.json())
      ));

      const job_ids = exportResults.map((r, i) => ({
        job_id: r.job_id,
        meta: { title: selected[i].title, hook: selected[i].hook_sentence || selected[i].hook, score: selected[i].score, start: selected[i].start_time ?? selected[i].start, end: selected[i].end_time ?? selected[i].end }
      }));

      console.log(`[shorts_start] ${job_ids.length} clip-export jobs lancés`);
      return res.status(200).json({ ok: true, job_ids });
    } catch (err) {
      console.error('[shorts_start]', err.message);
      return res.status(502).json({ error: err.message });
    }
  }

  if (mode === 'shorts_status') {
    const { job_ids } = body;
    if (!job_ids?.length) return res.status(400).json({ error: 'job_ids manquant' });
    if (!REPURPOSE_SERVICE_URL) return res.status(503).json({ error: 'Service non configuré' });
    try {
      const statuses = await Promise.all(job_ids.map(({ job_id }) =>
        fetch(`${REPURPOSE_SERVICE_URL}/clip-export-status/${job_id}`, {
          headers: { 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
          signal: AbortSignal.timeout(10000)
        }).then(async r => {
          const data = await r.json();
          if (!r.ok) return { status: 'error', error: data.detail || `HTTP ${r.status}` };
          return data;
        }).catch(e => ({ status: 'error', error: e.message }))
      ));

      const done = statuses.filter(s => s.status === 'done').length;
      const errors = statuses.filter(s => s.status === 'error');
      const total = job_ids.length;

      // Logs pour debug
      console.log(`[shorts_status] done=${done} errors=${errors.length} total=${total}`, statuses.map(s => s.status + (s.error ? ':'+s.error : '') + (s.progress ? ':'+s.progress : '')));

      if (errors.length === total) {
        throw new Error(errors[0].error || 'Tous les exports ont échoué');
      }

      if (done + errors.length === total) {
        const clips = statuses.map((s, i) => s.status === 'done' ? {
          ...job_ids[i].meta,
          download_url: `${REPURPOSE_SERVICE_URL}${s.download_url}`,
          filename: s.download_url?.split('/').pop() || `short_${i + 1}.mp4`,
          size_mb: s.size_mb || null,
          duration: Math.round((job_ids[i].meta?.end || 0) - (job_ids[i].meta?.start || 0)),
        } : null).filter(Boolean);
        if (!clips.length) throw new Error(errors[0]?.error || 'Exports échoués');
        return res.status(200).json({ ok: true, status: 'done', clips });
      }

      // Récupère le message de progression du premier job en cours
      const processing = statuses.find(s => s.status === 'processing');
      const progressMsg = processing?.progress || `${done}/${total} shorts prêts…`;
      return res.status(200).json({
        ok: true, status: 'processing',
        progress: `Short ${done + 1}/${total} — ${progressMsg}`
      });
    } catch (err) {
      return res.status(502).json({ error: err.message });
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

  // ── Mode CLIPS : traitement synchrone sur Vercel (pas de Railway pour éviter bot detection) ──
  if (mode === 'clips') {
    if (!GROQ_KEY) return res.status(500).json({ error: 'Clé Groq non configurée' });
    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ error: 'URL YouTube invalide' });
    try {
      let segments, title = '', duration = 0;

      // 1. Sous-titres YouTube depuis Vercel (IP propre, rapide, gratuit)
      // On récupère aussi le titre via la page YouTube en parallèle
      let pageTitle = '';
      _fetchYouTubePage(videoId).then(html => {
        const m = html.match(/<title>([^<]+)<\/title>/) || html.match(/"title":"([^"]{3,120})"/);
        if (m) pageTitle = m[1].replace(' - YouTube', '');
      }).catch(() => {});

      // 1. Sous-titres YouTube (marche pour la majorité des vidéos publiques)
      try {
        const r = await getYouTubeTranscriptSegments(videoId);
        segments = r.segments; title = r.title || pageTitle; duration = r.duration;
        console.log(`[clips] captions OK: ${segments.length} segments`);
      } catch (e) {
        console.warn('[clips] captions failed:', e.message);

        // 2. Fallback : Innertube audio → Groq Whisper
        try {
          const streams = await getInnertubeStreamUrl(videoId);
          const audioUrl = streams.audio_url || streams.video_url;
          const r = await transcribeAudioUrl(audioUrl);
          segments = r.segments; duration = r.duration;
          console.log(`[clips] Innertube+Whisper OK: ${segments.length} segments`);
        } catch (innerErr) {
          console.warn('[clips] Innertube+Whisper failed:', innerErr.message);
          const isUnavailable = /indisponible|unavailable|non disponible/i.test(innerErr.message);
          if (isUnavailable && !YOUTUBE_COOKIES) {
            throw new Error('Cette vidéo est inaccessible depuis nos serveurs (vidéo géo-restreinte ou privée). Pour analyser cette vidéo, ajoute tes cookies YouTube dans les paramètres Vercel (YOUTUBE_COOKIES).');
          }
          throw new Error('Impossible de transcrire cette vidéo. Vérifie que les sous-titres automatiques sont activés sur YouTube, ou essaie une autre vidéo.');
        }
      }

      if (!segments?.length) return res.status(502).json({ error: 'Transcription vide — vidéo sans paroles ?' });

      // 3. Identification clips via Groq LLM
      const clips = await identifyViralClips(segments, videoId, title, 5);
      console.log(`[clips] ${clips.length} clips identifiés pour ${videoId}`);

      return res.status(200).json({
        ok: true, mode: 'clips', status: 'done',
        result: { clips, title, duration, youtube_url: url }
      });
    } catch (err) {
      console.error('[clips] fatal:', err.message);
      return res.status(502).json({ error: err.message });
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
