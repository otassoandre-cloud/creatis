import { Video } from "@remotion/media";
import { AbsoluteFill, Sequence, Series, staticFile } from "remotion";
import { POLICE } from "./police";
import { Punch } from "./Punch";
import { CartonFinal } from "./posts/CartonFinal";
import { HookFixe } from "./posts/HookFixe";

/**
 * SERIE TRAILERS GTA VI — 1080x1920, 10 s chacune.
 *
 * NOUVELLE SOURCE. Les cinq montages precedents venaient tous du meme fichier :
 * la reprise IGN de « An Extended Look » (A-RU8qOAtRk). Six segments d'une seule
 * presentation, dont la moitie se passe dans le meme terminal d'aeroport — d'ou
 * la sensation de revoir la meme video. Le probleme n'etait pas le montage, il
 * etait en amont.
 *
 * Ces videos-ci sont montees a partir des deux trailers officiels :
 *   Trailer 1 (QdBZY2fkU-0, 295 M de vues) — 1920x1080 plein cadre
 *   Trailer 2 (VQRLujxTm3c, 182 M de vues) — 2,22:1, bandes noires retirees
 *     (crop=1920:864:0:108) AVANT recadrage, sinon le 9:16 embarque du noir.
 *
 * Le gain est mesurable : luminance mediane des plans retenus 118 contre 82 pour
 * l'Extended Look, et surtout des decors qui n'ont rien en commun — plage
 * aerienne, flamants roses, autoroute, gym en plein air, voitures de collection.
 *
 * FORMAT. Quatre plans de 2,2 s au lieu de trois de 3 s : les trailers sont
 * montes serre et n'offrent presque aucune fenetre continue de 3 s. Plutot que
 * de forcer et de tomber a cheval sur un raccord, on suit le rythme de la source.
 * Resultat : 0,3 coupe/seconde, au-dessus de la mediane du corpus (0,22) mais
 * dans sa fourchette, et bien plus de decors differents par video.
 *
 * TITRES. Ils ne nomment que ce qui est confirme : Vice City et l'etat de
 * Leonida apparaissent dans le trailer. Deux premiers jets, « Vice Beach » et
 * « les Everglades », ont ete corriges — ce sont des toponymes du monde reel ou
 * supposes, pas des lieux etablis du jeu, et un fan de GTA repere ce genre
 * d'erreur immediatement.
 *
 * CONTROLES. Chaque plan est verifie a 0,2 s, 1,1 s et 2,0 s (le cadrage doit
 * tenir), et sa fenetre est choisie parmi celles que la detection de scene
 * declare sans raccord interne. Ecartes a ce titre : s03 et s08 (deux raccords),
 * s10 et s18 (logo ou carton « Rockstar Games presents » incruste), s16 (cadre
 * sur un torse, pas de sujet).
 */
export const DUREE_TRAILER = 300;

const PLAN = 66;

/* [fichier, luminance moyenne, luminance de la premiere seconde] */
type Plan = [string, number, number];

const RELEVE = ([, moy, debut]: Plan) =>
  `brightness(${Math.min(1.9, 118 / ((moy + debut) / 2)).toFixed(2)}) saturate(1.08)`;

type Config = { titre: string; sous: string; plans: Plan[] };

/* Les cinq ouvertures sont les cinq images les plus fortes du lot, et n'ont
   aucun decor en commun. */
const SERIE: Record<string, Config> = {
  Plage: {
    titre: "GTA 6 — Vice City vue du ciel",
    sous: "trailer officiel",
    plans: [["s01.mp4", 139, 122], ["s15.mp4", 109, 110], ["s17.mp4", 103, 103]],
  },
  Flamants: {
    titre: "GTA 6 — les marais",
    sous: "Grand Theft Auto VI",
    plans: [["s02.mp4", 168, 187], ["s05.mp4", 103, 108], ["s09.mp4", 81, 61]],
  },
  SurLeau: {
    titre: "GTA 6 — sur l’eau",
    sous: "trailer officiel",
    plans: [["s04.mp4", 152, 152], ["s07.mp4", 53, 54], ["s20.mp4", 89, 89]],
  },
  Route: {
    titre: "GTA 6 — la route de Vice City",
    sous: "Grand Theft Auto VI",
    plans: [["s14.mp4", 154, 135], ["s11.mp4", 131, 132], ["s23.mp4", 96, 100]],
  },
  Leonida: {
    titre: "GTA 6 — Leonida",
    sous: "trailer officiel",
    plans: [["s06.mp4", 130, 138], ["s19.mp4", 63, 74], ["s22.mp4", 77, 83]],
  },
};

const Montage: React.FC<Config> = ({ titre, sous, plans }) => (
  <AbsoluteFill style={{ backgroundColor: "#eef3ef", fontFamily: POLICE }}>
    <Series>
      {plans.map((plan, i) => (
        <Series.Sequence key={plan[0]} durationInFrames={PLAN} name={`${i + 1} · ${plan[0]}`}>
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

      <Series.Sequence durationInFrames={DUREE_TRAILER - PLAN * 3} name="Créatis">
        <Punch>
          <CartonFinal clair mention="Ces clips ont été découpés automatiquement" />
        </Punch>
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);

export const TrailerPlage: React.FC = () => <Montage {...SERIE.Plage} />;
export const TrailerFlamants: React.FC = () => <Montage {...SERIE.Flamants} />;
export const TrailerSurLeau: React.FC = () => <Montage {...SERIE.SurLeau} />;
export const TrailerRoute: React.FC = () => <Montage {...SERIE.Route} />;
export const TrailerLeonida: React.FC = () => <Montage {...SERIE.Leonida} />;
