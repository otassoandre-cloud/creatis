#!/usr/bin/env node
/**
 * Contrôle qualité des pages du blog avant déploiement.
 *
 *   node scripts/verifier-pages-seo.js              → toutes les pages de /blog
 *   node scripts/verifier-pages-seo.js clipper-gta-6 → une seule
 *
 * Vérifie : JSON-LD parsable, title/description/canonical présents et de bonne
 * longueur, canonical cohérent avec le nom de fichier, liens internes qui pointent
 * vers un fichier existant, et présence dans sitemap.xml + blog.html.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const cibles = process.argv.slice(2);

const sitemap = fs.readFileSync(path.join(RACINE, 'sitemap.xml'), 'utf8');
const grille = fs.readFileSync(path.join(RACINE, 'blog.html'), 'utf8');

let fichiers = fs
  .readdirSync(path.join(RACINE, 'blog'))
  .filter((f) => f.endsWith('.html'));
if (cibles.length)
  fichiers = fichiers.filter((f) => cibles.some((c) => f === c || f === c + '.html'));

let problemes = 0;
const signale = (f, msg) => {
  problemes++;
  console.log(`  ✗ ${f} — ${msg}`);
};

for (const f of fichiers) {
  const slug = f.replace(/\.html$/, '');
  const s = fs.readFileSync(path.join(RACINE, 'blog', f), 'utf8');

  // JSON-LD
  for (const m of s.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || []) {
    const corps = m.replace(/<\/?script[^>]*>/g, '');
    try {
      JSON.parse(corps);
    } catch (e) {
      signale(f, 'JSON-LD invalide : ' + e.message.slice(0, 60));
    }
  }

  // Metas
  const title = (s.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const desc = (s.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const canon = (s.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] || '';

  if (!title) signale(f, 'pas de <title>');
  else if (title.length > 75) signale(f, `title trop long (${title.length} car.)`);
  if (!desc) signale(f, 'pas de meta description');
  else if (desc.length < 70 || desc.length > 175)
    signale(f, `meta description hors plage (${desc.length} car., viser 70-175)`);
  if (!canon) signale(f, 'pas de canonical');
  else if (!canon.endsWith('/' + f) && !canon.endsWith('/' + slug))
    signale(f, `canonical incohérent : ${canon}`);

  // Liens internes
  for (const href of new Set(
    (s.match(/href="(\/[^"#]+)"/g) || []).map((h) => h.slice(6, -1))
  )) {
    if (/^\/(css|js|images|favicon)/.test(href)) continue;
    if (href.startsWith('/#') || href === '/') continue;
    const cible = href.replace(/^\//, '').split('#')[0];
    if (!fs.existsSync(path.join(RACINE, cible)) && !fs.existsSync(path.join(RACINE, cible + '.html')))
      signale(f, `lien mort : ${href}`);
  }

  // Surface
  if (!sitemap.includes(`/blog/${slug}`)) signale(f, 'absente du sitemap.xml');
  if (!grille.includes(`/blog/${slug}`)) signale(f, 'absente de blog.html');
}

console.log(
  `\n${fichiers.length} page(s) vérifiée(s) — ${problemes === 0 ? 'aucun problème' : problemes + ' problème(s)'}`
);
process.exit(problemes ? 1 : 0);
