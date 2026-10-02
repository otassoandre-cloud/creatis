#!/usr/bin/env node
/**
 * YOUTUBE STATS — relève vues, J'aime et commentaires par publication.
 *
 *   node scripts/youtube-stats.js
 *
 * ── POURQUOI CE FICHIER EXISTE ───────────────────────────────────────────
 * `CONSIGNES.md` §0 énumère ce que la boucle d'apprentissage ne voit pas. En
 * tête de liste depuis le 28/09 : « YouTube. Pas encore relevé du tout. »
 * Conséquence, `apprendre.js` ne classait QUE des publications TikTok — alors
 * que YouTube est le seul réseau où le lien est cliquable sans mille abonnés,
 * donc le seul où une inscription peut être attribuée.
 *
 * ── LE PIÈGE DÉJÀ PAYÉ SUR LES DEUX AUTRES RÉSEAUX ───────────────────────
 * La table de Studio est VIRTUALISÉE : les lignes hors écran sortent du DOM.
 * Une lecture unique a déjà rendu 9 lignes sur 42 côté TikTok, et le même
 * défaut existait côté Instagram. On accumule donc à CHAQUE pas de défilement,
 * dans une Map indexée par l'identifiant de la vidéo.
 *
 * ── ET LE PIÈGE PROPRE À YOUTUBE ─────────────────────────────────────────
 * La chaîne a DEUX onglets, « Vidéos » et « Shorts », et ils ne se mélangent
 * pas. Le 28/09 j'ai conclu « chaîne vide » en ne lisant que Vidéos, alors que
 * la chaîne portait 24 Shorts. On lit les deux, toujours.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const BRIEFS = path.join(RACINE, 'social', 'briefs');
const STATS = path.join(RACINE, 'social', 'stats');
const HANDLE = process.argv.includes('--handle')
  ? process.argv[process.argv.indexOf('--handle') + 1]
  : '@Creatis_officiel';

const jour = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

/** « il y a 3 h » / « il y a 4 j » → heures écoulées, pour juger à âge égal. */
const enHeures = (t) => {
  const m = String(t).match(/il y a (\d+)\s*(minute|heure|jour|semaine|mois|an)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const f = { minute: 1 / 60, heure: 1, jour: 24, semaine: 168, mois: 730, an: 8760 };
  return Math.round(n * (f[m[2]] || 1));
};

/**
 * Lit un onglet PUBLIC de la chaîne, dans un vrai navigateur.
 *
 * ── TROIS CHEMINS ESSAYÉS AVANT CELUI-CI ─────────────────────────────────
 * 1. La table de YouTube Studio : 29 lignes et 29 zéros. À 1500 px de large,
 *    Studio laisse tomber les colonnes de chiffres ; il ne restait que « 1 » et
 *    « 0 », sans étiquette pour savoir ce qu'ils comptaient.
 * 2. `curl` sur la page publique : a marché une fois, puis a rendu une page
 *    SANS aucun compteur. La réponse varie selon la détection de robot — une
 *    source qui marche une fois sur deux ne vaut rien pour une mesure.
 * 3. `curl` avec un User-Agent de navigateur : réponse vide, 0 octet.
 *
 * Le navigateur du profil social rend la page comme un visiteur. Les cartes
 * affichent « N vues » en clair, et la mesure est reproductible.
 *
 * ── ET LE PIÈGE DÉJÀ PAYÉ TROIS FOIS ─────────────────────────────────────
 * La grille est VIRTUALISÉE. Une lecture unique a rendu 9 lignes sur 42 côté
 * TikTok, et le même défaut existait côté Instagram. On accumule à CHAQUE pas
 * de défilement, dans une Map indexée par l'identifiant.
 */
const lireOnglet = async (page, onglet) => {
  await page.goto(`https://www.youtube.com/${HANDLE}/${onglet}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForTimeout(4500);

  /* Marqueur POSITIF : l'absence de cartes ne prouve pas que la chaîne est
     vide, elle peut aussi dire que la page n'a pas fini de se peindre. */
  const peint = await page
    .locator('ytd-rich-item-renderer, ytm-shorts-lockup-view-model')
    .first()
    .waitFor({ timeout: 25000 })
    .then(() => true)
    .catch(() => false);
  if (!peint) {
    console.log(`  onglet ${onglet} : aucune carte peinte`);
    return [];
  }

  const vus = new Map();
  let immobile = 0;
  for (let pas = 0; pas < 30 && immobile < 4; pas++) {
    const lot = await page.evaluate(() => {
      const out = [];
      const cartes = document.querySelectorAll(
        'ytd-rich-item-renderer, ytm-shorts-lockup-view-model',
      );
      for (const c of cartes) {
        const a = c.querySelector('a[href*="/watch?v="], a[href*="/shorts/"]');
        const href = a?.getAttribute('href') || '';
        const id = (href.match(/(?:watch\?v=|\/shorts\/)([A-Za-z0-9_-]{11})/) || [])[1];
        if (!id) continue;
        const txt = (c.innerText || '').replace(/\s+/g, ' ').trim();
        out.push({ id, txt });
      }
      return out;
    });

    const avant = vus.size;
    for (const l of lot) if (!vus.has(l.id)) vus.set(l.id, l);
    immobile = vus.size === avant ? immobile + 1 : 0;

    await page.mouse.wheel(0, 1600);
    await page.waitForTimeout(1100);
  }

  const out = [];
  for (const [id, { txt }] of vus) {
    /* ── LE COMPTEUR N'A PAS LA MÊME FORME SELON L'ONGLET ──────────────
       Shorts : « … 1,9 k vues il y a 2 mois »
       Vidéos : « 1:33 Noter un clip sur 100 … 1 il y a 3 h »  ← SANS « vues »

       La première version exigeait le mot « vues » : elle lisait les 23 Shorts
       et rendait ZÉRO vidéo longue, en silence. Ce qui est constant dans les
       deux cas, c'est le nombre placé juste AVANT « il y a ». */
    const mv =
      /* Vidéos : « … 1 il y a 3 h » — le nombre précède « il y a », sans mot.
         Shorts : « … 1,9 k vues » — le mot est là, mais PAS l'âge. Exiger
         l'un ou l'autre seul fait tomber une moitié du compte à zéro : les
         deux premières versions ont rendu 23 Shorts et 0 vidéo, puis
         4 vidéos et 0 Short. */
      txt.match(/([\d  .,]+)\s*([kKmM])?\s*(?:vues?)?\s*il y a/) ||
      txt.match(/([\d  .,]+)\s*([kKmM])?\s*vues?/i);
    const ma = txt.match(/il y a [^·]{1,22}/i);
    if (!mv) continue;
    let n = parseFloat(mv[1].replace(/[  ]/g, '').replace(',', '.'));
    if (mv[2] && /k/i.test(mv[2])) n *= 1000;
    if (mv[2] && /m/i.test(mv[2])) n *= 1000000;
    out.push({
      id,
      titre: txt.slice(0, txt.indexOf(mv[0])).trim().slice(0, 90),
      vues: Math.round(n),
      age: ma ? ma[0].trim() : '',
      heures: ma ? enHeures(ma[0]) : null,
      onglet: onglet === 'shorts' ? 'Short' : 'Vidéo',
    });
  }
  console.log(`  onglet ${onglet} : ${out.length} publication(s)`);
  return out;
};

(async () => {
try {
  console.log(`YOUTUBE ${HANDLE} — relevé du ${jour}`);
  console.log('================================================================');

  const { chromium } = require('playwright');
  const ctx = await chromium.launchPersistentContext(
    path.join(RACINE, '.playwright-profile-social'),
    { channel: 'chrome', headless: false, viewport: { width: 1500, height: 1000 } },
  );
  const page = ctx.pages()[0] || (await ctx.newPage());

  /* LES DEUX ONGLETS, TOUJOURS. Le 28/09 j'ai conclu « chaîne vide » en ne
     lisant que Vidéos, alors que la chaîne portait 24 Shorts. */
  const tout = [...(await lireOnglet(page, 'videos')), ...(await lireOnglet(page, 'shorts'))];
  await ctx.close().catch(() => {});

  if (!tout.length) {
    console.error('Aucune publication lue — la page a changé de forme, ou le handle est faux.');
    process.exit(1);
  }

  for (const d of [BRIEFS, STATS]) fs.mkdirSync(d, { recursive: true });

  const sortie = [];
  sortie.push(`YOUTUBE — ${jour} — ${tout.length} publication(s)`);
  sortie.push('');

  for (const groupe of ['Vidéo', 'Short']) {
    const l = tout.filter((p) => p.onglet === groupe).sort((a, b) => b.vues - a.vues);
    if (!l.length) continue;
    sortie.push(`${groupe.toUpperCase()}S — ${l.length}`);
    for (const p of l) {
      sortie.push(
        `  ${String(p.vues).padStart(6)} vue${p.vues > 1 ? 's' : ' '}  ${String(p.age).padEnd(14)} ${p.titre.slice(0, 56)}`,
      );
    }
    const v = l.map((p) => p.vues).sort((a, b) => a - b);
    sortie.push(`  → médiane ${v[Math.floor(v.length / 2)]} · meilleure ${v[v.length - 1]}`);
    sortie.push('');
  }

  /* Comparer à âge égal : une vidéo de 3 h et une de 3 mois ne se jugent pas
     sur le même chiffre brut. */
  const jeunes = tout.filter((p) => p.heures !== null && p.heures <= 48);
  if (jeunes.length) {
    sortie.push('MOINS DE 48 H — les seules comparables entre elles');
    for (const p of jeunes.sort((a, b) => b.vues - a.vues)) {
      sortie.push(`  ${String(p.vues).padStart(6)} vues  ${String(p.age).padEnd(14)} ${p.titre.slice(0, 56)}`);
    }
    sortie.push('');
  }

  sortie.push("YouTube est le seul réseau où le lien de la description est cliquable");
  sortie.push('sans mille abonnés. Juger sur les clics vers creatis.app, pas sur les vues.');

  const txt = sortie.join('\n') + '\n';
  console.log(txt);
  fs.writeFileSync(path.join(BRIEFS, `youtube-${jour}.txt`), txt);
  fs.writeFileSync(
    path.join(STATS, `youtube-${jour}.json`),
    JSON.stringify({ jour, reseau: 'youtube', handle: HANDLE, publications: tout }, null, 2),
  );
  console.log(`→ social/stats/youtube-${jour}.json`);
} catch (e) {
  console.error('Échec : ' + String(e.message).split('\n')[0]);
  process.exit(1);
}
/* La connexion au navigateur garde Node en vie sans cet arret explicite. */
process.exit(process.exitCode || 0);
})();
