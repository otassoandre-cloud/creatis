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

  // Appliquer directement -50% sur le premier mois Pro (sans code promo requis)
  let launchCouponId = null;
  if ((plan === 'pro' || !plan) && !annuel) {
    try {
      const coupon = await stripe.coupons.create({
        percent_off: 50,
        duration: 'once',
        name: 'Offre lancement -50% 1er mois'
      });
      launchCouponId = coupon.id;
    } catch (e) { /* silencieux si création échoue */ }
  }

  const embedded = req.body.embedded === true;

  try {
    const sessionParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      ...(embedded
        ? { ui_mode: 'embedded', return_url: `${APP_URL}/success.html?session_id={CHECKOUT_SESSION_ID}` }
        : {
            payment_method_types: ['card'],
            success_url: successUrl || `${APP_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${APP_URL}/cancel.html`,
          }
      ),
      ...(launchCouponId
        ? { discounts: [{ coupon: launchCouponId }] }
        : (!embedded ? { allow_promotion_codes: allowPromoCodes !== false } : {})),
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
    if (embedded) {
      return res.status(200).json({ clientSecret: session.client_secret });
    }
    return res.status(200).json({ sessionId: session.id, url: session.url });

  } catch (error) {
    console.error('[Stripe] Erreur création session:', error);
    return res.status(500).json({ error: error.message });
  }
};
