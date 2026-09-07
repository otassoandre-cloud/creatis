// api/rapport-hebdo.js — le courrier du lundi matin
//
// Déclenché par la tâche planifiée Vercel (voir "crons" dans vercel.json).
// Lit les prélèvements encore à déposer, calcule les jours restants À LA
// DATE DU JOUR — et non ceux figés au moment de l'import — puis envoie un
// courrier par client abonné via Brevo.
//
// Rien n'est inventé : si la date de référence ou la fenêtre de la
// plateforme manque, la ligne part dans « délai non vérifié » au lieu de
// recevoir un compte à rebours plausible.
//
// Variables d'environnement requises :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE
//   BREVO_API_KEY, EXPEDITEUR_EMAIL, EXPEDITEUR_NOM
//   CRON_SECRET, SECRET_RAPPORT, SITE_URL

const R = require("../lib/rapport");

const JOURS_ENTRE_DEUX_ENVOIS = 6; // une relance planifiée deux fois = un désabonnement

// La tâche planifiée passe tous les jours — le plan Hobby de Vercel ne sait
// pas faire une fois par semaine — et c'est ce test qui en fait un rendez-vous
// du lundi. Le garde-fou des 6 jours couvre les rattrapages et les rejeux.
function estLundiAParis(d) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", weekday: "short" })
    .format(d) === "Mon";
}

const SB = () => ({
  apikey: process.env.SUPABASE_SERVICE_ROLE,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`,
  "Content-Type": "application/json"
});

async function lit(chemin) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${chemin}`, { headers: SB() });
  if (!r.ok) throw new Error(`Supabase ${r.status} sur ${chemin} — ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

function autorise(req) {
  const attendu = process.env.CRON_SECRET;
  if (!attendu) return false; // pas de secret configuré : on refuse plutôt que d'ouvrir la porte
  const recu = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  return recu.length === attendu.length &&
         require("crypto").timingSafeEqual(Buffer.from(recu), Buffer.from(attendu));
}

function manquantes() {
  return ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE", "BREVO_API_KEY",
          "EXPEDITEUR_EMAIL", "SECRET_RAPPORT", "SITE_URL"].filter((k) => !process.env[k]);
}

// Brevo. En cas d'échec on remonte le message tel quel : une erreur
// d'envoi maquillée en succès ferait croire au client qu'il est suivi.
async function envoie(destinataire, nom, objet, html, texte, lienDesinscription) {
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      sender: { email: process.env.EXPEDITEUR_EMAIL, name: process.env.EXPEDITEUR_NOM || "Ardoise" },
      to: [{ email: destinataire, name: nom || undefined }],
      subject: objet,
      htmlContent: html,
      textContent: texte,
      tags: ["rapport-hebdo"],
      headers: { "List-Unsubscribe": `<${lienDesinscription}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
    })
  });
  if (!r.ok) throw new Error(`Brevo ${r.status} — ${(await r.text()).slice(0, 300)}`);
  return r.json().catch(() => ({}));
}

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).end();
  }
  if (!autorise(req)) return res.status(401).json({ erreur: "Non autorisé" });

  const absentes = manquantes();
  if (absentes.length) {
    return res.status(500).json({ erreur: "Variables d'environnement manquantes : " + absentes.join(", ") });
  }

  // ?simulation=1 : calcule et renvoie le résultat sans rien envoyer
  // ?forcer=1     : envoie un autre jour que le lundi (rattrapage manuel)
  const simulation = /[?&]simulation=1/.test(req.url || "");
  const forcer = /[?&]forcer=1/.test(req.url || "");
  const auj = new Date();

  if (!estLundiAParis(auj) && !forcer && !simulation) {
    return res.status(200).json({ envoyes: 0, detail: "Ce n'est pas lundi — rien à faire." });
  }

  const site = String(process.env.SITE_URL).replace(/\/+$/, "");
  const seuil = new Date(auj.getTime() - JOURS_ENTRE_DEUX_ENVOIS * 86400000).toISOString();

  try {
    // 1. les abonnés qui veulent le rapport
    const profils = await lit(
      "profils?select=id,email,nom_restaurant,dernier_rapport_le" +
      "&statut_abo=eq.actif&rapport_hebdo=is.true&email=not.is.null" +
      `&or=(dernier_rapport_le.is.null,dernier_rapport_le.lt.${seuil})` +
      "&limit=500"
    );
    if (!profils.length) return res.status(200).json({ envoyes: 0, detail: "Aucun destinataire éligible." });

    // 2. leurs prélèvements encore à déposer
    const ids = profils.map((p) => `"${p.id}"`).join(",");
    const prelevements = await lit(
      `prelevements?select=id,profil,import,reference,motif,montant,date_ref` +
      `&statut=eq.a_deposer&profil=in.(${ids})&limit=5000`
    );

    // 3. les fenêtres de contestation, portées par l'import
    const importIds = [...new Set(prelevements.map((p) => p.import).filter(Boolean))];
    const imports = {};
    for (let i = 0; i < importIds.length; i += 200) {
      const lot = importIds.slice(i, i + 200).map((x) => `"${x}"`).join(",");
      (await lit(`imports?select=id,fenetre_jours,plateforme,delai_verifie&id=in.(${lot})`))
        .forEach((im) => { imports[im.id] = im; });
    }

    const parProfil = {};
    prelevements.forEach((p) => { (parProfil[p.profil] = parProfil[p.profil] || []).push(p); });

    const resultats = [];
    for (const profil of profils) {
      const b = R.bilan(parProfil[profil.id] || [], imports, auj);
      if (!R.meriteEnvoi(b)) { resultats.push({ profil: profil.id, envoye: false, raison: "rien à déposer" }); continue; }

      const lienDesinscription = `${site}/api/desinscription?p=${encodeURIComponent(profil.id)}` +
                                 `&s=${R.signe(profil.id, process.env.SECRET_RAPPORT)}`;
      const opt = { lienApp: `${site}/app.html`, lienDesinscription, nomRestaurant: profil.nom_restaurant };

      if (simulation) {
        resultats.push({ profil: profil.id, envoye: false, simulation: true, objet: R.objet(b),
                         montant: b.montantTotal, urgents: b.urgents.length, lignes: b.nbTotal });
        continue;
      }

      try {
        await envoie(profil.email, profil.nom_restaurant, R.objet(b),
                     R.html(b, opt), R.texte(b, opt), lienDesinscription);
        await fetch(`${process.env.SUPABASE_URL}/rest/v1/profils?id=eq.${profil.id}`, {
          method: "PATCH",
          headers: { ...SB(), Prefer: "return=minimal" },
          body: JSON.stringify({ dernier_rapport_le: new Date().toISOString() })
        });
        resultats.push({ profil: profil.id, envoye: true, montant: b.montantTotal });
      } catch (e) {
        // un destinataire en échec ne doit pas priver les autres de leur rapport
        console.error("[rapport-hebdo]", profil.id, e && e.message);
        resultats.push({ profil: profil.id, envoye: false, erreur: e && e.message });
      }
    }

    return res.status(200).json({
      simulation,
      envoyes: resultats.filter((r) => r.envoye).length,
      echecs: resultats.filter((r) => r.erreur).length,
      resultats
    });
  } catch (e) {
    console.error("[rapport-hebdo] échec global:", e && e.message);
    return res.status(500).json({ erreur: e && e.message });
  }
};
