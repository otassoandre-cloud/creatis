import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill, interpolate, Sequence, Series, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from "remotion";
import { POLICE } from "./police";
import { AppelCommentaire } from "./AppelCommentaire";
import { Pastille, Pastilles } from "./Pastilles";
import { DUREE_TRANSFORMATION, Transformation } from "./Transformation";

/**
 * PARCOURS COMPLET — 1080x1920, 26,3 s.
 *
 * Le trajet en entier, filmé dans la vraie application : la transformation en
 * ouverture, le lien collé, l'analyse, la grille des clips, le clic sur l'un
 * d'eux, ce clip en plein écran, et l'appel à commenter.
 *
 * ── TOUT EST RÉEL ─────────────────────────────────────────────────────────
 * `enregistrer-parcours.mjs` filme une vraie session Playwright sur creatis.app
 * avec un vrai compte ; `exporter-clip.mjs` produit ensuite le clip montré en
 * empruntant les mêmes routes que le studio. La correspondance entre les
 * vignettes de la grille et le clip final n'est pas un montage : c'est la même
 * génération, le même intervalle de la même vidéo.
 *
 * ── LES SOURCES SONT DU DIVERTISSEMENT, ET C'EST UNE RÈGLE ───────────────
 * Amixem, Squeezie, McFly & Carlito. Jamais de politique, d'actualité ni
 * d'enquête, même quand ces sources mesurent mieux : la cible est le créateur
 * de contenu, et un clip d'actualité fait juger la marque sur le sujet du clip
 * plutôt que sur l'outil.
 *
 * ── CE QUE LE SCORE DE L'IA NE DIT PAS ───────────────────────────────────
 * Le 17/09, le clip le mieux noté d'une génération — 91 — était une lettre
 * d'exclusion filmée en gros plan : 234 de luminance, aucun visage, aucun
 * mouvement. Le score dit ce qui se RACONTE, pas ce qui se REGARDE. On ouvre le
 * clip avant de le monter, systématiquement.
 *
 * ── LUMINANCE ─────────────────────────────────────────────────────────────
 * Médiane du corpus des clips qui performent : 116-118, et c'est la PREMIÈRE
 * SECONDE qui décide. `mesurer-luminance.mjs` donne le profil seconde par
 * seconde et la meilleure fenêtre ; `releve` porte le relèvement, plafonné à
 * x1,45 — au-delà la peau sature (0,4 % de pixels saturés à 1,35, 2,0 % à 1,50).
 *
 * ── PLUS D'INCRUSTATION DE RÉACTION ──────────────────────────────────────
 * La vignette avec le visage du fondateur a été retirée le 18/09. Elle occupait
 * le haut gauche pendant 3,7 s, c'est-à-dire exactement la fenêtre où se joue
 * maintenant la démonstration de recadrage — deux choses à regarder au même
 * endroit, au moment où il ne faut en regarder qu'une.
 *
 * ── ZONES SÛRES DE TIKTOK, mesurées sur 1080x1920 ────────────────────────
 *   0 -> 16 %    barre d'état, onglets, loupe
 *   16 -> 78 %   zone libre
 *   > 78 %       légende, pseudo, bandeau musical
 *   x > 78 % et y entre 45 % et 88 % : la colonne de boutons de droite
 */

/* ── Réglages d'une vidéo ─────────────────────────────────────────────────
 * Un seul objet par vidéo : les trois compositions partagent tout le reste.
 * Avant, chaque nouvelle version demandait de recalculer quatre `playbackRate`
 * à la main — et je me suis trompé trois fois de suite, avec pour résultat un
 * libellé qui commentait l'écran précédent. Les vitesses se DÉDUISENT
 * désormais des repères : il n'y a plus que des secondes à relever. */
export type ReglageParcours = {
  /** Enregistrement Playwright brut, 480x816, 25 i/s. */
  enregistrement: string;
  /** Clip fini, 1080x1920, sous-titres incrustés. */
  clip: string;
  /** Segment brut 16:9, même intervalle que le clip. */
  source: string;
  /** Début de la fenêtre montrée, en secondes du clip. */
  clipDebut: number;
  /** Filtre appliqué au clip — relèvement mesuré. */
  releve: string;
  /** Secondes relevées image par image sur l'enregistrement. */
  reperes: { lien: number; analyse: number; grille: number; modale: number; fin: number };
  /** Ce qu'affichent les pastilles. Chaque valeur vient de CETTE génération. */
  chiffres: { source: string; analyse: string; clip: string };
};

const FPS = 30;

/* L'ouverture (48 images) précède tout le reste ; les repères ci-dessous sont
   donc décalés d'autant par rapport aux versions d'avant le 18/09. */
export const DUREE_PARCOURS = DUREE_TRANSFORMATION + 741; // 26,3 s

const APP_DEB = DUREE_TRANSFORMATION + 72;   // l'encart de l'application apparait
const APP_FIN = APP_DEB + 300;               // il disparait
/* L'appel à commenter se pose sur le clip, qui continue de tourner derrière lui
   jusqu'à la dernière image. Six secondes, et pas moins : il demande un GESTE,
   pas une lecture. */
const APPEL = DUREE_PARCOURS - 180;

const VERT = "#10b981";

/* Ce que l'on est en train de voir, aligné sur les quatre vitesses du parcours.
   Les bornes épousent exactement les durées des séquences ci-dessous : le
   libellé affiché correspond donc toujours à ce qui est montré. */
const LEGENDES: [number, number, string][] = [
  [0, 48, "Tu colles le lien"],
  [48, 126, "L’IA analyse la vidéo"],
  [126, 300, "Tes clips sont prêts"],
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
 * L'enregistrement est le fichier BRUT de Playwright — 25 i/s, non monté.
 * Le garder brut évite un ré-encodage et permet de recaler les vitesses sans
 * refilmer. (Le ffmpeg livré avec Remotion n'embarque pas `setpts`, de toute
 * façon.)
 *
 * PIÈGE : `trimBefore` compte en images de la COMPOSITION (30 i/s), pas de
 * l'enregistrement (25 i/s). Un premier jet avait converti avec 25, et la phase
 * « clips prêts » montrait encore l'écran d'analyse, 36 secondes trop tôt. La
 * conversion est donc : secondes x 30.
 *
 * LA SECTION S'ARRÊTE SUR LA GRILLE, elle ne montre plus l'ouverture du clip.
 * Deux raisons. D'abord la grille est le seul plan qui DÉMONTRE quelque chose —
 * des vignettes, des notes, des durées, en nombre — et tant qu'elle partageait
 * sa séquence avec la modale elle ne tenait qu'une seconde et demie. Ensuite la
 * modale affichait le titre du clip ouvert par le script, c'est-à-dire toujours
 * le premier de la liste : montrer ensuite un autre clip de la même grille —
 * parce que celui-là ne contient aucun visage, ce qui arrive souvent — aurait
 * créé une contradiction à l'écran. En s'arrêtant sur la grille, la vidéo ne
 * prétend rien sur LEQUEL des clips on va voir, et n'importe lequel d'entre eux
 * est un choix exact.
 *
 * `layout="none"` sur chaque séquence : sans lui, `Series.Sequence` enveloppe
 * ses enfants dans un conteneur en position absolue qui ne contribue plus à la
 * hauteur. L'encart, dimensionné par son contenu, s'effondrait à quelques
 * pixels — au rendu on ne voyait qu'un trait vert.
 */
const ParcoursAccelere: React.FC<{ reglage: ReglageParcours }> = ({ reglage }) => {
  const { enregistrement, reperes } = reglage;
  const src = staticFile(enregistrement);

  /* Chaque phase couvre un intervalle réel connu en un nombre d'images connu :
     la vitesse est le rapport des deux, jamais une valeur devinée. */
  const phase = (debut: number, fin: number, images: number) => ({
    trimBefore: Math.round(debut * FPS),
    playbackRate: (fin - debut) / (images / FPS),
  });

  const p1 = phase(reperes.lien, reperes.analyse, 48);
  const p2 = phase(reperes.analyse, reperes.grille, 78);
  const p3 = phase(reperes.grille, reperes.modale, 174);

  return (
    <Series>
      <Series.Sequence durationInFrames={48} layout="none">
        <Video src={src} style={{ width: "100%", display: "block" }} {...p1} muted />
      </Series.Sequence>
      <Series.Sequence durationInFrames={78} layout="none">
        <Video src={src} style={{ width: "100%", display: "block" }} {...p2} muted />
      </Series.Sequence>
      <Series.Sequence durationInFrames={174} layout="none">
        <Video src={src} style={{ width: "100%", display: "block" }} {...p3} muted />
      </Series.Sequence>
    </Series>
  );
};

/* Les pastilles. Chaque valeur vient de la génération filmée derrière.
 *
 * Ni le NOMBRE de clips ni le SCORE n'y figurent : les deux varient d'une
 * analyse à l'autre — 10, 8, 8 puis 4 sur la même vidéo — donc les graver dans
 * une vidéo qui resservira demain en ferait des chiffres faux. Ce qui est
 * constant est affiché : la durée de la source, celle de l'analyse, le format
 * de sortie, la durée du clip. La grille filmée, elle, compte toute seule.
 *
 * PLACEMENT. Tant que l'encart est à l'écran, elles occupent les marges
 * latérales qu'il laisse libres : il fait 480 px de large et il est centré,
 * donc rien entre x = 0 et 28 %, ni entre 72 % et 100 %. Une fois l'encart
 * parti, le cadre est libre et elles se centrent — à 63 % de hauteur, sur le
 * buste : le recadrage 9:16 place la tête entre 15 % et 45 %, et une pastille
 * posée là tombe en plein visage. */
const pastilles = (r: ReglageParcours, d: number): Pastille[] => [
  { debut: d + 10, duree: 36, valeur: r.chiffres.source, libelle: "DE VIDÉO", x: 21, y: 22, angle: -3 },
  { debut: d + 58, duree: 36, valeur: r.chiffres.analyse, libelle: "D'ANALYSE", x: 78, y: 31, angle: 3 },
  { debut: d + 132, duree: 42, valeur: "0", libelle: "MONTAGE", x: 76, y: 41, accent: true, angle: -2 },
  { debut: d + 210, duree: 42, valeur: "9:16", libelle: "RECADRÉ TOUT SEUL", x: 78, y: 24, accent: true, angle: 3 },
  { debut: d + 306, duree: 36, valeur: "SOUS-TITRES", libelle: "INCRUSTÉS", x: 50, y: 63, accent: true, angle: -2 },
  { debut: d + 346, duree: 35, valeur: r.chiffres.clip, libelle: "PRÊT À POSTER", x: 50, y: 63, accent: true, angle: 2 },
];

export const Parcours: React.FC<{ reglage: ReglageParcours }> = ({ reglage }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const debutClip = Math.round(reglage.clipDebut * FPS);

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
      {/* Le son du clip tourne d'un bout à l'autre, y compris sous l'ouverture :
          la source brute et le clip couvrent le MÊME intervalle de la même
          vidéo, donc rien ne saute au passage de l'une à l'autre. Sans cette
          piste, les huit secondes d'interface seraient muettes. */}
      <Audio src={staticFile(reglage.clip)} trimBefore={debutClip} />

      {/* Le clip tourne jusqu'à la DERNIÈRE image : l'appel à commenter se pose
          par-dessus lui, donc plus rien ne doit l'interrompre. */}
      <Sequence durationInFrames={DUREE_PARCOURS} name="Clip">
        <Video
          src={staticFile(reglage.clip)}
          trimBefore={debutClip}
          style={{ width: "100%", height: "100%", filter: reglage.releve }}
          objectFit="cover"
          muted
        />
      </Sequence>

      {/* L'ouverture recouvre tout : elle montre d'où vient ce clip. */}
      <Sequence durationInFrames={DUREE_TRANSFORMATION} name="Transformation">
        <Transformation source={reglage.source} releve={reglage.releve} />
      </Sequence>

      {/* CETTE SÉQUENCE DOIT DÉMARRER À APP_DEB, pas à l'image 0 : <Video> lit
          son propre temps depuis le montage de sa séquence, donc démarrer à 0
          ferait défiler l'enregistrement pendant que l'encart est encore
          invisible — le libellé « Tu colles le lien » s'affichait alors sur
          l'écran des résultats. */}
      <Sequence from={APP_DEB} durationInFrames={APP_FIN - APP_DEB} name="Le parcours dans l’app">
        <AbsoluteFill style={{ backgroundColor: `rgba(5,10,7,${voile})` }} />

        {vis > 0.01 ? (
          <>
            {/* L'encart commençait à 12,5 % : son bandeau supérieur passait donc
                SOUS la barre de recherche de TikTok. Il démarre à 16 % (307 px)
                et finit à 58,5 % (1 123 px), entièrement dans la zone libre. */}
            <AbsoluteFill style={{ alignItems: "center", paddingTop: 307 }}>
              <div style={{
                width: 480, borderRadius: 38, overflow: "hidden",
                border: `3px solid ${VERT}`,
                boxShadow: "0 40px 130px rgba(0,0,0,0.92)",
                opacity: vis,
                transform: `translateY(${interpolate(vis, [0, 1], [55, 0])}px) scale(${interpolate(vis, [0, 1], [0.96, 1])})`,
              }}>
                <ParcoursAccelere reglage={reglage} />
              </div>
            </AbsoluteFill>

            {leg ? (
              <AbsoluteFill style={{ justifyContent: "flex-start", padding: "1230px 60px 0" }}>
                <Sequence from={leg[0]} durationInFrames={leg[1] - leg[0]} layout="none">
                  <div style={{ opacity: vis }}><Legende texte={leg[2]} /></div>
                </Sequence>
              </AbsoluteFill>
            ) : null}
          </>
        ) : null}
      </Sequence>

      {/* Au-dessus du clip ET de l'encart, mais sous l'appel final : les
          pastilles s'arrêtent avec l'image qu'elles commentent. */}
      <Sequence from={DUREE_TRANSFORMATION} durationInFrames={APPEL - DUREE_TRANSFORMATION}
        name="Pastilles" layout="none">
        <Pastilles liste={pastilles(reglage, 0)} />
      </Sequence>

      {/* L'appel à commenter remplace « creatis.app » : une adresse oblige à
          sortir de l'application pour agir, un commentaire se tape sans quitter
          l'écran — et il pousse la vidéo à d'autres spectateurs par-dessus le
          marché. Voir l'en-tête d'AppelCommentaire. */}
      <Sequence from={APPEL} durationInFrames={DUREE_PARCOURS - APPEL} name="Appel a commenter">
        <AppelCommentaire duree={DUREE_PARCOURS - APPEL} />
      </Sequence>
    </AbsoluteFill>
  );
};
