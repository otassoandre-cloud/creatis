/* Génère le B-roll GIF depuis la vraie LP Créatis */
/* Usage: node scripts/generate-broll.js */

const puppeteer = require('puppeteer');
const GIFEncoder = require('gif-encoder-2');
const { PNG } = require('pngjs');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const OUTPUT   = path.join('C:/Users/Utilisateur/Desktop/ADS META', 'broll-clips-viraux.gif');
const WIDTH    = 390;
const HEIGHT   = 844;
const FPS      = 6;
const DURATION = 10000; // 10s

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  // Démarrer le serveur local
  console.log('🚀 Démarrage serveur...');
  const server = spawn('node', ['serveur.js'], { cwd: process.cwd(), stdio: 'ignore', detached: false });
  await sleep(2500);

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });

  console.log('📄 Chargement de lp.html...');
  await page.goto('http://localhost:3000/lp.html', { waitUntil: 'networkidle0', timeout: 15000 });

  // Masquer navbar + scroll vers la démo animée
  await page.addStyleTag({ content: `
    .navbar { opacity: 0 !important; }
    * { cursor: none !important; }
  `});

  // Scroll vers la section démo animée (la vidéo→clips animation)
  await page.evaluate(() => {
    const el = document.getElementById('lp-demo-card') || document.querySelector('.lp-anim-wrap') || document.body;
    el.scrollIntoView({ behavior: 'instant' });
  });

  await sleep(1000); // laisser l'animation démarrer

  console.log(`📸 Capture de ${Math.round(DURATION/1000*FPS)} frames...`);

  const W = WIDTH * 2;
  const H = HEIGHT * 2;
  const encoder = new GIFEncoder(W, H, 'neuquant', true);
  const stream = fs.createWriteStream(OUTPUT);
  encoder.createReadStream().pipe(stream);
  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(Math.round(1000 / FPS));
  encoder.setQuality(30);

  const frameCount = Math.round(DURATION / 1000 * FPS);
  for (let i = 0; i < frameCount; i++) {
    const buf = await page.screenshot({ type: 'png' });
    encoder.addFrame(PNG.sync.read(buf).data);
    process.stdout.write(`\r  Frame ${i + 1}/${frameCount}`);
    await sleep(Math.round(1000 / FPS));
  }

  encoder.finish();
  await new Promise(r => stream.on('finish', r));
  await browser.close();
  server.kill();

  const sizeMB = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ ${OUTPUT} — ${sizeMB} MB`);
})();
