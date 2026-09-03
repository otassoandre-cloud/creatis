import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SousTitreBrule } from "../SousTitreBrule";
import { COULEURS, ENTREE } from "../theme";

/** Les clips reellement sortis du produit, montes en mosaique. */
const CLIPS = ["showcase-2.mp4", "showcase-5.mp4", "showcase-8.mp4", "showcase-7.mp4"] as const;

/**
 * PLAN 5 — le resultat (15 → 19 s).
 *
 * Quatre clips reels qui jouent en meme temps, plein cadre. Ce plan repond a la
 * seule question qui reste apres la demo : « ca donne quoi, concretement ? ».
 * Quatre videos en mouvement simultane, c'est aussi la densite visuelle la plus
 * forte de la pub — placee juste avant l'appel a l'action, la ou la retention
 * commence naturellement a fatiguer.
 */
export const Resultat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Audio src={staticFile("voix/t5-resultat.mp3")} />

      <AbsoluteFill
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 8,
          padding: 8,
        }}
      >
        {CLIPS.map((fichier, i) => (
          <div
            key={fichier}
            style={{
              overflow: "hidden",
              borderRadius: 14,
              opacity: interpolate(frame, [i * 3, i * 3 + 8], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(...ENTREE),
              }),
              scale: interpolate(frame, [i * 3, i * 3 + 12], [0.9, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(...ENTREE),
                output: "perceptual-scale",
              }),
            }}
          >
            <Video
              src={staticFile(fichier)}
              style={{ width: "100%", height: "100%" }}
              objectFit="cover"
              muted
              loop
            />
          </div>
        ))}
      </AbsoluteFill>

      {/* Assombrissement central pour detacher le texte de la mosaique */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(58% 26% at 50% 62%, rgba(4,10,7,0.85) 0%, rgba(4,10,7,0) 100%)",
        }}
      />

      <SousTitreBrule
        texte="10 clips, prêts à publier"
        debut={8}
        cadence={3}
        hauteur={58}
        taille={80}
        accent={["10", "clips,"]}
      />

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 640,
        }}
      >
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: "#fff",
            WebkitTextStroke: "6px rgba(0,0,0,0.9)",
            paintOrder: "stroke fill",
            opacity: interpolate(frame, [1.9 * fps, 2.3 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
          }}
        >
          en 60 secondes
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
