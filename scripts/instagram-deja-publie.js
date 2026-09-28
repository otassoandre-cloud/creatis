#!/usr/bin/env node
/**
 * Liste ce qui est DÉJÀ publié sur le compte Instagram connecté.
 *
 *   node scripts/instagram-deja-publie.js --cdp
 *   node scripts/instagram-deja-publie.js --cdp --compte autrepseudo
 *
 * Ne publie rien, ne modifie rien. Lit, et prend une capture de la grille.
 *
 * ── POURQUOI IL EXISTE ───────────────────────────────────────────────────
 * Le 27/09, deux vidéos identiques sont parties sur TikTok, dont une déjà
 * publiée à la main des semaines plus tôt. La cause n'était pas la publication
 * mais l'absence de lecture préalable du compte : `creatis-videos/out/` avait
 * été pris pour du stock en attente alors que c'était l'archive du publié.
 *
 * Sur Instagram la légende ne suffit pas à reconnaître un doublon — deux Reels
 * peuvent porter des textes différents et la même vidéo. On récupère donc AUSSI
 * les vignettes, et on enregistre la grille en image : la comparaison finale est
 * visuelle, parce que c'est la vidéo qui se répète, pas le texte.
 *
 * ── LA SESSION VIT DANS TON CHROME ───────────────────────────────────────
 * Meta refuse la connexion dans un navigateur piloté (« navigateur non
 * sécurisé »). La session Instagram a donc été ouverte à la main dans un Chrome
 * lancé avec --remote-debugging-port=9222, et ce script s'y rattache. Sans
 * `--cdp` il retombe sur .playwright-profile-social, qui n'a PAS la session.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const PROFIL = path.join(RACINE, '.playwright-profile-social');
const SORTIE = process.env.SCRATCH || path.join(RACINE, '.scratch-social');

const cdp = process.argv.includes('--cdp');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const COMPTE = arg('compte', '');

(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const { chromium } = require('playwright');

  let ctx;
  if (cdp) {
    const nav = await chromium.connectOverCDP('http://localhost:9222').catch(() => null);
    if (!nav) {
      console.error('Aucun Chrome à écouter sur le port 9222.');
      console.error('Le lancer avec --remote-debugging-port=9222 et un --user-data-dir dédié.');
      process.exit(1);
    }
    ctx = nav.contexts()[0];
  } else {
    ctx = await chromium.launchPersistentContext(PROFIL, {
      channel: 'chrome', headless: false, viewport: null,
      args: ['--disable-blink-features=AutomationControlled'],
      ignoreDefaultArgs: ['--enable-automation'],
    }).catch((e) => { console.error(e.message.split('\n')[0]); process.exit(1); });
  }

  const page = await ctx.newPage();
  try {
    // Trouver le pseudo si on ne l'a pas : il est dans le lien du profil.
    let pseudo = COMPTE;
    if (!pseudo) {
      await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(6000);
      pseudo = await page.evaluate(() => {
        for (const a of document.querySelectorAll('a[href^="/"]')) {
          const h = a.getAttribute('href');
          // Le lien du profil est de la forme /pseudo/ et porte l'avatar.
          if (/^\/[A-Za-z0-9._]+\/$/.test(h) && a.querySelector('img')) return h.replace(/\//g, '');
        }
        return '';
      });
    }
    if (!pseudo) {
      console.error('Pseudo introuvable — passer --compte <pseudo>.');
      await page.screenshot({ path: path.join(SORTIE, 'ig-sans-pseudo.png') }).catch(() => {});
      process.exit(4);
    }
    console.log(`Compte : @${pseudo}\n`);

    await page.goto(`https://www.instagram.com/${pseudo}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(7000);
    // Charger quelques écrans : la grille est paginée au défilement.
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 2200);
      await page.waitForTimeout(1800);
    }

    const info = await page.evaluate(() => {
      const nombres = [...document.querySelectorAll('header li, header span')]
        .map((e) => (e.textContent || '').trim()).filter(Boolean);
      const publications = new Map();
      for (const a of document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')) {
        const href = a.getAttribute('href') || '';
        const img = a.querySelector('img');
        publications.set(href, (img?.getAttribute('alt') || '').replace(/\s+/g, ' ').trim());
      }
      return { entete: nombres.slice(0, 8), liens: [...publications.entries()] };
    });

    const f = path.join(SORTIE, `ig-grille-${pseudo}.png`);
    await page.screenshot({ path: f, fullPage: false }).catch(() => {});

    console.log('En-tête du profil : ' + info.entete.join(' | '));
    console.log(`\n${info.liens.length} publication(s) lue(s) :\n`);
    info.liens.forEach(([href, alt], i) => {
      const type = href.includes('/reel/') ? 'Reel' : 'Post';
      console.log(`  [${String(i).padStart(2)}] ${type}  ${href}`);
      if (alt) console.log(`        ${alt.slice(0, 120)}`);
    });

    if (!info.liens.length) {
      console.log('Aucune publication lue. Ouvrir la capture AVANT de conclure que le compte est vide :');
      console.log('  ' + f);
    } else {
      console.log('\nGrille capturée : ' + f);
      console.log('La comparer À L ŒIL avec ce qu on s apprête à publier : c est la VIDÉO');
      console.log('qui se répète, pas la légende.');
    }
  } catch (e) {
    console.error('Échec : ' + e.message.split('\n')[0]);
    await page.screenshot({ path: path.join(SORTIE, 'ig-erreur.png') }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await page.close().catch(() => {});
    // En CDP on ne ferme pas le navigateur : c'est celui de l'utilisateur.
    if (cdp) process.exit(process.exitCode || 0);
    await ctx.close().catch(() => {});
  }
})();
