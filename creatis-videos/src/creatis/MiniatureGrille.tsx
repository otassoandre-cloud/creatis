import { AbsoluteFill, Img, staticFile } from "remotion";
import { POLICE } from "./police";

/**
 * MINIATURE — 1280×720, pour « Noter un clip sur 100 : la grille complète ».
 *
 * Mêmes codes que les deux autres, relevés sur douze miniatures du domaine :
 * un chiffre énorme, du texte cerné de noir, un visage, un fond sombre.
 * Ici le chiffre est la NOTE — c'est le sujet de la vidéo — et les cinq
 * critères sont listés en petit dessous : on comprend la promesse sans lire
 * le titre.
 */

const JAUNE = "#ffd60a";
const VERT = "#10b981";

const CERNE = (e: number) =>
  [
    `${e}px ${e}px 0 #000`, `-${e}px ${e}px 0 #000`,
    `${e}px -${e}px 0 #000`, `-${e}px -${e}px 0 #000`,
    `0 ${e}px 0 #000`, `0 -${e}px 0 #000`,
    `${e}px 0 0 #000`, `-${e}px 0 0 #000`,
  ].join(", ");

const CRITERES = ["ACCROCHE", "AUTONOMIE", "RÉTENTION", "VALEUR", "VIRALITÉ"];

export const MiniatureGrille: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#05070a", fontFamily: POLICE, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute", left: -120, top: -140, width: 780, height: 1000,
          background: `radial-gradient(circle, ${VERT}2e 0%, transparent 66%)`,
        }}
      />

      <div style={{ position: "absolute", left: 56, top: 74 }}>
        <div style={{ fontSize: 34, fontWeight: 800, color: "#fff", textShadow: CERNE(3), letterSpacing: 1 }}>
          LA GRILLE QUI DÉCIDE
        </div>
        <div style={{ display: "flex", alignItems: "baseline", marginTop: 4 }}>
          <span
            style={{
              fontSize: 196, fontWeight: 900, color: JAUNE, letterSpacing: -10,
              lineHeight: 0.9, textShadow: CERNE(8),
            }}
          >
            / 100
          </span>
        </div>

        {/* Les cinq critères : la promesse se lit sans le titre. */}
        <div style={{ marginTop: 16 }}>
          {CRITERES.map((c) => (
            <div key={c} style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 4 }}>
              <span style={{ fontSize: 34, fontWeight: 800, color: "#fff", textShadow: CERNE(3), minWidth: 230 }}>
                {c}
              </span>
              <span style={{ fontSize: 30, fontWeight: 800, color: VERT, textShadow: CERNE(3) }}>/20</span>
            </div>
          ))}
        </div>
      </div>

      {/* Un visage à droite : les miniatures du domaine en ont toutes un. */}
      <div
        style={{
          position: "absolute", right: 56, top: 60, width: 330, height: 600,
          borderRadius: 18, overflow: "hidden", border: `6px solid ${VERT}`,
          boxShadow: "0 20px 56px rgba(0,0,0,0.8)", transform: "rotate(2deg)",
        }}
      >
        <Img src={staticFile("mini3-clip.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    </AbsoluteFill>
  );
};
