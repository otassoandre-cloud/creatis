#!/usr/bin/env node
/**
 * Relie ce qu'on a PUBLIÉ à ce que ça a DONNÉ, et en tire une décision.
 *
 *   node scripts/apprendre.js
 *
 * Écrit `social/verdict.md` — le fichier à lire AVANT de décider du contenu
 * du jour. Il ne raconte pas, il classe : quel gabarit, quelle accroche,
 * quelle heure, avec ou sans son.
 *
 * ── POURQUOI IL EXISTE ───────────────────────────────────────────────────
 * Je ne retiens rien d'une session à l'autre : mes poids ne changent pas, et
 * une nouvelle session démarre à zéro. L'amélioration ne peut donc pas venir
 * de moi — elle doit venir d'un registre relu chaque matin.
 *
 * Jusqu'au 28/09, `registre.json` notait ce qui était publié et les
 * statistiques vivaient ailleurs, sans jamais être rapprochées. On mesurait
 * sans apprendre. Ce script fait la jointure, et c'est tout ce qu'il fait.
 *
 * ── LA CONDITION POUR QUE ÇA MARCHE ──────────────────────────────────────
 * Chaque pièce doit porter ses VARIABLES au moment où on la produit :
 *   gabarit   — ShortPleinCadre, LeTri, ShortVersYouTube, TutoYouTube…
 *   accroche  — ce que dit la première seconde (question, affirmation, chiffre)
 *   son       — le nom du son posé, ou `null` si muette
 *   heure     — le créneau de publication
 *   promeut   — l'URL de la vidéo longue quand la pièce y renvoie
 * Sans ces champs, la jointure ne dit rien. Le contrôle avant publication
 * refuse déjà une pièce sans gabarit pour cette raison.
 *
 * ── CE QU'IL NE FAIT PAS ─────────────────────────────────────────────────
 * Il ne prétend pas à la causalité. Avec quelques publications par variable,
 * un écart peut n'être que du bruit. Il l'ÉCRIT : chaque conclusion porte le
 * nombre d'observations sur lequel elle repose, et il refuse de trancher sous
 * trois publications.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const REGISTRE = path.join(RACINE, 'social', 'registre.json');
const STATS = path.join(RACINE, 'social', 'stats');
const VERDICT = path.join(RACINE, 'social', 'verdict.md');

/** En dessous, on ne conclut pas : on dit qu'on ne sait pas encore. */
const MINIMUM = 3;

const lire = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);

const registre = lire(REGISTRE, { pieces: [] });

/* Les relevés TikTok, le plus récent d'abord. */
const releves = fs.existsSync(STATS)
  ? fs.readdirSync(STATS).filter((f) => f.startsWith('tiktok-') && f.endsWith('.json')).sort().reverse()
  : [];

if (!releves.length) {
  console.error('Aucun relevé dans social/stats/.');
  console.error('Lancer `node scripts/tiktok-stats.js` d abord : sans chiffres, rien à apprendre.');
  process.exit(3);
}

const dernier = lire(path.join(STATS, releves[0]), { publications: [] });
const mesures = dernier.publications || [];

/* ── La jointure ───────────────────────────────────────────────────────────
   TikTok ne rend pas d'identifiant exploitable dans la liste : on rapproche
   par la LÉGENDE, qui est ce qu'on a écrit nous-mêmes. On compare sur les
   quarante premiers caractères normalisés — assez pour être sûr, assez court
   pour survivre à la troncature de l'affichage. */
const reduire = (t) => String(t || '')
  .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);

const appariees = [];
for (const p of registre.pieces || []) {
  if (p.plateforme !== 'tiktok' && !p.deja_publie?.t1 && !p.deja_publie?.t2) continue;
  const cle = reduire(p.legendes?.t1 || p.legende_texte || p.titre);
  if (!cle) continue;
  const m = mesures.find((x) => reduire(x.legende).startsWith(cle.slice(0, 24)));
  if (m) appariees.push({ ...p, vues: m.vues, jaime: m.jaime, date: m.date });
}

/* ── UNE PUBLICATION DU JOUR NE SE COMPARE PAS ───────────────────────────
   Une vidéo mise en ligne il y a une heure n'a pas fini d'accumuler ses vues.
   La comparer à une de la veille fait conclure l'inverse de la vérité — le
   premier verdict donnait « avec son : 112 vues » contre « muette : 257 »,
   alors que la vidéo avec son avait une heure et les autres une journée.
   On les LISTE, on ne les COMPTE pas. */
const MOIS = ['janv', 'févr', 'mars', 'avril', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
const aujourdhui = new Date();
const duJour = (d) => {
  const m = String(d || '').match(/(\d{1,2})\s+(\S+?)\.?,/);
  if (!m) return false;
  const jour = parseInt(m[1], 10);
  const mois = MOIS.findIndex((x) => m[2].toLowerCase().startsWith(x.slice(0, 3)));
  return jour === aujourdhui.getDate() && mois === aujourdhui.getMonth();
};
const recentes = appariees.filter((a) => duJour(a.date));
const comparables = appariees.filter((a) => !duJour(a.date));

/* ── Le classement par variable ────────────────────────────────────────── */
const parVariable = (nom, extraire) => {
  const g = new Map();
  for (const a of comparables) {
    const v = extraire(a);
    if (v === undefined || v === null || v === '') continue;
    if (!g.has(v)) g.set(v, []);
    g.get(v).push(a);
  }
  return [...g.entries()]
    .map(([valeur, l]) => ({
      nom, valeur, n: l.length,
      vues: Math.round(l.reduce((s, x) => s + x.vues, 0) / l.length),
      jaime: Math.round((l.reduce((s, x) => s + x.jaime, 0) / l.length) * 10) / 10,
    }))
    .sort((a, b) => b.vues - a.vues);
};

const mediane = (() => {
  const v = mesures.map((m) => m.vues).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : 0;
})();

const lignes = [];
const dire = (l = '') => { lignes.push(l); console.log(l); };

dire('# Verdict — à lire avant de décider du contenu du jour');
dire('');
dire(`Relevé : \`${releves[0]}\` · ${mesures.length} publications mesurées.`);
dire(`**Médiane du compte : ${mediane} vues.** C'est la barre à battre, pas zéro.`);
dire('');

if (!comparables.length) {
  dire('## Aucune publication appariée');
  dire('');
  dire('Les pièces du registre ne se retrouvent pas dans les relevés. Deux causes');
  dire('possibles : les légendes ont changé entre la production et la publication,');
  dire('ou les pièces publiées ne portaient pas leurs variables.');
  dire('');
  dire('**Rien à conclure aujourd\'hui.** Continuer à produire en renseignant');
  dire('`gabarit`, `accroche` et `son` sur chaque pièce — la jointure se fera');
  dire('dès qu\'il y aura de quoi comparer.');
} else {
  for (const [nom, fn] of [
    ['Gabarit', (a) => a.gabarit],
    ['Accroche', (a) => a.accroche],
    ['Son', (a) => (a.son ? 'avec son' : 'muette')],
    ['Heure', (a) => a.heure],
  ]) {
    const cl = parVariable(nom, fn);
    if (!cl.length) continue;
    dire(`## ${nom}`);
    dire('');
    for (const c of cl) {
      const sur = c.n < MINIMUM ? ' _(trop peu pour conclure)_' : '';
      dire(`- **${c.valeur}** — ${c.vues} vues, ${c.jaime} J'aime en moyenne sur ${c.n} publication(s)${sur}`);
    }
    const solides = cl.filter((c) => c.n >= MINIMUM);
    if (solides.length >= 2) {
      dire('');
      dire(`  → Refaire : **${solides[0].valeur}**. Arrêter : **${solides[solides.length - 1].valeur}**.`);
    } else {
      dire('');
      dire(`  → Pas assez d'observations pour trancher (minimum ${MINIMUM} par valeur).`);
    }
    dire('');
  }
}

if (recentes.length) {
  dire('## Trop récentes pour être comptées');
  dire('');
  for (const r of recentes) {
    dire(`- ${r.titre || r.id} — ${r.vues} vues pour l'instant (gabarit ${r.gabarit || '?'}, ${r.son ? 'avec son' : 'muette'})`);
  }
  dire('');
  dire("  Publiées aujourd'hui : elles n'ont pas fini d'accumuler. Elles entreront");
  dire('  dans le classement demain, pas avant.');
  dire('');
}

dire('---');
dire('');
dire('Ce fichier est réécrit à chaque `node scripts/apprendre.js`. Il ne prétend');
dire('pas à la causalité : avec peu de publications par variable, un écart peut');
dire('n\'être que du bruit. D\'où le nombre d\'observations à côté de chaque ligne,');
dire(`et le refus de conclure sous ${MINIMUM}.`);

fs.writeFileSync(VERDICT, lignes.join('\n') + '\n');
console.log('');
console.log('→ ' + VERDICT);
