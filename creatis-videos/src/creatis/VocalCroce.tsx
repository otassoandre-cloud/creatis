import { ReglagesVocal } from "./Vocal";

/**
 * PIERRE CROCE — 05/10/2026. Ouverture sur le résultat, confirmée par la mesure.
 *
 * ── CE QUE LA VEILLE A PROUVÉ ────────────────────────────────────────────
 * Compteurs exacts relevés le 05/10 (page de chaque vidéo, pas les cartes) :
 *     338 vues  ouverture sur le résultat   (30 h)
 *     156 vues  meilleure version d'avant   (44 h)
 * Les deux meilleurs Shorts de la série sont les deux qui ouvrent sur le clip
 * fini. On garde cette structure.
 *
 * Et un rappel inscrit dans le code pour ne pas le repayer : ce 338 avait été
 * rapporté « 0 » pendant 24 h, parce que le relevé remplaçait un compteur
 * illisible par zéro. J'ai failli conclure l'inverse de la vérité.
 *
 * ── LES TEMPS ────────────────────────────────────────────────────────────
 * commande 17,3 s · analyse 20,6 → 199,6 s (2 min 59) · grille 199,6
 * clip prêt 226,4 · clip qui JOUE 227,2 → 239,6 · clip récupéré 14,4 Mo
 * Grille utilisable de 200,5 à 204,0 (planche contact) — quatre clips.
 */
export const CROCE: ReglagesVocal = {
  source: "rec-croce-h264.mp4",
  dureeVoix: 2.7,
  voix: "voix/commande-croce.mp3",
  debutVoix: 2.3,
  dureeVraie: "2 min 59",
  sonClip: { fichier: "son-clip-croce.mp3", depart: 0 },
  plans: [
    {
      debut: 0, fin: 2.2, rec: [228.0, 230.2],
      cadre: [150, 300, 540, 980],
      sonDepart: 1.4, // (228,0 − 227,2) + 0,6
      texte: "Ce clip n'existait pas il y a 3 minutes.",
    },
    {
      debut: 2.2, fin: 4.6, rec: [13.0, 15.5],
      cadre: [180, 120, 720, 1160],
      texte: "« Prends la dernière vidéo de Pierre Croce »",
    },
    {
      debut: 4.6, fin: 6.4, rec: [18.0, 20.4],
      cadre: [280, 200, 520, 930],
      texte: "Elle trouve la vidéo toute seule.",
    },
    {
      debut: 6.4, fin: 8.2, rec: [25.0, 70.0],
      cadre: [210, 30, 660, 630],
      texte: "Elle lit tout ce qui est dit.",
    },
    {
      /* Quatre cartes seulement : la grille est plus étroite, on la cadre
         serré pour qu'elles restent lisibles. */
      debut: 8.2, fin: 10.6, rec: [200.8, 202.8],
      cadre: [20, 140, 700, 560],
      texte: "Quatre clips, notés.",
    },
    {
      debut: 10.6, fin: 13.5, rec: [234.0, 236.9],
      cadre: [150, 300, 540, 980],
      sonDepart: 7.4, // (234,0 − 227,2) + 0,6
      texte: "Recadré, sous-titré, prêt.",
    },
  ],
};
