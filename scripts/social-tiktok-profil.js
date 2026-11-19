#!/usr/bin/env node
/**
 * Repère le compte TikTok connecté et ouvre son formulaire « Modifier le profil ».
 *
 *   node scripts/social-tiktok-profil.js            → LECTURE SEULE + capture d'écran
 *   node scripts/social-tiktok-profil.js --ecrire   → pose le lien tracé
 *
 * `/setting` redirige vers le fil : la bio TikTok ne s'édite pas là mais depuis la
 * page de profil, via une fenêtre « Modifier le profil ». Ce script suit ce chemin.
 *
 * Une capture est toujours enregistrée dans le scratchpad : quand TikTok change son
 * DOM — ce qui arrive souvent — c'est le seul moyen de comprendre sans être devant.
 */

const path = require('path');
const fs = require('fs');

const PROFIL = path.join(__dirname, '..', '.playwright-profile-social');
const SORTIE = process.env.SCRATCH || path.join(__dirname, '..', '.scratch-social');
const LIEN = 'creatis.app/tiktok';
const ecrire = process.argv.includes('--ecrire');

(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const { chromium } = require('playwright');
  const ctx = await chromium.launchPersistentContext(PROFIL, {
    headless: true,
    viewport: { width: 1360, height: 950 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();
  const shot = async (nom) => {
    const f = path.join(SORTIE, nom + '.png');
    await page.screenshot({ path: f, fullPage: false }).catch(() => {});
    console.log('   capture : ' + f);
  };

  try {
    await page.goto('https://www.tiktok.com/foryou', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    /* Le lien vers son propre profil est le seul href /@… present dans la barre laterale.
       On le prefere a une supposition sur le pseudo. */
    const hrefs = await page.locator('a[href^="/@"]').evaluateAll(
      (els) => els.map((e) => e.getAttribute('href'))
    ).catch(() => []);
    const compte = [...new Set(hrefs)].filter(Boolean)[0];

    if (!compte) {
      console.log('Aucun lien de profil trouvé — session probablement expirée ou DOM modifié.');
      await shot('tiktok-accueil');
      await ctx.close(); process.exit(2);
    }
    console.log('Compte connecté : tiktok.com' + compte);

    await page.goto('https://www.tiktok.com' + compte, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3500);

    const bouton = page.locator('button:has-text("Modifier le profil"), button:has-text("Edit profile")');
    if (!(await bouton.count())) {
      console.log('Bouton « Modifier le profil » absent — ce n\'est peut-être pas ton compte.');
      await shot('tiktok-profil');
      await ctx.close(); process.exit(3);
    }

    await bouton.first().click();
    await page.waitForTimeout(3000);
    await shot('tiktok-edition');

    const champs = await page.locator('input[type="text"], textarea').all();
    console.log(`\n${champs.length} champ(s) dans le formulaire :`);
    const lus = [];
    for (const c of champs) {
      const v = await c.inputValue().catch(() => '');
      const ph = await c.getAttribute('placeholder').catch(() => '');
      const nom = await c.getAttribute('name').catch(() => '');
      const aria = await c.getAttribute('aria-label').catch(() => '');
      lus.push({ v, ph: ph || '', nom: nom || '', aria: aria || '' });
      console.log(`  nom="${nom || ''}" placeholder="${ph || ''}" aria="${aria || ''}"`);
      console.log(`     valeur : ${v || '(vide)'}`);
    }

    if (lus.some((c) => /creatis\.app\/(tiktok|t\/)/i.test(c.v))) {
      console.log('\nLien tracé déjà présent — rien à faire.');
      await ctx.close(); return;
    }

    if (!ecrire) {
      console.log('\nLECTURE SEULE. Rien n\'a été modifié.');
      console.log('Relancer avec --ecrire pour poser « ' + LIEN + ' ».');
      await ctx.close(); return;
    }

    /* On ne vise que la bio : TikTok ne propose de champ « site web » qu'aux comptes
       Business, et écrire dans le mauvais champ écraserait un pseudo ou un nom. */
    const i = lus.findIndex((c) => /bio|signature|présentation|description/i.test(c.ph + ' ' + c.nom + ' ' + c.aria));
    if (i === -1) {
      console.log('\nChamp bio non identifié. Regarder la capture ci-dessus.');
      await ctx.close(); process.exit(4);
    }

    const actuel = lus[i].v || '';
    const neuf = (actuel ? actuel.replace(/\s*$/, '') + '\n' : '') + LIEN;
    if (neuf.length > 80) {
      console.log(`\nBio trop longue une fois le lien ajouté (${neuf.length} caractères, max 80).`);
      console.log('Bio actuelle : ' + actuel);
      console.log('Raccourcir la bio à la main, puis relancer.');
      await ctx.close(); process.exit(5);
    }

    await champs[i].fill(neuf);
    await page.waitForTimeout(800);
    const save = page.locator('button:has-text("Enregistrer"), button:has-text("Save")');
    if (!(await save.count())) {
      console.log('\nBouton d\'enregistrement introuvable — rien validé.');
      await shot('tiktok-avant-save'); await ctx.close(); process.exit(6);
    }
    await save.first().click();
    await page.waitForTimeout(3000);
    await shot('tiktok-apres-save');
    console.log('\nBio mise à jour :\n' + neuf);
  } catch (e) {
    console.error('Échec : ' + e.message);
    await shot('tiktok-erreur');
    process.exitCode = 1;
  } finally {
    await ctx.close().catch(() => {});
  }
})();
