import { ReglagesVocal } from "./Vocal";

/**
 * McFLY ET CARLITO — 03/10/2026. Le premier film où l'on ENTEND le clip.
 *
 * ── CE QUI A DÉBLOQUÉ LE SON ─────────────────────────────────────────────
 * Le reproche était net : « à la fin ça doit être le son du clip que tu as
 * généré qui est actif […] il n'y a pas de son, il y a une musique banale qui
 * n'apporte rien ».
 *
 * Trois chemins essayés et jetés :
 *   · le « Mixage stéréo » de Windows — mesuré à −90 dB, il ne capte rien de
 *     ce que joue le navigateur ;
 *   · `exporter-clip.mjs` — demande des identifiants Créatis absents du .env ;
 *   · le CLI Railway — refusé par les permissions.
 *
 * Le bon chemin était dans la page : le lecteur joue depuis un **blob**. On le
 * relit avec `fetch` et on le sort en base64. C'est le fichier que l'utilisateur
 * obtiendrait en cliquant sur Exporter — son compris, sans aucun identifiant.
 * Récupéré ici : 11,7 Mo, AAC stéréo, crête à −2,9 dB.
 *
 * ── LES TEMPS ────────────────────────────────────────────────────────────
 * commande 13,8 s · analyse 16,9 → 484,7 s (7 min 47) · grille 484,7
 * clip prêt 509,0 · clip qui JOUE 509,7 → 522,0
 *
 * Le dernier plan entre à 516,5 et non à 510 : les six premières secondes de
 * lecture cadrent un tableau blanc vide, le temps que les interlocuteurs
 * reviennent à l'image. Relevé sur planche contact, pas deviné.
 */
export const MCFLY: ReglagesVocal = {
  source: "rec-mcfly-h264.mp4",
  dureeVoix: 2.7,
  voix: "voix/commande-mcfly.mp3",
  dureeVraie: "7 min 47",
  /* (516,5 − 509,7) + 0,6 = 7,4 s dans le clip. La musique s'efface dessous. */
  sonClip: { fichier: "son-clip-mcfly.mp3", depart: 7.4 },
  plans: [
    {
      debut: 0, fin: 2.4, rec: [10.0, 12.5],
      cadre: [180, 120, 720, 1160],
      texte: "« Prends la dernière vidéo de McFly et Carlito »",
    },
    {
      debut: 2.4, fin: 4.6, rec: [13.5, 16.5],
      cadre: [280, 200, 520, 930],
      texte: "Elle trouve la vidéo toute seule.",
    },
    {
      debut: 4.6, fin: 6.4, rec: [22.0, 70.0],
      cadre: [210, 30, 660, 630],
      texte: "Elle lit tout ce qui est dit.",
    },
    {
      /* Grille utilisable de 485,0 à 488,5 : à 484,5 les cartes sont encore
         des squelettes gris, à 489 l'éditeur est ouvert. Dix cartes, donc le
         cadre descend plus bas que sur une grille à huit. */
      debut: 6.4, fin: 9.0, rec: [485.2, 487.2],
      cadre: [20, 140, 1040, 880],
      texte: "Dix clips, notés.",
    },
    {
      debut: 9.0, fin: 13.5, rec: [516.5, 521.0],
      cadre: [150, 300, 540, 980],
      texte: "Et on l'entend.",
    },
  ],
};
