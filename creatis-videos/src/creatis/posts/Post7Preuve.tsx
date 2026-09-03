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

/**
 * POST 7 — « 67 791 vues. Zéro montage. »
 *
 * ── Ce que corrige ce post ────────────────────────────────────────────────
 * Le Reel « 60k vue zero montage » a fait 600 vues — deuxieme meilleur score,
 * et le seul dont la preuve est un ECRAN DE STATISTIQUES plutot qu'un clip.
 * L'idee marche donc, mais elle etait sous-exploitee : dans cette version la
 * capture n'arrivait qu'apres une mise en contexte, alors que c'est elle
 * l'argument. Ici l'ecran de stats EST l'image 1.
 *
 * Deuxieme correction : le chiffre est donne au chiffre pres (67 791 et non
 * « 60k »). Un nombre rond se lit comme une estimation, donc comme une
 * promesse marketing ; un nombre exact se lit comme un releve. C'est
 * exactement la difference entre « des milliers de vues » et une capture.
 *
 * Troisieme : « zero montage » etait une affirmation. Ici elle devient une
 * soustraction visible — on enumere ce qui n'a PAS ete fait. Enumerer les
 * etapes evitees vaut mieux que revendiquer la facilite, parce que le
 * spectateur reconnait chaque etape et fait lui-meme le calcul du temps gagne.
 *
 * Muet, sous-titres incrustes : le son se pose dans l'app a la publication.
 */
export const DUREE_POST_7 = 272;

/** PLAN A — la preuve d'abord. Rien avant elle. */
const Ecran: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* Le compteur monte jusqu'au chiffre exact : le mouvement attire l'oeil sur
     le nombre, et l'arret sur une valeur non ronde signe le releve. */
  const vues = Math.round(
    interpolate(frame, [4, 1.5 * fps], [0, 67791], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }),
  );

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Video
        src={staticFile("clip-66k.mp4")}
        style={{ width: "100%", height: "100%" }}
        objectFit="cover"
        muted
      />
      <AbsoluteFill style={{ backgroundColor: "rgba(4,10,7,0.72)" }} />

      <AbsoluteFill
        style={{ flexDirection: "column", justifyContent: "center", alignItems: "center" }}
      >
        <div
          style={{
            fontSize: 38,
            fontWeight: 700,
            color: COULEURS.texteDoux,
            letterSpacing: "0.16em",
            marginBottom: 18,
          }}
        >
          VUES
        </div>
        <div
          style={{
            fontSize: 176,
            fontWeight: 900,
            color: COULEURS.texte,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {vues.toLocaleString("fr-FR").replace(/ /g, " ")}
        </div>
        <div
          style={{
            marginTop: 26,
            fontSize: 52,
            fontWeight: 800,
            color: COULEURS.vert,
          }}
        >
          zéro montage
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** PLAN B — ce qui n'a PAS ete fait. La soustraction, pas la promesse. */
const Soustraction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lignes = ["Pas de découpe", "Pas de recadrage", "Pas de sous-titres", "Pas de rendu"];

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Fond intensite={0.5} />
      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          paddingLeft: 110,
          paddingRight: 96,
          paddingBottom: 340,
        }}
      >
        {lignes.map((l, i) => {
          const debut = i * 0.28 * fps;
          const paraitre = interpolate(frame, [debut, debut + 0.3 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          });
          /* Le trait se tire APRES l'apparition : on lit la ligne, puis on la
             voit barree. Barrer d'emblee empecherait de la lire. */
          const barre = interpolate(
            frame,
            [debut + 0.34 * fps, debut + 0.62 * fps],
            [0, 100],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );

          return (
            <div
              key={l}
              style={{
                position: "relative",
                fontSize: 68,
                fontWeight: 800,
                color: COULEURS.texteDoux,
                marginBottom: 30,
                opacity: paraitre,
              }}
            >
              {l}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: "52%",
                  width: `${barre}%`,
                  height: 7,
                  borderRadius: 4,
                  background: COULEURS.vert,
                }}
              />
            </div>
          );
        })}
      </AbsoluteFill>

      <SousTitreBrule
        texte="Juste l'URL collée"
        debut={52}
        cadence={3}
        hauteur={62}
        taille={76}
        accent={["l'URL"]}
      />
    </AbsoluteFill>
  );
};

/** PLAN C — ce que ca donne : plusieurs clips, tous prets. */
const Sortie: React.FC = () => {
  const frame = useCurrentFrame();
  const clips = ["showcase-3.mp4", "showcase-6.mp4", "showcase-1.mp4", "showcase-4.mp4"];

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
        texte="Sortis de la même vidéo"
        debut={6}
        cadence={3}
        hauteur={57}
        taille={74}
        accent={["même"]}
      />
    </AbsoluteFill>
  );
};

export const Post7Preuve: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COULEURS.fond, fontFamily: POLICE }}>
    <Series>
      <Series.Sequence durationInFrames={74} name="A · 67 791 vues">
        <Punch force={1.04} flash={0}>
          <Ecran />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={80} name="B · Ce qui n'a pas été fait">
        <Punch force={1.08} flash={0.1}>
          <Soustraction />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={58} name="C · La sortie">
        <Punch force={1.08} flash={0.1}>
          <Sortie />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={60} name="D · Carton">
        <CartonFinal />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
