import { Audio, Video } from "@remotion/media";
import { AbsoluteFill, interpolate, Sequence, Series, staticFile } from "remotion";
import { POLICE } from "./police";
import { Punch } from "./Punch";
import { CartonFinal } from "./posts/CartonFinal";
import { HookFixe } from "./posts/HookFixe";

/**
 * PUB « PRISE UNIQUE » — 1080x1920, 15 s.
 *
 * Construite le 05/09/2026 sur la mesure de 22 Shorts a fort trafic (18 a 202 M
 * de vues), telecharges et analyses image par image. Elle applique quatre
 * resultats, dont deux contredisent frontalement ce qu'on faisait :
 *
 * 1. **LUMIERE.** Luminance mediane du corpus : 116/255, et 121 sur la premiere
 *    seconde. Nos pubs plafonnaient a 28 — quatre fois trop sombre. Une seule
 *    des 22 videos descend sous 60, et c'est la moins vue. D'ou le choix du
 *    rush : une conduite de jour dans Vice City, la fenetre la plus claire des
 *    segments disponibles (mesuree a 120 avant recadrage), et non un interieur
 *    nocturne.
 *
 * 2. **UNE SEULE COUPE.** Mediane du corpus : 0,22 coupe/seconde, et 7 videos
 *    sur 22 en ont zero ou une. Celle a 202 M de vues en a UNE en 17,7 s. On
 *    passait de cinq plans en quinze secondes : ici, une prise continue de
 *    douze secondes puis un seul raccord vers le carton final, soit
 *    0,07 coupe/seconde — le regime des toutes premieres.
 *
 * L'accroche vend l'OPPORTUNITE, pas la douleur : « tous les createurs GTA 6 vont
 * avoir besoin de clips ». Pour quelqu'un paye au millier de vues, une vague de
 * demande qui arrive est un levier plus fort qu'un reproche sur sa methode de
 * montage. L'echeance du 19 novembre 2026 descend au deuxieme palier, ou elle
 * donne l'urgence une fois la promesse posee.
 *
 * « Tout le monde clippe GTA 6 » a deja ete publie sur le compte : le republier
 * aurait gaspille le post.
 *
 * 3. **TROIS MOTS.** Les accroches du corpus font deux ou trois mots :
 *    « 2014 », « Take gunpowder ». La notre en faisait 58 caracteres sur deux
 *    lignes. Trois paliers de trois mots, qui composent une phrase d'un bout a
 *    l'autre de la video.
 *
 * 4. **UN GESTE DES L'IMAGE 1.** Dans le corpus, quelque chose est deja en
 *    mouvement a 0,6 s — une main, un visage qui parle. Jamais un decor qui
 *    s'installe. Ici la voiture roule des la premiere image.
 *
 * Le son est plein des l'image 1 (le corpus est a -16 dB sur la premiere
 * seconde contre -15,1 dB sur l'ensemble : aucune montee progressive).
 */
export const DUREE_PUB_CLAIRE = 450;

const PRISE = 360;

/* Le rush est deja au-dessus de la mediane du corpus : la sortie de garage
   monte a 221 de luminance. Un relevement de 16 % y ecrasait les hautes lumieres
   — les blancs cramaient sur les deux premieres secondes, ce qui se lit comme un
   defaut. On ne touche donc plus qu'a la saturation. */
const RELEVE = "saturate(1.1)";

export const PubClaire: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#eef3ef", fontFamily: POLICE }}>
    {/* Le son est pose ICI, au niveau de la composition, et non sur le <Video> :
        porte par le plan, il s'arretait avec lui et laissait le carton final
        muet pendant trois secondes — un cinquieme de la video, exactement la ou
        se decide le taux de completion. `loop` fournit la matiere au-dela des
        13 s du rush, et le fondu couvre le point de bouclage. */}
    <Audio
      src={staticFile("gta-jour.mp4")}
      loop
      volume={(f) =>
        interpolate(f, [PRISE + 5, DUREE_PUB_CLAIRE - 8], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />

    <Series>
      {/* Prise continue : aucune coupe pendant douze secondes. */}
      <Series.Sequence durationInFrames={PRISE} name="1 · Prise unique">
        <AbsoluteFill>
          <Video
            src={staticFile("gta-jour.mp4")}
            style={{ width: "100%", height: "100%", filter: RELEVE }}
            objectFit="cover"
            muted
            loop
          />

          {/* Voile leger et centre seulement : sur une image claire, le contour
              noir du texte fait l'essentiel de la lisibilite. Un voile lourd
              ramenerait la luminance sous la cible, ce qu'on cherche a eviter. */}
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(to bottom, rgba(4,10,7,0) 26%, rgba(4,10,7,0.34) 42%, rgba(4,10,7,0.34) 58%, rgba(4,10,7,0) 74%)",
            }}
          />

          {/* Le premier palier est un HOOK, pas une etiquette. Premiere version :
              « 26 minutes de jeu » — descriptif, aucune raison de rester. J'avais
              applique la regle des deux ou trois mots trop litteralement : dans le
              corpus mesure, les textes courts fonctionnent parce que le CONTENU
              accroche tout seul (un chat, un meme, un geste satisfaisant). Une
              voiture qui roule dans GTA n'accroche pas d'elle-meme : ici c'est la
              phrase qui doit le faire, donc elle a le droit d'etre plus longue.
              Elle tient cinq secondes, les deux paliers suivants sont courts. */}
          <Sequence durationInFrames={150} name="Hook · tout le monde clippe">
            <HookFixe
              ligne1="Tous les créateurs GTA 6"
              ligne2="vont avoir besoin de clips"
              centre
              taille={94}
              tailleLigne2={54}
            />
          </Sequence>

          <Sequence from={156} durationInFrames={96} name="Un stream = 10 clips">
            <HookFixe ligne1="Sortie le 19 novembre" centre taille={100} />
          </Sequence>

          <Sequence from={256} durationInFrames={PRISE - 256} name="10 clips, 60 secondes">
            <HookFixe ligne1="10 clips en 60 secondes" centre taille={92} />
          </Sequence>
        </AbsoluteFill>
      </Series.Sequence>

      {/* L'unique raccord de la video. */}
      <Series.Sequence durationInFrames={DUREE_PUB_CLAIRE - PRISE} name="2 · Créatis">
        <Punch>
          <CartonFinal clair mention="7 jours d’essai gratuit sur l’annuel" />
        </Punch>
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
