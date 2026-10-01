#!/usr/bin/env node
/**
 * Refuse un film dont un plan tombe sur un ÉCRAN D'ATTENTE.
 *
 *   node scripts/controle-fin-de-film.js \
 *        --reperes creatis-videos/public/rec-vocal-0110-reperes.json \
 *        --plans "15.6-19.0,19.0-21.6,22.0-60.0,238.8-240.8,241.6-244.6"
 *
 * ── POURQUOI ────────────────────────────────────────────────────────────
 * Le 01/10 la commande vocale s'est terminée sur « Téléchargement du clip…
 * Récupération depuis YouTube » au lieu du clip fini. Retour de l'utilisateur :
 * « À la fin on voit ça alors qu'on devrait voir le résultat du clip final.
 *   Ça, tu aurais dû le cut et voir le clip à la place. »
 *
 * ── POURQUOI PAS freezedetect ───────────────────────────────────────────
 * Première tentative : refuser les fenêtres figées. Mesuré sur le film fautif,
 * elle se trompe DEUX FOIS —
 *   · le plan d'attente passe au vert : un spinner et une barre de progression
 *     bougent, donc l'image n'est pas figée ;
 *   · la grille des huit clips est accusée à 88 % : elle est immobile parce
 *     qu'on la LIT, et c'est le meilleur plan du film.
 * Le mouvement ne dit rien. Ce qui compte est ce que la page AFFICHE, et seul
 * le navigateur le sait — d'où les fenêtres relevées pendant le tournage par
 * `enregistrer-vocal.mjs` (clé `attentes` du fichier de repères).
 *
 * Sortie 5 = le DERNIER plan tombe sur une attente. Le film ne part pas.
 *
 * Un plan intermédiaire sur une attente est signalé sans bloquer : montrer deux
 * secondes d'analyse avec le bandeau « accéléré » est un choix légitime, et
 * c'est le plan que l'utilisateur a gardé. Ce qu'il a refusé, c'est de FINIR
 * sur un chargement.
 */

const fs = require('fs');

const arg = (n, d) => {
  const i = process.argv.indexOf('--' + n);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};

const fichier = arg('reperes');
const plans = arg('plans', '');

if (!fichier || !plans) {
  console.error('Usage : --reperes <…-reperes.json> --plans "debut-fin,debut-fin,…"');
  process.exit(2);
}
if (!fs.existsSync(fichier)) {
  console.error(`Repères introuvables : ${fichier}`);
  process.exit(2);
}

let donnees;
try {
  donnees = JSON.parse(fs.readFileSync(fichier, 'utf8'));
} catch (e) {
  console.error(`Repères illisibles : ${e.message}`);
  process.exit(2);
}

const attentes = donnees.attentes;

console.log("CONTRÔLE DES PLANS — aucun plan sur un écran d'attente");
console.log('================================================================');

/* Un enregistrement d'avant ce contrôle n'a pas la clé. On le dit, on ne
   l'invente pas : annoncer « rien à signaler » sur une mesure absente est pire
   que de ne rien annoncer. */
if (!Array.isArray(attentes)) {
  console.log('');
  console.log(`Ce fichier de repères ne contient pas de fenêtres d'attente.`);
  console.log(`Il a été produit avant que l'enregistreur les relève, donc ce`);
  console.log(`contrôle ne peut rien affirmer sur ce tournage.`);
  console.log(`Refaire l'enregistrement pour pouvoir le vérifier.`);
  process.exit(4);
}

const fenetres = plans.split(',').map((p) => {
  const [d, f] = p.trim().split('-').map(Number);
  return { debut: d, fin: f };
});

const chevauche = (a, b) => Math.max(0, Math.min(a.fin, b[1]) - Math.max(a.debut, b[0]));

const fautifs = [];
const tolerees = [];

fenetres.forEach((f, i) => {
  const dernier = i === fenetres.length - 1;
  const etiquette = `plan ${i + 1}${dernier ? ' (le dernier)' : ''} — rec ${f.debut}→${f.fin}`;
  let pire = 0;
  let laquelle = null;
  for (const a of attentes) {
    const c = chevauche(f, a);
    if (c > pire) { pire = c; laquelle = a; }
  }
  const longueur = f.fin - f.debut;
  if (pire > 0.4) {
    const part = Math.round((pire / longueur) * 100);
    if (dernier) {
      console.log(`  ✗ ${etiquette} : ATTENTE ${part} % du plan (fenêtre ${laquelle[0]}s→${laquelle[1]}s)`);
      fautifs.push({ i: i + 1, part });
    } else {
      /* Un plan intermédiaire sur une attente peut être VOULU : montrer deux
         secondes d'analyse, bandeau « accéléré ×17 » à l'appui, dit « elle lit
         tout » et c'est le plan que l'utilisateur a gardé. Ce qu'il a refusé,
         c'est de FINIR là-dessus. On le signale sans bloquer. */
      console.log(`  ~ ${etiquette} : attente ${part} % — admis, mais court et avec le bandeau`);
      tolerees.push(i + 1);
    }
  } else {
    console.log(`  ✓ ${etiquette} : l'écran montre un résultat`);
  }
});

console.log('');

if (fautifs.length === 0) {
  if (tolerees.length) {
    console.log(`Plan(s) ${tolerees.join(', ')} sur une attente, admis : garder court,`);
    console.log(`et afficher le bandeau qui dit que c'est accéléré.`);
  }
  console.log(`La fin montre un résultat. Le film peut partir.`);
  process.exit(0);
}

for (const f of fautifs) {
  console.log(`Le DERNIER plan montre un écran d'attente sur ${f.part} % de sa durée.`);
  console.log(`Il porte la récompense du film : il doit montrer le résultat fini —`);
  console.log(`le clip qui joue — pas le chargement qui y mène.`);
}
console.log('');
console.log(`Déplacer la fenêtre hors de l'attente, ou prolonger l'enregistrement`);
console.log(`jusqu'à ce que le résultat s'affiche vraiment.`);
process.exit(5);
