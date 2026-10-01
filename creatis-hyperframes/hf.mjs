/**
 * Lance la CLI HyperFrames avec ffmpeg ET ffprobe sur le PATH.
 *
 * Pourquoi ce wrapper : HyperFrames exige les deux binaires sur le PATH pour
 * encoder et pour sonder les medias, et s'arrete net sinon en proposant
 * `winget install Gyan.FFmpeg`. On evite d'installer ffmpeg au niveau systeme
 * en pointant simplement sur les binaires deja fournis par npm — rien a
 * configurer sur la machine, rien a reinstaller apres un clone.
 *
 *   node hf.mjs render
 *   node hf.mjs preview
 */
import { spawn } from "node:child_process";
import { delimiter, dirname } from "node:path";
import ffmpegChemin from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

const VERSION_HF = "0.8.16";

const env = { ...process.env };
env.PATH = [dirname(ffmpegChemin), dirname(ffprobeStatic.path), env.PATH].join(
  delimiter,
);

const enfant = spawn(
  "npx",
  ["--yes", `hyperframes@${VERSION_HF}`, ...process.argv.slice(2)],
  { stdio: "inherit", env, shell: true },
);

enfant.on("exit", (code) => process.exit(code ?? 1));
