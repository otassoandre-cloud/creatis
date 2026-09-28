import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { POLICE } from "./police";
import { COULEURS } from "./theme";

/**
 * SHORT COMPAGNON — 1080x1920, 19 s, MUET.
 *
 * Le format quotidien qui accompagne la vidéo longue YouTube : il ENSEIGNE une
 * chose utilisable tout de suite, la démontre à l'écran, puis renvoie vers le
 * tutoriel complet. Publié sur TikTok, Instagram et en Short YouTube.
 *
 * ── UNE LEÇON, PAS UNE PUBLICITÉ ─────────────────────────────────────────
 * La règle posée le 28/09 : donner de la valeur, apprendre quelque chose aux
 * gens. Le test est simple et sévère — si le spectateur peut appliquer la leçon
 * SANS l'outil, la vidéo a de la valeur. Sinon c'est une réclame déguisée, et
 * les 69 publications du compte Instagram montrent où ça mène : « 3 étapes
 * simples » répété quatre fois, « une commande vocale » cinq fois, 92 abonnés.
 *
 * Le principe enseigné ici s'applique au montage à la main aussi bien qu'avec
 * l'outil : un clip doit se comprendre SANS la vidéo dont il sort. Ce n'est pas
 * un argument de vente, c'est le critère de sélection lui-même.
 *
 * ── LE RENVOI EST À LA FIN, ET IL EST EXPLICITE ──────────────────────────
 * Pas de « lien en bio » vague. On nomme la vidéo longue et l'endroit. Sur
 * TikTok le lien n'est pas cliquable sous mille abonnés : il doit donc être
 * PRONONÇABLE et mémorisable, d'où une adresse courte affichée en clair.
 *
 * ── MUET ─────────────────────────────────────────────────────────────────
 * Le son tendance est posé dans l'application au moment de publier.
 *
 * ── ZONES SÛRES 1080x1920 ────────────────────────────────────────────────
 *   0 -> 16 %    barre d'état et onglets
 *   16 -> 78 %   zone libre — tout le texte y tient
 *   > 78 %       légende, pseudo, bandeau musical
 */

const FPS = 30;
export const DUREE_SHORT_YT = 19 * FPS; // 570 images

/** Fenêtre utile de l'enregistrement de bureau, en pixels de la source 1920x1080. */
const CADRE = { x: 400, y: 30, l: 930, h: 550 };

export type ReglageShortYT = {
  /** Enregistrement 1920x1080 du parcours. */
  grille: string;
  /** Seconde où la grille est PEINTE (relevée à l'image, pas le repère du script). */
  grilleA: number;
  /** Clip vertical exporté le même jour. */
  clip: string;
  clipA: number;
  /** La leçon, en deux temps. */
  lecon: string;
  leconDetail: string;
  /** Où trouver la version longue. */
  renvoi: string;
};

export const SHORT_YT_DEFAUT: ReglageShortYT = {
  grille: "rec-youtube-2809-h264.mp4",
  grilleA: 88,
  clip: "clip-train-2809.mp4",
  clipA: 0,
  lecon: "Un bon clip se comprend sans la vidéo d'où il sort.",
  leconDetail:
    "Pas le passage le plus fort. Le plus autonome. Si on doit expliquer le contexte, ce n'est pas un clip.",
  renvoi: "Tuto complet sur YouTube — Créatis",
};

const Texte: React.FC<{
  enfants: React.ReactNode; y: number; taille: number; couleur?: string; poids?: number; opacite: number;
}> = ({ enfants, y, taille, couleur = COULEURS.texte, poids = 800, opacite }) => (
  <div
    style={{
      position: "absolute",
      top: `${y}%`,
      left: 96,
      right: 96,
      textAlign: "center",
      color: couleur,
      fontSize: taille,
      fontWeight: poids,
      lineHeight: 1.12,
      opacity: opacite,
    }}
  >
    {enfants}
  </div>
);

export const ShortVersYouTube: React.FC<{ reglage?: ReglageShortYT }> = ({
  reglage = SHORT_YT_DEFAUT,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const s = frame / fps;

  const largeurCarte = width - 96 * 2;
  const k = largeurCarte / CADRE.l;
  const hauteurCarte = Math.round(CADRE.h * k);

  /* Pas de fondu au départ : Instagram et TikTok prennent la première image
     comme couverture, et une vignette noire ne se clique pas. */
  /** Apparaît, tient, disparaît. Les quatre bornes doivent être STRICTEMENT
      croissantes : `interpolate` refuse une valeur répétée, et un plan final
      écrit `(15, 15.3, 19, 19)` faisait échouer le rendu entier. */
  const fondu = (a: number, b: number, c: number, d: number) =>
    interpolate(s, [a, b, c, d], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  /** Apparaît et RESTE — pour le dernier plan, qui ne doit pas s'effacer. */
  const entree = (a: number, b: number) =>
    interpolate(s, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond, fontFamily: POLICE }}>
      {/* ── 1. LA LEÇON (0 → 5 s) — lisible dès l'image zéro ── */}
      <Sequence from={0} durationInFrames={5 * FPS} name="La leçon">
        <AbsoluteFill>
          <Texte y={20} taille={84} opacite={1} enfants={reglage.lecon} />
          <div
            style={{
              position: "absolute", top: "46%", left: 96,
              width: largeurCarte, height: hauteurCarte,
              borderRadius: 20, overflow: "hidden",
              border: `2px solid ${COULEURS.ligne}`,
            }}
          >
            <Video
              src={staticFile(reglage.grille)}
              trimBefore={Math.round(reglage.grilleA * FPS)}
              style={{
                position: "absolute",
                width: 1920 * k, height: 1080 * k,
                left: -CADRE.x * k, top: -CADRE.y * k,
                maxWidth: "none",
              }}
              muted
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ── 2. POURQUOI (5 → 9,5 s) ── */}
      <Sequence from={5 * FPS} durationInFrames={Math.round(4.5 * FPS)} name="Pourquoi">
        <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
          <Texte y={34} taille={74} opacite={fondu(5, 5.3, 9, 9.4)} enfants={reglage.leconDetail} />
        </AbsoluteFill>
      </Sequence>

      {/* ── 3. LA DÉMONSTRATION (9,5 → 15 s) ── */}
      <Sequence from={Math.round(9.5 * FPS)} durationInFrames={Math.round(5.5 * FPS)} name="Démonstration">
        <AbsoluteFill>
          <Video
            src={staticFile(reglage.clip)}
            trimBefore={Math.round(reglage.clipA * FPS)}
            style={{ width: "100%", height: "100%" }}
            objectFit="cover"
            muted
          />
          <div
            style={{
              position: "absolute", top: "17%", left: 0, right: 0, textAlign: "center",
              opacity: fondu(9.5, 9.9, 12.5, 13),
            }}
          >
            <span
              style={{
                background: COULEURS.vert, color: "#04150d",
                padding: "12px 26px", borderRadius: 12, fontSize: 44, fontWeight: 800,
              }}
            >
              Celui-ci se tient tout seul
            </span>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ── 4. LE RENVOI (15 → 19 s) ── */}
      <Sequence from={15 * FPS} name="Renvoi">
        <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
          <Texte y={33} taille={78} opacite={entree(15, 15.3)} enfants={reglage.renvoi} />
          <div
            style={{
              position: "absolute", top: "50%", left: 0, right: 0, textAlign: "center",
              opacity: entree(15.4, 15.8),
            }}
          >
            <span
              style={{
                background: COULEURS.vert, color: "#04150d",
                padding: "16px 34px", borderRadius: 14, fontSize: 54, fontWeight: 800,
              }}
            >
              creatis.app
            </span>
          </div>
          <Texte
            y={62} taille={42} couleur={COULEURS.texteDoux} poids={600}
            opacite={entree(15.8, 16.2)}
            enfants="Le parcours entier, du lien collé au clip publié."
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
