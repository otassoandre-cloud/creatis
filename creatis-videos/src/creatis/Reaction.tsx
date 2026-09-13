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
 * ── AU DEBUT SEULEMENT, ET C'EST TOUT L'INTERET ──────────────────────────
 * Une premiere version la gardait a l'ecran du debut a la fin, en la deplacant
 * pour eviter l'encart. C'etait trop : une fenetre presente en permanence cesse
 * d'etre un regard et devient un element de decor, qu'on ne voit plus au bout de
 * trois secondes. Elle ne dure donc que les 3,7 premieres secondes — le temps
 * d'installer quelqu'un qui regarde, puis elle laisse la place.
 *
 * C'est la convention des chaines qui filment leur ecran : une vignette en bas a
 * gauche pendant qu'on montre quelque chose. Le spectateur la connait, il n'a
 * rien a decoder, et elle lui donne une reaction a laquelle accrocher la sienne.
 *
 * Position : bas a gauche, 408 px. Jamais au-dessus de 16 % (barre de recherche
 * TikTok), jamais a droite au-dela de 72 % (colonne de boutons), et le bas de la
 * fenetre s'arrete a 70 % pour ne pas toucher les sous-titres du clip, qui sont
 * incrustes a 74 %. */

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

/** Bas a gauche. 408 px de cote, soit 38 % de la largeur : assez pour lire une
    expression sur un ecran de telephone, ce que 276 ne permettait pas. */
const PLACE = { x: 40, y: 940, taille: 408 };

/** Entree a l'image 8, sortie amorcee a 100, disparue a 112 (3,7 s). */
const ENTREE_IMG = 8;
const SORTIE_IMG = 100;

export const Reaction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entre = interpolate(frame, [ENTREE_IMG, ENTREE_IMG + 0.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  /* Sortie plus vive que l'entree : elle s'efface au moment ou l'encart de
     l'application arrive, donc au moment ou l'oeil a autre chose a regarder. */
  const sort = interpolate(frame, [SORTIE_IMG, SORTIE_IMG + 12], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const vis = entre * sort;
  if (vis <= 0.01) return null;

  const place = PLACE;

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
