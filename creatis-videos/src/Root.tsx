import { Composition, Folder } from "remotion";
import "./index.css";
import { avecPolice } from "./creatis/AvecPolice";
import { DUREE_HERO, HeroSite } from "./creatis/HeroSite";
import { DUREE_PUB_LANCEMENT, PubLancement } from "./creatis/PubLancement";
import { DUREE_PUB_TIKTOK, PubTikTok } from "./creatis/PubTikTok";
import { DUREE_PUB_DOULEUR, PubDouleur } from "./creatis/PubDouleur";
import { DUREE_PUB_GTA, PubGta } from "./creatis/PubGta";
import { DUREE_PUB_CLAIRE, PubClaire } from "./creatis/PubClaire";
import { DUREE_PUB_MONTAGE, PubMontage } from "./creatis/PubMontage";
import { DUREE_PARCOURS, Parcours } from "./creatis/Parcours";
import { PARCOURS } from "./creatis/parcours-reglages";
import { ArreteComme, DUREE_ARRETE } from "./creatis/ArreteComme";
import { DUREE_MUR, MurDeClips } from "./creatis/MurDeClips";
import { DUREE_REC, DuDebutALaFin, REC_DEFAUT } from "./creatis/DuDebutALaFin";
import { DUREE_TUTO, TutoYouTube, TUTO_DEFAUT } from "./creatis/TutoYouTube";
import { DUREE_LE_TRI, LeTri, LE_TRI_DEFAUT } from "./creatis/LeTri";
import { DUREE_SHORT_YT, ShortVersYouTube, SHORT_YT_DEFAUT } from "./creatis/ShortVersYouTube";
import { DUREE_PLEIN, ShortPleinCadre, PLEIN_DEFAUT, calculerDuree } from "./creatis/ShortPleinCadre";
import { DUREE_MECANIQUE, Mecanique } from "./creatis/Mecanique";
import { DUREE_CHIFFRES, Chiffres, CHIFFRES_DEFAUT } from "./creatis/Chiffres";
import { DUREE_VOCAL, Vocal } from "./creatis/Vocal";
import { AMIXEM } from "./creatis/VocalAmixem";
import { SQUEEZIE } from "./creatis/VocalSqueezie";
import { INOXTAG } from "./creatis/VocalInoxtag";
import { MICHOU } from "./creatis/VocalMichou";
import { MCFLY } from "./creatis/VocalMcfly";
import { MISTERV } from "./creatis/VocalMisterV";
import { CYPRIEN } from "./creatis/VocalCyprien";
import { MiniatureLongue } from "./creatis/MiniatureLongue";
import { MiniaturePremiere } from "./creatis/MiniaturePremiere";
import { DUREE_RETENTION, RetentionLongue } from "./creatis/RetentionLongue";
import { DUREE_PREMIERE, PremiereSeconde } from "./creatis/PremiereSeconde";
import { DUREE_METHODE, MethodeClips } from "./creatis/MethodeClips";
import { DUREE_LANCEMENT, Lancement } from "./creatis/Lancement";
import { LARGEUR_MINI, HAUTEUR_MINI, Miniature, MINI_DEFAUT } from "./creatis/Miniature";
import { ClaudeMcp, DUREE_MCP } from "./creatis/ClaudeMcp";
import { DUREE_V3, EtapesV3 } from "./creatis/Etapes3";
import { DUREE_V2, EtapesV2 } from "./creatis/Etapes2";
import { DUREE_ETAPES, Etapes } from "./creatis/Etapes";
import { Demo, DUREE_DEMO } from "./creatis/Demo";
import { DUREE_VITRINE, Vitrine } from "./creatis/Vitrine";
import { DUREE_ILLU, PubIllustration } from "./creatis/PubIllustration";
import {
  DUREE_TRAILER,
  TrailerFlamants,
  TrailerLeonida,
  TrailerPlage,
  TrailerRoute,
  TrailerSurLeau,
} from "./creatis/SerieTrailers";
import {
  DUREE_MONTAGE,
  MontageAeroport,
  MontageFusillade,
  MontagePoursuite,
  MontagePersonnages,
  MontageViceCity,
} from "./creatis/SerieMontage";
import { SceneInterface } from "./creatis/SceneInterface";
import { SceneLancement } from "./creatis/SceneLancement";
import { SceneOuverture } from "./creatis/SceneOuverture";
import { DUREE_PUB_VERTICALE, PubVerticale } from "./creatis/PubVerticale";
import { SceneCTA } from "./creatis/SceneCTA";
import { SceneHook } from "./creatis/SceneHook";
import { ScenePreuve } from "./creatis/ScenePreuve";
import { SceneProbleme } from "./creatis/SceneProbleme";
import { SceneProduit } from "./creatis/SceneProduit";
import { DUREE_POST_1, Post1Vues } from "./creatis/posts/Post1Vues";
import { DUREE_POST_2, Post2Erreur } from "./creatis/posts/Post2Erreur";
import { DUREE_POST_3, Post3AvantApres } from "./creatis/posts/Post3AvantApres";
import { DUREE_POST_4, Post4Liste } from "./creatis/posts/Post4Liste";
import { DUREE_POST_5, Post5Pov } from "./creatis/posts/Post5Pov";
import { DUREE_POST_9, Post9Univers } from "./creatis/posts/Post9Univers";
import { DUREE_POST_10, Post10Moments } from "./creatis/posts/Post10Moments";
import { DUREE_POST_11, Post11ZeroMontage } from "./creatis/posts/Post11ZeroMontage";
import { DUREE_POST_12, Post12Recadrage } from "./creatis/posts/Post12Recadrage";
import { DUREE_POST_6, Post6Ratio } from "./creatis/posts/Post6Ratio";
import { DUREE_POST_7, Post7Preuve } from "./creatis/posts/Post7Preuve";
import { DUREE_POST_8, Post8DejaLa } from "./creatis/posts/Post8DejaLa";
import { DUREE_POST_13, Post13Marche } from "./creatis/posts/Post13Marche";
import { DUREE_POST_14, Post14VingtTrois } from "./creatis/posts/Post14VingtTrois";
import { DUREE_POST_15, Post15Bande } from "./creatis/posts/Post15Bande";
import { DUREE_POST_16, Post16Transformation } from "./creatis/posts/Post16Transformation";

const FPS = 30;

/**
 * Chaque scene est aussi enregistree seule dans un dossier : dans Remotion
 * Studio, un double-clic sur une sequence de la video principale ouvre la
 * scene correspondante pour la retoucher isolement.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PubTikTok"
        component={PubTikTok}
        durationInFrames={DUREE_PUB_TIKTOK}
        fps={FPS}
        width={1080}
        height={1920}
      />

      <Composition
        id="PubDouleur"
        component={PubDouleur}
        durationInFrames={DUREE_PUB_DOULEUR}
        fps={FPS}
        width={1080}
        height={1920}
      />

      <Composition
        id="PubGta"
        component={PubGta}
        durationInFrames={DUREE_PUB_GTA}
        fps={FPS}
        width={1080}
        height={1920}
      />

      <Composition
        id="PubClaire"
        component={PubClaire}
        durationInFrames={DUREE_PUB_CLAIRE}
        fps={FPS}
        width={1080}
        height={1920}
      />

      <Composition
        id="PubMontage"
        component={PubMontage}
        durationInFrames={DUREE_PUB_MONTAGE}
        fps={FPS}
        width={1080}
        height={1920}
      />

        <Composition
          id="ClaudeMcp"
          component={ClaudeMcp}
          durationInFrames={DUREE_MCP}
          fps={FPS}
          width={1080}
          height={1920}
        />
        {/* Trois vidéos, un seul composant : tout ce qui change d'une
            génération à l'autre tient dans `reglage`. Les vitesses du parcours
            se déduisent des repères, il n'y a que des secondes à relever. */}
        {/* Meme matiere que le Parcours — meme enregistrement, meme clip —
            mais la demonstration est precedee de ce qu'elle remplace. */}
        {/* Une vidéo entre, neuf clips sortent — montré, pas raconté. */}
        {/* Une seule prise de l'application, en plein cadre, jusqu'au fichier
            obtenu. Les reperes se relevent sur l'enregistrement. */}
        {/* Seule composition en 16:9 : YouTube n'est pas un fil vertical, on y
            vient pour apprendre. Toutes les autres restent en 1080x1920. */}
        {/* Motion design integral, zero capture d ecran : la piece MONTRE le
            mecanisme au lieu de l affirmer. */}
        <Composition
          id="Miniature"
          component={Miniature}
          durationInFrames={1}
          fps={30}
          width={LARGEUR_MINI}
          height={HAUTEUR_MINI}
          defaultProps={{ reglage: MINI_DEFAUT }}
        />
        {/* La declinaison verticale du film de lancement. Meme composant : les
            deux passages qui cassaient en 9:16 — la rangee de clips et la
            grille — se reorganisent selon le format. */}
        <Composition
          id="LancementVertical"
          component={Lancement}
          durationInFrames={DUREE_LANCEMENT}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="Lancement"
          component={Lancement}
          durationInFrames={DUREE_LANCEMENT}
          fps={30}
          width={1920}
          height={1080}
        />
        {/* CHIFFRES — le format qui ENSEIGNE : il partage une mesure prise sur
            nos propres publications, utilisable par le spectateur sur son
            compte a lui. Aucune mention du produit avant la derniere image. */}
        {/* VOCAL — une phrase, et l application fait tout. Le seul film ou on
            ne commente presque rien : l ecran suffit. */}
        <Composition
          id="Vocal"
          component={Vocal}
          durationInFrames={DUREE_VOCAL}
          fps={30}
          width={1080}
          height={1920}
        />
        {/* Même dispositif, autre tournage : seules les fenêtres changent. */}
        {/* FORMAT LONG — la grille de notation expliquee AVANT la demonstration. */}
        <Composition
          id="MethodeClips"
          component={MethodeClips}
          durationInFrames={DUREE_METHODE}
          fps={30}
          width={1920}
          height={1080}
        />
        {/* Miniature de la video longue, dessinee d apres douze references du
            domaine relevees sur YouTube. */}
        {/* FORMAT LONG du 03/10 — un seul critere, et ce qu il faut couper. */}
        <Composition
          id="PremiereSeconde"
          component={PremiereSeconde}
          durationInFrames={DUREE_PREMIERE}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="RetentionLongue"
          component={RetentionLongue}
          durationInFrames={DUREE_RETENTION}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="MiniaturePremiere"
          component={MiniaturePremiere}
          durationInFrames={1}
          fps={30}
          width={1280}
          height={720}
        />
        <Composition
          id="MiniatureLongue"
          component={MiniatureLongue}
          durationInFrames={1}
          fps={30}
          width={1280}
          height={720}
        />
        <Composition
          id="VocalCyprien"
          component={Vocal}
          defaultProps={CYPRIEN}
          durationInFrames={DUREE_VOCAL}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="VocalMisterV"
          component={Vocal}
          defaultProps={MISTERV}
          durationInFrames={DUREE_VOCAL}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="VocalMcfly"
          component={Vocal}
          defaultProps={MCFLY}
          durationInFrames={DUREE_VOCAL}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="VocalMichou"
          component={Vocal}
          defaultProps={MICHOU}
          durationInFrames={DUREE_VOCAL}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="VocalInoxtag"
          component={Vocal}
          defaultProps={INOXTAG}
          durationInFrames={DUREE_VOCAL}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="VocalSqueezie"
          component={Vocal}
          defaultProps={SQUEEZIE}
          durationInFrames={DUREE_VOCAL}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="VocalAmixem"
          component={Vocal}
          defaultProps={AMIXEM}
          durationInFrames={DUREE_VOCAL}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="Chiffres"
          component={Chiffres}
          durationInFrames={DUREE_CHIFFRES}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{ reglage: CHIFFRES_DEFAUT }}
        />
        <Composition
          id="Mecanique"
          component={Mecanique}
          durationInFrames={DUREE_MECANIQUE}
          fps={30}
          width={1080}
          height={1920}
        />
        {/* Gabarit VISUELLEMENT OPPOSE aux autres shorts : le clip occupe
            tout le cadre, le texte est en haut a gauche, pas de carte. Deux
            publications d affilee ne doivent pas se ressembler. */}
        <Composition
          id="ShortPleinCadre"
          component={ShortPleinCadre}
          durationInFrames={DUREE_PLEIN}
          calculateMetadata={calculerDuree}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{ reglage: PLEIN_DEFAUT }}
        />
        {/* Short compagnon de la video longue du jour : il enseigne un critere
            utilisable sans l'outil, le demontre, puis renvoie au tutoriel. */}
        <Composition
          id="ShortVersYouTube"
          component={ShortVersYouTube}
          durationInFrames={DUREE_SHORT_YT}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{ reglage: SHORT_YT_DEFAUT }}
        />
        {/* Reel vertical du 28/09 : l'angle du TRI, pris a rebours des 69 posts
            precedents du compte qui promettent tous l'automatisation totale. */}
        <Composition
          id="LeTri"
          component={LeTri}
          durationInFrames={DUREE_LE_TRI}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{ reglage: LE_TRI_DEFAUT }}
        />
        <Composition
          id="TutoYouTube"
          component={TutoYouTube}
          durationInFrames={DUREE_TUTO}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{ reglage: TUTO_DEFAUT }}
        />
        <Composition
          id="DuDebutALaFin"
          component={DuDebutALaFin}
          durationInFrames={DUREE_REC}
          fps={FPS}
          width={1080}
          height={1920}
          defaultProps={{ reglage: REC_DEFAUT }}
        />
        <Composition
          id="MurDeClips"
          component={MurDeClips}
          durationInFrames={DUREE_MUR}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="ArreteComme"
          component={ArreteComme}
          durationInFrames={DUREE_ARRETE}
          fps={FPS}
          width={1080}
          height={1920}
          defaultProps={{ reglage: PARCOURS[0].reglage }}
        />
        {PARCOURS.map((p: (typeof PARCOURS)[number]) => (
          <Composition
            key={p.id}
            id={p.id}
            component={Parcours}
            durationInFrames={DUREE_PARCOURS}
            fps={FPS}
            width={1080}
            height={1920}
            defaultProps={{ reglage: p.reglage }}
          />
        ))}
        <Composition
          id="EtapesV3"
          component={EtapesV3}
          durationInFrames={DUREE_V3}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="EtapesV2"
          component={EtapesV2}
          durationInFrames={DUREE_V2}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Etapes"
          component={Etapes}
          durationInFrames={DUREE_ETAPES}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Demo"
          component={Demo}
          durationInFrames={DUREE_DEMO}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Vitrine"
          component={Vitrine}
          durationInFrames={DUREE_VITRINE}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Illustration"
          component={PubIllustration}
          durationInFrames={DUREE_ILLU}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Trailer-Plage"
          component={TrailerPlage}
          durationInFrames={DUREE_TRAILER}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Trailer-Flamants"
          component={TrailerFlamants}
          durationInFrames={DUREE_TRAILER}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Trailer-SurLeau"
          component={TrailerSurLeau}
          durationInFrames={DUREE_TRAILER}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Trailer-Route"
          component={TrailerRoute}
          durationInFrames={DUREE_TRAILER}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Trailer-Leonida"
          component={TrailerLeonida}
          durationInFrames={DUREE_TRAILER}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Montage-Personnages"
          component={MontagePersonnages}
          durationInFrames={DUREE_MONTAGE}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Montage-Aeroport"
          component={MontageAeroport}
          durationInFrames={DUREE_MONTAGE}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Montage-ViceCity"
          component={MontageViceCity}
          durationInFrames={DUREE_MONTAGE}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Montage-Fusillade"
          component={MontageFusillade}
          durationInFrames={DUREE_MONTAGE}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Montage-Poursuite"
          component={MontagePoursuite}
          durationInFrames={DUREE_MONTAGE}
          fps={FPS}
          width={1080}
          height={1920}
        />

      <Folder name="Posts-organiques">
        <Composition
          id="Post1-Vues"
          component={Post1Vues}
          durationInFrames={DUREE_POST_1}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Post2-Erreur"
          component={Post2Erreur}
          durationInFrames={DUREE_POST_2}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Post3-AvantApres"
          component={Post3AvantApres}
          durationInFrames={DUREE_POST_3}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Post4-Liste"
          component={Post4Liste}
          durationInFrames={DUREE_POST_4}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Post5-Pov"
          component={Post5Pov}
          durationInFrames={DUREE_POST_5}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Post9-Univers"
          component={Post9Univers}
          durationInFrames={DUREE_POST_9}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Post10-Moments"
          component={Post10Moments}
          durationInFrames={DUREE_POST_10}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Post11-ZeroMontage"
          component={Post11ZeroMontage}
          durationInFrames={DUREE_POST_11}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Post12-Recadrage"
          component={Post12Recadrage}
          durationInFrames={DUREE_POST_12}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Post6-Ratio"
          component={Post6Ratio}
          durationInFrames={DUREE_POST_6}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Post7-Preuve"
          component={Post7Preuve}
          durationInFrames={DUREE_POST_7}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Post8-DejaLa"
          component={Post8DejaLa}
          durationInFrames={DUREE_POST_8}
          fps={FPS}
          width={1080}
          height={1920}
        />
      </Folder>

      {/* Serie « marche » : on ne vend plus du temps gagne mais l'acces a un
          marche date (GTA 6, 19/11/2026). Voir l'en-tete de Post13Marche. */}
      <Folder name="Posts-marche">
        <Composition
          id="Post13-Marche"
          component={Post13Marche}
          durationInFrames={DUREE_POST_13}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Post14-VingtTrois"
          component={Post14VingtTrois}
          durationInFrames={DUREE_POST_14}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Post15-Bande"
          component={Post15Bande}
          durationInFrames={DUREE_POST_15}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Post16-Transformation"
          component={Post16Transformation}
          durationInFrames={DUREE_POST_16}
          fps={FPS}
          width={1080}
          height={1920}
        />
      </Folder>

      <Composition
        id="PubLancement"
        component={PubLancement}
        durationInFrames={DUREE_PUB_LANCEMENT}
        fps={FPS}
        width={1080}
        height={1920}
      />

      <Composition
        id="PubVerticale"
        component={PubVerticale}
        durationInFrames={DUREE_PUB_VERTICALE}
        fps={FPS}
        width={1080}
        height={1920}
      />

      <Composition
        id="HeroSite"
        component={HeroSite}
        durationInFrames={DUREE_HERO}
        fps={FPS}
        width={1920}
        height={1080}
      />

      <Folder name="Scenes-Verticales">
        <Composition
          id="Scene1-Accroche"
          component={avecPolice(SceneHook)}
          durationInFrames={105}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Scene2-Probleme"
          component={avecPolice(SceneProbleme)}
          durationInFrames={142}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Scene3-Produit"
          component={avecPolice(SceneProduit)}
          durationInFrames={240}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Scene4-Preuve"
          component={avecPolice(ScenePreuve)}
          durationInFrames={150}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Lancement0-Ouverture"
          component={avecPolice(SceneOuverture)}
          durationInFrames={75}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Lancement3-Interface"
          component={avecPolice(SceneInterface)}
          durationInFrames={240}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Lancement5-Offre"
          component={avecPolice(SceneLancement)}
          durationInFrames={185}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Composition
          id="Scene5-CTA"
          component={avecPolice(SceneCTA)}
          durationInFrames={120}
          fps={FPS}
          width={1080}
          height={1920}
        />
      </Folder>
    </>
  );
};
