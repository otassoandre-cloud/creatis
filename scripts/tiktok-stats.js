#!/usr/bin/env node
/**
 * Lit les statistiques RÉELLES des publications TikTok.
 *
 *   node scripts/tiktok-stats.js
 *   node scripts/tiktok-stats.js --jours 7
 *
 * ── POURQUOI CE SCRIPT EXISTE ────────────────────────────────────────────
 * `social-brief.js` croise PostHog et Supabase : il mesure les VISITES du site
 * attribuées à un réseau. Sur TikTok ce chiffre est structurellement nul tant
 * qu'on est sous 1 000 abonnés, parce que le lien de la bio n'est pas cliquable
 * — il faut le recopier à la main. Conclure « TikTok ne marche pas » à partir de
 * ce zéro est une erreur de lecture : il ne dit rien des vidéos.
 *
 * La seule donnée qui dit si une vidéo a marché est chez TikTok : vues, durée
 * regardée, taux de complétion, abonnés gagnés. C'est elle qui doit décider du
 * contenu du lendemain, pas l'absence de clics sur un lien non cliquable.
 *
 * ── CE QU'IL LIT ─────────────────────────────────────────────────────────
 * La page « Contenu » de TikTok Studio, qui donne par publication : la légende,
 * les vues, les J'aime, les commentaires, les partages et la date. C'est moins
 * riche que l'onglet Analyses, mais c'est lisible sans cliquer dans chaque
 * vidéo, donc utilisable tous les matins.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const PROFIL = path.join(RACINE, '.playwright-profile-social');
const SORTIE = process.env.SCRATCH || path.join(RACINE, '.scratch-social');
const BRIEFS = path.join(RACINE, 'social', 'briefs');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const JOURS = parseInt(arg('jours', '7'), 10);

/** « 1,2K » et « 1.2M » sont des nombres, pas du texte. */
const enNombre = (t) => {
  if (!t) return 0;
  const m = String(t).replace(/\s/g, '').replace(',', '.').match(/^([\d.]+)\s*([KkMm])?/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (!m[2]) return Math.round(n);
  return Math.round(n * (m[2].toLowerCase() === 'k' ? 1000 : 1000000));
};

(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  fs.mkdirSync(BRIEFS, { recursive: true });

  const { chromium } = require('playwright');
  const ctx = await chromium.launchPersistentContext(PROFIL, {
    channel: 'chrome', headless: false, viewport: { width: 1500, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
  }).catch((e) => {
    console.error('Ouverture impossible : ' + e.message.split('\n')[0]);
    console.error('Une autre fenêtre utilise-t-elle le profil ? La fermer, puis relancer.');
    process.exit(1);
  });

  await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  const page = await ctx.newPage();

  try {
    await page.goto('https://www.tiktok.com/tiktokstudio/content', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(10000);

    /* Marqueur POSITIF de session. Une page blanche ne contient pas non plus de
       bouton « Se connecter » — c'est ce qui avait fait conclure « connecté » à
       tort sur X le 27/09. */
    const connecte = await page.locator(
      ':text-is("Publier la vidéo"), a[href*="tiktokstudio/upload"], :text-is("Importer")',
    ).first().isVisible().catch(() => false);
    const titre = await page.locator(':text-is("Publications"), :text-is("Posts")').first().isVisible().catch(() => false);
    if (!connecte && !titre) {
      await page.screenshot({ path: path.join(SORTIE, 'tiktok-stats-deconnecte.png') }).catch(() => {});
      console.error('Session TikTok non prouvée — ouvrir la capture avant de conclure.');
      await ctx.close(); process.exit(2);
    }

    /* ── LISTE VIRTUALISÉE : LIRE PENDANT QU'ON DESCEND ──────────────────
       Deux pièges empilés, tous deux payés :
       1. `mouse.wheel` ne bouge pas le tableau — il vit dans son PROPRE
          conteneur défilant, pas dans la fenêtre.
       2. Même en défilant correctement, TikTok ne REND que les lignes visibles.
          Lire une seule fois à la fin a donné les 9 plus ANCIENNES (août), après
          avoir donné les 9 plus récentes au tour précédent. Dans les deux cas
          neuf lignes sur quarante-deux, et deux conclusions opposées.
       On lit donc à CHAQUE palier et on accumule. */
    const collectees = new Map();
    const lireEcran = async () => {
      const vus = await page.evaluate(() => {
        const DATE = /\d{1,2}\s+\S+\.?,?\s+\d{1,2}:\d{2}/;
        const out = [];
        for (const e of document.querySelectorAll('div, span, p')) {
          const t = (e.textContent || '').trim();
          if (t.length > 40 || !DATE.test(t)) continue;
          let n = e;
          for (let i = 0; i < 10 && n; i++) {
            const r = n.getBoundingClientRect();
            if (r.height > 60 && r.height < 300 && r.width > 600) {
              out.push((n.innerText || '').replace(/\u00a0/g, ' ').trim());
              break;
            }
            n = n.parentElement;
          }
        }
        return out;
      }).catch(() => []);
      for (const t of vus) collectees.set(t.slice(0, 140), t);
    };

    await lireEcran();
    let posAvant = -1;
    for (let i = 0; i < 40; i++) {
      const pos = await page.evaluate(() => {
        const candidats = [...document.querySelectorAll('div')]
          .filter((e) => e.scrollHeight > e.clientHeight + 200 && e.clientHeight > 300);
        const cible = candidats.sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
        if (cible) { cible.scrollTop += cible.clientHeight * 0.75; return cible.scrollTop; }
        window.scrollBy(0, window.innerHeight * 0.75);
        return window.scrollY;
      });
      await page.waitForTimeout(900);
      await lireEcran();
      if (pos === posAvant && i > 3) break;
      posAvant = pos;
    }
    const lignes = [...collectees.values()];
    console.log(`  ${lignes.length} ligne(s) collectée(s) au fil du défilement`);

    await page.screenshot({ path: path.join(SORTIE, 'tiktok-stats.png'), fullPage: false }).catch(() => {});

    if (!lignes.length) {
      console.log('Aucune publication lue. OUVRIR la capture avant de conclure quoi que ce soit :');
      console.log('  ' + path.join(SORTIE, 'tiktok-stats.png'));
      await ctx.close(); process.exit(4);
    }

    const DUREE = /^\d{1,2}:\d{2}$/;
    const DATE = /\d{1,2}\s+\S+\.?,?\s+\d{1,2}:\d{2}/;
    const NOMBRE = /^[\d.,\s]+[KkMm]?$/;
    /* La vignette pose sa DURÉE (« 00:16 ») en tête de ligne : un premier jet la
       prenait pour la légende et affichait « 00:16 » partout. On l'écarte, avec
       la date, les nombres et les libellés de confidentialité. */
    const publications = lignes.map((texte) => {
      const parts = texte.split('\n').map((x) => x.trim()).filter(Boolean);
      const legende = parts.find((x) =>
        !DUREE.test(x) && !DATE.test(x) && !NOMBRE.test(x)
        && !/^(Tout le m|Public|Abonn|1 vid|Seulement)/i.test(x) && x.length > 3,
      ) || '(aucune description)';
      const date = parts.find((x) => DATE.test(x)) || '';
      const nombres = parts.filter((x) => NOMBRE.test(x) && !DUREE.test(x)).map(enNombre);
      return {
        legende, date,
        vues: nombres[0] ?? 0,
        jaime: nombres[1] ?? 0,
        commentaires: nombres[2] ?? 0,
      };
    }).filter((x) => x.date);

    publications.sort((a, b) => b.vues - a.vues);

    const total = publications.reduce((s, p) => s + p.vues, 0);
    const moyenne = Math.round(total / publications.length);

    const lignesSortie = [];
    const dire = (l) => { console.log(l); lignesSortie.push(l); };

    dire(`STATISTIQUES TIKTOK — ${publications.length} publications lues`);
    dire('='.repeat(70));
    dire(`Vues cumulées : ${total.toLocaleString('fr-FR')}   moyenne : ${moyenne.toLocaleString('fr-FR')} par vidéo`);
    dire('');
    dire('LES 10 MEILLEURES — ce sont elles qui disent quoi refaire');
    for (const p of publications.slice(0, 10)) {
      dire(`  ${String(p.vues).padStart(6)} vues ${String(p.jaime).padStart(4)} ❤  ${p.date.padEnd(18)} ${p.legende.slice(0, 42)}`);
    }
    dire('');
    dire('LES 5 PLUS FAIBLES — ce sont elles qui disent quoi arrêter');
    for (const p of publications.slice(-5)) {
      dire(`  ${String(p.vues).padStart(6)} vues ${String(p.jaime).padStart(4)} ❤  ${p.date.padEnd(18)} ${p.legende.slice(0, 42)}`);
    }

    /* L'écart entre la meilleure et la médiane est le vrai signal : s'il est
       faible, aucune vidéo ne perce et c'est le FORMAT qu'il faut changer, pas
       le sujet. S'il est fort, une piste existe et il faut la creuser. */
    const median = publications[Math.floor(publications.length / 2)]?.vues ?? 0;
    const meilleure = publications[0]?.vues ?? 0;
    dire('');
    dire(`Meilleure ${meilleure} vues / médiane ${median} vues — rapport ${median ? (meilleure / median).toFixed(1) : '?'}x`);
    dire(median && meilleure / median < 2
      ? 'Rapport faible : aucune vidéo ne perce. C est le FORMAT qu il faut changer, pas le sujet.'
      : 'Rapport net : une piste existe, creuser ce que la meilleure fait de différent.');

    const jour = new Date().toISOString().slice(0, 10);
    const f = path.join(BRIEFS, `tiktok-${jour}.txt`);
    fs.writeFileSync(f, lignesSortie.join('\n') + '\n');

    /* Et la MÊME chose en JSON, pour que `apprendre.js` puisse relier ces
       chiffres aux variables de chaque pièce (gabarit, accroche, son, heure).
       Sans ce fichier, les résultats et les décisions vivent dans deux mondes
       séparés, et rien ne s'améliore d'un jour sur l'autre. */
    const STATS = path.join(RACINE, 'social', 'stats');
    fs.mkdirSync(STATS, { recursive: true });
    fs.writeFileSync(
      path.join(STATS, `tiktok-${jour}.json`),
      JSON.stringify({ releve_le: new Date().toISOString(), publications }, null, 2),
    );
    console.log('\n→ ' + f);
    console.log('  capture : ' + path.join(SORTIE, 'tiktok-stats.png'));
  } catch (e) {
    console.error('Échec : ' + e.message.split('\n')[0]);
    await page.screenshot({ path: path.join(SORTIE, 'tiktok-stats-erreur.png') }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await ctx.close().catch(() => {});
  }
})();
