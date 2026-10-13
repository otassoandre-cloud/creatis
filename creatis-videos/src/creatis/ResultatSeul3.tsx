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
 * RÉSULTAT SEUL III — 1080×1920, 13,0 s.
 *
 * ── LA LÉGENDE CHANGE DE PLACE, ET ON SAIT POURQUOI ──────────────────────
 * Capture d'écran du 08/10, YouTube Shorts sur iPhone (1179×2556) : la
 * légende posée à 7 % de la hauteur passait DANS la rangée d'icônes de
 * YouTube — la flèche retour, la loupe et le menu. La deuxième ligne
 * disparaissait derrière la loupe.
 *
 * Les trois zones occupées par les plateformes, relevées sur cette capture :
 *   · le haut, 0 → 14 %     : retour, recherche, menu ;
 *   · la droite, 49 → 89 %  : la colonne J'aime / commenter / partager ;
 *   · le bas, 66 → 92 %     : le nom de chaîne, la légende, les vues.
 *
 * La bande libre est donc 14 → 48 %. La légende s'installe à **30 %** : sous
 * toute barre d'outils, au-dessus de la colonne de boutons, et à hauteur des
 * yeux sur un plan serré — ce qui était la demande du 05/10.
 *
 * ── ET ELLE EST POSÉE SUR UN FOND, PAS SUR UN VOILE ──────────────────────
 * Le dégradé plein cadre éclaircissait toute l'image sans jamais garantir le
 * contraste sous le texte. Un panneau sombre arrondi, qui épouse le bloc, le
 * garantit sur n'importe quelle image — et laisse le clip intact ailleurs.
 *
 * ── LE SUJET APPLIQUE CE QU'IL DIT ───────────────────────────────────────
 * Treize secondes. C'est la durée de la seule vidéo de la chaîne regardée à
 * 100 % (relevé de rétention du 08/10, médiane 55 %). Un film qui affirme
 * « coupe à treize secondes » et qui en dure trente ne serait pas crédible.
 */

const VERT = "#10b981";
const FOND = "#06080a";

type Plan = {
  debut: number;
  fin: number;
  source: string;
  rec: number;
  son: string;
  sonDepart: number;
  texte: string;
  gros?: boolean;
};

const CADRE: [number, number, number, number] = [150, 300, 540, 980];

/* Secondes vérifiées image par image le 08/10 : le clip remplit le cadre,
   aucun écran « Téléchargement du clip… », aucun split-screen, aucun flou de
   mouvement. Toutes différentes de celles déjà publiées. */
const PLANS: Plan[] = [
  {
    debut: 0, fin: 3.0,
    source: "rec-norman-h264.mp4", rec: 200.0,
    son: "son-clip-norman.mp3", sonDepart: 14.7,
    texte: "Ton clip de 30 secondes, personne ne le finit.",
    gros: true,
  },
  {
    debut: 3.0, fin: 6.5,
    source: "rec-mastu-h264.mp4", rec: 232.0,
    son: "son-clip-mastu.mp3", sonDepart: 9.3,
    texte: "J'ai mesuré sur toute ma chaîne : 55 % regardés en moyenne.",
  },
  {
    debut: 6.5, fin: 10.0,
    source: "rec-domingo-h264.mp4", rec: 750.0,
    son: "son-clip-domingo.mp3", sonDepart: 1.5,
    texte: "La seule vidéo vue en entier dure 13 secondes.",
  },
  {
    debut: 10.0, fin: 13.0,
    source: "rec-croce-h264.mp4", rec: 229.0,
    son: "son-clip-croce.mp3", sonDepart: 2.4,
    texte: "Coupe à 13. Pas à 30.",
  },
];

export const DUREE_RESULTAT3 = Math.round(13.0 * 30);

export const ResultatSeul3: React.FC = () => {
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
        /* L'échelle est le MAXIMUM des deux rapports : le clip doit remplir,
           pas tenir dans le cadre. Avec le minimum, l'interface de l'app
           resterait visible sur les bords. */
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

      {/* La légende, dans la bande libre de 14 à 48 %, sur son propre fond. */}
      <div
        style={{
          position: "absolute",
          top: height * 0.30,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: visible,
          transform: `translateY(${interpolate(visible, [0, 1], [-20, 0])}px)`,
        }}
      >
        <div
          style={{
            maxWidth: 940,
            textAlign: "center",
            color: "#fff",
            fontSize: plan.gros ? 86 : 70,
            fontWeight: 900,
            lineHeight: 1.12,
            letterSpacing: -2,
            padding: "26px 34px",
            borderRadius: 26,
            background: "rgba(0,0,0,0.70)",
            /* Le cerne reste : sur un fond clair qui déborde du panneau, il
               tient encore les lettres. */
            textShadow:
              "0 0 2px #000, 3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000",
          }}
        >
          {plan.texte}
        </div>
      </div>

      {/* L'adresse sur la dernière seconde, à 40 % : au-dessus de la colonne
          de boutons, qui commence à 49 %. */}
      {s >= 11.9 ? (
        <div
          style={{
            position: "absolute", left: 0, right: 0, top: height * 0.40,
            display: "flex", justifyContent: "center",
            opacity: interpolate(s, [11.9, 12.3], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          {/* Même pastille sombre que la légende : en vert sur une chemise
              claire, l'adresse était illisible — vérifié sur l'image de fin. */}
          <div
            style={{
              fontSize: 48, fontWeight: 900, color: VERT, letterSpacing: -0.5,
              padding: "12px 26px", borderRadius: 999,
              background: "rgba(0,0,0,0.72)",
              textShadow: "0 0 2px #000",
            }}
          >
            creatis.app
          </div>
        </div>
      ) : null}

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
