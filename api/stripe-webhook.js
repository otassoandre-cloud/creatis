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
  'price_1TWISZAptK6HZtp5uBP0RHe8': 'pro',     // pro mensuel 19€ (live)
  'price_1TWIU8AptK6HZtp5SbYvQ12d': 'pro',     // pro annuel 180€ (live)
  'price_1TWIV6AptK6HZtp5qlNhu47w': 'studio',  // studio mensuel 49€ (live)
  'price_1TWIVeAptK6HZtp5zIef773D': 'studio',  // studio annuel 468€ (live)
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

        console.log(`[Webhook] ✅ Paiement réussi — plan: ${plan}, user: ${userId || email}, subscription: ${subscriptionId}`);

        if (!plan) {
          console.warn('[Webhook] Plan non identifiable depuis la session');
          break;
        }

        // Email = source la plus fiable pour retrouver l'utilisateur en base
        const matchValue = email || (userId && userId.includes('@') ? userId : null);

        if (!matchValue) {
          console.error('[Webhook] ⚠️ Impossible d\'identifier l\'utilisateur — email manquant. userId:', userId, 'session id:', session.id);
          break;
        }

        if (matchValue) {
          // Mettre à jour le plan utilisateur
          await supabasePatch('users', { email: matchValue }, {
            plan,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            updated_at: new Date().toISOString()
          });

          // Résoudre l'user_id depuis l'email
          const userRow = await supabaseGet('users', { email: matchValue });

          // Enregistrer l'abonnement
          await supabaseUpsert('abonnements', {
            user_id: userRow?.id || null,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            plan,
            status: 'active',
            montant_centimes: session.amount_total || 0,
            annuel: session.metadata?.annuel === 'true',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
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
        }

        break;
      }

      /* ===== RENOUVELLEMENT MENSUEL ===== */
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.billing_reason === 'subscription_create') break; // Déjà géré par checkout.session.completed

        const subscriptionId = invoice.subscription;
        const customerId = invoice.customer;
        const email = invoice.customer_email;

        console.log(`[Webhook] 🔄 Renouvellement réussi — customer: ${customerId}`);

        if (email) {
          await supabasePatch('users', { email }, {
            plan_expires_at: null, // Toujours actif
            updated_at: new Date().toISOString()
          });
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

        console.log(`[Webhook] Utilisateur ${user?.email || customerId} rétrogradé → gratuit`);
        break;
      }

      /* ===== PAIEMENT ÉCHOUÉ ===== */
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const email = invoice.customer_email;
        const subscriptionId = invoice.subscription;

        console.log(`[Webhook] ⚠️ Paiement échoué — customer: ${customerId}`);

        await supabasePatch('abonnements', { stripe_subscription_id: subscriptionId }, {
          status: 'past_due',
          updated_at: new Date().toISOString()
        });

        // Notifier l'utilisateur par email (Brevo)
        if (process.env.BREVO_API_KEY && email) {
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
            body: JSON.stringify({
              to: [{ email }],
              subject: '⚠️ Problème de paiement Créatis',
              htmlContent: `<p>Bonjour,</p><p>Le renouvellement de votre abonnement Créatis a échoué. Mettez à jour votre moyen de paiement sur <a href="${APP_URL}/app.html">votre espace</a>.</p>`,
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

        if (plan && status === 'active') {
          console.log(`[Webhook] 🔄 Abonnement mis à jour — plan: ${plan}`);
          await supabasePatch('users', { stripe_customer_id: customerId }, {
            plan,
            updated_at: new Date().toISOString()
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
        subject: '🚀 Bienvenue sur Créatis — tes 50 crédits t\'attendent',
        htmlContent: `
          <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0a0f0a;color:#e5e7eb;padding:40px 32px;border-radius:12px;">
            <div style="font-size:28px;font-weight:800;color:#ffffff;margin-bottom:4px;">Créatis<span style="color:#10b981;">.</span></div>
            <p style="color:#6b7280;font-size:14px;margin:0 0 32px;">Votre assistant YouTube IA</p>
            <h1 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 12px;">Bienvenue ! 👋</h1>
            <p style="color:#9ca3af;line-height:1.6;margin:0 0 24px;">Ton compte est créé. Tu as <strong style="color:#10b981;">50 crédits gratuits</strong> pour tester Créatis — aucune carte bancaire requise.</p>
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

/* Notifier un affilié qu'il vient de gagner une commission */
async function notifierAffilie(refCode, filleulEmail, plan) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;

  // Trouver l'email de l'affilié via son code (12 premiers chars de son UUID)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/users?id=like.${encodeURIComponent(refCode)}*&select=email`, {
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


async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
