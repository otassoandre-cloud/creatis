import { ReglagesVocal } from "./Vocal";

/**
 * CYPRIEN — 04/10/2026. Le premier film qui s'ouvre sur le RÉSULTAT.
 *
 * ── CE QUE LA RÉTENTION A DIT, ET CE QUE ÇA CHANGE ───────────────────────
 * Relevé dans Studio le 04/10, sur le format précédent :
 *   « Ont continué de regarder »   9,9 %   (contre 30,4 % pour un Short de la
 *                                           même chaîne)
 *   part regardée                  79 %    (0:11 sur 0:14)
 *
 * Ceux qui restent regardent donc les quatre cinquièmes du film : le montage
 * tient. Mais neuf personnes sur dix balaient dans la première seconde. Ce
 * n'est pas le montage qui perd, c'est l'OUVERTURE — on commençait sur la page
 * d'accueil d'une application web, où rien ne bouge et où personne n'apparaît.
 *
 * Ce film ouvre donc sur le clip fini qui joue, avec son son : un visage, du
 * mouvement, de la lumière, et une phrase en cours. La commande vocale vient
 * ensuite, et le parcours se déroule après. On montre d'abord ce qu'on a
 * obtenu, on explique après comment.
 *
 * ── LES TEMPS ────────────────────────────────────────────────────────────
 * commande 16,0 s · analyse 19,6 → 208,5 s (3 min 09) · grille 208,5
 * clip prêt 232,8 · clip qui JOUE 233,6 → 246,0 · clip récupéré 11,0 Mo
 * Grille utilisable de 209,0 à 212,5 (planche contact).
 */
export const CYPRIEN: ReglagesVocal = {
  source: "rec-cyprien-h264.mp4",
  dureeVoix: 2.2,
  voix: "voix/commande-cyprien.mp3",
  /* La voix n'ouvre plus le film : elle arrive sur le deuxième plan. */
  debutVoix: 2.3,
  dureeVraie: "3 min 09",
  sonClip: { fichier: "son-clip-cyprien.mp3", depart: 0 },
  plans: [
    {
      /* L'OUVERTURE : le clip fini, qui joue, avec son son. Vitesse réelle. */
      debut: 0, fin: 2.2, rec: [235.0, 237.2],
      cadre: [150, 300, 540, 980],
      sonDepart: 2.0, // (235,0 − 233,6) + 0,6
      texte: "Ce clip n'existait pas il y a 3 minutes.",
    },
    {
      debut: 2.2, fin: 4.4, rec: [11.0, 13.5],
      cadre: [180, 120, 720, 1160],
      texte: "« Prends la dernière vidéo de Cyprien »",
    },
    {
      debut: 4.4, fin: 6.4, rec: [16.5, 19.3],
      cadre: [280, 200, 520, 930],
      texte: "Elle trouve la vidéo toute seule.",
    },
    {
      debut: 6.4, fin: 8.2, rec: [25.0, 70.0],
      cadre: [210, 30, 660, 630],
      texte: "Elle lit tout ce qui est dit.",
    },
    {
      debut: 8.2, fin: 10.6, rec: [209.2, 211.2],
      cadre: [20, 140, 1040, 880],
      texte: "Dix clips, notés.",
    },
    {
      /* Et on y revient, plus longtemps, pour finir sur la preuve. */
      debut: 10.6, fin: 13.5, rec: [241.0, 243.9],
      cadre: [150, 300, 540, 980],
      sonDepart: 8.0, // (241,0 − 233,6) + 0,6
      texte: "Recadré, sous-titré, prêt.",
    },
  ],
};
