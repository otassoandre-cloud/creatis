import { Video } from "@remotion/media";
import { AbsoluteFill, Series, staticFile } from "remotion";
import { POLICE } from "./police";
import { Punch } from "./Punch";
import { CartonFinal } from "./posts/CartonFinal";

/**
 * VITRINE PRODUIT — 1080x1920, 33,5 s.
 *
 * Rupture avec les six videos precedentes, et c'est le fond du sujet : jusqu'ici on
 * decoupait du GTA a la main, avec nos propres textes par-dessus. Ca montrait une
 * video, pas un produit. Ici le plan EST une sortie de Creatis, telle qu'un client
 * la recoit : recadrage vertical suivi sur la personne, sous-titres karaoke
 * incrustes mot par mot, son d'origine.
 *
 * AUCUN RETRAITEMENT. Pas de relevement de luminance, pas de texte ajoute, pas de
 * recoupe. Toutes les compositions precedentes corrigent l'exposition plan par plan
 * pour viser les 118 du corpus — ici ce serait un contresens : ce qu'on montre
 * doit etre exactement ce que le client obtient. Une vitrine retouchee ne prouve
 * rien.
 *
 * LE CLIP D'ABORD, LA MARQUE APRES. Trente secondes de contenu qui se tient tout
 * seul, puis trois secondes de revelation. Quelqu'un qui apprend a la fin que ce
 * qu'il vient de regarder a ete decoupe automatiquement se pose la question ;
 * quelqu'un a qui on l'annonce d'entree passe son chemin.
 */
export const DUREE_VITRINE = 1006;

const CLIP = 906;   // 30,2 s de clip, la duree exacte du fichier

export const Vitrine: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#eef3ef", fontFamily: POLICE }}>
    <Series>
      <Series.Sequence durationInFrames={CLIP} name="Clip Créatis">
        <Video
          src={staticFile("demo-creatis.mp4")}
          style={{ width: "100%", height: "100%" }}
          objectFit="cover"
        />
      </Series.Sequence>

      <Series.Sequence durationInFrames={DUREE_VITRINE - CLIP} name="Révélation">
        <Punch>
          <CartonFinal clair mention="Sous-titres et recadrage automatiques" />
        </Punch>
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
