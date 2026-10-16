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
import { SousTitreBrule } from "../SousTitreBrule";
import { COULEURS } from "../theme";
import { CartonFinal } from "./CartonFinal";
import { FriseVideo } from "./FriseVideo";
import { HookFixe } from "./HookFixe";

/**
 * POST 8 — « Ta meilleure vidéo est déjà en ligne. Personne ne l'a vue. »
 *
 * ── L'angle, et pourquoi celui-la ─────────────────────────────────────────
 * Le Reel a 1 221 vues disait « 3 clips que l'IA a trouves dans MA video ».
 * Le mot qui porte, c'est **MA** : le sujet n'est pas l'outil, c'est le
 * materiau que le createur possede deja. Les deux Reels les plus faibles
 * (293 et 263) sont ceux ou le sujet redevient l'interface.
 *
 * Ce post pousse la possession jusqu'a la perte : ce n'est plus « l'IA a
 * trouve dans ma video », c'est « c'est DEJA chez toi, en ligne, et ca ne
 * rapporte rien ». On ne promet pas un gain futur, on nomme un actif dormant.
 * Un gain hypothetique se compare a l'effort demande ; un actif qu'on possede
 * deja et qui dort ne se compare a rien, il se recupere.
 *
 * Consequence de mise en scene : aucun plan d'interface, meme au dernier
 * tiers. Les deux posts qui en montraient sont les deux qui ont le moins
 * porte — tant que ce signal tient, le produit reste hors champ et n'apparait
 * que dans le carton final.
 *
 * Muet, sous-titres incrustes : le son se pose dans l'app a la publication.
 */
export const DUREE_POST_8 = 278;

/** PLAN A — l'affirmation, sur une vraie video. */
const Dormant: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
    <Video
      src={staticFile("showcase-2.mp4")}
      style={{ width: "100%", height: "100%" }}
      objectFit="cover"
      muted
      loop
    />
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(to bottom, rgba(4,10,7,0.94) 0%, rgba(4,10,7,0.8) 15%, rgba(4,10,7,0.22) 31%, rgba(4,10,7,0) 45%)",
      }}
    />
    <HookFixe ligne1="Ta meilleure vidéo" ligne2="est déjà en ligne" taille={116} />
  </AbsoluteFill>
);

/** PLAN B — elle est enfouie. Trois marqueurs, pas un seul : c'est repetable. */
const Enfouie: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Fond intensite={0.5} />
      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 80,
          paddingRight: 80,
          paddingBottom: 400,
        }}
      >
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            color: COULEURS.texteDoux,
            letterSpacing: "0.12em",
            marginBottom: 26,
          }}
        >
          ta dernière vidéo
        </div>

        {/* Trois segments : le propos n'est pas « il y a une pepite » mais
            « il y en a plusieurs », ce qui rend le geste repetable. */}
        <FriseVideo
          segments={[
            { x: 18, largeur: 2.2 },
            { x: 51, largeur: 1.8 },
            { x: 77, largeur: 2.4 },
          ]}
        />

        <div
          style={{
            marginTop: 34,
            fontSize: 40,
            fontWeight: 700,
            color: COULEURS.vert,
            opacity: interpolate(frame, [0.7 * fps, 1.1 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          3 moments publiables
        </div>
      </AbsoluteFill>

      <SousTitreBrule
        texte="Noyés dans 40 minutes"
        debut={4}
        cadence={3}
        hauteur={62}
        taille={72}
        accent={["Noyés"]}
      />
    </AbsoluteFill>
  );
};

/** PLAN C — sortis, verticaux, lisibles. Le resultat, pas l'outil. */
const Sortis: React.FC = () => {
  const frame = useCurrentFrame();
  const clips = ["showcase-5.mp4", "showcase-7.mp4", "showcase-8.mp4"];

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <AbsoluteFill
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          padding: 8,
          alignItems: "center",
        }}
      >
        {clips.map((f, i) => (
          <div
            key={f}
            style={{
              overflow: "hidden",
              borderRadius: 14,
              aspectRatio: "9 / 16",
              transform: `translateY(${interpolate(frame, [i * 4, i * 4 + 10], [26, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              })}px)`,
              opacity: interpolate(frame, [i * 4, i * 4 + 9], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
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
            "linear-gradient(to bottom, rgba(4,10,7,0.55) 0%, rgba(4,10,7,0) 26%, rgba(4,10,7,0) 52%, rgba(4,10,7,0.9) 70%, rgba(4,10,7,0.95) 100%)",
        }}
      />

      <SousTitreBrule
        texte="Sortis en 30 secondes"
        debut={6}
        cadence={3}
        hauteur={58}
        taille={74}
        accent={["30 secondes"]}
      />
    </AbsoluteFill>
  );
};

export const Post8DejaLa: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COULEURS.fond, fontFamily: POLICE }}>
    <Series>
      <Series.Sequence durationInFrames={72} name="A · Déjà en ligne">
        <Punch force={1.04} flash={0}>
          <Dormant />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={80} name="B · Noyés">
        <Punch force={1.08} flash={0.1}>
          <Enfouie />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={66} name="C · Sortis">
        <Punch force={1.08} flash={0.1}>
          <Sortis />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={60} name="D · Carton">
        <CartonFinal />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
