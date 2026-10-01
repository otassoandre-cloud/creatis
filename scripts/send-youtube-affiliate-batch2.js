/* ================================================================
 * SEND YOUTUBE AFFILIATE — Batch 2 (personnalisé par chaîne)
 * Source: data/youtube-affiliate-batch2-found.json + candidates-promo*.json
 * Chaque email a une accroche personnalisée basée sur le contenu réel de la chaîne
 * Dédup: data/influenceurs-sent.json (log commun à tous les batchs influenceurs)
 * Usage: node scripts/send-youtube-affiliate-batch2.js
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

// ── SENT LOG (partagé avec send-influenceurs.js / batch1) ───────
const SENT_LOG = path.join(__dirname, '..', 'data', 'influenceurs-sent.json');
let sentSet = new Set();
if (fs.existsSync(SENT_LOG)) {
  try { sentSet = new Set(JSON.parse(fs.readFileSync(SENT_LOG, 'utf8')).sent || []); } catch {}
}

// ── CANDIDATS (chaîne vérifiée avant rédaction, accroche dédiée) ──
const prospects = [
  {
    channel: 'Parlons IA & Tech', email: 'contact@parlonsiatech.com', prenom: "l'équipe Parlons IA & Tech",
    accroche: "Vos épisodes actus IA numérotés (#ParlonsIATech) sortent à un rythme quasi quotidien — de quoi tirer plusieurs extraits courts par épisode sans y passer des heures de montage."
  },
  {
    channel: 'Autodraft AI', email: 'team@autodraft.in', prenom: "l'équipe Autodraft AI",
    accroche: "Vous aidez déjà des créateurs à produire des vidéos animées avec l'IA — Créatis s'adresse à la même audience côté repurposing, donc vos deux outils se complètent bien pour votre communauté."
  },
  {
    channel: 'Silicon Carne', email: 'carlos@siliconcarne.co', prenom: 'Carlos',
    accroche: "Silicon Carne fait déjà du partenariat et du code promo sur vos épisodes actus/tech — le programme Créatis peut s'ajouter facilement à ce que vous avez déjà en place."
  },
  {
    channel: 'Johan : Solutions Digitales', email: 'johan@expandia.io', prenom: 'Johan',
    accroche: "Tu formes déjà tes abonnés aux outils IA pour leur business — Créatis est le genre d'outil que tes élèves te demanderont forcément pour transformer leurs vidéos en clips."
  },
  {
    channel: 'Nicefox · IA & Dev', email: 'conrad@nicefox.net', prenom: 'Conrad',
    accroche: "Vos tests longue durée (le DGX Spark 4 mois, l'IA locale pour les pros) tournent déjà avec des liens affiliés — un lien Créatis en plus pour vos abonnés qui produisent du contenu ne dénature pas la ligne éditoriale."
  },
  {
    channel: 'Ninon IA', email: 'adrien@loopin.ai', prenom: "l'équipe Ninon IA",
    accroche: "Le compte de Ninon (595K, contenu 100% IA en format court) touche exactement l'audience qui cherche des outils comme Créatis pour produire ses propres vidéos."
  },
  {
    channel: 'Alpa14', email: 'info@alpa14.com', prenom: "l'équipe Alpa14",
    accroche: "Vous faites déjà du code promo et du parrainage sur vos tutos WordPress/IA — Créatis s'intègre naturellement à ce format pour vos abonnés créateurs de contenu."
  },
  {
    channel: 'Monsieur IA', email: 'mickael@monsieuria.com', prenom: 'Mickael',
    accroche: "Tes actus IA touchent un public qui teste des outils en continu — Créatis est le genre de outil concret que tu peux glisser dans une vidéo sans que ça sonne comme une pub."
  },
  {
    channel: 'Création Singulière', email: 'nolan.chretien@creationsinguliere.com', prenom: 'Nolan',
    accroche: "Tu apprends déjà à tes abonnés à transformer leurs vidéos en clients via le format court — Créatis automatise justement la partie découpage/sous-titrage IA de ce que tu enseignes."
  }
];

const pending = prospects.filter(p => !sentSet.has(p.email));
console.log(`\n📋 Candidats batch    : ${prospects.length}`);
console.log(`✅ Déjà contactés    : ${prospects.length - pending.length}`);
console.log(`📤 À envoyer         : ${pending.length}\n`);

// ── TEMPLATE (accroche personnalisée + pitch affilié) ────────────
function buildEmail(p) {
  return {
    subject: `${p.channel} × Créatis — 30% par inscription`,
    html: `<div style="font-family:sans-serif;max-width:480px;color:#1a1a1a;line-height:1.9">
<p>Salut ${p.prenom},</p>
<p>${p.accroche}</p>
<p>Je te partage le programme affilié <strong>Créatis</strong> — outil IA qui découpe automatiquement des vidéos longues en clips viraux sous-titrés, pour YouTubeurs/podcasteurs FR.</p>
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
    tags: ['influenceurs', 'youtube-affiliate-batch2']
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
