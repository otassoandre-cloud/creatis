/* Enregistrement d'une vraie génération clips-v2 pour vidéo de démo Twitter.
   Se connecte à une fenêtre Chrome déjà ouverte (débogage distant sur 9222)
   où l'utilisateur est déjà connecté à creatis.app avec son compte réel. */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCRATCH = 'C:/Users/UTILIS~1/AppData/Local/Temp/claude/c--Users-Utilisateur-Desktop-creatis/c78bd513-0c89-4a1a-b9d9-3f194b676c08/scratchpad';
const FRAMES_DIR = path.join(SCRATCH, 'demo-frames');
const VIDEO_INPUT = 'C:/Users/Utilisateur/Videos/ScreenRecording_06-20-2026 10-54-09_1.MP4';
// Sur ce Chrome (profil réel via debug distant), chaque page.screenshot() prend ~1.4-1.5s
// (goulot CDP, pas le disque) : la vraie cadence tourne autour de 0.6-0.7 fps, pas 1000/280.
// On garde un petit intervalle mini entre captures et on calcule le fps réel après coup.
const FRAME_INTERVAL_MS = 50;

function log(msg) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`); }

async function main() {
  if (fs.existsSync(FRAMES_DIR)) fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  log('Connexion au Chrome existant (port 9222)...');
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });

  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('creatis.app')) || pages[0];
  log(`Page trouvée : ${page.url()}`);

  await page.setViewport({ width: 1280, height: 800 });

  log('Navigation vers clips-v2.html...');
  await page.goto('https://creatis.app/clips-v2.html', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  // Empêche Chrome de throttle/geler le rendu si la fenêtre perd le focus
  // (sinon page.screenshot() peut rester bloqué indéfiniment sans erreur).
  const cdp = await page.target().createCDPSession();
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await page.bringToFront();

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
    ]);
  }

  // ── Démarrer la capture d'écran en boucle ──
  let frameCount = 0;
  let capturing = true;
  const captureStart = Date.now();
  const captureLoop = async () => {
    while (capturing) {
      try {
        const filename = path.join(FRAMES_DIR, `frame_${String(frameCount).padStart(5, '0')}.jpg`);
        await withTimeout(page.screenshot({ path: filename, type: 'jpeg', quality: 85 }), 3000);
        frameCount++;
      } catch (e) { log('FRAME RATEE: ' + e.message); }
      await new Promise(r => setTimeout(r, FRAME_INTERVAL_MS));
    }
  };
  const captureHandle = captureLoop();
  log('Capture d\'écran démarrée.');

  try {
    // ── Upload du fichier ──
    log(`Upload de ${VIDEO_INPUT}...`);
    const fileInput = await page.waitForSelector('#file-input', { timeout: 10000 });
    await fileInput.uploadFile(VIDEO_INPUT);
    await new Promise(r => setTimeout(r, 2500)); // laisser le temps à la miniature/preview de se charger

    // ── Lancer l'analyse ──
    log('Clic sur "Créer les Shorts"...');
    await page.waitForFunction(() => {
      const btn = document.getElementById('btn-analyze');
      return btn && !btn.disabled;
    }, { timeout: 15000 });
    await page.click('#btn-analyze');

    // ── Attendre l'état studio (résultats) ──
    log('Attente de la génération réelle (jusqu\'à 10 min)...');
    await page.waitForFunction(() => {
      const studio = document.getElementById('state-studio');
      const grid = document.getElementById('clips-grid');
      return studio && studio.classList.contains('active') && grid && grid.children.length > 0;
    }, { timeout: 900000, polling: 1000 });

    log('Résultats affichés ! Attente de la génération des 10 vignettes...');
    await new Promise(r => setTimeout(r, 14000));
    log('Vignettes normalement prêtes.');

    // Montrer la grille complète (10 clips) avant d'ouvrir la modal
    await page.evaluate(() => window.scrollBy(0, 150));
    await new Promise(r => setTimeout(r, 1500));

    // ── Ouvrir le premier clip pour montrer le détail ──
    try {
      const firstCard = await page.$('.clip-card');
      if (firstCard) {
        await firstCard.click();
        log('Modal du premier clip ouverte.');
        await new Promise(r => setTimeout(r, 4000));
      }
    } catch (e) { log('Impossible d\'ouvrir la modal du clip : ' + e.message); }

  } catch (e) {
    log('ERREUR pendant le scénario : ' + e.message);
  }

  capturing = false;
  await captureHandle;
  const captureElapsedSec = (Date.now() - captureStart) / 1000;
  log(`Capture terminée : ${frameCount} frames en ${captureElapsedSec.toFixed(1)}s réelles.`);

  await browser.disconnect();
  log('Déconnecté de Chrome (la fenêtre reste ouverte).');

  // ── Assembler la vidéo brute avec ffmpeg ──
  const ffmpegPath = require('ffmpeg-static');
  const { execFileSync } = require('child_process');
  // fps réel = frames / durée réelle (pas l'intervalle nominal, cf. commentaire plus haut)
  const fps = Math.max(1, Math.round((frameCount / captureElapsedSec) * 10) / 10);
  const outputPath = path.join(SCRATCH, 'demo-raw.mp4');
  log(`Assemblage vidéo (${fps} fps) avec ffmpeg...`);
  execFileSync(ffmpegPath, [
    '-y', '-framerate', String(fps),
    '-i', path.join(FRAMES_DIR, 'frame_%05d.jpg'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20',
    outputPath
  ], { stdio: 'inherit' });

  log(`Vidéo brute prête : ${outputPath}`);
}

main().catch(e => { console.error('ÉCHEC:', e); process.exit(1); });
