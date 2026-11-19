import { Video } from "@remotion/media";
import { AbsoluteFill, Sequence, Series, staticFile } from "remotion";
import { POLICE } from "./police";
import { Punch } from "./Punch";
import { CartonFinal } from "./posts/CartonFinal";
import { HookFixe } from "./posts/HookFixe";

/**
 * « CE QUE ROCKSTAR A MONTRÉ » — 1080x1920, 15 s.
 *
 * Premiere video du compte construite comme du CONTENU et non comme une pub :
 * aucune mention de Creatis avant la derniere seconde, aucun argument produit,
 * aucun chiffre de performance. Un fan de GTA doit pouvoir la regarder en entier
 * sans savoir qu'elle vient d'un outil.
 *
 * C'est la seule facon d'atteindre une audience qui scrolle : une promotion se
 * repere en une seconde et se fait passer. Un montage des meilleurs moments d'une
 * presentation de 26 minutes, lui, rend un service — la plupart des gens ne l'ont
 * pas regardee.
 *
 * Et le procede est honnete jusqu'au bout : ces six plans ont ete reellement
 * decoupes et recadres par Creatis depuis la reprise IGN de « GTA VI: An Extended
 * Look ». La video EST une demonstration du produit ; elle ne le dit simplement
 * qu'a la fin.
 *
 * EXPOSITION. Les rushes vont de 30 a 106 de luminance selon la scene. Chaque
 * plan porte donc son propre relevement pour arriver autour de 110 — la mediane
 * du corpus mesure est a 116. C'est aussi une regle de montage elementaire :
 * une exposition qui saute d'une coupe a l'autre se voit et fait amateur.
 */
export const DUREE_PUB_MONTAGE = 450;

type Plan = { fichier: string; duree: number; releve: string };

/* Six moments, ordonnes pour la variete : clair et peuple, mouvement, action,
   puis retour au calme. Le relevement est calcule par plan a partir de sa
   luminance mesuree. */
const PLANS: Plan[] = [
  { fichier: "m1.mp4", duree: 66, releve: "brightness(1.12) saturate(1.08)" }, // terminal, 99
  { fichier: "m2.mp4", duree: 60, releve: "brightness(1.05) saturate(1.08)" }, // conduite, 106
  { fichier: "m3.mp4", duree: 60, releve: "brightness(1.5) saturate(1.1)" },   // fusillade, 54
  { fichier: "m6.mp4", duree: 60, releve: "brightness(1.08) saturate(1.08)" }, // interieur, 103
  { fichier: "m4.mp4", duree: 66, releve: "brightness(1.45) saturate(1.1)" },  // personnages, 60
];

const DUREE_PLANS = PLANS.reduce((s, p) => s + p.duree, 0);

export const PubMontage: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#eef3ef", fontFamily: POLICE }}>
    <Series>
      {PLANS.map((p, i) => (
        <Series.Sequence key={p.fichier} durationInFrames={p.duree} name={`${i + 1} · ${p.fichier}`}>
          {/* Pas de flash ni de zoom : on ne veut pas d'effet de montage
              publicitaire. Des coupes seches, comme un montage de fan. */}
          <AbsoluteFill>
            <Video
              src={staticFile(p.fichier)}
              style={{ width: "100%", height: "100%", filter: p.releve }}
              objectFit="cover"
              loop
            />

            {/* Le titre n'apparait que sur le premier plan, et il annonce un
                service rendu — pas un produit. */}
            {i === 0 ? (
              <Sequence durationInFrames={p.duree} name="Titre">
                <AbsoluteFill
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(4,10,7,0.4) 0%, rgba(4,10,7,0.14) 24%, rgba(4,10,7,0) 42%)",
                  }}
                />
                <HookFixe
                  ligne1="Ce que Rockstar a montré"
                  ligne2="26 minutes de GTA 6"
                  hauteur={9}
                  taille={88}
                  tailleLigne2={46}
                  couleurLigne2="#ffffff"
                />
              </Sequence>
            ) : null}
          </AbsoluteFill>
        </Series.Sequence>
      ))}

      {/* La marque n'apparait qu'ici, sur les trois dernieres secondes. */}
      <Series.Sequence
        durationInFrames={DUREE_PUB_MONTAGE - DUREE_PLANS}
        name="Créatis"
      >
        <Punch>
          <CartonFinal clair mention="Ces clips ont été découpés automatiquement" />
        </Punch>
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
