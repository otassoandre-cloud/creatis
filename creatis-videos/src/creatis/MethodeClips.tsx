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
 * MÉTHODE CLIPS — 1920×1080, l'ouverture du format long.
 *
 * ── CE QUE CE FILM FAIT, ET POURQUOI ─────────────────────────────────────
 * Il APPREND d'abord, il montre ensuite. La consigne est constante depuis une
 * semaine : « ça doit pas faire pub produit mais apprendre et valeur, sinon ça
 * intéresse personne ». Les scènes ci-dessous donnent la grille de notation
 * complète — cinq critères sur vingt, plus deux règles — utilisable à la main
 * par n'importe qui, sans rien acheter. La démonstration vient après, et elle
 * sert de preuve, pas d'argument de vente.
 *
 * ── LES TEMPS VIENNENT DES SILENCES, PAS D'UNE ESTIMATION ────────────────
 * Les bornes sont les pauses relevées par `silencedetect` sur la narration
 * (seuil −32 dB, durée 0,55 s). Une scène qui change au milieu d'une phrase se
 * voit immédiatement ; estimer au mot près ne marche pas, le débit de la voix
 * varie de 160 à 210 mots/minute selon la longueur du texte.
 */

const VERT = "#10b981";
const FOND = "#0a0f0a";
/** Le tournage du 02/10 : Squeezie, le premier où le clip fini joue. */
const SOURCE_DEMO = "rec-squeezie-h264.mp4";

/** Bornes relevées sur narration-long.mp3 (67,8 s). */
const S = {
  titre: [0, 3.3],
  methodeLongue: [3.3, 13.9],
  commande: [13.9, 23.9],
  chaine: [23.9, 26.5],
  cequefait: [26.5, 33.6],
  cinqCriteres: [33.6, 37.7],
  criteres: [37.7, 51.3],
  regles: [51.3, 60.8],
  main: [60.8, 67.8],
} as const;

const CRITERES: [string, string][] = [
  ["ACCROCHE", "les 2 premières secondes"],
  ["AUTONOMIE", "ça se comprend sans la vidéo"],
  ["RÉTENTION", "aucun silence, aucune digression"],
  ["VALEUR", "on apprend quelque chose"],
  ["VIRALITÉ", "ça provoque une réaction"],
];

const ETAPES_LONGUES = [
  "télécharger la vidéo",
  "la regarder en entier",
  "noter les moments forts",
  "découper",
  "recadrer en 9:16",
  "sous-titrer",
];

/**
 * LA DÉMONSTRATION, APRÈS L'EXPLICATION.
 *
 * Le même tournage que le format court, présenté en 16:9 : l'enregistrement est
 * vertical, donc on le pose en panneau à gauche et le commentaire respire à
 * droite — plutôt que de le centrer avec deux bandes noires qui ne disent rien.
 * La grille, elle, est large : elle passe en pleine image.
 */
type PlanDemo = {
  debut: number;
  fin: number;
  rec: [number, number];
  /** Rectangle utile de l'enregistrement, en pixels source : [x, y, l, h]. */
  cadre: [number, number, number, number];
  mise: "colonne" | "large";
  texte: string;
  sous?: string;
};

const DEMO: PlanDemo[] = [
  {
    debut: 68.4, fin: 72.4, rec: [12.0, 14.0],
    cadre: [180, 120, 720, 1160], mise: "colonne",
    texte: "On dit la phrase.",
    sous: "Aucun lien, aucun fichier.",
  },
  {
    debut: 72.4, fin: 76.0, rec: [14.3, 18.3],
    cadre: [280, 200, 520, 930], mise: "colonne",
    texte: "Elle trouve la vidéo.",
    sous: "La dernière publiée par la chaîne.",
  },
  {
    debut: 76.0, fin: 79.0, rec: [25.0, 80.0],
    cadre: [210, 30, 660, 630], mise: "colonne",
    texte: "Elle lit la transcription entière.",
    sous: "6 min 29 en vrai, accéléré ici.",
  },
  {
    debut: 79.0, fin: 83.5, rec: [408.8, 411.0],
    cadre: [20, 120, 1040, 880], mise: "large",
    texte: "Huit passages, notés sur 100.",
  },
  {
    /* Vitesse réelle : des sous-titres accélérés ne se lisent pas. */
    debut: 83.5, fin: 90.5, rec: [441.0, 448.0],
    cadre: [150, 300, 540, 980], mise: "colonne",
    texte: "Et le clip est prêt.",
    sous: "Recadré en 9:16, sous-titré, exportable.",
  },
];

const FIN_DEMO = 90.5;

export const DUREE_METHODE = Math.round((FIN_DEMO + 2.2) * 30);

/** Apparition douce et décalée, pour que le rythme soit le même partout. */
const entree = (frame: number, fps: number, debut: number, retard: number) =>
  spring({
    frame: frame - Math.round((debut + retard) * fps),
    fps,
    config: { damping: 200 },
    durationInFrames: 14,
  });

const Scene: React.FC<{
  bornes: readonly [number, number];
  children: React.ReactNode;
}> = ({ bornes, children }) => {
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

export const MethodeClips: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = frame / fps;
  const e = (debut: number, retard = 0) => entree(frame, fps, debut, retard);

  return (
    <AbsoluteFill style={{ backgroundColor: FOND, fontFamily: POLICE }}>
      {/* Un filet vert en haut : la seule marque, discrète, du début à la fin. */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: VERT }} />

      <Scene bornes={S.titre}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div
            style={{
              fontSize: 92,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: -2,
              lineHeight: 1.1,
              opacity: e(S.titre[0]),
              transform: `translateY(${interpolate(e(S.titre[0]), [0, 1], [26, 0])}px)`,
            }}
          >
            Deux façons de découper une vidéo en clips.
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.methodeLongue}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div style={{ fontSize: 40, color: "rgba(255,255,255,0.5)", marginBottom: 30, fontWeight: 700 }}>
            LA LONGUE
          </div>
          {ETAPES_LONGUES.map((etape, k) => {
            const v = e(S.methodeLongue[0], 0.5 + k * 0.85);
            return (
              <div
                key={etape}
                style={{
                  fontSize: 52,
                  fontWeight: 700,
                  color: "#fff",
                  opacity: v * 0.92,
                  transform: `translateX(${interpolate(v, [0, 1], [-30, 0])}px)`,
                  marginBottom: 12,
                }}
              >
                <span style={{ color: VERT, marginRight: 22 }}>{k + 1}</span>
                {etape}
              </div>
            );
          })}
          <div
            style={{
              marginTop: 38,
              fontSize: 76,
              fontWeight: 800,
              color: VERT,
              opacity: e(S.methodeLongue[0], 6.0),
            }}
          >
            2 à 3 heures
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.commande}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div style={{ fontSize: 40, color: "rgba(255,255,255,0.5)", marginBottom: 40, fontWeight: 700 }}>
            LA COURTE
          </div>
          {/* Départ RELATIF à la scène : `useCurrentFrame()` dans un enfant de
              `Sequence` rend la frame relative, pas absolue. Avec la borne
              absolue (13,9 + 1,4) le compte partait négatif et la phrase ne
              s'écrivait jamais — vu au rendu, pas au raisonnement. */}
          <PhraseParlee debut={1.4} />
          <div style={{ marginTop: 56, display: "flex", gap: 52 }}>
            {["pas de lien à coller", "pas de fichier à téléverser"].map((t, k) => (
              <div
                key={t}
                style={{
                  fontSize: 40,
                  color: "rgba(255,255,255,0.72)",
                  opacity: e(S.commande[0], 5.6 + k * 1.1),
                  fontWeight: 600,
                }}
              >
                ✕ {t}
              </div>
            ))}
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.chaine}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div
            style={{
              fontSize: 100,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: -2,
              opacity: e(S.chaine[0]),
              transform: `translateY(${interpolate(e(S.chaine[0]), [0, 1], [26, 0])}px)`,
            }}
          >
            Le nom de la chaîne suffit.
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.cequefait}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          {[
            "elle cherche la chaîne",
            "elle lit la transcription entière",
            "elle note chaque passage sur 100",
          ].map((t, k) => {
            const v = e(S.cequefait[0], 0.4 + k * 1.9);
            return (
              <div
                key={t}
                style={{
                  fontSize: 64,
                  fontWeight: 700,
                  color: "#fff",
                  opacity: v,
                  transform: `translateY(${interpolate(v, [0, 1], [22, 0])}px)`,
                  marginBottom: 26,
                }}
              >
                <span style={{ color: VERT, marginRight: 24 }}>→</span>
                {t}
              </div>
            );
          })}
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.cinqCriteres}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center", alignItems: "center" }}>
          <div
            style={{
              fontSize: 110,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: -3,
              opacity: e(S.cinqCriteres[0]),
              transform: `scale(${interpolate(e(S.cinqCriteres[0]), [0, 1], [0.92, 1])})`,
            }}
          >
            5 critères, chacun sur 20.
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.criteres}>
        <AbsoluteFill style={{ padding: "110px 140px", justifyContent: "center" }}>
          {CRITERES.map(([nom, quoi], k) => {
            /* Chaque critère entre quand il est prononcé : 13,6 s pour cinq. */
            const retard = 0.3 + k * 2.6;
            const v = e(S.criteres[0], retard);
            const actif = s >= S.criteres[0] + retard && s < S.criteres[0] + retard + 2.6;
            return (
              <div
                key={nom}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 30,
                  marginBottom: 18,
                  opacity: v * (actif ? 1 : 0.42),
                  transform: `translateX(${interpolate(v, [0, 1], [-26, 0])}px)`,
                }}
              >
                <span style={{ fontSize: 56, fontWeight: 800, color: actif ? VERT : "#fff", minWidth: 330 }}>
                  {nom}
                </span>
                <span style={{ fontSize: 36, fontWeight: 700, color: VERT, minWidth: 86 }}>/20</span>
                <span style={{ fontSize: 38, color: "rgba(255,255,255,0.8)" }}>{quoi}</span>
              </div>
            );
          })}
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.regles}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div style={{ fontSize: 38, color: "rgba(255,255,255,0.5)", marginBottom: 40, fontWeight: 700 }}>
            ET DEUX RÈGLES, QUI COMPTENT AUTANT
          </div>
          {["entre 30 et 90 secondes", "jamais coupé au milieu d'une idée"].map((t, k) => {
            const v = e(S.regles[0], 0.9 + k * 3.4);
            return (
              <div
                key={t}
                style={{
                  fontSize: 72,
                  fontWeight: 800,
                  color: "#fff",
                  opacity: v,
                  transform: `translateY(${interpolate(v, [0, 1], [24, 0])}px)`,
                  marginBottom: 28,
                }}
              >
                {t}
              </div>
            );
          })}
          <div
            style={{
              fontSize: 40,
              color: "rgba(255,255,255,0.65)",
              marginTop: 16,
              opacity: e(S.regles[0], 6.2),
            }}
          >
            Un passage tranché en pleine phrase perd tout, même noté 90.
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.main}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: -2,
              lineHeight: 1.1,
              opacity: e(S.main[0]),
              transform: `translateY(${interpolate(e(S.main[0]), [0, 1], [26, 0])}px)`,
            }}
          >
            Cette grille, appliquez-la à la main.
          </div>
          <div
            style={{
              fontSize: 44,
              color: "rgba(255,255,255,0.72)",
              marginTop: 34,
              opacity: e(S.main[0], 2.2),
              lineHeight: 1.35,
            }}
          >
            Elle fait la différence entre un clip qui tourne
            <br />
            et un clip que personne ne regarde jusqu&apos;au bout.
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── LA DÉMONSTRATION ─────────────────────────────────────────── */}
      {DEMO.map((p) => {
        const large = p.mise === "large";
        /* Zone où le rectangle utile doit tenir. En colonne il occupe la moitié
           gauche ; en large, presque toute l'image. */
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
                  position: "absolute",
                  inset: 0,
                  overflow: "hidden",
                  /* En colonne, le panneau est délimité : sans cette coupe, le
                     reste de la page déborderait sous le texte de droite. */
                  clipPath: large ? undefined : "inset(60px 980px 60px 60px round 22px)",
                }}
              >
                <Video
                  src={staticFile(SOURCE_DEMO)}
                  trimBefore={Math.round(p.rec[0] * 30)}
                  playbackRate={v}
                  style={{
                    position: "absolute",
                    width: 1080,
                    height: 1920,
                    transformOrigin: "0 0",
                    transform: `translate(${tx}px, ${ty}px) scale(${ech})`,
                  }}
                  muted
                />
              </div>

              {large ? (
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 72, textAlign: "center" }}>
                  <div style={{ fontSize: 68, fontWeight: 800, color: "#fff", letterSpacing: -1.5,
                    textShadow: "0 3px 22px rgba(0,0,0,0.9)" }}>
                    {p.texte}
                  </div>
                </div>
              ) : (
                <div style={{ position: "absolute", left: 1040, right: 110, top: 0, bottom: 0,
                  display: "flex", flexDirection: "column", justifyContent: "center" }}>
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

      {/* Dernière image : la grille, pas l'adresse. On rappelle ce qui s'apprend. */}
      <Sequence from={Math.round(FIN_DEMO * fps)} layout="none">
        <AbsoluteFill style={{ backgroundColor: FOND, padding: 140, justifyContent: "center" }}>
          <div style={{ fontSize: 56, fontWeight: 800, color: "#fff", lineHeight: 1.25 }}>
            Accroche · Autonomie · Rétention · Valeur · Viralité
          </div>
          <div style={{ fontSize: 40, color: VERT, marginTop: 24, fontWeight: 700 }}>
            30 à 90 secondes, et jamais coupé au milieu d&apos;une idée.
          </div>
        </AbsoluteFill>
      </Sequence>

      <Audio src={staticFile("voix/narration-long.mp3")} />
      {/* La musique prend le relais quand la voix se tait, sur la démonstration. */}
      <Sequence from={Math.round(68.0 * fps)} layout="none">
        <Audio src={staticFile("musique/vocal-pulse.mp3")} volume={0.75} />
      </Sequence>
      <Sequence from={Math.round(79.0 * fps)} layout="none">
        <Audio src={staticFile("musique/vocal-pulse.mp3")} volume={0.75} />
      </Sequence>
    </AbsoluteFill>
  );
};

/** La commande s'écrit pendant qu'on l'entend : on comprend qu'elle est DITE. */
const PhraseParlee: React.FC<{ debut: number }> = ({ debut }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const texte = "« Prends la dernière vidéo de Squeezie »";
  const ecoule = Math.max(0, frame / fps - debut);
  const n = Math.min(texte.length, Math.round(ecoule * 20));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
      <div
        style={{
          width: 74,
          height: 74,
          borderRadius: 999,
          background: VERT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
          flexShrink: 0,
        }}
      >
        🎙
      </div>
      <div style={{ fontSize: 66, fontWeight: 800, color: "#fff", letterSpacing: -1.5 }}>
        {texte.slice(0, n)}
        <span style={{ opacity: n < texte.length ? 1 : 0, color: VERT }}>|</span>
      </div>
    </div>
  );
};
