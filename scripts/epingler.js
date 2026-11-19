#!/usr/bin/env node
/**
 * ÉPINGLER — un commentaire sur notre propre Short, qui renvoie au format long.
 *
 *   node scripts/epingler.js --video <id> --texte "..."        ESSAI À BLANC
 *   node scripts/epingler.js --video <id> --texte "..." --publier
 *
 * ── POURQUOI CE FICHIER EXISTE ───────────────────────────────────────────
 * Mesure du 09/10 : les formats longs reçoivent HUIT à NEUF impressions en
 * vingt heures. Ce n'est plus un problème de miniature ni de titre — YouTube
 * ne les montre pas, parce que la chaîne n'a ni abonnés ni historique de
 * visionnage pour s'y accrocher.
 *
 * Pendant ce temps les Shorts font 700 à 1 200 vues. La seule passerelle qui
 * existe entre les deux est le COMMENTAIRE ÉPINGLÉ : il s'affiche sous le
 * Short, il vient de la chaîne, et il est cliquable.
 *
 * Le champ « vidéo associée » n'existe pas : vérifié le 09/10 sur la page
 * d'édition d'un Short dans Studio, il n'y a aucun champ de ce genre.
 *
 * ── CE QUE LE COMMENTAIRE DIT ────────────────────────────────────────────
 * Il prolonge le Short, il ne le vend pas. « La méthode complète est là » vaut
 * mieux que « abonne-toi » : la personne vient de recevoir une idée, elle est
 * disposée à en recevoir la suite, pas une demande.
 */

const fs = require('fs');
const path = require('path');
const { prendre } = require('./verrou-profil');

/* Un seul travail Playwright a la fois sur le profil : voir verrou-profil.js. */
prendre('epingler');

const RACINE = path.join(__dirname, '..');
const PROFIL = path.join(RACINE, '.playwright-profile-social');

const arg = (n, d = '') => {
  const i = process.argv.indexOf('--' + n);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : d;
};
const VIDEO = arg('video');
const TEXTE = arg('texte');
const PUBLIER = process.argv.includes('--publier');

if (!VIDEO || !TEXTE) {
  console.error('Usage : --video <id> --texte "..." [--publier]');
  process.exit(2);
}

console.log(`ÉPINGLER — ${VIDEO}`);
console.log('='.repeat(64));
console.log(TEXTE);
console.log('');
if (!PUBLIER) {
  console.log('ESSAI À BLANC — rien n\'a été publié.');
  console.log('Pour publier : ajouter --publier');
  process.exit(0);
}

(async () => {
  const { chromium } = require('playwright');
  const ctx = await chromium.launchPersistentContext(PROFIL, {
    channel: 'chrome', headless: false, viewport: { width: 1400, height: 1000 },
  }).catch(() => null);
  if (!ctx) {
    console.error('Profil verrouillé par une autre fenêtre — ne jamais lancer deux travaux Playwright dessus.');
    process.exit(2);
  }
  const page = ctx.pages()[0] || (await ctx.newPage());

  /* ── L'ADRESSE D'UN SHORT N'EST PAS CELLE D'UNE VIDÉO ─────────────────
     `youtube.com/watch?v=<id>` rend « Cette vidéo n'est plus disponible »
     pour un Short — vérifié le 09/10, et on a failli croire la publication
     perdue. La bonne adresse est `youtube.com/shorts/<id>`.

     Studio, lui, n'offre pas d'éditeur de commentaire pour nos propres
     vidéos : seulement la boîte de réception de ceux des autres. */
  await page.goto(`https://www.youtube.com/shorts/${VIDEO}`, {
    waitUntil: 'domcontentloaded', timeout: 90000,
  }).catch(() => {});
  await page.waitForTimeout(9000);

  /* Sur un Short, les commentaires vivent dans un panneau latéral qu'il faut
     ouvrir : rien ne se charge tant qu'on n'a pas cliqué. */
  /* Le libellé est « Afficher le commentaire » — au SINGULIER, et sans
     majuscule au mot utile. Chercher « Commentaires » ne trouve rien. */
  const ouvrir = page.locator(
    'button[aria-label*="ommentaire"], button[aria-label*="omment"], #comments-button button',
  ).first();
  if (await ouvrir.isVisible().catch(() => false)) {
    await ouvrir.click({ timeout: 7000 }).catch(() => {});
    await page.waitForTimeout(6000);
  }

  const champ = page.locator('#placeholder-area, #simplebox-placeholder').first();
  if (!(await champ.isVisible().catch(() => false))) {
    await page.screenshot({ path: path.join(RACINE, '.scratch-social', 'yt-commentaire-absent.png') }).catch(() => {});
    console.error('Zone de commentaire introuvable — capture écrite, à regarder.');
    await ctx.close();
    process.exit(1);
  }
  await champ.click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const saisie = page.locator('#contenteditable-root').first();
  if (!(await saisie.isVisible().catch(() => false))) {
    console.error('Champ de saisie introuvable après le clic.');
    await ctx.close();
    process.exit(1);
  }
  await saisie.click();
  await page.keyboard.type(TEXTE, { delay: 12 });
  await page.waitForTimeout(1500);

  const envoyer = page.locator('#submit-button button, ytd-button-renderer#submit-button').first();
  await envoyer.click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(6000);

  /* ── ON VÉRIFIE AVANT DE DIRE QUE C'EST FAIT ─────────────────────────
     Un envoi « réussi » qui n'a rien publié est arrivé deux fois en octobre
     sur d'autres canaux. On cherche notre texte dans la page. */
  const temoin = TEXTE.replace(/\s+/g, ' ').slice(5, 45);
  const vu = await page.evaluate(
    (t) => document.body.innerText.replace(/\s+/g, ' ').includes(t),
    temoin,
  ).catch(() => false);
  if (!vu) {
    console.error('Commentaire non retrouvé à l\'écran — NON confirmé.');
    await page.screenshot({ path: path.join(RACINE, '.scratch-social', 'yt-commentaire-doute.png') }).catch(() => {});
    await ctx.close();
    process.exit(1);
  }
  console.log('Commentaire publié.');

  /* L'épinglage vit dans le menu « … » du commentaire. */
  const menu = page.locator('ytd-comment-thread-renderer').first()
    .locator('button[aria-label*="action"], #action-menu button').first();
  if (await menu.isVisible().catch(() => false)) {
    await menu.click({ timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const epingler = page.locator('tp-yt-paper-item:has-text("Épingler"), yt-formatted-string:has-text("Épingler")').first();
    if (await epingler.isVisible().catch(() => false)) {
      await epingler.click({ timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(2500);
      const conf = page.locator('button:has-text("ÉPINGLER"), yt-button-renderer:has-text("Épingler")').last();
      await conf.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(3000);
      console.log('Épinglé.');
    } else {
      console.log('Entrée « Épingler » introuvable — le commentaire reste publié, non épinglé.');
    }
  } else {
    console.log('Menu du commentaire introuvable — publié, non épinglé.');
  }

  await page.screenshot({ path: path.join(RACINE, '.scratch-social', 'yt-commentaire.png') }).catch(() => {});
  await ctx.close();
  process.exit(0);
})();
