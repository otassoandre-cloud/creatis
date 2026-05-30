/* POST /api/contact
   Body: { nom, email, sujet, message } */

const BREVO_BASE = 'https://api.brevo.com/v3';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { nom, email, sujet, message } = req.body || {};
  if (!message || message.trim().length < 5) return res.status(400).json({ error: 'Message trop court' });

  const key = (process.env.BREVO_API_KEY || '').trim();
  if (!key) return res.status(503).json({ error: 'Service email non configuré' });

  const html = `
    <div style="font-family:sans-serif;max-width:600px;color:#1a1a1a;line-height:1.7">
      <div style="background:#0a0f0a;padding:20px 24px;border-radius:8px 8px 0 0">
        <span style="font-size:20px;font-weight:900;color:#fff">Créatis<span style="color:#10b981">.</span></span>
      </div>
      <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e5e5">
        <h2 style="margin:0 0 16px;font-size:18px">Nouveau message de contact</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr><td style="padding:8px 0;color:#666;width:80px">De</td><td style="padding:8px 0;font-weight:600">${nom || 'Inconnu'} &lt;${email || 'inconnu'}&gt;</td></tr>
          <tr><td style="padding:8px 0;color:#666">Sujet</td><td style="padding:8px 0;font-weight:600">${sujet || 'Sans sujet'}</td></tr>
        </table>
        <div style="background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:20px;white-space:pre-wrap;font-size:15px">${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
        <p style="font-size:12px;color:#aaa;margin-top:20px">Envoyé depuis creatis.app/app.html</p>
      </div>
    </div>`;

  try {
    const r = await fetch(`${BREVO_BASE}/smtp/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': key },
      body: JSON.stringify({
        sender: { name: 'Créatis Contact', email: 'noreply@creatis.app' },
        to: [{ email: 'creatis.app.contact@gmail.com', name: 'André — Créatis' }],
        replyTo: { email: email || 'noreply@creatis.app', name: nom || 'Utilisateur' },
        subject: `[Contact Créatis] ${sujet || 'Nouveau message'}`,
        htmlContent: html,
      })
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.message || 'Erreur Brevo');
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[contact]', e.message);
    return res.status(500).json({ error: e.message });
  }
};
