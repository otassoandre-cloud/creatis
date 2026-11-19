import { AbsoluteFill, Img, staticFile } from "remotion";
import { POLICE } from "./police";

/**
 * MINIATURE — 1280×720, format long du 13/10.
 *
 * ── LA RECETTE, RELEVÉE DANS LA NICHE LE 10/10 ───────────────────────────
 * Les deux premiers résultats de « gagner de l'argent avec le clipping »
 * (24 k et 32 k vues) partagent : un mot énorme en jaune cerné de noir empilé
 * à gauche, un visage qui regarde la caméra, une preuve visuelle sur le côté,
 * un bandeau vert en bas, et un FOND CLAIR sans zone sombre.
 *
 * ── TROIS CORRECTIONS SUR LE PREMIER TIRAGE ──────────────────────────────
 * 1. Le fond était bleu nuit : la recette dit clair, et c'est le point qui
 *    sépare nos onze premières miniatures (des rectangles sombres) de celles
 *    qui gagnent. Corrigé en crème, rayons gris.
 * 2. « ARNAQUE ? » passait à la ligne et le point d'interrogation chevauchait
 *    le tampon. Taille ramenée de 148 à 116, bloc élargi.
 * 3. La preuve était la grille de clips — mais la seule grille disponible
 *    affiche un titre « World War 11 », déjà écarté une fois le 12/10 sous un
 *    point sur l'argent. Remplacée par une carte de chiffres, qui prouve la
 *    même chose et se lit en vignette.
 *
 * Le mot énorme n'est pas une promesse, c'est la QUESTION que les gens tapent
 * (« whop clipping real or fake » dans l'autocomplétion). Une miniature de
 * recherche gagne en montrant ce qu'on est venu chercher, pas en proclamant.
 */

const JAUNE = "#ffd60a";
const VERT = "#19c37d";
const ROUGE = "#e23c3c";
const ENCRE = "#0d1b2a";

const CERNE = (e: number) =>
  [
    `${e}px ${e}px 0 #000`, `-${e}px ${e}px 0 #000`,
    `${e}px -${e}px 0 #000`, `-${e}px -${e}px 0 #000`,
    `0 ${e}px 0 #000`, `0 -${e}px 0 #000`,
    `${e}px 0 0 #000`, `-${e}px 0 0 #000`,
    /* Une ombre portée franche, mais pas DÉTACHÉE : à 116 px et e = 8, le
       décalage de 1,6 e donnait un second mot fantôme sous le premier. */
    `${Math.round(e * 0.9)}px ${Math.round(e * 0.9)}px 0 rgba(0,0,0,0.55)`,
  ].join(", ");

export const MiniatureArnaque: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#f4efe4", fontFamily: POLICE, overflow: "hidden" }}>
    {/* Fond clair : c'est lui qui fait ressortir la vignette dans une page de
        résultats, où tout le monde poste des rectangles sombres. */}
    <AbsoluteFill
      style={{
        background:
          "repeating-conic-gradient(from 0deg at 66% 44%, rgba(13,27,42,0.10) 0deg 3deg, transparent 3deg 9deg)",
      }}
    />
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 66% 44%, rgba(255,214,10,0.55) 0%, transparent 58%)",
      }}
    />

    {/* Le visage, à droite du bloc de texte, détouré par un liseré blanc. */}
    <div
      style={{
        position: "absolute", right: 232, bottom: 0, width: 545, height: 700,
        overflow: "hidden",
        boxShadow: "0 0 0 6px #fff, 0 18px 56px rgba(0,0,0,0.35)",
      }}
    >
      <Img
        src={staticFile("visage-studio.png")}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 20%" }}
      />
    </div>

    {/* La preuve : les chiffres eux-mêmes, lisibles en vignette. */}
    <div
      style={{
        position: "absolute", right: 24, bottom: 96, width: 330,
        transform: "rotate(-6deg)",
        background: "#fff", borderRadius: 16, padding: "22px 24px",
        border: "5px solid " + ENCRE,
        boxShadow: "0 18px 50px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ fontSize: 23, fontWeight: 800, color: "#6b7280", letterSpacing: 0.5 }}>
        TARIF RÉEL
      </div>
      <div style={{ fontSize: 56, fontWeight: 900, color: ENCRE, letterSpacing: -2, lineHeight: 1.05 }}>
        1 $
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#374151", marginTop: -2 }}>
        pour 1 000 vues
      </div>
      <div style={{ height: 3, background: "#e5e7eb", margin: "14px 0" }} />
      <div style={{ fontSize: 34, fontWeight: 900, color: ROUGE, letterSpacing: -1 }}>
        1 clip = 5 $
      </div>
    </div>

    {/* La question, empilée à gauche — c'est elle qu'on tape dans la barre. */}
    <div style={{ position: "absolute", left: 40, top: 56, width: 720 }}>
      <div
        style={{
          fontSize: 58, fontWeight: 900, color: "#fff", letterSpacing: -1.5,
          lineHeight: 1.0, textShadow: CERNE(5),
        }}
      >
        LE CLIPPING,
      </div>
      <div
        style={{
          fontSize: 116, fontWeight: 900, color: JAUNE, letterSpacing: -4,
          lineHeight: 1.0, textShadow: CERNE(8), marginTop: 6, whiteSpace: "nowrap",
        }}
      >
        ARNAQUE&nbsp;?
      </div>

      {/* Le tampon : la promesse réelle du film. */}
      <div
        style={{
          display: "inline-block", marginTop: 26,
          background: ROUGE, color: "#fff", fontSize: 48, fontWeight: 900,
          padding: "10px 24px", borderRadius: 10, letterSpacing: -0.5,
          transform: "rotate(-3deg)",
          boxShadow: "0 12px 34px rgba(0,0,0,0.45)",
          border: "4px solid #fff",
        }}
      >
        LES 3 MENSONGES
      </div>
    </div>

    {/* Le bandeau du bas : ce qu'on obtient en échange du clic. */}
    <div
      style={{
        position: "absolute", left: 40, bottom: 36,
        background: VERT, color: "#04120b", fontSize: 42, fontWeight: 900,
        padding: "12px 26px", borderRadius: 12, letterSpacing: -0.5,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        border: "4px solid #fff",
      }}
    >
      LES CHIFFRES RÉELS ✅
    </div>
  </AbsoluteFill>
);
