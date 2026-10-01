/**
 * Gabarit des pages SEO du blog — une seule source de vérité.
 *
 * Chaque page est décrite en données (titre, réponse d'abord, sections, FAQ) et
 * ce module produit le HTML complet : metas, canonical, Article + FAQPage JSON-LD,
 * Clarity, PostHog, nav, CTA, footer. Tout page générée ici est identique aux
 * pages écrites à la main depuis juillet — même CSS, mêmes blocs.
 *
 * Utilisé par scripts/generer-pages-seo.js.
 */

const CLARITY = 'wqzt6m475j';
const POSTHOG = 'phc_vdxr7qhoBWZKASMMnJcefKcUKYbMti34FDd933nur6pJ';
const BASE = 'https://creatis.app';

/** Échappe pour une valeur d'attribut HTML. */
const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Rend une section : titre + corps déjà en HTML. */
function section(s) {
  const niveau = s.niveau || 2;
  return `  <h${niveau}>${s.titre}</h${niveau}>\n${s.corps.trim()}\n`;
}

/**
 * @param {object} p
 * @param {string} p.slug            nom de fichier sans .html
 * @param {string} p.title           balise <title> (sans « | Créatis »)
 * @param {string} p.h1
 * @param {string} p.description     meta description
 * @param {string} p.date            AAAA-MM-JJ
 * @param {string} p.dateLisible     ex. « 24 septembre 2026 »
 * @param {number} p.minutes         temps de lecture
 * @param {string} p.reponse         encadré « réponse d'abord », HTML inline
 * @param {Array}  p.sections        [{titre, corps, niveau?}]
 * @param {Array}  p.faq             [{q, r}]
 * @param {object} p.cta             {titre, bouton?}
 */
function gabarit(p) {
  const url = `${BASE}/blog/${p.slug}.html`;
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: p.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.r },
    })),
  };
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: p.h1,
    author: { '@type': 'Organization', name: 'Équipe Rédaction Créatis' },
    publisher: { '@type': 'Organization', name: 'Créatis', url: BASE },
    datePublished: p.date,
    dateModified: p.date,
    description: p.description,
    mainEntityOfPage: url,
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${p.title} | Créatis</title>
<meta name="description" content="${attr(p.description)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${attr(p.h1)}">
<meta property="og:description" content="${attr(p.ogDescription || p.description)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}/images/og-clips-viraux.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap"></noscript>
<script type="application/ld+json">
${JSON.stringify(articleLd, null, 2)}
</script>
<script type="application/ld+json">
${JSON.stringify(faqLd, null, 2)}
</script>
<link rel="stylesheet" href="/css/blog.css">
  <script src="/js/ref-capture.js"></script>
  <!-- Microsoft Clarity -->
  <script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${CLARITY}");
  </script>
  <!-- PostHog -->
  <script>
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onFeatureFlags onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('${POSTHOG}',{api_host:'https://eu.i.posthog.com', person_profiles:'identified_only'});
  </script>
</head>
<body>
<nav class="blog-nav">
  <a href="/" class="logo"><span>C</span> Créatis</a>
  <a href="/clips-v2.html" class="blog-cta">Essayer gratuitement</a>
</nav>

<article>
  <h1>${p.h1}</h1>
  <div class="meta">Publié le ${p.dateLisible} · ${p.minutes} min de lecture</div>

  <div class="answer-box">
    <p>${p.reponse.trim()}</p>
  </div>

${p.sections.map(section).join('\n')}
  <div class="faq-section">
    <h2>Questions fréquentes</h2>
${p.faq
  .map(
    (f) =>
      `    <details>\n      <summary>${f.q}</summary>\n      <p>${f.r}</p>\n    </details>`
  )
  .join('\n')}
  </div>

  <div class="cta-box" style="margin-top:48px">
    <h3>${p.cta.titre}</h3>
    <p>Analyse gratuite · Sans carte bancaire · Vois tes clips avant de payer</p>
    <a href="/clips-v2.html" class="btn">⚡ ${p.cta.bouton || 'Essayer Créatis gratuitement'}</a>
  </div>
</article>

<footer class="blog-footer">
  <p>© 2026 Créatis · <a href="/blog.html">Blog</a> · <a href="/cgu.html">CGU</a> · <a href="/confidentialite.html">Confidentialité</a> · <a href="mailto:contact@creatis.app">Contact</a></p>
</footer>
</body>
</html>
`;
}

module.exports = { gabarit };
