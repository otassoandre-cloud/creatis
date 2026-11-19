/**
 * B-ROLL — de l'image lumineuse et rapide, qui manquait cruellement.
 *
 *   node enregistrer-broll.mjs <id-youtube> <seconde-de-depart> <duree> <nom>
 *
 * ── POURQUOI ─────────────────────────────────────────────────────────────
 * Le kit visuel du 09/10 a supprimé les diaporamas, mais toute notre matière
 * est SOMBRE : les clips sont tournés en intérieur, l'application a un thème
 * noir, et la page Whop devient un gris mou dès qu'on la floute. Résultat :
 * plus de diapositives, mais toujours un film terne.
 *
 * Les vidéos sources, elles, sont lumineuses, colorées et montées serré.
 * C'est exactement ce qui manque, c'est gratuit, et c'est le matériau dont
 * on parle de toute façon dans nos tutoriels.
 *
 * ── LA PAGE EN PLEIN ÉCRAN, PAS L'EMBED ──────────────────────────────────
 * Premier essai avec `/embed/<id>` : « Erreur de configuration du lecteur
 * vidéo » pendant quarante-cinq secondes. YouTube refuse l'embed servi sans
 * origine légitime.
 *
 * On prend donc la page `/watch` et on passe le lecteur en PLEIN ÉCRAN
 * (touche `f`) : l'image remplit la fenêtre, l'interface disparaît, et la
 * barre de lecture s'efface d'elle-même quand la souris ne bouge plus.
 *
 * ── CE QU'ON EN FAIT, ET CE QU'ON N'EN FAIT PAS ──────────────────────────
 * Des plans de quelques secondes, en appui d'un propos sur le clipping — le
 * même usage que les extraits déjà montrés dans nos films. On ne republie pas
 * la vidéo de quelqu'un d'autre : on illustre, brièvement, un sujet qui parle
 * précisément de découper ces vidéos-là.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ID = process.argv[2];
const DEPART = Number(process.argv[3] || 60);
const DUREE = Number(process.argv[4] || 40);
const NOM = process.argv[5] || `broll-${ID}`;
const SORTIE = path.resolve("public");

if (!ID) {
  console.error("Usage : node enregistrer-broll.mjs <id> [depart] [duree] [nom]");
  process.exit(2);
}

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
let CADRE = null;
const PUBS = [];
let PLAGES = [];

/* ── POURQUOI LE PROFIL CONNECTÉ ─────────────────────────────────────────
   Un contexte neuf déclenche le mur « Avant d'accéder à YouTube » en plein
   milieu du tournage — il s'est retrouvé dans deux plans sur six. Le profil
   social a déjà accepté, et il reste connecté : plus de mur.
   Le verrou de profil s'applique : un seul travail Playwright à la fois. */
const PROFIL = path.resolve("..", ".playwright-profile-social");
const ctx = await chromium.launchPersistentContext(PROFIL, {
  channel: "chrome",
  headless: false,
  viewport: { width: 1920, height: 1080 },
  locale: "fr-FR",
  args: ["--hide-scrollbars", "--autoplay-policy=no-user-gesture-required"],
  recordVideo: { dir: SORTIE, size: { width: 1920, height: 1080 } },
});
const page = ctx.pages()[0] || (await ctx.newPage());

try {
  /* `mute=1` est obligatoire : sans lui, la lecture automatique est refusée
     et on filmerait une image fixe pendant quarante secondes. */
  await page.goto(`https://www.youtube.com/watch?v=${ID}&t=${Math.round(DEPART)}s`, {
    waitUntil: "domcontentloaded", timeout: 80000,
  });
  await attendre(6000);

  for (const l of ["Tout accepter", "Accept all"]) {
    const b = page.locator(`button:has-text("${l}")`).first();
    if (await b.isVisible().catch(() => false)) {
      await b.click({ timeout: 5000 }).catch(() => {});
      await attendre(3000);
    }
  }

  /* On lance la lecture à la main si l'autoplay n'a pas pris, et on vérifie
     qu'elle AVANCE : filmer un lecteur en pause est l'erreur du 08/10. */
  await page.evaluate((d) => {
    const v = document.querySelector("video");
    if (v) {
      v.muted = true;
      if (d > 0 && Math.abs(v.currentTime - d) > 5) v.currentTime = d;
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    }
  }, DEPART).catch(() => {});
  await attendre(3500);

  /* ── LAISSER PASSER LA PUBLICITÉ ─────────────────────────────────────
     Premier essai : trois plans sur cinq montraient une publicité E.Leclerc.
     Le lecteur porte la classe `ad-showing` pendant une annonce — on attend
     qu'elle tombe, et on clique « Ignorer » dès qu'il apparaît. */
  for (let k = 0; k < 40; k++) {
    const pub = await page.evaluate(() => {
      const p = document.querySelector("#movie_player");
      return !!(p && p.classList.contains("ad-showing"));
    }).catch(() => false);
    if (!pub) break;
    const ignorer = page.locator('button:has-text("Ignorer"), .ytp-skip-ad-button, .ytp-ad-skip-button').first();
    if (await ignorer.isVisible().catch(() => false)) {
      await ignorer.click({ timeout: 3000 }).catch(() => {});
    }
    await attendre(1500);
  }
  console.log("  plus de publicité");

  /* On se place APRÈS la pub, sinon le saut initial a été écrasé. */
  await page.evaluate((d) => {
    const v = document.querySelector("video");
    if (v) {
      v.muted = true;
      if (d > 0) v.currentTime = d;
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    }
  }, DEPART).catch(() => {});
  await attendre(3000);

  /* ── ON NE COMPTE PLUS SUR LE PLEIN ÉCRAN ───────────────────────────
     La touche `f` n'a pas tenu : la capture montrait encore la page. On lit
     donc la BOÎTE RÉELLE du lecteur et on recadrera dessus au ffmpeg — ce
     qui est exact, et ne dépend d'aucun raccourci clavier. */
  const boite = await page.evaluate(() => {
    const v = document.querySelector("video");
    if (!v) return null;
    const r = v.getBoundingClientRect();
    return {
      x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)),
      l: Math.round(r.width), h: Math.round(r.height),
    };
  }).catch(() => null);
  if (boite) console.log(`  lecteur : ${boite.l}×${boite.h} en (${boite.x}, ${boite.y})`);
  CADRE = boite;

  /* La souris reste hors du lecteur : le moindre mouvement rappelle la barre
     de contrôle, qui se verrait dans le B-roll. */
  await page.mouse.move(1910, 10);
  console.log(`· on filme ${DUREE} s`);

  /* ── LES PUBLICITÉS REVIENNENT EN COURS DE ROUTE ─────────────────────
     Attendre la fin de la pré-roll ne suffit pas : une coupure publicitaire
     tombe au milieu, et trois plans sur cinq montraient du Guigoz. On relève
     donc les fenêtres de publicité PENDANT le tournage, comme on relève les
     écrans d'attente de l'application, et on ne gardera que les plages
     propres au montage. */
  const T0 = Date.now();
  let ouverte = null;
  const echantillon = async () => {
    const pub = await page.evaluate(() => {
      const p = document.querySelector("#movie_player");
      return !!(p && p.classList.contains("ad-showing"));
    }).catch(() => false);
    const t = Math.round((Date.now() - T0) / 100) / 10;
    if (pub && ouverte === null) ouverte = t;
    else if (!pub && ouverte !== null) {
      if (t - ouverte >= 0.5) PUBS.push([ouverte, t]);
      ouverte = null;
    }
  };
  const batteur = setInterval(() => { echantillon().catch(() => {}); }, 500);
  await attendre(DUREE * 1000);
  clearInterval(batteur);
  if (ouverte !== null) PUBS.push([ouverte, Math.round((Date.now() - T0) / 100) / 10]);

  const propres = [];
  let curseur = 0;
  for (const [a, b] of PUBS) {
    if (a - curseur >= 3) propres.push([curseur, a]);
    curseur = b;
  }
  if (DUREE - curseur >= 3) propres.push([curseur, DUREE]);
  PLAGES = propres;
  console.log(`  ${PUBS.length} fenêtre(s) de publicité, ${propres.length} plage(s) propre(s)`);
  for (const [a, b] of propres) console.log(`    propre : ${a} → ${b} s (${(b - a).toFixed(1)} s)`);
} catch (e) {
  console.error("ÉCHEC :", e.message);
} finally {
  const video = page.video();
  await ctx.close();
  if (video) {
    const brut = await video.path();
    const cible = path.join(SORTIE, `${NOM}.webm`);
    fs.renameSync(brut, cible);
    console.log(`Vidéo : ${cible}`);
    if (CADRE) {
      fs.writeFileSync(
        path.join(SORTIE, `${NOM}-cadre.json`),
        JSON.stringify({ cadre: CADRE, pubs: PUBS, plages: PLAGES }, null, 2),
      );
      console.log(`Cadre : public/${NOM}-cadre.json — recadrer avec`);
      console.log(`  ffmpeg -i ${NOM}.webm -vf "crop=${CADRE.l}:${CADRE.h}:${CADRE.x}:${CADRE.y}" …`);
    }
  }
}
