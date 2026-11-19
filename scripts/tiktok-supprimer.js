#!/usr/bin/env node
/**
 * Supprime des publications TikTok identifiées par un extrait de leur légende.
 *
 *   node scripts/tiktok-supprimer.js --contient "extrait"              (liste)
 *   node scripts/tiktok-supprimer.js --contient "extrait" --supprimer  (agit)
 *
 * ── DEUX ERREURS QUI ONT MENÉ À CE SCRIPT ────────────────────────────────
 * 1. J'ai publié une vidéo déjà en ligne, en prenant les fichiers rendus de
 *    `creatis-videos/out/` pour du stock en attente. C'était l'archive de ce qui
 *    était DÉJÀ publié. Vérifier le compte AVANT de publier.
 * 2. J'ai publié deux fois : le premier essai, que je croyais bloqué sur une
 *    modale, était en réalité parti. Ne jamais relancer une publication sans
 *    avoir vérifié l'état du compte.
 *
 * ── POURQUOI ON COMPTE LES MENUS, PAS LE TEXTE ───────────────────────────
 * Une première version cherchait le texte dans `tr, [class*="PostItem"], …` et
 * annonçait 14 correspondances pour 2 publications : les sélecteurs attrapaient
 * des éléments imbriqués du même bloc. Lancer une suppression là-dessus aurait
 * cliqué dans des lignes voisines.
 *
 * Chaque publication a EXACTEMENT un menu « … ». On part donc de ces menus, on
 * remonte à leur ligne, et on lit le texte de cette ligne. Une ligne = un menu =
 * une publication, sans ambiguïté possible.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const PROFIL = path.join(RACINE, '.playwright-profile-social');
const SORTIE = process.env.SCRATCH || path.join(RACINE, '.scratch-social');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const agir = process.argv.includes('--supprimer');
const MOTIF = arg('contient', '');
const MAX = parseInt(arg('max', '2'), 10);

(async () => {
  if (!MOTIF) { console.error('Indique --contient "<extrait de la legende>"'); process.exit(1); }
  fs.mkdirSync(SORTIE, { recursive: true });

  const { chromium } = require('playwright');
  const ctx = await chromium.launchPersistentContext(PROFIL, {
    channel: 'chrome', headless: false, viewport: null,
    args: ['--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
  }).catch((e) => { console.error(e.message.split('\n')[0]); process.exit(1); });

  await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  const page = await ctx.newPage();

  try {
    await page.goto('https://www.tiktok.com/tiktokstudio/content', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(9000);

    /* Un menu « … » par publication. On remonte de chaque menu vers son bloc de
       ligne, en s'arrêtant au premier ancêtre assez haut pour être une ligne
       (plus de 70 px) — au-delà on attraperait le tableau entier. */
    const infos = await page.evaluate(() => {
      const menus = [...document.querySelectorAll('svg, [role="button"], button')]
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width > 14 && r.width < 60 && r.height > 14 && r.height < 60;
        });
      const lignes = new Map();
      for (const m of menus) {
        let n = m;
        for (let i = 0; i < 12 && n; i++) {
          const r = n.getBoundingClientRect();
          if (r.height > 70 && r.height < 220 && r.width > 600) {
            const cle = Math.round(r.top) + 'x' + Math.round(r.height);
            if (!lignes.has(cle)) lignes.set(cle, (n.innerText || '').replace(/\s+/g, ' ').trim());
            break;
          }
          n = n.parentElement;
        }
      }
      return [...lignes.entries()].map(([cle, texte]) => ({ cle, texte }));
    });

    const cibles = infos.filter((l) => l.texte.toLowerCase().includes(MOTIF.toLowerCase()));
    console.log(`${infos.length} publication(s) detectee(s) — ${cibles.length} correspondance(s)\n`);
    cibles.forEach((c, i) => console.log(`  [${i}] ${c.texte.slice(0, 100)}`));

    if (!cibles.length) { console.log('\nRien a faire.'); await ctx.close(); return; }
    if (cibles.length > MAX) {
      console.error(`\nARRET : ${cibles.length} correspondances alors que --max vaut ${MAX}.`);
      console.error('Verifie le motif avant d elargir : une suppression est definitive.');
      await ctx.close(); process.exit(2);
    }
    if (!agir) {
      console.log('\nRelancer avec --supprimer pour agir.');
      await page.screenshot({ path: path.join(SORTIE, 'tiktok-a-supprimer.png') }).catch(() => {});
      await ctx.close(); return;
    }

    /* On supprime une par une en repartant du haut : chaque suppression
       reorganise la liste, donc toute position memorisee devient fausse. */
    for (let tour = 0; tour < cibles.length; tour++) {
      const ligne = page.locator('div,tr').filter({ hasText: MOTIF }).last();
      if (!(await ligne.isVisible().catch(() => false))) { console.log('  plus de correspondance visible'); break; }
      const menu = ligne.locator('[class*="more"], [aria-label*="More"], [aria-label*="Plus"], svg').last();
      await menu.click({ timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(1500);

      const sup = page.locator('text=/^(Supprimer|Delete)$/i').first();
      if (!(await sup.isVisible().catch(() => false))) { console.log('  « Supprimer » introuvable'); break; }
      await sup.click().catch(() => {});
      await page.waitForTimeout(1500);
      const conf = page.locator('button:has-text("Supprimer"), button:has-text("Delete")').last();
      if (await conf.isVisible().catch(() => false)) await conf.click().catch(() => {});
      await page.waitForTimeout(4000);
      console.log(`  suppression ${tour + 1}/${cibles.length}`);
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(6000);
    }

    await page.screenshot({ path: path.join(SORTIE, 'tiktok-apres-suppression.png') }).catch(() => {});
    console.log('\nTermine — verifie la capture.');
  } catch (e) {
    console.error('Echec : ' + e.message.split('\n')[0]);
    process.exitCode = 1;
  } finally {
    await ctx.close().catch(() => {});
  }
})();
