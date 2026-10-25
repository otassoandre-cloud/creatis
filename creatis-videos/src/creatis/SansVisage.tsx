import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { ChiffreSurImage, Etiquette, FondVideo, TexteSurImage } from "./Visuel";

/**
 * « GAGNER DE L'ARGENT SUR TIKTOK SANS MONTRER SON VISAGE » — 1920×1080, 1 min 33.
 *
 * ── POURQUOI CE TITRE, ET PAS UN AUTRE ───────────────────────────────────
 * Relevé dans l'autocomplétion YouTube le 18/10. Ce que les gens tapent
 * réellement :
 *   · « gagner de l'argent sur tiktok sans montrer sa tête »
 *   · « comment gagner de l'argent sur tiktok sans avoir 10000 abonnés »
 *   · « comment gagner de l'argent sur tiktok sans faire de vidéo »
 *
 * C'est la description exacte du clipping, et ce sont des phrases tapées —
 * pas un titre inventé. Les requêtes génériques (« gagner de l'argent »)
 * sont saturées par GTA, Pinterest et Vinted : inatteignables à treize
 * abonnés.
 *
 * ── CE QUE LA MESURE DU 18/10 A MONTRÉ ───────────────────────────────────
 * Sur quinze formats longs, un seul a tourné : 2:07, 48 % de rétention,
 * 420 impressions — dont **34 % venues de la recherche** et 49 % des
 * suggestions. Son titre était une requête. Les suivants n'en étaient pas,
 * et le canal s'est fermé.
 *
 * Donc deux leviers, et deux seulement : un titre qu'on tape, et une
 * rétention au-dessus de 48 %.
 *
 * ── L'HONNÊTETÉ EST ICI UN OUTIL DE RÉTENTION ────────────────────────────
 * Le film dit « non, tu ne gagneras pas mille euros ta première semaine »
 * à la quarante-huitième seconde, c'est-à-dire au moment où le spectateur
 * se demande si on le prend pour un imbécile. C'est aussi ce qui nous tient
 * à l'écart du registre sanctionné le 30/07 (« contenus nuisibles ») : le
 * chiffre est toujours donné avec ce qu'il coûte.
 *
 * ── LES BORNES ───────────────────────────────────────────────────────────
 * Transcription horodatée de la narration (Whisper), pas `silencedetect` :
 * à -33 dB le détecteur n'a trouvé que six frontières sur les trente que
 * compte le texte.
 */

export const DUREE_SANS_VISAGE = Math.round(93.2 * 30);

type Plan = {
  b: [number, number];
  fond: string;
  depart?: number;
  titre?: React.ReactNode;
  sous?: React.ReactNode;
  taille?: number;
  chiffre?: { valeur: string; legende: string; couleur?: string; retard?: number };
  etiquette?: { texte: string; ton: "vrai" | "faux" };
  assombrir?: number;
  retard?: number;
};

const PLANS: Plan[] = [
  { b: [0, 5.3], fond: "clip-mbt-3.mp4", depart: 5, assombrir: 0.5,
    titre: <>Sans montrer ton visage.<br />Sans tourner une vidéo.</>,
    sous: "Et sans avoir d'abonnés.", taille: 66 },
  { b: [5.3, 10.3], fond: "clip-mbt-2.mp4", depart: 5, assombrir: 0.52,
    titre: "Ce n'est pas une promesse, c'est un métier.",
    sous: "Il s'appelle le clipping.", taille: 60 },
  { b: [10.3, 16.8], fond: "whop-h264.mp4", depart: 2, assombrir: 0.5,
    etiquette: { texte: "D'OÙ VIENT L'ARGENT", ton: "vrai" },
    titre: "La marque dépose un budget et paie au millier de vues.", taille: 52, retard: 0.8 },
  { b: [16.8, 23.7], fond: "parc-b.mp4", depart: 12, assombrir: 0,
    titre: "Tu découpes une vidéo qui existe déjà, tu publies, tu soumets les liens.", taille: 48, retard: 0.5 },
  { b: [23.7, 30.7], fond: "clip-mbt-4.mp4", depart: 5, assombrir: 0.52,
    titre: "Tu n'apparais nulle part.",
    sous: "Aucune campagne ne regarde ton nombre d'abonnés. Elle compte les vues de tes clips.", taille: 58 },
  { b: [30.7, 34.7], fond: "clip-mbt-5.mp4", depart: 8, assombrir: 0.56,
    chiffre: { valeur: "0 abonné = 100 000 abonnés", legende: "à vues égales, c'est payé pareil", couleur: "#10b981", retard: 0.3 } },

  /* ── LES VRAIS CHIFFRES ───────────────────────────────────────────── */
  { b: [34.7, 38.4], fond: "clip-mbt-2.mp4", depart: 8, assombrir: 0.56,
    etiquette: { texte: "LES VRAIS CHIFFRES", ton: "vrai" },
    titre: "", sous: "C'est là que la plupart des vidéos mentent par omission.", taille: 52, retard: 0.3 },
  { b: [38.4, 42.7], fond: "stock/argent-1.mp4", depart: 1, assombrir: 0.56,
    chiffre: { valeur: "0,20 $ → 6 $", legende: "pour 1 000 vues · moyenne ≈ 1 $", couleur: "#10b981", retard: 0.2 } },
  { b: [42.7, 47.8], fond: "stock/argent-2.mp4", depart: 2, assombrir: 0.58,
    chiffre: { valeur: "1 clip = 5 $", legende: "5 000 vues à 1 $ les mille", couleur: "#ffd60a", retard: 0.2 } },
  { b: [47.8, 53.6], fond: "clip-mbt-3.mp4", depart: 8, assombrir: 0.56,
    etiquette: { texte: "SOYONS CLAIRS", ton: "faux" },
    titre: "Tu ne gagneras pas 1 000 € ta première semaine.",
    sous: "Pour 1 000 $ dans le mois, il faut 1 million de vues cumulées.", taille: 52, retard: 0.5 },
  { b: [53.6, 61.5], fond: "stock/clavier-1.mp4", depart: 2, assombrir: 0.56,
    chiffre: { valeur: "150 $ / semaine", legende: "30 clips · 600 $ le mois, commission déduite", couleur: "#10b981", retard: 1.2 } },
  { b: [61.5, 65.6], fond: "clip-mbt-4.mp4", depart: 12, assombrir: 0.52,
    titre: "Un complément, répétable.",
    sous: "Qui ne dépend ni de ton visage ni de ton audience.", taille: 58 },

  /* ── LA VRAIE DIFFICULTÉ, ET LA RÉPONSE ───────────────────────────── */
  { b: [65.6, 71.5], fond: "stock/montage-1.mp4", depart: 3, assombrir: 0.6,
    etiquette: { texte: "CE DONT PERSONNE NE PARLE", ton: "faux" },
    titre: "Produire 30 clips par semaine.",
    sous: "À une soirée par clip, c'est impossible.", taille: 56, retard: 0.6 },
  { b: [71.5, 76.8], fond: "stock/bureau-2.mp4", depart: 6, assombrir: 0.6,
    titre: "Le travail n'est pas le montage.",
    sous: "C'est de trouver quels passages tiennent debout tout seuls dans une heure de vidéo.", taille: 52 },
  { b: [76.8, 84.5], fond: "parc-b.mp4", depart: 13, assombrir: 0,
    titre: "Dix passages notés, déjà recadrés, déjà sous-titrés.", taille: 52, retard: 0.5 },
  { b: [84.5, 93.2], fond: "parc-b.mp4", depart: 18, assombrir: 0,
    etiquette: { texte: "PAR OÙ COMMENCER", ton: "vrai" },
    titre: "",
    sous: (
      <>
        1. Ouvre une campagne et lis ses règles avant tout le reste.
        <br />
        2. Choisis-la sur son budget restant, pas sur son tarif.
        <br />
        3. Une vidéo qui parle, 20 min à 1 h 30. Sors-en cinq clips.
      </>
    ), taille: 46, retard: 0.8 },
];

const Scene: React.FC<{ p: Plan }> = ({ p }) => {
  const { fps } = useVideoConfig();
  const duree = p.b[1] - p.b[0];
  return (
    <Sequence from={Math.round(p.b[0] * fps)} durationInFrames={Math.round(duree * fps)} layout="none">
      <FondVideo
        source={p.fond}
        depart={p.depart ?? 0}
        duree={duree}
        assombrir={p.assombrir ?? 0.54}
        cote={p.assombrir === 0 ? "aucun" : "bas"}
      />
      {p.etiquette ? <Etiquette texte={p.etiquette.texte} ton={p.etiquette.ton} retard={0.2} /> : null}
      {p.chiffre ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <ChiffreSurImage
            valeur={p.chiffre.valeur}
            legende={p.chiffre.legende}
            couleur={p.chiffre.couleur ?? "#10b981"}
            retard={p.chiffre.retard ?? 0.3}
          />
        </AbsoluteFill>
      ) : null}
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

export const SansVisage: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#04060a" }}>
    {PLANS.map((p) => (
      <Scene key={p.b[0]} p={p} />
    ))}
    <Audio src={staticFile("voix/narration-sans-visage.mp3")} />
  </AbsoluteFill>
);
