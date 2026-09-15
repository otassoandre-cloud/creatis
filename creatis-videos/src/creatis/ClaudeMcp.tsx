import { Video } from "@remotion/media";
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
import { COULEURS } from "./theme";
import { POLICE } from "./police";
import { OffreEssai } from "./OffreEssai";
import { AVEC_REACTION, Reaction } from "./Reaction";

/**
 * CRÉATIS DANS CLAUDE — 1080x1920, 23 s.
 *
 * Ce qu'on montre : on ne va plus sur le site, on demande à Claude. Créatis
 * s'ajoute comme connecteur, Claude appelle l'outil, les clips reviennent
 * finis dans la conversation.
 *
 * ── TOUT LE TEXTE AFFICHÉ EST CELUI DU PRODUIT ───────────────────────────
 * Les trois outils (`creer_clips`, `etat_clips`, `mon_quota`), la phrase
 * « Génération lancée — 3 clips demandés », l'identifiant en `j` + 8 signes,
 * « Analyse terminée », « 3 clips prêts » : tout sort de mcp_connecteur.py et a
 * été relu dans une vraie conversation avec le connecteur le 15/09/2026. Les
 * titres des clips sont ceux que l'IA a écrits pour CETTE génération-là, et le
 * clip montré à la fin en sort. Écrire une réponse plus belle que la vraie
 * ferait de cette vidéo une maquette, c'est-à-dire rien.
 *
 * ── CE QUE LA FENÊTRE N'EST PAS ──────────────────────────────────────────
 * Ce n'est pas une copie de l'interface de Claude et ça ne cherche pas à en
 * être une : pas de logo emprunté, pas de reproduction de leur mise en page.
 * C'est notre conversation, avec notre charte, et le nom de Claude écrit parce
 * que c'est bien à Claude qu'on parle. Reproduire l'interface d'un tiers pour
 * faire croire à une capture serait malhonnête, et juridiquement stupide.
 *
 * ── LE DÉCOUPAGE, ET POURQUOI IL EST SERRÉ AU DÉBUT ──────────────────────
 * La série TikTok dit toujours la même chose : 81 % de spectateurs à 1 s, puis
 * un décrochage massif à 0:02. Donc l'accroche doit être lisible à l'image 0 —
 * pas d'animation d'entrée sur le titre — et il doit se passer quelque chose
 * avant la deuxième seconde. La demande est déjà tapée à 2,3 s, l'outil part à
 * 4,6 s, les clips arrivent à 9,5 s.
 *
 *     0,0 s  accroche, lisible immédiatement
 *     2,3 s  la demande apparaît dans la conversation
 *     4,6 s  Claude appelle `creer_clips` — l'outil est visible, nommé
 *     6,6 s  « Génération lancée », l'identifiant
 *     9,5 s  « 3 clips prêts » et leurs titres
 *    12,5 s  le clip, plein écran, celui de cette génération
 *    18,0 s  l'offre d'essai se pose PAR-DESSUS le clip qui continue
 *
 * ── LA FIN ────────────────────────────────────────────────────────────────
 * Aucun carton final : le clip tourne jusqu'à la dernière image et l'offre se
 * pose dessus (voir l'en-tête d'OffreEssai). Une vidéo qui s'arrête sur une
 * affiche perd les secondes qui décident de la portée.
 */

const FPS = 30;
export const DUREE_MCP = 690; // 23 s

const CLIP = "mcpclip.mp4";

/** Le clip démarre à 12,5 s et tourne jusqu'au bout. */
const CLIP_DEB = Math.round(12.5 * FPS);

/** L'offre se pose à 18 s — 5 s de clip avant, 5 s avec l'offre. */
const OFFRE_DEB = Math.round(18 * FPS);

/* ────────────────────────────────────────────────────────────────────────── */

/** Fondu-montée court : l'élément arrive et se pose, il ne flotte pas. */
const arrivee = (frame: number, debut: number) => {
  const t = interpolate(frame, [debut, debut + 9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return { opacity: t, transform: `translateY(${(1 - t) * 26}px)` };
};

/** Bulle de la conversation. `moi` la met à droite, en vert. */
const Bulle: React.FC<{
  moi?: boolean;
  children: React.ReactNode;
}> = ({ moi, children }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        ...arrivee(frame, 0),
        alignSelf: moi ? "flex-end" : "flex-start",
        maxWidth: "88%",
        backgroundColor: moi ? COULEURS.vert : "rgba(255,255,255,0.055)",
        color: moi ? "#04120B" : COULEURS.texte,
        border: moi ? "none" : `1px solid ${COULEURS.ligne}`,
        borderRadius: 30,
        padding: "26px 30px",
        fontSize: 40,
        fontWeight: moi ? 800 : 600,
        lineHeight: 1.34,
        letterSpacing: "-0.015em",
      }}
    >
      {children}
    </div>
  );
};

/**
 * L'appel d'outil, montré comme Claude le montre : le connecteur, le nom exact
 * de l'outil, et ce qu'on lui passe. C'est le cœur de la démonstration — si le
 * spectateur ne voit pas qu'un outil a été appelé tout seul, la vidéo ne dit
 * rien de plus qu'une capture d'écran du site.
 */
const AppelOutil: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({
    frame,
    fps,
    config: { damping: 13, stiffness: 190, mass: 0.6 },
  });
  /* Pulsation lente pendant que l'outil « travaille » : c'est le seul endroit
     où il ne se passe rien à l'écran, et deux secondes immobiles se lisent
     comme un bug. */
  const souffle = 0.55 + 0.45 * Math.sin(frame / 5);

  return (
    <div
      style={{
        alignSelf: "flex-start",
        opacity: Math.min(1, e * 1.5),
        transform: `scale(${interpolate(e, [0, 1], [0.9, 1])})`,
        width: "100%",
        backgroundColor: "rgba(16,185,129,0.10)",
        border: `2px solid ${COULEURS.vert}`,
        borderRadius: 26,
        padding: "24px 28px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 999,
            backgroundColor: COULEURS.vertClair,
            opacity: souffle,
          }}
        />
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: COULEURS.vertClair,
            letterSpacing: "0.02em",
          }}
        >
          Créatis
        </div>
        <div style={{ fontSize: 30, fontWeight: 600, color: COULEURS.texteDoux }}>
          creer_clips
        </div>
      </div>
      <div
        style={{
          marginTop: 16,
          fontSize: 30,
          fontWeight: 600,
          color: COULEURS.texteDoux,
          lineHeight: 1.45,
          wordBreak: "break-all",
        }}
      >
        url: youtube.com/watch?v=65WcnNsAkL4
        <br />
        nombre: 3
      </div>
    </div>
  );
};

/** Une ligne de résultat : le titre écrit par l'IA, et sa durée. */
const LigneClip: React.FC<{
  debut: number;
  n: number;
  titre: string;
  duree: string;
}> = ({ debut, n, titre, duree }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        ...arrivee(frame, debut),
        /* Les lignes de résultat vivent DANS une bulle déjà montée : elles
           n'ont pas de séquence à elles, d'où le décalage passé en argument. */
        display: "flex",
        alignItems: "center",
        gap: 20,
        marginTop: 16,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          flexShrink: 0,
          borderRadius: 14,
          backgroundColor: COULEURS.vert,
          color: "#04120B",
          fontSize: 30,
          fontWeight: 900,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {n}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 31, fontWeight: 800, lineHeight: 1.2 }}>{titre}</div>
        <div style={{ fontSize: 26, fontWeight: 600, color: COULEURS.texteDoux }}>
          {duree} · 1080×1920 · sous-titres incrustés
        </div>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */

/** La conversation, du haut de l'écran jusqu'à ce que le clip prenne la place. */
const Conversation: React.FC = () => {
  const frame = useCurrentFrame();


  /* Le fond de la conversation se pose PROGRESSIVEMENT sur le clip : à 2,1 s il
     est encore transparent, à 2,8 s il est opaque. Sans cette montée, on passe
     d'une image vivante à un écran noir d'un coup, exactement à la seconde où
     la série décroche. Sept dixièmes, pas plus : entre les deux, le fond sombre
     à demi posé sur un visage donne un vert boueux qu'il ne faut pas laisser
     s'installer. */
  const fond = interpolate(frame, [63, 84], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ fontFamily: POLICE }}>
      <AbsoluteFill style={{ backgroundColor: COULEURS.fond, opacity: fond }} />

      {/* Halo vert très doux : la page du produit a le même, ça rattache la
          vidéo à la marque sans poser de logo. */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(120% 60% at 50% 8%, rgba(16,185,129,0.16) 0%, rgba(16,185,129,0) 62%)",
          opacity: fond,
        }}
      />

      {/* Bandeau : à qui on parle. Il n'apparaît qu'une fois la fenêtre de
          réaction partie (image 112) — les deux occupent la même bande, et se
          chevaucher rendrait les deux illisibles. Posé à 330 px, soit 17 % :
          juste sous la barre de recherche de TikTok. */}
      <div
        style={{
          position: "absolute",
          top: 330,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 34,
          fontWeight: 700,
          color: COULEURS.texteDoux,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          opacity: interpolate(frame, [112, 130], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Claude · connecteur Créatis
      </div>

      {/* La colonne est ancrée EN BAS et se remplit vers le haut, comme un vrai
          fil de discussion : les messages récents restent au centre de l'écran
          et les anciens montent d'eux-mêmes. La première version empilait tout
          depuis le haut avec un défilement calculé à la main — les bulles
          passaient sous le bandeau et les deux tiers bas restaient vides.
          Le bas s'arrête à 1450 px (75 %) : en dessous commence la zone des
          légendes TikTok. */}
      <div
        style={{
          position: "absolute",
          top: 420,
          bottom: 470,
          left: 70,
          right: 70,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: 22,
        }}
      >
        {/* Chaque message a sa propre séquence : avant son heure il n'est pas
            monté du tout, donc il n'occupe aucune place. C'est ce qui donne le
            comportement d'un vrai fil — les messages poussent les précédents
            vers le haut en arrivant. Avec une simple opacité, la mise en page
            était figée dès la première image et rien ne bougeait. */}
        <Sequence from={69} durationInFrames={CLIP_DEB - 69} layout="none">
          <Bulle moi>Fais-moi 3 clips de cette vidéo YouTube</Bulle>
        </Sequence>

        <Sequence from={138} durationInFrames={CLIP_DEB - 138} layout="none">
          <AppelOutil />
        </Sequence>

        <Sequence from={198} durationInFrames={CLIP_DEB - 198} layout="none">
          <Bulle>
            Génération lancée — 3 clips demandés.
            <br />
            <span style={{ color: COULEURS.texteDoux }}>Identifiant : j38211330</span>
          </Bulle>
        </Sequence>

        <Sequence from={255} durationInFrames={CLIP_DEB - 255} layout="none">
          <Bulle>
            <div style={{ fontWeight: 800, color: COULEURS.vertClair }}>
              3 clips prêts
            </div>
            <LigneClip
              debut={15}
              n={1}
              titre="Bellingcat déchiffre le mystère du MH17"
              duree="56 s"
            />
            <LigneClip
              debut={30}
              n={2}
              titre="L’overdose qui n’était pas une overdose"
              duree="62 s"
            />
            <LigneClip
              debut={45}
              n={3}
              titre="Enquête massive qui tourne au néant"
              duree="31 s"
            />
          </Bulle>
        </Sequence>
      </div>
    </AbsoluteFill>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * L'ACCROCHE. Lisible à l'image 0, sans animation d'entrée : c'est la seule
 * règle non négociable du format. Elle s'efface à 2,1 s, juste avant que la
 * demande n'apparaisse — deux textes forts en même temps s'annulent.
 *
 * ── ELLE SE POSE SUR LE CLIP, PAS SUR DU NOIR ────────────────────────────
 * La première version mettait un fond noir à 80 % : l'image 0 mesurait 20 de
 * luminance, contre 116-118 pour la médiane des clips qui performent, et la
 * série TikTok dit toujours la même chose — arrêt massif à 0:02. Le clip tourne
 * donc DERRIÈRE dès la première image, relevé de 1,28 et voilé à 0,26 seulement —
 * les valeurs qui ramènent la première seconde de 70 à ~105, près de la cible.
 *
 * Le texte tient sur ce fond mouvant grâce au contour noir, pas grâce au voile —
 * un voile assez opaque pour porter du texte blanc serait, par construction,
 * assez opaque pour éteindre l'image.
 */
const Accroche: React.FC = () => {
  const frame = useCurrentFrame();
  const sortie = interpolate(frame, [54, 63], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const contour = {
    WebkitTextStroke: "10px rgba(0,0,0,0.58)",
    paintOrder: "stroke fill" as const,
  };

  return (
    <AbsoluteFill style={{ opacity: sortie }}>
      {/* Relèvement mesuré. Avec un voile à 0,42 seul, la première seconde
          tombait à 70 de luminance, contre 116-118 pour la médiane du corpus.
          Voile ramené à 0,26 et clip relevé de 1,28 : on remonte à ~105 sans
          brûler les visages — au-delà de 1,45 la peau sature, mesuré le 14/09.
          Le voile ne sert plus qu'à asseoir le texte ; c'est le contour noir
          qui le rend lisible, pas l'assombrissement. */}
      <AbsoluteFill
        style={{
          backdropFilter: "brightness(1.28)",
          WebkitBackdropFilter: "brightness(1.28)",
        }}
      />
      <AbsoluteFill style={{ backgroundColor: "rgba(4,10,7,0.26)" }} />
      <AbsoluteFill
        style={{
          fontFamily: POLICE,
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          paddingLeft: 80,
          paddingRight: 80,
        }}
      >
        <div
          style={{
            fontSize: 112,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1.0,
            letterSpacing: "-0.045em",
            ...contour,
          }}
        >
          J’ai arrêté
          <br />
          d’ouvrir le site
        </div>
        <div
          style={{
            marginTop: 30,
            fontSize: 58,
            fontWeight: 800,
            color: COULEURS.vertClair,
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
            ...contour,
          }}
        >
          je demande mes clips
          <br />
          à Claude
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */

export const ClaudeMcp: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      {/* Le son du clip tourne du début à la fin : sans lui, les douze premières
          secondes de conversation seraient muettes, et une vidéo muette sur les
          deux premières secondes est jugée avant d'avoir commencé. */}
      <Sequence durationInFrames={DUREE_MCP} name="Clip">
        <Video
          src={staticFile(CLIP)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Sequence>

      {/* La conversation recouvre le clip jusqu'à 12,5 s. */}
      <Sequence durationInFrames={CLIP_DEB} name="Conversation">
        <Conversation />
      </Sequence>

      <Sequence durationInFrames={63} name="Accroche">
        <Accroche />
      </Sequence>

      {AVEC_REACTION ? (
        <Sequence durationInFrames={111} name="Réaction">
          <Reaction />
        </Sequence>
      ) : null}

      <Sequence from={OFFRE_DEB} durationInFrames={DUREE_MCP - OFFRE_DEB} name="Offre">
        <OffreEssai duree={DUREE_MCP - OFFRE_DEB} />
      </Sequence>
    </AbsoluteFill>
  );
};
