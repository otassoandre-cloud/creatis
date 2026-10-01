/* ===== CRÉATIS — GIF démo Clips Viraux V2 ===== */
/* Usage: node scripts/clips-gif.js               */

const puppeteer  = require('puppeteer');
const GIFEncoder = require('gif-encoder-2');
const sharp      = require('sharp');
const fs         = require('fs');
const path       = require('path');
const { spawn }  = require('child_process');

const W      = 390;
const H      = 820;
const TMP    = path.join(__dirname, '..', 'images', '_clips_tmp');
const OUTPUT = path.join(__dirname, '..', 'images', 'clips', 'demo-clips-v2.gif');
const sleep  = ms => new Promise(r => setTimeout(r, ms));

const CLIPS = [
  { start_time: 4,  end_time: 62,  title: "Ce moment change tout",    hook: "Tu vas pas y croire...",   score: 94 },
  { start_time: 68, end_time: 124, title: "La technique secrète",      hook: "Personne te dit ça",       score: 88 },
  { start_time: 130,end_time: 185, title: "Résultats en 30 jours",     hook: "Voici ce que j'ai fait",   score: 82 },
  { start_time: 200,end_time: 255, title: "L'erreur que tout le monde fait", hook: "Arrête de faire ça", score: 79 },
];

async function main() {
  [TMP, path.dirname(OUTPUT)].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

  console.log('Démarrage serveur...');
  const server = spawn('node', ['serveur.js'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
  await sleep(2500);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });

  // Mock auth avant chargement
  await page.evaluateOnNewDocument(() => {
    window.__MOCK_AUTH__ = true;
  });

  await page.goto('http://localhost:3000/clips-v2.html', { waitUntil: 'networkidle2', timeout: 15000 });

  // Injecter Auth mocké + désactiver la redirection
  await page.evaluate(() => {
    window.Auth = {
      getToken:          () => 'mock-token-demo',
      getSession:        async () => ({ data: { session: { user: { id: 'demo', email: 'demo@creatis.app' } } } }),
      onAuthStateChange: (cb) => { setTimeout(() => cb('SIGNED_IN', { user: { id: 'demo' } }), 50); return { data: { subscription: { unsubscribe: () => {} } } }; }
    };
  });
  await sleep(600);

  const frames = [];
  const shot = async (name, delay) => {
    const file = path.join(TMP, `${name}.png`);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: W, height: H } });
    frames.push({ file, delay });
    console.log(`  📸 ${name} (${delay}ms)`);
  };

  // ── Frame 1 : Upload state ──
  await shot('01-upload', 2200);

  // ── Frame 2 : Analyse en cours ──
  await page.evaluate(() => {
    document.querySelectorAll('.state').forEach(s => s.classList.remove('active'));
    document.getElementById('state-analyze')?.classList.add('active');
    const bar = document.getElementById('analyze-bar');
    if (bar) bar.style.width = '52%';
    const msg = document.getElementById('analyze-msg');
    if (msg) msg.textContent = 'Transcription Whisper…';
    for (let k = 1; k <= 5; k++) {
      const el = document.getElementById(`as-${k}`);
      if (el) {
        el.classList.remove('done', 'active');
        if (k < 3) el.classList.add('done');
        if (k === 3) el.classList.add('active');
      }
    }
  });
  await shot('02-analyze-52', 600);

  await page.evaluate(() => {
    const bar = document.getElementById('analyze-bar');
    if (bar) bar.style.width = '78%';
    const msg = document.getElementById('analyze-msg');
    if (msg) msg.textContent = 'Identification des meilleurs moments…';
    for (let k = 1; k <= 5; k++) {
      const el = document.getElementById(`as-${k}`);
      if (el) {
        el.classList.remove('done', 'active');
        if (k < 4) el.classList.add('done');
        if (k === 4) el.classList.add('active');
      }
    }
  });
  await shot('03-analyze-78', 600);

  await page.evaluate(() => {
    const bar = document.getElementById('analyze-bar');
    if (bar) bar.style.width = '100%';
    const msg = document.getElementById('analyze-msg');
    if (msg) msg.textContent = '4 clips viraux trouvés !';
  });
  await shot('04-analyze-done', 800);

  // ── Frame 3 : Studio avec clips ──
  await page.evaluate((clips) => {
    document.querySelectorAll('.state').forEach(s => s.classList.remove('active'));
    document.getElementById('state-studio')?.classList.add('active');

    const t = document.getElementById('studio-title');
    if (t) t.textContent = '4 clips viraux trouvés';
    const m = document.getElementById('studio-meta');
    if (m) m.textContent = '"Ma vidéo YouTube"';

    const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
    const colors = ['#10b981','#10b981','#f59e0b','#f59e0b'];
    const grid = document.getElementById('clips-grid');
    if (grid) {
      grid.innerHTML = clips.map((clip, i) => {
        const dur = Math.round(clip.end_time - clip.start_time);
        const caption = clip.hook.split(' ').slice(0, 4).join(' ').toUpperCase();
        const sel = i < 3 ? ' selected' : '';
        return `
        <div class="clip-card${sel}" id="clip-card-${i}">
          <div class="clip-thumb-wrap" style="position:relative">
            <div class="clip-thumb-empty">🎬</div>
            <div class="clip-dur-badge">${fmt(clip.start_time)}&nbsp;·&nbsp;${dur}s</div>
            <div class="clip-check">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div class="clip-thumb-caption">${caption}</div>
          </div>
          <div class="clip-bottom">
            <div class="clip-score-row">
              <span class="clip-score-num" style="color:${colors[i]}">${clip.score}</span>
            </div>
            <div class="clip-title" style="font-size:11px;font-weight:700;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${clip.title}</div>
            <div style="font-size:10px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${clip.hook}</div>
          </div>
        </div>`;
      }).join('');
    }

    // Bouton export actif
    const btn = document.getElementById('btn-export');
    if (btn) { btn.disabled = false; btn.querySelector('#btn-export-txt').textContent = 'Exporter 3 clips sélectionnés'; }
  }, CLIPS);
  await sleep(400);
  await shot('05-studio', 2800);

  // ── Frame 4 : Style picker visible + sous-titres ──
  await page.evaluate(() => {
    // Scroll vers le bas pour voir le style picker
    const picker = document.querySelector('.style-picker');
    if (picker) picker.scrollIntoView({ behavior: 'instant' });

    // Sélectionner bold
    document.querySelectorAll('.style-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.style === 'bold');
    });
  });
  await sleep(300);
  await shot('06-style-picker', 2000);

  // ── Frame 5 : Export en cours ──
  await page.evaluate((clips) => {
    document.querySelectorAll('.state').forEach(s => s.classList.remove('active'));
    const stExport = document.getElementById('state-export');
    if (stExport) stExport.classList.add('active');

    const list = document.getElementById('export-list');
    const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
    if (list) {
      list.innerHTML = clips.slice(0, 3).map((clip, i) => {
        const status = i === 0 ? 'done' : i === 1 ? 'processing' : 'waiting';
        const pct    = i === 0 ? '100%' : i === 1 ? '62%' : '0%';
        const txt    = i === 0 ? '✅ Terminé' : i === 1 ? '62% — Sous-titres…' : 'En attente';
        return `
        <div class="export-item" id="ei-${i}">
          <div class="export-item-status ${status}" id="ei-st-${i}"></div>
          <div class="export-item-info">
            <div class="export-item-name">${clip.title.substring(0,40)}</div>
            <div class="export-item-sub">${fmt(clip.start_time)} → ${fmt(clip.end_time)}</div>
            <div class="export-prog-bar"><div class="export-prog-fill" style="width:${pct}"></div></div>
          </div>
          <div class="export-item-pct">${txt}</div>
        </div>`;
      }).join('');
    }

    const totalBar = document.getElementById('export-total-bar');
    if (totalBar) totalBar.style.width = '40%';
  }, CLIPS);
  await sleep(400);
  await shot('07-export', 2200);

  // Clip 2 avancé
  await page.evaluate(() => {
    const fill = document.querySelector('#ei-bar-1');
    if (fill) fill.style.width = '88%';
    const pct = document.querySelector('#ei-pct-1');
    if (pct) pct.textContent = '88% — Reframe 9:16…';
    const tb = document.getElementById('export-total-bar');
    if (tb) tb.style.width = '68%';
  });
  await shot('08-export-progress', 1000);

  // ── Frame 6 : Résultats ──
  await page.evaluate((clips) => {
    document.querySelectorAll('.state').forEach(s => s.classList.remove('active'));
    const stRes = document.getElementById('state-results');
    if (stRes) stRes.classList.add('active');

    const res = document.getElementById('results-list');
    if (res) {
      res.innerHTML = clips.slice(0, 3).map((clip, i) => `
        <div class="result-item">
          <div class="result-thumb">🎬</div>
          <div class="result-info">
            <div class="result-title">${clip.title}</div>
            <div class="result-hook" style="font-size:11px;color:#6b7280">${clip.hook}</div>
          </div>
          <button class="result-dl-btn" style="background:#fff;color:#000;border:none;padding:8px 14px;border-radius:8px;font-weight:700;cursor:pointer;font-size:12px">
            ⬇ MP4
          </button>
        </div>`
      ).join('');
    }
  }, CLIPS);
  await sleep(300);
  await shot('09-results', 3000);

  await browser.close();
  server.kill();

  // ── Encoder GIF ──
  console.log('\nEncodage GIF...');
  const encoder = new GIFEncoder(W, H, 'neuquant', false);
  const stream  = fs.createWriteStream(OUTPUT);
  encoder.createReadStream().pipe(stream);
  encoder.start();
  encoder.setQuality(8);
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
  await new Promise(r => stream.on('finish', r));

  // Nettoyage
  frames.forEach(f => { try { fs.unlinkSync(f.file); } catch {} });
  try { fs.rmdirSync(TMP); } catch {}

  const kb = (fs.statSync(OUTPUT).size / 1024).toFixed(0);
  console.log(`\n✅ GIF créé : ${OUTPUT} (${kb} KB)`);
}

main().catch(e => { console.error('Erreur:', e.message); process.exit(1); });
