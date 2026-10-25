#!/usr/bin/env node
/**
 * Pages d'outil nommées d'après la tâche.
 *
 *   node scripts/generer-pages-outils.js [--dry]
 *
 * Pourquoi ces pages existent (mesuré le 25/09/2026) :
 *
 * 1. Les concurrents ne gagnent pas les requêtes de tâche avec des articles, mais avec
 *    des pages d'outil : capcut.com/fr-fr/tools/ai-long-video-to-short-video,
 *    vizard.ai/fr/tools/resize-video-for-youtube-shorts, wayin.ai/fr/tools/... Le site
 *    avait 74 articles et presque aucune page d'entrée nommée comme ce que les gens tapent.
 *
 * 2. Le mineur de mots-clés (scripts/miner-mots-cles.js) a confirmé la demande réelle sur
 *    trois grappes françaises qu'aucune page ne couvrait : « ia montage vidéo » et ses
 *    variantes, « couper une vidéo youtube », « vidéo longue en short ».
 *
 * 3. Il a aussi invalidé le pari précédent : « clipping / clippeur » est un champ pollué
 *    en français (tondeuses, thé Clipper, LA Clippers, voiliers). D'où le passage au
 *    vocabulaire de la tâche.
 *
 * Ces pages ne sont pas des coquilles : elles embarquent le vrai champ de saisie et
 * démarrent le travail, exactement comme le hero de l'accueil (localStorage
 * `creatis_pending_yt` puis redirection vers l'inscription).
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const dry = process.argv.includes('--dry');
const BASE = 'https://creatis.app';

const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function gabarit(p) {
  const url = `${BASE}/${p.slug}.html`;
  const ld = [
    {
      '@context': 'https://schema.org', '@type': 'WebApplication',
      name: p.h1, description: p.description, url,
      applicationCategory: 'MultimediaApplication',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      inLanguage: 'fr',
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: p.faq.map((f) => ({
        '@type': 'Question', name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.r },
      })),
    },
  ];

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${p.title} | Créatis</title>
  <meta name="description" content="${attr(p.description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${attr(p.h1)}">
  <meta property="og:description" content="${attr(p.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:locale" content="fr_FR">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"></noscript>
  <link rel="stylesheet" href="css/style.css">
${ld.map((x) => '  <script type="application/ld+json">\n' + JSON.stringify(x, null, 2) + '\n  </script>').join('\n')}
  <script defer src="/_vercel/insights/script.js"></script>
  <style>
    .outil-page { max-width: 880px; margin: 0 auto; padding: 52px 24px 80px; }
    .outil-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); color: var(--vert, #10b981); padding: 6px 14px; border-radius: 100px; font-size: 13px; font-weight: 600; margin-bottom: 18px; }
    .outil-page h1 { font-size: clamp(27px, 5vw, 40px); line-height: 1.15; margin: 0 0 14px; }
    .outil-page h1 span { color: var(--vert, #10b981); }
    .outil-sub { color: #9ca3af; font-size: 17px; line-height: 1.7; margin: 0 0 30px; max-width: 640px; }
    .outil-form { display: flex; gap: 8px; flex-wrap: wrap; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 8px; margin-bottom: 10px; }
    .outil-form input { flex: 1 1 260px; background: none; border: none; outline: none; color: #fff; font-size: 15px; font-family: inherit; padding: 12px 14px; }
    .outil-form button { background: var(--vert, #10b981); color: #000; border: none; border-radius: 10px; padding: 12px 24px; font-weight: 700; font-size: 15px; font-family: inherit; cursor: pointer; }
    .outil-hint { font-size: 13px; color: #f97316; margin: 0 0 18px; display: none; }
    .outil-rassure { font-size: 13px; color: #6b7280; margin: 0 0 44px; }
    .outil-page h2 { font-size: 23px; margin: 40px 0 14px; }
    .outil-page h3 { font-size: 17px; margin: 26px 0 8px; color: var(--vert, #10b981); }
    .outil-page p, .outil-page li { color: #d1d5db; line-height: 1.8; }
    .etapes { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 22px 0; }
    .etape { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.09); border-radius: 12px; padding: 18px; }
    .etape b { display: block; color: #fff; margin-bottom: 6px; }
    .etape span { font-size: 14px; color: #9ca3af; line-height: 1.6; }
    .outil-faq details { border-bottom: 1px solid rgba(255,255,255,0.1); padding: 14px 0; }
    .outil-faq summary { cursor: pointer; font-weight: 600; color: #fff; }
    .outil-faq p { margin: 10px 0 0; font-size: 14.5px; }
    .outil-cta { background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.25); border-radius: 16px; padding: 28px; text-align: center; margin-top: 44px; }
    .outil-cta h3 { margin: 0 0 8px; font-size: 20px; color: #fff; }
    .outil-cta p { color: #9ca3af; margin: 0 0 18px; font-size: 14.5px; }
    .outil-cta a { display: inline-block; background: var(--vert, #10b981); color: #000; padding: 14px 30px; border-radius: 10px; font-weight: 700; text-decoration: none; }
  </style>
</head>
<body>

<nav style="display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.08);max-width:1100px;margin:0 auto">
  <a href="/" style="color:#fff;text-decoration:none;font-weight:800">Créatis</a>
  <a href="/outils.html" style="color:#9ca3af;text-decoration:none;font-size:14px">Tous les outils</a>
</nav>

<main class="outil-page">
  <div class="outil-badge">${p.badge}</div>
  <h1>${p.h1html}</h1>
  <p class="outil-sub">${p.sub}</p>

  <form class="outil-form" onsubmit="return demarrer(event)">
    <input type="text" id="lien" placeholder="${attr(p.placeholder)}" inputmode="url"
           autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
    <button type="submit">${p.bouton} ⚡</button>
  </form>
  <p class="outil-hint" id="hint"></p>
  <p class="outil-rassure">Analyse gratuite · sans carte bancaire · tu vois les clips avant de payer</p>

${p.corps.trim()}

  <h2>Questions fréquentes</h2>
  <div class="outil-faq">
${p.faq.map((f) => `    <details>\n      <summary>${f.q}</summary>\n      <p>${f.r}</p>\n    </details>`).join('\n')}
  </div>

  <div class="outil-cta">
    <h3>${p.cta}</h3>
    <p>Analyse gratuite · sans carte bancaire</p>
    <a href="/clips-v2.html">⚡ Essayer maintenant</a>
  </div>
</main>

<footer style="text-align:center;padding:32px 24px;color:#6b7280;font-size:13px;border-top:1px solid rgba(255,255,255,0.08);margin-top:40px">
  © 2026 Créatis · <a href="/outils.html" style="color:#9ca3af">Outils</a> · <a href="/blog.html" style="color:#9ca3af">Blog</a> · <a href="/cgu.html" style="color:#9ca3af">CGU</a>
</footer>

<script>
/* Meme comportement que le hero de l'accueil : on memorise le lien puis on passe par
   l'inscription. Le lien n'est pas perdu en route, c'est tout l'interet. */
function demarrer(e) {
  e.preventDefault();
  var champ = document.getElementById('lien');
  var hint = document.getElementById('hint');
  var v = (champ && champ.value || '').trim();
  var estYT = /^(https?:\\/\\/)?(www\\.)?(youtube\\.com|youtu\\.be|m\\.youtube\\.com)\\//i.test(v);
  if (v && !estYT) {
    hint.textContent = "Ce lien n'est pas une URL YouTube — exemple : https://youtu.be/xxxxxxxxxxx";
    hint.style.display = 'block';
    champ.focus();
    return false;
  }
  hint.style.display = 'none';
  if (v) { try { localStorage.setItem('creatis_pending_yt', JSON.stringify({ url: v, ts: Date.now() })); } catch (_) {} }
  window.location.href = '/auth.html?returnUrl=/clips-v2.html';
  return false;
}
</script>
</body>
</html>
`;
}

const pages = require('./pages-outils');

let n = 0;
for (const p of pages) {
  const html = gabarit(p);
  const dest = path.join(RACINE, p.slug + '.html');
  if (!dry) fs.writeFileSync(dest, html, 'utf8');
  console.log(`  ${p.slug}.html  (${(html.length / 1024).toFixed(1)} ko)`);
  n++;
}

// Sitemap
{
  const f = path.join(RACINE, 'sitemap.xml');
  let s = fs.readFileSync(f, 'utf8');
  let ajouts = 0;
  for (const p of pages) {
    if (s.includes(`/${p.slug}.html`)) continue;
    s = s.replace('</urlset>',
      `  <url><loc>${BASE}/${p.slug}.html</loc><lastmod>${p.date}</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>\n</urlset>`);
    ajouts++;
  }
  if (!dry && ajouts) fs.writeFileSync(f, s, 'utf8');
  console.log(`sitemap : ${ajouts} ajout(s)`);
}

console.log(`\n${n} page(s) d'outil${dry ? ' — SIMULATION' : ''}.`);
