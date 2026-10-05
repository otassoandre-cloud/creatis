import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Fond } from "./Fond";
import { COULEURS, ENTREE, MISE_EN_PAGE } from "./theme";

/** Les 6 vrais clips sortis de Créatis, utilises comme preuve visuelle. */
const CLIPS = [
  "showcase-2.mp4",
  "showcase-5.mp4",
  "showcase-8.mp4",
  "showcase-1.mp4",
  "showcase-7.mp4",
  "showcase-4.mp4",
] as const;

/**
 * Scene 3 — le produit (8 → 16 s).
 *
 * C'est la scene qui doit faire comprendre le produit meme coupe le son : un lien
 * colle en haut, et les clips verticaux qui tombent en cascade juste apres.
 * Les vignettes sont de VRAIS clips produits par Créatis, pas des placeholders.
 */
export const SceneProduit: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill name="SceneProduit">
      <Audio src={staticFile("voix/s3-produit.mp3")} />
      <Fond intensite={0.7} />

      {/* ── Le champ « colle ton lien », repris de la landing page ── */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          paddingTop: MISE_EN_PAGE.margeHaut,
          paddingLeft: MISE_EN_PAGE.margeCote,
          paddingRight: MISE_EN_PAGE.margeCote,
        }}
      >
        <Interactive.Div
          name="Champ lien"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 22,
            backgroundColor: "rgba(255,255,255,0.05)",
            border: `1.5px solid ${COULEURS.vert}`,
            borderRadius: 999,
            padding: "30px 38px",
            boxShadow: "0 0 60px rgba(16,185,129,0.22)",
            opacity: interpolate(frame, [0, 0.45 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
            translate: interpolate(
              frame,
              [0, 0.6 * fps],
              ["0px -30px", "0px 0px"],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(...ENTREE),
              },
            ),
          }}
        >
          <div style={{ fontSize: 44 }}>🔗</div>
          <div
            style={{
              fontSize: 40,
              color: COULEURS.texte,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {/* Le lien « s'ecrit » caractere par caractere : on montre le geste,
                pas seulement le resultat. */}
            {"youtube.com/watch?v=...".slice(
              0,
              Math.floor(
                interpolate(frame, [0.4 * fps, 1.5 * fps], [0, 23], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              ),
            )}
            <span
              style={{
                opacity: frame % 20 < 10 ? 1 : 0,
                color: COULEURS.vert,
              }}
            >
              |
            </span>
          </div>
        </Interactive.Div>

        <Interactive.Div
          name="Etat analyse"
          style={{
            marginTop: 30,
            fontSize: MISE_EN_PAGE.legende,
            color: COULEURS.vert,
            fontWeight: 700,
            letterSpacing: "0.03em",
            opacity: interpolate(
              frame,
              [1.7 * fps, 2.1 * fps, 3.2 * fps, 3.6 * fps],
              [0, 1, 1, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.linear,
              },
            ),
          }}
        >
          ⚡ L'IA repère les moments forts…
        </Interactive.Div>
      </AbsoluteFill>

      {/* ── La grille de clips : 3 colonnes x 2 rangees ── */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: MISE_EN_PAGE.margeCote,
          paddingRight: MISE_EN_PAGE.margeCote,
          paddingTop: 120,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
            width: "100%",
          }}
        >
          {CLIPS.map((fichier, i) => {
            // Chaque vignette tombe l'une apres l'autre, 4 images d'ecart.
            const debut = 3.4 * fps + i * 4;
            return (
              <div
                key={fichier}
                style={{
                  aspectRatio: "9 / 16",
                  borderRadius: 16,
                  overflow: "hidden",
                  border: `1px solid ${COULEURS.ligne}`,
                  backgroundColor: COULEURS.fondCarte,
                  boxShadow: "0 18px 40px rgba(0,0,0,0.5)",
                  opacity: interpolate(
                    frame,
                    [debut, debut + 0.4 * fps],
                    [0, 1],
                    {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                      easing: Easing.bezier(...ENTREE),
                    },
                  ),
                  scale: interpolate(
                    frame,
                    [debut, debut + 0.55 * fps],
                    [0.84, 1],
                    {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                      easing: Easing.bezier(...ENTREE),
                      output: "perceptual-scale",
                    },
                  ),
                  translate: interpolate(
                    frame,
                    [debut, debut + 0.55 * fps],
                    ["0px 46px", "0px 0px"],
                    {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                      easing: Easing.bezier(...ENTREE),
                    },
                  ),
                }}
              >
                <Video
                  src={staticFile(fichier)}
                  style={{ width: "100%", height: "100%" }}
                  objectFit="cover"
                  loop
                  muted
                />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* ── La legende du bas : ce que l'IA a fait, en 3 mots ── */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: MISE_EN_PAGE.margeBas,
          paddingLeft: MISE_EN_PAGE.margeCote,
          paddingRight: MISE_EN_PAGE.margeCote,
        }}
      >
        <Interactive.Div
          name="Legende"
          style={{
            fontSize: MISE_EN_PAGE.soutien,
            fontWeight: 700,
            color: COULEURS.texte,
            textAlign: "center",
            lineHeight: 1.45,
            opacity: interpolate(frame, [5.4 * fps, 5.9 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...ENTREE),
            }),
          }}
        >
          Recadrés en 9:16. Sous-titrés.
          <br />
          <span style={{ color: COULEURS.vert }}>Prêts à publier.</span>
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
