/* ===== VERCEL FUNCTION — Suppression de fond (RMBG-1.4) ===== */
/* POST /api/remove-bg
   Body: { image: "data:image/...;base64,..." }
   Returns: { image: "data:image/png;base64,..." } avec fond transparent */

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { image } = req.body || {};
  if (!image || !image.startsWith('data:image')) {
    return res.status(400).json({ error: 'Image manquante ou format invalide' });
  }

  try {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const hfToken = process.env.HF_TOKEN;
    const headers = { 'Content-Type': 'application/octet-stream' };
    if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`;

    const response = await fetch('https://api-inference.huggingface.co/models/briaai/RMBG-1.4', {
      method: 'POST',
      headers,
      body: buffer
    });

    if (response.status === 503) {
      return res.status(503).json({ error: 'Modèle en cours de chargement — réessaie dans 20 secondes' });
    }
    if (!response.ok) {
      const err = await response.text().catch(() => '');
      return res.status(500).json({ error: `Suppression de fond échouée (${response.status})`, details: err });
    }

    const resultBuffer = await response.arrayBuffer();
    const base64Result = Buffer.from(resultBuffer).toString('base64');
    res.json({ image: `data:image/png;base64,${base64Result}` });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
