/* ===== VERCEL FUNCTION — Programme « publie une vidéo, 1 mois offert » =====
   Ajouté le 21/08/2026. Une personne bloquée au paywall peut, au lieu de payer, soumettre le
   lien d'une vidéo (TikTok/Instagram/YouTube) qui parle de Créatis et dépasse 300 vues. Revue
   MANUELLE par un humain (pas de vérification automatique des vues — les plateformes n'exposent
   pas ce chiffre de façon fiable, TikTok et Instagram n'ont pas d'API publique pour ça) via
   admin-ugc-croissance.html.

   GET  /api/ugc-croissance?userId=X                    → mes soumissions (statut de chacune)
   POST /api/ugc-croissance                              → soumettre un lien
   GET  /api/ugc-croissance?admin=1                      → liste pour l'admin (ADMIN_TOKEN)
   POST /api/ugc-croissance?admin=1                      → approuver/rejeter (ADMIN_TOKEN)

   Table : setup/ugc-croissance-schema.sql (à exécuter une fois dans Supabase, voir ce fichier).

   Octroi du mois gratuit : plan='pro', plan_expires_at=+30 jours. Ce champ existe déjà dans
   `users` mais n'était écrit par AUCUN chemin actif du code — un abonnement Stripe réel pose
   toujours plan_expires_at à null (« toujours actif », voir api/stripe-webhook.js) et se
   désactive via l'événement customer.subscription.deleted, pas par une date. Le champ était donc
   mort. Le cron `expirer_plans_temporaires` (api/user-sync.js, ajouté avec cette fonctionnalité)
   le fait enfin vivre : il redescend en 'gratuit' tout compte dont la date est dépassée — sans
   jamais toucher un abonnement Stripe réel, puisque celui-là n'a justement pas de date posée. */

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();

const PLATEFORMES_VALIDES = ['tiktok', 'instagram', 'youtube', 'autre'];
const DUREE_RECOMPENSE_JOURS = 30;
const PLAN_RECOMPENSE = 'pro'; // aligné sur la récompense du palier 5 filleuls (api/parrainage.js)

function detecterPlateforme(url) {
  const u = String(url || '').toLowerCase();
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  return 'autre';
}

async function sb(path, method = 'GET', body) {
  const opts = {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(method !== 'GET' ? { Prefer: 'return=representation' } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, opts);
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`Supabase ${r.status}: ${detail.slice(0, 300)}`);
  }
  return r.status === 204 ? null : r.json();
}

module.exports = async (req, res) => {
  const APP_URL = process.env.APP_URL || 'https://creatis.app';
  res.setHeader('Access-Control-Allow-Origin', APP_URL);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(503).json({ error: 'Supabase non configuré côté serveur' });
  }

  const estAdmin = req.query?.admin === '1';
  if (estAdmin) {
    const adminToken = (process.env.ADMIN_TOKEN || '').trim();
    const auth = (req.headers['authorization'] || '').replace('Bearer ', '');
    if (!adminToken || auth !== adminToken) return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    // ── GET ?admin=1 — liste pour la revue manuelle ────────────────────────
    if (req.method === 'GET' && estAdmin) {
      const statutFiltre = req.query?.statut; // optionnel : en_attente|approuve|rejete
      const filtre = statutFiltre ? `&statut=eq.${encodeURIComponent(statutFiltre)}` : '';
      const lignes = await sb(`/ugc_soumissions?select=*&order=cree_le.desc&limit=500${filtre}`);
      return res.status(200).json({ soumissions: lignes || [] });
    }

    // ── GET ?userId=X — mes propres soumissions (pour afficher leur statut) ─
    if (req.method === 'GET' && !estAdmin) {
      const userId = req.query?.userId;
      if (!userId) return res.status(400).json({ error: 'userId requis' });
      const lignes = await sb(
        `/ugc_soumissions?user_id=eq.${encodeURIComponent(userId)}&select=id,video_url,plateforme,statut,cree_le,traite_le&order=cree_le.desc`
      );
      return res.status(200).json({ soumissions: lignes || [] });
    }

    // ── POST ?admin=1 — décision (approuver/rejeter) ────────────────────────
    if (req.method === 'POST' && estAdmin) {
      const { id, decision, vues_constatees, note } = req.body || {};
      if (!id || !['approuve', 'rejete'].includes(decision)) {
        return res.status(400).json({ error: 'id et decision (approuve|rejete) requis' });
      }
      const [soumission] = await sb(`/ugc_soumissions?id=eq.${encodeURIComponent(id)}&select=*`) || [];
      if (!soumission) return res.status(404).json({ error: 'Soumission introuvable' });
      if (soumission.statut !== 'en_attente') {
        return res.status(409).json({ error: `Déjà traitée (${soumission.statut})` });
      }

      await sb(`/ugc_soumissions?id=eq.${encodeURIComponent(id)}`, 'PATCH', {
        statut: decision,
        vues_constatees: vues_constatees != null ? Number(vues_constatees) : null,
        note_admin: note || null,
        traite_le: new Date().toISOString(),
      });

      if (decision === 'approuve') {
        if (soumission.user_id) {
          const expire = new Date(Date.now() + DUREE_RECOMPENSE_JOURS * 86400000).toISOString();
          // On ne touche QUE plan + plan_expires_at — jamais stripe_customer_id ni
          // stripe_subscription_id, pour ne rien casser si la personne a par ailleurs un vrai
          // abonnement en cours (le webhook Stripe reste seul maître de ces deux champs-là).
          await sb(`/users?id=eq.${encodeURIComponent(soumission.user_id)}`, 'PATCH', {
            plan: PLAN_RECOMPENSE,
            plan_expires_at: expire,
            updated_at: new Date().toISOString(),
          });
        }
        // Le formulaire de soumission promet explicitement « tu recevras un email » — tenir
        // cette promesse ici. Non bloquant : une clé Brevo absente ou une panne d'envoi ne doit
        // jamais faire échouer l'approbation, le mois gratuit est déjà posé au moment où ce
        // bloc s'exécute.
        const BREVO_KEY = (process.env.BREVO_API_KEY || '').trim();
        if (BREVO_KEY) {
          fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY },
            body: JSON.stringify({
              sender: { name: 'Créatis', email: 'contact@creatis.app' },
              to: [{ email: soumission.email }],
              subject: 'Ta vidéo est validée — 1 mois Pro offert 🎬',
              htmlContent: `<div style="font-family:sans-serif;max-width:600px;margin:auto;color:#111;padding:24px"><h2 style="font-size:20px;margin:0 0 16px">Bien joué !</h2><p style="line-height:1.7;margin:0 0 16px">Ta vidéo a été validée — ton compte Créatis passe en <strong>Pro pendant un mois</strong>, sans rien payer.</p><p style="line-height:1.7;margin:0 0 20px">Tu as accès à 150 clips par mois et tous les outils IA jusqu'au <strong>${new Date(Date.now() + DUREE_RECOMPENSE_JOURS * 86400000).toLocaleDateString('fr-FR')}</strong>.</p><a href="https://creatis.app/studio" style="display:inline-block;background:#10b981;color:#04120b;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:800;font-size:15px;margin:0 0 24px">Aller sur mes clips →</a><p style="color:#999;font-size:12px;margin:0">Créatis · <a href="https://creatis.app" style="color:#999">creatis.app</a></p></div>`,
            }),
          }).catch(e => console.error('[ugc-croissance] email approbation échoué:', e.message));
        }
      }

      return res.status(200).json({ ok: true });
    }

    // ── POST — soumission d'un lien par l'utilisateur ───────────────────────
    if (req.method === 'POST' && !estAdmin) {
      const { userId, email, videoUrl } = req.body || {};
      const url = String(videoUrl || '').trim();
      if (!email || !url) return res.status(400).json({ error: 'email et videoUrl requis' });
      if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'Lien invalide — colle l\'URL complète (https://...)' });

      const plateforme = detecterPlateforme(url);
      if (!PLATEFORMES_VALIDES.includes(plateforme)) {
        return res.status(400).json({ error: 'Plateforme non reconnue' });
      }

      try {
        const [ligne] = await sb('/ugc_soumissions', 'POST', {
          user_id: userId || null,
          email: String(email).toLowerCase().trim(),
          video_url: url,
          plateforme,
        }) || [];
        return res.status(200).json({ ok: true, soumission: ligne });
      } catch (e) {
        // Contrainte UNIQUE(video_url) : message clair plutôt que l'erreur Postgres brute.
        if (/duplicate key|unique constraint/i.test(e.message)) {
          return res.status(409).json({ error: 'Ce lien a déjà été soumis.' });
        }
        throw e;
      }
    }

    return res.status(405).json({ error: 'Méthode non supportée' });
  } catch (e) {
    console.error('[ugc-croissance] erreur:', e.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
