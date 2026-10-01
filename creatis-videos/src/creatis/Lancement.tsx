import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
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
 * LANCEMENT — film de présentation de Créatis. 1920x1080, 32 s, voix off.
 *
 * ── CE QUE C'EST ─────────────────────────────────────────────────────────
 * Une PUB : un film de lancement qui présente le produit et ce qu'il permet.
 * Pas un tutoriel — un tutoriel apprend un geste, une pub donne une raison.
 *
 * ── L'ANGLE : L'ARGENT, PAS LE TEMPS GAGNÉ ───────────────────────────────
 * « Une heure de montage en trois minutes » a été écarté : tous les outils de
 * la catégorie le disent. L'angle retenu est le marché — les marques paient
 * pour être clippées, et il y a une échéance datée. Chiffres relevés : 1,4
 * million de dollars versés à 303 personnes, GTA 6 le 19 novembre.
 *
 * ── TROIS CORRECTIONS DE LA PREMIÈRE VERSION ─────────────────────────────
 * Le premier jet était juste mais INERTE : des plans fixes qui se succédaient
 * en fondu, et aucun vrai clip à l'écran. Trois choses ont changé.
 *
 *  1. RIEN N'EST IMMOBILE. Chaque plan avance d'un lent travelling avant
 *     (1,00 → 1,07 sur sa durée). Un plan fixe de trois secondes dans une pub
 *     se lit comme une image arrêtée, et l'œil décroche.
 *
 *  2. LES PLANS SE COUPENT, ILS NE SE FONDENT PAS. À chaque bascule, le plan
 *     sortant part d'un côté en grandissant, l'entrant arrive de l'autre. 0,28 s.
 *     Un fondu enchaîné dit « rien n'a changé » ; une coupe dit « regarde ».
 *
 *  3. DE VRAIS CLIPS. Le passage produit montre quatre sorties réelles de
 *     l'application, avec leurs notes. C'est la seule preuve qui vaille — un
 *     rectangle gris ne convainc personne d'essayer un outil.
 *
 * ── LE COMPTE À REBOURS SE CALCULE ───────────────────────────────────────
 * Le nombre de jours n'est pas écrit en dur : il est calculé à la date du
 * rendu. Un film qui annoncerait « 49 jours » en décembre serait un mensonge.
 *
 * ── LE SILENCE EST VOULU ─────────────────────────────────────────────────
 * La voix dure 22,5 s dans un film de 32. Elle commence à 2 s et finit à 24,5 :
 * ouverture muette pour poser l'image, chute muette pour laisser l'adresse
 * s'imprimer. Une pub qui parle du début à la fin ne respire pas.
 *
 * ── RÈGLES DU 16:9 ───────────────────────────────────────────────────────
 * Grande dalle, pas téléphone : pleine image, typographie mesurée, rien
 * d'important sous 88 % ni dans le coin haut-droit.
 */

const FPS = 30;
export const DUREE_LANCEMENT = 32 * FPS; // 960 images

const VOIX_A = 2.0;
const SORTIE_GTA = new Date("2026-11-19T00:00:00Z");

/** Les bornes des plans, en secondes. Calées sur les frontières de la voix. */
const PLANS = [
  { a: 0.0, b: 2.0, id: "ouverture" },
  { a: 2.0, b: 4.1, id: "marques" },
  { a: 4.1, b: 7.9, id: "chiffre" },
  { a: 7.9, b: 10.8, id: "clips" },
  { a: 10.8, b: 14.6, id: "echeance" },
  { a: 14.6, b: 18.2, id: "volume" },
  { a: 18.2, b: 23.1, id: "produit" },
  { a: 23.1, b: 25.4, id: "choix" },
  { a: 25.4, b: 32.0, id: "adresse" },
] as const;

/** Nos vraies sorties, avec la note que l'application leur a donnée. */
const VRAIS_CLIPS = [
  { f: "clip-fastfood-2809.mp4", a: 2, note: 92 },
  { f: "clip-66k.mp4", a: 1, note: 91 },
  { f: "clip-mate.mp4", a: 3, note: 89 },
  { f: "clip-lamenace.mp4", a: 2, note: 87 },
];

/** Durée d'une coupe. Plus court et on ne la voit pas ; plus long et ça traîne. */
const COUPE = 0.28;

const ressort = (frame: number, fps: number, retard = 0) =>
  spring({ frame: frame - retard, fps, config: { damping: 28, stiffness: 130, mass: 0.8 } });

/**
 * L'enveloppe d'un plan : son opacité, son avancée (travelling) et son
 * décalage d'entrée/sortie. Tout le mouvement du film passe par ici, ce qui
 * garantit que deux plans ne bougent jamais selon deux logiques différentes.
 */
const usePlan = (s: number, id: string) => {
  const p = PLANS.find((x) => x.id === id)!;
  const i = PLANS.indexOf(p);
  const visible = s >= p.a - COUPE && s <= p.b + 0.02;

  /* Entrée : arrive depuis la droite en rétrécissant légèrement.
     Sortie : part vers la gauche en grandissant. Le sens alterne d'un plan à
     l'autre pour que la succession ne devienne pas un défilement monotone. */
  const sens = i % 2 === 0 ? 1 : -1;
  const entre = interpolate(s, [p.a - COUPE, p.a + 0.04], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });
  const sort = interpolate(s, [p.b - COUPE, p.b], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic),
  });

  /* Le travelling avant, continu sur toute la durée du plan. */
  const avance = interpolate(s, [p.a, p.b], [1, 1.07], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const echelle = avance * interpolate(entre, [0, 1], [0.94, 1]) * interpolate(sort, [0, 1], [1, 1.1]);
  const dx = interpolate(entre, [0, 1], [90 * sens, 0]) + interpolate(sort, [0, 1], [0, -70 * sens]);
  const opacite = Math.min(entre, 1 - sort);

  return { visible, style: { opacity: opacite, transform: `translateX(${dx}px) scale(${echelle})` } };
};

export const Lancement: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const s = frame / fps;
  const jours = Math.max(0, Math.ceil((SORTIE_GTA.getTime() - Date.now()) / 86400000));

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(130% 90% at 50% 0%, #0f1f18 0%, ${COULEURS.fond} 62%)`,
        fontFamily: POLICE,
        color: "#fff",
        overflow: "hidden",
      }}
    >
      <Ouverture s={s} width={width} height={height} />
      <Marques s={s} width={width} height={height} />
      <Chiffre s={s} frame={frame} fps={fps} width={width} height={height} />
      <Eclatement s={s} width={width} height={height} />
      <Echeance s={s} frame={frame} fps={fps} jours={jours} width={width} height={height} />
      <Volume s={s} frame={frame} fps={fps} width={width} height={height} />
      <Produit s={s} frame={frame} fps={fps} width={width} height={height} />
      <Choix s={s} width={width} height={height} />
      <Adresse s={s} frame={frame} fps={fps} width={width} height={height} />

      {/* ── LA NAPPE, SOUS LA VOIX ──────────────────────────────────────
          Mesuré : la nappe sort à -21 dB et la voix à -18. Posée telle quelle
          elle couvrirait la parole. À 30 % elle redescend d'une dizaine de
          décibels — assez pour tenir le film, pas assez pour qu'on l'écoute.
          C'est le bon réglage d'une musique de fond : on doit la remarquer
          seulement quand elle s'arrête.

          Elle est SYNTHÉTISÉE (nappe de quatre sinus, tremolo lent, écho court)
          et non prise dans une bibliothèque : aucun risque de droits, et elle
          dure exactement la longueur du film. */}
      <Audio src={staticFile("musique/nappe-lancement.mp3")} volume={0.3} />

      <Sequence from={Math.round(VOIX_A * FPS)} name="Voix off">
        <Audio src={staticFile("voix/lancement.mp3")} />
      </Sequence>
    </AbsoluteFill>
  );
};

/* ───────────────────────────────────────────────────────────────────────── */

const Ouverture: React.FC<{ s: number; width: number; height: number }> = ({ s, width, height }) => {
  const { visible, style } = usePlan(s, "ouverture");
  const trace = interpolate(s, [0.2, 1.5], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic),
  });
  if (!visible) return null;
  return (
    <AbsoluteFill style={style}>
      <div
        style={{
          position: "absolute",
          top: height * 0.5,
          left: width * 0.5 - (width * 0.64 * trace) / 2,
          width: width * 0.64 * trace,
          height: 5,
          borderRadius: 3,
          background: `linear-gradient(90deg, transparent, ${COULEURS.vert}, transparent)`,
          boxShadow: "0 0 60px 14px rgba(16,185,129,0.4)",
        }}
      />
    </AbsoluteFill>
  );
};

const Marques: React.FC<{ s: number; width: number; height: number }> = ({ s, width, height }) => {
  const { visible, style } = usePlan(s, "marques");
  if (!visible) return null;
  return (
    <AbsoluteFill style={style}>
      <div
        style={{
          position: "absolute",
          top: height * 0.42,
          left: width * 0.1,
          right: width * 0.1,
          textAlign: "center",
          fontSize: 96,
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: -2,
        }}
      >
        Les marques paient pour être clippées.
      </div>
    </AbsoluteFill>
  );
};

const Chiffre: React.FC<{ s: number; frame: number; fps: number; width: number; height: number }> = ({
  s, frame, fps, height,
}) => {
  const { visible, style } = usePlan(s, "chiffre");
  const montee = interpolate(s, [4.2, 6.1], [0, 1400000], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });
  const sous = ressort(frame, fps, 6.3 * fps);
  if (!visible) return null;
  return (
    <AbsoluteFill style={style}>
      <div
        style={{
          position: "absolute", top: height * 0.33, left: 0, right: 0, textAlign: "center",
          fontSize: 200, fontWeight: 800, letterSpacing: -6,
          color: COULEURS.vertClair, textShadow: "0 10px 70px rgba(16,185,129,0.35)",
        }}
      >
        {Math.round(montee).toLocaleString("fr-FR")} $
      </div>
      <div
        style={{
          position: "absolute", top: height * 0.59, left: 0, right: 0, textAlign: "center",
          fontSize: 58, fontWeight: 600, color: COULEURS.texteDoux,
          opacity: sous, transform: `translateY(${interpolate(sous, [0, 1], [18, 0])}px)`,
        }}
      >
        versés à 303 personnes
      </div>
    </AbsoluteFill>
  );
};

const Eclatement: React.FC<{ s: number; width: number; height: number }> = ({ s, width, height }) => {
  const { visible, style } = usePlan(s, "clips");
  const ecarte = interpolate(s, [8.3, 9.5], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic),
  });
  if (!visible) return null;
  const n = 7;
  const totalL = width * 0.72;
  const blocL = totalL / n;
  return (
    <AbsoluteFill style={style}>
      <div
        style={{
          position: "absolute", top: height * 0.42,
          left: (width - totalL) / 2, width: totalL, height: 128, display: "flex",
        }}
      >
        {Array.from({ length: n }).map((_, i) => (
          <div
            key={i}
            style={{
              width: blocL - ecarte * 18,
              height: "100%",
              marginRight: ecarte * 18,
              borderRadius: 4 + ecarte * 12,
              background: i === 2
                ? `linear-gradient(180deg, ${COULEURS.vert}, ${COULEURS.vertSombre})`
                : "rgba(255,255,255,0.14)",
              transform: `translateY(${ecarte * (i % 2 === 0 ? -18 : 18)}px)`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute", top: height * 0.63, left: 0, right: 0, textAlign: "center",
          fontSize: 64, fontWeight: 700,
        }}
      >
        Pas des vidéos. Des clips de trente secondes.
      </div>
    </AbsoluteFill>
  );
};

const Echeance: React.FC<{
  s: number; frame: number; fps: number; jours: number; width: number; height: number;
}> = ({ s, frame, fps, jours, height }) => {
  const { visible, style } = usePlan(s, "echeance");
  const a = ressort(frame, fps, 11.1 * fps);
  if (!visible) return null;
  return (
    <AbsoluteFill style={style}>
      <div
        style={{
          position: "absolute", top: height * 0.28, left: 0, right: 0, textAlign: "center",
          fontSize: 88, fontWeight: 800, letterSpacing: -2,
        }}
      >
        GTA 6 — 19 novembre
      </div>
      <div
        style={{
          position: "absolute", top: height * 0.45, left: 0, right: 0, textAlign: "center",
          opacity: a, transform: `scale(${interpolate(a, [0, 1], [0.78, 1])})`,
        }}
      >
        <span style={{ fontSize: 220, fontWeight: 800, color: COULEURS.vertClair, letterSpacing: -8 }}>
          {jours}
        </span>
        <span style={{ fontSize: 70, fontWeight: 700, color: COULEURS.texteDoux, marginLeft: 22 }}>
          jours
        </span>
      </div>
      <div
        style={{
          position: "absolute", top: height * 0.77, left: 0, right: 0, textAlign: "center",
          fontSize: 52, fontWeight: 600, color: COULEURS.texteDoux,
        }}
      >
        La fenêtre est ouverte maintenant.
      </div>
    </AbsoluteFill>
  );
};

const Volume: React.FC<{ s: number; frame: number; fps: number; width: number; height: number }> = ({
  s, frame, fps, width, height,
}) => {
  const { visible, style } = usePlan(s, "volume");
  if (!visible) return null;
  /* Même correction : trois rangées doivent tenir entre 17 % et 76 % de la
     hauteur. On calcule la case à partir de là, et la largeur suit. */
  const cols = 10;
  const lignes = 3;
  const caseH = (height * 0.59 - 20) / lignes;
  const caseL = caseH / 1.6;
  return (
    <AbsoluteFill style={style}>
      <div
        style={{
          position: "absolute", top: height * 0.17,
          left: (width - caseL * cols) / 2,
          display: "grid", gridTemplateColumns: `repeat(${cols}, ${caseL}px)`, gap: 10,
        }}
      >
        {Array.from({ length: cols * lignes }).map((_, i) => {
          const a = ressort(frame, fps, (14.8 + i * 0.028) * fps);
          return (
            <div
              key={i}
              style={{
                width: caseL - 10, height: caseH - 10, borderRadius: 8,
                background: "linear-gradient(170deg, #17222a, #0d1418)",
                border: `1px solid ${COULEURS.ligne}`,
                opacity: a, transform: `scale(${interpolate(a, [0, 1], [0.68, 1])})`,
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          position: "absolute", top: height * 0.82, left: 0, right: 0, textAlign: "center",
          fontSize: 60, fontWeight: 700,
        }}
      >
        Il en faut des dizaines. Chaque semaine.
      </div>
    </AbsoluteFill>
  );
};

/**
 * Le passage produit : NOS VRAIS CLIPS, qui jouent.
 * Un rectangle gris ne convainc personne — ce sont quatre sorties réelles de
 * l'application, avec la note qu'elle leur a donnée.
 */
const Produit: React.FC<{ s: number; frame: number; fps: number; width: number; height: number }> = ({
  s, frame, fps, width, height,
}) => {
  const { visible, style } = usePlan(s, "produit");
  if (!visible) return null;

  const champ = ressort(frame, fps, 18.3 * fps);
  const carteL = width * 0.5;

  /* On dimensionne par la HAUTEUR disponible, pas par la largeur : un premier
     jet partait de la largeur et les clips descendaient jusqu'à 88 %, par-dessus
     la légende. La bande utile va de 22 % à 78 %, soit 56 % de la hauteur. */
  const clipH = Math.round(height * 0.56);
  const clipL = Math.round((clipH * 9) / 16);
  const total = clipL * VRAIS_CLIPS.length + 26 * (VRAIS_CLIPS.length - 1);

  return (
    <AbsoluteFill style={style}>
      {/* L'adresse qu'on colle */}
      <div
        style={{
          position: "absolute", top: height * 0.13, left: (width - carteL) / 2, width: carteL,
          height: 86, borderRadius: 14, background: "#0e1519",
          border: `2px solid ${COULEURS.vert}`,
          display: "flex", alignItems: "center", paddingLeft: 28,
          fontSize: 38, color: COULEURS.texteDoux,
          opacity: champ, transform: `translateY(${interpolate(champ, [0, 1], [20, 0])}px)`,
        }}
      >
        youtube.com/watch?v=…
      </div>

      {/* Les quatre clips réels, en cascade */}
      <div
        style={{
          position: "absolute", top: height * 0.22, left: (width - total) / 2,
          display: "flex", gap: 26,
        }}
      >
        {VRAIS_CLIPS.map((c, i) => {
          const a = ressort(frame, fps, (19.4 + i * 0.16) * fps);
          return (
            <div
              key={c.f}
              style={{
                width: clipL, height: clipH, borderRadius: 16, overflow: "hidden",
                position: "relative",
                border: `2px solid ${i === 0 ? COULEURS.vert : COULEURS.ligne}`,
                boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
                opacity: a,
                transform: `translateY(${interpolate(a, [0, 1], [40, 0])}px) scale(${interpolate(a, [0, 1], [0.88, 1])})`,
              }}
            >
              <Video
                src={staticFile(c.f)}
                trimBefore={Math.round(c.a * FPS)}
                style={{ width: "100%", height: "100%" }}
                objectFit="cover"
                muted
              />
              <div
                style={{
                  position: "absolute", top: 12, left: 12,
                  background: i === 0 ? COULEURS.vert : "rgba(0,0,0,0.62)",
                  color: i === 0 ? "#04150d" : "#fff",
                  padding: "5px 14px", borderRadius: 9, fontSize: 30, fontWeight: 800,
                }}
              >
                {c.note}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute", top: height * 0.84, left: 0, right: 0, textAlign: "center",
          fontSize: 54, fontWeight: 700,
        }}
      >
        Recadrés, sous-titrés, notés.
      </div>
    </AbsoluteFill>
  );
};

const Choix: React.FC<{ s: number; width: number; height: number }> = ({ s, width, height }) => {
  const { visible, style } = usePlan(s, "choix");
  if (!visible) return null;
  return (
    <AbsoluteFill style={style}>
      <div
        style={{
          position: "absolute", top: height * 0.42, left: width * 0.1, right: width * 0.1,
          textAlign: "center", fontSize: 100, fontWeight: 800, letterSpacing: -2,
        }}
      >
        Toi, tu choisis. Et tu publies.
      </div>
    </AbsoluteFill>
  );
};

const Adresse: React.FC<{ s: number; frame: number; fps: number; width: number; height: number }> = ({
  s, frame, fps, height,
}) => {
  const { visible, style } = usePlan(s, "adresse");
  const a = ressort(frame, fps, 25.5 * fps);
  if (!visible) return null;
  return (
    <AbsoluteFill style={style}>
      <div
        style={{
          position: "absolute", top: height * 0.4, left: 0, right: 0, textAlign: "center",
          opacity: a, transform: `scale(${interpolate(a, [0, 1], [0.9, 1])})`,
        }}
      >
        <div style={{ fontSize: 140, fontWeight: 800, letterSpacing: -5 }}>creatis.app</div>
        <div
          style={{
            marginTop: 28, fontSize: 52, fontWeight: 600, color: COULEURS.texteDoux,
            opacity: interpolate(s, [26.1, 26.7], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            }),
          }}
        >
          Une vidéo longue. Dix clips prêts à poster.
        </div>
      </div>
    </AbsoluteFill>
  );
};
