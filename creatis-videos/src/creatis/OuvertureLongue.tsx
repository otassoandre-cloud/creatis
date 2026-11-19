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
import { CarteClip, DeuxChiffres, ZonesInterface } from "./Illustrations";
import { POLICE } from "./police";

/**
 * L'OUVERTURE QUI A DOUBLÉ LES VUES — 1920×1080, format long du 05/10.
 *
 * ── CE QUI CHANGE PAR RAPPORT AUX DEUX PRÉCÉDENTS ────────────────────────
 * Retour du 04/10 : « il faut que tu ajoutes du visuel […] que ce soit pas
 * tout plat, tout doux. » Les deux premiers formats longs enchaînaient des
 * diapos de texte sur une voix off. Ici, chaque point est MONTRÉ :
 *
 *   le problème      → les deux chiffres de Studio, en grand
 *   la cause         → l'ancienne ouverture, telle qu'elle était
 *   la correction    → le clip fini qui joue, avec son son
 *   la preuve        → 338 contre 156, mesurés
 *   le bonus         → les zones d'interface peintes sur une vraie vidéo
 *
 * ── LES CHIFFRES SONT MESURÉS, PAS CHOISIS ───────────────────────────────
 * 9,9 % et 79 % viennent de `youtube-retention.js` (Studio, 04/10).
 * 338 et 156 viennent de `youtube-stats.js` corrigé le 05/10 — avant cette
 * correction, le 338 était lu « 0 » et j'ai failli conclure l'inverse.
 *
 * Bornes des scènes relevées par `silencedetect` sur la narration.
 */

const VERT = "#10b981";
const FOND = "#0a0f0a";
const ROUGE = "#f87171";
const DEMO_SRC = "rec-croce-h264.mp4";

/** Pauses relevées sur narration-ouverture.mp3 (74,7 s). */
const S = {
  annonce: [0, 8.7],
  probleme: [8.7, 19.0],
  paradoxe: [19.0, 28.3],
  cause: [28.3, 38.6],
  regle: [38.6, 47.6],
  correction: [47.6, 53.6],
  preuve: [53.6, 64.5],
  bonus: [64.5, 74.7],
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

/* Fenêtres du tournage Croce, relevées sur planche contact : grille
   utilisable de 200,5 à 204,0, clip qui joue de 227,2 à 239,6. */
const DEMO: PlanDemo[] = [
  {
    debut: 75.3, fin: 79.0, rec: [228.0, 231.7],
    cadre: [150, 300, 540, 980], mise: "colonne",
    texte: "Le résultat, d'abord.",
    sous: "Ce clip n'existait pas trois minutes plus tôt.",
  },
  {
    debut: 79.0, fin: 82.4, rec: [13.0, 15.5],
    cadre: [180, 120, 720, 1160], mise: "colonne",
    texte: "Une phrase, dite au micro.",
    sous: "Aucun lien, aucun fichier.",
  },
  {
    debut: 82.4, fin: 86.6, rec: [200.8, 202.8],
    cadre: [20, 140, 700, 560], mise: "large",
    /* QUATRE, pas dix : ce tournage-là en a donné quatre. Un chiffre repris
       d un film precedent est un chiffre faux. */
    texte: "Quatre passages, notés sur 100.",
  },
  {
    debut: 86.6, fin: 93.0, rec: [234.0, 240.4],
    cadre: [150, 300, 540, 980], mise: "colonne",
    texte: "Et le clip est prêt.",
    sous: "Recadré, sous-titré, exportable.",
  },
];

const FIN_DEMO = 93.0;
export const DUREE_OUVERTURE = Math.round((FIN_DEMO + 2.6) * 30);

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

export const OuvertureLongue: React.FC = () => {
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
            J&apos;ai changé <span style={{ color: VERT }}>une seule chose</span>.
            <br />
            Les vues ont plus que doublé.
          </div>
          <div style={{ fontSize: 44, color: "rgba(255,255,255,0.66)", marginTop: 34, opacity: e(S.annonce[0], 3.6) }}>
            Avec les chiffres, et ce qu&apos;il y a à l&apos;écran.
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── LE PROBLÈME : un chiffre, pas une phrase ─────────────────────── */}
      <Scene bornes={S.probleme}>
        <AbsoluteFill style={{ padding: "140px 140px", justifyContent: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: "rgba(255,255,255,0.5)", marginBottom: 26, letterSpacing: 1 }}>
            RELEVÉ DANS YOUTUBE STUDIO
          </div>
          <DeuxChiffres
            gauche={{ valeur: "9,9 %", etiquette: "ont continué de regarder", mauvais: true }}
            droite={{ valeur: "9 / 10", etiquette: "partaient dans la première seconde", mauvais: true }}
            debut={0.6}
          />
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.paradoxe}>
        <AbsoluteFill style={{ padding: "140px 140px", justifyContent: "center" }}>
          <DeuxChiffres
            gauche={{ valeur: "79 %", etiquette: "du film, pour ceux qui restaient" }}
            droite={{ valeur: "9,9 %", etiquette: "seulement restaient", mauvais: true }}
            debut={0.4}
          />
          <div style={{ fontSize: 52, fontWeight: 800, color: "#fff", marginTop: 56, opacity: e(S.paradoxe[0], 4.2) }}>
            Le montage tenait. Tout se jouait <span style={{ color: VERT }}>avant</span>.
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── LA CAUSE : on MONTRE l'ancienne ouverture ────────────────────── */}
      <Scene bornes={S.cause}>
        <AbsoluteFill style={{ padding: 110, flexDirection: "row", gap: 90, alignItems: "center" }}>
          <CarteClip
            source="rec-mastu-h264.mp4"
            rec={12}
            cadre={[180, 120, 720, 1160]}
            largeur={430}
            hauteur={765}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 64, fontWeight: 800, color: "#fff", lineHeight: 1.15, opacity: e(S.cause[0], 0.3) }}>
              Ma première image
              <br />
              était une interface.
            </div>
            <div style={{ marginTop: 36 }}>
              {["immobile", "muette", "rien à voir"].map((t, k) => (
                <div
                  key={t}
                  style={{
                    fontSize: 48, fontWeight: 700, color: ROUGE, marginBottom: 10,
                    opacity: e(S.cause[0], 2.6 + k * 1.3),
                  }}
                >
                  ✕ {t}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 38, color: "rgba(255,255,255,0.62)", marginTop: 26, opacity: e(S.cause[0], 7.2) }}>
              Je gardais le résultat pour la fin, comme dans une histoire.
            </div>
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.regle}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div
            style={{
              fontSize: 96, fontWeight: 900, color: "#fff", letterSpacing: -3, lineHeight: 1.1,
              opacity: e(S.regle[0]),
            }}
          >
            Une vidéo courte
            <br />
            n&apos;est pas une histoire.
          </div>
          <div
            style={{
              fontSize: 76, fontWeight: 900, color: VERT, marginTop: 30, letterSpacing: -2,
              opacity: e(S.regle[0], 2.8),
            }}
          >
            C&apos;est une vitrine.
          </div>
          <div style={{ fontSize: 42, color: "rgba(255,255,255,0.68)", marginTop: 30, opacity: e(S.regle[0], 5.4) }}>
            On commence par ce qu&apos;on a de mieux. On explique après.
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── LA CORRECTION : le clip fini, qui joue ───────────────────────── */}
      <Scene bornes={S.correction}>
        <AbsoluteFill style={{ padding: 110, flexDirection: "row", gap: 90, alignItems: "center" }}>
          <CarteClip
            source="rec-mastu-h264.mp4"
            rec={225}
            cadre={[150, 300, 540, 980]}
            largeur={430}
            hauteur={765}
            note="la 1ʳᵉ seconde"
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 66, fontWeight: 800, color: "#fff", lineHeight: 1.15, opacity: e(S.correction[0], 0.3) }}>
              Le résultat fini,
              <br />
              qui bouge, avec son son.
            </div>
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── LA PREUVE : deux chiffres mesurés ────────────────────────────── */}
      <Scene bornes={S.preuve}>
        <AbsoluteFill style={{ padding: "140px 140px", justifyContent: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: "rgba(255,255,255,0.5)", marginBottom: 26, letterSpacing: 1 }}>
            MÊME COMPTE, MÊME FORMAT, SEULE L&apos;OUVERTURE CHANGE
          </div>
          <DeuxChiffres
            gauche={{ valeur: "338", etiquette: "vues — ouverture sur le résultat" }}
            droite={{ valeur: "156", etiquette: "vues — meilleure version précédente", mauvais: true }}
            debut={0.6}
          />
          <div style={{ fontSize: 46, fontWeight: 800, color: VERT, marginTop: 48, opacity: e(S.preuve[0], 5.0) }}>
            Plus du double.
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── LE BONUS : on PEINT les zones d'interface ────────────────────── */}
      <Scene bornes={S.bonus}>
        <AbsoluteFill style={{ padding: 100, flexDirection: "row", gap: 80, alignItems: "center" }}>
          <ZonesInterface source="rec-mastu-h264.mp4" rec={226} largeur={420} hauteur={747} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 58, fontWeight: 800, color: "#fff", lineHeight: 1.18, opacity: e(S.bonus[0], 0.3) }}>
              Et votre texte est
              <br />
              peut-être caché.
            </div>
            <div style={{ fontSize: 40, color: "rgba(255,255,255,0.78)", marginTop: 30, lineHeight: 1.4, opacity: e(S.bonus[0], 2.6) }}>
              Le pseudo recouvre à partir de 84 %.
              <br />
              Les boutons montent jusqu&apos;à 53 %.
            </div>
            <div style={{ fontSize: 46, fontWeight: 900, color: VERT, marginTop: 28, opacity: e(S.bonus[0], 5.4) }}>
              La bande sûre : 45 à 65 %.
            </div>
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── LA DÉMONSTRATION ─────────────────────────────────────────────── */}
      {DEMO.map((p) => {
        if (p.rec[0] === 0 && p.rec[1] === 0) return null;
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
          <div style={{ fontSize: 76, fontWeight: 900, color: "#fff", lineHeight: 1.15 }}>
            Le résultat d&apos;abord.
          </div>
          <div style={{ fontSize: 44, color: VERT, marginTop: 24, fontWeight: 700 }}>
            Et le texte entre 45 et 65 % de la hauteur.
          </div>
        </AbsoluteFill>
      </Sequence>

      <Audio src={staticFile("voix/narration-ouverture.mp3")} />

      {/* La démonstration applique sa propre règle : on ENTEND le clip, aux
          deux endroits où on le montre. (228,0 − 227,2) + 0,6 = 1,4 s. */}
      <Sequence from={Math.round(75.3 * fps)} durationInFrames={Math.round(3.7 * fps)} layout="none">
        <Audio src={staticFile("son-clip-croce.mp3")} trimBefore={Math.round(1.4 * fps)} />
      </Sequence>
      <Sequence from={Math.round(86.6 * fps)} durationInFrames={Math.round(6.4 * fps)} layout="none">
        <Audio src={staticFile("son-clip-croce.mp3")} trimBefore={Math.round(7.4 * fps)} />
      </Sequence>
    </AbsoluteFill>
  );
};
