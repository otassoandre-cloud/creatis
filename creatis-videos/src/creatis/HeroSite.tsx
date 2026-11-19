import { Video } from "@remotion/media";
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
import { POLICE } from "./police";
import { COULEURS, ENTREE } from "./theme";

/** 4 clips suffisent en 16:9 : au-dela ils deviennent trop petits pour etre lus. */
const CLIPS = [
  "showcase-2.mp4",
  "showcase-5.mp4",
  "showcase-8.mp4",
  "showcase-7.mp4",
] as const;

/**
 * Video hero 16:9 pour la landing page — 18 s, muette, pensee pour tourner
 * en boucle a cote du champ « colle ton lien ».
 *
 * Elle raconte une seule chose : la video longue a gauche devient les clips
 * verticaux a droite. Pas de texte marketing, pas de logo — la page s'en
 * charge deja autour. Le fondu de fin ramene au noir du debut pour que la
 * boucle ne saute pas.
 */
export const DUREE_HERO = 540;

export const HeroSite: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fondu d'entree et de sortie, pour une boucle sans a-coup.
  const boucle = interpolate(
    frame,
    [0, 0.7 * fps, DUREE_HERO - 1.1 * fps, DUREE_HERO],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(...ENTREE),
    },
  );

  // Les extraits reperes dans la video longue, en % de la barre.
  const extraits = [8, 30, 54, 76];

  return (
    <AbsoluteFill
      style={{ fontFamily: POLICE, backgroundColor: COULEURS.fond }}
    >
      <Fond intensite={0.55} />

      <AbsoluteFill style={{ opacity: boucle }}>
        {/* ── Partie haute : la video longue ── */}
        <AbsoluteFill
          style={{
            justifyContent: "flex-start",
            alignItems: "center",
            paddingTop: 118,
            paddingLeft: 130,
            paddingRight: 130,
          }}
        >
          <Interactive.Div
            name="Etiquette source"
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: COULEURS.texteDoux,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 22,
              opacity: interpolate(frame, [0.3 * fps, 0.9 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(...ENTREE),
              }),
            }}
          >
            Ta vidéo · 02:04:11
          </Interactive.Div>

          <Interactive.Div
            name="Barre video longue"
            style={{
              position: "relative",
              width: "100%",
              height: 88,
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.07)",
              border: `1px solid ${COULEURS.ligne}`,
              overflow: "hidden",
              opacity: interpolate(frame, [0.3 * fps, 1 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(...ENTREE),
              }),
            }}
          >
            {extraits.map((gauche, i) => (
              <div
                key={gauche}
                style={{
                  position: "absolute",
                  left: `${gauche}%`,
                  top: 0,
                  bottom: 0,
                  width: "15%",
                  borderRadius: 12,
                  backgroundColor: COULEURS.vert,
                  boxShadow: "0 0 30px rgba(16,185,129,0.55)",
                  opacity: interpolate(
                    frame,
                    [1.4 * fps + i * 8, 1.9 * fps + i * 8],
                    [0, 1],
                    {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                      easing: Easing.bezier(...ENTREE),
                    },
                  ),
                }}
              />
            ))}
            {/* Tete de lecture qui balaie la barre pendant l'analyse */}
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: 4,
                backgroundColor: COULEURS.texte,
                boxShadow: "0 0 20px rgba(255,255,255,0.8)",
                left: `${interpolate(frame, [0.9 * fps, 3.4 * fps], [0, 100], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.4, 0, 0.2, 1),
                })}%`,
                opacity: interpolate(
                  frame,
                  [0.9 * fps, 1.1 * fps, 3.2 * fps, 3.5 * fps],
                  [0, 1, 1, 0],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                ),
              }}
            />
          </Interactive.Div>
        </AbsoluteFill>

        {/* ── Partie basse : les clips qui en sortent ── */}
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "center",
            paddingBottom: 96,
          }}
        >
          <div style={{ display: "flex", gap: 26 }}>
            {CLIPS.map((fichier, i) => {
              const debut = 3.6 * fps + i * 7;
              return (
                <div
                  key={fichier}
                  style={{
                    width: 292,
                    height: 519,
                    borderRadius: 20,
                    overflow: "hidden",
                    border: `1px solid ${COULEURS.ligne}`,
                    backgroundColor: COULEURS.fondCarte,
                    boxShadow: "0 26px 60px rgba(0,0,0,0.55)",
                    opacity: interpolate(
                      frame,
                      [debut, debut + 0.5 * fps],
                      [0, 1],
                      {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                        easing: Easing.bezier(...ENTREE),
                      },
                    ),
                    translate: interpolate(
                      frame,
                      [debut, debut + 0.75 * fps],
                      ["0px -70px", "0px 0px"],
                      {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                        easing: Easing.bezier(...ENTREE),
                      },
                    ),
                    scale: interpolate(
                      frame,
                      [debut, debut + 0.75 * fps],
                      [0.88, 1],
                      {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                        easing: Easing.bezier(...ENTREE),
                        output: "perceptual-scale",
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

          <Interactive.Div
            name="Legende"
            style={{
              marginTop: 40,
              fontSize: 42,
              fontWeight: 700,
              color: COULEURS.texte,
              letterSpacing: "-0.02em",
              opacity: interpolate(frame, [6.2 * fps, 6.9 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(...ENTREE),
              }),
            }}
          >
            Recadrés en 9:16, sous-titrés,{" "}
            <span style={{ color: COULEURS.vert }}>prêts à publier.</span>
          </Interactive.Div>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
