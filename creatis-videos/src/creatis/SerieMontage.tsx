import { Video } from "@remotion/media";
import { AbsoluteFill, Sequence, Series, staticFile } from "remotion";
import { POLICE } from "./police";
import { Punch } from "./Punch";
import { CartonFinal } from "./posts/CartonFinal";
import { HookFixe } from "./posts/HookFixe";

/**
 * SERIE DE MONTAGES GTA 6 — 1080x1920, 12 s chacun.
 *
 * Cinq videos construites comme du CONTENU : aucune mention de Creatis avant les
 * trois dernieres secondes, aucun argument produit. Le titre annonce ce qu'on va
 * voir, rien de plus. Un fan de GTA doit pouvoir les regarder sans savoir
 * qu'elles viennent d'un outil.
 *
 * Trois plans de 3 s, soit 0,25 coupe/seconde — la mediane exacte des 22 Shorts
 * a fort trafic mesures le 05/09. Le premier plan est toujours le plus fort de
 * la video : c'est lui qui retient ou non le pouce.
 *
 * RELEVEMENT PAR PLAN, MESURE EN DEUX POINTS. Chaque rush porte sa luminance
 * moyenne ET celle de sa premiere seconde, qui divergent beaucoup : `c3` fait 94
 * de moyenne mais ouvre a 62 -- c'est le depart de coup de feu qui tire la
 * moyenne vers le haut alors que le plan commence dans le noir. Relever sur la
 * seule moyenne aurait laisse l'ouverture sombre, or c'est l'image d'ouverture
 * qui decide. Le facteur se calcule donc sur la moyenne des deux, plafonne a 1,9
 * pour ne pas cramer les hautes lumieres.
 *
 * CINQ OUVERTURES DISTINCTES. Premiere version de cette serie : quatre des cinq
 * plans d'ouverture etaient un gros plan de visage dans le meme terminal --
 * a1, a2, b3, n1, n2, p2 et p5 sont sept variantes d'un seul moment du gameplay.
 * Postees a la suite, les videos se seraient lues comme un seul post reuploade,
 * ce qui annule l'interet d'en faire cinq. Les cinq ouvertures retenues n'ont
 * plus rien en commun : une fusillade, une sortie de garage en pleine lumiere,
 * un gros plan de visage, une scene exterieure devant des drapeaux, et une
 * poursuite en voiture de jour.
 *
 * Verification faite sur les six segments image par image, seuls gta-2 (rue de
 * jour) et gta-5 (terminal vitre) sont eclaires ; gta-1, gta-3, gta-4 et gta-6
 * sont des interieurs de nuit. Une sixieme video vraiment differente demanderait
 * une autre source, pas un autre montage.
 *
 * DEUX CONTROLES QUE LE MONTAGE PRECEDENT NE FAISAIT PAS.
 *
 * 1. Le cadrage est verifie a 0,3 s, 1,5 s ET 2,8 s, pas sur une seule image :
 *    quatre plans bien cadres au milieu sortaient du cadre a la fin. Le suivi de
 *    visage prend la mediane de sept images echantillonnees, donc sur un sujet
 *    qui bouge il vise une position intermediaire ou personne ne se trouve
 *    jamais. Ces plans de conversation sont a camera fixe et le sujet y est deja
 *    centre dans le 16:9 : q1 et q5 a q8 ont donc ete recoupes en
 *    `reframe_mode=center`, qui tient les trois secondes.
 *
 * 2. Les fenetres de 3,1 s sont choisies parmi celles que la detection de scene
 *    declare SANS raccord interne. Cinq plans du montage precedent etaient a
 *    cheval sur une coupe de la source : n1 changeait de plan a 0,5 s, b3 a
 *    2,5 s. Un raccord non voulu au milieu d'un plan casse le rythme mesure et se
 *    lit comme une erreur de montage.
 *
 * `q6` a d'abord ouvert « l'aeroport » : c'est le plan le plus lumineux du
 * terminal (116). Mais au controle, le sujet y occupe le bas-gauche du cadre et
 * les trois quarts de l'image sont une baie vitree vide -- une image que rien ne
 * retient. Il passe en deuxieme position, ou sa clarte sert, et `q7` prend
 * l'ouverture : plus sombre de 28 points, mais on y voit tout de suite quelqu'un
 * marcher. Le mouvement lisible passe avant la mesure de luminance.
 *
 * ECARTES apres controle : `a2` et `p5` (le sujet derive vers le bord gauche),
 * `d2` (aucun sujet lisible), `n2` (visage coupe au bord), `n1`, `b3` et `q4`
 * (raccord de la source au milieu du plan), `a4`, `b2`, `a3` (pas de sujet), et
 * `d4`, `e1`, `e4` (sous 45 de luminance, indelavables).
 */
export const DUREE_MONTAGE = 360;

const PLAN = 90;

/* [fichier, luminance moyenne, luminance de la premiere seconde] */
type Plan = [string, number, number];

/* Le facteur ramene chaque plan vers 118. Il DESCEND quand il le faut : `q8`
   sort du garage a 175 et serait crame tel quel. */
const RELEVE = ([, moy, debut]: Plan) =>
  `brightness(${Math.min(1.9, 118 / ((moy + debut) / 2)).toFixed(2)}) saturate(1.08)`;

type Config = { titre: string; sous: string; plans: Plan[] };

/* Le premier plan est le hook : lisible en une seule image, cadre stable sur ses
   trois secondes, sans raccord interne, et different des quatre autres videos. */
const SERIE: Record<string, Config> = {
  Fusillade: {
    titre: "GTA 6 — la fusillade",
    sous: "26 minutes de gameplay",
    plans: [["c3.mp4", 94, 62], ["n3.mp4", 86, 89], ["p1.mp4", 50, 64]],
  },
  ViceCity: {
    titre: "Vice City en plein jour",
    sous: "GTA 6, gameplay PS5",
    plans: [["q8.mp4", 175, 187], ["b1.mp4", 82, 90], ["p3.mp4", 60, 53]],
  },
  Personnages: {
    titre: "GTA 6 — les personnages",
    sous: "ce que Rockstar a montré",
    plans: [["q1.mp4", 91, 90], ["p2.mp4", 73, 82], ["a1.mp4", 66, 90]],
  },
  Aeroport: {
    titre: "GTA 6 — l’aéroport",
    sous: "26 minutes de gameplay",
    plans: [["q7.mp4", 88, 70], ["q6.mp4", 116, 113], ["e3.mp4", 66, 82]],
  },
  Poursuite: {
    titre: "GTA 6 — la poursuite",
    sous: "ce que Rockstar a montré",
    plans: [["q3.mp4", 48, 58], ["p4.mp4", 61, 62], ["q5.mp4", 82, 81]],
  },
};

const Montage: React.FC<Config> = ({ titre, sous, plans }) => (
  <AbsoluteFill style={{ backgroundColor: "#eef3ef", fontFamily: POLICE }}>
    <Series>
      {plans.map((plan, i) => (
        <Series.Sequence key={plan[0]} durationInFrames={PLAN} name={`${i + 1} · ${plan[0]}`}>
          {/* Coupes seches, ni flash ni zoom : on ne veut aucun effet de montage
              publicitaire, c'est ce qui trahit une promotion en une seconde. */}
          <AbsoluteFill>
            <Video
              src={staticFile(plan[0])}
              style={{ width: "100%", height: "100%", filter: RELEVE(plan) }}
              objectFit="cover"
              loop
            />
            {i === 0 ? (
              <Sequence durationInFrames={PLAN} name="Titre">
                <AbsoluteFill
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(4,10,7,0.3) 0%, rgba(4,10,7,0.1) 24%, rgba(4,10,7,0) 42%)",
                  }}
                />
                <HookFixe
                  ligne1={titre}
                  ligne2={sous}
                  hauteur={9}
                  taille={86}
                  tailleLigne2={44}
                  couleurLigne2="#ffffff"
                />
              </Sequence>
            ) : null}
          </AbsoluteFill>
        </Series.Sequence>
      ))}

      {/* La marque, uniquement ici. */}
      <Series.Sequence durationInFrames={DUREE_MONTAGE - PLAN * 3} name="Créatis">
        <Punch>
          <CartonFinal clair mention="Ces clips ont été découpés automatiquement" />
        </Punch>
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);

export const MontageFusillade: React.FC = () => <Montage {...SERIE.Fusillade} />;
export const MontageViceCity: React.FC = () => <Montage {...SERIE.ViceCity} />;
export const MontagePersonnages: React.FC = () => <Montage {...SERIE.Personnages} />;
export const MontageAeroport: React.FC = () => <Montage {...SERIE.Aeroport} />;
export const MontagePoursuite: React.FC = () => <Montage {...SERIE.Poursuite} />;
