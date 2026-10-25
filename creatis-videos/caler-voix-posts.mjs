/**
 * Mesure ou tombe chaque phrase dans les voix off des posts, et en deduit le
 * nombre d'images de chaque plan.
 *
 *   node caler-voix-posts.mjs
 *
 * POURQUOI
 * Les posts utilisent **une seule prise de voix par video** au lieu d'un
 * fichier par plan. C'est ce qui supprime les vides : un fichier par plan
 * commence toujours par une amorce de silence et finit par une chute, et ca
 * s'entend a chaque coupe. En contrepartie, on ne peut plus deduire la duree
 * d'un plan de la duree de son fichier — il faut savoir a quelle seconde
 * chaque phrase commence dans la prise.
 *
 * D'ou Whisper : on redemande au modele ou sont les mots, et on coupe les plans
 * sur les silences les plus longs entre deux mots, c'est-a-dire aux frontieres
 * de phrases reelles. Deviner ces valeurs a l'oreille donnait des coupes qui
 * tombent au milieu d'un mot.
 *
 * C'est exactement ce que fait le produit sur les videos des clients : la boucle
 * est la meme.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const VOIX = join(ICI, "public", "voix");
const FPS = 30;

const CLE = (process.env.GROQ_API_KEY || "").trim();
if (!CLE) {
  console.error("✗ GROQ_API_KEY absente de l'environnement.");
  process.exit(1);
}

/**
 * Premier mot de chaque plan, apres le plan d'ouverture.
 *
 * Premiere version : on prenait les N plus longs silences entre deux mots. Ca
 * echouait — les plus longs blancs d'une prise sont souvent les micro-silences
 * du tout debut, pas les frontieres de phrases, et les coupes tombaient a
 * 0,18 s. Chercher un mot precis est deterministe et se relit.
 *
 * Le dernier plan de chaque post est le carton final.
 */
const POSTS = {
  "p1-vues": ["il", "lia", "creatis"],
  "p2-erreur": ["ils", "les", "tout"],
  "p3-avant-apres": ["apres", "entre", "tout"],
  "p4-liste": ["premier", "deuxieme", "troisieme", "creatis"],
  // Le post 5 n'a qu'une prise continue : le carton final est muet.
  "p5-pov": [],
};

/** Sans accents ni ponctuation, pour comparer ce que Whisper a bien voulu ecrire. */
const nu = (m) =>
  m
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");

const transcrire = async (fichier) => {
  const fd = new FormData();
  fd.append("file", new Blob([readFileSync(fichier)], { type: "audio/mpeg" }), "v.mp3");
  fd.append("model", "whisper-large-v3-turbo");
  fd.append("language", "fr");
  fd.append("response_format", "verbose_json");
  fd.append("timestamp_granularities[]", "word");

  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${CLE}` },
    body: fd,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
  return r.json();
};

for (const [id, ancres] of Object.entries(POSTS)) {
  const fichier = join(VOIX, `${id}.mp3`);
  let donnees;
  try {
    donnees = await transcrire(fichier);
  } catch (e) {
    console.log(`· ${id} ignoré (${e.message.slice(0, 60)})`);
    continue;
  }

  const mots = donnees.words ?? [];
  if (mots.length < 2) {
    console.log(`· ${id} : pas de mots horodatés`);
    continue;
  }
  const duree = mots[mots.length - 1].end;

  /* On avance dans la prise en cherchant chaque mot d'ancrage APRES le
     precedent, pour qu'un mot repete ne fasse pas reculer la coupe. */
  const coupes = [];
  let curseur = 0;
  for (const ancre of ancres) {
    const i = mots.findIndex((m, k) => k > curseur && nu(m.word).startsWith(ancre));
    if (i === -1) {
      console.log(`
${id} : ancre « ${ancre} » introuvable`);
      continue;
    }
    coupes.push(mots[i].start);
    curseur = i;
  }

  const bornes = [0, ...coupes, duree];
  const images = [];
  for (let i = 1; i < bornes.length; i++) {
    images.push(Math.round((bornes[i] - bornes[i - 1]) * FPS));
  }

  console.log(`\n${id} — ${duree.toFixed(2)}s`);
  console.log(`  texte  : ${donnees.text.trim()}`);
  console.log(`  coupes : ${coupes.map((c) => c.toFixed(2) + "s").join("  ")}`);
  console.log(`  images : ${images.join(" / ")}   (total ${images.reduce((a, b) => a + b, 0)})`);
}
