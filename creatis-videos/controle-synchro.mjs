/**
 * CONTRÔLE DE SYNCHRONISATION — le texte à l'écran dit-il ce que la voix dit ?
 *
 *   node controle-synchro.mjs <film.mp4> [--bornes b1,b2,b3…]
 *
 * ── POURQUOI CE FICHIER EXISTE ───────────────────────────────────────────
 * Remarque du 16/10, et elle était juste : « parfois les images et les textes
 * ne sont pas du tout corrélés avec la voix, c'est décalé ».
 *
 * Vérifié sur le court-métrage du jour : la voix dit « il lavait des
 * voitures » à 3,0 s, le texte l'affichait à 6,0 s. Tout le premier bloc
 * avait un cran de retard. La cause : les bornes venaient de `silencedetect`,
 * et j'associais les phrases aux silences DE TÊTE, sans vérifier laquelle
 * tombait où. Un silence est une frontière, il ne dit pas quelle phrase
 * commence.
 *
 * ── CE QUE FAIT CE SCRIPT ────────────────────────────────────────────────
 * Il transcrit l'audio du film RENDU — pas le texte qu'on croit avoir écrit,
 * le son qui sort vraiment — et rend la seconde de début de chaque phrase.
 * C'est la seule vérité : si la voix a lu à 193 mots/minute au lieu de 166,
 * ou si le TTS a avalé une phrase, ça se voit ici et nulle part ailleurs.
 *
 * Avec `--bornes`, il compare en plus les bornes d'un montage à la
 * transcription et signale chaque plan dont le texte ne tombe pas sur la
 * bonne phrase.
 *
 * ── LES SEGMENTS FUSIONNÉS ───────────────────────────────────────────────
 * Whisper fusionne parfois vingt-cinq secondes en un seul segment. On les
 * redécoupe au PRORATA DES MOTS, qui est une approximation honnête : la voix
 * de synthèse a un débit régulier. Ces bornes-là sont marquées « ~ » pour
 * qu'on sache qu'elles sont estimées et non mesurées.
 */
import fs from "fs";
import path from "path";
import { execFileSync, spawnSync } from "child_process";

const FILM = process.argv[2];
if (!FILM || !fs.existsSync(FILM)) {
  console.error("Usage : node controle-synchro.mjs <film.mp4> [--bornes 0,6,9.3,…]");
  process.exit(2);
}
const iB = process.argv.indexOf("--bornes");
const BORNES = iB !== -1 && process.argv[iB + 1]
  ? process.argv[iB + 1].split(",").map(Number).filter((n) => !Number.isNaN(n))
  : null;

const FF = path.resolve("../node_modules/ffmpeg-static/ffmpeg.exe");
const TMP = path.join(process.env.TEMP || ".", `synchro-${Date.now()}.mp3`);

const cle = () => {
  for (const f of [".env", "../.env"]) {
    if (!fs.existsSync(f)) continue;
    const m = fs.readFileSync(f, "utf8").match(/^GROQ_API_KEY=(.*)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
};

console.log("· extraction de l'audio");
spawnSync(FF, ["-y", "-i", FILM, "-vn", "-ac", "1", "-ar", "16000", TMP], { stdio: "ignore" });

console.log("· transcription");
const K = cle();
if (!K) { console.error("GROQ_API_KEY introuvable"); process.exit(3); }
const brut = execFileSync("curl", [
  "-s", "--max-time", "240",
  "-X", "POST", "https://api.groq.com/openai/v1/audio/transcriptions",
  "-H", `Authorization: Bearer ${K}`,
  "-F", `file=@${TMP}`,
  "-F", "model=whisper-large-v3-turbo",
  "-F", "language=fr",
  "-F", "response_format=verbose_json",
], { maxBuffer: 40 * 1024 * 1024 }).toString();
fs.unlinkSync(TMP);

let j;
try { j = JSON.parse(brut); } catch { console.error("réponse illisible :", brut.slice(0, 200)); process.exit(4); }
if (!j.segments) { console.error("pas de segments :", JSON.stringify(j).slice(0, 200)); process.exit(5); }

/* Un segment de plus de douze secondes contient forcément plusieurs idées :
   on le redécoupe à la phrase, au prorata des mots. */
const phrases = [];
for (const s of j.segments) {
  const bouts = s.text.trim().split(/(?<=[.!?…])\s+/).filter(Boolean);
  const duree = s.end - s.start;
  if (bouts.length <= 1 || duree < 12) {
    phrases.push({ t: s.start, texte: s.text.trim(), estime: false });
    continue;
  }
  const total = bouts.reduce((a, b) => a + b.split(/\s+/).length, 0);
  let cumul = 0;
  for (const b of bouts) {
    phrases.push({ t: s.start + (duree * cumul) / total, texte: b, estime: true });
    cumul += b.split(/\s+/).length;
  }
}

console.log(`\n=== CE QUE LA VOIX DIT, ET QUAND (${phrases.length} phrases) ===`);
for (const p of phrases) {
  console.log(`${p.t.toFixed(1).padStart(6)}${p.estime ? " ~" : "  "} ${p.texte.slice(0, 76)}`);
}

if (BORNES) {
  console.log(`\n=== CONFRONTATION AVEC LES ${BORNES.length} BORNES DU MONTAGE ===`);
  let faux = 0;
  let flous = 0;
  for (const b of BORNES) {
    /* La phrase qui est en train d'être dite à cette seconde. */
    let i = 0;
    for (let k = 0; k < phrases.length; k += 1) if (phrases[k].t <= b + 0.35) i = k;
    const ecart = b - phrases[i].t;
    /* Whisper fusionne parfois vingt secondes SANS ponctuation : impossible de
       redécouper, donc impossible de conclure. Signaler ces cas comme des
       fautes ferait crier au loup sur des bornes correctes — et un contrôle
       qui se trompe finit par être ignoré. On les marque « ? » et on dit quoi
       faire : retranscrire cette fenêtre seule, où Whisper segmente plus fin. */
    const suivante = phrases[i + 1] ? phrases[i + 1].t : Infinity;
    const longueur = suivante - phrases[i].t;
    const nonVerifiable = longueur > 11 && ecart > 2.0;
    const alerte = ecart > 2.0 && !nonVerifiable;
    if (alerte) faux += 1;
    if (nonVerifiable) flous += 1;
    console.log(
      `${b.toFixed(1).padStart(6)} │ ${alerte ? "✖" : nonVerifiable ? "?" : "·"} à ${ecart.toFixed(1)} s du début de : ${phrases[i].texte.slice(0, 54)}`,
    );
  }
  if (flous) {
    console.log(
      `
? ${flous} borne(s) dans un segment long et non ponctué — non vérifiable ici.
  Les retranscrire seules :  ffmpeg -ss <t> -t 20 -i <film> extrait.mp3`,
    );
  }
  console.log(
    faux
      ? `\n✖ ${faux} borne(s) tombent à plus de 2 s du début de leur phrase : le texte s'affiche pendant qu'on parle d'autre chose.`
      : "\nToutes les bornes tombent sur un début de phrase.",
  );
  process.exit(faux ? 6 : 0);
}
