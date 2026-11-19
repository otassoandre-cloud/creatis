import { ConfigListe, DUREE_LISTE, ListeTease } from "./ListeTease";

/**
 * POST 4 — « 3 clips que l'IA a trouves dans MA video ».
 *
 * C'est le post qui a le mieux marche sur le compte. Son contenu n'a pas
 * bouge d'un mot : seule la mecanique est passee dans `ListeTease`, pour que
 * les variantes heritent de la structure exacte au lieu de la reproduire a
 * l'oeil. Ne rien changer ici sans raison — c'est la reference.
 */
export const DUREE_POST_4 = DUREE_LISTE;

const CONFIG: ConfigListe = {
  // Clips d'archive : bandes-son de createurs differents, majoritairement en
  // anglais — les enchainer donnerait un patchwork. On garde le muet.
  avecSon: false,
  fondAnnonce: "showcase-8.mp4",
  ligne1: "3 clips que l'IA a trouvés dans MA vidéo",
  ligne2: "le 2e a fait 66 000 vues",
  items: [
    { fichier: "showcase-5.mp4", score: 94, tag: "Moment fort" },
    // Le vrai clip a 66 000 vues, en position d'appat.
    { fichier: "clip-66k.mp4", score: 91, tag: "Hook", badge: "66 000 vues" },
    { fichier: "showcase-7.mp4", score: 89, tag: "Storytelling" },
  ],
};

export const Post4Liste: React.FC = () => <ListeTease {...CONFIG} />;
