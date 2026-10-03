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
/* La musique prend le relais à la frame qui suit immédiatement la dernière
   syllabe. La durée de la voix est MESURÉE sur le fichier (`ffmpeg -i`) et
   passée en réglage : l'estimer décale la musique. */
const DEBUT_VOIX = Math.round(0.6 * FPS);

export const DUREE_VOCAL = 13.5 * FPS; // 405 images — aucun temps mort

/** Un plan = une fenêtre de l'enregistrement, et ce qu'on en dit. */
type Plan = {
  debut: number;
  fin: number;
  rec: [number, number];
  /** Rectangle UTILE de l'enregistrement, en pixels source : [x, y, l, h]. */
  cadre: [number, number, number, number];
  texte?: string;
};

/* ── LA ZONE SÛRE, ET POURQUOI ELLE EXISTE ───────────────────────────────
   Un téléphone récent fait 19,5:9. Une vidéo 9:16 jouée en plein écran y est
   AGRANDIE jusqu'à remplir la hauteur — donc rognée sur les côtés. Retour du
   01/10, captures à l'appui : la grille des huit clips perdait sa première et
   sa dernière carte, et « 8 clips viraux trouvés » devenait « lips viraux
   fouvés ».

   Le premier montage posait l'enregistrement bord à bord : tout ce qui touchait
   un bord était condamné. Chaque plan déclare maintenant le rectangle qui
   compte, et on le place dans une zone qui survit au rognage.

   8 % de marge de chaque côté couvre le rapport 19,5:9 (1080 × 16/19,5 ≈ 886,
   soit 9 % perdus). */
const ZONE_L = 1080 * 0.84; // 907 px — aucun pixel utile au-delà
const ZONE_H = 1300;        // sous le bandeau, au-dessus de la légende
const ZONE_CY = 800;        // centre vertical de la zone utile

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
    /* La colonne centrale du site : titre, champ, « tes vidéos ». */
    cadre: [180, 120, 720, 1160],
    texte: "« Prends la dernière vidéo de La Boiserie »",
  },
  {
    /* On resserre sur le titre et la miniature qui vient d'apparaître. */
    debut: 2.6, fin: 5.2, rec: [19.0, 21.6],
    cadre: [280, 200, 520, 930],
    texte: "Elle la trouve toute seule.",
  },
  {
    /* L'écran d'analyse ne bouge quasiment pas : deux secondes suffisent à dire
       qu'il y a une attente. Le bandeau donne la durée vraie. */
    /* Mesuré : pendant l'analyse tout tient entre y=46 et y=640 sur 1920.
       Sans recadrage, les deux tiers bas de l'image sont du noir vide. */
    debut: 5.2, fin: 7.4, rec: [22.0, 60.0],
    cadre: [210, 30, 660, 630],
    texte: "Elle lit tout ce qui est dit.",
  },
  {
    /* La grille ne reste que deux secondes à l'image. On la RALENTIT — seul
       passage sous la vitesse réelle — parce que c'est le seul plan qui prouve
       quelque chose. Et on s'arrête à 240,8 : après, l'éditeur est déjà ouvert
       et la légende mentirait. */
    /* La grille occupe TOUTE la largeur de l'enregistrement : c'est le seul
       plan qu'il faut réduire (×0,87) au lieu d'agrandir, sinon les cartes des
       extrémités sortent du cadre. */
    debut: 7.4, fin: 10.6, rec: [238.8, 240.0],
    cadre: [20, 130, 1040, 860],
    texte: "Huit clips, notés.",
  },
  {
    /* ── POURQUOI LE FILM NE FINIT PLUS DANS L'ÉDITEUR ──────────────────
       Il s'y terminait sur « Téléchargement du clip… Récupération depuis
       YouTube ». Retour du 01/10 : « à la fin on voit ça alors qu'on devrait
       voir le résultat du clip final ». L'enregistrement s'est arrêté pendant
       ce téléchargement : le clip fini n'y est JAMAIS visible, aucun montage
       ne peut le rattraper.

       Alors on finit sur ce qui est vraiment là : un gros plan sur les notes.
       96, 95, 92 — c'est la preuve, et la grille dit elle-même « clique sur un
       clip pour le personnaliser et télécharger ».

       Le prochain tournage doit durer jusqu'à ce que le clip joue.

       La fenêtre s'arrête à 240,45 : relevé image par image, la grille tient
       jusqu'à 240,5 et l'éditeur s'ouvre à 240,6. Une fenêtre à 240,8 ramenait
       l'écran de téléchargement dans les dernières images. */
    debut: 10.6, fin: 13.5, rec: [240.0, 240.45],
    cadre: [20, 150, 530, 420],
    texte: "Prêts à publier.",
  },
];

const vitesse = (p: Plan) => (p.rec[1] - p.rec[0]) / (p.fin - p.debut);

/**
 * Les réglages d'un film : sa source, ses plans, sa voix. Ce qui change d'un
 * tournage à l'autre — tout le reste (zone sûre, musique, légendes, bandeau)
 * est commun et ne doit plus être recopié.
 */
export type ReglagesVocal = {
  source: string;
  plans: Plan[];
  /** Durée réelle du fichier de voix, en secondes. MESURÉE, jamais estimée. */
  dureeVoix: number;
  voix?: string;
  /**
   * Durée VRAIE de l'analyse, telle qu'elle s'écrit dans le bandeau.
   *
   * Elle était codée en dur (« 3 min 36 »), et le second film l'a donc annoncée
   * alors que son analyse avait duré 87 s. Un chiffre faux sur un bandeau qui
   * sert justement à ne pas tromper le spectateur est pire que pas de bandeau.
   */
  dureeVraie: string;
  /**
   * LE SON DU CLIP FINI, pour le dernier plan.
   *
   * Playwright n'enregistre QUE l'image : `rec-*.mp4` ne porte aucune piste
   * audio (vérifié, zéro flux). Montrer le clip généré sans l'entendre, c'est
   * montrer la moitié du résultat — « il faut qu'on entende le clip quand
   * même » (02/10).
   *
   * Le son doit donc venir du clip RÉELLEMENT exporté (`exporter-clip.mjs`),
   * pas d'une synthèse : faire dire au créateur des mots qu'il n'a pas dits
   * transformerait la démonstration en faux.
   *
   * `depart` est la position, en secondes DANS LE CLIP, qui correspond à la
   * première image du dernier plan. Elle se calcule avec les repères du
   * tournage : (rec_debut − repere.clipJoue) + position_au_moment_du_repere.
   */
  sonClip?: { fichier: string; depart: number; volume?: number };
};

const BOISERIE: ReglagesVocal = {
  source: "rec-vocal-0110-h264.mp4",
  plans: PLANS,
  dureeVoix: 2.16,
  voix: "voix/commande-vocale.mp3",
  dureeVraie: "3 min 36",
};

export const Vocal: React.FC<Partial<ReglagesVocal>> = (reglages) => {
  const { source, plans: PLANS_ACTIFS, dureeVoix, voix, dureeVraie, sonClip } =
    { ...BOISERIE, ...reglages };
  const dernier = PLANS_ACTIFS[PLANS_ACTIFS.length - 1];
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const s = frame / fps;

  const FIN_VOIX = DEBUT_VOIX + Math.round(dureeVoix * fps);

  const i = PLANS_ACTIFS.reduce((acc, p, k) => (s >= p.debut ? k : acc), 0);
  const plan = PLANS_ACTIFS[i];
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
    <AbsoluteFill /* Fond à la couleur de l'application : quand un plan doit être réduit
         (la grille), les bandes qui apparaissent se confondent avec elle au
         lieu de trancher en noir pur. */
      style={{ backgroundColor: "#0a0f0a", fontFamily: POLICE }}>
      {/* L'enregistrement, plein cadre, découpé en plans de vitesses différentes. */}
      {PLANS_ACTIFS.map((p) => {
        /* On amène le rectangle utile au centre de la zone sûre, à la plus
           grande échelle qui l'y fait tenir entièrement. Rien d'important ne
           peut donc approcher un bord, quel que soit le rognage du téléphone. */
        const [cx, cy, cl, ch] = p.cadre;
        const e = Math.min(ZONE_L / cl, ZONE_H / ch);
        const tx = 540 - (cx + cl / 2) * e;
        const ty = ZONE_CY - (cy + ch / 2) * e;
        return (
          <Sequence
            key={p.debut}
            from={Math.round(p.debut * fps)}
            durationInFrames={Math.round((p.fin - p.debut) * fps)}
            name={`${p.texte ?? ""} (x${vitesse(p).toFixed(1)} · cadre ×${e.toFixed(2)})`}
            layout="none"
          >
            <AbsoluteFill style={{ overflow: "hidden" }}>
              <Video
                src={staticFile(source)}
                trimBefore={Math.round(p.rec[0] * FPS)}
                playbackRate={vitesse(p)}
                style={{
                  position: "absolute",
                  width: 1080,
                  height: 1920,
                  transformOrigin: "0 0",
                  transform: `translate(${tx}px, ${ty}px) scale(${e})`,
                }}
                muted
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Voile bas : sans lui, un texte clair posé sur une interface claire
          devient illisible dès que le contenu de l'écran change. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 22%, transparent 38%)",
        }}
      />

      {/* Le commentaire, court, en bas. Il NOMME ce que l'écran montre au même
          instant — il ne raconte pas autre chose. */}
      {plan.texte ? (
        <div
          style={{
            position: "absolute",
            /* 22 % et non 14 % : à 14 % la légende tombait sur la ligne du
               pseudo d'Instagram, et « Elle lit tout ce qui est dit. » venait
               buter contre l'icône d'envoi. Les marges de 170 px la tiennent
               aussi à l'écart de la colonne de boutons, à droite. */
            bottom: height * 0.22,
            left: 170,
            right: 170,
            textAlign: "center",
            opacity: visible,
            transform: `translateY(${interpolate(visible, [0, 1], [16, 0])}px)`,
            color: "#fff",
            fontSize: i === 0 ? 56 : 64,
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
            /* Au-dessus de la zone utile (qui commence à 150 px), pas dessus. */
            top: 60,
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
            ACCÉLÉRÉ ×{Math.round(v)} · {dureeVraie} en vrai
          </span>
        </div>
      ) : null}

      {/* La commande, entendue. C'est elle qui fait comprendre qu'on a PARLÉ. */}
      <Sequence from={DEBUT_VOIX} name="La commande">
        {voix ? <Audio src={staticFile(voix)} /> : null}
      </Sequence>

      {/* La musique démarre PILE quand la voix se tait — pas avant, pas après.
          Première version livrée sans : « il y a la commande vocale et puis
          après, rien du tout, il n'y a plus de son » (01/10). Un silence de
          onze secondes sous des coupes rapides vide le montage de son élan.
          Le fichier commence sur un impact : on entend la musique ARRIVER. */}
      <Sequence from={FIN_VOIX} name="La musique">
        {/* La musique s'efface sous le clip : on vient là pour l'entendre, lui. */}
        <Audio
          src={staticFile("musique/vocal-pulse.mp3")}
          /* Fondu de 0,4 s plutôt qu'une bascule sèche : une musique qui
             tombe d'un coup s'entend comme un défaut, pas comme un choix. */
          volume={(f) => {
            if (!sonClip) return 1;
            const bascule = Math.round(dernier.debut * FPS) - FIN_VOIX;
            return interpolate(f, [bascule - 12, bascule], [1, 0.16], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
          }}
        />
      </Sequence>

      {/* Le son du clip généré, calé sur ce que montre le dernier plan. */}
      {sonClip ? (
        <Sequence from={Math.round(dernier.debut * FPS)} name="Le son du clip">
          <Audio
            src={staticFile(sonClip.fichier)}
            trimBefore={Math.round(sonClip.depart * FPS)}
            volume={sonClip.volume ?? 1}
          />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
