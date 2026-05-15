// migrate-follows-to-supabase.js
// À lancer APRÈS avoir créé la table x_followed dans Supabase
// node migrate-follows-to-supabase.js

const https = require('https');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync('.env', 'utf8');
const getEnv = key => { const m = envContent.match(new RegExp('^' + key + '=(.+)', 'm')); return m ? m[1].trim() : ''; };
const SUPA_BASE = getEnv('SUPABASE_URL').replace(/\/$/, '');
const KEY = getEnv('SUPABASE_SERVICE_KEY');

async function insert(rows) {
  const body = JSON.stringify(rows);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: new URL(SUPA_BASE).hostname,
      path: '/rest/v1/x_followed',
      method: 'POST',
      headers: {
        'apikey': KEY, 'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

async function main() {
  const file = path.join(__dirname, 'followed-creators.json');
  if (!fs.existsSync(file)) { console.log('Aucun fichier followed-creators.json trouvé'); return; }

  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const handles = data.handles || [];
  if (!handles.length) { console.log('Aucun handle à migrer'); return; }

  const rows = handles.map(h => ({ handle: h.toLowerCase(), nom: h, source: 'seed', date_followed: data.last_run || '2026-05-14' }));
  console.log(`Migration de ${rows.length} handles vers Supabase...`);

  const r = await insert(rows);
  if (r.status === 201 || r.status === 200 || r.status === 409) {
    console.log(`✅ ${rows.length} handles migrés avec succès`);
  } else {
    console.log(`❌ Erreur ${r.status}:`, r.body.substring(0, 300));
    console.log('\n→ Crée d\'abord la table x_followed dans Supabase SQL Editor :');
    console.log('https://supabase.com/dashboard/project/zjzcgcpphzcghigzpghq/sql/new');
  }
}

main().catch(console.error);
