import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { ChiffreSurImage, ClipVertical, Ecran, Etiquette, FondVideo, TexteSurImage } from "./Visuel";

/**
 * « TES PREMIERS EUROS EN CLIPPING » — 1920×1080, 5 min 56.
 *
 * ── CE QUE CE FILM FAIT, ET QUE LES NEUF AUTRES NE FAISAIENT PAS ─────────
 * Les formats longs de la chaîne durent deux minutes et expliquent un modèle
 * économique. Ils font entre 1 et 32 vues. Celui-ci dure six minutes et MONTRE
 * la plateforme : la grille notée, la transcription, les onze styles de
 * sous-titres, le déplacement des sous-titres à la main, le bandeau d'accroche,
 * l'export. Tout est filmé à l'écran (`enregistrer-demo.mjs`), rien n'est
 * reconstitué.
 *
 * ── POURQUOI ON OUVRE SUR UNE HISTOIRE ───────────────────────────────────
 * Mesure du 15/10 : les Shorts qui énoncent une CONTRAINTE (les règles, la
 * commission, les formations) font 231 vues et moins. Ceux qui énoncent une
 * somme à gagner font 673 et 1 018. Le spectateur vient chercher un gain —
 * mais une promesse sèche se paie à la rétention. L'ouverture raconte donc la
 * soirée qu'il vient de vivre : trois heures pour un seul clip, et cinq
 * dollars au bout. C'est son problème, pas notre produit.
 *
 * ── LE ZOOM N'EST PAS UNE COQUETTERIE ────────────────────────────────────
 * Dans le tournage 1920×1080, le lecteur du clip fait 374 pixels de large et
 * le panneau de réglages 356. Projetés tels quels, on voit « une interface »
 * et on ne lit aucun réglage. `Ecran` recadre sur la zone qui porte le propos,
 * zones relevées sur une capture quadrillée.
 *
 * ── LES BORNES ───────────────────────────────────────────────────────────
 * `silencedetect` sur les cinq blocs de narration, décalés de leur position
 * dans le fichier concaténé (A 0 · B 66,1 · C 135,1 · E 213,8 · D 282,3).
 * Jamais estimées : la voix lit entre 166 et 193 mots/minute selon le texte.
 */

export const DUREE_PREMIERS_EUROS = Math.round(356.3 * 30);

/* Zones du tournage, en coordonnées du fichier 1920×1080. */
const Z = {
  grille: [180, 30, 1380, 776] as [number, number, number, number],
  grilleSerree: [230, 60, 900, 506] as [number, number, number, number],
  fiche: [400, 20, 1180, 664] as [number, number, number, number],
  lecteur: [540, 50, 900, 506] as [number, number, number, number],
  panneau: [1150, 40, 440, 248] as [number, number, number, number],
  timeline: [370, 790, 1200, 290] as [number, number, number, number],
};

const Scene: React.FC<{ b: [number, number]; children: React.ReactNode }> = ({ b, children }) => {
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

const d = (b: [number, number]) => b[1] - b[0];

export const PremiersEuros: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#04060a" }}>
    {/* ══ A — L'HISTOIRE ══════════════════════════════════════════════ */}
    <Scene b={[0, 14.4]}>
      <ClipVertical source="clip-amx4-3.mp4" depart={6} duree={14.4} cadre={[0, 0, 1080, 1920]} decale={330} />
      <TexteSurImage
        titre={<>22 h. Trois heures sur<br />le même clip. Un seul.</>}
        sous="Tu as trouvé le passage, recadré, corrigé les sous-titres un par un."
        position="bas-gauche"
        retard={0.4}
        taille={76}
      />
    </Scene>

    <Scene b={[14.4, 24.9]}>
      <FondVideo source="brollB-h264.mp4" depart={12} duree={10.5} assombrir={0.62} cote="bas" />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <ChiffreSurImage valeur="3 heures → 5 $" legende="un clip à 5 000 vues, à 1 $ les mille" couleur="#ff5a4e" retard={2.0} />
      </AbsoluteFill>
    </Scene>

    <Scene b={[24.9, 43.1]}>
      <ClipVertical source="clip-sqz2-3.mp4" depart={8} duree={18.2} cadre={[0, 0, 1080, 1920]} decale={-330} />
      <TexteSurImage
        titre="9 débutants sur 10 arrêtent ici."
        sous="Pas parce que le modèle est faux. Parce qu'à ce rythme, il faudrait 90 heures pour 150 $ dans la semaine."
        position="bas-gauche"
        retard={0.6}
        taille={64}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <ChiffreSurImage valeur="90 heures" legende="pour 150 $ dans la semaine" couleur="#ff5a4e" retard={11.0} />
      </AbsoluteFill>
    </Scene>

    <Scene b={[43.1, 48.5]}>
      <FondVideo source="brollB-h264.mp4" depart={34} duree={5.4} assombrir={0.6} cote="bas" />
      <TexteSurImage
        titre="Le problème n'est pas ta motivation."
        sous="C'est le temps par clip."
        position="bas-gauche"
        retard={0.2}
        taille={70}
      />
    </Scene>

    <Scene b={[48.5, 66.1]}>
      <Ecran source="demo-h264.mp4" depart={11} duree={17.6} zone={Z.grille} zoom={1.06} />
      <TexteSurImage
        titre="1 clip par soirée → 10 clips en 3 minutes."
        sous="Tout ce qui suit est filmé à l'écran. Rien n'est reconstitué."
        position="bas-gauche"
        retard={1.0}
        taille={62}
      />
    </Scene>

    {/* ══ B — LE MODÈLE ══════════════════════════════════════════════ */}
    <Scene b={[66.1, 84.1]}>
      <FondVideo source="whop-h264.mp4" depart={1} duree={18} assombrir={0.5} />
      <Etiquette texte="D'OÙ VIENT L'ARGENT" ton="vrai" retard={0.3} />
      <TexteSurImage
        titre="La marque dépose un budget. Elle paie aux vues."
        sous="4,6 milliards de dollars déjà versés sur Whop — affiché sur leur page d'accueil."
        position="bas-gauche"
        retard={1.2}
        taille={60}
      />
    </Scene>

    <Scene b={[84.1, 105]}>
      <ClipVertical source="clip-sqz3-1.mp4" depart={5} duree={20.9} cadre={[0, 0, 1080, 1920]} decale={340} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <ChiffreSurImage valeur="0,20 $ → 6 $" legende="pour 1 000 vues · moyenne ≈ 1 $" couleur="#10b981" retard={1.0} />
      </AbsoluteFill>
      <TexteSurImage
        titre=""
        sous="Roobet : 1,50 $ les mille, 250 000 $ de budget. Mutuum : 6 $ les mille."
        position="bas-gauche"
        retard={9.0}
        taille={58}
      />
    </Scene>

    <Scene b={[105, 114.6]}>
      <FondVideo source="brollB-h264.mp4" depart={50} duree={9.6} assombrir={0.6} cote="bas" />
      <TexteSurImage
        titre="Aucun minimum d'abonnés."
        sous="La campagne ne regarde pas ton compte. Elle compte les vues de tes clips."
        position="bas-gauche"
        retard={0.3}
        taille={70}
      />
    </Scene>

    <Scene b={[114.6, 135.1]}>
      <ClipVertical source="clip-amx4-4.mp4" depart={8} duree={20.5} cadre={[0, 0, 1080, 1920]} decale={-340} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <ChiffreSurImage valeur="30 clips = 150 $" legende="la semaine · 600 $ le mois, commission déduite" couleur="#10b981" retard={6.0} />
      </AbsoluteFill>
      <TexteSurImage
        titre="Le métier, ce n'est pas LE clip viral."
        sous="Un clip viral ne se répète pas. Le volume, oui."
        position="bas-gauche"
        retard={0.4}
        taille={64}
      />
    </Scene>

    {/* ══ C — LA DÉMONSTRATION ═══════════════════════════════════════ */}
    <Scene b={[135.1, 147.5]}>
      <Ecran source="demo-h264.mp4" depart={14} duree={12.4} zone={Z.grille} zoom={1.04} />
      <Etiquette texte="LE VRAI GOULOT" ton="faux" retard={0.2} />
      <TexteSurImage
        titre="Ce qui prend du temps, ce n'est pas le montage."
        sous="C'est de trouver quel passage mérite d'être clippé — sur une heure de vidéo."
        position="bas-gauche"
        retard={0.8}
        taille={60}
      />
    </Scene>

    <Scene b={[147.5, 162]}>
      <Ecran source="demo-h264.mp4" depart={11} duree={14.5} zone={Z.grilleSerree} zoom={1.08} />
      <TexteSurImage
        titre="10 passages, et une note sur 100 pour chacun."
        sous="Elle mesure si le passage se comprend seul, s'il accroche dans ses 3 premières secondes, et s'il se termine sur quelque chose."
        position="bas-gauche"
        retard={1.0}
        taille={56}
      />
    </Scene>

    <Scene b={[162, 176]}>
      <Ecran source="demo-h264.mp4" depart={26} duree={14} zone={Z.fiche} zoom={1.05} />
      <TexteSurImage
        titre="Le clip, déjà recadré en 9:16."
        sous="Centré sur la personne qui parle. En dessous, la transcription mot par mot."
        position="bas-gauche"
        retard={0.8}
        taille={60}
      />
    </Scene>

    <Scene b={[176, 190]}>
      <Ecran source="demo-h264.mp4" depart={38} duree={14} zone={Z.panneau} zoom={1.06} />
      <Etiquette texte="11 STYLES DE SOUS-TITRES" ton="vrai" retard={0.2} />
      <TexteSurImage
        titre="Tu changes de style d'un clic."
        sous="Et tu règles la taille."
        position="bas-gauche"
        retard={1.0}
        taille={62}
      />
    </Scene>

    <Scene b={[190, 203]}>
      <Ecran source="demo-h264.mp4" depart={54} duree={13} zone={Z.lecteur} zoom={1.05} />
      <TexteSurImage
        titre="Tu les attrapes, et tu les places où tu veux."
        sous="Selon la plateforme, l'interface mange le bas de l'écran. Des sous-titres cachés, c'est un clip perdu."
        position="bas-gauche"
        retard={0.6}
        taille={58}
      />
    </Scene>

    <Scene b={[203, 213.8]}>
      <Ecran source="demo-h264.mp4" depart={66} duree={10.8} zone={Z.fiche} zoom={1.05} />
      <TexteSurImage
        titre="Le bandeau d'accroche, puis l'export."
        sous="1080 × 1920, sous-titres incrustés, prêt à publier. Aucun logiciel de montage."
        position="bas-gauche"
        retard={0.5}
        taille={60}
      />
    </Scene>

    {/* ══ E — QUELLE VIDÉO ON COLLE ══════════════════════════════════ */}
    <Scene b={[213.8, 230]}>
      <ClipVertical source="clip-sqz2-4.mp4" depart={8} duree={16.2} cadre={[0, 0, 1080, 1920]} decale={330} />
      <Etiquette texte="AVANT DE COLLER" ton="vrai" retard={0.3} />
      <TexteSurImage
        titre="Toutes les vidéos ne se clippent pas."
        sous="Certaines donnent dix passages en vingt minutes. D'autres aucun en deux heures."
        position="bas-gauche"
        retard={0.8}
        taille={64}
      />
    </Scene>

    <Scene b={[230, 246.3]}>
      <FondVideo source="brollB-h264.mp4" depart={20} duree={16.3} assombrir={0.6} cote="bas" />
      <TexteSurImage
        titre="1. Il faut que ça PARLE."
        sous="Pas de transcription, pas de clip. Podcasts, interviews, plateaux, défis commentés : de la matière. Gameplay muet, clip musical : rien."
        position="bas-gauche"
        retard={0.5}
        taille={58}
      />
    </Scene>

    <Scene b={[246.3, 258.5]}>
      <ClipVertical source="clip-sqz3-3.mp4" depart={5} duree={12.2} cadre={[0, 0, 1080, 1920]} decale={-330} />
      <TexteSurImage
        titre="2. Entre 20 minutes et 1 h 30."
        sous="En dessous, pas assez de moments. Au-dessus, la vidéo se dilue."
        position="bas-gauche"
        retard={0.5}
        taille={64}
      />
    </Scene>

    <Scene b={[258.5, 282.3]}>
      <FondVideo source="brollB-h264.mp4" depart={40} duree={23.8} assombrir={0.62} cote="bas" />
      <TexteSurImage
        titre="3. Le test des 30 secondes."
        sous="Va au milieu de la vidéo, regarde 30 secondes au hasard. Si tu comprends sans avoir vu le début, elle se clippera. Si tu es perdu, elle est trop narrative."
        position="bas-gauche"
        retard={0.6}
        taille={58}
      />
    </Scene>

    {/* ══ D — LA PREUVE, ET L'ORDRE DES CHOSES ═══════════════════════ */}
    <Scene b={[282.3, 296]}>
      <Ecran source="demo-h264.mp4" depart={12} duree={13.7} zone={Z.grille} zoom={1.07} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <ChiffreSurImage valeur="7 609 clips" legende="983 vidéos analysées · 574 créateurs · depuis août 2026" couleur="#10b981" retard={0.8} />
      </AbsoluteFill>
    </Scene>

    <Scene b={[296, 311]}>
      <Ecran source="demo-h264.mp4" depart={20} duree={15} zone={Z.grilleSerree} zoom={1.05} />
      <TexteSurImage
        titre="1 source = 8 à 12 passages. Tu en gardes 5."
        sous="Trois vidéos dans la semaine : quinze clips. Six vidéos : trente."
        position="bas-gauche"
        retard={0.6}
        taille={60}
      />
    </Scene>

    <Scene b={[311, 330]}>
      <Ecran source="demo-h264.mp4" depart={74} duree={19} zone={Z.timeline} zoom={1.04} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <ChiffreSurImage valeur="1 h 30, pas 90 h" legende="pour les mêmes 30 clips" couleur="#10b981" retard={4.5} />
      </AbsoluteFill>
    </Scene>

    <Scene b={[330, 344]}>
      <ClipVertical source="clip-amx4-1.mp4" depart={22} duree={14} cadre={[0, 0, 1080, 1920]} decale={330} />
      <TexteSurImage
        titre="150 $ la semaine. Ce n'est pas un jackpot."
        sous="C'est un revenu d'appoint, modeste, mais répétable — et un clip viral, lui, ne l'est jamais."
        position="bas-gauche"
        retard={0.5}
        taille={60}
      />
    </Scene>

    <Scene b={[344, 356.3]}>
      <Ecran source="demo-h264.mp4" depart={16} duree={12.3} zone={Z.grille} zoom={1.06} />
      <TexteSurImage
        titre="L'ordre exact"
        sous={
          <>
            1. Lis les règles de la campagne avant tout le reste.
            <br />
            2. Choisis-la sur son budget restant, pas sur son tarif.
            <br />
            3. Une vidéo qui parle, 20 min à 1 h 30. Cinq clips.
            <br />
            4. Publie, soumets, et note tes vues à 24 h, 72 h, 7 jours.
          </>
        }
        position="bas-gauche"
        retard={0.4}
        taille={52}
      />
    </Scene>

    <Audio src={staticFile("voix/narration-premiers-euros.mp3")} />
  </AbsoluteFill>
);
