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
import { chromium } from "playwright";
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

const nav = await chromium.launch({ headless: true });
const ctx = await nav.newContext({
  viewport: { width: 1080, height: 1920 },
  deviceScaleFactor: 1,
  recordVideo: { dir: SORTIE, size: { width: 1080, height: 1920 } },
});
const page = await ctx.newPage();
page.on("console", (m) => {
  if (m.type() === "error") console.log("  [page]", m.text().slice(0, 140));
});

try {
  // ── Connexion ───────────────────────────────────────────────────────────
  console.log("· connexion");
  await page.goto(`${SITE}/auth.html`, { waitUntil: "domcontentloaded" });
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
  const nbClips = await page.locator(".clip-card").count();
  console.log(`  ${nbClips} clips affichés`);
  await attendre(2500);

  /* On ouvre le PREMIER clip : c'est le mieux noté, et c'est aussi le seul dont
     on soit sûr qu'il est déjà préchargé — les suivants déclencheraient un
     téléchargement et une attente au milieu du plan. */
  console.log("· ouverture du premier clip");
  await page.locator(".clip-card").first().click();
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
    const cible = path.join(SORTIE, "parcours.mp4");
    fs.copyFileSync(brut, cible);
    fs.unlinkSync(brut);
    const mo = (fs.statSync(cible).size / 1048576).toFixed(1);
    console.log(`\n→ ${cible} (${mo} Mo)`);
    console.log("Vérifier la durée réelle et recaler les repères de Parcours.tsx.");
  }
}
