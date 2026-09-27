/* ================================================================
 * OUVRE UNE FENÊTRE DE CONNEXION AUX COMPTES SOCIAUX
 *
 *   node scripts/open-social-login.js            → Chrome réel, drapeaux retirés
 *   node scripts/open-social-login.js --cdp      → se rattache à TON Chrome
 *
 * ── LE PROBLÈME QUE CE SCRIPT RÉSOUT ─────────────────────────────────────
 * Google et Meta refusent la connexion dans un navigateur piloté : « ce
 * navigateur n'est peut-être pas sécurisé ». Ils le détectent à trois signes —
 * le Chromium de Playwright (qui n'est pas Chrome), le drapeau
 * `--enable-automation`, et `navigator.webdriver` à true.
 *
 * On retire les trois :
 *   · `channel: "chrome"` lance le Chrome installé sur la machine, pas le
 *     Chromium livré avec Playwright ;
 *   · `ignoreDefaultArgs` enlève `--enable-automation` ;
 *   · un script d'init remet `navigator.webdriver` à false avant tout chargement.
 *
 * TikTok passait déjà sans ça ; Instagram et YouTube non — c'est Google et Meta
 * qui vérifient, pas les plateformes en général.
 *
 * ── SI ÇA REFUSE QUAND MÊME : LE MODE --cdp ──────────────────────────────
 * Google durcit ses contrôles régulièrement. Le repli indiscutable est de se
 * RATTACHER à un Chrome que tu as lancé toi-même : il n'y a alors plus rien à
 * détecter, c'est ton navigateur. Dans un terminal :
 *
 *   "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" ^
 *     --remote-debugging-port=9222 ^
 *     --user-data-dir="%CD%\\.chrome-social"
 *
 * puis `node scripts/open-social-login.js --cdp`. Les sessions vivent alors dans
 * `.chrome-social/`, et les scripts suivants s'y rattachent de la même façon.
 *
 * Dans les deux cas, ton mot de passe est tapé dans une vraie fenêtre et ne
 * transite par aucun script.
 * ================================================================ */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const cdp = process.argv.includes('--cdp');
const PROFIL_PW = path.join(__dirname, '..', '.playwright-profile-social');
const PROFIL_CHROME = path.join(__dirname, '..', '.chrome-social');

const ONGLETS = [
  ['TikTok', 'https://www.tiktok.com/login'],
  ['Instagram', 'https://www.instagram.com/accounts/login/'],
  ['YouTube', 'https://accounts.google.com/ServiceLogin?service=youtube'],
];

(async () => {
  let ctx;

  if (cdp) {
    try {
      const nav = await chromium.connectOverCDP('http://localhost:9222');
      ctx = nav.contexts()[0] || (await nav.newContext());
      console.log('Rattaché à ton Chrome (port 9222).\n');
    } catch (e) {
      console.error('Aucun Chrome à écouter sur le port 9222.\n');
      console.error('Lance-le d\'abord, dans un terminal séparé :\n');
      console.error('  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" ^');
      console.error('    --remote-debugging-port=9222 ^');
      console.error(`    --user-data-dir="${PROFIL_CHROME}"`);
      console.error('\npuis relance cette commande.');
      process.exit(1);
    }
  } else {
    fs.mkdirSync(PROFIL_PW, { recursive: true });
    ctx = await chromium.launchPersistentContext(PROFIL_PW, {
      channel: 'chrome',                              // le Chrome installé, pas Chromium
      headless: false,
      viewport: null,                                  // fenêtre réelle, pas un cadre imposé
      args: ['--disable-blink-features=AutomationControlled'],
      ignoreDefaultArgs: ['--enable-automation'],
    }).catch(async (e) => {
      console.error('Chrome introuvable — repli sur Chromium (Google refusera peut-être).');
      console.error('  ' + e.message.split('\n')[0]);
      return chromium.launchPersistentContext(PROFIL_PW, {
        headless: false,
        args: ['--disable-blink-features=AutomationControlled'],
        ignoreDefaultArgs: ['--enable-automation'],
      });
    });

    // Dernier signe visible depuis la page : on l'efface avant tout chargement.
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
  }

  for (const [nom, url] of ONGLETS) {
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
    console.log(`  onglet ouvert — ${nom}`);
  }

  console.log('');
  console.log('Connecte-toi dans les trois onglets. La session est enregistrée au fur');
  console.log('et à mesure : tu peux fermer la fenêtre une fois terminé.');
  console.log('');
  console.log('Vérifier ensuite :  node scripts/social-verif-session.js');
  console.log('');
  if (!cdp) {
    console.log('Si Google refuse encore (« navigateur non sécurisé »), le repli sûr :');
    console.log('  node scripts/open-social-login.js --cdp');
    console.log('  (les instructions s\'affichent si Chrome n\'écoute pas encore)');
    console.log('');
  }
  console.log('(ce script reste actif tant que la fenêtre est ouverte — Ctrl+C pour quitter)');

  await new Promise(() => {});
})();
