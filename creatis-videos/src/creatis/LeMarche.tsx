import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { POLICE } from "./police";
import { COULEURS } from "./theme";

/**
 * L'OUVERTURE PAR L'ARGENT — trois secondes avant la démonstration.
 *
 * ── CE QUE 68 VIDÉOS ONT APPRIS ──────────────────────────────────────────
 * Toutes ouvraient sur le produit : l'application qui découpe, un clip qui
 * tourne, une promesse de temps gagné. Plafond stable à 800 vues, zéro inscrit
 * attribué. Le spectateur comprend en une seconde qu'on lui vend un outil, et
 * un outil n'intéresse personne tant qu'on n'a pas dit à quoi il sert de gagner.
 *
 * Ici on ouvre sur ce qui intéresse le public visé — le clippeur — et c'est
 * l'argent. Le produit n'arrive qu'après, comme la réponse à un problème qu'on
 * vient de poser.
 *
 * ── LES CHIFFRES SONT PUBLICS ET VÉRIFIABLES ─────────────────────────────
 * 887 000 $ versés aux clippeurs sur le seul mois de février 2026, 8 466
 * clippeurs payés pour 2,58 M$ suivis, 1 à 5 $ pour mille vues : relevés
 * publics de septembre 2026 sur l'écosystème Whop. On n'annonce aucun chiffre
 * qui nous concerne — ni nos revenus, ni nos clients, ni ce que « nos »
 * utilisateurs gagneraient. Promettre un revenu à quelqu'un serait faux et
 * invérifiable ; rapporter ce qu'une plateforme a versé ne l'est pas.
 *
 * Le second chiffre est là exprès : le clippeur médian a gagné 24 $ AU TOTAL.
 * Il empêche la vidéo de ressembler à une promesse de gains faciles, et c'est
 * précisément ce qui la rend crédible auprès de gens qui ont déjà essayé.
 *
 * ── LA MÉCANIQUE ─────────────────────────────────────────────────────────
 *   0,0 s   « 887 000 $ » — lisible à l'image 0, aucune animation d'entrée
 *   1,2 s   ce que c'est : versé aux clippeurs, en un mois
 *   2,1 s   le revers : le clippeur médian a gagné 24 $ en tout
 *   3,0 s   la bascule vers la démonstration
 */

export const DUREE_MARCHE = 90; // 3 s

const contour = {
  WebkitTextStroke: "10px rgba(0,0,0,0.62)",
  paintOrder: "stroke fill" as const,
};

export const LeMarche: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* Le chiffre est là dès la première image, sans ressort ni fondu : 81 % de
     spectateurs à 1 s, décrochage massif à 0:02 — ce qui décide est ce qui a été
     COMPRIS à la deuxième seconde, pas ce qui est en train d'arriver. */
  const paraitre = (debut: number, duree = 9) =>
    interpolate(frame, [debut, debut + duree], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

  /* Le revers arrive d'un coup sec. C'est lui qui retourne la vidéo : sans ça
     on lit une promesse de gains faciles, et on passe. */
  const revers = spring({
    frame: frame - 63,
    fps,
    config: { damping: 13, stiffness: 240, mass: 0.5 },
  });

  const sortie = interpolate(frame, [DUREE_MARCHE - 10, DUREE_MARCHE], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ fontFamily: POLICE, opacity: sortie }}>
      {/* 0,45 et non 0,62 : a 0,62 la premiere seconde tombait a 63 de luminance,
          contre 116-118 pour la mediane du corpus. Le texte tient grace a son
          contour noir, pas grace au voile — un voile assez opaque pour porter du
          blanc serait, par construction, assez opaque pour eteindre l'image. */}
      <AbsoluteFill style={{ backgroundColor: "rgba(4,10,7,0.45)" }} />

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          paddingLeft: 64,
          paddingRight: 64,
        }}
      >
        <div
          style={{
            fontSize: 152,
            fontWeight: 900,
            color: COULEURS.vertClair,
            lineHeight: 0.94,
            letterSpacing: "-0.05em",
            ...contour,
          }}
        >
          887 000 $
        </div>

        <div
          style={{
            marginTop: 14,
            fontSize: 50,
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.14,
            letterSpacing: "-0.02em",
            opacity: paraitre(36),
            ...contour,
          }}
        >
          versés à des clippeurs
          <br />
          en un mois
        </div>

        {/* Le revers, sur une ligne séparée et sur fond plein : c'est une autre
            information, pas la suite de la phrase. */}
        <div
          style={{
            marginTop: 34,
            opacity: Math.min(1, revers * 1.5),
            transform: `scale(${interpolate(revers, [0, 1], [0.78, 1])})`,
            backgroundColor: "rgba(4,10,7,0.86)",
            border: `2px solid ${COULEURS.vert}`,
            borderRadius: 18,
            padding: "16px 28px",
          }}
        >
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: "rgba(255,255,255,0.92)",
              lineHeight: 1.22,
            }}
          >
            le clippeur médian
            <br />
            en a gagné <span style={{ color: COULEURS.vertClair }}>24 $</span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
