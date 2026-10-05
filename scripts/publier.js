#!/usr/bin/env node
/**
 * PUBLIER — contrôle, publie, inscrit. En un seul geste, sans trou.
 *
 *   node scripts/publier.js --cible tiktok --piece <id> --gabarit <nom> \
 *        --source <nom> --video <chemin> --legende <fichier.txt> \
 *        [--titre "..."] [--accroche "..."] [--son "..."] [--court]
 *
 * ── POURQUOI CE FICHIER EXISTE ───────────────────────────────────────────
 * `controle-avant-publication.js` refuse en sortant avec le code 5. Pendant
 * quatre jours je l'ai appelé ainsi :
 *
 *     node scripts/controle-avant-publication.js … | tail -3 && node scripts/publier-…
 *
 * Or le code de sortie d'un TUBE est celui de sa DERNIÈRE commande — `tail`,
 * qui réussit toujours. Le `&&` voyait donc un succès et publiait, même quand
 * le contrôle venait d'écrire « NE PAS PUBLIER ». C'est arrivé le 04/10 : la
 * vidéo longue est partie 19 minutes après le Short, contre une heure exigée,
 * et le refus s'affichait à l'écran juste au-dessus.
 *
 * Un garde-fou qu'on peut contourner par un tube n'est pas un garde-fou. Le
 * contrôle est donc appelé ici SANS tube, son code lu directement, et rien ne
 * part s'il refuse.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const arg = (n, d = '') => {
  const i = process.argv.indexOf('--' + n);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : d;
};
const drapeau = (n) => process.argv.includes('--' + n);

const CIBLE = arg('cible');
const PIECE = arg('piece');
const GABARIT = arg('gabarit');
const SOURCE = arg('source');
const VIDEO = arg('video');
const LEGENDE = arg('legende');
const TITRE = arg('titre');
const ACCROCHE = arg('accroche');
const SON = arg('son');

if (!CIBLE || !PIECE || !VIDEO) {
  console.error('Usage : --cible <tiktok|instagram|youtube> --piece <id> --video <chemin>');
  console.error('        [--gabarit …] [--source …] [--legende <fichier>] [--titre …]');
  console.error('        [--accroche …] [--son …] [--court]');
  process.exit(2);
}
if (!fs.existsSync(VIDEO)) {
  console.error(`Vidéo introuvable : ${VIDEO}`);
  process.exit(2);
}

const CIBLES = { tiktok: 't1', instagram: 'g1', youtube: 'y1' };
if (!CIBLES[CIBLE]) {
  console.error(`Cible inconnue : ${CIBLE}`);
  process.exit(2);
}

const node = (script, args) =>
  spawnSync(process.execPath, [path.join(RACINE, 'scripts', script), ...args], {
    stdio: 'inherit',
    cwd: RACINE,
  });

/* ── 1. LE CONTRÔLE, SANS TUBE ──────────────────────────────────────────── */
const ctrl = node('controle-avant-publication.js', [
  '--cible', CIBLE, '--piece', PIECE,
  ...(GABARIT ? ['--gabarit', GABARIT] : []),
  ...(SOURCE ? ['--source', SOURCE] : []),
]);
if (ctrl.status !== 0) {
  console.error('');
  console.error(`Le contrôle a refusé (code ${ctrl.status}). RIEN n'a été publié.`);
  process.exit(ctrl.status || 5);
}

/* ── 2. LA PUBLICATION ──────────────────────────────────────────────────── */
const legende = LEGENDE && fs.existsSync(LEGENDE) ? fs.readFileSync(LEGENDE, 'utf8') : '';
let pub;
if (CIBLE === 'tiktok') {
  pub = node('publier-tiktok.js', ['--video', VIDEO, '--legende', legende, '--publier']);
} else if (CIBLE === 'instagram') {
  pub = node('publier-instagram.js', ['--cdp', '--video', VIDEO, '--legende', legende, '--publier']);
} else {
  if (!TITRE) {
    console.error('YouTube exige un --titre.');
    process.exit(2);
  }
  pub = node('publier-youtube.js', [
    ...(drapeau('court') ? ['--court'] : []),
    '--publier', '--video', VIDEO, '--titre', TITRE, '--description', legende,
  ]);
}
if (pub.status !== 0) {
  console.error('');
  console.error('La publication a échoué — NE PAS relancer avant d\'avoir vérifié le compte.');
  console.error('Une publication « en échec » est parfois déjà partie : c\'est arrivé le 27/09.');
  process.exit(pub.status || 1);
}

/* ── 3. L'INSCRIPTION AU REGISTRE ───────────────────────────────────────── */
const apres = node('apres-publication.js', [
  '--cible', CIBLES[CIBLE], '--piece', PIECE,
  ...(GABARIT ? ['--gabarit', GABARIT] : []),
  ...(SOURCE ? ['--source', SOURCE] : []),
  ...(ACCROCHE ? ['--accroche', ACCROCHE] : []),
  ...(SON ? ['--son', SON] : []),
]);
if (apres.status !== 0) {
  console.error('');
  console.error('PUBLIÉ, mais NON INSCRIT au registre. À inscrire à la main, sinon la boucle');
  console.error("d'apprentissage ne verra pas cette publication et le contrôle anti-doublon");
  console.error('la laissera repartir.');
  process.exit(1);
}
