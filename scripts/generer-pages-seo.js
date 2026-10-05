#!/usr/bin/env node
/**
 * Génère les pages SEO d'un lot, puis les surface : sitemap.xml + blog.html.
 *
 *   node scripts/generer-pages-seo.js pages-clipping-1 pages-clipping-2
 *   node scripts/generer-pages-seo.js pages-clipping-1 --dry
 *
 * Idempotent : relancer ne crée pas de doublon dans le sitemap ni dans la grille.
 * Le contenu des pages, lui, est toujours réécrit — la source de vérité est le
 * fichier de données, jamais le HTML généré.
 */

const fs = require('fs');
const path = require('path');
const { gabarit } = require('./seo-gabarit');

const RACINE = path.join(__dirname, '..');
const dry = process.argv.includes('--dry');
const lots = process.argv.slice(2).filter((a) => !a.startsWith('--'));

if (!lots.length) {
  console.error('Indique au moins un lot : node scripts/generer-pages-seo.js pages-clipping-1');
  process.exit(1);
}

const pages = lots.flatMap((lot) => require('./' + lot.replace(/\.js$/, '')));

// 1. Écrire les pages ---------------------------------------------------------
const ecrites = [];
for (const p of pages) {
  const dest = path.join(RACINE, 'blog', p.slug + '.html');
  const html = gabarit(p);
  if (!dry) fs.writeFileSync(dest, html, 'utf8');
  ecrites.push({ slug: p.slug, neuf: !fs.existsSync(dest) || dry, octets: html.length, p });
  console.log(`page   ${p.slug}.html  (${(html.length / 1024).toFixed(1)} ko)`);
}

// 2. Sitemap ------------------------------------------------------------------
{
  const f = path.join(RACINE, 'sitemap.xml');
  let s = fs.readFileSync(f, 'utf8');
  let ajouts = 0;
  for (const p of pages) {
    if (s.includes(`/blog/${p.slug}.html`)) continue;
    const ligne = `  <url><loc>https://creatis.app/blog/${p.slug}.html</loc><lastmod>${p.date}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>\n`;
    s = s.replace('</urlset>', ligne + '</urlset>');
    ajouts++;
  }
  if (!dry && ajouts) fs.writeFileSync(f, s, 'utf8');
  console.log(`\nsitemap : ${ajouts} ajout(s)`);
}

// 3. Grille blog.html ---------------------------------------------------------
{
  const f = path.join(RACINE, 'blog.html');
  let s = fs.readFileSync(f, 'utf8');
  // blog.html est en CRLF : on repère l'ancre par regex plutôt qu'en littéral.
  const trouve = s.match(/([ \t]*<div class="articles">\r?\n)/);
  if (!trouve) {
    console.error('Ancre <div class="articles"> introuvable dans blog.html — rien ajouté.');
  } else {
    const ancre = trouve[1];
    const nl = ancre.includes('\r\n') ? '\r\n' : '\n';
    let ajouts = 0;
    // On insère en tête de grille, donc en ordre inverse pour garder l'ordre du lot.
    for (const p of [...pages].reverse()) {
      if (s.includes(`/blog/${p.slug}.html"`)) continue;
      const carte = [
        `    <a href="/blog/${p.slug}.html" class="article-card">`,
        `      <h2>${p.h1}</h2>`,
        `      <p>${p.description}</p>`,
        `      <div class="article-meta">`,
        `        <span class="article-tag">${p.tag || 'Clipping'}</span>`,
        `        <span>${p.dateLisible}</span>`,
        `        <span>${p.minutes} min</span>`,
        `      </div>`,
        `    </a>`,
        '',
      ].join(nl);
      s = s.replace(ancre, ancre + carte);
      ajouts++;
    }
    if (!dry && ajouts) fs.writeFileSync(f, s, 'utf8');
    console.log(`blog.html : ${ajouts} carte(s)`);
  }
}

console.log(
  `\n${pages.length} page(s) traitée(s)${dry ? ' — SIMULATION, rien écrit' : ''}.\n` +
    `Vérifie ensuite : node scripts/verifier-pages-seo.js`
);
