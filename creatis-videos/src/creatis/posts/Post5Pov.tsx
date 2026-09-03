import { Video } from "@remotion/media";
import { AbsoluteFill, Sequence, Series, staticFile } from "remotion";
import { POLICE } from "../police";
import { Punch } from "../Punch";
import { SousTitreBrule } from "../SousTitreBrule";
import { COULEURS } from "../theme";
import { CartonFinal } from "./CartonFinal";
import { HookFixe } from "./HookFixe";

/**
 * POST 5 — « POV : tu colles un lien YouTube » — archetype
 * **screen recording / POV**.
 *
 * D'apres la recherche c'est l'asset le plus rentable pour un outil : on montre
 * le produit faire la chose, sans rien promettre. Deux consequences assumees,
 * a l'inverse des quatre autres posts :
 *
 * - **Une seule prise, aucune coupe.** Un enregistrement d'ecran tire sa
 *   credibilite de sa continuite ; le hacher en plans le fait ressembler a une
 *   pub, et l'organique sanctionne exactement ca (le brut bat le leche). Le
 *   mouvement vient de l'interface elle-meme, qui ne s'arrete jamais.
 * - **Le texte remplace la voix**, en quatre temps espaces d'environ 2,5 s.
 *
 * « POV : » est la formulation native du format ; elle annonce au spectateur
 * qu'il regarde par-dessus une epaule, pas qu'on lui vend quelque chose.
 */
export const DUREE_POST_5 = 285;

/* La prise dure un peu plus que la voix (177 images) : l'interface finit son
   mouvement avant la coupe. Ce n'est pas un vide entre deux voix, c'est une
   fin de plan. */
const DUREE_PRISE = 230;

const Prise: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
    {/* `trimBefore` saute le moment ou le champ est encore vide : ouvrir sur une
        interface inerte gaspille la seule seconde qui compte. */}
    <Video
      src={staticFile("interface-hyperframes.mp4")}
      style={{ width: "100%", height: "100%" }}
      objectFit="cover"
      muted
      trimBefore={22}
      playbackRate={1.45}
    />

    <AbsoluteFill
      style={{
        background:
          "linear-gradient(to bottom, rgba(4,10,7,0.72) 0%, rgba(4,10,7,0.05) 26%, rgba(4,10,7,0) 60%, rgba(4,10,7,0.6) 85%, rgba(4,10,7,0.35) 100%)",
      }}
    />

    <Sequence durationInFrames={68} name="POV">
      <HookFixe ligne1="POV : tu colles un lien YouTube" hauteur={6} taille={82} />
    </Sequence>

    <SousTitreBrule
      texte="L'IA regarde les 2 h à ta place"
      debut={74}
      fin={145}
      cadence={3}
      hauteur={72}
      taille={70}
      accent={["2 h"]}
    />

    <SousTitreBrule
      texte="Elle sort les 10 meilleurs moments"
      debut={150}
      fin={195}
      cadence={3}
      hauteur={72}
      taille={70}
      accent={["10"]}
    />

    <SousTitreBrule
      texte="Recadrés. Sous-titrés. Exportés."
      debut={200}
      cadence={3}
      hauteur={72}
      taille={70}
      accent={["Exportés."]}
    />
  </AbsoluteFill>
);

export const Post5Pov: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COULEURS.fond, fontFamily: POLICE }}>
    <Series>
      {/* Aucun flash, aucun zoom d'entree : le plan doit avoir l'air capture,
          pas monte. C'est le seul post ou `Punch` serait contre-productif. */}
      <Series.Sequence durationInFrames={DUREE_PRISE} name="A · La prise">
        <Prise />
      </Series.Sequence>

      <Series.Sequence durationInFrames={DUREE_POST_5 - DUREE_PRISE} name="B · Créatis">
        <Punch>
          <CartonFinal />
        </Punch>
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
