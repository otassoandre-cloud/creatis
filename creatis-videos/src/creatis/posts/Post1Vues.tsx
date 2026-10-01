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
 * POST 1 — « 66 000 vues. 12 secondes. » — archetype **Contrarian Claim**.
 *
 * C'est la formule qui domine 2026 avec le Mistake Warning et le List Tease :
 * une affirmation qui heurte l'attente. Ici la contradiction est dans le
 * rapport des deux chiffres — un enorme resultat pour une duree ridicule — et
 * elle est posee des l'image 1, en meme temps que le visage.
 *
 * Le hook est un triple simultane, comme le demande la recherche :
 *   - visuel : le vrai clip, un visage qui bouge, aucune intro ;
 *   - texte  : « 66 000 vues » lisible a 100 % a l'image 0 ;
 *   - preuve : c'est notre propre clip, verifiable, pas un chiffre invente.
 *
 * Aucune voix off : le post est fait pour recevoir un son tendance ajoute dans
 * l'app au moment de publier. Un son ajoute in-app est rattache a ce son et
 * remonte dans son flux, ce qu'une musique incrustee dans le MP4 ne fait pas.
 */
export const DUREE_POST_1 = 275;

/** PLAN A — la preuve, plein cadre. */
const Preuve: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
    <Video
      src={staticFile("clip-66k.mp4")}
      style={{ width: "100%", height: "100%" }}
      objectFit="cover"
      muted
    />
    {/* Voile haut seulement : le visage doit rester net, c'est lui l'accroche. */}
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(to bottom, rgba(4,10,7,0.94) 0%, rgba(4,10,7,0.8) 14%, rgba(4,10,7,0.2) 30%, rgba(4,10,7,0) 44%)",
      }}
    />
    <HookFixe ligne1="66 000 vues" ligne2="en 12 secondes" taille={130} />
  </AbsoluteFill>
);

/** PLAN B — d'ou sort ce clip : presque rien, sur deux heures. */
const Origine: React.FC = () => {
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
          paddingBottom: 420,
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
          02:04:11
        </div>

        {/* Un seul segment, minuscule : c'est tout le propos du plan. */}
        <FriseVideo segments={[{ x: 46.5, largeur: 1.6 }]} />

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
          ↑ les 12 secondes
        </div>
      </AbsoluteFill>

      <SousTitreBrule
        texte="Le reste, personne ne l'a regardé"
        debut={4}
        cadence={3}
        hauteur={62}
        taille={72}
        accent={["personne"]}
      />
    </AbsoluteFill>
  );
};

/** PLAN C — ce n'est pas un coup de chance : il y en avait dix. */
const Dix: React.FC = () => {
  const frame = useCurrentFrame();
  const clips = ["showcase-2.mp4", "showcase-5.mp4", "showcase-8.mp4", "showcase-7.mp4"];

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
              opacity: interpolate(frame, [i * 3, i * 3 + 7], [0, 1], {
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
            "linear-gradient(to bottom, rgba(4,10,7,0) 44%, rgba(4,10,7,0.88) 60%, rgba(4,10,7,0.92) 74%, rgba(4,10,7,0.5) 100%)",
        }}
      />

      <SousTitreBrule
        texte="L'IA en a trouvé 10 dans la même vidéo"
        debut={6}
        cadence={3}
        hauteur={57}
        taille={74}
        accent={["10"]}
      />
    </AbsoluteFill>
  );
};

export const Post1Vues: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COULEURS.fond, fontFamily: POLICE }}>
      <Series>
      {/* Pas de flash sur l'accroche : l'image 1 doit etre le visage. */}
      <Series.Sequence durationInFrames={70} name="A · 66 000 vues">
        <Punch force={1.04} flash={0}>
          <Preuve />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={80} name="B · D'où ça sort">
        <Punch force={1.08} flash={0.1}>
          <Origine />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={70} name="C · Il y en avait 10">
        <Punch force={1.08} flash={0.1}>
          <Dix />
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
