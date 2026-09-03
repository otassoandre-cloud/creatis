import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COULEURS } from "../theme";

/**
 * Le texte d'accroche, present des l'image 1.
 *
 * Difference avec `SousTitreBrule`, et c'est toute la raison d'etre du
 * composant : le sous-titre karaoke fait apparaitre les mots un par un, donc a
 * l'image 1 il n'y a **rien** a lire. Or la recherche est nette sur ce point —
 * le spectateur decide en ~1,7 s en moyenne, et le hook est un triple
 * simultane : premiere image + premiere phrase + texte a l'ecran. Un texte qui
 * se construit sur 15 images arrive apres la decision.
 *
 * Ici le texte est donc lisible a 100 % des l'image 0 ; il ne fait que se poser
 * (1,04 → 1) sur 6 images pour ne pas avoir l'air colle.
 */
export const HookFixe: React.FC<{
  ligne1: string;
  ligne2?: string;
  /** Position verticale en % de la HAUTEUR (converti en pixels, cf. plus bas). */
  hauteur?: number;
  taille?: number;
  tailleLigne2?: number;
  couleurLigne2?: string;
  /** Ombre portee derriere le texte quand il passe sur une video. */
  surVideo?: boolean;
}> = ({
  ligne1,
  ligne2,
  hauteur = 8,
  taille = 96,
  tailleLigne2 = 56,
  couleurLigne2 = COULEURS.vert,
  surVideo = true,
}) => {
  const frame = useCurrentFrame();
  /* Comme dans SousTitreBrule : un pourcentage CSS se calcule sur la LARGEUR du
     conteneur, pas sa hauteur. Sur 1080x1920 ca decale le texte de 45 %. */
  const { height } = useVideoConfig();

  const pose = interpolate(frame, [0, 6], [1.04, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    output: "perceptual-scale",
  });

  const contour = surVideo
    ? {
        WebkitTextStroke: "10px rgba(0,0,0,0.92)",
        paintOrder: "stroke fill" as const,
        textShadow: "0 6px 30px rgba(0,0,0,0.8)",
      }
    : {};

  return (
    <AbsoluteFill
      style={{
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: (height * hauteur) / 100,
        paddingLeft: 90,
        paddingRight: 90,
        textAlign: "center",
        scale: pose,
      }}
    >
      <div
        style={{
          fontSize: taille,
          fontWeight: 800,
          lineHeight: 1.08,
          letterSpacing: "-0.03em",
          color: "#ffffff",
          textWrap: "balance",
          ...contour,
        }}
      >
        {ligne1}
      </div>

      {ligne2 ? (
        <div
          style={{
            marginTop: 20,
            fontSize: tailleLigne2,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: couleurLigne2,
            ...contour,
          }}
        >
          {ligne2}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
