import { AbsoluteFill, Img, staticFile } from "remotion";
import { POLICE } from "./police";

/**
 * MINIATURE — 1280×720, « Gagner de l'argent sur TikTok sans montrer son visage ».
 *
 * ── CE QUI N'ALLAIT PAS DANS LA VERSION PRÉCÉDENTE ───────────────────────
 * Trois reproches, tous fondés :
 *   1. le clip du centre montrait quelqu'un **de dos** ;
 *   2. les deux clips latéraux étaient trop petits — des vignettes de
 *      256 px où l'on ne distingue ni visage ni texte ;
 *   3. rien ne ressemblait à la référence, où le centre est tenu par un
 *      sujet net et éclairé.
 *
 * ── POURQUOI IL N'Y A PAS DE VISAGE AU CENTRE ────────────────────────────
 * La référence met au centre le visage du PROPRIÉTAIRE de la chaîne. Les
 * seuls visages nets dont nous disposons sont ceux de créateurs tiers —
 * Amixem, Konbini, Squeezie. Les montrer DANS un clip est le sujet même du
 * clipping ; les détourer au centre d'une miniature qui annonce un revenu
 * laisserait croire qu'ils cautionnent l'offre. On ne le fait pas.
 *
 * Tant qu'il n'y a pas de visage à nous, le centre est tenu par la seule
 * chose que personne d'autre ne peut montrer : **le résultat du produit**,
 * en grand et lisible.
 *
 * ── CE QUI CHANGE, CONCRÈTEMENT ──────────────────────────────────────────
 * Une seule preuve, occupant la moitié du cadre, où l'on LIT « 7 clips
 * viraux trouvés » et les notes réelles — au lieu de trois vignettes
 * illisibles. Le texte occupe l'autre moitié, sans rien chevaucher.
 */

const OR = "#ffc531";
const CREME = "#f7ead1";
const ROUGE = "#e23c3c";

const CERNE = (e: number) =>
  [
    `${e}px ${e}px 0 #000`, `-${e}px ${e}px 0 #000`,
    `${e}px -${e}px 0 #000`, `-${e}px -${e}px 0 #000`,
    `0 ${e}px 0 #000`, `0 -${e}px 0 #000`,
    `${e}px 0 0 #000`, `-${e}px 0 0 #000`,
  ].join(", ");

const Pastille: React.FC<{ texte: string; haut: number }> = ({ texte, haut }) => (
  <div
    style={{
      position: "absolute", left: 44, top: haut,
      background: "#fff", borderRadius: 999, padding: "9px 24px",
      boxShadow: "0 10px 28px rgba(0,0,0,0.7)",
      fontSize: 34, fontWeight: 900, color: "#0d1117", letterSpacing: -0.8,
    }}
  >
    {texte}
  </div>
);

export const MiniatureSansVisageYT: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#070b11", fontFamily: POLICE, overflow: "hidden" }}>
    {/* Un fond construit, pas un aplat : deux lumières et une grille fine,
        c'est ce qui sépare une vignette propre d'un carré de couleur. */}
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse 60% 80% at 78% 50%, rgba(255,160,30,0.30) 0%, transparent 62%)," +
          "radial-gradient(ellipse 50% 70% at 12% 70%, rgba(25,195,125,0.18) 0%, transparent 60%)",
      }}
    />
    <AbsoluteFill
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px)," +
          "linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)",
        backgroundSize: "54px 54px",
      }}
    />

    {/* LA PREUVE, en grand : on doit pouvoir LIRE les notes. */}
    <div
      style={{
        position: "absolute", right: -70, top: 92, width: 790,
        transform: "rotate(-7deg)",
        borderRadius: 16, overflow: "hidden",
        border: "6px solid rgba(255,255,255,0.92)",
        boxShadow: "0 34px 90px rgba(0,0,0,0.9)",
      }}
    >
      <Img src={staticFile("preuve-grille-18.png")} style={{ width: "100%", display: "block" }} />
    </div>

    {/* Les deux objections, réglées avant d'être posées. */}
    <Pastille texte="0 ABONNÉ" haut={34} />
    <Pastille texte="0 CAMÉRA" haut={92} />

    {/* Le texte : il occupe sa moitié, il ne déborde sur rien. */}
    <div style={{ position: "absolute", left: 40, top: 176, width: 620 }}>
      <div
        style={{
          fontSize: 92, fontWeight: 900, color: OR, letterSpacing: -4,
          lineHeight: 0.96, textShadow: CERNE(8), whiteSpace: "nowrap",
        }}
      >
        150 $
      </div>
      <div
        style={{
          fontSize: 54, fontWeight: 900, color: CREME, letterSpacing: -1.6,
          lineHeight: 1.04, textShadow: CERNE(5), marginTop: 4,
        }}
      >
        PAR SEMAINE
      </div>
      <div
        style={{
          fontSize: 62, fontWeight: 900, color: "#fff", letterSpacing: -2,
          lineHeight: 1.0, textShadow: CERNE(6), marginTop: 18,
        }}
      >
        SANS TE
        <br />
        MONTRER
      </div>

      {/* Le coût : un chiffre sans son prix est une promesse. */}
      <div
        style={{
          display: "inline-block", marginTop: 20,
          background: ROUGE, color: "#fff", fontSize: 34, fontWeight: 900,
          padding: "8px 20px", borderRadius: 10, letterSpacing: -0.5,
          transform: "rotate(-2.5deg)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.65)",
          border: "3px solid rgba(255,255,255,0.4)",
        }}
      >
        30 CLIPS / SEMAINE
      </div>
    </div>
  </AbsoluteFill>
);
