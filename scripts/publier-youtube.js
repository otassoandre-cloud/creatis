#!/usr/bin/env node
/**
 * Publie une vidéo sur YouTube depuis la session Studio déjà ouverte.
 *
 *   node scripts/publier-youtube.js --video <chemin> --titre "..." \
 *        --description "..." [--court] [--publier]
 *
 * SANS `--publier`, le script remplit le formulaire et S'ARRÊTE, fenêtre ouverte,
 * capture à l'appui. Rien n'est envoyé.
 *
 * ── CE QUE YOUTUBE PERMET ET QUE TIKTOK INTERDIT ─────────────────────────
 * Un lien CLIQUABLE dans la description, dès le premier abonné. TikTok exige
 * 1 000 abonnés. C'est donc ici que la mesure sera la plus propre, et le lien
 * doit toujours figurer dans les premières lignes — YouTube replie le reste
 * derrière « plus ».
 *
 * ── DEUX OBLIGATIONS QUE YOUTUBE IMPOSE ──────────────────────────────────
 * · Déclarer si la vidéo s'adresse aux enfants. Sans réponse, l'envoi reste
 *   bloqué au deuxième écran, sans message explicite.
 * · Choisir une visibilité au dernier écran. Par défaut c'est « Privée ».
 *
 * ── FORMAT ───────────────────────────────────────────────────────────────
 * `--court` annonce un Short. En pratique YouTube le décide seul au ratio et à
 * la durée (vertical, moins de 3 minutes) : le drapeau ne sert qu'à adapter le
 * titre et à ne pas s'étonner du classement.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const PROFIL = path.join(RACINE, '.playwright-profile-social');
const SORTIE = process.env.SCRATCH || path.join(RACINE, '.scratch-social');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const publier = process.argv.includes('--publier');

const VIDEO = arg('video', '');
const TITRE = arg('titre', '');
const DESCRIPTION = arg('description', '');

(async () => {
  if (!VIDEO || !fs.existsSync(VIDEO)) {
    console.error('Vidéo introuvable : ' + VIDEO);
    process.exit(1);
  }
  fs.mkdirSync(SORTIE, { recursive: true });

  const { chromium } = require('playwright');
  const ctx = await chromium.launchPersistentContext(PROFIL, {
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

  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const page = await ctx.newPage();
  const shot = async (n) => {
    const f = path.join(SORTIE, `yt-${n}.png`);
    await page.screenshot({ path: f }).catch(() => {});
    console.log('   capture : ' + f);
  };

  /* YouTube Studio ouvre régulièrement des panneaux d'accueil et des nouveautés
     qui recouvrent le formulaire. Même leçon que TikTok : ils n'arrivent pas tous
     en même temps, donc on boucle. */
  const fermerPanneaux = async () => {
    for (let t = 0; t < 6; t++) {
      let ferme = false;
      for (const l of ['Continuer', 'Got it', "J'ai compris", 'Fermer', 'Ignorer', 'Non merci']) {
        const b = page.locator(`tp-yt-paper-button:has-text("${l}"), button:has-text("${l}"), ytcp-button:has-text("${l}")`).first();
        if (await b.isVisible().catch(() => false)) {
          await b.click({ timeout: 4000 }).catch(() => {});
          ferme = true;
          await page.waitForTimeout(1200);
          console.log(`  panneau écarté : ${l}`);
        }
      }
      if (!ferme) return;
      await page.waitForTimeout(800);
    }
  };

  try {
    console.log('· ouverture du Studio');
    await page.goto('https://studio.youtube.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(7000);
    await fermerPanneaux();

    if (/accounts\.google\.com/i.test(page.url())) {
      console.error('Session YouTube expirée — relancer open-social-login.js.');
      await shot('deconnecte'); await ctx.close(); process.exit(2);
    }

    console.log('· dépôt du fichier');
    const bouton = page.locator('ytcp-button:has-text("Créer"), #create-icon').first();
    if (await bouton.isVisible().catch(() => false)) {
      await bouton.click().catch(() => {});
      await page.waitForTimeout(1500);
      const item = page.locator('tp-yt-paper-item:has-text("Importer"), tp-yt-paper-item:has-text("Upload")').first();
      if (await item.isVisible().catch(() => false)) { await item.click().catch(() => {}); await page.waitForTimeout(3000); }
    }

    const champ = page.locator('input[type="file"]').first();
    await champ.waitFor({ state: 'attached', timeout: 30000 });
    await champ.setInputFiles(path.resolve(VIDEO));
    console.log('· envoi en cours');
    await page.waitForTimeout(20000);
    await fermerPanneaux();
    await shot('apres-depot');

    if (TITRE) {
      console.log('· titre');
      const zt = page.locator('#title-textarea #textbox, ytcp-social-suggestions-textbox#title-textarea div#textbox').first();
      if (await zt.count()) {
        await zt.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.keyboard.type(TITRE.slice(0, 95), { delay: 10 });
      } else console.warn('  champ titre introuvable');
      await page.waitForTimeout(1000);
    }

    if (DESCRIPTION) {
      console.log('· description');
      const zd = page.locator('#description-textarea #textbox, ytcp-social-suggestions-textbox#description-textarea div#textbox').first();
      if (await zd.count()) {
        await zd.click();
        await page.keyboard.type(DESCRIPTION, { delay: 6 });
      } else console.warn('  champ description introuvable');
      await page.waitForTimeout(1000);
    }

    // Obligatoire : sans cette réponse, l'étape suivante reste inaccessible.
    console.log('· déclaration « pas conçu pour les enfants »');
    const pasEnfants = page.locator('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]').first();
    if (await pasEnfants.isVisible().catch(() => false)) {
      await pasEnfants.click().catch(() => {});
      await page.waitForTimeout(800);
    } else console.warn('  case « pas pour les enfants » introuvable');

    await shot('details-remplis');

    if (!publier) {
      console.log('');
      console.log('FORMULAIRE PRÊT — rien n\'a été publié. Relis la capture.');
      console.log('Pour envoyer : ajouter --publier');
      await new Promise(() => {});
      return;
    }

    console.log('· étapes suivantes');
    for (let i = 0; i < 3; i++) {
      const suivant = page.locator('ytcp-button#next-button, #next-button button').first();
      if (await suivant.isVisible().catch(() => false)) {
        await suivant.click().catch(() => {});
        await page.waitForTimeout(2500);
      }
    }

    console.log('· visibilité publique');
    const publique = page.locator('tp-yt-paper-radio-button[name="PUBLIC"]').first();
    if (await publique.isVisible().catch(() => false)) {
      await publique.click().catch(() => {});
      await page.waitForTimeout(1200);
    } else console.warn('  option « Publique » introuvable — la vidéo restera privée');

    await shot('avant-envoi');

    const envoyer = page.locator('ytcp-button#done-button, #done-button button').first();
    await envoyer.waitFor({ state: 'visible', timeout: 20000 });
    await envoyer.click();
    await page.waitForTimeout(15000);
    await shot('apres-envoi');
    console.log('');
    console.log('Envoyé. Vérifie la capture — YouTube affiche parfois un avertissement de droits.');
  } catch (e) {
    console.error('Échec : ' + e.message.split('\n')[0]);
    await shot('erreur');
    process.exitCode = 1;
  } finally {
    if (publier) await ctx.close().catch(() => {});
  }
})();
