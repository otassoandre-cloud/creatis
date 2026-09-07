// api/portail.js — ouvre le portail de facturation Stripe
// Permet au client de changer de carte, voir ses factures, résilier.
// Obligatoire en pratique : sans ça, chaque résiliation passe par vous.

const Stripe = require("stripe");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erreur: "Méthode non autorisée" });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { token } = req.body || {};
    if (!token) return res.status(401).json({ erreur: "Non connecté" });

    const rUser = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${token}`
      }
    });
    if (!rUser.ok) return res.status(401).json({ erreur: "Session expirée" });
    const user = await rUser.json();

    const rProfil = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/profils?id=eq.${user.id}&select=stripe_client`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`
        }
      }
    );
    const profils = rProfil.ok ? await rProfil.json() : [];
    const client = profils[0] && profils[0].stripe_client;
    if (!client) return res.status(400).json({ erreur: "Aucun abonnement à gérer." });

    const site = (process.env.SITE_URL || "").replace(/\/+$/, "");
    const portail = await stripe.billingPortal.sessions.create({
      customer: client,
      return_url: `${site}/app.html`,
      locale: "fr"
    });

    return res.status(200).json({ url: portail.url });
  } catch (e) {
    console.error("[portail]", e && e.message);
    return res.status(500).json({ erreur: "Impossible d'ouvrir le portail." });
  }
};
