import { Audio, Video } from "@remotion/media";
import { AbsoluteFill, staticFile, useVideoConfig } from "remotion";
import { SousTitreBrule } from "../SousTitreBrule";
import { COULEURS } from "../theme";

/**
 * PLAN 4 — le produit en action (8,5 → 15 s), fabrique par HyperFrames.
 *
 * C'est le plan le plus long de la pub, donc celui qui risque le decrochage.
 * Deux garde-fous :
 *
 * - Le rendu HyperFrames bouge en permanence (lien qui se tape, barre qui se
 *   remplit, cartes qui tombent en cascade) : jamais une image figee.
 * - Le sous-titre change TROIS fois pendant le plan, ce qui donne un nouveau
 *   point d'accroche toutes les ~2 s sans avoir a couper l'image — la regle
 *   « pattern interrupt toutes les 3-4 s » du blog Créatis.
 */
export const Solution: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Audio src={staticFile("voix/t4-solution.mp3")} />

      {/* `trimBefore` saute les 0,4 s ou l'interface se met en place ET le champ reste vide : le plan
          s'ouvrait sur un champ vide, soit un ecran quasi mort en plein milieu
          de la pub. `playbackRate` resserre le reste pour que les cartes de
          clips arrivent plus tot — relevé a 1,5 quand le plan est passe de
          205 a 142 images, sinon la cascade de cartes tombait apres la coupe — c'est elles qui retiennent, pas la barre de
          progression. */}
      <Video
        src={staticFile("interface-hyperframes.mp4")}
        style={{ width: "100%", height: "100%" }}
        objectFit="cover"
        muted
        trimBefore={22}
        playbackRate={1.5}
      />

      {/* Voile bas : les sous-titres passent par-dessus une interface deja dense */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(4,10,7,0) 40%, rgba(4,10,7,0.55) 72%, rgba(4,10,7,0.2) 100%)",
        }}
      />

      <SousTitreBrule
        texte="Tu colles ton lien"
        debut={3}
        fin={1.45 * fps}
        cadence={3}
        hauteur={70}
        taille={74}
        accent={["lien"]}
      />

      <SousTitreBrule
        texte="L'IA trouve les moments forts"
        debut={1.6 * fps}
        fin={3.05 * fps}
        cadence={3}
        hauteur={70}
        taille={74}
        accent={["L'IA"]}
      />

      <SousTitreBrule
        texte="Recadre. Sous-titre. Exporte."
        debut={3.2 * fps}
        cadence={3}
        hauteur={70}
        taille={74}
        accent={["Exporte."]}
      />
    </AbsoluteFill>
  );
};
