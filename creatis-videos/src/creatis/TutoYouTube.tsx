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
import { COULEURS } from "./theme";

/**
 * TUTORIEL YOUTUBE — 1920x1080.
 *
 * ── CE QUI A ÉTÉ CORRIGÉ, ET POURQUOI ────────────────────────────────────
 * La première version posait l'enregistrement VERTICAL d'un téléphone dans un
 * coin du cadre, avec un titre de 76 px à côté. C'est un réflexe de format
 * court appliqué à YouTube, et aucun créateur ne travaille comme ça. Sur un
 * écran d'ordinateur le spectateur est à cinquante centimètres d'une grande
 * dalle : il veut VOIR l'écran, pas lire une affiche.
 *
 * Les règles appliquées ici sont celles du format, pas des préférences :
 *
 *  1. PLEIN CADRE. L'enregistrement occupe 100 % de l'image. Il est filmé en
 *     1920x1080 par `enregistrer-parcours.mjs YOUTUBE=1` — une vraie fenêtre de
 *     bureau, donc la disposition de bureau du site et le texte d'interface à sa
 *     taille native, aussi lisible sur la vidéo que sur l'écran réel.
 *
 *  2. LE ZOOM EST UN ACCENT, PAS UNE LOUPE. Corollaire du point 1 : puisque le
 *     texte est déjà lisible, agrandir ne sert plus à déchiffrer, seulement à
 *     désigner. On plafonne donc à 1,18 — au-delà on rééchantillonne une source
 *     1080p vers une sortie 1080p, et l'interface se délave. La version
 *     précédente montait à 1,5 tout en affirmant en commentaire que « rien n'est
 *     agrandi » : les deux ne pouvaient pas être vrais en même temps.
 *
 *  3. TEXTE EN TIERS INFÉRIEUR, jamais au centre. Il ANNOTE, il ne raconte pas —
 *     c'est la voix qui raconte. Deux lignes maximum, et il disparaît.
 *
 *  4. TYPOGRAPHIE MESURÉE. Titre 48 px, corps 30 px sur 1080 de haut. La version
 *     précédente était à 76 et 36 : des tailles de format vertical, où l'on lit
 *     à bout de bras sur un écran de six pouces.
 *
 *  5. ZONES INTERDITES. Les 12 % du bas sont couverts par la barre de progression
 *     dès que la souris bouge, et le coin haut-droit par les fiches et l'écran de
 *     fin. Rien d'important n'y est posé.
 *
 * ── LA VITESSE N'EST PAS UNIFORME, ET C'EST LE SUJET ─────────────────────
 * L'enregistrement dure 161 s, la vidéo 34. Une accélération unique de 4,7x
 * aurait rendu illisible le seul plan qui démontre quelque chose — la grille de
 * clips notés, 11 secondes en tout — pour préserver ce qui n'a aucun intérêt :
 * 72 secondes de barre de progression.
 *
 * On fait donc l'inverse, et c'est le montage de n'importe quel tutoriel : les
 * gestes gardent leur durée réelle, les ATTENTES sont compressées. Les vitesses
 * ne sont jamais saisies à la main, elles se déduisent du rapport entre la
 * fenêtre montrée et le temps qu'on lui donne — même raison que dans Parcours,
 * où trois recalages manuels de suite s'étaient trompés.
 *
 * Et quand un segment dépasse 2x, un bandeau l'annonce. Sans lui, le spectateur
 * croit que l'analyse prend sept secondes, essaie, et trouve une minute : la
 * démonstration se retourne contre le produit. L'annoncer coûte un bandeau et
 * évite une déception.
 *
 * ── PIÈGE TRIMBEFORE ─────────────────────────────────────────────────────
 * `trimBefore` compte en images de la COMPOSITION (30 i/s), pas de
 * l'enregistrement (25 i/s). La conversion est donc : secondes x 30. Un premier
 * jet de Parcours avait converti avec 25 et commentait l'écran précédent.
 *
 * ── LA DURÉE VIENT DE LA VOIX ────────────────────────────────────────────
 * La voix du jour mesure 31,7 s, la composition 34 : 2,3 s de queue pour que
 * l'image finisse après la parole, sans silence qui traîne. Écrire plus long
 * obligerait à accélérer la diction, et une voix pressée est le premier signal
 * qu'on regarde une publicité. Le débit réel de « Charon » est de 190 mots par
 * minute, et non les 166 relevés sur une phrase isolée — une mesure faite sur
 * un échantillon trop court, qui avait produit un texte trop maigre et douze
 * secondes de silence en fin de montage.
 */

const FPS = 30;
export const DUREE_TUTO = 34 * FPS; // 1020 images

/** Marge de sécurité YouTube : rien d'important sous 88 % ni dans le coin haut-droit. */
const BAS_SUR = 0.88;
/** Au-delà, une source 1080p rééchantillonnée vers 1080p commence à se voir. */
const ZOOM_MAX = 1.18;

/**
 * Une étape = un segment de l'enregistrement, une annotation, et une zone à
 * regarder.
 *
 * `debut`/`fin` sont en secondes de la VIDÉO FINIE ; `rec` en secondes de
 * l'ENREGISTREMENT. La vitesse est le rapport des deux, jamais saisie à la main.
 * Les segments sont contigus sur l'enregistrement : un tutoriel qui saute des
 * morceaux donne l'impression de cacher une étape.
 */
export type EtapeTuto = {
  debut: number;
  fin: number;
  rec: [number, number];
  titre: string;
  detail: string;
  zoom?: number;
  cible?: { x: number; y: number };
};

/* ── LES REPÈRES DU SCRIPT SONT FAUX, ON LES A MESURÉS ───────────────────
 * `rec-youtube-2809.json` annonce la grille à 75,3 s. À l'image elle n'apparaît
 * qu'à 87 s. L'écart n'est pas une erreur du script : il pose son repère quand
 * le SÉLECTEUR apparaît dans le DOM, pas quand l'écran est peint — vignettes,
 * scores et notes arrivent après. Un premier montage calé sur ces repères
 * affichait « Cinq clips, notés » par-dessus la barre d'analyse encore en cours,
 * exactement le défaut déjà payé sur Parcours.
 *
 * Les bornes ci-dessous viennent donc d'une planche contact de l'enregistrement,
 * une image toutes les quatre secondes. Relevé :
 *   0 → 7 s     page de connexion (ne jamais montrer)
 *   7 → 15 s    accueil, saisie du lien, lancement
 *   15 → 87 s   analyse — 72 secondes d'attente pure
 *   87 → 98 s   LA GRILLE : 5 clips, notes 92 / 90 / 88 / 86 / 85
 *   98 → 158 s  éditeur : sous-titres, format, aperçu
 *
 * ── ET LES DÉCOUPES SUIVENT LA VOIX ──────────────────────────────────────
 * Frontières relevées au `silencedetect` sur la voix du jour (31,7 s) :
 * 7,9 / 15,4 / 20,7 / 25,2. Chaque plan change quand la phrase change, jamais
 * au milieu d'une. La composition fait 34 s : 2,3 s de queue après la dernière
 * phrase, de quoi laisser l'image finir sans silence qui traîne.
 *
 * Règle tenue partout : l'annotation ne dit que ce que l'écran montre au même
 * instant. Les notes citées à l'étape 3 sont lisibles sur les vignettes. */
export const ETAPES_DEFAUT: EtapeTuto[] = [
  {
    debut: 0, fin: 8, rec: [7.5, 15.5],
    titre: "Colle le lien de ta vidéo",
    detail: "Rien à télécharger, aucun logiciel à installer.",
    zoom: ZOOM_MAX, cible: { x: 0.5, y: 0.42 },
  },
  {
    debut: 8, fin: 15.5, rec: [15.5, 86.5],
    titre: "L'IA lit ce qui est dit",
    detail: "Transcription, puis repérage des passages qui se comprennent seuls.",
    zoom: 1,
  },
  {
    /* Plein cadre et vitesse réelle : seul plan qui PROUVE quelque chose. La
       grille ne bouge pas entre 87 et 98 s, on n'en prend donc que 5,5 s — de
       quoi la montrer sans l'accélérer. */
    debut: 15.5, fin: 21, rec: [86.5, 92.0],
    titre: "Cinq clips, notés",
    detail: "92, 90, 88, 86, 85 — déjà recadrés en vertical et sous-titrés.",
    zoom: 1,
  },
  {
    debut: 21, fin: 25.7, rec: [92.0, 99.5],
    titre: "À toi de trier",
    detail: "C'est la seule étape qui compte vraiment, et la seule qui ne s'automatise pas.",
    zoom: 1.1, cible: { x: 0.5, y: 0.5 },
  },
  {
    debut: 25.7, fin: 34, rec: [99.5, 158.0],
    titre: "Tu ajustes, puis tu exportes",
    detail: "Sous-titres, format, recadrage. Ou rien du tout.",
    zoom: 1,
  },
];

export type ReglageTuto = {
  enregistrement: string;
  voix?: string;
  etapes?: EtapeTuto[];
  titre?: string;
};

export const TUTO_DEFAUT: ReglageTuto = {
  /* Nom DATÉ, et non `rec-youtube.mp4` : l'enregistreur réécrit `parcours.mp4`
     à chaque tournage, y compris les verticaux. Un nom fixe aurait fait
     ressortir la vidéo d'hier sous le commentaire d'aujourd'hui.

     Et suffixe `-h264` : Playwright rend du VP8, dont les images-clés sont
     rares. Tant que le montage ne faisait qu'UNE lecture linéaire, ça ne se
     voyait pas ; à cinq segments, chacun cherchant jusqu'à 99 s dans le
     fichier, le rendu est passé de cinq à plus de huit minutes sans finir.
     Le ré-encodage pose une image-clé par seconde (`-g 25 -sc_threshold 0`)
     et coûte 65 s une fois pour toutes :

       ffmpeg -i rec-youtube-2809.mp4 -c:v libx264 -preset veryfast -crf 20               -pix_fmt yuv420p -r 25 -g 25 -keyint_min 25 -sc_threshold 0 -an               -movflags +faststart rec-youtube-2809-h264.mp4

     À refaire pour chaque nouvel enregistrement monté en segments. */
  enregistrement: "rec-youtube-2809-h264.mp4",
  voix: "tuto-du-jour.mp3",
  titre: "Une vidéo longue → des Shorts",
};

/** Vitesse d'un segment : rapport entre ce qu'il montre et le temps qu'il prend. */
const vitesse = (e: EtapeTuto) => (e.rec[1] - e.rec[0]) / (e.fin - e.debut);

export const TutoYouTube: React.FC<{ reglage?: ReglageTuto }> = ({
  reglage = TUTO_DEFAUT,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const etapes = reglage.etapes ?? ETAPES_DEFAUT;
  const seconde = frame / fps;

  const iActive = etapes.reduce((acc, e, i) => (seconde >= e.debut ? i : acc), 0);
  const etape = etapes[iActive];
  const precedente = etapes[Math.max(0, iActive - 1)];
  const debutImages = etape.debut * fps;

  /* Le zoom ne saute pas d'une étape à l'autre : il glisse sur une seconde et
     demie. Un changement d'échelle brutal se lit comme une coupe, et une coupe
     au milieu d'une démonstration donne l'impression qu'on a caché quelque chose. */
  const t = interpolate(frame - debutImages, [0, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const zoom = interpolate(t, [0, 1], [precedente.zoom ?? 1, etape.zoom ?? 1]);
  const cible = etape.cible ?? { x: 0.5, y: 0.5 };
  const cibleAv = precedente.cible ?? { x: 0.5, y: 0.5 };
  const cx = interpolate(t, [0, 1], [cibleAv.x, cible.x]);
  const cy = interpolate(t, [0, 1], [cibleAv.y, cible.y]);

  /* Le texte entre, tient, puis SORT avant l'étape suivante. Une annotation qui
     reste affichée en permanence cesse d'être lue. */
  const apparition = spring({ frame: frame - debutImages, fps, config: { damping: 200 }, durationInFrames: 10 });
  const finEtape = etape.fin * fps;
  const sortie = interpolate(frame, [finEtape - 20, finEtape - 6], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const visible = Math.min(apparition, sortie);
  const rapide = vitesse(etape) >= 2;

  /* Le bandeau de marque ne reste PAS affiché en continu. À l'étape 3 il venait
     se poser sur le titre de la page — « 5 clips viraux trouvés » — et deux
     textes superposés ne se lisent ni l'un ni l'autre. Au milieu il est de toute
     façon redondant : l'interface de Créatis est à l'écran, elle porte déjà la
     marque. On le montre donc là où il sert, à l'ouverture et en signature de
     fin, et il s'efface entre les deux. */
  const finVideo = etapes[etapes.length - 1].fin;
  const marque = Math.min(
    interpolate(seconde, [0, 0.4, 7, 8], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      + interpolate(seconde, [finVideo - 4.5, finVideo - 3.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    1,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: POLICE }}>
      {/* ── L'écran, plein cadre, avec la caméra qui se rapproche ──
          Un seul conteneur transformé pour tous les segments : une seule
          séquence est visible à la fois, et le zoom doit traverser les coupes
          sans se réinitialiser. */}
      <AbsoluteFill
        style={{
          transform: `scale(${zoom}) translate(${(0.5 - cx) * 100}%, ${(0.5 - cy) * 100}%)`,
          transformOrigin: "center center",
        }}
      >
        {etapes.map((e) => (
          <Sequence
            key={e.debut}
            from={Math.round(e.debut * fps)}
            durationInFrames={Math.round((e.fin - e.debut) * fps)}
            name={`${e.titre} (x${vitesse(e).toFixed(1)})`}
            layout="none"
          >
            <Video
              src={staticFile(reglage.enregistrement)}
              trimBefore={Math.round(e.rec[0] * FPS)}
              playbackRate={vitesse(e)}
              style={{ width: "100%", height: "100%" }}
              objectFit="cover"
              muted
            />
          </Sequence>
        ))}
      </AbsoluteFill>

      {/* Dégradé bas : sans lui, un texte clair posé sur une interface claire
          devient illisible dès que le contenu de l'écran change. */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 14%, transparent 30%)",
        }}
      />

      {/* ── Tiers inférieur : l'annotation ── */}
      <div
        style={{
          position: "absolute",
          left: width * 0.05,
          bottom: height * (1 - BAS_SUR) + 26,
          maxWidth: width * 0.62,
          opacity: visible,
          transform: `translateY(${interpolate(visible, [0, 1], [12, 0])}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div
            style={{
              padding: "5px 13px",
              borderRadius: 6,
              background: COULEURS.vert,
              color: "#04150d",
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: 0.4,
            }}
          >
            ÉTAPE {iActive + 1} / {etapes.length}
          </div>
          {/* Dire que c'est accéléré, sinon la démonstration promet une vitesse
              que le produit ne tiendra pas. */}
          {rapide ? (
            <div
              style={{
                padding: "5px 13px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.22)",
                color: "rgba(255,255,255,0.88)",
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              ACCÉLÉRÉ ×{Math.round(vitesse(etape))}
            </div>
          ) : null}
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, color: "#fff", lineHeight: 1.12, marginBottom: 8 }}>
          {etape.titre}
        </div>
        <div style={{ fontSize: 30, lineHeight: 1.45, color: "rgba(255,255,255,0.82)" }}>
          {etape.detail}
        </div>
      </div>

      {/* Bandeau de marque en haut-GAUCHE : le coin haut-droit reçoit les fiches
          YouTube et l'écran de fin, on n'y met jamais rien. Présent à l'ouverture
          et en signature de fin seulement — voir `marque` plus haut. */}
      <div
        style={{
          position: "absolute",
          left: width * 0.05,
          top: height * 0.06,
          opacity: marque,
          padding: "7px 16px",
          borderRadius: 8,
          background: "rgba(0,0,0,0.55)",
          border: `1px solid rgba(255,255,255,0.14)`,
          color: "rgba(255,255,255,0.9)",
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        {reglage.titre ?? "Tutoriel"} · creatis.app
      </div>

      {reglage.voix ? (
        <Sequence from={0} name="Voix off">
          <Audio src={staticFile(`voix/${reglage.voix}`)} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
