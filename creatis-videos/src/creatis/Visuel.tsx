import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { POLICE } from "./police";

/**
 * KIT VISUEL — de l'image réelle sous chaque mot.
 *
 * ── POURQUOI CE FICHIER ──────────────────────────────────────────────────
 * Consigne du 09/10 : « ça doit être visuellement incroyable, avec des
 * visuels, image, vidéo — jamais du vert simple en foncé comme tu fais ».
 *
 * Les onze formats longs précédents étaient des diaporamas : fond #0a0f0a,
 * texte blanc, accent vert, quelques graphiques. Mesuré sur la seule qui a eu
 * du public : dix secondes regardées sur trente-trois. Les gens ne partent pas
 * parce que le sujet est mauvais — ils partent parce qu'il ne se passe rien.
 *
 * Ici, aucune scène n'a le droit d'être un fond uni. Chaque plan repose sur
 * une image réelle qui bouge, et le texte vit PAR-DESSUS, sur un voile local.
 *
 * ── CE QU'ON A COMME MATIÈRE, ET CE QU'ON N'A PAS ────────────────────────
 * Vérifié le 09/10 : pas d'images générées. `HF_TOKEN` est vide, la clé
 * OpenAI du dépôt n'a plus de crédits, et Gemini Image répond 429. Tant mieux :
 * ce qu'on a est plus fort parce que c'est réel —
 *   · les clips produits (vraies personnes, mouvement, couleur) ;
 *   · l'écran filmé en continu, qui montre le travail ;
 *   · les pages réelles (Whop) et les vidéos sources.
 *
 * ── LE MOUVEMENT EST OBLIGATOIRE ─────────────────────────────────────────
 * Même une capture fixe reçoit un lent travelling avant : une image immobile
 * pendant huit secondes se regarde comme une diapositive, quelle que soit sa
 * qualité.
 */

const POLICE_TITRE = POLICE;

/** Travelling avant lent et régulier — jamais d'image morte. */
const zoom = (frame: number, duree: number, de = 1.0, a = 1.1) =>
  interpolate(frame, [0, duree], [de, a], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/**
 * Une vidéo 16:9 en plein cadre, avec travelling.
 * `assombrir` ne sert qu'à poser du texte : sans texte, on la laisse nette.
 */
export const FondVideo: React.FC<{
  source: string;
  depart?: number;
  duree: number;
  assombrir?: number;
  cote?: "gauche" | "droite" | "bas" | "aucun";
  /**
   * Flou en pixels. Indispensable sur une source CLAIRE : la page Whop est
   * blanche, et l'assombrir sans la flouter laissait son propre texte orange
   * se battre avec le nôtre — illisible des deux côtés. Floutée, elle devient
   * une texture colorée, ce qu'on lui demande.
   */
  flou?: number;
}> = ({ source, depart = 0, duree, assombrir = 0, cote = "aucun", flou = 0 }) => {
  const frame = useCurrentFrame();
  const e = zoom(frame, duree * 30, 1.04, 1.14);
  const voiles: Record<string, string> = {
    gauche: `linear-gradient(to right, rgba(4,6,8,${assombrir}) 0%, rgba(4,6,8,${assombrir * 0.85}) 42%, rgba(4,6,8,0) 78%)`,
    droite: `linear-gradient(to left, rgba(4,6,8,${assombrir}) 0%, rgba(4,6,8,${assombrir * 0.85}) 42%, rgba(4,6,8,0) 78%)`,
    bas: `linear-gradient(to top, rgba(4,6,8,${assombrir}) 0%, rgba(4,6,8,${assombrir * 0.8}) 38%, rgba(4,6,8,0) 72%)`,
    aucun: `rgba(4,6,8,${assombrir})`,
  };
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#04060a" }}>
      <Video
        src={staticFile(source)}
        trimBefore={Math.round(depart * 30)}
        style={{
          position: "absolute", width: "100%", height: "100%",
          objectFit: "cover", transform: `scale(${flou ? e * 1.12 : e})`,
          filter: flou ? `blur(${flou}px) saturate(1.35)` : undefined,
        }}
        muted
      />
      {assombrir > 0 ? <AbsoluteFill style={{ background: voiles[cote] }} /> : null}
    </AbsoluteFill>
  );
};

/**
 * Un clip vertical dans un cadre 16:9, sans bandes noires : une copie floue
 * et agrandie remplit le fond, la copie nette tient au centre.
 *
 * C'est le traitement des chaînes qui réutilisent du vertical en 16:9 ; il
 * donne de la couleur et de la profondeur là où une bande noire donne du vide.
 */
export const ClipVertical: React.FC<{
  source: string;
  depart?: number;
  duree: number;
  /** Cadre utile du lecteur dans un tournage 1080×1920. */
  cadre?: [number, number, number, number];
  hauteur?: number;
  decale?: number;
}> = ({ source, depart = 0, duree, cadre = [150, 300, 540, 820], hauteur = 940, decale = 0 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const [cx, cy, cl, ch] = cadre;
  const largeur = Math.round((hauteur * cl) / ch);
  const e = Math.max(largeur / cl, hauteur / ch);
  const grossi = zoom(frame, duree * 30, 1.0, 1.06);

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#04060a" }}>
      {/* Fond : le même clip, flou et débordant. */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Video
          src={staticFile(source)}
          trimBefore={Math.round(depart * 30)}
          style={{
            position: "absolute", width: "100%", height: "100%",
            objectFit: "cover", filter: "blur(42px) saturate(1.5) brightness(0.55)",
            transform: "scale(1.25)",
          }}
          muted
        />
      </AbsoluteFill>

      {/* Premier plan : le clip net, cadré sur le lecteur. */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: largeur, height: hauteur, borderRadius: 22, overflow: "hidden",
            boxShadow: "0 30px 90px rgba(0,0,0,0.85)",
            transform: `translateX(${decale}px) scale(${grossi})`,
            position: "relative",
          }}
        >
          <Video
            src={staticFile(source)}
            trimBefore={Math.round(depart * 30)}
            style={{
              position: "absolute", width: 1080, height: 1920, transformOrigin: "0 0",
              transform: `translate(${largeur / 2 - (cx + cl / 2) * e}px, ${hauteur / 2 - (cy + ch / 2) * e}px) scale(${e})`,
            }}
            muted
          />
        </div>
      </AbsoluteFill>
      {/* Un soupçon de vignettage : l'œil va au centre. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 50%, transparent 46%, rgba(4,6,8,0.55) 100%)`,
          width, height,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Du texte posé SUR une image. Le voile est local et doux : un panneau opaque
 * redevient une diapositive, un texte nu sur une image bouge devient illisible
 * dès que l'image s'éclaircit.
 */
export const TexteSurImage: React.FC<{
  titre: React.ReactNode;
  sous?: React.ReactNode;
  position?: "bas-gauche" | "centre" | "haut-gauche";
  retard?: number;
  taille?: number;
}> = ({ titre, sous, position = "bas-gauche", retard = 0, taille = 86 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = interpolate(frame - retard * fps, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glisse = interpolate(v, [0, 1], [26, 0]);

  const place: Record<string, React.CSSProperties> = {
    "bas-gauche": { left: 110, right: 110, bottom: 110, alignItems: "flex-start", textAlign: "left" },
    "haut-gauche": { left: 110, right: 110, top: 120, alignItems: "flex-start", textAlign: "left" },
    centre: { left: 140, right: 140, top: "50%", transform: "translateY(-50%)", alignItems: "center", textAlign: "center" },
  };

  return (
    <div
      style={{
        position: "absolute", display: "flex", flexDirection: "column",
        fontFamily: POLICE_TITRE, ...place[position],
      }}
    >
      <div
        style={{
          fontSize: taille, fontWeight: 900, color: "#fff", letterSpacing: -3,
          lineHeight: 1.06, opacity: v, transform: `translateY(${glisse}px)`,
          textShadow: "0 4px 26px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)",
        }}
      >
        {titre}
      </div>
      {sous ? (
        <div
          style={{
            fontSize: Math.round(taille * 0.46), fontWeight: 800,
            color: "rgba(255,255,255,0.92)", marginTop: 18, lineHeight: 1.26,
            opacity: interpolate(frame - (retard + 0.5) * fps, [0, 12], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            }),
            textShadow: "0 3px 20px rgba(0,0,0,0.95)",
          }}
        >
          {sous}
        </div>
      ) : null}
    </div>
  );
};

/**
 * Un chiffre énorme posé sur l'image. Sert à remplacer les graphiques : un
 * nombre lisible en une demi-seconde vaut mieux qu'un histogramme qu'il faut
 * déchiffrer, surtout sur un téléphone.
 */
export const ChiffreSurImage: React.FC<{
  valeur: string;
  legende: string;
  couleur?: string;
  retard?: number;
}> = ({ valeur, legende, couleur = "#fff", retard = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = interpolate(frame - retard * fps, [0, 14], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return (
    <div style={{ textAlign: "center", fontFamily: POLICE_TITRE, opacity: v }}>
      <div
        style={{
          fontSize: 230, fontWeight: 900, color: couleur, letterSpacing: -12,
          lineHeight: 0.9, transform: `scale(${interpolate(v, [0, 1], [0.86, 1])})`,
          textShadow: "0 8px 40px rgba(0,0,0,0.9)",
        }}
      >
        {valeur}
      </div>
      <div
        style={{
          fontSize: 44, fontWeight: 800, color: "rgba(255,255,255,0.94)", marginTop: 10,
          textShadow: "0 3px 20px rgba(0,0,0,0.95)",
        }}
      >
        {legende}
      </div>
    </div>
  );
};

/**
 * Une étiquette VRAI / FAUX, posée en haut à gauche.
 *
 * Elle existe parce que le film du 13/10 répond à une question que les gens
 * tapent — « le clipping, c'est une arnaque ? » — et qu'une réponse en deux
 * colonnes ne se suit pas à l'oreille seule. Le spectateur doit savoir, à
 * n'importe quelle seconde où il arrive, s'il regarde ce qui est vrai ou ce
 * qu'on lui a menti.
 *
 * Ce n'est pas une diapositive : l'étiquette se pose SUR la vidéo qui joue,
 * elle n'occupe qu'un coin, et le fond reste du mouvement.
 */
export const Etiquette: React.FC<{
  texte: string;
  ton: "vrai" | "faux";
  retard?: number;
}> = ({ texte, ton, retard = 0 }) => {
  const frame = useCurrentFrame();
  const t = Math.max(0, frame - retard * 30);
  const e = spring({ frame: t, fps: 30, config: { damping: 16, mass: 0.5 } });
  const fond = ton === "vrai" ? "#0e9f6e" : "#e23c3c";

  return (
    <div
      style={{
        position: "absolute", left: 72, top: 64,
        transform: `translateY(${(1 - e) * -40}px) scale(${0.9 + e * 0.1})`,
        opacity: e,
        background: fond, color: "#fff",
        fontFamily: POLICE_TITRE, fontWeight: 900, fontSize: 46,
        letterSpacing: 1.5, padding: "14px 30px", borderRadius: 12,
        boxShadow: "0 14px 44px rgba(0,0,0,0.6)",
        border: "3px solid rgba(255,255,255,0.22)",
      }}
    >
      {texte}
    </div>
  );
};

/**
 * UNE ZONE DE L'ÉCRAN, mise en plein cadre.
 *
 * Le tournage de la plateforme est en 1920×1080 : le lecteur du clip y fait
 * 374 pixels de large, le panneau de réglages 356. Projeté tel quel dans une
 * vidéo regardée sur un téléphone, plus rien n'est lisible — on voit une
 * interface, on ne lit aucun réglage.
 *
 * `zone` est la région du tournage à montrer, en coordonnées du fichier
 * (relevées sur une capture quadrillée, jamais estimées) :
 *
 *   grille complète .... [180,  30, 1380, 776]
 *   fiche du clip ...... [400,  20, 1180, 664]
 *   lecteur + début du panneau [540, 50, 900, 506]
 *   panneau des styles . [1150, 40,  440, 248]
 *
 * Le calcul d'échelle est un MAXIMUM : avec `Math.min` on obtient un
 * « contain » qui laisse le reste de l'interface dans le champ, ce qu'on
 * cherche précisément à faire sortir.
 */
export const Ecran: React.FC<{
  source: string;
  depart: number;
  duree: number;
  zone: [number, number, number, number];
  /** Un lent rapprochement, pour que le plan ne soit pas figé. */
  zoom?: number;
}> = ({ source, depart, duree, zone, zoom = 1.05 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const [zx, zy, zl, zh] = zone;
  const e = Math.max(width / zl, height / zh);
  const g = interpolate(frame, [0, duree * 30], [1, zoom], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#0a0f0a" }}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width, height, overflow: "hidden", position: "relative",
            transform: `scale(${g})`,
          }}
        >
          <Video
            src={staticFile(source)}
            trimBefore={Math.round(depart * 30)}
            style={{
              position: "absolute", width: 1920, height: 1080,
              transformOrigin: "0 0",
              transform: `translate(${width / 2 - (zx + zl / 2) * e}px, ${height / 2 - (zy + zh / 2) * e}px) scale(${e})`,
            }}
            muted
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * LE CURSEUR, dessiné d'après la trace réelle du tournage.
 *
 * Playwright pilote la souris mais ne la DESSINE pas : un tournage
 * d'écran fait avec lui montre des choses qui s'ouvrent et des champs qui
 * se remplissent, sans qu'on voie jamais ce qui les provoque. Demande du
 * 16/10 : « une souris qui parcourt l'écran, qui va cliquer, qui va
 * glisser ».
 *
 * `enregistrer-parcours-complet.mjs` journalise chaque position avec sa
 * seconde. On repose le pointeur sur ces coordonnées — il est donc exact,
 * et non rejoué au jugé après coup.
 *
 * `decalage` fait la conversion : le plan commence à une seconde du film et
 * montre le tournage à partir d'une autre.
 */
export const Curseur: React.FC<{
  trace: { t: number; x: number; y: number; clic: boolean }[];
  /** Seconde du tournage à laquelle ce plan commence. */
  depart: number;
  /** Largeur du tournage d'origine, pour mettre à l'échelle. */
  largeurSource?: number;
}> = ({ trace, depart, largeurSource = 1920 }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = depart + frame / fps;
  const e = width / largeurSource;

  /* Le point courant, interpolé entre les deux relevés qui l'encadrent. */
  let avant = trace[0];
  let apres = trace[trace.length - 1];
  for (let i = 0; i < trace.length - 1; i += 1) {
    if (trace[i].t <= t && trace[i + 1].t >= t) { avant = trace[i]; apres = trace[i + 1]; break; }
  }
  if (!avant) return null;
  const span = apres.t - avant.t;
  const k = span > 0 ? Math.min(1, Math.max(0, (t - avant.t) / span)) : 0;
  const x = (avant.x + (apres.x - avant.x) * k) * e;
  const y = (avant.y + (apres.y - avant.y) * k) * e;

  /* Un halo au moment du clic : sans lui, on ne voit pas que ça a cliqué. */
  const clicRecent = trace.some((p) => p.clic && t - p.t >= 0 && t - p.t < 0.45);
  const dernier = trace.filter((p) => p.clic && t - p.t >= 0 && t - p.t < 0.45)[0];
  const age = dernier ? t - dernier.t : 1;
  const halo = clicRecent ? 1 - age / 0.45 : 0;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {halo > 0 ? (
        <div
          style={{
            position: "absolute", left: x - 26, top: y - 26, width: 52, height: 52,
            borderRadius: "50%", border: "3px solid rgba(255,255,255,0.9)",
            opacity: halo, transform: `scale(${0.5 + (1 - halo) * 1.1})`,
          }}
        />
      ) : null}
      <svg
        width="30" height="44" viewBox="0 0 30 44"
        style={{ position: "absolute", left: x - 2, top: y - 2 }}
      >
        <path
          d="M3 2 L3 32 L11 25 L16 37 L21 35 L16 23 L26 23 Z"
          fill="#fff" stroke="#111" strokeWidth="2.2" strokeLinejoin="round"
        />
      </svg>
    </AbsoluteFill>
  );
};

/**
 * LES ZONES D'UN ÉCRAN DE TÉLÉPHONE, en schéma.
 *
 * Un plan qu'aucun tournage ne peut donner : il faut montrer CE QUI SERA
 * DESSINÉ PAR-DESSUS le clip, donc des surfaces, pas une capture.
 *
 * Les proportions sont celles relevées le 08/10 sur une capture réelle
 * d'iPhone en 1179×2556 — haut 0→14 %, colonne de droite 49→89 %, bas
 * 66→92 % — et la bande libre qui en découle, 14→48 %.
 *
 * `zone` allume une bande à la fois, pour que la voix et l'image avancent
 * ensemble au lieu de tout montrer d'un coup.
 */
export const ZonesTelephone: React.FC<{
  /** Quelle bande est allumée : 0 aucune, 1 haut, 2 droite, 3 bas, 4 la libre. */
  zone?: number;
  retard?: number;
}> = ({ zone = 0, retard = 0 }) => {
  const frame = useCurrentFrame();
  const t = Math.max(0, frame - retard * 30);
  const e = spring({ frame: t, fps: 30, config: { damping: 18, mass: 0.6 } });

  const H = 760;
  const L = Math.round(H * 0.462);
  const bande = (haut: number, bas: number, actif: boolean, couleur: string) => ({
    position: "absolute" as const,
    left: 0, right: 0,
    top: `${haut * 100}%`,
    height: `${(bas - haut) * 100}%`,
    background: actif ? couleur : "rgba(255,255,255,0.05)",
    border: actif ? "2px solid rgba(255,255,255,0.5)" : "none",
    transition: "none",
  });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: L, height: H, borderRadius: 34, overflow: "hidden",
          position: "relative", background: "#11161d",
          border: "4px solid rgba(255,255,255,0.3)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.85)",
          transform: `scale(${0.94 + e * 0.06})`, opacity: e,
        }}
      >
        <div style={bande(0, 0.14, zone === 1, "rgba(226,60,60,0.72)")} />
        <div style={bande(0.14, 0.48, zone === 4, "rgba(25,195,125,0.72)")} />
        <div style={bande(0.66, 0.92, zone === 3, "rgba(226,60,60,0.72)")} />
        {/* La colonne de droite : elle chevauche la bande basse, d'où le calque. */}
        <div
          style={{
            position: "absolute", right: 0, top: "49%", height: "40%", width: "22%",
            background: zone === 2 ? "rgba(226,60,60,0.72)" : "rgba(255,255,255,0.05)",
            border: zone === 2 ? "2px solid rgba(255,255,255,0.5)" : "none",
          }}
        />
        {/* Le repère de la bande libre, toujours visible. */}
        <div
          style={{
            position: "absolute", left: 10, top: "14%", height: "34%",
            width: 5, background: "#19c37d", borderRadius: 3,
          }}
        />
        <div
          style={{
            position: "absolute", left: 22, top: "27%",
            color: "#19c37d", fontFamily: POLICE, fontWeight: 900, fontSize: 26,
            letterSpacing: -0.5,
          }}
        >
          14 → 48 %
        </div>
      </div>
    </AbsoluteFill>
  );
};
