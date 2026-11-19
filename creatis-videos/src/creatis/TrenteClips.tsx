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
 * TRENTE CLIPS PAR SEMAINE — 1920×1080, 108 s.
 *
 * ── LE CHAPITRE QUE LA VIDÉO DE LA VEILLE A OUVERT SANS LE FERMER ────────
 * « Gagner de l'argent avec le clipping » nommait le goulot — trente clips
 * par semaine — et s'arrêtait là. Ici on le résout : d'où vient le chiffre,
 * ce qui coûte vraiment du temps, la bascule qui le réduit, et le tri qui
 * fait la différence entre cinq mille vues et deux cents.
 *
 * ── CE QU'ON SAIT DE LA DISTRIBUTION, ET QU'ON NE SE CACHE PAS ───────────
 * Mesure du 09/10 : les deux formats longs de la veille ont reçu NEUF et HUIT
 * impressions en seize à vingt heures. Le titre en requête et la miniature
 * refaite n'y ont rien changé — YouTube ne montre pas les vidéos longues
 * d'une chaîne à dix abonnés, quel que soit l'emballage.
 *
 * On continue donc de les produire, mais sans illusion sur leur portée
 * propre : leur public viendra des Shorts (700 à 1 200 vues chacun) par le
 * commentaire épinglé, seule passerelle existante — le champ « vidéo
 * associée » n'existe pas sur un Short, vérifié dans Studio le 09/10.
 *
 * ── LES BORNES ───────────────────────────────────────────────────────────
 * `silencedetect` sur narration-trente.mp3 (106,6 s). Jamais estimées.
 */

const VERT = "#10b981";
const FOND = "#0a0f0a";
const ROUGE = "#f87171";
const OR = "#fbbf24";

const S = {
  accroche: [0, 12.2],
  pourquoi: [12.2, 26.0],
  temps: [26.0, 40.1],
  bascule: [40.1, 53.8],
  tri1: [53.8, 68.1],
  tri2: [68.1, 74.4],
  demo: [74.4, 85.8],
  planning: [85.8, 97.3],
  cesoir: [97.3, 106.6],
} as const;

export const DUREE_TRENTE = Math.round(108.5 * 30);

const entree = (frame: number, fps: number, retard: number) =>
  spring({
    frame: frame - Math.round(retard * fps),
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

/** Une capture 16:9, encadrée pour qu'on sache qu'on regarde un écran. */
const Ecran: React.FC<{ source: string; depart: number; largeur: number; legende?: string }> = ({
  source,
  depart,
  largeur,
  legende,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = entree(frame, fps, 0.1);
  return (
    <div style={{ opacity: v, transform: `scale(${interpolate(v, [0, 1], [0.97, 1])})` }}>
      <div
        style={{
          width: largeur, height: Math.round((largeur * 9) / 16),
          borderRadius: 14, overflow: "hidden",
          border: "3px solid rgba(255,255,255,0.22)",
          boxShadow: "0 22px 56px rgba(0,0,0,0.75)", background: "#000",
        }}
      >
        <Video
          src={staticFile(source)}
          trimBefore={Math.round(depart * 30)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          muted
        />
      </div>
      {legende ? (
        <div style={{ fontSize: 26, color: "rgba(255,255,255,0.58)", marginTop: 12, fontWeight: 700, textAlign: "center" }}>
          {legende}
        </div>
      ) : null}
    </div>
  );
};

/** Le clip fini, dans un cadre de téléphone : c'est le livrable, pas l'outil. */
const Telephone: React.FC<{ source: string; hauteur: number }> = ({ source, hauteur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = entree(frame, fps, 0.4);
  const largeur = Math.round((hauteur * 9) / 16);
  /* Le cadre utile du lecteur dans un tournage 1080×1920. */
  const [cx, cy, cl, ch] = [150, 300, 540, 980];
  const e = Math.max(largeur / cl, hauteur / ch);
  return (
    <div
      style={{
        width: largeur, height: hauteur, borderRadius: 26, overflow: "hidden",
        border: `4px solid ${VERT}`, boxShadow: "0 22px 56px rgba(0,0,0,0.8)",
        opacity: v, position: "relative", background: "#000",
      }}
    >
      <Video
        src={staticFile(source)}
        trimBefore={0}
        style={{
          position: "absolute", width: 1080, height: 1920, transformOrigin: "0 0",
          transform: `translate(${largeur / 2 - (cx + cl / 2) * e}px, ${hauteur / 2 - (cy + ch / 2) * e}px) scale(${e})`,
        }}
        muted
      />
    </div>
  );
};

export const TrenteClips: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = (retard: number) => entree(frame, fps, retard);

  return (
    <AbsoluteFill style={{ backgroundColor: FOND, fontFamily: POLICE }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: VERT }} />

      <Scene bornes={S.accroche}>
        <AbsoluteFill style={{ padding: "110px 130px", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 26, opacity: e(0.1) }}>
            <span style={{ fontSize: 180, fontWeight: 900, color: VERT, letterSpacing: -9, lineHeight: 1 }}>
              30
            </span>
            <span style={{ fontSize: 64, fontWeight: 900, color: "#fff", letterSpacing: -2 }}>
              clips par semaine
            </span>
          </div>
          <div style={{ fontSize: 50, color: "rgba(255,255,255,0.84)", marginTop: 26, lineHeight: 1.3, opacity: e(2.4) }}>
            Le chiffre qui sépare ceux qui gagnent de l&apos;argent en clipping
            <br />
            de ceux qui essaient.
          </div>
          <div style={{ fontSize: 46, color: OR, fontWeight: 800, marginTop: 32, opacity: e(6.0) }}>
            Et celui qui fait abandonner tout le monde.
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── POURQUOI TRENTE : le calcul, posé une bonne fois ─────────────── */}
      <Scene bornes={S.pourquoi}>
        <AbsoluteFill style={{ padding: "100px 130px", justifyContent: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: 1, opacity: e(0.1) }}>
            D&apos;OÙ VIENT LE CHIFFRE
          </div>
          <div style={{ display: "flex", gap: 30, marginTop: 34, alignItems: "stretch" }}>
            {[
              { h: "1 clip", v: "5 $", d: "5 000 vues à 1 $ / 1 000", r: 1.0 },
              { h: "1 semaine", v: "150 $", d: "30 clips", r: 3.6 },
              { h: "1 mois", v: "600 $", d: "120 clips", r: 6.2 },
            ].map((c, k) => (
              <div
                key={c.h}
                style={{
                  flex: 1, padding: "28px 32px", borderRadius: 20,
                  border: `3px solid ${k === 2 ? VERT : "rgba(255,255,255,0.18)"}`,
                  opacity: e(c.r),
                }}
              >
                <div style={{ fontSize: 32, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>{c.h}</div>
                <div style={{ fontSize: 88, fontWeight: 900, color: k === 2 ? VERT : "#fff", letterSpacing: -4, marginTop: 2 }}>
                  {c.v}
                </div>
                <div style={{ fontSize: 28, color: "rgba(255,255,255,0.58)", marginTop: 4 }}>{c.d}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 44, color: "#fff", fontWeight: 800, marginTop: 40, opacity: e(10.0) }}>
            Pas un jackpot. Un revenu d&apos;appoint —{" "}
            <span style={{ color: VERT }}>et il est répétable.</span>
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── CE QUI COÛTE VRAIMENT DU TEMPS ──────────────────────────────── */}
      <Scene bornes={S.temps}>
        <AbsoluteFill style={{ padding: "100px 130px", justifyContent: "center" }}>
          <div style={{ fontSize: 60, fontWeight: 900, color: "#fff", letterSpacing: -2, opacity: e(0.1) }}>
            Ce qui prend du temps,{" "}
            <span style={{ color: ROUGE }}>ce n&apos;est pas le montage.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 50 }}>
            <div style={{ flex: 1, opacity: e(3.0) }}>
              <div style={{ height: 76, borderRadius: 12, background: ROUGE, width: "100%" }} />
              <div style={{ fontSize: 40, color: "#fff", fontWeight: 800, marginTop: 14 }}>
                40 minutes regardées
              </div>
            </div>
            <div style={{ width: 220, opacity: e(5.4) }}>
              <div style={{ height: 76, borderRadius: 12, background: VERT, width: "100%" }} />
              <div style={{ fontSize: 40, color: "#fff", fontWeight: 800, marginTop: 14 }}>
                3 minutes gardées
              </div>
            </div>
          </div>
          <div style={{ fontSize: 44, color: OR, fontWeight: 800, marginTop: 44, opacity: e(9.0) }}>
            C&apos;est là que partent tes soirées.
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── LA BASCULE ──────────────────────────────────────────────────── */}
      <Scene bornes={S.bascule}>
        <AbsoluteFill style={{ padding: "100px 130px", justifyContent: "center" }}>
          <div style={{ fontSize: 54, fontWeight: 900, color: "#fff", letterSpacing: -2, lineHeight: 1.18, opacity: e(0.1) }}>
            Tu ne pars plus de ton montage.
            <br />
            <span style={{ color: VERT }}>Tu pars de ta source.</span>
          </div>
          <div style={{ display: "flex", gap: 26, alignItems: "center", marginTop: 46 }}>
            {[
              { a: "1", b: "vidéo longue", r: 3.4 },
              { a: "8 à 12", b: "passages exploitables", r: 5.0 },
              { a: "3", b: "sources / semaine", r: 6.8 },
              { a: "30", b: "clips", r: 8.4 },
            ].map((c, k) => (
              <div key={c.b} style={{ display: "flex", alignItems: "center", gap: 26 }}>
                {k > 0 ? <span style={{ fontSize: 46, color: VERT, opacity: e(c.r - 0.3) }}>→</span> : null}
                <div style={{ textAlign: "center", opacity: e(c.r) }}>
                  <div style={{ fontSize: 72, fontWeight: 900, color: k === 3 ? VERT : "#fff", letterSpacing: -3 }}>
                    {c.a}
                  </div>
                  <div style={{ fontSize: 26, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{c.b}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 44, color: "#fff", fontWeight: 800, marginTop: 46, opacity: e(10.6) }}>
            Pas trente idées à trouver. <span style={{ color: VERT }}>Trois vidéos à choisir.</span>
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── LE TRI : le critère et les trois fautes ─────────────────────── */}
      <Scene bornes={S.tri1}>
        <AbsoluteFill style={{ padding: "100px 130px", justifyContent: "center" }}>
          <div style={{ fontSize: 56, fontWeight: 900, color: "#fff", letterSpacing: -2, lineHeight: 1.16, opacity: e(0.1) }}>
            Dix passages trouvés
            <br />
            <span style={{ color: ROUGE }}>ne font pas dix bons clips.</span>
          </div>
          <div style={{ fontSize: 46, color: VERT, fontWeight: 800, marginTop: 30, opacity: e(3.0) }}>
            Le passage doit se comprendre sans la vidéo dont il sort.
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 36 }}>
            {[
              "Pas de pronom sans antécédent",
              "Pas de prénom jamais présenté",
              "Pas de réponse sans sa question",
            ].map((t, k) => (
              <div
                key={t}
                style={{
                  flex: 1, padding: "22px 26px", borderRadius: 16,
                  border: `3px solid ${ROUGE}`, fontSize: 32, fontWeight: 800,
                  color: "rgba(255,255,255,0.88)", lineHeight: 1.25, opacity: e(6.4 + k * 1.1),
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.tri2}>
        <AbsoluteFill style={{ padding: "110px 130px", justifyContent: "center", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 34 }}>
            <span style={{ fontSize: 150, fontWeight: 900, color: "rgba(255,255,255,0.45)", letterSpacing: -7, opacity: e(0.1) }}>
              10
            </span>
            <span style={{ fontSize: 76, color: VERT, fontWeight: 900, opacity: e(1.0) }}>→</span>
            <span style={{ fontSize: 150, fontWeight: 900, color: VERT, letterSpacing: -7, opacity: e(1.4) }}>
              5 ou 6
            </span>
          </div>
          <div style={{ fontSize: 44, color: "#fff", fontWeight: 800, marginTop: 30, textAlign: "center", opacity: e(3.2) }}>
            C&apos;est normal. Et c&apos;est ce tri qui fait la différence
            <br />
            entre 5 000 vues et 200.
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── LA DÉMONSTRATION, FILMÉE ────────────────────────────────────── */}
      <Scene bornes={S.demo}>
        <AbsoluteFill
          style={{ padding: "70px 100px", flexDirection: "row", gap: 50, alignItems: "center", justifyContent: "center" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Ecran source="tuto-lien-h264.mp4" depart={0} largeur={700} legende="on colle le lien" />
            <Ecran source="tuto-grille-h264.mp4" depart={1} largeur={700} legende="dix passages notés" />
          </div>
          <div style={{ textAlign: "center" }}>
            <Telephone source="rec-amixem2-h264.mp4" hauteur={620} />
            <div style={{ fontSize: 26, color: "rgba(255,255,255,0.58)", marginTop: 12, fontWeight: 700 }}>
              le clip fini
            </div>
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── LE PLANNING ─────────────────────────────────────────────────── */}
      <Scene bornes={S.planning}>
        <AbsoluteFill style={{ padding: "100px 130px", justifyContent: "center" }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: VERT, letterSpacing: 2, opacity: e(0.1) }}>
            TA SEMAINE
          </div>
          {[
            { j: "Lundi", t: "tu choisis tes 3 sources et tu lances les analyses", r: 0.9 },
            { j: "Mardi — mercredi", t: "tu tries et tu exportes", r: 3.4 },
            { j: "Le reste", t: "tu publies, tu soumets tes liens, tu captures tes stats", r: 6.0 },
          ].map((c) => (
            <div key={c.j} style={{ display: "flex", gap: 28, marginTop: 28, alignItems: "baseline", opacity: e(c.r) }}>
              <div style={{ width: 400, fontSize: 44, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
                {c.j}
              </div>
              <div style={{ fontSize: 38, color: "rgba(255,255,255,0.76)", lineHeight: 1.3 }}>{c.t}</div>
            </div>
          ))}
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.cesoir}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: VERT, letterSpacing: 2, opacity: e(0.1) }}>
            CE SOIR
          </div>
          <div style={{ fontSize: 76, fontWeight: 900, color: "#fff", letterSpacing: -3, lineHeight: 1.14, marginTop: 18, opacity: e(0.7) }}>
            Une seule source, et cinq clips
            <br />
            qui passent le critère.
          </div>
          <div style={{ fontSize: 56, fontWeight: 900, color: ROUGE, marginTop: 26, opacity: e(3.6) }}>
            Pas trente. Cinq.
          </div>
          <div style={{ fontSize: 40, color: "rgba(255,255,255,0.76)", marginTop: 26, opacity: e(6.2) }}>
            Si tu tiens ça une semaine, tu tiendras le reste.
          </div>
        </AbsoluteFill>
      </Scene>

      <Audio src={staticFile("voix/narration-trente.mp3")} />
    </AbsoluteFill>
  );
};
