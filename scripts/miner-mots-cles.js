#!/usr/bin/env node
/**
 * Mineur de mots-clés — demande réelle, pas supposée.
 *
 *   node scripts/miner-mots-cles.js                      → graines par défaut
 *   node scripts/miner-mots-cles.js --graines "clipping,clippeur"
 *   node scripts/miner-mots-cles.js --sortie mots.json
 *
 * Interroge l'autocomplétion Google (endpoint public, non authentifié). Ce que renvoie
 * cette API n'est pas une estimation de volume : ce sont les requêtes que Google juge
 * assez fréquentes pour les proposer. Absence de suggestion = demande négligeable.
 * C'est un signal binaire fiable, et gratuit, là où les outils payants donnent des
 * volumes approximatifs.
 *
 * Expansion : pour chaque graine, on interroge la graine seule, puis suffixée de a-z,
 * puis préfixée des interrogatifs français. Chaque réponse est elle-même une requête
 * réelle, ce qui permet une seconde passe sur les trouvailles.
 *
 * Le script compare ensuite les résultats aux pages du site et signale les trous.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const RACINE = path.join(__dirname, '..');

const arg = (nom, defaut) => {
  const i = process.argv.indexOf('--' + nom);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : defaut;
};

const GRAINES = arg('graines',
  'clipping,clippeur,clips viraux,faire des clips,gagner argent clips,logiciel clips,' +
  'shorts youtube,montage automatique,sous-titres automatiques,recadrer video,' +
  'whop clipping,clips tiktok,repurposing video,video verticale'
).split(',').map(s => s.trim()).filter(Boolean);

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const INTERROGATIFS = ['comment', 'pourquoi', 'combien', 'quel', 'quelle', 'est-ce que', 'meilleur', 'gratuit'];

/** Un appel à l'autocomplétion. Renvoie [] plutôt que de jeter : une graine sans
    suggestion est une information, pas une erreur. */
function suggerer(requete) {
  const url = 'https://suggestqueries.google.com/complete/search?client=firefox&hl=fr&gl=fr&q='
    + encodeURIComponent(requete);
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          resolve(Array.isArray(j[1]) ? j[1] : []);
        } catch { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.on('timeout', () => { req.destroy(); resolve([]); });
  });
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const trouves = new Map();   // requête -> {depuis, passe}
  const ajouter = (q, depuis, passe) => {
    const k = q.toLowerCase().trim();
    if (k && !trouves.has(k)) trouves.set(k, { depuis, passe });
  };

  // ---- Passe 1 : graines, graines + lettre, interrogatif + graine ----
  const requetes = [];
  for (const g of GRAINES) {
    requetes.push([g, g]);
    for (const l of ALPHABET) requetes.push([`${g} ${l}`, g]);
    for (const i of INTERROGATIFS) requetes.push([`${i} ${g}`, g]);
  }

  console.log(`Passe 1 : ${requetes.length} interrogations sur ${GRAINES.length} graines…`);
  let fait = 0;
  for (const [q, origine] of requetes) {
    for (const s of await suggerer(q)) ajouter(s, origine, 1);
    if (++fait % 40 === 0) process.stdout.write(`\r  ${fait}/${requetes.length} — ${trouves.size} requêtes`);
    await pause(70);   // on reste poli avec un endpoint public
  }
  console.log(`\r  passe 1 terminée : ${trouves.size} requêtes distinctes          `);

  const DOMAINE = /clip|short|vertical|sous-titre|montage|recadr|viral|tiktok|reel|whop|repurpos/i;
  /* « clipping » et « clipper » sont des homonymes tres charges en francais : tondeuses a
     cheveux (wahl, babyliss), la marque de the et de briquets Clipper, les LA Clippers,
     les voiliers, le clipping audio, QGIS... Mesure du 25/09/2026 : sans ce filtre, plus
     de la moitie des suggestions remontees n'ont aucun rapport avec la video. */
  const BRUIT = new RegExp('\\b(' + [
    'wahl', 'babyliss', 'tondeuse', 'cheveux?', 'barbe', 'coiffeur',
    'the', 'tea', 'briquet', 'nba', 'lakers', 'basket',
    'bateau', 'voilier', 'ship', 'boat', 'race', 'quay', 'wind',
    'card', 'nasa', 'qgis', 'vst', 'audio', 'golf', 'jbl', 'zenka', 'jouet',
    'neon', 'weed', 'oil', 'gaz', 'erp', 'exe', 'ear', 'rym', 'keo', 'jul', 'jrl',
    'jet', 'wiki', 'shop', 'soft', 'usa', 'xyz', 'zero', 'gold', 'duet',
  ].join('|') + ')\\b', 'i');

  // ---- Passe 2 : on re-interroge les trouvailles les plus prometteuses ----
  // Critere : du domaine, hors bruit, et au moins trois mots (longue traine).
  const aCreuser = [...trouves.keys()]
    .filter(q => DOMAINE.test(q) && !BRUIT.test(q) && q.split(' ').length >= 3)
    .slice(0, 120);

  console.log(`Passe 2 : ${aCreuser.length} requêtes approfondies…`);
  fait = 0;
  for (const q of aCreuser) {
    for (const s of await suggerer(q + ' ')) ajouter(s, q, 2);
    if (++fait % 30 === 0) process.stdout.write(`\r  ${fait}/${aCreuser.length} — ${trouves.size} requêtes`);
    await pause(70);
  }
  console.log(`\r  passe 2 terminée : ${trouves.size} requêtes distinctes          `);

  // ---- Croisement avec les pages existantes ----
  const pages = [];
  const lire = (dir) => {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) { if (!/node_modules|\.git/.test(f)) lire(p); }
      else if (f.endsWith('.html')) {
        const s = fs.readFileSync(p, 'utf8').slice(0, 4000);
        const t = (s.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
        const d = (s.match(/name="description" content="([^"]*)"/) || [])[1] || '';
        pages.push({ fichier: path.relative(RACINE, p), texte: (t + ' ' + d).toLowerCase() });
      }
    }
  };
  lire(path.join(RACINE, 'blog'));
  for (const f of fs.readdirSync(RACINE)) {
    if (f.endsWith('.html')) {
      const s = fs.readFileSync(path.join(RACINE, f), 'utf8').slice(0, 4000);
      const t = (s.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
      const d = (s.match(/name="description" content="([^"]*)"/) || [])[1] || '';
      pages.push({ fichier: f, texte: (t + ' ' + d).toLowerCase() });
    }
  }

  /* Couverture approximative : une requête est « couverte » si les mots qui la portent
     (hors mots vides) se retrouvent dans le titre ou la description d'une page. */
  const VIDES = new Set(['de','du','des','le','la','les','un','une','en','a','à','et','ou','pour','sur','avec','sans','est','ce','que','qui','comment','pourquoi','combien','quel','quelle','plus','son','sa','ses','mon','ma','mes','ton','ta','tes','il','elle','on','je','tu']);
  const motsUtiles = (q) => q.split(/[\s'’-]+/).filter(m => m.length > 2 && !VIDES.has(m));

  const couverte = (q) => {
    const mots = motsUtiles(q);
    if (!mots.length) return true;
    return pages.some(p => mots.filter(m => p.texte.includes(m)).length / mots.length >= 0.7);
  };

  const toutes = [...trouves.entries()].map(([q, meta]) => ({ requete: q, ...meta, couverte: couverte(q) }));
  const trous = toutes.filter(t => !t.couverte && DOMAINE.test(t.requete) && !BRUIT.test(t.requete));

  const sortie = arg('sortie', 'mots-cles.json');
  fs.writeFileSync(sortie, JSON.stringify({ genere_le: new Date().toISOString(), graines: GRAINES, total: toutes.length, resultats: toutes }, null, 2));

  console.log(`\n${toutes.length} requêtes réelles collectées — ${trous.length} non couvertes par une page du site.`);
  console.log(`Détail complet : ${sortie}\n`);
  console.log('--- TROUS, par longueur croissante (les plus courts sont les plus demandés) ---');
  for (const t of trous.sort((a, b) => a.requete.length - b.requete.length).slice(0, 60)) {
    console.log(`  ${t.requete}`);
  }
})();
