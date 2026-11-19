import { AbsoluteFill, Img, staticFile } from "remotion";
import { POLICE } from "./police";

/**
 * MINIATURE — 1280×720, format long du 10/10, deuxième version.
 *
 * ── CE QUI A ÉTÉ RELEVÉ, ET REPRODUIT ────────────────────────────────────
 * Capture des résultats YouTube du 10/10 sur « gagner de l'argent avec le
 * clipping ». Les deux premiers (24 k et 32 k vues) partagent exactement la
 * même recette :
 *   · un CHIFFRE énorme en jaune, cerné de noir, empilé à gauche ;
 *   · un visage qui regarde la caméra, à droite du texte ;
 *   · une PREUVE visuelle sur le côté (chez eux, un téléphone avec les
 *     paiements Whop affichés) ;
 *   · un bandeau en bas : « GUIDE COMPLET ✅ » ;
 *   · un fond clair, à fort contraste, sans zone sombre.
 *
 * La première version était trop sage : visage sombre, petit texte vert,
 * titre blanc en bas. Correcte, et invisible à côté de celles-là.
 *
 * ── CE QU'ON NE REPREND PAS ──────────────────────────────────────────────
 * Leur chiffre est une somme d'argent — « 16 000 € EN 30 JOURS ». On n'a pas
 * ce chiffre, et l'inventer serait un mensonge qui se paie à la rétention.
 * Notre chiffre honnête est le nombre de critères, et la preuve est la grille
 * de clips réellement produite, pas une capture de virements.
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

export const MiniatureChoisir: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#0d1b2a", fontFamily: POLICE, overflow: "hidden" }}>
    {/* Rayons : l'énergie des miniatures de la niche vient de là, pas du texte. */}
    <AbsoluteFill
      style={{
        background:
          "repeating-conic-gradient(from 0deg at 62% 48%, rgba(255,255,255,0.13) 0deg 3deg, transparent 3deg 9deg)",
      }}
    />
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 62% 48%, rgba(255,214,10,0.22) 0%, transparent 55%)",
      }}
    />

    {/* Le visage, à droite du bloc de texte, lumineux. */}
    <div
      style={{
        position: "absolute", right: 236, bottom: 0, width: 560, height: 700,
        overflow: "hidden",
      }}
    >
      <Img
        src={staticFile("visage-studio.png")}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 22%" }}
      />
    </div>

    {/* La preuve : la vraie grille de clips, inclinée comme un téléphone. */}
    <div
      style={{
        position: "absolute", right: -40, bottom: 48, width: 430,
        transform: "rotate(-7deg)", borderRadius: 14, overflow: "hidden",
        border: "5px solid #fff", boxShadow: "0 18px 50px rgba(0,0,0,0.75)",
      }}
    >
      <Img src={staticFile("preuve-grille.png")} style={{ width: "100%", display: "block" }} />
    </div>

    {/* Le chiffre, empilé à gauche. */}
    <div style={{ position: "absolute", left: 44, top: 64, width: 620 }}>
      <div
        style={{
          fontSize: 190, fontWeight: 900, color: JAUNE, letterSpacing: -8,
          lineHeight: 0.88, textShadow: CERNE(9),
        }}
      >
        5
      </div>
      <div
        style={{
          fontSize: 86, fontWeight: 900, color: JAUNE, letterSpacing: -3,
          lineHeight: 0.95, textShadow: CERNE(7), marginTop: -6,
        }}
      >
        CRITÈRES
      </div>
      <div
        style={{
          fontSize: 58, fontWeight: 900, color: "#fff", letterSpacing: -1.5,
          lineHeight: 1.04, textShadow: CERNE(5), marginTop: 12,
        }}
      >
        AVANT DE
        <br />
        CLIPPER
      </div>
    </div>

    {/* Le bandeau du bas, comme chez eux — mais sur une promesse tenue. */}
    <div
      style={{
        position: "absolute", left: 44, bottom: 40,
        background: VERT, color: "#04120b", fontSize: 44, fontWeight: 900,
        padding: "12px 28px", borderRadius: 12, letterSpacing: -0.5,
        boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
      }}
    >
      GUIDE COMPLET ✅
    </div>
  </AbsoluteFill>
);
