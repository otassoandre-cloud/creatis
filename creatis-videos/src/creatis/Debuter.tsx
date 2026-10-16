import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { ChiffreSurImage, ClipVertical, FondVideo, TexteSurImage } from "./Visuel";

/**
 * CLIPPING : DÉBUTER DE ZÉRO — 1920×1080, 114 s.
 *
 * ── POURQUOI CE SUJET, ET CE TON ─────────────────────────────────────────
 * Mesure du 12/10 : le Short « Une marque paie 1,50 $ pour 1 000 vues » a
 * fait 1 016 vues en vingt heures — le deuxième meilleur de la chaîne. Le
 * même jour, celui qui citait NOS statistiques en a fait 285.
 *
 * Ce qui marche est donc clair : un chiffre d'argent concret, externe et
 * vérifiable, et un mécanisme de rémunération expliqué. Pas nos vues, pas
 * notre rétention, pas notre chaîne. Ce film est la version longue de cet
 * axe, sur le titre-requête que la niche utilise (« guide complet débutant »,
 * 24 k vues sur la première place).
 *
 * ── D'OÙ VIENNENT LES CHIFFRES ───────────────────────────────────────────
 * Tarifs 0,20 à 6 $ pour mille vues, moyenne ~1 $ ; Roobet 1,50 $ avec
 * 250 000 $ de budget ; Mutuum 6 $ : relevés publics des campagnes Content
 * Rewards (openclip.app, findclout.com, 2026). Aucun chiffre de notre compte.
 *
 * ── LES BORNES ───────────────────────────────────────────────────────────
 * `silencedetect` sur narration-debuter.mp3 (112,2 s). Jamais estimées.
 */

const S = {
  intro: [0, 8.7],
  principe: [8.7, 22.3],
  tarifs: [22.3, 38.8],
  calcul: [38.8, 54.3],
  volume: [54.3, 71.7],
  etapes: [71.7, 91.4],
  produire: [91.4, 105.6],
  cesoir: [105.6, 114],
} as const;

export const DUREE_DEBUTER = Math.round(114 * 30);

const Scene: React.FC<{ b: readonly [number, number]; children: React.ReactNode }> = ({
  b,
  children,
}) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence
      from={Math.round(b[0] * fps)}
      durationInFrames={Math.round((b[1] - b[0]) * fps)}
      layout="none"
    >
      {children}
    </Sequence>
  );
};

const d = (b: readonly [number, number]) => b[1] - b[0];

export const Debuter: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#04060a" }}>
    <Scene b={S.intro}>
      <FondVideo source="broll-studio-h264.mp4" depart={11} duree={d(S.intro)} assombrir={0.6} cote="bas" />
      <TexteSurImage
        titre={<>Se faire payer pour découper<br />les vidéos des autres.</>}
        sous="Comment on commence — et combien ça paie vraiment."
        position="bas-gauche"
        retard={0.2}
        taille={78}
      />
    </Scene>

    {/* ── LE PRINCIPE, sur la vraie place de marché ────────────────────── */}
    <Scene b={S.principe}>
      <FondVideo source="whop-h264.mp4" depart={3} duree={d(S.principe)} assombrir={0.3} />
      <TexteSurImage
        titre="La marque dépose un budget. Tu vas chercher les vues."
        sous="Elle fixe un tarif pour 1 000 vues et écrit ses règles. Pas de minimum d'abonnés : c'est la vue qui paie, pas ton compte."
        position="bas-gauche"
        retard={0.3}
        taille={64}
      />
    </Scene>

    {/* ── LES TARIFS ───────────────────────────────────────────────────── */}
    <Scene b={S.tarifs}>
      <FondVideo source="broll-objet-h264.mp4" depart={0} duree={d(S.tarifs)} assombrir={0.56} flou={18} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <ChiffreSurImage valeur="0,20 $ → 6 $" legende="pour 1 000 vues · moyenne ≈ 1 $" couleur="#10b981" retard={0.4} />
      </AbsoluteFill>
      <TexteSurImage
        titre=""
        sous="Deux campagnes réelles : Roobet, 1,50 $ / 1 000 vues avec 250 000 $ de budget. Mutuum, 6 $ / 1 000 vues."
        position="bas-gauche"
        retard={5.0}
        taille={62}
      />
    </Scene>

    {/* ── LE CALCUL, sans l'adoucir ────────────────────────────────────── */}
    <Scene b={S.calcul}>
      {/* ── PAS LE B-ROLL ICI ───────────────────────────────────────────
          Le studio d'Amixem passe devant une plaque « WORLD WAR 11 » à la
          neuvième seconde : incongru sous un point sur l'argent, et vu sur
          la planche avant publication. On met un clip exporté, qui dure
          assez pour tenir les quinze secondes. */}
      <ClipVertical
        source="clip-sqz3-4.mp4"
        depart={2}
        duree={d(S.calcul)}
        cadre={[0, 0, 1080, 1920]}
        decale={380}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <ChiffreSurImage valeur="1 clip = 5 $" legende="5 000 vues à 1 $ les mille" couleur="#ff5a4e" retard={3.6} />
      </AbsoluteFill>
      <TexteSurImage
        titre="Un million de vues = 1 000 $."
        sous="Fais ce calcul avant de commencer, pas après."
        position="bas-gauche"
        retard={0.3}
        taille={70}
      />
    </Scene>

    {/* ── LE VOLUME ────────────────────────────────────────────────────── */}
    <Scene b={S.volume}>
      <FondVideo source="broll-amixem-h264.mp4" depart={1} duree={d(S.volume)} assombrir={0.58} cote="bas" />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <ChiffreSurImage valeur="600 $ / mois" legende="120 clips, et c'est répétable" couleur="#10b981" retard={4.6} />
      </AbsoluteFill>
      <TexteSurImage
        titre="Le métier, c'est le volume."
        sous="30 clips par semaine = 150 $. Un clip viral ne se répète pas ; ça, oui."
        position="bas-gauche"
        retard={0.3}
        taille={70}
      />
    </Scene>

    {/* ── LES ÉTAPES ───────────────────────────────────────────────────── */}
    <Scene b={S.etapes}>
      <FondVideo source="broll-studio-h264.mp4" depart={6} duree={d(S.etapes)} assombrir={0.64} cote="bas" />
      <TexteSurImage
        titre="Les étapes, dans l'ordre"
        sous={
          <>
            1. Compte créé, comptes de publication reliés.
            <br />
            2. Choisis une campagne sur son BUDGET RESTANT, pas sur son tarif.
            <br />
            3. Lis les règles : elles disent quelle source tu as le droit d'utiliser.
            <br />
            4. Publie, soumets le lien, capture tes stats à 24 h, 72 h et 7 jours.
          </>
        }
        position="bas-gauche"
        retard={0.3}
        taille={60}
      />
    </Scene>

    {/* ── PRODUIRE LE VOLUME, montré ───────────────────────────────────── */}
    <Scene b={S.produire}>
      <FondVideo source="tuto-grille-h264.mp4" depart={0} duree={d(S.produire)} assombrir={0.62} cote="bas" />
      <TexteSurImage
        titre="1 vidéo longue = 8 à 12 passages."
        sous="Tu ne cherches plus 30 idées, tu choisis 3 vidéos. Et sur 10 passages tu en gardes 5 : ceux qui se comprennent sans la vidéo dont ils sortent."
        position="bas-gauche"
        retard={0.3}
        taille={64}
      />
    </Scene>

    <Scene b={S.cesoir}>
      <FondVideo source="broll-studio-h264.mp4" depart={14} duree={d(S.cesoir)} assombrir={0.62} cote="bas" />
      <TexteSurImage
        titre={<>Ouvre une campagne, lis ses règles,<br />et sors 5 clips d'une seule source.</>}
        sous="Pas 30. Cinq."
        position="bas-gauche"
        retard={0.2}
        taille={66}
      />
    </Scene>

    <Audio src={staticFile("voix/narration-debuter.mp3")} />
  </AbsoluteFill>
);
