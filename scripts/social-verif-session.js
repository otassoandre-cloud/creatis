#!/usr/bin/env node
/**
 * Vérifie une session sur un SIGNAL FIABLE : la présence d'un bouton de connexion.
 *
 *   node scripts/social-verif-session.js
 *
 * Corrige une erreur de scripts/social-etat-sessions.js, qui jugeait sur l'URL finale.
 * TikTok redirige un visiteur NON connecté vers le fil (/foryou) et non vers /login :
 * l'heuristique concluait donc « connecté » à tort. Capture d'écran à l'appui, le
 * compte était bel et bien déconnecté.
 *
 * Règle retenue : un bouton « Log in » / « Se connecter » visible ⇒ session morte.
 * C'est le seul marqueur qui ne dépend pas des redirections.
 */

const path = require('path');
const fs = require('fs');

const PROFIL = path.join(__dirname, '..', '.playwright-profile-social');
const SORTIE = process.env.SCRATCH || path.join(__dirname, '..', '.scratch-social');

const CIBLES = [
  ['X', 'https://x.com/home'],
  ['TikTok', 'https://www.tiktok.com/foryou'],
  ['Instagram', 'https://www.instagram.com/'],
  ['LinkedIn', 'https://www.linkedin.com/feed/'],
];

(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const { chromium } = require('playwright');
  const ctx = await chromium.launchPersistentContext(PROFIL, {
    headless: true,
    viewport: { width: 1360, height: 950 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  });

  for (const [nom, url] of CIBLES) {
    const p = await ctx.newPage();
    let ligne;
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await p.waitForTimeout(5000);
      const connexion = await p.locator('text=/^(Log in|Se connecter|Sign in|S\'identifier)$/i').count().catch(() => 0);
      const etat = connexion > 0 ? 'DÉCONNECTÉ' : 'connecté';
      ligne = `  ${nom.padEnd(10)} ${etat.padEnd(12)} ${p.url().slice(0, 52)}`;
      await p.screenshot({ path: path.join(SORTIE, 'session-' + nom.toLowerCase() + '.png') }).catch(() => {});
    } catch (e) {
      ligne = `  ${nom.padEnd(10)} erreur       ${e.message.slice(0, 50)}`;
    }
    console.log(ligne);
    await p.close().catch(() => {});
  }

  await ctx.close().catch(() => {});
  console.log('\nCaptures dans ' + SORTIE);
})();
