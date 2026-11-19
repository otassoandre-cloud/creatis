import { ReglagesVocal } from "./Vocal";

/**
 * NORMAN — 06/10/2026, second cycle. Première accroche en très gros.
 *
 * ── CE QUE J'AI ENFIN REGARDÉ ────────────────────────────────────────────
 * Le plafond était à 330 vues. J'ai ouvert, pour la première fois, les Shorts
 * de la chaîne qui dépassent mille vues :
 *   1 967  un VISAGE en gros plan, filmé à la webcam, expression marquée, et
 *          par-dessus deux lignes de texte énormes + émojis, dès la 1ʳᵉ image
 *   1 332  un montage de football avec un badge rouge « Tuto short 30sec »
 *
 * Les miens ouvrent sur le clip d'un autre dans une interface, avec une
 * légende discrète à mi-hauteur. La différence de forme est flagrante.
 *
 * Deux leviers en sortent. Le premier — un visage — ne m'appartient pas : il
 * faut filmer celui du propriétaire de la chaîne. Le second est à ma portée :
 * une ACCROCHE énorme et haute dès la première image. C'est ce que teste ce
 * film, tout le reste étant tenu fixe.
 *
 * ── LE PIÈGE DU JOUR : LES REPÈRES ONT DÉCROCHÉ DU FICHIER ──────────────
 * Les repères vont jusqu'à 226,6 s ; le fichier fait 203,2 s. Playwright a
 * perdu les 23 premières secondes de l'enregistrement. Les temps ci-dessous
 * sont donc relevés SUR LE FICHIER, planche contact à l'appui — grille à
 * 112-117, clip qui joue à partir de 186 — et non sur les repères.
 */
export const NORMAN: ReglagesVocal = {
  source: "rec-norman-h264.mp4",
  dureeVoix: 2.1,
  voix: "voix/commande-norman.mp3",
  debutVoix: 2.3,
  dureeVraie: "2 min 43",
  sonClip: { fichier: "son-clip-norman.mp3", depart: 0 },
  plans: [
    {
      debut: 0, fin: 2.2, rec: [187.0, 189.2],
      cadre: [150, 300, 540, 980],
      sonDepart: 1.7, // (187,0 − 186,0) + 0,7
      accroche: "Une phrase. // Dix clips. 😳",
    },
    {
      debut: 2.2, fin: 4.4, rec: [14.0, 16.5],
      cadre: [180, 120, 720, 1160],
      texte: "« Prends la dernière vidéo de Norman »",
    },
    {
      debut: 4.4, fin: 6.4, rec: [18.0, 20.5],
      cadre: [280, 200, 520, 930],
      texte: "Elle trouve la vidéo toute seule.",
    },
    {
      debut: 6.4, fin: 8.2, rec: [25.0, 70.0],
      cadre: [210, 30, 660, 630],
      texte: "Elle lit tout ce qui est dit.",
    },
    {
      debut: 8.2, fin: 10.6, rec: [112.5, 114.5],
      cadre: [20, 140, 700, 560],
      texte: "Quatre clips, notés.",
    },
    {
      debut: 10.6, fin: 13.5, rec: [194.0, 196.9],
      cadre: [150, 300, 540, 980],
      sonDepart: 8.7, // (194,0 − 186,0) + 0,7
      texte: "Recadré, sous-titré, prêt.",
    },
  ],
};
