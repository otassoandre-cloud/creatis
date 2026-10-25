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
 * POST 6 — « 2 h 04 de podcast. 12 secondes utiles. »
 *
 * ── Pourquoi ce post, d'apres les chiffres reels d'Instagram ──────────────
 * Le classement des 6 derniers Reels est sans ambiguite :
 *   1 221  « 3 clips que l'IA a trouves dans MA video » (+ « le 2e a fait 66 000 vues »)
 *     600  « 60k vue zero montage » (capture analytics)
 *     463  « Cette video a fait 66 000 vues »
 *     403  « L'erreur que font 9 createurs sur 10 »
 *     293  « APRES » (avant/apres produit)
 *     263  interface « 10 clips prets a publier »
 * Soit un facteur 4,6 entre la premiere et la derniere. Les deux dernieres sont
 * les seules ou le SUJET est l'interface ; les trois premieres portent toutes un
 * resultat chiffre verifiable.
 *
 * Ce post pousse l'archetype gagnant d'un cran. La video a 1 221 vues opposait
 * deja deux nombres (3 clips / 66 000 vues) ; ici on oppose deux UNITES qui ne
 * se comparent pas — deux heures contre douze secondes. Le rapport est absurde
 * a l'oeil (1/600e), donc lisible sans calcul, et il dit la promesse produit
 * sans montrer le produit.
 *
 * Difference avec Post1Vues, qui partait du meme clip : Post1 ouvre sur le
 * RESULTAT (66 000 vues) et explique ensuite d'ou il vient. Ici on ouvre sur le
 * GACHIS (2 h 04 pour rien), et le resultat n'arrive qu'au plan C, en paiement.
 * Le premier est une preuve, le second une tension — deux entrees differentes
 * sur le meme materiau, ce qui evite de recycler le meme post.
 *
 * Muet, comme les cinq precedents : le son se pose dans l'app a la publication.
 */
export const DUREE_POST_6 = 280;

/** PLAN A — le gachis, pose en un seul rapport de nombres. */
const Gachis: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* La barre se vide de gauche a droite : on VOIT les deux heures passer, ce
     qu'un simple « 2 h 04 » ecrit ne fait pas ressentir. */
  const avance = interpolate(frame, [8, 1.7 * fps], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Video
        src={staticFile("clip-66k.mp4")}
        style={{ width: "100%", height: "100%" }}
        objectFit="cover"
        muted
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(4,10,7,0.94) 0%, rgba(4,10,7,0.82) 16%, rgba(4,10,7,0.25) 32%, rgba(4,10,7,0) 46%)",
        }}
      />

      <HookFixe ligne1="2 h 04 de podcast" ligne2="12 secondes utiles" taille={118} />

      {/* La barre vit en bas, loin du hook : deux informations, deux zones. */}
      <AbsoluteFill
        style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 300 }}
      >
        <div style={{ width: 760, height: 14, borderRadius: 8, background: "rgba(255,255,255,0.16)" }}>
          <div
            style={{
              width: `${avance}%`,
              height: "100%",
              borderRadius: 8,
              background: COULEURS.vert,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** PLAN B — ou sont ces 12 secondes dans les deux heures. */
const Aiguille: React.FC = () => {
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
          02:04:11
        </div>

        <FriseVideo segments={[{ x: 46.5, largeur: 1.6 }]} />

        <div
          style={{
            marginTop: 34,
            fontSize: 40,
            fontWeight: 700,
            color: COULEURS.vert,
            opacity: interpolate(frame, [0.6 * fps, 1 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          ↑ ici
        </div>
      </AbsoluteFill>

      <SousTitreBrule
        texte="Tu ne peux pas les trouver à l'œil"
        debut={4}
        cadence={3}
        hauteur={62}
        taille={72}
        accent={["à l'œil"]}
      />
    </AbsoluteFill>
  );
};

/** PLAN C — le paiement : ce que ces 12 secondes ont fait. */
const Paiement: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
    <Video
      src={staticFile("clip-66k.mp4")}
      style={{ width: "100%", height: "100%" }}
      objectFit="cover"
      muted
    />
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(to bottom, rgba(4,10,7,0.9) 0%, rgba(4,10,7,0.35) 26%, rgba(4,10,7,0) 42%, rgba(4,10,7,0.9) 74%, rgba(4,10,7,0.95) 100%)",
      }}
    />
    <HookFixe ligne1="66 000 vues" hauteur={9} taille={132} />
    <SousTitreBrule
      texte="Les mêmes 12 secondes"
      debut={5}
      cadence={3}
      hauteur={60}
      taille={74}
      accent={["mêmes"]}
    />
  </AbsoluteFill>
);

export const Post6Ratio: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COULEURS.fond, fontFamily: POLICE }}>
    <Series>
      {/* Aucun flash sur l'accroche : l'image 1 doit etre lisible, pas clignotante. */}
      <Series.Sequence durationInFrames={72} name="A · 2 h 04 / 12 s">
        <Punch force={1.04} flash={0}>
          <Gachis />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={78} name="B · Où sont-elles">
        <Punch force={1.08} flash={0.1}>
          <Aiguille />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={70} name="C · 66 000 vues">
        <Punch force={1.08} flash={0.1}>
          <Paiement />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={60} name="D · Carton">
        <CartonFinal />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
