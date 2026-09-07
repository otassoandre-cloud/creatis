/* ============================================================
   Ardoise — rapport hebdomadaire : la logique, sans effet de bord
   ------------------------------------------------------------
   Aucun appel réseau ici. Ce fichier ne fait que transformer des
   lignes venues de la base en un courrier prêt à partir, pour que
   la règle « ne jamais inventer un chiffre » soit vérifiable par
   des tests plutôt que par la confiance.

   Un montant n'apparaît dans le courrier que s'il vient d'une
   ligne enregistrée. Un compte à rebours n'apparaît que si la
   date de référence ET la fenêtre de la plateforme sont connues.
   Sinon on écrit que le délai n'est pas vérifié — on ne devine pas.
   ============================================================ */

"use strict";

const crypto = require("crypto");

const JOUR = 86400000;

/* ------------------------------------------------------------
   Jours restants avant la fermeture de la fenêtre.
   null si la date de référence ou la fenêtre manque : c'est une
   absence d'information, pas un zéro.
   ------------------------------------------------------------ */
function joursRestants(dateRef, fenetreJours, aujourdhui) {
  if (!dateRef || !fenetreJours) return null;
  const d = dateRef instanceof Date ? dateRef : new Date(String(dateRef).slice(0, 10) + "T00:00:00Z");
  if (isNaN(d.getTime())) return null;
  const auj = aujourdhui ? new Date(aujourdhui) : new Date();
  const a = Date.UTC(auj.getUTCFullYear(), auj.getUTCMonth(), auj.getUTCDate());
  const b = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return fenetreJours - Math.floor((a - b) / JOUR);
}

function euros(v) {
  return (Math.round((Number(v) || 0) * 100) / 100)
    .toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function echappe(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* ------------------------------------------------------------
   Range les prélèvements « à déposer » par urgence.

   prelevements : lignes de public.prelevements
   imports      : { id -> { fenetre_jours, plateforme, delai_verifie } }

   Un prélèvement dont la fenêtre est fermée n'est PAS présenté
   comme récupérable : il ne compte que dans « fermé cette
   semaine », qui sert d'avertissement, pas de promesse.
   ------------------------------------------------------------ */
function bilan(prelevements, imports, aujourdhui) {
  const b = {
    urgents: [],        // 3 jours ou moins
    semaine: [],        // 4 à 7 jours
    plusTard: [],       // au-delà de 7 jours
    sansDelai: [],      // fenêtre ou date inconnue : signalée telle quelle
    fermesCetteSemaine: [],
    montantUrgent: 0,
    montantSemaine: 0,
    montantTotal: 0,    // tout ce qui est encore déposable
    montantFerme: 0,
    nbTotal: 0
  };

  (prelevements || []).forEach(function (p) {
    const imp = (imports && imports[p.import]) || {};
    const montant = Math.round((Number(p.montant) || 0) * 100) / 100;
    const reste = joursRestants(p.date_ref, imp.fenetre_jours, aujourdhui);
    const ligne = {
      id: p.id,
      reference: p.reference || "—",
      motif: p.motif || "Motif non précisé",
      montant: montant,
      plateforme: imp.plateforme || null,
      jours: reste,
      delaiVerifie: imp.delai_verifie === true
    };

    if (reste === null) {
      b.sansDelai.push(ligne);
      b.montantTotal += montant;
    } else if (reste <= 0) {
      // fermé depuis moins de 7 jours : le client peut encore comprendre
      // pourquoi il l'a raté. Au-delà, ce n'est plus qu'un reproche.
      if (reste > -7) { b.fermesCetteSemaine.push(ligne); b.montantFerme += montant; }
      return; // ne compte ni dans le total ni dans le nombre : ce n'est plus récupérable
    } else if (reste <= 3) {
      b.urgents.push(ligne); b.montantUrgent += montant; b.montantTotal += montant;
    } else if (reste <= 7) {
      b.semaine.push(ligne); b.montantSemaine += montant; b.montantTotal += montant;
    } else {
      b.plusTard.push(ligne); b.montantTotal += montant;
    }
    b.nbTotal++;
  });

  const parUrgence = function (x, y) {
    if (x.jours !== y.jours) return (x.jours == null ? 9999 : x.jours) - (y.jours == null ? 9999 : y.jours);
    return y.montant - x.montant;
  };
  b.urgents.sort(parUrgence);
  b.semaine.sort(parUrgence);
  b.plusTard.sort(parUrgence);
  b.sansDelai.sort(function (x, y) { return y.montant - x.montant; });
  b.fermesCetteSemaine.sort(function (x, y) { return y.montant - x.montant; });

  b.montantUrgent = Math.round(b.montantUrgent * 100) / 100;
  b.montantSemaine = Math.round(b.montantSemaine * 100) / 100;
  b.montantTotal = Math.round(b.montantTotal * 100) / 100;
  b.montantFerme = Math.round(b.montantFerme * 100) / 100;

  return b;
}

/* Envoyer un courrier vide use la patience du client et finit en
   désabonnement. On n'écrit que s'il reste quelque chose à déposer. */
function meriteEnvoi(b) {
  return b.nbTotal > 0;
}

function objet(b) {
  if (b.urgents.length) {
    const j = b.urgents[0].jours;
    return euros(b.montantUrgent) + " à déposer sous " + j + " jour" + (j > 1 ? "s" : "");
  }
  return euros(b.montantTotal) + " encore récupérable";
}

/* ------------------------------------------------------------
   Rendu
   Le jaune n'écrit que de l'argent — même règle que sur le site.
   Tableaux et styles en ligne : les clients de messagerie ne
   savent pas faire autrement.
   ------------------------------------------------------------ */
const FOND = "#12140F", PANNEAU = "#1B1E18", CRAIE = "#EFEDE2",
      SOURDINE = "#889084", SOMME = "#E8B84B", PERDU = "#C97A6E",
      LISERE = "rgba(239,237,226,.13)";

function ligneHtml(l) {
  const delai = l.jours == null
    ? (l.delaiVerifie ? "date illisible" : "délai non vérifié")
    : l.jours + " j";
  return '<tr>' +
    '<td style="padding:10px 0;border-bottom:1px solid ' + LISERE + ';color:' + CRAIE + ';font-size:15px">' +
      echappe(l.motif) +
      '<span style="display:block;color:' + SOURDINE + ';font-size:12.5px;margin-top:2px">' +
        echappe(l.reference) + (l.plateforme ? " · " + echappe(l.plateforme) : "") + ' · ' + delai +
      '</span>' +
    '</td>' +
    '<td align="right" style="padding:10px 0;border-bottom:1px solid ' + LISERE + ';color:' + SOMME +
      ';font-family:ui-monospace,Menlo,monospace;font-weight:700;white-space:nowrap;font-size:15px">' +
      euros(l.montant) +
    '</td></tr>';
}

function blocHtml(titre, lignes, max) {
  if (!lignes.length) return "";
  const visibles = lignes.slice(0, max || 12);
  const reste = lignes.length - visibles.length;
  return '<p style="margin:26px 0 6px;color:' + CRAIE + ';font-size:13px;font-weight:700;' +
         'text-transform:uppercase;letter-spacing:.08em">' + echappe(titre) + '</p>' +
         '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">' +
         visibles.map(ligneHtml).join("") + '</table>' +
         (reste > 0 ? '<p style="margin:8px 0 0;color:' + SOURDINE + ';font-size:13px">et ' + reste +
                      ' autre' + (reste > 1 ? "s" : "") + ' dans votre espace.</p>' : "");
}

function html(b, opt) {
  opt = opt || {};
  const lienApp = opt.lienApp || "#";
  const lienDesinscription = opt.lienDesinscription || "#";
  const nom = opt.nomRestaurant ? echappe(opt.nomRestaurant) : null;

  // On annonce l'échéance réelle de la ligne la plus pressée, pas la
  // borne de la catégorie : « 3 jours ou moins » au-dessus d'une ligne
  // marquée 2 j se lit comme une approximation, et abîme la confiance.
  const j = b.urgents.length ? b.urgents[0].jours : null;
  const entete = j === null
    ? "Rien d'urgent cette semaine."
    : euros(b.montantUrgent) + " à déposer — " +
      (b.urgents.length > 1 ? "la première fenêtre se ferme" : "la fenêtre se ferme") +
      " dans " + j + " jour" + (j > 1 ? "s" : "") + ".";

  return '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Votre ardoise de la semaine</title></head>' +
    '<body style="margin:0;background:' + FOND + ';color:' + CRAIE +
      ';font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Arial,sans-serif;font-size:16px;line-height:1.6">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + FOND + '">' +
    '<tr><td align="center" style="padding:28px 16px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:' + PANNEAU +
      ';border:1px solid ' + LISERE + ';border-radius:4px">' +
    '<tr><td style="padding:26px 22px">' +

      '<p style="margin:0 0 4px;color:' + SOURDINE + ';font-size:13px">Ardoise' +
        (nom ? ' · ' + nom : '') + '</p>' +
      '<h1 style="margin:0 0 4px;font-size:26px;line-height:1.15;color:' + CRAIE + '">Votre ardoise de la semaine</h1>' +
      '<p style="margin:0 0 22px;color:' + SOURDINE + ';font-size:14px">' + echappe(entete) + '</p>' +

      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ' +
        'style="background:rgba(0,0,0,.28);border-radius:3px"><tr><td style="padding:16px 18px">' +
        '<span style="display:block;color:' + SOURDINE + ';font-size:12px;text-transform:uppercase;letter-spacing:.08em">Encore déposable</span>' +
        '<span style="display:block;color:' + SOMME + ';font-family:ui-monospace,Menlo,monospace;font-weight:700;font-size:30px">' +
          euros(b.montantTotal) + '</span>' +
        '<span style="display:block;color:' + SOURDINE + ';font-size:13px;margin-top:3px">' +
          b.nbTotal + ' prélèvement' + (b.nbTotal > 1 ? "s" : "") + ' en attente de dépôt</span>' +
      '</td></tr></table>' +

      blocHtml("À déposer en priorité", b.urgents, 12) +
      blocHtml("Cette semaine", b.semaine, 8) +
      blocHtml("Délai non vérifié — à traiter en premier par prudence", b.sansDelai, 5) +

      (b.plusTard.length
        ? '<p style="margin:22px 0 0;color:' + SOURDINE + ';font-size:13.5px">' + b.plusTard.length +
          (b.plusTard.length > 1
            ? ' prélèvements ont plus de 7 jours devant eux. Ils vous attendent'
            : ' prélèvement a plus de 7 jours devant lui. Il vous attend') +
          ' dans votre espace.</p>'
        : "") +

      (b.fermesCetteSemaine.length
        ? '<p style="margin:18px 0 0;padding:11px 13px;border-left:2px solid ' + PERDU +
          ';background:rgba(201,122,110,.10);color:' + PERDU + ';font-size:13.5px">' +
          b.fermesCetteSemaine.length + (b.fermesCetteSemaine.length > 1 ? ' fenêtres se sont fermées' : ' fenêtre s\'est fermée') +
          ' cette semaine, soit ' + euros(b.montantFerme) + ' qui ne sont plus contestables.</p>'
        : "") +

      '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 0"><tr>' +
      '<td style="background:' + SOMME + ';border-radius:3px">' +
      '<a href="' + echappe(lienApp) + '" style="display:block;padding:14px 22px;color:' + FOND +
        ';text-decoration:none;font-weight:700;font-size:16px">Ouvrir mon ardoise</a>' +
      '</td></tr></table>' +

      '<p style="margin:22px 0 0;color:' + SOURDINE + ';font-size:12.5px;line-height:1.6">' +
        'Ardoise prépare les dossiers ; vous seul déposez la contestation sur le portail de la plateforme. ' +
        'Nous n\'agissons jamais à votre place sur vos comptes.' +
      '</p>' +

    '</td></tr></table>' +
    '<p style="max-width:560px;margin:14px auto 0;color:' + SOURDINE + ';font-size:12px;text-align:center">' +
      '<a href="' + echappe(lienDesinscription) + '" style="color:' + SOURDINE + '">Ne plus recevoir ce rapport</a>' +
    '</p>' +
    '</td></tr></table></body></html>';
}

function texte(b, opt) {
  opt = opt || {};
  const l = [];
  l.push("VOTRE ARDOISE DE LA SEMAINE");
  l.push("");
  l.push("Encore déposable : " + euros(b.montantTotal) +
         " sur " + b.nbTotal + " prélèvement" + (b.nbTotal > 1 ? "s" : "") + ".");
  const bloc = function (titre, lignes, max) {
    if (!lignes.length) return;
    l.push(""); l.push(titre.toUpperCase());
    lignes.slice(0, max).forEach(function (x) {
      l.push("- " + euros(x.montant) + " · " + x.motif + " · " + x.reference + " · " +
             (x.jours == null ? (x.delaiVerifie ? "date illisible" : "délai non vérifié") : x.jours + " j"));
    });
    if (lignes.length > max) l.push("  et " + (lignes.length - max) + " autre(s) dans votre espace.");
  };
  bloc("À déposer en priorité", b.urgents, 12);
  bloc("Cette semaine", b.semaine, 8);
  bloc("Délai non vérifié", b.sansDelai, 5);
  if (b.plusTard.length) {
    l.push("");
    l.push(b.plusTard.length + " prélèvement" + (b.plusTard.length > 1 ? "s ont" : " a") +
           " plus de 7 jours devant " + (b.plusTard.length > 1 ? "eux" : "lui") + ".");
  }
  if (b.fermesCetteSemaine.length) {
    const n = b.fermesCetteSemaine.length;
    l.push("");
    l.push(n + (n > 1 ? " fenêtres se sont fermées" : " fenêtre s'est fermée") +
           " cette semaine, soit " + euros(b.montantFerme) + " qui ne sont plus contestables.");
  }
  l.push("");
  l.push("Ouvrir mon ardoise : " + (opt.lienApp || ""));
  l.push("");
  l.push("Ardoise prépare les dossiers ; vous seul déposez la contestation.");
  l.push("Ne plus recevoir ce rapport : " + (opt.lienDesinscription || ""));
  return l.join("\n");
}

/* ------------------------------------------------------------
   Lien de désinscription : signé, pour qu'une adresse ne puisse
   pas en désabonner une autre en changeant l'identifiant.
   ------------------------------------------------------------ */
function signe(profilId, secret) {
  return crypto.createHmac("sha256", String(secret || ""))
    .update("desinscription:" + String(profilId)).digest("hex").slice(0, 32);
}

function signatureValide(profilId, signature, secret) {
  const attendue = signe(profilId, secret);
  const a = Buffer.from(attendue), b = Buffer.from(String(signature || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = {
  joursRestants, bilan, meriteEnvoi, objet, html, texte,
  signe, signatureValide, euros
};
