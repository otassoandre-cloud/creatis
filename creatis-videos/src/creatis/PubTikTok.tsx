import { AbsoluteFill, Series } from "remotion";
import { POLICE } from "./police";
import { Punch } from "./Punch";
import { COULEURS } from "./theme";
import { AppelAction } from "./tiktok/AppelAction";
import { CoutManuel } from "./tiktok/CoutManuel";
import { Hook66K } from "./tiktok/Hook66K";
import { Origine } from "./tiktok/Origine";
import { Resultat } from "./tiktok/Resultat";
import { Solution } from "./tiktok/Solution";

/**
 * PUB TIKTOK / REELS — 1080x1920, 19,1 s.
 *
 * Refonte de PubLancement pour l'audience short-form, sur des criteres mesures
 * et non sur du gout :
 *
 * 1. **Plus de logo en ouverture.** L'ancienne version ouvrait sur 2,5 s de
 *    logo. Le blog de Créatis lui-meme mesure « ~2 s pour decider si le
 *    spectateur reste » et cite « une intro avant le sujet » comme l'erreur qui
 *    tue la portee. On ouvre desormais sur un visage reel en mouvement, image 1,
 *    sans fondu au noir. Le logo est passe a la fin.
 *
 * 2. **Sous-titres incrustes partout.** Le meme blog mesure que **80 % regardent
 *    sans le son**. L'ancienne version faisait porter tout le sens par la voix
 *    off : 4 spectateurs sur 5 ne comprenaient rien. Le texte porte maintenant
 *    le message seul, la voix ne fait que doubler.
 *
 * 3. **Coupes franches, aucun fondu**, et un coup de zoom sur chacune
 *    (`Punch`). Sans lui, six plans fixes s'enchainaient comme un diaporama :
 *    chaque plan bougeait, mais la coupe elle-meme ne se sentait pas. Plans de
 *    1,9 s a 4,7 s, et le plan long (le produit) change de sous-titre 3 fois.
 *
 * 4. **Le debit de la voix a ete resserre de 23 %** (`dynamiser-voix.mjs`).
 *    Mesure : le plan produit tombait a 121 mots/minute et le CTA a 111, quand
 *    une pub reseaux sociaux tourne a 180-200. L'essentiel du gain vient des
 *    blancs entre les phrases, pas d'une acceleration du timbre.
 *
 * 5. **19,1 s**, contre 24,2 s avant. La fenetre 21-34 s citee pour les pubs
 *    TikTok vaut a contenu constant ; ici le texte n'a pas change, seul le
 *    temps mort a disparu. Rallonger les plans pour y rester reviendrait a
 *    remettre ce temps mort.
 *
 * 6. **La preuve d'abord.** Le clip a 66 000 vues ouvrait a 20 s dans l'ancienne
 *    version ; il est desormais l'accroche. C'est l'actif le plus fort dont on
 *    dispose : un vrai visage, un vrai chiffre, verifiable.
 */
export const DUREE_PUB_TIKTOK = 572;

export const PubTikTok: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COULEURS.fond, fontFamily: POLICE }}>
      {/* `Series` et non `TransitionSeries` : on veut des coupes seches. */}
      <Series>
        <Series.Sequence durationInFrames={108} name="1 · Accroche 66K">
          <Punch force={1.04} flash={0}>
            <Hook66K />
          </Punch>
        </Series.Sequence>

        <Series.Sequence durationInFrames={58} name="2 · D'où ça sort">
          <Punch>
            <Origine />
          </Punch>
        </Series.Sequence>

        <Series.Sequence durationInFrames={82} name="3 · 3 h à la main">
          <Punch force={1.1} flash={0.12}>
            <CoutManuel />
          </Punch>
        </Series.Sequence>

        <Series.Sequence durationInFrames={142} name="4 · Le produit (HyperFrames)">
          <Punch>
            <Solution />
          </Punch>
        </Series.Sequence>

        <Series.Sequence durationInFrames={88} name="5 · Résultat">
          <Punch force={1.08} flash={0.1}>
            <Resultat />
          </Punch>
        </Series.Sequence>

        <Series.Sequence durationInFrames={94} name="6 · Appel à l'action">
          <Punch>
            <AppelAction />
          </Punch>
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
