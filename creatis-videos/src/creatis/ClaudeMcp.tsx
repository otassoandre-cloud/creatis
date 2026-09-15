import { Video } from "@remotion/media";
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
 * titres des clips sont ceux que l'IA a écrits pour CETTE génération-là
 * (jff80a786, sur « 99,9% de MALAISE » d'Amixem), et le clip montré à la fin en
 * sort — c'est le troisième de la liste. Écrire une réponse plus belle que la
 * vraie ferait de cette vidéo une maquette, c'est-à-dire rien.
 *
 * ── LA SOURCE EST DU DIVERTISSEMENT, ET C'EST UNE REGLE ──────────────────
 * Jamais de politique, d'actualité ni d'enquête, même quand ces sources donnent
 * de meilleurs chiffres. La cible est le créateur de contenu : un clip
 * d'actualité fait juger la marque sur le sujet du clip et parle à une audience
 * qui n'achète pas.
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

const CLIP = "amx3.mp4";

/** Capture de la vraie fenêtre Claude Code, recadrée sur le terminal seul. */
const REC = "rec-claude.mp4";

const ECRAN = { width: "100%", display: "block" } as const;

/** Le clip reprend tout l'écran à 14 s et tourne jusqu'au bout. */
const CLIP_DEB = Math.round(14 * FPS);

/** L'offre se pose à 18 s — 5 s de clip avant, 5 s avec l'offre. */
const OFFRE_DEB = Math.round(18 * FPS);

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * LA CONVERSATION — ce n'est plus une reconstitution, c'est l'enregistrement.
 *
 * `rec-claude.mp4` est la capture d'une vraie fenêtre Claude Code du 15/09/2026,
 * avec le connecteur Créatis déclaré (`.mcp.json`, jeton OAuth du compte). On y
 * voit la demande, Claude appeler l'outil, puis la réponse du connecteur avec
 * les trois titres que l'IA a écrits. Rien n'est rejoué ni remis en page.
 *
 * ── POURQUOI UN ENREGISTREMENT ET PAS UNE MAQUETTE ───────────────────────
 * La version précédente redessinait la conversation en HTML avec les vraies
 * chaînes du connecteur. C'était exact, et ça ne prouvait rien : un spectateur
 * ne distingue pas une maquette soignée d'une capture, donc il ne croit ni
 * l'une ni l'autre. Une fenêtre de terminal avec sa barre d'onglets, son
 * curseur qui clignote et ses temps d'attente, si.
 *
 * ── LES QUATRE VITESSES ──────────────────────────────────────────────────
 * L'échange réel dure 66 secondes et on en dispose de 11. Une vitesse unique
 * rendrait la question illisible et l'attente interminable :
 *
 *     x1,2   la demande s'affiche          (2 s réelles)
 *     x14    l'attente pendant le travail  (37 s réelles → 2,6 s)
 *     x3,5   la relance et la réponse      (7 s réelles → 2 s)
 *     x1,5   les trois clips, à lire       (8 s réelles → 5,3 s)
 *
 * C'est le même principe que Parcours : on accélère ce qui n'apprend rien, on
 * ralentit ce qui prouve.
 */
const Conversation: React.FC = () => {
  const frame = useCurrentFrame();

  /* Le fond se pose progressivement sur le clip : à 2,1 s il est transparent,
     à 2,8 s opaque. Sans cette montée on passe d'une image vivante à un écran
     sombre d'un coup, exactement à la seconde où la série décroche. Sept
     dixièmes, pas plus : entre les deux, le fond à demi posé sur un visage
     donne un vert boueux qu'il ne faut pas laisser s'installer. */
  const fond = interpolate(frame, [63, 84], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /* La fenêtre arrive à l'image 108, une fois la vignette de réaction partie :
     elles occupent la même bande et, superposées, on ne lisait ni l'une ni
     l'autre. La séquence qui la porte démarre au même moment, sinon les
     premières secondes de l'enregistrement défileraient derrière un cadre
     invisible et la question serait déjà écrite en apparaissant. */
  const entree = interpolate(frame, [108, 126], [0, 1], {
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

      {/* Bandeau : à qui on parle. Il n'apparaît qu'une fois la fenêtre de
          réaction partie (image 112) — les deux occupent la même bande. */}
      <div
        style={{
          position: "absolute",
          top: 318,
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

      {/* 1000 px de large : la capture fait 592, donc un agrandissement de 1,69.
          Au-delà le texte se délite ; en dessous il devient illisible sur un
          téléphone. La capture est rognée à 496 px de haut — la moitié basse de
          la fenêtre ne contient jamais rien, et la garder poussait le bloc dans
          la zone des légendes TikTok. Résultat : 845 px de haut, posés entre
          22 % et 66 % de la hauteur, loin des deux bandes d'interface. */}
      <Sequence from={108} durationInFrames={CLIP_DEB - 108} layout="none">
      <div
        style={{
          position: "absolute",
          top: 424,
          left: 40,
          width: 1000,
          borderRadius: 22,
          overflow: "hidden",
          border: `1px solid ${COULEURS.ligne}`,
          boxShadow: "0 40px 110px rgba(0,0,0,0.6)",
          opacity: entree,
          transform: `scale(${interpolate(entree, [0, 1], [0.94, 1])})`,
        }}
      >
        <Series>
          {/* Repères relevés image par image sur `rec-claude.mp4` :
                 2,9 s  la demande s'affiche
                44,0 s  Claude répond
                46,5 s  la relance
                53,0 s  les trois clips sont écrits
             Les deux attentes sont les seuls passages qui n'apprennent rien :
             ce sont les seuls qu'on accélère vraiment. */}
          <Series.Sequence durationInFrames={45} layout="none">
            <Video
              src={staticFile(REC)}
              trimBefore={Math.round(2.8 * FPS)}
              style={ECRAN}
            />
          </Series.Sequence>
          <Series.Sequence durationInFrames={55} layout="none">
            <Video
              src={staticFile(REC)}
              trimBefore={Math.round(3.5 * FPS)}
              playbackRate={22}
              style={ECRAN}
            />
          </Series.Sequence>
          <Series.Sequence durationInFrames={45} layout="none">
            <Video
              src={staticFile(REC)}
              trimBefore={Math.round(43.8 * FPS)}
              playbackRate={2.5}
              style={ECRAN}
            />
          </Series.Sequence>
          <Series.Sequence durationInFrames={52} layout="none">
            <Video
              src={staticFile(REC)}
              trimBefore={Math.round(47.5 * FPS)}
              playbackRate={3.5}
              style={ECRAN}
            />
          </Series.Sequence>
          <Series.Sequence durationInFrames={115} layout="none">
            <Video
              src={staticFile(REC)}
              trimBefore={Math.round(53.6 * FPS)}
              style={ECRAN}
            />
          </Series.Sequence>
        </Series>
      </div>
      </Sequence>
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
 * donc DERRIÈRE dès la première image, relevé de 1,45 et voilé à 0,20 seulement.
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
          Voile à 0,20 et clip relevé de 1,45 — le plafond mesuré le 14/09, au-delà
          duquel la peau sature. La source Amixem ouvre à 96 de luminance, plus
          bas que la précédente, d'où un relèvement au maximum admissible.
          Le voile ne sert plus qu'à asseoir le texte ; c'est le contour noir
          qui le rend lisible, pas l'assombrissement. */}
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
        <Sequence durationInFrames={108} name="Réaction">
          <Reaction />
        </Sequence>
      ) : null}

      <Sequence from={OFFRE_DEB} durationInFrames={DUREE_MCP - OFFRE_DEB} name="Offre">
        <OffreEssai duree={DUREE_MCP - OFFRE_DEB} />
      </Sequence>
    </AbsoluteFill>
  );
};
