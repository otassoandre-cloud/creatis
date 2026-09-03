import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COULEURS, ENTREE, MISE_EN_PAGE } from "./theme";

/**
 * Scene 0 — l'ouverture de marque (0 → 2,5 s).
 *
 * Une pub de lancement doit poser le nom avant de raconter quoi que ce soit.
 * Volontairement silencieuse : le logo arrive sur un noir franc, la voix off ne
 * demarre qu'a la scene suivante. Ce silence de deux secondes fait exister la
 * marque au lieu de la noyer dans le premier argument.
 */
export const SceneOuverture: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      name="SceneOuverture"
      style={{ backgroundColor: COULEURS.fond }}
    >
      {/* Le halo grandit derriere le logo, comme un projecteur qui s'allume. */}
      <AbsoluteFill
        name="Halo"
        style={{
          background: `radial-gradient(46% 26% at 50% 50%, rgba(16,185,129,0.3) 0%, rgba(16,185,129,0) 70%)`,
          opacity: interpolate(frame, [0, 1.1 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(...ENTREE),
          }),
          scale: interpolate(frame, [0, 2.5 * fps], [0.7, 1.15], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(...ENTREE),
            output: "perceptual-scale",
          }),
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: MISE_EN_PAGE.margeCote,
          paddingRight: MISE_EN_PAGE.margeCote,
        }}
      >
        <Interactive.Div
          name="Logo"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            opacity: interpolate(frame, [0.15 * fps, 0.75 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
            scale: interpolate(frame, [0.15 * fps, 1.3 * fps], [0.84, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 15 }),
              output: "perceptual-scale",
            }),
          }}
        >
          <div
            style={{
              width: 116,
              height: 116,
              borderRadius: 32,
              background: `linear-gradient(180deg, ${COULEURS.vertClair}, ${COULEURS.vertSombre})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 68,
              fontWeight: 800,
              color: "#05140B",
              boxShadow: "0 0 80px rgba(16,185,129,0.55)",
            }}
          >
            C
          </div>
          <div
            style={{
              fontSize: 112,
              fontWeight: 800,
              color: COULEURS.texte,
              letterSpacing: "-0.04em",
            }}
          >
            Créatis
          </div>
        </Interactive.Div>

        <Interactive.Div
          name="Signature"
          style={{
            marginTop: 30,
            fontSize: MISE_EN_PAGE.soutien,
            fontWeight: 600,
            color: COULEURS.texteDoux,
            letterSpacing: "0.06em",
            opacity: interpolate(frame, [0.95 * fps, 1.5 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
          }}
        >
          Tes vidéos longues, en clips viraux.
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
