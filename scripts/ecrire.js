#!/usr/bin/env node
/**
 * ÉCRIRE — un message privé à ceux qui se sont manifestés.
 *
 *   node scripts/ecrire.js                      ESSAI À BLANC : montre, n'envoie rien
 *   node scripts/ecrire.js --envoyer            envoie pour de bon
 *   node scripts/ecrire.js --combien 3          moins que le plafond du jour
 *   node scripts/ecrire.js --reseau instagram
 *
 * ── POURQUOI L'ESSAI À BLANC EST LE DÉFAUT ───────────────────────────────
 * Un message privé est irréversible et visible par un humain. Le défaut
 * montre donc le texte exact, destinataire par destinataire, et n'envoie
 * rien. `--envoyer` est un geste conscient.
 *
 * ── POURQUOI SI PEU, ET SI LENTEMENT ─────────────────────────────────────
 * Instagram bloque les comptes qui écrivent en rafale à des gens qui ne les
 * suivent pas : le message part en « Invitations », puis l'envoi est coupé
 * pendant des jours — et sur un compte à 92 abonnés, un blocage coûte plus
 * que ce que trente messages rapportent. D'où :
 *   · CINQ messages par jour et par réseau, plafond en dur ;
 *   · une attente aléatoire de 45 à 110 s entre deux ;
 *   · personne n'est écrit deux fois, jamais (registre `ecrit_le`).
 *
 * ── CE QUE LE MESSAGE DIT, ET CE QU'IL NE FAIT PAS ───────────────────────
 * Il ne vend pas et ne pose AUCUN lien. C'est la même règle que le contenu,
 * et elle est mesurée : la vidéo qui montrait le produit a fait 48 vues,
 * celle qui parlait du problème du spectateur 1 207. Un lien dans un premier
 * message privé à un inconnu, c'est du démarchage, et ça se signale.
 *
 * Il donne donc une méthode utilisable tout de suite, nomme Créatis en une
 * incise honnête, et pose une question à laquelle on peut répondre. Le lien
 * vient si la personne répond — pas avant.
 *
 * ── CE QUI N'EST PAS POSSIBLE, ET QU'ON N'INVENTE PAS ────────────────────
 * YouTube n'a pas de messagerie privée, et n'expose pas qui a aimé. Il n'y a
 * donc rien à envoyer là-bas : seules les réponses en commentaire existent,
 * et elles se font par `scripts/repondre.js`. « Qui a regardé » n'existe sur
 * aucune des trois plateformes.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const PROFIL = path.join(RACINE, '.playwright-profile-social');
const SOCIAL = path.join(RACINE, 'social');
const FICHIER = path.join(SOCIAL, 'destinataires.json');

const jour = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

const arg = (n, d) => {
  const i = process.argv.indexOf('--' + n);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const ENVOYER = process.argv.includes('--envoyer');
const RESEAU = arg('reseau', 'instagram');
const PLAFOND = 5;
const COMBIEN = Math.min(parseInt(arg('combien', String(PLAFOND)), 10), PLAFOND);

/**
 * ── TROIS MESSAGES, ET UNE SEULE VARIABLE À LA FOIS ──────────────────────
 * Demandé le 08/10 : tester trois messages et voir lequel obtient le plus de
 * réponses. Chaque variante porte UNE hypothèse, sinon on ne saura pas ce qui
 * a joué :
 *
 *   A — MÉTHODE   : on donne le test des 10 secondes, on nomme Créatis en
 *                   incise, on propose de relire un passage.
 *                   Hypothèse : la valeur immédiate fait répondre.
 *   B — QUESTION  : trois lignes, aucune méthode, aucun produit, une question
 *                   simple. Hypothèse : c'est la brièveté qui fait répondre,
 *                   pas le contenu.
 *   C — PREUVE    : on ouvre sur le chiffre mesuré (48 → 1 207) et on propose
 *                   les trois causes. Hypothèse : c'est la preuve qui arrête.
 *
 * Les trois tutoient, aucune ne pose de lien, et toutes finissent par une
 * question — ce sont les constantes. Seul l'angle change.
 *
 * L'attribution est un tourniquet sur l'ordre de la file : avec cinq envois
 * par jour, tirer au sort déséquilibrerait les groupes pendant une semaine.
 */
const VARIANTES = {
  A: (p, r) =>
    `Salut ${p} 👋 merci pour ${r === "s'est abonné" ? "l'abonnement" : 'le like'}.\n\n` +
    `Le truc que je publie en ce moment, c'est le test des 10 secondes : tu montres ton passage à quelqu'un qui n'a pas vu la vidéo d'origine. S'il demande le contexte, le clip est mort — même si le moment est excellent.\n\n` +
    `Si t'as un passage que t'hésites à publier, envoie-le, je te dis en deux lignes s'il tient tout seul. (Je bosse sur Créatis, qui fait ce repérage automatiquement, mais le test marche avec n'importe quel montage.)`,

  B: (p) =>
    `Salut ${p} 👋\n\n` +
    `Tu montes quoi en ce moment ?\n\n` +
    `Je demande parce que je passe mes journées à découper des vidéos longues en shorts, et je cherche à voir sur quoi les gens bloquent vraiment.`,

  C: (p) =>
    `Salut ${p} 👋\n\n` +
    `Cette semaine j'ai changé une seule chose dans mes shorts : ils sont passés de 48 vues à 1 207. Même chaîne, même outil, même sujet.\n\n` +
    `J'ai relevé trois causes précises, chiffres à l'appui. Si ça t'intéresse je te les envoie — dis-moi juste oui. (Je bosse sur Créatis, c'est sur mes propres publications que j'ai mesuré.)`,
};

const ORDRE = ['A', 'B', 'C'];

/** Le tourniquet repart de là où le dernier envoi s'est arrêté. */
const prochaineVariante = (gens) => {
  const faits = gens.filter((g) => g.variante).length;
  return ORDRE[faits % ORDRE.length];
};

const texteDe = (g, v) => VARIANTES[v](g.pseudo, g.raisons[0] || '');

const attente = () => 45000 + Math.floor(Math.random() * 65000);

if (!fs.existsSync(FICHIER)) {
  console.error('Aucun destinataire connu. Lancer d\'abord :');
  console.error('  node scripts/destinataires.js');
  process.exit(2);
}
const base = JSON.parse(fs.readFileSync(FICHIER, 'utf8'));

const dejaAujourdhui = base.gens.filter((g) => g.ecrit_le === jour && g.reseau === RESEAU).length;
const reste = Math.max(0, Math.min(COMBIEN, PLAFOND - dejaAujourdhui));
const file = base.gens.filter((g) => g.reseau === RESEAU && !g.ecrit_le && !g.introuvable).slice(0, reste);

console.log(`ÉCRIRE — ${RESEAU} — ${jour}`);
console.log('================================================================');
console.log(`${dejaAujourdhui} message(s) déjà envoyés aujourd'hui · plafond ${PLAFOND}`);
console.log(`${file.length} à envoyer dans cette passe.`);
console.log('');

if (!file.length) {
  console.log(dejaAujourdhui >= PLAFOND
    ? 'Plafond du jour atteint. Revenir demain — c\'est volontaire.'
    : 'Personne à qui écrire : tout le monde a déjà reçu un message.');
  process.exit(0);
}

if (!ENVOYER) {
  let n = base.gens.filter((g) => g.variante).length;
  for (const g of file) {
    const v = ORDRE[n % ORDRE.length];
    n += 1;
    console.log(`── @${g.pseudo}  (${g.raisons.join(' + ')})  — variante ${v}`);
    console.log(texteDe(g, v).split('\n').map((l) => '   ' + l).join('\n'));
    console.log('');
  }
  console.log('ESSAI À BLANC — rien n\'a été envoyé.');
  console.log('Pour envoyer : node scripts/ecrire.js --envoyer');
  process.exit(0);
}

(async () => {
  const { chromium } = require('playwright');
  let page;
  let fermer = async () => {};

  if (RESEAU === 'instagram') {
    const nav = await chromium.connectOverCDP('http://localhost:9222').catch(() => null);
    if (!nav) {
      console.error('Chrome n\'écoute pas sur 9222 : la session Instagram vit dans CE navigateur.');
      process.exit(2);
    }
    const ctx = nav.contexts()[0];
    page = ctx.pages()[0] || (await ctx.newPage());
  } else {
    const ctx = await chromium.launchPersistentContext(PROFIL, {
      channel: 'chrome', headless: false, viewport: { width: 1500, height: 1050 },
    }).catch(() => null);
    if (!ctx) {
      console.error('Profil verrouillé par une autre fenêtre.');
      process.exit(2);
    }
    page = ctx.pages()[0] || (await ctx.newPage());
    fermer = () => ctx.close();
  }

  let envoyes = 0;
  for (const g of file) {
    const variante = prochaineVariante(base.gens);
    const texte = texteDe(g, variante);
    process.stdout.write(`@${g.pseudo} (${variante}) … `);

    /* ── PAR LA CRÉATION DE CONVERSATION, PAS PAR LE PROFIL ──────────────
       Le profil n'offre un bouton de message que si la personne nous suit
       déjà : sur quatre comptes testés le 08/10, aucun n'en avait, et le
       script a conclu « compte privé » à tort. La recherche de `direct/new/`
       trouve tout le monde et ouvre le fil directement — il n'y a même pas de
       bouton « Chat » à valider ensuite. */
    await page.goto('https://www.instagram.com/direct/new/', {
      waitUntil: 'domcontentloaded', timeout: 90000,
    }).catch(() => {});
    await page.waitForTimeout(5500);

    const recherche = page.locator('input[placeholder], input[type="text"]').first();
    if (!(await recherche.isVisible().catch(() => false))) {
      console.log('champ de recherche absent, passé');
      continue;
    }
    await recherche.fill(g.pseudo).catch(() => {});
    await page.waitForTimeout(4500);

    /* Le résultat est un SPAN nu, sans rôle : on vise son texte exact. */
    const option = page.getByText(g.pseudo, { exact: true }).first();
    if (!(await option.isVisible().catch(() => false))) {
      /* Le pseudo relevé dans le flux d'activité n'existe plus : compte
         renommé ou supprimé. On le marque pour ne pas le représenter chaque
         jour — et surtout on n'écrit PAS au résultat approchant, qui serait
         un inconnu. */
      g.introuvable = jour;
      fs.writeFileSync(FICHIER, JSON.stringify({ ...base, maj_le: jour }, null, 2));
      console.log('compte introuvable — marqué, aucun message envoyé');
      continue;
    }
    await option.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(5000);

    const champ = page.locator('div[contenteditable="true"]').last();
    if (!(await champ.isVisible().catch(() => false))) {
      console.log('champ de saisie introuvable, passé');
      continue;
    }
    await champ.click({ timeout: 6000 }).catch(() => {});
    /* Saisie ligne par ligne : une nouvelle ligne au clavier enverrait le
       message, Instagram n'attend pas Maj+Entrée dans ce panneau. */
    const lignes = texte.split('\n').filter((l) => l.trim());
    for (let k = 0; k < lignes.length; k++) {
      await page.keyboard.type(lignes[k], { delay: 12 });
      if (k < lignes.length - 1) await page.keyboard.press('Shift+Enter');
    }
    await page.waitForTimeout(1200);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(4000);

    /* On ne coche « envoyé » que si le texte est VISIBLE dans la discussion.
       ── CE QUI A RATÉ AU PREMIER ESSAI ──────────────────────────────────
       Le témoin était pris dans la PREMIÈRE ligne, qui contient le pseudo et
       un émoji : Instagram les rend dans des nœuds séparés, et `innerText`
       insérait des espaces au milieu. Le message était bien parti, le script
       a dit l'inverse — et un relancement l'aurait envoyé deux fois.
       On prend donc un témoin dans une ligne de texte NU, et on compare des
       chaînes dont tous les espaces ont été écrasés. */
    const nu = lignes.find((l) => !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(l)) || lignes[0];
    const temoin = nu.replace(/\s+/g, ' ').slice(5, 45);
    const vu = await page.evaluate(
      (t) => document.body.innerText.replace(/\s+/g, ' ').includes(t),
      temoin,
    ).catch(() => false);
    if (!vu) {
      console.log('envoi non confirmé à l\'écran — NON marqué, à reprendre');
      continue;
    }

    g.ecrit_le = jour;
    g.variante = variante;
    g.message = texte.slice(0, 80) + '…';
    envoyes += 1;
    fs.writeFileSync(FICHIER, JSON.stringify({ ...base, maj_le: jour }, null, 2));
    console.log('envoyé');

    if (envoyes < file.length) {
      const t = attente();
      console.log(`   (pause ${Math.round(t / 1000)} s — écrire en rafale fait bloquer le compte)`);
      await page.waitForTimeout(t);
    }
  }

  console.log('');
  console.log(`${envoyes} message(s) envoyés. Registre à jour.`);
  console.log('Les réponses arrivent dans la boîte Instagram — à relever à la main.');
  await fermer();
  process.exit(0);
})();
