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

/**
 * POST 16 — « 2 vidéos collées. 23 clips sortis. »
 *
 * ── ÉCRIT CONTRE UNE MESURE PRÉCISE ───────────────────────────────────────
 * Le post TikTok du 11/09 (21,6 s, un extrait brut de vidéo automobile) :
 *
 *     758 vues · 7,4 s de moyenne · 34 % de la vidéo · 1,81 % de complétion
 *     décrochage massif à 0:02 · 0 abonné · 0 commentaire · 0 partage
 *
 * Deux enseignements, et ce post est construit sur les deux.
 *
 * 1. **Le décrochage est à 0:02, soit 9 % de la vidéo.** Les gens partent avant
 *    qu'elle ait dit quoi que ce soit. L'extrait s'ouvrait sur un sous-titre en
 *    plein milieu d'une phrase (« c'est une chose. Niveau ») : rien, à l'image 1,
 *    n'annonçait ce qu'on allait voir.
 *    Conséquence ici : **la transformation est visible DÈS L'IMAGE 0.** La source
 *    16:9 et les clips verticaux qui en sortent sont dans le même cadre, en même
 *    temps. Il n'y a rien à attendre — le sujet du post est déjà entièrement à
 *    l'écran avant la première seconde.
 *    Conséquence n°2 : la coupe tombe **à 1,8 s**, juste avant la seconde où
 *    tout le monde partait. Qui reste voit l'image changer au moment exact où il
 *    allait glisser.
 *
 * 2. **0 abonné et 0 commentaire sur 758 vues.** Ce n'est pas un problème de
 *    portée, c'est un problème de destinataire : un extrait de vidéo automobile
 *    attire des passionnés d'automobile, pas des gens qui cherchent un outil de
 *    montage. Ils ont regardé, ils n'avaient aucune raison d'agir.
 *    Conséquence : le sujet n'est plus le contenu du clip, c'est **le rapport
 *    entre une source et ce qu'on en tire**. Celui que ça intéresse se reconnaît
 *    tout de suite ; les autres ne sont pas la cible et c'est très bien.
 *
 * ── DURÉE ─────────────────────────────────────────────────────────────────
 * 10,7 s contre 21,6 s. Sur la vidéo mesurée, 14 personnes sur 758 sont allées
 * au bout. Viser une durée que la moyenne réelle (7,4 s) peut couvrir change la
 * complétion beaucoup plus sûrement que n'importe quelle retouche de montage.
 *
 * ── CE QUI EST AFFIRMÉ ────────────────────────────────────────────────────
 * « 2 vidéos, 23 clips » et rien de plus : les 23 fichiers existent, ils sortent
 * des deux trailers officiels de GTA VI, et la source 16:9 montrée au premier
 * plan est le segment que Créatis a lui-même téléchargé (1920x1080 réel).
 *
 * Muette : le son tendance se pose dans l'app à la publication.
 */
export const DUREE_POST_16 = 320;

const FOND_CLAIR = "#16211a";
const SOURCE_169 = "trailer-16-9.mp4";
/** 29,8 s x 30 — le plan continu et lumineux repéré pour le post 15. */
const DEPART_169 = 894;

/** [fichier, luminance moyenne, luminance de la première seconde] — mesuré le 08/09. */
const PLANS: [string, number, number][] = [
  ["s02.mp4", 158, 168], ["s04.mp4", 149, 157], ["s14.mp4", 139, 122],
  ["s06.mp4", 136, 145], ["s12.mp4", 132, 129], ["s11.mp4", 128, 128],
  ["s18.mp4", 128, 100], ["s13.mp4", 124, 135], ["s01.mp4", 123, 100],
  ["s15.mp4", 114, 114], ["s05.mp4", 108, 107], ["s17.mp4", 102, 102],
  ["s23.mp4", 98, 102], ["s08.mp4", 91, 89], ["s21.mp4", 89, 88],
  ["s20.mp4", 88, 87], ["s03.mp4", 84, 88], ["s22.mp4", 83, 85],
  ["s09.mp4", 76, 67], ["s19.mp4", 67, 72], ["s07.mp4", 63, 67],
  ["s16.mp4", 58, 49], ["s10.mp4", 56, 2],
];

const RELEVE = (moy: number, debut: number) =>
  `brightness(${Math.min(1.9, 118 / ((moy + debut) / 2)).toFixed(2)}) saturate(1.08)`;

/** s10 ouvre sur un carton noir : on entre dans le fichier après. */
const DEPART: Record<string, number> = { "s10.mp4": 20 };

const PAR_PLAN = 7; // 0,23 s

/**
 * PLAN A — la source ET ses sorties dans le même cadre, dès l'image 0.
 *
 * C'est tout le pari du post : ne rien faire attendre. Le haut montre d'où ça
 * vient, le bas ce que ça donne, le texte au centre dit le rapport entre les
 * deux. Un spectateur qui ne regarde qu'une seconde a déjà tout compris.
 */
const Transformation: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const hSource = (width * 9) / 16;   // 607
  const sorties = ["s04.mp4", "s14.mp4", "s06.mp4"];
  const lClip = 340, hClip = Math.round((340 * 16) / 9); // 604

  /* Les trois sorties se posent en décalé — mouvement perceptible à l'image 1,
     mais elles sont présentes dès le départ (opacité de base 1, pas 0) : rien
     n'apparaît « après », on n'attend jamais. */
  const glisse = (i: number) =>
    interpolate(frame, [i * 3, i * 3 + 9], [18, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

  return (
    <AbsoluteFill style={{ backgroundColor: FOND_CLAIR }}>
      {/* La source, en haut, étiquetée pour qu'on sache ce qu'on regarde. */}
      <div style={{ position: "absolute", left: 0, top: 96, width, height: hSource, overflow: "hidden" }}>
        <Video
          src={staticFile(SOURCE_169)}
          style={{ width: "100%", height: "100%" }}
          objectFit="cover"
          trimBefore={DEPART_169}
          playbackRate={0.5}
          muted
        />
        <div
          style={{
            position: "absolute", top: 14, left: 16,
            background: "rgba(4,10,7,0.82)", color: "#ffffff",
            fontSize: 30, fontWeight: 800, padding: "8px 18px", borderRadius: 999,
            letterSpacing: "0.04em",
          }}
        >
          LA SOURCE
        </div>
      </div>

      {/* Le rapport, au centre EXACT du cadre — et c'est aussi, par construction,
          le vide laissé entre la source (qui finit à 703) et les sorties (qui
          commencent à 1216). Un premier jet ajoutait un paddingBottom de 700 :
          le bloc remontait sur la vidéo du haut et le vert devenait illisible
          sur le ciel. Aucun décalage ici — le centre est déjà le bon endroit. */}
      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 92,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1.04,
            letterSpacing: "-0.04em",
            WebkitTextStroke: "10px rgba(0,0,0,0.85)",
            paintOrder: "stroke fill",
          }}
        >
          2 vidéos collées
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 92,
            fontWeight: 900,
            color: COULEURS.vertClair,
            lineHeight: 1.04,
            letterSpacing: "-0.04em",
            WebkitTextStroke: "10px rgba(0,0,0,0.85)",
            paintOrder: "stroke fill",
          }}
        >
          23 clips sortis
        </div>
      </AbsoluteFill>

      {/* Les sorties, en bas, déjà là. */}
      <div
        style={{
          position: "absolute", left: (width - (lClip * 3 + 24)) / 2, top: height - hClip - 100,
          display: "flex", gap: 12,
        }}
      >
        {sorties.map((f, i) => {
          const [, moy, deb] = PLANS.find(p => p[0] === f)!;
          return (
            <div
              key={f}
              style={{
                width: lClip, height: hClip, borderRadius: 14, overflow: "hidden",
                transform: `translateY(${glisse(i)}px)`,
                border: `2px solid ${COULEURS.vertClair}`,
              }}
            >
              <Video
                src={staticFile(f)}
                style={{ width: "100%", height: "100%", filter: RELEVE(moy, deb) }}
                objectFit="cover"
                muted
                loop
              />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** PLAN B — le défilé. La coupe tombe à 1,8 s, juste avant la seconde fatale. */
const Defile: React.FC = () => {
  const frame = useCurrentFrame();
  const index = Math.min(PLANS.length - 1, Math.floor(frame / PAR_PLAN));
  const [fichier, moy, debut] = PLANS[index];

  return (
    <AbsoluteFill style={{ backgroundColor: FOND_CLAIR }}>
      {/* Une seule balise vidéo montée à la fois : 23 lecteurs empilés épuisent
          les décodeurs, exactement le problème rencontré sur les miniatures. */}
      <Video
        key={fichier}
        src={staticFile(fichier)}
        style={{ width: "100%", height: "100%", filter: RELEVE(moy, debut) }}
        objectFit="cover"
        trimBefore={DEPART[fichier] ?? 0}
        muted
      />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            fontSize: 128,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.04em",
            WebkitTextStroke: "11px rgba(0,0,0,0.9)",
            paintOrder: "stroke fill",
            textShadow: "0 6px 30px rgba(0,0,0,0.8)",
          }}
        >
          {String(index + 1).padStart(2, "0")}
          <span style={{ fontSize: 60, color: COULEURS.vertClair }}> / 23</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** PLAN C — le coût réel du geste. Trois mots, pas un de plus. */
const Bilan: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: FOND_CLAIR }}>
      <Video
        src={staticFile("s02.mp4")}
        style={{ width: "100%", height: "100%", filter: RELEVE(158, 168) }}
        objectFit="cover"
        muted
        loop
      />
      <AbsoluteFill style={{ backgroundColor: "rgba(4,10,7,0.56)" }} />

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          paddingLeft: 70,
          paddingRight: 70,
        }}
      >
        <div
          style={{
            fontSize: 76,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-0.03em",
            WebkitTextStroke: "10px rgba(0,0,0,0.9)",
            paintOrder: "stroke fill",
          }}
        >
          Deux liens collés.
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 76,
            fontWeight: 900,
            color: COULEURS.vertClair,
            letterSpacing: "-0.03em",
            opacity: interpolate(frame, [0.35 * fps, 0.65 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            WebkitTextStroke: "10px rgba(0,0,0,0.9)",
            paintOrder: "stroke fill",
          }}
        >
          Zéro montage.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Post16Transformation: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: FOND_CLAIR, fontFamily: POLICE }}>
    <Series>
      {/* 54 images = 1,8 s. La coupe tombe donc JUSTE avant 0:02, la seconde où
          la vidéo mesurée perdait la majorité de ses spectateurs. */}
      <Series.Sequence durationInFrames={54} name="A · La transformation">
        <Punch force={1.03} flash={0}>
          <Transformation />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={PAR_PLAN * PLANS.length} name="B · Le défilé">
        <Punch force={1.09} flash={0.12}>
          <Defile />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={45} name="C · Bilan">
        <Punch force={1.08} flash={0.1}>
          <Bilan />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={60} name="D · Carton">
        <CartonFinal clair mention="14 €/mois · 7 jours d'essai" />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
