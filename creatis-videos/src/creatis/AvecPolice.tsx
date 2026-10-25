import { AbsoluteFill } from "remotion";
import { POLICE } from "./police";

/**
 * Applique la police Créatis a une scene ouverte seule dans Remotion Studio.
 * Dans la video complete, c'est <PubVerticale> qui pose deja la police sur
 * son conteneur racine — ce wrapper ne sert qu'aux compositions unitaires
 * enregistrees dans le dossier « Scenes ».
 */
export const avecPolice = (Scene: React.FC): React.FC => {
  const Enveloppe: React.FC = () => (
    <AbsoluteFill style={{ fontFamily: POLICE }}>
      <Scene />
    </AbsoluteFill>
  );
  Enveloppe.displayName = `avecPolice(${Scene.displayName ?? Scene.name})`;
  return Enveloppe;
};
