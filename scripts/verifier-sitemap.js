#!/usr/bin/env node
/**
 * Contrôle technique du sitemap en production.
 *
 *   node scripts/verifier-sitemap.js
 *
 * Pour chaque URL déclarée : code HTTP, redirection, balise robots noindex,
 * canonical qui pointe ailleurs, et conflit avec robots.txt. Ce sont les quatre
 * causes habituelles des « avertissements » que Search Console remonte sur un
 * sitemap — elles gaspillent du budget d'exploration sans rien rapporter.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const CONCURRENCE = 6;

const sitemap = fs.readFileSync(path.join(RACINE, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

// Règles Disallow de robots.txt, pour détecter le conflit sitemap/robots.
const robots = fs.readFileSync(path.join(RACINE, 'robots.txt'), 'utf8');
const interdits = [...robots.matchAll(/^Disallow:\s*(\S+)/gm)].map((m) => m[1]);

async function controler(url) {
  const pb = [];
  try {
    const rep = await fetch(url, { redirect: 'manual' });

    if (rep.status >= 300 && rep.status < 400)
      pb.push(`redirection ${rep.status} vers ${rep.headers.get('location')}`);
    else if (!rep.ok) pb.push(`HTTP ${rep.status}`);

    if (rep.ok) {
      const html = await rep.text();
      // On ne lit que l'en-tête : au-delà, les balises qui nous intéressent n'existent plus.
      const tete = html.slice(0, 8000);
      if (/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(tete))
        pb.push('balise noindex');
      const canon = (tete.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i) || [])[1];
      if (canon && canon.replace(/\/$/, '') !== url.replace(/\/$/, ''))
        pb.push(`canonical vers ${canon}`);
    }
  } catch (e) {
    pb.push('injoignable : ' + e.message.slice(0, 50));
  }

  const chemin = new URL(url).pathname;
  for (const d of interdits) {
    if (d !== '/' && chemin.startsWith(d)) pb.push(`bloqué par robots.txt (${d})`);
  }
  return { url, pb };
}

(async () => {
  console.log(`${urls.length} URL(s) déclarées dans sitemap.xml\n`);
  const resultats = [];
  for (let i = 0; i < urls.length; i += CONCURRENCE) {
    resultats.push(...(await Promise.all(urls.slice(i, i + CONCURRENCE).map(controler))));
    process.stdout.write(`\r  contrôlées : ${Math.min(i + CONCURRENCE, urls.length)}/${urls.length}`);
  }
  console.log('\n');

  const fautives = resultats.filter((r) => r.pb.length);
  for (const r of fautives) console.log(`  ✗ ${r.url}\n      ${r.pb.join('\n      ')}`);

  console.log(
    fautives.length
      ? `\n${fautives.length} URL(s) à corriger sur ${urls.length}`
      : `\nLes ${urls.length} URLs répondent 200, sans noindex, sans redirection, sans conflit robots.txt.`
  );
  process.exit(fautives.length ? 1 : 0);
})();
