/* ===== VERCEL FUNCTION — Parrainage ===== */
/* GET  /api/parrainage?code=XXXXXXXX  → stats du parrain
   GET  /api/parrainage?admin=1        → liste tous les affiliés triés (usage admin-affiliation.html)
   POST /api/parrainage                → enregistre un filleul */

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();

/* Paliers du programme d'affiliation — index = position dans ce tableau (1-based pour affiliate_highest_tier) */
const PALIERS = [
  { seuil: 5, recompense: '1 mois Pro offert' },
  { seuil: 10, recompense: 'Créatis Pro à vie' },
  { seuil: 25, recompense: '100€ cash' },
  { seuil: 50, recompense: 'Commission passe à 35%' },
  { seuil: 100, recompense: 'Commission passe à 40%' }
];

function palierAtteint(nbActifs) {
  let idx = 0;
  for (let i = 0; i < PALIERS.length; i++) {
    if (nbActifs >= PALIERS[i].seuil) idx = i + 1;
  }
  return idx; // 0 = aucun palier
}

async function supabaseGet(table, match, select = '*') {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const query = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}&select=${select}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  if (!res.ok) return null;
  return await res.json();
}

async function supabasePatch(table, match, data) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  const query = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(data)
  });
  return res.ok;
}

module.exports = async (req, res) => {
  const APP_URL = process.env.APP_URL || 'https://creatis.app';
  res.setHeader('Access-Control-Allow-Origin', APP_URL);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  /* GET ?admin=1 — liste tous les affiliés triés par filleuls actifs (admin-affiliation.html)
     Protégé par token serveur — jamais de mot de passe en clair côté client. */
  if (req.method === 'GET' && req.query?.admin) {
    const adminToken = (process.env.ADMIN_TOKEN || '').trim();
    const auth = (req.headers['authorization'] || '').replace('Bearer ', '');
    if (!adminToken || auth !== adminToken) return res.status(401).json({ error: 'unauthorized' });

    if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(200).json({ affilies: [] });

    try {
      const res1 = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,email,nom,plan,referred_by,affiliate_highest_tier&limit=5000`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      if (!res1.ok) {
        const detail = await res1.text().catch(() => '');
        throw new Error(`Supabase ${res1.status}: ${detail.slice(0, 300)}`);
      }
      const tous = await res1.json();

      // Résoudre chaque code affilié (préfixe 12 car. d'uuid) vers son propriétaire
      const parCode = new Map();
      tous.forEach(u => parCode.set(String(u.id).slice(0, 12).toLowerCase(), u));

      // Grouper les filleuls par code parrain
      const groupes = new Map();
      tous.filter(u => u.referred_by).forEach(u => {
        const code = String(u.referred_by).toLowerCase();
        if (!groupes.has(code)) groupes.set(code, []);
        groupes.get(code).push(u);
      });

      const affilies = [...groupes.entries()].map(([code, filleuls]) => {
        const proprietaire = parCode.get(code);
        const actifs = filleuls.filter(u => u.plan && u.plan !== 'gratuit').length;
        const palier = palierAtteint(actifs);
        return {
          code,
          email: proprietaire?.email || '(inconnu)',
          nom: proprietaire?.nom || '',
          inscrits: filleuls.length,
          actifs,
          palierActuel: palier,
          recompenseActuelle: palier > 0 ? PALIERS[palier - 1].recompense : null,
          prochainPalier: palier < PALIERS.length ? PALIERS[palier] : null,
          highestTierEnregistre: proprietaire?.affiliate_highest_tier || 0
        };
      }).sort((a, b) => b.actifs - a.actifs);

      return res.status(200).json({ affilies, paliers: PALIERS });
    } catch (e) {
      console.error('[Parrainage] GET admin error:', e.message);
      return res.status(200).json({ affilies: [], error: e.message });
    }
  }

  /* GET — stats du parrain */
  if (req.method === 'GET') {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'code manquant' });

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(200).json({ inscrits: 0, abonnes: 0, mois: 0 });
    }

    try {
      const filleuls = await supabaseGet('users', { referred_by: code }, 'id,plan');
      if (!filleuls) return res.status(200).json({ inscrits: 0, abonnes: 0, mois: 0 });

      const inscrits = filleuls.length;
      const abonnes = filleuls.filter(u => u.plan && u.plan !== 'gratuit').length;
      const palier = palierAtteint(abonnes);
      return res.status(200).json({
        inscrits, abonnes, mois: abonnes,
        palierActuel: palier,
        recompenseActuelle: palier > 0 ? PALIERS[palier - 1].recompense : null,
        prochainPalier: palier < PALIERS.length ? PALIERS[palier] : null
      });
    } catch (e) {
      console.error('[Parrainage] GET error:', e.message);
      return res.status(200).json({ inscrits: 0, abonnes: 0, mois: 0 });
    }
  }

  /* POST — enregistre que userId a été parrainé par refCode */
  if (req.method === 'POST') {
    const { userId, refCode } = req.body || {};
    if (!userId || !refCode) return res.status(400).json({ error: 'userId et refCode requis' });

    try {
      // Format attendu : préfixe d'UUID (hex + tirets uniquement). Tout autre → ignoré (anti-injection).
      if (!/^[a-f0-9-]{8,36}$/i.test(refCode)) {
        console.log(`[Parrainage] Code au format invalide ignoré: ${refCode}`);
        return res.status(200).json({ ok: false, ignored: 'bad_format' });
      }
      if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(200).json({ ok: false, ignored: 'no_db' });

      // La colonne `id` est de type uuid → LIKE impossible. Le refCode est un PRÉFIXE d'uuid
      // (12 premiers caractères) → on borne la plage uuid correspondante (gte/lte).
      const code = refCode.toLowerCase();
      const lo = code + '00000000-0000-0000-0000-000000000000'.slice(code.length);
      const hi = code + 'ffffffff-ffff-ffff-ffff-ffffffffffff'.slice(code.length);
      const check = await fetch(
        `${SUPABASE_URL}/rest/v1/users?id=gte.${lo}&id=lte.${hi}&select=id&limit=1`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      const affilies = check.ok ? await check.json() : [];
      if (!affilies.length) {
        console.log(`[Parrainage] Code inconnu ignoré: ${refCode}`);
        return res.status(200).json({ ok: false, ignored: 'unknown_code' });
      }

      // Anti auto-parrainage : l'affilié trouvé ne peut pas être l'utilisateur lui-même.
      if (affilies[0].id === userId) {
        console.log(`[Parrainage] Auto-parrainage ignoré: ${userId}`);
        return res.status(200).json({ ok: false, ignored: 'self_referral' });
      }

      await supabasePatch('users', { id: userId }, {
        referred_by: refCode,
        updated_at: new Date().toISOString()
      });
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('[Parrainage] POST error:', e.message);
      return res.status(200).json({ ok: false });
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
};
