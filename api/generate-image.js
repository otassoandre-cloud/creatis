/* ===== VERCEL FUNCTION — Proxy Image IA (OpenAI → Together → HuggingFace) ===== */
/* POST /api/generate-image
   Body: { prompt, width, height, steps, n }
   Priorité : OpenAI gpt-image-1 → Together AI FLUX → HuggingFace FLUX */

/* ── Rate limiter in-memory ── */
const imgRateLimit = new Map();
const RL_MAX = 10;        // génération images : limite plus basse (coûteux)
const RL_WINDOW = 60000;

function checkRateLimit(ip) {
  const now = Date.now();
  let entry = imgRateLimit.get(ip);
  if (!entry || now > entry.reset) {
    entry = { count: 0, reset: now + RL_WINDOW };
  }
  entry.count++;
  imgRateLimit.set(ip, entry);
  return entry.count <= RL_MAX;
}

/* ── Vérification JWT réelle via Supabase Auth API ── */
async function verifyToken(token) {
  if (!token) return null;
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || '').trim();
  try {
    // Vérification expiration rapide avant appel réseau
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    if (!payload.sub) return null;
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;

    if (!supabaseUrl || !anonKey) return { id: payload.sub, email: payload.email }; // fallback local

    // Vérification signature via Supabase (cryptographiquement fiable)
    const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${token}`, 'apikey': anonKey }
    });
    if (!authRes.ok) return null;
    const user = await authRes.json();
    return user?.id ? { id: user.id, email: user.email } : null;
  } catch { return null; }
}

/* ── Quotas par plan ── */
const PLAN_QUOTAS = { gratuit: 0, pro: 10, studio: 30 };

/* ── Supabase query (service key) ── */
async function sbQuery(path, method = 'GET', body) {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) return { _err: 'no_config' };
  try {
    const headers = {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`
    };
    if (method !== 'GET') headers['Prefer'] = 'return=minimal';
    const res = await fetch(`${url}/rest/v1${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[sbQuery] error', res.status, path, errText.substring(0, 200));
      return { _err: `http_${res.status}`, _msg: errText.substring(0, 100) };
    }
    return res.status !== 204 ? await res.json() : [];
  } catch (e) { console.error('[sbQuery] fetch error:', e.message); return { _err: 'fetch_fail', _msg: e.message }; }
}

/* ── Vérifier + incrémenter quota miniatures ── */
async function checkAndIncrementMiniature(userId, email) {
  let users = await sbQuery(`/users?id=eq.${userId}&select=id,plan,miniatures_used,miniatures_reset_at`);
  if (users?._err && email) {
    // First query errored — try email fallback
    users = await sbQuery(`/users?email=eq.${encodeURIComponent(email)}&select=id,plan,miniatures_used,miniatures_reset_at`);
  } else if (Array.isArray(users) && !users.length && email) {
    users = await sbQuery(`/users?email=eq.${encodeURIComponent(email)}&select=id,plan,miniatures_used,miniatures_reset_at`);
  }

  if (users?._err) {
    console.error('[Mini] Supabase error:', users._err, users._msg);
    return { ok: false, error: 'Erreur serveur — réessaie dans un instant' };
  }

  const user = users?.[0];
  if (!user) {
    return { ok: false, error: 'Utilisateur introuvable — reconnecte-toi' };
  }

  const plan = user.plan || 'gratuit';
  const quota = PLAN_QUOTAS[plan] ?? 0;

  if (quota === 0) {
    return { ok: false, error: 'Plan gratuit — passe au Pro pour générer des miniatures' };
  }

  // Reset mensuel automatique
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const resetAt = user.miniatures_reset_at ? new Date(user.miniatures_reset_at) : null;
  const resetMonth = resetAt
    ? `${resetAt.getFullYear()}-${String(resetAt.getMonth() + 1).padStart(2, '0')}`
    : null;

  let used = resetMonth === monthKey ? (user.miniatures_used || 0) : 0;

  if (used >= quota) {
    return { ok: false, error: `Quota miniatures atteint (${used}/${quota} ce mois) — renouvellement le 1er du mois`, quota, used };
  }

  // Incrémenter (utiliser l'id réel trouvé en base)
  const dbId = user.id || userId;
  await sbQuery(`/users?id=eq.${dbId}`, 'PATCH', {
    miniatures_used: used + 1,
    miniatures_reset_at: resetMonth === monthKey ? user.miniatures_reset_at : now.toISOString()
  });

  return { ok: true, used: used + 1, quota };
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  const appUrl = process.env.APP_URL || 'https://creatis.app';
  const isAllowed = origin.startsWith(appUrl) || origin.includes('localhost') || origin.includes('vercel.app');

  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : appUrl);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  /* ── Rate limiting ── */
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Trop de requêtes — réessaie dans une minute' });
  }

  /* ── Auth si Supabase configuré ── */
  const supabaseConfigured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');

  let verifiedUser = null;
  if (supabaseConfigured && !isLocal) {
    if (!token) return res.status(401).json({ error: 'Authentification requise' });
    verifiedUser = await verifyToken(token);
    if (!verifiedUser) return res.status(401).json({ error: 'Session expirée — reconnecte-toi' });

    const quota = await checkAndIncrementMiniature(verifiedUser.id, verifiedUser.email);
    if (!quota.ok) return res.status(403).json({ error: quota.error });
  }

  const { prompt, width = 1280, height = 720, steps = 4, n = 1, mode, image_b64 } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || prompt.length < 5) {
    return res.status(400).json({ error: 'Prompt invalide' });
  }
  if (prompt.length > 4000) {
    return res.status(400).json({ error: 'Prompt trop long (max 4000 caractères)' });
  }

  // ── Mode édition : fond IA autour d'une personne (canvas avec fond transparent) ──
  const openaiKey = process.env.OPENAI_API_KEY;
  if (mode === 'edit' && image_b64 && openaiKey) {
    try {
      const imageData = image_b64.replace(/^data:image\/[^;]+;base64,/, '');
      const buffer = Buffer.from(imageData, 'base64');
      const form = new FormData();
      form.append('model', 'gpt-image-1');
      form.append('image', new Blob([buffer], { type: 'image/png' }), 'canvas.png');
      form.append('prompt', prompt);
      form.append('n', '1');
      form.append('size', '1536x1024');
      form.append('quality', 'medium');
      const editRes = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiKey}` },
        body: form
      });
      if (editRes.ok) {
        const data = await editRes.json();
        return res.status(200).json(data);
      }
      const errData = await editRes.json().catch(() => ({}));
      console.warn('[Image Edit] Fallback génération classique:', editRes.status, errData?.error?.message);
      // Fall through to regular generation
    } catch (err) {
      console.warn('[Image Edit] Erreur, fallback:', err.message);
      // Fall through to regular generation
    }
  }

  // ── Essai 1 : OpenAI gpt-image-1 ──────────────────────────────────────────
  if (openaiKey) {
    try {
      const size = width > height ? '1536x1024' : width < height ? '1024x1536' : '1024x1024';
      const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt,
          n: Math.min(n, 1),
          size,
          output_format: 'jpeg',
          quality: 'medium'
        })
      });

      if (openaiRes.ok) {
        const data = await openaiRes.json();
        return res.status(200).json(data);
      }

      const errData = await openaiRes.json().catch(() => ({}));
      const isQuotaErr = openaiRes.status === 429 || openaiRes.status === 402;
      if (!isQuotaErr) {
        return res.status(openaiRes.status).json({ error: errData.error?.message || 'Erreur OpenAI' });
      }
      console.warn('[Image Proxy] OpenAI quota — fallback Together AI');
    } catch (err) {
      console.warn('[Image Proxy] OpenAI indisponible — fallback Together AI:', err.message);
    }
  }

  // ── Essai 2 : Together AI FLUX.1-schnell-Free ─────────────────────────────
  const togetherKey = process.env.TOGETHER_API_KEY;
  if (togetherKey) {
    try {
      const togetherRes = await fetch('https://api.together.xyz/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${togetherKey}` },
        body: JSON.stringify({
          model: 'black-forest-labs/FLUX.1-schnell-Free',
          prompt,
          width: Math.min(width, 1440),
          height: Math.min(height, 1440),
          steps: Math.min(steps, 8),
          n: Math.min(n, 1),
          response_format: 'b64_json'
        })
      });

      if (togetherRes.ok) {
        const data = await togetherRes.json();
        return res.status(200).json(data);
      }

      const errData = await togetherRes.json().catch(() => ({}));
      const isCreditError = togetherRes.status === 429 || errData.error?.type === 'credit_limit';
      if (!isCreditError) {
        return res.status(togetherRes.status).json({ error: errData.error?.message || 'Erreur Together AI' });
      }
      console.warn('[Image Proxy] Together AI crédits épuisés — fallback HuggingFace');
    } catch (err) {
      console.warn('[Image Proxy] Together AI indisponible — fallback HuggingFace:', err.message);
    }
  }

  // ── Essai 3 : HuggingFace Inference API ───────────────────────────────────
  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) {
    return res.status(402).json({ error: 'Génération d\'image indisponible — vérifiez OPENAI_API_KEY dans Vercel.' });
  }

  try {
    const hfRes = await fetch('https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hfToken}` },
      body: JSON.stringify({ inputs: prompt, parameters: { width: Math.min(width, 1280), height: Math.min(height, 720) } })
    });

    if (!hfRes.ok) {
      const errText = await hfRes.text();
      return res.status(hfRes.status).json({ error: 'HuggingFace fallback échoué: ' + errText.substring(0, 200) });
    }

    const buffer = await hfRes.arrayBuffer();
    const b64 = Buffer.from(buffer).toString('base64');
    return res.status(200).json({ data: [{ b64_json: b64 }] });

  } catch (err) {
    return res.status(502).json({ error: 'Fallback HuggingFace échoué: ' + err.message });
  }
};
