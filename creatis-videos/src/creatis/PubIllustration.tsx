import { Video } from "@remotion/media";
import { AbsoluteFill, Sequence, Series, staticFile } from "remotion";
import { POLICE } from "./police";
import { Punch } from "./Punch";
import { CartonFinal } from "./posts/CartonFinal";
import { HookFixe } from "./posts/HookFixe";

/**
 * « L’ILLUSTRATION OFFICIELLE » — 1080x1920, 11 s.
 *
 * Sixieme video de la serie, et la premiere qui n'ouvre pas sur du gameplay.
 *
 * POURQUOI CHANGER DE REGISTRE. Les deux trailers sont epuises de leur matiere
 * claire : les fenetres continues encore libres sont des interieurs de nuit et des
 * boites, tous sous 65 de luminance, alors que le corpus mesure est a 116. Faire
 * une sixieme video la-dedans aurait contredit la mesure qui a servi a construire
 * les cinq precedentes.
 *
 * La source retenue est le teaser du 27 aout : 26 s dont l'essentiel est de la
 * carte promotionnelle, mais quatre secondes montrent l'illustration officielle de
 * Jason et Lucia. C'est l'image la plus reconnaissable de tout GTA 6 et elle
 * n'apparait nulle part dans les cinq videos deja publiees.
 *
 * DEUX COUPES SEULEMENT. 0,27 coupe/seconde, la mediane du corpus etant a 0,22.
 * Ce n'est pas un compromis faute de plans : l'illustration se suffit et supporte
 * les 3,4 s. Le corpus le dit clairement — la video a 202 M de vues n'a qu'une
 * seule coupe en 17,7 s.
 *
 * Le plan d'ouverture s'arrete a 3,4 s et pas 4,4 : au-dela, le teaser enchaine
 * sur le logo Grand Theft Auto VI incruste. Emprunter l'illustration est une chose,
 * afficher le logo de Rockstar dans une video qui finit sur notre marque en est
 * une autre.
 */
export const DUREE_ILLU = 330;

/* [fichier, duree en images, luminance moyenne, luminance de debut] */
const PLANS: [string, number, number, number][] = [
  ["k1.mp4", 102, 106, 103],  // illustration officielle, Jason et Lucia
  ["s12.mp4", 66, 136, 132],  // l'homme a la chemise hawaienne, plein jour
  ["s21.mp4", 66, 94, 89],    // interieur de boutique
];

const RELEVE = (moy: number, debut: number) =>
  `brightness(${Math.min(1.9, 118 / ((moy + debut) / 2)).toFixed(2)}) saturate(1.08)`;

const DUREE_PLANS = PLANS.reduce((s, p) => s + p[1], 0);

export const PubIllustration: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#eef3ef", fontFamily: POLICE }}>
    <Series>
      {PLANS.map(([fichier, duree, moy, debut], i) => (
        <Series.Sequence key={fichier} durationInFrames={duree} name={`${i + 1} · ${fichier}`}>
          <AbsoluteFill>
            <Video
              src={staticFile(fichier)}
              style={{ width: "100%", height: "100%", filter: RELEVE(moy, debut) }}
              objectFit="cover"
              loop
            />
            {i === 0 ? (
              <Sequence durationInFrames={duree} name="Titre">
                <AbsoluteFill
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(4,10,7,0.3) 0%, rgba(4,10,7,0.1) 24%, rgba(4,10,7,0) 42%)",
                  }}
                />
                <HookFixe
                  ligne1="GTA 6 — Jason et Lucia"
                  ligne2="l’illustration officielle"
                  hauteur={9}
                  taille={84}
                  tailleLigne2={44}
                  couleurLigne2="#ffffff"
                />
              </Sequence>
            ) : null}
          </AbsoluteFill>
        </Series.Sequence>
      ))}

      <Series.Sequence durationInFrames={DUREE_ILLU - DUREE_PLANS} name="Créatis">
        <Punch>
          <CartonFinal clair mention="Ces clips ont été découpés automatiquement" />
        </Punch>
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
