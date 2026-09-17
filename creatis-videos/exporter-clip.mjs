/**
 * EXPORTE UN CLIP PAR LE CHEMIN DU PRODUIT — recadrage 9:16 + sous-titres.
 *
 *   CREATIS_EMAIL=... CREATIS_MDP=... node exporter-clip.mjs <videoId> <debut> <fin> <sortie>
 *   CREATIS_EMAIL=... CREATIS_MDP=... node exporter-clip.mjs 5REkznchlcs 100 151 public/clip.mp4
 *
 * ── POURQUOI CE SCRIPT EXISTE ─────────────────────────────────────────────
 * Les vidéos du Parcours montrent une grille de clips, puis UN de ces clips en
 * plein écran. Les deux doivent sortir de la même génération : montrer un clip
 * qui ne figure pas dans la grille filmée juste avant ferait de la vidéo une
 * démonstration truquée.
 *
 * L'enregistrement Playwright ouvre le clip dans l'application mais ne le
 * télécharge pas. Reste à le produire, et à le produire EXACTEMENT comme le
 * ferait un client : c'est ce que fait ce script, en empruntant les mêmes
 * routes que `clips-v2.html`.
 *
 * ── LE CHEMIN, ET POURQUOI IL NE PASSE PAS PAR GROQ ───────────────────────
 * L'analyse (repérage des moments) est la seule étape qui consomme le budget
 * LLM, et elle a déjà eu lieu pendant l'enregistrement. Le rendu d'un segment
 * connu n'appelle aucun modèle de langage : `/process-clip` fait le recadrage et
 * l'incrustation en une passe. Ce script est donc utilisable même quand le
 * budget quotidien est épuisé.
 *
 * Les sous-titres ont besoin des segments de transcription. On les demande à
 * Railway (`/transcript/<id>`), qui les tire des sous-titres YouTube ; en cas de
 * refus — YouTube renvoie régulièrement des 429 à cette IP — on bascule sur
 * Whisper (`/transcribe-segments`), qui ne dépend pas non plus du budget LLM.
 */
import { writeFileSync } from "node:fs";

const [VIDEO_ID, DEBUT, FIN, SORTIE, CADRAGE] = process.argv.slice(2);
const EMAIL = process.env.CREATIS_EMAIL;
const MDP = process.env.CREATIS_MDP;
const SITE = (process.env.CREATIS_URL || "https://creatis.app").replace(/\/+$/, "");
const SB_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SB_ANON = process.env.SUPABASE_ANON_KEY || "";

if (!VIDEO_ID || !DEBUT || !FIN || !SORTIE || !EMAIL || !MDP) {
  console.error(
    "Usage : CREATIS_EMAIL=... CREATIS_MDP=... node exporter-clip.mjs <videoId> <debut> <fin> <sortie> [center|split|face]",
  );
  process.exit(1);
}
const debut = Number(DEBUT);
const fin = Number(FIN);

/** Connexion réelle : le jeton obtenu est celui d'un client ordinaire. */
async function jetonUtilisateur() {
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SB_ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: MDP }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error(`connexion refusée : ${JSON.stringify(d).slice(0, 200)}`);
  return d.access_token;
}

/** Même route que le studio : c'est elle qui donne l'accès au service de rendu. */
async function accesRailway(jeton) {
  const r = await fetch(`${SITE}/api/repurpose`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "upload-token" }),
  });
  const d = await r.json();
  if (!d.railway_url || !d.token) throw new Error(`accès refusé : ${JSON.stringify(d).slice(0, 200)}`);
  return d;
}

async function segments({ railway_url, token }) {
  const H = { Authorization: `Bearer ${token}` };

  const parYouTube = await fetch(`${railway_url}/transcript/${VIDEO_ID}`, { headers: H })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  if (parYouTube?.segments?.length) {
    console.log(`· sous-titres YouTube : ${parYouTube.segments.length} segments`);
    return parYouTube.segments;
  }

  console.log("· sous-titres YouTube indisponibles, transcription Whisper…");
  const r = await fetch(`${railway_url}/transcribe-segments`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ youtube_url: `https://www.youtube.com/watch?v=${VIDEO_ID}` }),
  });
  const d = await r.json().catch(() => ({}));
  if (!d.segments?.length) throw new Error(`transcription impossible : ${JSON.stringify(d).slice(0, 200)}`);
  console.log(`· Whisper : ${d.segments.length} segments`);
  return d.segments;
}

/**
 * Recale les sous-titres sur le début du clip, au format attendu par
 * `/process-clip`. Copie fidèle de ce que fait `clips-v2.html` avant l'export :
 * on ne garde que ce qui chevauche le clip, t0/t1 partent de zéro, et les
 * timings mot par mot sont conservés — sans eux le serveur redivise la phrase en
 * parts égales et le karaoké se désynchronise.
 */
function recaler(tout) {
  const sortie = [];
  for (const sg of tout) {
    const d = sg.start ?? 0;
    const f = sg.end ?? d + 2;
    if (d >= fin || f <= debut) continue;
    const texte = (sg.text || "").trim();
    if (!texte) continue;
    const bloc = {
      text: texte,
      t0: Math.max(0, d - debut),
      t1: Math.min(fin - debut, f - debut),
    };
    const mots = (sg.words || [])
      .map((m) => ({
        word: m.word,
        start: Math.max(0, (m.start ?? d) - debut),
        end: Math.min(fin - debut, (m.end ?? f) - debut),
      }))
      .filter((m) => m.word && m.end > m.start);
    if (mots.length) bloc.words = mots;
    if (bloc.t1 > bloc.t0) sortie.push(bloc);
  }
  return sortie;
}

const jeton = await jetonUtilisateur();
console.log("· connecté");
const acces = await accesRailway(jeton);
console.log("· accès au service de rendu");

const segs = recaler(await segments(acces));
console.log(`· ${segs.length} sous-titres sur le clip`);

/* Réglages par défaut du studio : style `bold`, corps 55, ligne à 82 % de la
   hauteur. Les reprendre tels quels est le but — la vidéo doit montrer ce
   qu'obtient quelqu'un qui ne touche à rien. */
const form = new FormData();
form.append("yt_video_id", VIDEO_ID);
form.append("yt_start", String(debut));
form.append("yt_end", String(fin));
form.append("segments", JSON.stringify(segs));
form.append("style", "bold");
form.append("font_size", "55");
form.append("sub_y", "82");
form.append("sub_x", "50");
form.append("color_text", "#ffffff");
form.append("color_bg", "#000000");
/* `center` est le défaut du studio. `split` déclenche `_reframe_split_dynamic` :
   le service analyse l'image toutes les 0,5 s et bascule seul — deux visages
   donnent un écran scindé, un seul un suivi de visage, aucun un crop centré.
   Sur un plateau à deux, le crop centré coupe les deux personnes en deux. */
form.append("reframe_mode", CADRAGE || "center");
form.append("hook_enabled", "false");
form.append("plan", "pro");

console.log("· rendu en cours (recadrage + sous-titres)…");
const r = await fetch(`${acces.railway_url}/process-clip?token=${encodeURIComponent(acces.token)}`, {
  method: "POST",
  body: form,
});
if (!r.ok) {
  console.error(`✗ rendu refusé (${r.status}) : ${(await r.text()).slice(0, 300)}`);
  process.exit(1);
}

/* `/process-clip` dépose le fichier sur R2 et renvoie un lien ; si R2 est
   indisponible il renvoie la vidéo elle-même. Les deux cas se présentent. */
const type = r.headers.get("content-type") || "";
if (type.includes("application/json")) {
  const d = await r.json();
  if (!d.url) {
    console.error(`✗ réponse inattendue : ${JSON.stringify(d).slice(0, 200)}`);
    process.exit(1);
  }
  const bin = Buffer.from(await fetch(d.url).then((x) => x.arrayBuffer()));
  writeFileSync(SORTIE, bin);
} else {
  writeFileSync(SORTIE, Buffer.from(await r.arrayBuffer()));
}

console.log(`\n✓ ${SORTIE}`);
