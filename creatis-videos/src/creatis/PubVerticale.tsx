import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill } from "remotion";
import { POLICE } from "./police";
import { SceneCTA } from "./SceneCTA";
import { SceneHook } from "./SceneHook";
import { ScenePreuve } from "./ScenePreuve";
import { SceneProbleme } from "./SceneProbleme";
import { SceneProduit } from "./SceneProduit";
import { COULEURS } from "./theme";

/**
 * Publicite verticale 9:16 — TikTok / Reels / Shorts.
 *
 * Deroule : accroche → probleme → produit → preuve → appel a l'action.
 * Les durees sont ecrites en clair (et pas calculees) pour rester modifiables
 * directement dans Remotion Studio, comme le recommande le skill
 * remotion-interactivity.
 *
 * Total = 105 + 142 + 240 + 150 + 120 = 757 images
 * moins 4 fondus de 12 images = 709 images, soit 23,6 s a 30 i/s.
 *
 * Chaque duree tient la replique de voix off correspondante, silences retires,
 * avec une marge avant le fondu : voir generer-voix.mjs.
 */
export const DUREE_PUB_VERTICALE = 709;

export const PubVerticale: React.FC = () => {
  const fondu = linearTiming({ durationInFrames: 12 });

  return (
    <AbsoluteFill
      style={{ backgroundColor: COULEURS.fond, fontFamily: POLICE }}
    >
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={105} name="1 · Accroche">
          <SceneHook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fondu} />

        <TransitionSeries.Sequence durationInFrames={142} name="2 · Problème">
          <SceneProbleme />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fondu} />

        <TransitionSeries.Sequence durationInFrames={240} name="3 · Produit">
          <SceneProduit />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fondu} />

        <TransitionSeries.Sequence durationInFrames={150} name="4 · Preuve">
          <ScenePreuve />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fondu} />

        <TransitionSeries.Sequence
          durationInFrames={120}
          name="5 · Appel à l'action"
        >
          <SceneCTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
