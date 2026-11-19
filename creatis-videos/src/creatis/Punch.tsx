import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from "remotion";

/**
 * Coup de zoom sur chaque coupe.
 *
 * C'est le levier de dynamisme le moins cher et le plus efficace du format
 * court : a chaque changement de plan, l'image entre legerement trop grande et
 * se pose en 8 images. L'oeil percoit un mouvement a l'instant precis de la
 * coupe, donc la coupe se « sent » au lieu de simplement se voir. Sans lui, une
 * suite de plans fixes donne un diaporama, meme quand chaque plan est anime.
 *
 * Le flash blanc de 3 images par-dessus fait le reste : il marque la coupe
 * comme un temps fort. Volontairement faible (8 %) — sur un fond #0a0f0a un
 * flash franc pique les yeux au bout de six coupes.
 *
 * `perceptual-scale` : sans lui, une interpolation lineaire de l'echelle se
 * voit comme un ralentissement en fin de course, parce que l'oeil percoit le
 * changement de taille de facon logarithmique.
 */
export const Punch: React.FC<{
  children: React.ReactNode;
  /** Echelle de depart. 1.06 par defaut ; plus haut = coupe plus violente. */
  force?: number;
  /** Intensite du flash blanc, 0 pour le couper. */
  flash?: number;
}> = ({ children, force = 1.06, flash = 0.08 }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          scale: interpolate(frame, [0, 8], [force, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            output: "perceptual-scale",
          }),
        }}
      >
        {children}
      </AbsoluteFill>

      {flash > 0 ? (
        <AbsoluteFill
          style={{
            backgroundColor: "#ffffff",
            opacity: interpolate(frame, [0, 3], [flash, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
