/* Charge la page EN PRODUCTION dans un vrai navigateur et inspecte l'ARBRE DOM.
 *
 * Pourquoi : verifier l'ordre des chaines dans le HTML source ne prouve rien. Si une
 * balise fermante manque, le navigateur "repare" en re-parentant les elements — le
 * source parait correct alors que l'affichage est casse. Seul le DOM construit fait foi.
 *
 * Usage : node scripts/verif-dom.js
 */
const { chromium } = require('playwright');

(async () => {
  const nav = await chromium.launch({ headless: true });
  const page = await nav.newPage({ viewport: { width: 1400, height: 900 } });
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e.message)));

  await page.goto('https://creatis.app/clips-v2.html?nocache=' + Date.now(),
                  { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  const rapport = await page.evaluate(() => {
    const chemin = el => {
      const p = [];
      while (el && el.tagName !== 'BODY') {
        p.unshift(el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`);
        el = el.parentElement;
      }
      return p.join(' > ');
    };
    const r = { styles: [], options: [], couleurs: [], erreurNesting: [] };
    document.querySelectorAll('.modal-styles').forEach(el => {
      r.styles.push({ id: el.id, boutons: el.querySelectorAll('button').length, chemin: chemin(el) });
    });
    document.querySelectorAll('.modal-opt-row').forEach(el => {
      const dansStyles = !!el.closest('.modal-styles');
      r.options.push({ chemin: chemin(el), dansStyles });
      if (dansStyles) r.erreurNesting.push('modal-opt-row imbrique dans modal-styles');
    });
    ['sz-btns', 'modal-color-text', 'modal-color-bg'].forEach(id => {
      const els = document.querySelectorAll(`[id="${id}"]`);
      r.couleurs.push({ id, nb: els.length, chemin: els[0] ? chemin(els[0]) : '(absent)' });
    });
    // Les pastilles de l'ecran d'upload ne doivent PAS se retrouver dans un panneau d'edition
    const trust = document.querySelector('.upload-trust');
    r.trustDansPanneau = trust ? !!trust.closest('.modal-styles-wrap') : null;
    return r;
  });

  console.log('--- conteneurs de styles ---');
  rapport.styles.forEach((s, i) => console.log(`  ${i + 1}. id=${s.id} boutons=${s.boutons}\n     ${s.chemin}`));
  console.log('\n--- lignes d options ---');
  rapport.options.forEach((o, i) => console.log(`  ${i + 1}. imbrique-dans-styles=${o.dansStyles}\n     ${o.chemin}`));
  console.log('\n--- elements cles ---');
  rapport.couleurs.forEach(c => console.log(`  ${c.id} : ${c.nb} occurrence(s)\n     ${c.chemin}`));
  console.log('\nupload-trust dans un panneau d edition :', rapport.trustDansPanneau);
  console.log('erreurs de nesting :', rapport.erreurNesting.length ? rapport.erreurNesting : 'aucune');
  console.log('erreurs JS :', erreurs.length ? erreurs.slice(0, 3) : 'aucune');

  await nav.close();
})();
