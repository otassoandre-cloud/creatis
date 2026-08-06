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

  // Le -50% automatique sur le 1er mois du Pro a été RETIRÉ avec la grille 9,95 / 14 / 149.
  // Il ramenait le Pro à 7 € le premier mois, donc SOUS le Starter à 9,95 € : l'échelle de prix
  // s'inversait et le Starter n'avait plus aucune raison d'exister. L'offre d'appel, c'est
  // désormais le Starter lui-même. Conséquence : le champ code promo natif Stripe redevient
  // toujours disponible (Stripe interdit discounts + allow_promotion_codes sur la même session).
  const launchCouponId = null;

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
      // Stripe interdit de combiner discounts + allow_promotion_codes sur une même session —
      // quand la réduction de lancement s'applique automatiquement, le champ code promo natif
      // Stripe reste masqué (sinon erreur Stripe). Sinon (annuel, studio, ou coupon indisponible),
      // le champ natif Stripe s'affiche normalement — y compris en embedded.
      ...(launchCouponId
        ? { discounts: [{ coupon: launchCouponId }] }
        : { allow_promotion_codes: allowPromoCodes !== false }),
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
