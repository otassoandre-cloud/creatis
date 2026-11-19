/* ================================================================
 * SEND TIKTOK CAMPAIGN — 430 contacts via Brevo API
 * Usage: node scripts/send-tiktok-campaign.js
 * Résumable : reprend là où ça s'est arrêté (data/tiktok-campaign-sent.json)
 * ================================================================ */
const fs   = require('fs');
const path = require('path');
const https = require('https');

// ── ENV ──────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env');
const envVars = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) envVars[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
});
const BREVO_KEY = envVars.BREVO_API_KEY || '';
if (!BREVO_KEY) { console.error('❌ BREVO_API_KEY manquant dans .env'); process.exit(1); }

// ── SENT LOG (résumable) ─────────────────────────────────────────
const SENT_LOG = path.join(__dirname, '..', 'data', 'tiktok-campaign-sent.json');
let sentSet = new Set();
if (fs.existsSync(SENT_LOG)) {
  try { sentSet = new Set(JSON.parse(fs.readFileSync(SENT_LOG, 'utf8')).sent || []); } catch {}
}

// ── PARSE CONTACTS ────────────────────────────────────────────────
const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'tiktok-email-links.txt'), 'utf8');
const contacts = [];
raw.split('\n').forEach(line => {
  const m = line.match(/tiktok\.com\/@([^\s]+)\s+→\s+([^\s]+)/);
  if (!m) return;
  const handle = '@' + m[1].trim();
  const email  = m[2].trim().replace(/^-/, '').toLowerCase();
  if (email && email.includes('@') && email.includes('.')) {
    contacts.push({ handle, email });
  }
});

const pending = contacts.filter(c => !sentSet.has(c.email));
console.log(`\n📋 Total contacts : ${contacts.length}`);
console.log(`✅ Déjà envoyés   : ${sentSet.size}`);
console.log(`📤 À envoyer      : ${pending.length}\n`);
if (pending.length === 0) { console.log('Rien à envoyer.'); process.exit(0); }

// ── TEMPLATE ─────────────────────────────────────────────────────
const FR_HINTS = /\.(fr)$|vlog|astuces|quiz|fr\b|\.fr\b/i;

function buildEmail(contact) {
  const parts = contact.handle.replace('@', '').replace(/^[._]+/, '').split(/[._]/);
  const raw   = parts.find(p => p.length > 0) || 'Créateur';
  const name  = raw.charAt(0).toUpperCase() + raw.slice(1);
  const isFr = FR_HINTS.test(contact.email) || FR_HINTS.test(contact.handle);

  if (isFr) {
    return {
      subject: `${name} — programme affilié Créatis (30% récurrent à vie)`,
      html: `<div style="font-family:sans-serif;max-width:480px;color:#1a1a1a;line-height:1.8">
<p>Salut ${name} 👋</p>
<p>J'ai vu ton contenu sur TikTok — tu parles exactement aux créateurs qui ont besoin de Créatis.</p>
<p><strong>Créatis</strong> = outil IA pour YouTubeurs FR. Script complet + miniature en 30 secondes.</p>
<p>Programme affilié : <strong>30% récurrent à vie</strong>. Chaque abonné Pro = <strong>5,70€/mois</strong> pour toi, pour toujours.</p>
<p>10 abonnés = 57€/mois passif. 50 abonnés = 285€/mois.</p>
<p>Aucune audience minimale.</p>
<p>Intéressé(e) ? Réponds à cet email ou visite <a href="https://creatis.app/affiliation" style="color:#10b981;font-weight:bold">creatis.app/affiliation</a></p>
<p style="margin-top:24px">André<br><span style="color:#888;font-size:13px">Fondateur · Créatis</span></p>
<p style="font-size:11px;color:#aaa">Pour ne plus recevoir : <a href="mailto:contact@creatis.app?subject=unsubscribe">se désabonner</a></p>
</div>`
    };
  }

  return {
    subject: `${name} — 30% recurring affiliate program (Créatis AI for YouTube)`,
    html: `<div style="font-family:sans-serif;max-width:480px;color:#1a1a1a;line-height:1.8">
<p>Hey ${name} 👋</p>
<p>Found your TikTok — you're talking to exactly the audience that needs Créatis.</p>
<p><strong>Créatis</strong> is an AI tool for YouTube creators. Full script + thumbnail in 30 seconds.</p>
<p>Affiliate program: <strong>30% recurring forever</strong>. Each Pro subscriber you bring = <strong>€5.70/month</strong>, indefinitely.</p>
<p>10 subscribers = €57/month passive. 50 = €285/month.</p>
<p>No minimum audience required.</p>
<p>Interested? Reply or visit <a href="https://creatis.app/affiliation" style="color:#10b981;font-weight:bold">creatis.app/affiliation</a></p>
<p style="margin-top:24px">André<br><span style="color:#888;font-size:13px">Founder · Créatis</span></p>
<p style="font-size:11px;color:#aaa">To unsubscribe: <a href="mailto:contact@creatis.app?subject=unsubscribe">click here</a></p>
</div>`
  };
}

// ── BREVO SEND ───────────────────────────────────────────────────
function brevoSend(contact) {
  const msg  = buildEmail(contact);
  const parts2 = contact.handle.replace('@', '').replace(/^[._]+/, '').split(/[._]/);
  const n2     = parts2.find(p => p.length > 0) || 'Créateur';
  const name   = n2.charAt(0).toUpperCase() + n2.slice(1);

  const body = JSON.stringify({
    to: [{ email: contact.email, name }],
    subject: msg.subject,
    sender: { name: 'André — Créatis', email: 'contact@creatis.app' },
    htmlContent: msg.html,
    tags: ['tiktok-campaign']
  });

  return new Promise(resolve => {
    const req = https.request({
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, buf }));
    });
    req.on('error', e => resolve({ ok: false, error: e.message }));
    req.write(body); req.end();
  });
}

// ── SAVE PROGRESS ────────────────────────────────────────────────
function save() {
  fs.writeFileSync(SENT_LOG, JSON.stringify({ sent: [...sentSet], updatedAt: new Date().toISOString() }, null, 2));
}

// ── MAIN ─────────────────────────────────────────────────────────
(async () => {
  let sentCount = 0, errCount = 0;
  const errors = [];
  const startTime = Date.now();

  for (let i = 0; i < pending.length; i++) {
    const c = pending[i];

    const r = await brevoSend(c);

    if (r.ok) {
      sentSet.add(c.email);
      sentCount++;
      process.stdout.write(`✓ [${i+1}/${pending.length}] ${c.handle}\n`);
    } else {
      errCount++;
      const errMsg = r.buf || r.error || '';
      errors.push({ handle: c.handle, email: c.email, status: r.status, err: errMsg });
      process.stdout.write(`✗ [${i+1}/${pending.length}] ${c.handle} — HTTP ${r.status}\n`);

      // Rate limit hit → pause 10s
      if (r.status === 429) {
        console.log('⏳ Rate limit — pause 10s...');
        await new Promise(r => setTimeout(r, 10000));
      }
    }

    if ((i + 1) % 10 === 0) save();
    await new Promise(r => setTimeout(r, 220));
  }

  save();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ Envoyés  : ${sentCount}`);
  console.log(`❌ Erreurs  : ${errCount}`);
  console.log(`⏱  Durée    : ${elapsed}s`);
  if (errors.length) {
    console.log('\n— Erreurs détaillées :');
    errors.forEach(e => console.log(`  ${e.handle} (${e.email}) : ${e.status} ${e.err.slice(0,120)}`));
  }
})();
