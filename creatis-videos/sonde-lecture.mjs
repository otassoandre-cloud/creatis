/* SONDE DE LECTURE — repond a une seule question, avec des chiffres :
   dans la grille et dans la fiche d'un clip, l'image BOUGE-t-elle ?
   On ne regarde pas si un <video> existe, on mesure si `currentTime` avance. */
import "./env-local.mjs";
import { chromium, devices } from "playwright";

const URL_VIDEO = process.argv[2];
const SITE = "https://creatis.app";
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const ctx = await (await chromium.launch({ headless: true })).newContext({
  ...devices["iPhone 13"], viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false,
});
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") console.log("  [page]", m.text().slice(0, 120)); });

await page.goto(`${SITE}/auth.html`, { waitUntil: "domcontentloaded" });
await page.click("#toggle-btn");
await page.waitForFunction(() => document.getElementById("btn-submit-texte")?.textContent?.includes("connecter"), { timeout: 10000 });
await page.fill("#auth-email", process.env.CREATIS_EMAIL);
await page.fill("#auth-password", process.env.CREATIS_MDP);
await page.click("#btn-submit");
await page.waitForURL((u) => !u.pathname.includes("auth.html"), { timeout: 60000 });
console.log("· connecte");

await page.goto(`${SITE}/clips-v2.html`, { waitUntil: "domcontentloaded" });
await attendre(2500);
const champ = page.locator("#yt-url-input");
await champ.click();
await champ.type(URL_VIDEO, { delay: 15 });
await page.click("#btn-analyze");
console.log("· analyse lancee");
await page.waitForSelector(".clip-card", { timeout: 15 * 60 * 1000 });
await attendre(12000);

const grille = await page.evaluate(() => {
  const cartes = [...document.querySelectorAll(".clip-thumb-wrap")];
  return {
    cartes: cartes.length,
    avecImg: cartes.filter((c) => c.querySelector("img")).length,
    avecVideo: cartes.filter((c) => c.querySelector("video")).length,
    enAttente: cartes.filter((c) => c.querySelector(".clip-thumb-empty")).length,
  };
});
console.log("GRILLE :", JSON.stringify(grille));

await page.locator(".clip-card").first().click();
await page.waitForSelector("#modal-player-wrap", { timeout: 60000 });
await attendre(15000);

const lecture = await page.evaluate(async () => {
  const v = document.getElementById("modal-video");
  if (!v) return { erreur: "pas d element video" };
  const t1 = v.currentTime;
  await new Promise((r) => setTimeout(r, 3000));
  return {
    affiche: getComputedStyle(v).display,
    src: (v.currentSrc || v.src || "").slice(0, 60),
    enPause: v.paused,
    readyState: v.readyState,
    t1: +t1.toFixed(2),
    t2: +v.currentTime.toFixed(2),
    avance: +(v.currentTime - t1).toFixed(2),
  };
});
console.log("FICHE  :", JSON.stringify(lecture));
console.log(lecture.avance > 0.5 ? "=> LA VIDEO JOUE" : "=> LA VIDEO NE JOUE PAS");
await ctx.close();
process.exit(0);
