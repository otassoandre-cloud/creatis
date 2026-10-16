import { ReglagesVocal } from "./Vocal";

/**
 * MICHOU — 03/10/2026. Troisième tournage où le clip fini joue.
 *
 * Repères du tournage :
 *   commande 16,6 s · analyse 19,7 → 165,4 s (2 min 26) · grille 165,4
 *   clip prêt 311,0 · clip qui JOUE 311,7 → 323,7
 *
 * Le téléchargement a pris 141 s cette fois, contre 25 s pour Squeezie et 23 s
 * pour Inoxtag. L'attente n'est pas prévisible : c'est pourquoi l'enregistreur
 * interroge le lecteur plutôt que d'attendre un délai fixe.
 *
 * Planches contact pour ce que les repères ne donnent pas : la miniature
 * apparaît à 16 s, et la grille — DIX clips ici — tient de 165,5 à 169,5.
 *
 * ── LA SEULE VARIABLE QUI BOUGE AUJOURD'HUI ──────────────────────────────
 * Aucune. Gabarit, musique, durée, structure, forme du titre : tout est
 * identique aux deux Shorts précédents. C'est voulu — le titre à la première
 * personne a deux observations (51 et 120 vues contre 40 pour un titre
 * descriptif), et `apprendre.js` refuse de conclure sous trois. Celui-ci est
 * la troisième.
 */
export const MICHOU: ReglagesVocal = {
  source: "rec-michou-h264.mp4",
  dureeVoix: 2.1,
  voix: "voix/commande-michou.mp3",
  dureeVraie: "2 min 26",
  plans: [
    {
      debut: 0, fin: 2.4, rec: [12.0, 14.5],
      cadre: [180, 120, 720, 1160],
      texte: "« Prends la dernière vidéo de Michou »",
    },
    {
      debut: 2.4, fin: 4.6, rec: [16.2, 19.3],
      cadre: [280, 200, 520, 930],
      texte: "Elle trouve la vidéo toute seule.",
    },
    {
      debut: 4.6, fin: 6.4, rec: [25.0, 70.0],
      cadre: [210, 30, 660, 630],
      texte: "Elle lit tout ce qui est dit.",
    },
    {
      /* Dix cartes sur deux rangées : le cadre descend plus bas que sur les
         grilles à huit, sinon la seconde rangée sort de la zone sûre. */
      debut: 6.4, fin: 9.0, rec: [165.7, 167.7],
      cadre: [20, 140, 1040, 880],
      texte: "Dix clips, notés.",
    },
    {
      /* Vitesse réelle : les sous-titres doivent se lire. */
      debut: 9.0, fin: 13.5, rec: [313.0, 317.5],
      cadre: [150, 300, 540, 980],
      texte: "Recadré, sous-titré, prêt.",
    },
  ],
};
