import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  Series,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { OffreEssai } from "./OffreEssai";
import { POLICE } from "./police";
import { COULEURS } from "./theme";

/**
 * DU DÉBUT À LA FIN — 1080x1920, 20,4 s.
 *
 * Une seule prise de l'application, filmée en entier : le lien collé, l'analyse,
 * la grille des clips, le clip ouvert, l'export lancé, et le fichier qui sort.
 * Rien d'autre. Pas d'ouverture fabriquée, pas de chiffre de marché, pas de
 * montage qui raconte le produit — le produit fait la démonstration lui-même.
 *
 * ── POURQUOI CELLE-CI EST DIFFÉRENTE DES 68 AUTRES ───────────────────────
 * Les précédentes montraient l'application dans un encart de 480 px posé sur un
 * clip, entourée de pastilles et de légendes. C'était une PUBLICITÉ qui parlait
 * d'un logiciel. Ici l'enregistrement occupe tout le cadre : ce que voit le
 * spectateur, c'est un écran de téléphone comme le sien, où quelqu'un colle une
 * URL et récupère un fichier. Le seul texte ajouté est l'accroche.
 *
 * ── LA PREMIÈRE VERSION S'ARRÊTAIT TROP TÔT ──────────────────────────────
 * `enregistrer-parcours.mjs` coupait à l'ouverture de la fiche du clip, donc
 * juste AVANT la seule étape qui produit quelque chose. Une démonstration qui
 * s'arrête avant le résultat ne démontre rien. Le script va maintenant jusqu'au
 * téléchargement, et garde le fichier obtenu.
 *
 * ── POURQUOI LA FIN N'EST PAS L'ENREGISTREMENT ───────────────────────────
 * Dans le lecteur du téléphone, le clip fini occupe 192 x 336 pixels. L'agrandir
 * jusqu'à 1080 demanderait un facteur 5,6. On coupe donc sur le MP4 que l'export
 * vient de produire, en 1080x1920 natif : même fichier, même instant, pleine
 * définition. La continuité est réelle, pas suggérée.
 *
 * ── L'ACCROCHE DOIT COMPTER JUSTE ────────────────────────────────────────
 * « tu reçois N clips » : N est le nombre affiché par l'application dans la
 * prise filmée — le bandeau « N clips prêts » le dit à l'écran. Le nombre varie
 * d'une analyse à l'autre (10, 8, 8 puis 4 sur la même source), donc il se
 * relève sur l'enregistrement, il ne se décide pas à l'avance. Un chiffre qui ne
 * correspond pas à ce qu'on voit est la seule chose qu'un spectateur vérifie.
 *
 * ── ZONES SÛRES DE TIKTOK, sur 1080x1920 ─────────────────────────────────
 *   0 -> 16 %    barre d'état, onglets, loupe        (307 px)
 *   16 -> 78 %   zone libre                          (307 -> 1498 px)
 *   > 78 %       légende, pseudo, bandeau musical
 * L'accroche vit entre 17 % et 30 %. Plus haut elle passe sous la loupe ; plus
 * bas elle couvre le champ d'URL, c'est-à-dire précisément ce qu'elle annonce.
 *
 * ── LIVRÉE MUETTE ────────────────────────────────────────────────────────
 * Aucune piste son : le son tendance se pose dans l'application au moment de
 * publier. Une vidéo muette pendant quatorze secondes puis sonore à la fin
 * s'entend comme un défaut.
 */

const FPS = 30;

export type ReglageRec = {
  /** Enregistrement Playwright brut, 576x1024 (GRAND=1), 25 i/s. */
  enregistrement: string;
  /** Le MP4 que l'export a produit pendant cette même prise, 1080x1920. */
  clipRendu: string;
  /** Seconde du clip où commence la fenêtre montrée. */
  clipDebut: number;
  /** Filtre appliqué au clip — relèvement mesuré, jamais deviné. */
  releve: string;
  /**
   * Secondes relevées image par image sur l'enregistrement.
   *   lien    le lien est dans le champ, avant le clic
   *   analyse l'écran d'analyse démarre
   *   grille  les vignettes apparaissent
   *   fiche   la fiche du clip s'ouvre
   *   rendu   l'export est lancé, la barre monte
   *   fini    l'aperçu 9:16 s'affiche dans le lecteur
   */
  reperes: {
    lien: number;
    analyse: number;
    grille: number;
    fiche: number;
    rendu: number;
    fini: number;
  };
  /** Ce que l'application a réellement affiché : « N clips prêts ». */
  nbClips: number;
};

/* Le découpage en images. Chaque phase couvre un intervalle réel connu en un
   nombre d'images connu : la vitesse est le rapport des deux, jamais une valeur
   devinée. Les proportions disent ce qui compte — la grille et l'export ont
   presque le double des autres, l'attente de l'analyse est la plus comprimée. */
const P1 = 54; // le lien collé              1,8 s
const P2 = 84; // l'analyse                  2,8 s
const P3 = 126; // les clips apparaissent    4,2 s
const P4 = 54; // la fiche s'ouvre           1,8 s
const P5 = 114; // l'export monte            3,8 s
const APP = P1 + P2 + P3 + P4 + P5; // 432 images, 14,4 s

const CLIP = 180; // le fichier obtenu, plein cadre, 6 s

export const DUREE_REC = APP + CLIP; // 612 images, 20,4 s

/* L'accroche disparaît une seconde après l'apparition de la grille. Elle reste
   donc à l'écran pendant que la promesse se vérifie — « tu reçois N clips » et
   l'en-tête « N clips viraux trouvés » sont lisibles ensemble — puis elle sort.
   Une version précédente la réduisait au lieu de l'effacer : la petite ligne
   tombait sur « CLIQUE SUR UN CLIP POUR LE PERSONNALISER », et deux textes
   superposés se lisent moins bien qu'un seul. L'écran se suffit ensuite. */
const BASCULE = P1 + P2 + 40;

const contour = {
  WebkitTextStroke: "11px rgba(0,0,0,0.66)",
  paintOrder: "stroke fill" as const,
};

/**
 * PIÈGE CONNU : `trimBefore` compte en images de la COMPOSITION (30 i/s), pas
 * de l'enregistrement (25 i/s). Une première version avait converti avec 25, et
 * la phase « tes clips sont prêts » montrait encore l'écran d'analyse.
 *
 * `layout="none"` sur chaque séquence : sans lui, `Series.Sequence` enveloppe
 * ses enfants dans un conteneur absolu qui ne contribue plus à la hauteur.
 */
const Enregistrement: React.FC<{ reglage: ReglageRec }> = ({ reglage }) => {
  const src = staticFile(reglage.enregistrement);
  const { reperes: r } = reglage;

  const phase = (debut: number, fin: number, images: number) => ({
    trimBefore: Math.round(debut * FPS),
    playbackRate: (fin - debut) / (images / FPS),
  });

  const plans: [number, ReturnType<typeof phase>][] = [
    [P1, phase(r.lien, r.analyse, P1)],
    [P2, phase(r.analyse, r.grille, P2)],
    [P3, phase(r.grille, r.fiche, P3)],
    [P4, phase(r.fiche, r.rendu, P4)],
    [P5, phase(r.rendu, r.fini, P5)],
  ];

  return (
    <Series>
      {plans.map(([images, p], i) => (
        <Series.Sequence key={i} durationInFrames={images} layout="none">
          <Video
            src={src}
            style={{ width: "100%", height: "100%" }}
            objectFit="cover"
            muted
            {...p}
          />
        </Series.Sequence>
      ))}
    </Series>
  );
};

/* L'accroche. Blanche à contour noir plutôt que posée sur un bandeau : le
   bandeau masquerait l'interface, et c'est l'interface qui prouve. L'application
   est en thème sombre, un blanc cerné de noir y tient sans rien cacher. */
const Accroche: React.FC<{ nbClips: number }> = ({ nbClips }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const e = spring({ frame, fps, config: { damping: 15, stiffness: 210, mass: 0.6 } });
  /* Sortie en fondu court et vers le haut : assez rapide pour ne pas traîner sur
     les vignettes, assez visible pour que l'œil comprenne que le texte s'en va
     plutôt que de se demander s'il a cligné. */
  const sortie = interpolate(frame, [BASCULE, BASCULE + 16], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        paddingTop: 340,
        opacity: sortie,
        transform: `translateY(${interpolate(sortie, [0, 1], [-22, 0])}px)`,
      }}
    >
      <div
        style={{
          textAlign: "center",
          lineHeight: 1.06,
          letterSpacing: "-0.035em",
          fontWeight: 900,
          fontSize: 90,
          color: "#ffffff",
          opacity: Math.min(1, e * 1.3),
          transform: `translateY(${interpolate(e, [0, 1], [-26, 0])}px)`,
          ...contour,
        }}
      >
        Tu colles une URL
        <br />
        <span style={{ color: COULEURS.vertClair }}>
          tu reçois {nbClips} clips
        </span>
      </div>
    </AbsoluteFill>
  );
};

export const DuDebutALaFin: React.FC<{ reglage: ReglageRec }> = ({ reglage }) => {
  const debutClip = Math.round(reglage.clipDebut * FPS);

  /* L'offre se pose sur le clip qui tourne encore. Un carton plein coupe net au
     moment précis où la complétion décide de la portée. */
  const OFFRE = DUREE_REC - 90;

  return (
    <AbsoluteFill style={{ backgroundColor: "#050a07", fontFamily: POLICE }}>
      <Sequence durationInFrames={APP} name="L’application, en entier" layout="none">
        <Enregistrement reglage={reglage} />
      </Sequence>

      {/* Coupe franche sur le fichier obtenu. Pas de fondu : le fondu suggère
          un rapprochement, la coupe affirme que c'est le même objet. */}
      <Sequence from={APP} durationInFrames={CLIP} name="Le clip obtenu">
        <Video
          src={staticFile(reglage.clipRendu)}
          trimBefore={debutClip}
          style={{ width: "100%", height: "100%", filter: reglage.releve }}
          objectFit="cover"
          muted
        />
      </Sequence>

      <Sequence durationInFrames={APP} name="Accroche" layout="none">
        <Accroche nbClips={reglage.nbClips} />
      </Sequence>

      <Sequence from={OFFRE} durationInFrames={DUREE_REC - OFFRE} name="Offre">
        <OffreEssai duree={DUREE_REC - OFFRE} />
      </Sequence>
    </AbsoluteFill>
  );
};

/* Les réglages de la prise. `reperes` et `nbClips` se relèvent sur
   l'enregistrement une fois qu'il existe — `reperes-parcours.mjs` donne les
   secondes, le bandeau « N clips prêts » donne le nombre. Les valeurs
   ci-dessous sont celles de la dernière prise. */
export const REC_DEFAUT: ReglageRec = {
  enregistrement: "rec-complet.mp4",
  clipRendu: "clip-rendu.mp4",
  clipDebut: 0,
  releve: "saturate(1.04)",
  reperes: { lien: 12, analyse: 16, grille: 150, fiche: 158, rendu: 166, fini: 235 },
  nbClips: 10,
};
