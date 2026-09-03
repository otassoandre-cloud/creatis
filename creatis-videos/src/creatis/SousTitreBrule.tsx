import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COULEURS } from "./theme";

/**
 * Sous-titres incrustes, mot par mot — la piece la plus importante de la pub.
 *
 * Pourquoi ils existent : le blog de Créatis mesure lui-meme que **80 % des gens
 * regardent sans le son**. Une pub dont le sens repose sur la voix off perd donc
 * 4 spectateurs sur 5. Le texte doit porter le message tout seul, le son n'est
 * qu'un bonus.
 *
 * Le style reprend celui que le produit fabrique (karaoke mot par mot, contour
 * noir, mot actif en vert) : la pub demontre le produit en meme temps qu'elle en
 * parle.
 *
 * Position : ~62 % de la hauteur. Le bas de l'ecran TikTok/Reels est mange par
 * le pseudo, la legende et les boutons — un sous-titre pose a 85 % passe sous
 * l'interface et devient illisible.
 */
export const SousTitreBrule: React.FC<{
  texte: string;
  /** Image (relative a la scene) ou le premier mot apparait. */
  debut: number;
  /** Duree d'apparition de chaque mot, en images. */
  cadence?: number;
  /** Position verticale en % de la hauteur. */
  hauteur?: number;
  /** Mots a mettre en couleur (comparaison insensible a la casse). */
  accent?: string[];
  /**
   * Couleur des mots accentues. Vert par defaut (couleur produit), mais le plan
   * du cout manuel doit accentuer en rouge : y mettre du vert reviendrait a
   * colorier la douleur avec la couleur de la solution.
   */
  couleurAccent?: string;
  taille?: number;
  /**
   * Image ou la ligne s'efface. Indispensable des qu'une scene enchaine
   * plusieurs sous-titres : sans elle, ils s'empilent au meme endroit et
   * deviennent illisibles.
   */
  fin?: number;
}> = ({
  texte,
  debut,
  cadence = 4,
  hauteur = 62,
  accent = [],
  couleurAccent = COULEURS.vert,
  taille = 76,
  fin,
}) => {
  const frame = useCurrentFrame();
  /* La hauteur est convertie en PIXELS a partir de la hauteur reelle de la
     composition. Un `paddingTop: "62%"` se calcule en CSS sur la LARGEUR du
     conteneur, pas sa hauteur : sur un cadre 1080x1920, 62 % donnaient 670 px,
     soit 35 % de la hauteur. Tous les sous-titres tombaient donc bien plus haut
     que prevu, en plein sur les visuels. */
  const { height } = useVideoConfig();
  const mots = texte.split(" ");

  // Sortie nette et rapide : on ne veut pas voir deux lignes se croiser.
  const sortie =
    fin === undefined
      ? 1
      : interpolate(frame, [fin, fin + 5], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  const estAccent = (mot: string) =>
    accent.some(
      (a) =>
        a.toLowerCase() ===
        mot.toLowerCase().replace(/[.,!?:;»«]/g, ""),
    );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: (height * hauteur) / 100,
        // Marges laterales larges : le bandeau de boutons de TikTok mord sur la
        // droite, et un texte qui touche le bord est coupe a la lecture.
        paddingLeft: 110,
        paddingRight: 110,
        opacity: sortie,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0 18px",
          textAlign: "center",
        }}
      >
        {mots.map((mot, i) => {
          const apparition = debut + i * cadence;
          return (
            <span
              key={`${mot}-${i}`}
              style={{
                fontSize: taille,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: 1.22,
                color: estAccent(mot) ? couleurAccent : "#ffffff",
                // Contour epais : le texte doit rester lisible sur une image
                // claire comme sur une image sombre, sans bandeau de fond.
                WebkitTextStroke: "9px rgba(0,0,0,0.92)",
                paintOrder: "stroke fill",
                textShadow: "0 4px 22px rgba(0,0,0,0.75)",
                opacity: interpolate(
                  frame,
                  [apparition, apparition + 3],
                  [0, 1],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  },
                ),
                scale: interpolate(
                  frame,
                  [apparition, apparition + 6],
                  [0.7, 1],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.spring({ damping: 11 }),
                    output: "perceptual-scale",
                  },
                ),
                translate: interpolate(
                  frame,
                  [apparition, apparition + 6],
                  ["0px 16px", "0px 0px"],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.spring({ damping: 11 }),
                  },
                ),
              }}
            >
              {mot}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
