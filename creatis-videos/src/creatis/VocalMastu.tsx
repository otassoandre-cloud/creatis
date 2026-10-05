import { ReglagesVocal } from "./Vocal";

/**
 * MASTU — 04/10/2026, second cycle. Ouverture sur le résultat, légende remontée.
 *
 * ── DEUX TOURNAGES JETÉS AVANT CELUI-CI, ET POURQUOI ─────────────────────
 * · Joyca : le clip extrait était en vision nocturne, granuleux, avec un
 *   sous-titre grossier en gros plan. Depuis que le film OUVRE sur le clip,
 *   la qualité de ce plan décide de tout : une image sombre et illisible en
 *   première seconde annule la correction qu'on vient de faire.
 * · Lena Situations : la synthèse vocale a refusé la phrase
 *   (`PROHIBITED_CONTENT`) — un faux positif de Gemini sur ce nom. Rien à
 *   corriger de notre côté, il faut changer de chaîne.
 *
 * Celui-ci : deux visages, lumière franche, conversation animée. C'est ce que
 * la mesure de rétention demande.
 *
 * ── LES TEMPS ────────────────────────────────────────────────────────────
 * commande 16,6 s · analyse 19,7 → 182,7 s (2 min 43) · grille 182,7
 * clip prêt 222,7 · clip qui JOUE 223,3 → 235,7 · clip récupéré 8,3 Mo
 * Grille utilisable de 183,0 à 186,5 (planche contact).
 */
export const MASTU: ReglagesVocal = {
  source: "rec-mastu-h264.mp4",
  dureeVoix: 2.2,
  voix: "voix/commande-mastu.mp3",
  debutVoix: 2.3,
  dureeVraie: "2 min 43",
  sonClip: { fichier: "son-clip-mastu.mp3", depart: 0 },
  plans: [
    {
      debut: 0, fin: 2.2, rec: [224.5, 226.7],
      cadre: [150, 300, 540, 980],
      sonDepart: 1.8, // (224,5 − 223,3) + 0,6
      texte: "Ce clip n'existait pas il y a 3 minutes.",
    },
    {
      debut: 2.2, fin: 4.4, rec: [12.0, 14.5],
      cadre: [180, 120, 720, 1160],
      texte: "« Prends la dernière vidéo de Mastu »",
    },
    {
      debut: 4.4, fin: 6.4, rec: [17.0, 19.5],
      cadre: [280, 200, 520, 930],
      texte: "Elle trouve la vidéo toute seule.",
    },
    {
      debut: 6.4, fin: 8.2, rec: [25.0, 70.0],
      cadre: [210, 30, 660, 630],
      texte: "Elle lit tout ce qui est dit.",
    },
    {
      debut: 8.2, fin: 10.6, rec: [183.2, 185.2],
      cadre: [20, 140, 1040, 880],
      texte: "Dix clips, notés.",
    },
    {
      debut: 10.6, fin: 13.5, rec: [229.0, 231.9],
      cadre: [150, 300, 540, 980],
      sonDepart: 6.3, // (229,0 − 223,3) + 0,6
      texte: "Recadré, sous-titré, prêt.",
    },
  ],
};
