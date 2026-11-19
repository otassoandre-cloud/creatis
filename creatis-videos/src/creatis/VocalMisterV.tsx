import { ReglagesVocal } from "./Vocal";

/**
 * MISTER V — 03/10/2026, second cycle de la journée.
 *
 * Repères : commande 15,3 s · analyse 19,9 → 266,9 s (4 min 07) · grille 266,9
 * clip prêt 293,3 · clip qui JOUE 294,0 → 306,4 · clip récupéré 13,6 Mo.
 *
 * Grille utilisable de 268,0 à 271,5 — relevé sur planche contact : avant 268
 * l'écran d'analyse est encore là, et la fiche s'ouvre à 271,1.
 *
 * Le dernier plan s'arrête à 301,5 et non plus tard : après, le clip montre une
 * lecture de commentaires où des mots sont floutés. Rien de grave, mais une
 * vignette finale illisible ne prouve rien.
 *
 * ── LA SEULE VARIABLE QUI BOUGE ──────────────────────────────────────────
 * Le TITRE YouTube, et lui seul. Quatre Shorts à titre « Je teste une commande
 * vocale sur la dernière vidéo de X » ont donné 52, 57, 120 et 155 vues ; le
 * seul titre descriptif, 48. La forme première personne tient, mais mes titres
 * font 58 caractères et enterrent l'information. Les Shorts à 1 100-1 900 vues
 * de cette chaîne sont courts et portent un chiffre ou une question.
 * Celui-ci teste donc un titre court AVEC un chiffre, tout le reste identique.
 */
export const MISTERV: ReglagesVocal = {
  source: "rec-misterv-h264.mp4",
  dureeVoix: 2.2,
  voix: "voix/commande-misterv.mp3",
  dureeVraie: "4 min 07",
  /* (297,0 − 294,0) + 0,6 = 3,6 s dans le clip. */
  sonClip: { fichier: "son-clip-misterv.mp3", depart: 3.6 },
  plans: [
    {
      debut: 0, fin: 2.4, rec: [11.0, 13.5],
      cadre: [180, 120, 720, 1160],
      texte: "« Prends la dernière vidéo de Mister V »",
    },
    {
      debut: 2.4, fin: 4.6, rec: [16.5, 19.4],
      cadre: [280, 200, 520, 930],
      texte: "Elle trouve la vidéo toute seule.",
    },
    {
      debut: 4.6, fin: 6.4, rec: [25.0, 70.0],
      cadre: [210, 30, 660, 630],
      texte: "Elle lit tout ce qui est dit.",
    },
    {
      debut: 6.4, fin: 9.0, rec: [268.4, 270.4],
      cadre: [20, 140, 1040, 880],
      texte: "Dix clips, notés.",
    },
    {
      debut: 9.0, fin: 13.5, rec: [297.0, 301.5],
      cadre: [150, 300, 540, 980],
      texte: "Et on l'entend.",
    },
  ],
};
