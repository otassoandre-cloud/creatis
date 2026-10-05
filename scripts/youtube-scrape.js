/* ================================================================
 * YOUTUBE SCRAPE — récupère la page About + la liste des vidéos récentes
 * d'une chaîne YouTube via un vrai navigateur (contourne le mur de
 * consentement qui bloque WebFetch).
 * Usage: node scripts/youtube-scrape.js @handle1 @handle2 ...
 * ================================================================ */
const { chromium } = require('playwright');

async function scrapeChannel(page, handle) {
  const result = { handle, aboutText: null, description: null, links: [], latestVideos: [], error: null };
  try {
    await page.goto(`https://www.youtube.com/${handle}/about`, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Dismiss cookie consent if present
    const consentSelectors = [
      'button:has-text("Tout refuser")',
      'button:has-text("Reject all")',
      'button:has-text("Tout accepter")',
      'button:has-text("Accept all")'
    ];
    for (const sel of consentSelectors) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 2000 })) { await btn.click(); break; }
      } catch {}
    }

    await page.waitForTimeout(2000);
    result.description = await page.locator('#description-container').first().textContent({ timeout: 5000 }).catch(() => null);

    // Grab all visible link hrefs in about page (linktree, site perso, etc.)
    const links = await page.locator('a').evaluateAll(els => els.map(e => e.href).filter(h => h && !h.includes('youtube.com')));
    result.links = [...new Set(links)].slice(0, 15);

    // Full page text as fallback for email regex
    result.aboutText = await page.locator('body').textContent({ timeout: 5000 }).catch(() => null);

    // Videos tab for recency
    await page.goto(`https://www.youtube.com/${handle}/videos`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2500);
    const bodyText = await page.locator('body').textContent({ timeout: 5000 }).catch(() => '');
    const dateMatches = bodyText.match(/il y a \d+ (heure|jour|semaine|mois|an)s?/g) || [];
    result.latestVideos = [...new Set(dateMatches)].slice(0, 5);
  } catch (e) {
    result.error = e.message;
  }
  return result;
}

(async () => {
  const handles = process.argv.slice(2);
  if (!handles.length) { console.error('Usage: node youtube-scrape.js @handle1 @handle2 ...'); process.exit(1); }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fr-FR' });
  const page = await ctx.newPage();

  const results = [];
  for (const h of handles) {
    console.error(`Scraping ${h}...`);
    const r = await scrapeChannel(page, h);
    // Extract email via regex from aboutText
    const emailMatch = r.aboutText ? r.aboutText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/) : null;
    r.emailFound = emailMatch ? emailMatch[0] : null;
    delete r.aboutText; // trop volumineux, on garde juste le résultat de la regex
    results.push(r);
    await page.waitForTimeout(1500);
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})();
