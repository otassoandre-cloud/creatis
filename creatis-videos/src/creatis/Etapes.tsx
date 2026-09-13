import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill, Easing, interpolate, Sequence, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from "remotion";
import { POLICE } from "./police";
import { Punch } from "./Punch";
import { CartonFinal } from "./posts/CartonFinal";

/**
 * DEMONSTRATION ETAPE PAR ETAPE — 1080x1920, 27 s.
 *
 * Source : « 48H AVEC GESSIME YASSINE » de Just Riadh, 1,9 M de vues, publiee le
 * 28/08/2026, 1 h 08. Recente, virale, francophone, et dans l'economie des
 * createurs — l'audience visee. Les debats politiques sortaient plus haut en vues
 * mais ont ete ecartes : associer la marque a ce terrain se paie.
 *
 * Le clip montre a la fin est une VRAIE sortie de Creatis, produite par le
 * pipeline complet : transcription Whisper mot par mot, recadrage 9:16 suivi sur
 * le visage, sous-titres karaoke incrustes. Aucun retraitement.
 *
 * AUCUN SILENCE. Le son du clip tourne EN CONTINU au niveau de la composition, et
 * la video du clip joue en fond sur toute sa duree. Les etapes se posent
 * PAR-DESSUS pendant les 9,5 premieres secondes. Trois consequences : la voix ne
 * s'interrompt jamais, l'image rejoint le son exactement a 9,5 s sans calcul de
 * decalage, et aucune seconde n'est montree deux fois.
 *
 * POURQUOI DES ETAPES DESSINEES ET PAS QUE DES CAPTURES. L'ecran du studio est
 * filme pour de vrai (Playwright, vraie session : on voit l'apercu de la video
 * Just Riadh apparaitre). Mais les etapes 2 et 3 se passent cote serveur, il n'y
 * a rien a filmer. Elles sont donc dessinees — reperes sur une frise, puis cadre
 * 9:16 qui se referme sur le 16:9 avec la bande de sous-titres qui s'allume. Le
 * meme plan source traverse les trois etapes : c'est ce qui rend la
 * transformation lisible, meme image, cadre qui change.
 */
export const DUREE_ETAPES = 810;

const CLIP = 720; // 24 s de clip, son continu
const E1 = 75;    // 0,0 → 2,5 s : le probleme
const E2 = 165;   // 2,5 → 5,5 s : coller le lien (ecran filme)
const E3 = 225;   // 5,5 → 7,5 s : reperage
const E4 = 285;   // 7,5 → 9,5 s : recadrage + sous-titres

const VERT = "#10b981";
const FOND = "#050a07";

const Titre: React.FC<{ n?: string; texte: string; sous?: string }> = ({ n, texte, sous }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({ frame, fps, config: { damping: 15, stiffness: 200 } });
  return (
    <div style={{
      transform: `translateY(${interpolate(e, [0, 1], [46, 0])}px)`,
      opacity: interpolate(e, [0, 1], [0, 1]),
      display: "flex", alignItems: "center", gap: 20,
    }}>
      {n ? (
        <div style={{
          width: 78, height: 78, borderRadius: 24, background: VERT, color: "#05140B",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 44, fontWeight: 800, flexShrink: 0,
        }}>{n}</div>
      ) : null}
      <div>
        <div style={{
          fontSize: 58, fontWeight: 800, color: "#fff", letterSpacing: "-0.025em",
          lineHeight: 1.08, textShadow: "0 3px 20px rgba(0,0,0,0.85)",
        }}>{texte}</div>
        {sous ? (
          <div style={{ fontSize: 36, fontWeight: 600, color: VERT, marginTop: 8 }}>{sous}</div>
        ) : null}
      </div>
    </div>
  );
};

/* Les libelles sont EN HAUT, pas en bas. TikTok et Instagram posent leur propre
   interface sur le quart inferieur de l'ecran — legende, boutons, pseudo — et tout
   texte place la se retrouve masque chez une partie des spectateurs. Meme raison
   pour laquelle les sous-titres du clip ont ete remontes de sub_y 78 a 52. */
const Haut: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ justifyContent: "flex-start", padding: "180px 60px 0" }}>
    {children}
  </AbsoluteFill>
);

const Source: React.FC = () => (
  <div style={{
    width: 1000, aspectRatio: "16 / 9", borderRadius: 18, overflow: "hidden",
    border: "2px solid rgba(255,255,255,0.16)", boxShadow: "0 30px 90px rgba(0,0,0,0.7)",
  }}>
    <Video src={staticFile("source-169.mp4")} style={{ width: "100%", height: "100%" }}
      objectFit="cover" muted loop />
  </div>
);

export const Etapes: React.FC = () => {
  const frame = useCurrentFrame();

  /* Etape 3 : le cadre vertical se referme sur le 16:9. */
  const t4 = frame - E3;
  const serrage = interpolate(t4, [6, 44], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.bezier(0.3, 0, 0.2, 1),
  });
  const largeurCadre = interpolate(serrage, [0, 1], [608, 1000]);
  const bande = interpolate(t4, [34, 50], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: FOND, fontFamily: POLICE }}>
      {/* Son du clip : jamais interrompu, du premier au dernier cadre. */}
      <Audio src={staticFile("clip-riadh.mp4")} />

      {/* Le clip joue en fond sur toute sa duree ; les etapes se posent dessus. */}
      <Sequence durationInFrames={CLIP} name="Clip">
        <Video src={staticFile("clip-riadh.mp4")} style={{ width: "100%", height: "100%" }}
          objectFit="cover" muted />
      </Sequence>

      <Sequence durationInFrames={E1} name="0 · la video source">
        <AbsoluteFill style={{ backgroundColor: FOND, alignItems: "center", justifyContent: "center", paddingTop: 150 }}>
          <Source />
        </AbsoluteFill>
        <Haut><Titre texte="1 h 08 de vidéo" sous="1,9 M de vues · Just Riadh" /></Haut>
      </Sequence>

      <Sequence from={E1} durationInFrames={E2 - E1} name="1 · coller le lien">
        <AbsoluteFill style={{
          backgroundColor: FOND, alignItems: "center", justifyContent: "center", paddingTop: 190,
        }}>
          <div style={{
            width: 540, borderRadius: 42, overflow: "hidden",
            border: "3px solid rgba(255,255,255,0.14)", boxShadow: "0 40px 110px rgba(0,0,0,0.8)",
          }}>
            <Video src={staticFile("studio.mp4")} style={{ width: "100%", display: "block" }} muted />
          </div>
        </AbsoluteFill>
        <Haut><Titre n="1" texte="Colle le lien" /></Haut>
      </Sequence>

      <Sequence from={E2} durationInFrames={E3 - E2} name="2 · repérage">
        <AbsoluteFill style={{ backgroundColor: FOND, alignItems: "center", justifyContent: "center", paddingTop: 150 }}>
          <Source />
          {/* Frise : trois moments retenus sur la duree de la video */}
          <div style={{
            width: 1000, height: 22, marginTop: 34,
            background: "rgba(255,255,255,0.12)", borderRadius: 11, position: "relative",
          }}>
            {[0.14, 0.46, 0.78].map((x, i) => {
              const a = interpolate(frame - E2, [8 + i * 12, 22 + i * 12], [0, 1], {
                extrapolateLeft: "clamp", extrapolateRight: "clamp",
              });
              return (
                <div key={x} style={{
                  position: "absolute", left: `${x * 100}%`, top: -9, width: 96, height: 40,
                  background: VERT, borderRadius: 10, opacity: a,
                  transform: `scaleX(${a})`, transformOrigin: "left center",
                }} />
              );
            })}
          </div>
        </AbsoluteFill>
        <Haut><Titre n="2" texte="L’IA repère les moments forts" /></Haut>
      </Sequence>

      <Sequence from={E3} durationInFrames={E4 - E3} name="3 · recadrage">
        <AbsoluteFill style={{ backgroundColor: FOND, alignItems: "center", justifyContent: "center", paddingTop: 150 }}>
          <div style={{
            width: largeurCadre, aspectRatio: "16 / 9", borderRadius: 18, overflow: "hidden",
            border: `3px solid ${VERT}`,
            boxShadow: `0 0 60px rgba(16,185,129,${0.5 * (1 - serrage)})`,
            position: "relative",
          }}>
            <Video src={staticFile("source-169.mp4")}
              style={{ width: 1000, height: "100%", marginLeft: (largeurCadre - 1000) / 2 }}
              objectFit="cover" muted loop />
            {/* Bande de sous-titres qui s'allume */}
            <div style={{
              position: "absolute", left: 0, right: 0, bottom: 0, height: 78,
              background: "rgba(0,0,0,0.6)", opacity: bande,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32, fontWeight: 800, color: "#fff",
            }}>
              <span>j’avais envie <span style={{ color: VERT }}>d’arrêter</span></span>
            </div>
          </div>
        </AbsoluteFill>
        <Haut><Titre n="3" texte="Recadrage 9:16 + sous-titres" /></Haut>
      </Sequence>

      <Sequence from={CLIP} durationInFrames={DUREE_ETAPES - CLIP} name="Créatis">
        <Punch><CartonFinal clair mention="Sous-titres et recadrage automatiques" /></Punch>
      </Sequence>
    </AbsoluteFill>
  );
};
