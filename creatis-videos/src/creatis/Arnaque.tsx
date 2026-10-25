import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { ChiffreSurImage, ClipVertical, Etiquette, FondVideo, TexteSurImage } from "./Visuel";

/**
 * « LE CLIPPING, C'EST UNE ARNAQUE ? » — 1920×1080, 100,7 s.
 *
 * ── POURQUOI CE SUJET ────────────────────────────────────────────────────
 * Relevé le 13/10 dans l'autocomplétion YouTube : « clipping whop » est la
 * deuxième suggestion du champ, et elle se prolonge en « whop clipping real
 * or fake », « whop clipping guide », « whop clipping tutorial ». En français,
 * « whop clipping francais » et « whop clipping fr » existent aussi.
 *
 * Autrement dit : les gens ne cherchent pas d'abord une méthode, ils cherchent
 * à savoir si on leur ment. Aucune de nos neuf vidéos longues ne répondait à
 * cette question-là — elles enseignaient toutes une méthode à des gens qui
 * n'avaient pas encore décidé d'y croire.
 *
 * ── ET POURQUOI CET ANGLE NOUS PROTÈGE ───────────────────────────────────
 * La chaîne porte un avertissement actif depuis le 30/07, au titre « contenus
 * nuisibles ou dangereux », sur une vidéo qui promettait un revenu « ultra
 * simple » (voir CONSIGNES.md). Il expire le 28/10. Une vidéo qui démonte les
 * promesses de gain facile est l'exact contraire de ce qui a été sanctionné —
 * et c'est aussi ce que le public vient chercher.
 *
 * ── LES BORNES ───────────────────────────────────────────────────────────
 * Transcription horodatée de narration-arnaque.mp3 (Whisper), pas une
 * estimation à partir du nombre de mots : la voix a lu à 193 mots/minute et
 * non aux 166 attendus, ce qui aurait décalé toutes les scènes.
 */

const S = {
  question: [0, 10.1],
  vrai1: [10.1, 21.0],
  vrai2: [21.0, 32.6],
  faux1: [32.6, 49.4],
  faux2: [49.4, 64.4],
  faux3: [64.4, 73.4],
  verdict: [73.4, 91.2],
  volume: [91.2, 100.7],
} as const;

export const DUREE_ARNAQUE = Math.round(100.7 * 30);

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

export const Arnaque: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#04060a" }}>
    {/* ── LA QUESTION, telle qu'elle est tapée ─────────────────────────── */}
    <Scene b={S.question}>
      <FondVideo source="broll-objet-h264.mp4" depart={0} duree={d(S.question)} assombrir={0.56} cote="bas" />
      <TexteSurImage
        titre={<>Le clipping,<br />c&apos;est une arnaque ?</>}
        sous="La réponse honnête, chiffres à l&apos;appui."
        position="bas-gauche"
        retard={0.2}
        taille={84}
      />
    </Scene>

    {/* ── CE QUI EST VRAI ─────────────────────────────────────────────
        Scindée en deux : whop-h264 ne dure que 17 s et la scène en demandait
        22,5 — le fond se terminait, et un fond terminé rend du noir. C'est ce
        qui avait mis le verdict sur fond noir au premier tirage. */}
    <Scene b={S.vrai1}>
      <FondVideo source="whop-h264.mp4" depart={2} duree={d(S.vrai1)} assombrir={0.5} />
      <Etiquette texte="CE QUI EST VRAI" ton="vrai" retard={0.3} />
      <TexteSurImage
        titre="Les marques paient à la vue."
        sous="Pas au contrat, pas à l&apos;abonné. Elles déposent un budget sur une plateforme de campagnes, et chaque millier de vues est payé."
        position="bas-gauche"
        retard={1.0}
        taille={62}
      />
    </Scene>

    <Scene b={S.vrai2}>
      <FondVideo source="brollB-h264.mp4" depart={12} duree={d(S.vrai2)} assombrir={0.6} cote="bas" />
      <Etiquette texte="CE QUI EST VRAI" ton="vrai" retard={0} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <ChiffreSurImage
          valeur="0,20 $ → 6 $"
          legende="pour 1 000 vues · moyenne ≈ 1 $ · aucun minimum d&apos;abonnés"
          couleur="#10b981"
          retard={1.6}
        />
      </AbsoluteFill>
    </Scene>

    {/* ── MENSONGE 1 : l'arithmétique qu'on ne fait jamais devant vous ─── */}
    <Scene b={S.faux1}>
      <ClipVertical
        source="clip-amx4-3.mp4"
        depart={6}
        duree={d(S.faux1)}
        cadre={[0, 0, 1080, 1920]}
        decale={300}
      />
      <Etiquette texte="MENSONGE N° 1" ton="faux" retard={0.2} />
      <TexteSurImage
        titre="Le revenu annoncé, sans jamais l&apos;arithmétique."
        sous="Un clip ordinaire fait 5 000 vues. À 1 $ les mille, ça fait 5 $."
        position="bas-gauche"
        retard={1.4}
        taille={60}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <ChiffreSurImage
          valeur="1 000 $ = 1 000 000 de vues"
          legende="à faire dans le mois, cumulées"
          couleur="#ff5a4e"
          retard={12.4}
        />
      </AbsoluteFill>
    </Scene>

    {/* ── MENSONGE 2 : les règles de campagne ──────────────────────────── */}
    <Scene b={S.faux2}>
      {/* PAS broll-studio ici : sa neuvième seconde est une plaque
          « IN MEMORY OF WORLD WAR 11 », qui remplissait le cadre sous le texte
          « il suffit de publier ». Déjà écartée le 12/10 pour la même raison. */}
      <FondVideo source="brollB-h264.mp4" depart={32} duree={d(S.faux2)} assombrir={0.62} cote="bas" />
      <Etiquette texte="MENSONGE N° 2" ton="faux" retard={0.2} />
      <TexteSurImage
        titre="« Il suffit de publier. »"
        sous={
          <>
            Chaque campagne écrit ses règles :
            <br />
            durée minimale du clip · plateformes acceptées
            <br />
            source autorisée · délai pour soumettre
          </>
        }
        position="bas-gauche"
        retard={1.2}
        taille={58}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <ChiffreSurImage
          valeur="40 000 vues, 0 $"
          legende="un clip hors règles n&apos;est pas payé"
          couleur="#ff5a4e"
          retard={11.6}
        />
      </AbsoluteFill>
    </Scene>

    {/* ── MENSONGE 3 : la formation ────────────────────────────────────── */}
    <Scene b={S.faux3}>
      <ClipVertical
        /* Départ à 20 s et pas à 3 : la douzième seconde de ce clip est une
           carte de parrainage L'Oréal, déjà écartée une fois le 11/10. Une
           marque tierce dans un film sur la rémunération n'a rien à y faire. */
        source="clip-amx4-1.mp4"
        depart={20}
        duree={d(S.faux3)}
        cadre={[0, 0, 1080, 1920]}
        decale={-300}
      />
      <Etiquette texte="MENSONGE N° 3" ton="faux" retard={0.2} />
      <TexteSurImage
        titre="« Il faut acheter une formation. »"
        sous="Les règles de chaque campagne sont affichées sur sa page. Gratuitement, et avant même d&apos;avoir un compte."
        position="bas-gauche"
        retard={1.4}
        taille={60}
      />
    </Scene>

    {/* ── LE VERDICT ───────────────────────────────────────────────────── */}
    <Scene b={S.verdict}>
      <FondVideo source="brollB-h264.mp4" depart={50} duree={d(S.verdict)} assombrir={0.58} cote="bas" />
      <Etiquette texte="LE VERDICT" ton="vrai" retard={0.2} />
      <TexteSurImage
        titre="Ni arnaque, ni jackpot."
        sous="Un travail payé à la pièce, faiblement payé à l&apos;unité, rentable seulement en volume."
        position="bas-gauche"
        retard={1.0}
        taille={66}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <ChiffreSurImage
          valeur="600 $ / mois"
          legende="30 clips par semaine, commission déduite"
          couleur="#10b981"
          retard={8.0}
        />
      </AbsoluteFill>
    </Scene>

    {/* ── LA SEULE VRAIE DIFFICULTÉ, et elle se montre ─────────────────── */}
    <Scene b={S.volume}>
      <FondVideo source="tuto-grille-long.mp4" depart={0} duree={d(S.volume)} assombrir={0.58} cote="bas" />
      <TexteSurImage
        titre="1 vidéo longue = 8 à 12 passages."
        sous="On ne cherche pas 30 idées. On prend 3 sources, et on en sort dix passages chacune."
        position="bas-gauche"
        retard={0.3}
        taille={64}
      />
    </Scene>

    <Audio src={staticFile("voix/narration-arnaque.mp3")} />
  </AbsoluteFill>
);
