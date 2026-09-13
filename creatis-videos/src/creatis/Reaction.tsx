import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COULEURS } from "./theme";

/**
 * INCRUSTATION RÉACTION — le visage auquel le spectateur se raccroche.
 *
 * ── POURQUOI ──────────────────────────────────────────────────────────────
 * Les trois derniers parcours plafonnent autour de 800 vues. Ils montrent un
 * écran qui travaille, et rien d'humain : personne à qui s'identifier, personne
 * dont la surprise autorise la nôtre. Le format qui domine le court aujourd'hui
 * pose une petite fenêtre avec le visage du créateur en train de réagir — c'est
 * lui qui dit au spectateur « regarde ça », pas le montage.
 *
 * ── CE QUE CE COMPOSANT NE PEUT PAS FABRIQUER ─────────────────────────────
 * Le visage doit être CELUI du compte. Une banque d'images ou un avatar généré
 * produirait l'inverse de l'effet cherché : on se raccroche à quelqu'un qu'on
 * retrouve d'une vidéo à l'autre, pas à un inconnu. Tant que `reaction.mp4`
 * n'existe pas, `AVEC_REACTION` reste à false et rien ne s'affiche — le montage
 * continue de rendre exactement comme avant.
 *
 * ── PLACEMENT, ET POURQUOI IL CHANGE EN COURS DE ROUTE ────────────────────
 * Tant que l'encart de l'application est à l'écran (images 120 à 420), il
 * occupe tout le centre : la seule place libre est la marge gauche, à
 * mi-hauteur. Une fois l'encart parti, le cadre se libère et la fenêtre
 * descend en bas à gauche, plus grande — la position classique du format, et
 * celle demandée.
 *
 * Dans les deux cas : jamais au-dessus de 16 % (barre de recherche TikTok),
 * jamais à droite au-delà de 72 % (colonne de boutons), jamais sous 78 %
 * (légende et pseudo).
 */

/** Actif depuis le 13/09 : `public/reaction.mp4` existe.
 *
 * Source : IMG_2723.mov, 3,1 s filmees au telephone, 4K HEVC en portrait
 * (rotation iPhone dans les metadonnees, d'ou une largeur annoncee de 3840).
 * Reencode en H.264 506x900 — Remotion decode mal le HEVC 4K, et 900 px de haut
 * suffisent largement pour une fenetre de 336 px.
 *
 * 3,1 s pour un montage de 19 s : la sequence boucle, d'ou `loop` sur la video.
 * Une boucle courte se remarque d'autant moins que la fenetre est petite et que
 * l'oeil est occupe ailleurs. */
export const AVEC_REACTION = true;

const FICHIER = "reaction.mp4";

type Place = { x: number; y: number; taille: number };

/** Marge gauche, à mi-hauteur : la seule zone libre quand l'encart est affiché. */
const A_COTE: Place = { x: 16, y: 742, taille: 276 };
/** Bas à gauche, plus grande : le cadre est libre une fois l'encart parti. */
const EN_BAS: Place = { x: 36, y: 1040, taille: 336 };

export const Reaction: React.FC<{
  /** Image où l'encart de l'application apparaît. */
  debutEncart: number;
  /** Image où l'encart de l'application disparaît. */
  finEncart: number;
  /** Longueur de la séquence hôte, pour la sortie. */
  duree: number;
}> = ({ debutEncart, finEncart, duree }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* TROIS TEMPS, pas deux. Le cadre n'est occupe par l'encart qu'entre
     `debutEncart` et `finEncart` : avant et apres, il est libre. La fenetre
     tient donc sa place naturelle — en bas a gauche, grande — et ne se range
     dans la marge que le temps ou l'encart a besoin du centre. Un premier jet
     la laissait petite et a mi-hauteur du debut a la fin, y compris pendant les
     quatre premieres secondes ou rien ne la genait.

     Les deplacements sont amortis sur une demi-seconde : une fenetre qui se
     teleporte se lit comme un bug de montage. */
  const range = interpolate(
    frame,
    [debutEncart - 12, debutEncart + 3, finEncart - 6, finEncart + 9],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) },
  );
  const place: Place = {
    x: interpolate(range, [0, 1], [EN_BAS.x, A_COTE.x]),
    y: interpolate(range, [0, 1], [EN_BAS.y, A_COTE.y]),
    taille: interpolate(range, [0, 1], [EN_BAS.taille, A_COTE.taille]),
  };

  /* Entrée une demi-seconde après le début — le premier plan doit appartenir au
     clip seul, c'est lui qui retient. Sortie avant le carton final. */
  const entre = interpolate(frame, [12, 12 + 0.45 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const sort = interpolate(frame, [duree - 14, duree - 2], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const vis = entre * sort;
  if (vis <= 0.01) return null;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: place.x,
          top: place.y,
          width: place.taille,
          height: place.taille,
          borderRadius: 30,
          overflow: "hidden",
          border: `4px solid ${COULEURS.vertClair}`,
          boxShadow: "0 26px 70px rgba(0,0,0,0.72)",
          opacity: vis,
          transform: `scale(${interpolate(vis, [0, 1], [0.82, 1])})`,
        }}
      >
        {/* `muted` : la bande-son de la vidéo est celle du clip, une seconde
            piste rendrait les deux inaudibles. Et `loop`, parce que la réaction
            filmée est plus courte que le montage. */}
        <Video
          src={staticFile(FICHIER)}
          style={{ width: "100%", height: "100%" }}
          objectFit="cover"
          muted
          loop
        />
      </div>
    </AbsoluteFill>
  );
};
