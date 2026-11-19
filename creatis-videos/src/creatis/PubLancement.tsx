import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill } from "remotion";
import { POLICE } from "./police";
import { SceneHook } from "./SceneHook";
import { SceneInterface } from "./SceneInterface";
import { SceneLancement } from "./SceneLancement";
import { SceneOuverture } from "./SceneOuverture";
import { ScenePreuve } from "./ScenePreuve";
import { SceneProbleme } from "./SceneProbleme";
import { COULEURS } from "./theme";

/**
 * PUB DE LANCEMENT — 1080x1920, 27,9 s.
 *
 * Deux moteurs, chacun sur son terrain :
 *
 * - **HyperFrames** fabrique la scene « L'application, en vrai » : c'est
 *   litteralement l'interface du site, en HTML/CSS avec les tokens de
 *   css/style.css, animee en GSAP. Elle passe le lint contraste/layout de
 *   HyperFrames (105/105 en WCAG AA) et sort en MP4.
 * - **Remotion** monte le film : narration, minutage, voix off, transitions,
 *   et embarque le rendu HyperFrames comme une source video parmi d'autres.
 *
 * Ce n'est pas un partage arbitraire : rejouer du HTML evite de reecrire
 * l'interface en React, donc la pub ne peut pas deriver du produit.
 *
 * Total = 75 + 105 + 142 + 240 + 150 + 185 = 897 images
 * moins 5 fondus de 12 images = 837 images, soit 27,9 s a 30 i/s.
 * Chaque duree tient sa replique de voix off, silences retires.
 */
export const DUREE_PUB_LANCEMENT = 837;

export const PubLancement: React.FC = () => {
  const fondu = linearTiming({ durationInFrames: 12 });

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond, fontFamily: POLICE }}>
      <TransitionSeries>
        {/* Ouverture de marque, volontairement muette */}
        <TransitionSeries.Sequence durationInFrames={75} name="0 · Ouverture">
          <SceneOuverture />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fondu} />

        <TransitionSeries.Sequence durationInFrames={105} name="1 · Accroche">
          <SceneHook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fondu} />

        <TransitionSeries.Sequence durationInFrames={142} name="2 · Problème">
          <SceneProbleme />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fondu} />

        {/* ── La scene fabriquee par HyperFrames ── */}
        <TransitionSeries.Sequence
          durationInFrames={240}
          name="3 · L'appli (HyperFrames)"
        >
          <SceneInterface />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fondu} />

        <TransitionSeries.Sequence durationInFrames={150} name="4 · Preuve">
          <ScenePreuve />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fondu} />

        <TransitionSeries.Sequence durationInFrames={185} name="5 · Lancement">
          <SceneLancement />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
