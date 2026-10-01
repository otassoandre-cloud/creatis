#!/usr/bin/env node
/**
 * Contrôle les consignes AVANT de publier. Bloque au lieu de rappeler.
 *
 *   node scripts/controle-avant-publication.js                 tout le plan du jour
 *   node scripts/controle-avant-publication.js --piece <id>    une pièce du plan
 *   node scripts/controle-avant-publication.js --cible tiktok --piece <id>  *        [--gabarit <nom>]                                   une publication hors plan
 *
 * Code 0 = rien ne s'y oppose. Code 5 = une consigne est violée, ne pas publier.
 *
 * ── POURQUOI CE FICHIER EXISTE ───────────────────────────────────────────
 * `CONSIGNES.md` est de la prose. Le 28/09 j'y ai écrit noir sur blanc que
 * CHAQUE vidéo longue doit être promue par des Shorts, en la marquant « la
 * consigne la plus souvent oubliée » — puis j'ai publié la vidéo longue de 11 h
 * et je n'ai pas fait les Shorts, le jour même, quelques heures après l'avoir
 * écrit.
 *
 * Le problème n'est pas la mémoire : c'est qu'un texte ne force rien. Une
 * consigne qui compte doit devenir une VÉRIFICATION qui refuse, pas un rappel
 * qu'on est censé relire. Tout ce qui est contrôlable ici doit l'être ici, et
 * plus dans un paragraphe.
 *
 * ── CE QU'IL CONTRÔLE ────────────────────────────────────────────────────
 * 1. Le doublon : une pièce déjà publiée sur ce compte ne repart pas.
 * 2. La variété visuelle : pas deux fois le même gabarit d'affilée sur un compte.
 * 3. La promotion : si une vidéo longue est publiée aujourd'hui, il faut des
 *    Shorts qui y renvoient, sinon la journée est incomplète.
 * 4. Le son : une pièce marquée muette sans son posé à la publication est signalée.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const PLAN = path.join(RACINE, 'social', 'plan-jour.json');
const FILE = path.join(RACINE, 'social', 'file-attente.json');
const REGISTRE = path.join(RACINE, 'social', 'registre.json');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const PIECE = arg('piece', '');
/* ── LE TROU DU 01/10 ──────────────────────────────────────────────────────
   Pendant une journée entière ce contrôle n'a RIEN contrôlé des publications
   faites à la main. Il ne parcourait que les créneaux « en attente » du plan
   du jour ; appelé en direct avec `--compte tiktok --piece …`, il ne trouvait
   aucun créneau correspondant, donc aucune faute, donc « rien ne s'oppose ».
   Il a laissé passer une republication sur un compte où la pièce était déjà
   en ligne.

   Une publication hors plan est maintenant transformée en créneau examiné par
   les mêmes règles. Et `--cible` sans `--piece` (ou l'inverse) est refusé :
   un contrôle qu'on peut appeler à moitié est un contrôle qu'on contourne. */
const ALIAS = { instagram: 'g1', tiktok: 't1', youtube: 'y1', g1: 'g1', t1: 't1', y1: 'y1' };
const CIBLE_BRUTE = arg('cible', arg('compte', ''));
const CIBLE = CIBLE_BRUTE ? ALIAS[CIBLE_BRUTE.toLowerCase()] : '';
const GABARIT = arg('gabarit', '');

if (CIBLE_BRUTE && !CIBLE) {
  console.error(`Cible inconnue : « ${CIBLE_BRUTE} ». Attendu : instagram|tiktok|youtube (ou g1|t1|y1).`);
  process.exit(2);
}
if (CIBLE && !PIECE) {
  console.error('--cible sans --piece : impossible de contrôler quoi que ce soit.');
  process.exit(2);
}

const lire = (f, defaut) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : defaut);

const plan = lire(PLAN, { creneaux: [] });
const file = lire(FILE, { pieces: [] });
const registre = lire(REGISTRE, { pieces: [] });

const pieces = new Map((file.pieces || []).map((p) => [p.id, p]));

/* Une publication demandée en ligne de commande devient un créneau à part
   entière : elle traverse exactement les mêmes règles que celles du plan. */
if (CIBLE && PIECE) {
  plan.creneaux = (plan.creneaux || []).concat([
    { heure: 'maintenant', piece: PIECE, cible: CIBLE, statut: 'en attente' },
  ]);
  if (GABARIT && !pieces.has(PIECE)) pieces.set(PIECE, { id: PIECE, gabarit: GABARIT });
  else if (GABARIT) pieces.get(PIECE).gabarit = GABARIT;
}
const fautes = [];
const avis = [];

/* ── 1. DOUBLON ────────────────────────────────────────────────────────── */
const dejaFait = new Set();
for (const p of registre.pieces || []) {
  /* `id` est daté et suffixé (« 2026-10-01-vocal-boiserie-t1 »), `piece` est le
     nom nu (« vocal-boiserie »). Une première version comparait `id` au nom nu :
     les deux chaînes ne pouvaient JAMAIS être égales, donc la règle « ne jamais
     republier » — la consigne la plus répétée — n'a jamais rien bloqué. Trouvé
     le 01/10 en vérifiant pourquoi un doublon TikTok passait. */
  const nom = p.piece || p.id;
  if (p.statut === 'publié' && p.compte && nom) dejaFait.add(`${nom}@${p.compte}`);
}
for (const c of plan.creneaux || []) {
  if (c.statut !== 'en attente' || !c.piece || !c.cible) continue;
  if (PIECE && c.piece !== PIECE) continue;
  const p = pieces.get(c.piece);
  if (p?.deja_publie?.[c.cible]) {
    fautes.push(`${c.heure} — « ${c.piece} » a DÉJÀ été publiée sur ${c.cible} (${p.deja_publie[c.cible]})`);
  }
  if (dejaFait.has(`${c.piece}@${c.cible}`)) {
    fautes.push(`${c.heure} — « ${c.piece} » figure déjà au registre pour ${c.cible}`);
  }
}

/* ── 2. VARIÉTÉ VISUELLE ───────────────────────────────────────────────────
   Deux publications d'affilée sur un compte ne doivent pas partager le même
   gabarit : la grille de profil donnerait l'impression d'une vidéo répétée. */
const dernierGabarit = {};
for (const p of registre.pieces || []) {
  if (p.statut === 'publié' && p.compte && p.gabarit) dernierGabarit[p.compte] = p.gabarit;
}
const vus = { ...dernierGabarit };
for (const c of plan.creneaux || []) {
  if (c.statut !== 'en attente' || !c.piece || !c.cible) continue;
  const g = pieces.get(c.piece)?.gabarit;
  if (!g) { avis.push(`${c.heure} — « ${c.piece} » n'indique pas son gabarit, variété non vérifiable`); continue; }
  if (vus[c.cible] === g) {
    fautes.push(`${c.heure} — gabarit « ${g} » déjà utilisé juste avant sur ${c.cible} : changer de gabarit`);
  }
  vus[c.cible] = g;
}

/* ── 3. LA PROMOTION DE LA VIDÉO LONGUE ────────────────────────────────────
   LA consigne oubliée. Une vidéo longue publiée sans Shorts qui y renvoient,
   c'est une journée incomplète — et c'est arrivé le 28/09. */
const longue = (plan.creneaux || []).find((c) => c.heure === '11' && c.statut === 'publié');
if (longue) {
  const promos = (file.pieces || []).filter((p) => p.promeut === longue.url || p.promeut === longue.piece);
  const publiees = promos.filter((p) => p.statut === 'publié' || Object.keys(p.deja_publie || {}).length);
  if (!promos.length) {
    fautes.push(`La vidéo longue « ${longue.titre || longue.piece} » n'a AUCUN Short qui y renvoie.`);
    fautes.push('  → produire au moins deux Shorts avec `promeut: "<url de la vidéo longue>"`.');
  } else if (publiees.length < 2) {
    avis.push(`Vidéo longue promue par ${publiees.length} Short(s) publié(s) — viser au moins deux.`);
  }
}

/* ── 3 bis. UNE HEURE ENTRE DEUX PUBLICATIONS SUR UN MÊME COMPTE ──────────
   Consigne du 28/09, après que j'ai envoyé quatre pièces en quelques minutes.
   Deux vidéos coup sur coup se cannibalisent : la seconde arrive avant que la
   première ait fini d'être distribuée, et le compte ressemble à un robot.
   On compare à la dernière publication RÉELLE inscrite au registre. */
const UNE_HEURE = 60 * 60 * 1000;
const dernierePar = {};
for (const p of registre.pieces || []) {
  if (p.statut !== 'publié' || !p.compte || !p.publie_le) continue;
  const t = Date.parse(p.publie_le);
  if (!Number.isNaN(t) && (!dernierePar[p.compte] || t > dernierePar[p.compte].t)) {
    dernierePar[p.compte] = { t, titre: p.titre || p.id };
  }
}
for (const c of plan.creneaux || []) {
  if (c.statut !== 'en attente' || !c.cible) continue;
  const d = dernierePar[c.cible];
  if (!d) continue;
  const ecart = Date.now() - d.t;
  if (ecart < UNE_HEURE) {
    const minutes = Math.round(ecart / 60000);
    fautes.push(`${c.heure} — dernière publication sur ${c.cible} il y a ${minutes} min (« ${d.titre} »). Attendre une heure.`);
  }
}

/* ── 4. LE SON ─────────────────────────────────────────────────────────────
   Mesuré le 28/09 : source de trafic « Son » à 0 %, vues -74,8 %. Une pièce
   muette doit recevoir un son tendance À LA PUBLICATION. */
for (const c of plan.creneaux || []) {
  if (c.statut !== 'en attente' || !c.piece) continue;
  const p = pieces.get(c.piece);
  if (p?.muet && !['y1'].includes(c.cible)) {
    avis.push(`${c.heure} — « ${c.piece} » est muette : vérifier qu'un son tendance est posé sur ${c.cible}`);
  }
}

/* ── Rapport ───────────────────────────────────────────────────────────── */
console.log('CONTRÔLE AVANT PUBLICATION');
console.log('='.repeat(64));
if (!fautes.length && !avis.length) {
  console.log('Rien ne s\'oppose à la publication.');
  process.exit(0);
}
if (fautes.length) {
  console.log('\nBLOQUANT :');
  for (const f of fautes) console.log('  ✖ ' + f);
}
if (avis.length) {
  console.log('\nÀ VÉRIFIER :');
  for (const a of avis) console.log('  · ' + a);
}
console.log('');
if (fautes.length) {
  console.log('NE PAS PUBLIER tant que les points bloquants ne sont pas levés.');
  process.exit(5);
}
process.exit(0);
