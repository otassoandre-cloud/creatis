/**
 * LE PARCOURS COMPLET, FILMÉ COMME UN ÉCRAN D'ORDINATEUR.
 *
 *   node enregistrer-parcours-complet.mjs <url-youtube> [nom]
 *
 * ── LA DEMANDE DU 16/10, MOT POUR MOT ────────────────────────────────────
 * « Faut que tu rec tout le processus. Tu vas sur Google, tu tapes
 * creatis.app, tu montres que ça va sur le site, tu colles le lien, quand ça
 * génère. Pas de blancs de fou, que ce soit fluide. Me fais pas des zooms
 * inutiles. Une souris qui parcourt l'écran, qui va cliquer, qui va choisir,
 * qui va glisser les sous-titres. Comme si c'était moi qui filmais mon écran
 * d'ordinateur. »
 *
 * D'où trois partis pris :
 *   1. **On part de Google.** Le spectateur doit voir d'où ça vient, pas
 *      atterrir sur une application qu'il ne sait pas ouvrir.
 *   2. **Aucun zoom, aucun recadrage.** Le film montrera le 1920×1080 tel
 *      quel. C'est le contraire du montage précédent, qui zoomait sur des
 *      zones parce que le lecteur faisait 374 px de large — ici les gestes
 *      portent, pas les détails.
 *   3. **Le curseur est enregistré, pas simulé.** Playwright ne dessine pas
 *      de pointeur : on journalise chaque position et chaque clic avec leur
 *      SECONDE, et le montage dessine le curseur à ces coordonnées-là. Il
 *      sera donc exact, et non inventé après coup.
 *
 * ── CE QUE LE SCRIPT ÉCRIT ───────────────────────────────────────────────
 * · `public/parcours-<nom>.webm` — le tournage brut
 * · `public/parcours-<nom>.json` — les repères d'étape ET la trace du
 *   curseur : [{t, x, y, clic}]
 *
 * Les temps morts (l'analyse dure plusieurs minutes) ne sont PAS coupés
 * ici : on filme en continu, et le montage resserre. Masquer l'attente dans
 * le tournage lui-même rendrait les repères inutilisables.
 */
import "./env-local.mjs";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const URL_VIDEO = process.argv[2];
const NOM = process.argv[3] || "complet";
const EMAIL = process.env.CREATIS_EMAIL;
const MDP = process.env.CREATIS_MDP;
const SITE = process.env.CREATIS_URL || "https://creatis.app";
const SORTIE = path.resolve("public");

if (!URL_VIDEO || !EMAIL || !MDP) {
  console.error("Usage : node enregistrer-parcours-complet.mjs <url-youtube> [nom]");
  process.exit(2);
}

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now();
const s = () => Math.round(((Date.now() - T0) / 1000) * 10) / 10;

const REPERES = {};
const TRACE = [];
const marquer = (quoi) => {
  REPERES[quoi] = s();
  console.log(`  ${String(REPERES[quoi]).padStart(7)} s — ${quoi}`);
};

(async () => {
  const ctx = await chromium.launchPersistentContext(path.resolve(".profil-demo"), {
    channel: "chrome",
    headless: false,
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: SORTIE, size: { width: 1920, height: 1080 } },
  });
  const page = ctx.pages()[0] || (await ctx.newPage());

  /* Le curseur : chaque déplacement est journalisé. `pas` contrôle la
     fluidité — trop peu de pas et le pointeur saute, trop et c'est mou. */
  let cx = 960;
  let cy = 540;
  const bouger = async (x, y, pas = 26) => {
    for (let i = 1; i <= pas; i += 1) {
      const nx = cx + ((x - cx) * i) / pas;
      const ny = cy + ((y - cy) * i) / pas;
      await page.mouse.move(nx, ny);
      if (i % 4 === 0) TRACE.push({ t: s(), x: Math.round(nx), y: Math.round(ny), clic: false });
      await attendre(14);
    }
    cx = x; cy = y;
    TRACE.push({ t: s(), x, y, clic: false });
  };
  const cliquer = async (x, y) => {
    await bouger(x, y);
    await attendre(260);
    TRACE.push({ t: s(), x, y, clic: true });
    await page.mouse.click(x, y);
    await attendre(220);
  };
  /* Viser un élément par son centre réel, pas par des coordonnées devinées. */
  const centre = async (sel) => {
    const b = await page.locator(sel).first().boundingBox();
    if (!b) throw new Error(`introuvable : ${sel}`);
    return [Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2)];
  };
  const cliquerSur = async (sel) => {
    const [x, y] = await centre(sel);
    await cliquer(x, y);
  };

  try {
    /* ── 1. GOOGLE ──────────────────────────────────────────────────── */
    await page.goto("https://www.google.com/?hl=fr", { waitUntil: "domcontentloaded", timeout: 60000 });
    await attendre(2500);
    /* Le mur de consentement, s'il se présente. */
    for (const t of ["Tout accepter", "Accept all", "J'accepte"]) {
      const b = page.locator(`button:has-text("${t}")`).first();
      if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); break; }
    }
    await attendre(1500);
    marquer("google");

    const champ = page.locator('textarea[name="q"], input[name="q"]').first();
    if (await champ.isVisible().catch(() => false)) {
      const b = await champ.boundingBox();
      await cliquer(Math.round(b.x + 180), Math.round(b.y + b.height / 2));
      await page.keyboard.type("creatis.app", { delay: 140 });
      await attendre(1800);
      marquer("tape-adresse");
      await page.keyboard.press("Enter");
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      await attendre(3500);
      marquer("resultats");
    }

    /* ── 2. LE SITE ─────────────────────────────────────────────────── */
    await page.goto(SITE, { waitUntil: "domcontentloaded", timeout: 60000 });
    await attendre(4000);
    await bouger(960, 420);
    await attendre(1500);
    marquer("accueil-site");

    /* ── 3. L'APPLICATION ───────────────────────────────────────────── */
    await page.goto(`${SITE}/auth.html`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await attendre(3000);
    const email = page.locator("#auth-email");
    if (await email.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.click("#toggle-btn").catch(() => {});
      await attendre(800);
      await page.fill("#auth-email", EMAIL);
      await page.fill("#auth-password", MDP);
      await page.click("#btn-submit");
      await page.waitForURL((u) => !u.pathname.includes("auth.html"), { timeout: 60000 }).catch(() => {});
      console.log("  connecté");
    } else {
      console.log("  déjà connecté");
    }
    await page.goto(`${SITE}/clips-v2.html`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await attendre(4500);
    marquer("studio");

    /* ── 4. LE LIEN ─────────────────────────────────────────────────── */
    await cliquerSur("#yt-url-input");
    await page.keyboard.type(URL_VIDEO, { delay: 38 });
    await attendre(2200);
    marquer("lien-colle");

    await cliquerSur("#btn-analyze");
    marquer("analyse-lancee");
    console.log("· analyse (on filme en continu, le montage resserrera)");

    /* Pendant l'attente, le curseur bouge un peu : un écran parfaitement
       immobile pendant des minutes ne ressemble pas à quelqu'un qui
       travaille. */
    const debutAttente = Date.now();
    const grille = page.waitForSelector(".clip-card", { timeout: 30 * 60 * 1000 });
    let prete = false;
    grille.then(() => { prete = true; }).catch(() => { prete = true; });
    while (!prete && Date.now() - debutAttente < 30 * 60 * 1000) {
      await bouger(820 + Math.round(Math.random() * 260), 460 + Math.round(Math.random() * 180), 18);
      await attendre(3200);
    }
    await attendre(3500);
    marquer("grille");

    /* ── 5. LA GRILLE ───────────────────────────────────────────────── */
    await bouger(960, 520);
    for (let i = 0; i < 3; i += 1) {
      await page.mouse.wheel(0, 380);
      await attendre(2400);
    }
    await page.mouse.wheel(0, -1140);
    await attendre(2200);
    marquer("grille-parcourue");

    /* ── 6. UN CLIP ─────────────────────────────────────────────────── */
    await cliquerSur(".clip-card");
    await attendre(3500);
    marquer("fiche");

    await cliquerSur("#modal-play-overlay");
    await attendre(1200);
    await page.evaluate(() => document.querySelector("#modal-video")?.play?.()).catch(() => {});
    await attendre(5000);
    marquer("lecture");

    /* ── 7. LES SOUS-TITRES ─────────────────────────────────────────── */
    await cliquerSur('.klap-rail-btn[data-tab="subs"]');
    await attendre(2200);
    marquer("panneau-sous-titres");

    const styles = page.locator("#modal-style-btns button, #modal-style-btns [role=button]");
    const n = Math.min(await styles.count().catch(() => 0), 4);
    for (let i = 0; i < n; i += 1) {
      const b = await styles.nth(i).boundingBox();
      if (b) await cliquer(Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2));
      await attendre(2000);
    }
    marquer("styles");

    /* LE GESTE : attraper les sous-titres et les déplacer. */
    const sous = page.locator("#modal-sub-overlay");
    const bs = await sous.boundingBox();
    if (bs) {
      const ox = Math.round(bs.x + bs.width / 2);
      const oy = Math.round(bs.y + bs.height / 2);
      await bouger(ox, oy);
      await attendre(600);
      await page.mouse.down();
      TRACE.push({ t: s(), x: ox, y: oy, clic: true });
      for (const dy of [-50, -110, -170, -215]) {
        await page.mouse.move(ox, oy + dy, { steps: 12 });
        TRACE.push({ t: s(), x: ox, y: oy + dy, clic: true });
        await attendre(420);
      }
      await attendre(900);
      await page.mouse.move(ox, oy - 150, { steps: 10 });
      TRACE.push({ t: s(), x: ox, y: oy - 150, clic: true });
      await attendre(700);
      await page.mouse.up();
      cx = ox; cy = oy - 150;
      await attendre(2200);
    }
    marquer("sous-titres-deplaces");

    /* ── 8. LE BANDEAU D'ACCROCHE ───────────────────────────────────── */
    await cliquerSur('.klap-rail-btn[data-tab="hook"]');
    await attendre(2000);
    const bascule = page.locator('label.toggle:has(#modal-hook-on)').first();
    const bb = await bascule.boundingBox().catch(() => null);
    if (bb) await cliquer(Math.round(bb.x + bb.width / 2), Math.round(bb.y + bb.height / 2));
    await attendre(1800);
    const htxt = page.locator("#modal-hook-txt");
    if (await htxt.isVisible().catch(() => false)) {
      await cliquerSur("#modal-hook-txt");
      await page.keyboard.press("Control+A");
      await page.keyboard.type("10 CLIPS EN 3 MINUTES", { delay: 65 });
      await attendre(2400);
    }
    marquer("hook");

    /* ── 9. L'EXPORT ────────────────────────────────────────────────── */
    await cliquerSur("#modal-dl-btn");
    marquer("export-lance");
    await page.waitForEvent("download", { timeout: 300000 })
      .then(() => marquer("export-fini"))
      .catch(() => console.log("  (pas de téléchargement reçu)"));
    await attendre(6000);
    marquer("fin");
  } catch (e) {
    console.error("ÉCHEC :", e.message);
    await page.screenshot({ path: path.join(SORTIE, `parcours-${NOM}-echec.png`) }).catch(() => {});
  }

  const video = page.video();
  await ctx.close();
  if (video) {
    await video.saveAs(path.join(SORTIE, `parcours-${NOM}.webm`)).catch(() => {});
    console.log(`Vidéo : public/parcours-${NOM}.webm`);
  }
  fs.writeFileSync(
    path.join(SORTIE, `parcours-${NOM}.json`),
    JSON.stringify({ url: URL_VIDEO, reperes: REPERES, trace: TRACE }, null, 1),
  );
  console.log(`Repères + trace du curseur : public/parcours-${NOM}.json (${TRACE.length} points)`);
  process.exit(0);
})();
