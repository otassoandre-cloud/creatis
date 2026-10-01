/**
 * Normalise l'audio d'un rendu aux standards des plateformes sociales.
 *
 *   node normaliser-audio.mjs out/creatis-pub-tiktok.mp4
 *
 * Cible : -14 LUFS integres, -1 dBTP de crete. C'est la cible de TikTok,
 * Instagram et YouTube — au-dela, les plateformes rabaissent le son elles-memes,
 * et un true peak positif sature sur un haut-parleur de telephone.
 *
 * Le rendu Remotion sortait a -13,3 LUFS et **+1,0 dBTP**, donc en ecretage.
 *
 * Deux passes : la premiere mesure, la seconde applique les valeurs mesurees.
 * Une passe unique donne un resultat approximatif sur un fichier court.
 *
 * `-ar 48000` est OBLIGATOIRE : sans lui, loudnorm sort en 96 kHz, un debit non
 * standard pour une livraison video. La video, elle, est copiee sans reencodage.
 */
import { spawnSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const FFMPEG = join(ICI, "..", "node_modules", "ffmpeg-static", "ffmpeg.exe");

const fichier = process.argv[2];
if (!fichier || !existsSync(fichier)) {
  console.error("Usage : node normaliser-audio.mjs <fichier.mp4>");
  process.exit(1);
}

/* ffmpeg ecrit le JSON de loudnorm sur **stderr**, pas sur stdout — meme quand
   la commande reussit. On concatene donc systematiquement les deux flux, sinon
   la mesure revient vide et JSON.parse casse. */
const lancer = (args) => {
  const r = spawnSync(FFMPEG, args, { encoding: "utf8" });
  return (r.stdout || "") + (r.stderr || "");
};

console.log("Passe 1 — mesure…");
const brut = lancer([
  "-i", fichier,
  "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json",
  "-f", "null", "-",
]);

const json = brut.slice(brut.lastIndexOf("{"), brut.lastIndexOf("}") + 1);
const m = JSON.parse(json);
console.log(`  avant : ${m.input_i} LUFS, crête ${m.input_tp} dBTP`);

console.log("Passe 2 — application…");
const temporaire = fichier.replace(/\.mp4$/, ".normalise.mp4");
lancer([
  "-y", "-i", fichier,
  "-af",
  `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}` +
    `:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}` +
    `:offset=${m.target_offset}:linear=true`,
  "-ar", "48000",
  "-c:v", "copy",
  "-c:a", "aac", "-b:a", "192k",
  temporaire, "-loglevel", "error",
]);

renameSync(temporaire, fichier);

const controle = lancer([
  "-i", fichier,
  "-af", "loudnorm=print_format=summary",
  "-f", "null", "-",
]);
const apres = controle.match(/Input Integrated:\s+([-0-9.]+) LUFS/);
const crete = controle.match(/Input True Peak:\s+([-0-9.+]+) dBTP/);
console.log(`  après : ${apres?.[1]} LUFS, crête ${crete?.[1]} dBTP`);
