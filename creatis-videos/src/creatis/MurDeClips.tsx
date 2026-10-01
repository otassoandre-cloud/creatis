import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill, interpolate, Sequence, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from "remotion";
import { POLICE } from "./police";
import { COULEURS } from "./theme";
import { DUREE_MARCHE, LeMarche } from "./LeMarche";
import { OffreEssai } from "./OffreEssai";

/**
 * LE MUR — 1080x1920, 26 s.
 *
 * ── CE QUE LES VERSIONS PRÉCÉDENTES RATAIENT ─────────────────────────────
 * Soixante-huit vidéos ont été produites, toutes bâties pareil : une accroche,
 * l'application qui travaille dans un téléphone, un clip, un appel à l'action.
 * Elles plafonnent à 800 vues, et aucune inscription ne leur est attribuée.
 *
 * Le défaut n'est pas l'exécution — luminance, cadrage et zones sûres ont été
 * mesurés et corrigés — c'est ce qu'elles montrent. Elles montrent un PROCESSUS :
 * un lien qu'on colle, une barre qui avance, une grille dans une maquette de
 * téléphone pendant quatre secondes. Or la chose impressionnante que fait le
 * produit n'est pas de travailler, c'est de MULTIPLIER : une vidéo entre, neuf
 * clips finis sortent.
 *
 * Cette vidéo ne montre que ça, et sans le dire : une image large qui éclate en
 * neuf clips verticaux qui jouent tous en même temps, sous-titres compris. Il
 * n'y a rien à lire pour comprendre.
 *
 * ── LE MUR EST RÉEL ──────────────────────────────────────────────────────
 * Les neuf vignettes sont les neuf clips qu'une seule analyse a produits le
 * 21/09 sur « J'ai acheté tous les objets des pubs TikTok » d'Amixem, 40 minutes.
 * Ce sont les fichiers exportés par le produit, sans retouche : le recadrage, le
 * suivi de visage et les sous-titres sont les siens. Une grille de vignettes
 * décoratives dirait exactement la même chose et ne prouverait rien.
 *
 * Le dixième clip de cette génération est l'encart sponsorisé de la vidéo
 * d'origine. On n'affiche donc que neuf vignettes et on annonce neuf — la grille
 * se compte à l'écran, et un chiffre qui ne correspond pas à ce qu'on voit est
 * la seule chose qu'un spectateur vérifie vraiment.
 *
 * ── LE DÉCOUPAGE ─────────────────────────────────────────────────────────
 *    0,0 s   la vidéo large, telle qu'elle est sur YouTube
 *    1,5 s   elle éclate en neuf clips qui jouent tous
 *    4,0 s   « 9 clips · 3 minutes »
 *    7,0 s   une vignette prend tout l'écran — trois secondes, pas plus
 *   10,8 s   l'offre d'essai, posée sur le clip qui continue
 */

const FPS = 30;
/* L'ouverture par l'argent precede tout le reste : les 68 videos d'avant
   ouvraient sur le produit et plafonnaient a 800 vues, zero inscrit attribue.
   Un outil n'interesse personne tant qu'on n'a pas dit a quoi il sert de
   gagner. Voir l'en-tete de LeMarche. */
export const DUREE_MUR = DUREE_MARCHE + 480; // 19 s

/** Les neuf clips d'UNE SEULE analyse. L'ordre suit la luminance d'ouverture
    mesurée : les plus claires au centre et en haut, là où l'œil se pose. */
const CLIPS = [
  { f: "mur/01-millionnaire.mp4", t: 2 },
  { f: "mur/02-esport-foot.mp4", t: 4 },
  { f: "mur/03-chiffres.mp4", t: 2 },
  { f: "mur/04-ronaldo.mp4", t: 3 },
  { f: "mur/05-arene.mp4", t: 6 },
  { f: "mur/06-duel.mp4", t: 8 },
  { f: "mur/07-mystery.mp4", t: 5 },
  { f: "mur/08-athletes.mp4", t: 4 },
];

/* LE CHIFFRE OCCUPE LA CASE CENTRALE, il ne se pose plus par-dessus.
 *
 * Une grille 3x3 fait exactement 1080x1920 en tuiles 9:16 — c'est le seul
 * decoupage qui respecte le format des clips. Mais une analyse ne rend pas
 * toujours neuf clips : celle-ci en a rendu huit. Plutot que de laisser une
 * case noire ou de repeter un clip, la case du milieu porte le compte.
 *
 * On y gagne deux fois : le nombre s'adapte a ce que la generation a
 * reellement produit, et il n'a plus besoin d'un assombrissement radial pour
 * rester lisible sur la vignette la plus contrastee du mur. */
const CASE_CHIFFRE = 4;

/** La vignette qui prend ensuite tout l'écran : la plus claire des neuf,
    140 de luminance sur sa première seconde. */
const HEROS = CLIPS[0];

/** Ce que la generation a reellement produit. */
const NB_CLIPS = CLIPS.length;

const SOURCE = "src-esport.mp4";

const ECLAT = DUREE_MARCHE + 45;   // le mur se forme
const PLEIN = DUREE_MARCHE + 210;  // une vignette prend l'écran

/* L'offre se pose à 10,8 s, sur le clip qui continue de tourner derrière elle.
   TROIS SECONDES DE CLIP PLEIN ÉCRAN, pas davantage : la démonstration est
   faite au moment où le mur se forme, et un clip qu'on laisse tourner dix-huit
   secondes après ça n'ajoute rien — il fait juste sortir la vidéo du format.
   Les trois secondes servent à montrer qu'une vignette du mur est un vrai clip
   fini, et c'est tout ce qu'elles ont à faire. */
const OFFRE = DUREE_MARCHE + 324;

/* RACCORD. La vignette retenue joue déjà dans le mur depuis l'image ECLAT ;
   quand elle prend tout l'écran, elle doit reprendre EXACTEMENT où elle en est,
   sinon la coupe saute en arrière. Un premier jet repartait 5 secondes plus tôt
   et le plein écran tombait sur un plan de mains. La position se calcule donc
   au lieu d'être choisie : début de la vignette + le temps écoulé depuis. */
const PLEIN_IMAGE = PLEIN + 24;
const HEROS_A_PLEIN = HEROS.t + (PLEIN_IMAGE - ECLAT) / FPS;

/* Le son suit la même horloge : décalé pour qu'à l'image PLEIN_IMAGE il soit
   pile sur HEROS_A_PLEIN. Sans ça, l'image reprend au bon endroit et la voix a
   une seconde et demie d'avance. */
const AUDIO_DEPART = HEROS.t - ECLAT / FPS;

const contour = {
  WebkitTextStroke: "10px rgba(0,0,0,0.6)",
  paintOrder: "stroke fill" as const,
};

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * LE MUR. Neuf vidéos qui jouent en même temps, en 3x3 — 360x640 chacune, soit
 * exactement 1080x1920. Les vignettes arrivent en quinconce depuis le centre,
 * avec un décalage par rangée : toutes ensemble, le mouvement se lit comme une
 * transition ; décalées, il se lit comme une multiplication.
 */
const Mur: React.FC<{ depart: number }> = ({ depart }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* Neuf cases, huit clips et le compte au milieu. `cases` place chaque clip
     en sautant la case centrale, quel que soit le nombre de clips rendus. */
  const cases: (typeof CLIPS[number] | null)[] = [];
  let k = 0;
  for (let c = 0; c < 9; c++) cases.push(c === CASE_CHIFFRE ? null : CLIPS[k++] ?? null);

  const arrivee = (i: number) => {
    const col = i % 3;
    const ligne = Math.floor(i / 3);
    /* Le décalage part du centre et gagne les bords : le compte est déjà là
       quand les coins arrivent, donc on lit le chiffre avant les images. */
    const distance = Math.abs(col - 1) + Math.abs(ligne - 1);
    return spring({
      frame: frame - depart - distance * 4,
      fps,
      config: { damping: 15, stiffness: 190, mass: 0.55 },
    });
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#04060a", fontFamily: POLICE }}>
      {cases.map((c, i) => {
        const e = arrivee(i);
        const commun = {
          position: "absolute" as const,
          left: (i % 3) * 360,
          top: Math.floor(i / 3) * 640,
          width: 360,
          height: 640,
          overflow: "hidden" as const,
          opacity: Math.min(1, e * 1.6),
          transform: `scale(${interpolate(e, [0, 1], [0.55, 1])})`,
          border: "2px solid rgba(4,6,10,0.9)",
          boxSizing: "border-box" as const,
        };

        if (!c) {
          return (
            <div
              key="compte"
              style={{
                ...commun,
                backgroundColor: "#04120b",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
                border: `3px solid ${COULEURS.vert}`,
              }}
            >
              <div style={{
                fontSize: 136, fontWeight: 900, color: COULEURS.vertClair,
                lineHeight: 0.92, letterSpacing: "-0.05em",
              }}>
                {NB_CLIPS}
              </div>
              <div style={{
                fontSize: 44, fontWeight: 900, color: "#ffffff",
                letterSpacing: "-0.02em", marginTop: 2,
              }}>
                clips prêts
              </div>
              <div style={{
                fontSize: 28, fontWeight: 700, color: "rgba(255,255,255,0.72)",
                marginTop: 10,
              }}>
                en 3 minutes
              </div>
            </div>
          );
        }

        return (
          <div key={c.f} style={commun}>
            <Video
              src={staticFile(c.f)}
              trimBefore={Math.round(c.t * FPS)}
              objectFit="cover"
              muted
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};


/* ────────────────────────────────────────────────────────────────────────── */

export const MurDeClips: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* La vidéo large occupe toute la largeur et flotte au milieu : c'est ce que
     voit quelqu'un qui regarde YouTube sur son téléphone, et c'est l'image
     qu'il doit reconnaître avant que tout se multiplie. */
  const hauteurSource = (1080 * 9) / 16;

  /* La vignette retenue s'agrandit jusqu'à remplir l'écran. Elle part de sa
     place dans la grille — coin haut gauche — donc l'échelle et le décalage
     sont liés : à 3x, son coin supérieur gauche doit venir sur l'origine. */
  const zoom = spring({
    frame: frame - PLEIN,
    fps,
    config: { damping: 19, stiffness: 120, mass: 0.9 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#04060a", fontFamily: POLICE }}>
      {/* Le son du clip retenu tourne d'un bout à l'autre. Les neuf vignettes
          sont muettes : neuf pistes simultanées ne donnent pas du volume, elles
          donnent du bruit. */}
      <Audio src={staticFile(HEROS.f)} trimBefore={Math.round(AUDIO_DEPART * FPS)} />

      {/* LA VIDEO D'ORIGINE TOURNE DES L'IMAGE 0, sous l'ouverture par l'argent.
          Un premier jet ne la demarrait qu'apres : les trois premieres secondes
          etaient un ecran noir a 10 de luminance, contre 116-118 pour la mediane
          du corpus — exactement la seconde ou la serie decroche. Les chiffres se
          posent donc sur une image qui bouge, et ses propres libelles
          n'apparaissent qu'une fois l'ouverture passee. */}
      <Sequence durationInFrames={ECLAT + 12} name="La video d’origine">
        {/* Le même plan, agrandi et flou, remplit les bandes noires. Avec de
            vraies bandes, la première seconde tombait à 30-45 de luminance —
            44 % du cadre en noir — contre 116-118 pour la médiane du corpus, et
            c'est la seconde où se joue la rétention. `objectFit` est une PROP
            de ce composant : dans `style` il est ignoré et la vidéo garde son
            16:9 au lieu de couvrir.

            Le fond reste EN DESSOUS de ce qu'il entoure — un premier jet le
            relevait a 1,5 et la bande nette se perdait dedans. Ici la source est
            un hall d'e-sport, sombre par nature : les deux couches sont relevees
            ensemble (1,05 pour le fond, 1,40 pour l'image nette) en gardant
            l'ecart. Plafond a 1,45, au-dela la peau sature. */}
        <AbsoluteFill>
          <Video
            src={staticFile(SOURCE)}
            objectFit="cover"
            muted
            style={{
              width: "100%",
              height: "100%",
              filter: "blur(46px) brightness(1.05) saturate(1.2)",
              transform: "scale(1.15)",
            }}
          />
        </AbsoluteFill>

        <AbsoluteFill style={{ justifyContent: "center" }}>
          <Video
            src={staticFile(SOURCE)}
            objectFit="cover"
            muted
            style={{
              width: 1080,
              height: hauteurSource,
              filter: "brightness(1.40) saturate(1.06)",
              boxShadow: "0 0 90px rgba(0,0,0,0.55)",
            }}
          />
        </AbsoluteFill>

        {/* Les deux textes se posent DANS les bandes libres, au-dessus et en
            dessous de l'image — pas dessus. Un premier jet les centrait sur la
            vidéo : ils tombaient en plein sur le titre incrusté de la source et
            les deux se rendaient illisibles. */}
        <Sequence from={DUREE_MARCHE} durationInFrames={ECLAT - DUREE_MARCHE + 12} layout="none">
        <AbsoluteFill style={{ alignItems: "center" }}>
          <div
            style={{
              position: "absolute",
              top: 420,
              fontSize: 116,
              fontWeight: 900,
              color: "#ffffff",
              letterSpacing: "-0.045em",
              lineHeight: 1,
              ...contour,
            }}
          >
            1 vidéo
          </div>
          <div
            style={{
              position: "absolute",
              top: 1370,
              fontSize: 52,
              fontWeight: 800,
              color: "rgba(255,255,255,0.92)",
              letterSpacing: "-0.01em",
              ...contour,
            }}
          >
            40 minutes
          </div>
        </AbsoluteFill>
        </Sequence>
      </Sequence>

      {/* ── 1,5 s : le mur ───────────────────────────────────────────────── */}
      {/* L'OUVERTURE PAR L'ARGENT SE POSE APRES la video d'origine dans l'ordre
          du JSX, donc AU-DESSUS d'elle a l'ecran. Placee avant, elle passait
          dessous et disparaissait completement : les trois premieres secondes
          ne montraient qu'un plan d'arene, sans un chiffre. Dans Remotion comme
          en CSS, c'est le dernier ecrit qui peint par-dessus. */}
      <Sequence durationInFrames={DUREE_MARCHE} name="Le marche" layout="none">
        <LeMarche />
      </Sequence>

      <Sequence from={ECLAT} durationInFrames={DUREE_MUR - ECLAT} name="Le mur">
        <AbsoluteFill
          style={{
            transform: `scale(${interpolate(zoom, [0, 1], [1, 3])})`,
            transformOrigin: "180px 320px",
          }}
        >
          <Mur depart={0} />
        </AbsoluteFill>
      </Sequence>

      {/* ── 7 s : la vignette retenue occupe l'écran ──────────────────────── */}
      <Sequence from={PLEIN_IMAGE} durationInFrames={DUREE_MUR - PLEIN_IMAGE} name="Le clip">
        <Video
          src={staticFile(HEROS.f)}
          trimBefore={Math.round(HEROS_A_PLEIN * FPS)}
          objectFit="cover"
          muted
          style={{ width: "100%", height: "100%" }}
        />
      </Sequence>

      <Sequence from={OFFRE} durationInFrames={DUREE_MUR - OFFRE} name="Offre d’essai">
        <OffreEssai duree={DUREE_MUR - OFFRE} />
      </Sequence>
    </AbsoluteFill>
  );
};
