#!/usr/bin/env node
/**
 * Publie le créneau de l'heure courante, heure de Paris.
 *
 *   node scripts/planificateur.js            publie le créneau dû, s'il y en a un
 *   node scripts/planificateur.js --essai    dit ce qu'il ferait, ne publie rien
 *   node scripts/planificateur.js --etat     affiche le plan du jour
 *
 * Conçu pour être lancé TOUTES LES HEURES par le planificateur de tâches
 * Windows. Il est volontairement bête : il ne décide de rien, il exécute le
 * créneau dû s'il est prêt, et ne fait rien sinon. Toute l'intelligence est
 * dans le plan, qui est écrit à l'avance et relisible.
 *
 * ── CE QU'IL REFUSE DE FAIRE ─────────────────────────────────────────────
 * · Publier deux fois. Chaque créneau porte un statut ; une fois « publié » il
 *   n'est jamais rejoué, même si la tâche se relance dans l'heure.
 * · Publier une pièce absente ou vide. Le fichier est vérifié avant.
 * · Publier si `social/STOP` existe. C'est le coupe-circuit : créer ce fichier
 *   arrête tout sans avoir à toucher aux tâches Windows.
 * · Rattraper les créneaux ratés. Un créneau de 9 h vu à 14 h est périmé, pas
 *   en retard : le publier à contretemps casse l'étalement qui est tout
 *   l'intérêt d'un plan horaire. Il est marqué « manqué ».
 *
 * ── DEUX NAVIGATEURS, ET C'EST IMPOSÉ ────────────────────────────────────
 * Mesuré le 28/09 : les sessions ne vivent pas au même endroit.
 *   TikTok, YouTube  -> profil Playwright `.playwright-profile-social`
 *   Instagram        -> TON Chrome, port 9222 (Meta refuse un navigateur piloté)
 * Le plan porte donc la cible, et le planificateur choisit le script ET le mode
 * d'après elle. X est déconnecté (401) et LinkedIn aussi : aucun créneau ne
 * doit les viser tant qu'ils ne sont pas rouverts.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const PLAN = path.join(RACINE, 'social', 'plan-jour.json');
const STOP = path.join(RACINE, 'social', 'STOP');
const JOURNAL = path.join(RACINE, 'social', 'journal');

const essai = process.argv.includes('--essai');
const etatSeul = process.argv.includes('--etat');

/** Heure et date à Paris, quel que soit le fuseau de la machine. */
const aParis = () => {
  const f = new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, heure: p.hour, minute: p.minute };
};

const noter = (ligne) => {
  fs.mkdirSync(JOURNAL, { recursive: true });
  const { date } = aParis();
  const h = new Date().toISOString();
  fs.appendFileSync(path.join(JOURNAL, `${date}.log`), `${h}  ${ligne}\n`);
  console.log(ligne);
};

/* Chaque cible dit COMMENT publier. Ajouter une cible ici, jamais dans le plan :
   le plan ne contient que des noms, pas des commandes. */
const CIBLES = {
  't1': { nom: 'TikTok principal', script: 'publier-tiktok.js', cdp: false, legende: '--legende' },
  't2': { nom: 'TikTok secondaire', script: 'publier-tiktok.js', cdp: false, legende: '--legende' },
  'g1': { nom: 'Instagram @andre.creatis', script: 'publier-instagram.js', cdp: true, legende: '--legende-fichier' },
  'g2': { nom: 'Instagram secondaire', script: 'publier-instagram.js', cdp: true, legende: '--legende-fichier' },
  'y1': { nom: 'YouTube', script: 'publier-youtube.js', cdp: false, legende: '--description-fichier' },
};

const lirePlan = () => {
  if (!fs.existsSync(PLAN)) {
    console.error(`Aucun plan : ${PLAN}`);
    console.error('En créer un avec scripts/plan-du-jour.js avant d armer les tâches.');
    process.exit(3);
  }
  return JSON.parse(fs.readFileSync(PLAN, 'utf8'));
};

const ecrirePlan = (p) => fs.writeFileSync(PLAN, JSON.stringify(p, null, 2));

(async () => {
  const { date, heure, minute } = aParis();
  const plan = lirePlan();

  if (etatSeul) {
    console.log(`Plan du ${plan.date} — il est ${heure}:${minute} à Paris\n`);
    for (const c of plan.creneaux) {
      const marque = c.heure === heure ? '>' : ' ';
      console.log(`${marque} ${c.heure}  ${String(c.cible).padEnd(4)} ${c.statut.padEnd(10)} ${c.titre || c.piece || ''}`);
    }
    return;
  }

  if (fs.existsSync(STOP)) {
    noter('ARRÊT : le fichier social/STOP existe, rien n est publié.');
    return;
  }

  if (plan.date !== date) {
    noter(`Le plan porte la date ${plan.date}, or nous sommes le ${date}. Rien n est publié.`);
    noter('Regénérer le plan du jour avant que les créneaux ne reprennent.');
    return;
  }

  /* Marquer périmés les créneaux dépassés, pour qu'ils ne partent jamais à
     contretemps et qu'on voie au journal ce qui a été manqué. */
  let modifie = false;
  for (const c of plan.creneaux) {
    if (c.statut === 'en attente' && c.heure < heure) {
      c.statut = 'manqué';
      modifie = true;
      noter(`créneau ${c.heure} ${c.cible} : MANQUÉ (dépassé, non rattrapé)`);
    }
  }

  const du = plan.creneaux.find((c) => c.heure === heure && c.statut === 'en attente');
  if (!du) {
    if (modifie) ecrirePlan(plan);
    noter(`${heure}:${minute} — aucun créneau dû.`);
    return;
  }

  const cible = CIBLES[du.cible];
  if (!cible) {
    du.statut = 'erreur';
    du.detail = `cible inconnue : ${du.cible}`;
    ecrirePlan(plan);
    noter(`créneau ${du.heure} : cible inconnue « ${du.cible} »`);
    return;
  }

  const video = path.join(RACINE, du.video);
  if (!fs.existsSync(video) || fs.statSync(video).size < 100000) {
    du.statut = 'erreur';
    du.detail = 'vidéo absente ou trop petite';
    ecrirePlan(plan);
    noter(`créneau ${du.heure} ${du.cible} : vidéo introuvable ou vide — ${du.video}`);
    return;
  }

  const args = [
    path.join(__dirname, cible.script),
    '--video', video,
    cible.legende, du.legende.startsWith('social/') ? path.join(RACINE, du.legende) : du.legende,
  ];
  if (cible.script === 'publier-youtube.js') {
    args.splice(1, 2, '--video', video);
    args.push('--titre', du.titre || '');
  }
  if (cible.cdp) args.push('--cdp');

  if (essai) {
    noter(`ESSAI — ${du.heure} ${cible.nom} : node ${args.join(' ')} --publier`);
    return;
  }

  args.push('--publier');
  du.statut = 'en cours';
  du.tente_le = new Date().toISOString();
  ecrirePlan(plan);

  noter(`créneau ${du.heure} ${cible.nom} : publication de ${du.video}`);
  try {
    const sortie = execFileSync(process.execPath, args, {
      cwd: RACINE, encoding: 'utf8', timeout: 12 * 60 * 1000,
    });
    du.statut = 'publié';
    du.fini_le = new Date().toISOString();
    noter(sortie.trim().split('\n').slice(-3).join(' | '));
    noter(`créneau ${du.heure} ${cible.nom} : PUBLIÉ`);
  } catch (e) {
    /* « Échec » ne veut pas dire « rien n'est parti » : le 27/09 une tentative
       crue bloquée avait en réalité publié. On marque donc « à vérifier », et
       surtout PAS « en attente » — sinon l'heure suivante republierait. */
    du.statut = 'à vérifier';
    du.detail = (e.stdout || e.message || '').toString().trim().split('\n').slice(-2).join(' | ');
    noter(`créneau ${du.heure} ${cible.nom} : ÉCHEC APPARENT — ${du.detail}`);
    noter('NE PAS rejouer ce créneau sans avoir regardé le compte.');
  }
  ecrirePlan(plan);
})();
