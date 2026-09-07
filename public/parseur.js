/* ============================================================
   Ardoise — lecteur de relevés
   ------------------------------------------------------------
   Les en-têtes exacts varient selon le pays, la langue et la
   version du portail. On ne code donc AUCUN en-tête en dur :
   on normalise, puis on rapproche par alias. Si une colonne
   essentielle reste introuvable, on le DIT au lieu de sortir
   un chiffre faux.
   ============================================================ */

var Ardoise = (function () {
  "use strict";

  /* ---------- délais réels, par plateforme ----------
     Uber Eats : 30 jours à compter de la DATE DE COMMANDE.
       source : help.uber.com, uber.com/blog, merchants.ubereats.com
     Deliveroo : 7 jours à compter de la DATE D'ÉMISSION DU REMBOURSEMENT.
       source : help.deliveroo.com (Partner Hub, onglet Refund disputes)
     Just Eat : non vérifié — on ne devine pas, on prévient.        */
  var PLATEFORMES = {
    uber: {
      nom: "Uber Eats",
      fenetre: 30,
      depuis: "commande",
      verifie: true,
      ou: "Uber Eats Manager → Reports → Order Errors (Transaction)"
    },
    deliveroo: {
      nom: "Deliveroo",
      fenetre: 7,
      depuis: "remboursement",
      verifie: true,
      ou: "Partner Hub → Invoices (CSV), ou Sales → Refunds"
    },
    justeat: {
      nom: "Just Eat",
      fenetre: null,
      depuis: "commande",
      verifie: false,
      ou: "Partner Centre → Facturation"
    },
    inconnu: {
      nom: "Plateforme non identifiée",
      fenetre: null,
      depuis: "commande",
      verifie: false,
      ou: ""
    }
  };

  /* ---------- normalisation ---------- */
  function norm(s) {
    return String(s == null ? "" : s)
      .replace(/^\uFEFF/, "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  /* ---------- découpage CSV (gère les guillemets) ---------- */
  function detecteSep(ligne) {
    var cand = [";", ",", "\t", "|"], best = ",", n = -1;
    cand.forEach(function (c) {
      var k = ligne.split(c).length;
      if (k > n) { n = k; best = c; }
    });
    return best;
  }

  function coupe(ligne, sep) {
    var out = [], cur = "", q = false, i;
    for (i = 0; i < ligne.length; i++) {
      var ch = ligne[i];
      if (ch === '"') {
        if (q && ligne[i + 1] === '"') { cur += '"'; i++; }
        else q = !q;
      } else if (ch === sep && !q) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(function (x) { return x.trim(); });
  }

  function lignesDe(texte) {
    return texte.replace(/\r\n?/g, "\n").split("\n").filter(function (l) {
      return l.trim() !== "";
    });
  }

  /* ---------- où est la ligne d'en-tête ? ----------
     Les exports comportent souvent des lignes de titre avant
     le vrai en-tête. On prend la première ligne qui ressemble
     à des noms de colonnes (≥3 cellules, majorité non numérique). */
  function trouveEntete(lignes, sep) {
    for (var i = 0; i < Math.min(lignes.length, 25); i++) {
      var c = coupe(lignes[i], sep);
      if (c.length < 3) continue;
      var pleines = c.filter(function (x) { return x !== ""; });
      if (pleines.length < 3) continue;
      var nums = pleines.filter(function (x) { return /^-?[\d\s.,€$£]+$/.test(x); });
      if (nums.length / pleines.length < 0.4) return i;
    }
    return -1;
  }

  /* ---------- alias de colonnes (FR + EN) ---------- */
  var ALIAS = {
    ref: ["order id", "order uuid", "orders id", "order number", "id commande",
          "numero de commande", "reference", "reference commande", "order reference",
          "commande", "workflow uuid", "order"],
    date: ["order date", "date", "date de commande", "order placed", "date time",
           "date heure", "transaction date", "date de la commande", "order datetime"],
    dateRemb: ["refund date", "date du remboursement", "adjustment date",
               "date de remboursement", "issue date", "date d emission", "refund issued"],
    motif: ["issue type", "error type", "reason", "motif", "refund reason",
            "type d erreur", "raison", "claim reason", "type de probleme",
            "order status", "statut", "statut de la commande", "description",
            "libelle", "type", "category"],
    montant: ["merchant charge amount", "montant facture au commercant",
              "adjustment", "adjustments", "ajustement", "ajustements",
              "amount charged to merchant", "refund amount", "montant du remboursement",
              "montant", "amount", "total", "charge", "deduction", "credit note",
              "montant impute", "store refund", "montant a la charge du restaurant"],
    couvert: ["amount covered by uber", "covered by uber", "montant couvert",
              "platform covered", "couvert par la plateforme"],
    article: ["item", "items", "item s in error", "article", "articles",
              "menu item", "produit"]
  };

  function trouveCol(entetes, cles) {
    var i, j;
    /* passe 1 : correspondance exacte */
    for (j = 0; j < cles.length; j++)
      for (i = 0; i < entetes.length; i++)
        if (entetes[i] === cles[j]) return i;
    /* passe 2 : contenu */
    for (j = 0; j < cles.length; j++)
      for (i = 0; i < entetes.length; i++)
        if (entetes[i].indexOf(cles[j]) !== -1) return i;
    return -1;
  }

  /* ---------- de quelle plateforme vient ce fichier ? ---------- */
  function detectePlateforme(entetes, texteBrut) {
    var t = norm(texteBrut.slice(0, 4000));
    var e = entetes.join(" ");
    if (/\buber\b|ubereats|uber eats/.test(e + " " + t)) return "uber";
    if (/deliveroo/.test(e + " " + t)) return "deliveroo";
    if (/just ?eat|takeaway|skipthedishes/.test(e + " " + t)) return "justeat";
    /* signatures de colonnes, à défaut du nom de marque */
    if (e.indexOf("merchant charge amount") !== -1 ||
        e.indexOf("amount covered by uber") !== -1 ||
        (e.indexOf("dining mode") !== -1 && e.indexOf("order channel") !== -1)) return "uber";
    if (e.indexOf("credit note") !== -1) return "deliveroo";
    return "inconnu";
  }

  /* ---------- montants : « 1 234,56 € », « (12.30) », « -12,30 » ---------- */
  function nombre(v) {
    if (v == null) return 0;
    var s = String(v).trim();
    if (s === "") return 0;
    var neg = /^\(.*\)$/.test(s) || /^-/.test(s);
    s = s.replace(/[()]/g, "").replace(/[^\d.,-]/g, "");
    var virg = s.lastIndexOf(","), pt = s.lastIndexOf(".");
    if (virg > pt) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
    var n = parseFloat(s);
    if (isNaN(n)) return 0;
    n = Math.abs(n);
    return neg ? -n : n;
  }

  /* ---------- dates : JJ/MM/AAAA, AAAA-MM-JJ, avec heure ---------- */
  function date(v) {
    if (!v) return null;
    var s = String(v).trim();
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/.exec(s);
    if (m) {
      var a = +m[3]; if (a < 100) a += 2000;
      return new Date(a, +m[2] - 1, +m[1]);
    }
    var d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  /* AAAA-MM-JJ, sans décalage de fuseau (toISOString reculerait d'un
     jour pour les fuseaux à l'est de Greenwich). Cette date est ce qui
     permet au rapport hebdomadaire de recalculer les jours restants
     plus tard : sans elle, le compte à rebours resterait figé au jour
     de l'import. */
  function isoJour(d) {
    if (!d) return null;
    var m = d.getMonth() + 1, j = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (j < 10 ? "0" : "") + j;
  }

  /* ---------- règles de contestabilité ---------- */
  var REGLES = [
    { c: /non livr|jamais livr|marqu.* livr|never (arrived|delivered)|not delivered|undelivered|missing order|order not received/i,
      l: "Commande non livrée", r: true,
      p: "Marquée livrée sans remise. Preuve de remise exigible." },
    { c: /manquant|missing item|item missing|incomplete/i,
      l: "Article manquant", r: true,
      p: "Réclamation sans preuve. Contestable si la préparation est tracée." },
    { c: /incorrect|erreur de pr|mauvais|wrong item|wrong order|inaccurate/i,
      l: "Article incorrect", r: true,
      p: "Contestable si le ticket de préparation correspond." },
    { c: /annul.*avant|cancel.*before|canceled by customer|unfulfilled/i,
      l: "Annulation avant préparation", r: false,
      p: "Aucun coût matière engagé. Non contestable." },
    { c: /annul.*apr[èe]s|apr[èe]s pr[ée]par|cancel.*after|cancelled|canceled/i,
      l: "Annulation après préparation", r: true,
      p: "Plat produit puis annulé. Le coût matière est dû." },
    { c: /ajustement|adjustment|order error/i,
      l: "Ajustement d'erreur", r: true,
      p: "Prélèvement sans motif détaillé. Demander la ventilation." },
    { c: /froid|temp[ée]rature|retard|late|cold|quality|qualit/i,
      l: "Retard ou qualité", r: false,
      p: "Rarement gagné sans horodatage de remise." },
    { c: /commission|frais|service fee|delivery fee/i,
      l: "Commission de plateforme", r: false,
      p: "Prévu au contrat. Non contestable." },
    { c: /promo|remise|marketing|voucher|discount|publicit|advertis/i,
      l: "Participation promotionnelle", r: false,
      p: "Offre souscrite. Non contestable." }
  ];

  function classe(motif) {
    for (var i = 0; i < REGLES.length; i++)
      if (REGLES[i].c.test(motif)) return REGLES[i];
    return { l: motif || "Motif non reconnu", r: false,
             p: "Motif non reconnu par le moteur. À vérifier à la main." };
  }

  /* ============================================================
     Analyse d'un fichier. Renvoie toujours un objet exploitable :
     { ok, plateforme, fenetre, lignes[], colonnes[], probleme }

     `aujourdhui` n'est là que pour les tests : sans elle, les jours
     restants dépendraient de la date d'exécution et rien ne serait
     vérifiable. En production, on ne la passe pas.
     ============================================================ */
  function analyse(texte, forcePlateforme, mapManuel, aujourdhui) {
    var lignes = lignesDe(texte);
    if (lignes.length < 2)
      return { ok: false, probleme: "Le fichier est vide ou ne contient qu'une ligne." };

    var sep = detecteSep(lignes[0]);
    var iEnt = trouveEntete(lignes, sep);
    if (iEnt === -1)
      return { ok: false, probleme: "Aucune ligne d'en-tête reconnaissable. Le fichier est-il bien un export CSV du portail ?" };

    var brutEnt = coupe(lignes[iEnt], sep);
    var ent = brutEnt.map(norm);

    var pf = forcePlateforme || detectePlateforme(ent, texte);
    var infos = PLATEFORMES[pf] || PLATEFORMES.inconnu;

    var col = mapManuel || {
      ref: trouveCol(ent, ALIAS.ref),
      date: trouveCol(ent, ALIAS.date),
      dateRemb: trouveCol(ent, ALIAS.dateRemb),
      motif: trouveCol(ent, ALIAS.motif),
      montant: trouveCol(ent, ALIAS.montant),
      couvert: trouveCol(ent, ALIAS.couvert),
      article: trouveCol(ent, ALIAS.article)
    };

    /* colonne montant introuvable = on ne devine pas */
    if (col.montant === -1) {
      return {
        ok: false, plateforme: pf, infos: infos, colonnes: brutEnt,
        besoinMap: true,
        probleme: "Impossible d'identifier la colonne des montants prélevés. Indiquez-la et je relance."
      };
    }

    var auj = aujourdhui ? new Date(aujourdhui) : new Date();
    auj.setHours(0, 0, 0, 0);
    var res = [], tot = 0, rec = 0, exp = 0, inconnu = 0, somme = 0, urg = [];

    for (var i = iEnt + 1; i < lignes.length; i++) {
      var c = coupe(lignes[i], sep);
      if (c.length < 2) continue;

      var mt = nombre(c[col.montant]);
      if (mt === 0) continue;              /* pas de prélèvement sur cette ligne */
      mt = Math.abs(mt);
      tot++;

      var ref = col.ref > -1 ? (c[col.ref] || "—") : "—";
      var motifBrut = col.motif > -1 ? (c[col.motif] || "") : "";
      var art = col.article > -1 ? (c[col.article] || "") : "";
      var g = classe(motifBrut + " " + art);

      /* la date de référence dépend de la plateforme */
      var d = null;
      if (infos.depuis === "remboursement" && col.dateRemb > -1) d = date(c[col.dateRemb]);
      if (!d && col.date > -1) d = date(c[col.date]);
      if (!d && col.dateRemb > -1) d = date(c[col.dateRemb]);

      var reste = null;
      if (d && infos.fenetre) reste = infos.fenetre - Math.floor((auj - d) / 86400000);

      var etat, st;
      if (!g.r) { etat = "non"; st = "Non contestable"; }
      else if (!infos.fenetre) { etat = "rec"; st = "Délai non vérifié"; rec++; somme += mt; inconnu++; }
      else if (reste === null) { etat = "rec"; st = "Date illisible"; rec++; somme += mt; }
      else if (reste <= 0) { etat = "exp"; st = "Fenêtre fermée"; exp++; }
      else {
        etat = "rec"; st = reste + " j pour déposer"; rec++; somme += mt;
        if (reste <= Math.max(2, Math.round(infos.fenetre * 0.25)))
          urg.push({ ref: ref, j: reste, mt: mt });
      }

      res.push({ ref: ref, l: g.l, p: g.p, mt: mt, st: st, e: etat,
                 dateRef: isoJour(d),
                 reste: reste === null ? 999 : reste });
    }

    var ordre = { rec: 0, exp: 1, non: 2 };
    res.sort(function (a, b) {
      if (ordre[a.e] !== ordre[b.e]) return ordre[a.e] - ordre[b.e];
      if (a.e === "rec" && a.reste !== b.reste) return a.reste - b.reste;
      return b.mt - a.mt;
    });
    urg.sort(function (a, b) { return a.j - b.j; });

    return {
      ok: true, plateforme: pf, infos: infos, colonnes: brutEnt, map: col,
      lignes: res, tot: tot, rec: rec, exp: exp, somme: somme, urg: urg,
      delaiNonVerifie: !infos.fenetre
    };
  }

  return {
    analyse: analyse, PLATEFORMES: PLATEFORMES, norm: norm,
    nombre: nombre, date: date, isoJour: isoJour, classe: classe, ALIAS: ALIAS
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Ardoise;
