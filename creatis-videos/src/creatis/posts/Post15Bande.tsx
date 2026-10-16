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
 * POST 15 — « Tu jettes 68 % de ton image ».
 *
 * ── LE REGISTRE QUI MANQUAIT ──────────────────────────────────────────────
 * Les quatorze posts precedents AFFIRMENT un resultat. Aucun ne montre le
 * mecanisme. Celui-ci ne dit rien du produit avant la derniere seconde : il
 * fait une demonstration de geometrie que le spectateur peut refaire de tete.
 *
 * ── L'ARITHMETIQUE, ET LA CORRECTION D'UNE ERREUR ─────────────────────────
 * Une note de projet affirmait « le crop 9:16 ne garde que 56 % de la largeur ».
 * C'est faux, et le tableau de la meme note le contredisait deja :
 *
 *     1920 x 1080, bande 9:16 a pleine hauteur = 1080 x 9/16 = 607,5 px
 *     607,5 / 1920 = 31,6 % de la largeur gardee, donc 68,4 % jetee
 *
 * Les « 56 % » etaient 1080/1920, soit le rapport hauteur/largeur — la bonne
 * division sur les mauvaises grandeurs. Le chiffre juste est bien plus parlant :
 * passer en vertical fait disparaitre plus des DEUX TIERS de l'image.
 *
 * D'ou l'accroche. Elle ne promet rien, elle enonce une soustraction que le
 * spectateur constate a l'ecran en meme temps qu'il la lit.
 *
 * ── LE PLAN, ET POURQUOI CELUI-LA ─────────────────────────────────────────
 * Source : segment 16:9 sorti par Creatis lui-meme du trailer officiel GTA VI
 * (QdBZY2fkU-0), telecharge le 08/09/2026 via `/raw-segment` — donc 1920x1080
 * reel, pas un upscale.
 *
 * Le plan retenu court de 29,8 s a 32,0 s dans ce fichier : 2,2 s SANS COUPE
 * (verifie image par image, delta inter-images sous le seuil sur toute la
 * fenetre) et 148 de luminance moyenne, tres au-dessus de la mediane du corpus
 * (118) — donc aucun relevement, contrairement a tous les autres plans du lot.
 *
 * Il est surtout le seul a reunir les trois conditions de la demonstration :
 * un sujet humain, une profondeur de champ laterale (la skyline, la piscine,
 * les autres personnages) et assez de largeur pour que la perte se VOIE. Sur un
 * gros plan, jeter 68 % ne se remarque pas ; ici, tout Vice City disparait.
 *
 * Le plan ne dure que 2,2 s alors que la demonstration en demande 6 : il est
 * donc lu a 0,35x. C'est un choix, pas un pis-aller — au ralenti, l'oeil suit
 * la bande pendant qu'elle se deplace au lieu de decouvrir un resultat.
 *
 * Muette : le son tendance se pose dans l'app a la publication.
 */
export const DUREE_POST_15 = 240;

const FOND_CLAIR = "#16211a";
const ROUGE = "#f87171";

const SOURCE = "trailer-16-9.mp4";
/** 29,8 s x 30 images/s — debut du plan continu. */
const DEPART = 894;
/** 2,2 s de source pour 6 s de demonstration. */
const RALENTI = 0.35;

/** Largeur de la bande 9:16 dans un cadre 16:9, en fraction de la largeur. */
const PART_GARDEE = (9 / 16) / (16 / 9); // 0,3164
/** Position horizontale du sujet dans le plan, relevee sur les images
    extraites a 29,8 s et 30,9 s : il derive legerement vers la droite. */
const SUJET = 0.52;

/* Le cadre de demonstration ne peut plus etre centre : le texte l'est, et il le
   recouvrirait entierement. Il descend dans le tiers bas — hauteur 607 px, donc
   de 1215 a 1822 — ce qui laisse tout le haut au bloc de texte centre. La
   demonstration reste entiere et le texte occupe la meme position que dans les
   deux autres videos. */
const HAUT_CADRE = 1215;

/** La source, calee en 16:9 pleine largeur au centre du cadre vertical.
 *
 * Le premier rendu laissait deux bandes de fond vert de 650 px au-dessus et
 * en dessous du cadre — un tiers de l'ecran mort, et une luminance moyenne
 * tiree vers le bas alors que c'est justement la mesure qu'on soigne partout
 * ailleurs. On remplit avec la MEME image, agrandie et floutee : le vide
 * disparait, la valeur remonte, et rien d'etranger n'entre dans le cadre. */
const CadreSource: React.FC<{ enfant?: React.ReactNode }> = ({ enfant }) => {
  const { width } = useVideoConfig();
  const h = (width * 9) / 16;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Video
          src={staticFile(SOURCE)}
          style={{
            width: "100%",
            height: "100%",
            filter: "blur(46px) brightness(0.62) saturate(1.1)",
            transform: "scale(1.35)",
          }}
          objectFit="cover"
          trimBefore={DEPART}
          playbackRate={RALENTI}
          muted
        />
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: HAUT_CADRE,
          width,
          height: h,
          overflow: "hidden",
        }}
      >
        <Video
          src={staticFile(SOURCE)}
          style={{ width: "100%", height: "100%" }}
          objectFit="cover"
          trimBefore={DEPART}
          playbackRate={RALENTI}
          muted
        />
        {enfant}
      </div>
    </AbsoluteFill>
  );
};

/** PLAN A — la soustraction. Ce qui sort de la bande s'eteint. */
const Perte: React.FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  const largeurBande = width * PART_GARDEE;
  const gauche = width * SUJET - largeurBande / 2;

  /* Les deux flancs s'assombrissent en 12 images : assez lent pour qu'on voie
     ce qu'on perd, assez vif pour que ce soit fait avant la fin du hook. */
  const voile = interpolate(frame, [8, 20], [0, 0.82], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: FOND_CLAIR }}>
      <CadreSource
        enfant={
          <>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: gauche,
                height: "100%",
                background: `rgba(10,4,4,${voile})`,
                borderRight: `4px solid ${ROUGE}`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: gauche + largeurBande,
                top: 0,
                right: 0,
                height: "100%",
                background: `rgba(10,4,4,${voile})`,
                borderLeft: `4px solid ${ROUGE}`,
              }}
            />
          </>
        }
      />

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 620,
          paddingLeft: 70,
          paddingRight: 70,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 76,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1.06,
            letterSpacing: "-0.03em",
            WebkitTextStroke: "10px rgba(0,0,0,0.92)",
            paintOrder: "stroke fill",
          }}
        >
          Pour faire un short, tu jettes
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 158,
            fontWeight: 900,
            color: ROUGE,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            fontVariantNumeric: "tabular-nums",
            WebkitTextStroke: "12px rgba(0,0,0,0.92)",
            paintOrder: "stroke fill",
            textShadow: "0 8px 36px rgba(0,0,0,0.85)",
          }}
        >
          68 %
        </div>
        <div
          style={{
            fontSize: 62,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-0.02em",
            WebkitTextStroke: "10px rgba(0,0,0,0.92)",
            paintOrder: "stroke fill",
          }}
        >
          de ton image
        </div>
      </AbsoluteFill>

      {/* Le calcul, en bas : c'est ce qui transforme l'accroche en fait
          verifiable au lieu d'un chiffre assene. Trois nombres, une division
          que le spectateur peut refaire. */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 240,
        }}
      >
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: "#ffffff",
            opacity: interpolate(frame, [26, 40], [0, 0.92], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            background: "rgba(6,10,8,0.62)",
            padding: "16px 30px",
            borderRadius: 999,
            letterSpacing: "-0.01em",
          }}
        >
          1080 × 9/16 = 607 px sur 1920
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** PLAN B — la bande balaye. Le propos : sa POSITION est tout le travail. */
const Balayage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const largeurBande = width * PART_GARDEE;
  const libre = width - largeurBande;

  /* Aller-retour amorti qui se pose sur le sujet : on montre d'abord que la
     bande POURRAIT etre n'importe ou, puis ou elle doit etre. Un simple
     glissement vers la cible ne dirait pas qu'il y avait un choix a faire. */
  const t = frame / fps;
  const parcours = interpolate(
    t,
    [0, 0.55, 1.1, 1.7],
    [0.5, 0.06, 0.94, SUJET - PART_GARDEE / 2],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    },
  );
  const x = Math.max(0, Math.min(libre, parcours * width));

  const h = (width * 9) / 16;
  /* Meme reperage que CadreSource : le voile et le rectangle vert doivent se
     poser exactement sur le cadre, pas sur son ancienne position centree. */
  const hautCadre = HAUT_CADRE;

  return (
    <AbsoluteFill style={{ backgroundColor: FOND_CLAIR }}>
      <CadreSource />

      {/* Voile general + fenetre claire : la bande ne dessine pas un rectangle
          par-dessus l'image, elle DECOUPE dedans. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: hautCadre,
          width,
          height: h,
          background: "rgba(6,10,8,0.72)",
          maskImage: `linear-gradient(to right, #000 ${x}px, transparent ${x}px, transparent ${x + largeurBande}px, #000 ${x + largeurBande}px)`,
          WebkitMaskImage: `linear-gradient(to right, #000 ${x}px, transparent ${x}px, transparent ${x + largeurBande}px, #000 ${x + largeurBande}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x,
          top: hautCadre,
          width: largeurBande,
          height: h,
          border: `5px solid ${COULEURS.vertClair}`,
          borderRadius: 6,
          boxShadow: "0 0 44px rgba(16,185,129,0.55)",
        }}
      />

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 620,
          paddingLeft: 70,
          paddingRight: 70,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 70,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
            WebkitTextStroke: "10px rgba(0,0,0,0.92)",
            paintOrder: "stroke fill",
          }}
        >
          Il reste une bande
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 70,
            fontWeight: 900,
            color: COULEURS.vertClair,
            letterSpacing: "-0.03em",
            WebkitTextStroke: "10px rgba(0,0,0,0.92)",
            paintOrder: "stroke fill",
          }}
        >
          tout est dans où tu la poses
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** PLAN C — la bande devient le cadre. Meme image, plein ecran, verticale. */
const Verticale: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  /* On passe de « 16:9 pose au centre » a « 9:16 plein cadre » en agrandissant
     la source autour du sujet. Aucune coupe : c'est le meme plan, le cadre se
     referme dessus. */
  const k = interpolate(frame, [0, 0.75 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const largeur = interpolate(k, [0, 1], [width, height * (16 / 9)]);
  const hauteur = (largeur * 9) / 16;
  const gauche = interpolate(k, [0, 1], [0, width / 2 - SUJET * (height * (16 / 9))]);
  const haut = interpolate(k, [0, 1], [(height - (width * 9) / 16) / 2, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: FOND_CLAIR, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: gauche,
          top: haut,
          width: largeur,
          height: hauteur,
          overflow: "hidden",
        }}
      >
        <Video
          src={staticFile(SOURCE)}
          style={{ width: "100%", height: "100%" }}
          objectFit="cover"
          trimBefore={DEPART}
          playbackRate={RALENTI}
          muted
        />
      </div>

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(4,10,7,0.35) 0%, rgba(4,10,7,0.82) 38%, rgba(4,10,7,0.82) 62%, rgba(4,10,7,0.35) 100%)",
        }}
      />

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
            fontSize: 72,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
            opacity: interpolate(frame, [0.5 * fps, 0.85 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Créatis la pose
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 72,
            fontWeight: 900,
            color: COULEURS.vertClair,
            letterSpacing: "-0.03em",
            opacity: interpolate(frame, [0.85 * fps, 1.2 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          pour chaque clip
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Post15Bande: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: FOND_CLAIR, fontFamily: POLICE }}>
    <Series>
      <Series.Sequence durationInFrames={66} name="A · 68 % jetés">
        <Punch force={1.04} flash={0}>
          <Perte />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={60} name="B · Le balayage">
        <Punch force={1.06} flash={0.08}>
          <Balayage />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={54} name="C · La verticale">
        <Punch force={1.06} flash={0.08}>
          <Verticale />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={60} name="D · Carton">
        <CartonFinal clair mention="14 €/mois · sans engagement" />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
