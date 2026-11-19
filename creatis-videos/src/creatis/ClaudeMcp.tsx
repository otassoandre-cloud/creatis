import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  Series,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { COULEURS } from "./theme";
import { POLICE } from "./police";
import { OffreEssai } from "./OffreEssai";
import { AVEC_REACTION, Reaction } from "./Reaction";

/**
 * LE CONNECTEUR CLAUDE — 1080x1920, 32 s, avec voix off.
 *
 * On branche Créatis dans Claude, on lui donne un lien YouTube, il rend les
 * clips finis. La vidéo montre l'opération ENTIÈRE : la demande, l'appel de
 * l'outil, l'attente, les clips qui reviennent, puis le clip lui-même.
 *
 * ── LA CONVERSATION EST UN ENREGISTREMENT D'ÉCRAN ────────────────────────
 * `rec-claude.mp4` est filmé dans l'application Claude, sur téléphone. Deux
 * versions ont été écartées avant d'en arriver là. La première redessinait
 * l'échange en HTML avec les vraies chaînes du connecteur : exact, et ça ne
 * prouvait rien — un spectateur ne distingue pas une maquette soignée d'une
 * capture, donc il ne croit ni l'une ni l'autre. La seconde filmait une fenêtre
 * Claude Code : authentique, mais un terminal ne dit rien à un créateur de
 * contenu, qui ne reconnaît pas l'outil dont on lui parle.
 *
 * L'interface de l'application est la seule que l'audience reconnaisse, et elle
 * ne peut être filmée que depuis un vrai appareil : claude.ai renvoie un
 * challenge Cloudflare à tout navigateur piloté.
 *
 * ── LA VOIX EXPLIQUE, ELLE NE SLOGANE PAS ────────────────────────────────
 * Une prise unique de 22,9 s (Gemini TTS, voix Puck), texte dans
 * `generer-voix.mjs` sous l'identifiant `mcp-claude`. Elle est coupée en deux :
 * les cinq premières phrases accompagnent l'action, la dernière — la seule qui
 * vend — attend la fin et se pose avec l'offre. Diffuser le CTA au milieu le
 * rendrait inaudible ; le laisser collé aux autres phrases le ferait tomber
 * pendant que le clip démarre.
 *
 * Les frontières de phrases ne sont pas devinées : elles sont mesurées par
 * Whisper sur la prise elle-même (0,0 / 5,0 / 9,0 / 12,3 / 16,5 / 20,2 s).
 *
 * ── LE SON DU CLIP PASSE DESSOUS ─────────────────────────────────────────
 * Le clip tourne du début à la fin, mais son volume descend à 0,18 tant que la
 * voix parle. Deux paroles à plein niveau ne se superposent pas : elles
 * s'annulent, et on n'entend plus ni l'une ni l'autre.
 *
 * ── LA SOURCE DES CLIPS EST DU DIVERTISSEMENT ────────────────────────────
 * Amixem. Jamais de politique, d'actualité ni d'enquête, même quand ces sources
 * mesurent mieux : la cible est le créateur de contenu, et un clip d'actualité
 * fait juger la marque sur le sujet du clip.
 */

const FPS = 30;
export const DUREE_MCP = 960; // 32 s

/** Le clip que le connecteur a rendu pendant l'enregistrement. */
const CLIP = "mcp-clip.mp4";

/**
 * Enregistrement d'écran de l'application Claude, en 9:16.
 *
 * ── POURQUOI PAS UNE CAPTURE FAITE ICI ───────────────────────────────────
 * claude.ai renvoie un challenge Cloudflare à tout navigateur piloté : la page
 * s'arrête sur « Un instant… » et ne se charge jamais. Il n'existe donc aucun
 * moyen de filmer l'interface depuis cette machine. L'enregistrement vient du
 * téléphone, ce qui est de toute façon la bonne image : c'est l'application que
 * l'audience utilise, pas un terminal.
 *
 * Attendu : 1080x1920 (ou tout format 9:16), l'app Claude, le connecteur
 * Créatis appelé, et les clips qui reviennent.
 */
const REC = "rec-claude.mp4";

/** Prise unique de voix off. */
const VOIX = "voix/mcp-claude.mp3";

const ECRAN = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
} as const;

/** L'accroche tient 5 s — la durée de la première phrase de la voix. */
const FIN_ACCROCHE = 150;

/** La fenêtre de terminal occupe l'écran de 5 s à 19,6 s. */
const REC_DEB = 150;
const REC_FIN = 588;

/** L'offre se pose à 26 s, sur le clip qui continue de tourner. */
const OFFRE_DEB = 780;

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * L'ACCROCHE. Lisible à l'image 0, sans animation d'entrée : la série TikTok dit
 * toujours la même chose — 81 % de spectateurs à 1 s, puis un décrochage massif
 * à 0:02. Ce qui décide, c'est ce que le spectateur a COMPRIS à la deuxième
 * seconde, donc le texte doit être entier dès la première image.
 *
 * Elle se pose SUR le clip qui tourne, pas sur du noir : avec un fond sombre, la
 * première seconde tombait à 20 de luminance contre 116-118 pour la médiane du
 * corpus. Clip relevé de 1,45 — le plafond au-delà duquel la peau sature — et
 * voile à 0,20. C'est le contour noir qui rend le texte lisible, pas
 * l'assombrissement : un voile assez opaque pour porter du blanc serait, par
 * construction, assez opaque pour éteindre l'image.
 */
const Accroche: React.FC = () => {
  const frame = useCurrentFrame();
  const sortie = interpolate(frame, [FIN_ACCROCHE - 12, FIN_ACCROCHE], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const contour = {
    WebkitTextStroke: "10px rgba(0,0,0,0.58)",
    paintOrder: "stroke fill" as const,
  };

  return (
    <AbsoluteFill style={{ opacity: sortie }}>
      <AbsoluteFill
        style={{
          backdropFilter: "brightness(1.45)",
          WebkitBackdropFilter: "brightness(1.45)",
        }}
      />
      <AbsoluteFill style={{ backgroundColor: "rgba(4,10,7,0.20)" }} />
      <AbsoluteFill
        style={{
          fontFamily: POLICE,
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          paddingLeft: 76,
          paddingRight: 76,
        }}
      >
        <div
          style={{
            fontSize: 46,
            fontWeight: 800,
            color: COULEURS.vertClair,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 22,
            ...contour,
          }}
        >
          Nouveau connecteur
        </div>
        <div
          style={{
            fontSize: 108,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1.0,
            letterSpacing: "-0.045em",
            ...contour,
          }}
        >
          Claude fait
          <br />
          mes clips
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 96,
            fontWeight: 900,
            color: COULEURS.vertClair,
            lineHeight: 1.0,
            letterSpacing: "-0.04em",
            ...contour,
          }}
        >
          tout seul
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * LA CAPTURE, ET SES QUATRE VITESSES.
 *
 * L'échange réel dure plusieurs minutes et on en dispose de 14,6 s. Une vitesse
 * unique rendrait la demande illisible et l'attente interminable. Les repères
 * sont relevés image par image sur `rec-claude.mp4` ; les attentes — les seuls
 * passages qui n'apprennent rien — sont les seules vraiment accélérées, et la
 * réponse finale tient en temps réel pour être lue. C'est le principe déjà
 * appliqué dans Parcours.
 */
const Capture: React.FC = () => {
  const frame = useCurrentFrame();

  /* Le fond se pose progressivement sur le clip : sans cette montée on passe
     d'une image vivante à un écran sombre d'un coup. Sept dixièmes de seconde,
     pas plus — entre les deux, le fond à demi posé sur un visage donne un vert
     boueux qu'il ne faut pas laisser s'installer. */
  const fond = interpolate(frame, [0, 21], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const entree = interpolate(frame, [18, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill style={{ fontFamily: POLICE }}>
      <AbsoluteFill style={{ backgroundColor: COULEURS.fond, opacity: fond }} />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(120% 60% at 50% 8%, rgba(16,185,129,0.16) 0%, rgba(16,185,129,0) 62%)",
          opacity: fond,
        }}
      />

      {/* L'enregistrement est déjà en 9:16 : il remplit le cadre au lieu d'être
          posé dessus comme une fenêtre. Un écran de téléphone montré en entier
          se lit sur un écran de téléphone — c'est le seul format qui n'oblige
          pas à rapetisser le texte de l'application. */}
      <AbsoluteFill
        style={{
          opacity: entree,
          transform: `scale(${interpolate(entree, [0, 1], [1.04, 1])})`,
        }}
      >
        {/* La séquence démarre à l'image 18, au moment où la fenêtre apparaît :
            sinon les premières secondes de l'enregistrement défileraient
            derrière un cadre invisible et la demande serait déjà écrite en
            apparaissant. */}
        <Sequence from={18} durationInFrames={REC_FIN - REC_DEB - 18} layout="none">
          <Series>
            <Series.Sequence durationInFrames={60} layout="none">
              <Video
                src={staticFile(REC)}
                trimBefore={Math.round(2.8 * FPS)}
                style={ECRAN}
              />
            </Series.Sequence>
            <Series.Sequence durationInFrames={90} layout="none">
              <Video
                src={staticFile(REC)}
                trimBefore={Math.round(5 * FPS)}
                playbackRate={16}
                style={ECRAN}
              />
            </Series.Sequence>
            <Series.Sequence durationInFrames={80} layout="none">
              <Video
                src={staticFile(REC)}
                trimBefore={Math.round(53 * FPS)}
                playbackRate={3}
                style={ECRAN}
              />
            </Series.Sequence>
            <Series.Sequence durationInFrames={190} layout="none">
              <Video
                src={staticFile(REC)}
                trimBefore={Math.round(61 * FPS)}
                style={ECRAN}
              />
            </Series.Sequence>
          </Series>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */

export const ClaudeMcp: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond }}>
      {/* Le clip tourne d'un bout à l'autre : il porte l'accroche au début,
          reprend tout l'écran à la fin, et son propre son remplit les silences
          de la voix. */}
      <Sequence durationInFrames={DUREE_MCP} name="Clip">
        <Video
          src={staticFile(CLIP)}
          volume={(f) => (f < REC_FIN ? 0.18 : 1)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Sequence>

      <Sequence from={REC_DEB} durationInFrames={REC_FIN - REC_DEB} name="Capture">
        <Capture />
      </Sequence>

      <Sequence durationInFrames={FIN_ACCROCHE} name="Accroche">
        <Accroche />
      </Sequence>

      {AVEC_REACTION ? (
        <Sequence durationInFrames={108} name="Réaction">
          <Reaction />
        </Sequence>
      ) : null}

      {/* Voix, premier morceau : les cinq phrases qui expliquent. */}
      <Sequence durationInFrames={Math.round(19.9 * FPS)} name="Voix — explication">
        <Audio src={staticFile(VOIX)} trimAfter={Math.round(19.9 * FPS)} />
      </Sequence>

      {/* Voix, dernier morceau : l'offre, posée avec elle. */}
      <Sequence
        from={OFFRE_DEB}
        durationInFrames={DUREE_MCP - OFFRE_DEB}
        name="Voix — offre"
      >
        <Audio src={staticFile(VOIX)} trimBefore={Math.round(20.1 * FPS)} />
      </Sequence>

      <Sequence from={OFFRE_DEB} durationInFrames={DUREE_MCP - OFFRE_DEB} name="Offre">
        <OffreEssai duree={DUREE_MCP - OFFRE_DEB} />
      </Sequence>
    </AbsoluteFill>
  );
};
