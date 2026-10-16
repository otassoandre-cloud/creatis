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
 * CLIP NARRÉ — 1080×1920. Un clip fini qui tourne, une voix qui l'explique.
 *
 * ── POURQUOI CE GABARIT, ET PAS UN QUATRIÈME « RÉSULTAT SEUL » ───────────
 * Les trois films précédents collaient le SON DU CLIP sous ses propres
 * images. C'est juste quand on a le fichier audio du clip — on ne l'a pas
 * toujours : un tournage Playwright enregistre l'image seule.
 *
 * Le 08/10 j'ai comblé ce manque avec le son d'un AUTRE clip : on entendait
 * parler de coffres et de bateaux sur des images de Whop. Le Short est tombé
 * à 91 vues quand les trois précédents tenaient 697, 703 et 1 208. La leçon
 * tient en une phrase : quand on n'a pas le son des images, on met une voix
 * qui parle DE ces images. Jamais un fond sonore emprunté.
 *
 * ── CE QUI EST MESURÉ, ET QU'ON NE TOUCHE PLUS ───────────────────────────
 * · le clip remplit le cadre, aucune interface ;
 * · la légende vit entre 14 et 48 % de la hauteur, sur un panneau sombre
 *   (zones relevées le 08/10 sur une capture iPhone 1179×2556) ;
 * · onze à treize secondes : la seule vidéo de la chaîne vue à 100 % dure 13 s.
 *
 * ── LES BORNES VIENNENT DE LA VOIX ───────────────────────────────────────
 * `silencedetect` sur le MP3 : chaque légende change exactement où la voix
 * respire. Une borne devinée fait changer le texte au milieu d'un mot.
 */

const VERT = "#10b981";
const FOND = "#06080a";

export type ReglagesClipNarre = {
  /** L'enregistrement vertical, déjà transcodé en H.264. */
  source: string;
  /** Seconde de l'enregistrement où le plan commence. */
  rec: number;
  /** Le fichier de voix, sous `public/voix/`. */
  voix: string;
  /**
   * Les légendes et la seconde où chacune apparaît (relevée au silencedetect).
   * `source` et `rec` permettent de CHANGER DE CLIP à chaque légende : les
   * trois Shorts à 697-1 208 vues montrent tous plusieurs visages différents,
   * et c'est la variété des visages qui tient le regard — pas le B-roll, qui
   * perd son sujet dès qu'on le recadre en vertical (essai du 09/10 : deux
   * plans sur quatre montraient une table basse et un formulaire Amazon).
   */
  legendes: {
    a: number; texte: string; gros?: boolean; source?: string; rec?: number;
    /** Une capture 16:9 posée en carte sur ce plan : le résultat, montré. */
    incrust?: string;
  }[];
  /** Durée totale du film, en secondes. */
  duree: number;
  /** Seconde d'apparition de l'adresse. */
  adresse: number;
  /**
   * Renvoi vers le format long du jour. Demande du 10/10 : un Short qui
   * accompagne une vidéo longue doit l'annoncer, à la voix ET à l'image —
   * c'est la seule passerelle qui amène du trafic vers un format qui ne
   * reçoit que huit ou neuf impressions tout seul.
   *
   * Quand il est posé, il remplace l'adresse sur le dernier plan : deux
   * appels concurrents sur la même seconde n'en font aboutir aucun.
   */
  renvoi?: string;
  /**
   * OÙ se trouve la vidéo complète. Sans ce champ, le renvoi disait « dans la
   * vidéo sur la chaîne » — et sur Instagram, où le Short est vu, il n'y a pas
   * de « chaîne » : le spectateur lit une promesse sans chemin pour y aller.
   * Relevé par l'utilisateur le 13/10, capture à l'appui.
   */
  ou?: string;
  /**
   * Appel à l'action de fin. Demandé le 12/10 : « lien cliquable en bio ».
   *
   * Vérifié avant de l'écrire, parce qu'une promesse fausse se paie : sur
   * Instagram le lien EST cliquable (et tagué `utm_content=link_in_bio`) ;
   * sur TikTok la bio affiche `creatis.app` en texte — le champ site web
   * cliquable demande mille abonnés, le compte en a 556 ; sur YouTube le lien
   * vit dans la description. « Lien en bio » est donc vrai partout, cliquable
   * là où la plateforme le permet.
   *
   * Il remplace l'adresse ET le renvoi : on ne demande qu'une chose à la fois.
   */
  appel?: { titre: string; sous?: string };
  /**
   * Rectangle utile dans la source. Par défaut on vise le LECTEUR d'un
   * tournage d'écran — mais un clip EXPORTÉ est déjà au format de sortie :
   * on passe alors `[0, 0, 1080, 1920]`, l'échelle vaut 1, et l'image reste
   * nette. C'est la correction du 10/10 : filmer l'aperçu imposait un
   * agrandissement de 234 %, et ça se voyait.
   */
  cadre?: [number, number, number, number];
};

/**
 * ── LE DÉFAUT EST DÉSORMAIS LE PLEIN CADRE ──────────────────────────────
 * Les clips viennent maintenant de `telecharger-clips.mjs`, qui récupère le
 * fichier EXPORTÉ par l'application : déjà en 1080×1920, sous-titres compris.
 * L'échelle vaut donc 1 et l'image reste nette.
 *
 * Le défaut a changé le 10/10 : il visait le LECTEUR d'un tournage d'écran
 * (540×820), ce qui imposait un agrandissement de 234 %. L'utilisateur l'a vu
 * sur son téléphone — « c'est zoomé, les clips sont flous ». Oublier de
 * préciser le cadre ne doit plus ramener ce défaut.
 */
const PLEIN_CADRE: [number, number, number, number] = [0, 0, 1080, 1920];

export const ClipNarre: React.FC<{ r: ReglagesClipNarre }> = ({ r }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const s = frame / fps;

  const i = r.legendes.reduce((acc, l, k) => (s >= l.a ? k : acc), 0);
  const courante = r.legendes[i];
  const fin = i + 1 < r.legendes.length ? r.legendes[i + 1].a : r.duree;

  const entre = spring({
    frame: frame - Math.round(courante.a * fps),
    fps,
    config: { damping: 200 },
    durationInFrames: 9,
  });
  const sort = interpolate(s, [fin - 0.3, fin - 0.08], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const visible = Math.min(entre, sort);

  const [cx, cy, cl, ch] = r.cadre ?? PLEIN_CADRE;
  /* MAXIMUM des deux rapports : le clip doit REMPLIR. Avec le minimum, les
     bords de l'interface de l'app restent dans le champ. */
  const e = Math.max(1080 / cl, 1920 / ch);
  const tx = 540 - (cx + cl / 2) * e;
  const ty = 960 - (cy + ch / 2) * e;

  return (
    <AbsoluteFill style={{ backgroundColor: FOND, fontFamily: POLICE }}>
      {/* ── UNE SÉQUENCE PAR PLAN ──────────────────────────────────────
          Premier essai : un seul lecteur et `trimBefore = (rec - a) * 30`.
          Dès qu'un plan montre une seconde ANTÉRIEURE à son apparition —
          rec 1 à a 2,1 — le calcul passe en négatif et Remotion refuse :
          « trimBefore must be greater than equal to 0 ».
          Chaque plan vit donc dans sa propre séquence : le temps local y
          repart de zéro, et `trimBefore` vaut simplement `rec`. */}
      {r.legendes.map((l, k) => {
        const finPlan = k + 1 < r.legendes.length ? r.legendes[k + 1].a : r.duree;
        return (
          <Sequence
            key={`plan-${l.a}`}
            from={Math.round(l.a * fps)}
            durationInFrames={Math.round((finPlan - l.a) * fps)}
            layout="none"
          >
            <AbsoluteFill style={{ overflow: "hidden" }}>
              <Video
                src={staticFile(l.source ?? r.source)}
                trimBefore={Math.round((l.rec ?? r.rec) * 30)}
                style={{
                  position: "absolute", width: 1080, height: 1920,
                  transformOrigin: "0 0",
                  transform: `translate(${tx}px, ${ty}px) scale(${e})`,
                }}
                muted
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      <div
        style={{
          position: "absolute", top: height * 0.30, left: 0, right: 0,
          display: "flex", justifyContent: "center",
          opacity: visible,
          transform: `translateY(${interpolate(visible, [0, 1], [-18, 0])}px)`,
        }}
      >
        <div
          style={{
            maxWidth: 940, textAlign: "center", color: "#fff",
            fontSize: courante.gros ? 86 : 70, fontWeight: 900,
            lineHeight: 1.12, letterSpacing: -2,
            padding: "26px 34px", borderRadius: 26, background: "rgba(0,0,0,0.72)",
            textShadow:
              "0 0 2px #000, 3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000",
          }}
        >
          {courante.texte}
        </div>
      </div>

      {/* L'appel à l'action prime sur tout le reste en fin de film. */}
      {r.appel && s >= r.adresse ? (
        <div
          style={{
            position: "absolute", left: 0, right: 0, top: height * 0.38,
            display: "flex", flexDirection: "column", alignItems: "center",
            opacity: interpolate(s, [r.adresse, r.adresse + 0.35], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div
            style={{
              fontSize: 76, fontWeight: 900, color: "#04120b", letterSpacing: -2,
              padding: "20px 38px", borderRadius: 22, background: "#19c37d",
              boxShadow: "0 16px 46px rgba(0,0,0,0.7)", textAlign: "center",
              lineHeight: 1.08,
            }}
          >
            {r.appel.titre}
          </div>
          {r.appel.sous ? (
            <div
              style={{
                marginTop: 16, fontSize: 48, fontWeight: 900, color: "#fff",
                padding: "10px 24px", borderRadius: 999, background: "rgba(0,0,0,0.78)",
                letterSpacing: -0.5,
              }}
            >
              {r.appel.sous}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Le renvoi prend la place de l'adresse : on ne demande qu'une chose. */}
      {/* ── LE RÉSULTAT, MONTRÉ ────────────────────────────────────────────
          Consigne du 11/10 : le spectateur doit VOIR la valeur et comprendre
          d'où elle vient, sans que ça fasse publicité. Une carte qui montre
          dix clips notés sortis d'une seule vidéo dit ça en une seconde ;
          une phrase qui l'annonce ne dit que de la réclame.
          Elle vit entre 44 et 64 % : sous la légende (30 %), au-dessus de la
          zone basse des plateformes (66 %). */}
      {courante.incrust ? (
        <div
          style={{
            position: "absolute", left: 0, right: 0, top: height * 0.44,
            display: "flex", justifyContent: "center", opacity: visible,
          }}
        >
          <div
            style={{
              width: 700, height: 394, borderRadius: 16, overflow: "hidden",
              border: "4px solid rgba(255,255,255,0.3)",
              boxShadow: "0 22px 60px rgba(0,0,0,0.85)", background: "#000",
            }}
          >
            <Video
              src={staticFile(courante.incrust)}
              trimBefore={0}
              style={{ width: 700, height: 394 }}
              muted
            />
          </div>
        </div>
      ) : null}

      {!r.appel && r.renvoi && s >= r.adresse ? (
        <div
          style={{
            position: "absolute", left: 0, right: 0, top: height * 0.40,
            display: "flex", justifyContent: "center",
            opacity: interpolate(s, [r.adresse, r.adresse + 0.4], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div
            style={{
              maxWidth: 940, textAlign: "center",
              padding: "20px 30px", borderRadius: 24,
              background: "rgba(16,185,129,0.94)",
              boxShadow: "0 14px 40px rgba(0,0,0,0.6)",
            }}
          >
            <div
              style={{
                fontSize: r.ou ? 44 : 54, fontWeight: 900, color: "#fff",
                lineHeight: 1.14, letterSpacing: -1.2,
              }}
            >
              {r.renvoi}
            </div>
            {r.ou ? (
              <div
                style={{
                  marginTop: 10, paddingTop: 10,
                  borderTop: "3px solid rgba(255,255,255,0.45)",
                  fontSize: 50, fontWeight: 900, color: "#04120b",
                  letterSpacing: -1, lineHeight: 1.1,
                }}
              >
                {r.ou}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {!r.appel && !r.renvoi && s >= r.adresse ? (
        <div
          style={{
            position: "absolute", left: 0, right: 0, top: height * 0.44,
            display: "flex", justifyContent: "center",
            opacity: interpolate(s, [r.adresse, r.adresse + 0.4], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div
            style={{
              fontSize: 48, fontWeight: 900, color: VERT, letterSpacing: -0.5,
              padding: "12px 26px", borderRadius: 999, background: "rgba(0,0,0,0.74)",
              textShadow: "0 0 2px #000",
            }}
          >
            creatis.app
          </div>
        </div>
      ) : null}

      <Sequence from={0} durationInFrames={Math.round(r.duree * fps)} layout="none">
        <Audio src={staticFile(`voix/${r.voix}`)} />
      </Sequence>
    </AbsoluteFill>
  );
};

/** Le film du 09/10 : où commencer la coupe. */
export const PUNCHLINE: ReglagesClipNarre = {
  source: "rec-amixem2-h264.mp4",
  rec: 0,
  voix: "narration-punchline.mp3",
  duree: 11.0,
  adresse: 9.9,
  legendes: [
    { a: 0, texte: "Ne commence pas ton clip sur la punchline.", gros: true },
    { a: 2.2, texte: "Commence 5 secondes avant." },
    { a: 4.0, texte: "Le temps qu'on comprenne de quoi ça parle." },
    { a: 5.8, texte: "Sinon il part avant la chute." },
  ],
};

export const DUREE_PUNCHLINE = Math.round(PUNCHLINE.duree * 30);

/**
 * Le film du 09/10 (second) : le premier plan décide de tout.
 *
 * Quatre VISAGES différents, un par légende. C'est le point commun des trois
 * Shorts qui tiennent 697 à 1 208 vues, et ce qui manquait à celui de 91 vues
 * comme à l'essai au B-roll : un sujet humain, cadré serré, à chaque plan.
 */
export const PREMIER_PLAN: ReglagesClipNarre = {
  source: "rec-amixem2-h264.mp4",
  rec: 1,
  voix: "narration-premier-plan.mp3",
  duree: 11.6,
  adresse: 10.4,
  legendes: [
    { a: 0, texte: "Ton premier plan décide de tout.", gros: true, source: "rec-amixem2-h264.mp4", rec: 1 },
    { a: 1.8, texte: "Un plan large ? Personne ne reste.", source: "rec-norman-h264.mp4", rec: 196 },
    { a: 5.3, texte: "Commence sur un visage. Cadré serré.", source: "rec-mastu-h264.mp4", rec: 228 },
    { a: 7.6, texte: "La seule image qui arrête le pouce.", source: "rec-mastu-h264.mp4", rec: 234.5 },
  ],
};

export const DUREE_PREMIER_PLAN = Math.round(PREMIER_PLAN.duree * 30);

/**
 * ── LES DEUX FILMS DU 10/10 ──────────────────────────────────────────────
 * Clips REGÉNÉRÉS le matin même sur deux vidéos sorties il y a cinq jours
 * (Squeezie et Amixem), plus les visages de la veille. Demande du 10/10 :
 * ne pas repasser toujours les mêmes clips.
 *
 * Les sous-titres incrustés restent hors champ (cadre 820) : le glisser dans
 * l'éditeur déplace bien le calque d'édition, mais le lecteur rend la vidéo
 * déjà encodée par le serveur, dont les sous-titres n'ont pas bougé. Vérifié
 * à l'image sur les deux tournages du 10/10.
 *
 * Le tournage Amixem du 10/10 est ÉCARTÉ : son clip ne montre aucun visage
 * (cartes marines, vagues, bassin de natation). La règle du 09/10 est que
 * chaque plan montre un visage qui remplit le cadre — un clip sans visage ne
 * sert pas, si neuf soit-il.
 */
export const IDEE_FINIE: ReglagesClipNarre = {
  source: "clip-squeezie-1.mp4",
  rec: 2.6,
  voix: "narration-idee-finie.mp3",
  duree: 11.2,
  adresse: 10.0,
  /* Clips EXPORTÉS depuis l'application : déjà en 1080×1920, sous-titres
     compris. Le cadre couvre donc toute l'image et l'échelle vaut 1 — aucun
     agrandissement, aucun flou. C'est la correction du 10/10. */
  cadre: [0, 0, 1080, 1920],
  legendes: [
    { a: 0, texte: "Ton clip s'arrête au milieu d'une phrase.", gros: true, source: "clip-squeezie-1.mp4", rec: 2.6 },
    { a: 2.1, texte: "C'est pour ça que personne ne le partage.", source: "clip-amixem-2.mp4", rec: 7 },
    { a: 3.9, texte: "Un clip se termine sur une idée finie.", source: "clip-squeezie-1.mp4", rec: 23.6 },
    { a: 6.4, texte: "Pas quand le compteur atteint 30 secondes.", source: "clip-amixem-4.mp4", rec: 2.5 },
    { a: 8.7, texte: "Coupe à la fin de la pensée.", source: "clip-amixem-2.mp4", rec: 2.5 },
  ],
};

export const DUREE_IDEE_FINIE = Math.round(IDEE_FINIE.duree * 30);

export const UN_SUJET: ReglagesClipNarre = {
  source: "clip-amixem-2.mp4",
  rec: 7,
  voix: "narration-un-sujet.mp3",
  duree: 9.6,
  adresse: 8.5,
  cadre: [0, 0, 1080, 1920],
  legendes: [
    { a: 0, texte: "Un clip, un seul sujet.", gros: true, source: "clip-amixem-2.mp4", rec: 7 },
    { a: 1.5, texte: "Dès que ça part ailleurs, tu coupes.", source: "clip-squeezie-1.mp4", rec: 2.6 },
    { a: 3.9, texte: "Deux idées en 30 secondes, on n'en retient aucune.", source: "clip-amixem-4.mp4", rec: 7.2 },
    { a: 7.1, texte: "Donc on ne partage rien.", source: "clip-squeezie-1.mp4", rec: 23.6 },
  ],
};

export const DUREE_UN_SUJET = Math.round(UN_SUJET.duree * 30);

/**
 * ── LES DEUX SHORTS DE RENVOI DU 10/10 ───────────────────────────────────
 * Demande du 10/10 : quand une vidéo longue sort, les Shorts du jour doivent
 * y renvoyer explicitement — à la voix et à l'image. C'est la seule
 * passerelle qui amène du public vers un format qui, seul, ne reçoit que
 * huit ou neuf impressions.
 *
 * Chacun prend UN des cinq critères de la vidéo longue, le traite en entier,
 * et annonce que les autres y sont. Un Short qui résume les cinq ne donnerait
 * aucune raison de cliquer.
 *
 * Le libellé dit « sur la chaîne » et non « au-dessus » : sur TikTok et
 * Instagram il n'y a rien au-dessus, et une indication fausse se paie plus
 * cher qu'une formulation plate.
 */
export const GAMEPLAY: ReglagesClipNarre = {
  source: "clip-sqz2-4.mp4",
  rec: 11.5,
  voix: "narration-gameplay.mp3",
  duree: 15.0,
  adresse: 11.8,
  renvoi: "Les 4 autres critères sont dans la vidéo complète",
  /* Matériau DISTINCT de celui des Shorts du matin. Le contrôle a refusé la
     première version : même gabarit et même réservoir de clips que la
     publication précédente, donc « la même vidéo deux fois » — et il avait
     raison, c'étaient les mêmes visages. On ne renomme pas la source pour
     passer, on change de source. */
  legendes: [
    { a: 0, texte: "Un gameplay muet ne donnera jamais un clip.", gros: true, source: "clip-sqz2-4.mp4", rec: 11.5 },
    { a: 2.7, texte: "Un clip vit par ce qui s'y dit, pas par ce qu'on y voit.", source: "clip-sqz2-3.mp4", rec: 8.5 },
    { a: 5.9, texte: "Podcasts, interviews, réactions : voilà ce qui se découpe.", source: "clip-sqz2-2.mp4", rec: 3.5 },
    { a: 9.7, texte: "C'est le 1er des 5 critères.", source: "clip-sqz2-4.mp4", rec: 3.5 },
    { a: 11.6, texte: "", source: "clip-sqz2-3.mp4", rec: 8.5 },
  ],
};

export const DUREE_GAMEPLAY = Math.round(GAMEPLAY.duree * 30);

export const TRENTE_SECONDES: ReglagesClipNarre = {
  source: "clip-amixem-2.mp4",
  rec: 7,
  voix: "narration-trente-secondes.mp3",
  duree: 14.3,
  adresse: 10.9,
  renvoi: "Les 5 critères sont dans la vidéo complète",
  /* ── POURQUOI CE LOT-LÀ ────────────────────────────────────────────────
     Le contrôle a refusé deux fois : d'abord le lot du matin (identique à la
     publication précédente), puis le lot « plateau » (identique au Short
     publié une heure avant). Il a eu raison les deux fois — c'étaient les
     mêmes visages à une heure d'intervalle.
     Les clips restants du jour n'ont AUCUN visage (mer, atelier, plateau
     vide). On revient donc au lot du matin, qui est distinct de la
     publication précédente et en est séparé de six heures et de trois
     publications. C'est une rotation, pas un contournement. */
  legendes: [
    { a: 0, texte: "Avant de lancer une analyse, fais ça.", gros: true, source: "clip-amixem-2.mp4", rec: 7 },
    { a: 2.0, texte: "Va au milieu de la vidéo. Regarde 30 secondes au hasard.", source: "clip-squeezie-1.mp4", rec: 2.6 },
    { a: 6.0, texte: "Si tu comprends sans contexte, elle se clippera.", source: "clip-amixem-4.mp4", rec: 7.2 },
    { a: 9.0, texte: "Sinon, passe à la suivante.", source: "clip-squeezie-1.mp4", rec: 23.6 },
    { a: 10.7, texte: "", source: "clip-amixem-2.mp4", rec: 2.5 },
  ],
};

export const DUREE_TRENTE_SECONDES = Math.round(TRENTE_SECONDES.duree * 30);

/**
 * ── LES TROIS SHORTS DU 11/10 : ON RÉÉLARGIT LE SUJET ────────────────────
 * Analyse du 11/10. La rétention des Shorts récents est la MEILLEURE de la
 * chaîne — 75 % et 67 %, contre 64 % pour celui qui a fait 1 209 vues. Ceux
 * qui regardent restent. Il y en a simplement beaucoup moins.
 *
 * La cause n'est donc ni le montage ni la voix : c'est la LARGEUR DU SUJET.
 *   · 1 209 vues — « Ta dernière vidéo contient dix moments » : tout créateur
 *   · 113 à 234  — « Un gameplay muet », « avant de clipper » : les clippeurs
 * On avait rétréci le public d'un facteur dix à cinquante.
 *
 * Ces trois-là parlent à n'importe qui publie des vidéos. Aucun mot de
 * clipping dans l'accroche, aucune connaissance préalable supposée.
 *
 * Clips : export Amixem du 11/10, décor extérieur — rien de commun avec les
 * deux lots de la veille, que le contrôle aurait refusés.
 *
 * ── LES SECONDES SONT CHOISIES, PAS PRISES AU HASARD ────────────────────
 * Ce tournage contient des cartons SPONSOR incrustés (L'Oréal) et des
 * graphiques plein cadre. Trois plans du premier montage tombaient dessus :
 * on aurait diffusé la publicité d'un tiers. Chaque seconde a donc été
 * vérifiée à l'image avant d'être retenue.
 */
export const PERSONNE: ReglagesClipNarre = {
  source: "clip-amx4-2.mp4",
  rec: 10,
  voix: "narration-personne.mp3",
  duree: 13.9,
  adresse: 12.4,
  legendes: [
    { a: 0, texte: "Personne ne regarde ta vidéo en entier.", gros: true, source: "clip-amx4-2.mp4", rec: 10 },
    { a: 2.4, texte: "Même pas tes abonnés.", source: "clip-amx4-1.mp4", rec: 8 },
    { a: 3.7, texte: "J'ai mesuré sur ma chaîne : 56 % en moyenne.", source: "clip-amx4-4.mp4", rec: 8.5 },
    { a: 7.3, texte: "La moitié part avant la fin.", source: "clip-amx4-2.mp4", rec: 16 },
    { a: 8.9, texte: "Arrête de soigner la fin. Soigne les 3 premières secondes.", source: "clip-amx4-1.mp4", rec: 16.5 },
  ],
};
export const DUREE_PERSONNE = Math.round(PERSONNE.duree * 30);

/**
 * ── LES DEUX SHORTS REFAITS DU 11/10 ─────────────────────────────────────
 * Correction demandée le 11/10, et elle porte sur le fond :
 *   · on ne parle PLUS des statistiques de notre compte — « j'ai mesuré sur
 *     ma chaîne, 56 % » n'intéresse personne et ne montre rien de la valeur ;
 *   · on raconte ou on APPREND À SE FAIRE PAYER, c'est ce que le public vient
 *     chercher ;
 *   · la valeur de Créatis se VOIT — une carte montre dix clips notés sortis
 *     d'une seule vidéo — sans qu'on dise d'aller sur le site. Le spectateur
 *     doit comprendre tout seul qu'il lui faut ça pour tenir la cadence.
 *
 * Les chiffres cités sont externes et vérifiables : 1,50 $ pour mille vues et
 * 250 000 $ de budget sont ceux de la campagne Roobet, relevés le 08/10 dans
 * les tarifs publics des campagnes Content Rewards.
 */
export const MILLE_VUES: ReglagesClipNarre = {
  source: "clip-sqz2-4.mp4",
  rec: 11.5,
  voix: "narration-mille-vues.mp3",
  duree: 14.6,
  adresse: 13.2,
  /* ── TROIS SHORTS, TROIS LOTS VISUELS ─────────────────────────────────
     Le contrôle refuse deux publications d'affilée qui partagent gabarit ET
     réservoir de clips — et il a raison, ce sont les mêmes visages. Les
     trois Shorts du jour tournent donc sur trois lots distincts :
     extérieur Amixem, plateau blanc, et le premier lot exporté. */
  legendes: [
    { a: 0, texte: "Une marque paie 1,50 $ pour 1 000 vues.", gros: true, source: "clip-sqz2-4.mp4", rec: 11.5 },
    { a: 2.8, texte: "Son budget : 250 000 $.", source: "clip-sqz2-3.mp4", rec: 8.5 },
    { a: 5.2, texte: "Ton travail, c'est d'aller chercher ces vues.", source: "clip-sqz2-2.mp4", rec: 3.5 },
    { a: 7.3, texte: "Pas avec un clip parfait. Avec 30 par semaine.", source: "clip-sqz2-4.mp4", rec: 3.5 },
    { a: 10.4, texte: "30 clips, ça se sort d'une seule vidéo longue.", source: "clip-sqz2-3.mp4", rec: 8.5, incrust: "tuto-grille-h264.mp4" },
  ],
};
export const DUREE_MILLE_VUES = Math.round(MILLE_VUES.duree * 30);

export const ABANDONNENT: ReglagesClipNarre = {
  source: "clip-amixem-2.mp4",
  rec: 7,
  voix: "narration-abandonnent.mp3",
  duree: 13.7,
  adresse: 12.4,
  legendes: [
    { a: 0, texte: "9 clippeurs sur 10 abandonnent en une semaine.", gros: true, source: "clip-amixem-2.mp4", rec: 7 },
    { a: 3.0, texte: "Pas parce que c'est dur.", source: "clip-squeezie-1.mp4", rec: 2.6 },
    { a: 4.1, texte: "Parce qu'ils cherchent des idées.", source: "clip-amixem-4.mp4", rec: 2.5 },
    { a: 5.6, texte: "Celui qui tient ne cherche rien : il prend une vidéo et en sort dix passages.", source: "clip-squeezie-1.mp4", rec: 23.6, incrust: "tuto-grille-h264.mp4" },
    { a: 10.8, texte: "Trois vidéos par semaine, et le compte y est.", source: "clip-amixem-2.mp4", rec: 2.5 },
  ],
};
export const DUREE_ABANDONNENT = Math.round(ABANDONNENT.duree * 30);

/**
 * ── LES TROIS SHORTS DU 12/10 ────────────────────────────────────────────
 * Mesure du matin : « Une marque paie 1,50 $ pour 1 000 vues » a fait 1 016
 * vues en vingt heures ; le même jour, celui qui citait nos statistiques en
 * a fait 285. L'accroche qui marche est donc une SOMME D'ARGENT concrète,
 * externe et vérifiable.
 *
 * Les trois reprennent cet axe, sur trois angles distincts du même sujet, et
 * renvoient tous vers le guide complet publié le même jour.
 *
 * Un lot de clips par Short : le contrôle refuse deux publications d'affilée
 * qui partagent gabarit et réservoir, et il a raison — ce sont les mêmes
 * visages.
 */
export const SIX_DOLLARS: ReglagesClipNarre = {
  source: "clip-sqz3-2.mp4",
  rec: 3,
  voix: "narration-six-dollars.mp3",
  duree: 13.0,
  adresse: 10.9,
  renvoi: "Le guide complet est sur la chaîne",
  legendes: [
    { a: 0, texte: "6 $ pour 1 000 vues.", gros: true, source: "clip-sqz3-2.mp4", rec: 3 },
    { a: 1.6, texte: "C'est le tarif le plus haut que j'aie vu sur une campagne.", source: "clip-sqz3-3.mp4", rec: 3 },
    { a: 4.4, texte: "La moyenne tourne plutôt autour d'1 $.", source: "clip-sqz3-2.mp4", rec: 8 },
    { a: 6.7, texte: "Aucun minimum d'abonnés : c'est la vue qui paie.", source: "clip-sqz3-3.mp4", rec: 7, incrust: "tuto-grille-h264.mp4" },
    { a: 10.7, texte: "", source: "clip-sqz3-2.mp4", rec: 3 },
  ],
};
export const DUREE_SIX_DOLLARS = Math.round(SIX_DOLLARS.duree * 30);

export const ZERO_ABONNE: ReglagesClipNarre = {
  source: "clip-amx5-1.mp4",
  rec: 15,
  voix: "narration-zero-abonne.mp3",
  duree: 14.6,
  adresse: 12.3,
  renvoi: "Le guide complet est sur la chaîne",
  legendes: [
    { a: 0, texte: "Zéro abonné. Et tu peux être payé dès demain.", gros: true, source: "clip-amx5-1.mp4", rec: 15 },
    { a: 2.8, texte: "Les campagnes ne regardent pas ton compte.", source: "clip-amx4-2.mp4", rec: 10 },
    { a: 5.7, texte: "Elles comptent les vues de tes clips.", source: "clip-amx5-1.mp4", rec: 5 },
    { a: 7.4, texte: "Un compte neuf à 30 clips bat un compte à 10 000 abonnés qui en publie 2.", source: "clip-amx4-4.mp4", rec: 8.5, incrust: "tuto-grille-h264.mp4" },
    { a: 12.2, texte: "", source: "clip-amx4-2.mp4", rec: 16 },
  ],
};
export const DUREE_ZERO_ABONNE = Math.round(ZERO_ABONNE.duree * 30);

export const MILLION: ReglagesClipNarre = {
  source: "clip-sqz2-4.mp4",
  rec: 11.5,
  voix: "narration-million.mp3",
  duree: 14.7,
  adresse: 12.4,
  renvoi: "Le guide complet est sur la chaîne",
  legendes: [
    { a: 0, texte: "Un million de vues, c'est 1 000 $.", gros: true, source: "clip-sqz2-4.mp4", rec: 11.5 },
    { a: 2.4, texte: "Fais ce calcul avant de commencer, pas après.", source: "clip-sqz2-3.mp4", rec: 8.5 },
    { a: 5.7, texte: "Un clip ordinaire fait 5 000 vues. Soit 5 $.", source: "clip-sqz2-2.mp4", rec: 3.5 },
    { a: 9.6, texte: "Le métier, c'est 30 clips par semaine.", source: "clip-sqz2-4.mp4", rec: 3.5, incrust: "tuto-grille-h264.mp4" },
    { a: 12.3, texte: "", source: "clip-sqz2-3.mp4", rec: 8.5 },
  ],
};
export const DUREE_MILLION = Math.round(MILLION.duree * 30);

/**
 * ── LE SHORT DU SOIR, 12/10 : APPEL À L'ACTION ───────────────────────────
 * Demandé ce soir : un appel à l'action en fin de vidéo, « lien cliquable en
 * bio », et le lien posé là où la plateforme le permet.
 *
 * État vérifié des bios avant d'écrire la promesse : Instagram a un lien
 * cliquable, déjà tagué pour l'attribution ; TikTok affiche l'adresse en
 * texte (le champ cliquable demande 1 000 abonnés, le compte en a 556) ;
 * YouTube porte le lien dans la description.
 *
 * Accroche : une somme concrète, comme les quatre contenus du jour — c'est
 * la forme qui a fait 1 016 vues hier contre 285 pour celle qui parlait de
 * nous. Et l'angle est le plus large possible : on peut être payé sans
 * jamais filmer.
 */
export const SANS_CAMERA: ReglagesClipNarre = {
  source: "clip-amx4-2.mp4",
  rec: 10,
  voix: "narration-sans-camera.mp3",
  duree: 12.8,
  adresse: 10.4,
  appel: { titre: "LIEN EN BIO", sous: "creatis.app" },
  legendes: [
    { a: 0, texte: "150 $ par semaine, sans jamais allumer une caméra.", gros: true, source: "clip-amx4-2.mp4", rec: 10 },
    { a: 3.4, texte: "Tu ne filmes rien.", source: "clip-amx4-1.mp4", rec: 8 },
    { a: 4.5, texte: "Tu découpes les vidéos des autres, et les marques paient les vues.", source: "clip-amx4-4.mp4", rec: 8.5 },
    { a: 7.4, texte: "30 clips par semaine à 5 000 vues : le compte y est.", source: "clip-amx4-2.mp4", rec: 16, incrust: "tuto-grille-h264.mp4" },
    { a: 10.4, texte: "", source: "clip-amx4-1.mp4", rec: 17 },
  ],
};
export const DUREE_SANS_CAMERA = Math.round(SANS_CAMERA.duree * 30);

/* ── LES TROIS SHORTS DU 13/10 ───────────────────────────────────────────
   Ils accompagnent le format long « Le clipping, c'est une arnaque ? » et
   chacun en traite UN morceau en entier — un Short qui résume les trois
   mensonges ne donne aucune raison de cliquer.

   L'accroche garde la forme qui a fait 1 018 vues le 11/10 contre 117 pour
   celle du lendemain : un ACTEUR qui agit (une marque paie, une campagne ne
   paie pas, une plateforme prélève) et un chiffre précis. Les deux Shorts à
   117 et 131 vues énonçaient une règle abstraite, sans personne dedans.

   Aucun ne promet la facilité : ils disent ce que ça coûte. C'est la ligne
   imposée par l'avertissement YouTube actif jusqu'au 28/10 (CONSIGNES.md).

   ── POURQUOI PAS DE CLIPS NEUFS AUJOURD'HUI ──────────────────────────
   Trois analyses lancées ce matin sur des vidéos sorties cette semaine
   (Amixem 51 min, Konbini 24 min, Konbini 15 min) n'ont rendu aucune carte
   de clip. Cause relevée en base : le compte studio-video@creatis.app est à
   30 analyses sur les 30 de son plan Pro pour le mois. Les trois demandes
   ont été refusées au quota, pas perdues par le script.

   On garde donc les trois lots verticaux existants, mais en prenant des
   SECONDES qui n'ont jamais servi — chaque plan a été choisi sur planche
   contact, et chacun montre un visage qui remplit le cadre. */

export const REGLES: ReglagesClipNarre = {
  source: "clip-sqz2-3.mp4",
  rec: 8,
  voix: "narration-regles.mp3",
  duree: 14.0,
  adresse: 11.1,
  renvoi: "Les 3 mensonges en entier",
  ou: "YouTube · @Creatis_officiel",
  legendes: [
    { a: 0, texte: "Ton clip fait 40 000 vues. La campagne ne te paie pas.", gros: true, source: "clip-sqz2-3.mp4", rec: 8 },
    { a: 3.2, texte: "Chaque campagne écrit ses règles.", source: "clip-sqz2-4.mp4", rec: 22 },
    { a: 6.8, texte: "Durée minimale, plateformes acceptées, source autorisée, délai de soumission.", source: "clip-sqz2-3.mp4", rec: 20 },
    { a: 11.1, texte: "Lis-les avant de publier, jamais après.", source: "clip-sqz2-4.mp4", rec: 8 },
  ],
};
export const DUREE_REGLES = Math.round(REGLES.duree * 30);

export const COMMISSION: ReglagesClipNarre = {
  source: "clip-sqz3-1.mp4",
  rec: 6,
  voix: "narration-commission.mp3",
  duree: 11.6,
  adresse: 8.6,
  renvoi: "Le calcul complet",
  ou: "YouTube · @Creatis_officiel",
  legendes: [
    { a: 0, texte: "Sur 100 $ gagnés en clipping, tu en touches 90.", gros: true, source: "clip-sqz3-1.mp4", rec: 6 },
    { a: 3.9, texte: "La plateforme prend sa commission, autour de 10 %. Le virement a ses propres frais.", source: "clip-sqz3-3.mp4", rec: 6 },
    { a: 8.6, texte: "Compte-le dès le départ, pas à la fin du mois.", source: "clip-sqz3-4.mp4", rec: 8 },
  ],
};
export const DUREE_COMMISSION = Math.round(COMMISSION.duree * 30);

export const FORMATION: ReglagesClipNarre = {
  source: "clip-amx4-4.mp4",
  rec: 8,
  voix: "narration-formation.mp3",
  duree: 13.7,
  adresse: 11.0,
  renvoi: "La vidéo complète",
  ou: "YouTube · @Creatis_officiel",
  legendes: [
    { a: 0, texte: "Une formation clipping à 300 €, pour des règles affichées gratuitement.", gros: true, source: "clip-amx4-4.mp4", rec: 8 },
    { a: 4.75, texte: "Les conditions sont écrites sur la page de la campagne.", source: "clip-amx4-3.mp4", rec: 10 },
    { a: 7.7, texte: "Le tarif, le budget restant, les sources autorisées.", source: "clip-amx4-2.mp4", rec: 6, incrust: "tuto-grille-h264.mp4" },
    /* Jamais rec 12 sur amx4-1 : c'est la carte de parrainage L'Oréal. */
    { a: 11.0, texte: "Tu peux tout lire avant même de créer un compte.", source: "clip-amx4-1.mp4", rec: 22 },
  ],
};
export const DUREE_FORMATION = Math.round(FORMATION.duree * 30);

/* ── LES TROIS SHORTS DU 15/10 ───────────────────────────────────────────
   Ils accompagnent le format long « Tes premiers 150 $ en clipping » et
   reprennent l'angle qui tient : la mesure du 15/10 dit que les Shorts qui
   énoncent une CONTRAINTE (les règles d'une campagne, la commission, les
   formations) plafonnent à 231 vues, quand ceux qui énoncent une somme à
   gagner font 673 et 1 018.

   Mais on ne répète pas la somme : on raconte ce qu'elle COÛTE en heures.
   Trois heures pour un clip, quatre-vingt-dix heures pour la semaine — c'est
   la soirée que le spectateur vient de passer, et c'est le vrai sujet du
   format long.

   Les lots sont les trois seuls réservoirs verticaux disponibles (le compte
   de production est à 30 analyses sur 30 pour le mois), mais AUCUNE des
   secondes utilisées le 13/10 n'est reprise : chaque plan a été choisi sur
   planche contact. */

export const TROIS_HEURES: ReglagesClipNarre = {
  source: "clip-sqz2-3.mp4",
  rec: 14,
  voix: "narration-trois-heures.mp3",
  duree: 14.0,
  adresse: 11.5,
  renvoi: "La méthode complète, en 6 minutes",
  ou: "YouTube · @Creatis_officiel",
  legendes: [
    { a: 0, texte: "Trois heures sur un seul clip.", gros: true, source: "clip-sqz2-3.mp4", rec: 14 },
    { a: 3.9, texte: "Tu as trouvé le passage, recadré, corrigé les sous-titres un par un.", source: "clip-sqz2-4.mp4", rec: 14 },
    { a: 7.5, texte: "Et au bout : 5 $.", gros: true, source: "clip-sqz2-3.mp4", rec: 26 },
    { a: 9.7, texte: "À ce rythme, il faut 90 heures pour 150 $ dans la semaine.", source: "clip-sqz2-4.mp4", rec: 30 },
  ],
};
export const DUREE_TROIS_HEURES = Math.round(TROIS_HEURES.duree * 30);

export const DIX_NOTES: ReglagesClipNarre = {
  source: "clip-sqz3-1.mp4",
  rec: 12,
  voix: "narration-dix-notes.mp3",
  duree: 12.4,
  adresse: 10.6,
  renvoi: "La démonstration entière est sur la vidéo longue",
  ou: "YouTube · @Creatis_officiel",
  legendes: [
    { a: 0, texte: "Une vidéo d'1 h contient 10 passages qui tiennent seuls.", gros: true, source: "clip-sqz3-1.mp4", rec: 12 },
    { a: 4.8, texte: "Tout le travail, c'est de les trouver.", source: "clip-sqz3-2.mp4", rec: 2 },
    { a: 6.5, texte: "Une note sur 100 sur chacun. Tu ouvres les mieux notés en premier.", source: "clip-sqz3-4.mp4", rec: 14, incrust: "grille-notee.mp4" },
    { a: 10.6, texte: "Tu ne regardes plus l'heure entière.", source: "clip-sqz3-1.mp4", rec: 18 },
  ],
};
export const DUREE_DIX_NOTES = Math.round(DIX_NOTES.duree * 30);

export const QUATRE_VINGT_DIX: ReglagesClipNarre = {
  source: "clip-amx4-2.mp4",
  rec: 14,
  voix: "narration-quatre-vingt-dix.mp3",
  duree: 14.2,
  adresse: 11.1,
  renvoi: "Le calcul complet, et la démonstration",
  ou: "YouTube · @Creatis_officiel",
  legendes: [
    { a: 0, texte: "30 clips montés à la main : 90 heures.", gros: true, source: "clip-amx4-2.mp4", rec: 14 },
    { a: 3.5, texte: "Les mêmes 30 clips autrement : 1 h 30.", gros: true, source: "clip-amx4-3.mp4", rec: 20 },
    { a: 7.3, texte: "Même nombre de clips, même tarif, même argent au bout.", source: "clip-amx4-4.mp4", rec: 16 },
    { a: 11.1, texte: "La seule variable, c'est le temps que tu mets par clip.", source: "clip-amx4-1.mp4", rec: 26 },
  ],
};
export const DUREE_QUATRE_VINGT_DIX = Math.round(QUATRE_VINGT_DIX.duree * 30);

/* ── LE SHORT DU 15/10, 20 h — UN TEST D'ACQUISITION ─────────────────────
   Analyse du 15/10 : sur YouTube, les Shorts font 34 à 682 vues et le
   classement est stable — une équivalence chiffrée surprenante gagne (682 et
   1 018 vues), la perte suit (189-232), la méthode ferme la marche (34-140).

   Mais le chiffre qui compte est ailleurs : AUCUNE de ces vues n'a jamais
   produit un inscrit attribué. Le lien ne fonctionne nulle part — TikTok ne
   le rend pas cliquable sous 1 000 abonnés, la bio Instagram est peu
   ouverte, la description YouTube peu lue.

   On change donc de monnaie : au lieu de demander un CLIC, on demande un
   COMMENTAIRE. Trois raisons, et elles sont vérifiables demain :
     1. le commentaire est gratuit pour le spectateur, contrairement au
        départ de l'application ;
     2. il nourrit la distribution au lieu de la contrarier ;
     3. il laisse un PSEUDO, c'est-à-dire quelqu'un à qui répondre — et nous
        avons déjà les outils (`destinataires.js`, `repondre.js`).

   La promesse doit être tenable sans rien inventer : les tarifs réels des
   campagnes sont relevés et publics. On les enverra.

   Tout le reste est tenu constant — gabarit, durée, style, voix, zone de
   légende — pour que l'écart de demain soit attribuable à l'appel. */

export const TARIFS: ReglagesClipNarre = {
  source: "clip-sqz3-4.mp4",
  rec: 6,
  voix: "narration-tarifs.mp3",
  duree: 14.3,
  adresse: 11.2,
  appel: { titre: "COMMENTE « TARIFS »", sous: "je t'envoie les chiffres réels" },
  /* ── CHOISIR UNE SECONDE NE SUFFIT PAS, IL FAUT UNE PLAGE ──────────
     Premier montage : cinq plans choisis sur une image chacun. Au rendu,
     quatre sur cinq montraient un dos — parce qu'un clip exporté contient
     ses propres COUPES, et que le plan vérifié avait disparu une seconde
     plus tard. On relève donc rec, rec+1,5 et rec+3, et on ne garde que ce
     qui tient toute la durée de la légende :
       clip-sqz3-4 ... plan stable de 6 à 11 s
       clip-amx4-4 ... plan stable de 14 à 17 s */
  legendes: [
    { a: 0, texte: "Le même clip, les mêmes vues, ne rapporte pas la même chose.", gros: true, source: "clip-sqz3-4.mp4", rec: 6 },
    { a: 3.8, texte: "0,20 $ pour 1 000 vues sur une campagne.", source: "clip-amx4-4.mp4", rec: 14 },
    { a: 6.4, texte: "6 $ sur une autre.", gros: true, source: "clip-amx4-4.mp4", rec: 16 },
    { a: 8.1, texte: "30 fois l'écart, pour exactement le même travail.", source: "clip-sqz3-4.mp4", rec: 7 },
    { a: 11.2, texte: "", source: "clip-sqz3-4.mp4", rec: 8 },
  ],
};
export const DUREE_TARIFS = Math.round(TARIFS.duree * 30);

/* ── LES TROIS SHORTS DU 16/10 ───────────────────────────────────────────
   Ils sont tirés du court-métrage du jour, qui raconte l'histoire d'Emrah
   Bayraktar (NPR, 12/05/2026) : trois emplois, une première notification à
   12 $, 2 500 $ deux semaines plus tard, et les 500 clips qu'il y a entre
   les deux.

   Deux mesures du 16/10 commandent ces trois pièces :
     · « Une vidéo d'1 h contient 10 passages » a fait 734 vues — la forme
       « fait surprenant énoncé platement » tient le haut du classement ;
     · le Short publié à 20 h a fait UNE vue, et celui du 12/10 publié à
       19 h 29 en avait fait huit en trois jours. **On ne publie plus le
       soir** : ces trois-là partent entre 10 h et 14 h. */

export const DOUZE_DOLLARS: ReglagesClipNarre = {
  source: "clip-sqz3-4.mp4",
  rec: 6,
  voix: "narration-douze-dollars.mp3",
  duree: 14.4,
  adresse: 10.4,
  renvoi: "Son histoire en entier, en 5 minutes",
  ou: "YouTube · @Creatis_officiel",
  legendes: [
    { a: 0, texte: "Sa première notification de clipping affichait 12 $.", gros: true, source: "clip-sqz3-4.mp4", rec: 6 },
    { a: 3.5, texte: "Douze. Pour des semaines de travail accumulé.", source: "clip-amx4-4.mp4", rec: 14 },
    { a: 6.4, texte: "La plupart des gens ferment l'application à ce moment-là.", source: "clip-amx4-4.mp4", rec: 16 },
    { a: 8.9, texte: "Lui a continué.", gros: true, source: "clip-sqz3-4.mp4", rec: 8 },
    { a: 10.4, texte: "Deux semaines plus tard : 2 500 $.", gros: true, source: "clip-sqz3-4.mp4", rec: 9 },
  ],
};
export const DUREE_DOUZE_DOLLARS = Math.round(DOUZE_DOLLARS.duree * 30);

export const CINQ_CENTS: ReglagesClipNarre = {
  source: "clip-amx4-4.mp4",
  rec: 14,
  voix: "narration-cinq-cents.mp3",
  duree: 11.5,
  adresse: 9.3,
  renvoi: "L'histoire complète est sur la chaîne",
  ou: "YouTube · @Creatis_officiel",
  legendes: [
    { a: 0, texte: "Entre 12 $ et 2 500 $, il y a 500 clips.", gros: true, source: "clip-amx4-4.mp4", rec: 14 },
    { a: 4.1, texte: "À une soirée par clip, ça fait 500 soirées.", source: "clip-sqz3-4.mp4", rec: 6 },
    { a: 7.0, texte: "C'est exactement là que tout le monde abandonne.", source: "clip-amx4-4.mp4", rec: 16 },
    { a: 9.3, texte: "Pas sur le talent. Sur le volume.", gros: true, source: "clip-sqz3-4.mp4", rec: 9 },
  ],
};
export const DUREE_CINQ_CENTS = Math.round(CINQ_CENTS.duree * 30);

export const TROIS_EMPLOIS: ReglagesClipNarre = {
  source: "clip-sqz3-4.mp4",
  rec: 7,
  voix: "narration-trois-emplois.mp3",
  duree: 16.2,
  adresse: 13.2,
  renvoi: "Son parcours en entier, en 5 minutes",
  ou: "YouTube · @Creatis_officiel",
  legendes: [
    { a: 0, texte: "Il lavait des voitures. Il faisait les nuits en entrepôt.", gros: true, source: "clip-sqz3-4.mp4", rec: 7 },
    { a: 3.9, texte: "Et il préparait des sandwichs derrière un comptoir.", source: "clip-amx4-4.mp4", rec: 15 },
    { a: 7.0, texte: "Le soir, il découpait des interviews en passages courts.", source: "clip-sqz3-4.mp4", rec: 9 },
    { a: 11.0, texte: "Trois ans plus tard, il en vit.", gros: true, source: "clip-amx4-4.mp4", rec: 16 },
    { a: 13.2, texte: "Aucun diplôme, aucune audience au départ.", source: "clip-sqz3-4.mp4", rec: 10 },
  ],
};
export const DUREE_TROIS_EMPLOIS = Math.round(TROIS_EMPLOIS.duree * 30);
