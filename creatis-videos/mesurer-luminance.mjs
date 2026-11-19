/**
 * LUMINANCE D'UN CLIP — seconde par seconde, et meilleure fenêtre.
 *
 *   node mesurer-luminance.mjs <fichier-sans-extension-dans-public> [secondes] [fenetre]
 *   node mesurer-luminance.mjs mcpclip 40 15
 *
 * ── POURQUOI CET OUTIL EXISTE ────────────────────────────────────────────
 * La médiane du corpus des clips qui performent est à 116-118 de luminance, et
 * les chiffres TikTok de la série disent toujours la même chose : 81 % de
 * spectateurs à 1 s, puis un décrochage massif à 0:02. Une ouverture nettement
 * sous la cible est la seule variable mesurable qui explique un décrochage à cet
 * endroit-là. On mesure donc AVANT de monter, pas après avoir publié.
 *
 * La moyenne décrit l'ENSEMBLE, pas le sujet : un clip peut afficher 41 de
 * moyenne et 124 sur sa première seconde. C'est la première seconde qui décide.
 * D'où l'affichage seconde par seconde, et le calcul de la meilleure fenêtre.
 *
 * ── POURQUOI ON N'UTILISE PAS `signalstats` ──────────────────────────────
 * Le ffmpeg livré avec Remotion est allégé : pas d'encodeur `null`, pas de muxer
 * `rawvideo`, filtergraph incomplet. `-vf signalstats,metadata=print` échoue donc
 * avec « Encoder not found ». On extrait des PNG sur disque et on les mesure en
 * Rec. 709, la même pondération que signalstats.
 */
import { spawnSync } from "node:child_process";
import { readdirSync, rmSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";

const FF = "./node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe";
const TMP = join(tmpdir(), "creatis-luminance");

const [fichier, secondesArg, fenetreArg] = process.argv.slice(2);
if (!fichier) {
  console.error(
    "Usage : node mesurer-luminance.mjs <fichier dans public/, sans .mp4> [secondes] [fenetre]",
  );
  process.exit(1);
}
const secondes = Number(secondesArg || 30);
const fenetre = Number(fenetreArg || 15);

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
/* Une image par seconde, réduite : la luminance moyenne ne change pas avec la
   définition, et 160 px de large suffisent pour la mesurer en une fraction du
   temps qu'il faudrait en 1080. */
spawnSync(FF, [
  "-v", "error", "-t", String(secondes), "-i", `public/${fichier}.mp4`,
  "-r", "1", "-s", "160x284", `${TMP}/f_%03d.png`,
]);

const valeurs = readdirSync(TMP)
  .sort()
  .map((nom) => {
    const png = PNG.sync.read(readFileSync(join(TMP, nom)));
    let somme = 0;
    let n = 0;
    for (let i = 0; i < png.data.length; i += 4) {
      somme +=
        0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2];
      n++;
    }
    return somme / n;
  });

if (!valeurs.length) {
  console.error(`Aucune image extraite — public/${fichier}.mp4 est-il lisible ?`);
  process.exit(1);
}

for (const [i, v] of valeurs.entries()) {
  console.log(
    `${String(i).padStart(2)}s  ${v.toFixed(0).padStart(3)}  ${"#".repeat(Math.round(v / 6))}`,
  );
}

const moyenne = valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
console.log(
  `\nmoyenne ${moyenne.toFixed(0)}   1re seconde ${valeurs[0].toFixed(0)}   cible 116-118`,
);

if (valeurs.length > fenetre) {
  let meilleure = 0;
  let debut = 0;
  for (let i = 0; i + fenetre <= valeurs.length; i++) {
    const m = valeurs.slice(i, i + fenetre).reduce((a, b) => a + b, 0) / fenetre;
    if (m > meilleure) {
      meilleure = m;
      debut = i;
    }
  }
  console.log(
    `meilleure fenetre de ${fenetre}s : ${debut}s → ${debut + fenetre}s (${meilleure.toFixed(0)})`,
  );
}
