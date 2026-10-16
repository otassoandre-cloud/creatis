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
 * LA PREMIÈRE SECONDE — 1920×1080, format long du 04/10.
 *
 * Tout ce film sort d'une mesure faite le matin même dans YouTube Studio, sur
 * mes propres Shorts :
 *     « Ont continué de regarder »   9,9 %   (contre 30,4 % ailleurs)
 *     part regardée                  79 %
 * Les deux ensemble disent que le montage tient et que l'ouverture perd tout
 * le monde. C'est le sujet, et c'est aussi ce que la démonstration applique :
 * elle s'ouvre sur le clip fini, pas sur une interface.
 *
 * Bornes des scènes relevées par `silencedetect` sur la narration, jamais
 * estimées au mot.
 */

const VERT = "#10b981";
const FOND = "#0a0f0a";
const ROUGE = "#f87171";
const SOURCE = "rec-cyprien-h264.mp4";

/** Pauses relevées sur narration-retention.mp3 (52,0 s). */
/** Pauses relevées sur narration-premiere-seconde.mp3 (70,8 s). */
const S = {
  chiffre: [0, 13.0],
  paradoxe: [13.0, 21.3],
  cause: [21.3, 31.7],
  annonce: [31.7, 36.0],
  bouge: [36.0, 43.9],
  visage: [43.9, 51.6],
  son: [51.6, 59.6],
  regle: [59.6, 70.8],
} as const;

type PlanDemo = {
  debut: number;
  fin: number;
  rec: [number, number];
  cadre: [number, number, number, number];
  mise: "colonne" | "large";
  texte: string;
  sous?: string;
};

const DEMO: PlanDemo[] = [
  {
    /* La démonstration s'ouvre comme le film qu'elle démontre : sur le clip. */
    debut: 71.4, fin: 75.2, rec: [235.0, 238.8],
    cadre: [150, 300, 540, 980], mise: "colonne",
    texte: "Le résultat, d'abord.",
    sous: "Ce clip n'existait pas trois minutes plus tôt.",
  },
  {
    debut: 75.2, fin: 78.6, rec: [11.0, 13.5],
    cadre: [180, 120, 720, 1160], mise: "colonne",
    texte: "Une phrase, dite au micro.",
    sous: "Aucun lien, aucun fichier.",
  },
  {
    debut: 78.6, fin: 81.6, rec: [16.5, 19.3],
    cadre: [280, 200, 520, 930], mise: "colonne",
    texte: "Elle trouve la vidéo.",
    sous: "La dernière publiée par la chaîne.",
  },
  {
    debut: 81.6, fin: 85.8, rec: [209.2, 211.2],
    cadre: [20, 140, 1040, 880], mise: "large",
    texte: "Dix passages, notés sur 100.",
  },
  {
    debut: 85.8, fin: 92.4, rec: [241.0, 247.6],
    cadre: [150, 300, 540, 980], mise: "colonne",
    texte: "Et le clip est prêt.",
    sous: "Recadré, sous-titré, exportable.",
  },
];

const FIN_DEMO = 92.4;
export const DUREE_PREMIERE = Math.round((FIN_DEMO + 2.6) * 30);

const entree = (frame: number, fps: number, debut: number, retard: number) =>
  spring({
    frame: frame - Math.round((debut + retard) * fps),
    fps,
    config: { damping: 200 },
    durationInFrames: 14,
  });

const Scene: React.FC<{ bornes: readonly [number, number]; children: React.ReactNode }> = ({
  bornes,
  children,
}) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence
      from={Math.round(bornes[0] * fps)}
      durationInFrames={Math.round((bornes[1] - bornes[0]) * fps)}
      layout="none"
    >
      {children}
    </Sequence>
  );
};

/** Un bloc « ce qu'il faut couper » : le numéro, le nom, et la démonstration. */
const Regle: React.FC<{
  numero: number;
  nom: string;
  debut: number;
  enfants: React.ReactNode;
}> = ({ numero, nom, debut, enfants }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = (r: number) => entree(frame, fps, 0, r);
  return (
    <AbsoluteFill style={{ padding: "120px 140px", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 28, opacity: e(0.2) }}>
        <span style={{ fontSize: 96, fontWeight: 900, color: VERT, letterSpacing: -4 }}>{numero}</span>
        <span style={{ fontSize: 76, fontWeight: 800, color: "#fff", letterSpacing: -2 }}>{nom}</span>
      </div>
      <div style={{ marginTop: 46 }}>{enfants}</div>
    </AbsoluteFill>
  );
};

export const PremiereSeconde: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = (debut: number, retard = 0) => entree(frame, fps, debut, retard);

  return (
    <AbsoluteFill style={{ backgroundColor: FOND, fontFamily: POLICE }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: VERT }} />

      <Scene bornes={S.chiffre}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div style={{ fontSize: 40, color: "rgba(255,255,255,0.5)", fontWeight: 700, opacity: e(S.chiffre[0]) }}>
            RELEVÉ DANS MES PROPRES STATISTIQUES
          </div>
          <div
            style={{
              fontSize: 180, fontWeight: 900, color: ROUGE, letterSpacing: -8, lineHeight: 1,
              marginTop: 18, opacity: e(S.chiffre[0], 1.4),
              transform: `scale(${interpolate(e(S.chiffre[0], 1.4), [0, 1], [0.9, 1])})`,
            }}
          >
            9,9 %
          </div>
          <div style={{ fontSize: 56, fontWeight: 800, color: "#fff", marginTop: 14, opacity: e(S.chiffre[0], 3.0) }}>
            ont continué de regarder.
          </div>
          <div style={{ fontSize: 40, color: "rgba(255,255,255,0.62)", marginTop: 26, opacity: e(S.chiffre[0], 8.0) }}>
            Neuf personnes sur dix partent avant la fin de la première seconde.
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.paradoxe}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 30, opacity: e(S.paradoxe[0]) }}>
            <span style={{ fontSize: 150, fontWeight: 900, color: VERT, letterSpacing: -6 }}>79 %</span>
            <span style={{ fontSize: 52, fontWeight: 800, color: "#fff" }}>du film, pour ceux qui restent.</span>
          </div>
          <div style={{ fontSize: 52, color: "rgba(255,255,255,0.85)", marginTop: 40, opacity: e(S.paradoxe[0], 3.4), lineHeight: 1.3 }}>
            Le montage tient. C&apos;est l&apos;ouverture qui perd tout le monde.
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.cause}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div style={{ fontSize: 66, fontWeight: 800, color: "#fff", lineHeight: 1.18, opacity: e(S.cause[0]) }}>
            Je commençais sur une interface.
          </div>
          <div style={{ marginTop: 42 }}>
            {["immobile", "sans visage", "sans son"].map((t, k) => (
              <div
                key={t}
                style={{
                  fontSize: 58, fontWeight: 700, color: ROUGE, marginBottom: 12,
                  opacity: e(S.cause[0], 2.2 + k * 1.4),
                }}
              >
                &#10005; {t}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 40, color: "rgba(255,255,255,0.6)", marginTop: 26, opacity: e(S.cause[0], 7.2) }}>
            Aucune raison de rester une seconde de plus.
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.annonce}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center", alignItems: "center" }}>
          <div
            style={{
              fontSize: 104, fontWeight: 900, color: "#fff", letterSpacing: -3, textAlign: "center",
              opacity: e(S.annonce[0]),
              transform: `scale(${interpolate(e(S.annonce[0]), [0, 1], [0.92, 1])})`,
            }}
          >
            Trois choses, dès la première image.
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.bouge}>
        <Regle
          numero={1}
          nom="QUELQUE CHOSE BOUGE"
          debut={S.bouge[0]}
          enfants={
            <div style={{ fontSize: 48, color: "rgba(255,255,255,0.84)", opacity: e(S.bouge[0], 2.4), lineHeight: 1.35 }}>
              Un plan fixe demande de la patience.
              <br />
              Personne n&apos;en a au moment de décider.
            </div>
          }
        />
      </Scene>

      <Scene bornes={S.visage}>
        <Regle
          numero={2}
          nom="UN VISAGE, OU UNE PREUVE"
          debut={S.visage[0]}
          enfants={
            <div style={{ fontSize: 48, color: "rgba(255,255,255,0.84)", opacity: e(S.visage[0], 2.4), lineHeight: 1.35 }}>
              Pas une promesse. Pas un titre.
              <br />
              <span style={{ color: VERT, fontWeight: 800 }}>Un résultat concret, visible tout de suite.</span>
            </div>
          }
        />
      </Scene>

      <Scene bornes={S.son}>
        <Regle
          numero={3}
          nom="LE SON DÉMARRE AVEC L’IMAGE"
          debut={S.son[0]}
          enfants={
            <div style={{ fontSize: 48, color: "rgba(255,255,255,0.84)", opacity: e(S.son[0], 2.4), lineHeight: 1.35 }}>
              Un départ silencieux se lit comme une erreur de lecture.
              <br />
              Et le pouce part.
            </div>
          }
        />
      </Scene>

      <Scene bornes={S.regle}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div style={{ fontSize: 38, color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 28, opacity: e(S.regle[0]) }}>
            LA RÈGLE QUI RÉSUME LES TROIS
          </div>
          <div
            style={{
              fontSize: 90, fontWeight: 900, color: "#fff", letterSpacing: -3, lineHeight: 1.1,
              opacity: e(S.regle[0], 0.8),
              transform: `translateY(${interpolate(e(S.regle[0], 0.8), [0, 1], [24, 0])}px)`,
            }}
          >
            Le résultat d&apos;abord.
            <br />
            L&apos;explication ensuite.
          </div>
          <div style={{ fontSize: 42, color: "rgba(255,255,255,0.68)", marginTop: 32, opacity: e(S.regle[0], 5.0), lineHeight: 1.3 }}>
            L&apos;ordre chronologique est le pire ordre possible
            <br />
            pour une vidéo courte.
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── LA DÉMONSTRATION ─────────────────────────────────────────────── */}
      {DEMO.map((p) => {
        const large = p.mise === "large";
        const zoneL = large ? 1480 : 620;
        const zoneH = large ? 820 : 940;
        const cx = large ? 960 : 530;
        const cy = large ? 500 : 560;
        const [rx, ry, rl, rh] = p.cadre;
        const ech = Math.min(zoneL / rl, zoneH / rh);
        const tx = cx - (rx + rl / 2) * ech;
        const ty = cy - (ry + rh / 2) * ech;
        const v = (p.rec[1] - p.rec[0]) / (p.fin - p.debut);
        return (
          <Sequence
            key={p.debut}
            from={Math.round(p.debut * fps)}
            durationInFrames={Math.round((p.fin - p.debut) * fps)}
            name={`${p.texte} (x${v.toFixed(1)})`}
            layout="none"
          >
            <AbsoluteFill style={{ backgroundColor: FOND, overflow: "hidden" }}>
              <div
                style={{
                  position: "absolute", inset: 0, overflow: "hidden",
                  clipPath: large ? undefined : "inset(60px 980px 60px 60px round 22px)",
                }}
              >
                <Video
                  src={staticFile(SOURCE)}
                  trimBefore={Math.round(p.rec[0] * 30)}
                  playbackRate={v}
                  style={{
                    position: "absolute", width: 1080, height: 1920,
                    transformOrigin: "0 0",
                    transform: `translate(${tx}px, ${ty}px) scale(${ech})`,
                  }}
                  muted
                />
              </div>
              {large ? (
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 72, textAlign: "center" }}>
                  <div style={{ fontSize: 68, fontWeight: 800, color: "#fff", letterSpacing: -1.5, textShadow: "0 3px 22px rgba(0,0,0,0.9)" }}>
                    {p.texte}
                  </div>
                </div>
              ) : (
                <div style={{ position: "absolute", left: 1040, right: 110, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: 72, fontWeight: 800, color: "#fff", letterSpacing: -2, lineHeight: 1.12 }}>
                    {p.texte}
                  </div>
                  {p.sous ? (
                    <div style={{ fontSize: 38, color: "rgba(255,255,255,0.68)", marginTop: 26, lineHeight: 1.3 }}>
                      {p.sous}
                    </div>
                  ) : null}
                </div>
              )}
            </AbsoluteFill>
          </Sequence>
        );
      })}

      <Sequence from={Math.round(FIN_DEMO * fps)} layout="none">
        <AbsoluteFill style={{ backgroundColor: FOND, padding: 140, justifyContent: "center" }}>
          <div style={{ fontSize: 60, fontWeight: 800, color: "#fff", lineHeight: 1.25 }}>
            Respirations · Mots de remplissage · Reformulation
          </div>
          <div style={{ fontSize: 42, color: VERT, marginTop: 24, fontWeight: 700 }}>
            Et toujours finir sur une idée finie.
          </div>
        </AbsoluteFill>
      </Sequence>

      <Audio src={staticFile("voix/narration-premiere-seconde.mp3")} />

      {/* La musique porte la démonstration, puis s'efface sous le clip. */}
      <Sequence from={Math.round(70.9 * fps)} layout="none">
        <Audio
          src={staticFile("musique/vocal-pulse.mp3")}
          /* Elle s'efface sous les DEUX plans de clip : l'ouverture et la fin. */
          volume={(f) => {
            const t = f / fps + 70.9;
            if (t < 75.2) return 0.14;
            if (t >= 85.4) return 0.14;
            return 0.72;
          }}
        />
      </Sequence>

      {/* LE SON DU CLIP : (516,5 − 509,7) + 0,6 = 7,4 s dans le fichier. */}
      {/* L'ouverture de la démonstration porte elle aussi le son du clip :
          c'est la règle du film, elle s'applique au film. */}
      <Sequence from={Math.round(71.4 * fps)} durationInFrames={Math.round(3.8 * fps)} layout="none">
        <Audio src={staticFile("son-clip-cyprien.mp3")} trimBefore={Math.round(2.0 * fps)} />
      </Sequence>

      <Sequence from={Math.round(85.8 * fps)} layout="none">
        <Audio src={staticFile("son-clip-cyprien.mp3")} trimBefore={Math.round(8.0 * fps)} />
      </Sequence>
    </AbsoluteFill>
  );
};
