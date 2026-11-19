import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Fond } from "../Fond";
import { SousTitreBrule } from "../SousTitreBrule";
import { COULEURS } from "../theme";

const ROUGE = "#f87171";

/**
 * PLAN 3 — le temps perdu a decouper a la main (6 → 9,2 s).
 *
 * La version precedente affichait un « 3 h » rouge geant avec le sous-titre
 * « a la decouper a la main ». Ca ne marchait pas : un chiffre est une
 * STATISTIQUE, pas un probleme. Rien a l'ecran ne montrait quelqu'un en train
 * de perdre son temps, et le sous-titre n'avait meme pas de sujet — le
 * spectateur muet lisait un fragment de phrase pose sous un nombre.
 *
 * Ce qui fait ressentir la perte de temps, c'est de VOIR le travail :
 *
 * 1. **Le curseur fait le boulot a la main.** Il descend la timeline, tire une
 *    selection, coupe, recommence. Six fois, de plus en plus vite. C'est le
 *    geste que reconnait immediatement quiconque a deja monte une video.
 * 2. **L'effort monte, le resultat non.** Les tentatives s'empilent en rouge
 *    delave : rejetees. Une seule finit en vert. Trois heures de travail pour
 *    un seul clip — ce qui prepare exactement le plan suivant (dix clips en
 *    soixante secondes).
 * 3. **Le chrono chiffre la facture** pendant que le curseur s'agite. Il monte
 *    a 3:00:00, en accord avec le sous-titre : aucun compteur n'en contredit
 *    un autre.
 * 4. **La 2e personne.** « Toi, tu passerais 3 h… » met le spectateur dans la
 *    scene ; « Trois heures a la decouper » ne parlait de personne.
 */

/**
 * Les tentatives de decoupe, dans l'ordre ou on les voit. Les ecarts entre
 * `debut` se resserrent (13, 11, 10, 9, 8 images) : le montage s'affole.
 */
const TENTATIVES = [
  { debut: 6, x: 4, largeur: 9, garde: false },
  { debut: 19, x: 20, largeur: 7, garde: false },
  { debut: 30, x: 33, largeur: 10, garde: false },
  { debut: 40, x: 49, largeur: 8, garde: true },
  { debut: 49, x: 63, largeur: 7, garde: false },
  { debut: 57, x: 77, largeur: 9, garde: false },
];

/** Images pour tirer la selection, puis pour rendre le verdict. */
const TIRAGE = 6;
const VERDICT = 9;

export const CoutManuel: React.FC = () => {
  const frame = useCurrentFrame();

  /* Chrono : 0 → 3 h. Il s'emballe avec les tentatives puis se fige, pour que
     le « 3 h » du sous-titre et le compteur disent la meme chose. */
  const secondes = interpolate(frame, [6, 70], [0, 10800], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.35, 0, 0.15, 1),
  });
  const chrono = `${Math.floor(secondes / 3600)}:${String(
    Math.floor((secondes % 3600) / 60),
  ).padStart(2, "0")}:${String(Math.floor(secondes % 60)).padStart(2, "0")}`;

  /* Le curseur suit la tentative en cours : il se pose au debut de la zone puis
     tire vers la droite. Entre deux tentatives il saute — c'est ce saut qui
     donne la sensation de fouiller la video a la main. */
  const active =
    [...TENTATIVES].reverse().find((t) => frame >= t.debut - 4) ?? TENTATIVES[0];
  const curseurX = interpolate(
    frame,
    [active.debut - 4, active.debut + TIRAGE],
    [active.x, active.x + active.largeur],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      <Audio src={staticFile("voix/t3-cout.mp3")} />
      <Fond intensite={0.3} />

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 90,
          paddingRight: 90,
          paddingBottom: 560,
        }}
      >
        <div
          style={{
            fontSize: 38,
            fontWeight: 700,
            color: COULEURS.texteDoux,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Temps passé
        </div>

        <div
          style={{
            fontSize: 158,
            fontWeight: 800,
            color: ROUGE,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            fontVariantNumeric: "tabular-nums",
            textShadow: "0 0 90px rgba(248,113,113,0.4)",
            marginBottom: 54,
          }}
        >
          {chrono}
        </div>

        <div style={{ position: "relative", width: "100%" }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 118,
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.06)",
              border: `1px solid ${COULEURS.ligne}`,
              overflow: "hidden",
            }}
          >
            {TENTATIVES.map((t) => {
              if (frame < t.debut - 4) return null;

              const largeur = interpolate(
                frame,
                [t.debut - 4, t.debut + TIRAGE],
                [0, t.largeur],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              );
              /* 0 = on tire encore la selection, 1 = le verdict est tombe. */
              const juge = interpolate(
                frame,
                [t.debut + VERDICT, t.debut + VERDICT + 5],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              );

              const cadre = {
                position: "absolute" as const,
                left: `${t.x}%`,
                top: 0,
                bottom: 0,
                width: `${largeur}%`,
                borderRadius: 10,
              };

              return (
                <div key={t.debut}>
                  {/* Selection en cours de tirage */}
                  <div
                    style={{
                      ...cadre,
                      backgroundColor: "rgba(255,255,255,0.34)",
                      border: "2px solid rgba(255,255,255,0.85)",
                      opacity: 1 - juge,
                    }}
                  />
                  {/* Verdict : rouge delave si rejete, vert plein si garde */}
                  <div
                    style={{
                      ...cadre,
                      backgroundColor: t.garde
                        ? COULEURS.vert
                        : "rgba(248,113,113,0.24)",
                      border: t.garde
                        ? "none"
                        : "2px solid rgba(248,113,113,0.7)",
                      boxShadow: t.garde
                        ? "0 0 40px rgba(16,185,129,0.7)"
                        : "none",
                      opacity: juge * (t.garde ? 1 : 0.85),
                    }}
                  />
                  {/* Eclair de coupe, 3 images */}
                  <div
                    style={{
                      position: "absolute",
                      left: `${t.x + t.largeur}%`,
                      top: -6,
                      bottom: -6,
                      width: 4,
                      backgroundColor: "#fff",
                      boxShadow: "0 0 26px rgba(255,255,255,0.95)",
                      opacity: interpolate(
                        frame,
                        [t.debut + TIRAGE, t.debut + TIRAGE + 3],
                        [1, 0],
                        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                      ),
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Le curseur : c'est lui qui porte le « a la main ». Le leger
              tremblement evite le glissement mecanique d'une animation. */}
          <div
            style={{
              position: "absolute",
              left: `${curseurX}%`,
              top: 52 + Math.sin(frame * 0.85) * 4,
              translate: "-8px 0",
            }}
          >
            <svg width="54" height="70" viewBox="0 0 20 26" fill="none">
              <path
                d="M3 2 L3 20.5 L7.7 16 L10.6 22.8 L13.6 21.5 L10.7 15 L16.8 15 Z"
                fill="#ffffff"
                stroke="#04120A"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </AbsoluteFill>

      <SousTitreBrule
        texte={"Toi, tu passerais 3 h à la découper"}
        debut={6}
        cadence={5}
        hauteur={60}
        taille={74}
        accent={["3 h"]}
        couleurAccent={ROUGE}
      />
    </AbsoluteFill>
  );
};
