import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import { ChiffreSurImage, FondVideo, TexteSurImage } from "./Visuel";

/**
 * QUELLE VIDÉO CHOISIR POUR FAIRE DES CLIPS — 1920×1080, 113 s.
 *
 * ── LE PREMIER FILM LONG BÂTI SUR LE KIT VISUEL ──────────────────────────
 * Aucun fond uni, aucune diapositive : chaque plan repose sur de l'image
 * réelle qui bouge — B-roll lumineux, écran filmé, clip fini. C'est la
 * direction validée le 09/10 sur la maquette.
 *
 * ── CE QU'IL CHANGE AU SUJET ─────────────────────────────────────────────
 * Les onze précédents commentaient nos propres statistiques. Celui-ci répond
 * à une décision que le spectateur prend avant tout le reste : quelle vidéo
 * mettre à clipper. Rien sur nous, et aucun chiffre de notre chaîne.
 *
 * ── LES BORNES ───────────────────────────────────────────────────────────
 * `silencedetect` sur narration-choisir.mp3 (111,6 s). Jamais estimées.
 */

const S = {
  intro: [0, 10.7],
  parler: [10.7, 27.6],
  duree: [27.6, 40.5],
  autonome: [40.5, 56.4],
  lumiere: [56.4, 68.4],
  droits: [68.4, 77.5],
  pratique: [77.5, 93.2],
  tri: [93.2, 107.2],
  cesoir: [107.2, 113.5],
} as const;

export const DUREE_CHOISIR = Math.round(113.5 * 30);

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

const duree = (b: readonly [number, number]) => b[1] - b[0];

export const ChoisirSource: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#04060a" }}>
    {/* 1 — l'annonce, sur un studio éclairé : on montre tout de suite le type
        de source dont on parle. */}
    <Scene b={S.intro}>
      <FondVideo source="broll-studio-h264.mp4" depart={0} duree={duree(S.intro)} assombrir={0.6} cote="bas" />
      <TexteSurImage
        titre={<>Toutes les vidéos<br />ne se clippent pas.</>}
        sous="Cinq critères pour choisir, avant même de lancer l'analyse."
        position="bas-gauche"
        retard={0.2}
      />
    </Scene>

    {/* 2 — critère 1 : il faut que ça parle. */}
    <Scene b={S.parler}>
      <FondVideo source="broll-studio-h264.mp4" depart={6} duree={duree(S.parler)} assombrir={0.58} cote="bas" />
      <TexteSurImage
        titre={<><span style={{ color: "#10b981" }}>1.</span> Il faut que ça PARLE.</>}
        sous="Podcasts, interviews, réactions, vlogs commentés. Un gameplay muet ne donne rien : un clip court vit par ce qui s'y dit."
        position="bas-gauche"
        retard={0.3}
        taille={76}
      />
    </Scene>

    {/* 3 — critère 2 : la durée, en chiffres sur l'image. */}
    <Scene b={S.duree}>
      <FondVideo source="broll-objet-h264.mp4" depart={0} duree={duree(S.duree)} assombrir={0.55} flou={16} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <ChiffreSurImage valeur="20 min → 1 h 30" legende="la zone qui rend le plus" couleur="#10b981" retard={0.4} />
      </AbsoluteFill>
      <TexteSurImage
        titre=""
        sous="Sous 10 minutes tu trouveras deux passages. Au-dessus de deux heures, les gens se répètent."
        position="bas-gauche"
        retard={3.4}
        taille={70}
      />
    </Scene>

    {/* 4 — critère 3 : l'autonomie, montrée sur un clip fini. */}
    <Scene b={S.autonome}>
      {/* Un clip vertical ne tient pas seize secondes : celui d'Amixem bascule
          sur une animation au bout de huit, et le plan mourait sur un dessin
          animé bordé de noir. On reste sur du B-roll lumineux, qui tient. */}
      <FondVideo source="broll-studio-h264.mp4" depart={2} duree={duree(S.autonome)} assombrir={0.58} cote="bas" />
      <TexteSurImage
        titre={<><span style={{ color: "#10b981" }}>3.</span> Les passages<br />tiennent-ils seuls ?</>}
        sous="Regarde 30 secondes au hasard. Si tu comprends sans contexte, c'est bon signe."
        position="bas-gauche"
        retard={0.3}
        taille={70}
      />
    </Scene>

    {/* 5 — critère 4 : la lumière, démontrée par l'image elle-même. */}
    <Scene b={S.lumiere}>
      <FondVideo source="broll-studio-h264.mp4" depart={11} duree={duree(S.lumiere)} assombrir={0.55} cote="bas" />
      <TexteSurImage
        titre={<><span style={{ color: "#10b981" }}>4.</span> Lumière et cadrage.</>}
        sous="Un plan sombre filmé de loin reste sombre et lointain une fois recadré en vertical — le recadrage ne garde que le centre."
        position="bas-gauche"
        retard={0.3}
        taille={72}
      />
    </Scene>

    {/* 6 — critère 5 : le droit de publier, sur la vraie page des campagnes. */}
    <Scene b={S.droits}>
      {/* La page Whop est blanche : floutée et assombrie elle rend un gris
          plat, déjà constaté le 09/10. On garde une source lumineuse et
          colorée — la règle du fond de texte. */}
      <FondVideo source="broll-objet-h264.mp4" depart={4} duree={duree(S.droits)} assombrir={0.56} cote="bas" />
      <TexteSurImage
        titre={<><span style={{ color: "#10b981" }}>5.</span> Tu as le droit de la publier ?</>}
        sous="Les campagnes désignent des sources autorisées. Un clip tiré d'ailleurs ne sera pas payé."
        position="bas-gauche"
        retard={0.3}
        taille={68}
      />
    </Scene>

    {/* 7 — en pratique : l'écran filmé, sans commentaire décoratif. */}
    <Scene b={S.pratique}>
      <FondVideo source="tuto-grille-h264.mp4" depart={0} duree={duree(S.pratique)} assombrir={0.66} cote="bas" />
      <TexteSurImage
        titre="Ce que je regarde en premier"
        sous="Pas la note : la PREMIÈRE PHRASE de chaque passage. Si elle répond à une question qu'on n'a pas entendue, je jette — même à 90 sur 100."
        position="bas-gauche"
        retard={0.3}
        taille={68}
      />
    </Scene>

    {/* 8 — le tri, en chiffres. */}
    <Scene b={S.tri}>
      <FondVideo source="broll-amixem-h264.mp4" depart={2} duree={duree(S.tri)} assombrir={0.5} flou={22} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <ChiffreSurImage valeur="10 → 5" legende="ce qui reste après le tri, et c'est normal" couleur="#fff" retard={0.3} />
      </AbsoluteFill>
    </Scene>

    {/* 9 — ce soir. */}
    <Scene b={S.cesoir}>
      <FondVideo source="broll-studio-h264.mp4" depart={2} duree={duree(S.cesoir)} assombrir={0.62} cote="bas" />
      <TexteSurImage
        titre={<>Prends une vidéo qui parle,<br />entre 20 min et 1 h 30.</>}
        sous="Vérifie 30 secondes au milieu. Si tu comprends sans contexte, lance l'analyse."
        position="bas-gauche"
        retard={0.2}
        taille={66}
      />
    </Scene>

    <Audio src={staticFile("voix/narration-choisir.mp3")} />
  </AbsoluteFill>
);
