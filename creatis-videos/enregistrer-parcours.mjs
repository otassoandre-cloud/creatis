/**
 * ENREGISTREMENT DU PARCOURS PRODUIT — produit `public/parcours.mp4`.
 *
 * C'est la source de la composition `Parcours` : le trajet complet filmé dans la
 * vraie application — lien collé, analyse, les 10 clips générés, le clic sur
 * l'un d'eux. La première version de cet enregistrement avait été faite par un
 * script jetable qui n'a pas été conservé ; il a fallu tout réécrire. Celui-ci
 * vit donc dans le dépôt.
 *
 * ── POURQUOI ON NE SIMULE PAS ─────────────────────────────────────────────
 * Tout ce que montre cette vidéo doit être réel, y compris la correspondance
 * entre les vignettes de la grille et le clip montré à la fin : ce sont les
 * sorties d'UNE MÊME génération. Intercepter les réponses de l'API pour aller
 * plus vite fabriquerait une démonstration qui ne prouve rien.
 *
 * D'où la connexion à un vrai compte. Le mot de passe n'est jamais écrit ici :
 * il est lu dans l'environnement, et reste chez celui qui lance le script.
 *
 *   CREATIS_EMAIL="..." CREATIS_MDP="..." node enregistrer-parcours.mjs <url>
 *
 * ── CE QU'IL FAUT SAVOIR AVANT DE LANCER ──────────────────────────────────
 * · Le compte doit pouvoir lancer une analyse (une analyse est consommée).
 * · Le client sonde la transcription pendant 15 minutes au maximum
 *   (`_pollTranscribeJob`). Mesuré : 8 min de source -> « 10 clips prêts » en
 *   100 s. Une source de 55 min projette ~11-12 min : ça tient, sans marge.
 *   Au-delà, prendre une vidéo plus courte plutôt que d'espérer.
 * · La fenêtre est en 1080x1920 : on filme déjà au format de sortie, ce qui
 *   évite un recadrage au montage.
 */
import { chromium, devices } from "playwright";
import fs from "fs";
import path from "path";

const URL_VIDEO = process.argv[2];
const EMAIL = process.env.CREATIS_EMAIL;
const MDP = process.env.CREATIS_MDP;
const SORTIE = path.resolve("public");
const SITE = process.env.CREATIS_URL || "https://creatis.app";

if (!URL_VIDEO || !EMAIL || !MDP) {
  console.error(
    "Usage : CREATIS_EMAIL=... CREATIS_MDP=... node enregistrer-parcours.mjs <url-youtube>",
  );
  process.exit(1);
}

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

/* TELEPHONE PAR DEFAUT.
 *
 * La premiere version filmait en 1080x1920 — un format vertical, mais une
 * LARGEUR de 1080 CSS : le site servait donc sa disposition de bureau, six
 * vignettes par rangee. Reduite dans l'encart de 480 px de la composition, la
 * grille devenait illisible : on distinguait des rectangles, pas des clips.
 *
 * Le site bascule en deux colonnes sous 600 px (`@media (max-width: 600px)`).
 * On filme donc un vrai telephone, ce qui donne exactement ce qu'un spectateur
 * de TikTok reconnait : son propre ecran.
 *
 * LA TAILLE N'EST PAS ARBITRAIRE. `recordVideo.size` plus grand que le viewport
 * ne l'agrandit pas : Playwright pose la page dans le coin et REMPLIT le reste
 * de gris. Un premier essai en 390x664 capture dans un cadre de 780x1328 a donne
 * une video au tiers utile. On filme donc a la taille EXACTE de l'encart de la
 * composition — 480 px de large — pour que le montage n'ait rien a redimensionner.
 *
 * 480 reste sous le seuil de 600 px du site, donc la mise en page telephone
 * s'applique bien (`@media (max-width: 600px)`, grille a deux colonnes).
 *
 * Passer BUREAU=1 revient a l'ancien cadrage si besoin de comparer. */
const BUREAU = process.env.BUREAU === "1";
const tel = devices["iPhone 13"];
const ctx = await (await chromium.launch({ headless: true })).newContext(
  BUREAU
    ? {
        viewport: { width: 1080, height: 1920 },
        deviceScaleFactor: 1,
        recordVideo: { dir: SORTIE, size: { width: 1080, height: 1920 } },
      }
    : {
        ...tel,
        viewport: { width: 480, height: 817 },
        deviceScaleFactor: 2,
        recordVideo: { dir: SORTIE, size: { width: 480, height: 817 } },
      },
);
const nav = ctx.browser();
const page = await ctx.newPage();
page.on("console", (m) => {
  if (m.type() === "error") console.log("  [page]", m.text().slice(0, 140));
});

try {
  // ── Connexion ───────────────────────────────────────────────────────────
  console.log("· connexion");
  await page.goto(`${SITE}/auth.html`, { waitUntil: "domcontentloaded" });
  /* La page ouvre en mode INSCRIPTION. Soumettre un email déjà existant renvoie
     un 422 de Supabase et la navigation n'a jamais lieu — c'est exactement ce
     qui a fait échouer le premier essai. On bascule d'abord en connexion. */
  await page.click("#toggle-btn");
  await page.waitForFunction(
    () => document.getElementById("btn-submit-texte")?.textContent?.includes("connecter"),
    { timeout: 10000 },
  );
  await page.fill("#auth-email", EMAIL);
  await page.fill("#auth-password", MDP);
  await page.click("#btn-submit");
  await page.waitForURL((u) => !u.pathname.includes("auth.html"), { timeout: 60000 });
  console.log("  connecté :", page.url());

  // ── Le parcours filmé ───────────────────────────────────────────────────
  await page.goto(`${SITE}/clips-v2.html`, { waitUntil: "domcontentloaded" });
  await attendre(3000);

  /* La saisie est tapée caractère par caractère : au montage elle est accélérée
     x2,7, et un `fill()` instantané ne donnerait rien à accélérer. */
  console.log("· saisie du lien");
  const champ = page.locator("#yt-url-input");
  await champ.click();
  await champ.type(URL_VIDEO, { delay: 55 });
  await attendre(900);

  console.log("· lancement de l'analyse");
  await page.click("#btn-analyze");

  /* 15 min : c'est la limite que s'impose le client lui-même. On la suit plutôt
     que d'inventer la nôtre — dépasser ici ne servirait à rien, la page aurait
     déjà abandonné. */
  console.log("· analyse en cours (jusqu'à 15 min)");
  await page.waitForSelector(".clip-card", { timeout: 15 * 60 * 1000 });
  await attendre(2500);

  /* On RELEVE la grille au lieu d'aller la relire en pixels plus tard.
     Premiere version : elle ne journalisait qu'un `count()` d'elements
     `.clip-card`, qui a annonce 10 alors que le site affichait « 8 clips viraux
     trouves » — l'entete lit `_clips.length`, lui. Il a fallu rouvrir la video
     image par image pour retrouver les vraies bornes. Tout est ecrit ici, et
     c'est le TITRE de la page qui fait foi sur le nombre. */
  const releve = await page.evaluate(() => ({
    titre: document.getElementById("studio-title")?.textContent?.trim() || "",
    source: document.getElementById("studio-meta")?.textContent?.trim() || "",
    clips: [...document.querySelectorAll(".clip-card")].map((c) => ({
      duree: c.querySelector(".clip-dur-badge")?.textContent?.trim() || "",
      score: c.querySelector(".clip-score-num")?.textContent?.trim() || "",
      titre: c.querySelector(".clip-title")?.textContent?.trim() || "",
    })),
  }));
  fs.writeFileSync(path.join(SORTIE, "parcours-clips.json"), JSON.stringify(releve, null, 2));
  console.log(`  ${releve.titre}`);
  releve.clips.forEach((c, i) => console.log(`   ${i} · ${c.score} · ${c.duree} · ${c.titre}`));

  /* QUEL CLIP OUVRIR — et pourquoi ca ne peut pas etre un rang fixe.
     Le clip ouvert finit en plein ecran dans le montage : c'est la vitrine. Or
     l'analyse n'est PAS deterministe — deux passages sur la meme video ont donne
     des decoupes et des scores differents. Un « toujours le premier » tombe donc
     sur ce que le hasard amene, et sur cette source il a successivement donne un
     passage filme pres d'un bateau de fete (Whisper y rend du charabia) puis un
     « rant anti-ecologie explosif ». Ni l'un ni l'autre ne peut illustrer l'outil.

     On choisit donc par le TITRE que le produit a lui-meme ecrit, ce qui survit
     a une nouvelle analyse :
       CLIP_TITRE="cigare"  ouvre le premier clip dont le titre contient « cigare »
       CLIP=2               repli par rang si aucun titre n'est donne
     Si le motif ne trouve rien, on le dit et on prend le premier — jamais un
     silence qui donnerait une vitrine choisie au hasard. */
  const motif = (process.env.CLIP_TITRE || "").trim().toLowerCase();
  let iClip = Math.max(0, parseInt(process.env.CLIP || "0", 10) || 0);
  if (motif) {
    const sansAccent = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const trouve = releve.clips.findIndex((c) => sansAccent(c.titre).includes(sansAccent(motif)));
    if (trouve >= 0) iClip = trouve;
    else console.log(`  (aucun titre ne contient « ${motif} » — on prend le rang ${iClip})`);
  }
  console.log(`· ouverture du clip ${iClip} — ${releve.clips[iClip]?.titre || "?"}`);
  await page.locator(".clip-card").nth(iClip).click();
  await page.waitForSelector("#modal-player-wrap", { timeout: 60000 });
  await attendre(6000);

  console.log("· fin du parcours");
} catch (e) {
  console.error("ÉCHEC :", e.message);
  await page.screenshot({ path: path.join(SORTIE, "parcours-echec.png") }).catch(() => {});
  process.exitCode = 1;
} finally {
  const video = page.video();
  await ctx.close(); // referme le contexte AVANT de lire le chemin : Playwright
  await nav.close(); // n'écrit le fichier qu'à la fermeture.
  if (video) {
    const brut = await video.path();
    /* On écrit TOUJOURS sous un nom provisoire. La première version copiait
       directement sur `parcours.mp4` dans le bloc `finally` : un échec de
       connexion a donc écrasé l'enregistrement qui marchait par huit secondes
       de page de login. Un enregistrement raté ne doit jamais détruire le bon. */
    const provisoire = path.join(SORTIE, "parcours-nouveau.mp4");
    fs.copyFileSync(brut, provisoire);
    fs.unlinkSync(brut);
    const mo = (fs.statSync(provisoire).size / 1048576).toFixed(1);
    if (process.exitCode) {
      console.log(`
échec — enregistrement partiel : ${provisoire} (${mo} Mo)`);
      console.log("  parcours.mp4 n'a PAS été touché.");
    } else {
      fs.renameSync(provisoire, path.join(SORTIE, "parcours.mp4"));
      console.log(`
OK — public/parcours.mp4 (${mo} Mo)`);
      console.log("  Vérifier la durée réelle et recaler les repères de Parcours.tsx.");
    }
  }
}
