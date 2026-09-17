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
 * APPEL À COMMENTER — « commente CLIP, je t'envoie le lien ».
 *
 * ── POURQUOI CET APPEL PLUTÔT QU'UNE ADRESSE ─────────────────────────────
 * Les versions précédentes finissaient sur « creatis.app ». C'est une adresse à
 * retenir, à retaper, dans une application qui ne rend pas les liens cliquables :
 * le spectateur doit sortir de TikTok pour agir, et presque personne ne le fait.
 * Un commentaire, lui, se tape sans quitter l'écran — et chaque commentaire est
 * un signal d'engagement qui pousse la vidéo à d'autres spectateurs. Le même
 * effort produit à la fois une conversion possible et de la portée.
 *
 * ── LE MOT EST « CLIP », ET C'EST DÉLIBÉRÉ ───────────────────────────────
 * Un mot, cinq lettres, déjà dans la tête du spectateur puisque c'est le sujet
 * de la vidéo. « Commente CRÉATIS » ferait taper une marque qu'il ne connaît pas
 * encore ; « commente OUI » ne dit rien du sujet et attire des commentaires
 * vides. Le mot doit être court à taper et lié à ce qu'on vient de montrer.
 *
 * ── CE QUE CET ÉCRAN PROMET ──────────────────────────────────────────────
 * Un message privé avec le lien. C'est une promesse à tenir : un appel à
 * commenter suivi de rien coûte plus cher qu'il ne rapporte — les gens le disent
 * en commentaire, publiquement, sous la vidéo suivante.
 *
 * ── OÙ, EXACTEMENT ───────────────────────────────────────────────────────
 * Comme l'offre d'essai : par-dessus le clip qui continue de tourner, entre 48 %
 * et 72 % de la hauteur. En dessous il heurterait les sous-titres du clip
 * (incrustés à 74 %) ; au-dessus il couvrirait le visage, que le recadrage 9:16
 * place entre 15 % et 45 %. Le dégradé monte du bas pour détacher le texte sans
 * éteindre l'image — le clip reste lisible derrière, c'est tout l'intérêt.
 */
export const AppelCommentaire: React.FC<{ duree: number }> = ({ duree }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* Ressort sur l'arrivée : l'appel doit se poser franchement. Un fondu lent en
     ferait un élément de décor qu'on ne lit pas. */
  const e = spring({ frame, fps, config: { damping: 14, stiffness: 190, mass: 0.6 } });

  const paraitre = (debut: number) =>
    interpolate(frame, [debut, debut + 0.3 * fps], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

  /* Le fond s'installe avant le texte : l'œil voit l'image s'assombrir, donc il
     sait qu'il va se passer quelque chose avant que ça arrive. */
  const voile = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /* Le mot à taper bat lentement. C'est le seul élément animé de l'écran final :
     il attire le regard là où se trouve l'action demandée, et un battement lent
     ne fatigue pas sur cinq secondes. */
  const battement = 1 + 0.035 * Math.sin((frame / fps) * 3.4);

  const contour = {
    WebkitTextStroke: "9px rgba(0,0,0,0.55)",
    paintOrder: "stroke fill" as const,
  };

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(4,10,7,0) 30%, rgba(4,10,7,0.74) 48%, rgba(4,10,7,0.88) 70%, rgba(4,10,7,0.80) 100%)",
          opacity: voile,
        }}
      />

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 64,
          paddingRight: 64,
          paddingBottom: 230,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 62,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            transform: `scale(${interpolate(e, [0, 1], [0.74, 1])})`,
            opacity: Math.min(1, e * 1.4),
            ...contour,
          }}
        >
          Commente
        </div>

        {/* Le mot, en pastille verte : c'est LUI qu'on doit retenir, pas la
            phrase autour. Il est écrit en capitales parce qu'il sera recopié —
            un mot en capitales ne laisse aucun doute sur son orthographe. */}
        <div
          style={{
            marginTop: 14,
            fontSize: 132,
            fontWeight: 900,
            color: "#04120B",
            backgroundColor: COULEURS.vert,
            padding: "10px 52px 18px",
            borderRadius: 28,
            letterSpacing: "-0.02em",
            lineHeight: 1.0,
            transform: `scale(${interpolate(e, [0, 1], [0.7, 1]) * battement})`,
            opacity: Math.min(1, e * 1.4),
            boxShadow: "0 24px 70px rgba(16,185,129,0.5)",
          }}
        >
          CLIP
        </div>

        <div
          style={{
            marginTop: 30,
            fontSize: 52,
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.14,
            letterSpacing: "-0.02em",
            opacity: paraitre(0.45 * fps),
            ...contour,
          }}
        >
          et je t’envoie le lien
          <br />
          en message
        </div>

        {/* La mention de l'essai reste, en petit : elle répond à la question que
            se pose celui qui s'apprête à commenter — « ça va me coûter quoi ? ».
            La retirer ferait hésiter ; la mettre en gros ramènerait l'attention
            sur le prix au lieu du geste demandé. */}
        <div
          style={{
            marginTop: 26,
            fontSize: 34,
            fontWeight: 700,
            color: "rgba(255,255,255,0.86)",
            opacity: paraitre(0.8 * fps),
            ...contour,
          }}
        >
          7 jours d’essai gratuit sur le Pro
        </div>
      </AbsoluteFill>

      {/* Barre de progression discrète : elle dit combien de temps il reste pour
          agir. Sur un format où le pouce décide en une seconde, savoir que la
          vidéo se termine pousse à faire le geste maintenant. */}
      <AbsoluteFill style={{ justifyContent: "flex-end", paddingBottom: 150 }}>
        <div
          style={{
            height: 6,
            marginLeft: 120,
            marginRight: 120,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.16)",
            overflow: "hidden",
            opacity: paraitre(0.6 * fps),
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${interpolate(frame, [0, duree], [0, 100], {
                extrapolateRight: "clamp",
              })}%`,
              backgroundColor: COULEURS.vertClair,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
