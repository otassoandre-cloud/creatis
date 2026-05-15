#!/usr/bin/env node
/* ===== CRÉATIS — Configuration DNS OVH automatique =====
   Prérequis : créer des clés sur https://api.ovh.com/createApp/
   Usage : node setup/configure-ovh-dns.js AK AS CK
   Exemple : node setup/configure-ovh-dns.js EXEgWIz07P0HYwtN fnbq3fPH... sbp_xxx ===== */

'use strict';
const crypto = require('crypto');

const [,, AK, AS, CK] = process.argv;
if (!AK || !AS || !CK) {
  console.log('\n📋 CRÉER LES CLÉS OVH (30 secondes) :');
  console.log('  1. Va sur : https://eu.api.ovh.com/createApp/');
  console.log('  2. Connecte-toi à ton compte OVH');
  console.log('  3. Nom : creatis-dns  |  Description : DNS auto');
  console.log('  4. Copie Application Key et Application Secret\n');
  console.log('  5. Lance ce script SANS arguments pour générer un Consumer Key :');
  console.log('     node setup/configure-ovh-dns.js AK AS\n');
  console.log('     → Tu auras un lien à cliquer pour valider\n');
  process.exit(1);
}

const ENDPOINT = 'https://eu.api.ovh.com/1.0';
const DOMAIN   = 'creatis.app';

function sign(method, url, body, ts) {
  const data = [AS, CK, method.toUpperCase(), url, body || '', ts].join('+');
  return '$1$' + crypto.createHash('sha1').update(data).digest('hex');
}

async function ovh(method, path, body) {
  const url  = ENDPOINT + path;
  const ts   = Math.floor(Date.now() / 1000).toString();
  const bodyStr = body ? JSON.stringify(body) : '';
  const headers = {
    'Content-Type':     'application/json',
    'X-Ovh-Application': AK,
    'X-Ovh-Consumer':   CK,
    'X-Ovh-Timestamp':  ts,
    'X-Ovh-Signature':  sign(method, url, bodyStr, ts)
  };
  const resp = await fetch(url, { method, headers, body: bodyStr || undefined });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`OVH ${resp.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// Si seulement AK + AS : demander un Consumer Key
async function demanderConsumerKey() {
  const ts = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({
    accessRules: [
      { method: 'GET',    path: '/domain/zone/*' },
      { method: 'POST',   path: '/domain/zone/*' },
      { method: 'PUT',    path: '/domain/zone/*' },
      { method: 'DELETE', path: '/domain/zone/*' }
    ],
    redirection: 'https://creatis.app'
  });
  const sig = '$1$' + crypto.createHash('sha1').update([AS, '', 'POST', ENDPOINT + '/auth/credential', body, ts].join('+')).digest('hex');
  const resp = await fetch(ENDPOINT + '/auth/credential', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Ovh-Application': AK, 'X-Ovh-Timestamp': ts, 'X-Ovh-Signature': sig },
    body
  });
  const data = await resp.json();
  console.log('\n✅ Consumer Key généré :', data.consumerKey);
  console.log('🔗 Clique sur ce lien pour valider :', data.validationUrl);
  console.log('\nAprès validation, relance :');
  console.log(`  node setup/configure-ovh-dns.js ${AK} ${AS} ${data.consumerKey}\n`);
}

async function main() {
  // Si pas de CK, demander un token
  if (!CK || CK === 'undefined') {
    return demanderConsumerKey();
  }

  console.log(`\n🌐 Configuration DNS OVH pour ${DOMAIN}...\n`);

  // Lire la zone actuelle
  const records = await ovh('GET', `/domain/zone/${DOMAIN}/record`);
  console.log(`📋 ${records.length} enregistrements existants`);

  // Enregistrements à créer
  const toCreate = [
    { fieldType: 'A',     subDomain: '',    target: '76.76.21.21',          ttl: 3600 },
    { fieldType: 'CNAME', subDomain: 'www', target: 'cname.vercel-dns.com.', ttl: 3600 }
  ];

  for (const rec of toCreate) {
    // Supprimer les anciens enregistrements du même type/subdomain
    const existing = await ovh('GET', `/domain/zone/${DOMAIN}/record?fieldType=${rec.fieldType}&subDomain=${rec.subDomain}`);
    for (const id of existing) {
      await ovh('DELETE', `/domain/zone/${DOMAIN}/record/${id}`);
      console.log(`  🗑️  Supprimé enregistrement ${rec.fieldType} ${rec.subDomain || '@'} existant (ID: ${id})`);
    }

    // Créer le nouvel enregistrement
    const created = await ovh('POST', `/domain/zone/${DOMAIN}/record`, rec);
    console.log(`  ✅ Créé : ${rec.fieldType} ${rec.subDomain || '@'} → ${rec.target} (ID: ${created.id})`);
  }

  // Rafraîchir la zone
  await ovh('POST', `/domain/zone/${DOMAIN}/refresh`);
  console.log('\n🔄 Zone DNS rafraîchie — propagation 5-30 min\n');

  console.log('═'.repeat(50));
  console.log('✅ DNS configurés :');
  console.log('   A     @    → 76.76.21.21');
  console.log('   CNAME www  → cname.vercel-dns.com.');
  console.log('═'.repeat(50));
  console.log('\nVérifie dans 5 min sur : https://dnschecker.org/#A/creatis.app\n');
}

main().catch(e => {
  if (!CK) demanderConsumerKey().catch(console.error);
  else console.error('\n❌', e.message, '\n');
});
