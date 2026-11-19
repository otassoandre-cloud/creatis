#!/usr/bin/env node
/**
 * Brief quotidien — ce que chaque COMPTE a produit hier, et ce qu'on en déduit.
 *
 *   node scripts/social-brief.js             → la veille
 *   node scripts/social-brief.js --jours 7
 *   node scripts/social-brief.js --json
 *
 * Répond aux trois questions posées : a-t-on eu des visites, des inscrits, des payants —
 * et par quel compte.
 *
 * Deux sources :
 *   PostHog  → les VISITES (quelqu'un a tapé le lien et est arrivé)
 *   Supabase → les INSCRITS et les PAYANTS
 * La première sans la seconde veut dire « ça clique mais ça ne convertit pas » ; la
 * seconde sans la première est impossible et signale un problème de mesure.
 *
 * Contexte à garder en tête en lisant les chiffres : sous 1 000 abonnés TikTok
 * n'autorise aucun lien cliquable. Les adresses doivent être TAPÉES, donc le chiffre
 * TikTok est un plancher — une partie du public passera par une recherche de marque
 * et sera comptée ailleurs.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const JOURS = parseInt(arg('jours', '1'), 10);

/* Correspondance entre le code d'URL et le compte réel. À tenir à jour quand un compte
   est ajouté : c'est la seule chose qui rend le tableau lisible. */
const COMPTES = {
  'tiktok/compte1': 'TikTok principal (~500 ab.)',
  'tiktok/compte2': 'TikTok secondaire (~7 ab.)',
  'instagram/compte1': 'Instagram principal (~90 ab.)',
  'instagram/compte2': 'Instagram secondaire (~9 ab.)',
  'tiktok/bio': 'TikTok (lien générique)',
  'instagram/bio': 'Instagram (lien générique)',
  'x/bio': 'X (bio)',
};

function env() {
  const p = path.join(RACINE, '.env');
  const v = {};
  if (fs.existsSync(p)) for (const l of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) v[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return v;
}
const E = env();

async function sb(chemin) {
  const r = await fetch(`${E.SUPABASE_URL}/rest/v1${chemin}`, {
    headers: { apikey: E.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${E.SUPABASE_SERVICE_KEY}` },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status} — ${(await r.text()).slice(0, 160)}`);
  return r.json();
}

/** Visites par campagne. Renvoie null si PostHog n'est pas joignable — on préfère
    afficher « non mesuré » qu'un zéro qui se lirait comme un échec. */
async function visites(depuis) {
  if (!E.POSTHOG_PERSONAL_API_KEY || !E.POSTHOG_PROJECT_ID) return null;
  /* `src != ''` ne suffit pas : la très grande majorité des visiteurs n'a aucun UTM et
     ressort avec src = NULL, ce qui produisait une ligne « null/bio » agrégeant tout le
     trafic organique — lue à tort comme un compte qui ne convertit pas. On ne garde que
     les sources que NOS liens posent. */
  const sql = `select properties.$initial_utm_source as src,
                      properties.$initial_utm_campaign as camp,
                      count(distinct person_id) as gens
               from events
               where timestamp > toDateTime('${depuis.toISOString().slice(0, 19).replace('T', ' ')}')
                 and event = '$pageview'
                 and src in ('tiktok','instagram','x','youtube','linkedin')
               group by src, camp`;
  try {
    const r = await fetch(`https://eu.posthog.com/api/projects/${E.POSTHOG_PROJECT_ID}/query/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${E.POSTHOG_PERSONAL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query: sql } }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const m = new Map();
    for (const [src, camp, gens] of (d.results || [])) m.set(`${src}/${camp || 'bio'}`, gens);
    return m;
  } catch { return null; }
}

(async () => {
  const depuis = new Date(Date.now() - JOURS * 864e5);
  depuis.setHours(0, 0, 0, 0);

  const users = await sb(`/users?select=id,source,plan,created_at&created_at=gte.${depuis.toISOString()}&limit=5000`);
  const vues = await visites(depuis);

  const SOCIAL = /^utm\/(tiktok|instagram|x|youtube|linkedin)\//i;
  const parCle = new Map();
  for (const u of users) {
    const s = u.source || 'direct';
    if (!SOCIAL.test(s)) continue;
    const [, plateforme, , campagne] = s.split('/');
    const cle = `${plateforme}/${campagne || 'bio'}`;
    if (!parCle.has(cle)) parCle.set(cle, { inscrits: 0, payants: 0 });
    const e = parCle.get(cle);
    e.inscrits++;
    if (u.plan && u.plan !== 'gratuit') e.payants++;
  }

  // Toute clé vue d'un côté OU de l'autre doit apparaître dans le tableau.
  const cles = new Set([...parCle.keys(), ...(vues ? vues.keys() : [])]);

  const lignes = [...cles].map((c) => ({
    cle: c,
    nom: COMPTES[c] || c,
    visites: vues ? (vues.get(c) || 0) : null,
    ...(parCle.get(c) || { inscrits: 0, payants: 0 }),
  })).sort((a, b) => (b.inscrits - a.inscrits) || ((b.visites || 0) - (a.visites || 0)));

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ jours: JOURS, total_inscrits: users.length, lignes }, null, 2));
    return;
  }

  const L = [];
  L.push(`BRIEF — ${new Date().toISOString().slice(0, 10)} · fenêtre ${JOURS} jour${JOURS > 1 ? 's' : ''}`);
  L.push('='.repeat(70));
  L.push(`Inscrits toutes sources : ${users.length}`);
  if (vues === null) L.push('Visites : NON MESURÉES (PostHog non configuré en local) — colonne vide, pas nulle.');
  L.push('');

  if (!lignes.length) {
    L.push('AUCUNE ACTIVITÉ SOCIALE TRACÉE SUR LA PÉRIODE.');
    L.push('');
    L.push('Avant d\'en conclure que les publications ne marchent pas, vérifier que');
    L.push('le lien est bien en place et sous la bonne forme :');
    L.push('  TikTok principal      creatis.app/t1');
    L.push('  TikTok secondaire     creatis.app/t2');
    L.push('  Instagram principal   creatis.app/g1');
    L.push('  Instagram secondaire  creatis.app/g2');
    L.push('');
    L.push('Sur TikTok le lien n\'est pas cliquable sous 1 000 abonnés : il doit');
    L.push('figurer en TEXTE dans la bio, et quelqu\'un doit le taper.');
  } else {
    L.push('  visites  inscrits  payants   compte');
    for (const l of lignes) {
      const v = l.visites === null ? '  —  ' : String(l.visites).padStart(5);
      L.push(`  ${v}    ${String(l.inscrits).padStart(6)}   ${String(l.payants).padStart(6)}   ${l.nom}`);
    }
    L.push('');
    L.push('LECTURE');
    const sansConversion = lignes.filter((l) => (l.visites || 0) > 0 && l.inscrits === 0);
    const sansVisite = lignes.filter((l) => l.visites === 0 && l.inscrits === 0);
    const gagnants = lignes.filter((l) => l.inscrits > 0);
    if (gagnants.length) {
      const g = gagnants[0];
      L.push(`  • ${g.nom} est en tête : ${g.inscrits} inscrit(s), ${g.payants} payant(s).`);
      L.push('    Reprendre son ANGLE, pas son montage — c\'est le sujet qui a porté.');
    }
    if (sansConversion.length) {
      L.push(`  • ${sansConversion.length} compte(s) amènent des visites mais aucun inscrit :`);
      L.push('    le contenu attire, la page d\'arrivée ou la promesse ne suit pas.');
    }
    if (sansVisite.length) {
      L.push(`  • ${sansVisite.length} compte(s) à zéro visite : soit rien publié, soit le lien`);
      L.push('    n\'est pas lisible dans la bio. Vérifier avant de changer le contenu.');
    }
  }

  const texte = L.join('\n');
  console.log(texte);
  const dossier = path.join(RACINE, 'social', 'briefs');
  fs.mkdirSync(dossier, { recursive: true });
  const f = path.join(dossier, `brief-${new Date().toISOString().slice(0, 10)}.txt`);
  fs.writeFileSync(f, texte + '\n', 'utf8');
  console.log(`\n→ ${path.relative(RACINE, f)}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
