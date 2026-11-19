/* ===== CRÉATIS — Générateur GIF dashboard ===== */
/* Usage: node scripts/create-gif.js */

const puppeteer = require('puppeteer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const W = 1280;
const H = 720;
const TMP = path.join(__dirname, '..', 'images', '_gif_tmp');
const OUTPUT = path.join(__dirname, '..', 'images', 'demo-dashboard.gif');
const THUMB_PATH = path.join(__dirname, '..', 'images', 'higgsfield', 'thumbnail-youtube.png');

const MOCK_USER = JSON.stringify({
  id: 'demo-user', nom: 'Alex', email: 'alex@creatis.app', plan: 'pro', avatar: null
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ── PHASE 1 : Prendre les screenshots ── */
async function takeScreenshots() {
  if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

  const thumbBase64 = fs.readFileSync(THUMB_PATH).toString('base64');
  const thumbDataUrl = 'data:image/png;base64,' + thumbBase64;

  console.log('Démarrage serveur...');
  const server = spawn('node', ['serveur.js'], {
    cwd: path.join(__dirname, '..'), detached: false, stdio: 'ignore'
  });
  await sleep(2000);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });

  await page.evaluateOnNewDocument((user) => {
    localStorage.setItem('creatis_user', user);
    localStorage.setItem('creatis_onboarding_done', '1');
    localStorage.setItem('creatis_generations', '47');
    localStorage.setItem('creatis_stats', JSON.stringify({ generations: 47, agentsUtilises: 7 }));
    localStorage.setItem('creatis_form_width', '400');
  }, MOCK_USER);

  await page.goto('http://localhost:3000/app.html', { waitUntil: 'networkidle2', timeout: 20000 });
  await sleep(1200);

  await page.evaluate(() => {
    document.querySelectorAll('.modal, .modal-overlay').forEach(m => m.classList.remove('visible'));
    const g = document.getElementById('stat-generations'); if (g) g.textContent = '47';
    const a = document.getElementById('stat-agents'); if (a) a.textContent = '7';
  });
  await sleep(500);

  const frames = []; // { file, delay }

  const shot = async (name, delay) => {
    const file = path.join(TMP, `${name}.png`);
    await page.screenshot({ path: file });
    frames.push({ file, delay });
    console.log(`  📸 ${name}`);
  };

  // 1. Dashboard
  await shot('01-dashboard', 3000);

  // 2. Miniature Pro sélectionné
  await page.evaluate(() => app.selectionnerAgent('miniature-ia'));
  await sleep(900);
  await shot('02-miniature', 2500);

  // 3. Formulaire rempli
  await page.evaluate(() => {
    const fill = (id, val) => {
      const el = document.getElementById(id);
      if (el) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); }
    };
    fill('champ-miniature-ia-description',
      'Créateur YouTube debout devant double écran avec interface Créatis, fond sombre reflets verts, regard caméra confiant');
    fill('champ-miniature-ia-texte_overlay', 'TON SCRIPT');
    fill('champ-miniature-ia-texte_overlay2', 'EN 30 SEC');
    const em = document.getElementById('champ-miniature-ia-emotion');
    if (em) em.value = 'Choc / Surprise';
  });
  await sleep(500);
  await shot('03-form', 2500);

  // 4. Loading
  await page.evaluate(() => app.afficherChargement('miniature-ia', true));
  await sleep(400);
  await shot('04-loading', 1500);

  // 5. Résultat image
  await page.evaluate((dataUrl) => {
    app.afficherChargement('miniature-ia', false);
    app.afficherImage('miniature-ia', dataUrl);
  }, thumbDataUrl);
  await sleep(700);
  await shot('05-result', 4000);

  await browser.close();
  server.kill();
  return frames;
}

/* ── PHASE 2 : Encoder GIF avec gif-encoder-2 ── */
async function encodeGIF(frames) {
  console.log('\nEncodage GIF...');
  const GIFEncoder = require('gif-encoder-2');

  // useOptimizer=false : frames complètes, pas de delta
  const encoder = new GIFEncoder(W, H, 'neuquant', false);
  const stream = fs.createWriteStream(OUTPUT);
  encoder.createReadStream().pipe(stream);
  encoder.start();
  encoder.setQuality(5);
  encoder.setRepeat(0);

  for (const { file, delay } of frames) {
    const { data } = await sharp(file)
      .resize(W, H, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    encoder.setDelay(delay);
    encoder.addFrame(data);
    console.log(`  ✓ ${path.basename(file)} (${delay}ms)`);
  }

  encoder.finish();
  await new Promise(resolve => stream.on('finish', resolve));
}

async function main() {
  const frames = await takeScreenshots();
  await encodeGIF(frames);

  // Nettoyage
  frames.forEach(f => { try { fs.unlinkSync(f.file); } catch {} });
  try { fs.rmdirSync(TMP); } catch {}

  const size = (fs.statSync(OUTPUT).size / 1024).toFixed(0);
  console.log(`\n✅ GIF créé : ${OUTPUT} (${size} KB)`);
}

main().catch(e => { console.error('Erreur:', e.message); process.exit(1); });
