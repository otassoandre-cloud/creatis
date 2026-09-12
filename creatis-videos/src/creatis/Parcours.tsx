import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill, interpolate, Sequence, Series, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from "remotion";
import { POLICE } from "./police";
import { Punch } from "./Punch";
import { CartonFinal } from "./posts/CartonFinal";
import { Pastille, Pastilles } from "./Pastilles";

/**
 * PARCOURS COMPLET — 1080x1920, 21,5 s.
 *
 * On voit enfin le trajet en entier : le lien collé, l'analyse, LES 10 CLIPS
 * generes, le clic sur l'un d'eux, puis ce clip en plein ecran.
 *
 * TOUT EST REEL. Enregistrement Playwright d'une generation qui a ABOUTI, et
 * c'est ce qui a demande le plus de travail : les deux tentatives precedentes
 * echouaient a 4 minutes sur le timeout client, parce que je lancais l'analyse
 * sur des videos de 1 h et de 3 h. Ici la source fait 8 minutes et l'app affiche
 * « 10 clips prets » a 100 secondes. Le clip montre a la fin sort de CETTE
 * generation-la, pas d'une autre : les vignettes de la grille et le plan final
 * sont le meme homme.
 *
 * TROIS VITESSES, parce qu'une seule ne marchait pas. La saisie du lien passe a
 * x2,7 pour rester lisible, l'analyse a x25 (76 secondes ramenees a 3 : personne
 * ne regarde une barre de progression en temps reel), la grille et le clic a x5
 * seulement — c'est le moment qui prouve le produit, il doit se lire.
 *
 * AUCUN SILENCE. Le son du clip tourne en continu au niveau de la composition et
 * l'image le rejoint a 12 s sans decalage. Sans ca, les 8 secondes d'interface
 * seraient muettes.
 *
 * SOURCE (12/09/2026). « J'ai cree ma propre marque de CIGARES » de La Menace,
 * publiee le 10/09. Mesuree avant de s'engager : 157 de luminance sur la source,
 * 135 sur le clip exporte — la source la plus lumineuse de toute la serie, loin
 * devant La Boiserie (136) qui occupait cette place.
 *
 * Et surtout elle repare le defaut de la version precedente : La Boiserie filmait
 * des voitures et des plans larges, donc `reframe_mode=face` retombait sur le crop
 * centre et le suivi de visage n'etait jamais demontre. Ici le sujet est une
 * personne qui parle, DECENTREE dans le cadre 16:9 — le recadrage doit aller la
 * chercher, et ca se voit.
 *
 * La video fait 55 minutes. Le client s'accorde 15 minutes de sondage
 * (`_pollTranscribeJob`) : l'analyse en a pris 140 secondes, tout est passe.
 *
 * Le commentaire est continu — 452 mots en deux minutes — donc aucun trou de son
 * a combler : le creux tombe a -19,5 dB, la ou l'interview precedente descendait
 * a -37 et demandait un compresseur.
 *
 * Ce que cette source ne montre PAS : le suivi de visage. Le sujet filme, ce sont
 * des voitures et des plans larges ; `reframe_mode=face` retombe alors sur le
 * crop centre, ce qui est son comportement voulu. Les sous-titres et le passage
 * en 9:16, eux, sont bien demontres.
 */
export const DUREE_PARCOURS = 645;

const CLIP = 570;      // 19 s de clip
const APP_DEB = 120;   // 4,0 s
const APP_FIN = 360;   // 12,0 s

const VERT = "#10b981";
/* Relevement leger, et calcule : ce clip-ci sort a 113 de luminance (99 sur la
   premiere seconde) — tourne en interieur, dans une fabrique de cigares. 118/113
   donne 1,04, qu'on arrondit a 1,06 pour rattraper l'ouverture plus sombre que
   la moyenne. Loin du plafond de 1,9 : on corrige, on ne repeint pas. */
const RELEVE = "brightness(1.06) saturate(1.05)";

/* Ce que l'on est en train de voir, aligne sur les trois vitesses du parcours. */
const LEGENDES: [number, number, string][] = [
  [0, 44, "Tu colles le lien"],
  [44, 135, "L’IA analyse la vidéo"],
  [135, 240, "Tes clips sont prêts"],
];

const Legende: React.FC<{ texte: string }> = ({ texte }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({ frame, fps, config: { damping: 16, stiffness: 220 } });
  return (
    <div style={{
      fontSize: 56, fontWeight: 800, color: "#fff", textAlign: "center",
      letterSpacing: "-0.025em", textShadow: "0 3px 22px rgba(0,0,0,0.95)",
      transform: `translateY(${interpolate(e, [0, 1], [34, 0])}px)`,
      opacity: interpolate(e, [0, 1], [0, 1]),
    }}>
      {texte}
    </div>
  );
};

/**
 * Les trois vitesses du parcours.
 *
 * `parcours.mp4` est desormais l'enregistrement BRUT de Playwright — 163 s,
 * VP8, 25 i/s — et non plus un fichier pre-monte. L'ancienne version etait
 * pre-accéléree a l'ffmpeg puis livree deja compressee a 8 s ; garder le brut
 * evite un re-encodage et permet de recaler les vitesses sans re-enregistrer.
 * (Le ffmpeg livre avec Remotion n'embarque pas `setpts`, de toute facon.)
 *
 * Repères mesures sur l'enregistrement, par ecart entre images successives.
 * Version TELEPHONE du 12/09 (480x816, 123,5 s) — filmee a la largeur EXACTE
 * de l'encart, donc affichee sans redimensionnement :
 *   2 s    la page du studio s'affiche
 *   13 s   l'analyse demarre
 *   116 s  la grille des clips apparait
 *   118 s  le clip s'ouvre        (fin a 123,5 s)
 *
 * LE NOMBRE DE CLIPS N'EST PLUS ANNONCE, et c'est un constat, pas une pudeur :
 * quatre analyses de la MEME video ont rendu 10, 8, 8 puis 4 clips. Ecrire un
 * nombre par-dessus une grille qui en montre un autre le lendemain serait faux
 * une fois sur deux. Le libelle dit donc « tes clips sont prets » et laisse
 * l'ecran compter.
 *
 * Les trois durees ci-dessous somment exactement 240 images, soit la fenetre
 * APP_FIN - APP_DEB, et epousent les bornes de LEGENDES (44 / 135 / 240) : le
 * libelle affiche correspond donc toujours a ce qui est montre.
 *
 * L'analyse est vue a x34 : personne ne regarde une barre de progression en
 * temps reel, mais on veut la voir parcourir toute sa course, pas sauter.
 */
/* `layout="none"` sur chaque sequence : sans lui, Series.Sequence enveloppe ses
   enfants dans un conteneur en position absolue qui ne contribue plus a la
   hauteur. L'encart, dimensionne par son contenu, s'effondrait alors a quelques
   pixels — au rendu on ne voyait qu'un trait vert. */
const ParcoursAccelere: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={44} layout="none">
      <Video src={staticFile("parcours.mp4")} style={{ width: "100%", display: "block" }}
        trimBefore={60} playbackRate={7.5} muted />
    </Series.Sequence>
    <Series.Sequence durationInFrames={91} layout="none">
      <Video src={staticFile("parcours.mp4")} style={{ width: "100%", display: "block" }}
        trimBefore={390} playbackRate={34.0} muted />
    </Series.Sequence>
    <Series.Sequence durationInFrames={105} layout="none">
      <Video src={staticFile("parcours.mp4")} style={{ width: "100%", display: "block" }}
        trimBefore={3480} playbackRate={2.14} muted />
    </Series.Sequence>
  </Series>
);

/* Les pastilles. Chaque valeur vient de la generation filmee derriere :
     55 min   duree reelle de la source (3 323 s)
     1 min 43 duree reelle de l'analyse (13 s -> 116 s dans l'enregistrement)
     9:16     ce que le clip montre au meme instant
     32 s     duree du clip ouvert (01:04 -> 01:36), relevee par le script
     0        montage, au sens propre : aucune coupe faite a la main

   Ni le NOMBRE de clips ni le SCORE ne sont affiches. Les deux varient d'une
   analyse a l'autre — 10, 8, 8 puis 4 clips sur la meme video — donc les
   graver dans une video qui resservira demain en ferait des chiffres faux.
   Ce qui est constant, lui, est affiche : la duree de la source, celle de
   l'analyse, le format de sortie, la duree du clip.

   Placement, et il n'y a que deux couloirs libres :
     y = 8 %   au-dessus de l'encart, qui commence a 240 px
     y = 62 %  entre le bas de l'encart (1 056 px) et le libelle d'etape
   Un premier jet posait la rangee basse a 73 %, soit 1 402 px — exactement sur
   le libelle, qui est ancre a 1 390. « 0 MONTAGE » recouvrait la moitie de
   « L'IA analyse la video ». On alterne gauche et droite pour que l'oeil se
   deplace, jamais sous 76 % ou l'interface de TikTok mange l'image. */
const PASTILLES: Pastille[] = [
  { debut: 128, duree: 34, valeur: "55 min", libelle: "DE VIDÉO", x: 30, y: 8, angle: -3 },
  { debut: 166, duree: 36, valeur: "1 min 43", libelle: "D'ANALYSE", x: 70, y: 8, angle: 3 },
  { debut: 236, duree: 40, valeur: "0", libelle: "MONTAGE", x: 33, y: 62, accent: true, angle: -2 },
  { debut: 292, duree: 40, valeur: "9:16", libelle: "RECADRÉ TOUT SEUL", x: 66, y: 8, accent: true, angle: 3 },
  { debut: 376, duree: 40, valeur: "SOUS-TITRES", libelle: "INCRUSTÉS", x: 50, y: 8, accent: true, angle: -2 },
  { debut: 424, duree: 46, valeur: "32 s", libelle: "PRÊT À POSTER", x: 50, y: 62, accent: true, angle: 2 },
];

export const Parcours: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const voile = interpolate(frame, [APP_DEB - 8, APP_DEB + 10, APP_FIN - 12, APP_FIN + 6],
    [0, 0.76, 0.76, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const t = frame - APP_DEB;
  const e = spring({ frame: t, fps, config: { damping: 17, stiffness: 200 } });
  const sortie = interpolate(t, [APP_FIN - APP_DEB - 12, APP_FIN - APP_DEB], [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vis = (t >= 0 ? e : 0) * sortie;

  const leg = LEGENDES.find(([a, b]) => t >= a && t < b);

  return (
    <AbsoluteFill style={{ backgroundColor: "#050a07", fontFamily: POLICE }}>
      <Audio src={staticFile("clip-lamenace.mp4")} />

      <Sequence durationInFrames={CLIP} name="Clip">
        <Video
          src={staticFile("clip-lamenace.mp4")}
          style={{ width: "100%", height: "100%", filter: RELEVE }}
          objectFit="cover"
          muted
        />
      </Sequence>

      {/* CETTE SEQUENCE DOIT DEMARRER A APP_DEB, pas a l'image 0. Premiere version :
          elle commencait a 0 et l'encart n'apparaissait qu'a 4 s — mais <Video> lit
          son propre temps depuis le montage de la sequence, donc parcours.mp4 etait
          deja 4 secondes plus loin, en pleine grille de clips. Resultat : le libelle
          « Tu colles le lien » s'affichait sur l'ecran des resultats. */}
      <Sequence from={APP_DEB} durationInFrames={APP_FIN - APP_DEB} name="Le parcours dans l’app">
        <AbsoluteFill style={{ backgroundColor: `rgba(5,10,7,${voile})` }} />

        {vis > 0.01 ? (
          <>
            {/* L'ecran occupe 13 % a 69 % de la hauteur : sous le hook du clip et
                au-dessus du quart bas recouvert par l'interface TikTok. */}
            <AbsoluteFill style={{ alignItems: "center", paddingTop: 240 }}>
              <div style={{
                width: 480, borderRadius: 38, overflow: "hidden",
                border: `3px solid ${VERT}`,
                boxShadow: "0 40px 130px rgba(0,0,0,0.92)",
                opacity: vis,
                transform: `translateY(${interpolate(vis, [0, 1], [55, 0])}px) scale(${interpolate(vis, [0, 1], [0.96, 1])})`,
              }}>
                <ParcoursAccelere />
              </div>
            </AbsoluteFill>

            {leg ? (
              <AbsoluteFill style={{ justifyContent: "flex-start", padding: "1390px 60px 0" }}>
                <Sequence from={leg[0]} durationInFrames={leg[1] - leg[0]} layout="none">
                  <div style={{ opacity: vis }}><Legende texte={leg[2]} /></div>
                </Sequence>
              </AbsoluteFill>
            ) : null}
          </>
        ) : null}
      </Sequence>

      {/* Au-dessus du clip ET de l'encart, mais SOUS le carton final : les
          pastilles s'arretent avec l'image qu'elles commentent. */}
      <Sequence durationInFrames={CLIP} name="Pastilles" layout="none">
        <Pastilles liste={PASTILLES} />
      </Sequence>

      <Sequence from={CLIP} durationInFrames={DUREE_PARCOURS - CLIP} name="Créatis">
        <Punch><CartonFinal clair mention="Sous-titres et recadrage automatiques" /></Punch>
      </Sequence>
    </AbsoluteFill>
  );
};
