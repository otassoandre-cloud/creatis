import { ConfigListe, DUREE_LISTE, ListeTease } from "./ListeTease";

/**
 * POST 9 — « 3 univers, le meme outil ».
 *
 * Meme format que le post 4 (celui qui a marche), autre promesse : la
 * GENERALITE. L'objection silencieuse d'un prospect est « oui mais ca ne
 * marchera pas sur MON contenu » — trois clips venus de trois mondes qui n'ont
 * rien a voir y repondent sans avoir a l'affirmer.
 *
 * Les trois clips sont reels et sortent du produit. Le e-commerce est en
 * position 2, la position d'appat, parce que c'est le plus inattendu : on
 * n'associe pas spontanement un outil de clips a une video de boutique en
 * ligne.
 */
export const DUREE_POST_9 = DUREE_LISTE;

const CONFIG: ConfigListe = {
  // Clips d'archive : bandes-son de createurs differents, majoritairement en
  // anglais — les enchainer donnerait un patchwork. On garde le muet.
  avecSon: false,
  fondAnnonce: "showcase-4.mp4",
  ligne1: "3 vidéos, 3 univers, le même outil",
  ligne2: "aucune retouche",
  items: [
    { fichier: "showcase-2.mp4", score: 92, tag: "Plongée" },
    { fichier: "showcase-6.mp4", score: 90, tag: "E-commerce" },
    { fichier: "showcase-3.mp4", score: 88, tag: "Automobile" },
  ],
};

export const Post9Univers: React.FC = () => <ListeTease {...CONFIG} />;
