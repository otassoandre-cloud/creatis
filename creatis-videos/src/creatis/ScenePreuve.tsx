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
import { COULEURS, ENTREE, MISE_EN_PAGE } from "./theme";

/**
 * Scene 4 — la preuve (16 → 21 s).
 *
 * Apres la demonstration, une seule chose compte : est-ce que ca marche
 * vraiment ? On montre donc un vrai clip sorti de Créatis et son vrai
 * compteur de vues. Le chiffre est reel (66 000), il n'est pas arrondi
 * a la hausse ni invente.
 */
export const ScenePreuve: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const vues = interpolate(frame, [0.7 * fps, 2.6 * fps], [0, 66], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ENTREE),
  });

  return (
    <AbsoluteFill name="ScenePreuve" style={{ backgroundColor: COULEURS.fond }}>
      <Audio src={staticFile("voix/s4-preuve.mp3")} />
      {/* Le clip occupe tout le cadre : c'est lui le sujet de la scene. */}
      <Video
        src={staticFile("clip-66k.mp4")}
        style={{ width: "100%", height: "100%" }}
        objectFit="cover"
        muted
        loop
      />

      {/* Voile bas pour que le texte reste lisible quel que soit le plan. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(10,15,10,0.72) 0%, rgba(10,15,10,0) 28%, rgba(10,15,10,0) 45%, rgba(10,15,10,0.92) 82%)",
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          paddingTop: MISE_EN_PAGE.margeHaut,
          paddingLeft: MISE_EN_PAGE.margeCote,
          paddingRight: MISE_EN_PAGE.margeCote,
        }}
      >
        <Interactive.Div
          name="Etiquette"
          style={{
            fontSize: MISE_EN_PAGE.legende,
            fontWeight: 800,
            color: COULEURS.vert,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            // Le clip derriere est lumineux (salle de sport) : sans ombre portee,
            // le vert sur fond clair passe sous le seuil de lisibilite.
            textShadow: "0 2px 18px rgba(0,0,0,0.9)",
            opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
          }}
        >
          Un clip sorti de Créatis
        </Interactive.Div>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: MISE_EN_PAGE.margeBas,
          paddingLeft: MISE_EN_PAGE.margeCote,
          paddingRight: MISE_EN_PAGE.margeCote,
        }}
      >
        <Interactive.Div
          name="Compteur vues"
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 18,
            opacity: interpolate(frame, [0.6 * fps, 1 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
            scale: interpolate(frame, [0.6 * fps, 1.3 * fps], [0.86, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 13 }),
              output: "perceptual-scale",
            }),
          }}
        >
          <span
            style={{
              fontSize: 168,
              fontWeight: 800,
              color: COULEURS.texte,
              letterSpacing: "-0.045em",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              textShadow: "0 6px 40px rgba(0,0,0,0.7)",
            }}
          >
            {Math.round(vues)} K
          </span>
          <span
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: COULEURS.texteDoux,
              letterSpacing: "-0.01em",
            }}
          >
            vues
          </span>
        </Interactive.Div>

        <Interactive.Div
          name="Sous-texte preuve"
          style={{
            marginTop: 18,
            fontSize: MISE_EN_PAGE.soutien,
            fontWeight: 600,
            color: COULEURS.texteDoux,
            textAlign: "center",
            opacity: interpolate(frame, [2.7 * fps, 3.2 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
          }}
        >
          Découpé automatiquement. Aucune retouche.
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
