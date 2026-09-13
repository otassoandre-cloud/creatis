import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill, interpolate, Sequence, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from "remotion";
import { POLICE } from "./police";
import { Punch } from "./Punch";
import { CartonFinal } from "./posts/CartonFinal";

/**
 * DEMONSTRATION v3 — 1080x1920, 18 s.
 *
 * Ce que cette version apporte : l'application n'est plus montree a l'arret, on
 * la voit TRAVAILLER. Enregistrement Playwright d'une generation reelle, 210
 * secondes ramenees a 7 par acceleration x30. On y lit la barre de progression,
 * le minuteur qui tourne, et les etapes qui se cochent une a une —
 * « Recuperation transcription », « Transcription Whisper », « Identification des
 * clips ».
 *
 * CONSEQUENCE SUR LE MONTAGE : plus aucune etiquette « 1, 2, 3 ». L'ecran affiche
 * deja ses propres etapes, en mieux que ce que je peux ecrire par-dessus, et
 * superposer les deux ne faisait que charger l'image. Une seule ligne reste, sous
 * l'encart.
 *
 * POUR ENREGISTRER CETTE SESSION il a fallu trouver la bonne cle de stockage :
 * `Auth.getToken()` (js/auth.js) lit `creatis_sb_session`, pas la cle Supabase
 * standard `sb-<ref>-auth-token`. Les deux tentatives precedentes injectaient la
 * seconde : le studio s'affichait mais le clic sur « Creer les Shorts » renvoyait
 * vers la page de connexion.
 *
 * SOURCE. « 3H AVEC AMIXEM » sur Generation Do It Yourself, a une heure
 * d'episode. La fenetre 38,6-57,1 s est un gros plan continu sur Amixem, verifie
 * au pas de 2 secondes : ce podcast est filme en multi-camera et alterne avec des
 * plans larges de la table qui, recadres en 9:16, donnent une image vide. Trois
 * fenetres ont ete ecartees pour ca, dont une ou l'insert tombait a la dixieme
 * seconde.
 *
 * Le depart a ete recale de 36,8 a 38,6 s : a 36,8 la premiere image tombait sur
 * une lampe et non sur le visage. C'est l'image qui decide de tout — les chiffres
 * TikTok de la version precedente montraient un arret massif a 0:02.
 */
export const DUREE_V3 = 540;

const CLIP = 465;      // 15,5 s de clip
const APP_DEB = 120;   // 4,0 s
const APP_FIN = 315;   // 10,5 s

const VERT = "#10b981";
const RELEVE = "brightness(1.30) saturate(1.06)";

export const EtapesV3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const voile = interpolate(frame, [APP_DEB - 8, APP_DEB + 10, APP_FIN - 12, APP_FIN + 6],
    [0, 0.72, 0.72, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const t = frame - APP_DEB;
  const e = spring({ frame: t, fps, config: { damping: 16, stiffness: 190 } });
  const sortie = interpolate(t, [APP_FIN - APP_DEB - 12, APP_FIN - APP_DEB], [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vis = (t >= 0 ? e : 0) * sortie;

  return (
    <AbsoluteFill style={{ backgroundColor: "#050a07", fontFamily: POLICE }}>
      {/* Son du clip, jamais interrompu du premier au dernier cadre. */}
      <Audio src={staticFile("clip6.mp4")} />

      <Sequence durationInFrames={CLIP} name="Clip">
        <Video
          src={staticFile("clip6.mp4")}
          style={{ width: "100%", height: "100%", filter: RELEVE }}
          objectFit="cover"
          muted
        />
      </Sequence>

      <Sequence durationInFrames={CLIP} name="L’app génère">
        <AbsoluteFill style={{ backgroundColor: `rgba(5,10,7,${voile})` }} />

        {vis > 0.01 ? (
          <>
            {/* L'encart occupe 14 % a 68 % de la hauteur : sous le hook du clip
                (8 %) et au-dessus du quart bas recouvert par l'interface TikTok. */}
            <AbsoluteFill style={{ alignItems: "center", paddingTop: 250 }}>
              <div style={{
                width: 470, borderRadius: 36, overflow: "hidden",
                border: `3px solid ${VERT}`,
                boxShadow: "0 40px 120px rgba(0,0,0,0.9)",
                opacity: vis,
                transform: `translateY(${interpolate(vis, [0, 1], [60, 0])}px) scale(${interpolate(vis, [0, 1], [0.95, 1])})`,
              }}>
                <Video src={staticFile("gen-rapide.mp4")} style={{ width: "100%", display: "block" }} muted />
              </div>
            </AbsoluteFill>

            <AbsoluteFill style={{ justifyContent: "flex-start", paddingTop: 1360, padding: "1360px 64px 0" }}>
              <div style={{
                fontSize: 54, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em",
                lineHeight: 1.12, textAlign: "center", textShadow: "0 3px 20px rgba(0,0,0,0.9)",
                opacity: vis,
              }}>
                Tu colles un lien.<br />
                <span style={{ color: VERT }}>L’IA fait tout le reste.</span>
              </div>
            </AbsoluteFill>
          </>
        ) : null}
      </Sequence>

      <Sequence from={CLIP} durationInFrames={DUREE_V3 - CLIP} name="Créatis">
        <Punch><CartonFinal clair mention="Sous-titres et recadrage automatiques" /></Punch>
      </Sequence>
    </AbsoluteFill>
  );
};
