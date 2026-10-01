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
 * Scene finale — l'offre de lancement (5 s).
 *
 * Les trois conditions affichees sont recopiees telles quelles de paiement.html
 * et des CGU. Une pub de lancement qui annonce un essai plus genereux que la page
 * de paiement fabrique des demandes de remboursement, pas des clients.
 */
export const SceneLancement: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const arguments_ = [
    "7 jours d'essai gratuit",
    "Résiliable avant, sans rien payer",
    "Sans montage, sans logiciel",
  ];

  return (
    <AbsoluteFill name="SceneLancement">
      <Audio src={staticFile("voix/s7-lancement.mp3")} />
      <Fond intensite={1.4} />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: MISE_EN_PAGE.margeCote,
          paddingRight: MISE_EN_PAGE.margeCote,
        }}
      >
        <Interactive.Div
          name="Bandeau lancement"
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: COULEURS.vert,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            border: `1px solid rgba(16,185,129,0.45)`,
            padding: "12px 28px",
            borderRadius: 999,
            marginBottom: 40,
            opacity: interpolate(frame, [0, 0.45 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
          }}
        >
          Disponible maintenant
        </Interactive.Div>

        <Interactive.Div
          name="Logo"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            opacity: interpolate(frame, [0.25 * fps, 0.75 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
            scale: interpolate(frame, [0.25 * fps, 1 * fps], [0.9, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 14 }),
              output: "perceptual-scale",
            }),
          }}
        >
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 24,
              background: `linear-gradient(180deg, ${COULEURS.vertClair}, ${COULEURS.vertSombre})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 50,
              fontWeight: 800,
              color: "#05140B",
              boxShadow: "0 0 60px rgba(16,185,129,0.5)",
            }}
          >
            C
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              color: COULEURS.texte,
              letterSpacing: "-0.035em",
            }}
          >
            Créatis
          </div>
        </Interactive.Div>

        {/* Les trois arguments arrivent l'un apres l'autre, coches. */}
        <div style={{ marginTop: 46, display: "flex", flexDirection: "column", gap: 18 }}>
          {arguments_.map((texte, i) => (
            <Interactive.Div
              key={texte}
              name={`Argument ${i + 1}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                fontSize: 40,
                fontWeight: 700,
                color: COULEURS.texte,
                opacity: interpolate(
                  frame,
                  [(0.9 + i * 0.28) * fps, (1.3 + i * 0.28) * fps],
                  [0, 1],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(...ENTREE),
                  },
                ),
                translate: interpolate(
                  frame,
                  [(0.9 + i * 0.28) * fps, (1.45 + i * 0.28) * fps],
                  ["0px 22px", "0px 0px"],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(...ENTREE),
                  },
                ),
              }}
            >
              <span style={{ color: COULEURS.vert, fontSize: 44 }}>✓</span>
              {texte}
            </Interactive.Div>
          ))}
        </div>

        <Interactive.Div
          name="Adresse"
          style={{
            marginTop: 52,
            fontSize: 68,
            fontWeight: 800,
            color: "#05140B",
            backgroundColor: COULEURS.vert,
            padding: "28px 62px",
            borderRadius: 999,
            letterSpacing: "-0.02em",
            boxShadow: "0 0 80px rgba(16,185,129,0.5)",
            opacity: interpolate(frame, [2 * fps, 2.45 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
            scale: interpolate(frame, [2 * fps, 2.8 * fps], [0.88, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 12 }),
              output: "perceptual-scale",
            }),
          }}
        >
          creatis.app
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
