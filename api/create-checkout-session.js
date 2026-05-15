/* ===== VERCEL FUNCTION — Stripe Checkout Session ===== */
/* POST /api/create-checkout-session
   Body: { priceId, plan, annuel, userId, successUrl, cancelUrl, allowPromoCodes } */

const stripe = require('stripe')((process.env.STRIPE_SECRET_KEY || '').trim());
const APP_URL = (process.env.APP_URL || 'https://creatis.app').trim();

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', APP_URL);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { priceId, plan, annuel, userId, userEmail, successUrl, cancelUrl, allowPromoCodes } = req.body;

  if (!priceId) {
    return res.status(400).json({ error: 'priceId manquant' });
  }

  // Email fiable : userEmail explicite, sinon userId si c'est un email
  const customerEmail = userEmail || (userId && userId.includes('@') ? userId : null);

  try {
    const sessionParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${APP_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${APP_URL}/cancel.html`,
      allow_promotion_codes: allowPromoCodes !== false,
      billing_address_collection: 'auto',
      metadata: {
        plan: plan || 'pro',
        userId: userId || 'anonymous',
        userEmail: customerEmail || '',
        annuel: annuel ? 'true' : 'false'
      },
      subscription_data: {
        metadata: { plan: plan || 'pro', userId: userId || 'anonymous', userEmail: customerEmail || '' }
      },
      locale: 'fr'
    };

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.setHeader('Access-Control-Allow-Origin', APP_URL);
    return res.status(200).json({ sessionId: session.id, url: session.url });

  } catch (error) {
    console.error('[Stripe] Erreur création session:', error);
    return res.status(500).json({ error: error.message });
  }
};
