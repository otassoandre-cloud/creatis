const puppeteer = require('puppeteer');
const GIFEncoder = require('gif-encoder-2');
const { PNG } = require('pngjs');
const fs = require('fs');
const http = require('http');

const HTML_FILE = 'C:/Users/Utilisateur/Desktop/ADS META/creatis-6s-ad-v2.html';
const OUTPUT    = 'C:/Users/Utilisateur/Desktop/ADS META/creatis-6s-ad.gif';
const WIDTH     = 600;
const HEIGHT    = 600;

// Timing du GIF (chaque frame = 100ms = 10fps)
const ANIM_FRAMES  = 20; // 2s animation des cards
const PAUSE_FRAMES = 20; // 2s pause figée sur slide1
const FADE_FRAMES  = 5;  // 0.5s fondu
const LOGO_FRAMES  = 25; // 2.5s logo
// Total = 8.5s

function startServer(htmlPath) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(htmlPath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function capture(page) {
  const buf = await page.screenshot({ type: 'png' });
  return PNG.sync.read(buf).data;
}

(async () => {
  const server = await startServer(HTML_FILE);
  const port   = server.address().port;
  console.log(`Serveur local sur port ${port}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle0', timeout: 20000 });

  // Vider tous les timers et redémarrer l'animation proprement
  await page.evaluate(() => {
    const maxId = setTimeout(() => {}, 0);
    for (let i = 0; i <= maxId; i++) clearTimeout(i);
    document.getElementById('slide1').style.opacity = '1';
    document.getElementById('slide2').style.opacity = '0';
    const s1 = document.getElementById('slide1');
    s1.style.display = 'none'; void s1.offsetWidth; s1.style.display = '';
  });
  await new Promise(r => setTimeout(r, 100));

  const encoder = new GIFEncoder(WIDTH, HEIGHT, 'neuquant', true);
  encoder.setDelay(100);
  encoder.setQuality(10);
  encoder.setRepeat(0);
  encoder.start();

  const total = ANIM_FRAMES + PAUSE_FRAMES + FADE_FRAMES + LOGO_FRAMES;
  let f = 0;

  // Phase 1 — Animation slide1 en temps réel (2s)
  console.log('Phase 1 : animation slide1...');
  for (let i = 0; i < ANIM_FRAMES; i++) {
    const t0 = Date.now();
    encoder.addFrame(await capture(page));
    process.stdout.write(`\r  Frame ${++f}/${total}`);
    const wait = Math.max(0, 100 - (Date.now() - t0));
    if (wait) await new Promise(r => setTimeout(r, wait));
  }

  // Geler l'animation CSS à son état actuel
  await page.evaluate(() => {
    document.querySelectorAll('#slide1 *').forEach(el => {
      el.style.animationPlayState = 'paused';
    });
  });

  // Phase 2 — Pause figée sur slide1 (3.5s) — on réutilise le même frame
  console.log('\nPhase 2 : pause slide1...');
  const frozenFrame = await capture(page);
  for (let i = 0; i < PAUSE_FRAMES; i++) {
    encoder.addFrame(frozenFrame);
    process.stdout.write(`\r  Frame ${++f}/${total}`);
  }

  // Phase 3 — Fondu vers slide2
  console.log('\nPhase 3 : transition...');
  await page.evaluate(() => {
    const s1 = document.getElementById('slide1');
    const s2 = document.getElementById('slide2');
    s1.style.transition = 'opacity 0.5s ease';
    s2.style.transition = 'opacity 0.5s ease';
    s1.style.opacity = '0';
    setTimeout(() => { s2.style.opacity = '1'; }, 250);
  });
  for (let i = 0; i < FADE_FRAMES; i++) {
    await new Promise(r => setTimeout(r, 100));
    encoder.addFrame(await capture(page));
    process.stdout.write(`\r  Frame ${++f}/${total}`);
  }

  // Phase 4 — Logo slide2 (2.5s)
  console.log('\nPhase 4 : logo...');
  await new Promise(r => setTimeout(r, 300));
  for (let i = 0; i < LOGO_FRAMES; i++) {
    const t0 = Date.now();
    encoder.addFrame(await capture(page));
    process.stdout.write(`\r  Frame ${++f}/${total}`);
    const wait = Math.max(0, 100 - (Date.now() - t0));
    if (wait) await new Promise(r => setTimeout(r, wait));
  }

  encoder.finish();
  fs.writeFileSync(OUTPUT, Buffer.from(encoder.out.getData()));
  await browser.close();
  server.close();

  const kb = Math.round(fs.statSync(OUTPUT).size / 1024);
  console.log(`\nGIF créé : ${OUTPUT} (${kb} KB)`);
})();
