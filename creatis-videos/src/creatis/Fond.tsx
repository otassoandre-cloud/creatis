import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { COULEURS } from "./theme";

/**
 * Fond commun a toutes les scenes : noir vert-noir + halo emeraude qui respire
 * lentement. Le halo evite le "carton noir" plat sans jamais voler l'attention
 * au texte, qui reste le seul element vraiment lisible de chaque scene.
 */
export const Fond: React.FC<{ intensite?: number }> = ({ intensite = 1 }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill name="Fond" style={{ backgroundColor: COULEURS.fond }}>
      <AbsoluteFill
        name="Halo"
        style={{
          background: `radial-gradient(60% 40% at 50% 38%, rgba(16,185,129,${
            0.22 * intensite
          }) 0%, rgba(16,185,129,0) 70%)`,
          opacity: interpolate(frame % 150, [0, 75, 150], [0.75, 1, 0.75], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.4, 0, 0.6, 1),
          }),
        }}
      />

      {/* Grain tres leger : casse les degrades trop propres qui « bandent » en
          video. Rendu comme un vrai <svg> et non en background-image CSS —
          Remotion deconseille background-image (regle @remotion/no-background-image)
          parce que le rendu n'attend pas son chargement et peut sortir des images
          sans le motif. Un SVG inline est peint avec le reste du DOM. */}
      <AbsoluteFill name="Grain" style={{ opacity: 0.035 }}>
        <svg
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <filter id="bruit-fond">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85"
              numOctaves="3"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#bruit-fond)" />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
