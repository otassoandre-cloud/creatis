import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { POLICE } from "./police";

/**
 * VOCAL — 1080x1920, 22 s. Une phrase, et l'écran fait tout.
 *
 * ── POURQUOI CE FILM-LÀ ──────────────────────────────────────────────────
 * Tout ce qui a été publié avant EXPLIQUAIT ou AFFIRMAIT. Ici on ne commente
 * presque rien : on prononce « prends la dernière vidéo de La Boiserie », et
 * l'application cherche la chaîne, trouve la vidéo, l'analyse, en sort huit
 * clips notés, recadrés et sous-titrés. Ça se comprend sans une ligne de texte.
 *
 * ── CE QUI EST VRAI DANS CE QU'ON VOIT ───────────────────────────────────
 * Tout, sauf la transcription. La machine de tournage n'a aucune boucle audio —
 * mesuré trois fois : le faux micro de Chrome nourrit `getUserMedia` mais pas
 * `SpeechRecognition`, et le périphérique d'enregistrement par défaut capte 0
 * même quand le son est joué au niveau système. On a donc remplacé le
 * `SpeechRecognition` DU NAVIGATEUR par un double qui rend la phrase.
 *
 * Le reste est le produit : son gestionnaire vocal, l'extraction du nom de
 * chaîne, la recherche de la dernière vidéo, l'analyse, le découpage, les
 * notes. Chez un utilisateur qui a un micro, ce parcours est identique.
 *
 * ── LES VITESSES VIENNENT DES TEMPS RELEVÉS ──────────────────────────────
 * Relevés sur une planche contact, pas sur le fichier de repères qui se pose
 * quand le sélecteur entre dans le DOM :
 *     8 → 19 s    la commande, et « Je cherche la dernière vidéo de… »
 *    20 → 22 s    la vidéo trouvée, sa miniature apparaît
 *    22 → 238 s   l'analyse — trois minutes et demie
 *   239 → 241 s   LA GRILLE : huit clips notés. Deux secondes à l'écran.
 *   242 → 247 s   l'éditeur, le clip fini
 *
 * La grille est le seul plan qui prouve quelque chose, et c'est le plus court.
 * On le RALENTIT donc — seul passage sous la vitesse réelle — pendant que
 * l'analyse est comprimée quarante fois. Ce qui est long n'est pas ce qui est
 * intéressant.
 *
 * ── ZONES SÛRES 1080x1920 ────────────────────────────────────────────────
 *   0 → 16 %    barre d'état et onglets
 *   16 → 78 %   zone libre
 *   > 78 %      légende, pseudo, bandeau musical
 */

const FPS = 30;
export const DUREE_VOCAL = 13.5 * FPS; // 405 images — aucun temps mort

/** Un plan = une fenêtre de l'enregistrement, et ce qu'on en dit. */
type Plan = {
  debut: number;
  fin: number;
  rec: [number, number];
  texte?: string;
};

/* ── CHAQUE PLAN S'ARRÊTE QUAND IL A FINI DE DIRE CE QU'IL DIT ───────────
   Le premier montage faisait 22 s dont une bonne moitié de temps mort : trois
   secondes d'accueil immobile au début, cinq secondes d'écran d'analyse qui ne
   change pas, et le plan de la grille débordait sur l'éditeur — la légende
   disait « huit clips » pendant qu'on voyait déjà autre chose.

   Les fenêtres ci-dessous ne gardent QUE le moment où quelque chose se passe.
   13,5 s au lieu de 22, sans rien perdre de ce qui se voit. */
const PLANS: Plan[] = [
  {
    /* On entre quand le message « Je cherche la dernière vidéo de… » s'affiche,
       pas avant : les secondes où l'écran est figé n'apprennent rien. */
    debut: 0, fin: 2.6, rec: [15.6, 19.0],
    texte: "« Prends la dernière vidéo de La Boiserie »",
  },
  {
    debut: 2.6, fin: 5.2, rec: [19.0, 21.6],
    texte: "Elle la trouve toute seule.",
  },
  {
    /* L'écran d'analyse ne bouge quasiment pas : deux secondes suffisent à dire
       qu'il y a une attente. Le bandeau donne la durée vraie. */
    debut: 5.2, fin: 7.4, rec: [22.0, 60.0],
    texte: "Elle lit tout ce qui est dit.",
  },
  {
    /* La grille ne reste que deux secondes à l'image. On la RALENTIT — seul
       passage sous la vitesse réelle — parce que c'est le seul plan qui prouve
       quelque chose. Et on s'arrête à 240,8 : après, l'éditeur est déjà ouvert
       et la légende mentirait. */
    debut: 7.4, fin: 11.0, rec: [238.8, 240.8],
    texte: "Huit clips, notés.",
  },
  {
    debut: 11.0, fin: 13.5, rec: [241.6, 244.6],
    texte: "Prêts à publier.",
  },
];

const vitesse = (p: Plan) => (p.rec[1] - p.rec[0]) / (p.fin - p.debut);

export const Vocal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const s = frame / fps;

  const i = PLANS.reduce((acc, p, k) => (s >= p.debut ? k : acc), 0);
  const plan = PLANS[i];
  const v = vitesse(plan);

  const entre = spring({
    frame: frame - plan.debut * fps,
    fps,
    config: { damping: 200 },
    durationInFrames: 10,
  });
  const sort = interpolate(s, [plan.fin - 0.5, plan.fin - 0.15], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const visible = Math.min(entre, sort);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: POLICE }}>
      {/* L'enregistrement, plein cadre, découpé en plans de vitesses différentes. */}
      {PLANS.map((p) => (
        <Sequence
          key={p.debut}
          from={Math.round(p.debut * fps)}
          durationInFrames={Math.round((p.fin - p.debut) * fps)}
          name={`${p.texte ?? ""} (x${vitesse(p).toFixed(1)})`}
          layout="none"
        >
          <Video
            src={staticFile("rec-vocal-0110-h264.mp4")}
            trimBefore={Math.round(p.rec[0] * FPS)}
            playbackRate={vitesse(p)}
            style={{ width: "100%", height: "100%" }}
            objectFit="cover"
            muted
          />
        </Sequence>
      ))}

      {/* Voile bas : sans lui, un texte clair posé sur une interface claire
          devient illisible dès que le contenu de l'écran change. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 13%, transparent 28%)",
        }}
      />

      {/* Le commentaire, court, en bas. Il NOMME ce que l'écran montre au même
          instant — il ne raconte pas autre chose. */}
      {plan.texte ? (
        <div
          style={{
            position: "absolute",
            bottom: height * 0.14,
            left: 70,
            right: 70,
            textAlign: "center",
            opacity: visible,
            transform: `translateY(${interpolate(visible, [0, 1], [16, 0])}px)`,
            color: "#fff",
            fontSize: i === 0 ? 62 : 70,
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: -1.5,
            textShadow: "0 3px 24px rgba(0,0,0,0.85)",
          }}
        >
          {plan.texte}
        </div>
      ) : null}

      {/* Dire que c'est accéléré quand ça l'est. Sans ça, le spectateur croit
          que l'analyse prend cinq secondes, essaie, et trouve trois minutes. */}
      {v >= 3 ? (
        <div
          style={{
            position: "absolute",
            top: height * 0.17,
            left: 0,
            right: 0,
            textAlign: "center",
            opacity: visible,
          }}
        >
          <span
            style={{
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.22)",
              color: "rgba(255,255,255,0.9)",
              padding: "8px 18px",
              borderRadius: 10,
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            ACCÉLÉRÉ ×{Math.round(v)} · 3 min 36 en vrai
          </span>
        </div>
      ) : null}

      {/* La commande, entendue. C'est elle qui fait comprendre qu'on a PARLÉ. */}
      <Sequence from={Math.round(0.6 * FPS)} name="La commande">
        <Audio src={staticFile("voix/commande-vocale.mp3")} />
      </Sequence>
    </AbsoluteFill>
  );
};
