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
 * POST 2 — « L'erreur que font 9 créateurs sur 10 » — archetype
 * **Mistake Warning**, deuxieme des trois formules qui dominent 2026.
 *
 * Sa force : elle declenche une verification de soi. Le spectateur ne se
 * demande pas « est-ce interessant ? » mais « est-ce que je la fais ? », ce qui
 * suspend le scroll le temps de la reponse. La regle qui va avec, c'est de ne
 * PAS reveler l'erreur dans le hook : elle arrive au plan B, ce qui oblige a
 * rester.
 *
 * Le fond du plan A est un vrai clip sorti du produit — dont le titre genere
 * est justement « L'erreur que font 9 créateurs sur 10 ». Le chiffre n'est donc
 * pas un artifice d'ecriture, c'est le produit qui l'a redige.
 */
export const DUREE_POST_2 = 285;

/** PLAN A — l'accusation, sans la reponse. */
const Accusation: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
    <Video
      src={staticFile("showcase-7.mp4")}
      style={{ width: "100%", height: "100%" }}
      objectFit="cover"
      muted
      loop
    />
    <AbsoluteFill style={{ backgroundColor: "rgba(4,10,7,0.5)" }} />
    <HookFixe
      ligne1="L'erreur que font 9 créateurs sur 10"
      hauteur={26}
      taille={104}
    />
  </AbsoluteFill>
);

/** PLAN B — l'erreur, enfin nommee : publier la version longue et s'arreter la. */
const Erreur: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Fond intensite={0.35} />
      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 80,
          paddingRight: 80,
          paddingBottom: 430,
        }}
      >
        <FriseVideo segments={[]} hauteur={130} />
        <div
          style={{
            marginTop: 30,
            fontSize: 42,
            fontWeight: 700,
            color: "#f87171",
            opacity: interpolate(frame, [0.5 * fps, 0.85 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          2 h publiées. 0 clip.
        </div>
      </AbsoluteFill>

      <SousTitreBrule
        texte="Ils publient la vidéo longue et s'arrêtent là"
        debut={3}
        cadence={3}
        hauteur={62}
        taille={70}
        accent={["s'arrêtent", "là"]}
        couleurAccent="#f87171"
      />
    </AbsoluteFill>
  );
};

/** PLAN C — la correction : la meme barre, mais decoupee. */
const Correction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const morceaux = [4, 17, 30, 43, 56, 69, 82];

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Fond intensite={0.9} />
      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 80,
          paddingRight: 80,
          paddingBottom: 430,
        }}
      >
        <FriseVideo
          hauteur={130}
          segments={morceaux.map((x, i) => ({
            x,
            /* Les segments poussent un par un : la barre morte du plan
               precedent se remplit sous les yeux, c'est le meme objet. */
            largeur:
              11 *
              interpolate(frame, [i * 4, i * 4 + 9], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
          }))}
        />
        <div
          style={{
            marginTop: 30,
            fontSize: 42,
            fontWeight: 700,
            color: COULEURS.vert,
            opacity: interpolate(frame, [1.1 * fps, 1.45 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Les mêmes 2 h. 10 clips.
        </div>
      </AbsoluteFill>

      <SousTitreBrule
        texte="Les vues sont dans les clips"
        debut={4}
        cadence={3}
        hauteur={62}
        taille={74}
        accent={["clips"]}
      />
    </AbsoluteFill>
  );
};

export const Post2Erreur: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COULEURS.fond, fontFamily: POLICE }}>
      <Series>
      <Series.Sequence durationInFrames={65} name="A · L'erreur">
        <Punch force={1.04} flash={0}>
          <Accusation />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={85} name="B · Ce qu'ils font">
        <Punch force={1.1} flash={0.12}>
          <Erreur />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={80} name="C · Ce qu'il faut faire">
        <Punch force={1.08} flash={0.1}>
          <Correction />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={55} name="D · Créatis">
        <Punch>
          <CartonFinal />
        </Punch>
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
