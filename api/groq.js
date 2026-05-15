/* ===== VERCEL FUNCTION — Proxy Groq API ===== */
/* POST /api/groq
   Body: { model, messages, temperature, max_tokens }
   Auth JWT réelle via Supabase + rate limiting + quota plan gratuit */

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
const FREE_GENERATION_LIMIT = 50;

/* ── Rate limiter in-memory (resets on cold start) ── */
const ipRateLimit = new Map();
const RL_MAX = 30;
const RL_WINDOW = 60000;

function checkRateLimit(ip) {
  const now = Date.now();
  let entry = ipRateLimit.get(ip);
  if (!entry || now > entry.reset) entry = { count: 0, reset: now + RL_WINDOW };
  entry.count++;
  ipRateLimit.set(ip, entry);
  return entry.count <= RL_MAX;
}

/* ── Vérification JWT réelle via Supabase Auth API ── */
async function verifyTokenStrict(token) {
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    // Décodage rapide pour vérifier l'expiration avant l'appel réseau
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    if (!payload.sub) return null;
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;

    // Vérification signature via Supabase Auth (valide cryptographiquement)
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });

    if (!authRes.ok) return null;
    const user = await authRes.json();
    return user?.id ? { id: user.id, email: user.email } : null;
  } catch { return null; }
}

/* ── Vérifier quota plan gratuit côté serveur ── */
async function checkQuotaGratuit(userId) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return { ok: true }; // fail open si Supabase down
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=plan,generations_count`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    if (!res.ok) return { ok: true }; // fail open
    const rows = await res.json();
    const user = rows?.[0];
    if (!user) return { ok: true };
    if (user.plan !== 'gratuit') return { ok: true }; // Pro/Studio = illimité
    const count = user.generations_count || 0;
    if (count >= FREE_GENERATION_LIMIT) {
      return { ok: false, error: `Quota atteint — tu as utilisé tes ${FREE_GENERATION_LIMIT} générations gratuites. Passe au plan Pro pour continuer.` };
    }
    return { ok: true };
  } catch { return { ok: true }; } // fail open si erreur réseau
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  const allowedOrigins = ['https://creatis.app', 'https://www.creatis.app', process.env.APP_URL || ''];
  const isAllowed = allowedOrigins.some(o => o && origin.startsWith(o))
    || origin.includes('localhost') || origin.includes('vercel.app');

  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : 'https://creatis.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  /* ── Rate limiting IP ── */
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) return res.status(429).json({ error: 'Trop de requêtes — réessaie dans une minute' });

  /* ── Auth : vérification JWT réelle ── */
  const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    if (!token && !isLocal) return res.status(401).json({ error: 'Authentification requise' });

    if (token) {
      const user = await verifyTokenStrict(token);
      if (!user) return res.status(401).json({ error: 'Session expirée — reconnecte-toi' });

      /* ── Quota plan gratuit côté serveur ── */
      const quota = await checkQuotaGratuit(user.id);
      if (!quota.ok) return res.status(429).json({ error: quota.error, quota_exceeded: true });
    }
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'Groq API non configurée' });

  const { model, messages, temperature, max_tokens } = req.body || {};
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Paramètre messages manquant' });

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        messages,
        temperature: temperature ?? 0.8,
        max_tokens: max_tokens || 4096,
        stream: false
      })
    });

    if (!groqRes.ok) {
      const errData = await groqRes.json().catch(() => ({}));
      console.error('[Groq Proxy] Erreur API:', groqRes.status, errData);
      return res.status(groqRes.status).json({ error: errData.error?.message || 'Erreur Groq API', code: groqRes.status });
    }

    const data = await groqRes.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error('[Groq Proxy] Erreur réseau:', err.message);
    return res.status(502).json({ error: 'Impossible de joindre Groq — ' + err.message });
  }
};
