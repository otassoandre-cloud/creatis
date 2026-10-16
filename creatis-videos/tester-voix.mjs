/**
 * Teste la voix off — repond-elle aujourd'hui, et a quel debit ?
 *
 *   node tester-voix.mjs
 *   node tester-voix.mjs "un autre texte a dire"
 *
 * Le TTS Gemini est la piece la moins fiable de la chaine : quota de quelques
 * generations par jour seulement, et le modele est un « preview » qui peut
 * disparaitre sans preavis — c'est deja arrive a gemini-2.0-flash.
 *
 * Ce script produit un fichier court et mesure sa duree : c'est ce qui permet de
 * savoir, AVANT d'ecrire un script de tutoriel, combien de mots tiennent dans le
 * temps vise. Mesure attendue : environ 150 mots/minute sur la voix posee.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const DEPOT = join(ICI, "..");
const FFMPEG = join(DEPOT, "node_modules", "ffmpeg-static", "ffmpeg.exe");
const SORTIE = join(ICI, "public", "voix");

const env = {};
for (const l of readFileSync(join(DEPOT, ".env"), "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

/* Chiffres en toutes lettres : « 9:16 » se lisait « neuf heures seize » et
   « 0,39 $ » « zero virgule trente-neuf dollars » passe, mais « 66K » devenait
   « soixante-six kelvin ». La regle vaut pour tous les scripts a venir. */
const TEXTE = process.argv[2] ||
  "Voici comment transformer une vidéo longue en clips verticaux. " +
  "Tu colles le lien, l'analyse repère les meilleurs passages, et tu récupères " +
  "tes formats courts prêts à publier.";

const MODELE = "gemini-2.5-flash-preview-tts";

const r = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${MODELE}:generateContent?key=${env.GEMINI_API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: TEXTE }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } } },
      },
    }),
  },
);

if (!r.ok) {
  const t = await r.text();
  console.error(`TTS indisponible — HTTP ${r.status}`);
  console.error(t.slice(0, 300));
  if (r.status === 429) console.error("\nQuota du jour atteint. Le TTS Gemini n'en accorde que quelques-uns.");
  if (r.status === 404) console.error("\nModèle retiré du catalogue — en chercher un autre avant d'aller plus loin.");
  process.exit(1);
}

const d = await r.json();
const b64 = d?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
if (!b64) { console.error("Réponse sans audio :", JSON.stringify(d).slice(0, 300)); process.exit(1); }

mkdirSync(SORTIE, { recursive: true });
const pcm = join(SORTIE, "test.pcm");
const mp3 = join(SORTIE, "test.mp3");
writeFileSync(pcm, Buffer.from(b64, "base64"));

// Gemini rend du PCM brut L16 24 kHz mono — il faut le dire a ffmpeg, il ne le devine pas.
execFileSync(FFMPEG, ["-y", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", pcm, mp3], { stdio: "pipe" });

const secondes = statSync(pcm).size / (24000 * 2);
const mots = TEXTE.trim().split(/\s+/).length;

console.log("TTS opérationnel.");
console.log(`  fichier  : ${mp3}`);
console.log(`  durée    : ${secondes.toFixed(1)} s pour ${mots} mots`);
console.log(`  débit    : ${Math.round((mots / secondes) * 60)} mots/minute`);
console.log("");
console.log(`  À ce débit, une vidéo de 30 s tient ~${Math.round((mots / secondes) * 30)} mots,`);
console.log(`  et une de 60 s ~${Math.round((mots / secondes) * 60)} mots.`);
