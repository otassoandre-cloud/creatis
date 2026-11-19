/* ================================================================
 * SEND INFLUENCEURS — Créateurs FR ciblés (reviewers outils IA)
 * Usage: node scripts/send-influenceurs.js
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

// ── SENT LOG ─────────────────────────────────────────────────────
const SENT_LOG = path.join(__dirname, '..', 'data', 'influenceurs-sent.json');
let sentSet = new Set();
if (fs.existsSync(SENT_LOG)) {
  try { sentSet = new Set(JSON.parse(fs.readFileSync(SENT_LOG, 'utf8')).sent || []); } catch {}
}

// ── PROSPECTS ────────────────────────────────────────────────────
const prospects = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'influenceurs-prospects.json'), 'utf8')
);

const pending = prospects.filter(p => !sentSet.has(p.email));
console.log(`\n📋 Total influenceurs : ${prospects.length}`);
console.log(`✅ Déjà contactés    : ${sentSet.size}`);
console.log(`📤 À envoyer         : ${pending.length}\n`);

// ── TEMPLATE ─────────────────────────────────────────────────────
function buildEmail(p) {
  const isReviewer = p.type === 'reviewer' || p.type === 'blog';

  if (isReviewer) {
    // Reviewers d'outils (ont testé OpusClip etc.) → angle test + affiliation
    return {
      subject: `test Créatis en avant-première + lien affilié 30%`,
      html: `<div style="font-family:sans-serif;max-width:480px;color:#1a1a1a;line-height:1.9">
<p>Salut ${p.prenom},</p>
<p>J'ai vu tes contenus sur les outils clips/Shorts — tu parles exactement à mon audience.</p>
<p>Je t'envoie un accès <strong>Pro gratuit</strong> à <strong>Créatis</strong> pour tester : c'est l'alternative française à OpusClip. Upload une vidéo, l'IA sort 10 clips 9:16 avec sous-titres en 30 secondes.</p>
<p>Et si tu veux en parler : <strong>30% récurrent par inscription Pro</strong> que tu génères. Pas de minimum, pas de script imposé.</p>
<p>→ <a href="https://creatis.app/affiliation" style="color:#10b981;font-weight:bold">creatis.app/affiliation</a></p>
<p style="margin-top:20px">André<br><span style="color:#888;font-size:13px">Fondateur · Créatis</span></p>
<p style="font-size:11px;color:#aaa">Se désabonner : <a href="mailto:contact@creatis.app?subject=unsubscribe">ici</a></p>
</div>`
    };
  }

  // YouTubeurs IA / tech / créateurs → angle affilié pur
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
    tags: ['influenceurs', p.type]
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
      console.log(`✓ [${i+1}/${pending.length}] ${p.handle} (${p.email})`);
    } else {
      err++;
      console.log(`✗ [${i+1}/${pending.length}] ${p.handle} — ${r.status} ${r.buf?.slice(0,100)}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }
  save();
  console.log(`\n${'═'.repeat(48)}`);
  console.log(`✅ Envoyés : ${ok}  ❌ Erreurs : ${err}`);
})();
