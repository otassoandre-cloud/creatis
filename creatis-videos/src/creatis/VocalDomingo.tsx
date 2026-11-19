import { ReglagesVocal } from "./Vocal";

/**
 * DOMINGO — 06/10/2026. Structure confirmée par deux jours de mesures.
 *
 * ── CE QUE LES COMPTEURS EXACTS DISENT AU 06/10 ──────────────────────────
 *     330  ouverture sur le résultat      (2 j)
 *     156  ancienne structure             (3 j)
 *     123  ouverture sur le résultat      (20 h)
 *     113  ouverture sur le résultat      (1 j)
 * Les trois meilleurs rapports vues/âge sont les trois films qui ouvrent sur
 * le clip fini. On ne touche plus à la structure.
 *
 * ── LES TEMPS ────────────────────────────────────────────────────────────
 * commande 16,6 s · analyse 20,2 → 714,3 s (11 min 34) · grille 714,3
 * clip prêt 748,4 · clip qui JOUE 749,1 → 761,6 · clip récupéré 14,5 Mo
 * Grille utilisable de 714,5 à 718,5 (planche contact).
 *
 * L'ouverture entre à 751 et non à 749,1 : les deux premières secondes de
 * lecture sont encore noires, le temps que le lecteur s'amorce. Une première
 * image noire sur un film qui mise tout sur sa première image, ce serait se
 * tirer dans le pied.
 */
export const DOMINGO: ReglagesVocal = {
  source: "rec-domingo-h264.mp4",
  dureeVoix: 2.2,
  voix: "voix/commande-domingo.mp3",
  debutVoix: 2.3,
  dureeVraie: "11 min 34",
  sonClip: { fichier: "son-clip-domingo.mp3", depart: 0 },
  plans: [
    {
      debut: 0, fin: 2.2, rec: [751.0, 753.2],
      cadre: [150, 300, 540, 980],
      sonDepart: 2.5, // (751,0 − 749,1) + 0,6
      texte: "Ce clip n'existait pas il y a 11 minutes.",
    },
    {
      debut: 2.2, fin: 4.4, rec: [12.0, 14.5],
      cadre: [180, 120, 720, 1160],
      texte: "« Prends la dernière vidéo de Domingo »",
    },
    {
      debut: 4.4, fin: 6.4, rec: [17.5, 20.0],
      cadre: [280, 200, 520, 930],
      texte: "Elle trouve la vidéo toute seule.",
    },
    {
      debut: 6.4, fin: 8.2, rec: [25.0, 70.0],
      cadre: [210, 30, 660, 630],
      texte: "Elle lit tout ce qui est dit.",
    },
    {
      debut: 8.2, fin: 10.6, rec: [714.8, 716.8],
      cadre: [20, 140, 1040, 880],
      texte: "Dix clips, notés.",
    },
    {
      debut: 10.6, fin: 13.5, rec: [756.0, 758.9],
      cadre: [150, 300, 540, 980],
      sonDepart: 7.5, // (756,0 − 749,1) + 0,6
      texte: "Recadré, sous-titré, prêt.",
    },
  ],
};
