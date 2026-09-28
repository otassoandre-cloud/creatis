import { Video } from "@remotion/media";
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
import { COULEURS } from "./theme";

/**
 * LE TRI — Reel vertical 1080x1920, 21 s, MUET.
 *
 * ── POURQUOI CET ANGLE, ET PAS UN DE PLUS ────────────────────────────────
 * Le compte @andre.creatis porte 69 publications pour 92 abonnés. En les
 * relisant toutes le 28/09, elles disent la même chose :
 *   « le clipping rentable en 3 étapes simple »   (4 fois)
 *   « une commande vocale, 10 clips »             (5 fois)
 *   « clips générés automatiquement », « en 1 clic », « zéro montage »
 *
 * Soixante-neuf posts qui promettent la disparition du travail, et 92 abonnés.
 * Refaire le soixante-dixième serait refaire la même vidéo avec d'autres mots.
 *
 * Celui-ci dit l'inverse, et c'est le seul angle que l'enregistrement du jour
 * permet de PROUVER : l'IA note les clips — 92, 90, 88, 86, 85, lisibles à
 * l'écran — mais elle ne choisit pas. Le tri reste humain. C'est vrai, ça
 * n'a jamais été dit sur ce compte, et ça répond au vrai problème mesuré :
 * 72 % des utilisateurs font UNE génération et ne reviennent pas, parce qu'ils
 * attendaient de la magie et reçoivent une liste à trier.
 *
 * ── MUET, VOLONTAIREMENT ─────────────────────────────────────────────────
 * Les posts organiques sont livrés SANS bande-son : le son tendance est posé
 * dans l'application au moment de publier. Une voix off synthétique a déjà été
 * refusée. Le clip incrusté est donc coupé, lui aussi.
 *
 * ── POURQUOI LES NOTES SONT ÉCRITES, ET PAS RECADRÉES ────────────────────
 * L'enregistrement du jour est en 1920x1080. Extraire une fenêtre 9:16 d'une
 * source paysage ne conserve que 607 px de large sur 1920 — 56 % de l'image
 * jetée, puis 1,8x d'agrandissement pour remplir le cadre. Les notes
 * deviendraient illisibles au moment précis où elles sont le sujet.
 *
 * On fait donc l'inverse : l'enregistrement est POSÉ comme une carte, à sa
 * largeur naturelle réduite (rétrécissement, donc net), et les notes sont
 * composées en typographie par-dessus. C'est ce que fait n'importe quel Reel
 * qui marche : la capture donne le contexte, le texte porte le message.
 *
 * ── ZONES SÛRES, mesurées sur 1080x1920 ──────────────────────────────────
 *   0 -> 16 %    barre d'état, onglets, loupe
 *   16 -> 78 %   zone libre
 *   > 78 %       légende, pseudo, bandeau musical
 *   x > 78 % et y entre 45 % et 88 % : la colonne de boutons de droite
 * Tout le texte tient donc entre 16 % et 78 %.
 */

const FPS = 30;
export const DUREE_LE_TRI = 21 * FPS; // 630 images

/** Bornes des quatre temps, en secondes. */
const T = {
  notes: 0,       // les cinq notes apparaissent
  bascule: 5.5,   // « elle ne choisit pas à ta place »
  preuve: 8.5,    // le clip choisi, plein cadre
  chute: 17.5,    // « le tri, c'est toi »
  fin: 21,
};

/** Relevées sur la grille de l'enregistrement du 28/09 — visibles à l'écran. */
const NOTES = [92, 90, 88, 86, 85];

/**
 * La fenêtre utile de l'enregistrement, en pixels de la source 1920x1080.
 *
 * Mesurée en posant une grille de repères tous les 10 % sur l'image de 88 s :
 * les cinq vignettes vont de x 429 à 1312 et de y 152 à 568. Tout le reste est
 * du vide — une fenêtre de bureau a de larges marges noires.
 *
 * Un premier jet posait l'écran ENTIER dans la carte. Résultat : un rectangle
 * sombre de 888 px de large où plus rien n'était identifiable, qui occupait un
 * cinquième du Reel sans rien démontrer. On garde donc la zone utile, titre
 * « 5 clips viraux trouvés » compris, parce que ce titre EST l'argument.
 *
 * 930 px de source rendus sur 888 : x0,95, un rétrécissement. Rien n'est
 * agrandi, donc rien ne se délave.
 */
const CADRE = { x: 400, y: 30, l: 930, h: 550 };

export type ReglageLeTri = {
  /** Enregistrement 1920x1080 du parcours, posé comme carte. */
  grille: string;
  /** Seconde de l'enregistrement où la grille est peinte (PAS le repère du script). */
  grilleA: number;
  /** Clip vertical exporté le même jour, 1080x1920. */
  clip: string;
  /** Seconde de départ dans le clip. */
  clipA: number;
};

export const LE_TRI_DEFAUT: ReglageLeTri = {
  grille: "rec-youtube-2809-h264.mp4",
  /* 88 s, pas les 75,3 s du fichier de repères : celui-ci se pose quand le
     sélecteur entre dans le DOM, la grille n'est peinte qu'à 87 s. Vérifié sur
     une planche contact, une image toutes les 4 secondes. */
  grilleA: 88,
  clip: "clip-train-2809.mp4",
  clipA: 0,
};

/** Titre au-dessus de la carte. Même graisse partout, une seule idée par écran. */
const Titre: React.FC<{ texte: string; opacite: number; y: number }> = ({ texte, opacite, y }) => (
  <div
    style={{
      position: "absolute",
      top: `${y}%`,
      left: 96,
      right: 96,
      opacity: opacite,
      color: COULEURS.texte,
      fontSize: 84,
      fontWeight: 800,
      lineHeight: 1.08,
      letterSpacing: -1,
      textAlign: "center",
    }}
  >
    {texte}
  </div>
);

export const LeTri: React.FC<{ reglage?: ReglageLeTri }> = ({
  reglage = LE_TRI_DEFAUT,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = frame / fps;

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond, fontFamily: POLICE }}>
      {/* ───────── 1. LES NOTES ───────── */}
      <Sequence from={0} durationInFrames={Math.round(T.bascule * fps)} name="Les notes">
        <BlocNotes reglage={reglage} />
      </Sequence>

      {/* ───────── 2. LA BASCULE ───────── */}
      <Sequence
        from={Math.round(T.bascule * fps)}
        durationInFrames={Math.round((T.preuve - T.bascule) * fps)}
        name="Elle ne choisit pas"
      >
        <BlocBascule />
      </Sequence>

      {/* ───────── 3. LA PREUVE ───────── */}
      <Sequence
        from={Math.round(T.preuve * fps)}
        durationInFrames={Math.round((T.chute - T.preuve) * fps)}
        name="Le clip choisi"
      >
        <AbsoluteFill>
          <Video
            src={staticFile(reglage.clip)}
            trimBefore={Math.round(reglage.clipA * FPS)}
            style={{ width: "100%", height: "100%" }}
            objectFit="cover"
            /* MUET : le son tendance est posé dans l'application. */
            muted
          />
          {/* Rappel discret de ce qu'on regarde : sans lui, neuf secondes de
              clip ressemblent à n'importe quel extrait volé sur YouTube. */}
          <div
            style={{
              position: "absolute",
              top: "17%",
              left: 0,
              right: 0,
              textAlign: "center",
              opacity: interpolate(s - T.preuve, [0, 0.4, 3.2, 3.8], [0, 1, 1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            <span
              style={{
                background: COULEURS.vert,
                color: "#04150d",
                padding: "12px 26px",
                borderRadius: 12,
                fontSize: 46,
                fontWeight: 800,
              }}
            >
              Celui noté 92
            </span>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ───────── 4. LA CHUTE ───────── */}
      <Sequence from={Math.round(T.chute * fps)} name="Le tri, c'est toi">
        <BlocChute />
      </Sequence>
    </AbsoluteFill>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   Bloc 1 — la carte de l'enregistrement, et les cinq notes qui tombent.
   ───────────────────────────────────────────────────────────────────────── */
const BlocNotes: React.FC<{ reglage: ReglageLeTri }> = ({ reglage }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const s = frame / fps;

  /* PAS de fondu depuis zero. Instagram prend la PREMIERE IMAGE comme
     couverture du Reel : avec une entree en fondu, la vignette de la grille
     etait noire, et le fil s'ouvrait sur un ecran vide pendant trois dixiemes
     de seconde — exactement la ou se joue la retention. Le titre est donc lisible
     des l'image zero, et il ne reste qu'un leger tassement. */
  const entree = interpolate(frame, [0, 8], [0.92, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /* La carte montre la FENÊTRE UTILE, pas l'écran entier. On agrandit la vidéo
     au facteur qui fait tenir `CADRE.l` dans la largeur disponible, puis on la
     décale pour amener le coin haut-gauche du cadre à l'origine du conteneur,
     qui coupe le reste. */
  const largeurCarte = width - 96 * 2;
  const k = largeurCarte / CADRE.l;
  const hauteurCarte = Math.round(CADRE.h * k);

  return (
    <AbsoluteFill>
      <Titre texte="L'IA met une note à chaque clip." opacite={1} y={17} />

      <div
        style={{
          position: "absolute",
          top: "33%",
          left: 96,
          width: largeurCarte,
          height: hauteurCarte,
          /* `position: absolute` suffit : il etablit deja le bloc conteneur
             dont depend le decalage de la video recadree a l'interieur. Une
             seconde declaration `relative` avait ete ajoutee ici par reflexe —
             derniere gagnante en litteral objet, elle ecrasait l'absolue. */
          borderRadius: 20,
          overflow: "hidden",
          border: `2px solid ${COULEURS.ligne}`,
          opacity: entree,
          transform: `translateY(${interpolate(entree, [0.92, 1], [8, 0])}px)`,
        }}
      >
        <Video
          src={staticFile(reglage.grille)}
          trimBefore={Math.round(reglage.grilleA * FPS)}
          style={{
            position: "absolute",
            width: 1920 * k,
            height: 1080 * k,
            left: -CADRE.x * k,
            top: -CADRE.y * k,
            maxWidth: "none",
          }}
          muted
        />
      </div>

      {/* Les cinq notes, une par une. Elles sont écrites ici et non lues dans
          l'enregistrement : à cette échelle, celles de la capture feraient
          onze pixels sur un téléphone. Les valeurs sont celles de l'écran. */}
      <div
        style={{
          position: "absolute",
          /* 63 % et non 56 % : la carte descend jusqu'a 60,3 % (525 px de haut
             posee a 33 %), et les chiffres lui passaient dessus — en masquant
             precisement la rangee de notes qu'ils reprennent. */
          top: "63%",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 22,
        }}
      >
        {NOTES.map((n, i) => {
          const debut = 1.1 + i * 0.42;
          const a = spring({
            frame: frame - Math.round(debut * fps),
            fps,
            config: { damping: 14, stiffness: 180 },
            durationInFrames: 16,
          });
          return (
            <div
              key={n}
              style={{
                opacity: a,
                transform: `scale(${interpolate(a, [0, 1], [0.6, 1])})`,
                color: i === 0 ? COULEURS.vert : COULEURS.texte,
                fontSize: i === 0 ? 118 : 92,
                fontWeight: 800,
                letterSpacing: -3,
              }}
            >
              {n}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          top: "73%",
          left: 96,
          right: 96,
          textAlign: "center",
          color: COULEURS.texteDoux,
          fontSize: 46,
          fontWeight: 600,
          opacity: interpolate(s, [3.4, 4.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        Cinq clips, cinq notes.
      </div>
    </AbsoluteFill>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   Bloc 2 — la phrase qui retourne les 69 posts précédents.
   ───────────────────────────────────────────────────────────────────────── */
const BlocBascule: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 12 });

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Titre texte="Mais elle ne choisit pas à ta place." opacite={a} y={38} />
      <div
        style={{
          position: "absolute",
          top: "56%",
          left: 96,
          right: 96,
          textAlign: "center",
          color: COULEURS.texteDoux,
          fontSize: 48,
          fontWeight: 600,
          opacity: spring({ frame: frame - 18, fps, config: { damping: 200 }, durationInFrames: 12 }),
        }}
      >
        La note dit lequel se tient tout seul.
        <br />
        Elle ne dit pas lequel te ressemble.
      </div>
    </AbsoluteFill>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   Bloc 3 — la chute, et l'adresse.
   ───────────────────────────────────────────────────────────────────────── */
const BlocChute: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 12 });

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Titre texte="Le tri, c'est toi." opacite={a} y={36} />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 96,
          right: 96,
          textAlign: "center",
          color: COULEURS.texteDoux,
          fontSize: 46,
          fontWeight: 600,
          opacity: spring({ frame: frame - 16, fps, config: { damping: 200 }, durationInFrames: 12 }),
        }}
      >
        C'est la seule étape qui ne s'automatise pas.
        <br />
        Et c'est celle qui fait la différence.
      </div>
      <div
        style={{
          position: "absolute",
          top: "64%",
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: spring({ frame: frame - 30, fps, config: { damping: 200 }, durationInFrames: 12 }),
        }}
      >
        <span
          style={{
            background: COULEURS.vert,
            color: "#04150d",
            padding: "16px 34px",
            borderRadius: 14,
            fontSize: 52,
            fontWeight: 800,
          }}
        >
          creatis.app
        </span>
      </div>
    </AbsoluteFill>
  );
};
