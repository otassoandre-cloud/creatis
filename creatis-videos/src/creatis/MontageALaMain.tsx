import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { POLICE } from "./police";

/**
 * LE MONTAGE À LA MAIN — la douleur, montrée avant le remède.
 *
 * ── CE QUE C'EST, ET CE QUE CE N'EST PAS ─────────────────────────────────
 * Une timeline de montage générique, dessinée ici : pas de marque, pas de logo,
 * pas d'interface copiée. C'est volontaire et ce n'est pas de la prudence mal
 * placée — filmer le logiciel d'un concurrent pour le présenter comme « pourri »
 * engage la marque sur un terrain où elle n'a rien à gagner, et reproduire son
 * interface serait de toute façon faux dès sa prochaine mise à jour.
 *
 * Ce qu'on montre est ce que TOUS ces logiciels ont en commun, et ce que le
 * spectateur reconnaît en une demi-seconde : des pistes empilées, une forme
 * d'onde, une tête de lecture qui rampe, des dizaines de coupes à placer une
 * par une. Personne ne se demande de quel logiciel il s'agit — on voit
 * « montage », c'est tout ce qui compte.
 *
 * ── LE CHRONOMÈTRE ────────────────────────────────────────────────────────
 * Il monte vers 2 h 14. C'est l'ordre de grandeur que le produit remplace, déjà
 * utilisé dans la série (« trois heures de montage à la main »), et il est
 * affiché comme une durée de travail, pas comme une statistique : aucun chiffre
 * de marché n'est avancé ici.
 *
 * ── POURQUOI ÇA DOIT ÊTRE PÉNIBLE À REGARDER ─────────────────────────────
 * Trois secondes de timeline qui n'avance pas font le travail d'une phrase
 * entière. La tête de lecture progresse lentement, les coupes s'ajoutent une par
 * une, et rien n'est fluide. Le contraste avec la suite — l'application qui rend
 * dix clips — n'a alors plus besoin d'être expliqué.
 */

const GRIS_FOND = "#1b1d22";
const GRIS_PANNEAU = "#24272e";
const GRIS_LIGNE = "#33373f";
const GRIS_TEXTE = "#7d838f";

/** Les pistes de la timeline. Les largeurs sont tirées d'une suite stable :
    deux rendus successifs donnent la même image, ce qui rend la vidéo
    reproductible. */
const PISTES = [
  { nom: "V2", couleur: "#3f6ea8", n: 14 },
  { nom: "V1", couleur: "#4a7c59", n: 9 },
  { nom: "A1", couleur: "#8a6d3b", n: 6, onde: true },
];

export const MontageALaMain: React.FC<{ duree: number }> = ({ duree }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  /* La tête de lecture rampe : elle ne traverse même pas la moitié de la
     timeline pendant tout le plan. C'est le point. */
  const tete = interpolate(frame, [0, duree], [0.06, 0.34], {
    extrapolateRight: "clamp",
    easing: Easing.linear,
  });

  /* Les coupes apparaissent une par une, de gauche à droite — le geste que
     l'outil supprime. */
  const coupesVisibles = (n: number) =>
    Math.floor(interpolate(frame, [8, duree - 10], [0, n], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }));

  const chrono = () => {
    const total = interpolate(frame, [0, duree], [7_650, 8_040], {
      extrapolateRight: "clamp",
    });
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = Math.floor(total % 60);
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const entree = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const largeurUtile = width - 96;

  return (
    <AbsoluteFill style={{ fontFamily: POLICE }}>
      {/* Voile sombre : la fenêtre doit dominer le clip qui tourne derrière,
          sans l'éteindre — il reprend l'écran juste après. */}
      <AbsoluteFill style={{ backgroundColor: "rgba(4,6,10,0.80)" }} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            width: largeurUtile,
            backgroundColor: GRIS_FOND,
            borderRadius: 18,
            overflow: "hidden",
            border: `1px solid ${GRIS_LIGNE}`,
            boxShadow: "0 40px 120px rgba(0,0,0,0.85)",
            opacity: entree,
            transform: `translateY(${interpolate(entree, [0, 1], [40, 0])}px)`,
          }}
        >
          {/* Barre de fenêtre, sans nom de logiciel — et sans extension de
              fichier non plus : `.prproj` designe un logiciel precis, ce qui
              reintroduit par la petite porte la marque qu'on avait ecartee. */}
          <div
            style={{
              height: 54,
              backgroundColor: GRIS_PANNEAU,
              borderBottom: `1px solid ${GRIS_LIGNE}`,
              display: "flex",
              alignItems: "center",
              paddingLeft: 22,
              gap: 10,
            }}
          >
            {["#e05c4a", "#dfa32c", "#4aa35c"].map((c) => (
              <div key={c} style={{ width: 16, height: 16, borderRadius: 999, backgroundColor: c }} />
            ))}
            <div style={{ marginLeft: 18, fontSize: 24, color: GRIS_TEXTE, fontWeight: 600 }}>
              sequence_01 — projet_clips
            </div>
          </div>

          {/* Le moniteur et le chronomètre. */}
          <div style={{ display: "flex", borderBottom: `1px solid ${GRIS_LIGNE}` }}>
            <div
              style={{
                flex: 1,
                height: 300,
                backgroundColor: "#0d0f13",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRight: `1px solid ${GRIS_LIGNE}`,
              }}
            >
              <div
                style={{
                  width: 148,
                  height: 264,
                  border: `2px dashed ${GRIS_LIGNE}`,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: GRIS_TEXTE,
                  fontSize: 22,
                  fontWeight: 600,
                  textAlign: "center",
                  padding: 12,
                }}
              >
                recadrer
                <br />à la main
              </div>
            </div>
            <div
              style={{
                width: 300,
                padding: "26px 24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 22, color: GRIS_TEXTE, fontWeight: 700, letterSpacing: "0.1em" }}>
                TEMPS PASSÉ
              </div>
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 900,
                  color: "#e6e8ec",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.03em",
                }}
              >
                {chrono()}
              </div>
              <div style={{ fontSize: 22, color: GRIS_TEXTE, fontWeight: 600 }}>
                1 clip sur 10
              </div>
            </div>
          </div>

          {/* La timeline. */}
          <div style={{ padding: "18px 22px 26px", position: "relative" }}>
            {PISTES.map((piste, ip) => (
              <div key={piste.nom} style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                <div style={{ width: 54, fontSize: 22, color: GRIS_TEXTE, fontWeight: 700 }}>
                  {piste.nom}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 58,
                    backgroundColor: "#15171c",
                    borderRadius: 6,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {Array.from({ length: piste.n }).map((_, i) => {
                    if (i >= coupesVisibles(piste.n)) return null;
                    const g = random(`${piste.nom}-${i}-g`) * 78;
                    const l = 3 + random(`${piste.nom}-${i}-l`) * 7;
                    return (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          left: `${g}%`,
                          width: `${l}%`,
                          top: 4,
                          bottom: 4,
                          backgroundColor: piste.couleur,
                          borderRadius: 4,
                          border: "1px solid rgba(255,255,255,0.18)",
                          opacity: piste.onde ? 0.85 : 1,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            {/* La tête de lecture, qui n'avance pas. */}
            <div
              style={{
                position: "absolute",
                top: 12,
                bottom: 18,
                left: `calc(22px + 54px + ${tete * 100}%)`,
                width: 3,
                backgroundColor: "#e6e8ec",
                boxShadow: "0 0 12px rgba(255,255,255,0.5)",
              }}
            />
          </div>
        </div>
      </AbsoluteFill>

      {/* La phrase, sous la fenêtre. Elle nomme ce qu'on regarde : sans elle, le
          spectateur reconnaît « du montage » mais pas « ton montage ».
          430 px du bas et non 300 : le clip tourne derrière avec SES sous-titres
          incrustés à 74 %, et les deux textes se chevauchaient. */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 430,
          paddingLeft: 70,
          paddingRight: 70,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
            opacity: interpolate(frame, [14, 26], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            WebkitTextStroke: "8px rgba(0,0,0,0.55)",
            paintOrder: "stroke fill",
          }}
        >
          découper, recadrer, sous-titrer
          <br />
          dix fois
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
