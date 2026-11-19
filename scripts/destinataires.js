#!/usr/bin/env node
/**
 * DESTINATAIRES — qui s'est manifesté, et sur quelle publication.
 *
 *   node scripts/destinataires.js                  Instagram + TikTok
 *   node scripts/destinataires.js --reseau instagram
 *   node scripts/destinataires.js --pas 14         remonter plus loin dans le flux
 *
 * ── CE QUE CHAQUE RÉSEAU PERMET VRAIMENT ─────────────────────────────────
 * Vérifié le 08/10, pas supposé :
 *
 * · Instagram — la liste des J'aime d'un reel N'EST PAS consultable sur le
 *   web. `/p/<id>/liked_by/` ne rend plus de boîte de dialogue, et le
 *   compteur n'est pas cliquable (les seuls éléments « J'aime » de la page
 *   sont le BOUTON d'action). La seule source de pseudos réels est le FLUX
 *   D'ACTIVITÉ : `instagram.com/accounts/activity/`.
 *   Limite assumée : les lots y sont agrégés (« X, Y et 27 autres personnes »)
 *   et on ne récupère que les deux premiers de chaque lot. On collecte donc
 *   une PARTIE des gens, pas tous — et on le dit plutôt que de laisser croire
 *   à une liste exhaustive.
 *
 * · TikTok — même principe : la boîte de réception des notifications.
 *
 * · YouTube — AUCUN message privé n'existe, et la liste de ceux qui ont aimé
 *   n'est exposée nulle part. Il n'y a donc rien à collecter pour écrire :
 *   seules les réponses en commentaire sont possibles, et elles se font par
 *   `scripts/repondre.js`.
 *
 * · « Qui a regardé » n'existe sur aucune des trois plateformes.
 *
 * Ce script ne fait que LIRE. L'envoi est un geste séparé, dans `ecrire.js`.
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
const RESEAU = arg('reseau', 'tout');
const PAS = parseInt(arg('pas', '10'), 10);

/* Ce qui ressemble à un pseudo sans en être un : la navigation d'Instagram.
   Sans ce filtre, le premier jet du 06/10 annonçait quinze « personnes à
   contacter » par publication — c'était `directinbox`, `legalprivacy`,
   `exploretagsclipping`… Fabriquer une audience est pire que n'en avoir pas. */
const NOUS = ['andre.creatis', 'creatis', 'creatis_officiel'];
const PAS_UN_PSEUDO = (p) =>
  NOUS.includes(p) ||
  /^(reels|explore|popular|direct|legal|web|about|api|p|accounts|stories|tv|challenge|music|tag|discover|foryou|following|live)/.test(p) ||
  /^exploretags|^explorelocations|^reelsaudio|^directinbox|^legalprivacy|^weblite/.test(p) ||
  /^\d+$/.test(p);

const charger = () => {
  if (!fs.existsSync(FICHIER)) return { maj_le: null, gens: [] };
  try {
    return JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
  } catch {
    return { maj_le: null, gens: [] };
  }
};

/** Fusionne sans jamais perdre ce qu'on savait déjà d'une personne. */
const fusionner = (base, trouves) => {
  const index = new Map(base.gens.map((g) => [`${g.reseau}:${g.pseudo}`, g]));
  let neufs = 0;
  for (const t of trouves) {
    const cle = `${t.reseau}:${t.pseudo}`;
    const deja = index.get(cle);
    if (deja) {
      deja.vu_le = jour;
      if (t.raison && !deja.raisons.includes(t.raison)) deja.raisons.push(t.raison);
    } else {
      index.set(cle, {
        reseau: t.reseau,
        pseudo: t.pseudo,
        raisons: t.raison ? [t.raison] : [],
        repere_le: jour,
        vu_le: jour,
        ecrit_le: null,
      });
      neufs += 1;
    }
  }
  return { gens: [...index.values()], neufs };
};

/**
 * Lit un flux de notifications et en sort les pseudos avec leur motif.
 * Instagram et TikTok écrivent la même chose autrement ; on rend le texte
 * brut découpé en lignes, et l'appelant décide.
 */
const lireFlux = async (page, pas) => {
  const vus = new Map();
  for (let k = 0; k < pas; k++) {
    const lot = await page.evaluate(() => {
      const out = [];
      /* On parcourt les LIGNES, pas la page entière : un pseudo isolé ne dit
         pas pourquoi la personne est là, et « a commenté » n'appelle pas le
         même message que « a aimé ». */
      const lignes = document.querySelectorAll('div[role="button"], a[href^="/"]');
      for (const l of lignes) {
        const bloc = l.closest('div[role="button"]') || l.parentElement?.parentElement;
        if (!bloc) continue;
        const texte = (bloc.innerText || '').replace(/\s+/g, ' ').trim();
        if (!texte || texte.length > 220) continue;
        for (const a of bloc.querySelectorAll('a[href^="/"]')) {
          const p = (a.getAttribute('href') || '').replace(/\//g, '');
          if (p) out.push({ pseudo: p, texte });
        }
      }
      return out;
    }).catch(() => []);

    for (const { pseudo, texte } of lot) {
      if (!/^[A-Za-z0-9_.]{2,30}$/.test(pseudo) || PAS_UN_PSEUDO_SERIALISE(pseudo)) continue;
      if (!vus.has(pseudo)) vus.set(pseudo, texte);
    }
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(1100);
  }
  return vus;
};

/* `page.evaluate` ne voit pas les fonctions du module ; le filtre reste donc
   ici, côté Node, appliqué après coup. */
const PAS_UN_PSEUDO_SERIALISE = PAS_UN_PSEUDO;

/** Du texte de la ligne vers un motif court et exploitable. */
const motif = (texte) => {
  const t = texte.toLowerCase();
  if (/a commenté|commented/.test(t)) return 'a commenté';
  if (/a aimé votre (reel|publication|photo|vidéo)|liked your/.test(t)) return 'a aimé une publication';
  if (/a aimé votre (story|story)/.test(t)) return 'a aimé une story';
  if (/commencé à vous suivre|started following/.test(t)) return 's\'est abonné';
  if (/a aimé|liked/.test(t)) return 'a aimé';
  if (/a mentionné|mentioned/.test(t)) return 'a mentionné';
  return null;
};

(async () => {
  const { chromium } = require('playwright');
  const base = charger();
  const trouves = [];

  /* ── INSTAGRAM : par CDP, la session n'existe que dans ce navigateur ──── */
  if (RESEAU === 'tout' || RESEAU === 'instagram') {
    const nav = await chromium.connectOverCDP('http://localhost:9222').catch(() => null);
    if (!nav) {
      console.error('Instagram : Chrome n\'écoute pas sur 9222 — rien lu.');
    } else {
      const ctx = nav.contexts()[0];
      const page = ctx.pages()[0] || (await ctx.newPage());
      await page.goto('https://www.instagram.com/accounts/activity/', {
        waitUntil: 'domcontentloaded', timeout: 90000,
      }).catch(() => {});
      await page.waitForTimeout(7000);

      const vus = await lireFlux(page, PAS);
      for (const [pseudo, texte] of vus) {
        const m = motif(texte);
        if (!m) continue;
        trouves.push({ reseau: 'instagram', pseudo, raison: m });
      }
      console.log(`Instagram : ${vus.size} pseudo(s) lus, ${trouves.length} avec un motif clair.`);
    }
  }

  /* ── TIKTOK : profil Playwright, pas CDP ──────────────────────────────── */
  if (RESEAU === 'tout' || RESEAU === 'tiktok') {
    const ctx = await chromium.launchPersistentContext(PROFIL, {
      channel: 'chrome', headless: false, viewport: { width: 1500, height: 1050 },
    }).catch(() => null);
    if (!ctx) {
      console.error('TikTok : profil verrouillé (une autre fenêtre l\'utilise) — rien lu.');
    } else {
      const page = ctx.pages()[0] || (await ctx.newPage());
      await page.goto('https://www.tiktok.com/messages?lang=fr', {
        waitUntil: 'domcontentloaded', timeout: 90000,
      }).catch(() => {});
      await page.waitForTimeout(6000);

      const avant = trouves.length;
      const vus = await lireFlux(page, Math.min(PAS, 8));
      for (const [pseudo, texte] of vus) {
        const m = motif(texte);
        if (!m) continue;
        trouves.push({ reseau: 'tiktok', pseudo, raison: m });
      }
      console.log(`TikTok : ${vus.size} pseudo(s) lus, ${trouves.length - avant} avec un motif clair.`);
      await ctx.close();
    }
  }

  const { gens, neufs } = fusionner(base, trouves);
  fs.mkdirSync(SOCIAL, { recursive: true });
  fs.writeFileSync(FICHIER, JSON.stringify({ maj_le: jour, gens }, null, 2));

  const aEcrire = gens.filter((g) => !g.ecrit_le);
  console.log('');
  console.log(`${gens.length} personne(s) connues · ${neufs} nouvelle(s) aujourd'hui`);
  console.log(`${aEcrire.length} n'ont encore jamais reçu de message.`);
  console.log('');
  console.log('Les lots du flux sont agrégés : on tient une PARTIE des gens,');
  console.log('pas la liste complète. Aucune plateforme ne la donne sur le web.');
  console.log(`→ social/destinataires.json`);
  process.exit(0);
})();
