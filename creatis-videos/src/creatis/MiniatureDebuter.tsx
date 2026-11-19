import { AbsoluteFill, Img, staticFile } from "remotion";
import { POLICE } from "./police";

/**
 * MINIATURE — 1280×720, guide du 12/10.
 *
 * Gabarit relevé le 10/10 sur les deux premiers résultats de « gagner de
 * l'argent avec le clipping » (24 k et 32 k vues) : chiffre énorme en jaune
 * cerné de noir à gauche, visage au centre, preuve à droite, bandeau vert en
 * bas, rayons et fond clair.
 *
 * Le chiffre est celui du contenu, pas une somme inventée : mille dollars
 * pour un million de vues est l'arithmétique exacte à un dollar les mille.
 */

const JAUNE = "#ffd60a";
const VERT = "#19c37d";

const CERNE = (e: number) =>
  [
    `${e}px ${e}px 0 #000`, `-${e}px ${e}px 0 #000`,
    `${e}px -${e}px 0 #000`, `-${e}px -${e}px 0 #000`,
    `0 ${e}px 0 #000`, `0 -${e}px 0 #000`,
    `${e}px 0 0 #000`, `-${e}px 0 0 #000`,
    `${e * 1.6}px ${e * 1.6}px 0 #000`,
  ].join(", ");

export const MiniatureDebuter: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#0d1b2a", fontFamily: POLICE, overflow: "hidden" }}>
    <AbsoluteFill
      style={{
        background:
          "repeating-conic-gradient(from 0deg at 60% 50%, rgba(255,255,255,0.13) 0deg 3deg, transparent 3deg 9deg)",
      }}
    />
    <AbsoluteFill
      style={{ background: "radial-gradient(circle at 60% 50%, rgba(255,214,10,0.24) 0%, transparent 56%)" }}
    />

    <div style={{ position: "absolute", right: 250, bottom: 0, width: 540, height: 700, overflow: "hidden" }}>
      <Img
        src={staticFile("visage-jour.png")}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 20%" }}
      />
    </div>

    <div
      style={{
        position: "absolute", right: -46, bottom: 52, width: 420,
        transform: "rotate(-7deg)", borderRadius: 14, overflow: "hidden",
        border: "5px solid #fff", boxShadow: "0 18px 50px rgba(0,0,0,0.75)",
      }}
    >
      <Img src={staticFile("preuve-grille.png")} style={{ width: "100%", display: "block" }} />
    </div>

    <div style={{ position: "absolute", left: 44, top: 70, width: 640 }}>
      <div style={{ fontSize: 38, fontWeight: 900, color: "#fff", textShadow: CERNE(4), letterSpacing: 0.5 }}>
        CLIPPING — CE QUE ÇA PAIE
      </div>
      <div
        style={{
          fontSize: 150, fontWeight: 900, color: JAUNE, letterSpacing: -7,
          lineHeight: 0.92, textShadow: CERNE(9), marginTop: 4,
        }}
      >
        1 000 $
      </div>
      <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", textShadow: CERNE(5), marginTop: 2 }}>
        POUR 1 MILLION DE VUES
      </div>
      <div
        style={{
          fontSize: 50, fontWeight: 900, color: "#fff", letterSpacing: -1.5,
          marginTop: 24, lineHeight: 1.1, textShadow: CERNE(5),
        }}
      >
        Fais le calcul
        <br />
        <span style={{ color: "#ff5a4e" }}>avant de commencer.</span>
      </div>
    </div>

    <div
      style={{
        position: "absolute", left: 44, bottom: 38,
        background: VERT, color: "#04120b", fontSize: 42, fontWeight: 900,
        padding: "12px 26px", borderRadius: 12, letterSpacing: -0.5,
        boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
      }}
    >
      GUIDE DÉBUTANT ✅
    </div>
  </AbsoluteFill>
);
