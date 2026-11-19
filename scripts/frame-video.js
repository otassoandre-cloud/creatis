/* Habille une vidéo de démo déjà montée (edit-demo.js) en "carte flottante" à coins arrondis
   sur fond dégradé + halo émeraude — le style "pub pro" (Screen Studio) demandé.
   Réutilisable pour toutes les prochaines vidéos : ne change que INPUT/OUTPUT. */
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const SCRATCH = 'C:/Users/UTILIS~1/AppData/Local/Temp/claude/c--Users-Utilisateur-Desktop-creatis/c78bd513-0c89-4a1a-b9d9-3f194b676c08/scratchpad';
const ASSETS_DIR = path.join(__dirname, 'assets');

const INPUT = process.argv[2] || path.join(SCRATCH, 'demo-final.mp4');
const OUTPUT = process.argv[3] || path.join(SCRATCH, 'demo-ad.mp4');

// Doit correspondre à make-frame-assets.js
const CARD_W = 980;
const CARD_H = 612;
const CARD_X = 150;
const CARD_Y = 94;

function getDuration(file) {
  try {
    execFileSync(ffmpegPath, ['-i', file], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    const out = e.stderr.toString();
    const m = out.match(/Duration: (\d+):(\d+):([\d.]+)/);
    if (m) return (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
  }
  throw new Error('Durée introuvable pour ' + file);
}

function main() {
  const bg = path.join(ASSETS_DIR, 'frame-bg.png');
  const mask = path.join(ASSETS_DIR, 'frame-mask.png');
  const duration = getDuration(INPUT);
  console.log(`Durée détectée : ${duration.toFixed(2)}s`);

  const filterComplex =
    `[0:v]scale=${CARD_W}:${CARD_H}[card];` +
    `[2:v]format=gray[maskg];` +
    `[card][maskg]alphamerge[cardrgba];` +
    `[1:v][cardrgba]overlay=${CARD_X}:${CARD_Y}[outv]`;

  console.log('Habillage en cours...');
  execFileSync(ffmpegPath, [
    '-y',
    '-i', INPUT,
    '-loop', '1', '-framerate', '24', '-i', bg,
    '-loop', '1', '-framerate', '24', '-i', mask,
    '-filter_complex', filterComplex,
    '-map', '[outv]',
    '-t', duration.toFixed(2),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-r', '24',
    OUTPUT
  ], { stdio: 'inherit' });

  console.log('Vidéo habillée :', OUTPUT);
}

main();
