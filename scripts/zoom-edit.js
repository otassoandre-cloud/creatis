/* Montage dynamique piloté par events.json (produit par record-demo-v3.js).
 * Contrairement à edit-demo.js (bornes de phases devinées à l'oeil sur une planche
 * contact), ici chaque coupure/zoom est calée sur un timestamp réel + un vrai
 * bounding rect DOM capturé pendant l'enregistrement — pas d'inspection manuelle.
 * Zoom = crop centré sur le rect cible + scale (cut net façon montage pub rapide,
 * pas un zoompan progressif — plus robuste et déjà très dynamique avec les coupes). */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const SCRATCH = path.join(__dirname, '..', '.scratch-demo');
const INPUT = path.join(SCRATCH, 'demo-raw-v3.mp4');
const OUTPUT = process.argv[2] || path.join(SCRATCH, 'demo-edited.mp4');
const FONT = 'C\\:/Windows/Fonts/arialbd.ttf';
const W = 1280, H = 800;
const ENDCARD_HOLD = 2.2;

const events = JSON.parse(fs.readFileSync(path.join(SCRATCH, 'events.json'), 'utf8')).events;
function evt(name) {
  const e = events.find(e => e.name === name);
  if (!e) throw new Error(`Event manquant dans events.json : ${name}`);
  return e;
}
function hasEvt(name) { return events.some(e => e.name === name); }

// ── Définition des segments : [from, to, options] ──
// speed: multiplicateur (2 = 2x plus rapide) — soit fixe, soit calculé pour tenir dans targetDuration.
// zoom: nom de l'event dont le rect sert de centre de crop (null = plan large).
const hasScoring = hasEvt('scoring-showcase');
const SEGMENTS = [
  { from: 'start', to: 'analyze-clicked', speed: 1.8, zoom: null, text: null },
  { from: 'analyze-clicked', to: 'results-shown', targetDuration: 3.2, zoom: null, text: "L'IA analyse ta vidéo en temps réel" },
  hasScoring
    ? { from: 'results-shown', to: 'scoring-showcase', targetDuration: 2.6, zoom: null, text: '10 clips viraux trouvés automatiquement' }
    : { from: 'results-shown', to: 'modal-open', speed: 1.4, zoom: null, text: '10 clips viraux trouvés automatiquement' },
];
if (hasScoring) {
  SEGMENTS.push({ from: 'scoring-showcase', to: 'modal-open', speed: 1.0, zoom: 'scoring-showcase', zoomFactor: 2.3, text: 'Score viral calculé automatiquement pour chaque clip' });
}
SEGMENTS.push(
  { from: 'zoom-score', to: 'play-clicked', speed: 1.0, zoom: 'zoom-score', zoomFactor: 2.2, text: 'Score détaillé sur chaque clip' },
  { from: 'play-clicked', to: 'zoom-subtitles', speed: 1.0, zoom: null, text: null },
  { from: 'zoom-subtitles', to: 'hook-tab', speed: 1.0, zoom: 'zoom-subtitles', zoomFactor: 1.9, text: 'Sous-titres synchronisés automatiquement' }
);

if (hasEvt('hook-toggled-on') && hasEvt('hook-typing-start') && hasEvt('hook-typing-done')) {
  SEGMENTS.push(
    { from: 'hook-tab', to: 'hook-toggled-on', speed: 1.6, zoom: null, text: null },
    { from: 'hook-toggled-on', to: 'hook-typing-start', speed: 1.2, zoom: 'hook-toggled-on', zoomFactor: 2.0, text: null },
    { from: 'hook-typing-start', to: 'hook-typing-done', speed: 1.0, zoom: 'hook-typing-done', zoomFactor: 2.0, text: 'Hook personnalisable en un clic' }
  );
  const styles = ['hook-style-clean', 'hook-style-outline', 'hook-style-pill'].filter(hasEvt);
  let prev = 'hook-typing-done';
  for (const s of styles) {
    SEGMENTS.push({ from: prev, to: s, speed: 1.0, zoom: s, zoomFactor: 2.0, text: null });
    prev = s;
  }
  if (hasEvt('hook-rendered')) {
    // Rembobinage <3s pour faire réapparaître #modal-hook-overlay (n'existe que sur les
    // 3 premières secondes du clip) — sinon on ne voit jamais le hook stylé RENDU sur la
    // vidéo, juste le champ de saisie du panneau (retour : "on ne voit pas le rendu").
    SEGMENTS.push({ from: prev, to: 'hook-rendered', speed: 1.0, zoom: null, text: null });
    prev = 'hook-rendered';
    SEGMENTS.push({ from: prev, to: 'end', speed: 1.0, zoom: 'hook-rendered', zoomFactor: 1.7, text: 'Le hook s’affiche directement sur ta vidéo', isLast: true });
  } else {
    SEGMENTS.push({ from: prev, to: 'end', speed: 1.0, zoom: null, text: null, isLast: true });
  }
} else {
  // Repli si le tour du hook n'a pas pu être capturé en entier.
  SEGMENTS[SEGMENTS.length - 1].isLast = true;
}

function esc(t) { return t.replace(/:/g, '\\:').replace(/'/g, '’'); }

function cropForRect(rect, zoomFactor) {
  if (!rect || !rect.w || !rect.h) return null;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  let cw = Math.round(W / zoomFactor / 2) * 2;
  let ch = Math.round(H / zoomFactor / 2) * 2;
  cw = Math.min(cw, W);
  ch = Math.min(ch, H);
  let cx0 = Math.round(cx - cw / 2);
  let cy0 = Math.round(cy - ch / 2);
  cx0 = Math.max(0, Math.min(cx0, W - cw));
  cy0 = Math.max(0, Math.min(cy0, H - ch));
  return { cw, ch, cx0, cy0 };
}

function main() {
  const filterParts = [];
  const labels = [];

  SEGMENTS.forEach((seg, i) => {
    const t0 = evt(seg.from).t;
    const t1 = evt(seg.to).t;
    const rawDur = Math.max(t1 - t0, 0.12);
    const speed = seg.targetDuration ? Math.max(rawDur / seg.targetDuration, 1.0) : (seg.speed || 1.0);
    const outDur = rawDur / speed;
    const label = `seg${i}`;

    let chain = `[0:v]trim=start=${t0.toFixed(3)}:end=${t1.toFixed(3)},setpts=(PTS-STARTPTS)/${speed}`;

    if (seg.zoom) {
      const rect = evt(seg.zoom).rect;
      const crop = cropForRect(rect, seg.zoomFactor || 2.0);
      if (crop) {
        chain += `,crop=${crop.cw}:${crop.ch}:${crop.cx0}:${crop.cy0},scale=${W}:${H}`;
      }
    }

    if (seg.isLast) {
      chain += `,tpad=stop_mode=clone:stop_duration=${ENDCARD_HOLD}`;
    }

    if (seg.text) {
      const txt = esc(seg.text);
      chain += `,drawtext=fontfile='${FONT}':text='${txt}':fontsize=30:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-70:enable='between(t\\,0.15\\,${Math.max(outDur - 0.15, 0.2).toFixed(2)})'`;
    }

    if (seg.isLast) {
      chain += `,drawbox=x=0:y=0:w=iw:h=ih:color=black@0.6:t=fill:enable='gte(t\\,${outDur.toFixed(2)})'`;
      chain += `,drawtext=fontfile='${FONT}':text='Construit en solo avec Claude Code':fontsize=38:fontcolor=0x10b981:borderw=2:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2-20:enable='gte(t\\,${outDur.toFixed(2)})'`;
      chain += `,drawtext=fontfile='${FONT}':text='Creatis.app':fontsize=26:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2+40:enable='gte(t\\,${outDur.toFixed(2)})'`;
    }

    // setsar=1 en dernier : scale recalcule un SAR non-exactement-1 pour compenser l'arrondi
    // du crop (ex: 582x364 -> 1280x800 n'est pas parfaitement proportionnel) — concat exige
    // un SAR strictement identique sur tous les segments, zoomés ou non.
    chain += `,setsar=1[${label}]`;
    filterParts.push(chain);
    labels.push(`[${label}]`);
  });

  const filterComplex = filterParts.join(';') + ';' + labels.join('') + `concat=n=${labels.length}:v=1:a=0[outv]`;

  console.log(`Montage dynamique (${SEGMENTS.length} segments) en cours...`);
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
