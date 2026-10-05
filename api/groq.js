/* ===== VERCEL FUNCTION — Proxy Groq API ===== */
/* POST /api/groq
   Body: { model, messages, temperature, max_tokens }
   Auth JWT réelle via Supabase + rate limiting + quota plan gratuit */

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
const FREE_GENERATION_LIMIT = 1;  // 1 génération gratuite pour découvrir
const PRO_GENERATION_LIMIT = 50; // 50/mois en Pro — illimité en Studio

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

const ipDemoLimit = new Map();
const DEMO_MAX = 3;
const DEMO_WINDOW = 24 * 60 * 60 * 1000;

function checkDemoLimit(ip) {
  const now = Date.now();
  let entry = ipDemoLimit.get(ip);
  if (!entry || now > entry.reset) entry = { count: 0, reset: now + DEMO_WINDOW };
  if (entry.count >= DEMO_MAX) return false;
  entry.count++;
  ipDemoLimit.set(ip, entry);
  return true;
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

/* ── Vérifier quota selon le plan ── */
async function checkQuota(userId) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return { ok: true }; // fail open si Supabase down
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=plan,generations_used,generations_reset_at,abonnements(status,past_due_depuis)`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    if (!res.ok) return { ok: true }; // fail open
    const rows = await res.json();
    const user = rows?.[0];
    if (!user) return { ok: true };

    /* Un abonnement impayé depuis plus de 72 h ne donne plus le quota payant.
       Même règle et mêmes garde-fous que `planEffectif` dans api/repurpose.js —
       le raisonnement complet y est documenté ; ici on n'en garde que la
       décision, ce fichier étant sur le chemin des agents et non du produit
       vendu. On ne restreint que s'il existe une ligne explicitement en défaut,
       datée, et aucune ligne active à côté. */
    const abos = Array.isArray(user.abonnements) ? user.abonnements : [];
    const actif = abos.some((a) => a.status === 'active' || a.status === 'trialing');
    const impayeDepuis = abos
      .filter((a) => a.status === 'past_due' || a.status === 'unpaid')
      .map((a) => new Date(a.past_due_depuis).getTime())
      .filter((t) => Number.isFinite(t));
    if (!actif && impayeDepuis.length && Date.now() - Math.min(...impayeDepuis) > 72 * 3600e3) {
      user.plan = 'gratuit';
    }

    if (user.plan === 'studio') return { ok: true }; // Studio = illimité

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const resetAt = user.generations_reset_at ? new Date(user.generations_reset_at) : null;
    const resetMonth = resetAt ? `${resetAt.getFullYear()}-${String(resetAt.getMonth() + 1).padStart(2, '0')}` : null;
    const used = resetMonth === monthKey ? (user.generations_used || 0) : 0;

    if (user.plan === 'gratuit') {
      if (used >= FREE_GENERATION_LIMIT) {
        return { ok: false, error: `Ta génération gratuite a été utilisée. Passe au plan Pro pour 50 générations/mois.` };
      }
    } else if (user.plan === 'pro') {
      if (used >= PRO_GENERATION_LIMIT) {
        return { ok: false, error: `Tu as atteint les ${PRO_GENERATION_LIMIT} générations Pro ce mois-ci — ça se réinitialise le mois prochain. Besoin de plus ? Écris-nous à contact@creatis.app.` };
      }
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
    if (!token && !isLocal) {
      if (!checkDemoLimit(ip)) {
        return res.status(403).json({ error: 'Limite démo atteinte — crée ton compte gratuit pour voir ton résultat', demo_limit: true });
      }
      // Demo mode: allow limited generation, skip quota check
    } else if (token) {
      const user = await verifyTokenStrict(token);
      if (!user) return res.status(401).json({ error: 'Session expirée — reconnecte-toi' });

      /* ── Quota plan gratuit côté serveur ── */
      const quota = await checkQuota(user.id);
      if (!quota.ok) return res.status(429).json({ error: quota.error, quota_exceeded: true });
    }
  }

  const groqKey     = process.env.GROQ_API_KEY;
  const togetherKey = process.env.TOGETHER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'Groq API non configurée' });

  const { model, messages, temperature, max_tokens } = req.body || {};
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Paramètre messages manquant' });

  const params = {
    messages,
    temperature: temperature ?? 0.8,
    max_tokens: max_tokens || 4096,
    stream: false
  };

  /* ── Appel générique (Groq ou Together) ── */
  async function callLLM(provider) {
    const isGroq = provider === 'groq';
    const url    = isGroq
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.together.xyz/v1/chat/completions';
    const key    = isGroq ? groqKey : togetherKey;
    const mdl    = isGroq
      ? (model || 'openai/gpt-oss-120b')
      : 'meta-llama/Llama-3.3-70B-Instruct-Turbo';

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: mdl, ...params })
    });
    return res;
  }

  const MAX_RETRIES = 3;
  let lastErr = null;
  let groqRateLimited = false;
  let groqIndisponible = false;   // modèle retiré, clé refusée, panne côté Groq…

  /* ── Tentatives Groq ── */
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const groqRes = await callLLM('groq');

      if (groqRes.status === 429) {
        const retryAfter = parseInt(groqRes.headers.get('retry-after') || '2', 10);
        const wait = Math.min(retryAfter * 1000, 6000) * attempt;
        console.warn(`[Groq] Rate limit (tentative ${attempt}/${MAX_RETRIES}), attente ${wait}ms`);
        if (attempt < MAX_RETRIES) { await new Promise(r => setTimeout(r, wait)); continue; }
        groqRateLimited = true;
        break;
      }

      if (!groqRes.ok) {
        const errData = await groqRes.json().catch(() => ({}));
        console.error('[Groq] Erreur API:', groqRes.status, errData);
        /* Le filet Together ne se déclenchait QUE sur un 429 ou une coupure réseau. Toute autre
           erreur repartait telle quelle vers le navigateur. Quand Groq a retiré
           `llama-3.3-70b-versatile` de son catalogue, chaque appel a répondu 404 et les huit
           agents ont cessé de fonctionner d'un coup — alors que Together, lui, répondait.
           Un modèle retiré est exactement le cas où un filet doit servir. */
        groqIndisponible = true;
        break;
      }

      return res.status(200).json(await groqRes.json());

    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }

  /* ── Fallback Together AI ── */
  if ((groqRateLimited || groqIndisponible) && togetherKey) {
    console.warn(`[Together] Fallback activé (${groqRateLimited ? 'Groq rate-limité' : 'Groq indisponible'})`);
    try {
      const togetherRes = await callLLM('together');
      if (togetherRes.ok) return res.status(200).json(await togetherRes.json());
      const errData = await togetherRes.json().catch(() => ({}));
      console.error('[Together] Erreur:', togetherRes.status, errData);
    } catch (err) {
      console.error('[Together] Erreur réseau:', err.message);
    }
  }

  /* ── Dernier filet : Gemini ──────────────────────────────────────────────
     Together est a 402 depuis le 15/09 (compte a sec), donc le filet precedent
     ne rattrapait plus rien : quand le budget Groq du jour etait consomme —
     200 000 tokens pour TOUTE l'organisation, soit quelques heures de trafic —
     l'assistant renvoyait « Impossible de joindre Groq » a tout le monde. Un
     abonne l'a signale le 26/09 : « je ne peux meme pas joindre Creatis IA ».

     Gemini a son propre quota, independant de Groq. Son API ne parle pas le
     dialecte OpenAI : on traduit a l'aller (roles -> `contents`, le message
     systeme devenant `system_instruction`) et au retour (texte -> `choices`),
     pour que le client ne voie aucune difference. */
  if (geminiKey) {
    try {
      const systeme = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
      const contents = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
      const corps = {
        contents: contents.length ? contents : [{ role: 'user', parts: [{ text: systeme || 'Bonjour' }] }],
        /* Les modeles Gemini 3 raisonnent AVANT de repondre et paient ce
           raisonnement sur le meme budget de sortie. Recopier `max_tokens` tel
           quel rendait des reponses coupees au premier mot : un essai a 120
           jetons a renvoye « Bonjour » et rien d'autre. On ajoute donc une
           reserve pour la reflexion, et un plancher pour les petites demandes. */
        generationConfig: {
          temperature: params.temperature,
          maxOutputTokens: Math.max(params.max_tokens, 1024) + 2048,
        },
      };
      if (systeme && contents.length) corps.system_instruction = { parts: [{ text: systeme }] };

      /* Les quotas gratuits de Google se comptent PAR MODELE : le 26/09/2026,
         gemini-3.6-flash renvoyait 429 pendant que gemini-3.5-flash repondait
         avec la MEME cle. Un seul modele code en dur, c'est un filet qui cede
         au moment ou il doit servir. Du plus capable au plus econome, le
         premier qui repond gagne ; 429 et 404 passent au suivant. */
      const MODELES = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
      for (const modele of MODELES) {
        const gRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent?key=${geminiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) },
        );
        /* 429 quota epuise, 404 modele retire, 5xx surcharge passagere : trois
           raisons d'essayer le suivant. Un 503 faisait auparavant abandonner
           toute la chaine alors que les modeles d'apres etaient disponibles.
           On ne s'arrete que sur une 4xx de contenu — un prompt refuse le sera
           par tous les modeles, changer de cheval n'y changerait rien. */
        if (gRes.status === 429 || gRes.status === 404 || gRes.status >= 500) {
          console.warn(`[Gemini] ${modele} indisponible (${gRes.status}), modele suivant`);
          continue;
        }
        if (!gRes.ok) {
          console.error('[Gemini] Erreur:', gRes.status, (await gRes.text().catch(() => '')).slice(0, 200));
          break;
        }
        const data = await gRes.json();
        const texte = (data?.candidates?.[0]?.content?.parts || [])
          .map((part) => part.text || '')
          .join('')
          .trim();
        if (!texte) { console.error('[Gemini] Reponse vide de', modele); continue; }
        console.warn(`[Gemini] Filet active via ${modele} — Groq et Together indisponibles`);
        return res.status(200).json({
          id: 'gemini-' + Date.now(),
          object: 'chat.completion',
          model: modele,
          choices: [{ index: 0, message: { role: 'assistant', content: texte }, finish_reason: 'stop' }],
          usage: data?.usageMetadata || {},
        });
      }
    } catch (err) {
      console.error('[Gemini] Erreur reseau:', err.message);
    }
  }

  console.error('[Groq Proxy] Erreur réseau:', lastErr?.message);
  return res.status(502).json({ error: 'Impossible de joindre Groq — ' + lastErr?.message });
};
