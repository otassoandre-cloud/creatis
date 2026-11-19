import { ReglagesVocal } from "./Vocal";

/**
 * GOTAGA — 06/10/2026, le soir. PREMIER FILM AVEC LE HOOK CORRIGÉ.
 *
 * ── CE QUI CHANGE, ET SEULEMENT ÇA ───────────────────────────────────────
 * Le hook. Relevé le 06/10 sur six Shorts de 3,3 à 20 millions de vues : ce
 * qui marche nomme la SITUATION DU SPECTATEUR, à la deuxième personne —
 * « quand t'es dans un endroit où t'as pas de réseau », « si ton smartphone
 * prend l'eau ». Mes accroches disaient « Ce clip n'existait pas il y a trois
 * minutes », « J'ai changé une seule chose » : je parlais de moi et d'un
 * logiciel, et je plafonnais à 330 vues.
 *
 * Celle-ci dit « Quand tu dois sortir 10 clips ce soir ». Tout le reste est
 * tenu fixe — même gabarit, même musique, même durée, même structure — pour
 * que l'écart soit attribuable au hook et à rien d'autre.
 *
 * ── LES TEMPS ────────────────────────────────────────────────────────────
 * commande 16,2 s · analyse 20,8 → 102,7 s (1 min 22) · grille 102,7
 * clip prêt 184,4 · clip qui JOUE 185,1 → 197,8 · clip récupéré 20,9 Mo
 *
 * Les repères collent au fichier cette fois (200,4 s pour 197,8 s de repères),
 * contrairement au tournage Norman où 23 secondes manquaient. On vérifie à
 * chaque fois : la dérive ne prévient pas.
 */
export const GOTAGA: ReglagesVocal = {
  source: "rec-gotaga-h264.mp4",
  dureeVoix: 2.2,
  voix: "voix/commande-gotaga.mp3",
  debutVoix: 2.3,
  dureeVraie: "1 min 22",
  sonClip: { fichier: "son-clip-gotaga.mp3", depart: 0 },
  plans: [
    {
      debut: 0, fin: 2.2, rec: [187.0, 189.2],
      cadre: [150, 300, 540, 980],
      sonDepart: 2.6, // (187,0 − 185,1) + 0,7
      accroche: "Quand tu dois sortir // 10 clips ce soir",
    },
    {
      debut: 2.2, fin: 4.4, rec: [12.0, 14.5],
      cadre: [180, 120, 720, 1160],
      texte: "« Prends la dernière vidéo de Gotaga »",
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
      debut: 8.2, fin: 10.6, rec: [103.2, 105.2],
      cadre: [20, 140, 700, 560],
      /* QUATRE : la grille de ce tournage en montre quatre, pas dix.
         Reprendre le chiffre d un film precedent est un mensonge affiche. */
      texte: "Quatre clips, notés.",
    },
    {
      debut: 10.6, fin: 13.5, rec: [192.0, 194.9],
      cadre: [150, 300, 540, 980],
      sonDepart: 7.6, // (192,0 − 185,1) + 0,7
      texte: "Recadré, sous-titré, prêt.",
    },
  ],
};
