import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill, interpolate, Sequence, Series, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from "remotion";
import { POLICE } from "./police";
import { COULEURS } from "./theme";
import { AppelCommentaire } from "./AppelCommentaire";
import { MontageALaMain } from "./MontageALaMain";
import type { ReglageParcours } from "./Parcours";

/**
 * « ARRÊTE DE CRÉER TES CLIPS COMME ÇA » — 1080x1920, 27 s.
 *
 * Structure en trois temps : le reproche, la douleur, le remède.
 *
 *    0,0 s   « ARRÊTE de créer tes clips comme ça »
 *    2,6 s   une timeline de montage, le chronomètre qui monte vers 2 h 14
 *    8,0 s   « 30 secondes »
 *    9,6 s   l'application, filmée : lien, analyse, grille des clips
 *   21,0 s   le clip en plein écran
 *   23,0 s   « Commente CLIP »
 *
 * ── POURQUOI CETTE FORME ET PAS LE PARCOURS HABITUEL ─────────────────────
 * Le Parcours montre ce que fait le produit. Celui-ci montre d'abord ce qu'on
 * arrête de faire. C'est la même démonstration, précédée de la raison d'y
 * prêter attention : un spectateur qui n'a jamais monté un clip à la main ne
 * comprend pas ce qu'on lui enlève, et « dix clips » ne lui dit rien.
 *
 * ── LE LOGICIEL MONTRÉ N'EXISTE PAS ──────────────────────────────────────
 * Timeline générique, dessinée ici, sans marque ni interface copiée. Voir
 * l'en-tête de MontageALaMain : filmer un concurrent pour le dire « pourri »
 * engage la marque sur un terrain sans gain, et une interface reproduite est
 * fausse dès la mise à jour suivante. Ce qu'on montre est ce que tous ces
 * logiciels ont en commun, et ce que le spectateur reconnaît en une
 * demi-seconde.
 *
 * ── LE CLIP TOURNE DERRIÈRE, DU DÉBUT À LA FIN ───────────────────────────
 * Y compris sous la timeline, qui est posée sur un voile. Demandé, et de toute
 * façon nécessaire : c'est lui qui porte le son, et une fenêtre de montage sur
 * fond noir pendant cinq secondes est une vidéo qu'on quitte.
 */

const FPS = 30;
export const DUREE_ARRETE = 810; // 27 s

const FIN_ACCROCHE = 78;         // 2,6 s
const MONTAGE_DEB = 78;
const MONTAGE_FIN = 240;         // 8,0 s
const BASCULE_FIN = 288;         // 9,6 s — « 30 secondes »
const APP_DEB = 288;
const APP_FIN = APP_DEB + 342;   // 21,0 s
const APPEL = DUREE_ARRETE - 180;

const VERT = "#10b981";

const contour = {
  WebkitTextStroke: "10px rgba(0,0,0,0.58)",
  paintOrder: "stroke fill" as const,
};

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * L'ACCROCHE. Lisible à l'image 0, sans animation d'entrée : 81 % de
 * spectateurs à 1 s, puis décrochage massif à 0:02 — ce qui décide, c'est ce que
 * le spectateur a COMPRIS à la deuxième seconde.
 *
 * « ARRÊTE » en gros et seul sur sa ligne : c'est l'ordre qui accroche, pas le
 * complément. Le reste de la phrase peut se lire en diagonale.
 */
const Accroche: React.FC = () => {
  const frame = useCurrentFrame();
  const sortie = interpolate(frame, [FIN_ACCROCHE - 12, FIN_ACCROCHE], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: sortie }}>
      <AbsoluteFill
        style={{
          backdropFilter: "brightness(1.35)",
          WebkitBackdropFilter: "brightness(1.35)",
        }}
      />
      <AbsoluteFill style={{ backgroundColor: "rgba(4,10,7,0.24)" }} />
      <AbsoluteFill
        style={{
          fontFamily: POLICE,
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          paddingLeft: 70,
          paddingRight: 70,
        }}
      >
        <div
          style={{
            fontSize: 148,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 0.96,
            letterSpacing: "-0.05em",
            ...contour,
          }}
        >
          ARRÊTE
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 66,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1.06,
            letterSpacing: "-0.03em",
            ...contour,
          }}
        >
          de créer tes clips
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 86,
            fontWeight: 900,
            color: COULEURS.vertClair,
            lineHeight: 1.04,
            letterSpacing: "-0.035em",
            ...contour,
          }}
        >
          comme ça
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * LA BASCULE. Un seul chiffre, une seule seconde et demie.
 *
 * Elle arrive sur la coupe qui tue la timeline : le contraste se joue là, pas
 * dans la phrase. Un plan plus long laisserait l'oeil revenir sur ce qu'on
 * vient de quitter.
 */
const Bascule: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({ frame, fps, config: { damping: 12, stiffness: 220, mass: 0.5 } });

  return (
    <AbsoluteFill
      style={{
        fontFamily: POLICE,
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        paddingLeft: 70,
        paddingRight: 70,
      }}
    >
      <AbsoluteFill style={{ backgroundColor: "rgba(4,10,7,0.42)" }} />
      <div style={{ position: "relative", transform: `scale(${interpolate(e, [0, 1], [0.7, 1])})` }}>
        <div
          style={{
            fontSize: 54,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.02em",
            ...contour,
          }}
        >
          alors que c’est
        </div>
        <div
          style={{
            fontSize: 172,
            fontWeight: 900,
            color: COULEURS.vertClair,
            lineHeight: 0.98,
            letterSpacing: "-0.05em",
            marginTop: 6,
            ...contour,
          }}
        >
          30 s
        </div>
        <div
          style={{
            fontSize: 54,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.02em",
            marginTop: 8,
            ...contour,
          }}
        >
          de travail
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */

/** Les trois vitesses de l'enregistrement, déduites des repères. Même principe
    que Parcours : rien n'est deviné, la vitesse est le rapport d'un intervalle
    réel à un nombre d'images. */
const AppAccelere: React.FC<{ reglage: ReglageParcours }> = ({ reglage }) => {
  const { enregistrement, reperes } = reglage;
  const src = staticFile(enregistrement);
  const phase = (debut: number, fin: number, images: number) => ({
    trimBefore: Math.round(debut * FPS),
    playbackRate: (fin - debut) / (images / FPS),
  });
  const p1 = phase(reperes.lien, reperes.analyse, 54);
  const p2 = phase(reperes.analyse, reperes.grille, 90);
  const p3 = phase(reperes.grille, reperes.modale, 198);

  return (
    <Series>
      <Series.Sequence durationInFrames={54} layout="none">
        <Video src={src} style={{ width: "100%", display: "block" }} {...p1} muted />
      </Series.Sequence>
      <Series.Sequence durationInFrames={90} layout="none">
        <Video src={src} style={{ width: "100%", display: "block" }} {...p2} muted />
      </Series.Sequence>
      <Series.Sequence durationInFrames={198} layout="none">
        <Video src={src} style={{ width: "100%", display: "block" }} {...p3} muted />
      </Series.Sequence>
    </Series>
  );
};

const LEGENDES: [number, number, string][] = [
  [0, 54, "Tu colles le lien"],
  [54, 144, "L’IA analyse la vidéo"],
  [144, 342, "Tes clips sont prêts"],
];

const Legende: React.FC<{ texte: string }> = ({ texte }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({ frame, fps, config: { damping: 16, stiffness: 220 } });
  return (
    <div style={{
      fontSize: 56, fontWeight: 800, color: "#fff", textAlign: "center",
      letterSpacing: "-0.025em", textShadow: "0 3px 22px rgba(0,0,0,0.95)",
      transform: `translateY(${interpolate(e, [0, 1], [34, 0])}px)`,
      opacity: interpolate(e, [0, 1], [0, 1]),
    }}>
      {texte}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */

export const ArreteComme: React.FC<{ reglage: ReglageParcours }> = ({ reglage }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const debutClip = Math.round(reglage.clipDebut * FPS);

  const voile = interpolate(frame, [APP_DEB - 8, APP_DEB + 10, APP_FIN - 12, APP_FIN + 6],
    [0, 0.76, 0.76, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const t = frame - APP_DEB;
  const e = spring({ frame: t, fps, config: { damping: 17, stiffness: 200 } });
  const sortie = interpolate(t, [APP_FIN - APP_DEB - 12, APP_FIN - APP_DEB], [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vis = (t >= 0 ? e : 0) * sortie;
  const leg = LEGENDES.find(([a, b]) => t >= a && t < b);

  return (
    <AbsoluteFill style={{ backgroundColor: "#050a07", fontFamily: POLICE }}>
      <Audio src={staticFile(reglage.clip)} trimBefore={debutClip} />

      <Sequence durationInFrames={DUREE_ARRETE} name="Clip">
        <Video
          src={staticFile(reglage.clip)}
          trimBefore={debutClip}
          style={{ width: "100%", height: "100%", filter: reglage.releve }}
          objectFit="cover"
          muted
        />
      </Sequence>

      <Sequence durationInFrames={FIN_ACCROCHE} name="Accroche">
        <Accroche />
      </Sequence>

      <Sequence from={MONTAGE_DEB} durationInFrames={MONTAGE_FIN - MONTAGE_DEB} name="Montage a la main">
        <MontageALaMain duree={MONTAGE_FIN - MONTAGE_DEB} />
      </Sequence>

      <Sequence from={MONTAGE_FIN} durationInFrames={BASCULE_FIN - MONTAGE_FIN} name="Bascule">
        <Bascule />
      </Sequence>

      {/* L'application, dans l'encart : mêmes zones sûres que Parcours — il
          démarre à 16 % (307 px) et finit à 58,5 %, entièrement dans la bande
          libre de TikTok. */}
      <Sequence from={APP_DEB} durationInFrames={APP_FIN - APP_DEB} name="L’app">
        <AbsoluteFill style={{ backgroundColor: `rgba(5,10,7,${voile})` }} />
        {vis > 0.01 ? (
          <>
            <AbsoluteFill style={{ alignItems: "center", paddingTop: 307 }}>
              <div style={{
                width: 480, borderRadius: 38, overflow: "hidden",
                border: `3px solid ${VERT}`,
                boxShadow: "0 40px 130px rgba(0,0,0,0.92)",
                opacity: vis,
                transform: `translateY(${interpolate(vis, [0, 1], [55, 0])}px) scale(${interpolate(vis, [0, 1], [0.96, 1])})`,
              }}>
                <AppAccelere reglage={reglage} />
              </div>
            </AbsoluteFill>
            {leg ? (
              <AbsoluteFill style={{ justifyContent: "flex-start", padding: "1230px 60px 0" }}>
                <Sequence from={leg[0]} durationInFrames={leg[1] - leg[0]} layout="none">
                  <div style={{ opacity: vis }}><Legende texte={leg[2]} /></div>
                </Sequence>
              </AbsoluteFill>
            ) : null}
          </>
        ) : null}
      </Sequence>

      <Sequence from={APPEL} durationInFrames={DUREE_ARRETE - APPEL} name="Appel a commenter">
        <AppelCommentaire duree={DUREE_ARRETE - APPEL} />
      </Sequence>
    </AbsoluteFill>
  );
};
