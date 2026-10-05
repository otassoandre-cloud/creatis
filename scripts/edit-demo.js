/* Montage "style pub" de l'enregistrement brut clips-v2 :
   - ralentit les moments clés (analyse IA, résultats, modal) pour laisser le temps de lire
   - accélère le début (upload) pour rester punchy
   - ajoute des textes superposés synchronisés
   - carte de fin "Construit avec Claude Code" */
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const SCRATCH = 'C:/Users/UTILIS~1/AppData/Local/Temp/claude/c--Users-Utilisateur-Desktop-creatis/c78bd513-0c89-4a1a-b9d9-3f194b676c08/scratchpad';
const INPUT = path.join(SCRATCH, 'demo-raw.mp4');
const OUTPUT = path.join(SCRATCH, 'demo-final.mp4');
const FONT = 'C:/Windows/Fonts/arialbd.ttf';

// Frontières vérifiées frame par frame (contact sheet) sur la vidéo brute (fps réel ~6.2, 61.6s total).
// La cadence de capture n'était pas uniforme dans le temps réel : l'écran d'analyse se
// re-rendait en continu (donc beaucoup de frames), la grille de résultats + modal étaient
// quasi statiques (peu de frames) — d'où des bornes très différentes des timestamps du log.
const PHASES = [
  { name: 'upload', start: 0.0, end: 3.2, speed: 1.5, text: null },
  { name: 'analyse', start: 3.2, end: 54.0, speed: 8.0, text: "L'IA analyse ta vidéo en temps réel" },
  { name: 'resultats', start: 54.0, end: 57.4, speed: 0.8, text: '10 clips viraux trouvés, vignettes générées automatiquement' },
  { name: 'modal', start: 57.4, end: 61.5, speed: 0.9, text: 'Sous-titres. Score viral. Prêt à publier.' },
];

function esc(t) { return t.replace(/:/g, '\\:').replace(/'/g, "’"); }

const ENDCARD_HOLD = 2.2;

function main() {
  const filterParts = [];
  const labels = [];

  PHASES.forEach((p, i) => {
    const dur = p.end - p.start;
    const outDur = dur / p.speed;
    const isLast = i === PHASES.length - 1;
    const label = `seg${i}`;
    let chain = `[0:v]trim=start=${p.start}:end=${p.end},setpts=(PTS-STARTPTS)/${p.speed}`;
    if (isLast) {
      // Prolonge la dernière frame de ce segment pour servir de fond à la carte de fin
      // (plus robuste qu'un micro-trim + loop séparé, qui peut produire une durée nulle).
      chain += `,tpad=stop_mode=clone:stop_duration=${ENDCARD_HOLD}`;
    }
    if (p.text) {
      const txt = esc(p.text);
      chain += `,drawtext=fontfile='${FONT}':text='${txt}':fontsize=34:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-90:enable='between(t\\,0.3\\,${(outDur - 0.2).toFixed(2)})'`;
    }
    if (isLast) {
      chain += `,drawbox=x=0:y=0:w=iw:h=ih:color=black@0.55:t=fill:enable='gte(t\\,${outDur.toFixed(2)})'`;
      chain += `,drawtext=fontfile='${FONT}':text='Construit en solo avec Claude Code':fontsize=40:fontcolor=0x10b981:borderw=2:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2-20:enable='gte(t\\,${outDur.toFixed(2)})'`;
      chain += `,drawtext=fontfile='${FONT}':text='Creatis.app':fontsize=26:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2+40:enable='gte(t\\,${outDur.toFixed(2)})'`;
    }
    chain += `[${label}]`;
    filterParts.push(chain);
    labels.push(`[${label}]`);
  });

  const filterComplex = filterParts.join(';') + ';' + labels.join('') + `concat=n=${labels.length}:v=1:a=0[outv]`;

  console.log('Montage en cours...');
  execFileSync(ffmpegPath, [
    '-y', '-i', INPUT,
    '-filter_complex', filterComplex,
    '-map', '[outv]',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-r', '24',
    OUTPUT
  ], { stdio: 'inherit' });

  console.log('Vidéo finale :', OUTPUT);
}

main();
