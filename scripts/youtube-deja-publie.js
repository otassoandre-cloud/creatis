#!/usr/bin/env node
/**
 * Liste ce qui est DÉJÀ en ligne sur la chaîne YouTube.
 *
 *   node scripts/youtube-deja-publie.js
 *   node scripts/youtube-deja-publie.js --titre "Une vidéo longue"   (vérifie un titre)
 *
 * Ce script ne publie rien et ne modifie rien. Il lit.
 *
 * ── POURQUOI IL EXISTE ───────────────────────────────────────────────────
 * Le 27/09, deux vidéos identiques sont parties sur TikTok, dont une qui avait
 * DÉJÀ été publiée à la main des semaines plus tôt. Deux fautes distinctes :
 *
 *  1. J'ai pris les fichiers rendus de `creatis-videos/out/` pour du stock en
 *     attente de publication. C'était l'archive de ce qui était déjà publié.
 *     Un dossier de sorties ne dit RIEN de l'état d'un compte.
 *  2. J'ai relancé une publication que je croyais échouée. Elle était partie.
 *
 * La seule source de vérité sur ce qui est publié, c'est le compte. On le
 * demande donc avant chaque publication, et `--titre` répond par oui ou non.
 *
 * Sortie : code 0 si le titre est libre, 3 s'il existe déjà. De quoi enchaîner
 * sans relire soi-même.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const PROFIL = path.join(RACINE, '.playwright-profile-social');
const SORTIE = process.env.SCRATCH || path.join(RACINE, '.scratch-social');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const TITRE = arg('titre', '');

/** Deux titres se ressemblent si, réduits à leurs mots utiles, ils coïncident. */
const normaliser = (s) => s.toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });

  const { chromium } = require('playwright');
  const ctx = await chromium.launchPersistentContext(PROFIL, {
    channel: 'chrome', headless: false, viewport: null,
    args: ['--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
  }).catch((e) => {
    console.error('Ouverture impossible : ' + e.message.split('\n')[0]);
    console.error('Une autre fenêtre utilise-t-elle le profil ? La fermer, puis relancer.');
    process.exit(1);
  });

  await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  const page = await ctx.newPage();

  /* Studio empile ses panneaux : « Bienvenue dans YouTube Studio », l'infobulle
     « Demander a Studio », et parfois un bandeau de nouveautes. Le premier
     passage de ce script n'a lu AUCUNE video alors que la chaine en contient —
     la liste etait simplement derriere une modale.
     Ils n'arrivent pas tous en meme temps : on boucle jusqu'a ce qu'un tour
     complet ne ferme plus rien. Meme correctif que publier-tiktok.js. */
  const fermerPanneaux = async () => {
    for (let tour = 0; tour < 8; tour++) {
      let ferme = false;
      /* Volontairement SANS « Ignorer » : ce bouton n'appartient pas a une
         modale mais au bandeau d'avertissement du reglement de la communaute.
         Il ne bloque rien, il revient a chaque tour — la boucle l'a clique 25
         fois de suite — et surtout ecarter l'avis de la chaine n'est pas a moi
         de le decider. */
      for (const l of ['Continuer', 'Fermer', "J'ai compris", 'Got it', 'Plus tard']) {
        const b = page.locator(`tp-yt-paper-button:has-text("${l}"), ytcp-button:has-text("${l}"), button:has-text("${l}")`).first();
        if (await b.isVisible().catch(() => false)) {
          await b.click({ timeout: 4000 }).catch(() => {});
          console.log(`  panneau ecarte : ${l}`);
          ferme = true;
          await page.waitForTimeout(1200);
        }
      }
      if (!ferme) return;
      await page.waitForTimeout(700);
    }
  };

  try {
    await page.goto('https://studio.youtube.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(6000);
    await fermerPanneaux();

    /* Juger sur un marqueur du DOM, jamais sur l'URL : deux faux positifs ont
       déjà été rapportés en lisant l'adresse (TikTok redirige les anonymes vers
       /foryou, et une page entièrement blanche ne contient aucun bouton
       « Log in »). On exige la preuve d'être connecté, pas l'absence de preuve
       du contraire. */
    if (/accounts\.google\.com|\/signin/i.test(page.url())) {
      console.error('Session YouTube expirée — relancer open-social-login.js.');
      await page.screenshot({ path: path.join(SORTIE, 'yt-deconnecte.png') }).catch(() => {});
      await ctx.close(); process.exit(2);
    }

    /* DEUX onglets, pas un. Le 28/09 l'onglet « Vidéos » etait vide et j'ai
       conclu « chaine vide » — alors que le tableau de bord affichait un Short
       a 21 vues. Un Short ne figure PAS dans /videos/upload : il a sa propre
       route. Ne regarder qu'un onglet, c'est se preparer un faux « titre
       libre » le jour ou l'on publiera au format vertical. */
    const url = page.url().match(/channel\/([^/]+)/);
    const ONGLETS = [['Vidéos', 'videos/upload'], ['Shorts', 'videos/short']];
    const titres = [];
    let videExplicite = true;

    if (!url) {
      console.error('Identifiant de chaîne introuvable dans l URL du Studio.');
      await page.screenshot({ path: path.join(SORTIE, 'yt-sans-canal.png') }).catch(() => {});
      await ctx.close(); process.exit(4);
    }

    for (const [nom, route] of ONGLETS) {
      await page.goto(`https://studio.youtube.com/channel/${url[1]}/${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(8000);
      await fermerPanneaux();
      await page.waitForTimeout(1500);
      await fermerPanneaux();   // une modale peut en cacher une autre

      const lus = await page.evaluate(() => {
        const vus = new Set();
        for (const e of document.querySelectorAll('#video-title, a#video-title, #entity-title')) {
          const t = (e.textContent || '').replace(/\s+/g, ' ').trim();
          if (t) vus.add(t);
        }
        return [...vus];
      });
      const vide = await page
        .locator('text=/Aucun contenu disponible|No content available/i')
        .first().isVisible().catch(() => false);

      console.log(`  ${nom} : ${lus.length} titre(s)${vide ? ' — état vide confirmé' : ''}`);
      for (const t of lus) titres.push(`${nom} · ${t}`);
      if (!lus.length && !vide) videExplicite = false;
      await page.screenshot({ path: path.join(SORTIE, `yt-onglet-${route.split('/')[1]}.png`) }).catch(() => {});
    }


    /* « Vide » et « pas lu » ne sont pas la meme chose, et les confondre est
       exactement ce qui mene a republier. Studio affiche un etat vide explicite :
       tant qu'on ne le voit pas, on refuse de conclure. */
    if (!titres.length && videExplicite) {
      console.log('Chaîne VIDE sur les deux onglets — état vide confirmé par Studio.');
      if (TITRE) console.log(`Titre libre : « ${TITRE} »`);
      await ctx.close(); return;
    }
    if (!titres.length) {
      console.log('Aucune vidéo lue, ET pas d état vide affiché : lecture non concluante.');
      console.log('Relis les captures avant de conclure quoi que ce soit :');
      console.log('  ' + path.join(SORTIE, 'yt-onglet-*.png'));
      await ctx.close(); process.exit(4);
    }

    console.log(`${titres.length} vidéo(s) déjà en ligne :\n`);
    titres.forEach((t, i) => console.log(`  [${i}] ${t}`));

    if (TITRE) {
      const cible = normaliser(TITRE);
      const collision = titres.find((t) => {
        const n = normaliser(t);
        return n === cible || n.includes(cible) || cible.includes(n);
      });
      console.log('');
      if (collision) {
        console.log(`DÉJÀ PUBLIÉ — « ${collision} »`);
        console.log('Ne pas republier. Changer de sujet, ou changer d angle.');
        await ctx.close(); process.exit(3);
      }
      console.log(`Titre libre : « ${TITRE} »`);
    }
    await ctx.close();
  } catch (e) {
    console.error('Échec : ' + e.message.split('\n')[0]);
    await page.screenshot({ path: path.join(SORTIE, 'yt-erreur.png') }).catch(() => {});
    await ctx.close().catch(() => {});
    process.exitCode = 1;
  }
})();
