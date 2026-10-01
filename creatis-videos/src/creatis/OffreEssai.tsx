import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COULEURS } from "./theme";

/**
 * OFFRE D'ESSAI — annoncée PAR-DESSUS le clip, pas sur un carton.
 *
 * ── POURQUOI PAS UN CARTON ────────────────────────────────────────────────
 * Les versions precedentes finissaient sur un ecran plein, fond clair, texte
 * centre. Ca coupe net : le clip qui retenait l'attention disparait, et on
 * demande au spectateur de lire une affiche. Sur un format ou la completion
 * decide de la portee, les deux dernieres secondes sont precisement celles
 * qu'il ne faut pas rendre ennuyeuses.
 *
 * Ici le clip continue de tourner et l'offre se pose dessus. Personne ne
 * decroche d'une video qui avance encore.
 *
 * ── OU, EXACTEMENT ────────────────────────────────────────────────────────
 * Le bloc vit entre 48 % et 70 % de la hauteur. En dessous il heurterait les
 * sous-titres du clip, incrustes a 74 % ; au-dessus il couvrirait le visage,
 * que le recadrage 9:16 place entre 15 % et 45 %. Un degrade sombre monte
 * depuis le bas pour detacher le texte sans masquer l'image — le clip reste
 * lisible derriere, c'est tout l'interet.
 *
 * ── CE QUI EST ANNONCE ────────────────────────────────────────────────────
 * Sept jours d'essai sur le Pro, puis 14 EUR par mois. C'est l'offre reellement
 * en ligne depuis le 08/09 (elle etait auparavant sur l'annuel, ou elle ne
 * convertissait pas), et la mention reprend mot pour mot celle de paiement.html.
 * Une video plus genereuse que la page de paiement fabrique des demandes de
 * remboursement.
 */
export const OffreEssai: React.FC<{ duree: number }> = ({ duree }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* Ressort sur l'arrivee : l'offre doit se poser franchement, pas se fondre.
     Un fondu lent en ferait un element de decor qu'on ne lit pas. */
  const e = spring({ frame, fps, config: { damping: 14, stiffness: 190, mass: 0.6 } });

  const paraitre = (debut: number) =>
    interpolate(frame, [debut, debut + 0.3 * fps], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

  /* Le degrade s'installe avant le texte : l'oeil voit le fond s'assombrir, donc
     il sait qu'il va se passer quelque chose avant que ca arrive. */
  const voile = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(4,10,7,0) 34%, rgba(4,10,7,0.72) 52%, rgba(4,10,7,0.86) 72%, rgba(4,10,7,0.78) 100%)",
          opacity: voile,
        }}
      />

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 70,
          paddingRight: 70,
          paddingBottom: 250,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1.02,
            letterSpacing: "-0.04em",
            transform: `scale(${interpolate(e, [0, 1], [0.72, 1])})`,
            opacity: Math.min(1, e * 1.4),
            WebkitTextStroke: "9px rgba(0,0,0,0.55)",
            paintOrder: "stroke fill",
          }}
        >
          7 jours
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: COULEURS.vertClair,
            lineHeight: 1.04,
            letterSpacing: "-0.03em",
            marginTop: 4,
            transform: `scale(${interpolate(e, [0, 1], [0.72, 1])})`,
            opacity: Math.min(1, e * 1.4),
            WebkitTextStroke: "9px rgba(0,0,0,0.55)",
            paintOrder: "stroke fill",
          }}
        >
          d’essai gratuit
        </div>

        <div
          style={{
            marginTop: 26,
            fontSize: 40,
            fontWeight: 700,
            color: "rgba(255,255,255,0.9)",
            opacity: paraitre(0.5 * fps),
          }}
        >
          sur le Pro, puis 14 €/mois
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 46,
            fontWeight: 800,
            color: "#05140B",
            backgroundColor: COULEURS.vert,
            padding: "18px 44px",
            borderRadius: 999,
            letterSpacing: "-0.01em",
            opacity: paraitre(0.8 * fps),
            boxShadow: "0 20px 60px rgba(16,185,129,0.45)",
          }}
        >
          creatis.app
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
