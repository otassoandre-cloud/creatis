import { Composition, Folder } from "remotion";
import "./index.css";
import { avecPolice } from "./creatis/AvecPolice";
import { DUREE_HERO, HeroSite } from "./creatis/HeroSite";
import { DUREE_PUB_LANCEMENT, PubLancement } from "./creatis/PubLancement";
import { DUREE_PUB_TIKTOK, PubTikTok } from "./creatis/PubTikTok";
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
import { DUREE_POST_6, Post6Ratio } from "./creatis/posts/Post6Ratio";
import { DUREE_POST_7, Post7Preuve } from "./creatis/posts/Post7Preuve";
import { DUREE_POST_8, Post8DejaLa } from "./creatis/posts/Post8DejaLa";

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
