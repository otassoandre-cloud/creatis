/* ================================================================
 * OPEN SUBMAGIC — ouvre Chrome (profil persistant) pour analyse visuelle
 *
 * But : observer le rendu des sous-titres d'un outil concurrent afin d'en tirer les PARAMÈTRES
 * visuels (taille relative, épaisseur de contour, position, cadence d'animation) et corriger nos
 * propres réglages. On mesure un rendu, on ne récupère ni police sous licence ni code source.
 *
 * L'utilisateur se connecte lui-même dans la fenêtre ; la session est conservée dans
 * .playwright-profile-submagic/ (déjà exclu du déploiement via .vercelignore → .playwright-*).
 *
 * Usage : node scripts/open-submagic.js
 * ================================================================ */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const profileDir = path.join(__dirname, '..', '.playwright-profile-submagic');
  const shotsDir = path.join(__dirname, '..', '.scratch-submagic');
  fs.mkdirSync(shotsDir, { recursive: true });

  const ctx = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2        // captures nettes : indispensable pour mesurer un contour au pixel
  });

  const page = await ctx.newPage();
  await page.goto('https://app.submagic.co/', { waitUntil: 'domcontentloaded' }).catch(() => {});

  console.log('✅ Chrome ouvert sur Submagic.');
  console.log('👉 Connecte-toi, puis ouvre un projet avec des sous-titres visibles.');
  console.log('   Dis-moi quand la page est prête — je prendrai les captures depuis ce script.');
  console.log(`   Captures enregistrées dans : ${shotsDir}`);

  // Capture à la demande : le fichier .capture sert de signal depuis l'extérieur.
  const signal = path.join(shotsDir, '.capture');
  let n = 0;
  setInterval(async () => {
    if (!fs.existsSync(signal)) return;
    fs.unlinkSync(signal);
    n += 1;
    const dest = path.join(shotsDir, `submagic-${String(n).padStart(2, '0')}.png`);
    try {
      await page.screenshot({ path: dest });
      console.log(`📸 ${dest}`);
    } catch (e) {
      console.log(`⚠️ capture échouée : ${e.message}`);
    }
  }, 1500);

  await new Promise(() => {});   // garde la fenêtre ouverte
})();
