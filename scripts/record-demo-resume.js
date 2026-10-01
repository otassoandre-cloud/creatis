/* Reprend la dernière analyse déjà réalisée (bandeau "Reprendre") au lieu de tout
   ré-uploader/ré-analyser — beaucoup plus rapide, pas de nouveaux appels API/Railway.
   Attend plus longtemps que les 10 vignettes se génèrent avant de continuer. */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCRATCH = 'C:/Users/UTILIS~1/AppData/Local/Temp/claude/c--Users-Utilisateur-Desktop-creatis/c78bd513-0c89-4a1a-b9d9-3f194b676c08/scratchpad';
const FRAMES_DIR = path.join(SCRATCH, 'demo-frames');
const VIDEO_INPUT = 'C:/Users/Utilisateur/Videos/ScreenRecording_06-20-2026 10-54-09_1.MP4';
const FRAME_INTERVAL_MS = 280;

function log(msg) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`); }

async function main() {
  if (fs.existsSync(FRAMES_DIR)) fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  log('Connexion au Chrome existant (port 9222)...');
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('creatis.app')) || pages[0];

  await page.setViewport({ width: 1280, height: 800 });
  log('Navigation vers clips-v2.html...');
  await page.goto('https://creatis.app/clips-v2.html', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  let frameCount = 0;
  let capturing = true;
  const captureLoop = async () => {
    while (capturing) {
      try {
        const filename = path.join(FRAMES_DIR, `frame_${String(frameCount).padStart(5, '0')}.jpg`);
        await page.screenshot({ path: filename, type: 'jpeg', quality: 85 });
        frameCount++;
      } catch (e) {}
      await new Promise(r => setTimeout(r, FRAME_INTERVAL_MS));
    }
  };
  const captureHandle = captureLoop();
  log('Capture démarrée.');

  try {
    log('Recherche du bandeau de reprise...');
    const resumeInput = await page.waitForSelector('#recovery-banner input[type=file]', { timeout: 10000 });
    await resumeInput.uploadFile(VIDEO_INPUT);
    log('Fichier réattaché — génération des vignettes en cours...');

    // Laisser largement le temps aux 10 vignettes de se générer (capture de frames vidéo séquentielle)
    await new Promise(r => setTimeout(r, 12000));
    log('Vignettes normalement prêtes.');

    // Petit scroll pour montrer la grille complète (10 clips)
    await page.evaluate(() => window.scrollBy(0, 150));
    await new Promise(r => setTimeout(r, 1500));

    const firstCard = await page.$('.clip-card');
    if (firstCard) {
      await firstCard.click();
      log('Modal ouverte.');
      await new Promise(r => setTimeout(r, 4000));
    }
  } catch (e) {
    log('ERREUR : ' + e.message);
  }

  capturing = false;
  await captureHandle;
  log(`Capture terminée : ${frameCount} frames.`);
  await browser.disconnect();

  const ffmpegPath = require('ffmpeg-static');
  const { execFileSync } = require('child_process');
  const fps = Math.round(1000 / FRAME_INTERVAL_MS);
  const outputPath = path.join(SCRATCH, 'demo-raw.mp4');
  log(`Assemblage vidéo (${fps} fps)...`);
  execFileSync(ffmpegPath, [
    '-y', '-framerate', String(fps),
    '-i', path.join(FRAMES_DIR, 'frame_%05d.jpg'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20',
    outputPath
  ], { stdio: 'inherit' });
  log(`Vidéo brute prête : ${outputPath}`);
}

main().catch(e => { console.error('ÉCHEC:', e); process.exit(1); });
