/* Identifie le dernier deploiement Vercel ANTERIEUR au renommage des vignettes.
 *
 * Marqueur : la version modifiee contient ">PUNCH<" (nom dans la vignette).
 * La version d'origine contient 'class="mt">Wow' sans ">PUNCH<".
 *
 * Les URLs de deploiement peuvent etre protegees ; on utilise un navigateur reel
 * plutot que curl pour recuperer le HTML tel qu'il serait servi.
 */
const { chromium } = require('playwright');

const URLS = process.argv.slice(2);

(async () => {
  const nav = await chromium.launch({ headless: true });
  for (const u of URLS) {
    const page = await nav.newPage();
    let verdict = '?';
    try {
      const r = await page.goto(u + '/clips-v2.html', { waitUntil: 'domcontentloaded', timeout: 45000 });
      const html = await page.content();
      if (r && r.status() >= 400) verdict = 'HTTP ' + r.status();
      else if (html.includes('Authentication Required') || html.includes('vercel.com/sso')) verdict = 'protege (auth)';
      else if (html.includes('>PUNCH<')) verdict = 'APRES le renommage';
      else if (html.includes('class="mt">Wow')) verdict = '>>> AVANT le renommage <<<';
      else verdict = 'contenu inattendu';
    } catch (e) {
      verdict = 'erreur : ' + String(e.message).slice(0, 50);
    }
    console.log(`${verdict.padEnd(28)} ${u.replace('https://', '').slice(0, 30)}`);
    await page.close();
  }
  await nav.close();
})();
