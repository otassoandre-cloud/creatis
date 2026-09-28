#!/usr/bin/env node
/**
 * Vérifie l'état des sessions sociales.
 *
 *   node scripts/social-verif-session.js            profil .playwright-profile-social
 *   node scripts/social-verif-session.js --cdp      TON Chrome, port 9222
 *   node scripts/social-verif-session.js --cdp --seul Instagram
 *
 * ── TROIS ÉTATS, PAS DEUX ────────────────────────────────────────────────
 * La version précédente concluait « connecté » dès qu'aucun bouton « Log in »
 * n'était visible. Elle a rapporté « X connecté » alors que la page était
 * ENTIÈREMENT BLANCHE : zéro bouton de connexion, donc zéro preuve du contraire,
 * donc « connecté ». Une absence de preuve n'est pas une preuve.
 *
 * On exige désormais un marqueur POSITIF — un élément qui n'existe QUE pour un
 * visiteur authentifié — et on distingue :
 *
 *   connecté      marqueur positif trouvé
 *   DÉCONNECTÉ    bouton de connexion visible, ou formulaire de login
 *   INDÉTERMINÉ   ni l'un ni l'autre (page blanche, captcha, mur, lenteur)
 *
 * INDÉTERMINÉ n'est pas un échec du script : c'est son résultat correct quand
 * la page ne dit rien. Il faut alors ouvrir la capture, jamais deviner.
 *
 * ── ET LA PAGE DOIT AVOIR DU CONTENU ─────────────────────────────────────
 * On mesure aussi la longueur du texte rendu. Sous 200 caractères la page n'a
 * rien affiché du tout, et aucune conclusion n'est permise, quel que soit le
 * reste.
 */

const path = require('path');
const fs = require('fs');

const PROFIL = path.join(__dirname, '..', '.playwright-profile-social');
const SORTIE = process.env.SCRATCH || path.join(__dirname, '..', '.scratch-social');

const cdp = process.argv.includes('--cdp');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const SEUL = arg('seul', '');

/* Chaque cible porte SES marqueurs d'authentification, en LISTE — évalués un
   par un, jamais concaténés par des virgules.
   Deux raisons, toutes deux payées : le moteur `text=` de Playwright ne peut
   pas figurer dans une liste CSS (le sélecteur entier devient invalide et ne
   trouve plus rien), et une seule entrée en erreur ferait échouer toutes les
   autres. Un par un, un sélecteur périmé n'invalide que lui-même. */
const CIBLES = [
  ['X', 'https://x.com/home', [
    'a[href="/compose/post"]',
    '[data-testid="SideNav_NewTweet_Button"]',
    '[data-testid="SideNav_AccountSwitcher_Button"]',
  ]],
  /* Les attributs data-e2e de TikTok ont changé : ni nav-upload ni profile-icon
     n'existent plus sur le fil. Les libellés du rail de gauche, eux, ne
     s'affichent que connecté — c'est la preuve la plus stable. */
  ['TikTok', 'https://www.tiktok.com/foryou', [
    'text=Publier la vidéo',
    'text=Importer',
    'a[href*="tiktokstudio"]',
    '[data-e2e="nav-upload"]',
  ]],
  ['Instagram', 'https://www.instagram.com/', [
    'a[href="/direct/inbox/"]',
    'svg[aria-label="Nouvelle publication"]',
    'svg[aria-label="New post"]',
  ]],
  ['LinkedIn', 'https://www.linkedin.com/feed/', [
    '.share-box-feed-entry__trigger',
    '.global-nav__me',
    'text=Commencer un post',
  ]],
  ['YouTube', 'https://studio.youtube.com/', [
    '#create-icon',
    'ytcp-navigation-drawer',
    'text=Contenu de la chaîne',
  ]],
];

(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const { chromium } = require('playwright');

  let ctx, navigateur;
  if (cdp) {
    try {
      navigateur = await chromium.connectOverCDP('http://localhost:9222');
      ctx = navigateur.contexts()[0];
      console.log('Rattaché à ton Chrome (port 9222).\n');
    } catch (e) {
      console.error('Aucun Chrome à écouter sur le port 9222.');
      console.error('Le lancer avec --remote-debugging-port=9222 et un --user-data-dir dédié.');
      process.exit(1);
    }
  } else {
    ctx = await chromium.launchPersistentContext(PROFIL, {
      channel: 'chrome',
      headless: false,
      viewport: null,
      args: ['--disable-blink-features=AutomationControlled'],
      ignoreDefaultArgs: ['--enable-automation'],
    }).catch((e) => {
      console.error('Ouverture impossible : ' + e.message.split('\n')[0]);
      console.error('Une autre fenêtre utilise-t-elle le profil ? La fermer, puis relancer.');
      process.exit(1);
    });
  }

  const liste = SEUL ? CIBLES.filter((c) => c[0].toLowerCase() === SEUL.toLowerCase()) : CIBLES;
  if (!liste.length) { console.error(`Cible inconnue : ${SEUL}`); process.exit(1); }

  let indetermines = 0;
  for (const [nom, url, marqueurConnecte] of liste) {
    const p = await ctx.newPage();
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
      await p.waitForTimeout(6000);

      const texte = (await p.evaluate(() => document.body?.innerText?.length || 0).catch(() => 0));
      let positif = false;
      for (const sel of marqueurConnecte) {
        if (await p.locator(sel).first().isVisible().catch(() => false)) { positif = true; break; }
      }
      const negatif = (await p.locator(
        'text=/^(Log in|Se connecter|Sign in|S\'identifier)$/i',
      ).count().catch(() => 0)) > 0
        || (await p.locator('input[name="password"], input[type="password"]').first().isVisible().catch(() => false));

      let etat;
      /* Seuil bas : un fil TikTok est presque entierement video et affiche
         moins de 200 caracteres tout en etant parfaitement charge. Le seuil ne
         sert qu'a attraper la page VRAIMENT blanche — celle qui avait fait
         conclure « X connecte » a tort. */
      if (texte < 40) etat = 'INDÉTERMINÉ (page vide)';
      else if (positif && !negatif) etat = 'connecté';
      else if (negatif && !positif) etat = 'DÉCONNECTÉ';
      else if (positif && negatif) etat = 'INDÉTERMINÉ (signaux contradictoires)';
      else etat = 'INDÉTERMINÉ (aucun marqueur)';

      if (etat.startsWith('INDÉ')) indetermines++;
      const f = path.join(SORTIE, 'session-' + nom.toLowerCase() + '.png');
      await p.screenshot({ path: f }).catch(() => {});
      console.log(`  ${nom.padEnd(10)} ${etat.padEnd(34)} ${p.url().slice(0, 44)}`);
    } catch (e) {
      indetermines++;
      console.log(`  ${nom.padEnd(10)} ${'erreur'.padEnd(34)} ${e.message.split('\n')[0].slice(0, 44)}`);
    }
    await p.close().catch(() => {});
  }

  console.log('\nCaptures dans ' + SORTIE);
  if (indetermines) {
    console.log(`${indetermines} état(s) indéterminé(s) — OUVRIR la capture, ne rien conclure sans.`);
  }
  /* En CDP on NE FERME RIEN. `browser.close()` sur une connexion CDP peut
     fermer le Chrome auquel on s'est rattaché — donc celui de l'utilisateur, et
     avec lui la session qu'on vient de vérifier. On laisse simplement le
     processus se terminer ; les onglets ouverts ici ont déjà été refermés. */
  if (cdp) process.exit(0);
  await ctx.close().catch(() => {});
})();
