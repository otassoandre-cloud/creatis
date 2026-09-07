// api/checkout.js — crée une session Stripe Checkout
// Variables d'environnement Vercel requises :
//   STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE,
//   PRIX_SERVICE, PRIX_MAISON, PRIX_GROUPE_BASE, PRIX_GROUPE_ETAB, SITE_URL

const Stripe = require("stripe");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erreur: "Méthode non autorisée" });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { plan, etablissements, token } = req.body || {};

    if (!token) return res.status(401).json({ erreur: "Non connecté" });

    // --- qui est l'utilisateur ? on valide le jeton auprès de Supabase ---
    const rUser = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${token}`
      }
    });
    if (!rUser.ok) return res.status(401).json({ erreur: "Session expirée" });
    const user = await rUser.json();
    if (!user || !user.id) return res.status(401).json({ erreur: "Session invalide" });

    // --- composition du panier ---
    const nb = Math.max(1, Math.min(20, parseInt(etablissements, 10) || 1));
    let items = [];

    if (plan === "service") {
      items = [{ price: process.env.PRIX_SERVICE, quantity: 1 }];
    } else if (plan === "maison") {
      items = [{ price: process.env.PRIX_MAISON, quantity: 1 }];
    } else if (plan === "groupe") {
      // socle Maison + 45 € par établissement au-delà du cinquième
      items = [
        { price: process.env.PRIX_GROUPE_BASE, quantity: 1 },
        { price: process.env.PRIX_GROUPE_ETAB, quantity: Math.max(1, nb - 5) }
      ];
    } else {
      return res.status(400).json({ erreur: "Plan inconnu" });
    }

    // --- réutilise le client Stripe existant s'il y en a un ---
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
    const clientExistant = profils[0] && profils[0].stripe_client;

    const site = (process.env.SITE_URL || "").replace(/\/+$/, "");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: items,
      locale: "fr",
      customer: clientExistant || undefined,
      customer_email: clientExistant ? undefined : user.email,
      client_reference_id: user.id,
      subscription_data: {
        metadata: { profil: user.id, plan, etablissements: String(nb) }
      },
      metadata: { profil: user.id, plan, etablissements: String(nb) },
      allow_promotion_codes: true,
      success_url: `${site}/app.html?paiement=ok`,
      cancel_url: `${site}/app.html?paiement=annule`
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error("[checkout]", e && e.message);
    return res.status(500).json({ erreur: "Impossible de créer la session de paiement." });
  }
};
