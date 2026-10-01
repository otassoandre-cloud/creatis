import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Series,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Fond } from "./Fond";
import { POLICE } from "./police";
import { Punch } from "./Punch";
import { SousTitreBrule } from "./SousTitreBrule";
import { COULEURS } from "./theme";
import { CartonFinal } from "./posts/CartonFinal";

/**
 * PUB « DE LA VIDEO LONGUE AUX CLIPS » — 1080x1920, 15,9 s.
 *
 * REECRITE le 05/09/2026. La premiere version racontait la douleur avec des
 * rectangles de couleur et un chronometre : on ne voyait aucun clip, donc on ne
 * comprenait pas ce que fait l'outil. Retour du terrain, mot pour mot : « on
 * comprend pas la video, on voit pas de clips ».
 *
 * Le principe qui gouverne maintenant tout le montage : **chaque plan montre de
 * la vraie video**. Aucun schema abstrait. L'utilite doit se lire sans le son et
 * sans avoir a interpreter une metaphore.
 *
 * L'image centrale est le plan 2 : la source 16:9 retrecit en haut de l'ecran
 * pendant que trois verticales tombent dessous. Entree et sortie visibles
 * simultanement — c'est le produit entier en une image, et c'est ce qui manquait.
 *
 * La douleur reste, mais elle passe au plan 4 et s'appuie sur des clips
 * visibles : 3 h a la main contre 60 secondes, avec le resultat sous les yeux.
 * Vendre la douleur d'abord suppose que le spectateur ait compris de quoi on
 * parle ; ce n'etait pas le cas.
 *
 * Tous les clips verticaux sortent reellement du produit (04/09/2026), et la
 * source 16:9 est la video dont ils ont ete extraits — la demonstration est donc
 * vraie de bout en bout, pas illustree.
 */
export const DUREE_PUB_DOULEUR = 477;

const ROUGE = "#f87171";

/** Etiquette courte au-dessus d'un bloc — dit ce qu'on regarde, sans decorer. */
const Etiquette: React.FC<{ texte: string; couleur?: string; opacite?: number }> = ({
  texte,
  couleur = COULEURS.texteDoux,
  opacite = 1,
}) => (
  <div
    style={{
      fontSize: 32,
      fontWeight: 700,
      color: couleur,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      WebkitTextStroke: "6px rgba(0,0,0,0.85)",
      paintOrder: "stroke fill",
      opacity: opacite,
    }}
  >
    {texte}
  </div>
);

/* ── PLAN 1 — la source, telle qu'elle arrive (0 → 3 s) ────────────────────
   On ouvre sur la vraie video 16:9, en boite noire, avec sa duree. Le spectateur
   voit immediatement de quoi on part. */
const Source: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Fond intensite={0.3} />
      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 70,
          paddingRight: 70,
          paddingBottom: 260,
          gap: 22,
        }}
      >
        <Etiquette texte="La vidéo de départ" />

        <div
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            borderRadius: 14,
            overflow: "hidden",
            border: `1px solid ${COULEURS.ligne}`,
            backgroundColor: "#000",
          }}
        >
          <Video
            src={staticFile("source-16-9.mp4")}
            style={{ width: "100%", height: "100%" }}
            objectFit="cover"
            muted
            loop
          />
        </div>

        <div
          style={{
            fontSize: 62,
            fontWeight: 800,
            color: COULEURS.texte,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.02em",
            opacity: interpolate(frame, [0.5 * fps, 0.85 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          26:49
        </div>
      </AbsoluteFill>

      <SousTitreBrule
        texte="Un stream de 26 min"
        debut={3}
        cadence={3}
        hauteur={72}
        taille={68}
        accent={["26", "min"]}
        couleurAccent={ROUGE}
      />
    </AbsoluteFill>
  );
};

/* ── PLAN 2 — LE plan qui explique le produit (3 → 8 s) ────────────────────
   La source retrecit en haut, trois verticales tombent dessous. Entree et
   sortie dans le meme cadre : c'est ce qui manquait a la version precedente. */
const Transformation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sorties = ["gta-1.mp4", "gta-2.mp4", "gta-3.mp4"];

  /* La source recule pour laisser la place au resultat — le mouvement raconte
     le sens de la transformation, de haut en bas. */
  const recul = interpolate(frame, [10, 34], [1, 0.72], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Fond intensite={0.5} />
      <AbsoluteFill
        style={{
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 170,
          paddingLeft: 70,
          paddingRight: 70,
          gap: 16,
        }}
      >
        <div style={{ width: "100%", scale: recul, transformOrigin: "top center" }}>
          <div
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              borderRadius: 14,
              overflow: "hidden",
              border: `1px solid ${COULEURS.ligne}`,
              backgroundColor: "#000",
            }}
          >
            <Video
              src={staticFile("source-16-9.mp4")}
              style={{ width: "100%", height: "100%" }}
              objectFit="cover"
              muted
              loop
            />
          </div>
        </div>

        <div
          style={{
            fontSize: 54,
            color: COULEURS.vert,
            lineHeight: 1,
            marginTop: -14,
            opacity: interpolate(frame, [26, 38], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          ↓
        </div>

        {/* Les trois verticales, en vrai, cote a cote. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
            width: "100%",
          }}
        >
          {sorties.map((f, i) => {
            const t = 38 + i * 9;
            return (
              <div
                key={f}
                style={{
                  aspectRatio: "9 / 16",
                  borderRadius: 12,
                  overflow: "hidden",
                  border: `2px solid ${COULEURS.vert}`,
                  boxShadow: "0 0 30px rgba(16,185,129,0.35)",
                  opacity: interpolate(frame, [t, t + 8], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  translate: interpolate(frame, [t, t + 12], ["0px -26px", "0px 0px"], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                  }),
                }}
              >
                <Video
                  src={staticFile(f)}
                  style={{ width: "100%", height: "100%" }}
                  objectFit="cover"
                  muted
                  loop
                />
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 10 }}>
          <Etiquette
            texte="10 clips verticaux"
            couleur={COULEURS.vert}
            opacite={interpolate(frame, [1.9 * fps, 2.2 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          />
        </div>
      </AbsoluteFill>

      <SousTitreBrule
        texte="L'IA en sort 10 clips verticaux"
        debut={52}
        cadence={3}
        hauteur={80}
        taille={66}
        accent={["10", "clips"]}
      />
    </AbsoluteFill>
  );
};

/* ── PLAN 3 — ce que vaut un clip, plein cadre (8 → 11,7 s) ────────────────
   Un seul clip, en grand, avec ce que le produit lui a fait. On ne l'affirme
   pas : le recadrage sur le visage se voit, les sous-titres se lisent. */
const UnClip: React.FC = () => {
  const frame = useCurrentFrame();

  const paraitre = (d: number) =>
    interpolate(frame, [d, d + 8], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      {/* Le plan plein cadre doit etre reconnaissable INSTANTANEMENT : les bornes
          ayant ete posees a l'aveugle (aucune transcription sur du gameplay), la
          plupart tombent sur des interieurs sombres ou l'on ne voit ni le jeu ni
          personne. `trimBefore` va chercher la scene eclairee et peuplee. */}
      <Video
        src={staticFile("gta-3.mp4")}
        style={{ width: "100%", height: "100%" }}
        objectFit="cover"
        muted
        loop
        trimBefore={600}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(4,10,7,0.95) 0%, rgba(4,10,7,0.88) 15%, rgba(4,10,7,0.12) 30%, rgba(4,10,7,0.12) 56%, rgba(4,10,7,0.96) 100%)",
        }}
      />

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "center",
          paddingTop: 150,
          gap: 14,
        }}
      >
        <Etiquette texte="Recadré en 9:16" couleur={COULEURS.vert} opacite={paraitre(4)} />
        <Etiquette texte="Prêt à poster" couleur={COULEURS.vert} opacite={paraitre(22)} />
      </AbsoluteFill>

      <SousTitreBrule
        texte="Tu n'as rien monté"
        debut={48}
        cadence={4}
        hauteur={66}
        taille={80}
        accent={["rien"]}
      />
    </AbsoluteFill>
  );
};

/* ── PLAN 4 — le gain, avec le resultat sous les yeux (11,7 → 14,1 s) ──────
   La comparaison de temps arrive APRES qu'on ait compris le produit. Les
   miniatures restent a l'ecran pour que le chiffre porte sur quelque chose. */
const Gain: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vignettes = ["gta-1.mp4", "gta-2.mp4", "gta-3.mp4", "gta-1.mp4"];

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Fond intensite={0.9} />
      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 70,
          paddingRight: 70,
          paddingBottom: 120,
          gap: 26,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            width: "100%",
          }}
        >
          {vignettes.map((f, i) => (
            <div
              key={f}
              style={{
                aspectRatio: "9 / 16",
                borderRadius: 10,
                overflow: "hidden",
                border: `1px solid ${COULEURS.ligne}`,
                opacity: interpolate(frame, [i * 4, i * 4 + 8], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              <Video
                src={staticFile(f)}
                style={{ width: "100%", height: "100%" }}
                objectFit="cover"
                muted
                loop
              />
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gap: 6, textAlign: "center" }}>
          <div
            style={{
              fontSize: 46,
              fontWeight: 700,
              color: ROUGE,
              textDecoration: "line-through",
              textDecorationThickness: 4,
              opacity: interpolate(frame, [16, 26], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            3 h de montage
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              color: COULEURS.vert,
              letterSpacing: "-0.03em",
              fontVariantNumeric: "tabular-nums",
              opacity: interpolate(frame, [1.1 * fps, 1.4 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              scale: interpolate(frame, [1.1 * fps, 1.6 * fps], [0.85, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.spring({ damping: 12 }),
                output: "perceptual-scale",
              }),
            }}
          >
            58 secondes
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const PubDouleur: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COULEURS.fond, fontFamily: POLICE }}>
    <Series>
      {/* Pas de flash a l'ouverture : l'image 1 doit etre la video, pas un
          ecran blanc. C'est la seule que 100 % de l'audience verra. */}
      <Series.Sequence durationInFrames={90} name="1 · La vidéo de départ">
        <Punch force={1.04} flash={0}>
          <Source />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={150} name="2 · 16:9 → verticales">
        <Punch force={1.08} flash={0.1}>
          <Transformation />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={110} name="3 · Un clip en grand">
        <Punch force={1.12} flash={0.14}>
          <UnClip />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={72} name="4 · 3 h → 58 s">
        <Punch force={1.1} flash={0.12}>
          <Gain />
        </Punch>
      </Series.Sequence>

      <Series.Sequence durationInFrames={55} name="5 · Créatis">
        <Punch>
          <CartonFinal mention="7 jours d’essai gratuit sur l’annuel" />
        </Punch>
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
