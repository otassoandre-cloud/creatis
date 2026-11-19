#!/usr/bin/env node
/**
 * CHOISIR L'IMAGE D'UNE VIDÉO — le repli quand la miniature est refusée.
 *
 *   node scripts/youtube-image-video.js <videoId> -1   regarder les propositions
 *   node scripts/youtube-image-video.js <videoId> 0|1|2  en choisir une
 *
 * ── POURQUOI UN REPLI ────────────────────────────────────────────────────
 * La miniature personnalisée demande un numéro de téléphone validé, et YouTube
 * le dit à l'écran : « Pour ajouter des miniatures personnalisées, validez
 * votre numéro de téléphone. » Tant que ce n'est pas fait, l'image est choisie
 * par YouTube — et il choisit mal : sur la vidéo du 03/10 il avait pris une
 * diapo de texte intitulée « 3 LA REFORMULATION ».
 *
 * « Sélectionner dans la vidéo » propose trois images du film. En prendre une
 * avec un visage, ou un chiffre lisible en petit, vaut toujours mieux que le
 * défaut. Ce n'est pas la miniature dessinée, c'est le moins mauvais possible
 * en attendant la validation.
 *
 * ── LE PIÈGE ─────────────────────────────────────────────────────────────
 * La boîte a son PROPRE bouton « OK ». Sans lui, le choix n'est pas validé et
 * « Enregistrer » reste gris — ce qui ressemble à s'y méprendre à un échec.
 */

const path = require('path');
const RACINE = 'C:/Users/Utilisateur/Desktop/creatis';
const VIDEO = process.argv[2];
const CHOIX = parseInt(process.argv[3] || '0', 10); // -1 = regarder seulement

(async () => {
  const { chromium } = require(path.join(RACINE, 'node_modules', 'playwright'));
  const ctx = await chromium.launchPersistentContext(
    path.join(RACINE, '.playwright-profile-social'),
    { channel: 'chrome', headless: false, viewport: { width: 1500, height: 1100 } },
  );
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto(`https://studio.youtube.com/video/${VIDEO}/edit`, {
    waitUntil: 'domcontentloaded', timeout: 90000,
  });
  await page.waitForTimeout(10000);

  const bouton = page.locator(':text("Sélectionner dans la vidéo")').first();
  await bouton.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await bouton.click({ timeout: 8000 }).catch((e) => console.log('clic : ' + e.message.split('\n')[0]));
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(RACINE, '.scratch-social', 'yt-choix-image.png') });

  const n = await page.locator('ytcp-still-cell, [class*="still"] img, ytcp-thumbnail-editor img').count();
  console.log('propositions visibles : ' + n);

  if (CHOIX >= 0) {
    const cellules = page.locator('ytcp-still-cell');
    const total = await cellules.count();
    console.log('cellules cliquables : ' + total);
    if (total > CHOIX) {
      await cellules.nth(CHOIX).click({ timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(2000);
      /* La boite a son propre OK : sans lui, le choix n est pas valide et
         < Enregistrer > reste gris. Mesure du 04/10. */
      const ok = page.locator('ytcp-button:has-text("OK"), button:has-text("OK")').last();
      await ok.click({ timeout: 6000 }).catch((e) => console.log('OK : ' + e.message.split(String.fromCharCode(10))[0]));
      await page.waitForTimeout(3500);
      const enreg = page.locator('ytcp-button:has-text("Enregistrer"), button:has-text("Enregistrer")').first();
      const actif = await enreg.evaluate((b) => !(b.hasAttribute('disabled') || b.getAttribute('aria-disabled') === 'true')).catch(() => false);
      console.log('Enregistrer actif après le choix : ' + (actif ? 'OUI' : 'NON'));
      if (actif) {
        await enreg.click({ timeout: 6000 }).catch(() => {});
        await page.waitForTimeout(7000);
        console.log('enregistré');
      }
    }
    await page.screenshot({ path: path.join(RACINE, '.scratch-social', 'yt-choix-apres.png') });
  }
  await ctx.close();
  process.exit(0);
})();
