import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { POLICE } from "./police";

/**
 * KIT VISUEL — VERSION VERTICALE. Le même parti pris en 1080×1920.
 *
 * ── CE QU'IL REPREND DU KIT 16:9 ─────────────────────────────────────────
 * Aucune scène n'a le droit d'être un fond uni. Chaque plan repose sur une
 * image réelle qui bouge, et le texte vit par-dessus. Validé le 09/10 sur la
 * maquette : les plans lumineux de B-roll cassent la monotonie sombre, et le
 * film cesse de ressembler à un diaporama.
 *
 * ── CE QUI CHANGE, ET POURQUOI ───────────────────────────────────────────
 * En vertical, c'est l'inverse du kit long : le B-roll est en 16:9 et doit
 * remplir un cadre 9:16. On applique le même traitement qu'aux clips — une
 * copie floue et agrandie en fond, la copie nette au centre — plutôt que de
 * zoomer à 178 % dans l'image, ce qui n'en garderait qu'un tiers.
 *
 * ── ET LES ZONES D'INTERFACE RESTENT INTOUCHABLES ────────────────────────
 * Relevées le 08/10 sur une capture iPhone (1179×2556) :
 *   haut 0-14 %, droite 49-89 %, bas 66-92 %.
 * Tout le texte vit entre 14 et 48 %. Un plan qui l'oublie se fait recouvrir
 * par le pseudo, la légende et la ligne de musique de la plateforme.
 */

/** Travelling avant lent — une image immobile se regarde comme une diapositive. */
const zoom = (frame: number, duree: number, de = 1.03, a = 1.12) =>
  interpolate(frame, [0, duree * 30], [de, a], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/**
 * Une source 16:9 dans un cadre vertical : flou débordant en fond, image nette
 * au centre. On ne recadre pas dans le 16:9 — à 178 % de zoom il ne resterait
 * qu'un tiers de l'image, et on perdrait précisément ce qu'on est allé
 * chercher : le mouvement et la couleur.
 */
export const BrollVertical: React.FC<{
  source: string;
  depart?: number;
  duree: number;
  /** Quelle hauteur de l'image 16:9 on garde, de 0 (haut) à 1 (bas). */
  centre?: number;
}> = ({ source, depart = 0, duree, centre = 0.5 }) => {
  const frame = useCurrentFrame();
  const e = zoom(frame, duree, 1.02, 1.1);
  /* ── POURQUOI ON RECADRE AU LIEU DE FLOUTER LES BORDS ──────────────────
     Premier essai : une copie floue et agrandie en fond, l'image nette au
     centre — le traitement qui marche pour mettre du 9:16 dans du 16:9. À
     l'envers, il échoue : le fond flou ne s'est pas rendu et il restait deux
     bandes NOIRES de 25 % en haut et en bas.
     En vertical, on recadre donc DANS l'image. On perd les côtés, on gagne un
     plan lumineux plein cadre — et c'est précisément ce qu'on est allé
     chercher avec le B-roll. */
  /* ── ET POURQUOI PAS `objectFit: cover` ───────────────────────────────
     Deuxième essai, deux bandes noires de nouveau : ce lecteur n'honore pas
     `objectFit`. On revient donc à la méthode qui marche partout ailleurs
     dans ce projet — dimensions EXPLICITES et transformation calculée.
     La source fait 1920×1080 ; pour remplir 1080×1920 il faut 1,778. */
  const base = Math.max(1080 / 1920, 1920 / 1080);
  const ech = base * e;
  const tx = 540 - 960 * ech;
  const ty = 960 - 1080 * centre * ech;
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#04060a" }}>
      <Video
        src={staticFile(source)}
        trimBefore={Math.round(depart * 30)}
        style={{
          position: "absolute", width: 1920, height: 1080,
          transformOrigin: "0 0",
          transform: `translate(${tx}px, ${ty}px) scale(${ech})`,
        }}
        muted
      />
    </AbsoluteFill>
  );
};

/**
 * Un clip vertical en plein cadre. Le cadre utile s'arrête à 820 px de haut :
 * au-delà, les sous-titres incrustés du clip tombent dans la zone que les
 * plateformes recouvrent (mesuré le 09/10 : ils occupent 86 à 96 % du cadre).
 */
export const ClipPlein: React.FC<{
  source: string;
  depart?: number;
  duree: number;
  cadre?: [number, number, number, number];
}> = ({ source, depart = 0, duree, cadre = [150, 300, 540, 820] }) => {
  const frame = useCurrentFrame();
  const [cx, cy, cl, ch] = cadre;
  const base = Math.max(1080 / cl, 1920 / ch);
  const e = base * zoom(frame, duree, 1.0, 1.05);
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#04060a" }}>
      <Video
        src={staticFile(source)}
        trimBefore={Math.round(depart * 30)}
        style={{
          position: "absolute", width: 1080, height: 1920, transformOrigin: "0 0",
          transform: `translate(${540 - (cx + cl / 2) * e}px, ${960 - (cy + ch / 2) * e}px) scale(${e})`,
        }}
        muted
      />
    </AbsoluteFill>
  );
};

/**
 * La légende, dans la bande libre 14-48 %, sur un panneau sombre.
 * Le panneau n'est pas négociable : sur une image qui bouge et s'éclaircit,
 * un simple cerne ne tient pas, et c'est la lisibilité qui décide si on reste.
 */
export const LegendeCourte: React.FC<{
  children: React.ReactNode;
  gros?: boolean;
  haut?: number;
  visible?: number;
}> = ({ children, gros, haut = 0.30, visible = 1 }) => {
  const { height } = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute", top: height * haut, left: 0, right: 0,
        display: "flex", justifyContent: "center",
        opacity: visible,
        transform: `translateY(${interpolate(visible, [0, 1], [-18, 0])}px)`,
      }}
    >
      <div
        style={{
          maxWidth: 950, textAlign: "center", color: "#fff",
          fontFamily: POLICE,
          fontSize: gros ? 86 : 70, fontWeight: 900,
          lineHeight: 1.12, letterSpacing: -2,
          padding: "26px 34px", borderRadius: 26, background: "rgba(0,0,0,0.72)",
          textShadow:
            "0 0 2px #000, 3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000",
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** L'adresse, à 44 % : au-dessus de la colonne de boutons qui commence à 49 %. */
export const Adresse: React.FC<{ visible: number }> = ({ visible }) => {
  const { height } = useVideoConfig();
  if (visible <= 0) return null;
  return (
    <div
      style={{
        position: "absolute", left: 0, right: 0, top: height * 0.44,
        display: "flex", justifyContent: "center", opacity: visible,
      }}
    >
      <div
        style={{
          fontFamily: POLICE, fontSize: 48, fontWeight: 900, color: "#10b981",
          letterSpacing: -0.5, padding: "12px 26px", borderRadius: 999,
          background: "rgba(0,0,0,0.74)", textShadow: "0 0 2px #000",
        }}
      >
        creatis.app
      </div>
    </div>
  );
};
