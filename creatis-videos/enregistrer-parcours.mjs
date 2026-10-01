/**
 * ENREGISTREMENT DU PARCOURS PRODUIT — produit `public/parcours.mp4`.
 *
 * C'est la source de la composition `Parcours` : le trajet complet filmé dans la
 * vraie application — lien collé, analyse, les 10 clips générés, le clic sur
 * l'un d'eux. La première version de cet enregistrement avait été faite par un
 * script jetable qui n'a pas été conservé ; il a fallu tout réécrire. Celui-ci
 * vit donc dans le dépôt.
 *
 * ── POURQUOI ON NE SIMULE PAS ─────────────────────────────────────────────
 * Tout ce que montre cette vidéo doit être réel, y compris la correspondance
 * entre les vignettes de la grille et le clip montré à la fin : ce sont les
 * sorties d'UNE MÊME génération. Intercepter les réponses de l'API pour aller
 * plus vite fabriquerait une démonstration qui ne prouve rien.
 *
 * D'où la connexion à un vrai compte. Le mot de passe n'est jamais écrit ici :
 * il est lu dans l'environnement, et reste chez celui qui lance le script.
 *
 *   CREATIS_EMAIL="..." CREATIS_MDP="..." node enregistrer-parcours.mjs <url>
 *
 * ── CE QU'IL FAUT SAVOIR AVANT DE LANCER ──────────────────────────────────
 * · Le compte doit pouvoir lancer une analyse (une analyse est consommée).
 * · Le client sonde la transcription pendant 15 minutes au maximum
 *   (`_pollTranscribeJob`). Mesuré : 8 min de source -> « 10 clips prêts » en
 *   100 s. Une source de 55 min projette ~11-12 min : ça tient, sans marge.
 *   Au-delà, prendre une vidéo plus courte plutôt que d'espérer.
 * · La fenêtre est en 1080x1920 : on filme déjà au format de sortie, ce qui
 *   évite un recadrage au montage.
 */
import "./env-local.mjs";
import { chromium, devices } from "playwright";
import fs from "fs";
import path from "path";

const URL_VIDEO = process.argv[2];
const EMAIL = process.env.CREATIS_EMAIL;
const MDP = process.env.CREATIS_MDP;
const SORTIE = path.resolve("public");
const SITE = process.env.CREATIS_URL || "https://creatis.app";

/* Nom du film produit. Une meme prise ne sert pas toujours la meme composition,
   et `parcours.mp4` se faisait ecraser d'une video a l'autre. */
const NOM = process.env.SORTIE_REC || "parcours.mp4";

if (!URL_VIDEO || !EMAIL || !MDP) {
  console.error(
    "Usage : CREATIS_EMAIL=... CREATIS_MDP=... node enregistrer-parcours.mjs <url-youtube>",
  );
  process.exit(1);
}

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

/* TELEPHONE PAR DEFAUT.
 *
 * La premiere version filmait en 1080x1920 — un format vertical, mais une
 * LARGEUR de 1080 CSS : le site servait donc sa disposition de bureau, six
 * vignettes par rangee. Reduite dans l'encart de 480 px de la composition, la
 * grille devenait illisible : on distinguait des rectangles, pas des clips.
 *
 * Le site bascule en deux colonnes sous 600 px (`@media (max-width: 600px)`).
 * On filme donc un vrai telephone, ce qui donne exactement ce qu'un spectateur
 * de TikTok reconnait : son propre ecran.
 *
 * LA TAILLE N'EST PAS ARBITRAIRE. `recordVideo.size` plus grand que le viewport
 * ne l'agrandit pas : Playwright pose la page dans le coin et REMPLIT le reste
 * de gris. Un premier essai en 390x664 capture dans un cadre de 780x1328 a donne
 * une video au tiers utile. On filme donc a la taille EXACTE de l'encart de la
 * composition — 480 px de large — pour que le montage n'ait rien a redimensionner.
 *
 * 480 reste sous le seuil de 600 px du site, donc la mise en page telephone
 * s'applique bien (`@media (max-width: 600px)`, grille a deux colonnes).
 *
 * Passer BUREAU=1 revient a l'ancien cadrage si besoin de comparer. */
const BUREAU = process.env.BUREAU === "1";

/* GRAND=1 — pour une video ou l'enregistrement occupe TOUT l'ecran.
   480x817 suffit tant que le film vit dans un encart de la composition ; en
   plein cadre il faut l'agrandir 2,25x jusqu'a 1080 et le texte de l'interface
   se delave. 576x1024 est exactement du 9:16, en nombres pairs (H.264 les
   exige), et reste sous le seuil de 600 px du site : la disposition telephone
   s'applique donc toujours, pour 1,875x d'agrandissement seulement.
   Le defaut ne change pas : les compositions deja faites cadrent du 480x817. */
/* YOUTUBE=1 — VRAI PAYSAGE 1920x1080.
 *
 * `BUREAU=1` filme en 1080x1920 : une LARGEUR de bureau dans un cadre vertical.
 * Utile pour comparer, inutilisable pour YouTube — un tutoriel qu'on regarde sur
 * un ecran d'ordinateur doit montrer un ecran d'ordinateur, en paysage.
 *
 * 1920x1080 avec deviceScaleFactor 1 donne exactement ce que voit un visiteur sur
 * son PC : la disposition de bureau du site, six vignettes par rangee, et du texte
 * d'interface a sa taille native. Aucun agrandissement au montage, donc aucun
 * delavage — c'est la difference entre un tutoriel et une capture etiree.
 *
 * Attention : ce mode n'est PAS interchangeable avec les autres. Les reperes de
 * frames releves pendant le tournage valent pour un parcours donne, et la
 * disposition bureau n'a pas le meme nombre d'etapes visibles que le telephone. */
const YOUTUBE = process.env.YOUTUBE === "1";

const GRAND = process.env.GRAND === "1";
const L = GRAND ? 576 : 480;
const H = GRAND ? 1024 : 817;
const tel = devices["iPhone 13"];
const ctx = await (await chromium.launch({ headless: true })).newContext(
  YOUTUBE
    ? {
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        recordVideo: { dir: SORTIE, size: { width: 1920, height: 1080 } },
      }
    : BUREAU
    ? {
        viewport: { width: 1080, height: 1920 },
        deviceScaleFactor: 1,
        recordVideo: { dir: SORTIE, size: { width: 1080, height: 1920 } },
      }
    : {
        ...tel,
        viewport: { width: L, height: H },
        deviceScaleFactor: 2,
        recordVideo: { dir: SORTIE, size: { width: L, height: H } },
      },
);
const nav = ctx.browser();
const page = await ctx.newPage();

/* LES REPERES S'ECRIVENT PENDANT LE TOURNAGE, ILS NE SE DEVINENT PLUS APRES.
   Jusqu'ici il fallait rouvrir l'enregistrement et chercher a l'oeil la seconde
   ou la grille apparait, ou bien la faire deviner par la luminance. Le script,
   lui, SAIT quand chaque etape arrive : il attend chacune d'elles. On releve
   donc l'horloge a chaque passage et on ecrit le tout a cote du film.
   L'origine est la creation de la page, c'est-a-dire le debut de la capture ;
   la derive mesuree est inferieure a la demi-seconde. */
const T0 = Date.now();
const reperes = {};
const marquer = (nom) => {
  reperes[nom] = Math.round((Date.now() - T0) / 100) / 10;
  console.log(`  [${reperes[nom]}s] ${nom}`);
};
page.on("console", (m) => {
  if (m.type() === "error") console.log("  [page]", m.text().slice(0, 140));
});

try {
  // ── Connexion ───────────────────────────────────────────────────────────
  console.log("· connexion");
  await page.goto(`${SITE}/auth.html`, { waitUntil: "domcontentloaded" });
  /* La page ouvre en mode INSCRIPTION. Soumettre un email déjà existant renvoie
     un 422 de Supabase et la navigation n'a jamais lieu — c'est exactement ce
     qui a fait échouer le premier essai. On bascule d'abord en connexion. */
  await page.click("#toggle-btn");
  await page.waitForFunction(
    () => document.getElementById("btn-submit-texte")?.textContent?.includes("connecter"),
    { timeout: 10000 },
  );
  await page.fill("#auth-email", EMAIL);
  await page.fill("#auth-password", MDP);
  await page.click("#btn-submit");
  await page.waitForURL((u) => !u.pathname.includes("auth.html"), { timeout: 60000 });
  console.log("  connecté :", page.url());

  // ── Le parcours filmé ───────────────────────────────────────────────────
  await page.goto(`${SITE}/clips-v2.html`, { waitUntil: "domcontentloaded" });
  await attendre(3000);

  /* La saisie est tapée caractère par caractère : au montage elle est accélérée
     x2,7, et un `fill()` instantané ne donnerait rien à accélérer. */
  console.log("· saisie du lien");
  const champ = page.locator("#yt-url-input");
  marquer("lien");
  await champ.click();
  await champ.type(URL_VIDEO, { delay: 55 });
  await attendre(900);

  console.log("· lancement de l'analyse");
  await page.click("#btn-analyze");
  marquer("analyse");

  /* 15 min : c'est la limite que s'impose le client lui-même. On la suit plutôt
     que d'inventer la nôtre — dépasser ici ne servirait à rien, la page aurait
     déjà abandonné. */
  console.log("· analyse en cours (jusqu'à 15 min)");
  await page.waitForSelector(".clip-card", { timeout: 15 * 60 * 1000 });
  marquer("grille");
  await attendre(2500);

  /* On RELEVE la grille au lieu d'aller la relire en pixels plus tard.
     Premiere version : elle ne journalisait qu'un `count()` d'elements
     `.clip-card`, qui a annonce 10 alors que le site affichait « 8 clips viraux
     trouves » — l'entete lit `_clips.length`, lui. Il a fallu rouvrir la video
     image par image pour retrouver les vraies bornes. Tout est ecrit ici, et
     c'est le TITRE de la page qui fait foi sur le nombre. */
  const releve = await page.evaluate(() => ({
    titre: document.getElementById("studio-title")?.textContent?.trim() || "",
    source: document.getElementById("studio-meta")?.textContent?.trim() || "",
    clips: [...document.querySelectorAll(".clip-card")].map((c) => ({
      duree: c.querySelector(".clip-dur-badge")?.textContent?.trim() || "",
      score: c.querySelector(".clip-score-num")?.textContent?.trim() || "",
      titre: c.querySelector(".clip-title")?.textContent?.trim() || "",
    })),
  }));
  fs.writeFileSync(path.join(SORTIE, "parcours-clips.json"), JSON.stringify(releve, null, 2));
  console.log(`  ${releve.titre}`);
  releve.clips.forEach((c, i) => console.log(`   ${i} · ${c.score} · ${c.duree} · ${c.titre}`));

  /* ON FAIT DEFILER LA GRILLE — c'est le plan qui prouve le produit.
     Sur telephone la grille est a deux colonnes : sans defilement, quatre
     vignettes sur dix sont visibles et l'entete « 10 clips viraux trouves »
     n'est pas confirme par l'image. On descend donc jusqu'au bas de la grille
     puis on remonte, lentement, pour que le spectateur COMPTE les clips.
     Defilement par petits pas plutot qu'un `scrollIntoView` : un saut instantane
     ne se lit pas, et une fois accelere au montage il devient invisible. */
  const grille = await page.evaluate(() => {
    const g = document.getElementById("clips-grid");
    return g ? g.getBoundingClientRect().bottom + window.scrollY : 0;
  });
  const pas = 90;
  for (let y = 0; y < grille; y += pas) {
    await page.mouse.wheel(0, pas);
    await attendre(110);
  }
  await attendre(700);
  for (let y = grille; y > 0; y -= pas * 2) {
    await page.mouse.wheel(0, -pas * 2);
    await attendre(70);
  }
  await attendre(900);

  /* QUEL CLIP OUVRIR — et pourquoi ca ne peut pas etre un rang fixe.
     Le clip ouvert finit en plein ecran dans le montage : c'est la vitrine. Or
     l'analyse n'est PAS deterministe — deux passages sur la meme video ont donne
     des decoupes et des scores differents. Un « toujours le premier » tombe donc
     sur ce que le hasard amene, et sur cette source il a successivement donne un
     passage filme pres d'un bateau de fete (Whisper y rend du charabia) puis un
     « rant anti-ecologie explosif ». Ni l'un ni l'autre ne peut illustrer l'outil.

     On choisit donc par le TITRE que le produit a lui-meme ecrit, ce qui survit
     a une nouvelle analyse :
       CLIP_TITRE="cigare"  ouvre le premier clip dont le titre contient « cigare »
       CLIP=2               repli par rang si aucun titre n'est donne
     Si le motif ne trouve rien, on le dit et on prend le premier — jamais un
     silence qui donnerait une vitrine choisie au hasard. */
  const motif = (process.env.CLIP_TITRE || "").trim().toLowerCase();
  const cible = parseFloat(process.env.CLIP_SECONDE || "");
  let iClip = Math.max(0, parseInt(process.env.CLIP || "0", 10) || 0);

  /* SELECTION PAR INSTANT — la seule qui resiste a une nouvelle analyse.
     Le titre ne tient pas : l'IA le reecrit a chaque passe (« Boule au ventre &
     rire instantane » est devenu « Il perd le jeu en 1 seconde ! »), et un motif
     qui marchait hier tombe dans le repli demain. Le rang ne tient pas non plus,
     les scores bougent. L'INSTANT, lui, revient : le meme moment fort est
     redecoupe a quelques secondes pres (09:30 puis 09:40, 04:44 puis 05:06).
     On prend donc la carte dont le debut est le plus proche de la seconde visee,
     et on refuse au-dela de 45 s d'ecart — passe ce seuil ce n'est plus le meme
     moment, et mieux vaut le dire que montrer autre chose. */
  const enSecondes = (badge) => {
    const m = /(\d+):(\d+)/.exec(badge || "");
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : NaN;
  };
  if (!Number.isNaN(cible)) {
    let meilleur = -1, ecart = Infinity;
    releve.clips.forEach((c, i) => {
      const d = Math.abs(enSecondes(c.duree) - cible);
      if (d < ecart) { ecart = d; meilleur = i; }
    });
    if (meilleur >= 0 && ecart <= 45) {
      iClip = meilleur;
      console.log(`  clip le plus proche de ${cible} s : rang ${iClip} (${ecart} s d'écart)`);
    } else {
      console.log(`  AUCUN clip a moins de 45 s de ${cible} s — on prend le rang ${iClip}`);
    }
  } else if (motif) {
    const sansAccent = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const trouve = releve.clips.findIndex((c) => sansAccent(c.titre).includes(sansAccent(motif)));
    if (trouve >= 0) iClip = trouve;
    else console.log(`  (aucun titre ne contient « ${motif} » — on prend le rang ${iClip})`);
  }
  console.log(`· ouverture du clip ${iClip} — ${releve.clips[iClip]?.titre || "?"}`);
  await page.locator(".clip-card").nth(iClip).click();
  await page.waitForSelector("#modal-player-wrap", { timeout: 60000 });
  marquer("fiche");
  await attendre(5000);

  /* JUSQU'AU CLIP RENDU, pas jusqu'a l'ouverture de la fiche.
     Le parcours s'arretait quand la fiche du clip s'affichait — donc avant la
     seule etape qui produit quelque chose. Filmer l'export change ce que la
     video demontre : on ne montre plus une interface, on montre un fichier qui
     sort. Le bouton d'en-tete `#modal-dl-btn` est masque sous 600 px de large ;
     sur telephone c'est `#mob-dl-btn` qui porte l'action, et son libelle affiche
     la progression. */
  if (process.env.SANS_EXPORT !== "1") {
    console.log("· export du clip");
    const attente = page.waitForEvent("download", { timeout: 420000 }).catch(() => null);
    /* LE BON BOUTON DEPEND DE LA LARGEUR, et se tromper coute un enregistrement
       entier : en paysage 1920 px `#mob-dl-btn` existe dans le DOM mais reste
       invisible, donc le clic expire au bout de 30 s apres 2 min 40 d analyse
       deja consommee. On prend celui qui est VISIBLE plutot que de deviner. */
    const bureau = page.locator("#modal-dl-btn");
    const mobile = page.locator("#mob-dl-btn");
    const cible = (await bureau.isVisible().catch(() => false)) ? bureau : mobile;
    await cible.click();
    marquer("rendu");
    const fichier = await attente;
    if (fichier) {
      /* ON GARDE LE FICHIER. Dans le lecteur du telephone le clip fini occupe
         192 x 336 pixels : l'agrandir jusqu'a 1080 de large demanderait un
         facteur 5,6 et donnerait une bouillie. Le MP4 que l'export vient de
         produire fait 1080x1920 — c'est lui qu'on montre en plein cadre a la
         fin, et c'est exactement le meme fichier que celui vu a l'ecran. */
      const rendu = path.join(SORTIE, process.env.SORTIE_CLIP || "clip-rendu.mp4");
      await fichier.saveAs(rendu);
      marquer("fini");
      console.log(`  clip rendu : ${path.basename(rendu)} (${await fichier.suggestedFilename()})`);
      /* Quelques secondes de plus : le rendu se termine, la barre atteint 100 %
         et le telephone affiche sa confirmation. C'est cette image-la qui clot
         la demonstration. */
      await attendre(9000);
    } else {
      console.log("  AUCUN telechargement en sept minutes — l'export n'a pas abouti");
    }
  }

  marquer("bout");
  fs.writeFileSync(
    path.join(SORTIE, NOM.replace(/\.mp4$/, "") + "-reperes.json"),
    JSON.stringify({ reperes, nbClips: releve.clips.length, titre: releve.titre }, null, 2),
  );
  console.log("· fin du parcours");
} catch (e) {
  console.error("ÉCHEC :", e.message);
  await page.screenshot({ path: path.join(SORTIE, "parcours-echec.png") }).catch(() => {});
  process.exitCode = 1;
} finally {
  const video = page.video();
  await ctx.close(); // referme le contexte AVANT de lire le chemin : Playwright
  await nav.close(); // n'écrit le fichier qu'à la fermeture.
  if (video) {
    const brut = await video.path();
    /* On écrit TOUJOURS sous un nom provisoire. La première version copiait
       directement sur `parcours.mp4` dans le bloc `finally` : un échec de
       connexion a donc écrasé l'enregistrement qui marchait par huit secondes
       de page de login. Un enregistrement raté ne doit jamais détruire le bon. */
    const provisoire = path.join(SORTIE, "parcours-nouveau.mp4");
    fs.copyFileSync(brut, provisoire);
    fs.unlinkSync(brut);
    const mo = (fs.statSync(provisoire).size / 1048576).toFixed(1);
    if (process.exitCode) {
      console.log(`
échec — enregistrement partiel : ${provisoire} (${mo} Mo)`);
      console.log(`  ${NOM} n'a PAS été touché.`);
    } else {
      fs.renameSync(provisoire, path.join(SORTIE, NOM));
      console.log(`
OK — public/${NOM} (${mo} Mo)`);
      console.log(`  repères : public/${NOM.replace(/\.mp4$/, "")}-reperes.json`);
    }
  }
}
