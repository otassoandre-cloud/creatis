import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { Etiquette, FondVideo, TexteSurImage, ZonesTelephone } from "./Visuel";

/**
 * « OÙ PLACER TES SOUS-TITRES » — 1920×1080, 1 min 50.
 *
 * ── POURQUOI CETTE DURÉE, ET PAS SIX MINUTES ─────────────────────────────
 * Analyse du 18/10 (social/analyse-formats-longs.md). Sur quinze formats
 * longs, un seul a bien tourné : celui du 08/10 — 2 min 07, 48 % de
 * rétention, 4,3 % de clics, 34 vues. Les trois films de 5-6 minutes qui ont
 * suivi ont reçu 21, 2 et 0 impressions : YouTube ne les a jamais montrés.
 *
 * La cause n'est pas la durée mais la distribution : le 10/10, une vidéo
 * massivement testée (1 744 impressions) a fait 0,3 % de clics et 31 % de
 * rétention, et le système a refermé le robinet pour toute la chaîne.
 *
 * Tant qu'il n'est pas rouvert, on revient au format qui a marché : deux
 * minutes, un savoir-faire précis, et la rétention comme seul objectif —
 * c'est elle qui décide du prochain test, pas la miniature.
 *
 * ── ET POURQUOI CE SUJET ─────────────────────────────────────────────────
 * Mesure du 17/10 sur les Shorts : celui qui parle de savoir-faire fait 941
 * vues, ceux qui parlent d'argent plafonnent à 187. Le placement des
 * sous-titres est le réglage le plus négligé et le plus coûteux — un clip
 * dont les sous-titres passent sous l'interface est illisible sans que son
 * auteur le sache.
 *
 * ── LES CHIFFRES SONT RELEVÉS, PAS ESTIMÉS ───────────────────────────────
 * Zones mesurées le 08/10 sur une capture réelle d'iPhone, 1179×2556 :
 * haut 0→14 %, colonne de droite 49→89 %, bas 66→92 %. La bande libre qui
 * en découle est 14→48 %.
 *
 * ── LES BORNES ───────────────────────────────────────────────────────────
 * `silencedetect` sur narration-placer.mp3. À confirmer avec
 * `controle-synchro.mjs` avant publication.
 */

export const DUREE_PLACER = Math.round(110.3 * 30);

type Plan = {
  b: [number, number];
  fond?: string;
  depart?: number;
  /** Le schéma des zones au lieu d'un fond filmé. */
  zones?: number;
  titre?: React.ReactNode;
  sous?: React.ReactNode;
  taille?: number;
  etiquette?: { texte: string; ton: "vrai" | "faux" };
  assombrir?: number;
  retard?: number;
};

const PLANS: Plan[] = [
  { b: [0, 7.5], fond: "clip-mbt-3.mp4", depart: 5, assombrir: 0.5,
    titre: "40 000 vues, et personne n'a compris ce qui s'y dit.",
    sous: "Pas parce que le montage est raté : parce que les sous-titres sont cachés.", taille: 54 },
  { b: [7.5, 16.8], fond: "parc-b.mp4", depart: 20, assombrir: 0,
    titre: "Voilà ce que tu vois quand tu montes.", taille: 56, retard: 0.5 },

  /* ── LE SCHÉMA : une bande à la fois, au rythme de la voix ────────── */
  { b: [16.8, 27.9], zones: 0, assombrir: 0.7,
    etiquette: { texte: "CE QUI NE T'APPARTIENT PAS", ton: "faux" },
    titre: "", sous: "Trois zones sont occupées par la plateforme.", taille: 52, retard: 0.8 },
  { b: [27.9, 35.0], zones: 1, assombrir: 0.7,
    titre: "", sous: "En haut, 0 → 14 % : retour, recherche, menu.", taille: 52, retard: 0.3 },
  { b: [35.0, 42.8], zones: 2, assombrir: 0.7,
    titre: "", sous: "À droite, 49 → 89 % : j'aime, commenter, partager.", taille: 52, retard: 0.3 },
  { b: [42.8, 50.3], zones: 3, assombrir: 0.7,
    titre: "", sous: "En bas, 66 → 92 % : pseudo, légende, vues, musique.", taille: 52, retard: 0.3 },
  { b: [50.3, 55.4], zones: 0, assombrir: 0.7,
    titre: "", sous: "Relevé sur une vraie capture d'iPhone, 1179 × 2556. Pas une estimation.", taille: 48, retard: 0.3 },
  { b: [55.4, 62.2], zones: 4, assombrir: 0.7,
    etiquette: { texte: "LA BANDE LIBRE", ton: "vrai" },
    titre: "", sous: "14 → 48 %. C'est là, et nulle part ailleurs.", taille: 56, retard: 0.4 },

  /* ── L'ERREUR, PUIS LE GESTE ──────────────────────────────────────── */
  { b: [62.2, 72.7], fond: "clip-mbt-2.mp4", depart: 5, assombrir: 0.52,
    titre: "Le réflexe : les laisser en bas.",
    sous: "Là où tout logiciel de montage les met par défaut. Parfait sur un ordinateur, recouvert sur un téléphone.", taille: 50 },
  { b: [72.7, 84.6], fond: "parc-b.mp4", depart: 29, assombrir: 0,
    etiquette: { texte: "LE GESTE", ton: "vrai" },
    titre: "", sous: "Je les attrape et je les remonte au tiers de la hauteur.", taille: 52, retard: 1.0 },
  { b: [84.6, 93.5], fond: "parc-b.mp4", depart: 36, assombrir: 0,
    titre: "L'aperçu est exactement ce qui sortira du fichier.", taille: 54, retard: 0.4 },

  /* ── LES DEUX PRÉCISIONS ──────────────────────────────────────────── */
  { b: [93.5, 102.4], fond: "clip-mbt-4.mp4", depart: 5, assombrir: 0.52,
    etiquette: { texte: "LA TAILLE", ton: "vrai" },
    titre: "", sous: "Trois à six mots visibles à l'image. Au-delà, on lit plus vite que la voix ne parle.", taille: 50, retard: 0.6 },
  { b: [102.4, 110.3], fond: "clip-mbt-5.mp4", depart: 8, assombrir: 0.52,
    etiquette: { texte: "LE FOND", ton: "vrai" },
    titre: "", sous: "Un panneau sombre derrière le texte : il tient sur n'importe quelle image, même quand le plan s'éclaircit.", taille: 48, retard: 0.6 },
];

const Scene: React.FC<{ p: Plan }> = ({ p }) => {
  const { fps } = useVideoConfig();
  const duree = p.b[1] - p.b[0];
  return (
    <Sequence
      from={Math.round(p.b[0] * fps)}
      durationInFrames={Math.round(duree * fps)}
      layout="none"
    >
      {p.zones !== undefined ? (
        <>
          <AbsoluteFill style={{ backgroundColor: "#0a1016" }} />
          <ZonesTelephone zone={p.zones} retard={0.1} />
        </>
      ) : (
        <FondVideo
          source={p.fond ?? ""}
          depart={p.depart ?? 0}
          duree={duree}
          assombrir={p.assombrir ?? 0.52}
          cote={p.assombrir === 0 ? "aucun" : "bas"}
        />
      )}
      {p.etiquette ? <Etiquette texte={p.etiquette.texte} ton={p.etiquette.ton} retard={0.2} /> : null}
      {p.titre !== undefined || p.sous !== undefined ? (
        <TexteSurImage
          titre={p.titre ?? ""}
          sous={p.sous}
          position="bas-gauche"
          retard={p.retard ?? 0.3}
          taille={p.taille ?? 54}
        />
      ) : null}
    </Sequence>
  );
};

export const PlacerSousTitres: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#04060a" }}>
    {PLANS.map((p) => (
      <Scene key={p.b[0]} p={p} />
    ))}
    <Audio src={staticFile("voix/narration-placer.mp3")} />
  </AbsoluteFill>
);
