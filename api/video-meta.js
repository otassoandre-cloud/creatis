/* ===== VERCEL FUNCTION — Proxy video-meta vers Railway =====
   POST /api/video-meta
   Body: { url }  ← URL TikTok, Instagram ou YouTube
   Retourne: { platform, titre, vues, likes, commentaires, duree, auteur, tags, datePublication }
*/

const REPURPOSE_SERVICE_URL = (process.env.REPURPOSE_SERVICE_URL || '').trim();
const REPURPOSE_SERVICE_SECRET = (process.env.REPURPOSE_SERVICE_SECRET || '').trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'url requis' });

  if (!REPURPOSE_SERVICE_URL) return res.status(503).json({ error: 'Service non configuré' });

  try {
    const r = await fetch(`${REPURPOSE_SERVICE_URL}/video-meta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${REPURPOSE_SERVICE_SECRET}`,
      },
      body: JSON.stringify({ url }),
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
