const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const outDir = path.join(__dirname, 'carousel-png');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const files = fs.readdirSync(__dirname).filter(f => f.startsWith('carousel-') && f.endsWith('.html'));
  files.sort();

  const browser = await puppeteer.launch({ headless: 'new' });

  for (const file of files) {
    const page = await browser.newPage();
    const filePath = 'file:///' + path.join(__dirname, file).replace(/\\/g, '/');
    await page.goto(filePath, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('.slide');

    const slides = await page.$$('.slide');
    const carouselName = file.replace('.html', '');

    for (let i = 0; i < slides.length; i++) {
      const slideNum = String(i + 1).padStart(2, '0');
      const outFile = path.join(outDir, `${carouselName}_slide${slideNum}.png`);
      await slides[i].screenshot({ path: outFile, type: 'png' });
      console.log(`✅ ${carouselName}_slide${slideNum}.png`);
    }
    await page.close();
  }

  await browser.close();
  console.log(`\n🎉 Terminé ! ${files.length} carrousels exportés dans ${outDir}`);
})();
