/* Mesure le facteur d'echelle de l'apercu et le compare au canvas d'export.
 *
 * L'export ASS travaille sur un canvas de 720x1280 : une police de taille N y occupe
 * N/720 de la largeur. L'apercu doit reproduire ce ratio via
 *     sc = modal-player-wrap.offsetWidth / 720
 * Si le conteneur mesure est plus large que la video reellement affichee (bandes noires,
 * marges), le ratio est fausse et le texte parait plus petit ou plus grand qu'a l'export.
 *
 * Ne modifie rien : lecture seule.
 */
const { chromium } = require('playwright');

(async () => {
  const nav = await chromium.launch({ headless: true });
  const page = await nav.newPage({ viewport: { width: 1500, height: 950 } });
  await page.goto('https://creatis.app/clips-v2.html?m=' + Date.now(),
                  { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  const r = await page.evaluate(() => {
    const wrap = document.getElementById('modal-player-wrap');
    const vid = document.getElementById('modal-video');
    const ov = document.getElementById('modal-sub-overlay');
    const box = el => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height) };
    };
    return {
      wrap: box(wrap),
      video: box(vid),
      overlay: box(ov),
      wrapStyle: wrap ? getComputedStyle(wrap).width : null,
      overlayCss: ov ? {
        left: getComputedStyle(ov).left,
        right: getComputedStyle(ov).right,
        lineHeight: getComputedStyle(ov).lineHeight,
        fontFamily: getComputedStyle(ov).fontFamily
      } : null
    };
  });

  console.log('modal-player-wrap :', r.wrap, ' (css width:', r.wrapStyle, ')');
  console.log('modal-video       :', r.video);
  console.log('overlay           :', r.overlay);
  console.log('overlay CSS       :', r.overlayCss);

  if (r.wrap && r.video && r.wrap.w && r.video.w) {
    const scWrap = r.wrap.w / 720;
    const scVideo = r.video.w / 720;
    console.log('\nfacteur avec le WRAP  :', scWrap.toFixed(4));
    console.log('facteur avec la VIDEO :', scVideo.toFixed(4));
    const ecart = ((scVideo / scWrap - 1) * 100).toFixed(1);
    console.log('ecart                 :', ecart + ' %');
    for (const t of [55, 70]) {
      console.log(`  taille ${t} -> apercu ${Math.round(t * scWrap)}px | devrait etre ${Math.round(t * scVideo)}px`);
    }
  }
  await nav.close();
})();
