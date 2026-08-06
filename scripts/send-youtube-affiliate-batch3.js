/* ================================================================
 * SEND YOUTUBE AFFILIATE — Batch 3 (Instagram IA promo + YouTube IA)
 * Source: youtube-affiliate-batch3-instagram-ia-tools.json + batch5-youtube-general.json
 * Dédup: data/influenceurs-sent.json (log commun à tous les batchs influenceurs)
 * Usage envoi réel  : node scripts/send-youtube-affiliate-batch3.js
 * Usage brouillon   : node scripts/send-youtube-affiliate-batch3.js --draft
 * ================================================================ */
const fs    = require('fs');
const path  = require('path');
const https = require('https');

const DRAFT_MODE = process.argv.includes('--draft');

// ── ENV ──────────────────────────────────────────────────────────
const envVars = {};
fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n').forEach(l => {
  const i = l.indexOf('=');
  if (i > 0) envVars[l.slice(0, i).trim()] = l.slice(i + 1).trim();
});
const BREVO_KEY = envVars.BREVO_API_KEY || '';
if (!DRAFT_MODE && !BREVO_KEY) { console.error('❌ BREVO_API_KEY manquant'); process.exit(1); }

// ── SENT LOG (partagé avec les autres batchs influenceurs) ──────
const SENT_LOG = path.join(__dirname, '..', 'data', 'influenceurs-sent.json');
let sentSet = new Set();
if (fs.existsSync(SENT_LOG)) {
  try { sentSet = new Set(JSON.parse(fs.readFileSync(SENT_LOG, 'utf8')).sent || []); } catch {}
}

// ── CANDIDATS (accroche personnalisée par chaîne) ─────────────────
const prospects = [
  { channel: 'unefille.ia', email: 'contact@unefilleia.tech', prenom: "l'équipe unefille.ia",
    accroche: "Ton compte croise déjà pas mal d'outils IA avec des liens affiliés actifs (Napkin, Emergent, Minimax) — Créatis rentre dans la même logique pour les créateurs qui veulent transformer leur contenu long en clips." },
  { channel: 'IA-Insights', email: 'contact@ia-insights.fr', prenom: "l'équipe IA-Insights",
    accroche: "Vous référencez déjà des centaines d'outils IA au quotidien dans votre annuaire — le programme affilié Créatis peut transformer cette visibilité en revenu récurrent." },
  { channel: 'Margarita (iamarketing_fr)', email: 'info@vkweb.fr', prenom: 'Margarita',
    accroche: "Tu recommandes déjà des outils IA marketing à ton audience — Créatis complète bien cette liste côté production vidéo/clips." },
  { channel: 'Eliott Godet (elgoz.media)', email: 'elimonade.pro@gmail.com', prenom: 'Eliott',
    accroche: "Tu fais déjà des tutos avec parrainage sur Manus AI et Base44 — Créatis peut s'ajouter facilement à cette liste pour les créateurs qui te suivent." },
  { channel: 'Matthieu Corthésy (outil.ia)', email: 'contact@outilia.ch', prenom: 'Matthieu',
    accroche: "Ta liste \"100 outils IA\" est exactement l'endroit où Créatis a sa place — je t'envoie un accès pour tester avant d'éventuellement l'ajouter." },
  { channel: 'Ludo Salenne', email: 'ludo@slnweb.net', prenom: 'Ludo',
    accroche: "Tes vidéos IA touchent une audience qui produit et publie du contenu en continu — Créatis les aide justement à transformer leurs longs formats en clips." },
  { channel: 'Maxime Gadras', email: 'maximegadras@substack.com', prenom: 'Maxime',
    accroche: "Tu enseignes déjà l'automatisation IA/no-code à ton audience — Créatis automatise justement la partie clips/sous-titres pour les créateurs de contenu." },
  { channel: 'Julien Gourdon (SEO/GEO IA)', email: 'julien.gourdon@outlook.com', prenom: 'Julien',
    accroche: "Ton audience de consultants/créateurs cherche des outils IA concrets pour produire plus vite — Créatis répond à ce besoin côté vidéo." },
  { channel: 'Frank Houbre', email: 'hello@businessdynamite.xyz', prenom: 'Frank',
    accroche: "Tu es déjà dans l'univers IA vidéo/image — Créatis complète bien ton contenu côté repurposing de vidéos longues en clips." },
  { channel: 'IMMONAI', email: 'contact@immonai.com', prenom: 'Thierry',
    accroche: "Tu montres à ton audience comment l'IA transforme leur métier — Créatis peut être l'outil concret pour leur contenu vidéo." },
  { channel: "What's AI - Louis-François Bouchard", email: 'contact@louisbouchard.ai', prenom: 'Louis-François',
    accroche: "Tes vidéos de vulgarisation IA touchent une audience tech qui produit aussi du contenu — Créatis peut les intéresser pour leurs propres vidéos." }
];

const pending = prospects.filter(p => !sentSet.has(p.email));

// ── TEMPLATE ─────────────────────────────────────────────────────
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

// ── MODE BROUILLON : écrit une prévisualisation, n'envoie rien ───
if (DRAFT_MODE) {
  let md = `# Brouillons — Batch 3 (${pending.length} à prévisualiser)\n\n`;
  md += `Généré le ${new Date().toISOString()} — aucun email envoyé, sent-log non modifié.\n\n---\n\n`;
  pending.forEach((p, i) => {
    const msg = buildEmail(p);
    md += `## ${i + 1}. ${p.channel}\n\n`;
    md += `**À :** ${p.email}\n\n`;
    md += `**Objet :** ${msg.subject}\n\n`;
    md += `**Corps :**\n\n${msg.html.replace(/<[^>]+>/g, '').trim()}\n\n---\n\n`;
  });
  const outPath = path.join(__dirname, '..', 'data', 'batch3-drafts-preview.md');
  fs.writeFileSync(outPath, md);
  console.log(`✅ ${pending.length} brouillons écrits dans ${outPath}`);
  process.exit(0);
}

// ── BREVO (envoi réel) ───────────────────────────────────────────
function brevoSend(p) {
  const msg  = buildEmail(p);
  const body = JSON.stringify({
    to: [{ email: p.email, name: p.prenom }],
    subject: msg.subject,
    sender: { name: 'André — Créatis', email: 'contact@creatis.app' },
    htmlContent: msg.html,
    tags: ['influenceurs', 'youtube-affiliate-batch3']
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
