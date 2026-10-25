import { ReglagesVocal } from "./Vocal";

/**
 * AMIXEM — second tournage de la commande vocale, 01/10/2026.
 *
 * Même dispositif que le film Boiserie : la composition `Vocal` fournit la zone
 * sûre, la musique, les légendes et le bandeau. On ne déclare ici que ce qui est
 * propre à CE tournage — ses fenêtres, ses cadres, sa voix.
 *
 * ── CE QUI CHANGE PAR RAPPORT À BOISERIE ─────────────────────────────────
 * L'analyse a duré 87 s au lieu de 216, et elle a rendu QUATRE clips au lieu de
 * huit. La grille est donc plus étroite : son cadre l'agrandit (×1,26) au lieu
 * de la réduire.
 *
 * ── LA FIN, ENCORE ───────────────────────────────────────────────────────
 * Le film s'arrête sur la grille, pas sur l'éditeur. L'aperçu du clip affiche
 * « Téléchargement du clip… » de 110 s à la fin de l'enregistrement : relevé
 * image par image sur neuf secondes, il ne joue jamais. Le détecteur posé ce
 * jour-là a cru le contraire — il interrogeait `document.querySelector("video")`,
 * qui rend le premier lecteur de la page et non celui du clip. À corriger avant
 * le prochain tournage, faute de quoi aucun film ne pourra montrer le résultat.
 */
export const AMIXEM: ReglagesVocal = {
  source: "rec-amixem-h264.mp4",
  dureeVoix: 2.3,
  /* Analyse relevée : 20,3 s → 107,3 s, soit 87 s. */
  dureeVraie: "1 min 27",
  voix: "voix/commande-amixem.mp3",
  plans: [
    {
      /* La phrase vient d'être dite, l'application cherche la chaîne. */
      debut: 0, fin: 2.6, rec: [12.0, 14.0],
      cadre: [180, 120, 720, 1160],
      texte: "« Prends la dernière vidéo d'Amixem »",
    },
    {
      /* 14,0 s : la miniature apparaît. Relevé sur planche contact. */
      debut: 2.6, fin: 5.2, rec: [14.2, 18.4],
      cadre: [280, 200, 520, 930],
      texte: "Elle trouve la vidéo toute seule.",
    },
    {
      /* L'analyse : 87 s compressées en 2,2 s. Le bandeau dit le vrai temps. */
      debut: 5.2, fin: 7.4, rec: [22.0, 60.0],
      cadre: [210, 30, 660, 630],
      texte: "Elle lit tout ce qui est dit.",
    },
    {
      /* Grille utilisable de 106,0 à 109,75 : avant, les cartes sont des
         squelettes gris ; après, l'éditeur est déjà ouvert. */
      debut: 7.4, fin: 10.6, rec: [106.2, 108.0],
      cadre: [20, 50, 720, 540],
      texte: "Quatre clips, notés.",
    },
    {
      /* Gros plan sur les notes : c'est la preuve, et elle est lisible. */
      debut: 10.6, fin: 13.5, rec: [108.0, 109.6],
      /* Resserré sur DEUX cartes : à 500 px de large, le cadre laissait
         voir une quatrième carte tranchée par le bord de l'écran. */
      cadre: [30, 130, 340, 460],
      texte: "Prêts à publier.",
    },
  ],
};
