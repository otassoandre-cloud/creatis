/**
 * Voix off du tutoriel quotidien.
 *
 *   node generer-voix-tuto.mjs                  → le texte du jour
 *   node generer-voix-tuto.mjs --texte "..."    → un autre texte
 *   node generer-voix-tuto.mjs --nom autre.mp3
 *
 * ── LA LONGUEUR N'EST PAS AU CHOIX ───────────────────────────────────────
 * Mesuré sur la voix « Charon » : 166 mots/minute. Une vidéo de 45 s tient donc
 * environ 124 mots. Le script REFUSE d'écrire un texte trop long plutôt que de
 * laisser la voix déborder : au montage, un commentaire qui dépasse oblige soit
 * à couper la fin, soit à accélérer — et une voix pressée est le premier signal
 * qu'on regarde une publicité.
 *
 * ── DEUX PIÈGES DÉJÀ PAYÉS ───────────────────────────────────────────────
 * · Les chiffres se disent mal : « 66K » se lisait « soixante-six kelvin »,
 *   « 9:16 » « neuf heures seize ». On écrit tout en toutes lettres.
 * · Le quota TTS n'accorde que quelques générations par jour, sur un modèle
 *   « preview » qui peut disparaître. Vérifier avec `tester-voix.mjs` avant
 *   d'enchaîner plusieurs essais.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const DEPOT = join(ICI, "..");
const FFMPEG = join(DEPOT, "node_modules", "ffmpeg-static", "ffmpeg.exe");
const SORTIE = join(ICI, "public", "voix");

/* 190, et non 166. Les 166 venaient d'une phrase courte : sur un texte entier
   la voix ne respire pas entre les phrases et tient 103 mots en 32,4 s, soit
   191 mots/minute. Mesurer sur un echantillon trop court surestime la duree et
   fait ecrire des textes trop maigres — la premiere voix laissait douze
   secondes de silence. */
const MOTS_PAR_MINUTE = 190;
const DUREE_CIBLE = 33;
const PLAFOND = Math.round((MOTS_PAR_MINUTE / 60) * DUREE_CIBLE); // 124

const env = {};
for (const l of readFileSync(join(DEPOT, ".env"), "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };

/* Le texte enseigne, il ne vend pas. C'est ce qui le distingue des 68 vidéos
   précédentes, dont le décrochage était mesuré à deux secondes — le moment où le
   spectateur reconnaissait une publicité. Ici on montre un geste, et le produit
   n'apparaît que parce qu'il est l'outil de ce geste. */
const TEXTE_DU_JOUR = `
Tu as une vidéo longue et tu veux en tirer des formats courts. Voilà comment.
Tu colles le lien. Rien à télécharger, aucun logiciel à installer.
L'intelligence artificielle lit ce qui est dit, et cherche les passages qui se comprennent tout seuls. Pas les plus bruyants : les plus autonomes.
Elle te rend ses meilleures propositions, notées, déjà recadrées en vertical et sous-titrées.
À toi de trier. C'est la seule étape qui compte vraiment, et la seule qui ne s'automatise pas.
Tu ajustes les sous-titres si tu veux, puis tu exportes.
Une vidéo d'une heure, ça fait une semaine de contenu court.
`.trim().replace(/\s+/g, " ");

const TEXTE = arg("texte", TEXTE_DU_JOUR);
const NOM = arg("nom", "tuto-du-jour.mp3");
const mots = TEXTE.split(/\s+/).length;

console.log(`${mots} mots — plafond ${PLAFOND} pour ${DUREE_CIBLE} s`);
if (mots > PLAFOND) {
  console.error(`\nTROP LONG de ${mots - PLAFOND} mots.`);
  console.error("Raccourcir plutôt qu'accélérer : une voix pressée se reconnaît comme une publicité.");
  process.exit(1);
}

const chiffres = TEXTE.match(/\d/g);
if (chiffres) {
  console.warn(`\nAttention : le texte contient des chiffres (${chiffres.join("")}).`);
  console.warn("Les écrire en toutes lettres — « 9:16 » se lit « neuf heures seize ».");
}

const r = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${env.GEMINI_API_KEY}`,
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
  console.error(`\nTTS indisponible — HTTP ${r.status}`);
  console.error((await r.text()).slice(0, 250));
  if (r.status === 429) console.error("Quota du jour atteint : quelques générations seulement.");
  process.exit(1);
}

const d = await r.json();
const b64 = d?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
if (!b64) { console.error("Réponse sans audio."); process.exit(1); }

mkdirSync(SORTIE, { recursive: true });
const pcm = join(SORTIE, NOM.replace(/\.mp3$/, ".pcm"));
const mp3 = join(SORTIE, NOM);
writeFileSync(pcm, Buffer.from(b64, "base64"));
// Gemini rend du PCM brut L16 24 kHz mono : ffmpeg ne le devine pas, on le lui dit.
execFileSync(FFMPEG, ["-y", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", pcm, mp3], { stdio: "pipe" });

const secondes = statSync(pcm).size / (24000 * 2);
console.log(`\nVoix générée : ${mp3}`);
console.log(`  durée : ${secondes.toFixed(1)} s (cible ${DUREE_CIBLE} s)`);
if (secondes > DUREE_CIBLE) {
  console.warn(`  DÉPASSE de ${(secondes - DUREE_CIBLE).toFixed(1)} s — raccourcir le texte.`);
}
