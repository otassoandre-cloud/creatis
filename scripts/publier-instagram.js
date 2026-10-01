#!/usr/bin/env node
/**
 * Publie un Reel sur Instagram depuis la session ouverte dans TON Chrome.
 *
 *   node scripts/publier-instagram.js --cdp --video <chemin> --legende-fichier <f>
 *   ... --publier        pour envoyer pour de bon
 *
 * SANS `--publier`, le script va jusqu'à la légende saisie et S'ARRÊTE, captures
 * à l'appui. Rien n'est envoyé.
 *
 * ── POURQUOI --cdp ───────────────────────────────────────────────────────
 * Meta refuse la connexion dans un navigateur piloté (« navigateur non
 * sécurisé ») : la session ne peut PAS vivre dans .playwright-profile-social.
 * Elle a été ouverte à la main dans un Chrome lancé avec
 * --remote-debugging-port=9222, et ce script s'y rattache. On ne ferme jamais
 * ce navigateur en sortant : il appartient à l'utilisateur.
 *
 * ── LE FLUX INSTAGRAM, ET LÀ OÙ IL CASSE ─────────────────────────────────
 * Créer → (parfois un menu Publication/Story/Reel) → « Sélectionner sur
 * l'ordinateur » → recadrage → filtres → légende → Partager. Deux pièges :
 *
 *  · Pour une vidéo, Instagram intercale « Les vidéos sont désormais partagées
 *    en tant que reels », avec un bouton à valider. Sans ça, plus rien ne bouge.
 *  · Les libellés des boutons « Suivant » / « Partager » sont des <div
 *    role="button">, pas des <button>. Un sélecteur `button:has-text()` ne les
 *    trouve jamais — le script semble alors bloqué sans erreur.
 *
 * ── ET LE COMPTE EST LU AVANT ────────────────────────────────────────────
 * Le 27/09, deux vidéos identiques sont parties sur TikTok faute d'avoir
 * regardé le compte. Lancer `instagram-deja-publie.js` AVANT celui-ci.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const PROFIL = path.join(RACINE, '.playwright-profile-social');
const SORTIE = process.env.SCRATCH || path.join(RACINE, '.scratch-social');

const cdp = process.argv.includes('--cdp');
const publier = process.argv.includes('--publier');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };

const VIDEO = arg('video', '');
const LEGENDE = process.argv.includes('--legende-fichier')
  ? fs.readFileSync(arg('legende-fichier', ''), 'utf8').trim()
  : arg('legende', '');

/**
 * Instagram n'a aucune convention de balise pour ses actions : « Suivant » est
 * un <div role="button">, mais l'entree « Publication » du menu Creer n'a NI
 * role NI balise bouton — un premier essai l'a manquee alors qu'elle etait
 * affichee a l'ecran, et le script a echoue vingt secondes plus loin sur
 * l'absence du champ de fichier, tres loin de la vraie cause.
 *
 * On essaie donc plusieurs formes, de la plus precise a la plus large, et on
 * exige un texte EXACT : `has-text` est une sous-chaine, et « Publication »
 * apparait aussi dans « Publications » ou dans des libelles d'aide.
 */
const STRATEGIES = [
  (l) => `[role="button"]:text-is("${l}")`,
  (l) => `[role="menuitem"]:text-is("${l}")`,
  (l) => `button:text-is("${l}")`,
  (l) => `a:text-is("${l}")`,
  (l) => `span:text-is("${l}")`,
  (l) => `div:text-is("${l}")`,
];

(async () => {
  if (!VIDEO || !fs.existsSync(VIDEO)) {
    console.error('Vidéo introuvable : ' + VIDEO);
    process.exit(1);
  }
  fs.mkdirSync(SORTIE, { recursive: true });

  const { chromium } = require('playwright');
  let ctx;
  if (cdp) {
    const nav = await chromium.connectOverCDP('http://localhost:9222').catch(() => null);
    if (!nav) {
      console.error('Aucun Chrome à écouter sur le port 9222.');
      process.exit(1);
    }
    ctx = nav.contexts()[0];
  } else {
    console.warn('Sans --cdp, la session Instagram a peu de chances d exister dans ce profil.');
    ctx = await chromium.launchPersistentContext(PROFIL, {
      channel: 'chrome', headless: false, viewport: null,
      args: ['--disable-blink-features=AutomationControlled'],
      ignoreDefaultArgs: ['--enable-automation'],
    }).catch((e) => { console.error(e.message.split('\n')[0]); process.exit(1); });
  }

  const page = await ctx.newPage();
  const shot = async (n) => {
    const f = path.join(SORTIE, `ig-${n}.png`);
    await page.screenshot({ path: f }).catch(() => {});
    console.log('   capture : ' + f);
  };

  /**
   * Clique le premier libellé trouvé, en essayant chaque forme de balise.
   * On réessaie pendant quelques secondes : les panneaux d'Instagram
   * s'affichent avec un délai, et un unique coup d'œil rate régulièrement un
   * bouton pourtant présent une demi-seconde plus tard.
   */
  const cliquer = async (libelles, quoi, obligatoire = false, secondes = 8) => {
    const limite = Date.now() + secondes * 1000;
    while (Date.now() < limite) {
      for (const l of libelles) {
        for (const forme of STRATEGIES) {
          const b = page.locator(forme(l)).last();
          if (await b.isVisible().catch(() => false)) {
            await b.click({ timeout: 6000 }).catch(() => {});
            console.log(`  ${quoi} : « ${l} »`);
            await page.waitForTimeout(2200);
            return true;
          }
        }
      }
      await page.waitForTimeout(600);
    }
    if (obligatoire) throw new Error(`${quoi} introuvable (${libelles.join(' / ')})`);
    console.log(`  ${quoi} : rien à cliquer (facultatif)`);
    return false;
  };

  try {
    console.log('· ouverture');
    await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(6000);

    /* Marqueur POSITIF de session, jamais l'absence de bouton « Se connecter » :
       une page blanche n'en contient pas non plus. */
    const connecte = await page
      .locator('a[href="/direct/inbox/"], svg[aria-label="Nouvelle publication"], svg[aria-label="New post"]')
      .first().isVisible().catch(() => false);
    if (!connecte) {
      console.error('Session Instagram non prouvée — ouvrir la capture.');
      await shot('deconnecte');
      process.exit(2);
    }

    console.log('· création');
    const plus = page.locator(
      'svg[aria-label="Nouvelle publication"], svg[aria-label="New post"], a[href="#"]:has(svg[aria-label="Nouvelle publication"])',
    ).first();
    await plus.click({ timeout: 10000 });
    await page.waitForTimeout(2500);
    /* Le menu Créer s'ouvre avec Publication / Story / Reel / Direct selon le
       compte. Obligatoire : sans lui la boîte de dépôt ne s'ouvre jamais, et
       l'échec se manifeste bien plus loin, sur l'absence du champ de fichier. */
    await cliquer(['Publication', 'Post', 'Reel'], 'menu Créer', true, 12);

    console.log('· dépôt du fichier');
    const champ = page.locator('input[type="file"]').last();
    await champ.waitFor({ state: 'attached', timeout: 20000 });
    await champ.setInputFiles(path.resolve(VIDEO));
    await page.waitForTimeout(9000);
    /* L'avis « Les vidéos sont désormais partagées en tant que reels » se ferme
       par OK. On ne propose PAS « Suivant » ici : ce bouton appartient à l'écran
       de recadrage qui suit, et le cliquer à l'aveugle est exactement la faute
       décrite ci-dessous. */
    await cliquer(['OK', "J'ai compris", 'Got it'], 'avis vidéo', false, 5);

    /* ── LE RECADRAGE : NE JAMAIS LE TRAVERSER À L'AVEUGLE ────────────────
       Le flux « Publication » impose une étape de recadrage dont le défaut est
       CARRÉ. Un 1080x1920 y perd le haut et le bas.
       Le 28/09 la première publication est partie comme ça : le titre
       « L'IA met une note à chaque clip » a été coupé en deux, sur une vidéo
       dont le sujet était précisément ce titre. Rien dans les journaux ne le
       signalait — le script avait « réussi ».
       On sélectionne donc explicitement « Original ». Si le sélecteur est
       introuvable, on S'ARRÊTE : publier au mauvais format est pire que ne pas
       publier, parce que ça se voit et que ça ne se corrige qu'en supprimant. */
    console.log('· format d origine');
    /* « Sélectionner un format », relevé en listant les aria-label de l'écran.
       Attention au piège : « Rogner » est le TITRE de la fenêtre, pas le bouton
       — s'y fier ouvrait un clic dans le vide. On remonte au bouton qui porte
       l'icône, celle-ci n'étant pas toujours cliquable elle-même. */
    const FORMAT = 'svg[aria-label="Sélectionner un format"], svg[aria-label="Select crop"]';
    const selecteurRecadrage = page.locator(
      `button:has(${FORMAT}), [role="button"]:has(${FORMAT}), ${FORMAT}`,
    ).first();
    if (await selecteurRecadrage.isVisible().catch(() => false)) {
      await selecteurRecadrage.click({ timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const pris = await cliquer(['Original', '9:16'], 'format', false, 6);
      if (!pris) {
        await shot('recadrage-sans-original');
        throw new Error('« Original » introuvable dans le menu de recadrage');
      }
      await page.waitForTimeout(1500);
    } else {
      await shot('recadrage-introuvable');
      /* Dire CE QU'ON VOIT plutôt que de laisser deviner. Les libellés d'accès
         d'Instagram changent avec la langue et les versions ; un sélecteur en
         dur périme sans prévenir, et l'erreur seule n'aide pas à le réparer. */
      const vus = await page.evaluate(() =>
        [...document.querySelectorAll('[aria-label]')]
          .filter((e) => e.getBoundingClientRect().width > 0)
          .map((e) => e.getAttribute('aria-label'))
          .filter((v, i, t) => v && t.indexOf(v) === i)
          .slice(0, 40),
      ).catch(() => []);
      console.error('Libellés visibles sur cet écran :');
      for (const v of vus) console.error('   · ' + v);
      throw new Error('sélecteur de recadrage introuvable — on ne publie pas sans avoir choisi le format');
    }
    await shot('apres-depot');

    /* ── NE PAS COMPTER LES ÉTAPES ───────────────────────────────────────
       Le nombre d'écrans avant la légende VARIE. Un passage a vu
       « avis vidéo » puis recadrage puis filtres ; le suivant a servi le même
       bouton « Suivant » pour l'avis, et il n'est resté qu'un écran. Un script
       qui clique deux fois « Suivant » réussit dans un cas et échoue dans
       l'autre, sur une erreur qui ne dit rien de la cause.
       On avance donc jusqu'à voir la LÉGENDE, qui est la seule fin certaine. */
    console.log('· avance jusqu à la légende');
    const zoneLegende = () => page.locator(
      'div[aria-label="Ajoutez une légende..."], div[aria-label*="égende"], textarea[aria-label*="égende"], div[aria-label*="aption"]',
    ).first();

    let atteinte = false;
    for (let tour = 0; tour < 6; tour++) {
      if (await zoneLegende().isVisible().catch(() => false)) { atteinte = true; break; }
      const avance = await cliquer(['Suivant', 'Next'], `écran ${tour + 1}`, false, 6);
      if (!avance) break;
      await page.waitForTimeout(2500);
    }
    if (!atteinte && !(await zoneLegende().isVisible().catch(() => false))) {
      throw new Error('écran de légende jamais atteint');
    }
    await shot('avant-legende');

    if (LEGENDE) {
      console.log('· légende');
      const zone = zoneLegende();
      if (await zone.isVisible().catch(() => false)) {
        await zone.click();
        await page.keyboard.type(LEGENDE, { delay: 6 });
        await page.waitForTimeout(1500);
      } else {
        console.warn('  zone de légende introuvable — la vidéo est déposée, la légende non.');
      }
    }
    await shot('pret');

    if (!publier) {
      console.log('');
      console.log('FORMULAIRE PRÊT — rien n\'a été publié.');
      console.log('Relis les captures. Pour envoyer : ajouter --publier');
      /* On NE bloque pas dix minutes : les captures suffisent a juger, et une
         fenetre laissee ouverte verrouille l'onglet pour la suite. */
      await page.waitForTimeout(3000);
      return;
    }

    /* Vérifier que la légende est vraiment DANS LE CHAMP — un contenteditable
       accepte le clic sans prendre le focus, et on publierait alors à vide.
       On lit le champ lui-même, et non le compteur de caractères : un premier
       essai lisait « 528/2 200 » au motif `\d+/2\s?200` et échouait malgré
       une légende correctement saisie. L'espace y est une espace fine
       insécable, et la valeur affichée dépend de la langue de l'interface.
       Le contenu du champ, lui, ne dépend de rien. */
    if (LEGENDE) {
      const saisi = (await zoneLegende().innerText().catch(() => '')).trim();
      const attendu = Math.min(40, Math.floor(LEGENDE.length * 0.5));
      if (saisi.length < attendu) {
        throw new Error(`légende non saisie (${saisi.length} caractères lus) — on ne publie pas sans texte`);
      }
      console.log(`  légende vérifiée : ${saisi.length} caractères dans le champ`);
    }

    console.log('· partage');
    await cliquer(['Partager', 'Share'], 'partage', true);
    await page.waitForTimeout(20000);
    await shot('apres-partage');
    const confirme = await page
      .locator('text=/Votre publication a été partagée|Your post has been shared|Reel partagé/i')
      .first().isVisible().catch(() => false);
    console.log('');
    console.log(confirme
      ? 'Partagé — confirmation affichée par Instagram.'
      : 'Envoyé, MAIS aucune confirmation lue : vérifier la capture et le compte avant de relancer.');
  } catch (e) {
    console.error('Échec : ' + e.message.split('\n')[0]);
    await shot('erreur');
    console.error('NE PAS relancer sans avoir verifie le compte : un essai « echoue » peut etre parti.');
    process.exitCode = 1;
  } finally {
    await page.close().catch(() => {});
    // Jamais de fermeture du navigateur en CDP : c'est celui de l'utilisateur.
    if (cdp) process.exit(process.exitCode || 0);
    await ctx.close().catch(() => {});
  }
})();
