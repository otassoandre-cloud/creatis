import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill, interpolate, Sequence, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from "remotion";
import { POLICE } from "./police";
import { Punch } from "./Punch";
import { CartonFinal } from "./posts/CartonFinal";

/**
 * DEMONSTRATION v2 — 1080x1920, 18,5 s.
 *
 * Reecrite sur les chiffres TikTok de la v1, qui sont sans ambiguite :
 *   799 vues, 99,3 % venues du « Pour toi » — la distribution a fonctionne.
 *   81 % de spectateurs a 1 s, effondrement ensuite, arret massif a 0:02.
 *   Temps moyen 3,8 s sur 27. Completion 0,87 %.
 *
 * Le probleme n'etait donc ni la portee ni le sujet : c'etait l'ouverture. La v1
 * commencait sur une vignette 16:9 posee sur du noir avec une etiquette « 1 h 08
 * de video ». Un decor qui s'installe, precisement ce que l'analyse du corpus
 * interdisait : mediane de luminance 121 sur la premiere seconde, et quelque
 * chose qui bouge deja a 0,6 s — une main, un visage qui parle.
 *
 * TROIS CHANGEMENTS.
 *
 * 1. Le clip demarre a l'image 1, plein cadre, visage + voix + sous-titres. Rien
 *    par-dessus pendant quatre secondes : le temps de passer le point de rupture.
 *
 * 2. LE VISAGE NE DISPARAIT JAMAIS. Les etapes ne remplacent plus l'image, elles
 *    se posent en surimpression sur le clip qui continue de tourner derriere un
 *    voile. La v1 coupait vers des ecrans fixes et sombres pendant 9,5 s ; ici il
 *    y a du mouvement et un regard humain d'un bout a l'autre.
 *
 * 3. 18,5 s au lieu de 27. Avec 3,8 s de temps moyen, une video plus courte
 *    releve mecaniquement le taux de completion, que TikTok recompense.
 *
 * SOURCE. « 3H AVEC AMIXEM » sur Generation Do It Yourself, podcast filme en
 * studio eclaire. Choisie APRES avoir mesure que le podcast en voiture utilise
 * precedemment plafonnait a 79 de luminance sur deux minutes : structurellement
 * trop sombre pour ce format, quel que soit le montage.
 *
 * La fenetre 64-81 s est un gros plan CONTINU sur l'animateur, 17 s sans une
 * coupe. Ca compte : un podcast multi-camera alterne les plans, et un plan large
 * a deux recadre en 9:16 tombe entre les deux personnes. Un premier essai sur
 * 9,6-26,6 s donnait une table vide a la cinquieme seconde.
 *
 * Un relevement de 1,29 amene les 93 mesures vers les 118 du corpus. C'est le
 * SEUL retraitement, et il ne touche ni le recadrage ni les sous-titres — ce que
 * le produit fait reste montre tel quel.
 */
export const DUREE_V2 = 555;

const CLIP = 480;        // 16 s de clip
const S1 = 120;          // 4,0 s : fin de l'ouverture nue
const S2 = 210;          // 7,0 s
const S3 = 270;          // 9,0 s
const S4 = 330;          // 11,0 s : retour au clip seul

const VERT = "#10b981";
/* Ramene les 87/103 mesures vers les 118 du corpus. */
const RELEVE = "brightness(1.29) saturate(1.06)";

const ETAPES: [number, number, string, string][] = [
  [S1, S2, "1", "Colle le lien"],
  [S2, S3, "2", "L’IA repère les moments forts"],
  [S3, S4, "3", "Recadrage 9:16 + sous-titres"],
];

/* Trois bandes qui ne se marchent pas dessus, de haut en bas :
     ~8 %   le hook du clip (pose par le produit)
     ~26 %  mes etiquettes d'etape          <- ici
     ~50 %  les sous-titres karaoke du clip
     ~66 %  l'encart de l'application
     >75 %  zone recouverte par l'interface TikTok, laissee vide
   Premier essai : etiquettes a 60 %, donc collees aux sous-titres a 50 % — deux
   textes en concurrence, illisibles tous les deux. Et l'encart de l'app etait
   centre et large, il masquait le visage pendant toute l'etape 1, ce qui annule
   la raison d'etre de cette version. */
const Etiquette: React.FC<{ n: string; texte: string }> = ({ n, texte }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({ frame, fps, config: { damping: 15, stiffness: 210 } });
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 20,
      transform: `translateY(${interpolate(e, [0, 1], [40, 0])}px)`,
      opacity: interpolate(e, [0, 1], [0, 1]),
    }}>
      <div style={{
        width: 76, height: 76, borderRadius: 23, background: VERT, color: "#05140B",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 43, fontWeight: 800, flexShrink: 0,
      }}>{n}</div>
      <div style={{
        fontSize: 56, fontWeight: 800, color: "#fff", letterSpacing: "-0.025em",
        lineHeight: 1.1, textShadow: "0 3px 20px rgba(0,0,0,0.9)",
      }}>{texte}</div>
    </div>
  );
};

export const EtapesV2: React.FC = () => {
  const frame = useCurrentFrame();

  /* Voile pose uniquement pendant les etapes, monte et descend en douceur pour
     que la bascule ne ressemble pas a une coupe. */
  const voile = interpolate(frame, [S1 - 8, S1 + 8, S4 - 10, S4 + 6], [0, 0.42, 0.42, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const etape = ETAPES.find(([a, b]) => frame >= a && frame < b);

  /* L'ecran du studio n'apparait que sur l'etape 1 : c'est la seule qui se passe
     cote client, les deux autres sont du travail serveur qu'il n'y a rien a filmer. */
  const t1 = frame - S1;
  const appVisible = interpolate(t1, [0, 12, S2 - S1 - 14, S2 - S1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#050a07", fontFamily: POLICE }}>
      <Audio src={staticFile("clip3.mp4")} />

      {/* Le clip tourne du premier au dernier cadre : il n'y a jamais d'image fixe. */}
      <Sequence durationInFrames={CLIP} name="Clip">
        <Video
          src={staticFile("clip3.mp4")}
          style={{ width: "100%", height: "100%", filter: RELEVE }}
          objectFit="cover"
          muted
        />
      </Sequence>

      <Sequence durationInFrames={CLIP} name="Étapes en surimpression">
        <AbsoluteFill style={{ backgroundColor: `rgba(5,10,7,${voile})` }} />

        {appVisible > 0.01 ? (
          <AbsoluteFill style={{ alignItems: "center", paddingTop: 1180 }}>
            <div style={{
              width: 300, borderRadius: 26, overflow: "hidden",
              border: "3px solid rgba(255,255,255,0.16)",
              boxShadow: "0 30px 90px rgba(0,0,0,0.85)",
              opacity: appVisible,
              transform: `translateY(${interpolate(appVisible, [0, 1], [50, 0])}px)`,
            }}>
              <Video src={staticFile("studio.mp4")} style={{ width: "100%", display: "block" }} muted />
            </div>
          </AbsoluteFill>
        ) : null}

        {etape ? (
          <AbsoluteFill style={{ justifyContent: "flex-start", padding: "0 58px", paddingTop: 500 }}>
            <Sequence from={etape[0]} durationInFrames={etape[1] - etape[0]} layout="none">
              <Etiquette n={etape[2]} texte={etape[3]} />
            </Sequence>
          </AbsoluteFill>
        ) : null}
      </Sequence>

      <Sequence from={CLIP} durationInFrames={DUREE_V2 - CLIP} name="Créatis">
        <Punch><CartonFinal clair mention="Sous-titres et recadrage automatiques" /></Punch>
      </Sequence>
    </AbsoluteFill>
  );
};
