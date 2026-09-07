// api/webhook.js — reçoit les événements Stripe et met à jour l'abonnement
//
// IMPORTANT : Stripe exige le corps BRUT pour vérifier la signature.
// D'où la lecture manuelle du flux et le bodyParser désactivé plus bas.
//
// Variables d'environnement requises :
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE

const Stripe = require("stripe");

function corpsBrut(req) {
  return new Promise((resolve, reject) => {
    const morceaux = [];
    req.on("data", (c) => morceaux.push(c));
    req.on("end", () => resolve(Buffer.concat(morceaux)));
    req.on("error", reject);
  });
}

const SB = () => ({
  apikey: process.env.SUPABASE_SERVICE_ROLE,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`,
  "Content-Type": "application/json"
});

async function majProfil(profilId, champs) {
  if (!profilId) return;
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/profils?id=eq.${profilId}`, {
    method: "PATCH",
    headers: { ...SB(), Prefer: "return=minimal" },
    body: JSON.stringify(champs)
  });
}

// Stripe peut rejouer un événement. On l'enregistre d'abord :
// si l'insertion échoue en doublon, c'est qu'il a déjà été traité.
async function dejaTraite(evt) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/evenements_stripe`, {
    method: "POST",
    headers: { ...SB(), Prefer: "return=minimal" },
    body: JSON.stringify({ id: evt.id, type: evt.type })
  });
  return r.status === 409; // conflit de clé primaire = déjà vu
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let evt;

  try {
    const brut = await corpsBrut(req);
    evt = stripe.webhooks.constructEvent(
      brut,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (e) {
    // signature invalide : on refuse, sans donner de détail
    console.error("[webhook] signature refusée:", e && e.message);
    return res.status(400).send("Signature invalide");
  }

  try {
    if (await dejaTraite(evt)) {
      return res.status(200).json({ recu: true, deja: true });
    }

    const obj = evt.data.object;

    switch (evt.type) {
      case "checkout.session.completed": {
        const profil = obj.client_reference_id || (obj.metadata && obj.metadata.profil);
        await majProfil(profil, {
          statut_abo: "actif",
          plan: (obj.metadata && obj.metadata.plan) || "service",
          nb_etablissements: parseInt((obj.metadata && obj.metadata.etablissements) || "1", 10),
          stripe_client: obj.customer,
          stripe_abo: obj.subscription
        });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const profil = obj.metadata && obj.metadata.profil;
        const actif = ["active", "trialing"].includes(obj.status);
        await majProfil(profil, {
          statut_abo: actif ? "actif" : (obj.status === "past_due" ? "en_retard" : "inactif"),
          stripe_abo: obj.id,
          abo_fin_le: obj.current_period_end
            ? new Date(obj.current_period_end * 1000).toISOString()
            : null
        });
        break;
      }

      case "customer.subscription.deleted": {
        const profil = obj.metadata && obj.metadata.profil;
        await majProfil(profil, { statut_abo: "annule", plan: "aucun" });
        break;
      }

      case "invoice.payment_failed": {
        const profil = obj.subscription_details &&
                       obj.subscription_details.metadata &&
                       obj.subscription_details.metadata.profil;
        await majProfil(profil, { statut_abo: "en_retard" });
        break;
      }

      default:
        break; // les autres événements ne nous concernent pas
    }

    return res.status(200).json({ recu: true });
  } catch (e) {
    // On renvoie 500 pour que Stripe rejoue : mieux vaut un doublon
    // (bloqué par l'idempotence) qu'un abonnement jamais activé.
    console.error("[webhook] traitement:", e && e.message);
    return res.status(500).json({ erreur: "Traitement échoué" });
  }
};

// Vercel : ne pas parser le corps, la signature Stripe en dépend
module.exports.config = { api: { bodyParser: false } };
