import type { ReglageParcours } from "./Parcours";

/**
 * LES VIDÉOS DU 21/09/2026.
 *
 * Deux générations réelles, faites le même jour sur deux vidéos d'Amixem.
 * Tout ce qui change d'une vidéo à l'autre tient ici ; le montage est partagé.
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
 * RACONTE, pas ce qui se REGARDE — ni ce qu'on a envie de montrer. Sur « Objets
 * des pubs TikTok », le clip noté 90 est l'encart sponsorisé de la vidéo :
 * exact, bien découpé, et c'est la publicité de quelqu'un d'autre. On choisit
 * donc dans la grille, et la section application s'arrête sur la grille
 * justement pour ne rien prétendre sur lequel on ouvre.
 *
 * ── RELÈVEMENT ────────────────────────────────────────────────────────────
 * Cible : 116-118 sur la première seconde. `saturate(1.04)` seul quand la source
 * est déjà au-dessus ; sinon `brightness()` jusqu'à 1,45, jamais au-delà — la
 * peau sature (0,4 % de pixels brûlés à 1,35, 2,0 % à 1,50).
 *
 * ── POURQUOI DEUX ET PAS TROIS ───────────────────────────────────────────
 * Quatre analyses ont été lancées ce jour-là. L'une a dépassé le délai de
 * 15 minutes du client (source de 36 min), une autre s'est heurtée au budget
 * quotidien de Groq — 200 000 tokens pour tout le compte, consommés à 198 374.
 * Voir la note « Budget Groq quotidien ».
 */
export const PARCOURS: { id: string; reglage: ReglageParcours }[] = [
  {
    /* Amixem, « J'ai acheté tous les objets des pubs TikTok », 40 min.
       10 clips en 5 min 04. Clip retenu : « Cocktail IRM magique » (5:14, 43 s,
       noté 83). Le mieux noté, « Antivirus NordVPN », est l'encart sponsorisé.
       Luminance 80 de moyenne, 82 sur la fenêtre retenue (17 s -> 43 s, la
       seule des trois possibles où les plans serrés dominent les plans larges) :
       relèvement x1,44, juste sous le plafond. */
    id: "Parcours-Irm",
    reglage: {
      enregistrement: "parcours-IUn6P8RSsOg.mp4",
      clip: "clip-irm.mp4",
      source: "src-irm.mp4",
      clipDebut: 17,
      releve: "brightness(1.44) saturate(1.04)",
      reperes: { lien: 14, analyse: 17, grille: 321, modale: 330, fin: 335.2 },
      chiffres: { source: "40 min", analyse: "5 min 04", clip: "43 s" },
    },
  },
  {
    /* Amixem, « ON MANGE 73 PETITS-DÉJ D'AFFILÉE », 39 min.
       4 clips en 1 min 32 — la plus rapide de la série, YouTube ayant servi ses
       sous-titres sans passer par Whisper. Clip retenu : « Avis cash sur le
       maté » (15:04, 44 s, noté 87), le premier de la liste.
       Luminance 118 de moyenne et 127 sur la fenêtre retenue : aucun
       relèvement, la source est déjà au-dessus de la cible. */
    id: "Parcours-Mate",
    reglage: {
      enregistrement: "parcours-F8NpbQ3YOjA.mp4",
      clip: "clip-mate.mp4",
      source: "src-mate.mp4",
      clipDebut: 12,
      releve: "saturate(1.04)",
      reperes: { lien: 11, analyse: 14, grille: 106, modale: 113, fin: 118.2 },
      chiffres: { source: "39 min", analyse: "1 min 32", clip: "44 s" },
    },
  },
];
