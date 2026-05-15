#!/usr/bin/env node
/* ===== CRÉATIS — Setup Complet =====
   Orchestre les 4 étapes P0 dans l'ordre :
   1. Valider le .env
   2. Init Supabase (tables + schéma)
   3. Créer produits Stripe
   4. Vérifier la configuration finale
   Usage : node setup/setup-complet.js ===== */

'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/* ── Charger .env ────────────────────────────────────────────── */
const ROOT = path.join(__dirname, '..');
const envPath = path.join(ROOT, '.env');

if (!fs.existsSync(envPath)) {
  console.error('\n❌ Fichier .env introuvable à la racine du projet\n');
  process.exit(1);
}

fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
});

/* ── Couleurs terminal ───────────────────────────────────────── */
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', dim: '\x1b[2m'
};
const ok  = (s) => `${C.green}✅ ${s}${C.reset}`;
const err = (s) => `${C.red}❌ ${s}${C.reset}`;
const warn = (s) => `${C.yellow}⚠️  ${s}${C.reset}`;
const info = (s) => `${C.cyan}ℹ️  ${s}${C.reset}`;

/* ── Validation config ───────────────────────────────────────── */
function validerEnv() {
  console.log(`\n${C.bold}═══ ÉTAPE 1/4 — Validation .env ═══${C.reset}\n`);

  // Valide = présent, bon format, pas un placeholder (longueur minimale)
  const real = (v, prefix, minLen = 20) =>
    v && v.startsWith(prefix) && v.length >= minLen && !v.endsWith('_') && !v.includes('VOTRE');

  const checks = [
    { key: 'GROQ_API_KEY',         label: 'Groq API Key',         test: v => real(v, 'gsk_', 40), required: true },
    { key: 'TOGETHER_API_KEY',     label: 'Together AI Key',      test: v => real(v, 'tgp_', 30), required: true },
    { key: 'STRIPE_SECRET_KEY',    label: 'Stripe Secret Key',    test: v => real(v, 'sk_', 30),  required: true },
    { key: 'STRIPE_PUBLIC_KEY',    label: 'Stripe Public Key',    test: v => real(v, 'pk_', 30),  required: true },
    { key: 'SUPABASE_URL',         label: 'Supabase URL',         test: v => v?.includes('.supabase.co') && !v.includes('VOTRE'), required: true },
    { key: 'SUPABASE_SERVICE_KEY', label: 'Supabase Service Key', test: v => (real(v, 'eyJ', 100) || real(v, 'sb_secret_', 20)), required: true },
    { key: 'BREVO_API_KEY',        label: 'Brevo API Key',        test: v => real(v, 'xkeysib-', 20), required: false },
    { key: 'APP_URL',              label: 'App URL',              test: v => v?.startsWith('https://') && v.length > 12, required: true }
  ];

  let allOk = true;
  const missing = [];

  for (const check of checks) {
    const val = process.env[check.key];
    const valid = val && check.test(val);
    const label = `${check.label.padEnd(22)}`;

    if (valid) {
      const preview = val.length > 20 ? val.substring(0, 12) + '…' + val.slice(-4) : val;
      console.log(`  ${ok(label)} ${C.dim}${preview}${C.reset}`);
    } else if (!check.required) {
      console.log(`  ${warn(label)} ${C.dim}(optionnel — manquant)${C.reset}`);
    } else {
      console.log(`  ${err(label)} ${C.dim}NON CONFIGURÉ${C.reset}`);
      missing.push(check.key);
      allOk = false;
    }
  }

  if (!allOk) {
    console.log(`\n${err('Variables manquantes dans .env :')}`);
    missing.forEach(k => console.log(`   • ${k}`));
    console.log(`\n  → Éditez le fichier .env et relancez\n`);
    return false;
  }

  console.log(`\n  ${ok('Toutes les variables requises sont présentes')}\n`);
  return true;
}

/* ── Lancer un script enfant ─────────────────────────────────── */
function lancerScript(scriptPath, label) {
  console.log(`\n${C.bold}${label}${C.reset}\n`);
  try {
    execSync(`node "${scriptPath}"`, {
      stdio: 'inherit',
      env: process.env,
      cwd: ROOT
    });
    return true;
  } catch (e) {
    console.log(`\n${err('Le script a échoué (voir les erreurs ci-dessus)')}\n`);
    return false;
  }
}

/* ── Vérification finale ─────────────────────────────────────── */
async function verificationFinale() {
  console.log(`\n${C.bold}═══ ÉTAPE 4/4 — Vérification Finale ═══${C.reset}\n`);

  const checks = [];

  // Vérifier Groq
  try {
    const resp = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }
    });
    checks.push({ label: 'Groq API',       ok: resp.ok });
  } catch {
    checks.push({ label: 'Groq API',       ok: false });
  }

  // Vérifier Together AI
  try {
    const resp = await fetch('https://api.together.xyz/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}` }
    });
    checks.push({ label: 'Together AI',    ok: resp.ok });
  } catch {
    checks.push({ label: 'Together AI',    ok: false });
  }

  // Vérifier Stripe
  try {
    const auth = Buffer.from(`${process.env.STRIPE_SECRET_KEY}:`).toString('base64');
    const resp = await fetch('https://api.stripe.com/v1/account', {
      headers: { 'Authorization': `Basic ${auth}` }
    });
    checks.push({ label: 'Stripe',         ok: resp.ok });
  } catch {
    checks.push({ label: 'Stripe',         ok: false });
  }

  // Vérifier Supabase
  try {
    const resp = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?select=id&limit=1`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    });
    checks.push({ label: 'Supabase DB',    ok: resp.status === 200 || resp.status === 406 });
  } catch {
    checks.push({ label: 'Supabase DB',    ok: false });
  }

  // Vérifier config.js (price IDs patchés)
  const configPath = path.join(ROOT, 'js', 'config.js');
  const configContent = fs.readFileSync(configPath, 'utf8');
  const hasPriceIds = configContent.includes('price_') && !configContent.includes('price_creatis_starter_mensuel');
  checks.push({ label: 'Price IDs config.js', ok: hasPriceIds });

  // Afficher
  for (const c of checks) {
    console.log(`  ${c.ok ? ok(c.label) : err(c.label)}`);
  }

  const score = checks.filter(c => c.ok).length;
  console.log(`\n  Score : ${score}/${checks.length} checks passés`);

  return score;
}

/* ── Instructions Vercel ─────────────────────────────────────── */
function afficherInstructionsVercel() {
  console.log(`\n${C.bold}═══ ÉTAPE FINALE — Déploiement Vercel ═══${C.reset}\n`);

  const vars = [
    'GROQ_API_KEY', 'TOGETHER_API_KEY', 'STRIPE_SECRET_KEY',
    'STRIPE_PUBLIC_KEY', 'STRIPE_WEBHOOK_SECRET',
    'SUPABASE_URL', 'SUPABASE_SERVICE_KEY',
    'BREVO_API_KEY', 'APP_URL'
  ];

  console.log('  Copie ces variables dans Vercel Dashboard → Settings → Environment Variables :\n');
  for (const key of vars) {
    const val = process.env[key];
    if (val && !val.includes('VOTRE') && !val.endsWith('_')) {
      const preview = val.length > 20 ? val.substring(0, 10) + '…' : val;
      console.log(`  ${C.green}${key}${C.reset} = ${C.dim}${preview}${C.reset}`);
    } else {
      console.log(`  ${C.yellow}${key}${C.reset} = ${C.dim}[À remplir]${C.reset}`);
    }
  }

  console.log(`\n  Puis déployer :\n`);
  console.log(`  ${C.cyan}git add . && git commit -m "feat: Créatis v1.0 — config complète"${C.reset}`);
  console.log(`  ${C.cyan}git push origin main${C.reset}`);
  console.log(`  ${C.cyan}# Vercel déploie automatiquement${C.reset}\n`);
}

/* ── Main ─────────────────────────────────────────────────────── */
async function main() {
  console.log('\n' + C.bold + C.green);
  console.log('  ██████╗ ██████╗ ███████╗ █████╗ ████████╗██╗███████╗');
  console.log('  ██╔════╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██║██╔════╝');
  console.log('  ██║     ██████╔╝█████╗  ███████║   ██║   ██║███████╗');
  console.log('  ██║     ██╔══██╗██╔══╝  ██╔══██║   ██║   ██║╚════██║');
  console.log('  ╚██████╗██║  ██║███████╗██║  ██║   ██║   ██║███████║');
  console.log('   ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝╚══════╝');
  console.log('                     Setup Complet v1.0');
  console.log(C.reset);

  // Étape 1 : valider .env
  const envOk = validerEnv();
  if (!envOk) {
    console.log(warn('Setup interrompu — compléter .env en premier\n'));
    process.exit(1);
  }

  // Étape 2 : Supabase
  const supabaseOk = lancerScript(
    path.join(__dirname, 'init-supabase.js'),
    '═══ ÉTAPE 2/4 — Init Supabase ═══'
  );

  // Étape 3 : Stripe
  const stripeOk = lancerScript(
    path.join(__dirname, 'create-stripe-products.js'),
    '═══ ÉTAPE 3/4 — Produits Stripe ═══'
  );

  // Étape 4 : Vérification
  const score = await verificationFinale();

  // Instructions Vercel
  afficherInstructionsVercel();

  // Résumé final
  console.log('\n' + '═'.repeat(60));
  if (score >= 4) {
    console.log(ok(' Setup terminé ! Créatis est prêt pour le déploiement.'));
  } else {
    console.log(warn(` Setup partiel (${score}/5 checks). Voir les erreurs ci-dessus.`));
    console.log(info(' Les étapes marquées ❌ nécessitent une intervention manuelle.'));
  }
  console.log('═'.repeat(60) + '\n');

  process.exit(score >= 3 ? 0 : 1);
}

main().catch(err => {
  console.error('\n❌ Erreur fatale:', err.message, '\n');
  process.exit(1);
});
