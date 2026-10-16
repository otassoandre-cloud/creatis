/**
 * TÉLÉCHARGER LES CLIPS — les vrais fichiers, en 1080×1920 natif.
 *
 *   node telecharger-clips.mjs <url-youtube> <prefixe> [combien]
 *
 * ── POURQUOI CE FICHIER REMPLACE LE TOURNAGE DE L'APERÇU ─────────────────
 * Jusqu'au 10/10, les Shorts étaient montés en FILMANT le lecteur de l'app :
 * une zone de 540×820 pixels dans un enregistrement 1080×1920, qu'il fallait
 * ensuite agrandir 2,3 fois pour remplir le cadre. Résultat, constaté par
 * l'utilisateur sur son téléphone : « c'est zoomé, les clips sont flous ».
 * Et il avait raison — c'est un agrandissement de 234 %.
 *
 * Or le lecteur joue depuis un BLOB déjà présent dans la page : exactement le
 * fichier qu'on obtiendrait en cliquant sur Exporter. On le relit avec
 * `fetch`, on le sort en base64, on l'écrit. Mesuré sur les clips déjà
 * récupérés : 1080×1920, 30 i/s, ~5 000 kb/s. Aucun agrandissement, et le son
 * du clip vient avec.
 *
 * ── CE QUE ÇA CHANGE AU MONTAGE ──────────────────────────────────────────
 * Plus de `cadre`, plus d'échelle à calculer : le fichier EST le format de
 * sortie. On le pose plein cadre, net. Et les sous-titres incrustés sont à
 * leur place d'origine, lisibles, sans avoir à les rogner.
 */
import "./env-local.mjs";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const URL_VIDEO = process.argv[2];
const PREFIXE = process.argv[3] || "clip";
const COMBIEN = Number(process.argv[4] || 4);
const EMAIL = process.env.CREATIS_EMAIL;
const MDP = process.env.CREATIS_MDP;
const SITE = process.env.CREATIS_URL || "https://creatis.app";
const SORTIE = path.resolve("public");

if (!URL_VIDEO || !EMAIL || !MDP) {
  console.error("Usage : node telecharger-clips.mjs <url> <prefixe> [combien]");
  console.error("CREATIS_EMAIL et CREATIS_MDP doivent être dans creatis-videos/.env");
  process.exit(2);
}

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const nav = await chromium.launch({ headless: false, args: ["--hide-scrollbars"] });
const ctx = await nav.newContext({
  viewport: { width: 1280, height: 1000 }, locale: "fr-FR",
  acceptDownloads: true,
});
const page = await ctx.newPage();
const obtenus = [];

try {
  console.log("· connexion");
  await page.goto(`${SITE}/auth.html`, { waitUntil: "domcontentloaded", timeout: 80000 });
  await page.click("#toggle-btn");
  await page.waitForFunction(
    () => document.getElementById("btn-submit-texte")?.textContent?.includes("connecter"),
    { timeout: 20000 },
  );
  await page.fill("#auth-email", EMAIL);
  await page.fill("#auth-password", MDP);
  await page.click("#btn-submit");
  await page.waitForURL((u) => !u.pathname.includes("auth.html"), { timeout: 60000 });

  await page.goto(`${SITE}/clips-v2.html`, { waitUntil: "domcontentloaded", timeout: 80000 });
  await attendre(5000);
  await page.locator("#yt-url-input").click();
  await page.keyboard.type(URL_VIDEO, { delay: 20 });
  await attendre(1500);
  await page.click("#btn-analyze");
  console.log("· analyse en cours (jusqu'à 15 min)");
  /* Trente minutes, et non quinze. Diagnostic du 16/10 : sur une vidéo de
     vingt-cinq minutes, l'analyse passe la transcription, annonce « clips
     identifiés », puis reste plusieurs minutes à 70 % sur « identification
     des meilleurs moments » avant de rendre la grille. Les trois échecs du
     13/10 avaient été mis sur le compte du quota ; le quota était bien
     atteint, mais le symptôme observé — quinze minutes puis timeout —
     venait de là. */
  await page.waitForSelector(".clip-card", { timeout: 30 * 60 * 1000 });
  await attendre(4000);

  const total = await page.locator(".clip-card").count();
  console.log(`· ${total} clips trouvés, on en récupère ${Math.min(COMBIEN, total)}`);

  for (let i = 0; i < Math.min(COMBIEN, total); i++) {
    console.log(`· clip ${i + 1}`);
    /* `force` : la fiche précédente peut rester montée une fraction de
       seconde, et `#modal-play-overlay` intercepte alors le clic — c'est ce
       qui n'avait rendu qu'un clip sur cinq au premier essai. */
    await page.locator(".clip-card").nth(i).click({ force: true, timeout: 15000 }).catch(() => {});
    await attendre(3000);

    /* ── LE BLOB DU LECTEUR N'EST PAS LE CLIP ───────────────────────────
       Premier essai : on relisait `#modal-video.src`. Mesuré — 1920×1080,
       sans sous-titres, sans recadrage : c'est le SEGMENT SOURCE, l'entrée du
       traitement, pas sa sortie.
       Le vrai clip vertical se produit au clic sur « Export »
       (`#modal-dl-btn` → `V2.exportFromModal()`, « Exporter ce clip en 9:16 »).
       On attend donc le téléchargement, qui peut prendre une minute ou deux :
       l'encodage se fait côté serveur. */
    const bouton = page.locator("#modal-dl-btn");
    if (!(await bouton.isVisible().catch(() => false))) {
      console.log("  bouton Export introuvable — clip passé");
    } else {
      const attenteFichier = page.waitForEvent("download", { timeout: 240000 }).catch(() => null);
      await bouton.click({ timeout: 10000 }).catch(() => {});
      const dl = await attenteFichier;
      if (!dl) {
        console.log("  aucun téléchargement après quatre minutes — clip passé");
        await page.screenshot({ path: path.join(SORTIE, `${PREFIXE}-${i + 1}-bloque.png`) }).catch(() => {});
      } else {
        const nom = `${PREFIXE}-${i + 1}.mp4`;
        await dl.saveAs(path.join(SORTIE, nom));
        const mo = (fs.statSync(path.join(SORTIE, nom)).size / 1048576).toFixed(1);
        console.log(`  → public/${nom} (${mo} Mo)`);
        obtenus.push(nom);
      }
    }

    /* ── REFERMER LA FICHE ───────────────────────────────────────────────
       `Escape` ne suffisait pas : la fiche restait ouverte et le clic sur le
       clip suivant était intercepté par `#modal-play-overlay`. On appelle la
       fermeture de l'application elle-même. */
    await page.evaluate(() => {
      try { window.V2?.closeModal?.(); } catch { /* déjà fermée */ }
      const o = document.getElementById("clip-modal-overlay");
      if (o) o.classList.remove("open");
    }).catch(() => {});
    await attendre(3000);
  }
} catch (e) {
  console.error("ÉCHEC :", e.message);
  await page.screenshot({ path: path.join(SORTIE, `${PREFIXE}-echec.png`) }).catch(() => {});
} finally {
  await ctx.close();
  await nav.close();
  console.log("");
  console.log(`${obtenus.length} clip(s) récupérés : ${obtenus.join(", ") || "aucun"}`);
}
