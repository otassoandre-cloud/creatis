import { ConfigListe, DUREE_LISTE, ListeTease } from "./ListeTease";

/**
 * POST 10 — « 3 moments que j'aurais coupes au mauvais endroit ».
 *
 * Meme format, promesse differente : ce n'est pas le gain de temps, c'est le
 * JUGEMENT. Le spectateur se sait mauvais juge de ses propres rushes, et
 * l'aveu a la premiere personne desamorce le ton publicitaire — c'est le
 * registre de la video qui a le mieux marche sur le compte.
 *
 * Le clip a 66 000 vues est en position 2 : c'est la preuve verifiable, elle
 * recompense celui qui est reste et le porte jusqu'a la fin.
 */
export const DUREE_POST_10 = DUREE_LISTE;

const CONFIG: ConfigListe = {
  // Clips d'archive : bandes-son de createurs differents, majoritairement en
  // anglais — les enchainer donnerait un patchwork. On garde le muet.
  avecSon: false,
  fondAnnonce: "showcase-5.mp4",
  ligne1: "3 moments que j'aurais coupés au mauvais endroit",
  ligne2: "l'IA ne les a pas ratés",
  tailleLigne1: 88,
  items: [
    { fichier: "showcase-3.mp4", score: 90, tag: "Moment fort" },
    { fichier: "clip-66k.mp4", score: 91, tag: "Hook", badge: "66 000 vues" },
    { fichier: "showcase-1.mp4", score: 87, tag: "Storytelling" },
  ],
};

export const Post10Moments: React.FC = () => <ListeTease {...CONFIG} />;
