import { ReglagesVocal } from "./Vocal";

/**
 * SQUEEZIE — 02/10/2026. Le premier film où l'on voit le clip FINI jouer.
 *
 * ── CE QUI A ENFIN MARCHÉ ────────────────────────────────────────────────
 * Les deux tournages du 01/10 se terminaient sur « Téléchargement du clip… ».
 * Retour de l'utilisateur, deux fois : « tu montres bien le résultat final, pas
 * le téléchargement du clip ».
 *
 * La cause tenait en une ligne : l'enregistreur interrogeait
 * `document.querySelector("video")`, qui rend le PREMIER lecteur de la page —
 * l'aperçu 16:9 de l'accueil, déjà chargé — et concluait donc aussitôt que le
 * clip jouait. Les bons éléments sont `#modal-video` et `#modal-player-ph`.
 * Et le clip ne démarre pas tout seul : il faut cliquer sur l'overlay.
 *
 * Relevé de ce tournage : téléchargement de 412,3 s à 437,0 s (24,7 s), clic,
 * puis lecture réelle de 437,7 s à 449,7 s. Vérifié image par image — onze
 * images différentes, sous-titres karaoké qui avancent mot à mot.
 *
 * ── POURQUOI LE DERNIER PLAN EST À VITESSE RÉELLE ────────────────────────
 * 4,5 s de source pour 4,5 s de film. Tous les autres plans sont accélérés,
 * celui-ci non : des sous-titres qui défilent à deux fois la vitesse ne se
 * lisent pas, et c'est précisément ce qu'on veut montrer.
 *
 * Les trois premières secondes de lecture (438–441) tombent sur une séquence
 * sponsorisée de la vidéo source — on entre à 441.
 */
export const SQUEEZIE: ReglagesVocal = {
  source: "rec-squeezie-h264.mp4",
  dureeVoix: 2.2,
  voix: "voix/commande-squeezie.mp3",
  /* Analyse relevée : 18,9 s → 408,1 s, soit 389 s. */
  dureeVraie: "6 min 29",
  /* Le son du clip manque encore : l'enregistrement Playwright n'a pas de piste
     audio, et il faut le vrai clip exporté — pas une synthèse. Renseigner dès
     que `exporter-clip.mjs lbLj5Yb6SAE 1089 1121 public/clip-squeezie.mp4` a
     tourné :
       sonClip: { fichier: "clip-squeezie.mp4", depart: 3.9 },
     3,9 s = (441,0 − 437,7) + 0,6, d'après les repères du tournage. */
  plans: [
    {
      debut: 0, fin: 2.4, rec: [12.0, 14.0],
      cadre: [180, 120, 720, 1160],
      texte: "« Prends la dernière vidéo de Squeezie »",
    },
    {
      /* 14,0 s : la miniature apparaît. Relevé sur planche contact. */
      debut: 2.4, fin: 4.6, rec: [14.3, 18.3],
      cadre: [280, 200, 520, 930],
      texte: "Elle trouve la vidéo toute seule.",
    },
    {
      debut: 4.6, fin: 6.4, rec: [25.0, 70.0],
      cadre: [210, 30, 660, 630],
      texte: "Elle lit tout ce qui est dit.",
    },
    {
      /* Grille utilisable de 408,5 à 412,0 : avant, l'écran d'analyse ; après,
         l'éditeur est déjà ouvert. */
      debut: 6.4, fin: 9.0, rec: [408.8, 410.8],
      cadre: [20, 130, 1040, 860],
      texte: "Huit clips, notés.",
    },
    {
      /* LE PLAN QUI MANQUAIT : le clip fini, qui joue, à vitesse réelle. */
      debut: 9.0, fin: 13.5, rec: [441.0, 445.5],
      cadre: [150, 300, 540, 980],
      texte: "Recadré, sous-titré, prêt.",
    },
  ],
};
