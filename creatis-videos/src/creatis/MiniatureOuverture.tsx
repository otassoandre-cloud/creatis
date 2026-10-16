import { AbsoluteFill, Img, staticFile } from "remotion";
import { POLICE } from "./police";

/**
 * MINIATURE — 1280x720, video longue du 05/10.
 *
 * Memes codes que les precedentes (chiffre enorme, texte cerne de noir, un
 * visage, fond sombre), mais le chiffre est VERT : c est un bon resultat, pas
 * un probleme. Le « 338 contre 156 » dit la promesse sans le titre, et il est
 * mesure — compteurs exacts releves le 05/10 sur la page de chaque video.
 */

const JAUNE = "#ffd60a";
const ROUGE = "#ff3b30";
const VERT = "#10b981";

const CERNE = (e: number) =>
  [
    `${e}px ${e}px 0 #000`, `-${e}px ${e}px 0 #000`,
    `${e}px -${e}px 0 #000`, `-${e}px -${e}px 0 #000`,
    `0 ${e}px 0 #000`, `0 -${e}px 0 #000`,
    `${e}px 0 0 #000`, `-${e}px 0 0 #000`,
  ].join(", ");

export const MiniatureOuverture: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#05070a", fontFamily: POLICE, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute", left: -140, top: -160, width: 760, height: 1000,
          background: `radial-gradient(circle, ${ROUGE}30 0%, transparent 66%)`,
        }}
      />

      {/* Le chiffre mesuré, en rouge : c'est un mauvais chiffre, ça se voit. */}
      <div style={{ position: "absolute", left: 56, top: 86 }}>
        <div style={{ fontSize: 34, fontWeight: 800, color: "#fff", textShadow: CERNE(3), letterSpacing: 1 }}>
          MÊME FORMAT, MÊME COMPTE
        </div>
        <div
          style={{
            fontSize: 210, fontWeight: 900, color: VERT, letterSpacing: -10,
            lineHeight: 0.88, textShadow: CERNE(8), marginTop: 2,
          }}
        >
          338
        </div>
        <div style={{ fontSize: 50, fontWeight: 900, color: "#fff", textShadow: CERNE(5), marginTop: 6, letterSpacing: -1 }}>
          CONTRE 156
        </div>
      </div>

      {/* Le clip, à droite : un visage, du mouvement — la preuve du propos. */}
      <div
        style={{
          position: "absolute", right: 58, top: 62, width: 332, height: 596,
          borderRadius: 18, overflow: "hidden", border: `6px solid ${VERT}`,
          boxShadow: "0 20px 56px rgba(0,0,0,0.8)", transform: "rotate(2deg)",
        }}
      >
        <Img src={staticFile("mini4-clip.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* Ce qu'on fait du chiffre : la correction, en jaune. */}
      <div
        style={{
          position: "absolute", left: 56, bottom: 48,
          background: JAUNE, color: "#000", padding: "14px 28px", borderRadius: 12,
          fontSize: 46, fontWeight: 900, letterSpacing: -1.6,
          boxShadow: "0 12px 34px rgba(0,0,0,0.65)", transform: "rotate(-1.5deg)",
        }}
      >
        J’AI CHANGÉ UNE SEULE CHOSE
      </div>
    </AbsoluteFill>
  );
};
