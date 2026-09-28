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

    /* ── ON RELÈVE AUSSI LES VUES ───────────────────────────────────────
       Le script ne servait qu'à éviter les doublons. Mais `apprendre.js` ne
       voyait que TikTok : deux tiers des publications ne comptaient pour rien
       dans la boucle d'amélioration. La grille affiche le nombre de vues sur
       chaque vignette de Reel — on le prend au passage, c'est gratuit. */
    const info = await page.evaluate(() => {
      const nombres = [...document.querySelectorAll('header li, header span')]
        .map((e) => (e.textContent || '').trim()).filter(Boolean);
      const publications = new Map();
      for (const a of document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')) {
        const href = a.getAttribute('href') || '';
        const img = a.querySelector('img');
        publications.set(href, (img?.getAttribute('alt') || '').replace(/\s+/g, ' ').trim());
      }
      /* Le compteur de vues est le texte affiché en surimpression de la
         vignette. On remonte du lien vers son conteneur et on y cherche un
         nombre — « 1,2 K » compris. */
      const vues = {};
      for (const a of document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')) {
        const href = a.getAttribute('href') || '';
        const t = (a.textContent || '').replace(/ /g, ' ').trim();
        const m = t.match(/([\d.,]+\s*[KkMm]?)/);
        if (m) vues[href] = m[1];
      }
      return { entete: nombres.slice(0, 8), liens: [...publications.entries()], vues };
    });

    const f = path.join(SORTIE, `ig-grille-${pseudo}.png`);
    await page.screenshot({ path: f, fullPage: false }).catch(() => {});

    /* ── LES VUES SONT SUR L'ONGLET REELS, PAS SUR LA GRILLE ────────────
       Première erreur : j'ai lu la grille des publications, qui n'affiche que
       l'icône de lecture, et j'en ai conclu qu'Instagram ne donnait pas les
       vues. Faux — elles sont sur l'onglet Reels (`/<pseudo>/reels/`), écrites
       sous chaque vignette. Il fallait changer d'onglet, pas d'API.
       On y va donc explicitement, et on descend jusqu'à ce que le nombre de
       vignettes cesse d'augmenter. */
    await page.goto(`https://www.instagram.com/${pseudo}/reels/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(8000);

    const enNombre = (t) => {
      const m = String(t || '').replace(/\s/g, '').replace(',', '.').match(/^([\d.]+)([KkMm])?/);
      if (!m) return 0;
      const n = parseFloat(m[1]);
      return Math.round(n * (m[2] ? (m[2].toLowerCase() === 'k' ? 1000 : 1e6) : 1));
    };

    /* ── ACCUMULER EN DESCENDANT, LA LISTE EST VIRTUALISÉE ──────────────
       Même piège que sur TikTok, et je ne l'avais pas appliqué ici : après
       avoir beaucoup défilé, Instagram retire du DOM les vignettes du HAUT.
       Une lecture unique en fin de défilement rendait 27 Reels dont les trois
       plus RÉCENTS manquaient — précisément ceux qu'on vient de publier et
       qu'on veut mesurer. On lit donc à chaque palier et on accumule. */
    const collecte = new Map();
    const lireEcran = async () => {
      const vus = await page.evaluate(() => [...document.querySelectorAll('a[href*="/reel/"]')]
        .map((a) => ({
          href: a.getAttribute('href') || '',
          brut: (a.innerText || '').replace(/ /g, ' ').trim(),
        }))).catch(() => []);
      for (const v of vus) if (v.href) collecte.set(v.href, v.brut);
    };

    await lireEcran();
    let avant = -1;
    for (let i = 0; i < 16; i++) {
      await page.mouse.wheel(0, 1800);
      await page.waitForTimeout(1100);
      await lireEcran();
      if (collecte.size === avant && i > 2) break;
      avant = collecte.size;
    }
    const reels = [...collecte.entries()].map(([href, brut]) => ({ href, brut }));
    console.log(`  ${reels.length} Reel(s) collecté(s) au fil du défilement`);

    const avecVues = reels
      .map((r) => ({ href: r.href, vues: enNombre(r.brut), brut: r.brut }))
      .filter((x) => x.vues > 0);

    const STATS = path.join(RACINE, 'social', 'stats');
    const jour = new Date().toISOString().slice(0, 10);
    const fStats = path.join(STATS, `instagram-${jour}.json`);
    if (avecVues.length) {
      fs.mkdirSync(STATS, { recursive: true });
      fs.writeFileSync(fStats, JSON.stringify({
        releve_le: new Date().toISOString(), compte: pseudo,
        source: 'onglet Reels du profil',
        publications: avecVues,
      }, null, 2));
      console.log(`
Relevé Reels : ${avecVues.length} vidéo(s) avec leurs vues.`);
      for (const r of avecVues.slice(0, 8)) {
        console.log(`  ${String(r.vues).padStart(6)} vues  ${r.href}`);
      }
    } else {
      if (fs.existsSync(fStats)) fs.unlinkSync(fStats);
      console.log('Aucune vue lisible sur l onglet Reels — pas de relevé écrit.');
    }
    await page.screenshot({ path: path.join(SORTIE, `ig-reels-${pseudo}.png`) }).catch(() => {});

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
