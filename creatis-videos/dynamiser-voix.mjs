/**
 * Resserre la voix off des repliques TikTok, sans la reenregistrer.
 *
 *   node dynamiser-voix.mjs
 *
 * POURQUOI
 * Mesure faite sur la premiere version : le debit s'effondrait a 121 mots/minute
 * sur le plan produit et 111 sur le CTA, contre 244 sur le plan du cout. Une pub
 * reseaux sociaux tourne a 180-200. Ce n'est pas la longueur du texte qui traine,
 * c'est le debit — et surtout les silences que la voix « posee » laisse entre les
 * phrases.
 *
 * COMMENT, dans cet ordre :
 *
 * 1. **Suppression des silences internes.** C'est le gros du gain et c'est
 *    transparent a l'oreille : on ne touche ni a la hauteur ni au timbre, on
 *    enleve juste les blancs. Une pause de 0,6 s entre deux phrases devient
 *    0,12 s.
 * 2. **`atempo` pour finir**, plafonne a 1,35. Au-dela, la voix prend un grain
 *    metallique audible ; en-deca, c'est inaudible et ca conserve la hauteur.
 *
 * IDEMPOTENT PAR CONSTRUCTION : la source vit dans public/voix/source/ et n'est
 * jamais ecrite. Relancer le script repart toujours de l'original, jamais d'un
 * fichier deja compresse.
 *
 * Ce dossier source/ est aussi la sauvegarde qui manquait : le quota gratuit de
 * Gemini TTS s'epuise en une dizaine de requetes par jour, donc un mp3 efface
 * par erreur n'est PAS regenerable dans la journee.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const VOIX = join(ICI, "public", "voix");
const SOURCE = join(VOIX, "source");
const FFMPEG = join(ICI, "..", "node_modules", "ffmpeg-static", "ffmpeg.exe");

/**
 * Duree visee par replique, en secondes. Choisies plan par plan : assez courtes
 * pour que ca claque, assez longues pour que le sous-titre reste lisible.
 */
const CIBLES = {
  /* Posts organiques : une prise unique par video. La suppression des blancs
     compte double ici — c'est elle qui enchaine les phrases sans respiration
     entre les plans. */
  "p1-vues": 7.2,
  "p2-erreur": 6.3,
  "p3-avant-apres": 6.6,
  "p4-liste": 6.9,
  "p5-pov": 6.9,

  "t1-hook": 3.1,
  "t2-origine": 1.7,
  "t3-cout": 2.45,
  "t4-solution": 4.4,
  "t5-resultat": 2.65,
  "t6-cta": 2.75,
};

/** Au-dela, `atempo` s'entend. On prefere un plan 0,2 s plus long qu'une voix sale. */
const TEMPO_MAX = 1.35;

/* Silences internes : tout blanc de plus de 0,15 s est ramene a 0,12 s.
   `stop_periods=-1` = « partout dans le fichier », pas seulement aux bords. */
const SILENCES_INTERNES =
  "silenceremove=stop_periods=-1:stop_duration=0.12:stop_threshold=-38dB:detection=peak";

/**
 * ffprobe n'est pas garanti present : on lit la duree via ffmpeg. Il ecrit sa
 * progression sur **stderr**, pas sur stdout — d'ou spawnSync et la
 * concatenation des deux flux. `execFileSync` ne rendrait que stdout, vide.
 */
const secondes = (fichier) => {
  const p = spawnSync(FFMPEG, ["-i", fichier, "-f", "null", "-"], {
    encoding: "utf8",
  });
  const r = (p.stdout || "") + (p.stderr || "");
  const m = r.match(/time=(\d+):(\d+):([\d.]+)/g);
  const dernier = m?.[m.length - 1] ?? "time=00:00:00";
  const [h, mn, s] = dernier.replace("time=", "").split(":").map(Number);
  return h * 3600 + mn * 60 + s;
};

mkdirSync(SOURCE, { recursive: true });

/* Premiere execution : on met les originaux a l'abri. */
for (const id of Object.keys(CIBLES)) {
  const original = join(VOIX, `${id}.mp3`);
  const sauvegarde = join(SOURCE, `${id}.mp3`);
  if (!existsSync(sauvegarde)) {
    if (!existsSync(original)) {
      // Une replique pas encore generee (quota TTS) ne doit pas bloquer les autres.
      console.log(`· ${id}.mp3 absent, ignoré`);
      continue;
    }
    copyFileSync(original, sauvegarde);
    console.log(`↳ sauvegarde de ${id}.mp3 dans voix/source/`);
  }
}

console.log("\nid              avant   sans blancs   tempo   après   gain");
for (const [id, cible] of Object.entries(CIBLES)) {
  const src = join(SOURCE, `${id}.mp3`);
  if (!existsSync(src)) continue;
  const dest = join(VOIX, `${id}.mp3`);
  const intermediaire = join(SOURCE, `${id}.tmp.mp3`);

  const avant = secondes(src);

  // 1. Les blancs
  execFileSync(FFMPEG, [
    "-y", "-i", src, "-af", SILENCES_INTERNES,
    "-c:a", "libmp3lame", "-b:a", "128k", intermediaire, "-loglevel", "error",
  ]);
  const sansBlancs = secondes(intermediaire);

  // 2. Le tempo, seulement pour ce qu'il reste a rattraper
  const tempo = Math.min(TEMPO_MAX, Math.max(1, sansBlancs / cible));
  execFileSync(FFMPEG, [
    "-y", "-i", intermediaire, "-af", `atempo=${tempo.toFixed(3)}`,
    "-c:a", "libmp3lame", "-b:a", "128k", dest, "-loglevel", "error",
  ]);
  const apres = secondes(dest);

  console.log(
    `${id.padEnd(14)}  ${avant.toFixed(2)}s   ${sansBlancs.toFixed(2)}s` +
      `        ×${tempo.toFixed(2)}   ${apres.toFixed(2)}s` +
      `   −${Math.round((1 - apres / avant) * 100)} %`,
  );
}

console.log(
  "\nLes durees ci-dessus fixent le nombre d'images de chaque plan " +
    "dans PubTikTok.tsx.",
);
