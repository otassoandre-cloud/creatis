import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COULEURS, ENTREE } from "./theme";

/**
 * Scene « le produit en vrai » — la seule scene fabriquee par HyperFrames.
 *
 * `interface-hyperframes.mp4` est le rendu de ../creatis-hyperframes/index.html :
 * la vraie interface Créatis, ecrite en HTML/CSS avec les tokens du site, animee
 * en GSAP. On l'embarque ici comme n'importe quelle source video, et Remotion
 * s'occupe du montage et de la voix par-dessus.
 *
 * Ce partage n'est pas arbitraire : HyperFrames rejoue du HTML, donc l'interface
 * du produit reste identique a elle-meme sans etre reecrite en React — c'est
 * exactement ce que son propre lint verifie (contraste, debordements).
 */
export const SceneInterface: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      name="SceneInterface"
      style={{ backgroundColor: COULEURS.fond }}
    >
      <Audio src={staticFile("voix/s6-interface.mp3")} />

      <Video
        src={staticFile("interface-hyperframes.mp4")}
        style={{ width: "100%", height: "100%" }}
        objectFit="cover"
        muted
      />

      {/* Etiquette d'attribution : on annonce que c'est le produit reel, pas une
          maquette. Placee SOUS la barre de navigation du rendu HyperFrames
          (haute de 132 px) — a 40 px elle chevauchait le bouton « Essayer
          gratuitement ». Elle s'efface avant la fin pour degager la grille. */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          paddingTop: 156,
        }}
      >
        <Interactive.Div
          name="Etiquette produit"
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: COULEURS.vert,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            backgroundColor: "rgba(4,12,8,0.72)",
            border: `1px solid rgba(16,185,129,0.35)`,
            padding: "12px 26px",
            borderRadius: 999,
            opacity: interpolate(
              frame,
              [0.3 * fps, 0.9 * fps, 6.4 * fps, 7 * fps],
              [0, 1, 1, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(...ENTREE),
              },
            ),
          }}
        >
          L'application, en vrai
        </Interactive.Div>
      </AbsoluteFill>

      {/* Un chrono « X secondes » figurait ici pour appuyer la promesse des
          60 secondes. Retire : il tournait sur son propre rythme et affichait
          « 49 secondes » pendant que la barre de progression du rendu HyperFrames
          en etait a 22 %. Deux compteurs qui se contredisent a l'ecran valent
          moins que le seul qui soit vrai — celui de l'interface. La promesse de
          duree est portee par la voix off. */}
    </AbsoluteFill>
  );
};
