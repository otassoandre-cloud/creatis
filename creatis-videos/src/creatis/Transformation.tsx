import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COULEURS } from "./theme";
import { POLICE } from "./police";

/**
 * LES DEUX PREMIÈRES SECONDES — on montre la transformation, pas le résultat.
 *
 * ── LE PROBLÈME QU'ELLE RÉSOUT ───────────────────────────────────────────
 * Toutes les versions précédentes ouvraient sur le clip fini. Un clip vertical
 * avec des sous-titres, c'est ce que le spectateur voit toute la journée : rien
 * ne lui dit qu'un outil est passé par là, encore moins lequel. Les chiffres de
 * la série disent la même chose à chaque fois — 81 % de spectateurs à 1 s, puis
 * un décrochage massif à 0:02. Le spectateur ne part pas parce que c'est laid,
 * il part parce qu'à la deuxième seconde il n'a rien appris.
 *
 * Ici il apprend quelque chose immédiatement : cette vidéo large, celle qu'il
 * reconnaît comme « une vidéo YouTube normale », devient un clip vertical cadré
 * sur le visage. C'est l'acte central du produit, montré avant toute promesse.
 *
 * ── LA MÉCANIQUE, ET POURQUOI ELLE COUPE AU LIEU DE FONDRE ───────────────
 *   0,0 s   la source large, letterboxée comme sur un téléphone
 *   0,5 s   un cadre 9:16 se dessine et se verrouille dessus
 *   1,1 s   l'image se rapproche du cadre
 *   1,6 s   COUPE FRANCHE sur le clip fini, sous-titres compris
 *
 * Le fondu enchaîné a été essayé et abandonné : les deux images n'ont pas le
 * même cadrage — c'est justement le sujet — donc un fondu superpose deux visages
 * décalés et donne l'impression d'un défaut. Une coupe franche se lit comme
 * « et voilà le résultat », et n'a aucun alignement à respecter.
 *
 * Le son ne saute pas : les deux fichiers couvrent le MÊME intervalle de la même
 * vidéo, et c'est la piste du clip qui tourne d'un bout à l'autre au niveau de
 * la composition. Ce composant est muet.
 */

export const DUREE_TRANSFORMATION = 48; // 1,6 s

/** Le cadre se verrouille ici, en fraction de la largeur de l'image source. */
const CADRE_CENTRE = 0.5;

/** 9:16 dans une image 16:9 ne garde que 31,6 % de la largeur. C'est mesuré,
    pas choisi : 1080 x 9/16 = 607 px sur 1920. */
const LARGEUR_CADRE = 0.316;

/* `releve` est le MEME filtre que celui appliqué au clip : c'est la même source,
   donc la même mesure. Sans lui, une vidéo tournée en intérieur sombre ouvrait à
   64 de luminance là où le clip, lui, était relevé à 116. */
export const Transformation: React.FC<{ source: string; releve: string }> = ({
  source,
  releve,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  /* La source large occupe toute la largeur du cadre vertical. Une vidéo 16:9
     large de 1080 fait 607 de haut : elle flotte au milieu, avec du noir
     au-dessus et en dessous. C'est exactement ce que voit quelqu'un qui regarde
     une vidéo YouTube sur son téléphone sans basculer l'écran, et c'est cette
     image-là qu'il doit reconnaître. */
  const hauteurSource = (width * 9) / 16;

  /* Le cadre se dessine, puis se pose d'un coup — un ressort raide, pas un
     fondu : on imite un viseur qui accroche, pas une apparition. */
  const pose = spring({
    frame: frame - 15,
    fps,
    config: { damping: 13, stiffness: 240, mass: 0.5 },
  });

  /* Rapprochement : l'image grandit vers le cadre sur les cinq dernières
     images. Court exprès — au-delà, l'oeil a le temps de comparer les deux
     cadrages et la coupe qui suit paraît fausse. */
  const approche = interpolate(frame, [33, DUREE_TRANSFORMATION], [1, 1.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.5, 0, 0.75, 0),
  });

  const largeurCadre = width * LARGEUR_CADRE;
  const gauche = width * CADRE_CENTRE - largeurCadre / 2;

  const paraitre = (debut: number, duree = 9) =>
    interpolate(frame, [debut, debut + duree], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

  const contour = {
    WebkitTextStroke: "9px rgba(0,0,0,0.6)",
    paintOrder: "stroke fill" as const,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#050a07", fontFamily: POLICE }}>
      <AbsoluteFill style={{ transform: `scale(${approche})` }}>
        {/* Le meme plan, agrandi et flou, remplit les bandes noires.
            MESURE : avec de vraies bandes noires, la premiere seconde tombait a
            30-45 de luminance — 44 % du cadre en noir — contre 116-118 pour la
            mediane du corpus. C'est precisement la seconde ou se joue la
            retention, et on ne peut pas se permettre d'y ouvrir sombre. Ce fond
            remonte la mesure sans rien enlever a la lecture : l'image nette
            reste bordee, donc toujours reconnaissable comme une video large. */}
        <AbsoluteFill>
          {/* `objectFit` est une PROP de ce composant, pas une propriete de
              style : mis dans `style`, il est ignore et la video garde son
              rapport 16:9 au lieu de couvrir le cadre. C'est ce qui laissait des
              bandes noires malgre ce fond, et la premiere seconde a 36-61 de
              luminance au lieu des 116-118 vises. */}
          <Video
            src={staticFile(source)}
            muted
            objectFit="cover"
            style={{
              width: "100%",
              height: "100%",
              filter: "blur(38px) brightness(1.55) saturate(1.35)",
              transform: "scale(1.15)",
            }}
          />
        </AbsoluteFill>

        <AbsoluteFill style={{ justifyContent: "center" }}>
          <Video
            src={staticFile(source)}
            muted
            objectFit="cover"
            style={{
              width,
              height: hauteurSource,
              filter: releve,
              boxShadow: "0 0 90px rgba(0,0,0,0.55)",
            }}
          />
        </AbsoluteFill>

        {/* Le cadre, et l'assombrissement de ce qu'il laisse dehors : c'est ce
            contraste qui fait comprendre qu'on va JETER le reste de l'image.
            0,56 et pas 0,72 : a 0,72 la deuxieme seconde tombait a 47 de
            luminance, et c'est exactement la seconde ou la serie decroche. Le
            contraste reste lisible — ce qui compte est l'ECART entre l'interieur
            et l'exterieur du cadre, pas la noirceur de l'exterieur. */}
        <AbsoluteFill style={{ opacity: pose }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: gauche,
              backgroundColor: "rgba(4,10,7,0.56)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: width - gauche - largeurCadre,
              backgroundColor: "rgba(4,10,7,0.56)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: gauche,
              width: largeurCadre,
              top: (height - hauteurSource) / 2 - 6,
              height: hauteurSource + 12,
              border: `5px solid ${COULEURS.vertClair}`,
              borderRadius: 10,
              boxShadow: "0 0 60px rgba(52,211,153,0.55)",
              transform: `scale(${interpolate(pose, [0, 1], [1.12, 1])})`,
            }}
          />
        </AbsoluteFill>
      </AbsoluteFill>

      {/* Le chiffre, lisible dès l'image 0 : c'est la seule chose qui doit être
          comprise si le spectateur ne regarde qu'une seconde. Pas d'animation
          d'entrée dessus, pour la même raison. */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          paddingTop: 330,
          textAlign: "center",
          paddingLeft: 60,
          paddingRight: 60,
        }}
      >
        <div
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: COULEURS.vertClair,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            ...contour,
          }}
        >
          Une vidéo YouTube
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 430,
          textAlign: "center",
          paddingLeft: 60,
          paddingRight: 60,
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            opacity: paraitre(16),
            ...contour,
          }}
        >
          recadrée sur le visage
          <br />
          en une passe
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
