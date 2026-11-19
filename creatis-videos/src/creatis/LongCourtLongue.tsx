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
import { Barres, CarteClip, DeuxChiffres } from "./Illustrations";
import { POLICE } from "./police";

/**
 * SHORT OU FORMAT LONG — 1920×1080, format long du 06/10.
 *
 * Une vidéo longue qui explique que le format long ne sert à rien quand on
 * débute. L'ironie est assumée : c'est exactement ce que mes propres chiffres
 * disent, et les cacher parce qu'ils dérangent serait malhonnête.
 *
 * ── TOUS LES CHIFFRES SONT MESURÉS ───────────────────────────────────────
 * Vidéos longues : 2, 2, 2, 4 vues.   Shorts : 330, 156, 123, 113 vues.
 * Relevés le 06/10 par `youtube-stats.js`, compteurs exacts pris sur la page
 * de chaque vidéo. Même chaîne, même semaine, même sujet.
 *
 * ── CE QUI EST MONTRÉ, PAS DIT ───────────────────────────────────────────
 * le constat   → les deux séries de chiffres, puis des BARRES à l'échelle
 * la cause     → rien à montrer, c'est du raisonnement : scène de texte, courte
 * la preuve    → le clip qui joue, celui qui a fait 330
 * l'aveu final → le chiffre qui m'a menti, en rouge
 */

const VERT = "#10b981";
const FOND = "#0a0f0a";
const ROUGE = "#f87171";
const DEMO_SRC = "rec-domingo-h264.mp4";

/** Pauses relevées sur narration-long-court.mp3 (75,9 s). */
const S = {
  annonce: [0, 7.7],
  longues: [7.7, 19.7],
  shorts: [19.7, 30.0],
  rapport: [30.0, 38.9],
  pourquoi: [38.9, 50.0],
  inverse: [50.0, 59.0],
  ordre: [59.0, 68.0],
  aveu: [68.0, 75.9],
} as const;

const DEMO = [
  { debut: 76.5, fin: 80.4, rec: [751.0, 754.9] as [number, number], texte: "Le clip qui a fait 330 vues." },
  { debut: 80.4, fin: 86.8, rec: [756.0, 762.4] as [number, number], texte: "Une phrase, onze minutes d'analyse." },
];
const FIN_DEMO = 86.8;
export const DUREE_LONGCOURT = Math.round((FIN_DEMO + 2.6) * 30);

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

export const LongCourtLongue: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = (debut: number, retard = 0) => entree(frame, fps, debut, retard);

  return (
    <AbsoluteFill style={{ backgroundColor: FOND, fontFamily: POLICE }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: VERT }} />

      <Scene bornes={S.annonce}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div
            style={{
              fontSize: 92, fontWeight: 900, color: "#fff", letterSpacing: -3, lineHeight: 1.1,
              opacity: e(S.annonce[0]),
              transform: `translateY(${interpolate(e(S.annonce[0]), [0, 1], [26, 0])}px)`,
            }}
          >
            Les chiffres de ma chaîne,
            <br />
            sur une semaine.
          </div>
          <div style={{ fontSize: 44, color: "rgba(255,255,255,0.66)", marginTop: 32, opacity: e(S.annonce[0], 3.2) }}>
            Ils disent quelque chose qu&apos;on dit rarement clairement.
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.longues}>
        <AbsoluteFill style={{ padding: "140px 140px", justifyContent: "center" }}>
          <div style={{ fontSize: 38, fontWeight: 800, color: "rgba(255,255,255,0.5)", marginBottom: 30, letterSpacing: 1 }}>
            MES 4 DERNIÈRES VIDÉOS LONGUES
          </div>
          <div style={{ display: "flex", gap: 70 }}>
            {[2, 2, 2, 4].map((n, k) => (
              <div
                key={k}
                style={{
                  fontSize: 150, fontWeight: 900, color: ROUGE, letterSpacing: -6,
                  opacity: e(S.longues[0], 0.6 + k * 0.7),
                }}
              >
                {n}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 42, color: "rgba(255,255,255,0.7)", marginTop: 40, opacity: e(S.longues[0], 5.4) }}>
            vues. Plusieurs heures de travail chacune.
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.shorts}>
        <AbsoluteFill style={{ padding: "140px 140px", justifyContent: "center" }}>
          <div style={{ fontSize: 38, fontWeight: 800, color: "rgba(255,255,255,0.5)", marginBottom: 30, letterSpacing: 1 }}>
            MES 4 DERNIERS SHORTS — MÊME SEMAINE, MÊME SUJET
          </div>
          <div style={{ display: "flex", gap: 56 }}>
            {[330, 156, 123, 113].map((n, k) => (
              <div
                key={k}
                style={{
                  fontSize: 140, fontWeight: 900, color: VERT, letterSpacing: -6,
                  opacity: e(S.shorts[0], 0.5 + k * 0.7),
                }}
              >
                {n}
              </div>
            ))}
          </div>
        </AbsoluteFill>
      </Scene>

      {/* Le rapport, en barres : « un à cent » se lit, deux barres se VOIENT. */}
      <Scene bornes={S.rapport}>
        <AbsoluteFill style={{ padding: "120px 140px", justifyContent: "center" }}>
          <Barres
            debut={0.3}
            valeurs={[
              { etiquette: "Short", valeur: 330 },
              { etiquette: "Vidéo longue", valeur: 2, mauvais: true },
            ]}
          />
          <div style={{ fontSize: 66, fontWeight: 900, color: "#fff", marginTop: 50, opacity: e(S.rapport[0], 3.6) }}>
            Un à cent. Pour dix fois plus de travail.
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.pourquoi}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div style={{ fontSize: 58, fontWeight: 700, color: "rgba(255,255,255,0.75)", lineHeight: 1.25, opacity: e(S.pourquoi[0]) }}>
            Ce n&apos;est pas que le format long soit mauvais.
          </div>
          <div
            style={{
              fontSize: 72, fontWeight: 900, color: "#fff", marginTop: 34, lineHeight: 1.15,
              opacity: e(S.pourquoi[0], 2.4),
            }}
          >
            Il se recommande à ceux
            <br />
            qui vous connaissent déjà.
          </div>
          <div style={{ fontSize: 46, color: VERT, marginTop: 30, fontWeight: 800, opacity: e(S.pourquoi[0], 6.0) }}>
            Il ne fabrique pas d&apos;audience. Il la sert.
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.inverse}>
        <AbsoluteFill style={{ padding: 110, flexDirection: "row", gap: 90, alignItems: "center" }}>
          <CarteClip
            source={DEMO_SRC}
            rec={752}
            cadre={[150, 300, 540, 980]}
            largeur={430}
            hauteur={765}
            note="330 vues"
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 68, fontWeight: 900, color: "#fff", lineHeight: 1.15, opacity: e(S.inverse[0], 0.3) }}>
              Le Short fait l&apos;inverse.
            </div>
            <div style={{ fontSize: 44, color: "rgba(255,255,255,0.78)", marginTop: 28, lineHeight: 1.35, opacity: e(S.inverse[0], 2.6) }}>
              Il part vers des inconnus par défaut,
              <br />
              et juge en <span style={{ color: VERT, fontWeight: 800 }}>une seconde</span> s&apos;il continue.
            </div>
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.ordre}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div style={{ fontSize: 38, fontWeight: 800, color: "rgba(255,255,255,0.5)", marginBottom: 30, letterSpacing: 1 }}>
            CE QUI DONNE UN ORDRE
          </div>
          <div style={{ fontSize: 80, fontWeight: 900, color: "#fff", lineHeight: 1.15, opacity: e(S.ordre[0], 0.4) }}>
            1. L&apos;audience, en Short.
          </div>
          <div style={{ fontSize: 80, fontWeight: 900, color: VERT, lineHeight: 1.15, marginTop: 14, opacity: e(S.ordre[0], 2.8) }}>
            2. Le format long, après.
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.aveu}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div style={{ fontSize: 56, fontWeight: 700, color: "rgba(255,255,255,0.78)", lineHeight: 1.3, opacity: e(S.aveu[0]) }}>
            Si personne ne voit vos vidéos de dix minutes,
            <br />
            ce n&apos;est pas votre montage.
          </div>
          <div style={{ fontSize: 76, fontWeight: 900, color: VERT, marginTop: 30, opacity: e(S.aveu[0], 2.6) }}>
            C&apos;est l&apos;ordre.
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── LA DÉMONSTRATION ─────────────────────────────────────────────── */}
      {DEMO.map((p) => {
        const ech = Math.min(620 / 540, 940 / 980);
        const tx = 530 - (150 + 540 / 2) * ech;
        const ty = 560 - (300 + 980 / 2) * ech;
        const v = (p.rec[1] - p.rec[0]) / (p.fin - p.debut);
        return (
          <Sequence
            key={p.debut}
            from={Math.round(p.debut * fps)}
            durationInFrames={Math.round((p.fin - p.debut) * fps)}
            layout="none"
          >
            <AbsoluteFill style={{ backgroundColor: FOND, overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, overflow: "hidden", clipPath: "inset(60px 980px 60px 60px round 22px)" }}>
                <Video
                  src={staticFile(DEMO_SRC)}
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
              <div style={{ position: "absolute", left: 1040, right: 110, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 72, fontWeight: 800, color: "#fff", letterSpacing: -2, lineHeight: 1.12 }}>
                  {p.texte}
                </div>
              </div>
            </AbsoluteFill>
          </Sequence>
        );
      })}

      <Sequence from={Math.round(FIN_DEMO * fps)} layout="none">
        <AbsoluteFill style={{ backgroundColor: FOND, padding: 140, justifyContent: "center" }}>
          <DeuxChiffres
            gauche={{ valeur: "330", etiquette: "un Short" }}
            droite={{ valeur: "2", etiquette: "une vidéo longue", mauvais: true }}
            debut={0.2}
          />
        </AbsoluteFill>
      </Sequence>

      <Audio src={staticFile("voix/narration-long-court.mp3")} />

      {/* Le son du clip, aux deux moments où on le montre. */}
      <Sequence from={Math.round(76.5 * fps)} durationInFrames={Math.round(3.9 * fps)} layout="none">
        <Audio src={staticFile("son-clip-domingo.mp3")} trimBefore={Math.round(2.5 * fps)} />
      </Sequence>
      <Sequence from={Math.round(80.4 * fps)} durationInFrames={Math.round(6.4 * fps)} layout="none">
        <Audio src={staticFile("son-clip-domingo.mp3")} trimBefore={Math.round(7.5 * fps)} />
      </Sequence>
    </AbsoluteFill>
  );
};
