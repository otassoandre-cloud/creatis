import { ReglagesVocal } from "./Vocal";

/**
 * INOXTAG — 02/10/2026, second tournage de la journée.
 *
 * Tout vient des repères du tournage, relevés pendant l'enregistrement :
 *   commande  15,8 s · analyse 19,9 → 247,4 s (3 min 48) · grille 247,4
 *   clip prêt 274,3 · clip qui JOUE 275,0 → 287,0
 *
 * Et des planches contact, pour les bornes que les repères ne donnent pas :
 *   la miniature apparaît à 16 s · la grille tient de 247,5 à 251,5, après quoi
 *   l'éditeur s'ouvre.
 *
 * ── CE QUI MANQUE ENCORE ─────────────────────────────────────────────────
 * Le son du clip. Playwright n'enregistre que l'image (zéro piste audio
 * vérifiée), et l'obtenir demande le clip réellement exporté — donc des
 * identifiants Créatis absents du `.env`. Le câblage est prêt : renseigner
 *     sonClip: { fichier: "clip-inoxtag.mp4", depart: 1.6 },
 * 1,6 s = (276,0 − 275,0) + 0,6, d'après les repères.
 */
export const INOXTAG: ReglagesVocal = {
  source: "rec-inoxtag-h264.mp4",
  dureeVoix: 2.3,
  voix: "voix/commande-inoxtag.mp3",
  dureeVraie: "3 min 48",
  plans: [
    {
      debut: 0, fin: 2.4, rec: [12.0, 14.5],
      cadre: [180, 120, 720, 1160],
      texte: "« Prends la dernière vidéo d'Inoxtag »",
    },
    {
      debut: 2.4, fin: 4.6, rec: [16.2, 19.4],
      cadre: [280, 200, 520, 930],
      texte: "Elle trouve la vidéo toute seule.",
    },
    {
      debut: 4.6, fin: 6.4, rec: [25.0, 70.0],
      cadre: [210, 30, 660, 630],
      texte: "Elle lit tout ce qui est dit.",
    },
    {
      debut: 6.4, fin: 9.0, rec: [247.6, 249.6],
      cadre: [20, 130, 1040, 860],
      texte: "Huit clips, notés.",
    },
    {
      /* Vitesse réelle : des sous-titres karaoké accélérés ne se lisent pas,
         et c'est exactement ce qu'on vient voir. */
      debut: 9.0, fin: 13.5, rec: [276.0, 280.5],
      cadre: [150, 300, 540, 980],
      texte: "Recadré, sous-titré, prêt.",
    },
  ],
};
