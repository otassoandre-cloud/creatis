import { AbsoluteFill, Img, staticFile } from "remotion";
import { POLICE } from "./police";

/**
 * MINIATURE — 1280×720, court-métrage du 16/10.
 *
 * ── UN AUTRE STYLE, SUR RÉFÉRENCE DE L'UTILISATEUR ───────────────────────
 * Référence montrée le 16/10 : une miniature de chaîne clipping à forte
 * audience. Ce qui la fait marcher, et qu'on reprend ici :
 *
 *   1. **La preuve EST le visuel.** Quatre vignettes VERTICALES de clips en
 *      arrière-plan, chacune avec son compteur. On comprend en une seconde
 *      que cette personne produit — sans lire une ligne.
 *   2. **Presque pas de texte.** Le titre de la vidéo dit le sujet ; la
 *      miniature montre le résultat.
 *   3. **Trois profondeurs** : l'arrière-plan (les vignettes inclinées), le
 *      sujet (un visage, détaché par une ombre portée franche), et un halo
 *      chaud derrière lui qui le décolle du fond.
 *   4. **Fond sombre**, éclairage ambré — l'inverse du fond clair des trois
 *      miniatures précédentes.
 *
 * ── ET POURQUOI ON CHANGE ────────────────────────────────────────────────
 * Remarque du 16/10 : « pas tout le temps la même tête centrale, pas tout le
 * temps le même fond ». Les trois dernières miniatures partageaient le même
 * visage (`visage-studio`) et le même fond crème à rayons. Ici le sujet est
 * tiré du RÉCIT lui-même — l'homme en entrepôt, qui est le premier métier
 * d'Emrah — et le fond est sombre.
 *
 * Les badges portent les NOTES réelles des clips (95, 92, 90, 89), pas des
 * compteurs de vues inventés. La preuve ne vaut que si elle est vraie.
 *
 * Le sujet est `visage-norman` et non `visage-studio` : il regarde la caméra,
 * comme dans la référence, et il change de celui des trois miniatures
 * précédentes. Un recadrage du plan d'entrepôt avait été essayé d'abord — il
 * attrapait l'étagère et pas l'homme, vu à la planche avant d'être posé.
 */

const JAUNE = "#ffd60a";
const AMBRE = "#ff8a1f";

const CERNE = (e: number) =>
  [
    `${e}px ${e}px 0 #000`, `-${e}px ${e}px 0 #000`,
    `${e}px -${e}px 0 #000`, `-${e}px -${e}px 0 #000`,
    `0 ${e}px 0 #000`, `0 -${e}px 0 #000`,
    `${e}px 0 0 #000`, `-${e}px 0 0 #000`,
  ].join(", ");

const Vignette: React.FC<{
  src: string; note: string; x: number; y: number; rot: number; l: number;
}> = ({ src, note, x, y, rot, l }) => (
  <div
    style={{
      position: "absolute", left: x, top: y, width: l, height: l * 1.78,
      transform: `rotate(${rot}deg)`,
      borderRadius: 16, overflow: "hidden",
      border: "3px solid rgba(255,255,255,0.22)",
      boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
    }}
  >
    <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    {/* Le badge : la note réelle du passage, comme l'app l'affiche. */}
    <div
      style={{
        position: "absolute", left: 10, top: 10,
        display: "flex", alignItems: "center", gap: 6,
        background: "rgba(4,10,14,0.78)", borderRadius: 9,
        padding: "5px 11px",
      }}
    >
      <div
        style={{
          width: 0, height: 0,
          borderTop: "7px solid transparent",
          borderBottom: "7px solid transparent",
          borderLeft: "11px solid #fff",
        }}
      />
      <span style={{ color: "#19c37d", fontSize: 30, fontWeight: 900, letterSpacing: -1 }}>
        {note}
      </span>
    </div>
  </div>
);

export const MiniatureEmrah: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#070c11", fontFamily: POLICE, overflow: "hidden" }}>
    {/* Le halo ambré : c'est lui qui décolle le sujet du fond. */}
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse 54% 72% at 50% 56%, rgba(255,138,31,0.55) 0%, rgba(255,138,31,0.14) 42%, transparent 70%)",
      }}
    />

    {/* ── ARRIÈRE-PLAN : quatre clips réels, notés ─────────────────────── */}
    <Vignette src="mini-v-v1.png" note="95" x={18} y={34} rot={-4} l={224} />
    <Vignette src="mini-v-v2.png" note="92" x={252} y={14} rot={-2} l={224} />
    <Vignette src="mini-v-v3.png" note="90" x={800} y={14} rot={2} l={224} />
    <Vignette src="mini-v-v4.png" note="89" x={1036} y={34} rot={4} l={224} />

    {/* ── LE SUJET, devant, détaché par son ombre ──────────────────────── */}
    <div
      style={{
        position: "absolute", left: 452, bottom: -10, width: 376, height: 620,
        borderRadius: 20, overflow: "hidden",
        boxShadow: "0 0 0 4px rgba(255,255,255,0.14), 0 40px 90px rgba(0,0,0,0.92)",
      }}
    >
      <Img
        src={staticFile("visage-norman.png")}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 20%" }}
      />
      {/* Un dégradé bas, pour que le cadre ne coupe pas net. */}
      <AbsoluteFill
        style={{
          /* Le dégradé monte à 46 % : les clips sources ont leurs propres
             sous-titres incrustés, et « LA POPULATION / RÉSULTAT ILS »
             apparaissait en bas du sujet. */
          background: "linear-gradient(to bottom, transparent 46%, rgba(7,12,17,0.97) 86%)",
        }}
      />
    </div>

    {/* ── LE TEXTE, réduit au strict nécessaire ────────────────────────── */}
    <div style={{ position: "absolute", left: 26, bottom: 96, width: 400 }}>
      <div
        style={{
          fontSize: 44, fontWeight: 900, color: "#fff", letterSpacing: -1.4,
          lineHeight: 1.0, textShadow: CERNE(4),
        }}
      >
        DE 12 $
      </div>
      <div
        style={{
          fontSize: 86, fontWeight: 900, color: JAUNE, letterSpacing: -3.5,
          lineHeight: 0.98, textShadow: CERNE(6), marginTop: 2, whiteSpace: "nowrap",
        }}
      >
        À 2 500 $
      </div>
    </div>

    {/* Le coût, en bas à droite : un chiffre sans son prix est une promesse. */}
    <div
      style={{
        position: "absolute", right: 26, bottom: 30,
        background: AMBRE, color: "#1a0d02", fontSize: 34, fontWeight: 900,
        padding: "9px 20px", borderRadius: 11, letterSpacing: -0.5,
        boxShadow: "0 12px 34px rgba(0,0,0,0.6)",
        border: "3px solid rgba(255,255,255,0.35)",
      }}
    >
      500 CLIPS
    </div>
  </AbsoluteFill>
);
