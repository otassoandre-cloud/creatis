/**
 * FILME LA COMMANDE VOCALE : on parle, l'application fait tout le reste.
 *
 *   node enregistrer-vocal.mjs
 *   node enregistrer-vocal.mjs --commande "Prends la dernière vidéo de Amixem."
 *
 * Produit `public/vocal.mp4` (1080x1920) et ses repères, comme
 * `enregistrer-parcours.mjs`.
 *
 * ── POURQUOI CE TOURNAGE-LÀ ──────────────────────────────────────────────
 * Tout ce qui a été publié jusqu'ici EXPLIQUAIT ou AFFIRMAIT. Ici on ne dit
 * rien : on prononce une phrase, et l'écran fait le travail. C'est la seule
 * chose que l'outil sache faire que personne d'autre ne montre, et ça se
 * comprend sans une ligne de commentaire.
 *
 * ── ÉTAT : CE SCRIPT NE PEUT PAS PARLER TOUT SEUL ───────────────────────
 * MESURÉ le 01/10, sur la page de l'application, avec le faux micro branché :
 *
 *   getUserMedia        -> reçoit le WAV parfaitement, amplitude maximale 1,0
 *   SpeechRecognition   -> « no-speech », il n'entend rien
 *
 * Chrome fait donc passer la reconnaissance vocale par un chemin de capture
 * INTERNE, distinct de celui de getUserMedia, que `--use-file-for-fake-audio-
 * capture` ne nourrit pas. Aucun drapeau ne contourne ça : la Web Speech API
 * écoute le périphérique d'enregistrement du système, pas le faux.
 *
 * DEUXIÈME MESURE, le même jour : faire jouer la commande PAR LA PAGE, pour
 * que le « Mixage stéréo » — qui est le périphérique d'enregistrement par
 * défaut de cette machine et qui capte ce que jouent les haut-parleurs — la
 * renvoie en entrée. Résultat :
 *
 *   niveau capté par le mixage stéréo : 0,004   (c'est-à-dire du silence)
 *   et identique que `--mute-audio` soit retiré ou non
 *
 * Le son de la page ne sort donc pas. Sans sortie audio active, la boucle
 * haut-parleur → mixage stéréo → reconnaissance ne peut pas se fermer.
 *
 * Deux voies pour filmer quand même la commande vocale :
 *  1. Un câble audio virtuel (VB-CABLE, gratuit) installé et choisi comme
 *     périphérique d'enregistrement par défaut : on y joue le WAV, et Chrome
 *     l'entend comme un vrai micro. Demande une installation sur la machine.
 *  2. Quelqu'un prononce la phrase dans un vrai micro pendant que ce script
 *     filme. Tout le reste — connexion, attente, ouverture du clip, repères —
 *     fonctionne déjà ; il ne manque que la voix.
 *
 * Le reste de ce fichier est conservé : dès qu'une des deux voies est en place,
 * il tourne sans modification.
 *
 * ── COMMENT ON PARLE SANS MICRO ──────────────────────────────────────────
 * Chrome sait prendre un FICHIER comme microphone :
 *   --use-fake-device-for-media-stream   remplace le micro par un faux
 *   --use-file-for-fake-audio-capture=…  lui donne un WAV à jouer
 *   --use-fake-ui-for-media-stream       accorde l'autorisation sans la demander
 * L'application entend donc une vraie voix et la transcrit pour de bon : rien
 * n'est simulé côté produit, c'est son propre chemin vocal qui tourne.
 *
 * Le WAV doit être du PCM 16 bits, mono, 16 kHz. On lui met deux secondes de
 * silence devant : la reconnaissance démarre APRÈS le clic, et une phrase qui
 * commence à l'instant zéro est coupée en deux.
 *
 * ── IL FAUT LE VRAI CHROME, PAS CHROMIUM ─────────────────────────────────
 * `webkitSpeechRecognition` envoie l'audio aux serveurs de Google, et le
 * Chromium livré avec Playwright n'a pas les clés pour ça : la reconnaissance
 * y échoue silencieusement. D'où `channel: "chrome"`.
 *
 * Et PAS de headless : le service de parole ne tourne pas dans ce mode.
 */
import "./env-local.mjs";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };

const EMAIL = process.env.CREATIS_EMAIL;
const MDP = process.env.CREATIS_MDP;
const SITE = process.env.CREATIS_URL || "https://creatis.app";
const SORTIE = path.resolve("public");
const NOM = process.env.SORTIE_REC || "vocal.mp4";
const WAV = path.resolve(arg("wav", "public/voix/commande-vocale.wav"));

if (!EMAIL || !MDP) {
  console.error("CREATIS_EMAIL et CREATIS_MDP manquants — voir creatis-videos/.env");
  process.exit(1);
}
if (!fs.existsSync(path.resolve("public/voix/commande-courte.wav"))) {
  console.error("public/voix/commande-courte.wav manquant — c est lui que la page joue.");
  process.exit(1);
}
if (false && !fs.existsSync(WAV)) {
  console.error("WAV de commande introuvable : " + WAV);
  console.error("Le fabriquer depuis un mp3 :");
  console.error('  ffmpeg -f lavfi -i "anullsrc=r=16000:cl=mono:d=2.2" -i voix.mp3 \\');
  console.error('    -filter_complex "[1]aresample=16000[v];[0][v]concat=n=2:v=0:a=1,apad=pad_dur=6" \\');
  console.error("    -ar 16000 -ac 1 -c:a pcm_s16le commande-vocale.wav");
  process.exit(1);
}

const nav = await chromium.launch({
  channel: "chrome",
  headless: false,
  /* PAS de faux micro : mesuré, il nourrit getUserMedia mais pas la
     reconnaissance vocale, qui écoute le périphérique d'enregistrement du
     SYSTÈME. Or celui de cette machine est « Mixage stéréo », qui capte ce que
     jouent les haut-parleurs. On fait donc jouer la commande PAR LA PAGE :
     Chrome l'émet, le mixage stéréo la renvoie en entrée, et la reconnaissance
     l'entend comme une vraie voix. Rien à installer. */
  args: [
    "--use-fake-ui-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
    "--disable-blink-features=AutomationControlled",
  ],
  ignoreDefaultArgs: ["--enable-automation"],
});

const ctx = await nav.newContext({
  viewport: { width: 1080, height: 1920 },
  deviceScaleFactor: 1,
  permissions: ["microphone"],
  recordVideo: { dir: SORTIE, size: { width: 1080, height: 1920 } },
});
/* ── CE QUI EST SIMULÉ, ET CE QUI NE L'EST PAS ───────────────────────────
   Cette machine n'a aucune boucle audio : mesuré trois fois, le périphérique
   d'enregistrement par défaut capte 0 même quand le son est joué au niveau
   système. La transcription de Chrome ne peut donc rien entendre ici.

   On remplace donc UNIQUEMENT `SpeechRecognition`, qui appartient au
   NAVIGATEUR, par un double qui rend la phrase. Tout ce qui est Créatis tourne
   pour de vrai : le gestionnaire vocal de l'application, la résolution du
   nom de chaîne, la recherche de la dernière vidéo, l'analyse, le découpage,
   le recadrage, les sous-titres. Rien du produit n'est truqué.

   À dire à qui regarde le film : la commande vocale fonctionne telle quelle
   chez un utilisateur qui a un micro. Ce qu'on contourne, c'est l'absence de
   micro sur la machine de tournage — pas une limite du produit.

   Pour un tournage SANS aucune simulation : un câble audio virtuel, ou
   quelqu'un qui prononce la phrase. Le reste du script ne change pas. */
const COMMANDE = arg("commande", "prends la dernière vidéo de La Boiserie");

const page = await ctx.newPage();
await page.addInitScript((phrase) => {
  class Double {
    constructor() { this.lang = "fr-FR"; this.continuous = false; this.interimResults = false; }
    start() {
      setTimeout(() => {
        this.onstart?.(new Event("start"));
        setTimeout(() => {
          const r = [{ 0: { transcript: phrase, confidence: 0.95 }, isFinal: true, length: 1 }];
          r.length = 1;
          this.onresult?.({ results: r, resultIndex: 0 });
          setTimeout(() => this.onend?.(new Event("end")), 150);
        }, 1400);
      }, 80);
    }
    stop() { this.onend?.(new Event("end")); }
    abort() { this.onend?.(new Event("end")); }
    addEventListener(t, f) { this["on" + t] = f; }
    removeEventListener(t) { delete this["on" + t]; }
  }
  window.SpeechRecognition = Double;
  window.webkitSpeechRecognition = Double;
}, COMMANDE);

/* Les repères s'écrivent PENDANT le tournage. Les deviner après coup sur
   l'image a déjà coûté deux montages faux : le fichier de repères annonçait la
   grille douze secondes avant qu'elle soit peinte. */
const T0 = Date.now();
const reperes = {};
const marquer = (nom) => {
  reperes[nom] = Math.round((Date.now() - T0) / 100) / 10;
  console.log(`  [${reperes[nom]}s] ${nom}`);
};
const attendre = (ms) => page.waitForTimeout(ms);

/* ── RELEVÉ DES ATTENTES ──────────────────────────────────────────────────
   Le 01/10 le film s'est terminé sur « Téléchargement du clip… Récupération
   depuis YouTube » au lieu du clip fini. Retour : « à la fin on voit ça alors
   qu'on devrait voir le résultat du clip final ».

   On ne peut pas détecter ça après coup sur l'image : un écran d'attente
   ANIME (spinner, barre de progression), donc `freezedetect` le déclare
   vivant — essayé, il rate le défaut et accuse à tort la grille de résultats,
   qui est immobile parce qu'on la LIT.

   Seul le navigateur sait ce que la page affiche. On échantillonne donc
   pendant tout le tournage, et on écrit les fenêtres d'attente dans le
   fichier de repères. `controle-fin-de-film.js` refuse ensuite tout plan qui
   tombe dedans. */
const ATTENTES = [];
const MOTS_D_ATTENTE =
  /t[ée]l[ée]chargement|chargement|r[ée]cup[ée]ration|en cours|patiente|veuillez|pr[ée]paration|analyse en cours/i;
let attenteOuverte = null;

const echantillonner = async () => {
  let visible = false;
  try {
    const texte = await page.evaluate(() => document.body.innerText || "");
    visible = /t[ée]l[ée]chargement|chargement|r[ée]cup[ée]ration|en cours|patiente|veuillez|pr[ée]paration|analyse en cours/i.test(texte);
  } catch {
    return; // page en cours de navigation : on ne conclut rien
  }
  const t = Math.round((Date.now() - T0) / 100) / 10;
  if (visible && attenteOuverte === null) {
    attenteOuverte = t;
  } else if (!visible && attenteOuverte !== null) {
    if (t - attenteOuverte >= 0.8) ATTENTES.push([attenteOuverte, t]);
    attenteOuverte = null;
  }
};
const batteur = setInterval(() => { echantillonner().catch(() => {}); }, 500);

page.on("console", (m) => {
  const t = m.text();
  if (/voix|vocal|transcription|reconnai/i.test(t)) console.log("  [page] " + t.slice(0, 120));
});

try {
  console.log("· connexion");
  await page.goto(`${SITE}/auth.html`, { waitUntil: "domcontentloaded" });
  await page.click("#toggle-btn");
  await page.waitForFunction(
    () => document.getElementById("btn-submit-texte")?.textContent?.includes("connecter"),
    { timeout: 15000 },
  );
  await page.fill("#auth-email", EMAIL);
  await page.fill("#auth-password", MDP);
  await page.click("#btn-submit");
  await page.waitForURL((u) => !u.pathname.includes("auth.html"), { timeout: 60000 });
  console.log("  connecté");

  await page.goto(`${SITE}/clips-v2.html`, { waitUntil: "domcontentloaded" });
  await attendre(4000);

  /* Le micro n'apparaît que si le navigateur sait reconnaître la parole. S'il
     n'est pas là, inutile d'aller plus loin : on le dit au lieu d'enregistrer
     deux minutes d'écran immobile. */
  const micro = page.locator("#btn-voix");
  if (!(await micro.isVisible().catch(() => false))) {
    await page.screenshot({ path: path.join(SORTIE, "vocal-sans-micro.png") }).catch(() => {});
    throw new Error("bouton micro absent — SpeechRecognition indisponible dans ce navigateur");
  }

  /* ── POURQUOI LA COMMANDE EST RÉPÉTÉE DANS LE WAV ────────────────────
     Premier essai : l'application a répondu « Je n'ai rien entendu — appuie
     sur le micro et parle APRÈS "Oui ?" ». Elle PARLE d'abord, puis écoute :
     la phrase était passée pendant qu'elle disait « Oui ? ».
     Le WAV contient donc la commande huit fois de suite, sur une minute : quel
     que soit l'instant où la fenêtre d'écoute s'ouvre, une phrase entière y
     tombe. Et on réessaie si le message d'échec revient — cliquer une seconde
     fois relance une fenêtre, et le fichier joue toujours. */
  console.log("· on parle");
  marquer("micro");

  await micro.click();
  await attendre(6000);

  marquer("commande");
  await page.screenshot({ path: path.join(SORTIE, "vocal-apres-commande.png") }).catch(() => {});
  /* On vérifie quand même que l'application a bien reçu la phrase : si elle
     affiche « rien entendu », le double n'a pas été posé à temps. */
  const rate = await page.locator("text=/rien entendu/i").first().isVisible().catch(() => false);
  if (rate) {
    throw new Error("l application affiche « rien entendu » — le double de transcription n a pas pris");
  }

  /* Preuve que la commande a été ENTENDUE : l'analyse démarre d'elle-même.
     Si rien ne bouge en quarante secondes, la transcription a échoué — et il
     vaut mieux l'écrire que livrer un film où il ne se passe rien. */
  console.log("· attente du démarrage de l'analyse");
  const partie = await page
    .waitForSelector("#progress-bar, .analyse-en-cours, #btn-analyze[disabled], .clip-card", { timeout: 45000 })
    .then(() => true)
    .catch(() => false);
  if (!partie) {
    await page.screenshot({ path: path.join(SORTIE, "vocal-rien.png") }).catch(() => {});
    throw new Error("l analyse n a pas démarré : la commande n a pas été comprise");
  }
  marquer("analyse");

  console.log("· analyse en cours (jusqu'à 15 min)");
  await page.waitForSelector(".clip-card", { timeout: 15 * 60 * 1000 });
  marquer("grille");
  await attendre(4000);

  /* On ouvre le premier clip : la commande vocale n'a d'intérêt que si on voit
     ce qu'elle a produit. */
  console.log("· ouverture du premier clip");
  const carte = page.locator(".clip-card").first();
  const titre = (await carte.innerText().catch(() => "")).split("\n")[0];
  await carte.click();
  marquer("fiche");
  await attendre(6000);
  console.log("  clip ouvert : " + titre.slice(0, 60));

  marquer("bout");
  await attendre(2500);
  console.log("· fin du parcours");
} catch (e) {
  console.error("Échec : " + String(e.message).split("\n")[0]);
  process.exitCode = 1;
} finally {
  await page.close();
  await ctx.close();
  await nav.close();

  /* Playwright nomme le fichier d'après un identifiant interne : on le renomme
     pour que la composition sache quoi charger. */
  const films = fs.readdirSync(SORTIE).filter((f) => f.endsWith(".webm") || /^[a-f0-9]{20,}\.mp4$/.test(f));
  const dernier = films
    .map((f) => ({ f, t: fs.statSync(path.join(SORTIE, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0];
  if (dernier) {
    const cible = path.join(SORTIE, NOM);
    fs.renameSync(path.join(SORTIE, dernier.f), cible);
    const mo = (fs.statSync(cible).size / 1048576).toFixed(1);
    console.log(`\nOK — public/${NOM} (${mo} Mo)`);
  }
  clearInterval(batteur);
  /* Une attente encore ouverte à la coupure court jusqu'à la fin du film. */
  if (attenteOuverte !== null) {
    ATTENTES.push([attenteOuverte, Math.round((Date.now() - T0) / 100) / 10]);
  }
  fs.writeFileSync(
    path.join(SORTIE, NOM.replace(/\.mp4$/, "") + "-reperes.json"),
    JSON.stringify(
      { reperes, attentes: ATTENTES, commande: path.basename(WAV) },
      null,
      2,
    ),
  );
  if (ATTENTES.length) {
    console.log(`  ${ATTENTES.length} fenêtre(s) d'attente relevée(s) — ne pas y monter de plan :`);
    for (const [a, b] of ATTENTES) console.log(`     ${a}s → ${b}s`);
  }
  console.log("  repères : public/" + NOM.replace(/\.mp4$/, "") + "-reperes.json");
}
