/* ===== Créer un compte client et lui poser un plan =====
 *
 *   node scripts/creer-compte.js contact@plateya.fr pro
 *   node scripts/creer-compte.js quelquun@exemple.fr starter
 *
 * Reprend la méthode déjà utilisée pour les partenariats (voir .scratch-demo/setup-mehdi.js) :
 * l'API admin de Supabase cree le compte dans auth.users avec email_confirm, ce qu'une simple
 * insertion dans public.users ne fait PAS — une ligne posee la sans compte d'authentification
 * donne un utilisateur incapable de se connecter.
 *
 * Idempotent : si le compte existe deja, il est reutilise et seul le plan est mis a jour.
 *
 * Necessite SUPABASE_URL et SUPABASE_SERVICE_KEY dans l'environnement.
 * La cle service_role se trouve dans Supabase → Settings → API. Elle donne tous les droits :
 * ne jamais la commiter ni la coller ailleurs que dans un terminal.
 */
const URL_SB = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();

const EMAIL = (process.argv[2] || '').trim().toLowerCase();
const PLAN = (process.argv[3] || 'pro').trim().toLowerCase();

const PLANS_VALIDES = ['gratuit', 'starter', 'pro', 'studio'];

function stop(msg) { console.error('\n✗ ' + msg + '\n'); process.exit(1); }

if (!URL_SB || !KEY) stop('SUPABASE_URL et SUPABASE_SERVICE_KEY doivent être dans l\'environnement.');
if (!EMAIL || !EMAIL.includes('@')) stop('Usage : node scripts/creer-compte.js <email> <plan>');
if (!PLANS_VALIDES.includes(PLAN)) stop('Plan inconnu : ' + PLAN + ' — attendus : ' + PLANS_VALIDES.join(', '));

const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };

/* Mot de passe temporaire lisible au telephone : pas de caracteres ambigus (l/1/O/0), et
   assez long pour rester serieux. Le client le changera via « mot de passe oublie ». */
function motDePasse() {
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZ', b = 'abcdefghijkmnpqrstuvwxyz', c = '23456789';
  const tout = a + b + c;
  let s = a[Math.floor(Math.random() * a.length)] + c[Math.floor(Math.random() * c.length)];
  for (let i = 0; i < 12; i++) s += tout[Math.floor(Math.random() * tout.length)];
  return s;
}

(async () => {
  console.log('\n  compte : ' + EMAIL + '\n  plan   : ' + PLAN + '\n');

  // 1. Le compte existe-t-il deja dans auth.users ?
  const r1 = await fetch(`${URL_SB}/auth/v1/admin/users?email=${encodeURIComponent(EMAIL)}`, { headers: H });
  if (!r1.ok) stop('Lecture auth impossible (' + r1.status + ') : ' + (await r1.text()).slice(0, 200));
  const existants = (await r1.json()).users || [];
  const deja = existants.find(u => (u.email || '').toLowerCase() === EMAIL);

  let id, mdp = null;
  if (deja) {
    id = deja.id;
    console.log('  → compte déjà existant, réutilisé (aucun mot de passe changé)');
  } else {
    mdp = motDePasse();
    const r2 = await fetch(`${URL_SB}/auth/v1/admin/users`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ email: EMAIL, password: mdp, email_confirm: true }),
    });
    if (!r2.ok) stop('Création impossible (' + r2.status + ') : ' + (await r2.text()).slice(0, 300));
    id = (await r2.json()).id;
    console.log('  → compte créé, email confirmé d\'office');
  }

  // 2. Poser le plan dans public.users
  const r3 = await fetch(`${URL_SB}/rest/v1/users?on_conflict=id`, {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ id, email: EMAIL, plan: PLAN, updated_at: new Date().toISOString() }),
  });
  if (!r3.ok) {
    const t = await r3.text();
    if (/users_plan_check/.test(t)) {
      stop('Le plan « ' + PLAN + ' » est refusé par la contrainte users_plan_check.\n'
         + '  Lance d\'abord supabase-quotas-plans.sql : la contrainte d\'origine\n'
         + '  n\'autorise que gratuit, pro et studio — starter est rejeté.');
    }
    stop('Écriture du plan impossible (' + r3.status + ') : ' + t.slice(0, 300));
  }

  const lien = 'https://creatis.app/?ref=' + String(id).slice(0, 12);
  console.log('\n  ─────────────────────────────────────────────');
  console.log('  plan actif   : ' + PLAN);
  console.log('  lien affilié : ' + lien);
  if (mdp) console.log('  mot de passe : ' + mdp + '   (à transmettre, puis à faire changer)');
  console.log('  ─────────────────────────────────────────────\n');
})();
