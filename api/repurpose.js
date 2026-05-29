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
  try {
    const html = await _fetchYouTubePage(videoId);
    const titleMatch = html.match(/<title>([^<]+)<\/title>/) || html.match(/"title":"([^"]{3,120})"/);
    const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').replace(/\\u[\dA-F]{4}/gi, c => String.fromCharCode(parseInt(c.slice(2), 16))) : '';
    const tracks = _parseCaptionTracks(html);
    if (tracks?.length) {
      const track = tracks.find(t => t.languageCode === 'fr' && t.kind === 'asr')
        || tracks.find(t => t.languageCode === 'fr')
        || tracks.find(t => t.kind === 'asr')
        || tracks[0];
      if (track?.baseUrl) {
        const captionsUrl = track.baseUrl.replace(/\\u0026/g, '&') + '&fmt=json3';
        const cr = await _fetchYT(captionsUrl, { signal: AbortSignal.timeout(10000) });
        if (cr.ok) {
          const data = await cr.json();
          const segments = (data.events || [])
            .filter(e => e.segs && e.tStartMs != null)
            .map(e => ({
              start: e.tStartMs / 1000,
              end: (e.tStartMs + (e.dDurationMs || 2000)) / 1000,
              text: e.segs.map(s => (s.utf8 || '').replace(/\n/g, ' ')).join('').trim(),
            }))
            .filter(s => s.text);
          if (segments.length) {
            console.log(`[captions/fetch] ${segments.length} segments, lang=${track.languageCode}`);
            return { segments, title, duration: segments[segments.length - 1].end };
          }
        }
      }
    }
  } catch (e) {
    console.warn('[captions/fetch] failed:', e.message);
  }

  // Méthode 3 : Railway service (IPs différentes de Vercel → contourne bot detection)
  if (REPURPOSE_SERVICE_URL) {
    try {
      const r = await fetch(`${REPURPOSE_SERVICE_URL}/transcript/${videoId}`, {
        headers: { 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
        signal: AbortSignal.timeout(30000),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.segments?.length) {
          console.log(`[captions/railway] OK ${d.segments.length} segments lang=${d.language}`);
          return { segments: d.segments, title: '', duration: d.segments[d.segments.length - 1].end };
        }
      }
    } catch (e) {
      console.warn('[captions/railway] failed:', e.message);
    }
  }

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

// Identification des clips viraux via Groq LLM
async function identifyViralClips(segments, videoId, title, nClips) {
  // Échantillonnage uniforme sur toute la vidéo (pas juste le début)
  const MAX_CHARS = 7500;
  let sampled = segments;
  if (segments.length > 0) {
    const avgLen = segments.slice(0, 30).reduce((a, s) => a + `[${s.start.toFixed(1)}s] ${s.text}\n`.length, 0) / Math.min(30, segments.length);
    const maxSegs = Math.max(1, Math.floor(MAX_CHARS / avgLen));
    if (segments.length > maxSegs) {
      const step = segments.length / maxSegs;
      sampled = Array.from({ length: maxSegs }, (_, i) => segments[Math.floor(i * step)]);
    }
  }
  const transcript = sampled.map(s => `[${s.start.toFixed(1)}s] ${s.text}`).join('\n').substring(0, MAX_CHARS);

  const prompt = `Tu es un expert en création de contenu viral sur YouTube Shorts et TikTok. Analyse cette transcription et sélectionne les ${nClips} MEILLEURS moments qui feront le plus de vues.

CRITÈRES DE SÉLECTION (par ordre de priorité) :
1. HOOK fort dès les 3 premières secondes — phrase qui accroche immédiatement ("j'ai failli mourir", "personne ne le sait mais...", chiffre choc, question rhétorique)
2. ÉMOTION intense — surprise, rire, choc, admiration, révélation
3. AUTONOME — le clip se comprend sans contexte, commence et finit proprement sur une idée complète
4. TENSION ou CURIOSITÉ — l'audience veut savoir la suite
5. RÉPARTITION — couvre différentes parties de la vidéo, pas tous au même endroit

ÉVITER : moments trop longs sans action, transitions, intros/outros, passages plats sans émotion.

Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
{"clips":[{"start_time":12.5,"end_time":67.0,"title":"titre accrocheur court","hook":"première phrase exacte du clip qui accroche","score":88}]}

Règles : durée 30-90s, score 0-100 (sois exigeant : score 90+ = vraiment viral), ne coupe pas au milieu d'une phrase.

Transcription "${title}" :
${transcript}`;

  const baseBody = { messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 2048 };
  let r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', ...baseBody, response_format: { type: 'json_object' } }),
    signal: AbortSignal.timeout(60000),
  });
  console.log('[clips] Groq status:', r.status);
  // Fallback Together AI si Groq rate-limite ou billing
  if ((r.status === 429 || r.status === 402) && TOGETHER_KEY) {
    console.warn(`[clips] Groq ${r.status}, fallback Together AI`);
    // Together AI sans response_format (compatibilité)
    r = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOGETHER_KEY}` },
      body: JSON.stringify({ model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', ...baseBody }),
      signal: AbortSignal.timeout(60000),
    });
    console.log('[clips] Together AI status:', r.status);
  }
  // Si Together AI aussi en erreur → découpage uniforme (on ne crash pas)
  if (!r.ok) {
    const errBody = await r.text();
    console.warn(`[clips] LLM error ${r.status}, fallback découpage uniforme: ${errBody.slice(0, 200)}`);
    if (segments.length === 0) throw new Error(`LLM error ${r.status}`);
    const totalDur2 = segments[segments.length - 1].end || segments[segments.length - 1].start + 30;
    return Array.from({ length: nClips }, (_, i) => {
      const s2 = Math.floor((totalDur2 / (nClips + 1)) * (i + 1));
      const seg2 = segments.find(s => s.start >= s2) || segments[Math.floor(i / nClips * segments.length)];
      const st2 = seg2 ? seg2.start : s2;
      return { video_id: videoId, start: st2, end: Math.min(st2 + 60, totalDur2), title: `Moment ${i + 1}`, hook: seg2?.text?.substring(0, 80) || '', score: 70 };
    });
  }
  const raw = (await r.json()).choices?.[0]?.message?.content?.trim() || '';
  console.log('[clips] raw LLM response:', raw.slice(0, 400));
  // Extraire le JSON en trouvant le premier { et dernier } (ignore le texte autour)
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  const jsonStr = firstBrace !== -1 && lastBrace > firstBrace ? raw.slice(firstBrace, lastBrace + 1) : raw;
  let clips = [];
  try {
    const parsed = JSON.parse(jsonStr);
    clips = parsed.clips || parsed.results || parsed.moments || parsed.viral_clips || parsed.top_clips || (Array.isArray(parsed) ? parsed : []);
  } catch {
    // Essayer d'extraire juste le tableau
    const s = raw.indexOf('['), e = raw.lastIndexOf(']');
    if (s !== -1 && e > s) try { clips = JSON.parse(raw.slice(s, e + 1)); } catch {}
  }
  console.log(`[clips] parsed ${clips.length} clips avant filtre`);
  clips = clips
    .map(c => ({
      video_id: videoId,
      start: parseFloat(c.start_time ?? c.start ?? c.begin ?? c.timestamp_start),
      end: parseFloat(c.end_time ?? c.end ?? c.finish ?? c.timestamp_end),
      title: c.title || c.name || '',
      hook: c.hook || c.description || '',
      score: parseInt(c.score ?? c.viral_score ?? c.rating) || 80
    }))
    .filter(c => !isNaN(c.start) && !isNaN(c.end) && (c.end - c.start) >= 15)
    .map(c => ({ ...c, end: Math.min(c.end, c.start + 90) }));

  // Fallback : si Groq n'a rien retourné d'utilisable, découpage uniforme
  if (clips.length === 0 && segments.length > 0) {
    const totalDur = segments[segments.length - 1].end || segments[segments.length - 1].start + 30;
    const n = nClips;
    clips = Array.from({ length: n }, (_, i) => {
      const start = Math.floor((totalDur / (n + 1)) * (i + 1));
      const seg = segments.find(s => s.start >= start) || segments[Math.floor(i / n * segments.length)];
      const s = seg ? seg.start : start;
      return { video_id: videoId, start: s, end: Math.min(s + 60, totalDur), title: `Moment ${i + 1}`, hook: seg?.text?.substring(0, 80) || '', score: 70 };
    });
  }
  return clips;
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

  const contentBody = { model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.8, max_tokens: 4096 };
  let r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify(contentBody)
  });
  if ((r.status === 429 || r.status === 402) && TOGETHER_KEY) {
    console.warn(`[content] Groq ${r.status}, fallback Together AI`);
    r = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOGETHER_KEY}` },
      body: JSON.stringify({ ...contentBody, model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' })
    });
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
    const authUser2 = await verifyToken(token);
    if (!authUser2 && !isLocal) return res.status(401).json({ error: 'Connexion requise' });
    if (!REPURPOSE_SERVICE_URL) return res.status(503).json({ error: 'Service non configuré' });
    const railwayEndpoint = (req.query && req.query.railway) || 'upload-video';
    if (!['upload-video', 'transcribe-audio', 'reframe-clip'].includes(railwayEndpoint)) {
      return res.status(400).json({ error: 'Endpoint invalide' });
    }
    try {
      const railwayRes = await fetch(`${REPURPOSE_SERVICE_URL}/${railwayEndpoint}`, {
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

  // Auth requise (Repurpose = Pro uniquement)
  const authUser = await verifyToken(token);
  if (!authUser && !isLocal) {
    return res.status(401).json({ error: 'Connexion requise pour utiliser Repurpose Vidéo' });
  }
  const mode = body.mode || 'text';
  const url = body.url || '';

  // ── Modes sans URL — traiter immédiatement avant tout autre check ──

  // Upload token : credentials Railway pour upload direct
  if (mode === 'upload-token') {
    if (!authUser && !isLocal) return res.status(401).json({ error: 'Connexion requise' });
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
  if (mode === 'clips' && body.segments?.length && body.video_id) {
    if (!GROQ_KEY) return res.status(500).json({ error: 'Clé Groq non configurée' });
    try {
      const clips = await identifyViralClips(body.segments, body.video_id, body.title || '', body.n_clips || 5);
      const clipsWithId = clips.map(c => ({ ...c, video_id: body.video_id }));
      return res.status(200).json({ ok: true, mode: 'clips', status: 'done',
        result: { clips: clipsWithId, title: body.title || '', duration: body.duration || 0, youtube_url: `upload:${body.video_id}` }
      });
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
    const { n_clips } = body;
    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ error: 'URL YouTube invalide' });
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
        console.log(`[clips] captions OK: ${segments.length} segments`);
      } catch (e) {
        console.warn('[clips] captions failed:', e.message);
        throw new Error('Cette vidéo n\'a pas de sous-titres automatiques disponibles. Active les sous-titres automatiques sur YouTube Studio, ou utilise une vidéo avec des sous-titres existants.');
      }

      if (!segments?.length) return res.status(502).json({ error: 'Transcription vide — vidéo sans paroles ?' });

      // 3. Identification clips via Groq LLM
      const clips = await identifyViralClips(segments, videoId, title, n_clips || 10);
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

module.exports.config = { api: { bodyParser: false } };
