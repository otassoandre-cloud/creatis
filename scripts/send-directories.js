/* ================================================================
 * SEND DIRECTORIES — Soumission par email aux directories et blogs
 * Usage: node scripts/send-directories.js
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
const SENT_LOG = path.join(__dirname, '..', 'data', 'directories-sent.json');
let sentSet = new Set();
if (fs.existsSync(SENT_LOG)) {
  try { sentSet = new Set(JSON.parse(fs.readFileSync(SENT_LOG, 'utf8')).sent || []); } catch {}
}

// ── TARGETS ──────────────────────────────────────────────────────
const targets = [
  {
    email: 'hello@alternativeto.net',
    nom: 'AlternativeTo',
    type: 'directory',
    subject: 'Add Créatis as OpusClip alternative — AI video clipping for French creators',
    html: `<div style="font-family:sans-serif;max-width:560px;color:#1a1a1a;line-height:1.8">
<p>Hi AlternativeTo team,</p>
<p>I'd love to get <strong>Créatis</strong> listed as an alternative to Opus Clip on your platform.</p>
<p><strong>Créatis</strong> — <a href="https://creatis.app">creatis.app</a><br>
AI tool that turns long YouTube videos into 10 viral 9:16 clips in 30 seconds. Auto-subtitles, smart reframe, viral score. Built specifically for French-speaking creators (unlike Opus Clip which is English-first).</p>
<p><strong>Key details:</strong></p>
<ul>
<li>Category: Video Editing · AI Tools · Content Creation</li>
<li>Free plan available + Pro at €9.90/month</li>
<li>Main alternatives: Opus Clip, Klap, Vizard, Submagic</li>
<li>Unique angle: first AI clip tool built for French-speaking YouTube creators</li>
</ul>
<p>Happy to provide any additional info, screenshots, or description you need.</p>
<p>André<br><span style="color:#888;font-size:13px">Founder · Créatis · contact@creatis.app</span></p>
</div>`
  },
  {
    email: 'hello@exemplary.ai',
    nom: 'Exemplary AI blog',
    type: 'blog_alternatives',
    subject: 'Add Créatis to your "Best Opus Clip Alternatives 2026" article?',
    html: `<div style="font-family:sans-serif;max-width:560px;color:#1a1a1a;line-height:1.8">
<p>Hi Exemplary AI team,</p>
<p>I saw your article listing the best Opus Clip alternatives — and I think <strong>Créatis</strong> would be a strong addition.</p>
<p><strong>Créatis</strong> is the first AI clip tool built specifically for <strong>French-speaking YouTube creators</strong>. Upload a long video → 10 viral clips (9:16) with burned subtitles and auto-reframe in 30 seconds.</p>
<p>What makes it different from the tools you already listed: it's optimized for French content (Opus Clip struggles with French transcription), and it's priced for the European market at €9.90/month vs $29 USD.</p>
<p>→ <a href="https://creatis.app">creatis.app</a></p>
<p>Happy to provide a free trial account so you can test it for your article.</p>
<p>André<br><span style="color:#888;font-size:13px">Founder · Créatis</span></p>
</div>`
  },
  {
    email: 'contact@creaxper.com',
    nom: 'Creaxper',
    type: 'blog',
    subject: 'Créatis — outil clips IA pour créateurs FR (lien affilié 30%)',
    html: `<div style="font-family:sans-serif;max-width:560px;color:#1a1a1a;line-height:1.8">
<p>Bonjour,</p>
<p>Je te contacte pour te présenter <strong>Créatis</strong> — l'alternative française à OpusClip.</p>
<p>Tu uploades une vidéo longue, l'IA sort 10 clips 9:16 avec sous-titres et recadrage automatique en 30 secondes. Fait pour les créateurs YouTube francophones.</p>
<p><strong>Programme affilié : 30% récurrent par inscription Pro.</strong></p>
<p>→ <a href="https://creatis.app/affiliation" style="color:#10b981">creatis.app/affiliation</a></p>
<p>André<br><span style="color:#888;font-size:13px">Fondateur · Créatis</span></p>
</div>`
  }
];

// ── BREVO ────────────────────────────────────────────────────────
function brevoSend(t) {
  const body = JSON.stringify({
    to: [{ email: t.email, name: t.nom }],
    subject: t.subject,
    sender: { name: 'André — Créatis', email: 'contact@creatis.app' },
    htmlContent: t.html,
    tags: ['directories', t.type]
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
  const pending = targets.filter(t => !sentSet.has(t.email));
  console.log(`\n📋 Total targets : ${targets.length}`);
  console.log(`✅ Déjà envoyés  : ${sentSet.size}`);
  console.log(`📤 À envoyer     : ${pending.length}\n`);

  let ok = 0, err = 0;
  for (let i = 0; i < pending.length; i++) {
    const t = pending[i];
    const r = await brevoSend(t);
    if (r.ok) { sentSet.add(t.email); ok++; console.log(`✓ [${i+1}/${pending.length}] ${t.nom} (${t.email})`); }
    else { err++; console.log(`✗ [${i+1}/${pending.length}] ${t.nom} — ${r.status} ${r.buf?.slice(0,80)}`); }
    await new Promise(r => setTimeout(r, 300));
  }
  save();
  console.log(`\n${'═'.repeat(48)}`);
  console.log(`✅ Envoyés : ${ok}  ❌ Erreurs : ${err}`);
})();
