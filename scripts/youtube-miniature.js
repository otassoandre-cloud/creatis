#!/usr/bin/env node
/**
 * Pose une miniature personnalisée sur une vidéo YouTube.
 *
 *   node scripts/youtube-miniature.js --video <id> --image <chemin>
 *   node scripts/youtube-miniature.js --derniere --image <chemin>
 *
 * ── POURQUOI ─────────────────────────────────────────────────────────────
 * Sans miniature, YouTube prélève une image au hasard dans la vidéo. Sur nos
 * films, ça tombe sur un plan sombre ou sur du texte en cours de fondu : la
 * vignette ne dit rien. Relevé le 01/10 sur le tableau de bord — trois vidéos,
 * trois vignettes noires, 2 à 8 vues chacune.
 *
 * La miniature se fabrique avec la composition `Miniature` :
 *   npx remotion still Miniature out/mini.png
 *
 * ── CE QUE YOUTUBE EXIGE ─────────────────────────────────────────────────
 * 1280x720 au minimum, moins de 2 Mo, et un compte VÉRIFIÉ.
 *
 * ── ÉTAT AU 01/10 : LE DÉPÔT AUTOMATIQUE NE PASSE PAS ────────────────────
 * Le champ existe et n'est PAS désactivé — sondé : `input#file-loader` dans
 * `YTCP-THUMBNAIL-UPLOADER`, `disabled: false`, accepte jpeg et png. Mais
 * `setInputFiles` ne déclenche pas le traitement de Studio : le champ reste
 * vide et « Enregistrer » grisé.
 *
 * La fiche affiche par ailleurs « Pour rendre les liens externes cliquables,
 * vous devez d'abord effectuer une validation unique » — la chaîne n'est donc
 * pas validée, et la miniature personnalisée dépend de cette même validation.
 * C'est l'explication la plus probable, mais elle n'est PAS prouvée : le champ
 * n'est pas marqué désactivé, ce qu'on attendrait s'il était bloqué.
 *
 * En attendant : la miniature se fabrique avec `npx remotion still Miniature`
 * et se dépose à la main en dix secondes dans Studio. Le script refuse
 * d'annoncer un succès qu'il n'a pas obtenu — un premier jet l'avait fait.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const PROFIL = path.join(RACINE, '.playwright-profile-social');
const SORTIE = process.env.SCRATCH || path.join(RACINE, '.scratch-social');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const VIDEO = arg('video', '');
const IMAGE = arg('image', '');
const derniere = process.argv.includes('--derniere');

(async () => {
  if (!IMAGE || !fs.existsSync(IMAGE)) {
    console.error('Image introuvable : ' + IMAGE);
    process.exit(1);
  }
  const taille = fs.statSync(IMAGE).size;
  if (taille > 2 * 1024 * 1024) {
    console.error(`L image fait ${(taille / 1048576).toFixed(1)} Mo — YouTube plafonne à 2 Mo.`);
    console.error('La recompresser avant de réessayer.');
    process.exit(1);
  }
  if (!VIDEO && !derniere) {
    console.error('Indiquer --video <id> ou --derniere');
    process.exit(1);
  }
  fs.mkdirSync(SORTIE, { recursive: true });

  const { chromium } = require('playwright');
  const ctx = await chromium.launchPersistentContext(PROFIL, {
    channel: 'chrome', headless: false, viewport: { width: 1500, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
  }).catch((e) => { console.error(e.message.split('\n')[0]); process.exit(1); });

  await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  const page = await ctx.newPage();
  const shot = async (n) => {
    const f = path.join(SORTIE, `yt-mini-${n}.png`);
    await page.screenshot({ path: f }).catch(() => {});
    console.log('   capture : ' + f);
  };

  /* Studio empile ses panneaux d'accueil. Même boucle qu'ailleurs : on ferme
     jusqu'à ce qu'un tour complet ne ferme plus rien. Volontairement SANS
     « Ignorer », qui appartient au bandeau d'avertissement de la chaîne. */
  const fermerPanneaux = async () => {
    for (let t = 0; t < 6; t++) {
      let ferme = false;
      for (const l of ['Continuer', 'Fermer', "J'ai compris", 'Got it', 'Plus tard']) {
        const b = page.locator(`tp-yt-paper-button:has-text("${l}"), ytcp-button:has-text("${l}"), button:has-text("${l}")`).first();
        if (await b.isVisible().catch(() => false)) {
          await b.click({ timeout: 4000 }).catch(() => {});
          ferme = true;
          await page.waitForTimeout(1100);
        }
      }
      if (!ferme) return;
    }
  };

  try {
    let id = VIDEO;

    if (derniere) {
      console.log('· recherche de la dernière vidéo');
      await page.goto('https://studio.youtube.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(7000);
      await fermerPanneaux();
      const canal = page.url().match(/channel\/([^/]+)/);
      if (!canal) throw new Error('identifiant de chaîne introuvable');
      await page.goto(`https://studio.youtube.com/channel/${canal[1]}/videos/upload`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(8000);
      await fermerPanneaux();
      id = await page.evaluate(() => {
        const a = document.querySelector('a#video-title, a[href*="/video/"]');
        const h = a?.getAttribute('href') || '';
        return (h.match(/\/video\/([^/]+)/) || [])[1] || '';
      }).catch(() => '');
      if (!id) { await shot('sans-video'); throw new Error('aucune vidéo trouvée en tête de liste'); }
      console.log('  dernière vidéo : ' + id);
    }

    console.log('· ouverture de la fiche');
    await page.goto(`https://studio.youtube.com/video/${id}/edit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(9000);
    await fermerPanneaux();

    /* ── LE BOUTON OUVRE UN SÉLECTEUR NATIF ──────────────────────────────
       Un premier jet remplissait le premier `input[type=file]` de la page et
       annonçait « miniature posée ». Vérification sur la capture : le champ
       « Importer un fichier » était resté vide et « Enregistrer » grisé. Studio
       n'expose pas d'input accessible pour la miniature — il ouvre la boîte de
       dialogue du système.
       On intercepte donc l'événement `filechooser`, qui est la seule façon de
       répondre à une boîte native. */
    /* ── LE CHAMP EXISTE, IL EST UNIQUE ET IL EST CACHÉ ──────────────────
       Sondé sur la fiche : un seul `input[type=file]`, `#file-loader`, dans
       `YTCP-THUMBNAIL-UPLOADER`, qui accepte image/jpeg et image/png.
       `setInputFiles` n'a pas besoin qu'il soit visible.

       Deux fausses pistes avant d'y arriver, qui valent d'être notées :
       · Le premier essai a echoué « champ introuvable » — mais la page était
         en erreur (« Petit problème »), parce que l'identifiant de la vidéo
         avait été recopié depuis la fenêtre de partage où le L minuscule de
         `lrSbjOYJrpo` se lit comme un i majuscule. Toujours prendre
         l'identifiant depuis l'URL, jamais depuis un texte affiché.
       · Le deuxième a cru passer par le sélecteur de fichier natif. Il n'y en
         a pas : Studio utilise bien un input, simplement caché. */
    console.log('· dépôt de la miniature');
    const champ = page.locator('ytcp-thumbnail-uploader input[type="file"], input#file-loader').first();
    if (!(await champ.count())) {
      await shot('sans-champ');
      console.error('Champ de miniature absent. Causes possibles :');
      console.error('  · la fiche n a pas fini de charger, ou elle est en erreur ;');
      console.error('  · le compte n est pas VÉRIFIÉ — la miniature personnalisée y est liée.');
      throw new Error('champ de miniature introuvable');
    }
    await champ.setInputFiles(path.resolve(IMAGE));
    await page.waitForTimeout(9000);
    await shot('posee');

    /* On EXIGE la preuve : le bouton « Enregistrer » ne devient actif que si
       quelque chose a changé. S'il reste grisé, rien n'a été déposé, et
       annoncer un succès serait un mensonge — c'est exactement ce que le
       premier jet a fait. */
    const actif = await page.evaluate(() => {
      const b = document.querySelector('ytcp-button#save, #save');
      if (!b) return false;
      const d = b.getAttribute('disabled');
      return d === null || d === 'false';
    }).catch(() => false);
    if (!actif) {
      await shot('rien-depose');
      throw new Error('« Enregistrer » est resté grisé : la miniature n a PAS été déposée');
    }

    console.log('· enregistrement');
    const enreg = page.locator('ytcp-button#save, #save button, ytcp-button:has-text("Enregistrer")').first();
    if (!(await enreg.isVisible().catch(() => false))) {
      await shot('sans-enregistrer');
      throw new Error('bouton « Enregistrer » introuvable');
    }
    await enreg.click({ timeout: 8000 });
    await page.waitForTimeout(9000);
    await shot('apres-enregistrement');
    console.log('');
    console.log('Miniature posée — VÉRIFIER la capture avant de conclure.');
  } catch (e) {
    console.error('Échec : ' + e.message.split('\n')[0]);
    await shot('erreur');
    process.exitCode = 1;
  } finally {
    await ctx.close().catch(() => {});
  }
})();
