#!/usr/bin/env node
/**
 * YOUTUBE RÉTENTION — où les gens décrochent, et quand.
 *
 *   node scripts/youtube-retention.js                 les publications du registre
 *   node scripts/youtube-retention.js --ids a,b,c     des vidéos précises
 *
 * ── POURQUOI CE FICHIER EXISTE ───────────────────────────────────────────
 * `CONSIGNES.md` §0 liste les angles morts de la boucle d'apprentissage. Celui
 * qui restait après YouTube : « La rétention. On ne lit que vues et J'aime. »
 * Or les vues disent seulement qu'on a cliqué ; la rétention dit si le montage
 * tient. Sans elle, on optimise un titre sans jamais savoir si la vidéo mérite
 * le clic.
 *
 * ── CE QUE STUDIO DONNE, ET À PARTIR DE QUAND ────────────────────────────
 * Relevé le 04/10 sur l'onglet Aperçu :
 *   « Ont continué de regarder   30,4 % »
 *   « Durée moyenne d'une vue    0:11 »
 * plus une courbe en SVG graduée 0 % / 50 % / 100 % / 150 %.
 *
 * MAIS la page reste VIDE sous un certain nombre de vues : essayé sur une
 * vidéo à 2 vues, aucun chiffre ne s'affiche. On le dit plutôt que de rendre
 * zéro, qui se confondrait avec « personne n'a regardé ».
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const PROFIL = path.join(RACINE, '.playwright-profile-social');
const STATS = path.join(RACINE, 'social', 'stats');
const BRIEFS = path.join(RACINE, 'social', 'briefs');

const jour = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

const arg = (n) => {
  const i = process.argv.indexOf('--' + n);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : '';
};

/** « 0:11 » → 11 secondes. */
const enSecondes = (t) => {
  const m = String(t).match(/(\d+):(\d{2})/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
};

/** À défaut d'identifiants donnés, on prend ceux du dernier relevé YouTube. */
const idsDuReleve = () => {
  const f = path.join(STATS, `youtube-${jour}.json`);
  if (!fs.existsSync(f)) return [];
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  return (j.publications || [])
    .filter((p) => p.vues >= 30) // sous 30 vues, Studio ne montre rien
    .sort((a, b) => b.vues - a.vues)
    .slice(0, 10)
    .map((p) => ({ id: p.id, titre: p.titre, vues: p.vues }));
};

(async () => {
  const donnes = arg('ids');
  const cibles = donnes
    ? donnes.split(',').map((id) => ({ id: id.trim(), titre: '', vues: null }))
    : idsDuReleve();

  if (!cibles.length) {
    console.error('Aucune vidéo à relever. Lancer d\'abord `node scripts/youtube-stats.js`,');
    console.error('ou passer --ids <a,b,c>.');
    process.exit(2);
  }

  const { chromium } = require('playwright');
  const ctx = await chromium.launchPersistentContext(PROFIL, {
    channel: 'chrome', headless: false, viewport: { width: 1600, height: 1100 },
  });
  const page = ctx.pages()[0] || (await ctx.newPage());

  console.log(`RÉTENTION YOUTUBE — ${jour}`);
  console.log('================================================================');

  const sortie = [];
  for (const c of cibles) {
    await page.goto(
      `https://studio.youtube.com/video/${c.id}/analytics/tab-overview/period-default`,
      { waitUntil: 'domcontentloaded', timeout: 90000 },
    ).catch(() => {});
    await page.waitForTimeout(13000);

    const lu = await page.evaluate(() => {
      const txt = document.body.innerText.replace(/\n{2,}/g, '\n');
      const apres = (etiquette, motif) => {
        const i = txt.indexOf(etiquette);
        if (i === -1) return null;
        const m = txt.slice(i, i + 120).match(motif);
        return m ? m[1] : null;
      };
      return {
        titre: (txt.match(/Votre vidéo\n([^\n]{3,120})/) || [])[1] || '',
        duree: (txt.match(/\n(\d+:\d{2})\n/) || [])[1] || null,
        continue: apres('Ont continué de regarder', /([\d,.]+)\s*%/),
        dureeVue: apres("Durée moyenne d'une vue", /(\d+:\d{2})/),
        vues: apres('Vues\nVues', /\n([\d  ,.]+\s*[km]?)\n/i),
        /* Un signe que Studio n'a rien à montrer, plutôt que zéro. */
        vide: !txt.includes('Durée moyenne') && !txt.includes('Ont continué'),
      };
    }).catch(() => ({ vide: true }));

    const d = enSecondes(lu.duree);
    const v = enSecondes(lu.dureeVue);
    const part = d && v ? Math.round((v / d) * 100) : null;

    const ligne = {
      id: c.id,
      titre: (c.titre || lu.titre || '').slice(0, 60),
      vues: c.vues,
      duree: lu.duree,
      dureeVue: lu.dureeVue,
      partRegardee: part,
      ontContinue: lu.continue,
      mesurable: !lu.vide,
    };
    sortie.push(ligne);

    if (!ligne.mesurable) {
      console.log(`  ✗ ${c.id}  ${ligne.titre.slice(0, 44)} — Studio n'affiche rien (trop peu de vues)`);
    } else {
      console.log(
        `  ${String(ligne.vues ?? '?').padStart(5)} vues · vue moyenne ${String(ligne.dureeVue).padStart(5)}` +
        ` sur ${String(ligne.duree).padEnd(5)} = ${String(part ?? '?').padStart(3)} %` +
        ` · ont continué ${String(ligne.ontContinue ?? '?').padStart(5)} %  ${ligne.titre.slice(0, 40)}`,
      );
    }
  }
  await ctx.close().catch(() => {});

  const mesurees = sortie.filter((l) => l.mesurable && l.partRegardee !== null);
  const txt = [];
  txt.push(`RÉTENTION YOUTUBE — ${jour} — ${mesurees.length} vidéo(s) mesurable(s) sur ${sortie.length}`);
  txt.push('');
  for (const l of mesurees.sort((a, b) => (b.partRegardee || 0) - (a.partRegardee || 0))) {
    txt.push(`  ${String(l.partRegardee).padStart(3)} % regardé · ${String(l.dureeVue)} sur ${l.duree} · ${String(l.vues ?? '?').padStart(5)} vues · ${l.titre}`);
  }
  if (mesurees.length >= 2) {
    const m = mesurees.map((l) => l.partRegardee).sort((a, b) => a - b);
    txt.push('');
    txt.push(`Médiane de la part regardée : ${m[Math.floor(m.length / 2)]} %.`);
    txt.push(`Les vues disent qu'on a cliqué. Ce chiffre dit si le montage tient.`);
  }
  const nonMesurees = sortie.filter((l) => !l.mesurable);
  if (nonMesurees.length) {
    txt.push('');
    txt.push(`${nonMesurees.length} vidéo(s) sans données : Studio n'affiche la rétention qu'au-dessus`);
    txt.push(`d'un certain nombre de vues. Ne pas lire zéro là où il n'y a rien.`);
  }

  console.log('');
  console.log(txt.join('\n'));
  for (const d of [STATS, BRIEFS]) fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(BRIEFS, `retention-${jour}.txt`), txt.join('\n') + '\n');
  fs.writeFileSync(
    path.join(STATS, `retention-${jour}.json`),
    JSON.stringify({ jour, videos: sortie }, null, 2),
  );
  console.log(`→ social/stats/retention-${jour}.json`);
  process.exit(0);
})();
