import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill, interpolate, Sequence, Series, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from "remotion";
import { POLICE } from "./police";
import { OffreEssai } from "./OffreEssai";
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
 * x2,7 pour rester lisible, l'analyse a x25 (76 secondes ramenees a 3 : personne
 * ne regarde une barre de progression en temps reel), la grille et le clic a x5
 * seulement — c'est le moment qui prouve le produit, il doit se lire.
 *
 * AUCUN SILENCE. Le son du clip tourne en continu au niveau de la composition et
 * l'image le rejoint a 12 s sans decalage. Sans ca, les 8 secondes d'interface
 * seraient muettes.
 *
 * SOURCE (12/09/2026). « J'ai cree ma propre marque de CIGARES » de La Menace,
 * publiee le 10/09. Mesuree avant de s'engager : 157 de luminance sur la source,
 * 135 sur le clip exporte — la source la plus lumineuse de toute la serie, loin
 * devant La Boiserie (136) qui occupait cette place.
 *
 * Et surtout elle repare le defaut de la version precedente : La Boiserie filmait
 * des voitures et des plans larges, donc `reframe_mode=face` retombait sur le crop
 * centre et le suivi de visage n'etait jamais demontre. Ici le sujet est une
 * personne qui parle, DECENTREE dans le cadre 16:9 — le recadrage doit aller la
 * chercher, et ca se voit.
 *
 * La video fait 55 minutes. Le client s'accorde 15 minutes de sondage
 * (`_pollTranscribeJob`) : l'analyse en a pris 140 secondes, tout est passe.
 *
 * Le commentaire est continu — 452 mots en deux minutes — donc aucun trou de son
 * a combler : le creux tombe a -19,5 dB, la ou l'interview precedente descendait
 * a -37 et demandait un compresseur.
 *
 * Ce que cette source ne montre PAS : le suivi de visage. Le sujet filme, ce sont
 * des voitures et des plans larges ; `reframe_mode=face` retombe alors sur le
 * crop centre, ce qui est son comportement voulu. Les sous-titres et le passage
 * en 9:16, eux, sont bien demontres.
 */
export const DUREE_PARCOURS = 645;

const APP_DEB = 120;   // 4,0 s  — l'encart de l'application apparait
const APP_FIN = 420;   // 14,0 s — il disparait
/* 16,7 s : l'offre d'essai se pose sur le clip, qui continue de tourner
   derriere elle jusqu'a la derniere image. */
const OFFRE = 501;

const VERT = "#10b981";
/* Plateau sombre : 50 de luminance moyenne, 47 sur la premiere seconde. La
   formule reclamerait le plafond de 1,9 ; comme sur le plateau de Squeezie ce
   serait un contresens — les visages sont correctement exposes, c'est le fond
   bleu nuit qui tire la moyenne vers le bas. 1,35 ouvre les noirs sans delaver
   la peau. */
const RELEVE = "brightness(1.35) saturate(1.05)";

/* Ce que l'on est en train de voir, aligne sur les trois vitesses du parcours. */
const LEGENDES: [number, number, string][] = [
  [0, 36, "Tu colles le lien"],
  [36, 108, "L’IA analyse la vidéo"],
  [108, 300, "8 clips prêts"],
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
const ParcoursAccelere: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={36} layout="none">
      <Video src={staticFile("parcours.mp4")} style={{ width: "100%", display: "block" }}
        trimBefore={90} playbackRate={9.17} muted />
    </Series.Sequence>
    <Series.Sequence durationInFrames={72} layout="none">
      <Video src={staticFile("parcours.mp4")} style={{ width: "100%", display: "block" }}
        trimBefore={1890} playbackRate={30.0} muted />
    </Series.Sequence>
    <Series.Sequence durationInFrames={192} layout="none">
      <Video src={staticFile("parcours.mp4")} style={{ width: "100%", display: "block" }}
        trimBefore={4050} playbackRate={2.17} muted />
    </Series.Sequence>
  </Series>
);

/* Les pastilles. Chaque valeur vient de la generation filmee derriere :
     26 min    duree reelle du podcast Underscore_ (1 554 s)
     2 min 01  duree reelle de l'analyse (14 s -> 135 s dans l'enregistrement)
     9:16     ce que le clip montre au meme instant
     32 s      duree du clip ouvert (00:38 -> 01:10), relevee par le script
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
  { debut: 130, duree: 36, valeur: "26 min", libelle: "DE PODCAST", x: 21, y: 22, angle: -3 },
  { debut: 178, duree: 36, valeur: "2 min 01", libelle: "D'ANALYSE", x: 78, y: 31, angle: 3 },
  { debut: 252, duree: 42, valeur: "0", libelle: "MONTAGE", x: 76, y: 41, accent: true, angle: -2 },
  { debut: 330, duree: 42, valeur: "SPLIT", libelle: "AUTOMATIQUE", x: 78, y: 24, accent: true, angle: 3 },
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
  { debut: 440, duree: 44, valeur: "SOUS-TITRES", libelle: "INCRUSTÉS", x: 62, y: 50, accent: true, angle: -2 },
  { debut: 494, duree: 50, valeur: "32 s", libelle: "PRÊT À POSTER", x: 66, y: 63, accent: true, angle: 2 },
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
      <Audio src={staticFile("clip-lamenace.mp4")} />

      {/* Le clip tourne jusqu'a la DERNIERE image. Il s'arretait a CLIP pour
          laisser place a un carton plein ecran ; l'offre se pose maintenant
          par-dessus lui, donc plus rien ne doit l'interrompre. */}
      <Sequence durationInFrames={DUREE_PARCOURS} name="Clip">
        <Video
          src={staticFile("clip-lamenace.mp4")}
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

      {/* L'offre par-dessus le clip, sur les 4,8 dernieres secondes. */}
      <Sequence from={OFFRE} durationInFrames={DUREE_PARCOURS - OFFRE} name="Offre d’essai">
        <OffreEssai duree={DUREE_PARCOURS - OFFRE} />
      </Sequence>

    </AbsoluteFill>
  );
};
