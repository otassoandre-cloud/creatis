const puppeteer = require('puppeteer');
const GIFEncoder = require('gif-encoder-2');
const { Jimp } = require('jimp');
const fs = require('fs');

const WIDTH = 800;
const HEIGHT = 450;
const FPS = 6;
const DURATION_SEC = 6;
const TOTAL_FRAMES = FPS * DURATION_SEC;

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0f0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; overflow: hidden; width: 800px; height: 450px; }
  .browser { width: 760px; height: 420px; background: #111; border-radius: 10px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.6); margin: 15px auto; }
  .bar { height: 36px; background: #1a1f1a; display: flex; align-items: center; padding: 0 12px; gap: 6px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; }
  .dot-r { background: #ff5f57; } .dot-y { background: #ffbd2e; } .dot-g { background: #28ca41; }
  .url { flex: 1; background: #0d120d; border-radius: 4px; height: 20px; margin-left: 10px; display: flex; align-items: center; padding: 0 10px; }
  .url span { color: #6b7280; font-size: 11px; } .url em { color: #10b981; font-style: normal; }
  .app { display: flex; height: 384px; }
  .side { width: 170px; background: #0d120d; border-right: 1px solid #1a2a1a; padding: 10px 0; }
  .logo { padding: 8px 12px 14px; font-size: 16px; font-weight: 700; color: #10b981; }
  .nav { padding: 8px 12px; font-size: 11px; color: #6b7280; display: flex; align-items: center; gap: 6px; }
  .nav.on { color: #10b981; background: rgba(16,185,129,0.08); border-left: 2px solid #10b981; }
  .ndot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
  .main { flex: 1; display: flex; }
  .form { width: 270px; background: #0d120d; border-right: 1px solid #1a2a1a; padding: 14px; }
  .ptitle { font-size: 13px; font-weight: 600; color: #e5e7eb; margin-bottom: 14px; }
  .lbl { font-size: 10px; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .inp { background: #111; border: 1px solid #1a2a1a; border-radius: 5px; padding: 7px 9px; font-size: 11px; color: #9ca3af; width: 100%; margin-bottom: 10px; }
  .inp.active { color: #e5e7eb; border-color: #10b981; }
  .btn { width: 100%; padding: 9px; background: #10b981; border: none; border-radius: 6px; color: #000; font-size: 12px; font-weight: 600; margin-top: 4px; }
  .btn.loading { background: #059669; }
  .btn.done { background: #059669; }
  .prog { height: 3px; background: #1a2a1a; border-radius: 2px; margin-top: 8px; overflow: hidden; display: none; }
  .prog-fill { height: 100%; background: #10b981; width: 0%; transition: width 0.4s ease; }
  .res { flex: 1; padding: 14px; }
  .empty { color: #374151; font-size: 11px; text-align: center; padding-top: 60px; line-height: 1.6; }
  .content { display: none; flex-direction: column; gap: 8px; }
  .rtitle { font-size: 13px; font-weight: 600; color: #10b981; opacity: 0; transition: opacity 0.3s; }
  .rtitle.s { opacity: 1; }
  .rline { height: 9px; background: #1a2a1a; border-radius: 3px; opacity: 0; transition: opacity 0.3s; }
  .rline.s { opacity: 1; }
  .tag { display: inline-block; background: rgba(16,185,129,0.1); color: #10b981; font-size: 10px; padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(16,185,129,0.2); opacity: 0; transition: opacity 0.3s; margin-top: 4px; }
  .tag.s { opacity: 1; }
</style>
</head>
<body>
<div class="browser">
  <div class="bar">
    <div class="dot dot-r"></div><div class="dot dot-y"></div><div class="dot dot-g"></div>
    <div class="url"><span><em>creatis</em>.app</span></div>
  </div>
  <div class="app">
    <div class="side">
      <div class="logo">Créatis</div>
      <div class="nav on"><div class="ndot"></div>Script YouTube</div>
      <div class="nav"><div class="ndot"></div>Short 60s</div>
      <div class="nav"><div class="ndot"></div>Miniature Pro</div>
      <div class="nav"><div class="ndot"></div>Idées vidéos</div>
      <div class="nav"><div class="ndot"></div>Prospection</div>
    </div>
    <div class="main">
      <div class="form">
        <div class="ptitle">✨ Script YouTube</div>
        <div class="lbl">Sujet de la vidéo</div>
        <div class="inp active" id="sujet">Comment dessiner les yeux</div>
        <div class="lbl">Niche / chaîne</div>
        <div class="inp active">Dessin manga / tutoriel</div>
        <div class="lbl">Durée cible</div>
        <div class="inp active">10 minutes</div>
        <button class="btn" id="btn">✨ Générer avec l'IA</button>
        <div class="prog" id="prog"><div class="prog-fill" id="pfill"></div></div>
      </div>
      <div class="res">
        <div class="empty" id="empty">Remplis le formulaire<br>et génère ton contenu IA</div>
        <div class="content" id="content">
          <div class="rtitle" id="rt">🎬 Script généré — 847 mots</div>
          <div class="rline s" style="width:100%"></div>
          <div class="rline s" style="width:85%"></div>
          <div class="rline s" style="width:92%"></div>
          <div class="rline" id="rl4" style="width:78%"></div>
          <div class="rline" id="rl5" style="width:95%"></div>
          <div class="rline" id="rl6" style="width:70%;margin-top:6px"></div>
          <div class="rline" id="rl7" style="width:88%"></div>
          <div class="tag" id="tag">✅ Prêt à copier</div>
        </div>
      </div>
    </div>
  </div>
</div>
<script>
const tl = [
  { at: 500,  fn: () => { const b=document.getElementById('btn'); b.textContent='⏳ Génération en cours...'; b.className='btn loading'; document.getElementById('prog').style.display='block'; }},
  { at: 900,  fn: () => { document.getElementById('pfill').style.width='35%'; }},
  { at: 1500, fn: () => { document.getElementById('pfill').style.width='70%'; }},
  { at: 2100, fn: () => { document.getElementById('pfill').style.width='95%'; }},
  { at: 2600, fn: () => {
    document.getElementById('pfill').style.width='100%';
    const b=document.getElementById('btn'); b.textContent='✅ Script prêt !'; b.className='btn done';
    document.getElementById('empty').style.display='none';
    document.getElementById('content').style.display='flex';
  }},
  { at: 2900, fn: () => { document.getElementById('rt').classList.add('s'); }},
  { at: 3200, fn: () => { document.getElementById('rl4').classList.add('s'); }},
  { at: 3500, fn: () => { document.getElementById('rl5').classList.add('s'); }},
  { at: 3800, fn: () => { document.getElementById('rl6').classList.add('s'); }},
  { at: 4100, fn: () => { document.getElementById('rl7').classList.add('s'); }},
  { at: 4400, fn: () => { document.getElementById('tag').classList.add('s'); }},
];
tl.forEach(({at, fn}) => setTimeout(fn, at));
</script>
</body>
</html>`;

async function main() {
  console.log('Lancement Puppeteer...');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });
  await page.setContent(HTML, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 300));

  console.log(`Capture ${TOTAL_FRAMES} frames...`);
  const pngs = [];
  const delay = Math.round(1000 / FPS);

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    pngs.push(await page.screenshot({ type: 'png' }));
    process.stdout.write(`\r  ${i+1}/${TOTAL_FRAMES}`);
    await new Promise(r => setTimeout(r, delay));
  }
  await browser.close();
  console.log('\nEncoding GIF...');

  const encoder = new GIFEncoder(WIDTH, HEIGHT, 'neuquant', true);
  encoder.setDelay(delay);
  encoder.setRepeat(0);
  encoder.setQuality(15);
  encoder.start();

  for (let i = 0; i < pngs.length; i++) {
    const img = await Jimp.read(pngs[i]);
    const { data } = img.bitmap;
    // gif-encoder-2 needs Uint8ClampedArray RGBA
    encoder.addFrame(new Uint8ClampedArray(data));
    process.stdout.write(`\r  Encode ${i+1}/${pngs.length}`);
  }

  encoder.finish();
  const buf = encoder.out.getData();
  fs.writeFileSync('creatis-demo.gif', buf);
  console.log(`\n✅ creatis-demo.gif — ${(buf.length/1024/1024).toFixed(1)} MB`);
}

main().catch(console.error);
