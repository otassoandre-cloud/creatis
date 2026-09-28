#!/usr/bin/env node
/**
 * Écrit le plan de publication du jour, à partir des pièces PRÊTES.
 *
 *   node scripts/plan-du-jour.js               pour aujourd'hui
 *   node scripts/plan-du-jour.js --date 2026-09-29
 *
 * Lit `social/file-attente.json`, place chaque pièce prête dans un créneau
 * horaire, et écrit `social/plan-jour.json` que `planificateur.js` exécutera.
 *
 * ── LES CRÉNEAUX ─────────────────────────────────────────────────────────
 * Une publication par heure, de 8 h à 21 h, heure de Paris — quatorze en tout.
 * Celui de 11 h est RÉSERVÉ à la vidéo longue YouTube du jour : c'est la pièce
 * qui demande le plus de travail, et toutes les autres y renvoient.
 *
 * ── IL NE REMPLIT PAS LES TROUS ──────────────────────────────────────────
 * S'il y a huit pièces prêtes, il y a huit créneaux remplis et six vides. Le
 * script ne réutilise JAMAIS une pièce déjà publiée pour combler, et ne duplique
 * pas une pièce sur deux créneaux.
 *
 * C'est la contrainte posée le 28/09 — « chaque jour un contenu différent,
 * jamais le même » — et c'est aussi ce que les plateformes attendent : reposter
 * la même vidéo est le signal le plus court vers la limitation de portée. Un
 * créneau vide ne coûte rien ; un doublon coûte le compte.
 *
 * ── ET LA MÊME PIÈCE SUR DEUX RÉSEAUX ? ──────────────────────────────────
 * Autorisé, et voulu : une pièce peut viser plusieurs comptes (`cibles`), parce
 * qu'un spectateur de TikTok n'est pas celui d'Instagram. Ce qui est interdit,
 * c'est deux fois le même compte. Chaque paire pièce+compte est unique.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const FILE = path.join(RACINE, 'social', 'file-attente.json');
const PLAN = path.join(RACINE, 'social', 'plan-jour.json');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };

const dateParis = () => new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

const DATE = arg('date', dateParis());

/** 8 h → 21 h inclus. 11 h est pris par la vidéo longue. */
const HEURES = Array.from({ length: 14 }, (_, i) => String(8 + i).padStart(2, '0'));
const HEURE_LONGUE = '11';

if (!fs.existsSync(FILE)) {
  console.error(`Aucune file d attente : ${FILE}`);
  console.error('Créer le fichier avec { "pieces": [...] } avant de planifier.');
  process.exit(3);
}

const file = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const pretes = (file.pieces || []).filter((p) => p.statut === 'prêt');

/* Une entrée de créneau par couple pièce+compte. On déplie ici, de sorte que
   le plan reste une liste plate que le planificateur exécute sans réfléchir. */
const aPlacer = [];
for (const p of pretes) {
  for (const cible of p.cibles || []) {
    aPlacer.push({
      piece: p.id,
      cible,
      video: p.video,
      legende: p.legendes?.[cible] || p.legende,
      titre: p.titre,
      longue: !!p.longue,
    });
  }
}

const longues = aPlacer.filter((x) => x.longue);
const courtes = aPlacer.filter((x) => !x.longue);

if (longues.length > 1) {
  console.warn(`${longues.length} pièces longues prêtes — une seule tiendra dans le créneau de 11 h.`);
}

const creneaux = [];
let i = 0;
for (const heure of HEURES) {
  if (heure === HEURE_LONGUE) {
    const l = longues[0];
    creneaux.push(l
      ? { heure, cible: l.cible, piece: l.piece, video: l.video, legende: l.legende, titre: l.titre, statut: 'en attente' }
      : { heure, cible: null, statut: 'vide', detail: 'aucune vidéo longue prête' });
    continue;
  }
  const c = courtes[i++];
  creneaux.push(c
    ? { heure, cible: c.cible, piece: c.piece, video: c.video, legende: c.legende, titre: c.titre, statut: 'en attente' }
    : { heure, cible: null, statut: 'vide', detail: 'aucune pièce prête' });
}

const plan = {
  date: DATE,
  fuseau: 'Europe/Paris',
  ecrit_le: new Date().toISOString(),
  creneaux,
};
fs.mkdirSync(path.dirname(PLAN), { recursive: true });
fs.writeFileSync(PLAN, JSON.stringify(plan, null, 2));

const remplis = creneaux.filter((c) => c.statut === 'en attente').length;
console.log(`Plan du ${DATE} écrit : ${remplis} créneau(x) rempli(s) sur ${HEURES.length}.`);
for (const c of creneaux) {
  console.log(`  ${c.heure}  ${String(c.cible || '—').padEnd(4)} ${c.statut.padEnd(10)} ${c.titre || c.piece || c.detail || ''}`);
}
if (remplis < HEURES.length) {
  console.log('');
  console.log(`${HEURES.length - remplis} créneau(x) vide(s) : il manque des pièces prêtes.`);
  console.log('Un créneau vide ne publie rien — c est voulu, on ne recycle pas.');
}
