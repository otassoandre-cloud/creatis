import { AbsoluteFill, Img, staticFile } from "remotion";
import { POLICE } from "./police";

/**
 * MINIATURE SANS VISAGE — 1280×720.
 *
 * ── CE QU'ELLE REPREND DE L'ANALYSE DU 16/10 ─────────────────────────────
 * Les principes relevés sur les miniatures qui marchent dans la niche, et
 * qui sont transposables sans personne à l'écran :
 *
 *   · un fond sombre travaillé, avec un halo qui décolle le centre ;
 *   · des téléphones INCLINÉS montrant de vraies captures, jamais des
 *     maquettes ;
 *   · la preuve chiffrée POSÉE SUR l'image, en très gros ;
 *   · des pastilles blanches arrondies dans les coins hauts, qui racontent
 *     l'avant et l'après ;
 *   · un texte sur DEUX NIVEAUX : un seul mot dans un bandeau or, le reste
 *     en blanc crème dessous ;
 *   · trois couleurs, pas plus.
 *
 * ── CE QUI REMPLACE LE VISAGE ────────────────────────────────────────────
 * Dans ces miniatures-là, le visage occupe le centre et porte la promesse.
 * Sans présentateur, le centre doit être tenu par autre chose d'aussi fort :
 * ici, le PRODUIT EN TRAIN DE TRAVAILLER — le lecteur de l'app, clip
 * recadré et sous-titré, encadré par deux clips finis et leurs notes.
 *
 * C'est le seul endroit où nous sommes mieux placés : eux montrent un
 * logiciel que tout le monde a, nous montrons un résultat que personne
 * d'autre ne produit.
 *
 * Les notes (95, 92) sont celles que l'application a réellement données.
 * Une preuve inventée ne vaut rien.
 */

const OR = "#ffc531";
const CREME = "#f7ead1";

const CERNE = (e: number) =>
  [
    `${e}px ${e}px 0 #000`, `-${e}px ${e}px 0 #000`,
    `${e}px -${e}px 0 #000`, `-${e}px -${e}px 0 #000`,
    `0 ${e}px 0 #000`, `0 -${e}px 0 #000`,
    `${e}px 0 0 #000`, `-${e}px 0 0 #000`,
  ].join(", ");

/** La pastille blanche des coins : elle raconte l'avant ou l'après. */
const Pastille: React.FC<{
  texte: string; gauche?: number; droite?: number;
}> = ({ texte, gauche, droite }) => (
  <div
    style={{
      position: "absolute", top: 26, left: gauche, right: droite,
      display: "flex", alignItems: "center", gap: 10,
      background: "#fff", borderRadius: 999, padding: "10px 24px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
    }}
  >
    <div
      style={{
        width: 0, height: 0,
        borderTop: "11px solid transparent",
        borderBottom: "11px solid transparent",
        borderLeft: "17px solid #111",
      }}
    />
    <span style={{ fontSize: 42, fontWeight: 900, color: "#111", letterSpacing: -1 }}>
      {texte}
    </span>
  </div>
);

/** Un clip fini, incliné, avec la note que l'app lui a donnée. */
const Clip: React.FC<{
  src: string; note: string; x: number; rot: number; l: number; y: number;
}> = ({ src, note, x, rot, l, y }) => (
  <div
    style={{
      position: "absolute", left: x, top: y, width: l, height: l * 1.78,
      transform: `rotate(${rot}deg)`,
      borderRadius: 18, overflow: "hidden",
      border: "3px solid rgba(255,255,255,0.2)",
      boxShadow: "0 28px 70px rgba(0,0,0,0.85)",
    }}
  >
    <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    <div
      style={{
        position: "absolute", left: 12, top: 12,
        background: "rgba(4,10,14,0.82)", borderRadius: 10,
        padding: "6px 14px",
        fontSize: 34, fontWeight: 900, color: "#19c37d", letterSpacing: -1,
      }}
    >
      {note}
    </div>
  </div>
);

export const MiniatureSansVisage: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#06090d", fontFamily: POLICE, overflow: "hidden" }}>
    {/* Le halo : il décolle le centre, comme le rim-light décolle un sujet. */}
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse 46% 68% at 50% 46%, rgba(255,197,49,0.42) 0%, rgba(255,140,20,0.12) 44%, transparent 72%)",
      }}
    />

    {/* Les deux clips finis, de part et d'autre. */}
    <Clip src="mini2-g.png" note="95" x={60} y={78} rot={-6} l={262} />
    <Clip src="mini2-d.png" note="92" x={958} y={78} rot={6} l={262} />

    {/* Le centre : le produit en train de travailler. */}
    <div
      style={{
        position: "absolute", left: 442, top: 18, width: 396, height: 568,
        borderRadius: 22, overflow: "hidden",
        border: "4px solid rgba(255,255,255,0.3)",
        boxShadow: "0 36px 90px rgba(0,0,0,0.95)",
      }}
    >
      <Img
        src={staticFile("mini2-centre.png")}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>

    {/* L'avant et l'après, en pastilles. */}
    <Pastille texte="1 VIDÉO" gauche={38} />
    <Pastille texte="10 CLIPS" droite={38} />

    {/* Le texte, sur deux niveaux. */}
    <div
      style={{
        position: "absolute", left: 0, right: 0, bottom: 22,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      }}
    >
      <div
        style={{
          background: OR, color: "#20160a",
          fontSize: 58, fontWeight: 900, letterSpacing: -1.5,
          padding: "8px 34px", borderRadius: 14,
          boxShadow: "0 0 44px rgba(255,197,49,0.55), 0 12px 30px rgba(0,0,0,0.7)",
        }}
      >
        3 MINUTES
      </div>
      <div
        style={{
          fontSize: 68, fontWeight: 900, color: CREME, letterSpacing: -2.2,
          textShadow: CERNE(6), lineHeight: 1,
        }}
      >
        ET C&apos;EST MONTÉ
      </div>
    </div>
  </AbsoluteFill>
);
