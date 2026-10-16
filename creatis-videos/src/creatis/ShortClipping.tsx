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
 * ÊTRE PAYÉ EN CLIPPING — 1080×1920, 13,0 s.
 *
 * ── POURQUOI CE SHORT NE RESSEMBLE PAS AUX TROIS PRÉCÉDENTS ──────────────
 * Les trois derniers étaient des clips finis plein cadre, sans aucune
 * interface — la forme qui a fait passer la chaîne de 48 à 1 207 vues. Ici le
 * sujet est l'ARGENT, et un propos sur l'argent sans preuve à l'écran ne vaut
 * rien. On montre donc deux captures réelles : whop.com filmé le 08/10, et la
 * grille de dix clips produite le même jour.
 *
 * Ce n'est pas un retour au « produit comme sujet » : la grille arrive en
 * dernier, comme réponse au volume, après le chiffre qui fait mal.
 *
 * ── LE HOOK ──────────────────────────────────────────────────────────────
 * Demande du 08/10 : un hook frontal, à la deuxième personne, qui nomme le
 * désir puis le retourne. « Tu veux être payé en clipping ? Ton problème,
 * c'est pas la qualité. » Le désir est nommé en cinq mots, l'objection tombe
 * dans la foulée, et la suite doit être regardée pour savoir ce que c'est.
 *
 * ── LES ZONES D'INTERFACE ────────────────────────────────────────────────
 * Mesurées le 08/10 sur une capture YouTube Shorts (1179×2556) : haut 0-14 %,
 * droite 49-89 %, bas 66-92 %. Tout le texte vit entre 14 et 48 %, sur un
 * panneau sombre — un dégradé ne garantit pas le contraste.
 */

const VERT = "#10b981";
const FOND = "#06080a";
const ROUGE = "#f87171";
const OR = "#fbbf24";

export const DUREE_SHORT_CLIPPING = Math.round(13.0 * 30);

const PLANS = [
  { debut: 0, fin: 3.2 },
  { debut: 3.2, fin: 6.4 },
  { debut: 6.4, fin: 9.4 },
  { debut: 9.4, fin: 13.0 },
] as const;

const entree = (frame: number, fps: number, retard: number) =>
  spring({
    frame: frame - Math.round(retard * fps),
    fps,
    config: { damping: 200 },
    durationInFrames: 12,
  });

const Scene: React.FC<{ i: number; children: React.ReactNode }> = ({ i, children }) => {
  const { fps } = useVideoConfig();
  const p = PLANS[i];
  return (
    <Sequence
      from={Math.round(p.debut * fps)}
      durationInFrames={Math.round((p.fin - p.debut) * fps)}
      layout="none"
    >
      {children}
    </Sequence>
  );
};

/** Une capture d'écran 16:9 posée dans le cadre vertical, cadre visible. */
const Capture: React.FC<{ source: string; depart: number; legende: string }> = ({
  source,
  depart,
  legende,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = entree(frame, fps, 0.15);
  return (
    <div style={{ opacity: v, transform: `scale(${interpolate(v, [0, 1], [0.95, 1])})` }}>
      <div
        style={{
          width: 900,
          height: 506,
          borderRadius: 18,
          overflow: "hidden",
          border: "4px solid rgba(255,255,255,0.26)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.85)",
          background: "#000",
        }}
      >
        <Video
          src={staticFile(source)}
          trimBefore={Math.round(depart * 30)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          muted
        />
      </div>
      <div
        style={{
          fontSize: 30, color: "rgba(255,255,255,0.6)", marginTop: 14,
          fontWeight: 700, textAlign: "center",
        }}
      >
        {legende}
      </div>
    </div>
  );
};

/** Le bloc de texte, toujours dans la bande libre, toujours sur son fond. */
const Legende: React.FC<{ children: React.ReactNode; gros?: boolean; haut: number }> = ({
  children,
  gros,
  haut,
}) => {
  const { height } = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute", top: height * haut, left: 0, right: 0,
        display: "flex", justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: 950, textAlign: "center", color: "#fff",
          fontSize: gros ? 88 : 68, fontWeight: 900, lineHeight: 1.1, letterSpacing: -2,
          padding: "26px 34px", borderRadius: 26, background: "rgba(0,0,0,0.74)",
          textShadow: "0 0 2px #000, 3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const ShortClipping: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const e = (retard: number) => entree(frame, fps, retard);

  return (
    <AbsoluteFill style={{ backgroundColor: FOND, fontFamily: POLICE }}>
      {/* Le noir plat fait « diapositive » ; un halo sourd donne de la
          profondeur sans attirer l'œil hors du texte. */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(16,185,129,0.13) 0%, transparent 58%)",
        }}
      />
      {/* ── 1. LE HOOK : le désir nommé, puis retourné ──────────────────── */}
      <Scene i={0}>
        <AbsoluteFill>
          {/* Le bandeau des gains de Whop, très assombri : ça bouge derrière le
              texte, et c'est la vraie page, pas une texture. */}
          <AbsoluteFill style={{ overflow: "hidden", opacity: 0.26 }}>
            {/* Pour REMPLIR un cadre vertical avec une source 16:9, l'échelle
                est le maximum des deux rapports — 1920/1080 ici. Avec une
                échelle de 1, il restait deux bandes noires. */}
            <Video
              src={staticFile("whop-h264.mp4")}
              trimBefore={Math.round(4 * 30)}
              style={{
                position: "absolute", width: 1920, height: 1080,
                transformOrigin: "0 0",
                transform: `translate(${540 - 960 * 1.778}px, ${960 - 540 * 1.778}px) scale(1.778)`,
              }}
              muted
            />
          </AbsoluteFill>
          <AbsoluteFill style={{ background: "rgba(6,8,10,0.55)" }} />
          <Legende haut={0.20} gros>
            Tu veux être payé
            <br />
            en clipping ?
          </Legende>
          <div
            style={{
              position: "absolute", top: height * 0.41, left: 0, right: 0,
              display: "flex", justifyContent: "center", opacity: e(1.4),
            }}
          >
            <div
              style={{
                maxWidth: 950, textAlign: "center", fontSize: 62, fontWeight: 900,
                color: OR, lineHeight: 1.12, letterSpacing: -1.5,
                padding: "22px 30px", borderRadius: 24, background: "rgba(0,0,0,0.74)",
              }}
            >
              Ton problème, c&apos;est pas la qualité.
            </div>
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── 2. CE QUE ÇA PAIE, PROUVÉ À L'ÉCRAN ─────────────────────────── */}
      <Scene i={1}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          {/* Centrée sur 50 % : une carte de 506 px de haut occupe alors
              37 à 63 %, juste au-dessus de la zone basse des plateformes
              (66 %). Avec la marge précédente elle débordait dedans. */}
          <Capture source="whop-h264.mp4" depart={3} legende="whop.com — 8 octobre 2026" />
          <Legende haut={0.17}>
            Les marques paient
            <br />
            <span style={{ color: VERT }}>1 $ pour 1 000 vues.</span>
          </Legende>
        </AbsoluteFill>
      </Scene>

      {/* ── 3. LE CHIFFRE QUI FAIT MAL, ET IL EST DE NOUS ───────────────── */}
      <Scene i={2}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 150, fontWeight: 900, color: "#fff", letterSpacing: -8,
                lineHeight: 1, opacity: e(0.2),
                textShadow: "0 6px 30px rgba(0,0,0,0.9)",
              }}
            >
              1 207
            </div>
            <div style={{ fontSize: 44, color: "rgba(255,255,255,0.72)", fontWeight: 800, marginTop: 6, opacity: e(0.2) }}>
              vues, mon meilleur clip
            </div>
            <div
              style={{
                fontSize: 128, fontWeight: 900, color: ROUGE, letterSpacing: -6,
                marginTop: 34, opacity: e(1.5),
                textShadow: "0 6px 30px rgba(0,0,0,0.9)",
              }}
            >
              1,20 $
            </div>
          </div>
          <Legende haut={0.17}>Fais le calcul.</Legende>
        </AbsoluteFill>
      </Scene>

      {/* ── 4. LA RÈGLE, ET LA GRILLE QUI LA REND POSSIBLE ──────────────── */}
      <Scene i={3}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <Capture source="tuto-grille-h264.mp4" depart={1} legende="dix clips, une seule vidéo source" />
          <Legende haut={0.16}>
            Le métier, c&apos;est{" "}
            <span style={{ color: VERT }}>30 clips par semaine.</span>
            <br />
            Pas un.
          </Legende>
          {frame / fps >= 11.9 ? (
            <div
              style={{
                position: "absolute", left: 0, right: 0, top: height * 0.44,
                display: "flex", justifyContent: "center",
                opacity: interpolate(frame / fps, [11.9, 12.3], [0, 1], { extrapolateRight: "clamp" }),
              }}
            >
              <div
                style={{
                  fontSize: 48, fontWeight: 900, color: VERT, letterSpacing: -0.5,
                  padding: "12px 26px", borderRadius: 999, background: "rgba(0,0,0,0.78)",
                }}
              >
                creatis.app
              </div>
            </div>
          ) : null}
        </AbsoluteFill>
      </Scene>

      {/* Le son d'un clip fini, discret, pour que ça ne soit pas muet. */}
      <Audio src={staticFile("son-clip-domingo.mp3")} trimBefore={Math.round(9.5 * 30)} volume={0.95} />
    </AbsoluteFill>
  );
};
