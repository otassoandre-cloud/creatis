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
 * POST 14 — « 23 clips, 2 trailers, zéro montage ».
 *
 * ── LE PARI ───────────────────────────────────────────────────────────────
 * Les douze premiers posts DECRIVENT un resultat (« 3 clips », « 0 montage »,
 * « 66 000 vues »). Celui-ci ne decrit rien : il DEVERSE. Vingt-trois clips
 * defilent a huit images chacun, avec un compteur qui monte. A cette cadence
 * l'oeil ne lit plus les clips un par un, il percoit un debit — et c'est le
 * debit, pas la qualite d'un clip isole, qui produit la reaction « c'est quoi
 * ce truc ».
 *
 * C'est le seul registre que le compte n'a jamais essaye. Le format liste
 * (posts 4, 9, 10, 11, 12) annonce trois elements et tient sa promesse ; ici
 * la promesse est un nombre qu'on ne peut pas atteindre a la main, et la video
 * passe ses six secondes centrales a le prouver.
 *
 * ── TOUT EST VERIFIABLE ───────────────────────────────────────────────────
 * Les 23 fichiers existent (`public/s01.mp4` a `s23.mp4`), ils sont en
 * 1080x1920 natif, et ils sortent des DEUX trailers officiels de GTA VI :
 * QdBZY2fkU-0 (295 M de vues) et VQRLujxTm3c (182 M). Le nombre affiche est
 * donc le compte exact de ce que le produit a sorti, pas un ordre de grandeur.
 *
 * ── LUMINANCE MESUREE, PAS ESTIMEE ────────────────────────────────────────
 * Les 23 plans ont ete mesures un par un (moyenne du plan et moyenne de sa
 * premiere seconde) : ils vont de 56 a 158, soit un rapport de 1 a 2,8. Sans
 * relevement individuel, le defile alternerait des plans eclatants et des plans
 * quasi noirs — l'effet de debit se casserait sur chaque trou. Le facteur est
 * calcule par plan et plafonne a 1,9.
 *
 * Cas particulier mesure : `s10` ouvre a 2/255 (carton « Rockstar Games
 * presents » sur fond noir). Un relevement ne sauve pas une image vide, donc il
 * est le seul a demarrer plus loin dans le fichier — c'est ce que fait
 * `DEPART`.
 *
 * Muette : le son tendance se pose dans l'app a la publication. Les 23 clips
 * portent 23 fragments de bande-son differents, les enchainer donnerait un
 * hachis sonore.
 */
export const DUREE_POST_14 = 360;

const FOND_CLAIR = "#16211a";

/** [fichier, luminance moyenne, luminance de la premiere seconde] — mesure le
    08/09/2026 sur les 23 fichiers, echantillonnage a 5 images/s. */
const PLANS: [string, number, number][] = [
  ["s02.mp4", 158, 168],
  ["s04.mp4", 149, 157],
  ["s14.mp4", 139, 122],
  ["s06.mp4", 136, 145],
  ["s12.mp4", 132, 129],
  ["s11.mp4", 128, 128],
  ["s18.mp4", 128, 100],
  ["s13.mp4", 124, 135],
  ["s01.mp4", 123, 100],
  ["s15.mp4", 114, 114],
  ["s05.mp4", 108, 107],
  ["s17.mp4", 102, 102],
  ["s23.mp4", 98, 102],
  ["s08.mp4", 91, 89],
  ["s21.mp4", 89, 88],
  ["s20.mp4", 88, 87],
  ["s03.mp4", 84, 88],
  ["s22.mp4", 83, 85],
  ["s09.mp4", 76, 67],
  ["s19.mp4", 67, 72],
  ["s07.mp4", 63, 67],
  ["s16.mp4", 58, 49],
  ["s10.mp4", 56, 2],
];

/** Le plan le plus lumineux ouvre et ferme le defile : c'est l'image qui decide
    de la retention, et celle sur laquelle on veut finir. */
const RELEVE = (moy: number, debut: number) =>
  `brightness(${Math.min(1.9, 118 / ((moy + debut) / 2)).toFixed(2)}) saturate(1.08)`;

/** s10 ouvre sur un carton noir : on entre dans le fichier apres. */
const DEPART: Record<string, number> = { "s10.mp4": 20 };

const PAR_PLAN = 8; // 0,27 s

/** PLAN A — la promesse, chiffree, sur l'image la plus forte du lot. */
const Annonce: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: FOND_CLAIR }}>
    <Video
      src={staticFile("s02.mp4")}
      style={{ width: "100%", height: "100%", filter: RELEVE(158, 168) }}
      objectFit="cover"
      muted
      loop
    />
    <AbsoluteFill style={{ backgroundColor: "rgba(4,10,7,0.42)" }} />

    <AbsoluteFill
      style={{
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: 70,
        paddingRight: 70,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 240,
          fontWeight: 900,
          color: "#ffffff",
          lineHeight: 0.9,
          letterSpacing: "-0.05em",
          fontVariantNumeric: "tabular-nums",
          WebkitTextStroke: "12px rgba(0,0,0,0.92)",
          paintOrder: "stroke fill",
          textShadow: "0 8px 40px rgba(0,0,0,0.85)",
        }}
      >
        23
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 82,
          fontWeight: 900,
          color: COULEURS.vertClair,
          letterSpacing: "-0.03em",
          WebkitTextStroke: "10px rgba(0,0,0,0.9)",
          paintOrder: "stroke fill",
        }}
      >
        clips
      </div>
      <div
        style={{
          marginTop: 26,
          fontSize: 54,
          fontWeight: 800,
          color: "#ffffff",
          WebkitTextStroke: "9px rgba(0,0,0,0.9)",
          paintOrder: "stroke fill",
        }}
      >
        sorties de 2 trailers GTA 6
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);

/** PLAN B — le deversement. C'est ici que se joue toute la video. */
const Defile: React.FC = () => {
  const frame = useCurrentFrame();
  const index = Math.min(PLANS.length - 1, Math.floor(frame / PAR_PLAN));
  const [fichier, moy, debut] = PLANS[index];

  return (
    <AbsoluteFill style={{ backgroundColor: FOND_CLAIR }}>
      {/* Une seule balise video montee a la fois : empiler 23 lecteurs epuiserait
          les decodeurs, exactement le probleme rencontre sur les miniatures du
          produit (1 <video> par clip sur iOS). */}
      <Video
        key={fichier}
        src={staticFile(fichier)}
        style={{ width: "100%", height: "100%", filter: RELEVE(moy, debut) }}
        objectFit="cover"
        trimBefore={DEPART[fichier] ?? 0}
        muted
      />

      {/* Le compteur est la mecanique de retention du plan : il dit combien il
          en reste, donc il rouvre la boucle a chaque clip au lieu de la fermer. */}
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <div
          style={{
            fontSize: 130,
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
          <span style={{ fontSize: 62, color: COULEURS.vertClair }}> / 23</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** PLAN C — le paiement. Trois faits, aucune promesse. */
const Bilan: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lignes: [string, string][] = [
    ["2", "trailers collés"],
    ["23", "clips sortis"],
    ["0", "montage"],
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: FOND_CLAIR }}>
      <Video
        src={staticFile("s04.mp4")}
        style={{ width: "100%", height: "100%", filter: RELEVE(149, 157) }}
        objectFit="cover"
        muted
        loop
      />
      <AbsoluteFill style={{ backgroundColor: "rgba(4,10,7,0.56)" }} />

      <AbsoluteFill
        style={{ flexDirection: "column", justifyContent: "center", alignItems: "center" }}
      >
        {lignes.map(([v, l], i) => (
          <div
            key={l}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 24,
              marginBottom: 22,
              opacity: interpolate(frame, [i * 0.22 * fps, i * 0.22 * fps + 0.25 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
            }}
          >
            <div
              style={{
                fontSize: 104,
                fontWeight: 900,
                color: i === 2 ? COULEURS.vertClair : "#ffffff",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.04em",
                minWidth: 150,
                textAlign: "right",
              }}
            >
              {v}
            </div>
            <div style={{ fontSize: 50, fontWeight: 700, color: "#ffffff" }}>{l}</div>
          </div>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Post14VingtTrois: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: FOND_CLAIR, fontFamily: POLICE }}>
    <Series>
      <Series.Sequence durationInFrames={66} name="A · 23 clips">
        <Punch force={1.04} flash={0}>
          <Annonce />
        </Punch>
      </Series.Sequence>

      {/* 23 x 8 images = 184. Le Punch est pose ICI, une seule fois : chaque clip
          est deja une coupe, y ajouter un zoom par clip donnerait un tremblement. */}
      <Series.Sequence durationInFrames={PAR_PLAN * PLANS.length} name="B · Le défilé">
        <Punch force={1.08} flash={0.1}>
          <Defile />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={50} name="C · Bilan">
        <Punch force={1.08} flash={0.1}>
          <Bilan />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={60} name="D · Carton">
        <CartonFinal clair mention="14 €/mois · sans engagement" />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
