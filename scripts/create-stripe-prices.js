/* Script one-shot — crée les prix live corrects dans Stripe
   Usage: node scripts/create-stripe-prices.js sk_live_... */

const sk = process.argv[2];
if (!sk || !sk.startsWith('sk_live_')) {
  console.error('Usage: node scripts/create-stripe-prices.js sk_live_...');
  process.exit(1);
}

const stripe = require('stripe')(sk);

const PRODUITS = [
  { productId: 'prod_UUneHHyKQKC5qc', nom: 'Pro Mensuel',       montant: 1900, interval: 'month' },
  { productId: 'prod_UUneHHyKQKC5qc', nom: 'Pro Annuel',        montant: 18000, interval: 'year'  },
  { productId: 'prod_UUnebpZ98BqUFR', nom: 'Studio Mensuel',    montant: 4900, interval: 'month' },
  { productId: 'prod_UUnebpZ98BqUFR', nom: 'Studio Annuel',     montant: 46800, interval: 'year'  },
];

async function main() {
  for (const p of PRODUITS) {
    const price = await stripe.prices.create({
      product: p.productId,
      unit_amount: p.montant,
      currency: 'eur',
      recurring: { interval: p.interval },
      nickname: p.nom,
    });
    console.log(`✅ ${p.nom}: ${price.id}`);
  }
}

main().catch(console.error);
