/**
 * RELÈVE LES QUATRE REPÈRES D'UN ENREGISTREMENT DE PARCOURS.
 *
 *   node reperes-parcours.mjs parcours-XXXX
 *
 * Rend les secondes à reporter dans `parcours-reglages.ts` :
 *   lien · analyse · grille · modale · fin
 *
 * ── POURQUOI UNE MESURE ET PAS UN COUP D'ŒIL ──────────────────────────────
 * Ces quatre nombres commandent les quatre vitesses du montage. Relevés à l'œil
 * sur quelques images échantillonnées, ils tombent à deux ou trois secondes
 * près — et une phase qui déborde de deux secondes affiche un libellé qui
 * commente l'écran précédent. C'est arrivé trois fois de suite.
 *
 * ── CE QUE MESURE LE SCRIPT ───────────────────────────────────────────────
 * La luminance moyenne, seconde par seconde. Les quatre écrans du parcours ont
 * des signatures nettes et stables :
 *   · le studio      — sombre, avec la miniature colorée de la vidéo
 *   · l'analyse      — sombre et IMMOBILE pendant plusieurs minutes
 *   · la grille      — la plus claire de toutes : dix vignettes côte à côte
 *   · la modale      — sombre à nouveau, panneau de réglages
 *
 * On cherche donc la longue plage immobile (l'analyse), puis le saut de
 * luminance qui la termine (la grille), puis la chute qui suit (la modale).
 * Les repères trouvés sont à vérifier sur une image — le script écrit les
 * vignettes correspondantes à côté.
 */
import { spawnSync } from "node:child_process";
import { readdirSync, rmSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";

const FF = "./node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe";
const FP = "./node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe";
const TMP = join(tmpdir(), "creatis-reperes");

const nom = process.argv[2];
if (!nom) {
  console.error("Usage : node reperes-parcours.mjs <fichier dans public/, sans .mp4>");
  process.exit(1);
}
const fichier = `public/${nom}.mp4`;

const duree = Number(
  spawnSync(FP, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", fichier])
    .stdout.toString().trim(),
);

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
spawnSync(FF, ["-v", "error", "-i", fichier, "-r", "1", "-s", "120x204", `${TMP}/f_%04d.png`]);

const images = readdirSync(TMP).sort().map((n) => {
  const p = PNG.sync.read(readFileSync(join(TMP, n)));
  let s = 0;
  let c = 0;
  for (let i = 0; i < p.data.length; i += 4) {
    s += 0.2126 * p.data[i] + 0.7152 * p.data[i + 1] + 0.0722 * p.data[i + 2];
    c++;
  }
  return s / c;
});

/* La grille est le point le plus clair de la seconde moitié : l'analyse occupe
   toute la première, et rien d'autre dans le parcours n'affiche autant de
   vignettes en même temps. */
const moitie = Math.floor(images.length / 2);
let grille = moitie;
for (let i = moitie; i < images.length; i++) {
  if (images[i] > images[grille]) grille = i;
}
/* On remonte au DÉBUT de la plage claire : le maximum tombe souvent au milieu
   du défilement, plusieurs secondes après l'apparition. */
const seuil = images[grille] * 0.82;
while (grille > 1 && images[grille - 1] >= seuil) grille--;

/* La modale est la chute qui suit : l'écran redevient sombre. */
let modale = grille + 1;
while (modale < images.length - 1 && images[modale] >= seuil) modale++;

/* L'analyse commence quand l'image cesse de bouger. On compare chaque seconde à
   la suivante et on cherche le début de la longue plage stable. */
let analyse = 6;
for (let i = 4; i < grille - 20; i++) {
  const stable = images.slice(i, i + 12).every((v) => Math.abs(v - images[i]) < 4);
  if (stable) { analyse = i; break; }
}

console.log(`durée         ${duree.toFixed(1)} s`);
console.log(`lien          ${Math.max(0, analyse - 3)} s`);
console.log(`analyse       ${analyse} s`);
console.log(`grille        ${grille} s`);
console.log(`modale        ${modale} s`);
console.log(`fin           ${duree.toFixed(1)} s`);
console.log(`\nreperes: { lien: ${Math.max(0, analyse - 3)}, analyse: ${analyse}, grille: ${grille}, modale: ${modale}, fin: ${duree.toFixed(1)} },`);

/* Les vignettes de contrôle : un repère faux se voit en une seconde. */
for (const [nomRepere, t] of [["lien", Math.max(0, analyse - 3)], ["analyse", analyse],
  ["grille", grille], ["modale", modale]]) {
  spawnSync(FF, ["-v", "error", "-ss", String(t), "-i", fichier, "-frames:v", "1",
    "-s", "240x408", `${TMP}/verif-${nomRepere}.png`, "-y"]);
}
console.log(`\nvignettes de controle : ${TMP}`);
