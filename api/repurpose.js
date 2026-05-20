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

async function transcribeWithCloudRun(url) {
  if (!REPURPOSE_SERVICE_URL) {
    throw new Error('Service de transcription non configuré — déploie le service Cloud Run et ajoute REPURPOSE_SERVICE_URL dans Vercel');
  }
  const r = await fetch(`${REPURPOSE_SERVICE_URL}/transcribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}`
    },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(180000) // 3 min max
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

  // Vérifier plan + crédits
  if (authUser) {
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

  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL YouTube manquante' });
  }

  const youtubePattern = /^https?:\/\/(www\.)?(youtube\.com\/(watch\?.*v=|shorts\/)|youtu\.be\/)/;
  if (!youtubePattern.test(url)) {
    return res.status(400).json({ error: 'URL invalide — entre une URL YouTube (youtube.com ou youtu.be)' });
  }

  if (!GROQ_KEY) {
    return res.status(500).json({ error: 'Clé Groq non configurée' });
  }

  try {
    // Étape 1 : transcription via Cloud Run
    const transcription = await transcribeWithCloudRun(url);
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
