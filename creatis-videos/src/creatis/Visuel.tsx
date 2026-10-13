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
