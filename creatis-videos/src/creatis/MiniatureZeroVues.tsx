import { AbsoluteFill, Img, staticFile } from "remotion";
import { POLICE } from "./police";

/**
 * MINIATURE — 1280×720, vidéo longue du 08/10.
 *
 * ── POURQUOI ELLE NE RESSEMBLE PAS AUX QUATRE PRÉCÉDENTES ────────────────
 * Mesure du 08/10 : nos vidéos longues ont reçu jusqu'à 1 537 impressions
 * pour 0,5 % de clics. YouTube les montrait ; personne ne cliquait.
 *
 * Les quatre miniatures précédentes étaient des miniatures de FIL D'ACCUEIL :
 * une affirmation forte (« 0 INSCRIPTION POUR 4 900 VUES », « CE CLIP EST
 * MORT »). Or cette chaîne n'a pas de fil d'accueil — dix abonnés — et ses
 * impressions viennent de la RECHERCHE. Dans un résultat de recherche, la
 * vignette qui gagne ne proclame pas : elle montre qu'on va obtenir ce qu'on
 * est venu chercher.
 *
 * D'où la transformation, lisible en une demi-seconde à cent pixels de large :
 *     0 VUE  →  1 207
 * et rien d'autre à déchiffrer. Le titre, lui, reprend une requête relevée
 * dans les suggestions YouTube : « pourquoi mes shorts font 0 vues ».
 *
 * Le visage est extrait d'un vrai clip de la semaine, coupé au ffmpeg avant
 * d'arriver ici : piloter le recadrage depuis Remotion laissait l'interface
 * de l'app dans le champ.
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

export const MiniatureZeroVues: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#05070a", fontFamily: POLICE, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 430, height: 720, overflow: "hidden" }}>
        <Img
          src={staticFile("visage-domingo.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      {/* Bord droit fondu. Le dégradé doit atteindre EXACTEMENT le fond au
          bord de l'image (430 px) : s'il sature avant, il reste une arête
          nette entre une image assombrie à 90 % et le fond. */}
      <div
        style={{
          position: "absolute", left: 230, top: 0, width: 200, height: 720, zIndex: 2,
          background: "linear-gradient(to right, rgba(5,7,10,0), #05070a)",
        }}
      />

      <div
        style={{
          position: "absolute", right: -100, top: -200, width: 900, height: 1120,
          background: `radial-gradient(circle, ${VERT}22 0%, transparent 62%)`,
        }}
      />

      <div style={{ position: "absolute", left: 446, top: 72, right: 40 }}>
        <div style={{ fontSize: 42, fontWeight: 900, color: "#fff", textShadow: CERNE(4), letterSpacing: 0.5 }}>
          MES SHORTS FAISAIENT
        </div>

        {/* La transformation : deux chiffres, une flèche. Rien à déchiffrer. */}
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 6 }}>
          <span
            style={{
              fontSize: 168, fontWeight: 900, color: ROUGE, letterSpacing: -8,
              lineHeight: 1, textShadow: CERNE(8),
            }}
          >
            48
          </span>
          <span style={{ fontSize: 96, fontWeight: 900, color: "#fff", textShadow: CERNE(6) }}>→</span>
          <span
            style={{
              fontSize: 168, fontWeight: 900, color: VERT, letterSpacing: -8,
              lineHeight: 1, textShadow: CERNE(8),
            }}
          >
            1207
          </span>
        </div>

        <div
          style={{
            fontSize: 56, fontWeight: 900, color: "#fff", letterSpacing: -1.5,
            marginTop: 26, lineHeight: 1.12, textShadow: CERNE(5),
          }}
        >
          <span style={{ color: VERT }}>3 causes</span>, et ce que
          <br />
          chacune a coûté.
        </div>
      </div>

      {/* Le sceau « mesuré » : la seule chose qui nous distingue des conseils. */}
      <div
        style={{
          position: "absolute", right: 40, bottom: 34,
          background: ROUGE, color: "#fff", fontSize: 30, fontWeight: 900,
          padding: "10px 22px", borderRadius: 10, letterSpacing: 1,
        }}
      >
        MESURÉ, PAS CONSEILLÉ
      </div>
    </AbsoluteFill>
  );
};
