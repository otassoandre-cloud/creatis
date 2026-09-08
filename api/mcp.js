/* CONNECTEUR MCP CRÉATIS
   ────────────────────────────────────────────────────────────────────────────
   Permet à n'importe qui d'ajouter Créatis comme connecteur dans Claude et de
   demander des clips en langage naturel. Le protocole est du JSON-RPC 2.0 sur
   HTTP (transport « Streamable HTTP » du MCP).

   Implémenté à la main plutôt qu'avec le SDK : le protocole tient en trois
   méthodes (`initialize`, `tools/list`, `tools/call`), le projet n'a aucune
   dépendance de ce genre ailleurs, et une fonction Vercel démarre plus vite sans.

   ÉTAT CÔTÉ SERVEUR. Le pipeline web fait porter l'état d'avancement par le
   navigateur : à chaque sondage, le client renvoie `job_ids`, `pending_clips` et
   `done_clips`. Un appelant LLM ne peut pas trimballer ces structures d'un appel
   à l'autre sans les déformer. On les garde donc dans `mcp_jobs`, et Claude ne
   manipule qu'un identifiant court.

   QUOTA. Aucune vérification ici : les appels passent par /api/repurpose avec le
   jeton de l'utilisateur, et `verifyToken` sait résoudre un jeton MCP. Plan,
   quota vidéos, quota clips et décompte s'appliquent donc exactement comme sur le
   site — un abonné qui passe par Claude consomme le même quota.  */

const { utilisateurDuJeton } = require('./mcp-oauth');

const APP_URL = process.env.APP_URL || 'https://creatis.app';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const PROTOCOLE = '2025-06-18';
const MAX_CLIPS = 5;

/* ── Accès direct aux tables de suivi (jamais exposées au client) ── */
async function db(chemin, options = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${chemin}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json', ...(options.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status} — ${(await r.text()).slice(0, 150)}`);
  return r.status === 204 ? null : r.json();
}

/* ── Relais vers le pipeline, avec le jeton de l'utilisateur ── */
async function pipeline(jeton, corps) {
  const r = await fetch(`${APP_URL}/api/repurpose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` },
    body: JSON.stringify(corps),
    signal: AbortSignal.timeout(55000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(data.message || data.error || `Erreur ${r.status}`);
    e.code = data.error;
    throw e;
  }
  return data;
}

/* ── Outils exposés ────────────────────────────────────────────────────────
   Les descriptions sont écrites pour être lues par un modèle : elles disent quand
   appeler l'outil et ce qu'il coûte, pas seulement ce qu'il fait. `creer_clips`
   consomme un quota réel — la description le dit explicitement pour que Claude ne
   l'appelle pas en boucle « pour voir ». */
const OUTILS = [
  {
    name: 'creer_clips',
    description:
      "Découpe une vidéo YouTube longue en clips verticaux (9:16) prêts à publier sur TikTok, " +
      "Reels ou Shorts. L'IA repère les moments les plus forts, recadre sur le visage et " +
      "incruste les sous-titres. Le traitement dure plusieurs minutes : cet outil rend " +
      "immédiatement un identifiant, puis il faut appeler `etat_clips` pour suivre l'avancement. " +
      "ATTENTION : chaque appel consomme une vidéo du quota mensuel de l'utilisateur. Ne pas " +
      "relancer une génération déjà en cours — vérifier d'abord avec `etat_clips`.",
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: "URL de la vidéo YouTube à découper." },
        nombre: {
          type: 'integer', minimum: 1, maximum: MAX_CLIPS, default: 3,
          description: `Nombre de clips à produire (1 à ${MAX_CLIPS}, 3 par défaut).`,
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'etat_clips',
    description:
      "Donne l'avancement d'une génération lancée par `creer_clips`, et les liens de " +
      "téléchargement des clips terminés. Une génération complète prend en général 3 à 8 minutes " +
      "selon la longueur de la vidéo ; les clips arrivent un par un. Rappeler cet outil après " +
      "une trentaine de secondes tant que le statut est « en_cours ».",
    inputSchema: {
      type: 'object',
      properties: { job_id: { type: 'string', description: "Identifiant rendu par `creer_clips`." } },
      required: ['job_id'],
    },
  },
  {
    name: 'mon_quota',
    description:
      "Indique le plan de l'utilisateur et ce qu'il lui reste ce mois-ci (vidéos analysables, " +
      "clips exportables). À appeler avant `creer_clips` si l'utilisateur demande combien il " +
      "lui reste, ou pour expliquer un refus de quota.",
    inputSchema: { type: 'object', properties: {} },
  },
];

/* ── Mise en forme du résultat pour un lecteur humain ── */
const texte = (t) => ({ content: [{ type: 'text', text: t }] });
const erreur = (t) => ({ content: [{ type: 'text', text: t }], isError: true });

async function appelerOutil(nom, args, jeton, userId) {
  /* ── creer_clips ── */
  if (nom === 'creer_clips') {
    const url = String(args?.url || '').trim();
    if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
      return erreur("Cette URL n'est pas une vidéo YouTube. Seul YouTube est pris en charge pour l'instant.");
    }
    const nombre = Math.min(MAX_CLIPS, Math.max(1, parseInt(args?.nombre, 10) || 3));

    let depart;
    try {
      depart = await pipeline(jeton, { mode: 'shorts_start', url, n_clips: nombre });
    } catch (e) {
      if (e.code === 'upgrade_required') {
        return erreur(`Quota atteint sur le plan gratuit. Pour continuer : ${APP_URL}/paiement.html`);
      }
      if (e.code === 'paiement_en_defaut') return erreur(e.message);
      if (e.code === 'quota_atteint') return erreur(e.message);
      return erreur(`La génération n'a pas pu démarrer : ${e.message}`);
    }

    const id = 'j' + Math.random().toString(36).slice(2, 10);
    await db('mcp_jobs', {
      method: 'POST',
      body: JSON.stringify({
        id, user_id: userId, url, statut: 'en_cours', etape: 'Premier clip en cours de rendu…',
        etat: {
          job_ids: depart.job_ids || [],
          pending_clips: depart.pending_clips || [],
          total_clips: (depart.job_ids?.length || 0) + (depart.pending_clips?.length || 0),
        },
        clips: [],
      }),
      headers: { Prefer: 'return=minimal' },
    });

    const total = (depart.job_ids?.length || 0) + (depart.pending_clips?.length || 0);
    return texte(
      `Génération lancée — ${total} clip${total > 1 ? 's' : ''} en préparation.\n\n` +
      `Identifiant : ${id}\n\n` +
      `Le rendu prend en général 3 à 8 minutes. Appelle \`etat_clips\` avec cet identifiant ` +
      `dans une trentaine de secondes pour suivre l'avancement.`
    );
  }

  /* ── etat_clips ── */
  if (nom === 'etat_clips') {
    const id = String(args?.job_id || '').trim();
    const lignes = await db(`mcp_jobs?id=eq.${encodeURIComponent(id)}&user_id=eq.${userId}&select=*`);
    const job = lignes?.[0];
    if (!job) return erreur(`Aucune génération ne correspond à l'identifiant « ${id} ».`);

    if (job.statut === 'termine') return texte(rendu(job));
    if (job.statut === 'echec') return erreur(`La génération a échoué : ${job.erreur || 'raison inconnue'}`);

    let suite;
    try {
      suite = await pipeline(jeton, {
        mode: 'shorts_status',
        job_ids: job.etat.job_ids,
        pending_clips: job.etat.pending_clips,
        done_clips: job.clips,
        total_clips: job.etat.total_clips,
      });
    } catch (e) {
      await db(`mcp_jobs?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ statut: 'echec', erreur: e.message, updated_at: new Date().toISOString() }),
      });
      return erreur(`La génération a échoué : ${e.message}`);
    }

    const fini = suite.status === 'done';
    const clips = fini ? (suite.clips || []) : (suite.done_clips || job.clips);
    await db(`mcp_jobs?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        statut: fini ? 'termine' : 'en_cours',
        etape: suite.progress || null,
        clips,
        etat: fini ? job.etat : {
          job_ids: suite.job_ids || job.etat.job_ids,
          pending_clips: suite.pending_clips ?? job.etat.pending_clips,
          total_clips: suite.total_clips || job.etat.total_clips,
        },
        updated_at: new Date().toISOString(),
      }),
    });

    if (fini) return texte(rendu({ ...job, clips, statut: 'termine' }));
    return texte(
      `${suite.progress || 'Rendu en cours…'}\n\n` +
      `${clips.length} clip${clips.length > 1 ? 's' : ''} terminé${clips.length > 1 ? 's' : ''} ` +
      `sur ${job.etat.total_clips}. Rappelle \`etat_clips\` dans une trentaine de secondes.`
    );
  }

  /* ── mon_quota ── */
  if (nom === 'mon_quota') {
    const u = await db(`users?id=eq.${userId}&select=plan,videos_count,videos_reset,abonnements(status,past_due_depuis)`);
    const row = u?.[0];
    if (!row) return erreur("Compte introuvable.");
    const QUOTAS = { gratuit: { v: 2, c: 0 }, starter: { v: 5, c: 20 }, pro: { v: 30, c: 150 }, studio: { v: 30, c: 150 } };
    const d = new Date();
    const mois = `${d.getFullYear()}-${d.getMonth()}`;
    const utilise = row.videos_reset === mois ? (row.videos_count || 0) : 0;
    const q = QUOTAS[row.plan] || QUOTAS.gratuit;
    const impaye = (row.abonnements || []).some((a) => a.status === 'past_due' || a.status === 'unpaid');
    return texte(
      `Plan : ${row.plan}\n` +
      `Vidéos analysées ce mois-ci : ${utilise} sur ${q.v}\n` +
      `Clips exportables : ${q.c === 0 ? "aucun (aperçu seul sur le plan gratuit)" : q.c + ' par mois'}` +
      (impaye ? `\n\n⚠️ Un paiement est en défaut sur ce compte — l'accès payant sera suspendu sous 72 h.` : '')
    );
  }

  return erreur(`Outil inconnu : ${nom}`);
}

function rendu(job) {
  if (!job.clips?.length) return "La génération est terminée mais aucun clip n'a pu être produit.";
  const lignes = job.clips.map((c, i) => {
    const t = c.meta?.title || c.title || `Clip ${i + 1}`;
    const d = c.meta?.start != null && c.meta?.end != null
      ? ` (${Math.round(c.meta.end - c.meta.start)} s)` : '';
    return `${i + 1}. **${t}**${d}\n   ${c.download_url}`;
  });
  return (
    `${job.clips.length} clip${job.clips.length > 1 ? 's' : ''} prêt${job.clips.length > 1 ? 's' : ''} :\n\n` +
    lignes.join('\n\n') +
    `\n\nLes liens restent valables 7 jours. Format vertical 1080×1920, sous-titres incrustés.`
  );
}

/* ── Point d'entrée JSON-RPC ── */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  /* Le 401 DOIT porter cet en-tête : c'est lui qui dit à Claude où trouver le
     serveur d'autorisation et donc de lancer la connexion OAuth. Sans lui, le
     connecteur échoue sans jamais proposer de se connecter. */
  const refuser = () => {
    res.setHeader('WWW-Authenticate',
      `Bearer resource_metadata="${APP_URL}/.well-known/oauth-protected-resource"`);
    return res.status(401).json({ error: 'unauthorized' });
  };

  if (req.method === 'GET') return refuser();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const corps = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { id = null, method } = corps;
  const ok = (result) => res.status(200).json({ jsonrpc: '2.0', id, result });
  const ko = (code, message) => res.status(200).json({ jsonrpc: '2.0', id, error: { code, message } });

  // Les notifications n'attendent pas de réponse.
  if (!method || method.startsWith('notifications/')) return res.status(202).end();

  if (method === 'initialize') {
    return ok({
      protocolVersion: PROTOCOLE,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'creatis', title: 'Créatis — clips viraux', version: '1.0.0' },
      instructions:
        "Créatis découpe des vidéos YouTube longues en clips verticaux prêts à publier. " +
        "Le traitement est asynchrone : `creer_clips` lance la génération et rend un identifiant, " +
        "`etat_clips` suit l'avancement et donne les liens de téléchargement. Chaque génération " +
        "consomme le quota mensuel de l'utilisateur — ne jamais relancer sans avoir vérifié l'état.",
    });
  }

  const user = await utilisateurDuJeton(req.headers.authorization);
  if (!user) return refuser();

  if (method === 'tools/list') return ok({ tools: OUTILS });

  if (method === 'tools/call') {
    const jeton = /^Bearer\s+(.+)$/i.exec(req.headers.authorization)[1];
    try {
      return ok(await appelerOutil(corps.params?.name, corps.params?.arguments || {}, jeton, user.id));
    } catch (e) {
      console.error('[mcp]', corps.params?.name, e.message);
      return ok(erreur(`Erreur interne : ${e.message}`));
    }
  }

  return ko(-32601, `Méthode inconnue : ${method}`);
};

module.exports.config = { maxDuration: 60 };
