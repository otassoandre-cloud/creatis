import { AbsoluteFill, Sequence } from "remotion";
import { CarteClip, DeuxChiffres, FormeDOnde, ZonesInterface } from "./Illustrations";
import { POLICE } from "./police";

/**
 * Planche d'essai des illustrations : on les rend une fois pour vérifier
 * qu'elles tiennent debout AVANT de bâtir un format long autour.
 * Les deux premiers formats longs ont été écrits puis rendus en entier ;
 * à huit minutes de rendu, une erreur de composition coûte cher.
 */
export const DUREE_ESSAI = 8 * 30;

export const EssaiIllustrations: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#0a0f0a", fontFamily: POLICE }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: "#10b981" }} />

    <Sequence from={0} durationInFrames={120} layout="none">
      <AbsoluteFill style={{ padding: "150px 140px", justifyContent: "flex-start" }}>
        <FormeDOnde
          image="onde-mastu.png"
          duree={36.3}
          silences={[[22.898, 23.228], [24.166, 24.439]]}
          titre="LES SILENCES, MESURÉS SUR LE CLIP"
        />
        <div style={{ marginTop: 90 }}>
          <DeuxChiffres
            gauche={{ valeur: "9,9 %", etiquette: "ont continué de regarder", mauvais: true }}
            droite={{ valeur: "79 %", etiquette: "du film, pour ceux qui restent" }}
            debut={1.6}
          />
        </div>
      </AbsoluteFill>
    </Sequence>

    <Sequence from={120} durationInFrames={120} layout="none">
      <AbsoluteFill style={{ padding: 110, flexDirection: "row", gap: 90, alignItems: "center" }}>
        <CarteClip source="rec-mastu-h264.mp4" rec={225} cadre={[150, 300, 540, 980]} largeur={480} hauteur={854} note="96" />
        <ZonesInterface source="rec-mastu-h264.mp4" rec={225} largeur={480} hauteur={854} />
      </AbsoluteFill>
    </Sequence>
  </AbsoluteFill>
);
