/**
 * LES TROIS PLANS QUI MANQUAIENT AU PARCOURS.
 *
 *   node enregistrer-complement.mjs <id-generation> [nom]
 *
 * ── CE QUI A RATÉ DANS LE TOURNAGE DE 10 MIN ─────────────────────────────
 * Vérifié sur planche contact :
 *   1. L'ouverture Google n'a filmé qu'une page blanche — la recherche ne
 *      s'est pas faite.
 *   2. Le DÉPLACEMENT DES SOUS-TITRES n'a pas eu lieu : « styles » et
 *      « sous-titres-deplaces » portent la même seconde (300,1), donc la
 *      boîte englobante de l'incrustation était nulle au moment du geste.
 *      C'est pourtant la demande centrale du 16/10.
 *   3. L'export n'a pas rendu de fichier en cinq minutes.
 *
 * On ne refait pas les dix minutes : on reprend la génération déjà faite
 * (`?g=`), ce qui ne consomme aucune analyse, et on filme ces trois plans.
 *
 * ── LA CORRECTION DU GESTE ───────────────────────────────────────────────
 * Avant de saisir les sous-titres, on OUVRE le panneau, on attend que
 * l'incrustation soit réellement visible, et on vérifie sa boîte. Sans cette
 * vérification, le script croit avoir fait le geste et marque un repère pour
 * une action qui n'a jamais eu lieu — ce qui est pire qu'un échec, parce que
 * le montage s'appuie dessus.
 */
import "./env-local.mjs";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const GEN = process.argv[2];
const NOM = process.argv[3] || "complement";
const SITE = process.env.CREATIS_URL || "https://creatis.app";
const SORTIE = path.resolve("public");
if (!GEN) { console.error("Usage : node enregistrer-complement.mjs <id-generation>"); process.exit(2); }

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now();
const s = () => Math.round(((Date.now() - T0) / 1000) * 10) / 10;
const REPERES = {};
const TRACE = [];
const marquer = (q) => { REPERES[q] = s(); console.log(`  ${String(REPERES[q]).padStart(7)} s — ${q}`); };

(async () => {
  const ctx = await chromium.launchPersistentContext(path.resolve(".profil-demo"), {
    channel: "chrome", headless: false,
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: SORTIE, size: { width: 1920, height: 1080 } },
  });
  const page = ctx.pages()[0] || (await ctx.newPage());

  let cx = 960; let cy = 540;
  const bouger = async (x, y, pas = 24) => {
    for (let i = 1; i <= pas; i += 1) {
      const nx = cx + ((x - cx) * i) / pas; const ny = cy + ((y - cy) * i) / pas;
      await page.mouse.move(nx, ny);
      if (i % 4 === 0) TRACE.push({ t: s(), x: Math.round(nx), y: Math.round(ny), clic: false });
      await attendre(14);
    }
    cx = x; cy = y; TRACE.push({ t: s(), x, y, clic: false });
  };
  const cliquer = async (x, y) => {
    await bouger(x, y); await attendre(240);
    TRACE.push({ t: s(), x, y, clic: true });
    await page.mouse.click(x, y); await attendre(220);
  };
  const cliquerSur = async (sel) => {
    const b = await page.locator(sel).first().boundingBox();
    if (!b) throw new Error(`introuvable : ${sel}`);
    await cliquer(Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2));
  };

  try {
    /* ── 1. GOOGLE, pour de vrai ────────────────────────────────────── */
    await page.goto("https://www.google.com/search?q=creatis.app&hl=fr", {
      waitUntil: "domcontentloaded", timeout: 60000,
    });
    await attendre(3000);
    for (const t of ["Tout accepter", "Accept all"]) {
      const b = page.locator(`button:has-text("${t}")`).first();
      if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await attendre(2000); break; }
    }
    await bouger(620, 400);
    await attendre(2500);
    marquer("google-resultats");

    /* ── 2. LA FICHE, depuis une génération déjà faite ──────────────── */
    await page.goto(`${SITE}/clips-v2.html?g=${GEN}`, { waitUntil: "domcontentloaded", timeout: 80000 });
    await page.waitForSelector(".clip-card", { timeout: 180000 });
    await attendre(3500);
    marquer("grille");

    await cliquerSur(".clip-card");
    await attendre(3500);
    marquer("fiche");

    /* L habillage de lecture n existe pas toujours : selon l etat de la
       fiche, le clip demarre seul. Un clic obligatoire sur un element absent
       faisait echouer tout le tournage apres dix-huit secondes. */
    /* Le clip ne demarre pas seul, et son segment met une vingtaine de
       secondes a se telecharger (CONSIGNES, 01/10). Tant qu il n est pas
       charge, l habillage de lecture n apparait pas et l incrustation des
       sous-titres reste vide — c est ce qui a fait rater le geste deux fois
       ce matin. On attend donc que la video ait une DUREE, pas un delai fixe. */
    for (let i = 0; i < 40; i += 1) {
      const pret = await page.evaluate(() => {
        const v = document.querySelector("#modal-video");
        return !!(v && v.duration && v.duration > 0.5);
      }).catch(() => false);
      if (pret) { console.log(); break; }
      await attendre(1000);
    }
    const habillage = page.locator("#modal-play-overlay");
    if (await habillage.isVisible({ timeout: 4000 }).catch(() => false)) {
      await cliquerSur("#modal-play-overlay");
      await attendre(1200);
    }
    await page.evaluate(() => document.querySelector("#modal-video")?.play?.()).catch(() => {});
    await attendre(5000);

    /* ── 3. LE GESTE, vérifié avant d'être marqué ───────────────────── */
    await cliquerSur('.klap-rail-btn[data-tab="subs"]');
    await attendre(2500);
    marquer("panneau");

    const sous = page.locator("#modal-sub-overlay");
    await sous.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
    let b = await sous.boundingBox();
    /* L'incrustation n'a de boîte que lorsqu'un sous-titre est affiché :
       si la lecture est entre deux phrases, elle est vide. On attend qu'elle
       ait une hauteur réelle plutôt que de supposer. */
    for (let essai = 0; essai < 10 && (!b || b.height < 10); essai += 1) {
      await attendre(900);
      b = await sous.boundingBox();
    }
    if (!b || b.height < 10) {
      console.error("  l incrustation des sous-titres reste vide — geste NON filmé");
    } else {
      const ox = Math.round(b.x + b.width / 2);
      const oy = Math.round(b.y + b.height / 2);
      await bouger(ox, oy);
      await attendre(800);
      await page.mouse.down();
      TRACE.push({ t: s(), x: ox, y: oy, clic: true });
      for (const dy of [-40, -90, -140, -185, -225]) {
        await page.mouse.move(ox, oy + dy, { steps: 14 });
        TRACE.push({ t: s(), x: ox, y: oy + dy, clic: true });
        await attendre(480);
      }
      await attendre(1200);
      await page.mouse.move(ox, oy - 155, { steps: 12 });
      TRACE.push({ t: s(), x: ox, y: oy - 155, clic: true });
      await attendre(900);
      await page.mouse.up();
      cx = ox; cy = oy - 155;
      await attendre(2500);
      marquer("sous-titres-deplaces");
    }

    /* ── 4. L'EXPORT, avec le temps qu'il faut ──────────────────────── */
    await cliquerSur("#modal-dl-btn");
    marquer("export-lance");
    await page.waitForEvent("download", { timeout: 420000 })
      .then(() => marquer("export-fini"))
      .catch(() => console.log("  (toujours pas de téléchargement)"));
    await attendre(8000);
    marquer("fin");
  } catch (e) {
    console.error("ÉCHEC :", e.message);
    await page.screenshot({ path: path.join(SORTIE, `${NOM}-echec.png`) }).catch(() => {});
  }

  const video = page.video();
  await ctx.close();
  if (video) await video.saveAs(path.join(SORTIE, `${NOM}.webm`)).catch(() => {});
  fs.writeFileSync(
    path.join(SORTIE, `${NOM}.json`),
    JSON.stringify({ generation: GEN, reperes: REPERES, trace: TRACE }, null, 1),
  );
  console.log(`public/${NOM}.webm + ${NOM}.json (${TRACE.length} points)`);
  process.exit(0);
})();
