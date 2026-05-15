#!/usr/bin/env node
/* ===== CRÉATIS — Initialisation Supabase =====
   Usage : node setup/init-supabase.js
   Prérequis : SUPABASE_URL + SUPABASE_SERVICE_KEY dans .env
   Résultat : crée les tables, index, RLS, vues analytics ===== */

'use strict';
const fs = require('fs');
const path = require('path');

/* ── Charger .env ────────────────────────────────────────────── */
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF  = process.env.SUPABASE_PROJECT_REF;

/* ── Valider la config ───────────────────────────────────────── */
if (!SUPABASE_URL || SUPABASE_URL.includes('VOTRE_REF')) {
  console.error('\n❌ SUPABASE_URL manquant dans .env');
  console.error('   Format : https://XXXX.supabase.co\n');
  process.exit(1);
}
if (!SUPABASE_KEY || (!SUPABASE_KEY.startsWith('eyJ') && !SUPABASE_KEY.startsWith('sb_secret_'))) {
  console.error('\n❌ SUPABASE_SERVICE_KEY manquant dans .env');
  console.error('   Récupère-le sur app.supabase.com → Settings → API → service_role\n');
  process.exit(1);
}

/* ── Extraire le project ref depuis l'URL ────────────────────── */
const detectedRef = PROJECT_REF || SUPABASE_URL.replace('https://', '').split('.')[0];
console.log(`\n🔗 Projet Supabase : ${detectedRef}`);

/* ── Lire le fichier SQL ─────────────────────────────────────── */
const sqlPath = path.join(__dirname, 'supabase-schema.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('\n❌ Fichier setup/supabase-schema.sql introuvable\n');
  process.exit(1);
}
const fullSQL = fs.readFileSync(sqlPath, 'utf8');

/* ── Découper le SQL en statements exécutables ───────────────── */
function splitSQL(sql) {
  // Supprimer les commentaires de ligne
  const clean = sql.replace(/--[^\n]*/g, '');
  // Diviser sur les ; en respectant les corps de fonctions $$ ... $$
  const statements = [];
  let current = '';
  let inDollarQuote = false;

  for (const line of clean.split('\n')) {
    if (line.includes('$$')) {
      inDollarQuote = !inDollarQuote;
    }
    current += line + '\n';
    if (!inDollarQuote && line.trim().endsWith(';')) {
      const stmt = current.trim();
      if (stmt.length > 1) statements.push(stmt);
      current = '';
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements.filter(s => s.length > 3);
}

/* ── Exécuter SQL via Supabase Management API ────────────────── */
async function executerSQL(sql) {
  // Méthode 1 : Management API (nécessite access token)
  if (ACCESS_TOKEN && ACCESS_TOKEN.startsWith('sbp_')) {
    const resp = await fetch(`https://api.supabase.com/v1/projects/${detectedRef}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (resp.ok) {
      const data = await resp.json();
      return { ok: true, data };
    }
    const err = await resp.text();
    // Si 403 ou 404, essayer la méthode 2
    if (resp.status !== 403 && resp.status !== 404) {
      return { ok: false, error: `API ${resp.status}: ${err}` };
    }
  }

  // Méthode 2 : RPC exec_sql (si la fonction existe dans Supabase)
  const resp2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify({ sql_query: sql })
  });

  if (resp2.ok) return { ok: true };

  // Méthode 3 : Fallback — créer la fonction exec_sql d'abord
  return { ok: false, error: `RPC exec_sql non disponible (${resp2.status})`, fallback: true };
}

/* ── Créer la fonction exec_sql helper ───────────────────────── */
async function creerFonctionExecSQL() {
  const createFn = `
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS void AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

  // Via Management API
  if (ACCESS_TOKEN && ACCESS_TOKEN.startsWith('sbp_')) {
    const resp = await fetch(`https://api.supabase.com/v1/projects/${detectedRef}/database/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ACCESS_TOKEN}` },
      body: JSON.stringify({ query: createFn })
    });
    return resp.ok;
  }
  return false;
}

/* ── Vérifier que les tables ont été créées ──────────────────── */
async function verifierTables() {
  const tables = ['users', 'generations', 'abonnements', 'prospects'];
  const results = {};

  for (const table of tables) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    results[table] = resp.status === 200 || resp.status === 406;
  }
  return results;
}

/* ── Stratégie d'exécution par blocs ─────────────────────────── */
const BLOCS = [
  {
    nom: 'Extensions',
    sql: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS "pgcrypto";`
  },
  {
    nom: 'Table users',
    sql: `CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nom TEXT, avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'gratuit' CHECK (plan IN ('gratuit','trial','starter','pro','agency')),
  plan_expires_at TIMESTAMPTZ, stripe_customer_id TEXT, stripe_subscription_id TEXT,
  chaine_id TEXT, chaine_nom TEXT, chaine_abonnes INTEGER DEFAULT 0, chaine_avatar TEXT,
  youtube_access_token TEXT, youtube_refresh_token TEXT, youtube_token_expires TIMESTAMPTZ,
  generations_count INTEGER DEFAULT 0, miniatures_count INTEGER DEFAULT 0,
  miniatures_used INTEGER DEFAULT 0, miniatures_reset_at TIMESTAMPTZ DEFAULT NOW(),
  last_generation_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ, source TEXT DEFAULT 'web'
);`
  },
  {
    nom: 'Index users',
    sql: `CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan ON public.users(plan);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON public.users(stripe_customer_id);`
  },
  {
    nom: 'Table generations',
    sql: `CREATE TABLE IF NOT EXISTS public.generations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL, agent_type TEXT DEFAULT 'texte',
  plan TEXT NOT NULL DEFAULT 'gratuit', tokens_used INTEGER DEFAULT 0, duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON public.generations(created_at);`
  },
  {
    nom: 'Table abonnements',
    sql: `CREATE TABLE IF NOT EXISTS public.abonnements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE, stripe_customer_id TEXT,
  plan TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
  montant_centimes INTEGER NOT NULL DEFAULT 0, devise TEXT DEFAULT 'eur', annuel BOOLEAN DEFAULT FALSE,
  current_period_start TIMESTAMPTZ, current_period_end TIMESTAMPTZ, canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_abonnements_user_id ON public.abonnements(user_id);
CREATE INDEX IF NOT EXISTS idx_abonnements_stripe ON public.abonnements(stripe_subscription_id);`
  },
  {
    nom: 'Table prospects',
    sql: `CREATE TABLE IF NOT EXISTS public.prospects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  youtube_id TEXT UNIQUE, nom TEXT NOT NULL, email TEXT, url TEXT,
  abonnes INTEGER DEFAULT 0, niche TEXT, score INTEGER DEFAULT 50,
  statut TEXT DEFAULT 'nouveau', notes TEXT, date_contact TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`
  },
  {
    nom: 'RLS policies',
    sql: `ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abonnements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='Service role full access') THEN
    CREATE POLICY "Service role full access" ON public.users FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;`
  },
  {
    nom: 'Trigger updated_at',
    sql: `CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS trigger_abonnements_updated_at ON public.abonnements;
CREATE TRIGGER trigger_abonnements_updated_at
  BEFORE UPDATE ON public.abonnements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();`
  },
  {
    nom: 'Vues analytics',
    sql: `CREATE OR REPLACE VIEW public.stats_plans AS
SELECT plan, COUNT(*) AS nb_utilisateurs, SUM(generations_count) AS total_generations,
  AVG(generations_count) AS avg_generations, SUM(miniatures_used) AS total_miniatures
FROM public.users GROUP BY plan ORDER BY nb_utilisateurs DESC;
CREATE OR REPLACE VIEW public.stats_agents AS
SELECT agent_id, COUNT(*) AS nb_utilisations, AVG(tokens_used) AS avg_tokens, AVG(duration_ms) AS avg_duration_ms
FROM public.generations WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY agent_id ORDER BY nb_utilisations DESC;`
  }
];

/* ── Main ─────────────────────────────────────────────────────── */
async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  CRÉATIS — Init Supabase');
  console.log('═'.repeat(60));

  // Vérifier si les tables existent déjà
  console.log('\n🔍 Vérification de l\'état actuel...');
  const etatInitial = await verifierTables();
  const dejaPresentes = Object.values(etatInitial).filter(Boolean).length;

  if (dejaPresentes === 4) {
    console.log('✅ Les 4 tables existent déjà — schéma OK\n');
    console.log('Tables :', Object.entries(etatInitial).map(([k,v]) => `${k}: ${v ? '✓' : '✗'}`).join(' | '));
    console.log('\nPour ré-exécuter quand même : modifier le code et retirer cette vérification.\n');
    return;
  }

  console.log(`Tables présentes : ${dejaPresentes}/4`);

  // Essayer d'abord la création de exec_sql via Management API
  let methode = 'blocks';
  if (ACCESS_TOKEN && ACCESS_TOKEN.startsWith('sbp_')) {
    console.log('\n🔧 Tentative via Management API...');
    const resp = await fetch(`https://api.supabase.com/v1/projects/${detectedRef}/database/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ACCESS_TOKEN}` },
      body: JSON.stringify({ query: 'SELECT 1+1 AS test;' })
    });
    if (resp.ok) {
      methode = 'management_api';
      console.log('   ✅ Management API accessible\n');
    } else {
      console.log(`   ⚠️ Management API: ${resp.status} — utilisation des blocs REST\n`);
    }
  }

  // Exécuter les blocs
  let erreurs = 0;
  for (const bloc of BLOCS) {
    process.stdout.write(`  ⏳ ${bloc.nom}...`);

    let ok = false;

    if (methode === 'management_api') {
      const resp = await fetch(`https://api.supabase.com/v1/projects/${detectedRef}/database/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ACCESS_TOKEN}` },
        body: JSON.stringify({ query: bloc.sql })
      });
      ok = resp.ok;
      if (!ok) {
        const err = await resp.text();
        process.stdout.write(` ❌ (${resp.status})\n`);
        // Continuer même si certains blocs échouent (ex: index déjà existants)
        if (!err.includes('already exists')) erreurs++;
        continue;
      }
    } else {
      // Fallback : tenter via la fonction exec_sql si elle existe
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ sql_query: bloc.sql })
      });
      ok = resp.ok;
      if (!ok) {
        process.stdout.write(` ⚠️ (SQL direct non disponible)\n`);
        erreurs++;
        continue;
      }
    }

    process.stdout.write(` ✅\n`);
    await new Promise(r => setTimeout(r, 100));
  }

  // Vérifier le résultat
  console.log('\n🔍 Vérification post-installation...');
  const etatFinal = await verifierTables();
  const presentes = Object.values(etatFinal).filter(Boolean).length;

  console.log('\n' + '─'.repeat(40));
  Object.entries(etatFinal).forEach(([t, ok]) => {
    console.log(`  ${ok ? '✅' : '❌'} ${t}`);
  });
  console.log('─'.repeat(40));

  if (presentes === 4) {
    console.log('\n🎉 Supabase initialisé avec succès !\n');
  } else if (presentes > 0) {
    console.log(`\n⚠️  ${presentes}/4 tables créées. Les suivantes sont manquantes :`);
    Object.entries(etatFinal).filter(([,v]) => !v).forEach(([t]) => console.log(`   - ${t}`));
    afficherFallback();
  } else {
    console.log('\n❌ Aucune table créée — exécution SQL directe requise.');
    afficherFallback();
  }
}

function afficherFallback() {
  console.log('\n' + '═'.repeat(60));
  console.log('💡 MÉTHODE ALTERNATIVE — SQL Editor Supabase');
  console.log('═'.repeat(60));
  console.log('1. Va sur app.supabase.com → ton projet');
  console.log('2. Clique sur "SQL Editor" dans le menu gauche');
  console.log('3. Clique "New query"');
  console.log('4. Copie-colle le contenu de setup/supabase-schema.sql');
  console.log('5. Clique "Run" (F5)');
  console.log('\nOu via psql (si connexion DB directe disponible) :');
  console.log('  psql "postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"');
  console.log('  \\i setup/supabase-schema.sql');
  console.log('═'.repeat(60) + '\n');
}

main().catch(err => {
  console.error('\n❌ Erreur fatale:', err.message, '\n');
  process.exit(1);
});
