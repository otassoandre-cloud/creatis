import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Fond } from "../Fond";
import { COULEURS, ENTREE } from "../theme";

/**
 * Carton de fin commun aux 5 posts.
 *
 * Volontairement maigre : logo, adresse, une ligne de condition. En organique,
 * un CTA long se lit comme une pub et fait decrocher juste avant la fin — or
 * c'est la fin qui decide du taux de completion, donc de la portee. On dit ou
 * aller, rien de plus.
 *
 * Les conditions reprennent paiement.html mot pour mot. Une video plus
 * genereuse que la page de paiement fabrique des demandes de remboursement.
 */
export const CartonFinal: React.FC<{ mention?: string }> = ({
  mention = "7 jours d'essai gratuit sur l'annuel",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const paraitre = (debut: number) =>
    interpolate(frame, [debut, debut + 0.35 * fps], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(...ENTREE),
    });

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Fond intensite={1.4} />

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            opacity: paraitre(0),
            scale: interpolate(frame, [0, 0.6 * fps], [0.85, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 12 }),
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
              letterSpacing: "-0.04em",
            }}
          >
            Créatis
          </div>
        </div>

        <div
          style={{
            marginTop: 46,
            fontSize: 66,
            fontWeight: 800,
            color: "#05140B",
            backgroundColor: COULEURS.vert,
            padding: "26px 58px",
            borderRadius: 999,
            letterSpacing: "-0.02em",
            boxShadow: "0 0 80px rgba(16,185,129,0.5)",
            opacity: paraitre(0.4 * fps),
          }}
        >
          creatis.app
        </div>

        <div
          style={{
            marginTop: 30,
            fontSize: 36,
            fontWeight: 600,
            color: COULEURS.texteDoux,
            opacity: paraitre(0.8 * fps),
          }}
        >
          {mention}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
