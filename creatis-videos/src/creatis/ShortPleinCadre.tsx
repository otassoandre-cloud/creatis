import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { POLICE } from "./police";
import { COULEURS } from "./theme";

/**
 * SHORT PLEIN CADRE — 1080x1920, 18 s, MUET (son tendance posé à la publication).
 *
 * ── POURQUOI UN DEUXIÈME GABARIT ─────────────────────────────────────────
 * `LeTri` et `ShortVersYouTube` se ressemblent trait pour trait : fond noir,
 * texte blanc centré, une carte avec la capture de l'app. Deux publications
 * d'affilée sur le même compte donnaient l'impression d'une seule vidéo répétée.
 * Le reproche est juste, et il est mesurable : une grille de profil où tout se
 * ressemble ne donne aucune raison de cliquer sur la deuxième vignette.
 *
 * Celui-ci est construit à l'inverse, point par point :
 *   fond noir        -> LE CLIP OCCUPE TOUT LE CADRE, du début à la fin
 *   carte incrustée  -> aucune carte
 *   texte centré     -> texte en HAUT, aligné à gauche, sur un voile sombre
 *   trois blocs fixes-> une phrase qui se remplace, sans coupure
 *
 * ── LE FOND EST UN VRAI CLIP, PAS UN DÉCOR ──────────────────────────────
 * On pose le clip exporté le jour même. C'est ce que la vidéo raconte : voilà
 * ce qui sort de l'outil. Il change donc tous les jours, et l'aspect de la
 * publication change avec lui — ce qu'aucun fond noir ne peut faire.
 *
 * ── LISIBILITÉ ───────────────────────────────────────────────────────────
 * Un texte blanc sur une image quelconque est illisible dès que l'image
 * s'éclaircit. D'où le voile : un dégradé opaque en haut, là où vit le texte,
 * transparent au milieu pour ne pas cacher le sujet du clip.
 *
 * ── ZONES SÛRES 1080x1920 ────────────────────────────────────────────────
 *   0 -> 16 %    barre d'état et onglets
 *   16 -> 78 %   zone libre
 *   > 78 %       légende, pseudo, bandeau musical
 */

const FPS = 30;
export const DUREE_PLEIN = 18 * FPS; // 540 images

export type Temps = { a: number; texte: string; accent?: boolean };

export type ReglagePlein = {
  /** Clip vertical exporté le jour même — c'est lui, le fond. */
  clip: string;
  clipA: number;
  /** Les phrases, dans l'ordre. `a` est la seconde d'apparition. */
  temps: Temps[];
  /** La ligne de fin, celle qui renvoie à la vidéo longue. */
  chute: string;
};

export const PLEIN_DEFAUT: ReglagePlein = {
  clip: "clip-fastfood-2809.mp4",
  clipA: 0,
  temps: [
    { a: 0, texte: "Ce clip, je ne l'ai pas monté." },
    { a: 4.2, texte: "Ni découpé, ni recadré, ni sous-titré." },
    { a: 8.4, texte: "J'ai collé un lien YouTube. Sept minutes." },
    { a: 12.6, texte: "Et il en est sorti dix comme celui-là.", accent: true },
  ],
  chute: "Le parcours entier sur YouTube",
};

export const ShortPleinCadre: React.FC<{ reglage?: ReglagePlein }> = ({
  reglage = PLEIN_DEFAUT,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const s = frame / fps;

  const temps = reglage.temps;
  const i = temps.reduce((acc, t, k) => (s >= t.a ? k : acc), 0);
  const actuel = temps[i];
  const suivant = temps[i + 1];

  /* La phrase se remplace sans coupure : elle sort juste avant que la suivante
     entre. Une phrase qui reste affichée jusqu'au bout cesse d'être lue. */
  const entree = interpolate(s - actuel.a, [0, 0.35], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const sortie = suivant
    ? interpolate(s, [suivant.a - 0.45, suivant.a - 0.1], [1, 0], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      })
    : 1;
  const visible = Math.min(entree, sortie);

  const finChute = DUREE_PLEIN / fps;
  const chute = interpolate(s, [finChute - 3.4, finChute - 3.0], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: POLICE }}>
      {/* ── Le clip, plein cadre, du début à la fin ── */}
      <Video
        src={staticFile(reglage.clip)}
        trimBefore={Math.round(reglage.clipA * FPS)}
        style={{ width: "100%", height: "100%" }}
        objectFit="cover"
        /* MUET : le son tendance est posé dans l'outil de publication. */
        muted
      />

      {/* Voile en haut seulement : le texte y vit, et le milieu du clip reste
          visible. Un voile uniforme aurait éteint l'image entière. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.72) 26%, rgba(0,0,0,0.12) 44%, transparent 56%)",
        }}
      />

      {/* ── La phrase, en haut, alignée à GAUCHE ── */}
      <div
        style={{
          position: "absolute",
          top: height * 0.17,
          left: 84,
          right: 84,
          opacity: visible,
          transform: `translateY(${interpolate(visible, [0, 1], [18, 0])}px)`,
          color: actuel.accent ? COULEURS.vertClair : "#fff",
          fontSize: 82,
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: -1.5,
          textShadow: "0 3px 22px rgba(0,0,0,0.75)",
        }}
      >
        {actuel.texte}
      </div>

      {/* ── La chute : le renvoi vers la vidéo longue ── */}
      <div
        style={{
          position: "absolute",
          bottom: height * 0.23,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: chute,
          transform: `translateY(${interpolate(chute, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: COULEURS.vert,
            color: "#04150d",
            padding: "18px 34px",
            borderRadius: 16,
            fontSize: 52,
            fontWeight: 800,
            boxShadow: "0 10px 36px rgba(0,0,0,0.45)",
          }}
        >
          {reglage.chute}
        </div>
        <div
          style={{
            marginTop: 16,
            color: "#fff",
            fontSize: 42,
            fontWeight: 700,
            textShadow: "0 2px 16px rgba(0,0,0,0.8)",
          }}
        >
          creatis.app
        </div>
      </div>
    </AbsoluteFill>
  );
};
