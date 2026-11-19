import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Barres, CarteClip } from "./Illustrations";
import { POLICE } from "./police";

/**
 * L'AUTONOMIE — 1920×1080, format long du 08/10.
 *
 * ── POURQUOI CE SUJET AUJOURD'HUI ────────────────────────────────────────
 * Le Short d'hier (« Ta dernière vidéo contient dix moments comme ceux-là »)
 * est passé de 361 vues à 1 207 en vingt-quatre heures, là où les précédents
 * plafonnaient à 232. La seule différence tenait à sa forme : aucun produit,
 * le problème du spectateur, des clips finis. Ce film pousse cette forme au
 * format long et développe la règle que le Short ne faisait qu'énoncer.
 *
 * ── CE QUI LE REND VISUEL, ET NON « TOUT PLAT » ──────────────────────────
 * Quatre scènes sur dix montrent un VRAI clip qui tourne, pris dans les
 * tournages de la semaine, cadré serré pour que l'interface sorte du champ.
 * Les trois fautes sont montrées comme on les voit à l'écran — une réplique
 * sous-titrée, le mot fautif entouré de rouge — et non décrites en diapositive.
 *
 * ── LES BORNES ───────────────────────────────────────────────────────────
 * Relevées au `silencedetect` sur narration-autonomie.mp3 (69,7 s), jamais
 * estimées : une borne devinée fait parler la voix par-dessus la scène
 * suivante, et ça s'entend plus que ça ne se voit.
 */

const VERT = "#10b981";
const FOND = "#0a0f0a";
const ROUGE = "#f87171";

const S = {
  ouverture: [0, 9.97],
  regle: [9.97, 14.53],
  autonomie: [14.53, 22.25],
  trois: [22.25, 23.89],
  faute1: [23.89, 31.42],
  faute2: [31.42, 36.36],
  faute3: [36.36, 44.45],
  test: [44.45, 58.81],
  listes: [58.81, 64.54],
  final: [64.54, 69.7],
} as const;

/* Une seconde et demie de respiration après la dernière syllabe : couper net
   sur le dernier mot donne l'impression d'un fichier tronqué. */
export const DUREE_AUTONOMIE = Math.round(71.3 * 30);

/* Cadre utile de l'app dans les enregistrements : le lecteur seul. */
const CADRE: [number, number, number, number] = [150, 300, 540, 980];

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

/**
 * Une réplique telle qu'elle apparaît sous un clip, avec le mot fautif entouré.
 * C'est la faute MONTRÉE : décrire « un pronom sans antécédent » ne dit rien,
 * voir « IL » encerclé en rouge sous un visage se comprend en une seconde.
 */
const Replique: React.FC<{ avant: string; faute: string; apres: string; retard: number }> = ({
  avant,
  faute,
  apres,
  retard,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = entree(frame, fps, retard);
  const cercle = interpolate(frame - Math.round((retard + 0.9) * fps), [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        fontSize: 56,
        fontWeight: 900,
        color: "#fff",
        opacity: v,
        letterSpacing: -1,
        lineHeight: 1.3,
      }}
    >
      « {avant}
      <span style={{ position: "relative", display: "inline-block", padding: "0 10px" }}>
        <span style={{ color: ROUGE }}>{faute}</span>
        <span
          style={{
            position: "absolute",
            inset: "-14px -4px",
            border: `5px solid ${ROUGE}`,
            borderRadius: "50%",
            clipPath: `inset(0 ${(1 - cercle) * 100}% 0 0)`,
          }}
        />
      </span>
      {apres} »
    </div>
  );
};

/** Un bloc de faute : le numéro, la réplique fautive, et pourquoi ça tue. */
const Faute: React.FC<{
  numero: number;
  nom: string;
  replique: { avant: string; faute: string; apres: string };
  pourquoi: React.ReactNode;
  clip?: { source: string; rec: number };
}> = ({ numero, nom, replique, pourquoi, clip }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        padding: "90px 120px",
        flexDirection: "row",
        gap: 70,
        alignItems: "center",
      }}
    >
      {clip ? (
        <CarteClip
          source={clip.source}
          rec={clip.rec}
          cadre={CADRE}
          largeur={380}
          hauteur={676}
        />
      ) : null}
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 22,
            opacity: entree(frame, fps, 0.15),
          }}
        >
          <span style={{ fontSize: 78, fontWeight: 900, color: ROUGE, letterSpacing: -4 }}>
            {numero}
          </span>
          <span style={{ fontSize: 52, fontWeight: 800, color: "#fff", letterSpacing: -1.5 }}>
            {nom}
          </span>
        </div>
        <div style={{ marginTop: 38 }}>
          <Replique {...replique} retard={1.5} />
        </div>
        <div
          style={{
            marginTop: 34,
            fontSize: 42,
            color: VERT,
            fontWeight: 800,
            lineHeight: 1.35,
            opacity: entree(frame, fps, 3.4),
          }}
        >
          {pourquoi}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Autonomie: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = (retard: number) => entree(frame, fps, retard);

  return (
    <AbsoluteFill style={{ backgroundColor: FOND, fontFamily: POLICE }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: VERT }} />

      {/* ── 1. LA MESURE — deux barres, pas deux phrases ─────────────────── */}
      <Scene bornes={S.ouverture}>
        <AbsoluteFill style={{ padding: "110px 140px", justifyContent: "center" }}>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: 1,
              marginBottom: 34,
            }}
          >
            MÊME COMPTE, MÊME SEMAINE, MÊME OUTIL
          </div>
          <Barres
            debut={0.5}
            valeurs={[
              { etiquette: "Le short d'hier", valeur: 1207 },
              { etiquette: "Celui d'avant", valeur: 232, mauvais: true },
            ]}
          />
          <div
            style={{
              fontSize: 44,
              color: "rgba(255,255,255,0.8)",
              marginTop: 42,
              opacity: e(6.6),
            }}
          >
            Une seule chose a changé — et ce n&apos;est pas l&apos;outil.
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── 2. LA RÈGLE ──────────────────────────────────────────────────── */}
      <Scene bornes={S.regle}>
        <AbsoluteFill style={{ padding: 150, justifyContent: "center" }}>
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: VERT,
              letterSpacing: 2,
              opacity: e(0.1),
            }}
          >
            LA RÈGLE
          </div>
          <div
            style={{
              fontSize: 92,
              fontWeight: 900,
              color: "#fff",
              letterSpacing: -3,
              lineHeight: 1.1,
              marginTop: 24,
              opacity: e(0.6),
            }}
          >
            Elle s&apos;applique à chaque passage
            <br />
            que tu découpes.
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── 3. LA DÉFINITION, à côté d'un clip qui tourne ─────────────────── */}
      <Scene bornes={S.autonomie}>
        <AbsoluteFill
          style={{ padding: "80px 120px", flexDirection: "row", gap: 80, alignItems: "center" }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 62,
                fontWeight: 900,
                color: "#fff",
                lineHeight: 1.18,
                letterSpacing: -2,
                opacity: e(0.2),
              }}
            >
              Un clip doit se comprendre
              <br />
              <span style={{ color: VERT }}>sans la vidéo dont il sort.</span>
            </div>
            <div
              style={{
                marginTop: 44,
                fontSize: 46,
                color: "rgba(255,255,255,0.82)",
                lineHeight: 1.35,
                opacity: e(3.4),
              }}
            >
              Ça s&apos;appelle l&apos;autonomie.
              <br />
              C&apos;est le critère qui décide avant tous les autres.
            </div>
          </div>
          <CarteClip source="rec-croce-h264.mp4" rec={239.2} cadre={CADRE} largeur={400} hauteur={711} />
        </AbsoluteFill>
      </Scene>

      {/* ── 4. TROIS CHOSES ──────────────────────────────────────────────── */}
      <Scene bornes={S.trois}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 40 }}>
            {[1, 2, 3].map((n, k) => (
              <div
                key={n}
                style={{
                  width: 190,
                  height: 190,
                  borderRadius: 28,
                  border: `5px solid ${ROUGE}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 104,
                  fontWeight: 900,
                  color: ROUGE,
                  opacity: e(0.1 + k * 0.28),
                  transform: `scale(${interpolate(e(0.1 + k * 0.28), [0, 1], [0.7, 1])})`,
                }}
              >
                {n}
              </div>
            ))}
          </div>
          <div
            style={{
              fontSize: 54,
              fontWeight: 800,
              color: "#fff",
              marginTop: 48,
              opacity: e(0.9),
            }}
          >
            Trois choses la détruisent.
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.faute1}>
        <Faute
          numero={1}
          nom="UN PRONOM SANS ANTÉCÉDENT"
          replique={{ avant: "", faute: "Il", apres: " m'a dit que…" }}
          pourquoi={
            <>
              Qui, il ? Le spectateur ne le saura jamais.
              <br />
              Alors il part.
            </>
          }
          clip={{ source: "rec-norman-h264.mp4", rec: 194 }}
        />
      </Scene>

      <Scene bornes={S.faute2}>
        <Faute
          numero={2}
          nom="UN PRÉNOM JAMAIS PRÉSENTÉ"
          replique={{ avant: "et là ", faute: "Jordan", apres: " se retourne…" }}
          pourquoi="Toi tu connais la personne. Lui, non."
        />
      </Scene>

      <Scene bornes={S.faute3}>
        <Faute
          numero={3}
          nom="UNE RÉPONSE SANS SA QUESTION"
          replique={{ avant: "", faute: "Ouais, carrément", apres: ", c'est exactement ça" }}
          pourquoi={
            <>
              La plus fréquente des trois.
              <br />
              Le passage ouvre sur une réponse, et personne ne sait sur quoi.
            </>
          }
          clip={{ source: "rec-domingo-h264.mp4", rec: 758 }}
        />
      </Scene>

      {/* ── 8. LE TEST ───────────────────────────────────────────────────── */}
      <Scene bornes={S.test}>
        <AbsoluteFill
          style={{ padding: "80px 120px", flexDirection: "row", gap: 80, alignItems: "center" }}
        >
          <CarteClip source="rec-mastu-h264.mp4" rec={230} cadre={CADRE} largeur={400} hauteur={711} />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 40,
                fontWeight: 800,
                color: VERT,
                letterSpacing: 2,
                opacity: e(0.15),
              }}
            >
              LE TEST — DIX SECONDES
            </div>
            <div
              style={{
                fontSize: 58,
                fontWeight: 900,
                color: "#fff",
                lineHeight: 1.2,
                letterSpacing: -2,
                marginTop: 22,
                opacity: e(0.7),
              }}
            >
              Montre le passage à quelqu&apos;un
              <br />
              qui n&apos;a pas vu la vidéo.
            </div>
            <div
              style={{
                marginTop: 40,
                fontSize: 50,
                fontWeight: 800,
                color: ROUGE,
                lineHeight: 1.3,
                opacity: e(4.4),
              }}
            >
              S&apos;il demande le contexte, le clip est mort.
            </div>
            <div
              style={{
                marginTop: 26,
                fontSize: 44,
                color: "rgba(255,255,255,0.82)",
                lineHeight: 1.35,
                opacity: e(8.2),
              }}
            >
              Même si le moment est excellent.
              <br />
              <span style={{ color: VERT, fontWeight: 800 }}>
                Surtout s&apos;il est excellent : c&apos;est là qu&apos;on se ment.
              </span>
            </div>
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── 9. DEUX LISTES ───────────────────────────────────────────────── */}
      <Scene bornes={S.listes}>
        <AbsoluteFill style={{ padding: "110px 140px", justifyContent: "center" }}>
          <div style={{ display: "flex", gap: 90, alignItems: "stretch" }}>
            {[
              { t: "Les meilleurs moments", n: "une longue liste", bon: false, r: 0.2 },
              { t: "Ceux qui tiennent seuls", n: "beaucoup plus courte", bon: true, r: 2.2 },
            ].map((c) => (
              <div
                key={c.t}
                style={{
                  flex: 1,
                  padding: "40px 44px",
                  borderRadius: 24,
                  border: `4px solid ${c.bon ? VERT : "rgba(255,255,255,0.18)"}`,
                  opacity: e(c.r),
                }}
              >
                <div
                  style={{
                    fontSize: 46,
                    fontWeight: 900,
                    color: c.bon ? VERT : "rgba(255,255,255,0.72)",
                  }}
                >
                  {c.t}
                </div>
                <div style={{ fontSize: 38, color: "rgba(255,255,255,0.6)", marginTop: 16 }}>
                  {c.n}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              fontSize: 46,
              color: "#fff",
              fontWeight: 800,
              marginTop: 48,
              opacity: e(4.0),
            }}
          >
            Ce sont deux listes différentes.
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── 10. CE QU'ON FAIT CE SOIR ────────────────────────────────────── */}
      <Scene bornes={S.final}>
        <AbsoluteFill style={{ padding: 150, justifyContent: "center" }}>
          <div
            style={{
              fontSize: 80,
              fontWeight: 900,
              color: "#fff",
              letterSpacing: -3,
              lineHeight: 1.14,
              opacity: e(0.1),
            }}
          >
            Commence ta prochaine coupe
            <br />
            par une phrase qui pose la situation.
          </div>
          <div
            style={{
              fontSize: 56,
              color: ROUGE,
              marginTop: 30,
              fontWeight: 900,
              opacity: e(2.6),
            }}
          >
            Jamais par la punchline.
          </div>
        </AbsoluteFill>
      </Scene>

      <Audio src={staticFile("voix/narration-autonomie.mp3")} />

      {/* Le son des clips, discret, sous la voix : on entend qu'ils tournent. */}
      {[
        { b: S.autonomie, f: "son-clip-croce.mp3", d: 12.6 },
        { b: S.faute1, f: "son-clip-norman.mp3", d: 8.7 },
        { b: S.faute3, f: "son-clip-domingo.mp3", d: 9.5 },
        { b: S.test, f: "son-clip-mastu.mp3", d: 7.3 },
      ].map((s) => (
        <Sequence
          key={s.f}
          from={Math.round(s.b[0] * fps)}
          durationInFrames={Math.round((s.b[1] - s.b[0]) * fps)}
          layout="none"
        >
          <Audio src={staticFile(s.f)} trimBefore={Math.round(s.d * fps)} volume={0.14} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
