const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/clips-v2.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(800);

  // ── Screenshot 1: Upload state ──
  await page.screenshot({ path: 'images/clips/v2-1-upload.png' });
  console.log('1 upload state');

  // ── Inject studio with 7 fake clips ──
  await page.evaluate(() => {
    const clips = [
      { start_time: 12, end_time: 67, title: "Cette technique m a change la vie", hook: "J ai decouvert une methode qui m a permis de gagner 3h par semaine et d exploser mes stats.", score: 94, video_id: 'demo' },
      { start_time: 125, end_time: 182, title: "L erreur que tout le monde fait", hook: "95% des createurs font cette erreur sans le savoir, et ca leur coute des milliers d abonnes.", score: 88, video_id: 'demo' },
      { start_time: 234, end_time: 298, title: "Le secret des createurs qui explosent", hook: "Voila la vraie difference entre ceux qui reussissent et les autres.", score: 85, video_id: 'demo' },
      { start_time: 310, end_time: 368, title: "Pourquoi tes videos ne marchent pas", hook: "Je vais etre honnete avec toi, voila ce qui cloche vraiment dans ta strategie.", score: 79, video_id: 'demo' },
      { start_time: 420, end_time: 478, title: "La strategie que j aurais voulu connaitre", hook: "Si je debutais aujourd hui, voila exactement ce que je ferais en premier.", score: 76, video_id: 'demo' },
      { start_time: 502, end_time: 560, title: "Mon avis honnete apres 2 ans", hook: "Apres 2 ans sur YouTube, voila les vraies lecons que personne ne te dit.", score: 71, video_id: 'demo' },
      { start_time: 620, end_time: 675, title: "Comment doubler son temps d ecran", hook: "Cette astuce simple m a permis de doubler le watch time sur toutes mes videos.", score: 68, video_id: 'demo' },
    ];
    const fmt = function(s) { return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(Math.floor(s%60)).padStart(2,'0'); };
    const scoreColor = function(s) { return s >= 90 ? '#10b981' : s >= 75 ? '#f0a500' : '#6b7280'; };
    document.querySelectorAll('.state').forEach(function(el) { el.classList.remove('active'); });
    document.getElementById('state-studio').classList.add('active');
    document.getElementById('studio-title').textContent = '7 clips viraux trouves';
    document.getElementById('studio-meta').textContent = '"Mes secrets pour exploser sur YouTube en 2025"';
    var grid = document.getElementById('clips-grid');
    grid.innerHTML = clips.map(function(clip, i) {
      var sc = scoreColor(clip.score);
      var dur = Math.round(clip.end_time - clip.start_time);
      var sel = i < 5;
      return '<div class="clip-card ' + (sel ? 'selected' : '') + '">' +
        '<div class="clip-check">' + (sel ? '<svg class="clip-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '</div>' +
        '<div class="clip-score-badge" style="color:' + sc + '">' + clip.score + '</div>' +
        '<div class="clip-thumb-placeholder">🎬</div>' +
        '<div class="clip-info">' +
          '<div class="clip-num">Clip ' + (i+1) + '</div>' +
          '<div class="clip-hook">' + clip.hook + '</div>' +
          '<div class="clip-dur">' + fmt(clip.start_time) + ' → ' + fmt(clip.end_time) + ' · ' + dur + 's</div>' +
        '</div>' +
        '</div>';
    }).join('');
    document.getElementById('sel-count').textContent = '5 selectionnes';
    document.getElementById('btn-export').disabled = false;
    document.getElementById('btn-export-txt').textContent = 'Exporter 5 clips (9:16 + sous-titres)';
    document.getElementById('clips-time-total').textContent = '~285s de contenu';
  });

  await page.waitForTimeout(400);

  // ── Screenshot 2: Studio top (style picker + options) ──
  await page.screenshot({ path: 'images/clips/v2-2-studio-top.png' });
  console.log('2 studio top - style picker');

  // ── Scroll to clips grid ──
  await page.evaluate(() => { document.getElementById('clips-grid').scrollIntoView({ behavior: 'instant' }); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'images/clips/v2-3-clips-grid.png' });
  console.log('3 clips grid');

  // ── Full studio page ──
  await page.evaluate(() => { window.scrollTo(0, 0); });
  await page.screenshot({ path: 'images/clips/v2-4-studio-full.png', fullPage: true });
  console.log('4 full studio page');

  // ── Karaoke style ──
  await page.evaluate(() => {
    document.querySelectorAll('.style-card').forEach(function(c) { c.classList.remove('selected'); });
    document.querySelector('[data-style="karaoke"]').classList.add('selected');
    document.getElementById('opt-color-text').value = '#FFE000';
  });
  await page.screenshot({ path: 'images/clips/v2-5-karaoke.png' });
  console.log('5 karaoke style');

  // ── Hook + watermark enabled ──
  await page.evaluate(() => {
    document.getElementById('opt-hook').checked = true;
    document.getElementById('opt-hook-text').style.display = 'block';
    document.getElementById('opt-hook-style-row').style.display = 'flex';
    document.getElementById('opt-hook-text').value = "Cette astuce m a sauve 3h par semaine";
    document.getElementById('opt-wm').checked = true;
    document.getElementById('wm-zone').style.display = 'block';
    window.scrollTo(0, 350);
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'images/clips/v2-6-hook-wm.png' });
  console.log('6 hook + watermark options');

  // ── Export progress ──
  await page.evaluate(() => {
    document.querySelectorAll('.state').forEach(function(el) { el.classList.remove('active'); });
    document.getElementById('state-export').classList.add('active');
    document.getElementById('export-title').textContent = 'Export en cours... (3/5)';
    var list = document.getElementById('export-list');
    var items = [
      { title: "Cette technique m a change la vie", sub: '00:12 -> 01:07 · Reframe + Sous-titres burnés', status: 'done', pct: 100 },
      { title: "L erreur que tout le monde fait", sub: '02:05 -> 03:02 · Reframe + Sous-titres burnés', status: 'done', pct: 100 },
      { title: "Le secret des createurs", sub: 'Burning sous-titres Karaoke...', status: 'processing', pct: 67 },
      { title: "Pourquoi tes videos ne marchent pas", sub: 'En attente...', status: 'waiting', pct: 0 },
      { title: "La strategie que j aurais voulu...", sub: 'En attente...', status: 'waiting', pct: 0 },
    ];
    list.innerHTML = items.map(function(it) {
      return '<div class="export-item">' +
        '<div class="export-item-status ' + it.status + '">' + (it.status === 'done' ? '✓' : it.status === 'processing' ? '⚡' : '') + '</div>' +
        '<div class="export-item-info">' +
          '<div class="export-item-name">' + it.title + '</div>' +
          '<div class="export-item-sub">' + it.sub + '</div>' +
          '<div class="export-prog-bar"><div class="export-prog-fill" style="width:' + it.pct + '%"></div></div>' +
        '</div>' +
        '<div class="export-item-pct" style="color:var(--vert)">' + (it.pct > 0 ? it.pct + '%' : '') + '</div>' +
      '</div>';
    }).join('');
    document.getElementById('export-total-bar').style.width = '52%';
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'images/clips/v2-7-export-progress.png' });
  console.log('7 export progress');

  await browser.close();
  console.log('Done - all in images/clips/');
})().catch(function(e) { console.error('ERROR:', e.message); process.exit(1); });
