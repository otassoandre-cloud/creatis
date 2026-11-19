#!/usr/bin/env node
/**
 * Lecture Search Console — zéro dépendance npm.
 *
 * Deux authentifications possibles, essayées dans cet ordre :
 *   1. OAuth personnel — GSC_CLIENT_ID / GSC_CLIENT_SECRET / GSC_REFRESH_TOKEN dans .env
 *      (voir scripts/gsc-auth.js, à lancer une seule fois). C'est la voie à utiliser
 *      quand `iam.disableServiceAccountKeyCreation` interdit les clés de compte de service.
 *   2. Compte de service — `gsc-service-account.json` à la racine (déjà dans .gitignore),
 *      son client_email ajouté comme utilisateur dans Search Console.
 *
 * Usage :
 *   node scripts/gsc.js                  → requêtes + pages, 90 derniers jours
 *   node scripts/gsc.js --jours 28       → autre fenêtre
 *   node scripts/gsc.js --dim page       → une seule dimension (query | page | date | country | device)
 *   node scripts/gsc.js --limite 50
 *   node scripts/gsc.js --json           → sortie brute, pour enchaîner
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RACINE = path.join(__dirname, '..');
const CLE = process.env.GSC_KEY_FILE || path.join(RACINE, 'gsc-service-account.json');
const SITE = process.env.GSC_SITE || 'https://creatis.app/';

function arg(nom, defaut) {
  const i = process.argv.indexOf('--' + nom);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : defaut;
}
const drapeau = (nom) => process.argv.includes('--' + nom);

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Lit .env sans dépendance (dotenv n'est pas installé dans ce projet). */
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

/** Voie 1 : échange le jeton de rafraîchissement personnel contre un jeton d'accès. */
async function jetonOAuth(env) {
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
  const data = await rep.json();
  if (!rep.ok)
    throw new Error(
      `Jeton refusé (${rep.status}) — ${JSON.stringify(data)}\n` +
        'Relance `node scripts/gsc-auth.js` pour réautoriser.'
    );
  return data.access_token;
}

/** Voie 2 : échange la clé du compte de service contre un jeton d'accès (JWT RS256). */
async function jeton(compte) {
  const maintenant = Math.floor(Date.now() / 1000);
  const entete = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corps = b64url(
    JSON.stringify({
      iss: compte.client_email,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: maintenant + 3600,
      iat: maintenant,
    })
  );
  const signature = b64url(
    crypto.createSign('RSA-SHA256').update(`${entete}.${corps}`).sign(compte.private_key)
  );

  const rep = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${entete}.${corps}.${signature}`,
    }),
  });
  const data = await rep.json();
  if (!rep.ok) throw new Error(`Jeton refusé (${rep.status}) — ${JSON.stringify(data)}`);
  return data.access_token;
}

async function interroger(acces, dimensions, debut, fin, limite) {
  const url =
    'https://searchconsole.googleapis.com/webmasters/v3/sites/' +
    encodeURIComponent(SITE) +
    '/searchAnalytics/query';
  const rep = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${acces}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate: debut, endDate: fin, dimensions, rowLimit: limite }),
  });
  const data = await rep.json();
  // Fail fast : on montre l'erreur de Google telle quelle plutôt que de deviner.
  if (!rep.ok) throw new Error(`Search Console (${rep.status}) — ${JSON.stringify(data)}`);
  return data.rows || [];
}

function tableau(titre, lignes) {
  console.log(`\n=== ${titre} ===`);
  if (!lignes.length) return console.log('(aucune donnée sur la période)');
  console.log('clics  impr.   CTR    pos.   clé');
  for (const l of lignes) {
    console.log(
      String(l.clicks).padStart(5),
      String(l.impressions).padStart(6),
      (l.ctr * 100).toFixed(1).padStart(5) + '%',
      l.position.toFixed(1).padStart(6),
      ' ' + l.keys.join(' · ')
    );
  }
}

(async () => {
  const env = lireEnv();
  const aOAuth = env.GSC_CLIENT_ID && env.GSC_CLIENT_SECRET && env.GSC_REFRESH_TOKEN;

  if (!aOAuth && !fs.existsSync(CLE)) {
    console.error(
      'Aucune authentification disponible.\n\n' +
        'Voie recommandée (OAuth, passe outre la règle iam.disableServiceAccountKeyCreation) :\n' +
        '  1. Google Cloud → Identifiants → ID client OAuth → Application de bureau\n' +
        '  2. Colle GSC_CLIENT_ID et GSC_CLIENT_SECRET dans .env\n' +
        '  3. node scripts/gsc-auth.js\n\n' +
        `Voie compte de service : dépose le JSON à la racine sous « gsc-service-account.json ».`
    );
    process.exit(1);
  }

  const jours = parseInt(arg('jours', '90'), 10);
  const limite = parseInt(arg('limite', '30'), 10);
  // GSC a ~2 jours de latence : on ne demande jamais aujourd'hui.
  const fin = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
  const debut = new Date(Date.now() - (jours + 2) * 864e5).toISOString().slice(0, 10);

  const acces = aOAuth
    ? await jetonOAuth(env)
    : await jeton(JSON.parse(fs.readFileSync(CLE, 'utf8')));
  const dims = drapeau('dim') ? [arg('dim', 'query')] : null;

  if (drapeau('json')) {
    const lignes = await interroger(acces, dims || ['query'], debut, fin, limite);
    console.log(JSON.stringify({ site: SITE, debut, fin, lignes }, null, 2));
    return;
  }

  console.log(`${SITE} — du ${debut} au ${fin}`);
  if (dims) {
    tableau(dims[0], await interroger(acces, dims, debut, fin, limite));
  } else {
    tableau('Requêtes', await interroger(acces, ['query'], debut, fin, limite));
    tableau('Pages', await interroger(acces, ['page'], debut, fin, limite));
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
