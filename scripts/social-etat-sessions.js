#!/usr/bin/env node
/**
 * Vérifie quelles sessions sociales sont encore vivantes dans le profil persistant.
 *
 *   node scripts/social-etat-sessions.js
 *   node scripts/social-etat-sessions.js --visible    (fenêtre affichée)
 *
 * Lecture seule : on ouvre les pages, on lit l'état de connexion, on ferme. Rien
 * n'est publié, rien n'est modifié.
 *
 * Le profil `.playwright-profile-social` a été alimenté par scripts/open-social-login.js,
 * où l'utilisateur s'est connecté à la main. Les sessions y survivent tant que les
 * plateformes ne les invalident pas — ce que ce script mesure.
 */

const path = require('path');
const fs = require('fs');

const PROFIL = path.join(__dirname, '..', '.playwright-profile-social');
const visible = process.argv.includes('--visible');

(async () => {
  if (!fs.existsSync(PROFIL)) {
    console.error('Profil absent : ' + PROFIL);
    process.exit(1);
  }

  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.error('playwright non installé — npm i playwright'); process.exit(1); }

  let ctx;
  try {
    ctx = await chromium.launchPersistentContext(PROFIL, {
      headless: !visible,
      viewport: { width: 1280, height: 900 },
      // Sans un UA credible, TikTok et Instagram renvoient une page de blocage
      // qu'on lirait a tort comme une deconnexion.
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    });
  } catch (e) {
    console.error('Impossible d\'ouvrir le profil : ' + e.message);
    console.error('Si Chrome est deja ouvert sur ce profil, le fermer puis relancer.');
    process.exit(1);
  }

  /* Chaque plateforme est sondee sur une page qui exige d'etre connecte. On juge sur
     l'URL finale (redirection vers /login = session morte) et sur un marqueur du DOM. */
  const sondes = [
    {
      nom: 'TikTok',
      url: 'https://www.tiktok.com/setting',
      mortSi: (u) => /\/login/i.test(u),
      marqueur: async (p) => {
        const t = await p.title().catch(() => '');
        const aDeco = await p.locator('text=/Se déconnecter|Log out/i').count().catch(() => 0);
        return { titre: t, indice: aDeco > 0 ? 'bouton de déconnexion présent' : '—' };
      },
    },
    {
      nom: 'Instagram',
      url: 'https://www.instagram.com/accounts/edit/',
      mortSi: (u) => /\/accounts\/login/i.test(u),
      marqueur: async (p) => {
        const t = await p.title().catch(() => '');
        const champ = await p.locator('input[name="username"], input[id*="pepUsername"]').count().catch(() => 0);
        return { titre: t, indice: champ > 0 ? 'formulaire de profil accessible' : '—' };
      },
    },
    {
      nom: 'X',
      url: 'https://x.com/settings/profile',
      mortSi: (u) => /\/(i\/flow\/login|login)/i.test(u),
      marqueur: async (p) => ({ titre: await p.title().catch(() => ''), indice: '—' }),
    },
    {
      nom: 'LinkedIn',
      url: 'https://www.linkedin.com/feed/',
      mortSi: (u) => /\/(login|uas\/login|checkpoint)/i.test(u),
      marqueur: async (p) => ({ titre: await p.title().catch(() => ''), indice: '—' }),
    },
  ];

  console.log('Sondage des sessions (lecture seule)\n');
  const resultat = [];

  for (const s of sondes) {
    const page = await ctx.newPage();
    let etat = 'inconnu', detail = '';
    try {
      await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);         // laisser les redirections se faire
      const finale = page.url();
      const m = await s.marqueur(page);
      etat = s.mortSi(finale) ? 'DÉCONNECTÉ' : 'connecté';
      detail = `${finale.slice(0, 68)}${m.indice !== '—' ? ' · ' + m.indice : ''}`;
    } catch (e) {
      etat = 'erreur';
      detail = e.message.slice(0, 70);
    }
    await page.close().catch(() => {});
    console.log(`  ${s.nom.padEnd(10)} ${etat.padEnd(12)} ${detail}`);
    resultat.push({ plateforme: s.nom, etat, detail });
  }

  await ctx.close().catch(() => {});

  const vivants = resultat.filter((r) => r.etat === 'connecté').map((r) => r.plateforme);
  console.log(`\n${vivants.length ? 'Sessions utilisables : ' + vivants.join(', ') : 'Aucune session utilisable.'}`);
})();
