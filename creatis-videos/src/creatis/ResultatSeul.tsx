import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { POLICE } from "./police";

/**
 * RÉSULTAT SEUL — 1080×1920, 13,5 s. Le premier film qui ne montre PAS l'outil.
 *
 * ── LES QUATRE ERREURS QU'IL CORRIGE ─────────────────────────────────────
 * Méthode relevée le 07/10 (chapitres de « Personne ne veut de ton SaaS »,
 * Leo Grindarss). Les quatre décrivaient exactement ce que je produisais :
 *
 *   1. « Ton SaaS est le sujet de ta vidéo »
 *      → ici il n'y a NI interface, NI commande vocale, NI grille de notes.
 *        Le sujet est le problème du spectateur : il ne trouve pas ses clips.
 *
 *   2. « Tu promets ce que fait ton outil, pas ce qu'il fait gagner »
 *      → on ne dit plus « dix clips notés, recadrés, sous-titrés ». On dit ce
 *        qui est en jeu : des moments qu'il a déjà filmés et jamais trouvés.
 *
 *   3. « Tu montres ta feature au lieu du résultat »
 *      → chaque plan est un clip FINI qui tourne, avec son son. Rien d'autre.
 *
 *   4. « Tu dévoiles tout d'un coup »
 *      → la grille des cinq critères est NOMMÉE, jamais déroulée. Treize
 *        secondes qui montrent tout le processus ne laissent rien à vouloir.
 *
 * ── D'OÙ VIENNENT LES IMAGES ─────────────────────────────────────────────
 * Des tournages de la semaine, cadrés serré sur le lecteur de l'éditeur pour
 * que l'interface sorte du cadre. Quatre créateurs différents : la variété des
 * visages fait plus pour la rétention qu'un énième plan d'interface.
 */

const VERT = "#10b981";
const FOND = "#06080a";

type Plan = {
  debut: number;
  fin: number;
  source: string;
  /** Seconde de l'enregistrement où le clip tourne. */
  rec: number;
  /** Son du clip, et sa position de départ. */
  son: string;
  sonDepart: number;
  texte: string;
  /** Première ligne, plus grosse : c'est le hook. */
  gros?: boolean;
};

/* Cadre commun : serré sur le lecteur, l'éditeur passe hors champ. */
const CADRE: [number, number, number, number] = [150, 300, 540, 980];

const PLANS: Plan[] = [
  {
    debut: 0, fin: 3.0,
    source: "rec-gotaga-h264.mp4", rec: 187.5,
    son: "son-clip-gotaga.mp3", sonDepart: 3.1,
    texte: "Ta dernière vidéo contient dix moments comme celui-ci.",
    gros: true,
  },
  {
    debut: 3.0, fin: 6.0,
    source: "rec-norman-h264.mp4", rec: 189.0,
    son: "son-clip-norman.mp3", sonDepart: 3.7,
    texte: "Tu ne les as jamais trouvés.",
  },
  {
    debut: 6.0, fin: 9.0,
    source: "rec-domingo-h264.mp4", rec: 752.0,
    son: "son-clip-domingo.mp3", sonDepart: 3.5,
    texte: "Parce que tu les cherches à l'œil, à 23 h.",
  },
  {
    debut: 9.0, fin: 11.6,
    source: "rec-croce-h264.mp4", rec: 231.0,
    son: "son-clip-croce.mp3", sonDepart: 4.4,
    texte: "Il existe une grille pour les repérer.",
  },
  {
    debut: 11.6, fin: 13.5,
    source: "rec-mastu-h264.mp4", rec: 226.0,
    son: "son-clip-mastu.mp3", sonDepart: 3.3,
    texte: "Cinq critères. Trente secondes à apprendre.",
  },
];

export const DUREE_RESULTAT = Math.round(13.5 * 30);

export const ResultatSeul: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const s = frame / fps;

  const i = PLANS.reduce((acc, p, k) => (s >= p.debut ? k : acc), 0);
  const plan = PLANS[i];

  const entre = spring({
    frame: frame - Math.round(plan.debut * fps),
    fps,
    config: { damping: 200 },
    durationInFrames: 10,
  });
  const sort = interpolate(s, [plan.fin - 0.4, plan.fin - 0.12], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const visible = Math.min(entre, sort);

  return (
    <AbsoluteFill style={{ backgroundColor: FOND, fontFamily: POLICE }}>
      {PLANS.map((p) => {
        const [cx, cy, cl, ch] = CADRE;
        /* On remplit la hauteur : le clip occupe tout, l'éditeur sort. */
        const e = Math.max(1080 / cl, 1920 / ch);
        const tx = 540 - (cx + cl / 2) * e;
        const ty = 960 - (cy + ch / 2) * e;
        return (
          <Sequence
            key={p.debut}
            from={Math.round(p.debut * fps)}
            durationInFrames={Math.round((p.fin - p.debut) * fps)}
            layout="none"
          >
            <AbsoluteFill style={{ overflow: "hidden" }}>
              <Video
                src={staticFile(p.source)}
                trimBefore={Math.round(p.rec * 30)}
                style={{
                  position: "absolute", width: 1080, height: 1920,
                  transformOrigin: "0 0",
                  transform: `translate(${tx}px, ${ty}px) scale(${e})`,
                }}
                muted
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Voile haut : le texte vit en haut, là où rien ne le recouvre. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 26%, transparent 46%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: height * 0.07,
          left: 80,
          right: 80,
          textAlign: "center",
          opacity: visible,
          transform: `translateY(${interpolate(visible, [0, 1], [-18, 0])}px)`,
          color: "#fff",
          fontSize: plan.gros ? 88 : 72,
          fontWeight: 900,
          lineHeight: 1.1,
          letterSpacing: -2,
          textShadow:
            "0 0 2px #000, 4px 4px 0 #000, -4px 4px 0 #000, 4px -4px 0 #000, -4px -4px 0 #000, 0 6px 26px rgba(0,0,0,0.9)",
        }}
      >
        {plan.texte}
      </div>

      {/* L'adresse n'apparaît que sur la dernière seconde, en petit. Le produit
          n'est pas le sujet : il est la réponse, et elle vient à la fin. */}
      {s >= 12.4 ? (
        <div
          style={{
            position: "absolute", left: 0, right: 0, bottom: height * 0.3,
            textAlign: "center", fontSize: 46, fontWeight: 800, color: VERT,
            textShadow: "0 3px 18px rgba(0,0,0,0.9)",
            opacity: interpolate(s, [12.4, 12.8], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          creatis.app
        </div>
      ) : null}

      {/* Le son de chaque clip, pendant son plan. */}
      {PLANS.map((p) => (
        <Sequence
          key={`son-${p.debut}`}
          from={Math.round(p.debut * fps)}
          durationInFrames={Math.round((p.fin - p.debut) * fps)}
          layout="none"
        >
          <Audio src={staticFile(p.son)} trimBefore={Math.round(p.sonDepart * fps)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
