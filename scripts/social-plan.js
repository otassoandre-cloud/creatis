#!/usr/bin/env node
/**
 * Plan de publication du jour — et registre de ce qui a été publié.
 *
 *   node scripts/social-plan.js                  → montre / crée le plan du jour
 *   node scripts/social-plan.js --par-compte 4   → 4 pièces par compte
 *   node scripts/social-plan.js --marquer <id>   → note une pièce comme publiée
 *   node scripts/social-plan.js --bilan          → ce que chaque ANGLE a rapporté
 *
 * ── POURQUOI CE REGISTRE EXISTE ───────────────────────────────────────────
 * « Tester, analyser, retester » suppose de savoir ce qu'on a testé. Les 68 vidéos
 * précédentes n'ont laissé aucune trace de quel angle était passé sur quel compte
 * quel jour : impossible, après coup, de dire lequel avait marché. C'est la raison
 * pour laquelle elles n'ont rien appris, davantage que leur nombre.
 *
 * Chaque pièce reçoit donc un CODE DE SUIVI unique qui voyage jusqu'à l'inscription :
 * creatis.app/t1/<code>. Le bilan croise ensuite ce code avec les visites, les
 * inscrits et les payants.
 *
 * ── LE DÉBIT ──────────────────────────────────────────────────────────────
 * `--par-compte` vaut 4 par défaut, pas 25. Sur un compte à 7 abonnés, 25 pièces
 * quotidiennes apprennent à l'algorithme que le compte produit du contenu faible et
 * font chuter la portée de tout le reste. Le paramètre existe pour être monté quand
 * les chiffres le justifient — pas avant.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const DOSSIER = path.join(RACINE, 'social');
const REGISTRE = path.join(DOSSIER, 'registre.json');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const a = (n) => process.argv.includes('--' + n);

const COMPTES = [
  { id: 't1', nom: 'TikTok principal',      plateforme: 'tiktok',    abonnes: 500 },
  { id: 't2', nom: 'TikTok secondaire',     plateforme: 'tiktok',    abonnes: 7 },
  { id: 'g1', nom: 'Instagram principal',   plateforme: 'instagram', abonnes: 90 },
  { id: 'g2', nom: 'Instagram secondaire',  plateforme: 'instagram', abonnes: 9 },
  /* YouTube accepte les liens en description des le premier abonne : c est le seul
     des trois ou le trafic peut sortir sans condition. */
  { id: 'y1', nom: 'YouTube',               plateforme: 'youtube',   abonnes: 0 },
];

/* Les angles sont des SUJETS, pas des montages. On fait varier ce qu'on raconte, parce
   que c'est ce qui décide de la rétention — le montage, lui, se copie d'un angle qui
   a marché. Chaque angle porte un chiffre vérifié ou une mécanique démontrable :
   rien d'inventé, c'est ce qui rend le contenu regardable sans se soucier de la marque. */
const ANGLES = [
  { code: 'taux',    titre: 'Le taux réel du clipping',        promesse: '1 à 5 $ affichés, 0,39 $ versés — mesuré sur 6,6 milliards de vues' },
  { code: 'marche',  titre: "L'échelle du marché",             promesse: '887 000 $ versés en un mois à 8 466 clippeurs' },
  { code: 'crop',    titre: 'Ce que le vertical jette',        promesse: '607 px sur 1920 : 68 % de l’image part à la poubelle' },
  { code: 'volume',  titre: 'Le plafond du métier',            promesse: '10 à 15 clips par jour à la main, et pourquoi ça bloque là' },
  { code: 'gta',     titre: 'La fenêtre du 19 novembre',       promesse: 'GTA 6 sort le 19/11 — pourquoi un compte créé ce jour-là le rate' },
  { code: 'tuto',    titre: 'Le tutoriel bout en bout',        promesse: 'De la vidéo YouTube au Short publié, sans rien couper' },
  { code: 'hook',    titre: 'Les 3 premières secondes',        promesse: 'Où commence un clip qui tient, et où il ne commence jamais' },
  { code: 'soustit', titre: 'Pourquoi le son coupé gagne',     promesse: 'La majorité des vues se font sans son — ce que ça impose' },
];

const lire = () => (fs.existsSync(REGISTRE) ? JSON.parse(fs.readFileSync(REGISTRE, 'utf8')) : { pieces: [] });
const ecrire = (d) => { fs.mkdirSync(DOSSIER, { recursive: true }); fs.writeFileSync(REGISTRE, JSON.stringify(d, null, 2), 'utf8'); };
const jour = () => new Date().toISOString().slice(0, 10);

/* Code court et unique : jjmm + compte + angle. Lisible dans une URL tapée à la main,
   et il suffit à retrouver la pièce dans le registre. */
const codeSuivi = (d, compte, angle) => `${d.slice(8, 10)}${d.slice(5, 7)}${compte}${angle}`;

function planDuJour(parCompte) {
  const reg = lire();
  const d = jour();
  if (reg.pieces.some((p) => p.date === d)) {
    console.log(`Plan du ${d} déjà créé. Utilise --bilan pour les résultats.\n`);
    return reg.pieces.filter((p) => p.date === d);
  }

  /* On décale l'angle de départ d'un compte à l'autre : deux comptes ne doivent pas
     publier le même sujet le même jour, sinon on ne peut pas les comparer. */
  const neuves = [];
  COMPTES.forEach((c, ic) => {
    for (let k = 0; k < parCompte; k++) {
      const angle = ANGLES[(ic * 3 + k) % ANGLES.length];
      neuves.push({
        id: `${d}-${c.id}-${angle.code}`,
        date: d,
        compte: c.id,
        compte_nom: c.nom,
        plateforme: c.plateforme,
        angle: angle.code,
        titre: angle.titre,
        promesse: angle.promesse,
        lien: `creatis.app/${c.id}/${codeSuivi(d, c.id, angle.code)}`,
        code_suivi: codeSuivi(d, c.id, angle.code),
        statut: 'à produire',
      });
    }
  });

  reg.pieces.push(...neuves);
  ecrire(reg);
  return neuves;
}

if (a('bilan')) {
  const reg = lire();
  const parAngle = new Map();
  for (const p of reg.pieces) {
    if (!parAngle.has(p.angle)) parAngle.set(p.angle, { pieces: 0, publiees: 0 });
    const e = parAngle.get(p.angle);
    e.pieces++;
    if (p.statut === 'publiée') e.publiees++;
  }
  console.log('BILAN PAR ANGLE\n');
  console.log('  pièces  publiées  angle');
  for (const [code, e] of [...parAngle].sort((x, y) => y[1].publiees - x[1].publiees)) {
    const ang = ANGLES.find((x) => x.code === code);
    console.log(`  ${String(e.pieces).padStart(6)}  ${String(e.publiees).padStart(8)}  ${code.padEnd(9)} ${ang ? ang.titre : ''}`);
  }
  console.log('\nLes visites, inscrits et payants par code : node scripts/social-brief.js');
  return;
}

if (a('marquer')) {
  const id = arg('marquer', '');
  const reg = lire();
  const p = reg.pieces.find((x) => x.id === id);
  if (!p) { console.error('Pièce inconnue : ' + id); process.exit(1); }
  p.statut = 'publiée';
  p.publiee_le = new Date().toISOString();
  ecrire(reg);
  console.log(`Marquée publiée : ${id}`);
  return;
}

const parCompte = Math.max(1, parseInt(arg('par-compte', '4'), 10));
const pieces = planDuJour(parCompte);

console.log(`PLAN DU ${jour()} — ${pieces.length} pièces (${parCompte} par compte)\n`);
let courant = '';
for (const p of pieces) {
  if (p.compte_nom !== courant) { courant = p.compte_nom; console.log(`\n${courant}`); }
  console.log(`  [${p.statut}] ${p.titre}`);
  console.log(`      ${p.promesse}`);
  console.log(`      lien à mettre dans la publication : ${p.lien}`);
}
console.log(`\nRegistre : ${path.relative(RACINE, REGISTRE)}`);
console.log('Une fois publiée :  node scripts/social-plan.js --marquer <id>');
