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
 * Scene 1 — l'accroche (0 → 3,5 s).
 *
 * Le spectateur doit comprendre en moins d'une seconde qu'on parle de SA
 * situation : une longue video deja tournee, deja publiee, et dont il n'a
 * rien tire de plus. Le chiffre « 10 shorts » est le seul element en vert,
 * c'est lui qu'on doit lire en premier.
 */
export const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill name="SceneHook">
      {/* La voix off vit dans la scene, pas dans la composition parente : chaque
          scene reste jouable seule dans le Studio, avec son propre son. */}
      <Audio src={staticFile("voix/s1-accroche.mp3")} />
      <Fond />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "flex-start",
          paddingLeft: MISE_EN_PAGE.margeCote,
          paddingRight: MISE_EN_PAGE.margeCote,
        }}
      >
        <Interactive.Div
          name="Ligne 1"
          style={{
            fontSize: MISE_EN_PAGE.titre,
            fontWeight: 800,
            color: COULEURS.texte,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
            translate: interpolate(
              frame,
              [0, 0.6 * fps],
              ["0px 40px", "0px 0px"],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(...ENTREE),
              },
            ),
          }}
        >
          Ta vidéo de 2 h
        </Interactive.Div>

        <Interactive.Div
          name="Ligne 2"
          style={{
            fontSize: MISE_EN_PAGE.titre,
            fontWeight: 800,
            color: COULEURS.texte,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            marginTop: 6,
            opacity: interpolate(frame, [0.35 * fps, 0.85 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
            translate: interpolate(
              frame,
              [0.35 * fps, 0.95 * fps],
              ["0px 40px", "0px 0px"],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(...ENTREE),
              },
            ),
          }}
        >
          contient
        </Interactive.Div>

        <Interactive.Div
          name="Chiffre"
          style={{
            fontSize: 150,
            fontWeight: 800,
            color: COULEURS.vert,
            letterSpacing: "-0.045em",
            lineHeight: 1,
            marginTop: 14,
            textShadow: "0 0 70px rgba(16,185,129,0.45)",
            opacity: interpolate(frame, [1.05 * fps, 1.35 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
            scale: interpolate(frame, [1.05 * fps, 1.7 * fps], [0.82, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 12 }),
              output: "perceptual-scale",
            }),
          }}
        >
          10 shorts.
        </Interactive.Div>
      </AbsoluteFill>

      {/* La barre du bas figure la video longue : la matiere premiere que
          le spectateur possede deja sans l'exploiter. */}
      <BarreTimeline
        apparition={1.6 * fps}
        segmentsAllumes={interpolate(frame, [2 * fps, 3.4 * fps], [0, 6], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      />
    </AbsoluteFill>
  );
};

/**
 * Barre de montage stylisee — reutilisee dans plusieurs scenes.
 * `segmentsAllumes` permet de faire s'allumer les extraits progressivement.
 */
export const BarreTimeline: React.FC<{
  apparition: number;
  segmentsAllumes: number;
}> = ({ apparition, segmentsAllumes }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Positions (en %) des extraits « interessants » reperes dans la video longue.
  const extraits = [6, 19, 33, 47, 62, 78];

  return (
    <AbsoluteFill
      name="BarreTimeline"
      style={{
        justifyContent: "flex-end",
        paddingBottom: MISE_EN_PAGE.margeBas + 40,
        paddingLeft: MISE_EN_PAGE.margeCote,
        paddingRight: MISE_EN_PAGE.margeCote,
        opacity: interpolate(
          frame,
          [apparition, apparition + 0.5 * fps],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(...ENTREE),
          },
        ),
      }}
    >
      <div>
        <div
          style={{
            fontSize: MISE_EN_PAGE.legende,
            color: COULEURS.texteDoux,
            fontWeight: 600,
            marginBottom: 18,
            letterSpacing: "0.02em",
          }}
        >
          02:04:11
        </div>
        <div
          style={{
            position: "relative",
            height: 74,
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.07)",
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
                width: "13%",
                borderRadius: 10,
                backgroundColor: COULEURS.vert,
                boxShadow: "0 0 26px rgba(16,185,129,0.55)",
                opacity: interpolate(segmentsAllumes, [i, i + 0.8], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                scale: interpolate(segmentsAllumes, [i, i + 0.8], [0.6, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  output: "perceptual-scale",
                }),
              }}
            />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
