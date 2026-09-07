/* Tests du lecteur de relevés — node --test
   On y fige les pièges déjà rencontrés, pour qu'une « correction »
   ne les réintroduise pas : la ligne couverte par Uber qui ne coûte
   rien au restaurant, et la fenêtre de 7 jours de Deliveroo. */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Ardoise = require("../public/parseur.js");

const LUNDI = new Date(2026, 2, 9); // lundi 9 mars 2026, heure locale

test("Uber Eats : une ligne payée par la plateforme n'est pas un prélèvement", () => {
  // 31 € remboursés au client, 0 € facturé au restaurant : il n'a rien perdu.
  const csv = [
    "Order ID,Order Date,Issue Type,Merchant charge amount,Amount covered by Uber",
    "ORD-1,2026-03-01,Order not received,0,31",
    "ORD-2,2026-03-01,Order not received,18.40,0"
  ].join("\n");

  const r = Ardoise.analyse(csv, null, null, LUNDI);
  assert.equal(r.ok, true);
  assert.equal(r.plateforme, "uber");
  assert.equal(r.tot, 1, "seule la ligne réellement facturée compte");
  assert.equal(r.lignes[0].ref, "ORD-2");
  assert.equal(r.somme, 18.4);
});

test("Uber Eats : fenêtre de 30 jours à compter de la date de commande", () => {
  assert.equal(Ardoise.PLATEFORMES.uber.fenetre, 30);
  assert.equal(Ardoise.PLATEFORMES.uber.depuis, "commande");
});

test("Deliveroo : 7 jours, à compter de la date de remboursement", () => {
  assert.equal(Ardoise.PLATEFORMES.deliveroo.fenetre, 7);
  assert.equal(Ardoise.PLATEFORMES.deliveroo.depuis, "remboursement");

  const csv = [
    "Order reference,Order date,Refund date,Refund reason,Refund amount",
    "DEL-1,2026-01-01,2026-01-20,Missing item,12.50"
  ].join("\n");

  const r = Ardoise.analyse(csv, "deliveroo", null, LUNDI);
  assert.equal(r.ok, true);
  // la date retenue est celle du remboursement, pas celle de la commande
  assert.equal(r.lignes[0].dateRef, "2026-01-20");
});

test("Just Eat : le délai reste signalé comme non vérifié", () => {
  assert.equal(Ardoise.PLATEFORMES.justeat.fenetre, null);
  assert.equal(Ardoise.PLATEFORMES.justeat.verifie, false);
});

test("chaque ligne repart avec sa date de référence, pour le rapport du lundi", () => {
  const csv = [
    "Order ID,Order Date,Issue Type,Merchant charge amount",
    "ORD-1,2026-03-01,Order not received,18.40",
    "ORD-2,,Order not received,9.00"
  ].join("\n");

  const r = Ardoise.analyse(csv, null, null, LUNDI);
  const parRef = {};
  r.lignes.forEach((l) => { parRef[l.ref] = l; });

  assert.equal(parRef["ORD-1"].dateRef, "2026-03-01");
  assert.equal(parRef["ORD-2"].dateRef, null, "sans date lisible, on n'en fabrique pas");
});

test("isoJour ne décale pas la date selon le fuseau", () => {
  assert.equal(Ardoise.isoJour(new Date(2026, 2, 1, 23, 30)), "2026-03-01");
  assert.equal(Ardoise.isoJour(new Date(2026, 2, 1, 0, 15)), "2026-03-01");
  assert.equal(Ardoise.isoJour(null), null);
});

test("les montants européens et les parenthèses sont lus correctement", () => {
  assert.equal(Ardoise.nombre("1 234,56 €"), 1234.56);
  assert.equal(Ardoise.nombre("(12.30)"), -12.3);
  assert.equal(Ardoise.nombre("-12,30"), -12.3);
  assert.equal(Ardoise.nombre(""), 0);
});

test("colonne des montants introuvable : on le dit au lieu de deviner", () => {
  const csv = ["Colonne A,Colonne B,Colonne C", "x,y,z"].join("\n");
  const r = Ardoise.analyse(csv, null, null, LUNDI);
  assert.equal(r.ok, false);
  assert.equal(r.besoinMap, true);
  assert.match(r.probleme, /colonne des montants/i);
});

test("une commande annulée avant préparation n'est pas présentée comme contestable", () => {
  const csv = [
    "Order ID,Order Date,Issue Type,Merchant charge amount",
    "ORD-1,2026-03-01,Cancelled by customer before preparation,10.00"
  ].join("\n");

  const r = Ardoise.analyse(csv, null, null, LUNDI);
  assert.equal(r.rec, 0);
  assert.equal(r.somme, 0);
  assert.equal(r.lignes[0].e, "non");
});
