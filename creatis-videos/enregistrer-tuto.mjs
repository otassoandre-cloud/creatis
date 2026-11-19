/**
 * ENREGISTREMENT 16:9 POUR LE TUTORIEL — ce qu'on voit sur un vrai écran.
 *
 *   node enregistrer-tuto.mjs --whop
 *   node enregistrer-tuto.mjs --creatis <url-youtube>
 *
 * ── POURQUOI UN RECORDER DE PLUS ─────────────────────────────────────────
 * `enregistrer-vocal.mjs` filme en 1080×1920, au format des Shorts. Un
 * tutoriel se regarde en 16:9, et recadrer un 9:16 en 16:9 ne laisse qu'une
 * bande. On filme donc directement en 1920×1080.
 *
 * ── CE QU'ON FILME, ET CE QU'ON NE FILME PAS ─────────────────────────────
 * Tout est réel. Aucune interface reconstituée, aucune réponse d'API
 * interceptée : une démonstration fabriquée ne prouve rien, et c'est tout
 * l'intérêt d'un tutoriel que de montrer ce qui se passe vraiment, y compris
 * les temps d'attente.
 *
 * Côté Whop, on ne filme QUE les pages publiques. Les campagnes de clipping
 * sont derrière un compte, et créer un compte sur un service tiers n'est pas
 * une décision qui se prend seul : les chiffres des campagnes sont donc
 * affichés en incrustation et attribués, pas mis en scène comme une capture.
 *
 * ── LES REPÈRES ──────────────────────────────────────────────────────────
 * Le script écrit `public/reperes-tuto-<quoi>.json` : la seconde de chaque
 * étape dans le fichier. Sans eux, il faut deviner au montage — et les
 * repères d'un enregistrement précédent ont déjà dérivé de 23 s.
 */
import "./env-local.mjs";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const QUOI = process.argv.includes("--whop") ? "whop" : "creatis";
/* `--vertical` filme en 1080×1920, au format des Shorts : c'est là qu'on
   récolte le matériau des films courts (le cadre utile du lecteur de clip est
   alors [150, 300, 540, 980], comme sur les enregistrements précédents). */
const VERTICAL = process.argv.includes("--vertical");
const URL_VIDEO = process.argv[process.argv.indexOf("--creatis") + 1];
const EMAIL = process.env.CREATIS_EMAIL;
const MDP = process.env.CREATIS_MDP;
const SITE = process.env.CREATIS_URL || "https://creatis.app";
const SORTIE = path.resolve("public");

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const T0 = Date.now();
const REPERES = [];
const marquer = (nom) => {
  const t = Math.round((Date.now() - T0) / 100) / 10;
  REPERES.push({ nom, t });
  console.log(`  [${String(t).padStart(6)} s] ${nom}`);
};

if (QUOI === "creatis" && (!EMAIL || !MDP)) {
  console.error("CREATIS_EMAIL et CREATIS_MDP manquants — voir creatis-videos/.env");
  process.exit(2);
}
if (QUOI === "creatis" && !URL_VIDEO) {
  console.error("Usage : node enregistrer-tuto.mjs --creatis <url-youtube>");
  process.exit(2);
}

const nav = await chromium.launch({ headless: false, args: ["--hide-scrollbars"] });
const TAILLE = VERTICAL ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
const ctx = await nav.newContext({
  viewport: TAILLE,
  locale: "fr-FR",
  recordVideo: { dir: SORTIE, size: TAILLE },
});
const page = await ctx.newPage();

try {
  if (QUOI === "whop") {
    console.log("· Whop — pages publiques");
    await page.goto("https://whop.com/discover/", { waitUntil: "domcontentloaded", timeout: 80000 });
    await attendre(6000);
    for (const l of ["Tout accepter", "Accept all"]) {
      const b = page.locator(`button:has-text("${l}")`).first();
      if (await b.isVisible().catch(() => false)) {
        await b.click({ timeout: 4000 }).catch(() => {});
        await attendre(2500);
      }
    }
    marquer("accueil");
    await attendre(4000);

    /* Le bandeau « EN DIRECT MAINTENANT » défile tout seul : on le laisse
       tourner, c'est la preuve vivante que de l'argent circule. */
    await page.mouse.wheel(0, 700);
    await attendre(6000);
    marquer("direct");
    await page.mouse.wheel(0, 900);
    await attendre(6000);
    marquer("montant");
    await page.mouse.wheel(0, 1100);
    await attendre(6000);
    marquer("fin");
  } else {
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
    console.log("  connecté");

    await page.goto(`${SITE}/clips-v2.html`, { waitUntil: "domcontentloaded", timeout: 80000 });
    await attendre(5000);
    marquer("accueil");

    /* On TAPE le lien plutôt que de le coller : un tutoriel montre le geste,
       et un champ qui se remplit d'un coup ne se lit pas. */
    const champ = page.locator("#yt-url-input");
    await champ.click();
    await page.keyboard.type(URL_VIDEO, { delay: 45 });
    await attendre(2500);
    marquer("lien");

    await page.click("#btn-analyze");
    marquer("analyse");

    console.log("· analyse en cours (jusqu'à 15 min)");
    await page.waitForSelector(".clip-card", { timeout: 15 * 60 * 1000 });
    marquer("grille");
    await attendre(5000);

    /* On fait défiler la grille : dix clips notés, c'est le résultat — pas
       une promesse. */
    await page.mouse.wheel(0, 600);
    await attendre(4000);
    await page.mouse.wheel(0, 600);
    await attendre(4000);
    marquer("grille-defilee");

    console.log("· ouverture d'un clip");
    await page.locator(".clip-card").first().click();
    await attendre(3000);
    marquer("fiche");

    /* ── ON ATTEND QUE LE CLIP JOUE VRAIMENT ───────────────────────────
       `document.querySelector("video")` attrape l'aperçu de la page d'accueil,
       pas le lecteur du clip : il faut `#modal-video`, et `#modal-player-ph`
       est l'écran d'attente qui le masque tant que le fichier arrive. */
    /* ── REMONTER LES SOUS-TITRES AVANT DE FILMER ────────────────────────
       L'application pose les sous-titres à `subY: 82` par défaut. À 82 % de
       la hauteur, ils tombent exactement là où TikTok, Instagram et YouTube
       posent le pseudo, la légende et la ligne de musique : trois couches de
       texte superposées, illisibles (constaté le 09/10 sur une capture).

       On les remonte donc à la SOURCE, par un vrai glisser dans l'éditeur,
       plutôt que de les recadrer hors champ au montage — ainsi le clip reste
       complet et ses sous-titres restent visibles. */
    const boites = await page.evaluate(() => {
      const o = document.getElementById("modal-sub-overlay");
      const w = document.getElementById("modal-player-wrap");
      if (!o || !w) return null;
      const a = o.getBoundingClientRect();
      const b = w.getBoundingClientRect();
      return { ox: a.x + a.width / 2, oy: a.y + a.height / 2, wh: b.height };
    }).catch(() => null);
    if (boites) {
      /* De 82 % à 62 % : au-dessus de la zone basse des plateformes (66 %)
         et sous la colonne de boutons, qui commence à 49 %. */
      const montee = Math.round(boites.wh * 0.20);
      await page.mouse.move(boites.ox, boites.oy);
      await page.mouse.down();
      await page.mouse.move(boites.ox, boites.oy - montee / 2, { steps: 8 });
      await page.mouse.move(boites.ox, boites.oy - montee, { steps: 8 });
      await page.mouse.up();
      await attendre(1500);
      const subY = await page.evaluate(() => {
        try { return window._clipSettings?.[window._modalIdx]?.subY ?? null; } catch { return null; }
      }).catch(() => null);
      console.log(`  sous-titres remontés de ${montee} px${subY !== null ? ` (subY ${subY})` : ""}`);
      marquer("sous-titres");
    } else {
      console.warn("  calque de sous-titres introuvable — ils resteront à 82 %");
    }

    /* ── POURQUOI ON NE SE CONTENTE PLUS DU CLIC ─────────────────────────
       Le 08/10, le clic sur la pastille de lecture n'a pas démarré le clip :
       le tournage s'est terminé sur un lecteur EN PAUSE, et le film livré
       montrait une image fixe là où il promettait un clip qui tourne. On
       clique, puis on appelle `play()` sur l'élément lui-même, et on relance
       tant que ça ne bouge pas. */
    for (let essai = 0; essai < 4; essai++) {
      await page.locator("#modal-play-overlay, .modal-play-overlay").first()
        .click({ timeout: 5000 }).catch(() => {});
      await attendre(1500);
      const parti = await page.evaluate(() => {
        const v = document.querySelector("#modal-video");
        if (!v) return false;
        v.muted = false;
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
        return true;
      }).catch(() => false);
      await attendre(2500);
      const bouge = await page.evaluate(() => {
        const v = document.querySelector("#modal-video");
        return !!v && v.currentTime > 0.3 && !v.paused;
      }).catch(() => false);
      if (parti && bouge) break;
    }
    const joue = await page.waitForFunction(() => {
      const v = document.querySelector("#modal-video");
      const ph = document.querySelector("#modal-player-ph");
      const masque = ph && getComputedStyle(ph).display !== "none";
      return v && !masque && v.readyState >= 2 && v.currentTime > 0.3;
    }, { timeout: 90000 }).then(() => true).catch(() => false);
    if (!joue) {
      console.warn("  le clip n'a pas démarré — on filme quand même, à vérifier au montage");
    }
    marquer("clip-joue");
    await attendre(9000);
    marquer("fin");
  }
} catch (e) {
  console.error("ÉCHEC :", e.message);
  await page.screenshot({ path: path.join(SORTIE, `tuto-${QUOI}-echec.png`) }).catch(() => {});
} finally {
  const video = page.video();
  await ctx.close();
  await nav.close();
  const brut = video ? await video.path() : null;
  if (brut) {
    const cible = path.join(SORTIE, `tuto-${QUOI}${VERTICAL ? "-v" : ""}.webm`);
    fs.renameSync(brut, cible);
    console.log(`\nVidéo : ${cible}`);
  }
  fs.writeFileSync(
    path.join(SORTIE, `reperes-tuto-${QUOI}${VERTICAL ? "-v" : ""}.json`),
    JSON.stringify({ quoi: QUOI, reperes: REPERES }, null, 2),
  );
  console.log(`Repères : public/reperes-tuto-${QUOI}.json`);
  console.log("Les repères peuvent DÉRIVER du fichier : vérifier sur une planche avant de monter.");
}
