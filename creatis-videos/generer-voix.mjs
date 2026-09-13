/**
 * Genere la voix off francaise des scenes de PubVerticale.
 *
 * TTS : Gemini (gemini-2.5-flash-preview-tts). Choisi parce que la cle est deja
 * dans le .env du depot et fonctionne — ElevenLabs (le defaut du skill Remotion)
 * demanderait un compte de plus, et la cle OpenAI du projet n'a plus de credits.
 *
 * Gemini renvoie du PCM brut (L16, 24 kHz, mono) : on le convertit en MP3 avec
 * le ffmpeg deja present dans node_modules, sans rien installer sur la machine.
 *
 *   node generer-voix.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const DEPOT = join(ICI, "..");
const SORTIE = join(ICI, "public", "voix");
const FFMPEG = join(DEPOT, "node_modules", "ffmpeg-static", "ffmpeg.exe");

/**
 * Voix Gemini. « Charon » est la plus posee du catalogue — c'est le bon choix
 * pour les pubs longues (PubVerticale, PubLancement), et le mauvais pour
 * TikTok : mesure faite, elle descendait a 111-120 mots/minute sur les deux
 * dernieres repliques, la ou une pub reseaux sociaux tourne a 180-200.
 * « Puck » est la voix enjouee du catalogue ; les repliques TikTok la
 * demandent explicitement.
 */
const VOIX = "Charon";
const VOIX_TIKTOK = "Puck";

/**
 * Le texte est ecrit pour tenir dans la duree deja validee de chaque scene.
 * Les chiffres sont ecrits en toutes lettres : « 66 K » se lisait « soixante-six
 * kelvin » et « 9:16 » « neuf heures seize ».
 */
export const REPLIQUES = [
  { id: "s1-accroche", texte: "Ta vidéo de deux heures contient dix shorts." },
  {
    id: "s2-probleme",
    texte: "Tu ne les as jamais publiés. Trois heures de montage à la main.",
  },
  {
    id: "s3-produit",
    texte:
      "Colle ton lien. L'IA repère les moments forts, recadre, sous-titre. Tes clips sont prêts à publier.",
  },
  {
    // « pas retouché » se prononce comme « par retouché » — confirme par la
    // transcription de controle. Reformule pour lever l'ambiguite, et au passage
    // raccourci pour tenir dans les 5 s de la scene.
    id: "s4-preuve",
    texte: "Celui-ci a fait soixante-six mille vues. Aucune retouche.",
  },
  { id: "s5-cta", texte: "Créatis. Sept jours d'essai gratuit." },

  // Repliques propres a PubLancement (la pub de lancement)
  {
    id: "s6-interface",
    texte:
      "Tu colles ton lien. L'IA analyse, découpe, sous-titre. Une minute plus tard, tes clips sont prêts.",
  },
  {
    id: "s7-lancement",
    texte:
      "Créatis est disponible. Sept jours d'essai gratuit, résiliable avant sans rien payer.",
  },

  /* ── Pub TikTok/Reels (PubTikTok) ──────────────────────────────────────────
     Repliques COURTES : le texte porte deja le sens via les sous-titres
     incrustes (80 % regardent sans le son), la voix ne fait que doubler. Une
     voix off bavarde allongerait les plans et casserait la cadence de coupe. */
  {
    id: "t1-hook",
    texte: "Cette vidéo a fait soixante-six mille vues. Je ne l'ai pas montée.",
    ton: "punchy",
    voix: VOIX_TIKTOK,
  },
  {
    id: "t2-origine",
    texte: "Elle sort d'une vidéo de deux heures.",
    ton: "punchy",
    voix: VOIX_TIKTOK,
  },
  {
    /* « Trois heures à la découper à la main » n'avait ni sujet ni notion de
       perte : c'etait une statistique, pas un probleme. La 2e personne met le
       spectateur dans la scene — c'est LUI qui passerait les 3 heures. */
    id: "t3-cout",
    texte: "Toi, tu passerais trois heures à la découper à la main.",
    ton: "punchy",
    voix: VOIX_TIKTOK,
  },
  {
    /* Les virgules faisaient enchainer « recadre, sous-titre, exporte » d'un
       seul souffle mou : 120 mots/minute, le point bas de toute la pub sur son
       plan le plus long. Les points forcent l'attaque, et la liste staccato
       colle exactement aux trois sous-titres du plan. */
    id: "t4-solution",
    texte:
      "Tu colles ton lien. L'IA repère les moments forts. Recadre. Sous-titre. Exporte.",
    ton: "punchy",
    voix: VOIX_TIKTOK,
  },
  {
    id: "t5-resultat",
    texte: "Dix clips prêts à publier. En soixante secondes.",
    ton: "punchy",
    voix: VOIX_TIKTOK,
  },
  {
    id: "t6-cta",
    texte: "Créatis point app. Sept jours d'essai gratuit.",
    ton: "punchy",
    voix: VOIX_TIKTOK,
  },

  /* ── Posts organiques du 31/08 ─────────────────────────────────
     UNE SEULE PRISE PAR VIDEO, et non une replique par plan. C'est ce qui
     supprime les vides : avec un fichier par plan, chaque plan commence par une
     amorce de silence et finit par une chute, et ca s'entend a chaque coupe.
     Une prise unique enchaine les phrases naturellement, et les plans sont
     ensuite decoupes sur les frontieres de phrases mesurees par Whisper
     (caler-voix-posts.mjs).

     La phrase d'accroche tient en 3 s, soit 10 a 14 mots : chaque texte
     commence donc par sa promesse, jamais par un preambule. */
  {
    id: "p1-vues",
    texte:
      "Ce clip a fait soixante-six mille vues, en douze secondes. Il sort d'une vidéo de deux heures que personne n'a regardée. L'IA en a trouvé dix comme lui. Créatis point app.",
    ton: "punchy",
    voix: VOIX_TIKTOK,
  },
  {
    id: "p2-erreur",
    texte:
      "L'erreur que font neuf créateurs sur dix ? Ils publient la vidéo longue, et ils s'arrêtent là. Les vues ne sont pas dans la vidéo, elles sont dans les clips. Tout ça se fait sur Créatis point app.",
    ton: "punchy",
    voix: VOIX_TIKTOK,
  },
  {
    id: "p3-avant-apres",
    texte:
      "Avant. Une vidéo de deux heures que personne ne finit. Après. Dix clips prêts à publier. Entre les deux, soixante secondes. Tout ça se fait sur Créatis point app.",
    ton: "punchy",
    voix: VOIX_TIKTOK,
  },
  {
    id: "p4-liste",
    texte:
      "Trois clips que l'IA a trouvés dans ma vidéo. Le premier, quatre-vingt-quatorze sur cent. Le deuxième a fait soixante-six mille vues. Le troisième, je ne l'avais même pas vu. Créatis point app.",
    ton: "punchy",
    voix: VOIX_TIKTOK,
  },
  {
    id: "p5-pov",
    texte:
      "Tu colles un lien YouTube. L'IA regarde les deux heures à ta place. Elle sort les dix meilleurs moments, recadrés, sous-titrés, exportés. Tout ça se fait sur Créatis point app.",
    ton: "punchy",
    voix: VOIX_TIKTOK,
  },
];

const CLE = (process.env.GEMINI_API_KEY || "").trim();
if (!CLE) {
  console.error("✗ GEMINI_API_KEY absente de l'environnement.");
  process.exit(1);
}

mkdirSync(SORTIE, { recursive: true });

/**
 * La consigne de ton est donnee en langage naturel avant le texte. Gemini ne la
 * prononce pas — c'est verifie par transcription dans verifier-voix.mjs, parce
 * que « l'instruction lue a voix haute » est le mode d'echec typique de ce
 * genre de prompt.
 */
const TONS = {
  pose: "d'une voix posée, claire et confiante, sur un rythme naturel, sans emphase publicitaire",
  // Le ton TikTok est l'exact oppose : c'est un format ou la voix doit pousser.
  punchy:
    "avec beaucoup d'énergie, sur un débit rapide et percutant, en attaquant chaque phrase, sans traîner sur les mots ni marquer de pause entre les phrases",
};

const consigne = (texte, ton) =>
  `Lis ce texte en français, ${TONS[ton]} : ${texte}`;

for (const { id, texte, ton = "pose", voix = VOIX } of REPLIQUES) {
  const mp3Final = join(SORTIE, `${id}.mp3`);
  // Idempotent : le quota Gemini gratuit s'epuise vite, et une regeneration
  // change le debit (une replique est passee de 3,9 s a 6,7 s d'une fois sur
  // l'autre). On ne refait que ce qui manque. Forcer : node generer-voix.mjs --tout
  if (existsSync(mp3Final) && !process.argv.includes("--tout")) {
    console.log(`· ${id}.mp3 deja present, ignore`);
    continue;
  }

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${CLE}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: consigne(texte, ton) }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voix } },
          },
        },
      }),
    },
  );

  if (!r.ok) {
    console.error(`✗ ${id} : HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
    process.exit(1);
  }

  const donnees = await r.json();
  const partie = donnees?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!partie?.data) {
    console.error(`✗ ${id} : aucune donnée audio dans la réponse`);
    process.exit(1);
  }

  const pcm = join(SORTIE, `${id}.pcm`);
  const mp3 = join(SORTIE, `${id}.mp3`);
  writeFileSync(pcm, Buffer.from(partie.data, "base64"));

  // PCM brut -> MP3. Le debit d'entree doit etre declare : sans -ar 24000,
  // ffmpeg suppose 44,1 kHz et la voix sort accelérée facon dessin animé.
  // Gemini ajoute des silences en debut et fin — jusqu'a 2,5 s sur une replique,
  // ce qui la faisait deborder de sa scene. On les retire au passage.
  const SANS_SILENCE =
    "silenceremove=start_periods=1:start_silence=0.03:start_threshold=-45dB:detection=peak" +
    ",areverse," +
    "silenceremove=start_periods=1:start_silence=0.03:start_threshold=-45dB:detection=peak" +
    ",areverse";

  execFileSync(FFMPEG, [
    "-y", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", pcm,
    "-af", SANS_SILENCE,
    "-c:a", "libmp3lame", "-b:a", "128k", mp3, "-loglevel", "error",
  ]);

  const taille = readFileSync(mp3).length;
  console.log(`✓ ${id}.mp3 — ${(taille / 1024).toFixed(0)} Ko`);
}

console.log(
  `\n${REPLIQUES.length} répliques dans public/voix/ — ` +
    `${VOIX} (pubs longues) / ${VOIX_TIKTOK} (TikTok et posts)`,
);
