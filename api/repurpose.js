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

async function getInnertubeStreamUrl(videoId) {
  const VER = '19.29.1';
  const UA  = `com.google.ios.youtube/${VER} (iPhone14,5; U; CPU iOS 15_5 like Mac OS X)`;
  const r = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA,
                 'X-YouTube-Client-Name': '5', 'X-YouTube-Client-Version': VER },
      body: JSON.stringify({
        videoId,
        context: { client: { clientName: 'IOS', clientVersion: VER,
          deviceModel: 'iPhone14,5', userAgent: UA,
          osName: 'iPhone', osVersion: '15.5.0.19F77', hl: 'en', gl: 'US' } }
      }),
      signal: AbortSignal.timeout(15000)
    }
  );
  const data = await r.json();
  console.log(`[Innertube] videoId=${videoId} status=${data.playabilityStatus?.status} formats=${data.streamingData?.formats?.length||0} adaptive=${data.streamingData?.adaptiveFormats?.length||0}`);
  if (!data.streamingData) throw new Error(data.playabilityStatus?.reason || 'No streaming data');

  // Cherche un stream combiné (vidéo+audio) d'abord
  const combined = (data.streamingData.formats || []).filter(f => f.url);
  if (combined.length) {
    combined.sort((a, b) => (b.height||0) - (a.height||0));
    const best = combined.find(f => (f.height||999) <= 720) || combined[combined.length - 1];
    console.log(`[Innertube] Combined stream: itag=${best.itag} height=${best.height}`);
    return { video_url: best.url };
  }

  // Fallback : streams adaptatifs séparés (vidéo-only + audio-only)
  const adaptive = data.streamingData.adaptiveFormats || [];
  const videoStream = adaptive.filter(f => f.url && f.mimeType?.startsWith('video/mp4') && (f.height||0) <= 720)
    .sort((a, b) => (b.height||0) - (a.height||0))[0];
  const audioStream = adaptive.filter(f => f.url && f.mimeType?.startsWith('audio/mp4'))
    .sort((a, b) => (b.bitrate||0) - (a.bitrate||0))[0];
  if (videoStream && audioStream) {
    console.log(`[Innertube] Adaptive streams: video ${videoStream.height}p + audio ${audioStream.bitrate}bps`);
    return { video_url: videoStream.url, audio_url: audioStream.url };
  }
  throw new Error('No usable stream URL found');
}

async function getYouTubeTranscript(videoId) {
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
    },
    signal: AbortSignal.timeout(15000)
  });
  if (!pageRes.ok) throw new Error('Impossible d\'accéder à la vidéo YouTube');
  const html = await pageRes.text();

  // Extract video title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/) || html.match(/"title":"([^"]{3,120})"/);
  const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').replace(/\\u[\dA-F]{4}/gi, c => String.fromCharCode(parseInt(c.slice(2), 16))) : '';

  // Find caption tracks (auto-generated or manual)
  const captionsMatch = html.match(/"captionTracks":\s*(\[.*?\])/s);
  if (!captionsMatch) {
    throw new Error('Pas de sous-titres disponibles pour cette vidéo. Active les sous-titres automatiques sur YouTube, ou utilise une vidéo avec des sous-titres.');
  }

  let tracks;
  try {
    tracks = JSON.parse(captionsMatch[1].replace(/\\u0026/g, '&').replace(/\\\\/g, '\\').replace(/\\"/g, '"'));
  } catch {
    throw new Error('Impossible de lire les sous-titres de cette vidéo');
  }

  // Prefer French, then original auto-generated, then any
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
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : 'https://creatis.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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
    const { url, n_clips } = body;
    if (!url) return res.status(400).json({ error: 'url manquante' });
    if (!REPURPOSE_SERVICE_URL) return res.status(503).json({ error: 'Service non configuré' });
    try {
      // Récupère l'URL de stream depuis Vercel (IP non bloquée) pour éviter bot detection sur Railway
      const videoId = extractVideoId(url);
      let video_url = null, audio_url = null;
      if (videoId) {
        try {
          const streams = await getInnertubeStreamUrl(videoId);
          video_url = streams.video_url;
          audio_url = streams.audio_url || null;
          console.log('[shorts_start] Innertube OK video_url:', video_url?.substring(0, 60), 'audio_url:', !!audio_url);
        } catch (e) {
          console.warn('[shorts_start] Innertube échoué, Railway tentera Cobalt:', e.message);
        }
      }
      const r = await fetch(`${REPURPOSE_SERVICE_URL}/generate-shorts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
        body: JSON.stringify({ youtube_url: url, num_clips: n_clips || 3, video_url, audio_url }),
        signal: AbortSignal.timeout(20000)
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || `Erreur service (${r.status})`);
      return res.status(200).json({ ok: true, job_id: data.job_id });
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  }

  if (mode === 'shorts_status') {
    const { job_id } = body;
    if (!job_id) return res.status(400).json({ error: 'job_id manquant' });
    if (!REPURPOSE_SERVICE_URL) return res.status(503).json({ error: 'Service non configuré' });
    try {
      const r = await fetch(`${REPURPOSE_SERVICE_URL}/shorts-status/${job_id}`, {
        headers: { 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
        signal: AbortSignal.timeout(10000)
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || `Erreur statut (${r.status})`);
      if (data.status === 'done' && data.clips) {
        data.clips = data.clips.map(c => ({
          ...c,
          download_url: `${REPURPOSE_SERVICE_URL}${c.download_url}`
        }));
      }
      return res.status(200).json({ ok: true, ...data });
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

  // ── Mode CLIPS : lance le job async sur Railway ──
  if (mode === 'clips') {
    if (!REPURPOSE_SERVICE_URL) {
      return res.status(503).json({
        error: 'Le service de clips vidéo n\'est pas encore configuré.',
        setup_required: true
      });
    }
    try {
      // Pré-résolution du stream depuis Vercel (IP non bloquée) pour contourner bot detection Railway
      const videoId = extractVideoId(url);
      let video_url = null, audio_url = null;
      if (videoId) {
        try {
          const streams = await getInnertubeStreamUrl(videoId);
          video_url = streams.video_url;
          audio_url = streams.audio_url || null;
          console.log('[clips] Innertube OK video_url:', video_url?.substring(0, 60));
        } catch (e) {
          console.warn('[clips] Innertube failed (Railway utilisera yt-dlp):', e.message);
        }
      }
      const r = await fetch(`${REPURPOSE_SERVICE_URL}/clips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}` },
        body: JSON.stringify({ url, n_clips: 5, video_url, audio_url }),
        signal: AbortSignal.timeout(30000)
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || `Erreur service (${r.status})`);
      return res.status(200).json({ ok: true, mode: 'clips', session_id: data.session_id, status: 'processing' });
    } catch (err) {
      console.error('[Clips] Erreur démarrage:', err.message);
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
