import { ConfigListe, DUREE_LISTE, ListeTease } from "./ListeTease";

/**
 * POST 12 — « Une interview 16:9, 3 verticales recadrees toutes seules ».
 *
 * Premier post monte avec des clips que le produit vient REELLEMENT de sortir
 * (04/09/2026), et non avec les vignettes d'archive. Deux consequences :
 *
 * 1. **Ils sont en 1080x1920 natif.** Les huit `showcase-*.mp4` utilises jusqu'ici
 *    sont en 360x640, donc etires x3 dans un cadre 1080 — c'est le bug de
 *    definition corrige par le commit dac9c8a. La difference se voit.
 * 2. **La promesse est calee sur ce que le produit a fait ici**, pas plus : il a
 *    telecharge, decoupe et recadre en 9:16 avec suivi de visage. Il n'a PAS
 *    choisi les moments — cette video n'a aucun sous-titre disponible, donc la
 *    selection par transcription n'a pas pu tourner et les bornes ont ete
 *    posees a la main. D'ou « recadrees toutes seules » et non « trouvees par
 *    l'IA » : on ne revendique que le travail reellement effectue.
 *
 * Source : « 8 jours pour Creer une Boite avec le fondateur de Meetic
 * (ft. Marc Simoncini) » — interview business francaise, bien plus proche de
 * l'audience visee que les clips de plongee et de boxe d'archive.
 */
export const DUREE_POST_12 = DUREE_LISTE;

const CONFIG: ConfigListe = {
  /* Un QUATRIEME extrait, et pas l'un des trois de la liste : le fond d'annonce
     etait `creatis-b.mp4`, le meme fichier que l'element #2. On revoyait donc le
     plan ET on reentendait la meme phrase a douze secondes d'intervalle. */
  fondAnnonce: "creatis-d.mp4",
  ligne1: "Une interview 16:9, 3 verticales",
  ligne2: "recadrées toutes seules",
  items: [
    { fichier: "creatis-a.mp4", tag: "Invité" },
    { fichier: "creatis-b.mp4", tag: "Face caméra" },
    { fichier: "creatis-c.mp4", tag: "Échange" },
  ],
};

export const Post12Recadrage: React.FC = () => <ListeTease {...CONFIG} />;
