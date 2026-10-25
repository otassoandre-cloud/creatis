#!/usr/bin/env node
/**
 * Publie une STORY Instagram, via l'interface MOBILE servie dans ton Chrome.
 *
 *   node scripts/publier-story-instagram.js --video <chemin>
 *   ... --publier        pour envoyer pour de bon
 *
 * ── POURQUOI L'ÉMULATION MOBILE ──────────────────────────────────────────
 * Instagram en version BUREAU n'a pas de création de story : le menu « Créer »
 * ne propose que « Publication », et les deux URL connues (/create/story/ et
 * /stories/create/) ne mènent nulle part — vérifié le 28/09.
 *
 * L'interface MOBILE, elle, l'expose. On force donc Chrome à se présenter comme
 * un iPhone (métriques + user-agent via CDP), et Instagram sert sa version
 * mobile avec le bouton « + » qui ouvre Publication / Story / Reel.
 *
 * L'alternative serait l'API Graph, plus propre et sans navigateur — mais
 * META_ACCESS_TOKEN est expiré. Ce chemin-ci marche sans rien demander.
 *
 * ── LA SESSION VIT DANS TON CHROME ───────────────────────────────────────
 * Meta refuse la connexion dans un navigateur piloté. La session a été ouverte
 * à la main dans un Chrome lancé avec --remote-debugging-port=9222 ; on s'y
 * rattache et on ne ferme JAMAIS ce navigateur en sortant.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const SORTIE = process.env.SCRATCH || path.join(RACINE, '.scratch-social');

const publier = process.argv.includes('--publier');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const VIDEO = arg('video', '');

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

(async () => {
  if (!VIDEO || !fs.existsSync(VIDEO)) {
    console.error('Vidéo introuvable : ' + VIDEO);
    process.exit(1);
  }
  fs.mkdirSync(SORTIE, { recursive: true });

  const { chromium } = require('playwright');
  const nav = await chromium.connectOverCDP('http://localhost:9222').catch(() => null);
  if (!nav) {
    console.error('Aucun Chrome à écouter sur le port 9222.');
    console.error('Le lancer avec --remote-debugging-port=9222 et un --user-data-dir dédié.');
    process.exit(1);
  }
  const ctx = nav.contexts()[0];
  const page = await ctx.newPage();

  /* L'émulation passe par CDP et non par un contexte Playwright : on se
     RATTACHE à un navigateur existant, on ne le crée pas, donc on ne peut pas
     lui passer un `device` à la construction. */
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 3, mobile: true,
  });
  await cdp.send('Emulation.setUserAgentOverride', { userAgent: IPHONE, platform: 'iPhone' });

  const shot = async (n) => {
    const f = path.join(SORTIE, `ig-story-${n}.png`);
    await page.screenshot({ path: f }).catch(() => {});
    console.log('   capture : ' + f);
  };

  /* Instagram mobile ouvre « Enregistrer vos informations de connexion ? » et
     d'autres invites par-dessus l'interface. Le premier essai a échoué sur un
     clic qui n'atteignait pas le « + » : la modale le recouvrait, et l'erreur
     ne parlait que d'un timeout. On boucle jusqu'à ce qu'un tour ne ferme rien. */
  const ecarter = async () => {
    for (let t = 0; t < 6; t++) {
      let ferme = false;
      for (const l of ['Plus tard', 'Not Now', 'Pas maintenant', 'Fermer', 'Annuler']) {
        const b = page.locator(`button:text-is("${l}"), div[role="button"]:text-is("${l}"), :text-is("${l}")`).first();
        if (await b.isVisible().catch(() => false)) {
          await b.click({ timeout: 4000 }).catch(() => {});
          console.log(`  invite écartée : ${l}`);
          ferme = true;
          await page.waitForTimeout(1200);
        }
      }
      if (!ferme) return;
    }
  };

  try {
    console.log('· ouverture (mobile)');
    await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(6000);
    await ecarter();

    /* ── LA STORY S'OUVRE PAR L'ANNEAU, PAS PAR LE MENU ──────────────────
       Le « + » du menu mobile ne propose que Publication. Le vrai chemin est
       l'anneau « Votre Story » en tête du fil : c'est lui qui ouvre le sélecteur
       de fichier pour une story. Un premier essai cliquait le « + » et listait
       un menu sans entrée Story — la cause n'était pas l'absence de la
       fonction, mais le mauvais bouton. */
    console.log('· ouverture de « Votre Story »');
    const anneau = page.locator(
      ':text-is("Votre Story"), :text-is("Your story"), [aria-label*="Votre Story"], [aria-label*="Your story"]',
    ).first();
    if (!(await anneau.isVisible().catch(() => false))) {
      await shot('sans-anneau');
      throw new Error('anneau « Votre Story » introuvable en tête du fil');
    }
    await anneau.click({ timeout: 12000 });
    await page.waitForTimeout(3500);
    await shot('menu');

    console.log('· dépôt du fichier');
    const champ = page.locator('input[type="file"]').last();
    await champ.waitFor({ state: 'attached', timeout: 20000 });
    await champ.setInputFiles(path.resolve(VIDEO));
    await page.waitForTimeout(9000);
    await shot('apres-depot');

    if (!publier) {
      console.log('');
      console.log('PRÊT — rien n\'a été publié. Relis les captures.');
      console.log('Pour envoyer : ajouter --publier');
      await page.waitForTimeout(3000);
      return;
    }

    console.log('· partage');
    let envoye = false;
    for (const l of ['Partager', 'Share', 'Votre story', 'Your story', 'Ajouter à la story']) {
      const b = page.locator(`:text-is("${l}")`).first();
      if (await b.isVisible().catch(() => false)) {
        await b.click({ timeout: 8000 }).catch(() => {});
        console.log(`  envoi : « ${l} »`);
        envoye = true;
        break;
      }
    }
    if (!envoye) { await shot('sans-bouton-partager'); throw new Error('bouton de partage introuvable'); }
    await page.waitForTimeout(15000);
    await shot('apres-partage');
    console.log('');
    console.log('Envoyé — VÉRIFIER la story sur le compte avant de conclure.');
  } catch (e) {
    console.error('Échec : ' + e.message.split('\n')[0]);
    await shot('erreur');
    console.error('NE PAS relancer sans avoir vérifié le compte : un essai « échoué » peut être parti.');
    process.exitCode = 1;
  } finally {
    await page.close().catch(() => {});
    // Jamais de fermeture du navigateur : c'est celui de l'utilisateur.
    process.exit(process.exitCode || 0);
  }
})();
