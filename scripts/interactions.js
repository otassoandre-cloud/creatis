#!/usr/bin/env node
/**
 * INTERACTIONS — qui a aimé, qui a commenté.
 *
 *   node scripts/interactions.js              Instagram (les reels récents)
 *   node scripts/interactions.js --combien 6  les six derniers
 *
 * ── POURQUOI ─────────────────────────────────────────────────────────────
 * La boucle d'apprentissage ne lisait que des vues. Or une vue ne dit rien de
 * l'intérêt : quelqu'un qui aime ou commente s'est arrêté, a lu, a réagi.
 * C'est aussi la seule matière possible pour écrire à quelqu'un — on n'écrit
 * pas à une vue.
 *
 * ── CE QUE CHAQUE RÉSEAU PERMET, ET CE QU'IL INTERDIT ────────────────────
 * YouTube : le nombre de J'aime est public, mais PAS la liste de ceux qui ont
 *           aimé, et il n'existe pas de message privé. Rien à en tirer ici.
 * TikTok  : la liste des J'aime est consultable, et les messages privés
 *           existent — mais seulement entre comptes qui se suivent ou selon
 *           les réglages du destinataire.
 * Instagram : la liste des J'aime et les commentaires sont consultables, et le
 *           message privé est ouvert.
 *
 * ── LE PIÈGE QUI RENDAIT TOUT FAUX ──────────────────────────────────────
 * `instagram.com/reel/<id>/` ne montre PAS la publication : il ouvre le FIL
 * des reels, où défilent ceux des autres comptes. Le premier jet lisait donc
 * les J'aime d'inconnus — d'où des `NaN`, des zéros et des pseudos qui
 * n'avaient rien à voir.
 *
 * L'adresse qui montre la publication est `instagram.com/p/<id>/`. Vérifié le
 * 06/10 : on y retrouve notre légende, notre compteur, nos commentaires.
 *
 * Ce script ne fait que LIRE. Il n'écrit à personne : écrire est une action
 * sortante, qui se décide séparément.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const PROFIL = path.join(RACINE, '.playwright-profile-social');
const STATS = path.join(RACINE, 'social', 'stats');
const PSEUDO = 'andre.creatis';

const jour = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

const arg = (n, d) => {
  const i = process.argv.indexOf('--' + n);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const COMBIEN = parseInt(arg('combien', '8'), 10);

(async () => {
  const { chromium } = require('playwright');
  const ctx = await chromium.connectOverCDP('http://localhost:9222').catch(() => null);
  if (!ctx) {
    console.error('Chrome n\'écoute pas sur 9222. La session Instagram vit dans CE navigateur :');
    console.error('sans lui, on arrive déconnecté et on ne lit rien.');
    process.exit(2);
  }
  const page = ctx.contexts()[0].pages()[0] || (await ctx.contexts()[0].newPage());

  console.log(`INTERACTIONS INSTAGRAM — ${jour}`);
  console.log('================================================================');

  await page.goto(`https://www.instagram.com/${PSEUDO}/reels/`, {
    waitUntil: 'domcontentloaded', timeout: 90000,
  });
  await page.waitForTimeout(6000);

  /* L'onglet Reels est virtualisé comme le reste : on accumule en défilant.
     Une lecture unique a déjà rendu 9 lignes sur 42 ailleurs. */
  const vus = new Map();
  for (let pas = 0; pas < 8 && vus.size < COMBIEN; pas++) {
    const lot = await page.evaluate(() => {
      const out = [];
      for (const a of document.querySelectorAll('a[href*="/reel/"]')) {
        const m = (a.getAttribute('href') || '').match(/\/reel\/([A-Za-z0-9_-]+)/);
        if (m) out.push(m[1]);
      }
      return out;
    });
    for (const id of lot) if (!vus.has(id)) vus.set(id, true);
    await page.mouse.wheel(0, 1400);
    await page.waitForTimeout(1200);
  }

  const ids = [...vus.keys()].slice(0, COMBIEN);
  console.log(`${ids.length} reel(s) à examiner`);

  const sortie = [];
  for (const id of ids) {
    /* /p/ et non /reel/ : voir l'en-tête. */
    await page.goto(`https://www.instagram.com/p/${id}/`, {
      waitUntil: 'domcontentloaded', timeout: 60000,
    }).catch(() => {});
    await page.waitForTimeout(4500);

    const lu = await page.evaluate(() => {
      const txt = document.body.innerText.replace(/\n{2,}/g, '\n');
      const nb = (re) => {
        const m = txt.match(re);
        return m ? parseInt(m[1].replace(/[^\d]/g, ''), 10) : null;
      };
      /* Les pseudos qui apparaissent sur la page et qui ne sont pas le nôtre :
         ce sont les gens qui ont commenté. S'il n'y en a aucun, il n'y a
         personne à qui écrire — et c'est une information en soi. */
      const pseudos = [...new Set(
        [...document.querySelectorAll('a[href^="/"]')]
          .map((a) => (a.getAttribute('href') || '').replace(/\//g, ''))
          .filter((p) => /^[A-Za-z0-9_.]{2,30}$/.test(p)),
      )].filter((p) => {
        /* ── CE QUI RESSEMBLE À UN PSEUDO SANS EN ÊTRE UN ─────────────────
           Le premier filtre ne retirait que notre propre compte, et rendait
           donc 15 « commentateurs » par reel : directinbox, exploretagsclipping,
           legalprivacy, weblite… c'est-à-dire la navigation d'Instagram.
           Annoncer quinze personnes à contacter là où il n'y en a aucune, ce
           serait fabriquer une audience. */
        if (p === 'andre.creatis') return false;
        if (/^(reels|explore|popular|direct|legal|web|about|api|p|accounts)/.test(p)) return false;
        if (/^exploretags|^explorelocations|^reelsaudio|^andre\.creatis/.test(p)) return false;
        if (/^\d+$/.test(p)) return false;
        return true;
      });

      return {
        jaime: nb(/^\s*([\d  .,]+)\s*$/m),
        commentaires: (txt.match(/Ajouter un commentaire/) ? 0 : null),
        commentateurs: pseudos.slice(0, 20),
      };
    }).catch(() => ({}));

    sortie.push({ id, ...lu });
    console.log(
      `  ${id}  ${String(lu.vues ?? '?').padStart(5)} vues · ${String(lu.jaime ?? 0).padStart(3)} J'aime` +
      ` · ${(lu.commentateurs || []).length} pseudo(s) lus`,
    );
  }

  fs.mkdirSync(STATS, { recursive: true });
  fs.writeFileSync(
    path.join(STATS, `interactions-${jour}.json`),
    JSON.stringify({ jour, reseau: 'instagram', reels: sortie }, null, 2),
  );

  const total = sortie.reduce((s, r) => s + (r.jaime || 0), 0);
  console.log('');
  console.log(`${total} J'aime au total sur ${sortie.length} reels.`);
  console.log(`→ social/stats/interactions-${jour}.json`);
  process.exit(0);
})();
