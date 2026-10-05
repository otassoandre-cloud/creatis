import { AbsoluteFill, Img, staticFile } from "remotion";
import { POLICE } from "./police";

/**
 * MINIATURE — 1280×720 pour la vidéo longue YouTube.
 *
 * ── CE QUI A ÉTÉ REGARDÉ AVANT DE DESSINER ───────────────────────────────
 * Douze miniatures du domaine relevées sur YouTube (« clipping ia », « opus
 * clip », « gagner de l'argent clipping », « ia montage video »). Ce qu'elles
 * ont toutes en commun, et que la miniature précédente n'avait pas :
 *
 *   · un CHIFFRE énorme — « 500 € PAR JOUR », « 16 000 € EN 30 JOURS »,
 *     « 30 SHORTS EN 5 MIN », « +600 $ » ;
 *   · du texte jaune ou blanc CERNÉ DE NOIR, trois mots maximum ;
 *   · une FLÈCHE de transformation : la vidéo large d'un côté, le vertical de
 *     l'autre ;
 *   · un objet concret — téléphone, ordinateur, pile de clips ;
 *   · un fond sombre à fort contraste.
 *
 * L'ancienne miniature était une carte de texte centrée sur fond noir : lisible,
 * mais elle ne ressemblait à rien de ce qui se clique dans cette niche.
 *
 * ── CE QUE LA VIGNETTE DE GAUCHE MONTRE, ET CE QU'ELLE NE PRÉTEND PAS ───
 * C'est une CAPTURE de l'application avec la vidéo publique chargée : on y voit
 * donc la miniature YouTube de McFly et Carlito, visages compris. C'est une
 * démonstration avant/après, pas une collaboration — rien dans la composition
 * ne les présente comme partenaires, et le texte ne parle que de l'outil.
 * À surveiller tout de même : la chaîne porte déjà un avertissement actif.
 *
 * Les deux images viennent du tournage réel du 03/10 : la vidéo trouvée, et la
 * grille des dix clips qu'elle en a sortis.
 */

const JAUNE = "#ffd60a";
const VERT = "#10b981";

/** Contour noir épais : c'est lui qui rend le texte lisible sur n'importe quoi. */
const CERNE = (e: number) =>
  [
    `${e}px ${e}px 0 #000`, `-${e}px ${e}px 0 #000`,
    `${e}px -${e}px 0 #000`, `-${e}px -${e}px 0 #000`,
    `0 ${e}px 0 #000`, `0 -${e}px 0 #000`,
    `${e}px 0 0 #000`, `-${e}px 0 0 #000`,
  ].join(", ");

export const MiniatureLongue: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#05070a", fontFamily: POLICE, overflow: "hidden" }}>
      {/* Lueur froide derrière la grille : elle détache le bloc de droite. */}
      <div
        style={{
          position: "absolute", right: -160, top: -120, width: 820, height: 980,
          background: `radial-gradient(circle, ${VERT}38 0%, transparent 68%)`,
        }}
      />

      {/* ── LA SOURCE, à gauche ──────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute", left: 52, top: 196, width: 470, height: 264,
          borderRadius: 14, overflow: "hidden", border: "5px solid #fff",
          boxShadow: "0 18px 50px rgba(0,0,0,0.7)",
          transform: "rotate(-3deg)",
        }}
      >
        <Img src={staticFile("mini-source.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div
        style={{
          position: "absolute", left: 70, top: 468, fontSize: 30, fontWeight: 800,
          color: "#fff", textShadow: CERNE(3), letterSpacing: -0.5,
        }}
      >
        {/* 54 min 32 : lu sur la capture du tournage. Un premier jet disait
            « 47 MIN », par confusion avec les 7 min 47 d'ANALYSE — un chiffre
            faux sur une miniature est un mensonge affiché en grand. */}
        1 VIDÉO DE 54 MIN
      </div>

      {/* ── LA FLÈCHE ────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute", left: 536, top: 288, width: 150, height: 92,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <svg width="150" height="92" viewBox="0 0 150 92">
          <path d="M6 46 H104" stroke="#ff2d2d" strokeWidth="18" strokeLinecap="round" />
          <path d="M96 14 L142 46 L96 78 Z" fill="#ff2d2d" />
        </svg>
      </div>

      {/* ── LE RÉSULTAT, à droite ────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute", right: 36, top: 150, width: 540, height: 420,
          borderRadius: 14, overflow: "hidden", border: `5px solid ${VERT}`,
          boxShadow: "0 18px 50px rgba(0,0,0,0.75)", transform: "rotate(2deg)",
        }}
      >
        <Img src={staticFile("mini-grille.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* ── LE CHIFFRE, en haut, par-dessus tout ─────────────────────────── */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 26, textAlign: "center" }}>
        <div
          style={{
            fontSize: 112, fontWeight: 900, color: "#fff", letterSpacing: -4,
            textShadow: CERNE(7), lineHeight: 0.95,
          }}
        >
          1 PHRASE <span style={{ color: JAUNE }}>= 10 CLIPS</span>
        </div>
      </div>

      {/* ── LE BANDEAU DU BAS : le chiffre qui pique ─────────────────────── */}
      <div
        style={{
          position: "absolute", left: 52, bottom: 34,
          background: JAUNE, color: "#000", padding: "12px 26px", borderRadius: 10,
          fontSize: 44, fontWeight: 900, letterSpacing: -1.5,
          boxShadow: "0 10px 30px rgba(0,0,0,0.6)", transform: "rotate(-1.5deg)",
        }}
      >
        SANS TOUCHER AU MONTAGE
      </div>
    </AbsoluteFill>
  );
};
