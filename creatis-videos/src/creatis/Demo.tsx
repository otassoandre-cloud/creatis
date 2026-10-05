import { Audio, Video } from "@remotion/media";
import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { staticFile } from "remotion";
import { POLICE } from "./police";
import { Punch } from "./Punch";
import { CartonFinal } from "./posts/CartonFinal";

/**
 * DEMONSTRATION PRODUIT — 1080x1920, 27 s.
 *
 * La version precedente se contentait d'ajouter un carton a la fin d'un clip : on
 * voyait un bon clip, on ne comprenait pas d'ou il venait. Ici l'application est
 * montree en train de travailler, et les trois etapes sont dites.
 *
 * AUCUN SILENCE. C'est la contrainte qui commande toute la structure. Le son du
 * clip tourne EN CONTINU sur les 24 premieres secondes, au niveau de la
 * composition, et c'est l'image seule qui bascule : clip pendant 3,5 s pour
 * accrocher, application par-dessus pendant 6 s pendant que la voix continue, puis
 * retour au clip. Monter l'inverse — interface d'abord, clip ensuite — aurait
 * impose six secondes muettes en ouverture, exactement le blanc qu'il faut eviter.
 *
 * L'APPLICATION EST FILMEE, PAS RECONSTITUEE. Capture Playwright de creatis.app
 * avec une vraie session : on voit le lien se taper caractere par caractere et
 * l'apercu de la video apparaitre. Elle est presentee dans un cadre de telephone
 * plutot qu'en plein ecran : la capture fait 430 px de large, l'etirer sur 1080
 * la rendrait floue alors qu'ici elle reste nette et se lit comme un ecran.
 *
 * Le clip, lui, n'est toujours pas retouche : c'est une sortie de Creatis telle
 * qu'un client la recoit.
 */
export const DUREE_DEMO = 810;      // 27 s

const CLIP = 720;                    // 24 s de clip, son continu
const APP_DEBUT = 105;               // l'interface arrive a 3,5 s
const APP_DUREE = 210;               // et tient 7 s, le temps que l’apercu YouTube apparaisse

const VERT = "#10b981";

/* Etapes annoncees pendant que l'application tourne. */
const ETAPES: [number, string, string][] = [
  [0,   "1", "Tu colles un lien YouTube"],
  [72,  "2", "L’IA trouve les meilleurs moments"],
  [140, "3", "Recadrage 9:16 + sous-titres"],
];

const Etape: React.FC<{ n: string; texte: string }> = ({ n, texte }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({ frame, fps, config: { damping: 14, stiffness: 180 } });
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 22,
        transform: `translateY(${interpolate(e, [0, 1], [40, 0])}px)`,
        opacity: interpolate(e, [0, 1], [0, 1]),
      }}
    >
      <div style={{
        width: 74, height: 74, borderRadius: 22, background: VERT, color: "#05140B",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 42, fontWeight: 800, flexShrink: 0,
      }}>{n}</div>
      <div style={{
        fontSize: 52, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em",
        lineHeight: 1.12, textShadow: "0 3px 18px rgba(0,0,0,0.8)",
      }}>{texte}</div>
    </div>
  );
};

export const Demo: React.FC = () => {
  const frame = useCurrentFrame();

  /* Le telephone entre en glissant : sans ce mouvement, la bascule vers
     l'interface ressemble a un arret sur image. */
  const t = frame - APP_DEBUT;
  const entree = interpolate(t, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sortie = interpolate(t, [APP_DUREE - 12, APP_DUREE], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vis = entree * sortie;

  return (
    <AbsoluteFill style={{ backgroundColor: "#050a07", fontFamily: POLICE }}>
      {/* Son du clip, pose au niveau de la composition : il ne s'interrompt jamais,
          meme quand l'image montre l'application. */}
      <Audio src={staticFile("demo-creatis.mp4")} />

      <Sequence durationInFrames={CLIP} name="Clip Créatis">
        <Video
          src={staticFile("demo-creatis.mp4")}
          style={{ width: "100%", height: "100%" }}
          objectFit="cover"
          muted
        />
      </Sequence>

      <Sequence from={APP_DEBUT} durationInFrames={APP_DUREE} name="Application">
        <AbsoluteFill style={{ backgroundColor: `rgba(5,10,7,${0.94 * vis})` }}>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 250 }}>
            <div style={{
              width: 560, borderRadius: 44, overflow: "hidden",
              border: "3px solid rgba(255,255,255,0.14)",
              boxShadow: "0 40px 120px rgba(0,0,0,0.75)",
              transform: `translateY(${interpolate(vis, [0, 1], [70, 0])}px) scale(${interpolate(vis, [0, 1], [0.94, 1])})`,
              opacity: vis,
            }}>
              <Video src={staticFile("studio.mp4")} style={{ width: "100%", display: "block" }} muted />
            </div>
          </AbsoluteFill>

          <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 64px 150px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 26, opacity: vis }}>
              {ETAPES.map(([debut, n, texte]) =>
                t >= debut ? <Etape key={n} n={n} texte={texte} /> : null
              )}
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={CLIP} durationInFrames={DUREE_DEMO - CLIP} name="Créatis">
        <Punch>
          <CartonFinal clair mention="Sous-titres et recadrage automatiques" />
        </Punch>
      </Sequence>
    </AbsoluteFill>
  );
};
