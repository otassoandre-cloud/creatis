#!/usr/bin/env node
/**
 * RÉPONDRE — à ceux qui ont commenté, sur les trois réseaux.
 *
 *   node scripts/repondre.js                     ESSAI À BLANC
 *   node scripts/repondre.js --envoyer
 *   node scripts/repondre.js --reseau youtube
 *
 * ── POURQUOI UN FICHIER SÉPARÉ DE `ecrire.js` ────────────────────────────
 * Un commentaire est PUBLIC : la réponse est lue par tous ceux qui passent,
 * pas seulement par son auteur. Elle n'a donc pas le même but qu'un message
 * privé — elle sert d'abord aux lecteurs suivants — et elle n'a aucune des
 * limites de débit du privé : répondre à ses commentaires est le comportement
 * normal d'une chaîne, pas du démarchage.
 *
 * C'est aussi le SEUL canal sortant qui existe sur YouTube : pas de message
 * privé, et la liste de ceux qui ont aimé n'est exposée nulle part.
 *
 * ── CE QUE LA RÉPONSE FAIT ───────────────────────────────────────────────
 * Elle répond vraiment à ce qui est écrit quand c'est une question, et elle
 * ajoute une ligne utile sinon. Jamais de lien : un lien en réponse à son
 * propre commentaire se lit comme de la publicité, et YouTube masque
 * volontiers ces réponses-là.
 *
 * Le registre `social/commentaires-repondus.json` garantit qu'un commentaire
 * ne reçoit jamais deux réponses.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const PROFIL = path.join(RACINE, '.playwright-profile-social');
const SOCIAL = path.join(RACINE, 'social');
const REGISTRE = path.join(SOCIAL, 'commentaires-repondus.json');

const jour = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

const arg = (n, d) => {
  const i = process.argv.indexOf('--' + n);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const ENVOYER = process.argv.includes('--envoyer');
const RESEAU = arg('reseau', 'youtube');
const COMBIEN = parseInt(arg('combien', '10'), 10);

const dejaRepondu = () => {
  if (!fs.existsSync(REGISTRE)) return new Set();
  try {
    return new Set(JSON.parse(fs.readFileSync(REGISTRE, 'utf8')).faits || []);
  } catch {
    return new Set();
  }
};
const noter = (set) => {
  fs.mkdirSync(SOCIAL, { recursive: true });
  fs.writeFileSync(REGISTRE, JSON.stringify({ maj_le: jour, faits: [...set] }, null, 2));
};

/**
 * Le pseudo seul. Studio colle la date derrière l'auteur dans le même bloc :
 * « @Machin • il y a 3 semaines ». Mentionner ça dans une réponse publique
 * donnerait une réponse visiblement automatique.
 */
const propre = (auteur) =>
  String(auteur).replace(/^@/, '').split('•')[0].split('\n')[0].trim().split(/\s+/)[0];

/** Une empreinte stable du commentaire : auteur + début du texte. */
const empreinte = (reseau, auteur, texte) =>
  `${reseau}:${auteur}:${String(texte).replace(/\s+/g, ' ').slice(0, 40)}`;

/**
 * Le texte de la réponse. On ne génère rien d'automatique qui aurait l'air
 * automatique : trois formes, choisies sur ce que le commentaire contient.
 */
const reponse = (auteur, texte) => {
  const t = String(texte).toLowerCase();
  const nom = propre(auteur);

  /* ── QUAND LE LIEN EST LA RÉPONSE ────────────────────────────────────
     « Le site pour avoir les 10 clips » : la personne DEMANDE l'adresse.
     Ne pas la donner serait absurde. La règle « jamais de lien » vise le
     démarchage — pas une réponse à une question posée. */
  /* Volontairement etroit : « ton outil est nul » contient « outil » mais ne
     demande pas d'adresse. On exige une tournure de DEMANDE. */
  const demandeLAdresse = ['le site', 'le lien', "l'adresse", "c'est quoi", "ca s'appelle", "ça s'appelle",
    'quel outil', 'quelle appli', 'comment ca marche', 'comment ça marche',
    'ou le trouver', 'où le trouver', 'ou telecharger', 'où télécharger',
  ].some((f) => t.includes(f));
  if (demandeLAdresse) {
    return `@${nom} c'est creatis.app 🙂 Tu colles l'URL de ta vidéo longue, il te sort les passages notés. Dis-moi si tu bloques quelque part.`;
  }
  /* Une demande de contenu est une demande à laquelle on peut dire oui. */
  if (['tuto', 'tutoriel', 'une vidéo sur', 'une video sur', 'tu peux faire', 'tu peux montrer']
    .some((f) => t.includes(f))) {
    return `@${nom} oui, je le note — dis-moi ce que tu veux voir en priorité et je le fais dans les prochains jours.`;
  }
  /* « j'ai besoin d'info » n'est pas une question : c'est une demande d'ouvrir
     la conversation. On l'ouvre, au lieu de réciter une méthode. */
  if (['besoin de', 'une info', 'des infos', 'un renseignement', 'je voudrais savoir']
    .some((f) => t.includes(f))) {
    return `@${nom} vas-y, dis-moi ce que tu cherches et je te réponds ici.`;
  }
  if (/\?/.test(texte)) {
    return `@${nom} bonne question — réponds-moi ici et je détaille. En attendant, le critère que j'applique avant tout le reste : le passage doit se comprendre sans la vidéo dont il sort.`;
  }
  if (/merci|top|génial|super|cool|bravo|parfait|excellent/.test(t)) {
    return `@${nom} merci 🙏 Si tu montes des shorts en ce moment, le test que j'utilise : montre ton passage à quelqu'un qui n'a pas vu la vidéo. S'il demande le contexte, il ne tiendra pas.`;
  }
  if (/marche pas|ça marche pas|bug|problème|nul|arnaque/.test(t)) {
    return `@${nom} dis-moi précisément où ça coince, je regarde. Je préfère savoir que de laisser passer.`;
  }
  return `@${nom} merci d'être passé 🙏 Le truc que je creuse en ce moment : pourquoi un passage excellent peut ne faire aucune vue. La cause est presque toujours qu'il ne se comprend pas sans sa vidéo d'origine.`;
};

(async () => {
  const { chromium } = require('playwright');
  const faits = dejaRepondu();
  let page;
  let fermer = async () => {};

  if (RESEAU === 'instagram') {
    const nav = await chromium.connectOverCDP('http://localhost:9222').catch(() => null);
    if (!nav) {
      console.error('Chrome n\'écoute pas sur 9222.');
      process.exit(2);
    }
    page = nav.contexts()[0].pages()[0] || (await nav.contexts()[0].newPage());
  } else {
    const ctx = await chromium.launchPersistentContext(PROFIL, {
      channel: 'chrome', headless: false, viewport: { width: 1600, height: 1100 },
    }).catch(() => null);
    if (!ctx) {
      console.error('Profil verrouillé par une autre fenêtre — ne jamais lancer deux travaux Playwright dessus.');
      process.exit(2);
    }
    page = ctx.pages()[0] || (await ctx.newPage());
    fermer = () => ctx.close();
  }

  console.log(`RÉPONDRE — ${RESEAU} — ${jour}`);
  console.log('================================================================');

  /* ── YOUTUBE : la boîte de commentaires de Studio ───────────────────── */
  if (RESEAU === 'youtube') {
    await page.goto('https://studio.youtube.com/', { waitUntil: 'domcontentloaded', timeout: 90000 })
      .catch(() => {});
    await page.waitForTimeout(9000);
    const url = page.url();
    const m = url.match(/channel\/([A-Za-z0-9_-]+)/);
    if (!m) {
      console.error('Identifiant de chaîne introuvable dans l\'URL de Studio.');
      await fermer();
      process.exit(2);
    }
    await page.goto(`https://studio.youtube.com/channel/${m[1]}/comments/inbox`, {
      waitUntil: 'domcontentloaded', timeout: 90000,
    }).catch(() => {});
    await page.waitForTimeout(11000);

    const lots = await page.evaluate(() => {
      const out = [];
      /* UN SEUL sélecteur : `ytcp-comment` est imbriqué dans
         `ytcp-comment-thread`, les deux ensemble rendaient chaque
         commentaire en double. */
      for (const fil of document.querySelectorAll('ytcp-comment-thread')) {
        const txt = (fil.innerText || '').split('\n').map((s) => s.trim()).filter(Boolean);
        if (txt.length < 2) continue;
        const auteur = txt.find((l) => l.startsWith('@')) || txt[0];
        const corps = txt.find((l) => !l.startsWith('@') && l.length > 2 && !/^il y a/i.test(l)) || '';
        /* Une réponse de notre part est déjà dans le fil : on la repère. */
        const repondu = /Créatis|Creatis_officiel/i.test(fil.innerText || '');
        if (!out.some((x) => x.corps === corps && x.auteur === auteur)) out.push({ auteur, corps, repondu });
      }
      return out;
    }).catch(() => []);

    const aFaire = lots
      .filter((c) => c.corps && !c.repondu && !faits.has(empreinte('youtube', c.auteur, c.corps)))
      .slice(0, COMBIEN);

    console.log(`${lots.length} commentaire(s) lus · ${aFaire.length} sans réponse de notre part.`);
    console.log('');

    if (!aFaire.length) {
      console.log('Rien à répondre. Sur cette chaîne les commentaires sont rares :');
      console.log('c\'est une information, pas une panne.');
      await fermer();
      process.exit(0);
    }

    for (const c of aFaire) {
      console.log(`── ${c.auteur} : « ${c.corps.slice(0, 70)} »`);
      console.log(`   → ${reponse(c.auteur, c.corps)}`);
      console.log('');
    }

    if (!ENVOYER) {
      console.log('ESSAI À BLANC — rien n\'a été publié.');
      console.log('Pour répondre : node scripts/repondre.js --reseau youtube --envoyer');
      await fermer();
      process.exit(0);
    }

    let n = 0;
    for (const c of aFaire) {
      const bouton = page.locator('ytcp-comment-thread', { hasText: c.corps.slice(0, 24) })
        .locator('button:has-text("Répondre"), ytcp-button:has-text("Répondre")').first();
      if (!(await bouton.isVisible().catch(() => false))) {
        console.log(`${c.auteur} : bouton Répondre introuvable, passé`);
        continue;
      }
      await bouton.click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(3000);

      /* Studio n'utilise PAS de `contenteditable` ici — c'est un vrai
         `textarea#textarea`, enveloppé dans un `tp-yt-iron-autogrow-textarea`.
         Chercher un contenteditable rendait « champ introuvable » sur les
         quatre commentaires alors que le champ était ouvert à l'écran. */
      const champ = page.locator('textarea[placeholder*="réponse"], textarea#textarea').last();
      if (!(await champ.isVisible().catch(() => false))) {
        console.log(`${propre(c.auteur)} : champ introuvable, passé`);
        continue;
      }
      await champ.click().catch(() => {});
      await page.keyboard.type(reponse(c.auteur, c.corps), { delay: 10 });
      await page.waitForTimeout(1500);

      /* Le bouton d'envoi porte le MÊME libellé que celui qui ouvre le champ.
         On vise celui du pied de l'éditeur : `#submit-button`. */
      const envoi = page.locator('#submit-button, ytcp-button#submit-button').last();
      if (await envoi.isVisible().catch(() => false)) {
        await envoi.click({ timeout: 8000 }).catch(() => {});
      } else {
        await page.locator('ytcp-button:has-text("Répondre")').last()
          .click({ timeout: 8000 }).catch(() => {});
      }
      await page.waitForTimeout(5000);

      faits.add(empreinte('youtube', c.auteur, c.corps));
      noter(faits);
      n += 1;
      console.log(`${c.auteur} : répondu`);
      await page.waitForTimeout(6000);
    }
    console.log('');
    console.log(`${n} réponse(s) publiées.`);
  }

  await fermer();
  process.exit(0);
})();
