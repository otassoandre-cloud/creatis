/* Tests du rapport hebdomadaire — node --test
   Ce qui est vérifié ici, ce sont les règles du produit :
   ne jamais inventer un chiffre, ne jamais promettre un montant
   dont la fenêtre est fermée, ne jamais écrire un courrier vide. */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../lib/rapport");

const LUNDI = new Date("2026-03-09T06:00:00Z"); // lundi

function prelevement(x) {
  return Object.assign({ id: "p1", profil: "u1", import: "i1", reference: "ORD-1",
                         motif: "Commande non livrée", montant: 20, date_ref: "2026-03-01" }, x);
}
const IMPORTS = {
  i1: { id: "i1", fenetre_jours: 30, plateforme: "Uber Eats", delai_verifie: true },
  i2: { id: "i2", fenetre_jours: 7,  plateforme: "Deliveroo", delai_verifie: true },
  i3: { id: "i3", fenetre_jours: null, plateforme: "Just Eat", delai_verifie: false }
};

test("joursRestants compte à partir de la date de référence", () => {
  assert.equal(R.joursRestants("2026-03-01", 30, LUNDI), 22);
  assert.equal(R.joursRestants("2026-03-08", 7, LUNDI), 6);
  assert.equal(R.joursRestants("2026-03-09", 30, LUNDI), 30);
});

test("joursRestants renvoie null quand l'information manque — jamais 0", () => {
  assert.equal(R.joursRestants(null, 30, LUNDI), null);
  assert.equal(R.joursRestants("2026-03-01", null, LUNDI), null);
  assert.equal(R.joursRestants("pas une date", 30, LUNDI), null);
});

test("le fuseau ne décale pas le compte à rebours", () => {
  // une date sans heure ne doit pas basculer d'un jour selon le fuseau du serveur
  assert.equal(R.joursRestants("2026-03-01T00:00:00", 30, LUNDI), 22);
  assert.equal(R.joursRestants("2026-03-01T23:30:00", 30, LUNDI), 22);
});

test("une fenêtre fermée ne compte pas dans le montant récupérable", () => {
  const b = R.bilan([
    prelevement({ id: "a", montant: 31, date_ref: "2026-02-01" }), // 30 j dépassés
    prelevement({ id: "b", montant: 12, date_ref: "2026-03-05" })  // encore ouverte
  ], IMPORTS, LUNDI);

  assert.equal(b.montantTotal, 12);
  assert.equal(b.nbTotal, 1);
  assert.equal(b.urgents.length + b.semaine.length + b.plusTard.length, 1);
});

test("une fenêtre fermée dans les 7 derniers jours est signalée, pas promise", () => {
  const b = R.bilan([
    prelevement({ id: "a", montant: 40, import: "i2", date_ref: "2026-03-01" }) // 7 j → -1
  ], IMPORTS, LUNDI);

  assert.equal(b.fermesCetteSemaine.length, 1);
  assert.equal(b.montantFerme, 40);
  assert.equal(b.montantTotal, 0, "un montant perdu ne doit jamais gonfler le récupérable");
});

test("une fenêtre fermée depuis plus d'une semaine n'est plus rappelée", () => {
  const b = R.bilan([
    prelevement({ id: "a", montant: 40, import: "i2", date_ref: "2026-01-05" })
  ], IMPORTS, LUNDI);

  assert.equal(b.fermesCetteSemaine.length, 0);
  assert.equal(b.montantFerme, 0);
});

test("un délai non vérifié est rangé à part, sans compte à rebours inventé", () => {
  const b = R.bilan([
    prelevement({ id: "a", montant: 25, import: "i3" })            // Just Eat, fenêtre inconnue
  ], IMPORTS, LUNDI);

  assert.equal(b.sansDelai.length, 1);
  assert.equal(b.sansDelai[0].jours, null);
  assert.equal(b.sansDelai[0].delaiVerifie, false);
  assert.equal(b.montantTotal, 25, "il reste déposable : on ne le retire pas du total");
});

test("le tri met le plus pressé en tête", () => {
  const b = R.bilan([
    prelevement({ id: "a", montant: 10, import: "i2", date_ref: "2026-03-08" }), // 6 j
    prelevement({ id: "b", montant: 50, import: "i2", date_ref: "2026-03-07" }), // 5 j
    prelevement({ id: "c", montant: 15, import: "i2", date_ref: "2026-03-09" })  // 7 j
  ], IMPORTS, LUNDI);

  assert.deepEqual(b.semaine.map((l) => l.id), ["b", "a", "c"]);
});

test("trois jours ou moins passent en urgent", () => {
  const b = R.bilan([
    prelevement({ id: "a", import: "i2", date_ref: "2026-03-05" }), // 3 j
    prelevement({ id: "b", import: "i2", date_ref: "2026-03-06" })  // 4 j
  ], IMPORTS, LUNDI);

  assert.deepEqual(b.urgents.map((l) => l.id), ["a"]);
  assert.deepEqual(b.semaine.map((l) => l.id), ["b"]);
});

test("les montants sont additionnés au centime, sans dérive flottante", () => {
  const b = R.bilan([
    prelevement({ id: "a", montant: 10.1, date_ref: "2026-03-05" }),
    prelevement({ id: "b", montant: 20.2, date_ref: "2026-03-05" })
  ], IMPORTS, LUNDI);

  assert.equal(b.montantTotal, 30.3);
});

test("aucun courrier quand il n'y a rien à déposer", () => {
  assert.equal(R.meriteEnvoi(R.bilan([], IMPORTS, LUNDI)), false);
  // uniquement des fenêtres fermées : rien à faire, donc rien à écrire
  const ferme = R.bilan([prelevement({ import: "i2", date_ref: "2026-03-01" })], IMPORTS, LUNDI);
  assert.equal(R.meriteEnvoi(ferme), false);
});

test("l'objet annonce l'urgence quand il y en a une", () => {
  const urgent = R.bilan([
    prelevement({ montant: 31.5, import: "i2", date_ref: "2026-03-06" }) // 4 j → pas urgent
  ], IMPORTS, LUNDI);
  assert.match(R.objet(urgent), /récupérable/);

  const presse = R.bilan([
    prelevement({ montant: 31.5, import: "i2", date_ref: "2026-03-07" }) // 5 j
  ], IMPORTS, LUNDI);
  assert.match(R.objet(presse), /récupérable/);

  const tresPresse = R.bilan([
    prelevement({ montant: 31.5, import: "i2", date_ref: "2026-03-05" }) // 3 j
  ], IMPORTS, LUNDI);
  assert.match(R.objet(tresPresse), /31,50 € à déposer sous 3 jours/);
});

test("le courrier n'affiche que des montants venus des lignes", () => {
  const b = R.bilan([
    prelevement({ id: "a", montant: 31.5, import: "i2", date_ref: "2026-03-05" }),
    prelevement({ id: "b", montant: 8.5, import: "i2", date_ref: "2026-03-08" })
  ], IMPORTS, LUNDI);
  const h = R.html(b, { lienApp: "https://exemple.fr/app.html", lienDesinscription: "https://exemple.fr/d" });

  assert.match(h, /31,50 €/);
  assert.match(h, /8,50 €/);
  assert.match(h, /40,00 €/);              // le total, et rien d'autre
  const montants = h.match(/\d+,\d{2} €/g);
  assert.deepEqual([...new Set(montants)].sort(), ["31,50 €", "40,00 €", "8,50 €"]);
});

test("le courrier échappe ce qui vient du fichier du client", () => {
  const b = R.bilan([
    prelevement({ motif: '<script>alert(1)</script>', reference: 'A"B', import: "i2", date_ref: "2026-03-05" })
  ], IMPORTS, LUNDI);
  const h = R.html(b, {});

  assert.doesNotMatch(h, /<script>alert/);
  assert.match(h, /&lt;script&gt;/);
  assert.match(h, /A&quot;B/);
});

test("le courrier porte le lien de désinscription", () => {
  const b = R.bilan([prelevement({ import: "i2", date_ref: "2026-03-05" })], IMPORTS, LUNDI);
  const opt = { lienApp: "https://exemple.fr/app.html", lienDesinscription: "https://exemple.fr/api/desinscription?p=u1&s=abc" };
  assert.match(R.html(b, opt), /desinscription\?p=u1&amp;s=abc/);
  assert.match(R.texte(b, opt), /desinscription\?p=u1&s=abc/);
});

test("la version texte reprend les mêmes montants que la version HTML", () => {
  const b = R.bilan([
    prelevement({ montant: 31.5, import: "i2", date_ref: "2026-03-05" })
  ], IMPORTS, LUNDI);
  assert.match(R.texte(b, {}), /31,50 €/);
});

test("un lien de désinscription signé ne vaut que pour son profil", () => {
  const s = R.signe("u1", "secret");
  assert.equal(R.signatureValide("u1", s, "secret"), true);
  assert.equal(R.signatureValide("u2", s, "secret"), false, "changer l'identifiant doit invalider");
  assert.equal(R.signatureValide("u1", s, "autre-secret"), false);
  assert.equal(R.signatureValide("u1", "", "secret"), false);
  assert.equal(R.signatureValide("u1", s.slice(0, 10), "secret"), false, "une signature tronquée est refusée");
});
