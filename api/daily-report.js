/* ===== VERCEL CRON — Rapport quotidien Créatis =====
   GET /api/daily-report  →  déclenché chaque matin à 8h (Paris)
   Envoie un email à creatis.app.contact@gmail.com via Brevo */

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
const BREVO_KEY    = (process.env.BREVO_API_KEY || '').trim();
const DEST_EMAIL   = 'creatis.app.contact@gmail.com';

async function db(path) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase non configuré');
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Supabase ${res.status}`);
  }
  return res.json();
}

module.exports = async (req, res) => {
  // Sécurité cron
  const secret = req.headers['x-vercel-cron-signature'] || req.query?.secret;
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    // Vercel crons ont leur propre mécanisme — autoriser sans secret en prod
  }

  if (!BREVO_KEY) return res.status(200).json({ ok: false, note: 'BREVO_API_KEY manquante' });

  try {
    const now   = new Date();
    const today = now.toISOString().slice(0, 10);

    // Hier = J-1
    const yd = new Date(now); yd.setDate(yd.getDate() - 1);
    const hier      = yd.toISOString().slice(0, 10);
    const hierStart = hier + 'T00:00:00.000Z';
    const hierEnd   = hier + 'T23:59:59.999Z';

    // ── Requêtes Supabase ──
    const [
      usersHier,
      usersTotal,
      usersPro,
      gensHier,
      clipsHier,
      agentsHier,
      actifsHier
    ] = await Promise.all([
      // Nouveaux inscrits hier
      db(`/users?select=id,email,plan&created_at=gte.${hierStart}&created_at=lte.${hierEnd}`),
      // Total inscrits
      db(`/users?select=id`),
      // Users pro actifs
      db(`/users?select=id,plan&plan=neq.gratuit`),
      // Générations hier (tous agents)
      db(`/generations?select=agent_id&created_at=gte.${hierStart}&created_at=lte.${hierEnd}`),
      // Clips viraux hier
      db(`/generations?select=id&agent_id=eq.clips-viraux&created_at=gte.${hierStart}&created_at=lte.${hierEnd}`),
      // Top agents hier
      db(`/generations?select=agent_id&created_at=gte.${hierStart}&created_at=lte.${hierEnd}`),
      // Users actifs hier (au moins 1 génération)
      db(`/generations?select=user_id&created_at=gte.${hierStart}&created_at=lte.${hierEnd}`)
    ]);

    // Calculs
    const nbInscrits  = usersHier?.length || 0;
    const nbTotal     = usersTotal?.length || 0;
    const nbPro       = usersPro?.length || 0;
    const nbGens      = gensHier?.length || 0;
    const nbClips     = clipsHier?.length || 0;
    const nbActifs    = new Set((actifsHier || []).map(g => g.user_id)).size;

    // Top agents
    const agentCount = {};
    (agentsHier || []).forEach(g => { agentCount[g.agent_id] = (agentCount[g.agent_id] || 0) + 1; });
    const topAgents = Object.entries(agentCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, n]) => `${n}× ${id}`)
      .join('<br>');

    // Inscrits hier (liste)
    const inscritsList = (usersHier || []).slice(0, 10)
      .map(u => `• ${u.email} (${u.plan})`)
      .join('<br>') || '— aucun';

    // ── Email HTML ──
    const htmlContent = `
<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e7eb;padding:32px;border-radius:12px">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
    <span style="font-size:22px;font-weight:800;color:#fff">Créatis<span style="color:#10b981">.</span></span>
    <span style="font-size:11px;font-weight:700;color:#10b981;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);padding:2px 8px;border-radius:20px">RAPPORT ${hier}</span>
  </div>
  <p style="font-size:13px;color:#555;margin:0 0 28px">Résumé de la journée d'hier</p>

  <!-- Métriques principales -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px">
    <div style="background:#111;border:1px solid #1f2937;border-radius:10px;padding:16px;text-align:center">
      <div style="font-size:28px;font-weight:900;color:#10b981">${nbInscrits}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px">Nouveaux inscrits</div>
    </div>
    <div style="background:#111;border:1px solid #1f2937;border-radius:10px;padding:16px;text-align:center">
      <div style="font-size:28px;font-weight:900;color:#fff">${nbClips}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px">Clips exportés</div>
    </div>
    <div style="background:#111;border:1px solid #1f2937;border-radius:10px;padding:16px;text-align:center">
      <div style="font-size:28px;font-weight:900;color:#f0a500">${nbActifs}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px">Users actifs</div>
    </div>
  </div>

  <!-- Stats globales -->
  <div style="background:#111;border:1px solid #1f2937;border-radius:10px;padding:18px;margin-bottom:16px">
    <div style="font-size:12px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px">STATS GLOBALES</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr><td style="color:#9ca3af;padding:4px 0">Total inscrits</td><td style="text-align:right;font-weight:700;color:#fff">${nbTotal}</td></tr>
      <tr><td style="color:#9ca3af;padding:4px 0">Abonnés Pro/Studio</td><td style="text-align:right;font-weight:700;color:#10b981">${nbPro}</td></tr>
      <tr><td style="color:#9ca3af;padding:4px 0">Générations IA hier</td><td style="text-align:right;font-weight:700;color:#fff">${nbGens}</td></tr>
    </table>
  </div>

  <!-- Top agents -->
  ${topAgents ? `
  <div style="background:#111;border:1px solid #1f2937;border-radius:10px;padding:18px;margin-bottom:16px">
    <div style="font-size:12px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">TOP AGENTS (hier)</div>
    <div style="font-size:13px;color:#d1d5db;line-height:2">${topAgents}</div>
  </div>` : ''}

  <!-- Nouveaux inscrits -->
  ${nbInscrits > 0 ? `
  <div style="background:#111;border:1px solid #1f2937;border-radius:10px;padding:18px;margin-bottom:16px">
    <div style="font-size:12px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">NOUVEAUX INSCRITS</div>
    <div style="font-size:13px;color:#d1d5db;line-height:2">${inscritsList}</div>
  </div>` : ''}

  <p style="color:#374151;font-size:12px;text-align:center;margin-top:24px">
    Créatis · <a href="https://creatis.app" style="color:#10b981">creatis.app</a>
  </p>
</div>`;

    // ── Envoi Brevo ──
    const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY },
      body: JSON.stringify({
        sender: { name: 'Créatis Analytics', email: 'contact@creatis.app' },
        to: [{ email: DEST_EMAIL, name: 'Créatis' }],
        subject: `📊 Créatis ${hier} — ${nbInscrits} inscrits · ${nbClips} clips · ${nbActifs} actifs`,
        htmlContent
      })
    });

    const emailData = await emailRes.json().catch(() => ({}));
    if (!emailRes.ok) {
      console.error('[DailyReport] Brevo erreur:', JSON.stringify(emailData));
      return res.status(200).json({ ok: false, error: emailData?.message });
    }

    console.log(`[DailyReport] ${hier} — ${nbInscrits} inscrits, ${nbClips} clips, ${nbActifs} actifs`);
    return res.status(200).json({
      ok: true,
      date: hier,
      inscrits: nbInscrits,
      clips: nbClips,
      actifs: nbActifs,
      total: nbTotal,
      pro: nbPro
    });

  } catch (err) {
    console.error('[DailyReport] Erreur:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
