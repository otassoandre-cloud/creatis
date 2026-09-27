/* ================================================================
 * OUVRE UNE FENÊTRE DE CONNEXION AUX COMPTES SOCIAUX
 *
 * Une fenêtre Chrome visible, avec profil persistant : tu te connectes à la
 * main, et la session est conservée dans `.playwright-profile-social/` pour que
 * les scripts suivants s'en servent sans jamais manipuler ton mot de passe.
 *
 *   node scripts/open-social-login.js
 *
 * ── POURQUOI C'EST TOI QUI TE CONNECTES ──────────────────────────────────
 * Les trois plateformes imposent une authentification à deux facteurs. Aucun
 * script ne peut la franchir, et c'est très bien ainsi : ton mot de passe ne
 * transite nulle part, il est tapé dans une vraie fenêtre de navigateur.
 *
 * ── CE QUI SERA FAIT DE CES SESSIONS ─────────────────────────────────────
 * Lire les statistiques de chaque compte (vues, rétention) et publier. Sans
 * elles, la boucle « produire → mesurer → corriger » ne peut pas se fermer :
 * on publierait sans jamais savoir ce qui a marché, ce qui est exactement ce
 * qui s'est passé pendant les 68 vidéos précédentes.
 *
 * ── VÉRIFIER APRÈS COUP ──────────────────────────────────────────────────
 *   node scripts/social-verif-session.js
 * qui juge sur un marqueur du DOM et non sur l'URL — une redirection vers le
 * fil d'accueil ne prouve PAS qu'on est connecté, TikTok y renvoie aussi les
 * visiteurs anonymes.
 * ================================================================ */
const { chromium } = require('playwright');
const path = require('path');

const ONGLETS = [
  ['TikTok', 'https://www.tiktok.com/login'],
  ['Instagram', 'https://www.instagram.com/accounts/login/'],
  // YouTube passe par le compte Google : c'est la même connexion que Gmail.
  ['YouTube', 'https://accounts.google.com/ServiceLogin?service=youtube'],
];

(async () => {
  const profil = path.join(__dirname, '..', '.playwright-profile-social');
  const ctx = await chromium.launchPersistentContext(profil, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    // Sans un UA crédible, TikTok et Instagram servent une page dégradée où la
    // connexion échoue sans dire pourquoi.
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  });

  for (const [nom, url] of ONGLETS) {
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
    console.log(`  onglet ouvert — ${nom}`);
  }

  console.log('');
  console.log('Fenêtre Chrome ouverte avec 3 onglets : TikTok, Instagram, YouTube.');
  console.log('Connecte-toi dans chacun. La session est enregistrée au fur et à mesure —');
  console.log('tu peux fermer la fenêtre une fois les trois faits, rien ne sera perdu.');
  console.log('');
  console.log('Ensuite, pour confirmer :  node scripts/social-verif-session.js');
  console.log('');
  console.log('(ce script reste actif tant que la fenêtre est ouverte — Ctrl+C pour le quitter)');

  // On garde le processus vivant : fermer le contexte fermerait la fenêtre.
  await new Promise(() => {});
})();
