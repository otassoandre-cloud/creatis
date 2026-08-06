/* Intro texte animé pour vidéo pub Twitter — style "accroche pain-point → solution"
 * inspiré de Shipper (texte qui apparaît mot par mot) mais sur fond sombre Créatis
 * (--bg:#0a0f0a, accent --vert:#10b981) au lieu du blanc/noir de la référence.
 * Aucune vidéo source nécessaire : fond généré par ffmpeg (color=lavfi). */
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const SCRATCH = path.join(__dirname, '..', '.scratch-demo');
const OUTPUT = process.argv[2] || path.join(SCRATCH, 'intro.mp4');
const FONT = 'C\\:/Windows/Fonts/arialbd.ttf'; // le ':' doit être échappé, sinon ffmpeg le lit comme séparateur d'option
const W = 1280, H = 800, FPS = 30;
const BG = '0x0a0f0a';
const VERT = '0x10b981';

const LINE1_WORDS = ['Tu', 'perds', 'encore', 'des', 'heures', 'à', 'monter', 'tes', 'vidéos', '?'];
const WORD_STEP = 0.20;      // durée d'affichage entre chaque mot ajouté
const LINE1_HOLD = 1.0;      // pause sur la phrase complète avant de couper
const LINE2_TEXT = 'Créatis le fait en 2 minutes.';
const LINE2_FADE = 0.35;
const LINE2_HOLD = 1.4;

function esc(t) { return t.replace(/:/g, '\\:').replace(/'/g, '’'); }

function main() {
  const filterParts = [];
  const labels = [];
  const nSplits = LINE1_WORDS.length + 1; // +1 pour le segment ligne 2

  filterParts.push(`color=c=${BG}:s=${W}x${H}:r=${FPS}:d=10[bgsrc]`);
  filterParts.push(`[bgsrc]split=${nSplits}${Array.from({ length: nSplits }, (_, i) => `[b${i}]`).join('')}`);

  // Ligne 1 : révélation mot par mot
  LINE1_WORDS.forEach((_, i) => {
    const cumText = esc(LINE1_WORDS.slice(0, i + 1).join(' '));
    const isLast = i === LINE1_WORDS.length - 1;
    const dur = isLast ? LINE1_HOLD : WORD_STEP;
    const label = `seg${i}`;
    let chain = `[b${i}]trim=duration=${dur.toFixed(3)},setpts=PTS-STARTPTS`;
    chain += `,drawtext=fontfile='${FONT}':text='${cumText}':fontsize=52:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`;
    chain += `[${label}]`;
    filterParts.push(chain);
    labels.push(`[${label}]`);
  });

  // Ligne 2 : fondu d'un coup, en émeraude
  {
    const idx = LINE1_WORDS.length;
    const label = `seg${idx}`;
    const txt = esc(LINE2_TEXT);
    let chain = `[b${idx}]trim=duration=${LINE2_HOLD.toFixed(3)},setpts=PTS-STARTPTS`;
    chain += `,drawtext=fontfile='${FONT}':text='${txt}':fontsize=56:fontcolor=${VERT}:x=(w-text_w)/2:y=(h-text_h)/2:alpha='if(lt(t\\,${LINE2_FADE}),t/${LINE2_FADE}\\,1)'`;
    chain += `[${label}]`;
    filterParts.push(chain);
    labels.push(`[${label}]`);
  }

  const filterComplex = filterParts.join(';') + ';' + labels.join('') + `concat=n=${labels.length}:v=1:a=0[outv]`;

  console.log('Génération intro...');
  execFileSync(ffmpegPath, [
    '-y',
    '-filter_complex', filterComplex,
    '-map', '[outv]',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-r', String(FPS),
    OUTPUT
  ], { stdio: 'inherit' });

  console.log('Intro prête :', OUTPUT);
}

main();
