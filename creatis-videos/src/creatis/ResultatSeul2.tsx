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
 * RÉSULTAT SEUL II — 1080×1920, 13,5 s. Même gabarit, autre leçon.
 *
 * Le premier de la série a fait 361 vues en 14 h, le meilleur rapport de tous
 * mes Shorts — et le seul qui ne montre ni interface, ni commande, ni grille.
 * On reste donc exactement sur cette structure, et on change le propos : ici,
 * le critère d'AUTONOMIE, posé comme une question que le spectateur peut se
 * poser ce soir sur son propre montage.
 *
 * Les quatre règles tenues : le produit n'est pas le sujet, on promet un gain
 * et non une fonction, on montre des clips finis et non des features, et la
 * méthode est évoquée sans être déroulée.
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

/* Les quatre secondes ci-dessous ont été vérifiées image par image : le clip
   remplit le cadre, aucun écran « Téléchargement du clip… », aucun split-screen.
   L'enregistrement de Gotaga est écarté — son clip est un triptyque de gameplay
   que le cadre serré hache. */
const PLANS: Plan[] = [
  {
    debut: 0, fin: 3.0,
    source: "rec-croce-h264.mp4", rec: 239.2,
    son: "son-clip-croce.mp3", sonDepart: 12.6,
    texte: "Ce passage marche tout seul. Celui que tu as coupé hier, non.",
    gros: true,
  },
  {
    debut: 3.0, fin: 6.6,
    source: "rec-norman-h264.mp4", rec: 194.0,
    son: "son-clip-norman.mp3", sonDepart: 8.7,
    texte: "La différence tient à une seule question.",
  },
  {
    debut: 6.6, fin: 10.2,
    source: "rec-domingo-h264.mp4", rec: 758.0,
    son: "son-clip-domingo.mp3", sonDepart: 9.5,
    texte: "Est-ce qu'on comprend sans avoir vu la vidéo ?",
  },
  {
    debut: 10.2, fin: 13.5,
    source: "rec-mastu-h264.mp4", rec: 230.0,
    son: "son-clip-mastu.mp3", sonDepart: 7.3,
    texte: "Si c'est non, garde-le. Même si le moment est excellent.",
  },
];

export const DUREE_RESULTAT2 = Math.round(13.5 * 30);

export const ResultatSeul2: React.FC = () => {
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
