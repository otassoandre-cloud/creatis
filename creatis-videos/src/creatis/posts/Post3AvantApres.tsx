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
import { Fond } from "../Fond";
import { POLICE } from "../police";
import { Punch } from "../Punch";
import { COULEURS } from "../theme";
import { CartonFinal } from "./CartonFinal";
import { FriseVideo } from "./FriseVideo";
import { HookFixe } from "./HookFixe";

/**
 * POST 3 — AVANT / APRES.
 *
 * D'apres la recherche, c'est le format le plus efficace pour un outil : il
 * ouvre une boucle (« ca donne quoi ? ») que seule la suite referme, et il se
 * comprend integralement sans son. C'est aussi le plus court des cinq — 9,5 s —
 * parce qu'il n'a qu'une chose a dire et que la retention chute a mesure qu'on
 * s'eloigne des 15 s.
 *
 * Le mot AVANT est en rouge et APRES en vert : sur une miniature de feed, la
 * couleur seule raconte deja le post.
 */
export const DUREE_POST_3 = 260;

const Etiquette: React.FC<{ texte: string; couleur: string }> = ({
  texte,
  couleur,
}) => (
  <div
    style={{
      fontSize: 52,
      fontWeight: 800,
      letterSpacing: "0.18em",
      color: couleur,
      marginBottom: 34,
    }}
  >
    {texte}
  </div>
);

/** AVANT — deux heures, rien d'exploitable. */
const Avant: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Fond intensite={0.3} />
      <HookFixe ligne1="AVANT" hauteur={17} taille={120} surVideo={false} />

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 80,
          paddingRight: 80,
        }}
      >
        <Etiquette texte="02:04:11" couleur={COULEURS.texteDoux} />
        <FriseVideo segments={[]} hauteur={140} />
        <div
          style={{
            marginTop: 40,
            fontSize: 56,
            fontWeight: 800,
            color: "#f87171",
            opacity: interpolate(frame, [0.4 * fps, 0.8 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          1 vidéo que personne ne finit
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** APRES — la meme matiere, dix fois publiable. */
const Apres: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clips = ["showcase-5.mp4", "showcase-2.mp4", "showcase-7.mp4", "showcase-8.mp4"];

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <AbsoluteFill
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 8,
          padding: 8,
        }}
      >
        {clips.map((f, i) => (
          <div
            key={f}
            style={{
              overflow: "hidden",
              borderRadius: 14,
              opacity: interpolate(frame, [i * 3, i * 3 + 6], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              scale: interpolate(frame, [i * 3, i * 3 + 11], [0.88, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
                output: "perceptual-scale",
              }),
            }}
          >
            <Video
              src={staticFile(f)}
              style={{ width: "100%", height: "100%" }}
              objectFit="cover"
              muted
              loop
            />
          </div>
        ))}
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(4,10,7,0.96) 0%, rgba(4,10,7,0.9) 9%, rgba(4,10,7,0) 19%, rgba(4,10,7,0) 72%, rgba(4,10,7,0.9) 86%, rgba(4,10,7,0.97) 100%)",
        }}
      />

      <HookFixe ligne1="APRÈS" hauteur={6} taille={120} />

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 120,
        }}
      >
        <div
          style={{
            fontSize: 62,
            fontWeight: 800,
            color: COULEURS.vert,
            WebkitTextStroke: "8px rgba(0,0,0,0.9)",
            paintOrder: "stroke fill",
            opacity: interpolate(frame, [0.5 * fps, 0.9 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          10 clips prêts à publier
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Le chiffre qui relie les deux etats. */
const Entre: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Fond intensite={1.2} />
      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 120,
        }}
      >
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            color: COULEURS.texteDoux,
            letterSpacing: "0.12em",
            marginBottom: 18,
          }}
        >
          ENTRE LES DEUX
        </div>
        <div
          style={{
            fontSize: 180,
            fontWeight: 800,
            color: COULEURS.vert,
            letterSpacing: "-0.05em",
            lineHeight: 1,
            textShadow: "0 0 90px rgba(16,185,129,0.5)",
            scale: interpolate(frame, [0, 0.55 * fps], [0.8, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 11 }),
              output: "perceptual-scale",
            }),
          }}
        >
          60 s
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Post3AvantApres: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COULEURS.fond, fontFamily: POLICE }}>
      <Series>
      <Series.Sequence durationInFrames={75} name="A · AVANT">
        <Punch force={1.04} flash={0}>
          <Avant />
        </Punch>
      </Series.Sequence>

      {/* La coupe la plus dure des cinq posts : c'est elle, le post. */}
      <Series.Sequence durationInFrames={85} name="B · APRÈS">
        <Punch force={1.12} flash={0.14}>
          <Apres />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={50} name="C · 60 s">
        <Punch force={1.08} flash={0.1}>
          <Entre />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={50} name="D · Créatis">
        <Punch>
          <CartonFinal />
        </Punch>
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
