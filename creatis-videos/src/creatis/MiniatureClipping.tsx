import { AbsoluteFill, Img, staticFile } from "remotion";
import { POLICE } from "./police";

/**
 * MINIATURE — 1280×720, tutoriel du 08/10.
 *
 * Même principe que celle de la veille : cette chaîne n'a pas de fil
 * d'accueil (dix abonnés), ses impressions viennent de la RECHERCHE. Une
 * vignette de recherche ne proclame pas, elle montre qu'on va obtenir ce
 * qu'on est venu chercher — ici, combien ça paie.
 *
 * D'où la fourchette en grand, et une vraie capture de Whop derrière : la
 * preuve qu'on parle de la vraie plateforme, pas d'un schéma.
 */

const VERT = "#10b981";
const OR = "#fbbf24";
const ORANGE = "#ff5a1f";

const CERNE = (e: number) =>
  [
    `${e}px ${e}px 0 #000`, `-${e}px ${e}px 0 #000`,
    `${e}px -${e}px 0 #000`, `-${e}px -${e}px 0 #000`,
    `0 ${e}px 0 #000`, `0 -${e}px 0 #000`,
    `${e}px 0 0 #000`, `-${e}px 0 0 #000`,
  ].join(", ");

export const MiniatureClipping: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#05070a", fontFamily: POLICE, overflow: "hidden" }}>
      {/* La capture réelle, en fond, assombrie pour que le texte passe. */}
      <Img
        src={staticFile("whop-image.png")}
        style={{
          position: "absolute", width: "100%", height: "100%",
          objectFit: "cover", opacity: 0.30,
        }}
      />
      <AbsoluteFill
        style={{ background: "linear-gradient(to right, #05070a 32%, rgba(5,7,10,0.55) 100%)" }}
      />

      <div style={{ position: "absolute", left: 60, top: 62, right: 54 }}>
        <div style={{ fontSize: 44, fontWeight: 900, color: "#fff", textShadow: CERNE(4), letterSpacing: 0.5 }}>
          ÊTRE PAYÉ EN <span style={{ color: ORANGE }}>CLIPPING</span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 22, marginTop: 14 }}>
          <span style={{ fontSize: 132, fontWeight: 900, color: "#fff", letterSpacing: -6, lineHeight: 1, textShadow: CERNE(8) }}>
            0,20 $
          </span>
          <span style={{ fontSize: 76, fontWeight: 900, color: "rgba(255,255,255,0.7)", textShadow: CERNE(5) }}>→</span>
          <span style={{ fontSize: 132, fontWeight: 900, color: VERT, letterSpacing: -6, lineHeight: 1, textShadow: CERNE(8) }}>
            6 $
          </span>
        </div>
        <div style={{ fontSize: 46, fontWeight: 900, color: OR, marginTop: 6, textShadow: CERNE(4) }}>
          pour 1 000 vues
        </div>

        <div
          style={{
            fontSize: 48, fontWeight: 900, color: "#fff", letterSpacing: -1.5,
            marginTop: 30, lineHeight: 1.14, textShadow: CERNE(5),
          }}
        >
          Les vrais tarifs, les étapes,
          <br />
          et le calcul qu&apos;on te cache.
        </div>
      </div>

      <div
        style={{
          position: "absolute", right: 42, bottom: 34,
          background: VERT, color: "#06120d", fontSize: 30, fontWeight: 900,
          padding: "10px 22px", borderRadius: 10, letterSpacing: 0.5,
        }}
      >
        CHIFFRES VÉRIFIÉS · OCT. 2026
      </div>
    </AbsoluteFill>
  );
};
