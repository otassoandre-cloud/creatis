/**
 * Regenere le dossier public/ a partir des assets du depot Créatis.
 *
 * Les mp4 de public/ ne sont pas versionnes (voir .gitignore) : ce sont des
 * copies ou des derives d'assets qui vivent deja ailleurs dans le depot.
 * Ce script les reconstruit apres un clone.
 *
 *   node preparer-assets.mjs
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const DEPOT = join(ICI, "..");
const PUBLIC = join(ICI, "public");

mkdirSync(PUBLIC, { recursive: true });

// 1. Les clips de demo, copies tels quels depuis images/loop/
for (let n = 1; n <= 8; n++) {
  const source = join(DEPOT, "images", "loop", `showcase-${n}.mp4`);
  if (!existsSync(source)) {
    console.warn(`⚠ manquant, ignore : ${source}`);
    continue;
  }
  copyFileSync(source, join(PUBLIC, `showcase-${n}.mp4`));
}
console.log("✓ showcase-1..8.mp4");

// 2. Le clip client a 66 K vues : extrait de 6 s recadre en 1080x1920.
//    La source est un .mov 720x1280 fourni hors depot — si elle est absente,
//    on ne bloque pas le reste, on signale seulement.
const SOURCE_66K = process.env.CLIP_66K_SOURCE;
const sortie66k = join(PUBLIC, "clip-66k.mp4");

if (existsSync(sortie66k)) {
  console.log("✓ clip-66k.mp4 (deja present)");
} else if (SOURCE_66K && existsSync(SOURCE_66K)) {
  const ffmpeg = join(DEPOT, "node_modules", "ffmpeg-static", "ffmpeg.exe");
  execFileSync(ffmpeg, [
    "-y", "-ss", "5", "-t", "6", "-i", SOURCE_66K,
    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
    "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "23",
    "-pix_fmt", "yuv420p", sortie66k, "-loglevel", "error",
  ]);
  console.log("✓ clip-66k.mp4 (regenere)");
} else {
  console.warn(
    "⚠ clip-66k.mp4 absent. Pose le .mov source et relance avec :\n" +
      "  CLIP_66K_SOURCE=/chemin/vers/clip.mov node preparer-assets.mjs",
  );
}
