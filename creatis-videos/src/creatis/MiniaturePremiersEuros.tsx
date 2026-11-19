import { AbsoluteFill, Img, staticFile } from "remotion";
import { POLICE } from "./police";

/**
 * MINIATURE — 1280×720, format long du 15/10.
 *
 * ── LA RECETTE, RELEVÉE DANS LA NICHE LE 10/10 ───────────────────────────
 * Les deux premiers résultats de « gagner de l'argent avec le clipping »
 * (24 k et 32 k vues) partagent : un mot énorme en jaune cerné de noir à
 * gauche, un visage qui regarde la caméra, une PREUVE visuelle sur le côté,
 * un bandeau vert en bas, et un fond clair sans zone sombre.
 *
 * ── CE QUI CHANGE PAR RAPPORT AUX PRÉCÉDENTES ────────────────────────────
 * La preuve n'est plus l'ancienne capture — celle dont un titre affichait
 * « World War 11 », écartée deux fois. C'est la grille réelle du tournage du
 * jour : « 10 clips viraux trouvés », les notes 95, 92, 90, 89, les badges
 * « Moment fort » et « Haute viralité ». Elle dit en une image ce que le film
 * met six minutes à montrer.
 *
 * ── ET POURQUOI LE CHIFFRE PORTE SON COÛT ────────────────────────────────
 * « 150 $ » tout seul est exactement ce que YouTube a sanctionné le 30/07
 * (« contenus nuisibles ou dangereux », avertissement actif jusqu'au 28/10).
 * Le tampon rouge dit donc ce que ça coûte : 30 clips par semaine. Un chiffre
 * avec son prix n'est pas une combine, c'est une information.
 */

const JAUNE = "#ffd60a";
const VERT = "#19c37d";
const ROUGE = "#e23c3c";

const CERNE = (e: number) =>
  [
    `${e}px ${e}px 0 #000`, `-${e}px ${e}px 0 #000`,
    `${e}px -${e}px 0 #000`, `-${e}px -${e}px 0 #000`,
    `0 ${e}px 0 #000`, `0 -${e}px 0 #000`,
    `${e}px 0 0 #000`, `-${e}px 0 0 #000`,
    `${Math.round(e * 0.9)}px ${Math.round(e * 0.9)}px 0 rgba(0,0,0,0.55)`,
  ].join(", ");

export const MiniaturePremiersEuros: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#f4efe4", fontFamily: POLICE, overflow: "hidden" }}>
    <AbsoluteFill
      style={{
        background:
          "repeating-conic-gradient(from 0deg at 68% 46%, rgba(13,27,42,0.10) 0deg 3deg, transparent 3deg 9deg)",
      }}
    />
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 68% 46%, rgba(255,214,10,0.55) 0%, transparent 58%)",
      }}
    />

    {/* La preuve, en grand : la grille réelle, notes comprises. */}
    <div
      style={{
        position: "absolute", right: -28, top: 96, width: 700,
        transform: "rotate(-5deg)", borderRadius: 14, overflow: "hidden",
        border: "6px solid #fff", boxShadow: "0 22px 60px rgba(0,0,0,0.5)",
      }}
    >
      <Img src={staticFile("preuve-grille-15.png")} style={{ width: "100%", display: "block" }} />
    </div>

    {/* Le visage, devant la preuve, en bas à droite du texte. */}
    <div
      style={{
        position: "absolute", left: 540, bottom: 0, width: 330, height: 440,
        overflow: "hidden", borderRadius: 10,
        boxShadow: "0 0 0 6px #fff, 0 18px 50px rgba(0,0,0,0.45)",
      }}
    >
      <Img
        src={staticFile("visage-studio.png")}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 18%" }}
      />
    </div>

    {/* Le titre, empilé à gauche. */}
    <div style={{ position: "absolute", left: 40, top: 48, width: 640 }}>
      <div
        style={{
          fontSize: 56, fontWeight: 900, color: "#fff", letterSpacing: -1.5,
          lineHeight: 1.0, textShadow: CERNE(5),
        }}
      >
        TES PREMIERS
      </div>
      <div
        style={{
          fontSize: 132, fontWeight: 900, color: JAUNE, letterSpacing: -5,
          lineHeight: 0.94, textShadow: CERNE(9), marginTop: 2, whiteSpace: "nowrap",
        }}
      >
        150&nbsp;$
      </div>
      <div
        style={{
          fontSize: 54, fontWeight: 900, color: "#fff", letterSpacing: -1.2,
          lineHeight: 1.0, textShadow: CERNE(5), marginTop: 4,
        }}
      >
        EN CLIPPING
      </div>

      <div
        style={{
          display: "inline-block", marginTop: 20,
          background: ROUGE, color: "#fff", fontSize: 42, fontWeight: 900,
          padding: "9px 22px", borderRadius: 10, letterSpacing: -0.5,
          transform: "rotate(-3deg)",
          boxShadow: "0 12px 34px rgba(0,0,0,0.45)",
          border: "4px solid #fff",
        }}
      >
        30 CLIPS / SEMAINE
      </div>
    </div>

    {/* Le bandeau du bas : ce qu'on obtient en échange du clic. */}
    <div
      style={{
        position: "absolute", left: 40, bottom: 34,
        background: VERT, color: "#04120b", fontSize: 40, fontWeight: 900,
        padding: "11px 24px", borderRadius: 12, letterSpacing: -0.5,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        border: "4px solid #fff",
      }}
    >
      LA MÉTHODE COMPLÈTE ✅
    </div>
  </AbsoluteFill>
);
