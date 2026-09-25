#!/usr/bin/env node
/**
 * Brief matinal — ce que la veille a produit, et ce qu'on en déduit pour aujourd'hui.
 *
 *   node scripts/social-brief.js            → la veille
 *   node scripts/social-brief.js --jours 7  → fenêtre plus large
 *   node scripts/social-brief.js --json
 *
 * Raison d'être : sans mesure par publication, produire plus ne fait qu'ajouter du bruit.
 * Constat du 25/09/2026 — la colonne `users.source` ne contenait AUCUNE ligne `tiktok` :
 * le canal n'avait jamais été traçable, donc « 0 inscrit attribué » ne voulait pas dire
 * « 0 inscrit », seulement « jamais mesuré ».
 *
 * Depuis, les liens courts /tiktok, /insta, /x, /yt, /li (bio) et /t/<code>, /i/<code>…
 * (par publication) posent des UTM que js/ref-capture.js sait déjà lire. Ce script les
 * relit et transforme la veille en consignes pour le jour.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const JOURS = parseInt(arg('jours', '1'), 10);

function env() {
  const p = path.join(RACINE, '.env');
  const v = {};
  if (fs.existsSync(p)) for (const l of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) v[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return v;
}

const E = env();
async function sb(chemin) {
  const r = await fetch(`${E.SUPABASE_URL}/rest/v1${chemin}`, {
    headers: { apikey: E.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${E.SUPABASE_SERVICE_KEY}` },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status} — ${(await r.text()).slice(0, 160)}`);
  return r.json();
}

/* Les sources sociales sont exactement celles que posent les liens courts. Tout le reste
   (direct, ref:google…) n'est pas pilotable par une publication : on l'exclut du brief
   pour ne pas confondre ce qu'on contrôle et ce qui arrive tout seul. */
const SOCIAL = /^utm\/(tiktok|instagram|x|youtube|linkedin)\//i;

(async () => {
  const depuis = new Date(Date.now() - JOURS * 864e5);
  depuis.setHours(0, 0, 0, 0);

  const users = await sb(
    `/users?select=id,source,plan,created_at&created_at=gte.${depuis.toISOString()}&limit=5000`
  );

  const parSource = new Map();
  for (const u of users) {
    const s = u.source || 'direct';
    if (!parSource.has(s)) parSource.set(s, { inscrits: 0, payants: 0 });
    const e = parSource.get(s);
    e.inscrits++;
    if (u.plan && u.plan !== 'gratuit') e.payants++;
  }

  const social = [...parSource.entries()].filter(([s]) => SOCIAL.test(s))
    .map(([s, e]) => {
      const [, plateforme, medium, campagne] = s.split('/');
      return { source: s, plateforme, medium, campagne: campagne || '(sans code)', ...e };
    })
    .sort((a, b) => b.inscrits - a.inscrits);

  const totalSocial = social.reduce((n, x) => n + x.inscrits, 0);
  const autres = [...parSource.entries()].filter(([s]) => !SOCIAL.test(s))
    .sort((a, b) => b[1].inscrits - a[1].inscrits);

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ fenetre_jours: JOURS, total_inscrits: users.length, social, autres }, null, 2));
    return;
  }

  const l = [];
  l.push(`BRIEF — ${new Date().toISOString().slice(0, 10)} (fenêtre : ${JOURS} jour${JOURS > 1 ? 's' : ''})`);
  l.push('='.repeat(64));
  l.push(`Inscrits sur la période : ${users.length}   |   dont social tracé : ${totalSocial}`);
  l.push('');

  if (!social.length) {
    l.push('AUCUN INSCRIT SOCIAL TRACÉ.');
    l.push('');
    l.push('Deux lectures possibles, et il faut les distinguer avant de conclure :');
    l.push('  a) les publications ne convertissent pas ;');
    l.push('  b) le lien tracé n\'est pas en place — bio non mise à jour, ou lien absent.');
    l.push('');
    l.push('Vérifier (b) EN PREMIER : ouvrir la bio de chaque compte et confirmer qu\'elle');
    l.push('pointe vers creatis.app/tiktok, /insta, /x, /yt ou /li. Sans ça, ce script');
    l.push('mesurera zéro quoi qu\'il arrive, et la boucle d\'amélioration tournera à vide.');
  } else {
    l.push('PAR PUBLICATION / CAMPAGNE');
    l.push('  inscrits  payants  plateforme   code');
    for (const s of social) {
      l.push(`  ${String(s.inscrits).padStart(8)}  ${String(s.payants).padStart(7)}  ${s.plateforme.padEnd(11)}  ${s.campagne}`);
    }
    l.push('');
    const best = social[0];
    const bio = social.filter(s => s.medium === 'bio').reduce((n, x) => n + x.inscrits, 0);
    const post = social.filter(s => s.medium === 'post').reduce((n, x) => n + x.inscrits, 0);
    l.push('CE QU\'ON EN FAIT AUJOURD\'HUI');
    l.push(`  • Meilleur code : « ${best.campagne} » sur ${best.plateforme} (${best.inscrits} inscrit${best.inscrits > 1 ? 's' : ''}).`);
    l.push('    Reprendre son angle, pas sa forme — c\'est le sujet qui a marché, pas le montage.');
    if (post === 0 && bio > 0) {
      l.push('  • Tout passe par la bio, rien par les liens de publication : les codes /t/<code>');
      l.push('    ne sont pas utilisés. Sans eux, impossible de distinguer un post d\'un autre.');
    }
    const morts = social.filter(s => s.inscrits === 0);
    if (morts.length) l.push(`  • ${morts.length} code(s) à zéro : ne pas réutiliser ces angles tels quels.`);
  }

  l.push('');
  l.push('POUR MÉMOIRE — canaux non pilotables par une publication');
  for (const [s, e] of autres.slice(0, 6)) l.push(`  ${String(e.inscrits).padStart(5)}  ${s}`);

  const texte = l.join('\n');
  console.log(texte);

  const dossier = path.join(RACINE, 'social', 'briefs');
  fs.mkdirSync(dossier, { recursive: true });
  const f = path.join(dossier, `brief-${new Date().toISOString().slice(0, 10)}.txt`);
  fs.writeFileSync(f, texte + '\n', 'utf8');
  console.log(`\n→ ${path.relative(RACINE, f)}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
