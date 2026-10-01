/* Enregistrement dynamique clips-v2 pour vidéo pub Twitter — v3.
 * Améliorations vs v1/v2 :
 * - Capture via CDP Page.startScreencast (fluide, ~4fps réel au lieu de ~0.6-0.7fps avec page.screenshot() en boucle)
 * - Faux curseur DOM injecté (glisse via transition CSS avant chaque clic — Puppeteer ne montre aucun curseur réel)
 * - Vrai tour dynamique du produit : score → lecture + sous-titres → onglet Hook → frappe du texte → styles
 * - events.json log précis (timestamp réel + bounding rect DOM) de chaque moment clé, pour piloter les zooms
 *   en montage à partir de vraies coordonnées plutôt que d'une inspection manuelle de frames.
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCRATCH = path.join(__dirname, '..', '.scratch-demo');
const FRAMES_DIR = path.join(SCRATCH, 'frames-v3');
const EVENTS_PATH = path.join(SCRATCH, 'events.json');
const VIDEO_INPUT = process.argv[2] || path.join(__dirname, '..', '.scratch-demo', 'source-video-new2.mp4');
const VIEWPORT = { width: 1280, height: 800 };
const HOOK_TEXT = process.argv[3] || 'Le clip qui va exploser 🔥';

function log(msg) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`); }

async function injectCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('__fake_cursor')) return;
    const c = document.createElement('div');
    c.id = '__fake_cursor';
    c.style.cssText = 'position:fixed;left:-40px;top:-40px;width:26px;height:26px;z-index:2147483647;pointer-events:none;transition:left .45s cubic-bezier(.4,0,.2,1),top .45s cubic-bezier(.4,0,.2,1);filter:drop-shadow(0 1px 3px rgba(0,0,0,.6))';
    c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2 L4 20 L9 15.5 L12.5 22 L15 20.7 L11.5 14 L18 14 Z" fill="white" stroke="black" stroke-width="1.2"/></svg>';
    document.body.appendChild(c);
  });
}

// Déplace le faux curseur vers le centre de l'élément puis clique dessus.
// Fallback en clic JS natif si le clic Puppeteer échoue (cas des checkbox custom
// cachées visuellement derrière un <span> stylé — courant pour les toggles).
async function cursorClick(page, selector, opts = {}) {
  const el = await page.waitForSelector(selector, { timeout: opts.timeout || 8000 });
  const box = await el.boundingBox();
  if (!box) throw new Error('boundingBox introuvable pour ' + selector);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.evaluate((x, y) => {
    const c = document.getElementById('__fake_cursor');
    if (c) { c.style.left = (x - 2) + 'px'; c.style.top = (y - 2) + 'px'; }
  }, x, y);
  await new Promise(r => setTimeout(r, 550));
  try {
    await el.click();
  } catch (e) {
    await page.evaluate(sel => {
      const target = document.querySelector(sel);
      (target.closest('label') || target).click();
    }, selector);
  }
  return box;
}

async function rectOf(page, selector) {
  return page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, selector);
}

async function main() {
  if (fs.existsSync(FRAMES_DIR)) fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  log('Connexion au Chrome existant (port 9222)...');
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('creatis.app')) || pages[0];
  await page.bringToFront();
  await page.setViewport(VIEWPORT);

  log('Navigation vers clips-v2.html...');
  await page.goto('https://creatis.app/clips-v2.html', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1200));
  await injectCursor(page);

  const cdp = await page.target().createCDPSession();
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await cdp.send('Page.enable');

  // ── Capture screencast ──
  let frameCount = 0;
  let captureStart = null;
  const frameLog = [];
  cdp.on('Page.screencastFrame', (frame) => {
    if (captureStart === null) captureStart = Date.now();
    const tRel = (Date.now() - captureStart) / 1000;
    const filename = path.join(FRAMES_DIR, `frame_${String(frameCount).padStart(6, '0')}.jpg`);
    fs.writeFileSync(filename, Buffer.from(frame.data, 'base64'));
    frameLog.push({ file: path.basename(filename), t: tRel });
    frameCount++;
    cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: VIEWPORT.width, maxHeight: VIEWPORT.height, everyNthFrame: 1 });
  await new Promise(r => setTimeout(r, 300));
  log('Screencast démarré.');

  const events = [];
  function markEvent(name, rect) {
    const t = captureStart ? (Date.now() - captureStart) / 1000 : 0;
    events.push({ name, t, rect: rect || null });
    log(`EVENT ${name} @ ${t.toFixed(2)}s ${rect ? JSON.stringify(rect) : ''}`);
  }

  try {
    markEvent('start', null);

    // ── Upload ──
    log('Upload du fichier...');
    const fileInput = await page.waitForSelector('#file-input', { timeout: 10000 });
    await fileInput.uploadFile(VIDEO_INPUT);
    await new Promise(r => setTimeout(r, 2200));
    markEvent('upload-done', await rectOf(page, '#drop-zone'));

    await page.waitForFunction(() => { const b = document.getElementById('btn-analyze'); return b && !b.disabled; }, { timeout: 15000 });
    await cursorClick(page, '#btn-analyze');
    markEvent('analyze-clicked', null);

    // ── Attente analyse réelle ──
    log('Attente de la génération réelle (jusqu\'à 10 min)...');
    await page.waitForFunction(() => {
      const s = document.getElementById('state-studio');
      const g = document.getElementById('clips-grid');
      return s && s.classList.contains('active') && g && g.children.length > 0;
    }, { timeout: 900000, polling: 1000 });
    markEvent('results-shown', await rectOf(page, '#clips-grid'));

    log('Attente génération des 10 vignettes...');
    await new Promise(r => setTimeout(r, 14000));
    markEvent('thumbnails-ready', await rectOf(page, '#clips-grid'));

    // ── Beat scoring : zoom sur les scores de plusieurs cartes de la grille ──
    // (beaucoup plus visuel que le petit badge de la modal — gros chiffres colorés
    // par palier vert/orange/rouge, directement dans clip-score-num).
    const scoringRect = await page.evaluate(() => {
      const nums = Array.from(document.querySelectorAll('.clip-score-num')).slice(0, 3);
      if (!nums.length) return null;
      const rects = nums.map(n => n.getBoundingClientRect());
      const x = Math.min(...rects.map(r => r.x));
      const y = Math.min(...rects.map(r => r.y));
      const right = Math.max(...rects.map(r => r.x + r.width));
      const bottom = Math.max(...rects.map(r => r.y + r.height));
      return { x, y, w: right - x, h: bottom - y };
    });
    markEvent('scoring-showcase', scoringRect);
    await new Promise(r => setTimeout(r, 1600));

    await page.evaluate(() => window.scrollBy(0, 150));
    await new Promise(r => setTimeout(r, 800));

    // ── Ouvrir le premier clip ──
    await cursorClick(page, '.clip-card');
    await new Promise(r => setTimeout(r, 1000));
    markEvent('modal-open', await rectOf(page, '.clip-modal'));

    // ── Beat 1 : zoom score (badge du header — .modal-score-row est display:none par défaut) ──
    await new Promise(r => setTimeout(r, 500));
    markEvent('zoom-score', await rectOf(page, '#modal-score-badge'));
    await new Promise(r => setTimeout(r, 1300));

    // ── Beat 2 : lecture + sous-titres ──
    await cursorClick(page, '#modal-player-wrap');
    markEvent('play-clicked', null);
    await new Promise(r => setTimeout(r, 900));
    markEvent('zoom-subtitles', await rectOf(page, '#modal-sub-overlay'));
    await new Promise(r => setTimeout(r, 3000));

    // ── Beat 3 : onglet Hook ──
    // Pause d'abord : le re-rendu live des sous-titres pendant la lecture écrasait
    // le changement d'onglet (le panneau Sous-titres restait affiché malgré le clic).
    await cursorClick(page, '#modal-player-wrap');
    markEvent('paused-for-hook', null);
    await new Promise(r => setTimeout(r, 400));

    const HOOK_TAB_SEL = '.desk-sec-tab[onclick*="\'hook\'"]';
    let hookTabActive = false;
    for (let attempt = 0; attempt < 3 && !hookTabActive; attempt++) {
      await cursorClick(page, HOOK_TAB_SEL);
      try {
        await page.waitForFunction(() => {
          const el = document.getElementById('mob-sec-hook');
          return el && el.classList.contains('mob-open');
        }, { timeout: 2000 });
        hookTabActive = true;
      } catch (e) { log(`Onglet Hook pas encore actif, nouvel essai (${attempt + 1}/3)...`); }
    }
    if (!hookTabActive) throw new Error('Impossible d\'activer l\'onglet Hook après 3 essais');
    markEvent('hook-tab', null);
    await new Promise(r => setTimeout(r, 400));

    await cursorClick(page, '#modal-hook-on');
    await page.waitForFunction(() => {
      const el = document.getElementById('modal-hook-txt');
      return el && el.offsetWidth > 0;
    }, { timeout: 3000 });
    markEvent('hook-toggled-on', await rectOf(page, '#modal-hook-txt'));
    await new Promise(r => setTimeout(r, 400));

    // ── Beat 4 : frappe du texte du hook (effet dynamique demandé) ──
    // Zoom sur le champ texte (#modal-hook-txt), pas sur l'overlay vidéo #modal-hook-overlay :
    // ce dernier ne s'affiche que si la lecture est dans les 3 premières secondes du clip,
    // ce qui n'est pas garanti ici (vidéo mise en pause plus loin dans le clip).
    await cursorClick(page, '#modal-hook-txt');
    markEvent('hook-typing-start', await rectOf(page, '#modal-hook-txt'));
    for (const ch of HOOK_TEXT) {
      await page.type('#modal-hook-txt', ch, { delay: 50 });
    }
    markEvent('hook-typing-done', await rectOf(page, '#modal-hook-txt'));
    await new Promise(r => setTimeout(r, 800));

    // ── Beat 5 : styles du hook ──
    for (const style of ['clean', 'outline', 'pill']) {
      await cursorClick(page, `.hook-st-btn[data-hs="${style}"]`);
      markEvent('hook-style-' + style, await rectOf(page, '#hook-style-btns'));
      await new Promise(r => setTimeout(r, 650));
    }

    // ── Beat 6 : rendu réel du hook sur la vidéo ──
    // #modal-hook-overlay ne s'affiche que dans les 3 premières secondes du clip
    // (cf. _subLoop: inWindow = rel>=0 && rel<3) — on rembobine pour le montrer,
    // sinon on ne voit jamais le hook stylé rendu par-dessus la vidéo, juste le
    // champ de saisie dans le panneau (retour utilisateur : "on ne voit pas le rendu").
    await page.evaluate(() => {
      const v = document.getElementById('modal-video');
      if (v) v.currentTime = 1.0;
    });
    await new Promise(r => setTimeout(r, 500));
    markEvent('hook-rendered', await rectOf(page, '#modal-hook-overlay'));
    await new Promise(r => setTimeout(r, 1500));

    markEvent('end', await rectOf(page, '.clip-modal'));
  } catch (e) {
    log('ERREUR pendant le scénario : ' + e.message);
    markEvent('error', null);
  }

  await cdp.send('Page.stopScreencast');
  await new Promise(r => setTimeout(r, 300));
  await browser.disconnect();
  log('Déconnecté de Chrome (la fenêtre reste ouverte).');

  fs.writeFileSync(EVENTS_PATH, JSON.stringify({ viewport: VIEWPORT, frames: frameLog, events }, null, 2));
  log(`Capture terminée : ${frameCount} frames, ${events.length} events -> ${EVENTS_PATH}`);

  // ── Assemblage vidéo brute : rééchantillonnage CFR fait en JS, pas par ffmpeg ──
  // Le concat demuxer d'ffmpeg avec des milliers de durées variables ~20ms (un fichier par
  // frame réel, capture ~90fps par rafales) produit des glissements de PTS : des plages
  // entières se retrouvent figées sur un ancien frame malgré un concat-list correct
  // (vérifié frame par frame — le bug n'est ni dans la capture ni dans la liste, mais dans
  // la façon dont le concat demuxer résout des durées aussi fines et nombreuses).
  // Fix : on choisit nous-mêmes, pour chaque frame de sortie à 30fps pile, le dernier frame
  // réel capturé à ce timestamp — une seule durée uniforme (1/30s) dans le concat, ce qui est
  // le cas d'usage standard et fiable du concat demuxer.
  const ffmpegPath = require('ffmpeg-static');
  const { execFileSync } = require('child_process');

  const OUT_FPS = 30;
  const totalDuration = frameLog.length ? frameLog[frameLog.length - 1].t : 0;
  const outFrameCount = Math.max(1, Math.ceil(totalDuration * OUT_FPS));
  const concatListPath = path.join(SCRATCH, 'concat-v3.txt');
  const lines = [];
  let srcIdx = 0;
  for (let i = 0; i < outFrameCount; i++) {
    const tOut = i / OUT_FPS;
    while (srcIdx < frameLog.length - 1 && frameLog[srcIdx + 1].t <= tOut) srcIdx++;
    lines.push(`file '${path.join(FRAMES_DIR, frameLog[srcIdx].file).replace(/\\/g, '/')}'`);
    lines.push(`duration ${(1 / OUT_FPS).toFixed(6)}`);
  }
  if (frameLog.length) lines.push(`file '${path.join(FRAMES_DIR, frameLog[frameLog.length - 1].file).replace(/\\/g, '/')}'`);
  fs.writeFileSync(concatListPath, lines.join('\n'));

  const outputPath = path.join(SCRATCH, 'demo-raw-v3.mp4');
  log(`Assemblage CFR ${OUT_FPS}fps (${outFrameCount} frames de sortie, durée uniforme) avec ffmpeg...`);
  execFileSync(ffmpegPath, [
    '-y', '-f', 'concat', '-safe', '0', '-i', concatListPath,
    '-r', String(OUT_FPS), '-vsync', 'cfr', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18',
    outputPath
  ], { stdio: 'inherit' });

  log(`Vidéo brute prête : ${outputPath}`);
}

main().catch(e => { console.error('ÉCHEC:', e); process.exit(1); });
