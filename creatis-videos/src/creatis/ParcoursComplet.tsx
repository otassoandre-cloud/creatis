import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { ChiffreSurImage, Curseur, Etiquette, FondVideo, TexteSurImage } from "./Visuel";
import traceA from "../../public/trace-a.json";
import traceB from "../../public/trace-b.json";

/**
 * « LE PARCOURS COMPLET » — 1920×1080, 6 min 04.
 *
 * ── LA DEMANDE DU 16/10 ──────────────────────────────────────────────────
 * « Rec tout le processus. Pas de blancs de fou. Me fais pas des zooms
 * inutiles. Une souris qui parcourt l'écran, qui clique, qui glisse les
 * sous-titres. Comme si c'était moi qui filmais mon écran. »
 *
 * D'où trois règles de montage, différentes de tous les films précédents :
 *
 * 1. **AUCUN ZOOM.** Les plans d'écran sont posés en 1920×1080 plein cadre.
 *    Le film du 15/10 recadrait sur des zones parce que le lecteur fait
 *    374 px de large ; ici ce sont les GESTES qui portent, pas les détails,
 *    et un recadrage casserait la lecture du parcours.
 * 2. **LE CURSEUR EST VRAI.** `enregistrer-parcours-complet.mjs` journalise
 *    chaque position avec sa seconde ; `Curseur` les repose. Rien n'est
 *    rejoué au jugé.
 * 3. **L'ATTENTE EST DITE, PAS MASQUÉE.** L'analyse a duré 207 secondes au
 *    tournage. On ne la montre pas en entier et on ne fait pas semblant
 *    qu'elle n'existe pas : la voix annonce « deux à quatre minutes » et le
 *    montage coupe.
 *
 * ── CE QUI N'A PAS PU ÊTRE FILMÉ, ET QU'ON NE SIMULE PAS ─────────────────
 * · La recherche Google : trois tentatives, trois pages blanches — Google
 *   sert une version dégradée à un navigateur piloté. Le film commence donc
 *   sur le site, pas sur le moteur.
 * · Le téléchargement du fichier exporté : l'événement n'est jamais arrivé,
 *   sur deux tournages. On montre le clip prêt dans le lecteur, hook et
 *   sous-titres en place — ce qui est vrai — et on ne met pas d'image d'un
 *   fichier qui serait descendu.
 *
 * ── LES BORNES ───────────────────────────────────────────────────────────
 * `silencedetect` sur les six blocs, décalés de leur position dans le
 * fichier concaténé : a 0 · b 57,3 · c 124,4 · d 184,3 · e 243,1 · f 304,9.
 * À vérifier avec `controle-synchro.mjs` avant publication.
 */

export const DUREE_PARCOURS_COMPLET = Math.round(363.8 * 30);

type Plan = {
  b: [number, number];
  fond: string;
  depart?: number;
  /** Pose le curseur du tournage A ou B par-dessus. */
  curseur?: "a" | "b";
  titre?: React.ReactNode;
  sous?: React.ReactNode;
  taille?: number;
  chiffre?: { valeur: string; legende: string; couleur?: string; retard?: number };
  etiquette?: { texte: string; ton: "vrai" | "faux" };
  assombrir?: number;
  retard?: number;
};

const PLANS: Plan[] = [
  /* ══ A — LE PROBLÈME ═══════════════════════════════════════════════ */
  { b: [0, 17.2], fond: "stock/montage-1.mp4", depart: 2, assombrir: 0.58,
    titre: "Monter un clip à la main, ça prend une soirée.",
    sous: "Repérer le passage, recadrer, écrire les sous-titres, les repositionner, exporter. Et recommencer.", taille: 56 },
  { b: [17.2, 25.5], fond: "stock/clavier-1.mp4", depart: 1, assombrir: 0.55,
    chiffre: { valeur: "1 clip = 1 soirée", legende: "et le métier, c'est 30 clips par semaine", couleur: "#ff5a4e", retard: 0.5 } },
  { b: [25.5, 40.3], fond: "parc-a.mp4", depart: 256, curseur: "a", assombrir: 0,
    titre: "Le parcours entier, sans rien couper d'important.",
    sous: "J'ouvre le site, je colle un lien, et je ressors avec des clips prêts à publier.", taille: 54, retard: 0.8 },
  { b: [40.3, 50.2], fond: "parc-b.mp4", depart: 30, curseur: "b", assombrir: 0,
    titre: "Où je clique, ce que je choisis, comment je déplace les sous-titres.", taille: 50, retard: 0.6 },
  { b: [50.2, 57.3], fond: "stock/bureau-2.mp4", depart: 6, assombrir: 0.6,
    titre: "Pas de zoom. Pas d'accélération cachée.",
    sous: "Quand il y a une attente, je te le dis.", taille: 56 },

  /* ══ B — LE SITE ET LE CHOIX DE LA SOURCE ══════════════════════════ */
  { b: [57.3, 71.5], fond: "parc-a.mp4", depart: 34, curseur: "a", assombrir: 0 },
  { b: [71.5, 81.7], fond: "parc-a.mp4", depart: 46, curseur: "a", assombrir: 0,
    etiquette: { texte: "LE STUDIO", ton: "vrai" } },
  { b: [81.7, 96.4], fond: "stock/bureau-1.mp4", depart: 2, assombrir: 0.62,
    etiquette: { texte: "1 — IL FAUT QUE ÇA PARLE", ton: "vrai" },
    titre: "",
    sous: "Pas de transcription, pas de clip. Interviews, podcasts, plateaux, défis commentés : de la matière. Gameplay muet, clip musical : rien.", taille: 52, retard: 1.0 },
  { b: [96.4, 105.0], fond: "stock/clavier-2.mp4", depart: 1, assombrir: 0.58,
    etiquette: { texte: "2 — LA DURÉE", ton: "vrai" },
    titre: "Entre 20 minutes et 1 h 30.", taille: 60, retard: 0.8 },
  { b: [105.0, 118.4], fond: "stock/tel-1.mp4", depart: 2, assombrir: 0.58,
    etiquette: { texte: "3 — LE TEST DES 30 SECONDES", ton: "vrai" },
    titre: "",
    sous: "Va au milieu de la vidéo, regarde 30 secondes au hasard. Si tu comprends sans avoir vu le début, elle se clippera.", taille: 52, retard: 1.0 },
  { b: [118.4, 124.4], fond: "parc-a.mp4", depart: 49, curseur: "a", assombrir: 0,
    titre: "Je colle le lien.", taille: 58, retard: 0.3 },

  /* ══ C — L'ANALYSE ET LA GRILLE ════════════════════════════════════ */
  { b: [124.4, 138.1], fond: "parc-a.mp4", depart: 55, curseur: "a", assombrir: 0,
    titre: "Transcription, relecture, notation.", taille: 56, retard: 0.6 },
  { b: [138.1, 146.7], fond: "stock/cafe-1.mp4", depart: 2, assombrir: 0.6,
    chiffre: { valeur: "2 à 4 minutes", legende: "pendant lesquelles tu ne fais rien — tu peux fermer l'onglet", couleur: "#ffd60a", retard: 0.4 } },
  { b: [146.7, 162.3], fond: "parc-b.mp4", depart: 12, curseur: "b", assombrir: 0,
    etiquette: { texte: "LE RÉSULTAT", ton: "vrai" } },
  { b: [162.3, 173.2], fond: "parc-a.mp4", depart: 262, curseur: "a", assombrir: 0,
    titre: "Une note sur 100 par passage.",
    sous: "Se comprend-il seul ? Accroche-t-il dans ses 3 premières secondes ? Se termine-t-il sur quelque chose ?", taille: 50, retard: 0.6 },
  { b: [173.2, 184.3], fond: "parc-a.mp4", depart: 268, curseur: "a", assombrir: 0,
    titre: "Tu n'ouvres plus les dix. Tu ouvres les quatre premiers.", taille: 52, retard: 0.5 },

  /* ══ D — LE CLIP ═══════════════════════════════════════════════════ */
  { b: [184.3, 199.5], fond: "parc-b.mp4", depart: 17, curseur: "b", assombrir: 0,
    titre: "Déjà recadré en 9:16, cadré sur qui parle.", taille: 54, retard: 0.8 },
  { b: [199.5, 210.7], fond: "parc-b.mp4", depart: 19, curseur: "b", assombrir: 0,
    titre: "En dessous : la transcription, mot par mot.", taille: 54, retard: 0.5 },
  { b: [210.7, 222.0], fond: "parc-b.mp4", depart: 21, curseur: "b", assombrir: 0,
    titre: "Et la timeline du clip, pour ajuster le début et la fin.", taille: 52, retard: 0.5 },
  { b: [222.0, 243.1], fond: "parc-b.mp4", depart: 23, curseur: "b", assombrir: 0,
    etiquette: { texte: "LA PREMIÈRE SECONDE DÉCIDE", ton: "faux" },
    titre: "",
    sous: "Un clip qui commence sur une fin de phrase est perdu, quelle que soit la suite.", taille: 52, retard: 1.0 },

  /* ══ E — LES SOUS-TITRES ═══════════════════════════════════════════ */
  { b: [243.1, 252.0], fond: "parc-b.mp4", depart: 25, curseur: "b", assombrir: 0,
    titre: "Ils sont déjà écrits et calés sur la voix.", taille: 56, retard: 0.5 },
  { b: [252.0, 262.0], fond: "parc-b.mp4", depart: 27, curseur: "b", assombrir: 0,
    etiquette: { texte: "11 STYLES", ton: "vrai" } },
  { b: [262.0, 279.9], fond: "parc-b.mp4", depart: 29, curseur: "b", assombrir: 0,
    etiquette: { texte: "LE GESTE QUI COMPTE", ton: "vrai" },
    titre: "",
    sous: "Je les attrape, et je les remonte.", taille: 54, retard: 1.2 },
  { b: [279.9, 292.7], fond: "parc-b.mp4", depart: 34, curseur: "b", assombrir: 0,
    titre: "Pas en bas : l'interface de la plateforme mange le bas de l'écran.",
    sous: "Des sous-titres recouverts, c'est un clip que personne ne comprend.", taille: 50, retard: 0.5 },
  { b: [292.7, 304.9], fond: "parc-b.mp4", depart: 37, curseur: "b", assombrir: 0,
    titre: "Ce que tu vois dans l'aperçu est ce qui sortira du fichier.", taille: 52, retard: 0.5 },

  /* ══ F — LE BANDEAU, L'EXPORT, LA SUITE ════════════════════════════ */
  { b: [304.9, 315.0], fond: "parc-a.mp4", depart: 303, curseur: "a", assombrir: 0,
    titre: "Le bandeau d'accroche.",
    sous: "Il parle de la situation du spectateur, pas de toi ni de l'outil.", taille: 54, retard: 0.5 },
  { b: [315.0, 327.6], fond: "parc-a.mp4", depart: 312, curseur: "a", assombrir: 0 },
  { b: [327.6, 338.2], fond: "parc-a.mp4", depart: 330, assombrir: 0,
    chiffre: { valeur: "1080 × 1920", legende: "sous-titres incrustés, prêt à publier", couleur: "#10b981", retard: 0.6 } },
  { b: [338.2, 345.8], fond: "stock/clavier-3.mp4", depart: 3, assombrir: 0.58,
    titre: "Trois ou quatre clips par source, 2 à 3 minutes chacun.",
    sous: "Trois sources dans la semaine, et tu as tes quinze clips.", taille: 52 },
  { b: [345.8, 363.8], fond: "stock/bureau-2.mp4", depart: 18, assombrir: 0.62,
    etiquette: { texte: "SI TU CLIPPES POUR UNE CAMPAGNE", ton: "faux" },
    titre: "",
    sous: "Lis ses règles avant de publier : durée minimale, plateformes acceptées, sources autorisées. Un clip hors règles n'est pas payé, même avec 40 000 vues.", taille: 50, retard: 1.0 },
];

const Scene: React.FC<{ p: Plan }> = ({ p }) => {
  const { fps } = useVideoConfig();
  const duree = p.b[1] - p.b[0];
  const trace = p.curseur === "a" ? traceA : traceB;
  return (
    <Sequence
      from={Math.round(p.b[0] * fps)}
      durationInFrames={Math.round(duree * fps)}
      layout="none"
    >
      <FondVideo
        source={p.fond}
        depart={p.depart ?? 0}
        duree={duree}
        assombrir={p.assombrir ?? 0.56}
        cote={p.assombrir === 0 ? "aucun" : "bas"}
      />
      {p.curseur ? <Curseur trace={trace} depart={p.depart ?? 0} /> : null}
      {p.etiquette ? <Etiquette texte={p.etiquette.texte} ton={p.etiquette.ton} retard={0.2} /> : null}
      {p.chiffre ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <ChiffreSurImage
            valeur={p.chiffre.valeur}
            legende={p.chiffre.legende}
            couleur={p.chiffre.couleur ?? "#10b981"}
            retard={p.chiffre.retard ?? 0.4}
          />
        </AbsoluteFill>
      ) : null}
      {p.titre !== undefined || p.sous !== undefined ? (
        <TexteSurImage
          titre={p.titre ?? ""}
          sous={p.sous}
          position="bas-gauche"
          retard={p.retard ?? 0.3}
          taille={p.taille ?? 56}
        />
      ) : null}
    </Sequence>
  );
};

export const ParcoursComplet: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#04060a" }}>
    {PLANS.map((p) => (
      <Scene key={p.b[0]} p={p} />
    ))}
    <Audio src={staticFile("voix/narration-parcours.mp3")} />
  </AbsoluteFill>
);
