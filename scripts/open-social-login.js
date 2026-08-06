/* ================================================================
 * OPEN SOCIAL LOGIN — ouvre une fenêtre Chrome visible avec profil persistant
 * L'utilisateur se connecte manuellement à Instagram/TikTok dans cette fenêtre.
 * La session (cookies) est sauvegardée dans .playwright-profile-social/
 * pour être réutilisée ensuite par les scripts de scraping.
 * Usage: node scripts/open-social-login.js
 * ================================================================ */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const profileDir = path.join(__dirname, '..', '.playwright-profile-social');
  const ctx = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    viewport: { width: 1280, height: 900 }
  });

  const igPage = await ctx.newPage();
  await igPage.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded' });

  const ttPage = await ctx.newPage();
  await ttPage.goto('https://www.tiktok.com/login', { waitUntil: 'domcontentloaded' });

  console.log('✅ Fenêtre Chrome ouverte avec 2 onglets (Instagram + TikTok).');
  console.log('👉 Connecte-toi manuellement dans chaque onglet.');
  console.log('   La session restera active tant que cette fenêtre ne se ferme pas.');
  console.log('   Une fois connecté, laisse cette fenêtre ouverte ou ferme-la : la session est sauvegardée.');

  // Garde le process vivant pour laisser le temps de se connecter
  await new Promise(() => {});
})();
