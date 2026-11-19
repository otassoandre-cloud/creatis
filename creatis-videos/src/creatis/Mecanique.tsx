import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { POLICE } from "./police";
import { COULEURS } from "./theme";

/**
 * LA MÉCANIQUE — 1080x1920, 16 s, MUET. Motion design, zéro capture d'écran.
 *
 * ── POURQUOI CE FORMAT, APRÈS CE QUI A ÉTÉ MESURÉ ────────────────────────
 * Les pièces publiées jusqu'ici ÉNONÇAIENT : « un clip qui marche ne montre pas
 * tout », « tu as trois secondes ». Ce sont des slogans. Le spectateur n'y
 * apprend rien qu'il puisse faire, et il part.
 *
 * Celle-ci MONTRE le mécanisme, étape par étape : la vidéo longue, le balayage
 * qui lit la transcription, les moments qui s'allument avec leur note, celui
 * qu'on garde qui se détache et bascule du 16:9 au 9:16, les sous-titres qui
 * s'incrustent. On comprend comment ça marche en le regardant — et on peut
 * appliquer le raisonnement à la main.
 *
 * ── TOUT EST DESSINÉ ─────────────────────────────────────────────────────
 * Aucune capture, aucun enregistrement : des rectangles, des dégradés, du
 * texte. C'est ce qui permet le mouvement propre — un enregistrement d'écran ne
 * se plie pas, ne se recadre pas en douceur, et vieillit à chaque refonte du
 * produit. Un schéma animé, lui, reste juste.
 *
 * ── LES RÈGLES DE MOUVEMENT TENUES ICI ───────────────────────────────────
 *  1. Rien n'apparaît brutalement : tout entre par un ressort amorti, et les
 *     éléments d'une même famille entrent en CASCADE (40 ms d'écart), jamais
 *     ensemble. L'œil suit une direction au lieu de subir un clignotement.
 *  2. Une seule chose bouge à la fois. Quand la barre se remplit, le texte est
 *     immobile ; quand le clip bascule, le reste s'efface.
 *  3. Les transformations portent le sens : le moment retenu ne « disparaît
 *     puis réapparaît », il SE DÉPLACE et change de forme. C'est ce qui fait
 *     comprendre que c'est le même objet.
 *  4. Les durées sont lisibles : 0,5 s pour une entrée, 1,2 s pour une
 *     transformation. En dessous on ne voit rien, au-dessus on s'ennuie.
 *
 * ── ZONES SÛRES 1080x1920 ────────────────────────────────────────────────
 *   0 -> 16 %    barre d'état et onglets
 *   16 -> 78 %   zone libre — toute la démonstration y tient
 *   > 78 %       légende, pseudo, bandeau musical
 */

const FPS = 30;
export const DUREE_MECANIQUE = 16 * FPS; // 480 images

/** Les cinq moments détectés, avec leur note. Les deux derniers seront écartés. */
const MOMENTS = [
  { x: 0.08, l: 0.13, note: 92, garde: true },
  { x: 0.28, l: 0.10, note: 88, garde: false },
  { x: 0.46, l: 0.14, note: 90, garde: false },
  { x: 0.67, l: 0.11, note: 85, garde: false },
  { x: 0.83, l: 0.12, note: 83, garde: false },
];

/** Les mots des sous-titres, incrustés un par un à la fin. */
const SOUS_TITRES = ["ON", "A", "DÉCIDÉ", "DE", "TOUT", "ARRÊTER"];

/** Repères de la narration, en secondes. */
const T = {
  barre: 0.3,      // la vidéo longue apparaît
  balayage: 2.2,   // le balayage lit la transcription
  notes: 5.0,      // les moments s'allument avec leur note
  choix: 7.6,      // tout s'éteint sauf celui qu'on garde
  bascule: 9.0,    // il se détache et passe en vertical
  soustitres: 11.8,
  fin: 14.2,
};

/** Ressort standard : ferme, sans rebond parasite. */
const entree = (frame: number, fps: number, retard = 0) =>
  spring({ frame: frame - retard, fps, config: { damping: 26, stiffness: 140, mass: 0.7 } });

export const Mecanique: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const s = frame / fps;

  /* La barre : 16:9 posée au tiers haut, comme une timeline de montage. */
  const barreL = width * 0.82;
  const barreH = Math.round((barreL * 9) / 16);
  const barreX = (width - barreL) / 2;
  const barreY = height * 0.26;

  const apparBarre = entree(frame, fps, T.barre * fps);

  /* Le balayage : une colonne lumineuse qui traverse la barre une seule fois.
     C'est LE geste qui dit « elle lit » — sans lui, les notes tomberaient du
     ciel et la vidéo n'expliquerait rien. */
  const balayage = interpolate(s, [T.balayage, T.notes - 0.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  /* Après le choix, les moments non retenus s'éteignent. */
  const extinction = interpolate(s, [T.choix, T.choix + 0.7], [1, 0.12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /* La bascule : le moment gardé quitte la barre, grandit, et passe du 16:9 au
     9:16. Une seule interpolation porte les trois changements à la fois — c'est
     ce qui donne l'impression d'un objet unique qui se transforme, et non d'un
     objet qui disparaît pour qu'un autre apparaisse. */
  const bascule = interpolate(s, [T.bascule, T.bascule + 1.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  const m = MOMENTS[0];
  const departL = barreL * m.l;
  const departH = barreH;
  const departX = barreX + barreL * m.x;
  const departY = barreY;

  const arriveeL = width * 0.52;
  const arriveeH = Math.round((arriveeL * 16) / 9);
  const arriveeX = (width - arriveeL) / 2;
  const arriveeY = height * 0.30;

  const clipL = interpolate(bascule, [0, 1], [departL, arriveeL]);
  const clipH = interpolate(bascule, [0, 1], [departH, arriveeH]);
  const clipX = interpolate(bascule, [0, 1], [departX, arriveeX]);
  const clipY = interpolate(bascule, [0, 1], [departY, arriveeY]);

  const barreVisible = interpolate(s, [T.bascule + 0.2, T.bascule + 0.9], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const finale = entree(frame, fps, T.fin * fps);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 80% at 50% 12%, #0e1a14 0%, ${COULEURS.fond} 58%)`,
        fontFamily: POLICE,
      }}
    >
      {/* ── Le titre de l'étape, en haut ── */}
      <Legende s={s} width={width} height={height} />

      {/* ── LA VIDÉO LONGUE ── */}
      <div
        style={{
          position: "absolute",
          left: barreX,
          top: barreY,
          width: barreL,
          height: barreH,
          opacity: apparBarre * barreVisible,
          transform: `scale(${interpolate(apparBarre, [0, 1], [0.94, 1])})`,
          borderRadius: 18,
          background: "linear-gradient(160deg, #141c22 0%, #0d1317 100%)",
          border: `1px solid ${COULEURS.ligne}`,
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        }}
      >
        {/* La forme d'onde : des barres verticales de hauteurs variées. C'est le
            raccourci visuel universel pour « il y a du son, donc de la parole ». */}
        <Onde largeur={barreL} hauteur={barreH} apparition={apparBarre} />

        {/* Les moments détectés, qui s'allument en cascade. */}
        {MOMENTS.map((mo, i) => {
          const a = entree(frame, fps, (T.notes + i * 0.14) * fps);
          const vivant = mo.garde ? 1 : extinction;
          return (
            <div
              key={mo.x}
              style={{
                position: "absolute",
                left: barreL * mo.x,
                top: 0,
                width: barreL * mo.l,
                height: "100%",
                opacity: a * vivant,
                background: mo.garde
                  ? "linear-gradient(180deg, rgba(16,185,129,0.34), rgba(16,185,129,0.14))"
                  : "rgba(255,255,255,0.10)",
                borderLeft: `2px solid ${mo.garde ? COULEURS.vert : "rgba(255,255,255,0.3)"}`,
                borderRight: `2px solid ${mo.garde ? COULEURS.vert : "rgba(255,255,255,0.3)"}`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: 0,
                  right: 0,
                  textAlign: "center",
                  fontSize: 30,
                  fontWeight: 800,
                  color: mo.garde ? COULEURS.vertClair : "rgba(255,255,255,0.75)",
                  transform: `translateY(${interpolate(a, [0, 1], [10, 0])}px)`,
                }}
              >
                {mo.note}
              </div>
            </div>
          );
        })}

        {/* Le balayage, par-dessus tout le reste. */}
        {balayage > 0 && balayage < 1 ? (
          <div
            style={{
              position: "absolute",
              left: barreL * balayage - 2,
              top: 0,
              width: 4,
              height: "100%",
              background: COULEURS.vertClair,
              boxShadow: `0 0 28px 8px ${COULEURS.vert}`,
            }}
          />
        ) : null}
      </div>

      {/* ── LE CLIP RETENU : il se détache et bascule en vertical ── */}
      {s >= T.bascule - 0.1 ? (
        <div
          style={{
            position: "absolute",
            left: clipX,
            top: clipY,
            width: clipL,
            height: clipH,
            borderRadius: interpolate(bascule, [0, 1], [8, 22]),
            overflow: "hidden",
            background: "linear-gradient(160deg, #18242b 0%, #0c1216 100%)",
            border: `2px solid ${COULEURS.vert}`,
            boxShadow: `0 30px 70px rgba(0,0,0,0.6), 0 0 ${interpolate(bascule, [0, 1], [0, 40])}px rgba(16,185,129,0.25)`,
          }}
        >
          <Onde largeur={clipL} hauteur={clipH} apparition={1} dense />

          {/* La note reste collée au clip : c'est elle qui prouve que c'est le
              MÊME objet qu'on a vu dans la barre. */}
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              background: COULEURS.vert,
              color: "#04150d",
              padding: "6px 14px",
              borderRadius: 10,
              fontSize: interpolate(bascule, [0, 1], [22, 38]),
              fontWeight: 800,
            }}
          >
            {m.note}
          </div>

          {/* Les sous-titres, mot par mot, dans le bas du clip vertical. */}
          <div
            style={{
              position: "absolute",
              bottom: "14%",
              left: 0,
              right: 0,
              textAlign: "center",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 10,
              padding: "0 18px",
            }}
          >
            {SOUS_TITRES.map((mot, i) => {
              const a = entree(frame, fps, (T.soustitres + i * 0.13) * fps);
              return (
                <span
                  key={mot + i}
                  style={{
                    opacity: a,
                    transform: `translateY(${interpolate(a, [0, 1], [14, 0])}px) scale(${interpolate(a, [0, 1], [0.9, 1])})`,
                    color: i === 2 ? COULEURS.vertClair : "#fff",
                    fontSize: 38,
                    fontWeight: 800,
                    textShadow: "0 2px 10px rgba(0,0,0,0.9)",
                  }}
                >
                  {mot}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── SOUS LA BARRE : la règle du temps, puis le compte des moments ──
          La moitié basse du cadre restait vide pendant les quatre premiers
          temps. On n'y met pas du décor : on y met ce qui manquait à la
          démonstration — l'échelle (une barre, c'est 47 minutes) et le résultat
          chiffré (cinq moments retenus). Sans l'échelle, le spectateur ne sait
          pas si on parle d'une minute ou d'une heure. */}
      {s < T.bascule ? (
        <div
          style={{
            position: "absolute",
            left: barreX,
            top: barreY + barreH + 26,
            width: barreL,
            opacity: apparBarre * barreVisible,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {["0:00", "12:00", "24:00", "36:00", "47:00"].map((t) => (
              <div key={t} style={{ textAlign: "center" }}>
                <div style={{ width: 2, height: 12, background: "rgba(255,255,255,0.28)", margin: "0 auto 8px" }} />
                <span style={{ color: COULEURS.texteDoux, fontSize: 26, fontWeight: 600 }}>{t}</span>
              </div>
            ))}
          </div>

          {/* Le compte apparaît AVEC les notes, et le chiffre monte de 0 à 5 :
              un nombre qui s'incrémente se regarde, un nombre posé ne se lit pas. */}
          <div
            style={{
              marginTop: 58,
              textAlign: "center",
              opacity: interpolate(s, [T.notes, T.notes + 0.4], [0, 1], {
                extrapolateLeft: "clamp", extrapolateRight: "clamp",
              }),
            }}
          >
            <div style={{ fontSize: 150, fontWeight: 800, color: COULEURS.vertClair, lineHeight: 1 }}>
              {Math.min(5, Math.max(0, Math.floor((s - T.notes) / 0.14) + 1))}
            </div>
            <div style={{ fontSize: 40, fontWeight: 600, color: COULEURS.texteDoux, marginTop: 10 }}>
              moments qui se tiennent seuls
            </div>
          </div>
        </div>
      ) : null}

      {/* ── La signature ── */}
      <div
        style={{
          position: "absolute",
          bottom: height * 0.14,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: finale,
          transform: `translateY(${interpolate(finale, [0, 1], [18, 0])}px)`,
        }}
      >
        <span
          style={{
            background: COULEURS.vert,
            color: "#04150d",
            padding: "16px 34px",
            borderRadius: 14,
            fontSize: 50,
            fontWeight: 800,
          }}
        >
          creatis.app
        </span>
      </div>
    </AbsoluteFill>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   La forme d'onde. Des barres déterministes — surtout pas de hasard, qui
   changerait à chaque image et ferait grésiller l'affichage.
   ───────────────────────────────────────────────────────────────────────── */
const Onde: React.FC<{ largeur: number; hauteur: number; apparition: number; dense?: boolean }> = ({
  largeur, hauteur, apparition, dense,
}) => {
  const pas = dense ? 9 : 13;
  const n = Math.max(8, Math.floor(largeur / pas));
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 10px",
        opacity: apparition * 0.55,
      }}
    >
      {Array.from({ length: n }).map((_, i) => {
        /* Somme de deux sinus de périodes premières entre elles : le motif ne se
           répète pas à l'œil, et il est identique d'une image à l'autre. */
        const h = 0.18 + 0.34 * Math.abs(Math.sin(i * 0.37)) + 0.26 * Math.abs(Math.sin(i * 0.11));
        return (
          <div
            key={i}
            style={{
              width: Math.max(2, pas - 5),
              height: hauteur * h,
              borderRadius: 3,
              background: "rgba(173, 228, 205, 0.5)",
            }}
          />
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   La légende du haut. Une phrase par étape, qui se remplace sans coupure.
   Elle NOMME ce que l'image est en train de montrer — c'est ce qui transforme
   une animation jolie en explication.
   ───────────────────────────────────────────────────────────────────────── */
const ETAPES: { a: number; texte: string }[] = [
  { a: T.barre, texte: "Une vidéo de 47 minutes." },
  { a: T.balayage, texte: "L'IA lit la transcription, pas l'image." },
  { a: T.notes, texte: "Elle note chaque moment qui se tient tout seul." },
  { a: T.choix, texte: "Tu gardes celui que tu veux." },
  { a: T.bascule, texte: "Il passe en vertical, recadré." },
  { a: T.soustitres, texte: "Sous-titres incrustés, mot par mot." },
];

const Legende: React.FC<{ s: number; width: number; height: number }> = ({ s, width, height }) => {
  const i = ETAPES.reduce((acc, e, k) => (s >= e.a ? k : acc), 0);
  const e = ETAPES[i];
  const suiv = ETAPES[i + 1];
  const dedans = interpolate(s - e.a, [0, 0.32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dehors = suiv
    ? interpolate(s, [suiv.a - 0.38, suiv.a - 0.08], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;
  const o = Math.min(dedans, dehors);
  return (
    <div
      style={{
        position: "absolute",
        top: height * 0.17,
        left: width * 0.08,
        right: width * 0.08,
        textAlign: "center",
        opacity: o,
        transform: `translateY(${interpolate(o, [0, 1], [14, 0])}px)`,
        color: "#fff",
        fontSize: 64,
        fontWeight: 800,
        lineHeight: 1.12,
        letterSpacing: -1.2,
      }}
    >
      {e.texte}
    </div>
  );
};
