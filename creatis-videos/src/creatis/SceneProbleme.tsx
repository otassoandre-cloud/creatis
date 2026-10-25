import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Fond } from "./Fond";
import { COULEURS, ENTREE, MISE_EN_PAGE } from "./theme";

/**
 * Scene 2 — le probleme (3,5 → 8 s).
 *
 * On nomme la raison pour laquelle ces 10 shorts n'existent pas : le decoupage
 * manuel coute une demi-journee. Le compteur d'heures qui monte fait sentir le
 * cout mieux qu'une phrase.
 */
export const SceneProbleme: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const heures = interpolate(frame, [0.8 * fps, 2.6 * fps], [0, 3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...ENTREE),
  });

  return (
    <AbsoluteFill name="SceneProbleme">
      <Audio src={staticFile("voix/s2-probleme.mp3")} />
      <Fond intensite={0.45} />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "flex-start",
          paddingLeft: MISE_EN_PAGE.margeCote,
          paddingRight: MISE_EN_PAGE.margeCote,
        }}
      >
        <Interactive.Div
          name="Constat"
          style={{
            fontSize: MISE_EN_PAGE.titrePetit,
            fontWeight: 800,
            color: COULEURS.texte,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
            translate: interpolate(
              frame,
              [0, 0.6 * fps],
              ["0px 34px", "0px 0px"],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(...ENTREE),
              },
            ),
          }}
        >
          Tu ne les as jamais
          <br />
          publiés.
        </Interactive.Div>

        <Interactive.Div
          name="Cout"
          style={{
            marginTop: 68,
            fontSize: MISE_EN_PAGE.soutien,
            color: COULEURS.texteDoux,
            fontWeight: 600,
            lineHeight: 1.5,
            opacity: interpolate(frame, [0.8 * fps, 1.3 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
          }}
        >
          Les découper à la main, c'est
        </Interactive.Div>

        {/* Le chiffre seul sur sa ligne : a 128px, « 3 h de montage » d'un bloc
            passait a la ligne et cassait la lecture. Compteur en entiers aussi —
            « 3,0 h » se lit comme une mesure de labo, pas comme une soiree perdue. */}
        <Interactive.Div
          name="Compteur"
          style={{
            fontSize: 168,
            fontWeight: 800,
            color: "#f87171",
            letterSpacing: "-0.045em",
            lineHeight: 1,
            marginTop: 12,
            fontVariantNumeric: "tabular-nums",
            opacity: interpolate(frame, [0.8 * fps, 1.2 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
          }}
        >
          {Math.round(heures)} h
        </Interactive.Div>

        <Interactive.Div
          name="Unite"
          style={{
            fontSize: 58,
            fontWeight: 700,
            color: "#f87171",
            letterSpacing: "-0.02em",
            marginTop: 2,
            opacity: interpolate(frame, [1 * fps, 1.4 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
          }}
        >
          de montage
        </Interactive.Div>

        <Interactive.Div
          name="Precision"
          style={{
            marginTop: 34,
            fontSize: MISE_EN_PAGE.legende,
            color: COULEURS.texteDoux,
            fontWeight: 500,
            lineHeight: 1.55,
            opacity: interpolate(frame, [2.7 * fps, 3.2 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
          }}
        >
          repérer les moments · recadrer en 9:16 · sous-titrer · exporter
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
