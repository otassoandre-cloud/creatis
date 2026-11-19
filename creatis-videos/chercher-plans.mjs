/**
 * CHERCHER DES PLANS LIBRES — Mixkit, sans compte ni clé.
 *
 *   node chercher-plans.mjs <mot-clé> [combien] [préfixe]
 *   node chercher-plans.mjs --liste    → ce qui est déjà téléchargé
 *
 * ── POURQUOI CE FICHIER ──────────────────────────────────────────────────
 * Demande du 16/10 : la vidéo longue doit ressembler à un court-métrage —
 * une histoire, des plans, des gens qui tapent sur un ordinateur pendant que
 * la voix parle. Jusqu'ici nos fonds venaient de trois B-rolls de 10 à 17
 * secondes et de clips de divertissement : de quoi illustrer un propos, pas
 * de quoi raconter.
 *
 * Et la génération d'images reste fermée, vérifié ce matin :
 *   HF_TOKEN vide · OpenAI « credit_balance_exhausted » · Gemini image 429.
 *
 * Mixkit donne des fichiers 1080p en lien direct, sans compte et sans clé.
 * Sa licence autorise l'usage commercial sans attribution — ce qu'on fait
 * ici : les plans servent de matière à un film, ils ne sont pas revendus.
 *
 * ── CE QUE LE SCRIPT NE FAIT PAS ─────────────────────────────────────────
 * Il ne choisit pas à ma place. Un plan se regarde avant d'être monté : le
 * 13/10, un B-roll « studio » montrait une plaque « WORLD WAR 11 » à sa
 * neuvième seconde, et le 15/10 quatre plans sur cinq montraient un dos
 * parce qu'ils avaient été vérifiés sur une seule image. On télécharge, puis
 * on fait une planche contact.
 */
import fs from "fs";
import path from "path";
import https from "https";

const SORTIE = path.resolve("public/stock");
fs.mkdirSync(SORTIE, { recursive: true });

const MOT = process.argv[2];
const COMBIEN = Number(process.argv[3] || 3);
const PREFIXE = process.argv[4] || (MOT || "plan").replace(/[^a-z0-9]+/gi, "-");

if (process.argv.includes("--liste")) {
  const f = fs.readdirSync(SORTIE).filter((x) => x.endsWith(".mp4"));
  console.log(`${f.length} plan(s) dans public/stock :`);
  for (const x of f) {
    const o = fs.statSync(path.join(SORTIE, x));
    console.log(`  ${x.padEnd(34)} ${(o.size / 1048576).toFixed(1)} Mo`);
  }
  process.exit(0);
}

if (!MOT) {
  console.error("Usage : node chercher-plans.mjs <mot-clé> [combien] [préfixe]");
  process.exit(2);
}

const lire = (url) => new Promise((ok, ko) => {
  https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } }, (r) => {
    if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
      return lire(r.headers.location).then(ok, ko);
    }
    let d = "";
    r.setEncoding("utf8");
    r.on("data", (c) => { d += c; });
    r.on("end", () => ok(d));
  }).on("error", ko);
});

const telecharger = (url, vers) => new Promise((ok, ko) => {
  const f = fs.createWriteStream(vers);
  https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (r) => {
    if (r.statusCode !== 200) { f.close(); fs.unlinkSync(vers); return ko(new Error(`HTTP ${r.statusCode}`)); }
    r.pipe(f);
    f.on("finish", () => f.close(() => ok()));
  }).on("error", (e) => { f.close(); ko(e); });
});

(async () => {
  const page = await lire(`https://mixkit.co/free-stock-video/${encodeURIComponent(MOT)}/`);
  /* On ne garde que le 1080 : le 360 est inutilisable en plein cadre, et
     Mixkit sert les deux dans la même page. */
  const liens = [...new Set(
    [...page.matchAll(/https:\/\/assets\.mixkit\.co\/videos\/(\d+)\/\1-1080\.mp4/g)].map((m) => m[0]),
  )];
  if (!liens.length) {
    console.error(`Aucun plan 1080p pour « ${MOT} ». Essayer un mot plus courant (typing, office, money…).`);
    process.exit(3);
  }
  console.log(`${liens.length} plan(s) trouvé(s), on prend ${Math.min(COMBIEN, liens.length)}`);
  let n = 1;
  for (const u of liens.slice(0, COMBIEN)) {
    const nom = `${PREFIXE}-${n}.mp4`;
    const vers = path.join(SORTIE, nom);
    if (fs.existsSync(vers)) { console.log(`  ${nom} — déjà là`); n += 1; continue; }
    try {
      await telecharger(u, vers);
      const o = fs.statSync(vers);
      console.log(`  ${nom.padEnd(28)} ${(o.size / 1048576).toFixed(1)} Mo`);
    } catch (e) {
      console.log(`  ${nom} — échec : ${e.message}`);
    }
    n += 1;
  }
})();
