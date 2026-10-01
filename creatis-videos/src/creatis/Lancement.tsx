import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { POLICE } from "./police";
import { COULEURS } from "./theme";

/**
 * LANCEMENT — film de présentation de Créatis. 1920x1080, 32 s, voix off.
 *
 * ── CE QUE C'EST, ET CE QUE CE N'EST PAS ─────────────────────────────────
 * C'est une PUB : un film de lancement qui présente le produit et ce qu'il
 * permet. Ce n'est pas un tutoriel, pas un schéma explicatif. La différence est
 * dans l'intention — un tutoriel apprend un geste, une pub donne une raison.
 *
 * ── L'ANGLE : L'ARGENT, PAS LE TEMPS GAGNÉ ───────────────────────────────
 * « Une heure de montage en trois minutes » a été écarté : tous les outils de
 * la catégorie le disent, ça ne distingue rien. L'angle retenu est le marché —
 * les marques paient pour être clippées, et il y a une échéance datée.
 * Les chiffres cités sont ceux relevés : 1,4 million de dollars versés à 303
 * personnes, et la sortie de GTA 6 le 19 novembre.
 *
 * ── LE COMPTE À REBOURS SE CALCULE ───────────────────────────────────────
 * Le nombre de jours restants n'est PAS écrit en dur : il est calculé à la date
 * du rendu. Un film de lancement qui annonce « 49 jours » en novembre devient
 * un mensonge, et ce genre de détail se voit immédiatement.
 *
 * ── LE SILENCE EST VOULU ─────────────────────────────────────────────────
 * La voix dure 22,5 s et le film 32. Elle commence à 2 s et finit à 24,5 : une
 * ouverture muette pour poser l'image, une chute muette pour laisser l'adresse
 * s'imprimer. Une pub qui parle du début à la fin ne respire pas, et c'est ce
 * qui la fait couper.
 *
 * ── RÈGLES DU 16:9, reprises de TutoYouTube ──────────────────────────────
 * Le spectateur est devant une grande dalle, pas un téléphone. Pleine image,
 * typographie mesurée, et rien d'important sous 88 % ni dans le coin haut-droit
 * — la barre de progression et les fiches YouTube y passent.
 */

const FPS = 30;
export const DUREE_LANCEMENT = 32 * FPS; // 960 images

/** La voix commence APRÈS l'ouverture muette. */
const VOIX_A = 2.0;

/** La date de sortie de GTA 6, pour le compte à rebours. */
const SORTIE_GTA = new Date("2026-11-19T00:00:00Z");

/** Repères du film, en secondes. Calés sur les frontières de phrases de la voix. */
const T = {
  ouverture: 0,
  marques: 2.0,
  chiffre: 4.1,
  clips: 7.9,
  echeance: 10.8,
  volume: 14.6,
  produit: 18.2,
  choix: 23.1,
  adresse: 25.4,
};

const ressort = (frame: number, fps: number, retard = 0) =>
  spring({ frame: frame - retard, fps, config: { damping: 28, stiffness: 130, mass: 0.8 } });

/** Visible entre deux instants, avec entrée et sortie douces. */
const fenetre = (s: number, a: number, b: number, fondu = 0.35) =>
  interpolate(s, [a, a + fondu, b - fondu, b], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const Lancement: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const s = frame / fps;

  const jours = Math.max(0, Math.ceil((SORTIE_GTA.getTime() - Date.now()) / 86400000));

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(130% 90% at 50% 0%, #0f1f18 0%, ${COULEURS.fond} 62%)`,
        fontFamily: POLICE,
        color: "#fff",
      }}
    >
      {/* ── 0 → 2 s : ouverture muette. Une ligne qui se trace, rien d'autre.
             Le silence du début est ce qui fait lever la tête. ── */}
      <Ouverture s={s} width={width} height={height} />

      {/* ── 2 → 4 s : la phrase d'attaque ── */}
      <Phrase
        texte="Les marques paient pour être clippées."
        o={fenetre(s, T.marques, T.chiffre - 0.1)}
        width={width}
        height={height}
      />

      {/* ── 4 → 7,9 s : LE CHIFFRE. Il monte, il ne s'affiche pas. ── */}
      <Chiffre s={s} frame={frame} fps={fps} width={width} height={height} />

      {/* ── 7,9 → 10,8 s : ce pour quoi on paie — une longue barre qui éclate ── */}
      <Eclatement s={s} width={width} height={height} />

      {/* ── 10,8 → 14,6 s : l'échéance, avec le compte à rebours calculé ── */}
      <Echeance s={s} frame={frame} fps={fps} jours={jours} width={width} height={height} />

      {/* ── 14,6 → 18,2 s : le volume. Une grille qui se remplit vite. ── */}
      <Volume s={s} frame={frame} fps={fps} width={width} height={height} />

      {/* ── 18,2 → 23,1 s : le produit, l'interface animée ── */}
      <Produit s={s} frame={frame} fps={fps} width={width} height={height} />

      {/* ── 23,1 → 25,4 s : ce qui reste à l'humain ── */}
      <Phrase
        texte="Toi, tu choisis. Et tu publies."
        o={fenetre(s, T.choix, T.adresse - 0.1)}
        width={width}
        height={height}
      />

      {/* ── 25,4 → 32 s : l'adresse, et le silence ── */}
      <Adresse s={s} frame={frame} fps={fps} width={width} height={height} />

      <Sequence from={Math.round(VOIX_A * FPS)} name="Voix off">
        <Audio src={staticFile("voix/lancement.mp3")} />
      </Sequence>
    </AbsoluteFill>
  );
};

/* ───────────────────────────────────────────────────────────────────────── */

const Phrase: React.FC<{ texte: string; o: number; width: number; height: number }> = ({
  texte, o, width, height,
}) => (
  <div
    style={{
      position: "absolute",
      top: height * 0.42,
      left: width * 0.1,
      right: width * 0.1,
      textAlign: "center",
      opacity: o,
      transform: `translateY(${interpolate(o, [0, 1], [22, 0])}px)`,
      fontSize: 92,
      fontWeight: 800,
      lineHeight: 1.1,
      letterSpacing: -2,
    }}
  >
    {texte}
  </div>
);

/** L'ouverture : une ligne horizontale qui se trace, puis se replie. */
const Ouverture: React.FC<{ s: number; width: number; height: number }> = ({ s, width, height }) => {
  const trace = interpolate(s, [0.25, 1.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const o = fenetre(s, 0, T.marques + 0.3, 0.3);
  return (
    <div
      style={{
        position: "absolute",
        top: height * 0.5,
        left: width * 0.5 - (width * 0.62 * trace) / 2,
        width: width * 0.62 * trace,
        height: 5,
        borderRadius: 3,
        background: `linear-gradient(90deg, transparent, ${COULEURS.vert}, transparent)`,
        opacity: o,
        boxShadow: `0 0 50px 10px rgba(16,185,129,0.35)`,
      }}
    />
  );
};

/** Le chiffre qui monte. Un montant posé ne se lit pas ; un montant qui défile se regarde. */
const Chiffre: React.FC<{ s: number; frame: number; fps: number; width: number; height: number }> = ({
  s, frame, fps, width, height,
}) => {
  const o = fenetre(s, T.chiffre, T.clips - 0.1);
  const montee = interpolate(s, [T.chiffre + 0.1, T.chiffre + 2.0], [0, 1400000], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const sous = ressort(frame, fps, (T.chiffre + 2.1) * fps);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div
        style={{
          position: "absolute",
          top: height * 0.33,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 190,
          fontWeight: 800,
          letterSpacing: -6,
          color: COULEURS.vertClair,
          textShadow: "0 10px 60px rgba(16,185,129,0.3)",
        }}
      >
        {Math.round(montee).toLocaleString("fr-FR")} $
      </div>
      <div
        style={{
          position: "absolute",
          top: height * 0.58,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 56,
          fontWeight: 600,
          color: COULEURS.texteDoux,
          opacity: sous,
          transform: `translateY(${interpolate(sous, [0, 1], [16, 0])}px)`,
        }}
      >
        versés à 303 personnes
      </div>
    </AbsoluteFill>
  );
};

/** Une barre longue qui éclate en clips courts. Le propos devient visible. */
const Eclatement: React.FC<{ s: number; width: number; height: number }> = ({ s, width, height }) => {
  const o = fenetre(s, T.clips, T.echeance - 0.1);
  const ecarte = interpolate(s, [T.clips + 0.5, T.clips + 1.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  if (o <= 0) return null;
  const n = 7;
  const totalL = width * 0.72;
  const blocL = totalL / n;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div
        style={{
          position: "absolute",
          top: height * 0.44,
          left: (width - totalL) / 2,
          width: totalL,
          height: 118,
          display: "flex",
        }}
      >
        {Array.from({ length: n }).map((_, i) => (
          <div
            key={i}
            style={{
              width: blocL - ecarte * 16,
              height: "100%",
              marginRight: ecarte * 16,
              borderRadius: 4 + ecarte * 10,
              background: i === 2
                ? `linear-gradient(180deg, ${COULEURS.vert}, ${COULEURS.vertSombre})`
                : "rgba(255,255,255,0.14)",
              transform: `translateY(${ecarte * (i % 2 === 0 ? -14 : 14)}px)`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          top: height * 0.62,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 62,
          fontWeight: 700,
        }}
      >
        Pas des vidéos. Des clips de trente secondes.
      </div>
    </AbsoluteFill>
  );
};

/** L'échéance, avec le nombre de jours calculé à la date du rendu. */
const Echeance: React.FC<{
  s: number; frame: number; fps: number; jours: number; width: number; height: number;
}> = ({ s, frame, fps, jours, width, height }) => {
  const o = fenetre(s, T.echeance, T.volume - 0.1);
  const a = ressort(frame, fps, (T.echeance + 0.3) * fps);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div
        style={{
          position: "absolute",
          top: height * 0.3,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 84,
          fontWeight: 800,
          letterSpacing: -2,
        }}
      >
        GTA 6 — 19 novembre
      </div>
      <div
        style={{
          position: "absolute",
          top: height * 0.47,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: a,
          transform: `scale(${interpolate(a, [0, 1], [0.8, 1])})`,
        }}
      >
        <span style={{ fontSize: 210, fontWeight: 800, color: COULEURS.vertClair, letterSpacing: -8 }}>
          {jours}
        </span>
        <span style={{ fontSize: 66, fontWeight: 700, color: COULEURS.texteDoux, marginLeft: 20 }}>
          jours
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          top: height * 0.76,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 50,
          fontWeight: 600,
          color: COULEURS.texteDoux,
        }}
      >
        La fenêtre est ouverte maintenant.
      </div>
    </AbsoluteFill>
  );
};

/** Le volume : une grille qui se remplit en cascade, vite. */
const Volume: React.FC<{ s: number; frame: number; fps: number; width: number; height: number }> = ({
  s, frame, fps, width, height,
}) => {
  const o = fenetre(s, T.volume, T.produit - 0.1);
  if (o <= 0) return null;
  const cols = 8;
  const lignes = 3;
  const caseL = (width * 0.74) / cols;
  const caseH = caseL * 1.5;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div
        style={{
          position: "absolute",
          top: height * 0.22,
          left: (width - caseL * cols) / 2,
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${caseL}px)`,
          gap: 10,
        }}
      >
        {Array.from({ length: cols * lignes }).map((_, i) => {
          const a = ressort(frame, fps, (T.volume + 0.25 + i * 0.035) * fps);
          return (
            <div
              key={i}
              style={{
                width: caseL - 10,
                height: caseH - 10,
                borderRadius: 8,
                background: "linear-gradient(170deg, #17222a, #0d1418)",
                border: `1px solid ${COULEURS.ligne}`,
                opacity: a,
                transform: `scale(${interpolate(a, [0, 1], [0.7, 1])})`,
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          top: height * 0.8,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 58,
          fontWeight: 700,
        }}
      >
        Il en faut des dizaines. Chaque semaine.
      </div>
    </AbsoluteFill>
  );
};

/** Le produit : l'adresse collée, l'analyse, la grille notée, la bascule. */
const Produit: React.FC<{ s: number; frame: number; fps: number; width: number; height: number }> = ({
  s, frame, fps, width, height,
}) => {
  const o = fenetre(s, T.produit, T.choix - 0.1);
  if (o <= 0) return null;

  const champ = ressort(frame, fps, (T.produit + 0.1) * fps);
  const scan = interpolate(s, [T.produit + 0.9, T.produit + 2.0], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic),
  });
  const notes = [92, 90, 88, 86, 85];

  const carteL = width * 0.62;
  const carteH = 150;

  return (
    <AbsoluteFill style={{ opacity: o }}>
      {/* Le champ où l'on colle l'adresse */}
      <div
        style={{
          position: "absolute",
          top: height * 0.2,
          left: (width - carteL) / 2,
          width: carteL,
          height: carteH * 0.62,
          borderRadius: 14,
          background: "#0e1519",
          border: `2px solid ${scan > 0 ? COULEURS.vert : COULEURS.ligne}`,
          display: "flex",
          alignItems: "center",
          paddingLeft: 28,
          fontSize: 42,
          color: COULEURS.texteDoux,
          opacity: champ,
          transform: `translateY(${interpolate(champ, [0, 1], [18, 0])}px)`,
        }}
      >
        youtube.com/watch?v=…
      </div>

      {/* La grille des clips notés, en cascade */}
      <div
        style={{
          position: "absolute",
          top: height * 0.38,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 22,
        }}
      >
        {notes.map((n, i) => {
          const a = ressort(frame, fps, (T.produit + 2.2 + i * 0.12) * fps);
          const garde = i === 0;
          return (
            <div
              key={n}
              style={{
                width: 150,
                height: 266,
                borderRadius: 14,
                background: "linear-gradient(170deg, #18242b, #0c1216)",
                border: `2px solid ${garde ? COULEURS.vert : COULEURS.ligne}`,
                opacity: a,
                transform: `translateY(${interpolate(a, [0, 1], [26, 0])}px) scale(${garde ? interpolate(a, [0, 1], [0.9, 1.06]) : 1})`,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  background: garde ? COULEURS.vert : "rgba(255,255,255,0.14)",
                  color: garde ? "#04150d" : "#fff",
                  padding: "4px 12px",
                  borderRadius: 8,
                  fontSize: 28,
                  fontWeight: 800,
                }}
              >
                {n}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          top: height * 0.8,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 54,
          fontWeight: 700,
        }}
      >
        Recadrés, sous-titrés, notés.
      </div>
    </AbsoluteFill>
  );
};

/** L'adresse finale, et le silence. */
const Adresse: React.FC<{ s: number; frame: number; fps: number; width: number; height: number }> = ({
  s, frame, fps, width, height,
}) => {
  const a = ressort(frame, fps, T.adresse * fps);
  if (s < T.adresse - 0.3) return null;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: height * 0.42,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: a,
          transform: `scale(${interpolate(a, [0, 1], [0.92, 1])})`,
        }}
      >
        <div style={{ fontSize: 128, fontWeight: 800, letterSpacing: -4 }}>creatis.app</div>
        <div
          style={{
            marginTop: 26,
            fontSize: 48,
            fontWeight: 600,
            color: COULEURS.texteDoux,
            opacity: interpolate(s, [T.adresse + 0.6, T.adresse + 1.1], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            }),
          }}
        >
          Une vidéo longue. Dix clips prêts à poster.
        </div>
      </div>
    </AbsoluteFill>
  );
};
