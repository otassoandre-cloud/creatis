import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { ChiffreSurImage, ClipVertical, FondVideo, TexteSurImage } from "./Visuel";

/**
 * MAQUETTE — quatre plans pour valider la direction visuelle, rien de plus.
 *
 * On ne construit pas neuf minutes avant d'avoir montré à quoi ça ressemble :
 * les onze formats longs précédents ont tous été produits en entier avant
 * qu'on découvre qu'ils ressemblaient à des diaporamas.
 */

const PLANS = [
  [0, 3.4],
  [3.4, 7.0],
  [7.0, 10.6],
  [10.6, 14.0],
  [14.0, 17.4],
  [17.4, 21.0],
] as const;

export const DUREE_MAQUETTE = Math.round(21 * 30);

export const Maquette: React.FC = () => {
  const { fps } = useVideoConfig();
  const S = (i: number) => ({
    from: Math.round(PLANS[i][0] * fps),
    durationInFrames: Math.round((PLANS[i][1] - PLANS[i][0]) * fps),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#04060a" }}>
      {/* 1 — un clip réel, plein cadre, fond flou coloré */}
      <Sequence {...S(0)} layout="none">
        <ClipVertical source="rec-amixem2-h264.mp4" depart={0} duree={3.4} decale={-330} />
        <TexteSurImage
          titre={<>Dix passages.<br />Six à jeter.</>}
          sous="Et je te montre lesquels, un par un."
          position="bas-gauche"
          retard={0.3}
        />
      </Sequence>

      {/* 2 — l'écran filmé, plein cadre, travelling */}
      <Sequence {...S(1)} layout="none">
        <FondVideo source="tuto-grille-h264.mp4" depart={0} duree={3.6} assombrir={0.72} cote="bas" />
        <TexteSurImage
          titre="La grille, en vrai"
          sous="Pas une capture de six secondes : le travail, filmé."
          position="bas-gauche"
          retard={0.2}
          taille={72}
        />
      </Sequence>

      {/* 3 — un chiffre posé sur l'image, à la place d'un graphique.
          ── CE QUI NE MARCHE PAS COMME FOND DE TEXTE ──────────────────────
          La page Whop est BLANCHE : floutée et assombrie, elle rend un gris
          plat, et le texte se détache sans qu'aucune image ne porte le plan.
          Un fond de texte doit être une source SOMBRE et colorée — ici le
          clip, dont le flou garde les couleurs. Les pages claires servent en
          plein cadre net, sans texte par-dessus, ou en carte posée. */}
      <Sequence {...S(2)} layout="none">
        <FondVideo source="rec-amixem2-h264.mp4" depart={3} duree={3.6} assombrir={0.46} cote="aucun" flou={30} />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <ChiffreSurImage valeur="0,5 %" legende="de clics sur nos vidéos longues" couleur="#ff5a4e" retard={0.3} />
        </AbsoluteFill>
      </Sequence>

      {/* 4 — B-ROLL : la vidéo source elle-même, lumineuse et rapide.
          C'est la matière qui manquait : tout le reste de notre stock est
          sombre (clips en intérieur, application en thème noir, page Whop
          qui devient grise une fois floutée). */}
      <Sequence {...S(3)} layout="none">
        <FondVideo source="broll-amixem-h264.mp4" depart={0} duree={3.4} assombrir={0.5} cote="bas" />
        <TexteSurImage
          titre={<>Une vidéo de 40 minutes.</>}
          sous="Tu la regardes en entier pour en garder trois."
          position="bas-gauche"
          retard={0.2}
          taille={74}
        />
      </Sequence>

      {/* 5 — B-roll net, sans texte : on laisse l'image respirer. */}
      <Sequence {...S(4)} layout="none">
        <FondVideo source="broll-amixem-h264.mp4" depart={4} duree={3.4} assombrir={0} />
      </Sequence>

      {/* 6 — retour au clip, décalé à droite, texte à gauche */}
      <Sequence {...S(5)} layout="none">
        <ClipVertical source="rec-amixem2-h264.mp4" depart={6} duree={3.6} decale={340} />
        <TexteSurImage
          titre={<>Ce passage,<br />je le garde.</>}
          sous="Il se comprend sans la vidéo d'origine."
          position="haut-gauche"
          retard={0.3}
          taille={78}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
