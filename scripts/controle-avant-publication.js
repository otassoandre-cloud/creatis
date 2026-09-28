#!/usr/bin/env node
/**
 * Contrôle les consignes AVANT de publier. Bloque au lieu de rappeler.
 *
 *   node scripts/controle-avant-publication.js                 tout le plan du jour
 *   node scripts/controle-avant-publication.js --piece <id>    une pièce
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

const lire = (f, defaut) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : defaut);

const plan = lire(PLAN, { creneaux: [] });
const file = lire(FILE, { pieces: [] });
const registre = lire(REGISTRE, { pieces: [] });

const pieces = new Map((file.pieces || []).map((p) => [p.id, p]));
const fautes = [];
const avis = [];

/* ── 1. DOUBLON ────────────────────────────────────────────────────────── */
const dejaFait = new Set();
for (const p of registre.pieces || []) {
  if (p.statut === 'publié' && p.compte) dejaFait.add(`${p.id}@${p.compte}`);
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
