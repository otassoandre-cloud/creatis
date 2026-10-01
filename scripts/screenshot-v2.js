const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto('http://localhost:3000/clips-v2.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1000);

  // Screenshot 1: Upload state (full page)
  await page.screenshot({ path: 'images/clips/v2-1-upload.png', fullPage: true });
  console.log('✅ Screenshot 1: upload state');

  // Simulate file selected to enable button
  await page.evaluate(() => {
    // Mock a file so analyze button enables
    document.getElementById('btn-analyze').disabled = false;
    document.getElementById('drop-filename').style.display = 'block';
    document.getElementById('drop-filename').textContent = 'podcast-ep42.mp4 · 847 Mo';
    document.getElementById('drop-zone').classList.add('has-file');
  });
  await page.screenshot({ path: 'images/clips/v2-2-file-ready.png', fullPage: true });
  console.log('✅ Screenshot 2: file selected');

  // Force studio state with fake clips
  await page.evaluate(() => {
    // Inject clips directly into the closure — need to set module state
    // We'll call setState and renderClipsGrid via monkey-patching
    const clips = [
      { start_time: 12, end_time: 67, title: "Cette technique m'a changé la vie", hook: "J'ai découvert une méthode qui m'a permis de gagner 3h par semaine et d'exploser mes stats.", score: 94, video_id: 'demo' },
      { start_time: 125, end_time: 182, title: "L'erreur que tout le monde fait", hook: "95% des créateurs font cette erreur sans le savoir, et ça leur coûte des milliers d'abonnés.", score: 88, video_id: 'demo' },
      { start_time: 234, end_time: 298, title: "Le secret des créateurs qui explosent", hook: "Voilà la vraie différence entre ceux qui réussissent et les autres.", score: 85, video_id: 'demo' },
      { start_time: 310, end_time: 368, title: "Pourquoi tes vidéos ne marchent pas", hook: "Je vais être honnête avec toi — voilà ce qui cloche vraiment dans ta stratégie contenu.", score: 79, video_id: 'demo' },
      { start_time: 420, end_time: 478, title: "La stratégie que j'aurais voulu connaître", hook: "Si je débutais aujourd'hui, voilà exactement ce que je ferais en premier.", score: 76, video_id: 'demo' },
      { start_time: 502, end_time: 560, title: "Mon avis honnête après 2 ans", hook: "Après 2 ans sur YouTube, voilà les vraies leçons que personne ne te dit.", score: 71, video_id: 'demo' },
      { start_time: 620, end_time: 675, title: "Comment doubler son temps d'écran", hook: "Cette astuce simple m'a permis de doubler le watch time sur toutes mes vidéos.", score: 68, video_id: 'demo' },
    ];
    
    // Expose via global for studio render
    window.__clips = clips;
    window.__segs = [
      {start:0, end:3, text:"Bonjour tout le monde"},
      {start:3, end:5, text:"et bienvenue sur cette vidéo"},
      {start:5, end:8, text:"où je vais vous révéler"}
    ];
    
    // Directly manipulate DOM to show studio
    document.querySelectorAll('.state').forEach(el => el.classList.remove('active'));
    document.getElementById('state-studio').classList.add('active');
    document.getElementById('studio-title').textContent = '7 clips viraux trouvés';
    document.getElementById('studio-meta').textContent = '"Mes secrets pour exploser sur YouTube en 2025"';

    // Render clips grid manually
    const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
    const scoreColor = s => s >= 90 ? '#10b981' : s >= 75 ? '#f0a500' : '#6b7280';
    const grid = document.getElementById('clips-grid');
    grid.innerHTML = clips.map((clip, i) => {
      const sc = scoreColor(clip.score);
      const dur = Math.round(clip.end_time - clip.start_time);
      const sel = i < 5;
      return `
      <div class="clip-card ${sel ? 'selected' : ''}" id="clip-card-${i}">
        <div class="clip-check" id="clip-chk-${i}">
          ${sel ? '<svg class="clip-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </div>
        <div class="clip-score-badge" style="color:${sc}">${clip.score}</div>
        <div class="clip-thumb-placeholder" id="clip-thumb-${i}">🎬</div>
        <div class="clip-info">
          <div class="clip-num">Clip ${i + 1}</div>
          <div class="clip-hook">${clip.hook.substring(0,80)}</div>
          <div class="clip-dur">${fmt(clip.start_time)} → ${fmt(clip.end_time)} · ${dur}s</div>
        </div>
      </div>`;
    }).join('');

    // Update counter
    document.getElementById('sel-count').textContent = '5 sélectionnés';
    document.getElementById('btn-export').disabled = false;
    document.getElementById('btn-export-txt').textContent = 'Exporter 5 clips (9:16 + sous-titres)';
    document.getElementById('clips-time-total').textContent = '~285s de contenu';
    window.scrollTo(0, 0);
  });

  await page.waitForTimeout(500);
  await page.screenshot({ path: 'images/clips/v2-3-studio-top.png', fullPage: false });
  console.log('✅ Screenshot 3: studio top (style picker)');

  // Scroll down to see clip grid
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'images/clips/v2-4-studio-clips.png', fullPage: false });
  console.log('✅ Screenshot 4: studio clips grid');

  // Full studio page
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'images/clips/v2-5-studio-full.png', fullPage: true });
  console.log('✅ Screenshot 5: studio full page');

  // Click Néon style
  await page.click('[data-style="neon"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'images/clips/v2-6-style-neon.png', fullPage: false });
  console.log('✅ Screenshot 6: neon style selected');

  // Toggle hook
  await page.click('#opt-hook');
  await page.waitForTimeout(200);
  await page.fill('#opt-hook-text', "Cette astuce m'a sauvé 3h par semaine 🔥");
  await page.screenshot({ path: 'images/clips/v2-7-hook-enabled.png', fullPage: false });
  console.log('✅ Screenshot 7: hook text enabled');

  // Toggle watermark
  await page.click('#opt-wm');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'images/clips/v2-8-watermark.png', fullPage: false });
  console.log('✅ Screenshot 8: watermark enabled');

  await browser.close();
  console.log('Done — all screenshots saved to images/clips/');
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
