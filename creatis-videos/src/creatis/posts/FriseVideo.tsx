import { COULEURS } from "../theme";

/**
 * La barre de montage d'une video longue, reutilisee par trois posts.
 *
 * C'est le seul objet visuel qui rend la duree d'une video *tangible* en une
 * image : une barre presque vide ou un tout petit segment est surligne dit
 * « ton clip represente ca sur deux heures » sans une seule ligne de texte.
 */
export const FriseVideo: React.FC<{
  /** Segments surlignes : position et largeur en % de la barre. */
  segments?: { x: number; largeur: number; couleur?: string; halo?: boolean }[];
  hauteur?: number;
  /** Tete de lecture, en % ; absente si non fournie. */
  curseur?: number;
}> = ({ segments = [], hauteur = 120, curseur }) => {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: hauteur,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.06)",
        border: `1px solid ${COULEURS.ligne}`,
        overflow: "hidden",
      }}
    >
      {segments.map((s) => (
        <div
          key={`${s.x}-${s.largeur}`}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: 0,
            bottom: 0,
            width: `${s.largeur}%`,
            borderRadius: 10,
            backgroundColor: s.couleur ?? COULEURS.vert,
            boxShadow: s.halo === false ? "none" : "0 0 40px rgba(16,185,129,0.75)",
          }}
        />
      ))}

      {curseur === undefined ? null : (
        <div
          style={{
            position: "absolute",
            left: `${curseur}%`,
            top: 0,
            bottom: 0,
            width: 5,
            backgroundColor: "#fff",
            boxShadow: "0 0 22px rgba(255,255,255,0.9)",
          }}
        />
      )}
    </div>
  );
};
