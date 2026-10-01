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
import { Fond } from "./Fond";
import { POLICE } from "./police";
import { Punch } from "./Punch";
import { SousTitreBrule } from "./SousTitreBrule";
import { COULEURS } from "./theme";
import { CartonFinal } from "./posts/CartonFinal";
import { HookFixe } from "./posts/HookFixe";

/**
 * PUB « TOUT LE MONDE CLIPPE GTA 6 » — 1080x1920, 15 s.
 *
 * Version 2, ecrite apres un premier jet a 400 vues sur Instagram et 200 sur
 * TikTok. Trois corrections, par ordre d'importance :
 *
 * 1. **La video ne prononcait jamais « GTA 6 ».** Elle montrait le jeu mais
 *    parlait d'« un stream de 26 min ». Sur la tendance la plus forte de
 *    l'annee — sortie le 19 novembre 2026 — c'est un signal gaspille : ni
 *    l'algorithme ni le spectateur n'ont de prise. Le nom est desormais dans la
 *    premiere ligne du hook.
 *
 * 2. **L'image 1 etait une boite noire.** La source 16:9 apparaissait en
 *    letterbox, petite, avec une etiquette grise. Elle occupe maintenant tout le
 *    cadre : on reconnait le jeu avant d'avoir lu quoi que ce soit.
 *
 * 3. **Le hook nomme le metier.** Le public reel de Creatis, etabli en lisant la
 *    colonne `niche` : 13 % ecrivent litteralement « clipping » ou « repost »,
 *    17 % « gaming », et 34 inscrits viennent de Whop. « Tout le monde clippe
 *    GTA 6 / toi tu montes encore a la main » enchaine donc la tendance,
 *    l'identite du spectateur et sa douleur en une respiration.
 *
 * Les clips sont sortis du produit le 05/09/2026 depuis la reprise IGN de
 * « GTA VI: An Extended Look » — l'upload officiel de Rockstar est restreint par
 * age et le service, sans cookies, ne peut pas le telecharger.
 */
export const DUREE_PUB_GTA = 450;

const ROUGE = "#f87171";

/* Le fond de charte (#0a0f0a) est un quasi-noir : mesure a l'appui, il tirait la
   video a 14/255 alors que le corpus des Shorts qui marchent est a ~59. On garde
   la teinte verte de la marque, on remonte la valeur. */
const FOND_CLAIR = "#16211a";

/** Le gameplay GTA est nocturne et en interieur : sur un ecran de telephone en
    plein jour il devient illisible. Reprise legere, appliquee au rendu seul. */
const RELEVE = "brightness(1.55) saturate(1.2) contrast(0.94)";

/** Voile clair pose SUR les images sombres : remonte les noirs sans delaver les
    couleurs, ce que `brightness` seul ne sait pas faire. */
const ECLAIRCIE = "rgba(226, 238, 228, 0.13)";

/* ── PLAN 1 — le hook (0 → 2,7 s) ──────────────────────────────────────────
   Plein cadre, pas de letterbox : le jeu doit etre reconnaissable a l'image 1,
   c'est la seule que 100 % de l'audience verra. */
const Hook: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: FOND_CLAIR }}>
    <Video
      src={staticFile("gta-3.mp4")}
      style={{ width: "100%", height: "100%", filter: RELEVE }}
      objectFit="cover"
      loop
      trimBefore={600}
    />
    <AbsoluteFill style={{ backgroundColor: ECLAIRCIE }} />
    {/* Voile centre : il pose le texte sans effacer le jeu. */}
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(to bottom, rgba(4,10,7,0.3) 0%, rgba(4,10,7,0.05) 24%, rgba(4,10,7,0.5) 42%, rgba(4,10,7,0.5) 58%, rgba(4,10,7,0.05) 76%, rgba(4,10,7,0.3) 100%)",
      }}
    />
    <HookFixe
      ligne1="Tout le monde clippe GTA 6"
      ligne2="toi, tu montes encore à la main"
      centre
      hauteur={7}
      taille={94}
      tailleLigne2={48}
      couleurLigne2={ROUGE}
    />
  </AbsoluteFill>
);

/* ── PLAN 2 — l'outil, en une image (2,7 → 7,5 s) ──────────────────────────
   La source 16:9 recule en haut, trois verticales tombent dessous. Entree et
   sortie simultanees : c'est le seul plan qui explique le produit, et il n'a
   besoin d'aucun mot pour le faire. */
const Transformation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sorties = ["gta-1.mp4", "gta-2.mp4", "gta-3.mp4"];

  const recul = interpolate(frame, [8, 32], [1, 0.72], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: FOND_CLAIR }}>
      <Fond intensite={0.5} />
      {/* Entree en haut, sortie en bas, texte au centre : la bande centrale est
          reservee au message pour qu'il tombe au meme endroit que sur les autres
          plans. La disposition dit d'elle-meme le sens de la transformation. */}
      <AbsoluteFill
        style={{
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 150,
          paddingLeft: 70,
          paddingRight: 70,
          gap: 16,
        }}
      >
        <div style={{ width: "100%", scale: recul, transformOrigin: "top center" }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "16 / 9",
              borderRadius: 14,
              overflow: "hidden",
              border: `1px solid ${COULEURS.ligne}`,
              backgroundColor: "#000",
            }}
          >
            <Video
              src={staticFile("source-16-9.mp4")}
              style={{ width: "100%", height: "100%", filter: RELEVE }}
              objectFit="cover"
              loop
            />
            <div
              style={{
                position: "absolute",
                right: 12,
                bottom: 10,
                fontSize: 26,
                fontWeight: 700,
                color: "#fff",
                backgroundColor: "rgba(4,10,7,0.75)",
                padding: "4px 12px",
                borderRadius: 6,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              26:49
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
            width: "100%",
            marginTop: 470,
          }}
        >
          {sorties.map((f, i) => {
            const t = 36 + i * 9;
            return (
              <div
                key={f}
                style={{
                  aspectRatio: "9 / 16",
                  borderRadius: 12,
                  overflow: "hidden",
                  border: `2px solid ${COULEURS.vert}`,
                  boxShadow: "0 0 30px rgba(16,185,129,0.35)",
                  opacity: interpolate(frame, [t, t + 8], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  translate: interpolate(frame, [t, t + 12], ["0px -26px", "0px 0px"], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                  }),
                }}
              >
                <Video
                  src={staticFile(f)}
                  style={{ width: "100%", height: "100%", filter: RELEVE }}
                  objectFit="cover"
                  muted
                  loop
                  trimBefore={i * 150}
                />
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 18,
            fontSize: 44,
            fontWeight: 800,
            color: COULEURS.vert,
            letterSpacing: "-0.02em",
            opacity: interpolate(frame, [2 * fps, 2.3 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          26 min → 10 clips verticaux
        </div>
      </AbsoluteFill>

      <SousTitreBrule
        texte="Tu colles le lien, c'est tout"
        debut={58}
        cadence={3}
        centre
        taille={64}
        accent={["c'est", "tout"]}
      />
    </AbsoluteFill>
  );
};

/* ── PLAN 3 — le volume (7,5 → 10,5 s) ─────────────────────────────────────
   Huit vignettes d'un coup. Le clippeur est paye au volume : c'est cette image
   qui parle a son metier, pas une promesse de qualite. */
const Volume: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  /* Les memes trois clips, pris a des instants differents : huit vignettes
     visuellement distinctes, toutes issues de la meme video source — ce qui est
     exactement ce qu'on affirme. */
  const tuiles = [
    { f: "gta-1.mp4", t: 0 },
    { f: "gta-2.mp4", t: 100 },
    { f: "gta-3.mp4", t: 600 },
    { f: "gta-1.mp4", t: 400 },
    { f: "gta-2.mp4", t: 500 },
    { f: "gta-3.mp4", t: 200 },
    { f: "gta-1.mp4", t: 800 },
    { f: "gta-2.mp4", t: 750 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: FOND_CLAIR }}>
      <AbsoluteFill
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gridTemplateRows: "repeat(2, 1fr)",
          gap: 8,
          padding: 8,
          alignContent: "center",
        }}
      >
        {tuiles.map((v, i) => (
          <div
            key={`${v.f}-${v.t}`}
            style={{
              overflow: "hidden",
              borderRadius: 10,
              opacity: interpolate(frame, [i * 3, i * 3 + 7], [0, 1], {
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
              src={staticFile(v.f)}
              style={{ width: "100%", height: "100%", filter: RELEVE }}
              objectFit="cover"
              /* Une seule tuile porte le son : huit pistes simultanees ne
                 donnent qu'une bouillie. */
              muted={i !== 0}
              loop
              trimBefore={v.t}
            />
          </div>
        ))}
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(4,10,7,0.34) 0%, rgba(4,10,7,0.04) 24%, rgba(4,10,7,0.6) 42%, rgba(4,10,7,0.6) 58%, rgba(4,10,7,0.04) 74%, rgba(4,10,7,0.55) 100%)",
        }}
      />

      <SousTitreBrule
        texte="10 clips d'une seule vidéo"
        debut={10}
        cadence={3}
        centre
        taille={72}
        accent={["10", "clips"]}
      />

      <AbsoluteFill
        style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 190 }}
      >
        <div
          style={{
            fontSize: 38,
            fontWeight: 700,
            color: COULEURS.texteDoux,
            opacity: interpolate(frame, [1.7 * fps, 2 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          de quoi poster toute la semaine
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ── PLAN 4 — le calcul (10,5 → 13,2 s) ────────────────────────────────────
   Le seul chiffre qui compte pour quelqu'un paye au volume : le temps que ca
   lui prend. Barre le montant qu'il connait, montre celui qu'il ignore. */
const Calcul: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: FOND_CLAIR }}>
      <Fond intensite={1} />
      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 120,
          gap: 10,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: ROUGE,
            textDecoration: "line-through",
            textDecorationThickness: 5,
            opacity: interpolate(frame, [0, 8], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          3 h à découper à la main
        </div>
        <div
          style={{
            fontSize: 120,
            fontWeight: 800,
            color: COULEURS.vert,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            fontVariantNumeric: "tabular-nums",
            textShadow: "0 0 90px rgba(16,185,129,0.45)",
            opacity: interpolate(frame, [12, 22], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            scale: interpolate(frame, [12, 30], [0.82, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 12 }),
              output: "perceptual-scale",
            }),
          }}
        >
          58 secondes
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const PubGta: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: FOND_CLAIR, fontFamily: POLICE }}>
    <Series>
      {/* Aucun flash sur l'accroche : rien ne doit retarder la reconnaissance
          du jeu, c'est elle qui retient le pouce. */}
      <Series.Sequence durationInFrames={80} name="1 · Tout le monde clippe GTA 6">
        <Punch force={1.04} flash={0}>
          <Hook />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={145} name="2 · 16:9 → 3 verticales">
        <Punch force={1.08} flash={0.1}>
          <Transformation />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={90} name="3 · Le volume">
        <Punch force={1.12} flash={0.14}>
          <Volume />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={80} name="4 · 3 h → 58 s">
        <Punch force={1.1} flash={0.12}>
          <Calcul />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={55} name="5 · Créatis">
        <Punch>
          <CartonFinal mention="7 jours d’essai gratuit sur l’annuel" />
        </Punch>
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
