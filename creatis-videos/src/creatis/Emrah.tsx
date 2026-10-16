import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { ChiffreSurImage, Ecran, Etiquette, FondVideo, TexteSurImage } from "./Visuel";

/**
 * « 12 DOLLARS » — court-métrage, 1920×1080, 5 min 13.
 *
 * ── CE QUE CE FILM CHANGE ────────────────────────────────────────────────
 * Demande du 16/10 : que la vidéo longue soit un récit, pas un exposé. « Des
 * images, des plans, une histoire », avec des gens qui travaillent pendant
 * que la voix parle.
 *
 * Les dix films précédents avaient un fond par paragraphe — trois B-rolls de
 * dix à dix-sept secondes, recyclés. Celui-ci a UN PLAN PAR IDÉE : une
 * quarantaine de plans de quatre à neuf secondes, tirés d'une banque libre
 * (Mixkit, licence commerciale sans attribution), téléchargés par
 * `chercher-plans.mjs`. La génération d'images reste fermée : HF_TOKEN vide,
 * OpenAI « credit_balance_exhausted », Gemini image en 429.
 *
 * ── L'HISTOIRE EST VRAIE, ET SOURCÉE ─────────────────────────────────────
 * Emrah Bayraktar, 25 ans, Belgique. Lavait des voitures, faisait les nuits
 * en entrepôt, préparait des sandwichs. Le soir, il découpait des interviews
 * d'influenceurs pour Instagram. Première notification : 12 $. Deux semaines
 * plus tard : 2 500 $. Il a quitté ses emplois. Trois ans après : six pages,
 * 1,1 million d'abonnés cumulés.
 *
 * Source : NPR, « The clipping economy », 12/05/2026. Rien n'est inventé, et
 * surtout : **Emrah n'a jamais utilisé Créatis**. Le film ne le laisse pas
 * entendre. Son histoire donne la LEÇON (l'écart, c'est le nombre de clips) ;
 * l'outil arrive ensuite comme notre réponse à ce goulot, pas comme la sienne.
 *
 * ── LES BORNES ───────────────────────────────────────────────────────────
 * `silencedetect` sur les cinq blocs, décalés de leur position dans le
 * fichier concaténé : a 0 · b 53,7 · c 115,2 · d 170,6 · e 236,6.
 */

export const DUREE_EMRAH = Math.round(313.4 * 30);

type Plan = {
  /** Bornes dans le film, en secondes. */
  b: [number, number];
  /** Le fichier de fond, sous `public/`. */
  fond: string;
  /** Seconde de départ dans le fond. */
  depart?: number;
  titre?: React.ReactNode;
  sous?: React.ReactNode;
  taille?: number;
  /** Un chiffre plein cadre, à la place du texte en bas. */
  chiffre?: { valeur: string; legende: string; couleur?: string; retard?: number };
  etiquette?: { texte: string; ton: "vrai" | "faux" };
  /** Une zone d'écran du tournage de la plateforme. */
  zone?: [number, number, number, number];
  assombrir?: number;
  retard?: number;
};

/* Zones du tournage `demo-h264.mp4`, relevées sur une capture quadrillée. */
const Z = {
  grille: [180, 30, 1380, 776] as [number, number, number, number],
  grilleSerree: [230, 60, 900, 506] as [number, number, number, number],
  fiche: [400, 20, 1180, 664] as [number, number, number, number],
  lecteur: [540, 50, 900, 506] as [number, number, number, number],
  panneau: [1150, 40, 440, 248] as [number, number, number, number],
};

const PLANS: Plan[] = [
  /* ══ A — L'HOMME AUX TROIS EMPLOIS ═════════════════════════════════ */
  { b: [0, 3.0], fond: "stock/ville-1.mp4", depart: 1, assombrir: 0.6,
    titre: <>Il y a trois ans,<br />Emrah avait trois emplois.</>, taille: 74 },
  { b: [3.0, 6.1], fond: "stock/entrepot-1.mp4", depart: 2, assombrir: 0.55,
    titre: "Il lavait des voitures. Il faisait les nuits en entrepôt.", taille: 56 },
  { b: [6.1, 9.4], fond: "stock/sandwich-1.mp4", depart: 2, assombrir: 0.55,
    titre: "Et des sandwichs, derrière un comptoir.", taille: 60 },
  { b: [9.4, 14.7], fond: "stock/ville-2.mp4", depart: 3, assombrir: 0.62,
    titre: "25 ans. Belgique.",
    sous: "Aucun diplôme de montage. Aucune audience. Aucun réseau.", taille: 70 },
  { b: [14.7, 24.2], fond: "stock/montage-1.mp4", depart: 2, assombrir: 0.58,
    titre: "Le soir, en rentrant, il découpait des interviews.",
    sous: "Des vidéos d'une heure, parfois deux, réduites à des passages courts, publiés sur Instagram.", taille: 56 },
  { b: [24.2, 27.9], fond: "stock/clavier-3.mp4", depart: 1, assombrir: 0.56,
    titre: "Pas pour l'argent.",
    sous: "Au début, il n'y en avait pas.", taille: 68 },
  { b: [27.9, 29.9], fond: "stock/tel-1.mp4", depart: 2, assombrir: 0.5,
    titre: "Et puis, une nuit, une notification.", taille: 60 },
  { b: [29.9, 39.4], fond: "stock/argent-2.mp4", depart: 1, assombrir: 0.58,
    chiffre: { valeur: "12 $", legende: "pour tout le travail accumulé", couleur: "#ff5a4e", retard: 0.3 } },
  { b: [39.4, 48.2], fond: "stock/montage-2.mp4", depart: 0, assombrir: 0.55,
    titre: "« OK, cool. »",
    sous: "La plupart des gens s'arrêtent exactement là : ils voient 12 $, ils ferment l'application.", taille: 58 },
  { b: [48.2, 53.9], fond: "stock/clavier-1.mp4", depart: 1, assombrir: 0.5,
    titre: "Lui a continué.", taille: 78 },

  /* ══ B — CE QUI S'EST PASSÉ ENSUITE ════════════════════════════════ */
  { b: [53.9, 56.3], fond: "stock/argent-1.mp4", depart: 1, assombrir: 0.5,
    chiffre: { valeur: "2 500 $", legende: "deux semaines plus tard", couleur: "#10b981", retard: 0.2 } },
  { b: [56.3, 58.3], fond: "stock/joie-1.mp4", depart: 2, assombrir: 0.55,
    titre: "Il a quitté ses trois emplois.", taille: 70 },
  { b: [58.3, 62.3], fond: "stock/ville-1.mp4", depart: 5, assombrir: 0.6,
    titre: "L'économie du clipping.", taille: 70 },
  { b: [62.3, 67.8], fond: "stock/bureau-1.mp4", depart: 2, assombrir: 0.6,
    titre: "Six pages. 1,1 million d'abonnés cumulés.",
    sous: "Certaines dépassent 200 000 à elles seules.", taille: 58 },
  { b: [67.8, 72.6], fond: "stock/nuit-2.mp4", depart: 2, assombrir: 0.6,
    titre: "Documenté par la radio publique américaine.",
    sous: "Ce n'est pas la promesse d'un vendeur de formation.", taille: 56 },
  { b: [72.6, 77.3], fond: "stock/nuit-2.mp4", depart: 7, assombrir: 0.62,
    etiquette: { texte: "LA VRAIE QUESTION", ton: "vrai" },
    titre: <>Que s'est-il passé entre<br />12 $ et 2 500 $ ?</>, taille: 66, retard: 0.6 },
  { b: [77.3, 84.3], fond: "stock/montage-2.mp4", depart: 0, assombrir: 0.58,
    titre: "Il n'est pas devenu meilleur monteur en 14 jours.",
    sous: "Et ce n'est pas la chance : un clip viral ne se répète pas. Lui a tenu trois ans.", taille: 54 },
  { b: [84.3, 86.9], fond: "stock/clavier-1.mp4", depart: 5, assombrir: 0.5,
    titre: "Ce qui a changé, c'est le NOMBRE de clips.", taille: 62 },
  { b: [86.9, 96.5], fond: "whop-h264.mp4", depart: 2, assombrir: 0.5,
    etiquette: { texte: "D'OÙ VIENT L'ARGENT", ton: "vrai" },
    titre: "La marque dépose un budget. Elle paie aux vues.",
    sous: "Pas au contrat, pas à l'abonné : au millier de vues.", taille: 54, retard: 1.0 },
  { b: [96.5, 105.4], fond: "stock/argent-1.mp4", depart: 4, assombrir: 0.56,
    chiffre: { valeur: "0,20 $ → 6 $", legende: "pour 1 000 vues · moyenne ≈ 1 $ · jusqu'à 25 $ pour des clips de startups", couleur: "#10b981", retard: 0.4 } },
  { b: [105.4, 115.2], fond: "stock/mains-2.mp4", depart: 0, assombrir: 0.5,
    titre: "Aucun minimum d'abonnés.",
    sous: "La campagne ne regarde pas ton compte. Elle compte les vues de tes clips.", taille: 62 },

  /* ══ C — L'ARITHMÉTIQUE, ET LE GOULOT ══════════════════════════════ */
  { b: [115.2, 121.4], fond: "stock/argent-2.mp4", depart: 6, assombrir: 0.56,
    chiffre: { valeur: "1 clip = 5 $", legende: "5 000 vues à 1 $ les mille", couleur: "#10b981", retard: 0.4 } },
  { b: [121.4, 128.1], fond: "stock/clavier-2.mp4", depart: 1, assombrir: 0.56,
    titre: "12 $ = deux ou trois clips.",
    sous: "2 500 $ = cinq cents.", taille: 66 },
  { b: [128.1, 133.1], fond: "stock/ville-1.mp4", depart: 8, assombrir: 0.62,
    chiffre: { valeur: "500 clips", legende: "l'écart entre la première notification et la démission", couleur: "#ffd60a", retard: 0.3 } },
  { b: [133.1, 137.8], fond: "stock/nuit-1.mp4", depart: 6, assombrir: 0.45,
    etiquette: { texte: "LÀ OÙ TOUT LE MONDE ABANDONNE", ton: "faux" },
    titre: "Une soirée par clip = cinq cents soirées.", taille: 58, retard: 0.8 },
  { b: [137.8, 147.8], fond: "stock/montage-1.mp4", depart: 10, assombrir: 0.58,
    titre: "Emrah a résolu ça à la main. Pendant trois ans.",
    sous: "C'était son métier, et il l'a appris lentement.", taille: 56 },
  { b: [147.8, 154.0], fond: "stock/bureau-2.mp4", depart: 4, assombrir: 0.6,
    titre: "Ce qui prend du temps n'est pas le montage.",
    sous: "C'est de trouver quel passage mérite d'être découpé.", taille: 56 },
  { b: [154.0, 162.2], fond: "stock/bureau-2.mp4", depart: 14, assombrir: 0.6,
    titre: "Dix moments sur une heure de vidéo.",
    sous: "Et pour les repérer, il faut regarder l'heure entière.", taille: 60 },
  { b: [162.2, 170.5], fond: "stock/clavier-1.mp4", depart: 6, assombrir: 0.56,
    titre: "Recadrer. Sous-titrer. Vérifier que rien n'est caché.",
    sous: "C'est ce travail-là qu'on a automatisé.", taille: 54 },

  /* ══ D — LA DÉMONSTRATION ══════════════════════════════════════════ */
  { b: [170.5, 177.3], fond: "demo-h264.mp4", depart: 11, zone: Z.grille,
    titre: "On colle le lien. La plateforme lit toute la vidéo.", taille: 56 },
  { b: [177.3, 188.2], fond: "demo-h264.mp4", depart: 12, zone: Z.grilleSerree,
    titre: "Dix passages, chacun noté sur 100.",
    sous: "La note mesure si le passage se comprend seul, s'il accroche dans ses 3 premières secondes, et s'il se termine sur quelque chose.", taille: 52 },
  { b: [188.2, 197.9], fond: "demo-h264.mp4", depart: 26, zone: Z.fiche,
    titre: "Déjà recadré en 9:16, centré sur qui parle.",
    sous: "En dessous, la transcription, mot par mot.", taille: 56 },
  { b: [197.9, 206.6], fond: "demo-h264.mp4", depart: 38, zone: Z.panneau,
    etiquette: { texte: "11 STYLES", ton: "vrai" },
    titre: "Tu changes de style d'un clic. Tu règles la taille.", taille: 54, retard: 0.8 },
  { b: [206.6, 215.0], fond: "demo-h264.mp4", depart: 54, zone: Z.lecteur,
    titre: "Tu les attrapes, et tu les places où tu veux.",
    sous: "L'interface mange le bas de l'écran. Des sous-titres cachés, c'est un clip perdu.", taille: 54 },
  { b: [215.0, 229.7], fond: "demo-h264.mp4", depart: 66, zone: Z.fiche,
    titre: "Le bandeau d'accroche, puis l'export.",
    sous: "1080 × 1920, sous-titres incrustés. Aucun logiciel de montage ouvert.", taille: 54 },
  { b: [229.7, 245.8], fond: "demo-h264.mp4", depart: 14, zone: Z.grille,
    chiffre: { valeur: "1 source = 5 clips gardés", legende: "trois vidéos dans la semaine, et tu as tes quinze clips", couleur: "#10b981", retard: 0.8 } },

  /* ══ E — CE QUE ÇA VEUT DIRE POUR TOI ══════════════════════════════ */
  { b: [245.8, 250.7], fond: "demo-h264.mp4", depart: 16, zone: Z.grilleSerree,
    chiffre: { valeur: "7 609 clips", legende: "983 vidéos analysées · 574 personnes · depuis août 2026", couleur: "#10b981", retard: 0.3 } },
  { b: [250.7, 262.7], fond: "stock/tel-2.mp4", depart: 1, assombrir: 0.58,
    etiquette: { texte: "SOYONS HONNÊTES", ton: "faux" },
    titre: "Tu ne feras pas 2 500 $ en deux semaines.",
    sous: "Emrah avait trois ans de pratique devant lui, et son histoire est racontée dans la presse parce qu'elle est rare.", taille: 54, retard: 0.8 },
  { b: [262.7, 273.5], fond: "stock/clavier-3.mp4", depart: 4, assombrir: 0.56,
    chiffre: { valeur: "150 $ / semaine", legende: "30 clips · 600 $ le mois, commission déduite", couleur: "#10b981", retard: 1.2 } },
  { b: [273.5, 280.1], fond: "stock/cuisine-2.mp4", depart: 2, assombrir: 0.58,
    titre: "Un revenu d'appoint, modeste, mais répétable.",
    sous: "Un clip viral, lui, ne l'est jamais.", taille: 58 },
  { b: [280.1, 284.1], fond: "stock/tel-1.mp4", depart: 8, assombrir: 0.5,
    titre: "Et le chemin est le même que le sien.",
    sous: "Il commence par une notification à 12 $.", taille: 58 },
  { b: [284.1, 309.4], fond: "stock/bureau-2.mp4", depart: 20, assombrir: 0.64,
    etiquette: { texte: "L'ORDRE EXACT", ton: "vrai" },
    titre: "",
    sous: (
      <>
        1. Lis les règles de la campagne avant tout le reste.
        <br />
        2. Choisis-la sur son budget restant, pas sur son tarif.
        <br />
        3. Une vidéo qui parle, 20 min à 1 h 30. Sors-en cinq clips.
        <br />
        4. Publie, soumets, note tes vues à 24 h, 72 h et 7 jours.
      </>
    ), taille: 48, retard: 1.0 },
  { b: [309.4, 313.4], fond: "stock/ville-1.mp4", depart: 12, assombrir: 0.6,
    titre: <>Emrah a mis trois ans<br />à construire six pages.</>,
    sous: "Toi, tu as besoin de la première.", taille: 64 },
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
      {p.zone ? (
        <Ecran source={p.fond} depart={p.depart ?? 0} duree={duree} zone={p.zone} zoom={1.05} />
      ) : (
        <FondVideo
          source={p.fond}
          depart={p.depart ?? 0}
          duree={duree}
          assombrir={p.assombrir ?? 0.56}
          cote="bas"
        />
      )}
      {p.etiquette ? (
        <Etiquette texte={p.etiquette.texte} ton={p.etiquette.ton} retard={0.2} />
      ) : null}
      {p.chiffre ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <ChiffreSurImage
            valeur={p.chiffre.valeur}
            legende={p.chiffre.legende}
            couleur={p.chiffre.couleur ?? "#10b981"}
            retard={p.chiffre.retard ?? 0.4}
          />
        </AbsoluteFill>
      ) : null}
      {p.titre !== undefined || p.sous !== undefined ? (
        <TexteSurImage
          titre={p.titre ?? ""}
          sous={p.sous}
          position="bas-gauche"
          retard={p.retard ?? 0.3}
          taille={p.taille ?? 62}
        />
      ) : null}
    </Sequence>
  );
};

export const Emrah: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#04060a" }}>
    {PLANS.map((p) => (
      <Scene key={p.b[0]} p={p} />
    ))}
    <Audio src={staticFile("voix/narration-emrah.mp3")} />
  </AbsoluteFill>
);
