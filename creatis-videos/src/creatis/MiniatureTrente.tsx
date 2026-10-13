import { AbsoluteFill, Img, staticFile } from "remotion";
import { POLICE } from "./police";

/**
 * MINIATURE — 1280×720, format long du 09/10.
 *
 * Même logique que les deux précédentes : la chaîne n'a pas de fil d'accueil,
 * ses impressions viennent de la recherche. On montre donc le RÉSULTAT promis
 * (30 clips, 600 $/mois) plutôt qu'une affirmation.
 *
 * Avec une réserve mesurée le 09/10 : à huit ou neuf impressions par vidéo,
 * la miniature ne décide plus de grand-chose. Elle est soignée parce qu'elle
 * comptera quand la passerelle depuis les Shorts amènera du monde.
 */

const VERT = "#10b981";
const OR = "#fbbf24";
const ROUGE = "#ff3b30";

const CERNE = (e: number) =>
  [
    `${e}px ${e}px 0 #000`, `-${e}px ${e}px 0 #000`,
    `${e}px -${e}px 0 #000`, `-${e}px -${e}px 0 #000`,
    `0 ${e}px 0 #000`, `0 -${e}px 0 #000`,
    `${e}px 0 0 #000`, `-${e}px 0 0 #000`,
  ].join(", ");

export const MiniatureTrente: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#05070a", fontFamily: POLICE, overflow: "hidden" }}>
    <Img
      src={staticFile("grille-image.png")}
      style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", opacity: 0.34 }}
    />
    <AbsoluteFill style={{ background: "linear-gradient(to right, #05070a 36%, rgba(5,7,10,0.5) 100%)" }} />

    <div style={{ position: "absolute", left: 58, top: 66, right: 50 }}>
      <div style={{ fontSize: 42, fontWeight: 900, color: "#fff", textShadow: CERNE(4) }}>
        CLIPPING — LA CADENCE RÉELLE
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 10 }}>
        <span style={{ fontSize: 170, fontWeight: 900, color: VERT, letterSpacing: -9, lineHeight: 1, textShadow: CERNE(9) }}>
          30
        </span>
        <span style={{ fontSize: 56, fontWeight: 900, color: "#fff", textShadow: CERNE(5) }}>
          clips / semaine
        </span>
      </div>
      <div style={{ fontSize: 52, fontWeight: 900, color: OR, marginTop: 10, textShadow: CERNE(4) }}>
        = 600 $ par mois
      </div>
      <div
        style={{
          fontSize: 48, fontWeight: 900, color: "#fff", letterSpacing: -1.5,
          marginTop: 26, lineHeight: 1.14, textShadow: CERNE(5),
        }}
      >
        Sans y passer
        <br />
        <span style={{ color: ROUGE }}>30 soirées.</span>
      </div>
    </div>

    <div
      style={{
        position: "absolute", right: 40, bottom: 32,
        background: VERT, color: "#06120d", fontSize: 29, fontWeight: 900,
        padding: "10px 20px", borderRadius: 10,
      }}
    >
      LE PLANNING COMPLET
    </div>
  </AbsoluteFill>
);
