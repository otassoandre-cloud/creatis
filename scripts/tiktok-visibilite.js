#!/usr/bin/env node
/**
 * Rend publique la publication TikTok la plus récente.
 *
 *   node scripts/tiktok-visibilite.js                 (liste, ne change rien)
 *   node scripts/tiktok-visibilite.js --appliquer     (met « Tout le monde »)
 *
 * ── POURQUOI ─────────────────────────────────────────────────────────────
 * Le 28/09, une publication est partie en « Moi uniquement » : invisible pour
 * tout le monde. Le réglage d'audience se trouve dans la section « Paramètres »
 * du formulaire d'import, SOUS la ligne de flottaison — `publier-tiktok.js` ne
 * descendait jamais jusque-là et laissait le défaut du compte.
 *
 * Rien ne le signalait : l'import avait réussi, la légende était bonne, TikTok
 * affichait la publication. Elle n'était simplement visible par personne.
 *
 * Ce script répare l'existant. La cause est corrigée dans `publier-tiktok.js`,
 * qui règle désormais l'audience AVANT de publier et refuse de continuer s'il
 * n'y parvient pas.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const PROFIL = path.join(RACINE, '.playwright-profile-social');
const SORTIE = process.env.SCRATCH || path.join(RACINE, '.scratch-social');

const appliquer = process.argv.includes('--appliquer');

(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const { chromium } = require('playwright');
  const ctx = await chromium.launchPersistentContext(PROFIL, {
    channel: 'chrome', headless: false, viewport: { width: 1500, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
  }).catch((e) => { console.error(e.message.split('\n')[0]); process.exit(1); });

  await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  const page = await ctx.newPage();

  try {
    await page.goto('https://www.tiktok.com/tiktokstudio/content', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(9000);

    /* Les sélecteurs d'audience sont un par ligne, dans l'ordre du tableau.
       La ligne 0 est la publication la plus récente. On ne touche QU'À ELLE :
       modifier l'audience d'anciennes publications n'a jamais été demandé et
       serait irréversible pour leur portée. */
    const selecteurs = page.locator('div:has-text("Moi uniquement"), div:has-text("Moi uniqu")');
    const prives = await page.evaluate(() => {
      const out = [];
      for (const e of document.querySelectorAll('div, span')) {
        const t = (e.textContent || '').trim();
        if (/^Moi uniqu/.test(t) && t.length < 25) {
          const r = e.getBoundingClientRect();
          if (r.width > 40 && r.height > 10) out.push({ texte: t, y: Math.round(r.top) });
        }
      }
      return out.sort((a, b) => a.y - b.y).slice(0, 5);
    });

    console.log(`${prives.length} publication(s) en « Moi uniquement » détectée(s) en haut de liste.`);
    if (!prives.length) {
      await page.screenshot({ path: path.join(SORTIE, 'tiktok-visibilite.png') }).catch(() => {});
      console.log('Rien à corriger — relis la capture pour confirmer.');
      await ctx.close(); return;
    }
    if (!appliquer) {
      await page.screenshot({ path: path.join(SORTIE, 'tiktok-visibilite.png') }).catch(() => {});
      console.log('Relancer avec --appliquer pour passer la plus récente en « Tout le monde ».');
      await ctx.close(); return;
    }

    const bouton = page.locator('div,span').filter({ hasText: /^Moi uniqu/ }).first();
    await bouton.click({ timeout: 8000 });
    await page.waitForTimeout(2000);

    const tous = page.locator(':text-is("Tout le monde"), :text-is("Everyone")').last();
    if (!(await tous.isVisible().catch(() => false))) {
      await page.screenshot({ path: path.join(SORTIE, 'tiktok-visibilite-echec.png') }).catch(() => {});
      throw new Error('« Tout le monde » introuvable dans le menu d audience');
    }
    await tous.click();
    await page.waitForTimeout(4000);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(8000);
    await page.screenshot({ path: path.join(SORTIE, 'tiktok-visibilite.png') }).catch(() => {});
    console.log('Audience changée — VÉRIFIER la capture, la ligne du haut doit dire « Tout le monde ».');
  } catch (e) {
    console.error('Échec : ' + e.message.split('\n')[0]);
    await page.screenshot({ path: path.join(SORTIE, 'tiktok-visibilite-erreur.png') }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await ctx.close().catch(() => {});
  }
})();
