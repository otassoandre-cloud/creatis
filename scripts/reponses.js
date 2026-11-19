#!/usr/bin/env node
/**
 * RÉPONSES — laquelle des trois variantes fait répondre.
 *
 *   node scripts/reponses.js
 *
 * ── COMMENT ON SAIT QU'ON A ÉTÉ RÉPONDU ──────────────────────────────────
 * La boîte de réception d'Instagram affiche, sous chaque conversation, un
 * aperçu du DERNIER message. S'il commence par « Vous: », le dernier mot est
 * le nôtre — donc personne n'a répondu. Sinon, la personne a écrit après nous.
 *
 * C'est un signal pauvre mais honnête, et c'est le seul que le web donne sans
 * ouvrir les trente conversations une par une. Ce qu'il ne distingue pas : une
 * réponse de deux mots d'une vraie conversation. On compte donc des RÉPONSES,
 * pas des intérêts — et on l'écrit tel quel.
 *
 * ── CE QUE LE CHIFFRE VAUT, ET QUAND ─────────────────────────────────────
 * À cinq envois par jour, il faut une semaine pour que chaque variante ait
 * une dizaine de destinataires. Avant ça, un écart de une ou deux réponses ne
 * veut rien dire. Le script le rappelle plutôt que de désigner un gagnant.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const FICHIER = path.join(RACINE, 'social', 'destinataires.json');

if (!fs.existsSync(FICHIER)) {
  console.error('Aucun destinataire connu.');
  process.exit(2);
}
const base = JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
const ecrits = base.gens.filter((g) => g.ecrit_le && g.variante);

if (!ecrits.length) {
  console.log('Aucun message envoyé pour l\'instant — rien à mesurer.');
  process.exit(0);
}

(async () => {
  const { chromium } = require('playwright');
  const nav = await chromium.connectOverCDP('http://localhost:9222').catch(() => null);
  if (!nav) {
    console.error('Chrome n\'écoute pas sur 9222 : la session Instagram vit dans CE navigateur.');
    process.exit(2);
  }
  const ctx = nav.contexts()[0];
  const page = ctx.pages()[0] || (await ctx.newPage());

  await page.goto('https://www.instagram.com/direct/inbox/', {
    waitUntil: 'domcontentloaded', timeout: 90000,
  }).catch(() => {});
  await page.waitForTimeout(8000);

  /* On fait défiler : la liste est virtualisée comme tout le reste du site. */
  const fils = new Map();
  for (let k = 0; k < 10; k++) {
    const lot = await page.evaluate(() => {
      const out = [];
      for (const l of document.querySelectorAll('div[role="listitem"], a[href^="/direct/t/"]')) {
        const bloc = l.closest('div[role="listitem"]') || l;
        const t = (bloc.innerText || '').split('\n').map((x) => x.trim()).filter(Boolean);
        if (t.length >= 2) out.push({ nom: t[0], apercu: t[1] });
      }
      return out;
    }).catch(() => []);
    for (const f of lot) if (!fils.has(f.nom)) fils.set(f.nom, f.apercu);
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(900);
  }

  console.log('RÉPONSES AUX MESSAGES PRIVÉS');
  console.log('================================================================');

  /* Le nom affiché dans la boîte est le nom COMPLET, pas le pseudo : on
     rapproche en comparant en minuscules, sans ponctuation ni espaces. */
  const plat = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const index = [...fils.entries()].map(([nom, apercu]) => ({ cle: plat(nom), nom, apercu }));

  const compte = { A: { envoyes: 0, reponses: 0 }, B: { envoyes: 0, reponses: 0 }, C: { envoyes: 0, reponses: 0 } };
  const inconnus = [];

  for (const g of ecrits) {
    const c = compte[g.variante];
    if (!c) continue;
    c.envoyes += 1;
    const p = plat(g.pseudo);
    const fil = index.find((f) => f.cle.includes(p) || p.includes(f.cle));
    if (!fil) {
      inconnus.push(g.pseudo);
      continue;
    }
    const repondu = !/^vous\s*:/i.test(fil.apercu);
    if (repondu) {
      c.reponses += 1;
      g.reponse_le = g.reponse_le || new Date().toISOString().slice(0, 10);
      console.log(`  ✔ ${g.variante}  @${g.pseudo} a répondu : « ${fil.apercu.slice(0, 60)} »`);
    }
  }

  console.log('');
  for (const v of ['A', 'B', 'C']) {
    const c = compte[v];
    const nom = { A: 'méthode', B: 'question courte', C: 'preuve chiffrée' }[v];
    const taux = c.envoyes ? Math.round((c.reponses / c.envoyes) * 100) : null;
    console.log(
      `  ${v} (${nom.padEnd(16)}) : ${String(c.reponses).padStart(2)} réponse(s) sur ` +
      `${String(c.envoyes).padStart(2)} envoyé(s)${taux !== null ? `  = ${taux} %` : ''}`,
    );
  }

  if (inconnus.length) {
    console.log('');
    console.log(`${inconnus.length} conversation(s) non retrouvées dans la boîte : ${inconnus.slice(0, 6).join(', ')}`);
    console.log('Un message à quelqu\'un qui ne nous suit pas part dans « Demandes »,');
    console.log('un onglet séparé — l\'absence ici ne veut pas dire que rien n\'est parti.');
  }

  const total = Object.values(compte).reduce((s, c) => s + c.envoyes, 0);
  console.log('');
  if (total < 15) {
    console.log(`${total} messages envoyés en tout. Sous une quinzaine, un écart d'une`);
    console.log('ou deux réponses ne départage rien. Laisser tourner avant de conclure.');
  }

  fs.writeFileSync(FICHIER, JSON.stringify(base, null, 2));
  process.exit(0);
})();
