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
 * POST 13 — « 1 400 000 $ ».
 *
 * ── LE CHANGEMENT D'ANGLE, ET POURQUOI ────────────────────────────────────
 * Les douze posts precedents vendent tous la meme chose : du TEMPS GAGNE.
 * « 0 montage », « 2 h 04 pour 12 secondes », « sortis en 30 secondes ». Le
 * plafond mesure de cette famille est 1 221 vues, et les deux pires (293 et
 * 263) sont celles qui montrent l'outil. Personne ne clique sur du temps gagne.
 *
 * Ce post arrete donc de parler du produit et parle du MARCHE.
 *
 * ── CE QUE DIT VRAIMENT LA BASE (mesure le 08/09/2026) ────────────────────
 * Une note heritee annoncait « 13 % clipping, 17 % gaming, 34 comptes Whop ».
 * Verification faite sur `users` : 812 inscrits, 186 ont renseigne `niche`.
 * Le classement reel est :
 *
 *     gaming 19 · finance 12 · tiktok 8 · football 6
 *     film 4 · business 4 · clipping 4 · whop 2
 *
 * Donc : **gaming est de loin la premiere niche declaree**, ce qui fonde
 * l'angle GTA 6. Mais « clippeur » comme identite ne pese que 4 personnes, pas
 * 13 %. Consequence a assumer : ce post ne parle PAS a la base existante, il va
 * chercher une audience que Creatis n'a pas encore. C'est une prise de
 * territoire, pas une video de resonance — et elle doit etre jugee sur les
 * nouveaux venus, pas sur l'engagement des abonnes actuels.
 *
 * ── LE CHIFFRE, ET SA SOURCE ──────────────────────────────────────────────
 * Le streamer N3on a paye **plus de 1,4 million de dollars a 303 clippeurs sur
 * une seule periode de cinq semaines** — document remis par son equipe a
 * Business Insider (thenationalnews.com, 30/08/2026). Son reseau compte environ
 * 1 000 personnes.
 *
 * 1 400 000 / 303 = 4 620 $ par clippeur. La division est faite A L'ECRAN :
 * c'est elle le choc, parce qu'elle transforme un gros nombre abstrait en une
 * somme qu'un spectateur rapporte a lui-meme.
 *
 * ── CE QUE LA VIDEO NE DIT PAS ────────────────────────────────────────────
 * Aucune promesse de revenu. On enonce un fait de marche, on nomme le goulot
 * (le volume), on montre la machine qui produit du volume, et on s'arrete. Une
 * video qui promettrait « gagne 4 620 $ » serait a la fois fausse et moins
 * efficace : le spectateur ne croit pas une promesse, il verifie un fait.
 *
 * Et le calendrier fait le reste du travail : GTA 6 sort le 19 novembre 2026,
 * la demande de clips est maximale a la sortie. La video n'a donc pas besoin
 * d'appeler a l'action, l'echeance s'en charge.
 *
 * Muette : le son tendance se pose dans l'app a la publication.
 */
export const DUREE_POST_13 = 360;

/* Le fond de charte (#0a0f0a) est un quasi-noir qui tire la luminance de la
   video a 14/255 alors que le corpus mesure est a ~118. Meme parti que PubGta :
   on garde la teinte de la marque, on remonte la valeur. */
const FOND_CLAIR = "#16211a";

/** Relevement par plan, calcule sur la moyenne des deux mesures (moyenne du plan
    et moyenne de sa premiere seconde), plafonne a 1,9 pour ne pas cramer les
    hautes lumieres. Meme formule que SerieTrailers. */
const RELEVE = (moy: number, debut: number) =>
  `brightness(${Math.min(1.9, 118 / ((moy + debut) / 2)).toFixed(2)}) saturate(1.08)`;

const OR = "#fbbf24";

/** PLAN A — le chiffre, seul, sur un toit de Vice City (s04 : 149/157). */
const Chiffre: React.FC = () => {
  const frame = useCurrentFrame();

  /* PAS de compteur qui monte. Un premier jet en faisait grimper la somme sur
     1,5 s : au rendu, l'image 1 affichait « 533 060 $ », un nombre qui ne veut
     rien dire, pile pendant la demi-seconde qui decide de la retention. C'est
     exactement ce que HookFixe documente — le hook doit etre lisible a 100 % a
     l'image 0. Le nombre est donc pose entier, et c'est l'ECHELLE qui bouge. */
  const pose = interpolate(frame, [0, 9], [1.12, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    output: "perceptual-scale",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: FOND_CLAIR }}>
      {/* s04 plutot que s02 (marais a l'aube) : le propos est l'argent, et le
          toit de Vice City le dit en une image. C'est aussi le 2e plan le plus
          lumineux du lot (149/157). */}
      <Video
        src={staticFile("s04.mp4")}
        style={{ width: "100%", height: "100%", filter: RELEVE(149, 157) }}
        objectFit="cover"
        muted
        loop
      />
      {/* Voile ramene de 0,62 a 0,40 : a 0,62 le plan mesure a 158 retombait
          sous 60, soit la moitie de la mediane du corpus — on annulait le
          relevement qu'on venait de calculer. Le contour noir de 10 px sous le
          texte suffit largement a la lisibilite. */}
      <AbsoluteFill style={{ backgroundColor: "rgba(4,10,7,0.40)" }} />

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 60,
          paddingRight: 60,
          scale: pose,
        }}
      >
        <div
          style={{
            fontSize: 132,
            fontWeight: 900,
            color: OR,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.03em",
            WebkitTextStroke: "10px rgba(0,0,0,0.92)",
            paintOrder: "stroke fill",
            textShadow: "0 6px 34px rgba(0,0,0,0.85)",
          }}
        >
          1 400 000 $
        </div>

        <div
          style={{
            marginTop: 30,
            fontSize: 62,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
            WebkitTextStroke: "9px rgba(0,0,0,0.9)",
            paintOrder: "stroke fill",
          }}
        >
          payés à des clippeurs
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 62,
            fontWeight: 800,
            color: COULEURS.vertClair,
            WebkitTextStroke: "9px rgba(0,0,0,0.9)",
            paintOrder: "stroke fill",
          }}
        >
          en 5 semaines
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** PLAN B — la division. C'est elle qui ramene le nombre a hauteur d'homme. */
const Division: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const paraitre = (debut: number) =>
    interpolate(frame, [debut, debut + 0.3 * fps], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

  const part = Math.round(
    interpolate(frame, [0.75 * fps, 1.5 * fps], [0, 4620], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }),
  );

  const Ligne: React.FC<{ v: string; l: string; d: number; couleur?: string }> = ({
    v,
    l,
    d,
    couleur,
  }) => (
    <div style={{ textAlign: "center", opacity: paraitre(d) }}>
      <div
        style={{
          fontSize: 86,
          fontWeight: 900,
          color: couleur ?? "#ffffff",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.03em",
        }}
      >
        {v}
      </div>
      <div style={{ marginTop: 10, fontSize: 38, fontWeight: 700, color: COULEURS.texteDoux }}>
        {l}
      </div>
    </div>
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: FOND_CLAIR,
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: 90,
        paddingRight: 90,
      }}
    >
      <Ligne v="1 400 000 $" l="versés" d={0} />
      <div
        style={{
          margin: "26px 0",
          fontSize: 54,
          fontWeight: 800,
          color: COULEURS.texteDoux,
          opacity: paraitre(0.3 * fps),
        }}
      >
        ÷
      </div>
      <Ligne v="303" l="clippeurs" d={0.45 * fps} />

      <div
        style={{
          marginTop: 40,
          height: 4,
          width: 420,
          borderRadius: 4,
          background: "rgba(255,255,255,0.16)",
          opacity: paraitre(0.7 * fps),
        }}
      />

      <div
        style={{
          marginTop: 40,
          fontSize: 116,
          fontWeight: 900,
          color: OR,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.03em",
          opacity: paraitre(0.75 * fps),
        }}
      >
        {part.toLocaleString("fr-FR").replace(/ /g, " ")} $
      </div>
      <div
        style={{
          marginTop: 14,
          fontSize: 44,
          fontWeight: 700,
          color: "#ffffff",
          opacity: paraitre(0.95 * fps),
        }}
      >
        chacun
      </div>

      {/* L'attribution est petite mais presente : c'est ce qui separe un chiffre
          verifiable d'une accroche marketing, et c'est exactement le trait que
          partagent toutes les videos du compte qui ont depasse 400 vues. */}
      <div
        style={{
          position: "absolute",
          bottom: 150,
          fontSize: 30,
          fontWeight: 600,
          color: COULEURS.texteDoux,
          opacity: paraitre(1.1 * fps),
        }}
      >
        réseau N3on · document remis à Business Insider
      </div>
    </AbsoluteFill>
  );
};

/** PLAN C — le goulot. Une seule chose separe le spectateur de ce marche. */
const Goulot: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: FOND_CLAIR }}>
      <Video
        src={staticFile("s14.mp4")}
        style={{ width: "100%", height: "100%", filter: RELEVE(154, 135) }}
        objectFit="cover"
        muted
        loop
      />
      <AbsoluteFill style={{ backgroundColor: "rgba(4,10,7,0.46)" }} />

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 80,
          paddingRight: 80,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 50,
            fontWeight: 700,
            color: COULEURS.texteDoux,
            letterSpacing: "0.1em",
            marginBottom: 22,
          }}
        >
          CE QUI LES SÉPARE DE TOI
        </div>
        <div
          style={{
            fontSize: 108,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            WebkitTextStroke: "10px rgba(0,0,0,0.9)",
            paintOrder: "stroke fill",
          }}
        >
          le volume
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 52,
            fontWeight: 800,
            color: COULEURS.vertClair,
            opacity: interpolate(frame, [0.6 * fps, 1 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            WebkitTextStroke: "9px rgba(0,0,0,0.9)",
            paintOrder: "stroke fill",
          }}
        >
          pas le talent
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** PLAN D — la machine. Le volume, montre et non affirme. */
const Machine: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* Six vignettes qui tombent l'une apres l'autre, 4 images d'ecart : a cette
     cadence l'oeil ne lit plus chaque clip, il percoit un DEBIT — ce qui est
     exactement le propos du plan. */
  const clips = ["s01.mp4", "s04.mp4", "s06.mp4", "s11.mp4", "s15.mp4", "s23.mp4"];

  return (
    <AbsoluteFill style={{ backgroundColor: FOND_CLAIR }}>
      <AbsoluteFill
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 10,
          padding: 10,
          alignContent: "center",
        }}
      >
        {clips.map((f, i) => (
          <div
            key={f}
            style={{
              overflow: "hidden",
              borderRadius: 16,
              aspectRatio: "9 / 16",
              opacity: interpolate(frame, [i * 4, i * 4 + 7], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              transform: `translateY(${interpolate(frame, [i * 4, i * 4 + 10], [30, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              })}px)`,
            }}
          >
            <Video
              src={staticFile(f)}
              style={{ width: "100%", height: "100%", filter: "brightness(1.25) saturate(1.08)" }}
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
            "linear-gradient(to bottom, rgba(4,10,7,0.85) 0%, rgba(4,10,7,0.25) 22%, rgba(4,10,7,0) 40%, rgba(4,10,7,0.9) 78%, rgba(4,10,7,0.95) 100%)",
        }}
      />

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 170,
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
            opacity: interpolate(frame, [0.55 * fps, 0.9 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Colle un lien.
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 76,
            fontWeight: 900,
            color: COULEURS.vertClair,
            letterSpacing: "-0.03em",
            opacity: interpolate(frame, [0.9 * fps, 1.25 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Récupère tes verticales.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Post13Marche: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: FOND_CLAIR, fontFamily: POLICE }}>
    <Series>
      {/* Aucun flash sur l'accroche : l'image 1 doit etre lisible, pas clignotante. */}
      <Series.Sequence durationInFrames={78} name="A · 1 400 000 $">
        <Punch force={1.04} flash={0}>
          <Chiffre />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={72} name="B · ÷ 303">
        <Punch force={1.08} flash={0.1}>
          <Division />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={66} name="C · Le volume">
        <Punch force={1.08} flash={0.1}>
          <Goulot />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={84} name="D · La machine">
        <Punch force={1.08} flash={0.1}>
          <Machine />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={60} name="E · Carton">
        <CartonFinal clair mention="14 €/mois · sans engagement" />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
