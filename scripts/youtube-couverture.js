#!/usr/bin/env node
/**
 * YOUTUBE COUVERTURE — combien de fois la vidéo a été MONTRÉE.
 *
 *   node scripts/youtube-couverture.js --ids a,b,c
 *
 * ── POURQUOI CE FICHIER EXISTE ───────────────────────────────────────────
 * Neuf vidéos longues publiées, une à six vues chacune. Quatre miniatures
 * refaites, autant de titres réécrits, aucun effet. On a donc quatre jours
 * durant soigné l'emballage sans savoir si quelqu'un le voyait.
 *
 * Le chiffre qui tranche est l'IMPRESSION : le nombre de fois où YouTube a
 * posé la vignette devant quelqu'un.
 *
 *   · beaucoup d'impressions, taux de clic très bas  → l'emballage est en cause ;
 *   · presque pas d'impressions                      → la vidéo n'est jamais
 *     montrée, et refaire la miniature ne changera rien. Le problème est en
 *     amont : la distribution, pas la vignette.
 *
 * Tant que ce chiffre n'est pas lu, toute décision sur le format long est une
 * supposition. C'est exactement l'erreur du compteur de vues illisible rendu
 * à zéro le 05/10 : on avait conclu sur une mesure qu'on n'avait pas.
 *
 * ── OÙ LE CHIFFRE SE TROUVE VRAIMENT ─────────────────────────────────────
 * PAS sur l'onglet « Couverture » : sur ces vidéos il s'affiche entièrement
 * VIDE — pas un chiffre, pas un zéro, rien. On a d'abord cru à une erreur de
 * lecture, puis vérifié par capture d'écran : la page est bien blanche.
 *
 * Le chiffre vit derrière le bouton « Mode avancé », dans un tableau qui, lui,
 * sort les valeurs brutes quel que soit le volume :
 *
 *   Vues | Durée de visionnage | Abonnés | Revenus | Impressions | Taux de clics
 *      6 |                 0,1 |       0 |       — |         396 |        0,8 %
 *
 * L'URL `…/explore` ne suffit pas (elle rend une page blanche) : il faut
 * CLIQUER le bouton.
 */

const fs = require('fs');
const path = require('path');
const { prendre } = require('./verrou-profil');

/* Un seul travail Playwright a la fois sur le profil : voir verrou-profil.js. */
prendre('youtube-couverture');

const RACINE = path.join(__dirname, '..');
const PROFIL = path.join(RACINE, '.playwright-profile-social');
const STATS = path.join(RACINE, 'social', 'stats');

const jour = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

const arg = (n) => {
  const i = process.argv.indexOf('--' + n);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : '';
};

const ids = arg('ids').split(',').map((x) => x.trim()).filter(Boolean);
if (!ids.length) {
  console.error('Usage : --ids <id1,id2,…>');
  process.exit(2);
}

(async () => {
  const { chromium } = require('playwright');
  const ctx = await chromium.launchPersistentContext(PROFIL, {
    channel: 'chrome', headless: false, viewport: { width: 1600, height: 1100 },
  });
  const page = ctx.pages()[0] || (await ctx.newPage());

  console.log(`COUVERTURE YOUTUBE — ${jour}`);
  console.log('================================================================');

  const sortie = [];
  for (const id of ids) {
    await page.goto(
      `https://studio.youtube.com/video/${id}/analytics/tab-reach/period-default`,
      { waitUntil: 'domcontentloaded', timeout: 90000 },
    ).catch(() => {});
    await page.waitForTimeout(11000);

    /* Le tableau ne s'ouvre qu'au CLIC : l'URL `…/explore` rend une page
       blanche. Le clic ouvre parfois un nouvel onglet — on lit le dernier. */
    const bouton = page.locator('button:has-text("Mode avancé"), [aria-label="Mode avancé"]').first();
    await bouton.click({ timeout: 9000 }).catch(() => {});
    await page.waitForTimeout(17000);
    const vue = ctx.pages()[ctx.pages().length - 1];

    const lu = await vue.evaluate(() => {
      const txt = document.body.innerText.replace(/\n{2,}/g, '\n');
      const titre = (txt.match(/Votre vidéo\n([^\n]{3,120})/) || [])[1] || '';
      /* On lit les CELLULES, pas des étiquettes : dans ce tableau les libellés
         sont tous groupés en en-tête, à une distance variable de leur valeur.
         La ligne utile commence par le titre de la vidéo, puis six cellules
         dans l'ordre de l'en-tête :
         vues | heures vues | abonnés | revenus | impressions | taux de clics */
      const i = txt.lastIndexOf('Taux de clics sur la miniature');
      if (i === -1) return { muet: true };
      const lignes = txt.slice(i).split('\n').map((l) => l.trim()).filter(Boolean).slice(1);
      const j = lignes.findIndex((l) => titre && l.startsWith(titre.slice(0, 26)));
      const c = j === -1 ? [] : lignes.slice(j + 1, j + 7);
      return {
        titre,
        vues: c[0] ?? null,
        heuresVues: c[1] ?? null,
        abonnes: c[2] ?? null,
        impressions: c[4] ?? null,
        tauxClic: c[5] ?? null,
        muet: c.length < 6,
      };
    }).catch(() => ({ muet: true }));

    sortie.push({ id, ...lu });

    if (lu.muet) {
      console.log(`  ✗ ${id} — Studio n'affiche pas la couverture (trop peu de volume)`);
    } else {
      console.log(
        `  ${String(lu.impressions ?? '—').padStart(7)} impr. · ${String(lu.tauxClic ?? '—').padStart(7)} de clics` +
        ` · ${String(lu.vues ?? '—').padStart(4)} vues · ${(lu.titre || '').slice(0, 44)}`,
      );
    }
  }

  fs.mkdirSync(STATS, { recursive: true });
  const f = path.join(STATS, `couverture-${jour}.json`);
  fs.writeFileSync(f, JSON.stringify({ jour, videos: sortie }, null, 2));
  console.log(`\nUne impression, c'est une vignette posée devant quelqu'un.`);
  console.log(`Sans impressions, refaire la miniature ne change rien.`);
  console.log(`→ ${f}`);
  await ctx.close();
  process.exit(0);
})();
