import type { ReglageParcours } from "./Parcours";

/**
 * LES TROIS VIDÉOS DU 18/09/2026.
 *
 * Trois générations réelles, faites le même jour sur trois vidéos d'Amixem.
 * Tout ce qui change d'une vidéo à l'autre tient ici ; le montage, lui, est
 * partagé.
 *
 * ── COMMENT CES NOMBRES SONT OBTENUS ─────────────────────────────────────
 *   1. `enregistrer-parcours.mjs <url>` filme le parcours et liste les clips ;
 *   2. `reperes-parcours.mjs <enregistrement>` relève les quatre repères — ils
 *      ne sont plus estimés à l'œil, ce qui a coûté trois montages faux ;
 *   3. `exporter-clip.mjs <id> <debut> <fin> <sortie> face` produit le clip ET,
 *      avec `SOURCE_BRUTE=`, la vidéo large du même intervalle ;
 *   4. `mesurer-luminance.mjs <clip> <duree> 26` donne la meilleure fenêtre de
 *      26 secondes et la luminance à relever.
 *
 * ── LE CLIP MONTRÉ N'EST PAS TOUJOURS LE PREMIER DE LA LISTE ─────────────
 * Le script ouvre toujours le clip le mieux noté, mais le score dit ce qui se
 * RACONTE, pas ce qui se REGARDE : sur « Promesses de publicités », le clip noté
 * 89 est un téléviseur filmé pendant une minute, sans un seul visage. On choisit
 * donc dans la grille celui qui montre quelqu'un — et la section application
 * s'arrête sur la grille, justement pour ne rien prétendre sur lequel on ouvre.
 *
 * ── RELÈVEMENT ────────────────────────────────────────────────────────────
 * Cible : 116-118 sur la première seconde. `saturate(1.04)` seul quand la source
 * est déjà au-dessus ; sinon `brightness()` jusqu'à 1,45, jamais au-delà — la
 * peau sature (0,4 % de pixels brûlés à 1,35, 2,0 % à 1,50).
 */
export const PARCOURS: { id: string; reglage: ReglageParcours }[] = [
  {
    /* Amixem, « ON TESTE LES PROMESSES DE PUBLICITÉS #6 », 32 min.
       4 clips en 3 min 02. Clip retenu : « Découvre tes ancêtres célèbres »
       (0:30, 73 s, noté 84) — le mieux noté, « Blendtec broie tout ! », ne
       filme qu'un écran de télévision.
       Luminance 144 de moyenne, 127 sur la fenêtre retenue : aucun relèvement,
       la source est déjà au-dessus de la cible. */
    id: "Parcours-Ancetres",
    reglage: {
      enregistrement: "parcours-T0aGmpVzFKg.mp4",
      clip: "clip-ancetres.mp4",
      source: "src-ancetres.mp4",
      clipDebut: 1,
      releve: "saturate(1.04)",
      reperes: { lien: 15, analyse: 18, grille: 200, modale: 207, fin: 212 },
      chiffres: { source: "32 min", analyse: "3 min 02", clip: "73 s" },
    },
  },
  {
    /* Amixem, « ON OUVRE DES COFFRES-FORTS DE 1 € À 10 000 € », 42 min.
       6 clips en 3 min 45. Clip retenu : « Accusé de plagiat en vidéo »
       (1:25, 34 s, noté 80) — le premier de la liste, et il montre quelqu'un.
       Luminance 88 de moyenne, 99 sur la première seconde : relèvement x1,32. */
    id: "Parcours-Plagiat",
    reglage: {
      enregistrement: "parcours-Sh8POK7p74k.mp4",
      clip: "clip-plagiat.mp4",
      source: "src-plagiat.mp4",
      clipDebut: 5,
      releve: "brightness(1.32) saturate(1.04)",
      reperes: { lien: 10, analyse: 13, grille: 238, modale: 244, fin: 249.8 },
      chiffres: { source: "42 min", analyse: "3 min 45", clip: "34 s" },
    },
  },
  {
    /* Amixem, « J'AI ACHETÉ L'ASTON MARTIN LA MOINS CHÈRE », 42 min.
       4 clips en 3 min 27. Clip retenu : « La touche cachée James Bond dans
       l'Aston » (7:12, 51 s, noté 87) — le premier de la liste.
       Luminance 82 de moyenne et 53 sur la toute première seconde : la fenêtre
       démarre donc à 5 s, où elle remonte à 86, et le relèvement est poussé à
       1,45 — le plafond. */
    id: "Parcours-Aston",
    reglage: {
      enregistrement: "parcours-EbBZCJKW9ds.mp4",
      clip: "clip-aston.mp4",
      source: "src-aston.mp4",
      clipDebut: 5,
      releve: "brightness(1.45) saturate(1.04)",
      reperes: { lien: 9, analyse: 12, grille: 219, modale: 226, fin: 231.2 },
      chiffres: { source: "42 min", analyse: "3 min 27", clip: "51 s" },
    },
  },
];
