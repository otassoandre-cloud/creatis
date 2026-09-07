// api/diagnostic.js — « est-ce que tout est vraiment branché ? »
//
// Un déploiement qui marche à moitié ne le dit pas : le paiement fonctionne,
// le rapport ne part jamais, et on s'en aperçoit trois semaines plus tard.
// Cette entrée vérifie la chaîne complète et répond en clair.
//
// Protégée par CRON_SECRET, comme la tâche du lundi.
// Ne renvoie JAMAIS la valeur d'un secret : seulement présent / absent / valide.
//
//   curl -H "Authorization: Bearer $CRON_SECRET" https://VOTRE-URL/api/diagnostic

const crypto = require("crypto");

function autorise(req) {
  const attendu = process.env.CRON_SECRET;
  if (!attendu) return false;
  const recu = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(recu), b = Buffer.from(attendu);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const VARIABLES = [
  ["SITE_URL", "l'adresse publique du site, sans barre oblique finale"],
  ["SUPABASE_URL", "Supabase → Project Settings → API → Project URL"],
  ["SUPABASE_SERVICE_ROLE", "Supabase → API → service_role (secret serveur)"],
  ["STRIPE_SECRET_KEY", "Stripe → Développeurs → Clés API"],
  ["STRIPE_WEBHOOK_SECRET", "Stripe → Webhooks → votre endpoint → whsec_..."],
  ["PRIX_SERVICE", "identifiant price_... du plan Service"],
  ["PRIX_MAISON", "identifiant price_... du plan Maison"],
  ["PRIX_GROUPE_BASE", "identifiant price_... du socle Groupe"],
  ["PRIX_GROUPE_ETAB", "identifiant price_... de l'établissement supplémentaire"],
  ["BREVO_API_KEY", "Brevo → SMTP & API → API keys"],
  ["EXPEDITEUR_EMAIL", "adresse d'envoi, sur un domaine authentifié chez Brevo"],
  ["CRON_SECRET", "openssl rand -hex 32"],
  ["SECRET_RAPPORT", "openssl rand -hex 32"]
];

const SB = () => ({
  apikey: process.env.SUPABASE_SERVICE_ROLE,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`,
  "Content-Type": "application/json"
});

async function verifieSupabase(points) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return points.push({ ok: false, quoi: "Supabase", detail: "Variables absentes : vérification impossible." });
  }
  const table = async (nom, colonnes) => {
    try {
      const r = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/${nom}?select=${colonnes}&limit=1`,
        { headers: SB() });
      if (r.ok) return points.push({ ok: true, quoi: `Table ${nom}`, detail: "présente, colonnes attendues." });
      const txt = (await r.text()).slice(0, 200);
      points.push({ ok: false, quoi: `Table ${nom}`, detail: `${r.status} — ${txt}`,
                    faire: "Exécutez supabase/schema.sql, puis migration-01-rapport-hebdo.sql." });
    } catch (e) {
      points.push({ ok: false, quoi: `Table ${nom}`, detail: e.message });
    }
  };

  await table("profils", "id,plan,statut_abo,rapport_hebdo,dernier_rapport_le");
  await table("imports", "id,fenetre_jours,plateforme,delai_verifie");
  await table("prelevements", "id,statut,date_ref,montant");
  await table("prospects", "id,email");
  await table("evenements_stripe", "id");

  // La clé anon ne doit RIEN pouvoir lire dans prospects : c'est la RLS qui
  // empêche d'aspirer la liste d'adresses avec une clé publique.
  const anon = process.env.SUPABASE_ANON_KEY;
  if (anon) {
    try {
      const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/prospects?select=email&limit=1`,
        { headers: { apikey: anon, Authorization: `Bearer ${anon}` } });
      const corps = r.ok ? await r.json() : null;
      const fuite = r.ok && Array.isArray(corps) && corps.length > 0;
      points.push({ ok: !fuite, quoi: "RLS sur prospects",
        detail: fuite ? "LA CLÉ PUBLIQUE PEUT LIRE LES ADRESSES." : "la clé publique ne lit rien, comme prévu.",
        faire: fuite ? "Réexécutez la section SÉCURITÉ de schema.sql : une policy de select traîne." : undefined });
    } catch (e) {
      points.push({ ok: false, quoi: "RLS sur prospects", detail: e.message });
    }
  }
}

async function verifieStripe(points) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return points.push({ ok: false, quoi: "Stripe", detail: "STRIPE_SECRET_KEY absente." });
  }
  let stripe;
  try { stripe = new (require("stripe"))(process.env.STRIPE_SECRET_KEY); }
  catch (e) { return points.push({ ok: false, quoi: "Stripe", detail: e.message }); }

  // En mode test, un client peut souscrire sans qu'un centime soit encaissé.
  // Ce n'est donc pas un avertissement : c'est un blocage au lancement.
  const live = /^sk_live/.test(process.env.STRIPE_SECRET_KEY);
  points.push({ ok: live, quoi: "Mode Stripe",
    detail: live ? "live — les paiements sont réels."
                 : "test — un client pourrait souscrire sans qu'aucun paiement soit encaissé.",
    faire: live ? undefined : "Basculez STRIPE_SECRET_KEY et les quatre price_... en mode live, puis redéployez." });

  for (const [cle, attendu] of [["PRIX_SERVICE", 9900], ["PRIX_MAISON", 24900],
                                ["PRIX_GROUPE_BASE", 24900], ["PRIX_GROUPE_ETAB", 4500]]) {
    const id = process.env[cle];
    if (!id) continue; // déjà signalée dans la liste des variables, inutile de la répéter
    try {
      const p = await stripe.prices.retrieve(id);
      const bon = p.unit_amount === attendu && p.currency === "eur" && p.recurring;
      points.push({ ok: bon, quoi: cle,
        detail: `${(p.unit_amount / 100).toFixed(2)} ${String(p.currency).toUpperCase()}` +
                `${p.recurring ? " / " + p.recurring.interval : " — NON RÉCURRENT"}`,
        faire: bon ? undefined : `Attendu : ${(attendu / 100).toFixed(2)} EUR par mois, récurrent.` });
    } catch (e) {
      points.push({ ok: false, quoi: cle, detail: e.message,
                    faire: "L'identifiant price_... n'existe pas dans ce compte Stripe (ou pas dans ce mode)." });
    }
  }
}

async function verifieBrevo(points) {
  if (!process.env.BREVO_API_KEY) {
    return points.push({ ok: false, quoi: "Brevo", detail: "BREVO_API_KEY absente : aucun rapport ne partira." });
  }
  try {
    const r = await fetch("https://api.brevo.com/v3/account",
      { headers: { "api-key": process.env.BREVO_API_KEY, Accept: "application/json" } });
    if (!r.ok) {
      return points.push({ ok: false, quoi: "Brevo", detail: `${r.status} — clé refusée.`,
                           faire: "Regénérez la clé dans Brevo → SMTP & API." });
    }
    const c = await r.json();
    points.push({ ok: true, quoi: "Brevo", detail: `compte ${c.email || "authentifié"}.` });

    // L'expéditeur doit être un expéditeur validé, sinon Brevo refuse l'envoi.
    const exp = process.env.EXPEDITEUR_EMAIL;
    const rs = await fetch("https://api.brevo.com/v3/senders",
      { headers: { "api-key": process.env.BREVO_API_KEY, Accept: "application/json" } });
    if (rs.ok && exp) {
      const l = (await rs.json()).senders || [];
      const trouve = l.find((s) => String(s.email).toLowerCase() === exp.toLowerCase());
      points.push({ ok: !!trouve, quoi: "Expéditeur",
        detail: trouve ? `${exp} — validé chez Brevo.` : `${exp} — introuvable dans les expéditeurs Brevo.`,
        faire: trouve ? undefined : "Brevo → Senders : ajoutez cette adresse et authentifiez son domaine (SPF/DKIM), sinon les rapports partent en indésirables." });
    }
  } catch (e) {
    points.push({ ok: false, quoi: "Brevo", detail: e.message });
  }
}

module.exports = async (req, res) => {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).end(); }
  if (!autorise(req)) return res.status(401).json({ erreur: "Non autorisé" });

  const points = [];

  for (const [cle, ou] of VARIABLES) {
    const v = process.env[cle];
    points.push({ ok: !!v, quoi: cle,
                  detail: v ? "présente." : "ABSENTE.",
                  faire: v ? undefined : ou });
  }

  const site = process.env.SITE_URL || "";
  if (site && !/^https:\/\//.test(site)) {
    points.push({ ok: false, quoi: "SITE_URL", detail: `« ${site} » ne commence pas par https://`,
                  faire: "Les liens des courriers seraient cassés." });
  }
  if (/\/$/.test(site)) {
    points.push({ ok: true, quoi: "SITE_URL", detail: "barre oblique finale présente — retirée automatiquement." });
  }

  await verifieSupabase(points);
  await verifieStripe(points);
  await verifieBrevo(points);

  const echecs = points.filter((p) => !p.ok);
  return res.status(200).json({
    pret: echecs.length === 0,
    resume: echecs.length === 0
      ? "Tout est branché. Le site peut recevoir des clients."
      : `${echecs.length} point${echecs.length > 1 ? "s" : ""} à corriger avant d'envoyer du trafic.`,
    a_corriger: echecs,
    tout: points
  });
};
