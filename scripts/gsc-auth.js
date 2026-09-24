#!/usr/bin/env node
/**
 * Autorisation Search Console en OAuth — à lancer UNE SEULE FOIS.
 *
 * Contourne `iam.disableServiceAccountKeyCreation` : pas de clé de compte de
 * service, un jeton de rafraîchissement personnel à la place.
 *
 * Prérequis dans .env (identifiants OAuth « Application de bureau ») :
 *   GSC_CLIENT_ID=...apps.googleusercontent.com
 *   GSC_CLIENT_SECRET=GOCSPX-...
 *
 * Usage :
 *   node scripts/gsc-auth.js
 *
 * Le navigateur s'ouvre, tu autorises, et GSC_REFRESH_TOKEN est écrit dans .env.
 * Ensuite `node scripts/gsc.js` fonctionne sans jamais redemander l'autorisation.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');

const ENV = path.join(__dirname, '..', '.env');
const PORT = 53682; // port de bouclage — autorisé d'office pour un client « bureau »
const REDIRECT = `http://localhost:${PORT}`;
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

function lireEnv() {
  if (!fs.existsSync(ENV)) return {};
  const vars = {};
  for (const ligne of fs.readFileSync(ENV, 'utf8').split(/\r?\n/)) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) vars[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return vars;
}

function ecrireEnv(cle, valeur) {
  let contenu = fs.existsSync(ENV) ? fs.readFileSync(ENV, 'utf8') : '';
  const motif = new RegExp(`^${cle}=.*$`, 'm');
  if (motif.test(contenu)) contenu = contenu.replace(motif, `${cle}=${valeur}`);
  else contenu = contenu.replace(/\s*$/, '\n') + `${cle}=${valeur}\n`;
  fs.writeFileSync(ENV, contenu);
}

const env = lireEnv();
const CLIENT_ID = env.GSC_CLIENT_ID;
const CLIENT_SECRET = env.GSC_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    'GSC_CLIENT_ID et GSC_CLIENT_SECRET manquent dans .env.\n\n' +
      'Google Cloud → Identifiants → Créer des identifiants → ID client OAuth\n' +
      '→ Type : Application de bureau → copie les deux valeurs dans .env :\n\n' +
      '  GSC_CLIENT_ID=...apps.googleusercontent.com\n' +
      '  GSC_CLIENT_SECRET=GOCSPX-...\n'
  );
  process.exit(1);
}

const urlConsentement =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline', // indispensable pour obtenir un refresh_token
    prompt: 'consent',
  });

const page = (titre, corps) =>
  `<!doctype html><meta charset="utf-8"><title>${titre}</title>` +
  `<body style="font-family:system-ui;background:#0a0f0a;color:#e8f5e9;display:grid;` +
  `place-items:center;height:100vh;margin:0;text-align:center">` +
  `<div><h1 style="color:#10b981">${titre}</h1><p>${corps}</p></div>`;

const serveur = http.createServer(async (req, res) => {
  const recue = new URL(req.url, REDIRECT);
  const code = recue.searchParams.get('code');
  const erreur = recue.searchParams.get('error');

  if (erreur) {
    res.end(page('Autorisation refusée', erreur));
    console.error('Refus de Google :', erreur);
    serveur.close();
    process.exit(1);
  }
  if (!code) return res.end(page('En attente…', 'Rien à faire ici.'));

  try {
    const rep = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT,
        grant_type: 'authorization_code',
      }),
    });
    const data = await rep.json();
    // Fail fast : on montre l'erreur de Google verbatim.
    if (!rep.ok) throw new Error(`${rep.status} — ${JSON.stringify(data)}`);
    if (!data.refresh_token)
      throw new Error(
        "Google n'a pas renvoyé de refresh_token. Révoque l'accès sur " +
          'myaccount.google.com/permissions puis relance.'
      );

    ecrireEnv('GSC_REFRESH_TOKEN', data.refresh_token);
    res.end(page('C’est bon', 'Le jeton est enregistré dans .env — tu peux fermer cet onglet.'));
    console.log('\nGSC_REFRESH_TOKEN écrit dans .env.');
    console.log('Teste maintenant :  node scripts/gsc.js --jours 90');
  } catch (e) {
    res.end(page('Échec', String(e.message)));
    console.error(e.message);
    serveur.close();
    process.exit(1);
  }
  serveur.close();
});

serveur.listen(PORT, () => {
  console.log('Ouverture du navigateur pour autoriser la lecture de Search Console…');
  console.log('\nSi rien ne s’ouvre, colle cette adresse à la main :\n' + urlConsentement + '\n');
  const ouvrir =
    process.platform === 'win32' ? 'start ""' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${ouvrir} "${urlConsentement}"`);
});
