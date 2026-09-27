#!/usr/bin/env node
/**
 * Publie une vidéo sur TikTok, depuis la session déjà ouverte.
 *
 *   node scripts/publier-tiktok.js --video <chemin> --legende "..." [--publier]
 *
 * SANS `--publier`, le script va jusqu'au formulaire rempli et S'ARRÊTE : il
 * dépose le fichier, écrit la légende, prend une capture, et laisse la fenêtre
 * ouverte. Rien n'est envoyé. C'est le mode par défaut, parce qu'une publication
 * ne se retire pas et qu'un sélecteur qui a bougé ne doit pas produire un post
 * vide sur un compte réel.
 *
 * ── LA SESSION ───────────────────────────────────────────────────────────
 * Elle vient de `.playwright-profile-social`, alimenté par open-social-login.js.
 * Le profil est VERROUILLÉ tant qu'une autre fenêtre l'utilise : fermer la
 * fenêtre de connexion avant de publier, sinon l'erreur remonte de façon
 * trompeuse (« Chrome introuvable »).
 *
 * ── POURQUOI PAS L'API ───────────────────────────────────────────────────
 * L'API de publication TikTok exige une application auditée. Tant qu'elle ne
 * l'est pas, elle ne poste qu'en privé sur son propre compte — donc inutile ici.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const PROFIL = path.join(RACINE, '.playwright-profile-social');
const SORTIE = process.env.SCRATCH || path.join(RACINE, '.scratch-social');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const publier = process.argv.includes('--publier');

const VIDEO = arg('video', '');
const LEGENDE = arg('legende', '');

(async () => {
  if (!VIDEO || !fs.existsSync(VIDEO)) {
    console.error('Vidéo introuvable : ' + VIDEO);
    console.error('Usage : node scripts/publier-tiktok.js --video <chemin> --legende "..." [--publier]');
    process.exit(1);
  }
  fs.mkdirSync(SORTIE, { recursive: true });

  const { chromium } = require('playwright');
  const ctx = await chromium.launchPersistentContext(PROFIL, {
    channel: 'chrome',
    headless: false,                 // TikTok refuse l'envoi de fichier en headless
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
    const f = path.join(SORTIE, `tiktok-${n}.png`);
    await page.screenshot({ path: f }).catch(() => {});
    console.log('   capture : ' + f);
  };

  try {
    console.log('· ouverture du studio');
    await page.goto('https://www.tiktok.com/tiktokstudio/upload', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(6000);

    if (/\/login/i.test(page.url()) || (await page.locator('text=/^(Log in|Se connecter)$/i').count())) {
      console.error('Session TikTok expirée — relancer open-social-login.js.');
      await shot('deconnecte'); await ctx.close(); process.exit(2);
    }

    console.log('· dépôt du fichier');
    /* Le champ est masqué derrière la zone de glisser-déposer : on le remplit
       directement, `setInputFiles` n'a pas besoin qu'il soit visible. */
    const champ = page.locator('input[type="file"]').first();
    await champ.waitFor({ state: 'attached', timeout: 30000 });
    await champ.setInputFiles(path.resolve(VIDEO));

    console.log('· envoi en cours (peut prendre une minute)');
    await page.waitForTimeout(25000);
    await shot('apres-depot');

    /* TikTok empile des fenetres modales apres le depot : une proposition
       d'activer les « verifications automatiques du contenu », et un panneau
       d'accueil du studio. Tant qu'elles sont la, la zone de legende n'est pas
       cliquable et le bouton Publier non plus — le script echouait ici sans
       que rien ne le dise.

       On clique « Annuler » et non « Activer » : changer un reglage du compte
       n'est pas ce qu'on nous demande. */
    /* Elles n'arrivent PAS toutes en meme temps : la proposition de
       « verifications automatiques » surgit quand l'import se termine, soit
       apres un premier balayage. Un passage unique ne suffit donc pas — c'est
       ce qui a fait echouer le premier essai, modale encore affichee et legende
       jamais saisie. On boucle jusqu'a ce que plus aucune ne soit visible. */
    const fermerModales = async () => {
      for (let tour = 0; tour < 8; tour++) {
        let ferme = false;
        for (const libelle of ['Annuler', 'Cancel', "J'ai compris", 'Got it']) {
          const b = page.locator(`button:has-text("${libelle}")`).first();
          if (await b.isVisible().catch(() => false)) {
            await b.click({ timeout: 4000 }).catch(() => {});
            console.log(`  fenetre ecartee : ${libelle}`);
            ferme = true;
            await page.waitForTimeout(1200);
          }
        }
        const croix = page
          .locator('[role="dialog"] [aria-label*="lose"], [role="dialog"] [aria-label*="ermer"]')
          .first();
        if (!ferme && (await croix.isVisible().catch(() => false))) {
          await croix.click({ timeout: 4000 }).catch(() => {});
          ferme = true;
          await page.waitForTimeout(1000);
        }
        if (!ferme) {
          const reste = await page.locator('[role="dialog"]').filter({ hasNot: page.locator('[hidden]') }).count().catch(() => 0);
          if (!reste) return true;
          await page.keyboard.press('Escape').catch(() => {});
          await page.waitForTimeout(1500);
        }
      }
      return false;
    };

    await fermerModales();
    await page.waitForTimeout(1500);
    await fermerModales();   // une modale peut en cacher une autre
    await shot('modales-fermees');

    if (LEGENDE) {
      console.log('· légende');
      /* L'éditeur de légende est un contenteditable, pas un <input> : `fill` n'y
         fait rien. On clique dedans, on vide, puis on tape. */
      const zone = page.locator('div[contenteditable="true"]').first();
      if (await zone.count()) {
        await zone.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.keyboard.type(LEGENDE, { delay: 12 });
        await page.waitForTimeout(1500);
      } else {
        console.warn('  zone de légende introuvable — la vidéo est déposée, la légende non.');
      }
    }

    await shot('pret');

    if (!publier) {
      console.log('');
      console.log('FORMULAIRE PRÊT — rien n\'a été publié.');
      console.log('Relis la capture ci-dessus. Pour envoyer : ajouter --publier');
      console.log('La fenêtre reste ouverte (Ctrl+C pour quitter).');
      await new Promise(() => {});
      return;
    }

    console.log('· publication');
    const bouton = page.locator('button:has-text("Publier"), button:has-text("Post")').last();
    await bouton.waitFor({ state: 'visible', timeout: 30000 });
    await bouton.click();
    await page.waitForTimeout(12000);
    await shot('apres-publication');
    console.log('');
    console.log('Publié. Vérifie la capture — TikTok affiche parfois une erreur silencieuse.');
  } catch (e) {
    console.error('Échec : ' + e.message.split('\n')[0]);
    await shot('erreur');
    process.exitCode = 1;
  } finally {
    if (publier) await ctx.close().catch(() => {});
  }
})();
