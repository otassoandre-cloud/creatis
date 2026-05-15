// setup-follow-table.js — à lancer UNE SEULE FOIS
// node setup-follow-table.js

const https = require('https');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const getEnv = key => { const m = envContent.match(new RegExp('^' + key + '=(.+)', 'm')); return m ? m[1].trim() : ''; };

const PROJECT_REF = getEnv('SUPABASE_PROJECT_REF');
const ACCESS_TOKEN = getEnv('SUPABASE_ACCESS_TOKEN');

const SQL = `
CREATE TABLE IF NOT EXISTS x_followed (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  handle text UNIQUE NOT NULL,
  nom text,
  source text DEFAULT 'seed',
  date_followed date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS x_followed_handle_idx ON x_followed (handle);
`;

async function main() {
  if (!ACCESS_TOKEN || ACCESS_TOKEN.startsWith('sbp_...') || ACCESS_TOKEN === 'sbp_...') {
    console.log('⚠️  SUPABASE_ACCESS_TOKEN non configuré.\n');
    console.log('Option A — Copie ce SQL dans Supabase Dashboard → SQL Editor :');
    console.log('https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new\n');
    console.log(SQL);
    return;
  }

  const body = JSON.stringify({ query: SQL });
  const result = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });

  if (result.status < 300) {
    console.log('✅ Table x_followed créée dans Supabase');
  } else {
    console.log('❌ Erreur:', result.status, JSON.stringify(result.body));
    console.log('\nCopie ce SQL dans Supabase Dashboard → SQL Editor :');
    console.log(SQL);
  }
}

main().catch(console.error);
