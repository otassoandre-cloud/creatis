import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { POLICE } from "./police";
import { COULEURS } from "./theme";

/**
 * TUTORIEL YOUTUBE — 1920x1080, 45 s.
 *
 * Le premier format 16:9 du projet : toutes les autres compositions sont en
 * 1080x1920. Il existe parce que YouTube n'est pas un fil vertical — on y vient
 * pour APPRENDRE quelque chose, et on accepte d'y rester une minute.
 *
 * ── CE QUE CETTE VIDÉO FAIT, ET QUE LES 68 AUTRES NE FAISAIENT PAS ───────
 * Elle enseigne. Le décrochage mesuré à 0:02 sur les précédentes était le moment
 * où le spectateur reconnaissait une publicité. Un tutoriel ne déclenche pas ce
 * réflexe : on y regarde quelqu'un faire une chose qu'on voudrait savoir faire.
 * Le produit apparaît parce qu'il est l'outil de la démonstration, pas parce
 * qu'on le vend.
 *
 * ── LA MISE EN PAGE ──────────────────────────────────────────────────────
 * L'enregistrement de l'application est vertical (1080x1920, c'est un écran de
 * téléphone). Le poser dans un cadre 16:9 laisse deux tiers de vide : ce vide
 * porte l'étape en cours, en texte. La vidéo garde donc sa taille native — pas
 * d'agrandissement, pas de recadrage — et la place perdue devient utile.
 *
 * ── LA DURÉE EST DICTÉE PAR LA VOIX ──────────────────────────────────────
 * Mesuré sur la voix « Charon » : 166 mots/minute. 45 s tiennent donc environ
 * 124 mots. Écrire plus long oblige à accélérer la lecture, et une voix pressée
 * est le premier signal qu'on regarde une publicité.
 *
 * ── DÉPENDANCES ──────────────────────────────────────────────────────────
 * `rec-complet.mp4` est produit par `enregistrer-parcours.mjs` et n'est JAMAIS
 * réutilisé d'une vidéo à l'autre : chaque tutoriel montre une vraie analyse,
 * faite ce jour-là, sur une vraie source. La voix vient de `generer-voix.mjs`.
 */

const FPS = 30;
export const DUREE_TUTO = 45 * FPS; // 1350 images

/** Les étapes, calées sur ce que montre l'enregistrement au même instant. */
export type EtapeTuto = { debut: number; titre: string; detail: string };

export const ETAPES_DEFAUT: EtapeTuto[] = [
  { debut: 0, titre: "1. Prends une vidéo longue", detail: "Un podcast, un live, une interview. Ce que tu as déjà publié fait l'affaire." },
  { debut: 8, titre: "2. Colle le lien", detail: "Pas de téléchargement, pas de logiciel à installer." },
  { debut: 16, titre: "3. L'IA lit ce qui est dit", detail: "Elle repère les passages qui tiennent tout seuls, pas les plus bruyants." },
  { debut: 26, titre: "4. Tu choisis", detail: "Une dizaine de propositions. Le tri reste ton travail — c'est là qu'est la valeur." },
  { debut: 34, titre: "5. Tu publies", detail: "Format 9:16, sous-titres incrustés. Prêt pour TikTok, Reels et Shorts." },
];

export type ReglageTuto = {
  enregistrement: string;
  voix?: string;
  etapes?: EtapeTuto[];
  titre?: string;
};

export const TUTO_DEFAUT: ReglageTuto = {
  enregistrement: "rec-complet.mp4",
  voix: "tuto-du-jour.mp3",
  titre: "Transformer une vidéo longue en Shorts",
};

/** Apparition franche mais pas sèche — le texte doit se lire, pas surgir. */
const entree = (frame: number, debut: number, fps: number) => {
  const s = spring({ frame: frame - debut, fps, config: { damping: 200 }, durationInFrames: 12 });
  return { opacity: s, transform: `translateY(${interpolate(s, [0, 1], [14, 0])}px)` };
};

export const TutoYouTube: React.FC<{ reglage?: ReglageTuto }> = ({
  reglage = TUTO_DEFAUT,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const etapes = reglage.etapes ?? ETAPES_DEFAUT;
  const seconde = frame / fps;

  // Dernière étape dont le début est passé : une seule est affichée à la fois.
  const active = etapes.reduce((acc, e, i) => (seconde >= e.debut ? i : acc), 0);
  const etape = etapes[active];
  const debutImages = etape.debut * fps;

  /* L'enregistrement fait 20,4 s pour une vidéo de 45 s. Plutôt que de le geler
     à la fin — ce qui donne l'impression d'un plantage — on le ralentit pour
     qu'il couvre toute la durée. playbackRate < 1 : le geste reste lisible. */
  const cadence = 612 / DUREE_TUTO;

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond, fontFamily: POLICE }}>
      {/* Halo discret, repris de la charte du site. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 500px at 78% 40%, rgba(16,185,129,0.14), transparent 70%)`,
        }}
      />

      {/* ── Colonne gauche : ce qu'on est en train de faire ── */}
      <div
        style={{
          position: "absolute",
          left: 96,
          top: 0,
          width: 900,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <div
          style={{
            alignSelf: "flex-start",
            padding: "8px 18px",
            borderRadius: 999,
            border: `1px solid rgba(16,185,129,0.3)`,
            background: "rgba(16,185,129,0.1)",
            color: COULEURS.vert,
            fontSize: 26,
            fontWeight: 700,
          }}
        >
          {reglage.titre ?? "Tutoriel"}
        </div>

        <div key={active} style={entree(frame, debutImages, fps)}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.08,
              color: COULEURS.texte,
              marginBottom: 22,
            }}
          >
            {etape.titre}
          </div>
          <div style={{ fontSize: 36, lineHeight: 1.5, color: COULEURS.texteDoux, maxWidth: 800 }}>
            {etape.detail}
          </div>
        </div>

        {/* Progression : cinq traits, celui en cours en vert. Dit où on en est
            sans prendre de place ni demander de lecture. */}
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          {etapes.map((_, i) => (
            <div
              key={i}
              style={{
                width: 84,
                height: 6,
                borderRadius: 3,
                background: i <= active ? COULEURS.vert : "rgba(255,255,255,0.14)",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Colonne droite : l'application, à sa taille native ── */}
      <div
        style={{
          position: "absolute",
          right: 110,
          top: "50%",
          transform: "translateY(-50%)",
          width: 506,          // 900 de haut au ratio 9:16
          height: 900,
          borderRadius: 26,
          overflow: "hidden",
          border: `1px solid ${COULEURS.ligne}`,
          boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
        }}
      >
        <Video
          src={staticFile(reglage.enregistrement)}
          playbackRate={cadence}
          style={{ width: "100%", height: "100%" }}
          objectFit="cover"
          muted
        />
      </div>

      {reglage.voix ? (
        <Sequence from={0} name="Voix off">
          <Audio src={staticFile(`voix/${reglage.voix}`)} />
        </Sequence>
      ) : null}

      {/* Adresse en bas, discrète et constante : sur YouTube le lien vit dans la
          description, celui-ci n'est qu'un rappel visuel. */}
      <div
        style={{
          position: "absolute",
          left: 96,
          bottom: 56,
          fontSize: 28,
          fontWeight: 600,
          color: COULEURS.texteDoux,
        }}
      >
        creatis.app
      </div>
    </AbsoluteFill>
  );
};
