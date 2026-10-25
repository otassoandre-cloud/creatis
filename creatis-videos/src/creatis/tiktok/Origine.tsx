import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Fond } from "../Fond";
import { SousTitreBrule } from "../SousTitreBrule";
import { COULEURS } from "../theme";

/**
 * PLAN 2 — d'ou vient le clip (3 → 6 s).
 *
 * Reponse immediate a la question posee par l'accroche. La barre de montage
 * balayee par une tete de lecture donne le mouvement que reclame la retention :
 * quelque chose bouge en permanence, meme pendant qu'on lit.
 */
export const Origine: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const extraits = [7, 24, 41, 58, 75];

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Audio src={staticFile("voix/t2-origine.mp3")} />
      <Fond intensite={0.5} />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 90,
          paddingRight: 90,
          paddingBottom: 300,
        }}
      >
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: COULEURS.texteDoux,
            letterSpacing: "0.1em",
            marginBottom: 26,
          }}
        >
          02:04:11
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            height: 108,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.08)",
            border: `1px solid ${COULEURS.ligne}`,
            overflow: "hidden",
          }}
        >
          {extraits.map((gauche, i) => (
            <div
              key={gauche}
              style={{
                position: "absolute",
                left: `${gauche}%`,
                top: 0,
                bottom: 0,
                width: "14%",
                borderRadius: 12,
                backgroundColor: COULEURS.vert,
                boxShadow: "0 0 34px rgba(16,185,129,0.65)",
                opacity: interpolate(
                  frame,
                  [0.55 * fps + i * 4, 0.85 * fps + i * 4],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                ),
                scale: interpolate(
                  frame,
                  [0.55 * fps + i * 4, 0.85 * fps + i * 4],
                  [0.5, 1],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    output: "perceptual-scale",
                  },
                ),
              }}
            />
          ))}

          {/* Tete de lecture : le mouvement continu qui empeche le decrochage */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 5,
              backgroundColor: "#fff",
              boxShadow: "0 0 22px rgba(255,255,255,0.9)",
              left: `${interpolate(frame, [0, 1.7 * fps], [0, 100], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.4, 0, 0.2, 1),
              })}%`,
            }}
          />
        </div>
      </AbsoluteFill>

      <SousTitreBrule
        texte={"Elle sort d'une vidéo de 2 h"}
        debut={2}
        cadence={3}
        hauteur={64}
        taille={78}
        accent={["2 h"]}
      />
    </AbsoluteFill>
  );
};
