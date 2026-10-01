/* ================================================================
 * SEND YOUTUBE AFFILIATE — Batch 1 (candidats déjà identifiés avec email)
 * Source: data/youtube-affiliate-emails.json (curé manuellement ci-dessous)
 * Dédup: data/influenceurs-sent.json (log commun à tous les batchs influenceurs)
 * Usage: node scripts/send-youtube-affiliate-batch1.js
 * ================================================================ */
const fs    = require('fs');
const path  = require('path');
const https = require('https');

// ── ENV ──────────────────────────────────────────────────────────
const envVars = {};
fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n').forEach(l => {
  const i = l.indexOf('=');
  if (i > 0) envVars[l.slice(0, i).trim()] = l.slice(i + 1).trim();
});
const BREVO_KEY = envVars.BREVO_API_KEY || '';
if (!BREVO_KEY) { console.error('❌ BREVO_API_KEY manquant'); process.exit(1); }

// ── SENT LOG (partagé avec send-influenceurs.js) ────────────────
const SENT_LOG = path.join(__dirname, '..', 'data', 'influenceurs-sent.json');
let sentSet = new Set();
if (fs.existsSync(SENT_LOG)) {
  try { sentSet = new Set(JSON.parse(fs.readFileSync(SENT_LOG, 'utf8')).sent || []); } catch {}
}

// ── CANDIDATS CURÉS (niche IA/growth/créateurs FR, audience solvable) ──
// Exclus de youtube-affiliate-emails.json : "Elegant clips shorts" (audience non FR),
// "WOLOF TUTO" (audience à faible solvabilité Stripe), doublon email formation.ai87@gmail.com
const prospects = [
  { channel: 'LEGEND', prenom: "l'équipe LEGEND", email: 'legend@influxcrew.com' },
  { channel: 'Elba.Production', prenom: "l'équipe Elba Production", email: 'elbaproduction223@gmail.com' },
  { channel: 'Saad Rashid - YouTube Automation', prenom: 'Saad', email: 'contact.saadrashid@gmail.com' },
  { channel: 'Bruce Youtubeur', prenom: 'Bruce', email: 'afoutouvictor@gmail.com' },
  { channel: 'Alexandre Chaimbault', prenom: 'Alexandre', email: 'partenariats@alexandrechaimbault.com' },
  { channel: 'Alex DEW - Automatisation & IA', prenom: 'Alex', email: 'contact@devenirentrepreneurweb.fr' },
  { channel: 'Flow Ai', prenom: "l'équipe Flow Ai", email: 'zenadsonly@gmail.com' },
  { channel: 'AI Upskill', prenom: "l'équipe AI Upskill", email: 'aiupskillcollabs@gmail.com' },
  { channel: 'Décode IA', prenom: "l'équipe Décode IA", email: 'D3code.ia@gmail.com' },
  { channel: 'Saidox AI Flow', prenom: 'Saidox', email: 'saidoxbtl@gmail.com' },
  { channel: 'A Tech Creations', prenom: "l'équipe A Tech Creations", email: 'atechcreations78@gmail.com' },
  { channel: 'Marseille Provence Production', prenom: "l'équipe Marseille Provence Production", email: 'contact@marseilleprovenceproduction.fr' },
  { channel: 'LilPrO 221', prenom: 'LilPrO', email: 'LilPrO.221@gmail.com' },
  { channel: 'Parlons IA & ChatGPT', prenom: "l'équipe Parlons IA", email: 'formation.ai87@gmail.com' },
  { channel: 'Paul Lunick', prenom: 'Paul', email: 'contactpaullunick@gmail.com' },
  { channel: 'IA IRL', prenom: 'Matthieu', email: 'matthieu.iairl@gmail.com' },
  { channel: 'Neurone IA', prenom: "l'équipe Neurone IA", email: 'neurone.ia.tech@gmail.com' },
  { channel: 'Beckett Ai', prenom: 'Beckett', email: 'beckettdean76@gmail.com' }
];

const pending = prospects.filter(p => !sentSet.has(p.email));
console.log(`\n📋 Candidats batch    : ${prospects.length}`);
console.log(`✅ Déjà contactés    : ${prospects.length - pending.length}`);
console.log(`📤 À envoyer         : ${pending.length}\n`);

// ── TEMPLATE (identique à send-influenceurs.js, angle affilié pur) ──
function buildEmail(p) {
  return {
    subject: `lien affilié Créatis — 30% par inscription`,
    html: `<div style="font-family:sans-serif;max-width:480px;color:#1a1a1a;line-height:1.9">
<p>Salut ${p.prenom},</p>
<p>Je te partage le programme affilié <strong>Créatis</strong> — outil IA clips viraux pour YouTubeurs FR.</p>
<p><strong>30% récurrent par inscription Pro.</strong> Chaque abonné que tu amènes = commission mensuelle à vie. Pas d'audience minimale.</p>
<p>Accès Pro gratuit pour tester : <a href="https://creatis.app/affiliation" style="color:#10b981;font-weight:bold">creatis.app/affiliation</a></p>
<p style="margin-top:20px">André<br><span style="color:#888;font-size:13px">Fondateur · Créatis</span></p>
<p style="font-size:11px;color:#aaa">Se désabonner : <a href="mailto:contact@creatis.app?subject=unsubscribe">ici</a></p>
</div>`
  };
}

// ── BREVO ────────────────────────────────────────────────────────
function brevoSend(p) {
  const msg  = buildEmail(p);
  const body = JSON.stringify({
    to: [{ email: p.email, name: p.prenom }],
    subject: msg.subject,
    sender: { name: 'André — Créatis', email: 'contact@creatis.app' },
    htmlContent: msg.html,
    tags: ['influenceurs', 'youtube-affiliate-batch1']
  });
  return new Promise(resolve => {
    const req = https.request({
      hostname: 'api.brevo.com', path: '/v3/smtp/email', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY, 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, buf }));
    });
    req.on('error', e => resolve({ ok: false, error: e.message }));
    req.write(body); req.end();
  });
}

function save() {
  fs.writeFileSync(SENT_LOG, JSON.stringify({ sent: [...sentSet], updatedAt: new Date().toISOString() }, null, 2));
}

(async () => {
  let ok = 0, err = 0;
  for (let i = 0; i < pending.length; i++) {
    const p = pending[i];
    const r = await brevoSend(p);
    if (r.ok) {
      sentSet.add(p.email); ok++;
      console.log(`✓ [${i+1}/${pending.length}] ${p.channel} (${p.email})`);
    } else {
      err++;
      console.log(`✗ [${i+1}/${pending.length}] ${p.channel} — ${r.status} ${r.buf?.slice(0,150)}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }
  save();
  console.log(`\n${'═'.repeat(48)}`);
  console.log(`✅ Envoyés : ${ok}  ❌ Erreurs : ${err}`);
})();
