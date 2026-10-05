#!/usr/bin/env node
/**
 * Soumet le sitemap à Search Console, et liste ceux déjà connus de Google.
 *
 *   node scripts/gsc-sitemap.js           → état des sitemaps connus
 *   node scripts/gsc-sitemap.js --soumettre
 *
 * Exige la portée OAuth complète (webmasters, pas webmasters.readonly). Si le
 * jeton en place est en lecture seule, Google répond 403 — relancer alors
 * `node scripts/gsc-auth.js` une fois pour réautoriser.
 *
 * À lancer après chaque publication de pages : c'est le seul signal de recrawl
 * qu'on peut envoyer par API. La demande d'indexation URL par URL, elle, n'est
 * pas exposée par l'API et reste manuelle dans l'interface.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const SITE = process.env.GSC_SITE || 'https://creatis.app/';
const SITEMAP = SITE.replace(/\/$/, '') + '/sitemap.xml';

function lireEnv() {
  const p = path.join(RACINE, '.env');
  if (!fs.existsSync(p)) return {};
  const vars = {};
  for (const ligne of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) vars[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return vars;
}

async function jeton(env) {
  const rep = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GSC_CLIENT_ID,
      client_secret: env.GSC_CLIENT_SECRET,
      refresh_token: env.GSC_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const d = await rep.json();
  if (!rep.ok) throw new Error(`Jeton refusé (${rep.status}) — ${JSON.stringify(d)}`);
  return d.access_token;
}

const base =
  'https://searchconsole.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(SITE);

(async () => {
  const env = lireEnv();
  if (!env.GSC_REFRESH_TOKEN) {
    console.error('Pas de GSC_REFRESH_TOKEN dans .env — lance d’abord node scripts/gsc-auth.js');
    process.exit(1);
  }
  const acces = await jeton(env);
  const auth = { Authorization: `Bearer ${acces}` };

  if (process.argv.includes('--soumettre')) {
    const rep = await fetch(`${base}/sitemaps/${encodeURIComponent(SITEMAP)}`, {
      method: 'PUT',
      headers: auth,
    });
    if (rep.status === 403) {
      console.error(
        'Refusé (403) — le jeton actuel est probablement en lecture seule.\n' +
          'Relance `node scripts/gsc-auth.js` pour réautoriser avec la portée complète.'
      );
      process.exit(1);
    }
    if (!rep.ok) throw new Error(`Soumission refusée (${rep.status}) — ${await rep.text()}`);
    console.log(`Sitemap soumis : ${SITEMAP}`);
  }

  const rep = await fetch(`${base}/sitemaps`, { headers: auth });
  const d = await rep.json();
  if (!rep.ok) throw new Error(`Lecture refusée (${rep.status}) — ${JSON.stringify(d)}`);

  console.log(`\nSitemaps connus de Google pour ${SITE}`);
  for (const s of d.sitemap || []) {
    const web = (s.contents || []).find((c) => c.type === 'web') || {};
    console.log(
      `  ${s.path}\n` +
        `    dernier envoi   : ${(s.lastSubmitted || '—').slice(0, 10)}\n` +
        `    dernière lecture: ${(s.lastDownloaded || 'jamais').slice(0, 10)}\n` +
        `    URLs soumises   : ${web.submitted || 0}\n` +
        `    en erreur       : ${s.errors || 0} · avertissements : ${s.warnings || 0}`
    );
  }
  if (!(d.sitemap || []).length) console.log('  (aucun — lance avec --soumettre)');
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
