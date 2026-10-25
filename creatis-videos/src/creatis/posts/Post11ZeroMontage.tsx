import { ConfigListe, DUREE_LISTE, ListeTease } from "./ListeTease";

/**
 * POST 11 — « 0 montage, 3 clips prets a poster ».
 *
 * Meme format, troisieme promesse : l'EFFORT. Le chiffre zero en ouverture est
 * ce qui accroche — on annonce ce qu'on n'a PAS eu a faire, pas ce que l'outil
 * sait faire. Formulation frontale, aucune revendication invérifiable.
 */
export const DUREE_POST_11 = DUREE_LISTE;

const CONFIG: ConfigListe = {
  // Clips d'archive : bandes-son de createurs differents, majoritairement en
  // anglais — les enchainer donnerait un patchwork. On garde le muet.
  avecSon: false,
  fondAnnonce: "showcase-6.mp4",
  ligne1: "0 montage. 3 clips prêts à poster.",
  ligne2: "sortis d'une seule vidéo",
  items: [
    { fichier: "showcase-7.mp4", score: 93, tag: "Discipline" },
    { fichier: "showcase-8.mp4", score: 89, tag: "Moment fort" },
    { fichier: "showcase-4.mp4", score: 86, tag: "Atelier" },
  ],
};

export const Post11ZeroMontage: React.FC = () => <ListeTease {...CONFIG} />;
