import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Series,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { POLICE } from "../police";
import { Punch } from "../Punch";
import { COULEURS } from "../theme";
import { CartonFinal } from "./CartonFinal";
import { HookFixe } from "./HookFixe";

/**
 * POST 4 — « 3 clips que l'IA a trouvés dans MA vidéo » — archetype
 * **List Tease**, troisieme des formules dominantes de 2026.
 *
 * Sa mecanique : le nombre annonce combien d'elements restent a voir, donc
 * chaque element relance la boucle au lieu de la fermer. C'est le seul des cinq
 * posts qui depasse 13 s, et c'est justement le format qui le supporte.
 *
 * Regle appliquee : **l'appat est au numero 2, pas au numero 3.** Annoncer le
 * meilleur en dernier suppose que le spectateur attende ; le mettre au milieu
 * recompense celui qui est reste et le porte jusqu'au bout. Le numero 2 est le
 * vrai clip a 66 000 vues.
 */
export const DUREE_POST_4 = 345;

const Element: React.FC<{
  numero: number;
  fichier: string;
  score: number;
  /** Le tag genere par le produit (« Moment fort », « Hook »...). */
  tag: string;
  badge?: string;
}> = ({ numero, fichier, score, tag, badge }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const paraitre = (debut: number) =>
    interpolate(frame, [debut, debut + 6], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Video
        src={staticFile(fichier)}
        style={{ width: "100%", height: "100%" }}
        objectFit="cover"
        muted
        loop
      />

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(4,10,7,0.8) 0%, rgba(4,10,7,0.1) 30%, rgba(4,10,7,0.15) 55%, rgba(4,10,7,0.92) 100%)",
        }}
      />

      {/* Le numero, enorme et en haut : c'est le compteur de la liste. */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "flex-start",
          paddingTop: 110,
          paddingLeft: 78,
        }}
      >
        <div
          style={{
            fontSize: 150,
            fontWeight: 800,
            color: COULEURS.vert,
            letterSpacing: "-0.06em",
            lineHeight: 1,
            WebkitTextStroke: "10px rgba(0,0,0,0.9)",
            paintOrder: "stroke fill",
            scale: interpolate(frame, [0, 0.4 * fps], [0.7, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 11 }),
              output: "perceptual-scale",
            }),
          }}
        >
          #{numero}
        </div>
      </AbsoluteFill>

      {/* Le score : c'est le produit qui l'a calcule, pas nous. */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "flex-end",
          paddingTop: 130,
          paddingRight: 78,
        }}
      >
        <div
          style={{
            fontSize: 62,
            fontWeight: 800,
            color: "#05140B",
            backgroundColor: COULEURS.vert,
            padding: "12px 30px",
            borderRadius: 20,
            fontVariantNumeric: "tabular-nums",
            opacity: paraitre(8),
          }}
        >
          {score}
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 250,
          paddingLeft: 80,
          paddingRight: 80,
          textAlign: "center",
        }}
      >
        {badge ? (
          <div
            style={{
              fontSize: 58,
              fontWeight: 800,
              color: "#05140B",
              backgroundColor: COULEURS.vert,
              padding: "16px 40px",
              borderRadius: 999,
              marginBottom: 24,
              boxShadow: "0 0 70px rgba(16,185,129,0.6)",
              opacity: paraitre(14),
              scale: interpolate(frame, [14, 14 + 12], [0.8, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.spring({ damping: 10 }),
                output: "perceptual-scale",
              }),
            }}
          >
            {badge}
          </div>
        ) : null}

        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: COULEURS.texte,
            letterSpacing: "0.02em",
            padding: "12px 30px",
            borderRadius: 999,
            border: `1px solid ${COULEURS.ligne}`,
            backgroundColor: "rgba(10,15,10,0.72)",
            opacity: paraitre(4),
          }}
        >
          {tag}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** PLAN A — l'annonce : combien, et d'ou. */
const Annonce: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
    <Video
      src={staticFile("showcase-8.mp4")}
      style={{ width: "100%", height: "100%" }}
      objectFit="cover"
      muted
      loop
    />
    <AbsoluteFill style={{ backgroundColor: "rgba(4,10,7,0.66)" }} />
    <HookFixe
      ligne1="3 clips que l'IA a trouvés dans MA vidéo"
      ligne2="le 2e a fait 66 000 vues"
      hauteur={24}
      taille={96}
      tailleLigne2={50}
    />
  </AbsoluteFill>
);

export const Post4Liste: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COULEURS.fond, fontFamily: POLICE }}>
      <Series>
      <Series.Sequence durationInFrames={80} name="A · 3 clips">
        <Punch force={1.04} flash={0}>
          <Annonce />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={65} name="B · #1">
        <Punch force={1.08} flash={0.1}>
          <Element numero={1} fichier="showcase-5.mp4" score={94} tag="Moment fort" />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={80} name="B · #2 (66K)">
        <Punch force={1.12} flash={0.14}>
          <Element
            numero={2}
            fichier="clip-66k.mp4"
            score={91}
            tag="Hook"
            badge="66 000 vues"
          />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={65} name="B · #3">
        <Punch force={1.08} flash={0.1}>
          <Element numero={3} fichier="showcase-7.mp4" score={89} tag="Storytelling" />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={55} name="C · Créatis">
        <Punch>
          <CartonFinal />
        </Punch>
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
