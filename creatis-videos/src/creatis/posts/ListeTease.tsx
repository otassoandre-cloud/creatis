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
import { HookFixe } from "./HookFixe";

/**
 * LISTE TEASE — le format qui a le mieux marché, rendu réutilisable.
 *
 * Le post 4 (« 3 clips que l'IA a trouvés dans MA vidéo ») est celui qui a
 * performé sur le compte. Plutôt que de le recopier a l'oeil pour en faire des
 * variantes, tout est passe ici : la structure, les durees de plan et le
 * traitement graphique sont partages, donc « meme style, meme duree » est vrai
 * par CONSTRUCTION et pas par ressemblance approximative.
 *
 * Un nouveau post = un fichier de configuration de vingt lignes, rien d'autre.
 *
 * Mecanique du format : le nombre annonce combien d'elements restent a voir,
 * donc chaque element relance la boucle au lieu de la fermer. Et **l'appat est
 * au numero 2, jamais au 3** — garder le meilleur pour la fin suppose que le
 * spectateur attende ; le placer au milieu recompense celui qui est reste et le
 * porte jusqu'au bout.
 */

/** 80 + 65 + 80 + 65 + 55 — la decoupe exacte du post qui a marche. */
export const DUREE_LISTE = 345;
const PLANS = { annonce: 80, un: 65, deux: 80, trois: 65, fin: 55 };

export type ItemListe = {
  fichier: string;
  /** Le tag genere par le produit (« Moment fort », « Hook »...). */
  tag: string;
  /** Score de viralite. Omis quand on n'a pas la valeur reelle du clip. */
  score?: number;
  /** Pastille verte de preuve, reservee a un chiffre verifiable. */
  badge?: string;
};

const Element: React.FC<ItemListe & { numero: number; avecSon: boolean }> = ({
  numero,
  fichier,
  score,
  tag,
  badge,
  avecSon,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const paraitre = (debut: number) =>
    interpolate(frame, [debut, debut + 6], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Video
        src={staticFile(fichier)}
        style={{ width: "100%", height: "100%" }}
        objectFit="cover"
        muted={!avecSon}
        loop
      />

      {/* Les clips portent DEJA leurs propres sous-titres incrustes : le voile
          haut et bas degage la place de nos surcouches sans les recouvrir. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(4,10,7,0.8) 0%, rgba(4,10,7,0.1) 30%, rgba(4,10,7,0.15) 55%, rgba(4,10,7,0.92) 100%)",
        }}
      />

      {/* Le numero, enorme et en haut : c'est le compteur de la liste. */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "flex-start",
          paddingTop: 110,
          paddingLeft: 78,
        }}
      >
        <div
          style={{
            fontSize: 150,
            fontWeight: 800,
            color: COULEURS.vert,
            letterSpacing: "-0.06em",
            lineHeight: 1,
            WebkitTextStroke: "10px rgba(0,0,0,0.9)",
            paintOrder: "stroke fill",
            scale: interpolate(frame, [0, 0.4 * fps], [0.7, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 11 }),
              output: "perceptual-scale",
            }),
          }}
        >
          #{numero}
        </div>
      </AbsoluteFill>

      {score === undefined ? null : (
        <AbsoluteFill
          style={{
            justifyContent: "flex-start",
            alignItems: "flex-end",
            paddingTop: 130,
            paddingRight: 78,
          }}
        >
          <div
            style={{
              fontSize: 62,
              fontWeight: 800,
              color: "#05140B",
              backgroundColor: COULEURS.vert,
              padding: "12px 30px",
              borderRadius: 20,
              fontVariantNumeric: "tabular-nums",
              opacity: paraitre(8),
            }}
          >
            {score}
          </div>
        </AbsoluteFill>
      )}

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 250,
          paddingLeft: 80,
          paddingRight: 80,
          textAlign: "center",
        }}
      >
        {badge ? (
          <div
            style={{
              fontSize: 58,
              fontWeight: 800,
              color: "#05140B",
              backgroundColor: COULEURS.vert,
              padding: "16px 40px",
              borderRadius: 999,
              marginBottom: 24,
              boxShadow: "0 0 70px rgba(16,185,129,0.6)",
              opacity: paraitre(14),
              scale: interpolate(frame, [14, 26], [0.8, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.spring({ damping: 10 }),
                output: "perceptual-scale",
              }),
            }}
          >
            {badge}
          </div>
        ) : null}

        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: COULEURS.texte,
            letterSpacing: "0.02em",
            padding: "12px 30px",
            borderRadius: 999,
            border: `1px solid ${COULEURS.ligne}`,
            backgroundColor: "rgba(10,15,10,0.72)",
            opacity: paraitre(4),
          }}
        >
          {tag}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export type ConfigListe = {
  /**
   * Laisse passer le SON des clips (la voix de la video source), au lieu de les
   * couper. Vrai par defaut : entendre quelqu'un parler rend la demonstration
   * bien plus credible qu'une vignette muette.
   *
   * A mettre a `false` pour les posts montes sur les `showcase-*.mp4` d'archive :
   * ils viennent de createurs differents et parlent anglais pour la plupart, donc
   * enchainer leurs bandes-son donne un patchwork incoherent.
   */
  avecSon?: boolean;
  /** Clip de fond du plan d'annonce, assombri derriere le texte. */
  fondAnnonce: string;
  ligne1: string;
  ligne2?: string;
  tailleLigne1?: number;
  items: [ItemListe, ItemListe, ItemListe];
  mentionFinale?: string;
};

export const ListeTease: React.FC<ConfigListe> = ({
  fondAnnonce,
  ligne1,
  ligne2,
  tailleLigne1 = 96,
  items,
  mentionFinale,
  avecSon = true,
}) => (
  <AbsoluteFill style={{ backgroundColor: COULEURS.fond, fontFamily: POLICE }}>
    <Series>
      {/* Pas de flash sur l'accroche : l'image 1 doit etre l'image, pas un
          ecran blanc. C'est la seule que 100 % de l'audience verra. */}
      <Series.Sequence durationInFrames={PLANS.annonce} name="A · L'annonce">
        <Punch force={1.04} flash={0}>
          <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
            <Video
              src={staticFile(fondAnnonce)}
              style={{ width: "100%", height: "100%" }}
              objectFit="cover"
              muted={!avecSon}
              loop
            />
            <AbsoluteFill style={{ backgroundColor: "rgba(4,10,7,0.66)" }} />
            <HookFixe
              ligne1={ligne1}
              ligne2={ligne2}
              hauteur={24}
              taille={tailleLigne1}
              tailleLigne2={50}
            />
          </AbsoluteFill>
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={PLANS.un} name="B · #1">
        <Punch force={1.08} flash={0.1}>
          <Element numero={1} avecSon={avecSon} {...items[0]} />
        </Punch>
      </Series.Sequence>

      {/* Coupe la plus dure : c'est le numero 2 qui porte la promesse. */}
      <Series.Sequence durationInFrames={PLANS.deux} name="B · #2">
        <Punch force={1.12} flash={0.14}>
          <Element numero={2} avecSon={avecSon} {...items[1]} />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={PLANS.trois} name="B · #3">
        <Punch force={1.08} flash={0.1}>
          <Element numero={3} avecSon={avecSon} {...items[2]} />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={PLANS.fin} name="C · Créatis">
        <Punch>
          <CartonFinal {...(mentionFinale ? { mention: mentionFinale } : {})} />
        </Punch>
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
