import { AbsoluteFill } from "remotion";
import { POLICE } from "./police";

/**
 * CARROUSEL — 1080×1350 (4:5), le format qui occupe le plus de hauteur dans
 * le fil Instagram.
 *
 * ── POURQUOI UN CARROUSEL ────────────────────────────────────────────────
 * Demandé le 06/10 : « un carrousel par jour avec de la valeur à l'intérieur ».
 * Le carrousel se lit sans son, se garde, se partage — et Instagram le
 * redistribue quand les gens font défiler jusqu'au bout.
 *
 * ── LA RÈGLE DU HOOK S'APPLIQUE ICI AUSSI ────────────────────────────────
 * Relevé le 06/10 sur six Shorts de 3,3 à 20 M de vues : ce qui marche nomme
 * la SITUATION DU SPECTATEUR, à la deuxième personne. La première vignette
 * dit donc un problème que la personne reconnaît, pas ce que fait un produit.
 *
 * ── ET LES CHIFFRES SONT LES NÔTRES ──────────────────────────────────────
 * Chaque vignette s'appuie sur une mesure faite cette semaine, pas sur un
 * conseil générique : 9,9 % de rétention, 338 contre 156, 84 % de hauteur
 * recouverte par l'interface. C'est ce qui distingue ce carrousel d'un
 * énième « 5 astuces pour percer ».
 */

const VERT = "#10b981";
const FOND = "#0a0f0a";
const ROUGE = "#f87171";

export type Vignette = {
  /** Le gros titre. Court : il doit se lire en une demi-seconde. */
  titre: string;
  /** Le corps, deux à quatre lignes. */
  corps?: string;
  /** Un chiffre mesuré, affiché en très grand. */
  chiffre?: string;
  /** Le chiffre est-il un mauvais chiffre ? (rouge au lieu de vert) */
  mauvais?: boolean;
  /** Numéro de la vignette, affiché en haut. */
  index?: string;
  /** Dernière vignette : on change la mise en page. */
  fin?: boolean;
};

export const Carrousel: React.FC<{ v: Vignette }> = ({ v }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: FOND,
        fontFamily: POLICE,
        padding: 92,
        justifyContent: "center",
      }}
    >
      {/* Filet vert : la seule marque, et elle relie les vignettes entre elles. */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 10, background: VERT }} />

      {v.index ? (
        <div
          style={{
            position: "absolute", top: 70, left: 92,
            fontSize: 34, fontWeight: 800, color: "rgba(255,255,255,0.42)", letterSpacing: 2,
          }}
        >
          {v.index}
        </div>
      ) : null}

      {v.chiffre ? (
        <div
          style={{
            fontSize: 210,
            fontWeight: 900,
            letterSpacing: -9,
            lineHeight: 0.92,
            color: v.mauvais ? ROUGE : VERT,
            marginBottom: 18,
          }}
        >
          {v.chiffre}
        </div>
      ) : null}

      <div
        style={{
          fontSize: v.chiffre ? 62 : 82,
          fontWeight: 900,
          color: "#fff",
          letterSpacing: -2,
          lineHeight: 1.12,
        }}
      >
        {v.titre}
      </div>

      {v.corps ? (
        <div
          style={{
            fontSize: 42,
            color: "rgba(255,255,255,0.80)",
            marginTop: 30,
            lineHeight: 1.42,
            /* Les `
` du corps étaient avalés : une réplique citée se
               retrouvait collée à son explication, sur la même ligne. */
            whiteSpace: "pre-line",
          }}
        >
          {v.corps}
        </div>
      ) : null}

      {v.fin ? (
        <div
          style={{
            position: "absolute", left: 92, bottom: 80,
            fontSize: 38, fontWeight: 800, color: VERT,
          }}
        >
          creatis.app
        </div>
      ) : (
        <div
          style={{
            position: "absolute", right: 92, bottom: 80,
            fontSize: 34, fontWeight: 700, color: "rgba(255,255,255,0.42)",
          }}
        >
          glisse →
        </div>
      )}
    </AbsoluteFill>
  );
};

/**
 * LE CARROUSEL DU 06/10 — « Pourquoi ton clip fait 200 vues ».
 *
 * Chaque cause vient d'une mesure faite cette semaine sur nos propres comptes,
 * et chacune se corrige sans outil.
 */
export const VIGNETTES: Vignette[] = [
  {
    titre: "Pourquoi ton clip fait 200 vues",
    corps: "Cinq causes, mesurées cette semaine sur mes propres comptes. Et ce qui les corrige.",
    index: "",
  },
  {
    index: "1 / 5",
    chiffre: "9,9 %",
    mauvais: true,
    titre: "Ton ouverture perd tout le monde",
    corps:
      "Neuf personnes sur dix partaient avant la fin de la première seconde. Mais celles qui restaient voyaient 79 % du film : le montage tenait, c'était l'ouverture.",
  },
  {
    index: "2 / 5",
    chiffre: "×2",
    titre: "Montre le résultat d'abord",
    corps:
      "En ouvrant sur le résultat fini au lieu de l'expliquer, le même format est passé de 156 à 338 vues. Une vidéo courte n'est pas une histoire, c'est une vitrine.",
  },
  {
    index: "3 / 5",
    chiffre: "84 %",
    mauvais: true,
    titre: "Ton texte est caché",
    corps:
      "Le pseudo recouvre à partir de 84 % de la hauteur, la colonne de boutons monte jusqu'à 53 %. La bande sûre tient entre 45 et 65 %.",
  },
  {
    index: "4 / 5",
    titre: "Ton hook parle de toi",
    corps:
      "« J'ai changé une seule chose » : 123 vues.\n« Quand t'es dans un endroit sans réseau » : 6 500 000 vues.\nLe hook nomme la situation de celui qui regarde, pas la tienne.",
  },
  {
    index: "5 / 5",
    chiffre: "30-90 s",
    titre: "Et il doit finir sur une idée finie",
    corps:
      "Un passage tranché en pleine phrase perd tout, même parfait ailleurs. Entre 30 et 90 secondes, et jamais coupé au milieu.",
  },
  {
    titre: "Garde-le pour ton prochain montage",
    corps:
      "Les cinq critères : accroche /20, autonomie /20, rétention /20, valeur /20, viralité /20.",
    fin: true,
  },
];
