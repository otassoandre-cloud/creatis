/**
 * LANCE UNE ANALYSE ET REND LA LISTE DES CLIPS.
 *
 *   CREATIS_EMAIL=... CREATIS_MDP=... node analyser.mjs <url-youtube>
 *
 * ── POURQUOI CE SCRIPT EXISTE ─────────────────────────────────────────────
 * `enregistrer-parcours.mjs` fait la même analyse, mais en pilotant un vrai
 * navigateur pour en filmer l'écran. Quand on n'a pas besoin du film — c'est le
 * cas du Mur, qui ne montre que les clips — Playwright coûte dix minutes et un
 * navigateur pour rien.
 *
 * Ici on emprunte les mêmes routes que le studio, sans interface : `clips_start`
 * rend un identifiant de session, Railway analyse en tâche de fond, et
 * `clips_status` donne les clips avec leurs bornes. Ce sont ces bornes qu'on
 * passe ensuite à `exporter-clip.mjs`.
 *
 * ── LE PLAFOND À CONNAÎTRE ────────────────────────────────────────────────
 * L'analyse est la seule étape qui consomme le budget LLM, et ce budget est
 * commun à tout le compte : 200 000 tokens par jour au palier gratuit de Groq,
 * soit six à huit vidéos longues pour TOUS les clients réunis. Une source de
 * 24 minutes en consomme environ 18 000 ; une de 90 minutes, quatre fois plus.
 * Choisir court n'est pas une coquetterie, c'est ce qui laisse de la place aux
 * clients.
 */
const URL_VIDEO = process.argv[2];
const EMAIL = process.env.CREATIS_EMAIL;
const MDP = process.env.CREATIS_MDP;
const SITE = (process.env.CREATIS_URL || "https://creatis.app").replace(/\/+$/, "");
const SB_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SB_ANON = process.env.SUPABASE_ANON_KEY || "";

if (!URL_VIDEO || !EMAIL || !MDP) {
  console.error("Usage : CREATIS_EMAIL=... CREATIS_MDP=... node analyser.mjs <url-youtube>");
  process.exit(1);
}

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: SB_ANON, "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: MDP }),
}).then((x) => x.json());
if (!r.access_token) {
  console.error("connexion refusée :", JSON.stringify(r).slice(0, 200));
  process.exit(1);
}
console.log("· connecté");

const appel = (corps) =>
  fetch(`${SITE}/api/repurpose`, {
    method: "POST",
    headers: { Authorization: `Bearer ${r.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  }).then((x) => x.json());

const depart = await appel({ mode: "clips_start", url: URL_VIDEO, n_clips: 10 });
if (!depart.session_id) {
  console.error("démarrage impossible :", JSON.stringify(depart).slice(0, 250));
  process.exit(1);
}
console.log("· analyse lancée —", depart.session_id);

/* Vingt minutes de patience au maximum. Une analyse qui dépasse ça a rencontré
   autre chose qu'une lenteur : saturation du budget, redémarrage de Railway,
   source sans sous-titres. Le message le dira. */
for (let i = 0; i < 80; i++) {
  await attendre(15000);
  const etat = await appel({ mode: "clips_status", session_id: depart.session_id, url: URL_VIDEO });
  if (etat.status === "error") {
    console.error("\n✗ " + (etat.error || "échec inconnu"));
    process.exit(1);
  }
  if (etat.status === "done" && etat.result?.clips?.length) {
    const clips = etat.result.clips;
    console.log(`\n${clips.length} clips — ${etat.result.title || ""}\n`);
    clips.forEach((c, n) => {
      const d = Math.round(c.start_time ?? c.start);
      const f = Math.round(c.end_time ?? c.end);
      const mm = String(Math.floor(d / 60)).padStart(2, "0");
      const ss = String(d % 60).padStart(2, "0");
      console.log(
        `${String(n).padStart(2)} · ${String(c.score ?? "").padStart(2)} · ${mm}:${ss} · ${f - d}s · ${d} ${f} · ${c.title || ""}`,
      );
    });
    process.exit(0);
  }
  if (i % 4 === 0) process.stdout.write(`\r  ${etat.progress || etat.status || "…"}          `);
}
console.error("\n✗ délai dépassé");
process.exit(1);
