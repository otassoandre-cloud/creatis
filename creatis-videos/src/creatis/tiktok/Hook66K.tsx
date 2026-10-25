import { Audio, Video } from "@remotion/media";
import { AbsoluteFill, staticFile } from "remotion";
import { SousTitreBrule } from "../SousTitreBrule";
import { COULEURS } from "../theme";

/**
 * PLAN 1 — l'accroche (0 → 3 s).
 *
 * On ouvre sur un VISAGE REEL en mouvement, image 1, sans fondu au noir et sans
 * logo. Trois raisons, toutes mesurees :
 *
 * - Le blog de Créatis : « ~2 s pour decider si le spectateur reste ou scrolle »
 *   et « une intro avant le sujet a deja perdu une grande partie de l'audience ».
 *   La version precedente ouvrait sur 2,5 s de logo — exactement cette erreur.
 * - Le marche 2026 : les 3 premieres secondes decident de 71 % du visionnage.
 * - Le contenu de type createur bat largement la pub leche sur TikTok.
 *
 * L'affirmation « 66 000 vues » est vraie et verifiable, et « je ne l'ai pas
 * montee » cree la question qui retient : comment, alors ?
 */
export const Hook66K: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Audio src={staticFile("voix/t1-hook.mp3")} />

      <Video
        src={staticFile("clip-66k.mp4")}
        style={{ width: "100%", height: "100%" }}
        objectFit="cover"
        muted
      />

      {/* Voile leger : le clip est tourne en salle de sport, tres lumineux. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(4,10,7,0.35) 0%, rgba(4,10,7,0) 30%, rgba(4,10,7,0.2) 55%, rgba(4,10,7,0.6) 100%)",
        }}
      />

      <SousTitreBrule
        texte="Cette vidéo a fait 66 000 vues"
        debut={2}
        fin={42}
        cadence={3}
        hauteur={17}
        taille={82}
        accent={["66", "000", "vues"]}
      />

      <SousTitreBrule
        texte="Je ne l'ai pas montée."
        debut={46}
        cadence={3}
        hauteur={31}
        taille={72}
        accent={["montée."]}
      />
    </AbsoluteFill>
  );
};
