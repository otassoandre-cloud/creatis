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
 * Scene 5 — l'appel a l'action (21 → 25 s).
 *
 * Une seule adresse, une seule promesse. Les conditions de l'essai sont
 * ecrites ici telles qu'elles le sont sur le site (7 jours, resiliable avant
 * sans rien payer) : une pub qui promet autre chose que la page de paiement
 * fabrique des remboursements, pas des clients.
 */
export const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill name="SceneCTA">
      <Audio src={staticFile("voix/s5-cta.mp3")} />
      <Fond intensite={1.35} />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: MISE_EN_PAGE.margeCote,
          paddingRight: MISE_EN_PAGE.margeCote,
        }}
      >
        {/* Le logo, reconstruit dans la typo du site plutot qu'en image :
            reste net a toutes les tailles d'export. */}
        <Interactive.Div
          name="Logo"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
            scale: interpolate(frame, [0, 0.8 * fps], [0.88, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 14 }),
              output: "perceptual-scale",
            }),
          }}
        >
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: 26,
              background: `linear-gradient(180deg, ${COULEURS.vertClair}, ${COULEURS.vertSombre})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 54,
              fontWeight: 800,
              color: "#05140B",
              boxShadow: "0 0 60px rgba(16,185,129,0.5)",
            }}
          >
            C
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              color: COULEURS.texte,
              letterSpacing: "-0.035em",
            }}
          >
            Créatis
          </div>
        </Interactive.Div>

        <Interactive.Div
          name="Promesse"
          style={{
            marginTop: 54,
            fontSize: 62,
            fontWeight: 800,
            color: COULEURS.texte,
            textAlign: "center",
            letterSpacing: "-0.025em",
            lineHeight: 1.25,
            opacity: interpolate(frame, [0.55 * fps, 1.05 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
            translate: interpolate(
              frame,
              [0.55 * fps, 1.15 * fps],
              ["0px 28px", "0px 0px"],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(...ENTREE),
              },
            ),
          }}
        >
          1 vidéo longue.
          <br />
          <span style={{ color: COULEURS.vert }}>
            10 clips prêts à publier.
          </span>
        </Interactive.Div>

        <Interactive.Div
          name="Adresse"
          style={{
            marginTop: 62,
            fontSize: 64,
            fontWeight: 800,
            color: "#05140B",
            backgroundColor: COULEURS.vert,
            padding: "26px 58px",
            borderRadius: 999,
            letterSpacing: "-0.02em",
            boxShadow: "0 0 70px rgba(16,185,129,0.45)",
            opacity: interpolate(frame, [1.15 * fps, 1.6 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
            scale: interpolate(frame, [1.15 * fps, 1.9 * fps], [0.9, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 12 }),
              output: "perceptual-scale",
            }),
          }}
        >
          creatis.app
        </Interactive.Div>

        <Interactive.Div
          name="Conditions"
          style={{
            marginTop: 34,
            fontSize: MISE_EN_PAGE.legende,
            fontWeight: 600,
            color: COULEURS.texteDoux,
            textAlign: "center",
            lineHeight: 1.5,
            opacity: interpolate(frame, [1.7 * fps, 2.2 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
          }}
        >
          Essai gratuit 7 jours sur l'annuel
          <br />
          résiliable avant sans rien payer
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
