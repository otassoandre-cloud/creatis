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
import { Fond } from "../Fond";
import { COULEURS, ENTREE } from "../theme";

/**
 * PLAN 6 — l'appel a l'action (19 → 23 s).
 *
 * Le logo n'apparait QU'ICI. Il ouvrait la version precedente pendant 2,5 s, ce
 * qui coutait l'audience avant meme le sujet. En fin de video il joue son vrai
 * role : nommer ce qu'on vient de voir, pour quelqu'un qui a deja decide que ca
 * l'interessait.
 *
 * Les conditions affichees sont celles de paiement.html et des CGU, mot pour
 * mot. Une pub plus genereuse que la page de paiement fabrique des demandes de
 * remboursement.
 */
export const AppelAction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Audio src={staticFile("voix/t6-cta.mp3")} />
      <Fond intensite={1.5} />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 96,
          paddingRight: 96,
          paddingBottom: 120,
        }}
      >
        <Interactive.Div
          name="Logo"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            opacity: interpolate(frame, [0, 0.35 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
            scale: interpolate(frame, [0, 0.7 * fps], [0.8, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 12 }),
              output: "perceptual-scale",
            }),
          }}
        >
          <div
            style={{
              width: 104,
              height: 104,
              borderRadius: 29,
              background: `linear-gradient(180deg, ${COULEURS.vertClair}, ${COULEURS.vertSombre})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 60,
              fontWeight: 800,
              color: "#05140B",
              boxShadow: "0 0 70px rgba(16,185,129,0.55)",
            }}
          >
            C
          </div>
          <div
            style={{
              fontSize: 100,
              fontWeight: 800,
              color: COULEURS.texte,
              letterSpacing: "-0.04em",
            }}
          >
            Créatis
          </div>
        </Interactive.Div>

        <Interactive.Div
          name="Adresse"
          style={{
            marginTop: 54,
            fontSize: 72,
            fontWeight: 800,
            color: "#05140B",
            backgroundColor: COULEURS.vert,
            padding: "30px 68px",
            borderRadius: 999,
            letterSpacing: "-0.02em",
            boxShadow: "0 0 90px rgba(16,185,129,0.55)",
            opacity: interpolate(frame, [0.5 * fps, 0.9 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
            scale: interpolate(frame, [0.5 * fps, 1.3 * fps], [0.85, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 11 }),
              output: "perceptual-scale",
            }),
          }}
        >
          creatis.app
        </Interactive.Div>

        <Interactive.Div
          name="Conditions"
          style={{
            marginTop: 36,
            fontSize: 42,
            fontWeight: 700,
            color: COULEURS.texte,
            textAlign: "center",
            lineHeight: 1.45,
            opacity: interpolate(frame, [1.1 * fps, 1.5 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
          }}
        >
          <span style={{ color: COULEURS.vert }}>7 jours d'essai gratuit</span>
          <br />
          <span style={{ fontSize: 34, color: COULEURS.texteDoux, fontWeight: 600 }}>
            résiliable avant sans rien payer
          </span>
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
