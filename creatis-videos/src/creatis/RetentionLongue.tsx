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
 * POURQUOI VOS CLIPS NE RETIENNENT PAS — 1920×1080, format long du 03/10.
 *
 * Deuxième vidéo longue, et volontairement un autre angle que la première :
 * celle du 02/10 donnait la grille de notation entière, celle-ci prend UN seul
 * critère — la rétention — et dit quoi couper, concrètement.
 *
 * Les bornes viennent des silences relevés sur la narration (−30 dB, 0,3 s),
 * pas d'une estimation : à 231 mots/minute, une scène calée au mot près tombe
 * systématiquement à côté.
 *
 * La démonstration réutilise le tournage McFly du 03/10 — le premier où le clip
 * fini joue AVEC SON SON, récupéré depuis le blob du lecteur.
 */

const VERT = "#10b981";
const FOND = "#0a0f0a";
const ROUGE = "#f87171";
const SOURCE = "rec-mcfly-h264.mp4";

/** Pauses relevées sur narration-retention.mp3 (52,0 s). */
const S = {
  premisse: [0, 8.2],
  respirations: [8.2, 19.6],
  remplissage: [19.6, 34.0],
  reformulation: [34.0, 45.3],
  regle: [45.3, 52.0],
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
    debut: 52.6, fin: 56.4, rec: [10.0, 12.5],
    cadre: [180, 120, 720, 1160], mise: "colonne",
    texte: "Une phrase, dite au micro.",
    sous: "Aucun lien, aucun fichier.",
  },
  {
    debut: 56.4, fin: 59.8, rec: [13.5, 16.5],
    cadre: [280, 200, 520, 930], mise: "colonne",
    texte: "Elle trouve la vidéo.",
    sous: "54 minutes, la dernière publiée.",
  },
  {
    debut: 59.8, fin: 62.6, rec: [22.0, 70.0],
    cadre: [210, 30, 660, 630], mise: "colonne",
    texte: "Elle lit toute la transcription.",
    sous: "7 min 47 en vrai, accéléré ici.",
  },
  {
    debut: 62.6, fin: 67.0, rec: [485.2, 487.2],
    cadre: [20, 140, 1040, 880], mise: "large",
    texte: "Dix passages, notés sur 100.",
  },
  {
    /* Vitesse réelle, et c'est ici qu'on ENTEND le clip. */
    debut: 67.0, fin: 74.0, rec: [516.5, 523.5],
    cadre: [150, 300, 540, 980], mise: "colonne",
    texte: "Et le clip est prêt.",
    sous: "Recadré, sous-titré, exportable.",
  },
];

const FIN_DEMO = 74.0;
export const DUREE_RETENTION = Math.round((FIN_DEMO + 2.4) * 30);

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

export const RetentionLongue: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = (debut: number, retard = 0) => entree(frame, fps, debut, retard);

  return (
    <AbsoluteFill style={{ backgroundColor: FOND, fontFamily: POLICE }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: VERT }} />

      <Scene bornes={S.premisse}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div
            style={{
              fontSize: 94, fontWeight: 800, color: "#fff", letterSpacing: -2, lineHeight: 1.1,
              opacity: e(S.premisse[0]),
              transform: `translateY(${interpolate(e(S.premisse[0]), [0, 1], [26, 0])}px)`,
            }}
          >
            Un clip qui ne retient pas,
            <br />
            ce n&apos;est presque jamais le sujet.
          </div>
          <div
            style={{
              fontSize: 48, color: VERT, marginTop: 34, fontWeight: 700,
              opacity: e(S.premisse[0], 3.4),
            }}
          >
            C&apos;est ce qu&apos;on a laissé dedans.
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.respirations}>
        <Regle
          numero={1}
          nom="LES RESPIRATIONS"
          debut={S.respirations[0]}
          enfants={
            <>
              <div style={{ fontSize: 46, color: "rgba(255,255,255,0.82)", opacity: e(S.respirations[0], 2.6), lineHeight: 1.35 }}>
                Une demi-seconde de silence entre deux phrases.
              </div>
              <div
                style={{
                  marginTop: 38, fontSize: 70, fontWeight: 800, color: "#fff",
                  opacity: e(S.respirations[0], 7.0),
                }}
              >
                10 respirations = <span style={{ color: ROUGE }}>5 secondes de vide</span>
              </div>
              <div style={{ fontSize: 40, color: "rgba(255,255,255,0.6)", marginTop: 20, opacity: e(S.respirations[0], 10.6) }}>
                sur un clip de 40 secondes. Le spectateur ne vous attend pas.
              </div>
            </>
          }
        />
      </Scene>

      <Scene bornes={S.remplissage}>
        <Regle
          numero={2}
          nom="LES MOTS DE REMPLISSAGE"
          debut={S.remplissage[0]}
          enfants={
            <>
              <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
                {["du coup", "en fait", "voilà", "genre"].map((m, k) => (
                  <span
                    key={m}
                    style={{
                      fontSize: 64, fontWeight: 800, color: ROUGE,
                      textDecoration: "line-through", textDecorationThickness: 6,
                      opacity: e(S.remplissage[0], 2.6 + k * 1.1),
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 46, color: "rgba(255,255,255,0.82)", marginTop: 44, opacity: e(S.remplissage[0], 8.4), lineHeight: 1.35 }}>
                Aucune information. Coupez-les : personne ne le remarque,
                <br />
                et le rythme double.
              </div>
            </>
          }
        />
      </Scene>

      <Scene bornes={S.reformulation}>
        <Regle
          numero={3}
          nom="LA REFORMULATION"
          debut={S.reformulation[0]}
          enfants={
            <>
              <div style={{ fontSize: 46, color: "rgba(255,255,255,0.82)", opacity: e(S.reformulation[0], 2.2), lineHeight: 1.35 }}>
                La même idée dite deux fois, avec d&apos;autres mots.
                <br />
                Gardez la meilleure version. Supprimez l&apos;autre.
              </div>
              <div
                style={{
                  marginTop: 42, fontSize: 52, fontWeight: 800, color: VERT,
                  opacity: e(S.reformulation[0], 7.6),
                }}
              >
                La coupe qui change le plus — et qu&apos;on ose le moins.
              </div>
            </>
          }
        />
      </Scene>

      <Scene bornes={S.regle}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div style={{ fontSize: 38, color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 30, opacity: e(S.regle[0]) }}>
            ET LA RÈGLE QUI ANNULE TOUT LE RESTE
          </div>
          <div
            style={{
              fontSize: 82, fontWeight: 800, color: "#fff", letterSpacing: -2, lineHeight: 1.12,
              opacity: e(S.regle[0], 0.9),
              transform: `translateY(${interpolate(e(S.regle[0], 0.9), [0, 1], [24, 0])}px)`,
            }}
          >
            Le clip finit sur une idée finie.
          </div>
          <div style={{ fontSize: 42, color: "rgba(255,255,255,0.68)", marginTop: 28, opacity: e(S.regle[0], 3.0) }}>
            Tranché en pleine phrase, il perd tout — même parfait ailleurs.
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

      <Audio src={staticFile("voix/narration-retention.mp3")} />

      {/* La musique porte la démonstration, puis s'efface sous le clip. */}
      <Sequence from={Math.round(52.3 * fps)} layout="none">
        <Audio
          src={staticFile("musique/vocal-pulse.mp3")}
          volume={(f) =>
            interpolate(f, [Math.round((67.0 - 52.3) * fps) - 12, Math.round((67.0 - 52.3) * fps)], [0.72, 0.14], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      </Sequence>

      {/* LE SON DU CLIP : (516,5 − 509,7) + 0,6 = 7,4 s dans le fichier. */}
      <Sequence from={Math.round(67.0 * fps)} layout="none">
        <Audio src={staticFile("son-clip-mcfly.mp3")} trimBefore={Math.round(7.4 * fps)} />
      </Sequence>
    </AbsoluteFill>
  );
};
