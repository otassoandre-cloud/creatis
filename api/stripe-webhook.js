/* ===== VERCEL FUNCTION — Stripe Webhook ===== */
/* POST /api/stripe-webhook
   Vérifie la signature Stripe → met à jour Supabase → répond 200 */

const stripe = require('stripe')((process.env.STRIPE_SECRET_KEY || '').trim());

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
const APP_URL = process.env.APP_URL || 'https://creatis.app';

/* Appel Supabase REST API */
async function supabasePatch(table, match, data) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('[Webhook] Supabase non configuré — mise à jour ignorée');
    return null;
  }
  const query = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`[Webhook] Supabase PATCH ${table} erreur:`, res.status, err);
  }
  return res.ok;
}

async function supabaseUpsert(table, data) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=stripe_subscription_id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) console.error(`[Webhook] Supabase UPSERT ${table} erreur:`, res.status);
  return res.ok;
}

/* Insertion simple (log) — fail-open : si la table n'existe pas encore, on log et on continue */
async function supabaseInsert(table, data) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) console.error(`[Webhook] Supabase INSERT ${table} erreur:`, res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error(`[Webhook] Supabase INSERT ${table} exception:`, e.message);
    return null;
  }
}

async function supabaseGet(table, match, select = 'id,plan,email,referred_by') {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const query = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}&select=${select}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0] || null;
}

/* Map Stripe price ID → plan interne */
const PRICE_TO_PLAN = {
  'price_1Tx8TXAptK6HZtp5vB5clklV': 'starter', // starter mensuel 9,95€ (live, actuel)
  'price_1Tx8U8AptK6HZtp5DrLkfs5m': 'pro',     // pro mensuel 14€ (live, actuel)
  'price_1TxaweAptK6HZtp5p0LjSDk5': 'pro',     // pro annuel 139€ (live, actuel)
  'price_1Tonw3AptK6HZtp5f4UFBIa0': 'pro',     // pro annuel 149€ (legacy — abonnés existants)
  'price_1TonvgAptK6HZtp5sG7ZG5TE': 'pro',     // pro mensuel 19,90€ (legacy — abonnés existants)
  'price_1TWISZAptK6HZtp5uBP0RHe8': 'pro',     // pro mensuel 19€ (legacy — abonnés existants)
  'price_1TWIU8AptK6HZtp5SbYvQ12d': 'pro',     // pro annuel 180€ (legacy)
  'price_1TWIV6AptK6HZtp5qlNhu47w': 'studio',  // studio mensuel 49€ (legacy)
  'price_1TWIVeAptK6HZtp5zIef773D': 'studio',  // studio annuel 468€ (legacy)
};

function getPlanFromPriceId(priceId) {
  if (!priceId) return null;
  return PRICE_TO_PLAN[priceId] || null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  let event;

  try {
    const rawBody = await getRawBody(req);
    if (rawBody.length > 0) {
      event = webhookSecret
        ? stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
        : JSON.parse(rawBody.toString());
    } else if (req.body) {
      // Vercel a déjà parsé le body — signature non vérifiable, on utilise req.body directement
      console.warn('[Webhook] Body pré-parsé par Vercel — signature non vérifiée');
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } else {
      return res.status(400).json({ error: 'Body vide' });
    }
  } catch (err) {
    console.error('[Webhook] Erreur parsing:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`[Webhook] Événement reçu: ${event.type}`);

  try {
    switch (event.type) {

      /* ===== PAIEMENT RÉUSSI ===== */
      case 'checkout.session.completed': {
        const session = event.data.object;
        const plan = session.metadata?.plan || getPlanFromPriceId(session.line_items?.[0]?.price?.id);
        const userId = session.metadata?.userId;
        const email = session.customer_email
          || session.customer_details?.email
          || session.metadata?.userEmail
          || null;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        let userRow = null; // portée étendue — utilisé par la notif affilié plus bas

        console.log(`[Webhook] ✅ Paiement réussi — plan: ${plan}, user: ${userId || email}, subscription: ${subscriptionId}`);

        if (!plan) {
          console.warn('[Webhook] Plan non identifiable depuis la session');
          break;
        }

        const matchEmail = email || (userId && userId.includes('@') ? userId : null);
        const matchId = userId && !userId.includes('@') && userId !== 'anonymous' ? userId : null;

        if (!matchEmail && !matchId) {
          console.error('[Webhook] ⚠️ Impossible d\'identifier l\'utilisateur — email et userId manquants. session id:', session.id);
          break;
        }

        if (matchEmail || matchId) {
          const patchData = { plan, stripe_customer_id: customerId, stripe_subscription_id: subscriptionId, updated_at: new Date().toISOString() };
          // Mise à jour par userId Supabase (priorité) ou par email (fallback)
          if (matchId) {
            await supabasePatch('users', { id: matchId }, patchData);
          } else {
            await supabasePatch('users', { email: matchEmail }, patchData);
          }

          // Résoudre l'user row pour l'affiliation
          userRow = matchId
            ? await supabaseGet('users', { id: matchId })
            : await supabaseGet('users', { email: matchEmail });

          /* GARDE-FOU — le paiement encaissé qui n'upgrade personne.
             `supabasePatch` envoie `Prefer: return=minimal` : PostgREST répond 204 même quand
             AUCUNE ligne ne correspond. Un PATCH par email qui ne matche rien est donc
             indiscernable d'une réussite. Le cas arrive pour de vrai : quand `paiement.html` ne
             trouve pas `creatis_user` en localStorage, la session part avec `userId: 'anonymous'`
             et l'identification retombe sur l'email saisi dans Stripe — un email qui peut ne
             correspondre à aucun compte, ou différer d'un caractère de celui du compte.
             Le garde-fou de la ligne 157 ne couvre pas ce cas : il ne se déclenche que si email
             ET userId manquent tous les deux. Résultat sans ce bloc : le client est débité
             9,95 €/mois, ne reçoit aucun plan, et rien ne le signale. */
          if (!userRow) {
            console.error(`[Webhook] 🚨 Paiement encaissé sans compte Créatis correspondant — ${matchEmail || matchId} — session ${session.id}`);
            await notifierPaiementOrphelin({
              email: matchEmail, identifiant: matchId, plan, customerId, subscriptionId, sessionId: session.id
            }).catch(e => console.warn('[Webhook] Alerte paiement orphelin non envoyée:', e.message));
          }

          // Attribution par code promo — fallback si pas de ?ref= au signup.
          // Ne s'exécute QUE si aucune attribution n'existe déjà (priorité au lien).
          if (userRow && !userRow.referred_by) {
            const promoAffiliateId = await resolvePromoCodeAffiliate(session.id).catch(e => {
              console.warn('[Webhook] resolvePromoCodeAffiliate erreur:', e.message);
              return null;
            });
            if (promoAffiliateId && promoAffiliateId !== userRow.id) {
              // Même format que l'attribution par lien ?ref= : préfixe 12 car. de l'uuid,
              // pas l'uuid complet — sinon les lookups exacts (dashboard affilié, liste admin) ne matchent plus.
              const refCode = String(promoAffiliateId).slice(0, 12);
              await supabasePatch('users', { id: userRow.id }, {
                referred_by: refCode,
                updated_at: new Date().toISOString()
              });
              userRow.referred_by = refCode;
              console.log(`[Webhook] 🎟️ Attribution par code promo → affilié ${refCode}`);
            }
          }

          /* Jeton d'essai UGC consomme ICI, et nulle part ailleurs (29/08/2026).
             Avant, create-checkout-session.js le marquait des la creation de la session, donc
             au simple chargement de paiement.html : ouvrir son lien une fois suffisait a le
             bruler, meme sans carte saisie. On le marque desormais quand l'essai demarre pour
             de vrai. `ugc_soumission_id` vient des metadonnees posees a la creation. */
          const idSoumissionUGC = session.metadata?.ugc_soumission_id;
          if (idSoumissionUGC) {
            await supabasePatch('ugc_soumissions', { id: idSoumissionUGC }, { essai_utilise: true })
              .catch((e) => console.warn('[Webhook] jeton UGC non marqué:', e.message));
            console.log(`[Webhook] 🎬 Jeton UGC consommé — soumission ${idSoumissionUGC}`);
          }

          // Enregistrer l'abonnement
          // trial_ends_at : calcule et pose une fois pour toutes par create-checkout-session.js
          // (essai UGC 30j OU essai annuel 7j), relu tel quel depuis les metadata — jamais
          // recalcule ici, sinon un webhook retraite des heures plus tard poserait une date
          // fausse. null pour tout abonnement sans essai (le cas normal).
          await supabaseUpsert('abonnements', {
            user_id: userRow?.id || null,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            plan,
            status: 'active',
            montant_centimes: session.amount_total || 0,
            annuel: session.metadata?.annuel === 'true',
            trial_ends_at: session.metadata?.trial_ends_at || null,
            relance_essai_envoyee: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }

        // Notification interne Studio → contact@creatis.app
        if (plan === 'studio' && process.env.BREVO_API_KEY) {
          await notifierAdmin(email || userId || 'inconnu', plan).catch(e =>
            console.warn('[Webhook] Erreur notif admin:', e.message)
          );
        }

        // Notifier Brevo si clé disponible
        if (process.env.BREVO_API_KEY && email) {
          await notifierBrevo(email, plan, customerId).catch(e =>
            console.warn('[Webhook] Erreur Brevo:', e.message)
          );
        }

        // Notifier l'affilié si l'utilisateur a été parrainé
        if (process.env.BREVO_API_KEY && userRow?.referred_by) {
          await notifierAffilie(userRow.referred_by, email, plan).catch(e =>
            console.warn('[Webhook] Erreur notif affilié:', e.message)
          );
          // Vérifier si ce nouvel abonné fait franchir un palier de récompense à l'affilié
          await verifierPalierAffilie(userRow.referred_by).catch(e =>
            console.warn('[Webhook] Erreur vérif palier affilié:', e.message)
          );
        }

        break;
      }

      /* ===== RENOUVELLEMENT MENSUEL ===== */
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.billing_reason === 'subscription_create') break; // Déjà géré par checkout.session.completed

        const { subscriptionId } = await extraireInfosFacture(invoice);
        const customerId = invoice.customer;
        const email = invoice.customer_email;

        console.log(`[Webhook] 🔄 Renouvellement réussi — customer: ${customerId}`);

        if (email) {
          await supabasePatch('users', { email }, {
            plan_expires_at: null, // Toujours actif
            updated_at: new Date().toISOString()
          });
        }
        // Le PATCH est indexé sur l'abonnement, pas sur l'email : sans id, il matcherait
        // `stripe_subscription_id=eq.null` et repasserait n'importe quelle ligne orpheline en actif.
        if (subscriptionId) {
          await supabasePatch('abonnements', { stripe_subscription_id: subscriptionId }, {
            status: 'active',
            updated_at: new Date().toISOString()
          });
        }
        break;
      }

      /* ===== ABONNEMENT ANNULÉ ===== */
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const customerId = sub.customer;
        const subscriptionId = sub.id;

        console.log(`[Webhook] ❌ Abonnement annulé — customer: ${customerId}`);

        // Trouver l'utilisateur par stripe_customer_id
        const user = await supabaseGet('users', { stripe_customer_id: customerId });
        if (user) {
          await supabasePatch('users', { stripe_customer_id: customerId }, {
            plan: 'gratuit',
            stripe_subscription_id: null,
            updated_at: new Date().toISOString()
          });
        }

        await supabasePatch('abonnements', { stripe_subscription_id: subscriptionId }, {
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        /* Alerte de résiliation. Sans elle, un départ passe totalement inaperçu : le compte est
           rétrogradé en silence et on ne l'apprend qu'en consultant Stripe. Le motif a été déposé
           dans les métadonnées du client au moment où l'utilisateur a cliqué « Continuer » dans
           l'écran de rétention (api/user-sync.js → portail_abonnement). */
        let motif = '', commentaire = '';
        try {
          const cli = await stripe.customers.retrieve(customerId);
          motif = cli?.metadata?.motif_resiliation || '';
          commentaire = cli?.metadata?.commentaire_resiliation || '';
        } catch (e) {
          console.warn('[Webhook] métadonnées client illisibles:', e.message);
        }
        await notifierResiliation({
          email: user?.email, customerId, subscriptionId,
          plan: user?.plan, motif, commentaire
        });

        console.log(`[Webhook] Utilisateur ${user?.email || customerId} rétrogradé → gratuit (motif: ${motif || 'non renseigné'})`);
        break;
      }

      /* ===== PAIEMENT ÉCHOUÉ ===== */
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const billingReason = invoice.billing_reason; // 'subscription_create' = 1ère souscription, 'subscription_cycle' = renouvellement
        const nouvelleSouscription = billingReason === 'subscription_create';

        const { subscriptionId, paymentIntentId, priceId } = await extraireInfosFacture(invoice);
        const email = await resoudreEmail(invoice.customer_email, customerId);
        const { raison, code } = await lireErreurPaiement(paymentIntentId);
        const montant = (invoice.amount_due || 0) / 100;
        const devise = (invoice.currency || 'eur').toUpperCase();
        const plan = getPlanFromPriceId(priceId);

        console.log(`[Webhook] ⚠️ Paiement échoué — ${email || customerId} — ${raison} (${code})`);

        // Trace Supabase (fail-open)
        await supabaseInsert('paiements_echoues', {
          email,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_invoice_id: invoice.id,
          montant,
          devise,
          statut: nouvelleSouscription ? 'souscription_echouee' : 'renouvellement_echoue',
          raison,
          code_erreur: code,
          billing_reason: billingReason,
          plan
        });

        // Un renouvellement échoué → l'abonnement existant passe en past_due
        if (!nouvelleSouscription && subscriptionId) {
          await supabasePatch('abonnements', { stripe_subscription_id: subscriptionId }, {
            status: 'past_due',
            updated_at: new Date().toISOString()
          });
        }

        // Alerte interne — on ne veut plus découvrir ça dans le dashboard Stripe
        await notifierEchecPaiement({
          email, customerId, subscriptionId, montant, devise, raison, code, plan,
          contexte: nouvelleSouscription ? 'Nouvelle souscription' : 'Renouvellement'
        });

        // Notifier l'utilisateur par email (Brevo)
        if (process.env.BREVO_API_KEY && email) {
          const corps = nouvelleSouscription
            ? `<p>Bonjour,</p><p>Votre paiement Créatis n'a pas abouti — la validation par votre banque (3D Secure) a échoué.</p><p>Deux solutions : validez la notification dans votre application bancaire pendant le paiement, ou essayez une autre carte.</p><p><a href="${APP_URL}/paiement.html">Reprendre le paiement</a></p>`
            : `<p>Bonjour,</p><p>Le renouvellement de votre abonnement Créatis a échoué. Mettez à jour votre moyen de paiement sur <a href="${APP_URL}/app.html">votre espace</a>.</p>`;
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
            body: JSON.stringify({
              to: [{ email }],
              subject: nouvelleSouscription ? 'Votre paiement Créatis n\'a pas abouti' : '⚠️ Problème de paiement Créatis',
              htmlContent: corps,
              sender: { email: 'contact@creatis.app', name: 'Créatis' }
            })
          }).catch(() => {});
        }
        break;
      }

      /* ===== ABONNEMENT MIS À JOUR (changement de plan) ===== */
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const customerId = sub.customer;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = getPlanFromPriceId(priceId);
        const status = sub.status;

        /* RÉSILIATION PROGRAMMÉE — le trou noir du suivi, comblé le 31/08/2026.
           Quand un client résilie, Stripe ne supprime pas l'abonnement : il pose
           `cancel_at_period_end: true` et laisse courir jusqu'à la fin de période.
           `customer.subscription.deleted` ne se déclenchera donc qu'à cette
           date-là — parfois un mois plus tard. Or Stripe sort le client du MRR
           IMMÉDIATEMENT. Résultat : le chiffre baisse sans qu'aucune trace
           n'apparaisse nulle part, et on découvre le départ une fois qu'il est
           consommé, sans fenêtre pour le rattraper.
           On enregistre donc l'état à chaque mise à jour, et on alerte au moment
           du clic, pas à l'expiration. */
        /* Tout ce bloc est du SUIVI, pas de la facturation : il est isolé pour
           qu'une panne Supabase ou Brevo ne fasse jamais échouer le webhook.
           Sans ça, Stripe recevrait un 500 et rejouerait l'événement en boucle
           alors que le paiement lui-même s'est bien passé. */
        try {
          const finPeriode = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null;

          const avant = await supabaseGet('abonnements', { stripe_subscription_id: sub.id });
          await supabasePatch('abonnements', { stripe_subscription_id: sub.id }, {
            cancel_at_period_end: !!sub.cancel_at_period_end,
            current_period_end: finPeriode,
            updated_at: new Date().toISOString()
          });

          // On n'alerte que sur la BASCULE, sinon chaque webhook renverrait un mail.
          if (sub.cancel_at_period_end && avant && !avant.cancel_at_period_end) {
            const client = await supabaseGet('users', { stripe_customer_id: customerId });
            let motif = '', commentaire = '';
            try {
              const cli = await stripe.customers.retrieve(customerId);
              motif = cli?.metadata?.motif_resiliation || '';
              commentaire = cli?.metadata?.commentaire_resiliation || '';
            } catch (e) {
              console.warn('[Webhook] métadonnées client illisibles:', e.message);
            }
            console.log(`[Webhook] ⏳ Résiliation programmée — ${client?.email || customerId} jusqu'au ${finPeriode}`);
            await notifierResiliation({
              email: client?.email, customerId, subscriptionId: sub.id,
              plan: client?.plan, motif, commentaire,
              programmeePour: finPeriode
            });
          }
        } catch (e) {
          console.error('[Webhook] suivi résiliation programmée non enregistré:', e.message);
        }

        if (plan && status === 'active') {
          console.log(`[Webhook] 🔄 Abonnement mis à jour — plan: ${plan}`);
          await supabasePatch('users', { stripe_customer_id: customerId }, {
            plan,
            updated_at: new Date().toISOString()
          });
          break;
        }

        /* Souscription jamais confirmée → Stripe l'expire au bout de ~23h.
           C'est une vente perdue : on la trace et on alerte. */
        if (status === 'incomplete_expired') {
          const email = await resoudreEmail(null, customerId);
          console.log(`[Webhook] ❌ Souscription expirée sans paiement — ${email || customerId}`);

          await supabaseInsert('paiements_echoues', {
            email,
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            montant: (sub.items?.data?.[0]?.price?.unit_amount || 0) / 100,
            devise: (sub.currency || 'eur').toUpperCase(),
            statut: 'incomplete_expired',
            raison: 'Souscription jamais confirmée — expirée par Stripe',
            code_erreur: 'incomplete_expired',
            plan
          });

          await notifierEchecPaiement({
            email, customerId, subscriptionId: sub.id,
            montant: (sub.items?.data?.[0]?.price?.unit_amount || 0) / 100,
            devise: (sub.currency || 'eur').toUpperCase(),
            raison: 'Souscription jamais confirmée — expirée par Stripe (délai 23h dépassé)',
            code: 'incomplete_expired',
            plan,
            contexte: 'Vente perdue'
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error('[Webhook] Erreur traitement événement:', err.message);
    // On répond 200 quand même pour éviter les re-tentatives Stripe
  }

  return res.status(200).json({ received: true });
};

/* Récupère l'email client, avec repli sur l'objet Customer Stripe */
async function resoudreEmail(emailConnu, customerId) {
  if (emailConnu) return emailConnu;
  if (!customerId) return null;
  try {
    const c = await stripe.customers.retrieve(customerId);
    return c?.deleted ? null : (c?.email || null);
  } catch (e) {
    console.warn('[Webhook] Impossible de récupérer le customer:', e.message);
    return null;
  }
}

/* Stripe a retiré `payment_intent`, `subscription` et `lines[].price` de l'objet Invoice à partir
   de l'API 2025-06-30.basil. Le compte reçoit désormais les webhooks dans cette version-là, alors
   que ce fichier lisait encore l'ancien format : résultat, TOUTES les lignes `paiements_echoues`
   étaient enregistrées avec subscription_id null, plan null et code_erreur « unknown » — on ne
   savait plus pourquoi un paiement échouait, et le passage en `past_due` ne matchait plus rien.

   On lit donc les deux formats. Si le payload ne suffit pas, on relit la facture via le SDK : il
   est épinglé sur l'API 2023-10-16, qui renvoie encore les champs à plat. */
async function extraireInfosFacture(invoice) {
  const depuisPayload = {
    subscriptionId: invoice.subscription
      || invoice.parent?.subscription_details?.subscription
      || null,
    paymentIntentId: invoice.payment_intent
      || invoice.payments?.data?.[0]?.payment?.payment_intent
      || null,
    priceId: invoice.lines?.data?.[0]?.price?.id
      || invoice.lines?.data?.[0]?.pricing?.price_details?.price
      || null
  };

  const complet = depuisPayload.subscriptionId && depuisPayload.paymentIntentId && depuisPayload.priceId;
  if (complet || !invoice.id) return depuisPayload;

  try {
    const f = await stripe.invoices.retrieve(invoice.id);
    return {
      subscriptionId: depuisPayload.subscriptionId || f.subscription || null,
      paymentIntentId: depuisPayload.paymentIntentId || f.payment_intent || null,
      priceId: depuisPayload.priceId || f.lines?.data?.[0]?.price?.id || null
    };
  } catch (e) {
    console.warn('[Webhook] Relecture facture impossible:', e.message);
    return depuisPayload;
  }
}

/* Traduit l'erreur Stripe du PaymentIntent en message lisible */
const CODES_ERREUR_FR = {
  payment_intent_authentication_failure: 'Authentification 3D Secure échouée (le client n\'a pas validé auprès de sa banque)',
  card_declined: 'Carte refusée par la banque',
  insufficient_funds: 'Provision insuffisante',
  expired_card: 'Carte expirée',
  incorrect_cvc: 'Cryptogramme (CVC) incorrect',
  processing_error: 'Erreur de traitement de la banque',
  authentication_required: 'Authentification 3D Secure requise et non complétée'
};

async function lireErreurPaiement(paymentIntent) {
  if (!paymentIntent) return { raison: 'Aucun PaymentIntent associé', code: 'unknown' };
  try {
    const pi = typeof paymentIntent === 'string'
      ? await stripe.paymentIntents.retrieve(paymentIntent)
      : paymentIntent;
    const err = pi?.last_payment_error;
    if (!err) return { raison: 'Paiement non confirmé (aucune erreur remontée)', code: pi?.status || 'unknown' };
    const code = err.decline_code || err.code || 'unknown';
    return { raison: CODES_ERREUR_FR[code] || err.message || 'Erreur inconnue', code };
  } catch (e) {
    console.warn('[Webhook] Lecture PaymentIntent impossible:', e.message);
    return { raison: 'Erreur inconnue (PaymentIntent illisible)', code: 'unknown' };
  }
}

/* Brevo renvoie 201 quand il accepte, un 4xx quand il refuse — mais `fetch` ne
   rejette PAS sur un 4xx. Les trois alertes internes ci-dessous se contentaient
   d'un `.catch()`, qui n'attrape que les pannes réseau : un refus de Brevo
   passait donc en silence, sans log. Conséquence mesurée le 02/09/2026 : zéro
   alerte de résiliation reçue en 90 jours pour 5 résiliations réelles, et zéro
   alerte d'échec de paiement, sans la moindre trace. */
const verifierBrevo = (quoi) => async (r) => {
  if (r && !r.ok) {
    const corps = await r.text().catch(() => '');
    console.error(`[Webhook] Brevo a REFUSÉ l'alerte ${quoi} — HTTP ${r.status}: ${corps.slice(0, 300)}`);
  }
  return r;
};

/* Alerte interne — échec de paiement / vente perdue */
async function notifierEchecPaiement({ email, customerId, subscriptionId, montant, devise, raison, code, plan, contexte }) {
  if (!process.env.BREVO_API_KEY) {
    console.warn('[Webhook] BREVO_API_KEY absente — alerte échec non envoyée');
    return;
  }
  const date = new Date().toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const lien = `https://dashboard.stripe.com/customers/${customerId}`;
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
    body: JSON.stringify({
      sender: { email: 'contact@creatis.app', name: 'Créatis' },
      to: [{ email: 'contact@creatis.app' }],
      subject: `💳 Paiement échoué — ${email || customerId} (${montant} ${devise})`,
      htmlContent: `<div style="font-family:Inter,sans-serif;padding:24px;background:#0a0f0a;color:#e5e7eb;border-radius:8px;max-width:520px">
        <h2 style="color:#f59e0b;margin:0 0 12px">Paiement échoué — ${contexte}</h2>
        <p style="margin:4px 0"><strong>Client :</strong> ${email || '(email inconnu)'}</p>
        <p style="margin:4px 0"><strong>Montant :</strong> ${montant} ${devise}${plan ? ` — plan ${plan}` : ''}</p>
        <p style="margin:4px 0"><strong>Raison :</strong> ${raison}</p>
        <p style="margin:4px 0"><strong>Code Stripe :</strong> <code>${code}</code></p>
        <p style="margin:4px 0"><strong>Abonnement :</strong> ${subscriptionId || '—'}</p>
        <p style="margin:4px 0"><strong>Date :</strong> ${date}</p>
        <p style="margin:20px 0 4px"><a href="${lien}" style="color:#10b981">Voir le client dans Stripe →</a></p>
        <p style="margin-top:16px;color:#9ca3af;font-size:13px">Client chaud : il a tenté de payer. Relance-le rapidement avec un nouveau lien de paiement.</p>
      </div>`
    })
  })
    .then(verifierBrevo('échec'))
    .catch((e) => console.error('[Webhook] Alerte échec non envoyée:', e.message));
}

/* Alerte interne — paiement réussi mais impossible à rattacher à un compte Créatis.
   Le pire des cas silencieux : l'argent est encaissé, l'abonnement Stripe est actif, et
   l'utilisateur n'a aucun accès. À traiter à la main dans l'heure (créer/corriger le compte),
   sans quoi c'est un remboursement, un litige, et un avis public. */
async function notifierPaiementOrphelin({ email, identifiant, plan, customerId, subscriptionId, sessionId }) {
  if (!process.env.BREVO_API_KEY) {
    console.warn('[Webhook] BREVO_API_KEY absente — alerte paiement orphelin non envoyée');
    return;
  }
  const date = new Date().toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const lien = `https://dashboard.stripe.com/customers/${customerId}`;
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
    body: JSON.stringify({
      sender: { email: 'contact@creatis.app', name: 'Créatis' },
      to: [{ email: 'contact@creatis.app' }],
      subject: `🚨 URGENT — paiement encaissé sans compte (${email || identifiant || 'inconnu'})`,
      htmlContent: `<div style="font-family:Inter,sans-serif;padding:24px;background:#0a0f0a;color:#e5e7eb;border-radius:8px;max-width:520px">
        <h2 style="color:#ef4444;margin:0 0 12px">Paiement encaissé — aucun compte correspondant</h2>
        <p style="margin:4px 0"><strong>Email Stripe :</strong> ${email || '(aucun)'}</p>
        <p style="margin:4px 0"><strong>Plan payé :</strong> ${plan || '—'}</p>
        <p style="margin:4px 0"><strong>Abonnement :</strong> ${subscriptionId || '—'}</p>
        <p style="margin:4px 0"><strong>Session :</strong> ${sessionId || '—'}</p>
        <p style="margin:4px 0"><strong>Date :</strong> ${date}</p>
        <p style="margin:20px 0 4px"><a href="${lien}" style="color:#10b981">Voir le client dans Stripe →</a></p>
        <p style="margin-top:16px;color:#fca5a5;font-size:13px">Ce client paie et n'a AUCUN accès. Crée ou corrige son compte Supabase avec cet email, puis confirme-lui par mail.</p>
      </div>`
    })
  })
    .then(verifierBrevo('orpheline'))
    .catch((e) => console.error('[Webhook] Alerte orpheline non envoyée:', e.message));
}

/* Alerte interne — résiliation confirmée.
   Distincte de l'intention captée dans l'écran de rétention : on n'envoie ce mail que lorsque
   Stripe confirme la fin réelle de l'abonnement. Le motif, lui, vient de l'écran de rétention et
   peut être vide si l'utilisateur a résilié directement depuis le portail Stripe. */
const MOTIFS_LISIBLES = {
  trop_cher:    'Trop cher pour son usage',
  qualite:      'Qualité des clips insuffisante',
  pas_le_temps: "N'utilise pas assez l'outil",
  bug:          'Trop de problèmes techniques',
  concurrent:   'Passe sur un autre outil',
  autre:        'Autre raison'
};

async function notifierResiliation({ email, customerId, subscriptionId, plan, motif, commentaire, programmeePour }) {
  if (!process.env.BREVO_API_KEY) {
    console.warn('[Webhook] BREVO_API_KEY absente — alerte résiliation non envoyée');
    return;
  }
  const date = new Date().toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const lien = `https://dashboard.stripe.com/customers/${customerId}`;
  const motifTexte = MOTIFS_LISIBLES[motif] || motif || 'Non renseigné (résiliation directe depuis Stripe)';
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
    body: JSON.stringify({
      sender: { email: 'contact@creatis.app', name: 'Créatis' },
      to: [{ email: 'contact@creatis.app' }],
      subject: `${programmeePour ? '🟠 Résiliation programmée' : '🔴 Résiliation'} — ${email || customerId}${motif ? ` (${motifTexte})` : ''}`,
      htmlContent: `<div style="font-family:Inter,sans-serif;padding:24px;background:#0a0f0a;color:#e5e7eb;border-radius:8px;max-width:520px">
        <h2 style="color:${programmeePour ? '#f59e0b' : '#ef4444'};margin:0 0 12px">${programmeePour ? 'Résiliation programmée' : 'Abonnement résilié'}</h2>
        ${programmeePour ? `<p style="margin:4px 0"><strong>Accès jusqu'au :</strong> ${new Date(programmeePour).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>` : ''}
        <p style="margin:4px 0"><strong>Client :</strong> ${email || '(email inconnu)'}</p>
        <p style="margin:4px 0"><strong>Plan quitté :</strong> ${plan || '—'}</p>
        <p style="margin:4px 0"><strong>Motif :</strong> ${motifTexte}</p>
        ${commentaire ? `<p style="margin:12px 0;padding:12px;background:#111827;border-left:3px solid #ef4444;border-radius:4px;font-style:italic">« ${commentaire} »</p>` : ''}
        <p style="margin:4px 0"><strong>Abonnement :</strong> ${subscriptionId || '—'}</p>
        <p style="margin:4px 0"><strong>Date :</strong> ${date}</p>
        <p style="margin:20px 0 4px"><a href="${lien}" style="color:#10b981">Voir le client dans Stripe →</a></p>
        <p style="margin-top:16px;color:#9ca3af;font-size:13px">${programmeePour
          ? "Le client paie encore et garde son accès jusqu'à cette date : c'est la seule fenêtre pour le récupérer, et elle se referme toute seule. Stripe l'a déjà sorti du MRR."
          : "Un départ pour raison technique se rattrape souvent : si le motif est un bug, un mail personnel dans les 24 h fonctionne mieux qu'une relance automatique."}</p>
      </div>`
    })
  })
    .then(verifierBrevo('résiliation'))
    .catch((e) => console.error('[Webhook] Alerte résiliation non envoyée:', e.message));
}

/* Notification interne — nouveau client Studio */
async function notifierAdmin(clientEmail, plan) {
  if (!process.env.BREVO_API_KEY) return;
  const planLabel = plan === 'studio' ? 'Studio (49€)' : `Pro (19€)`;
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
    body: JSON.stringify({
      sender: { email: 'contact@creatis.app', name: 'Créatis' },
      to: [{ email: 'contact@creatis.app' }],
      subject: `🎉 Nouveau client ${planLabel} — ${clientEmail}`,
      htmlContent: `<div style="font-family:Inter,sans-serif;padding:24px;background:#0a0f0a;color:#e5e7eb;border-radius:8px;max-width:480px"><h2 style="color:#10b981;margin:0 0 12px">Nouveau client ${planLabel}</h2><p style="margin:4px 0"><strong>Email :</strong> ${clientEmail}</p><p style="margin:4px 0"><strong>Plan :</strong> ${planLabel}</p><p style="margin:4px 0"><strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p><p style="margin-top:20px;color:#9ca3af;font-size:13px">À contacter dans les 24h pour le support dédié.</p></div>`
    })
  });
}

/* Notifier Brevo après un paiement */
async function notifierBrevo(email, plan, stripeCustomerId) {
  const listIds = { pro: [4], studio: [5] };
  const planLabels = { pro: 'Pro', studio: 'Studio' };
  const planLabel = planLabels[plan] || plan;

  // 1. Mettre à jour le contact dans Brevo (sans listIds — créer les listes manuellement si besoin)
  const contactRes = await fetch(`https://api.brevo.com/v3/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
    body: JSON.stringify({
      email,
      attributes: {
        PLAN: plan,
        DATE_UPGRADE: new Date().toISOString().split('T')[0],
        STRIPE_CUSTOMER: stripeCustomerId || ''
      },
      updateEnabled: true
    })
  });
  if (!contactRes.ok) {
    const err = await contactRes.json().catch(() => ({}));
    console.warn('[Brevo] Contact non créé:', contactRes.status, err.message || JSON.stringify(err));
  }

  // 2. Envoyer un email de confirmation de paiement
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
    body: JSON.stringify({
      sender: { email: 'contact@creatis.app', name: 'Créatis' },
      to: [{ email }],
      subject: `✅ Ton plan ${planLabel} est actif — Créatis`,
      htmlContent: `
        <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0a0f0a;color:#e5e7eb;padding:40px 32px;border-radius:12px;">
          <div style="font-size:28px;font-weight:800;color:#ffffff;margin-bottom:4px;">Créatis<span style="color:#10b981;">.</span></div>
          <p style="color:#6b7280;font-size:14px;margin:0 0 32px;">Votre assistant YouTube IA</p>
          <h1 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 12px;">Bienvenue dans le plan ${planLabel} ! 🎉</h1>
          <p style="color:#9ca3af;line-height:1.6;margin:0 0 24px;">Ton abonnement est maintenant actif. Tous tes agents IA sont débloqués et tu peux générer du contenu sans limite.</p>
          <div style="background:#111827;border:1px solid #1f2937;border-radius:8px;padding:20px;margin-bottom:28px;">
            <p style="color:#10b981;font-weight:600;margin:0 0 12px;">Ce qui est débloqué :</p>
            <p style="color:#d1d5db;font-size:14px;margin:4px 0;">✓ 10 agents IA spécialisés</p>
            <p style="color:#d1d5db;font-size:14px;margin:4px 0;">✓ Générations illimitées</p>
            <p style="color:#d1d5db;font-size:14px;margin:4px 0;">✓ Miniatures HD ${plan === 'studio' ? '30/mois' : '10/mois'}</p>
            ${plan === 'studio' ? '<p style="color:#d1d5db;font-size:14px;margin:4px 0;">✓ 3 chaînes YouTube</p>' : ''}
          </div>
          <a href="https://creatis.app/app.html" style="display:inline-block;background:#10b981;color:#000000;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;">Accéder à l'application →</a>
          <p style="color:#4b5563;font-size:12px;margin-top:32px;">Questions ? Réponds à cet email ou écris à <a href="mailto:contact@creatis.app" style="color:#10b981;">contact@creatis.app</a></p>
        </div>
      `
    })
  });
}

/* Envoyer un email de bienvenue à l'inscription */
async function envoyerEmailBienvenue(email) {
  if (!process.env.BREVO_API_KEY) return;
  try {
    // Créer le contact dans Brevo
    const contactRes = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
      body: JSON.stringify({ email, attributes: { PLAN: 'gratuit' }, updateEnabled: true })
    });
    if (!contactRes.ok) {
      const err = await contactRes.json().catch(() => ({}));
      console.warn('[Brevo] Contact bienvenue non créé:', contactRes.status, err.message || JSON.stringify(err));
    }

    // Email de bienvenue
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
      body: JSON.stringify({
        sender: { email: 'contact@creatis.app', name: 'Créatis' },
        to: [{ email }],
        subject: '🚀 Bienvenue sur Créatis — ta génération gratuite t\'attend',
        htmlContent: `
          <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0a0f0a;color:#e5e7eb;padding:40px 32px;border-radius:12px;">
            <div style="font-size:28px;font-weight:800;color:#ffffff;margin-bottom:4px;">Créatis<span style="color:#10b981;">.</span></div>
            <p style="color:#6b7280;font-size:14px;margin:0 0 32px;">Votre assistant YouTube IA</p>
            <h1 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 12px;">Bienvenue ! 👋</h1>
            <p style="color:#9ca3af;line-height:1.6;margin:0 0 24px;">Ton compte est créé. Tu as <strong style="color:#10b981;">1 génération gratuite</strong> pour découvrir Créatis — aucune carte bancaire requise.</p>
            <div style="background:#111827;border:1px solid #1f2937;border-radius:8px;padding:20px;margin-bottom:28px;">
              <p style="color:#10b981;font-weight:600;margin:0 0 12px;">Pour commencer :</p>
              <p style="color:#d1d5db;font-size:14px;margin:4px 0;">1. Connecte ton @handle YouTube</p>
              <p style="color:#d1d5db;font-size:14px;margin:4px 0;">2. Choisis un agent IA (YouTube Complet, Short, Idées…)</p>
              <p style="color:#d1d5db;font-size:14px;margin:4px 0;">3. Génère ton contenu en 30 secondes</p>
            </div>
            <a href="https://creatis.app/app.html" style="display:inline-block;background:#10b981;color:#000000;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;">Démarrer avec Créatis →</a>
            <p style="color:#4b5563;font-size:12px;margin-top:32px;">Questions ? <a href="mailto:contact@creatis.app" style="color:#10b981;">contact@creatis.app</a></p>
          </div>
        `
      })
    });
  } catch (e) {
    console.warn('[Email] Bienvenue non envoyé:', e.message);
  }
}

module.exports.envoyerEmailBienvenue = envoyerEmailBienvenue;

/* Le traitement d'un evenement enchaine jusqu'a 5 allers-retours reseau en serie
   (Supabase x3, API Stripe, Brevo) et l'alerte e-mail est TOUJOURS la derniere.
   Au delai par defaut de Vercel, la fonction pouvait etre coupee juste avant :
   la base etait a jour, l'alerte ne partait jamais. */
module.exports.config = { maxDuration: 30 };

/* Résout l'affilié associé à un code promo utilisé au checkout (fallback si pas de ?ref=) */
async function resolvePromoCodeAffiliate(sessionId) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const full = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['discounts.promotion_code'] });
  const promo = full.discounts?.[0]?.promotion_code;
  const code = typeof promo === 'object' && promo ? promo.code : null;
  if (!code) return null;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/affiliate_promo_codes?promo_code=eq.${encodeURIComponent(code.toUpperCase())}&select=affiliate_id&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.affiliate_id || null;
}

/* Notifier un affilié qu'il vient de gagner une commission */
async function notifierAffilie(refCode, filleulEmail, plan) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;

  // Trouver l'email de l'affilié via son code (12 premiers chars de son UUID).
  // La colonne id est de type uuid → LIKE impossible → on borne la plage uuid du préfixe.
  const _code = String(refCode || '').toLowerCase();
  const _lo = _code + '00000000-0000-0000-0000-000000000000'.slice(_code.length);
  const _hi = _code + 'ffffffff-ffff-ffff-ffff-ffffffffffff'.slice(_code.length);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/users?id=gte.${_lo}&id=lte.${_hi}&select=email&limit=1`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  if (!res.ok) return;
  const rows = await res.json();
  const affilieEmail = rows?.[0]?.email;
  if (!affilieEmail) return;

  const commissions = { pro: '5,70€', studio: '14,70€' };
  const commission = commissions[plan] || '5,70€';
  const planLabel = plan === 'studio' ? 'Studio' : 'Pro';

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
    body: JSON.stringify({
      sender: { email: 'contact@creatis.app', name: 'Créatis' },
      to: [{ email: affilieEmail }],
      subject: `💸 Tu viens de gagner ${commission} — Créatis Affiliation`,
      htmlContent: `
        <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0a0f0a;color:#e5e7eb;padding:40px 32px;border-radius:12px;">
          <div style="font-size:28px;font-weight:800;color:#ffffff;margin-bottom:4px;">Créatis<span style="color:#10b981;">.</span></div>
          <p style="color:#6b7280;font-size:14px;margin:0 0 32px;">Programme Affiliation</p>
          <h1 style="font-size:24px;font-weight:800;color:#10b981;margin:0 0 8px;">+${commission} de commission 🎉</h1>
          <p style="color:#9ca3af;line-height:1.6;margin:0 0 24px;">
            Un utilisateur que tu as parrainé vient de passer au plan <strong style="color:#fff;">${planLabel}</strong>.<br/>
            Tu touches <strong style="color:#10b981;">${commission}/mois</strong> tant qu'il reste abonné.
          </p>
          <div style="background:#111827;border:1px solid #1f2937;border-radius:8px;padding:20px;margin-bottom:28px;">
            <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">Résumé</p>
            <p style="color:#fff;font-size:15px;margin:4px 0;">Plan souscrit : <strong>${planLabel}</strong></p>
            <p style="color:#fff;font-size:15px;margin:4px 0;">Commission mensuelle : <strong style="color:#10b981;">${commission}</strong></p>
          </div>
          <a href="https://creatis.app/affiliation" style="display:inline-block;background:#10b981;color:#000;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;">Voir mes stats →</a>
          <p style="color:#4b5563;font-size:12px;margin-top:32px;">
            Demande ton virement dès 20€ accumulés : <a href="mailto:contact@creatis.app" style="color:#10b981;">contact@creatis.app</a>
          </p>
        </div>
      `
    })
  });
}


/* Paliers du programme d'affiliation — même définition que api/parrainage.js */
const PALIERS = [
  { seuil: 5, recompense: '1 mois Pro offert' },
  { seuil: 10, recompense: 'Créatis Pro à vie' },
  { seuil: 25, recompense: '100€ cash' },
  { seuil: 50, recompense: 'Commission passe à 35%' },
  { seuil: 100, recompense: 'Commission passe à 40%' }
];

function palierAtteint(nbActifs) {
  let idx = 0;
  for (let i = 0; i < PALIERS.length; i++) {
    if (nbActifs >= PALIERS[i].seuil) idx = i + 1;
  }
  return idx;
}

/* Recalcule le nombre de filleuls actifs d'un affilié et alerte contact@creatis.app
   si un nouveau palier de récompense (5/10/25/50/100) vient d'être franchi. */
async function verifierPalierAffilie(refCode) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;

  const _code = String(refCode || '').toLowerCase();
  const _lo = _code + '00000000-0000-0000-0000-000000000000'.slice(_code.length);
  const _hi = _code + 'ffffffff-ffff-ffff-ffff-ffffffffffff'.slice(_code.length);

  // Identité + palier déjà enregistré pour cet affilié
  const affRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=gte.${_lo}&id=lte.${_hi}&select=id,email,nom,affiliate_highest_tier&limit=1`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const affRows = affRes.ok ? await affRes.json() : [];
  const affilie = affRows[0];
  if (!affilie) return;

  // Filleuls actuellement actifs (abonnement payant en cours) sous ce code
  const filRes = await fetch(`${SUPABASE_URL}/rest/v1/users?referred_by=eq.${_code}&select=plan`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const filleuls = filRes.ok ? await filRes.json() : [];
  const actifs = filleuls.filter(u => u.plan && u.plan !== 'gratuit').length;

  const nouveauPalier = palierAtteint(actifs);
  const ancienPalier = affilie.affiliate_highest_tier || 0;
  if (nouveauPalier <= ancienPalier) return; // pas de nouveau palier franchi

  // Mémoriser le nouveau palier pour ne pas réalerter au prochain paiement
  await supabasePatch('users', { id: affilie.id }, { affiliate_highest_tier: nouveauPalier });

  if (!process.env.BREVO_API_KEY) return;
  const recompense = PALIERS[nouveauPalier - 1].recompense;
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
    body: JSON.stringify({
      sender: { email: 'contact@creatis.app', name: 'Créatis' },
      to: [{ email: 'contact@creatis.app' }],
      subject: `🏆 ${affilie.email} vient d'atteindre un palier affiliation (${actifs} actifs)`,
      htmlContent: `
        <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2>Palier d'affiliation franchi</h2>
          <p><strong>${affilie.nom || affilie.email}</strong> (${affilie.email}) a maintenant <strong>${actifs} filleuls actifs</strong>.</p>
          <p>Palier atteint : <strong>${PALIERS[nouveauPalier - 1].seuil} parrainages</strong></p>
          <p>Récompense à honorer manuellement : <strong style="color:#10b981;">${recompense}</strong></p>
          <p style="color:#6b7280;font-size:13px;margin-top:24px;">Code affilié : ${refCode}</p>
        </div>
      `
    })
  });
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// CRITIQUE : désactiver le body parser Vercel — Stripe a besoin du body brut pour vérifier la signature
module.exports.config = { api: { bodyParser: false } };
