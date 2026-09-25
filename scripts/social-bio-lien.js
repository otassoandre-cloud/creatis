#!/usr/bin/env node
/**
 * Lit — et, sur demande explicite, met à jour — le lien de bio TikTok.
 *
 *   node scripts/social-bio-lien.js                 → LECTURE SEULE, montre l'existant
 *   node scripts/social-bio-lien.js --ecrire        → applique le changement
 *   node scripts/social-bio-lien.js --visible       → fenêtre affichée (débogage)
 *
 * Pourquoi ce script : `users.source` n'a jamais contenu une seule ligne `tiktok`.
 * Le canal n'a pas échoué, il n'a jamais été traçable. Un lien de bio pointant vers
 * creatis.app/tiktok suffit à rendre mesurable tout ce qui est publié — sans lui,
 * scripts/social-brief.js mesurera zéro quoi qu'on produise.
 *
 * Par défaut le script ne modifie RIEN : il affiche la bio et le lien actuels. Il faut
 * `--ecrire` pour toucher au profil, et il refuse d'écraser un lien déjà tracé.
 */

const path = require('path');
const fs = require('fs');

const PROFIL = path.join(__dirname, '..', '.playwright-profile-social');
const LIEN = 'creatis.app/tiktok';
const ecrire = process.argv.includes('--ecrire');
const visible = process.argv.includes('--visible');

(async () => {
  if (!fs.existsSync(PROFIL)) { console.error('Profil absent : ' + PROFIL); process.exit(1); }
  const { chromium } = require('playwright');

  const ctx = await chromium.launchPersistentContext(PROFIL, {
    headless: !visible,
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  }).catch((e) => { console.error('Ouverture du profil impossible : ' + e.message); process.exit(1); });

  const page = await ctx.newPage();
  try {
    await page.goto('https://www.tiktok.com/setting', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    if (/\/login/i.test(page.url())) {
      console.error('Session TikTok expirée — relancer scripts/open-social-login.js et se reconnecter.');
      await ctx.close(); process.exit(2);
    }

    /* TikTok change souvent son DOM : on tente plusieurs libellés plutôt qu'un sélecteur
       rigide, et on echoue proprement si rien ne correspond. */
    const champs = await page.locator('input[type="text"], textarea').all();
    const lus = [];
    for (const c of champs) {
      const v = await c.inputValue().catch(() => '');
      const ph = await c.getAttribute('placeholder').catch(() => '');
      const nom = await c.getAttribute('name').catch(() => '');
      lus.push({ valeur: v, placeholder: ph || '', nom: nom || '' });
    }

    console.log('Champs lisibles sur la page de réglages TikTok :\n');
    lus.forEach((c, i) => {
      console.log(`  [${i}] nom="${c.nom}" placeholder="${c.placeholder}"`);
      console.log(`      valeur : ${c.valeur || '(vide)'}`);
    });

    const dejaTrace = lus.some((c) => /creatis\.app\/(tiktok|t\/)/i.test(c.valeur));
    if (dejaTrace) {
      console.log('\nUn lien tracé est déjà en place — rien à faire.');
      await ctx.close(); return;
    }

    if (!ecrire) {
      console.log('\nLECTURE SEULE. Aucun champ modifié.');
      console.log(`Pour poser le lien tracé « ${LIEN} » : relancer avec --ecrire`);
      await ctx.close(); return;
    }

    /* Écriture : on vise le champ dont le placeholder ou le nom évoque un site web ou
       une bio, jamais le premier champ venu — se tromper ici écrase un pseudo. */
    const cible = champs[lus.findIndex((c) =>
      /site|website|lien|link|bio|signature/i.test(c.placeholder + ' ' + c.nom))];

    if (!cible) {
      console.error('\nAucun champ identifiable comme « site » ou « bio ».');
      console.error('TikTok a probablement changé sa page. Relancer avec --visible pour regarder.');
      await ctx.close(); process.exit(3);
    }

    await cible.fill(LIEN);
    await page.waitForTimeout(800);
    const boutons = page.locator('button:has-text("Enregistrer"), button:has-text("Save")');
    if (await boutons.count()) {
      await boutons.first().click();
      await page.waitForTimeout(2500);
      console.log(`\nLien posé : ${LIEN}`);
    } else {
      console.error('\nChamp rempli mais bouton d\'enregistrement introuvable — rien n\'est validé.');
      process.exitCode = 4;
    }
  } catch (e) {
    console.error('Échec : ' + e.message);
    process.exitCode = 1;
  } finally {
    await ctx.close().catch(() => {});
  }
})();
