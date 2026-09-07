// api/desinscription.js — se retirer du rapport du lundi en un clic
//
// GET  : le lien en bas du courrier, ouvert dans un navigateur.
// POST : la désinscription en un clic des messageries (RFC 8058), déclenchée
//        par l'en-tête List-Unsubscribe-Post posé à l'envoi.
//
// Le lien est signé : sans cela, changer l'identifiant dans l'URL suffirait
// à désabonner un autre restaurant.
//
// Variables d'environnement requises :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE, SECRET_RAPPORT

const R = require("../lib/rapport");

function page(titre, message, lien) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titre} — Ardoise</title>
<style>
  body{margin:0;background:#12140F;color:#EFEDE2;
       font:400 16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
       display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
  .bloc{background:#1B1E18;border:1px solid rgba(239,237,226,.13);border-radius:4px;
        padding:28px 24px;max-width:460px;width:100%}
  h1{margin:0 0 10px;font-size:24px;line-height:1.15}
  p{margin:0 0 14px;color:#B9BDB2;font-size:15px}
  a{color:#E8B84B}
</style></head><body>
  <div class="bloc">
    <h1>${titre}</h1>
    <p>${message}</p>
    ${lien ? `<p><a href="${lien}">Ouvrir mon ardoise</a></p>` : ""}
  </div>
</body></html>`;
}

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).end();
  }

  const url = new URL(req.url, "https://ardoise.local");
  const profil = url.searchParams.get("p") || "";
  const signature = url.searchParams.get("s") || "";
  const site = String(process.env.SITE_URL || "").replace(/\/+$/, "");

  const repond = (code, titre, message, lien) => {
    // Une messagerie en un clic n'affiche pas de page : elle attend un 200.
    if (req.method === "POST") return res.status(code === 200 ? 200 : code).json({ ok: code === 200 });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(code).send(page(titre, message, lien));
  };

  if (!process.env.SECRET_RAPPORT || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return repond(500, "Désinscription indisponible",
      "Le service n'est pas complètement configuré. Écrivez-nous et nous vous retirons à la main.");
  }

  if (!profil || !R.signatureValide(profil, signature, process.env.SECRET_RAPPORT)) {
    return repond(400, "Lien invalide",
      "Ce lien de désinscription n'est pas valide. Vous pouvez aussi couper le rapport depuis votre espace, dans Réglages.",
      site ? site + "/app.html" : null);
  }

  try {
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/profils?id=eq.${encodeURIComponent(profil)}`, {
      method: "PATCH",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({ rapport_hebdo: false })
    });
    if (!r.ok) throw new Error(`Supabase ${r.status}`);

    return repond(200, "C'est fait",
      "Vous ne recevrez plus le rapport du lundi. Vos relevés et votre suivi restent intacts dans votre espace, " +
      "et vous pouvez réactiver le rapport à tout moment dans Réglages.",
      site ? site + "/app.html" : null);
  } catch (e) {
    console.error("[desinscription]", e && e.message);
    return repond(500, "La désinscription a échoué",
      "Réessayez dans un instant, ou coupez le rapport depuis votre espace, dans Réglages.",
      site ? site + "/app.html" : null);
  }
};
