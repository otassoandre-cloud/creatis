/* Génère une fois les assets statiques pour l'habillage "carte flottante" des vidéos de démo
   (fond dégradé sombre + halo émeraude, masque coins arrondis). Réutilisé par frame-video.js
   pour toutes les vidéos futures — pas besoin de relancer sauf si CANVAS/CARD changent. */
const sharp = require('sharp');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, 'assets');

const CANVAS_W = 1280;
const CANVAS_H = 800;
const CARD_W = 980;
const CARD_H = 612;
const CARD_X = Math.round((CANVAS_W - CARD_W) / 2);
const CARD_Y = Math.round((CANVAS_H - CARD_H) / 2);
const RADIUS = 24;

async function main() {
  const bgSvg = `
  <svg width="${CANVAS_W}" height="${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bg" cx="50%" cy="42%" r="70%">
        <stop offset="0%" stop-color="#0d1f18"/>
        <stop offset="60%" stop-color="#07120d"/>
        <stop offset="100%" stop-color="#020403"/>
      </radialGradient>
      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="16"/>
      </filter>
    </defs>
    <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#bg)"/>
    <rect x="${CARD_X}" y="${CARD_Y + 10}" width="${CARD_W}" height="${CARD_H}" rx="${RADIUS}"
          fill="#10b981" opacity="0.20" filter="url(#glow)"/>
  </svg>`;

  const maskSvg = `
  <svg width="${CARD_W}" height="${CARD_H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${CARD_W}" height="${CARD_H}" fill="#000000"/>
    <rect width="${CARD_W}" height="${CARD_H}" rx="${RADIUS}" fill="#ffffff"/>
  </svg>`;

  const fs = require('fs');
  if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

  await sharp(Buffer.from(bgSvg)).png().toFile(path.join(ASSETS_DIR, 'frame-bg.png'));
  await sharp(Buffer.from(maskSvg)).png().toFile(path.join(ASSETS_DIR, 'frame-mask.png'));

  console.log('Assets générés dans', ASSETS_DIR);
  console.log(JSON.stringify({ CANVAS_W, CANVAS_H, CARD_W, CARD_H, CARD_X, CARD_Y, RADIUS }, null, 2));
}

main();
