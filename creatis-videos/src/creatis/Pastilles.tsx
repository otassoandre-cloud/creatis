import { interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COULEURS } from "./theme";

/**
 * PASTILLES — les chiffres du produit qui claquent à l'écran.
 *
 * Elles ne décorent pas : chacune porte une valeur RÉELLE de la génération
 * filmée juste derrière. Une pastille qui annoncerait un chiffre inventé
 * détruirait le seul intérêt de cette vidéo, qui est d'être un enregistrement.
 *
 * ── POURQUOI SUR TOUT L'ÉCRAN ─────────────────────────────────────────────
 * L'encart de l'application occupe le tiers central. Poser les pastilles dedans
 * reviendrait à les enfermer dans la zone déjà la plus chargée. Elles se posent
 * donc dans les marges — au-dessus, en dessous, sur les côtés — et c'est ce qui
 * donne la sensation de plein écran : l'œil est tiré à quatre endroits
 * différents pendant que l'appli travaille au milieu.
 *
 * ── L'ENTRÉE, ET POURQUOI PAS UN FONDU ────────────────────────────────────
 * Un fondu sur douze images se lit comme une apparition douce ; ici on veut le
 * contraire. Ressort raide (damping 11), arrivée en 6 à 8 images, et une légère
 * rotation qui casse l'alignement au pixel : une étiquette parfaitement droite
 * a l'air d'un calque, une étiquette de trois degrés de travers a l'air posée.
 *
 * La sortie est franche et deux fois plus rapide que l'entrée. C'est ce qui
 * produit le « tac » : ce n'est pas la vitesse d'arrivée qui se remarque, c'est
 * la brutalité du départ.
 */

export type Pastille = {
  /** Image d'apparition, relative à la séquence qui la contient. */
  debut: number;
  /** Durée d'affichage, en images. */
  duree: number;
  /** Le chiffre, en gros. */
  valeur: string;
  /** Ce qu'il désigne, en petit. */
  libelle?: string;
  /** Position en % du cadre. `x` est le centre de la pastille. */
  x: number;
  y: number;
  /** Accent vert pour ce que le produit APPORTE, blanc pour ce qu'il CONSTATE. */
  accent?: boolean;
  /** Inclinaison en degrés. Volontairement petite : 2 à 4. */
  angle?: number;
};

const Une: React.FC<Pastille> = ({ valeur, libelle, x, y, accent, angle = 0, duree }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* Ressort raide : la pastille dépasse légèrement sa taille puis se cale. */
  const e = spring({ frame, fps, config: { damping: 11, stiffness: 260, mass: 0.5 } });
  /* Sortie sur 5 images seulement — deux fois plus vive que l'entrée. */
  const sortie = interpolate(frame, [duree - 5, duree], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const vis = e * sortie;

  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) rotate(${angle}deg) scale(${interpolate(vis, [0, 1], [0.55, 1])})`,
        opacity: Math.min(1, vis * 1.6),
        background: accent ? COULEURS.vert : "#ffffff",
        color: accent ? "#04120b" : "#0a0f0a",
        borderRadius: 26,
        padding: libelle ? "18px 30px 16px" : "20px 32px",
        textAlign: "center",
        boxShadow: "0 26px 70px rgba(0,0,0,0.6)",
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ fontSize: 66, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.035em" }}>
        {valeur}
      </div>
      {libelle ? (
        <div
          style={{
            marginTop: 6,
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "0.02em",
            opacity: 0.72,
          }}
        >
          {libelle}
        </div>
      ) : null}
    </div>
  );
};

/**
 * Pose une série de pastilles. Chacune vit dans sa propre `Sequence`, ce qui
 * remet son temps local à zéro : sans ça, une pastille qui apparaît à l'image
 * 200 démarrerait avec un ressort déjà terminé, donc sans aucune animation.
 */
export const Pastilles: React.FC<{ liste: Pastille[] }> = ({ liste }) => (
  <>
    {liste.map((p, i) => (
      <Sequence key={`${i}-${p.debut}`} from={p.debut} durationInFrames={p.duree} layout="none">
        <Une {...p} />
      </Sequence>
    ))}
  </>
);
