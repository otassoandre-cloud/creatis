/* ===== VERCEL FUNCTION — Parrainage ===== */
/* GET  /api/parrainage?code=XXXXXXXX  → stats du parrain
   POST /api/parrainage                → enregistre un filleul */

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();

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
      return res.status(200).json({ inscrits, abonnes, mois: abonnes });
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
