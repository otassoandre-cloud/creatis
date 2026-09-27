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
import { COULEURS } from "./theme";

/**
 * TUTORIEL YOUTUBE — 1920x1080, 45 s.
 *
 * ── CE QUI A ÉTÉ CORRIGÉ, ET POURQUOI ────────────────────────────────────
 * La première version posait l'enregistrement VERTICAL d'un téléphone dans un
 * coin du cadre, avec un titre de 76 px à côté. C'est un réflexe de format
 * court appliqué à YouTube, et aucun créateur ne travaille comme ça. Sur un
 * écran d'ordinateur le spectateur est à cinquante centimètres d'une grande
 * dalle : il veut VOIR l'écran, pas lire une affiche.
 *
 * Les règles appliquées ici sont celles du format, pas des préférences :
 *
 *  1. PLEIN CADRE. L'enregistrement occupe 100 % de l'image. Il est filmé en
 *     1920x1080 par `enregistrer-parcours.mjs YOUTUBE=1` — une vraie fenêtre de
 *     bureau, donc la disposition de bureau du site et du texte d'interface à sa
 *     taille native. Rien n'est agrandi, donc rien ne se délave.
 *
 *  2. ZOOM PROGRESSIF sur ce qui compte. C'est LE geste du tutoriel : au lieu
 *     d'une flèche ou d'un cercle rouge, la caméra se rapproche doucement de la
 *     zone active. Le regard suit sans qu'on lui demande.
 *
 *  3. TEXTE EN TIERS INFÉRIEUR, jamais au centre. Il ANNOTE, il ne raconte pas —
 *     c'est la voix qui raconte. Deux lignes maximum, et il disparaît.
 *
 *  4. TYPOGRAPHIE MESURÉE. Titre 48 px, corps 30 px sur 1080 de haut. La version
 *     précédente était à 76 et 36 : des tailles de format vertical, où l'on lit
 *     à bout de bras sur un écran de six pouces.
 *
 *  5. ZONES INTERDITES. Les 12 % du bas sont couverts par la barre de progression
 *     dès que la souris bouge, et le coin haut-droit par les fiches et l'écran de
 *     fin. Rien d'important n'y est posé.
 *
 * ── LA DURÉE VIENT DE LA VOIX ────────────────────────────────────────────
 * Mesuré sur « Charon » : 166 mots/minute. 45 s tiennent ~124 mots. Écrire plus
 * long obligerait à accélérer, et une voix pressée est le premier signal qu'on
 * regarde une publicité.
 */

const FPS = 30;
export const DUREE_TUTO = 45 * FPS; // 1350 images

/** Marge de sécurité YouTube : rien d'important sous 88 % ni dans le coin haut-droit. */
const BAS_SUR = 0.88;

/**
 * Une étape = un moment de l'enregistrement, une annotation, et une zone à
 * regarder. `zoom` vaut 1 quand on montre l'écran entier ; au-delà, la caméra se
 * rapproche de `cible` (coordonnées en fraction de l'image).
 */
export type EtapeTuto = {
  debut: number;
  titre: string;
  detail: string;
  zoom?: number;
  cible?: { x: number; y: number };
};

export const ETAPES_DEFAUT: EtapeTuto[] = [
  { debut: 0,  titre: "Une vidéo que tu as déjà publiée",
    detail: "Podcast, live, interview — la source existe, elle ne coûte rien à produire.",
    zoom: 1 },
  { debut: 8,  titre: "Colle le lien",
    detail: "Rien à télécharger, rien à installer.",
    zoom: 1.5, cible: { x: 0.5, y: 0.34 } },
  { debut: 17, titre: "L'IA lit ce qui est dit",
    detail: "Elle cherche les passages qui se comprennent seuls, pas les plus bruyants.",
    zoom: 1.25, cible: { x: 0.5, y: 0.45 } },
  { debut: 27, titre: "Tu choisis",
    detail: "Une dizaine de propositions. Le tri reste ton travail — c'est là qu'est la valeur.",
    zoom: 1.15, cible: { x: 0.5, y: 0.52 } },
  { debut: 36, titre: "Publie",
    detail: "Format 9:16, sous-titres incrustés. TikTok, Reels, Shorts.",
    zoom: 1.35, cible: { x: 0.5, y: 0.58 } },
];

export type ReglageTuto = {
  enregistrement: string;
  voix?: string;
  etapes?: EtapeTuto[];
  titre?: string;
};

export const TUTO_DEFAUT: ReglageTuto = {
  enregistrement: "rec-youtube.mp4",
  voix: "tuto-du-jour.mp3",
  titre: "Une vidéo longue → des Shorts",
};

export const TutoYouTube: React.FC<{ reglage?: ReglageTuto }> = ({
  reglage = TUTO_DEFAUT,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const etapes = reglage.etapes ?? ETAPES_DEFAUT;
  const seconde = frame / fps;

  const iActive = etapes.reduce((acc, e, i) => (seconde >= e.debut ? i : acc), 0);
  const etape = etapes[iActive];
  const precedente = etapes[Math.max(0, iActive - 1)];
  const debutImages = etape.debut * fps;

  /* Le zoom ne saute pas d'une étape à l'autre : il glisse sur une seconde et
     demie. Un changement d'échelle brutal se lit comme une coupe, et une coupe
     au milieu d'une démonstration donne l'impression qu'on a caché quelque chose. */
  const t = interpolate(frame - debutImages, [0, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const zoom = interpolate(t, [0, 1], [precedente.zoom ?? 1, etape.zoom ?? 1]);
  const cible = etape.cible ?? { x: 0.5, y: 0.5 };
  const cibleAv = precedente.cible ?? { x: 0.5, y: 0.5 };
  const cx = interpolate(t, [0, 1], [cibleAv.x, cible.x]);
  const cy = interpolate(t, [0, 1], [cibleAv.y, cible.y]);

  /* L'enregistrement dure moins que la vidéo : on l'étale plutôt que de le geler
     à la fin, un gel se lisant comme un plantage. */
  const cadence = 612 / DUREE_TUTO;

  /* Le texte entre, tient, puis SORT avant l'étape suivante. Une annotation qui
     reste affichée en permanence cesse d'être lue. */
  const apparition = spring({ frame: frame - debutImages, fps, config: { damping: 200 }, durationInFrames: 10 });
  const finEtape = (etapes[iActive + 1]?.debut ?? 45) * fps;
  const sortie = interpolate(frame, [finEtape - 20, finEtape - 6], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const visible = Math.min(apparition, sortie);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: POLICE }}>
      {/* ── L'écran, plein cadre, avec la caméra qui se rapproche ── */}
      <AbsoluteFill
        style={{
          transform: `scale(${zoom}) translate(${(0.5 - cx) * 100}%, ${(0.5 - cy) * 100}%)`,
          transformOrigin: "center center",
        }}
      >
        <Video
          src={staticFile(reglage.enregistrement)}
          playbackRate={cadence}
          style={{ width: "100%", height: "100%" }}
          objectFit="cover"
          muted
        />
      </AbsoluteFill>

      {/* Dégradé bas : sans lui, un texte clair posé sur une interface claire
          devient illisible dès que le contenu de l'écran change. */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 14%, transparent 30%)",
        }}
      />

      {/* ── Tiers inférieur : l'annotation ── */}
      <div
        style={{
          position: "absolute",
          left: width * 0.05,
          bottom: height * (1 - BAS_SUR) + 26,
          maxWidth: width * 0.62,
          opacity: visible,
          transform: `translateY(${interpolate(visible, [0, 1], [12, 0])}px)`,
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "5px 13px",
            borderRadius: 6,
            background: COULEURS.vert,
            color: "#04150d",
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 0.4,
            marginBottom: 12,
          }}
        >
          ÉTAPE {iActive + 1} / {etapes.length}
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, color: "#fff", lineHeight: 1.12, marginBottom: 8 }}>
          {etape.titre}
        </div>
        <div style={{ fontSize: 30, lineHeight: 1.45, color: "rgba(255,255,255,0.82)" }}>
          {etape.detail}
        </div>
      </div>

      {/* Bandeau de titre en haut-GAUCHE : le coin haut-droit reçoit les fiches
          YouTube et l'écran de fin, on n'y met jamais rien. */}
      <div
        style={{
          position: "absolute",
          left: width * 0.05,
          top: height * 0.06,
          padding: "7px 16px",
          borderRadius: 8,
          background: "rgba(0,0,0,0.55)",
          border: `1px solid rgba(255,255,255,0.14)`,
          color: "rgba(255,255,255,0.9)",
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        {reglage.titre ?? "Tutoriel"} · creatis.app
      </div>

      {reglage.voix ? (
        <Sequence from={0} name="Voix off">
          <Audio src={staticFile(`voix/${reglage.voix}`)} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
