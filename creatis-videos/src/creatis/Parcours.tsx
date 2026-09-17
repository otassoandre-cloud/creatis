import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill, interpolate, Sequence, Series, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from "remotion";
import { POLICE } from "./police";
import { AppelCommentaire } from "./AppelCommentaire";
import { Pastille, Pastilles } from "./Pastilles";
import { AVEC_REACTION, Reaction } from "./Reaction";

/**
 * PARCOURS COMPLET — 1080x1920, 21,5 s.
 *
 * On voit enfin le trajet en entier : le lien collé, l'analyse, LES 10 CLIPS
 * generes, le clic sur l'un d'eux, puis ce clip en plein ecran.
 *
 * TOUT EST REEL. Enregistrement Playwright d'une generation qui a ABOUTI, et
 * c'est ce qui a demande le plus de travail : les deux tentatives precedentes
 * echouaient a 4 minutes sur le timeout client, parce que je lancais l'analyse
 * sur des videos de 1 h et de 3 h. Ici la source fait 8 minutes et l'app affiche
 * « 10 clips prets » a 100 secondes. Le clip montre a la fin sort de CETTE
 * generation-la, pas d'une autre : les vignettes de la grille et le plan final
 * sont le meme homme.
 *
 * TROIS VITESSES, parce qu'une seule ne marchait pas. La saisie du lien passe a
 * x5,6 pour rester lisible, l'analyse a x67 (200 secondes ramenees a 3 : personne
 * ne regarde une barre de progression en temps reel), la grille et le clic a x3
 * seulement — c'est le moment qui prouve le produit, il doit se lire.
 *
 * AUCUN SILENCE. Le son du clip tourne en continu au niveau de la composition et
 * l'image le rejoint a 12 s sans decalage. Sans ca, les 8 secondes d'interface
 * seraient muettes.
 *
 * SOURCE (17/09/2026, 2e). Amixem, « ON CONSTRUIT UNE MAISON EN SCOTCH »,
 * 36 minutes. L'analyse a rendu 10 clips en 3 min 01 ; le clip montre est le
 * premier de la grille — « Technique pour demander une augmentation », 46 s,
 * note 87.
 *
 * LA SOURCE EST DU DIVERTISSEMENT, ET C'EST UNE REGLE. Jamais de politique,
 * d'actualite ni d'enquete, meme quand ces sources mesurent mieux : la cible est
 * le createur de contenu, et un clip d'actualite fait juger la marque sur le
 * sujet du clip plutot que sur l'outil.
 *
 * UNE SOURCE A ETE ESSAYEE PUIS ECARTEE le meme jour : « LES PIRES MOTS DANS LE
 * CARNET », ou l'analyse a bien trouve 6 clips mais dont le meilleur — note 91 —
 * est une lettre d'exclusion filmee en gros plan. 234 de luminance, aucun visage,
 * aucun mouvement : un document blanc plein cadre, sur lequel un appel a l'action
 * en blanc devient invisible. Le score de l'IA dit ce qui se raconte, pas ce qui
 * se REGARDE ; il faut regarder le clip avant de le monter.
 *
 * LUMINANCE : 77 de moyenne sur le clip entier, 83 sur la fenetre retenue
 * (19 s -> 41,5 s, la plus claire des 22,5 s disponibles). Relevement x1,40,
 * juste sous le plafond de 1,45 au-dela duquel la peau sature.
 *
 * LE CLIP EST PRODUIT PAR LE CHEMIN DU PRODUIT, pas par un raccourci :
 * `exporter-clip.mjs` se connecte au compte, demande l'acces au service de
 * rendu comme le fait le studio, puis appelle `/process-clip` avec les reglages
 * par defaut (bold, 55, ligne a 82 %). Le segment demande — 9:40 a 10:26 — est
 * exactement celui que la grille filmee montre en premiere position.
 *
 * PAS DE HOOK SUR CETTE VERSION, et ce n'est pas un oubli. La version du 15/09
 * activait `hook_enabled` avec la phrase que l'IA avait ecrite pour son clip —
 * une capacite de plus, demontree en vrai. Ici le texte du hook n'a pas ete
 * conserve : l'enregistrement lit le titre et la note dans la grille, pas le
 * hook, et l'etat de la generation vit en memoire cote Railway. Plutot que
 * d'ecrire une phrase a la place de l'IA, on s'en passe. A recuperer la
 * prochaine fois en lisant `clips_status` pendant l'analyse.
 *
 * ── LA FENETRE MONTREE ────────────────────────────────────────────────────
 * Le clip dure 51 s, la video en montre 21,5 depuis son debut. C'est l'ouverture
 * qui a ete retenue : elle commence sur la fiche produit de la lampe a eau
 * salee — l'objet dont il est question — et c'est aussi le passage le plus
 * clair du clip. Les versions precedentes choisissaient leur fenetre sur le son,
 * pour eviter un silence au milieu ; ici l'echange est continu du debut a la
 * fin, la question ne se pose pas.
 */
export const DUREE_PARCOURS = 675;

const APP_DEB = 120;   // 4,0 s  — l'encart de l'application apparait
const APP_FIN = 420;   // 14,0 s — il disparait
/* 16,5 s : l'appel a commenter se pose sur le clip, qui continue de tourner
   derriere lui jusqu'a la derniere image. Six secondes, et pas moins : il
   demande un GESTE, pas une lecture. Le spectateur doit avoir le temps de lire
   le mot, de descendre au champ de commentaire et de le taper sans que la video
   ait boucle entre-temps. */
const OFFRE = 495;

const VERT = "#10b981";
/* AUCUN RELEVEMENT. 137 de luminance moyenne, 145 sur la premiere seconde :
   au-dessus des 116/121 du corpus. Toutes les sources anterieures a la veille
   reclamaient entre x1,24 et x1,45, et LEGEND aurait demande x1,6 — impossible
   sans bruler la peau. On garde une pointe de saturation, sans effet sur la
   luminance. */
const RELEVE = "brightness(1.40) saturate(1.04)";

/* Ce que l'on est en train de voir, aligne sur les trois vitesses du parcours. */
const LEGENDES: [number, number, string][] = [
  [0, 48, "Tu colles le lien"],
  [48, 126, "L’IA analyse la vidéo"],
  [126, 300, "Tes clips sont prêts"],
];

const Legende: React.FC<{ texte: string }> = ({ texte }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({ frame, fps, config: { damping: 16, stiffness: 220 } });
  return (
    <div style={{
      fontSize: 56, fontWeight: 800, color: "#fff", textAlign: "center",
      letterSpacing: "-0.025em", textShadow: "0 3px 22px rgba(0,0,0,0.95)",
      transform: `translateY(${interpolate(e, [0, 1], [34, 0])}px)`,
      opacity: interpolate(e, [0, 1], [0, 1]),
    }}>
      {texte}
    </div>
  );
};

/**
 * Les trois vitesses du parcours.
 *
 * `parcours.mp4` est desormais l'enregistrement BRUT de Playwright — 163 s,
 * VP8, 25 i/s — et non plus un fichier pre-monte. L'ancienne version etait
 * pre-accéléree a l'ffmpeg puis livree deja compressee a 8 s ; garder le brut
 * evite un re-encodage et permet de recaler les vitesses sans re-enregistrer.
 * (Le ffmpeg livre avec Remotion n'embarque pas `setpts`, de toute facon.)
 *
 * Repères mesures sur l'enregistrement, par ecart entre images successives.
 * Version TELEPHONE du 13/09, source Underscore_ (480x816, 148,9 s) :
 *   3 s    la page du studio s'affiche
 *   14 s   l'analyse demarre
 *   135 s  la grille des clips apparait, puis DEFILE
 *   144 s  le clip s'ouvre        (fin a 148,9 s)
 *
 * SOURCE. Un plateau de podcast, 26 minutes, 1,5 M de vues. Choisi pour une
 * raison precise : PLUSIEURS PERSONNES AUTOUR D'UNE TABLE. Konbini avait ete
 * essaye avant et ecarte au visionnage — c'etait un « Video Club », une seule
 * personne devant un mur de DVD, ou le split ne peut par construction jamais se
 * declencher.
 *
 * Deux autres essais ont echoue en amont, et pour la meme cause : le service
 * Railway a redemarre pendant l'analyse. Tout l'etat des jobs vit dans des
 * dictionnaires en memoire (JOBS, CLIPS, RAW_SEGMENTS, _transcribe_jobs), donc
 * un redemarrage les efface et le client interroge ensuite un job qui n'existe
 * plus — « GET /status/... 404 » jusqu'au bout de ses 15 minutes.
 *
 * LE CLIP EST EN SPLIT ADAPTATIF, c'est le sujet de cette version.
 * `reframe_mode=split` sans position manuelle ni repere declenche
 * `_reframe_split_dynamic` : le service analyse la video toutes les 0,5 s et
 * bascule seul — deux visages donnent un ecran scinde, un seul donne un suivi de
 * visage, aucun donne un crop centre. L'alternance n'est pas montee a la main,
 * c'est le comportement du produit.
 *
 * SOUS-TITRES : style `submagic`, celui que l'application applique d'office a la
 * fin d'une generation (`_currentStyle` dans clips-v2.html). Les versions
 * precedentes utilisaient `karaoke`, qui n'est pas le defaut.
 *
 * LE NOMBRE DE CLIPS N'EST PLUS ANNONCE, et c'est un constat, pas une pudeur :
 * quatre analyses de la MEME video ont rendu 10, 8, 8 puis 4 clips. Ecrire un
 * nombre par-dessus une grille qui en montre un autre le lendemain serait faux
 * une fois sur deux. Le libelle dit donc « tes clips sont prets » et laisse
 * l'ecran compter.
 *
 * Les trois durees ci-dessous somment exactement 240 images, soit la fenetre
 * APP_FIN - APP_DEB, et epousent les bornes de LEGENDES (44 / 135 / 240) : le
 * libelle affiche correspond donc toujours a ce qui est montre.
 *
 * L'analyse est vue a x30 : personne ne regarde une barre de progression en
 * temps reel, mais on veut la voir parcourir toute sa course, pas sauter.
 */
/* `layout="none"` sur chaque sequence : sans lui, Series.Sequence enveloppe ses
   enfants dans un conteneur en position absolue qui ne contribue plus a la
   hauteur. L'encart, dimensionne par son contenu, s'effondrait alors a quelques
   pixels — au rendu on ne voyait qu'un trait vert. */
/* Reperes releves image par image sur l'enregistrement du 15/09 (174,0 s) :
     4,0 s    le studio s'affiche, le champ est vide
     11,0 s   l'analyse demarre
     158,0 s  « 10 clips viraux trouves » — la grille apparait
     159,0 s  les vignettes sont chargees  <- c'est la qu'on entre
     167,0 s  le clip s'ouvre

   ATTENTION AU PIEGE : `trimBefore` compte en images de la COMPOSITION (30 i/s),
   pas de l'enregistrement (25 i/s). Un premier jet avait converti avec 25, et la
   phase « 10 clips prets » montrait encore l'ecran d'analyse — 36 secondes trop
   tot. La conversion est donc : secondes x 30.

   Les trois durees somment 300 images, soit APP_FIN - APP_DEB, et epousent les
   bornes de LEGENDES (48 / 126 / 300).

   Reperes releves image par image sur l'enregistrement (207,2 s, 25 i/s) :
      7,0 s   le lien s'ecrit dans le champ
     10,5 s   l'analyse demarre
    191,0 s   « 10 clips viraux trouves » — la grille apparait, puis DEFILE
    201,0 s   le clip s'ouvre           (fin a 207,2 s)

   Le premier jet demarrait a 10 s et allait jusqu'a 17 : le libelle « Tu colles
   le lien » s'affichait donc deja sur l'ecran d'analyse. Chaque phase doit tenir
   DANS son libelle, pas deborder sur le suivant. */
const ParcoursAccelere: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={48} layout="none">
      <Video src={staticFile("parcours.mp4")} style={{ width: "100%", display: "block" }}
        trimBefore={210} playbackRate={2.19} muted />
    </Series.Sequence>
    <Series.Sequence durationInFrames={78} layout="none">
      <Video src={staticFile("parcours.mp4")} style={{ width: "100%", display: "block" }}
        trimBefore={315} playbackRate={69.4} muted />
    </Series.Sequence>
    {/* La grille, en temps reel. C'est le seul plan qui PROUVE quelque chose :
        des vignettes, des notes, des durees, en nombre. Un premier jet la
        traversait a x1,85 avec l'ouverture du clip dans la meme sequence — elle
        ne tenait qu'une seconde et demie a l'ecran, on n'avait pas le temps de
        voir qu'il y en avait huit. Elle a desormais sa propre sequence, a
        vitesse reelle, et l'ouverture du clip la sienne. */}
    <Series.Sequence durationInFrames={126} layout="none">
      <Video src={staticFile("parcours.mp4")} style={{ width: "100%", display: "block" }}
        trimBefore={5730} playbackRate={2.38} muted />
    </Series.Sequence>
    <Series.Sequence durationInFrames={48} layout="none">
      <Video src={staticFile("parcours.mp4")} style={{ width: "100%", display: "block" }}
        trimBefore={6030} playbackRate={3.9} muted />
    </Series.Sequence>
  </Series>
);

/* Les pastilles. Chaque valeur vient de la generation filmee derriere :
     1 h 02    duree reelle du podcast
     2 min 27  duree reelle de l'analyse (11 s -> 158 s dans l'enregistrement)
     34 s      duree du clip ouvert, telle que la carte de la grille l'affiche
               (« 26:04 · 34s ») — la video n'en montre que 19 secondes, choisies
               sur le son, mais c'est bien ce que le produit a fabrique
     0        montage, au sens propre : aucune coupe faite a la main

   Ni le NOMBRE de clips ni le SCORE ne sont affiches. Les deux varient d'une
   analyse a l'autre — 10, 8, 8 puis 4 clips sur la meme video — donc les
   graver dans une video qui resservira demain en ferait des chiffres faux.
   Ce qui est constant, lui, est affiche : la duree de la source, celle de
   l'analyse, le format de sortie, la duree du clip.

   PLACEMENT — c'est ce que la derniere version ratait. Les pastilles etaient
   a 8 % de hauteur, donc DERRIERE la barre de recherche de TikTok : invisibles
   la ou on croyait les avoir mises. Elles se tiennent desormais dans la zone
   libre (16 %-78 %), et hors de la colonne de boutons de droite (x > 78 % des
   que y depasse 45 %).

   Tant que l'encart est a l'ecran (jusqu'a l'image 360), elles occupent les
   marges laterales qu'il laisse libres : il fait 480 px de large et centre,
   donc rien entre x = 0 et 28 %, ni entre 72 % et 100 %. Une fois l'encart
   parti, le cadre est libre et elles se centrent. */
const PASTILLES: Pastille[] = [
  // Pendant l'encart : dans les marges gauche et droite.
  { debut: 130, duree: 36, valeur: "36 min", libelle: "DE VIDÉO", x: 21, y: 22, angle: -3 },
  { debut: 178, duree: 36, valeur: "3 min 01", libelle: "D'ANALYSE", x: 78, y: 31, angle: 3 },
  { debut: 252, duree: 42, valeur: "0", libelle: "MONTAGE", x: 76, y: 41, accent: true, angle: -2 },
  /* « SPLIT AUTOMATIQUE » a saute : ce clip n'a qu'une personne a l'image, donc
     aucun split — l'afficher serait promettre ce que la video ne montre pas.
     Le recadrage, lui, est bien ce qu'on voit travailler. */
  { debut: 330, duree: 42, valeur: "9:16", libelle: "RECADRÉ TOUT SEUL", x: 78, y: 24, accent: true, angle: 3 },
  /* L'encart a disparu a l'image 420 et le sujet occupe alors tout le cadre.
     Un premier jet gardait ces deux pastilles a 26 % de hauteur, la ou elles
     etaient lisibles quand le telephone masquait le centre : elles tombaient
     desormais EN PLEIN VISAGE. Le recadrage 9:16 place la tete entre 15 % et
     45 % ; on descend donc sur le buste, decale a gauche puis a droite pour que
     les deux ne se lisent pas comme une pile.

     « 0 MONTAGE » et « SOUS-TITRES » sont a droite parce qu'elles tombaient sur
     l'incrustation du visage quand celle-ci durait toute la video. Elle ne dure
     plus que 3,7 s et ne les croise donc plus, mais on les laisse : a droite
     elles ne genent rien, et les ramener a gauche rouvrirait le conflit le jour
     ou l'incrustation reprendra de la place. */
  /* Elles redescendent a 63 %. Sur LEGEND le gros plan faisait tenir la tete
     jusqu'a 78 % de hauteur et il n'y avait de place qu'au-dessus ; ici le
     cadrage du podcast laisse le buste et le micro libres sous les sous-titres
     (50 %), ce qui est une bien meilleure place — au-dessus, elles empietaient
     sur le haut du crane. */
  /* Elles se partagent la seule fenetre ou le cadre est entierement libre :
     l'encart disparait a 420, l'offre d'essai arrive a 501. Quatre-vingt-une
     images pour deux pastilles. Au premier jet, « 51 s » commencait a 494 et
     n'avait donc que sept images — elle n'apparaissait jamais. */
  { debut: 426, duree: 36, valeur: "SOUS-TITRES", libelle: "INCRUSTÉS", x: 50, y: 63, accent: true, angle: -2 },
  { debut: 466, duree: 35, valeur: "46 s", libelle: "PRÊT À POSTER", x: 50, y: 63, accent: true, angle: 2 },
];
export const Parcours: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const voile = interpolate(frame, [APP_DEB - 8, APP_DEB + 10, APP_FIN - 12, APP_FIN + 6],
    [0, 0.76, 0.76, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const t = frame - APP_DEB;
  const e = spring({ frame: t, fps, config: { damping: 17, stiffness: 200 } });
  const sortie = interpolate(t, [APP_FIN - APP_DEB - 12, APP_FIN - APP_DEB], [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vis = (t >= 0 ? e : 0) * sortie;

  const leg = LEGENDES.find(([a, b]) => t >= a && t < b);

  return (
    <AbsoluteFill style={{ backgroundColor: "#050a07", fontFamily: POLICE }}>
      {/* La fenetre montree commence a 26 s du clip, pas a son debut. Mesure
          seconde par seconde : le clip alterne des pages produit tres claires
          (185-202 de luminance) et des plans de plateau (76-122). Le debut
          ouvre a 201 — une belle accroche — mais la fenetre correspondante
          faisait tomber l'offre d'essai sur une page produit blanche, ou le
          texte blanc devenait illisible. A 26 s, l'ouverture est a 116, soit
          exactement la mediane du corpus, et les cinq dernieres secondes se
          tiennent entre 83 et 92 : l'offre se pose sur une image calme. */}
      <Audio src={staticFile("clip-scotch.mp4")} trimBefore={570} />

      {/* Le clip tourne jusqu'a la DERNIERE image. Il s'arretait a CLIP pour
          laisser place a un carton plein ecran ; l'offre se pose maintenant
          par-dessus lui, donc plus rien ne doit l'interrompre. */}
      <Sequence durationInFrames={DUREE_PARCOURS} name="Clip">
        <Video
          src={staticFile("clip-scotch.mp4")}
          trimBefore={570}
          style={{ width: "100%", height: "100%", filter: RELEVE }}
          objectFit="cover"
          muted
        />
      </Sequence>

      {/* CETTE SEQUENCE DOIT DEMARRER A APP_DEB, pas a l'image 0. Premiere version :
          elle commencait a 0 et l'encart n'apparaissait qu'a 4 s — mais <Video> lit
          son propre temps depuis le montage de la sequence, donc parcours.mp4 etait
          deja 4 secondes plus loin, en pleine grille de clips. Resultat : le libelle
          « Tu colles le lien » s'affichait sur l'ecran des resultats. */}
      <Sequence from={APP_DEB} durationInFrames={APP_FIN - APP_DEB} name="Le parcours dans l’app">
        <AbsoluteFill style={{ backgroundColor: `rgba(5,10,7,${voile})` }} />

        {vis > 0.01 ? (
          <>
            {/* ZONES SURES DE TIKTOK, mesurees sur un cadre 1080x1920 :
                  0 -> 16 %   barre d'etat, onglets « Pour toi / Abonnements », loupe
                  16 -> 78 %  zone libre
                  > 78 %      legende, pseudo, bandeau musical
                  x > 78 % et y entre 45 % et 88 % : la colonne de boutons a droite
                L'encart commencait a 12,5 % : son bandeau superieur passait donc
                SOUS la barre de recherche. Il demarre maintenant a 16 % (307 px)
                et finit a 58,5 % (1 123 px), entierement dans la zone libre. */}
            <AbsoluteFill style={{ alignItems: "center", paddingTop: 307 }}>
              <div style={{
                width: 480, borderRadius: 38, overflow: "hidden",
                border: `3px solid ${VERT}`,
                boxShadow: "0 40px 130px rgba(0,0,0,0.92)",
                opacity: vis,
                transform: `translateY(${interpolate(vis, [0, 1], [55, 0])}px) scale(${interpolate(vis, [0, 1], [0.96, 1])})`,
              }}>
                <ParcoursAccelere />
              </div>
            </AbsoluteFill>

            {leg ? (
              <AbsoluteFill style={{ justifyContent: "flex-start", padding: "1230px 60px 0" }}>
                <Sequence from={leg[0]} durationInFrames={leg[1] - leg[0]} layout="none">
                  <div style={{ opacity: vis }}><Legende texte={leg[2]} /></div>
                </Sequence>
              </AbsoluteFill>
            ) : null}
          </>
        ) : null}
      </Sequence>

      {/* Au-dessus du clip ET de l'encart, mais SOUS le carton final : les
          pastilles s'arretent avec l'image qu'elles commentent. */}
      <Sequence durationInFrames={OFFRE} name="Pastilles" layout="none">
        <Pastilles liste={PASTILLES} />
      </Sequence>

      {/* Le visage. Inactif tant que public/reaction.mp4 n'existe pas : le
          montage rend alors exactement comme avant, sans trou ni erreur. */}
      {AVEC_REACTION ? (
        <Sequence durationInFrames={OFFRE} name="Réaction" layout="none">
          <Reaction />
        </Sequence>
      ) : null}

      {/* L'appel a commenter, par-dessus le clip, sur les 6 dernieres secondes.
          Il remplace « creatis.app » : une adresse oblige a sortir de
          l'application pour agir, un commentaire se tape sans quitter l'ecran —
          et il pousse la video a d'autres spectateurs par-dessus le marche.
          Voir l'en-tete d'AppelCommentaire. */}
      <Sequence from={OFFRE} durationInFrames={DUREE_PARCOURS - OFFRE} name="Appel a commenter">
        <AppelCommentaire duree={DUREE_PARCOURS - OFFRE} />
      </Sequence>

    </AbsoluteFill>
  );
};
