/* Montage "style pub" simple — reproduit la structure de la toute première version
 * (creatis-demo-tweet-ad.mp4) : upload → analyse (accéléré) → résultats → modal, sans
 * zooms dynamiques ni intro texte. Contrairement à l'original (edit-demo.js, bornes de
 * phases devinées à l'oeil), ici les 4 phases sont calées sur les vrais timestamps
 * d'events.json produits par record-demo-v3.js. */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const SCRATCH = path.join(__dirname, '..', '.scratch-demo');
const INPUT = path.join(SCRATCH, 'demo-raw-v3.mp4');
const OUTPUT = process.argv[2] || path.join(SCRATCH, 'demo-simple.mp4');
const FONT = 'C\\:/Windows/Fonts/arialbd.ttf';
const ENDCARD_HOLD = 2.2;

const events = JSON.parse(fs.readFileSync(path.join(SCRATCH, 'events.json'), 'utf8')).events;
function evt(name) {
  const e = events.find(e => e.name === name);
  if (!e) throw new Error(`Event manquant dans events.json : ${name}`);
  return e;
}

// Légendes paramétrables (3e argument CLI, JSON) — pour poster plusieurs démos sans
// texte identique partout (repéré comme du contenu recyclé sur les réseaux sinon).
const DEFAULT_CAPTIONS = {
  analyse: "L'IA analyse ta vidéo en temps réel",
  results: '10 clips viraux trouvés, vignettes générées automatiquement',
  subs: 'Sous-titres synchronisés. Score viral calculé.',
  hook: 'Change le hook en un clic — le rendu s’affiche direct sur la vidéo',
};
const CAPTIONS = process.argv[3] ? { ...DEFAULT_CAPTIONS, ...JSON.parse(process.argv[3]) } : DEFAULT_CAPTIONS;

const PHASES = [
  { from: 'start', to: 'analyze-clicked', speed: 1.5, text: null },
  { from: 'analyze-clicked', to: 'results-shown', targetDuration: 4.0, text: CAPTIONS.analyse },
  { from: 'results-shown', to: 'modal-open', speed: 1.3, text: CAPTIONS.results },
  // Pas de zoom (style simple demandé), mais vitesse réelle (1.0x) sur toute la partie
  // hook : le but est que le changement de style (Pill/Clean/Outline) et le rendu final
  // sur la vidéo soient bien VISIBLES, pas juste survolés à vitesse accélérée.
  { from: 'modal-open', to: 'hook-tab', speed: 1.1, text: CAPTIONS.subs },
  { from: 'hook-tab', to: 'hook-rendered', speed: 1.0, text: CAPTIONS.hook },
  { from: 'hook-rendered', to: 'end', speed: 1.0, text: null, isLast: true },
];

function esc(t) { return t.replace(/:/g, '\\:').replace(/'/g, '’'); }

function main() {
  const filterParts = [];
  const labels = [];

  PHASES.forEach((p, i) => {
    const t0 = evt(p.from).t;
    const t1 = evt(p.to).t;
    const rawDur = Math.max(t1 - t0, 0.15);
    const speed = p.targetDuration ? Math.max(rawDur / p.targetDuration, 1.0) : (p.speed || 1.0);
    const outDur = rawDur / speed;
    const label = `seg${i}`;

    let chain = `[0:v]trim=start=${t0.toFixed(3)}:end=${t1.toFixed(3)},setpts=(PTS-STARTPTS)/${speed}`;

    if (p.isLast) {
      chain += `,tpad=stop_mode=clone:stop_duration=${ENDCARD_HOLD}`;
    }

    if (p.text) {
      const txt = esc(p.text);
      chain += `,drawtext=fontfile='${FONT}':text='${txt}':fontsize=34:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-90:enable='between(t\\,0.3\\,${Math.max(outDur - 0.2, 0.3).toFixed(2)})'`;
    }

    if (p.isLast) {
      chain += `,drawbox=x=0:y=0:w=iw:h=ih:color=black@0.55:t=fill:enable='gte(t\\,${outDur.toFixed(2)})'`;
      chain += `,drawtext=fontfile='${FONT}':text='Construit en solo avec Claude Code':fontsize=40:fontcolor=0x10b981:borderw=2:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2-20:enable='gte(t\\,${outDur.toFixed(2)})'`;
      chain += `,drawtext=fontfile='${FONT}':text='Creatis.app':fontsize=26:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2+40:enable='gte(t\\,${outDur.toFixed(2)})'`;
    }

    chain += `,setsar=1[${label}]`;
    filterParts.push(chain);
    labels.push(`[${label}]`);
  });

  const filterComplex = filterParts.join(';') + ';' + labels.join('') + `concat=n=${labels.length}:v=1:a=0[outv]`;

  console.log('Montage simple en cours...');
  execFileSync(ffmpegPath, [
    '-y', '-i', INPUT,
    '-filter_complex', filterComplex,
    '-map', '[outv]',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-r', '30',
    OUTPUT
  ], { stdio: 'inherit' });

  console.log('Vidéo montée :', OUTPUT);
}

main();
