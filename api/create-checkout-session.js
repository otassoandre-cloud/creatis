/* ===== VERCEL FUNCTION — Stripe Checkout Session ===== */
/* POST /api/create-checkout-session
   Body: { priceId, plan, annuel, userId, successUrl, cancelUrl, allowPromoCodes } */

const stripe = require('stripe')((process.env.STRIPE_SECRET_KEY || '').trim());
const APP_URL = (process.env.APP_URL || 'https://creatis.app').trim();

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();

/* ── Programme « publie une video, 1 mois offert » : essai Stripe, carte requise ────────────
   Decision explicite (21/08/2026) : le mois offert n'est pas un octroi silencieux cote base de
   donnees, c'est un VRAI essai d'abonnement Stripe — la personne entre sa carte, rien n'est
   preleve pendant UGC_ESSAI_JOURS jours, puis l'abonnement continue tout seul au tarif normal
   sauf resiliation. C'est le paiement.html reamenage ce matin qui sert de porte d'entree : un
   lien avec ?essai=<jeton> y ajoute simplement `trial_period_days` a la session Stripe creee
   ici. Le prix est FORCE au Pro mensuel cote serveur, jamais confie au client — sinon n'importe
   quelle page pourrait demander l'annuel en essai gratuit avec le meme jeton. */
const UGC_ESSAI_JOURS = 30;
const UGC_PRIX_PRO_MENSUEL = (process.env.STRIPE_PRICE_PRO || 'price_1Tx8U8AptK6HZtp5DrLkfs5m').trim();

async function ugcSoumissionParJeton(jeton) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !jeton) return null;
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/ugc_soumissions?essai_token=eq.${encodeURIComponent(jeton)}&statut=eq.approuve&essai_utilise=eq.false&select=*`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (!r.ok) return null;
  const lignes = await r.json();
  return lignes?.[0] || null;
}

async function ugcMarquerJetonUtilise(id) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1/ugc_soumissions?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ essai_utilise: true }),
  }).catch(() => {}); // best-effort : au pire le lien reste utilisable une 2e fois, jamais bloquant
}

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

  const { priceId, plan, annuel, userId, userEmail, successUrl, cancelUrl, allowPromoCodes, essaiToken } = req.body;

  // Résolution de l'essai UGC AVANT toute autre validation : elle fige priceId, userId et
  // customerEmail depuis la soumission approuvée, en ignorant ce que le client a pu envoyer —
  // sinon quelqu'un pourrait forger le corps de la requête pour obtenir l'annuel, ou créditer
  // un compte autre que celui qui a réellement soumis la vidéo.
  let finalPriceId = priceId;
  let finalUserId = userId;
  let trialDays = null;
  let soumissionUGC = null;

  if (essaiToken) {
    soumissionUGC = await ugcSoumissionParJeton(essaiToken);
    if (!soumissionUGC) {
      return res.status(400).json({ error: "Ce lien d'essai n'est plus valide — il a peut-être déjà été utilisé." });
    }
    finalPriceId = UGC_PRIX_PRO_MENSUEL;
    finalUserId = soumissionUGC.user_id || userId;
    trialDays = UGC_ESSAI_JOURS;
  }

  if (!finalPriceId) {
    return res.status(400).json({ error: 'priceId manquant' });
  }

  // Email fiable : celui de la soumission approuvée en priorité (garantit que le mois offert
  // atterrit sur le bon compte même si ce navigateur n'est pas connecté), sinon le chemin normal.
  const customerEmail = soumissionUGC?.email || userEmail || (userId && userId.includes('@') ? userId : null);

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
      line_items: [{ price: finalPriceId, quantity: 1 }],
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
        plan: 'pro',
        userId: finalUserId || 'anonymous',
        userEmail: customerEmail || '',
        annuel: 'false',
        ...(essaiToken ? { source: 'ugc_essai' } : {}),
      },
      subscription_data: {
        metadata: { plan: 'pro', userId: finalUserId || 'anonymous', userEmail: customerEmail || '' },
        // Coeur du dispositif : carte enregistrée maintenant, aucun prélèvement avant la fin de
        // l'essai. Stripe gère seul le passage à un abonnement payant — invoice.payment_succeeded
        // et invoice.payment_failed (déjà gérés dans api/stripe-webhook.js) s'en chargent sans
        // qu'il y ait quoi que ce soit à ajouter ici.
        ...(trialDays ? { trial_period_days: trialDays } : {}),
      },
      locale: 'fr'
    };
    // Hors essai UGC, le plan/l'annualité viennent toujours du client comme avant — ce bloc ne
    // change rien au tunnel de paiement normal (paiement.html) construit ce matin.
    if (!essaiToken) {
      sessionParams.metadata.plan = plan || 'pro';
      sessionParams.metadata.annuel = annuel ? 'true' : 'false';
      sessionParams.subscription_data.metadata.plan = plan || 'pro';
    }

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Marqué APRÈS la création réussie de la session, jamais avant : un jeton qui échoue à cette
    // étape (Stripe indisponible, priceId invalide) doit rester utilisable pour un nouvel essai.
    if (soumissionUGC) await ugcMarquerJetonUtilise(soumissionUGC.id);

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
