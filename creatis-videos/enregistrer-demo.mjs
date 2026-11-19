/**
 * ENREGISTRER LA DÉMONSTRATION — l'intérieur du Clip Viral, en 1920×1080.
 *
 *   node enregistrer-demo.mjs <id-generation> [nom]
 *
 * ── POURQUOI UN SCRIPT DE PLUS, ET PAS `enregistrer-tuto.mjs` ────────────
 * Celui-là lance une ANALYSE (`#btn-analyze`). Le 13/10, trois analyses ont
 * été refusées : le compte `studio-video@creatis.app` est à trente sur les
 * trente de son plan Pro pour le mois. Une démonstration ne peut donc plus
 * commencer par une analyse.
 *
 * Or `clips-v2.html?g=<id>` rouvre une génération déjà faite, sans rien
 * consommer (le chemin du lien « Voir mes clips » des emails). On part de là,
 * et on filme ce que l'analyse a produit — c'est de toute façon ce qu'il faut
 * montrer : le résultat, pas l'attente.
 *
 * ── CE QU'ON FILME ───────────────────────────────────────────────────────
 * La grille notée, l'ouverture d'un clip, la transcription, les styles de
 * sous-titres, la taille, le DÉPLACEMENT des sous-titres à la poignée, le
 * hook, puis l'export et le clip fini qui tourne. Rien n'est reconstitué.
 *
 * ── LES REPÈRES ──────────────────────────────────────────────────────────
 * `public/reperes-demo-<nom>.json` donne la seconde de chaque geste dans le
 * fichier. Sans eux il faut deviner au montage, et les repères d'un tournage
 * précédent ont déjà dérivé de vingt-trois secondes.
 */
import "./env-local.mjs";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const GEN = process.argv[2];
const NOM = process.argv[3] || "demo";
const EMAIL = process.env.CREATIS_EMAIL;
const MDP = process.env.CREATIS_MDP;
const SITE = process.env.CREATIS_URL || "https://creatis.app";
const SORTIE = path.resolve("public");

if (!GEN || !EMAIL || !MDP) {
  console.error("Usage : node enregistrer-demo.mjs <id-generation> [nom]");
  process.exit(2);
}

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now();
const REPERES = {};
const marquer = (quoi) => {
  const s = (Date.now() - T0) / 1000;
  REPERES[quoi] = Math.round(s * 10) / 10;
  console.log(`  ${String(REPERES[quoi]).padStart(6)} s — ${quoi}`);
};

(async () => {
  const ctx = await chromium.launchPersistentContext(
    path.join(path.resolve("."), ".profil-demo"),
    {
      channel: "chrome",
      headless: false,
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: SORTIE, size: { width: 1920, height: 1080 } },
    },
  );
  const page = ctx.pages()[0] || (await ctx.newPage());

  try {
    /* Le profil est persistant : au deuxième tournage il est DÉJÀ connecté,
       `auth.html` redirige, et `page.fill("#auth-email")` attend trente
       secondes un champ qui n'existe pas avant de tout faire échouer. On ne
       se connecte donc que si le formulaire est réellement là. */
    console.log("· connexion");
    await page.goto(`${SITE}/auth.html`, { waitUntil: "domcontentloaded", timeout: 80000 });
    await attendre(3500);
    const champEmail = page.locator("#auth-email");
    if (await champEmail.isVisible({ timeout: 6000 }).catch(() => false)) {
      await page.click("#toggle-btn").catch(() => {});
      await page.waitForFunction(
        () => document.getElementById("btn-submit-texte")?.textContent?.includes("connecter"),
        { timeout: 20000 },
      ).catch(() => {});
      await page.fill("#auth-email", EMAIL);
      await page.fill("#auth-password", MDP);
      await page.click("#btn-submit");
      await page.waitForURL((u) => !u.pathname.includes("auth.html"), { timeout: 60000 }).catch(() => {});
      console.log("  connecté");
    } else {
      console.log("  déjà connecté (profil persistant)");
    }

    console.log("· ouverture de la génération");
    await page.goto(`${SITE}/clips-v2.html?g=${GEN}`, {
      waitUntil: "domcontentloaded", timeout: 80000,
    });
    await page.waitForSelector(".clip-card", { timeout: 180000 });
    await attendre(4000);
    marquer("grille");

    /* La grille entière : c'est le résultat, dix passages notés sortis d'une
       seule vidéo. On la fait défiler lentement — un défilement brusque ne se
       lit pas au montage. */
    for (let i = 0; i < 3; i += 1) {
      await page.mouse.wheel(0, 420);
      await attendre(2600);
    }
    marquer("grille-defilee");
    await page.mouse.wheel(0, -1260);
    await attendre(2500);

    console.log("· ouverture d'un clip");
    await page.locator(".clip-card").first().click({ force: true });
    await attendre(3500);
    marquer("fiche");

    /* Le clip ne démarre pas seul : le clic sur l'habillage est obligatoire.
       `document.querySelector("video")` rendrait l'aperçu 16:9 de l'accueil,
       déjà chargé — il a fait perdre deux tournages le 01/10. */
    await page.locator("#modal-play-overlay").first().click({ timeout: 15000 }).catch(() => {});
    await attendre(1200);
    await page.evaluate(() => document.querySelector("#modal-video")?.play?.()).catch(() => {});
    await attendre(6000);
    marquer("lecture");

    /* ── LE RAIL D'ICÔNES ────────────────────────────────────────────
       La fiche n'a pas d'onglets en haut mais un rail à gauche, façon Klap :
       Sous-titres, Hook, Edit. Les contrôles d'un panneau n'existent dans le
       DOM que quand son onglet est ouvert — au premier tournage, le script
       cherchait #modal-fontsize et #modal-hook-on sans avoir rien ouvert, et
       il a sauté tous les gestes d'un coup (52,6 s → 52,7 s). */
    const onglet = async (quoi) => {
      await page.locator(`.klap-rail-btn[data-tab="${quoi}"]`).click({ timeout: 8000 }).catch(() => {});
      await attendre(2200);
    };

    await onglet("subs");
    marquer("panneau-sous-titres");
    await attendre(2500);

    /* Les styles de sous-titres, un par un, lentement : c'est ce qui se lit. */
    const styles = page.locator("#modal-style-btns button, #modal-style-btns [role=button]");
    const n = await styles.count().catch(() => 0);
    console.log(`· ${n} style(s) de sous-titres`);
    for (let i = 0; i < Math.min(n, 5); i += 1) {
      await styles.nth(i).click({ timeout: 6000 }).catch(() => {});
      await attendre(2600);
    }
    marquer("styles");

    /* LE GESTE QUI COMPTE : on attrape les sous-titres EUX-MÊMES et on les
       déplace. `_setupDraggable(subOv, wrap, 'subY', 'subX')` : c'est
       l'incrustation qui est saisissable, pas la poignée blanche — elle, sert
       à changer la taille. Et l'aperçu est l'export : ce qu'on place ici est
       ce qui sortira du fichier. */
    const sous = page.locator("#modal-sub-overlay");
    if (await sous.isVisible().catch(() => false)) {
      const b = await sous.boundingBox();
      if (b) {
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        await page.mouse.move(cx, cy);
        await page.mouse.down();
        for (const dy of [-40, -90, -140, -190, -230]) {
          await page.mouse.move(cx, cy + dy, { steps: 14 });
          await attendre(520);
        }
        await attendre(1400);
        /* Et on redescend un peu : on montre qu'on CHOISIT, pas qu'on subit. */
        await page.mouse.move(cx, cy - 150, { steps: 12 });
        await attendre(900);
        await page.mouse.up();
        await attendre(2600);
      }
      marquer("deplacer-sous-titres");
    }

    /* La taille, à la poignée blanche qui apparaît quand l'incrustation est
       survolée. */
    const poignee = page.locator("#modal-sub-handle");
    if (await poignee.isVisible().catch(() => false)) {
      const b = await poignee.boundingBox();
      if (b) {
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
        await page.mouse.down();
        await page.mouse.move(b.x + 90, b.y + 70, { steps: 20 });
        await attendre(900);
        await page.mouse.up();
        await attendre(2200);
      }
      marquer("taille");
    }

    /* Le hook : le bandeau qu'on écrit soi-même, en haut du clip. */
    await onglet("hook");
    marquer("panneau-hook");
    const bascule = page.locator('label.toggle:has(#modal-hook-on), #modal-hook-on');
    await bascule.first().click({ timeout: 8000, force: true }).catch(() => {});
    await attendre(2000);
    const champ = page.locator("#modal-hook-txt");
    if (await champ.isVisible().catch(() => false)) {
      await champ.click().catch(() => {});
      await page.keyboard.press("Control+A");
      await page.keyboard.type("TU VEUX ÊTRE PAYÉ EN CLIPPING ?", { delay: 60 });
      await attendre(3000);
    }
    marquer("hook");

    /* Le panneau Edit : le cadrage. */
    await onglet("cadrage");
    await attendre(3500);
    marquer("edit");

    console.log("· export (une à deux minutes)");
    await page.locator("#modal-dl-btn").click({ timeout: 15000 }).catch(() => {});
    marquer("export-lance");
    await page.waitForEvent("download", { timeout: 240000 })
      .then(() => marquer("export-fini"))
      .catch(() => console.log("  (pas de téléchargement reçu)"));
    await attendre(6000);
    marquer("fin");
  } catch (e) {
    console.error("ÉCHEC :", e.message);
    await page.screenshot({ path: path.join(SORTIE, `demo-${NOM}-echec.png`) }).catch(() => {});
  }

  const video = page.video();
  await ctx.close();
  if (video) {
    const cible = path.join(SORTIE, `demo-${NOM}.webm`);
    await video.saveAs(cible).catch(() => {});
    console.log(`Vidéo : ${cible}`);
  }
  fs.writeFileSync(
    path.join(SORTIE, `reperes-demo-${NOM}.json`),
    JSON.stringify({ generation: GEN, reperes: REPERES }, null, 2),
  );
  console.log(`Repères : public/reperes-demo-${NOM}.json`);
  process.exit(0);
})();
