#!/usr/bin/env node
/* ===== CRÉATIS — Création automatique des produits Stripe =====
   Usage : node setup/create-stripe-products.js
   Prérequis : STRIPE_SECRET_KEY dans .env
   Résultat : crée tous les produits + auto-patche js/config.js ===== */

'use strict';
const https = require('https');
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

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY || !STRIPE_KEY.startsWith('sk_')) {
  console.error('\n❌ STRIPE_SECRET_KEY manquante ou invalide dans .env');
  console.error('   Format attendu : sk_live_xxx ou sk_test_xxx\n');
  process.exit(1);
}

const IS_TEST = STRIPE_KEY.startsWith('sk_test_');
console.log(`\n🔑 Mode : ${IS_TEST ? 'TEST ⚠️' : 'LIVE ✅'}`);
console.log('📦 Création des produits Stripe Créatis...\n');

/* ── Stripe API (fetch natif Node 18+) ──────────────────────── */
async function stripePost(endpoint, params) {
  const body = Object.entries(params)
    .flatMap(([k, v]) => {
      if (typeof v === 'object' && v !== null) {
        return Object.entries(v).map(([sk, sv]) => `${encodeURIComponent(`${k}[${sk}]`)}=${encodeURIComponent(sv)}`);
      }
      return [`${encodeURIComponent(k)}=${encodeURIComponent(v)}`];
    })
    .join('&');

  const auth = Buffer.from(`${STRIPE_KEY}:`).toString('base64');
  const resp = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2023-10-16'
    },
    body
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(`Stripe ${resp.status}: ${data.error?.message || JSON.stringify(data)}`);
  return data;
}

async function stripeGet(endpoint) {
  const auth = Buffer.from(`${STRIPE_KEY}:`).toString('base64');
  const resp = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    headers: { 'Authorization': `Basic ${auth}`, 'Stripe-Version': '2023-10-16' }
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Stripe ${resp.status}: ${data.error?.message}`);
  return data;
}

/* ── Définition des produits ─────────────────────────────────── */
const PRODUCTS = [
  {
    key: 'starter',
    name: 'Créatis Starter',
    description: '5 agents IA, 5 miniatures/mois, générations illimitées',
    metadata: { plan: 'starter', app: 'creatis' },
    prices: [
      { key: 'starter_mensuel', amount: 1900, interval: 'month', nickname: 'Starter Mensuel' },
      { key: 'starter_annuel',  amount: 18240, interval: 'year',  nickname: 'Starter Annuel (-20%)' }
    ]
  },
  {
    key: 'pro',
    name: 'Créatis Pro',
    description: 'Tous les agents, 20 miniatures/mois, générations illimitées',
    metadata: { plan: 'pro', app: 'creatis' },
    prices: [
      { key: 'pro_mensuel', amount: 4900, interval: 'month', nickname: 'Pro Mensuel' },
      { key: 'pro_annuel',  amount: 47040, interval: 'year',  nickname: 'Pro Annuel (-20%)' }
    ]
  },
  {
    key: 'agency',
    name: 'Créatis Agency',
    description: '5 chaînes, 50 miniatures/mois, tout illimité',
    metadata: { plan: 'agency', app: 'creatis' },
    prices: [
      { key: 'agency_mensuel', amount: 14900, interval: 'month', nickname: 'Agency Mensuel' },
      { key: 'agency_annuel',  amount: 143040, interval: 'year',  nickname: 'Agency Annuel (-20%)' }
    ]
  }
];

const CREDIT_PACKS = [
  { key: 'credits_mini_5',  name: 'Créatis Crédits Miniatures — 5',  amount: 200,  qty: 5  },
  { key: 'credits_mini_10', name: 'Créatis Crédits Miniatures — 10', amount: 350,  qty: 10 },
  { key: 'credits_mini_20', name: 'Créatis Crédits Miniatures — 20', amount: 600,  qty: 20 }
];

/* ── Créer coupon EARLY20 ────────────────────────────────────── */
async function creerCoupon() {
  try {
    // Vérifier si le coupon existe déjà
    const existing = await stripeGet('coupons/EARLY20').catch(() => null);
    if (existing?.id) {
      console.log('   ✓ Coupon EARLY20 existe déjà');
      return existing;
    }
  } catch {}

  const coupon = await stripePost('coupons', {
    id: 'EARLY20',
    name: 'Early Adopter -20%',
    percent_off: 20,
    duration: 'repeating',
    duration_in_months: 3,
    max_redemptions: 500,
    'metadata[app]': 'creatis'
  });
  console.log('   ✅ Coupon EARLY20 créé (-20%, 3 mois, 500 max)');
  return coupon;
}

/* ── Créer promotion code ────────────────────────────────────── */
async function creerPromoCode(couponId) {
  try {
    const promo = await stripePost('promotion_codes', {
      coupon: couponId,
      code: 'EARLY20',
      active: true,
      'restrictions[first_time_transaction]': true
    });
    console.log('   ✅ Code promo EARLY20 créé');
    return promo;
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('   ✓ Code promo EARLY20 existe déjà');
    } else {
      console.warn('   ⚠️ Code promo:', e.message);
    }
  }
}

/* ── Créer tous les produits et prix ─────────────────────────── */
async function creerTousLesProduits() {
  const priceIds = {};

  for (const prod of PRODUCTS) {
    console.log(`\n📦 ${prod.name}`);

    // Créer le produit
    const product = await stripePost('products', {
      name: prod.name,
      description: prod.description,
      'metadata[plan]': prod.metadata.plan,
      'metadata[app]': prod.metadata.app
    });
    console.log(`   ✅ Produit créé — ID: ${product.id}`);

    // Créer les prix
    for (const price of prod.prices) {
      const p = await stripePost('prices', {
        product: product.id,
        unit_amount: price.amount,
        currency: 'eur',
        'recurring[interval]': price.interval,
        nickname: price.nickname,
        'metadata[key]': price.key,
        'metadata[plan]': prod.metadata.plan,
        'metadata[app]': 'creatis'
      });
      priceIds[price.key] = p.id;
      console.log(`   ✅ ${price.nickname} — ${(price.amount / 100).toFixed(2)}€/${price.interval} — ID: ${p.id}`);
    }
  }

  // Crédits miniatures (one-time)
  console.log('\n🎨 Packs crédits miniatures');
  for (const pack of CREDIT_PACKS) {
    const product = await stripePost('products', {
      name: pack.name,
      'metadata[type]': 'credit_pack',
      'metadata[qty]': pack.qty,
      'metadata[app]': 'creatis'
    });
    const p = await stripePost('prices', {
      product: product.id,
      unit_amount: pack.amount,
      currency: 'eur',
      'metadata[key]': pack.key,
      'metadata[app]': 'creatis'
    });
    priceIds[pack.key] = p.id;
    console.log(`   ✅ ${pack.qty} miniatures — ${(pack.amount / 100).toFixed(2)}€ one-time — ID: ${p.id}`);
  }

  return priceIds;
}

/* ── Patcher config.js avec les vrais price IDs ──────────────── */
function patcherConfigJs(priceIds) {
  const configPath = path.join(__dirname, '..', 'js', 'config.js');
  let content = fs.readFileSync(configPath, 'utf8');

  // Patcher les stripeId des plans
  const patches = {
    starter_mensuel: { plan: 'starter', field: 'stripeId' },
    starter_annuel:  { plan: 'starter', field: 'stripeIdAnnuel' },
    pro_mensuel:     { plan: 'pro',     field: 'stripeId' },
    pro_annuel:      { plan: 'pro',     field: 'stripeIdAnnuel' },
    agency_mensuel:  { plan: 'agency',  field: 'stripeId' },
    agency_annuel:   { plan: 'agency',  field: 'stripeIdAnnuel' }
  };

  for (const [key, { field }] of Object.entries(patches)) {
    if (!priceIds[key]) continue;
    const placeholder = `price_creatis_${key.replace('_', '_').replace('mensuel', 'mensuel').replace('annuel', 'annuel')}`;
    content = content.replace(`'${placeholder}'`, `'${priceIds[key]}'`);
    // Aussi remplacer les valeurs génériques
    const re = new RegExp(`(${field}:\\s*)'[^']*${key.includes('annuel') ? 'annuel' : 'mensuel'}[^']*'`, 'g');
    content = content.replace(re, `$1'${priceIds[key]}'`);
  }

  // Injecter les price IDs dans une constante séparée si non présente
  if (!content.includes('STRIPE_PRICE_IDS')) {
    const injection = `
  /* ======================================
   * STRIPE — PRICE IDs (générés automatiquement)
   * ====================================== */
  STRIPE_PRICE_IDS: ${JSON.stringify(priceIds, null, 4).replace(/^/gm, '  ')},\n`;
    content = content.replace('  /* ======================================\n   * PLANS TARIFAIRES', injection + '  /* ======================================\n   * PLANS TARIFAIRES');
  } else {
    content = content.replace(/STRIPE_PRICE_IDS:\s*\{[^}]*\}/s,
      `STRIPE_PRICE_IDS: ${JSON.stringify(priceIds, null, 2)}`);
  }

  fs.writeFileSync(configPath, content, 'utf8');
  console.log('\n✅ js/config.js patché avec les price IDs réels');
}

/* ── Mettre à jour .env avec le webhook secret ───────────────── */
function afficherInstructionsWebhook() {
  console.log('\n' + '═'.repeat(60));
  console.log('📡 ÉTAPE SUIVANTE — Webhook Stripe');
  console.log('═'.repeat(60));
  console.log('1. Va sur dashboard.stripe.com → Developers → Webhooks');
  console.log('2. Clique "Add endpoint"');
  console.log('3. URL : https://creatis.app/api/stripe-webhook');
  console.log('4. Événements à sélectionner :');
  console.log('   - checkout.session.completed');
  console.log('   - customer.subscription.deleted');
  console.log('   - customer.subscription.updated');
  console.log('   - invoice.payment_succeeded');
  console.log('   - invoice.payment_failed');
  console.log('5. Copie le "Signing secret" (whsec_xxx)');
  console.log('6. Ajoute dans .env : STRIPE_WEBHOOK_SECRET=whsec_xxx');
  console.log('═'.repeat(60) + '\n');
}

/* ── Main ─────────────────────────────────────────────────────── */
async function main() {
  console.log('═'.repeat(60));
  console.log('  CRÉATIS — Setup Stripe');
  console.log('═'.repeat(60));

  try {
    // 1. Coupon EARLY20
    console.log('\n🎁 Coupon EARLY20');
    const coupon = await creerCoupon();
    await creerPromoCode(coupon.id);

    // 2. Produits & prix
    const priceIds = await creerTousLesProduits();

    // 3. Patcher config.js
    patcherConfigJs(priceIds);

    // 4. Sauvegarder les IDs dans un fichier de référence
    const idsPath = path.join(__dirname, 'stripe-price-ids.json');
    fs.writeFileSync(idsPath, JSON.stringify(priceIds, null, 2), 'utf8');
    console.log(`✅ IDs sauvegardés dans setup/stripe-price-ids.json`);

    // 5. Instructions webhook
    afficherInstructionsWebhook();

    console.log('🎉 Setup Stripe terminé avec succès !\n');

  } catch (err) {
    console.error('\n❌ Erreur:', err.message);
    console.error('\nVérifiez que STRIPE_SECRET_KEY est valide dans .env\n');
    process.exit(1);
  }
}

main();
