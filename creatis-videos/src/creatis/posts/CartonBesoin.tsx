import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COULEURS, ENTREE } from "../theme";

/**
 * Carton de fin — version « tu ne peux plus t'en passer ».
 *
 * ── CE QUI CHANGE PAR RAPPORT A CartonFinal ───────────────────────────────
 * L'autre carton donne une ADRESSE : logo, creatis.app, condition. Il repond a
 * « ou aller ». Celui-ci repond a une autre question, plus utile a la fin d'une
 * demonstration : « qu'est-ce que ca change pour moi ». On ne dit plus ou
 * s'inscrire, on dit ce qu'on ne pourra plus refaire.
 *
 * La phrase est un DEFI, pas une promesse : « essaie de remonter un clip a la
 * main » place le spectateur devant sa propre experience au lieu de lui vanter
 * un produit. Une promesse se discute, un defi se verifie — et celui qui vient
 * de voir dix clips sortir d'un lien sait deja la reponse.
 *
 * ── L'ADRESSE RESTE, EN PETIT, ET C'EST DELIBERE ──────────────────────────
 * Une publicite sans adresse ne produit aucune visite, quelle que soit la force
 * de la phrase. Elle passe donc sous la ligne, en petit : elle ne porte plus le
 * message, elle le rend actionnable. Retirer « creatis.app » rendrait la video
 * plus elegante et parfaitement inutile.
 *
 * ── FOND CLAIR ────────────────────────────────────────────────────────────
 * Meme raison que dans CartonFinal : trois secondes de carton quasi noir en fin
 * de video tiraient la luminance moyenne de 100 a 83, la ou le corpus mesure
 * est a 116. Fond clair, encre sombre, l'emeraude reste l'accent.
 */
export const CartonBesoin: React.FC<{ adresse?: string }> = ({
  adresse = "creatis.app",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const paraitre = (debut: number) =>
    interpolate(frame, [debut, debut + 0.35 * fps], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(...ENTREE),
    });

  /* TAILLE PLAFONNEE A 98 sur la sentence, et ce n'est pas esthetique : a 116
     « Tu ne pourras plus. » passait sur deux lignes. Toute la mecanique repose
     sur une phrase qui tombe d'un bloc — coupee en deux, elle se parcourt au
     lieu de frapper. 920 px utiles apres marges, c'est la limite. */

  /* La deuxieme ligne arrive APRES la premiere, et c'est tout l'effet : on lit
     le defi, puis la sentence tombe. Les afficher ensemble en ferait une seule
     phrase longue, qu'on parcourt au lieu de l'encaisser. */
  const monte = (debut: number) =>
    interpolate(frame, [debut, debut + 0.4 * fps], [26, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(...ENTREE),
    });

  return (
    <AbsoluteFill style={{ backgroundColor: "#eef3ef" }}>
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
            fontSize: 88,
            fontWeight: 900,
            color: "#0d1710",
            lineHeight: 1.08,
            letterSpacing: "-0.035em",
            opacity: paraitre(0),
            transform: `translateY(${monte(0)}px)`,
          }}
        >
          Essaie de remonter
          <br />
          un clip à la main.
        </div>

        <div
          style={{
            marginTop: 40,
            fontSize: 98,
            fontWeight: 900,
            color: COULEURS.vertSombre,
            lineHeight: 1.04,
            letterSpacing: "-0.04em",
            opacity: paraitre(0.55 * fps),
            transform: `translateY(${monte(0.55 * fps)}px)`,
          }}
        >
          Tu ne pourras plus.
        </div>

        {/* L'adresse, en retrait : elle rend la phrase actionnable sans lui voler
            la place. */}
        <div
          style={{
            marginTop: 56,
            fontSize: 48,
            fontWeight: 800,
            color: "#05140B",
            backgroundColor: COULEURS.vert,
            padding: "18px 40px",
            borderRadius: 999,
            letterSpacing: "-0.01em",
            opacity: paraitre(1.05 * fps),
          }}
        >
          {adresse}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
