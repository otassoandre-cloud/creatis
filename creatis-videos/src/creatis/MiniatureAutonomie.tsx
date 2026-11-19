import { AbsoluteFill, Img, staticFile } from "remotion";
import { POLICE } from "./police";

/**
 * MINIATURE — 1280×720, vidéo longue du 08/10.
 *
 * ── CE QUI EST REPRIS DE LA NICHE, ET CE QUI NE L'EST PAS ────────────────
 * Repris : un visage réel en grand à gauche, trois mots énormes cernés de
 * noir, une couleur de danger, un élément dessiné à la main (le cercle rouge)
 * — c'est le vocabulaire des miniatures de clipping et d'IA.
 * Pas repris : la flèche et la bouche ouverte. Elles promettent une révélation.
 * Ici la promesse est un TEST qu'on peut faire ce soir, et elle est tenue dans
 * la vidéo — une miniature qui ment se paie à la rétention, qu'on mesure.
 *
 * Le visage vient d'un vrai clip produit cette semaine, pas d'une banque
 * d'images : c'est le même matériau que le film.
 */

const ROUGE = "#ff3b30";
const VERT = "#10b981";

const CERNE = (e: number) =>
  [
    `${e}px ${e}px 0 #000`, `-${e}px ${e}px 0 #000`,
    `${e}px -${e}px 0 #000`, `-${e}px -${e}px 0 #000`,
    `0 ${e}px 0 #000`, `0 -${e}px 0 #000`,
    `${e}px 0 0 #000`, `-${e}px 0 0 #000`,
  ].join(", ");

export const MiniatureAutonomie: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#05070a", fontFamily: POLICE, overflow: "hidden" }}>
      {/* Le visage, pris dans le clip de Norman : cadré serré, bord droit fondu. */}
      <div
        style={{
          position: "absolute", left: 0, top: 0, width: 470, height: 720,
          overflow: "hidden",
          maskImage: "linear-gradient(to right, #000 68%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, #000 68%, transparent 100%)",
        }}
      >
        {/* L'image est extraite au ffmpeg, déjà recadrée sur le lecteur seul.
            Piloter le cadrage depuis Remotion a échoué ici : la vidéo gardait
            l'interface de l'app dans le champ malgré la transformation. Une
            image déjà coupée ne peut pas se décadrer. */}
        <Img
          src={staticFile("visage-norman.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      <div
        style={{
          position: "absolute", right: -120, top: -180, width: 900, height: 1080,
          background: `radial-gradient(circle, ${ROUGE}2e 0%, transparent 64%)`,
        }}
      />

      {/* La réplique fautive, entourée : on voit l'erreur avant de lire le titre. */}
      <div style={{ position: "absolute", left: 436, top: 74 }}>
        <div style={{ fontSize: 46, fontWeight: 900, color: "#fff", textShadow: CERNE(4) }}>
          «{" "}
          <span style={{ position: "relative", display: "inline-block", padding: "0 14px" }}>
            <span style={{ color: ROUGE }}>Il</span>
            <span
              style={{
                position: "absolute", inset: "-13px -6px",
                border: `6px solid ${ROUGE}`, borderRadius: "50%",
                transform: "rotate(-7deg)",
              }}
            />
          </span>{" "}
          m&apos;a dit que… »
        </div>
      </div>

      <div style={{ position: "absolute", left: 436, top: 176, right: 44 }}>
        <div
          style={{
            fontSize: 118, fontWeight: 900, color: "#fff", letterSpacing: -5,
            lineHeight: 0.92, textShadow: CERNE(7),
          }}
        >
          CE CLIP
          <br />
          EST <span style={{ color: ROUGE }}>MORT</span>
        </div>
        <div
          style={{
            fontSize: 44, fontWeight: 900, color: VERT, letterSpacing: -1,
            marginTop: 26, textShadow: CERNE(4), lineHeight: 1.1,
          }}
        >
          et tu peux le savoir
          <br />
          en 10 secondes
        </div>
      </div>

      {/* Le chiffre qui prouve, en bas : mesuré, pas promis. */}
      <div
        style={{
          position: "absolute", left: 436, bottom: 34,
          display: "flex", alignItems: "baseline", gap: 14,
        }}
      >
        <span style={{ fontSize: 58, fontWeight: 900, color: VERT, textShadow: CERNE(4) }}>
          1 207
        </span>
        <span style={{ fontSize: 34, fontWeight: 800, color: "#fff", textShadow: CERNE(3) }}>
          vues contre
        </span>
        <span
          style={{
            fontSize: 44, fontWeight: 900, color: ROUGE,
            textShadow: CERNE(3), textDecoration: "line-through",
          }}
        >
          232
        </span>
      </div>
    </AbsoluteFill>
  );
};
