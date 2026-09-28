#!/usr/bin/env node
/**
 * À lancer JUSTE APRÈS une publication : relève la vraie URL et inscrit la
 * pièce au registre avec ses variables, pour que `apprendre.js` puisse la
 * rapprocher de ses résultats demain.
 *
 *   node scripts/apres-publication.js --cible g1 --piece <id> \
 *        --gabarit ShortPleinCadre --accroche affirmation --son "Highway To Hell"
 *
 * ── POURQUOI CE SCRIPT ───────────────────────────────────────────────────
 * L'amélioration ne vient pas de ma mémoire — elle vient d'un registre qui
 * relie chaque pièce à ses résultats. Ce lien n'existe que si, au moment de la
 * publication, on écrit : l'URL réelle, et les variables qu'on a choisies.
 *
 * Tant que je le faisais à la main après coup, deux choses ont cassé :
 * des pièces publiées sans variables (donc invisibles à l'apprentissage), et
 * de FAUX identifiants.
 *
 * ── LE FAUX IDENTIFIANT, ET POURQUOI ON LIT L'ONGLET REELS ───────────────
 * Après avoir publié sur Instagram, je relevais l'identifiant du Reel dans la
 * GRILLE du profil. Vérification du 28/09 : les identifiants ainsi notés
 * (`DdRDjgdMEif`, `DdOyNT7IbhJ`) n'apparaissent nulle part dans l'onglet Reels,
 * dont les trois premiers sont `Dd1CFArO-rW`, `Dd0g_keOTsw`, `Ddzz8RfOd7B` —
 * et ces trois-là correspondent bien, aux vues près, à ce que montre le
 * téléphone. La grille et l'onglet Reels ne donnent pas les mêmes adresses.
 *
 * L'onglet Reels est celui qui porte les VUES : c'est donc lui qui fait foi,
 * puisque c'est sur lui que la jointure se fera.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const REGISTRE = path.join(RACINE, 'social', 'registre.json');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };

const CIBLE = arg('cible', '');
const PIECE = arg('piece', '');
const GABARIT = arg('gabarit', '');
const ACCROCHE = arg('accroche', '');
const SON = arg('son', '');
const TITRE = arg('titre', '');

const COMPTES = {
  g1: { reseau: 'instagram', pseudo: 'andre.creatis' },
  g2: { reseau: 'instagram', pseudo: '' },
  t1: { reseau: 'tiktok', pseudo: 'andre.ai26' },
  t2: { reseau: 'tiktok', pseudo: '' },
  y1: { reseau: 'youtube', pseudo: '' },
};

/** L'heure de Paris, celle du plan. */
const heureParis = () => new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris', hour: '2-digit', hour12: false,
}).format(new Date()).padStart(2, '0');

(async () => {
  if (!CIBLE || !PIECE) {
    console.error('Usage : --cible <g1|t1|y1> --piece <id> [--gabarit …] [--accroche …] [--son …]');
    process.exit(1);
  }
  const compte = COMPTES[CIBLE];
  if (!compte) { console.error(`Cible inconnue : ${CIBLE}`); process.exit(1); }

  let url = '';

  /* Instagram : la vraie adresse se lit sur l'onglet Reels, en tête de liste.
     On attend un peu — une publication met quelques secondes à y apparaître. */
  if (compte.reseau === 'instagram' && compte.pseudo) {
    const { chromium } = require('playwright');
    const nav = await chromium.connectOverCDP('http://localhost:9222').catch(() => null);
    if (!nav) {
      console.warn('Chrome absent du port 9222 — URL non relevée, le reste est inscrit.');
    } else {
      const page = await nav.contexts()[0].newPage();
      try {
        for (let essai = 0; essai < 3 && !url; essai++) {
          await page.goto(`https://www.instagram.com/${compte.pseudo}/reels/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
          await page.waitForTimeout(7000);
          const premier = await page.evaluate(() => {
            const a = document.querySelector('a[href*="/reel/"]');
            return a ? { href: a.getAttribute('href'), vues: (a.innerText || '').trim() } : null;
          }).catch(() => null);
          if (premier?.href) {
            url = 'https://www.instagram.com' + premier.href;
            console.log(`URL relevée : ${url}  (${premier.vues} vues pour l'instant)`);
          }
        }
      } finally {
        await page.close().catch(() => {});
      }
    }
  }

  const registre = fs.existsSync(REGISTRE)
    ? JSON.parse(fs.readFileSync(REGISTRE, 'utf8'))
    : { pieces: [] };

  const id = `${new Date().toISOString().slice(0, 10)}-${PIECE}-${CIBLE}`;
  if (registre.pieces.some((p) => p.id === id)) {
    console.log(`Déjà inscrit : ${id}`);
    process.exit(0);
  }

  const entree = {
    id,
    piece: PIECE,
    titre: TITRE || PIECE,
    plateforme: compte.reseau,
    compte: CIBLE,
    statut: 'publié',
    publie_le: new Date().toISOString(),
    heure: heureParis(),
    /* LES VARIABLES — sans elles, `apprendre.js` ne peut rien classer. */
    gabarit: GABARIT || null,
    accroche: ACCROCHE || null,
    son: SON || null,
    muet: !SON,
    url: url || null,
  };
  registre.pieces.push(entree);
  fs.writeFileSync(REGISTRE, JSON.stringify(registre, null, 2));

  console.log(`Inscrit : ${id}`);
  const manquant = ['gabarit', 'accroche'].filter((k) => !entree[k]);
  if (manquant.length) {
    console.warn(`ATTENTION — variable(s) non renseignée(s) : ${manquant.join(', ')}.`);
    console.warn('Cette publication ne comptera pour RIEN dans l apprentissage.');
  }
  if (!url && compte.reseau === 'instagram') {
    console.warn('URL non relevée : la jointure Instagram se fera mal. Relancer plus tard.');
  }

  /* Sortie EXPLICITE. Sans elle, la connexion CDP maintient le processus en
     vie indéfiniment : le travail était fait, le fichier écrit, et le script
     semblait bloqué — on ne se rattache pas à un navigateur sans devoir dire
     soi-même quand on s'en détache. */
  process.exit(0);
})();
