/* ===== VERCEL FUNCTION — Sync utilisateur Supabase ===== */
/* POST /api/user-sync
   Body: { userId, email, plan, chaine, action }
   Actions: 'get', 'upsert', 'increment_generation', 'track_event'
   Accès Supabase sécurisé côté serveur (service key jamais exposée) */

const crypto = require('crypto');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
const META_PIXEL_ID = (process.env.META_PIXEL_ID || '953153460847578').trim();
const META_CAPI_TOKEN = (process.env.META_ACCESS_TOKEN || process.env.META_CAPI_TOKEN || '').trim();

/* ── Programme « publie une video, 1 mois offert » ──────────────────────────
   Fusionne ici plutot que dans un fichier api/ dedie : Vercel Hobby plafonne a 12 Fonctions
   Serverless (un fichier = une fonction) et le projet en avait deja 12 — un 13e fichier fait
   echouer le deploiement en silence (le build reussit, seule l'etape "Deploying outputs" tombe
   en erreur, sans message exploitable). Constate le 21/08/2026 en deployant ugc-croissance.js
   seul. user-sync.js multiplexe deja des dizaines d'actions par un seul fichier, c'est le patron
   du projet pour ce cas exact. */
const UGC_PLATEFORMES_VALIDES = ['tiktok', 'instagram', 'youtube', 'autre'];
// La duree d'essai et le plan recompense vivent desormais dans api/create-checkout-session.js,
// seul endroit qui accorde vraiment le mois offert (via un essai Stripe, carte requise).

function ugcDetecterPlateforme(url) {
  const u = String(url || '').toLowerCase();
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  return 'autre';
}

/* Envoi d'email ATTENDU, mais jamais fatal.
   Sur Vercel, l'invocation est gelee des que la reponse HTTP part : un `fetch(...)` lance sans
   `await` est tue en vol et l'email ne part JAMAIS. C'est ce qui rendait la notification de
   soumission silencieuse alors que la cle Brevo fonctionne (verifie : envoi direct -> HTTP 201).
   On attend donc l'envoi avant de repondre — quelques centaines de millisecondes — mais on
   avale toute erreur : l'action metier (soumission enregistree, decision prise) est deja
   accomplie a ce stade et ne doit pas echouer parce qu'un email n'est pas parti. */
async function ugcEnvoyerEmail(payload, contexte) {
  const cle = (process.env.BREVO_API_KEY || '').trim();
  if (!cle) { console.warn(`[${contexte}] BREVO_API_KEY absente — email non envoyé`); return false; }
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': cle },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      console.error(`[${contexte}] Brevo ${r.status}: ${(await r.text().catch(() => '')).slice(0, 200)}`);
      return false;
    }
    console.log(`[${contexte}] email envoyé à ${payload.to?.[0]?.email}`);
    return true;
  } catch (e) {
    console.error(`[${contexte}] envoi échoué: ${e.message}`);
    return false;
  }
}

function ugcVerifierAdmin(req) {
  const adminToken = (process.env.ADMIN_TOKEN || '').trim();
  const auth = (req.headers['authorization'] || '').replace('Bearer ', '');
  return !!adminToken && auth === adminToken;
}

async function envoyerEmailBienvenue(email) {
  if (!process.env.BREVO_API_KEY) {
    console.warn('[Email] BREVO_API_KEY manquante — bienvenue non envoyé à', email);
    return;
  }
  // Ajout contact Brevo (non bloquant — échec ignoré)
  fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': (process.env.BREVO_API_KEY || '').trim() },
    body: JSON.stringify({ email, attributes: { PLAN: 'gratuit' }, listIds: [3], updateEnabled: true })
  }).catch(e => console.warn('[Email] Ajout contact Brevo échoué:', e.message));

  // Envoi email de bienvenue
  try {
    const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': (process.env.BREVO_API_KEY || '').trim() },
      body: JSON.stringify({
        sender: { email: 'contact@creatis.app', name: 'Créatis' },
        to: [{ email }],
        subject: 'Ton 1er clip viral t\'attend (ça prend 30 secondes)',
        htmlContent: `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0a0f0a;color:#e5e7eb;padding:40px 32px;border-radius:12px;">
<div style="font-size:26px;font-weight:900;color:#fff;margin-bottom:32px;">Creatis<span style="color:#10b981;">.</span></div>

<h1 style="font-size:20px;font-weight:800;color:#fff;margin:0 0 16px;line-height:1.3;">Un créateur manga a généré 532€<br>avec un seul clip court.</h1>

<p style="color:#9ca3af;line-height:1.7;margin:0 0 24px;font-size:15px;">Il a uploadé sa vidéo YouTube sur Créatis. L'IA a trouvé le meilleur moment, coupé en 9:16, ajouté les sous-titres. 30 secondes de travail.</p>

<div style="background:#0d1f14;border:1px solid rgba(16,185,129,0.25);border-radius:10px;padding:20px;margin-bottom:28px;">
  <p style="color:#10b981;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 12px;">Ton analyse gratuite — 3 étapes</p>
  <p style="color:#d1d5db;font-size:14px;margin:0 0 8px;line-height:1.6;">① Va sur <strong style="color:#fff;">creatis.app</strong> → Clips Viraux</p>
  <p style="color:#d1d5db;font-size:14px;margin:0 0 8px;line-height:1.6;">② Uploade n'importe quelle vidéo YouTube (même une vieille)</p>
  <p style="color:#d1d5db;font-size:14px;margin:0;line-height:1.6;">③ Reçois tes clips en 30 secondes</p>
</div>

<a href="https://creatis.app/generateur-clips-viraux.html" style="display:block;background:#10b981;color:#000;font-weight:800;font-size:16px;padding:16px 28px;border-radius:10px;text-decoration:none;text-align:center;margin-bottom:24px;">Générer mes clips maintenant →</a>

<p style="color:#4b5563;font-size:13px;line-height:1.6;margin:0 0 8px;">Gratuit · Sans carte bancaire · Analyse et aperçu offerts</p>
<p style="color:#374151;font-size:12px;margin:0;">Questions ? <a href="mailto:contact@creatis.app" style="color:#10b981;text-decoration:none;">contact@creatis.app</a></p>
</div>`
      })
    });
    const emailData = await emailRes.json().catch(() => ({}));
    if (!emailRes.ok) {
      console.error('[Email] Brevo SMTP erreur', emailRes.status, 'pour', email, ':', JSON.stringify(emailData));
      return null;
    }
    console.log('[Email] Bienvenue envoyé à', email, '— messageId:', emailData.messageId);
    return emailData.messageId;
  } catch (e) {
    console.error('[Email] Bienvenue exception pour', email, ':', e.message);
    return null;
  }
}

/* Compte les événements PostHog d'une journée. Les affichages de paywall et les clics « Passer au
   Pro » n'existent QUE dans PostHog — Supabase ne les voit pas. Sans clé configurée, on renvoie
   null et le rapport affiche « — » plutôt que de mentir avec des zéros.
   Nécessite POSTHOG_API_KEY (clé personnelle, lecture seule suffit) et POSTHOG_PROJECT_ID. */
async function statsPostHog(debutISO, finISO) {
  const cle = (process.env.POSTHOG_API_KEY || '').trim();
  const projet = (process.env.POSTHOG_PROJECT_ID || '').trim();
  const hote = (process.env.POSTHOG_HOST || 'https://eu.posthog.com').trim();
  if (!cle || !projet) return null;
  try {
    const sql = `
      SELECT event, count() AS n, count(DISTINCT person_id) AS pers
      FROM events
      WHERE timestamp >= '${debutISO}' AND timestamp <= '${finISO}'
        AND event IN ('paywall_shown','upgrade_clicked','clips_generated','generation_failed',
                      'export_clicked','download_completed','free_credit_refunded','paiement_erreur')
      GROUP BY event`;
    const r = await fetch(`${hote}/api/projects/${projet}/query/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query: sql } }),
      signal: AbortSignal.timeout(20000)
    });
    if (!r.ok) { console.warn('[DailyReport] PostHog', r.status); return null; }
    const d = await r.json();
    const out = {};
    for (const [event, n, pers] of (d.results || [])) out[event] = { n, pers };
    return out;
  } catch (e) {
    console.warn('[DailyReport] PostHog indisponible:', e.message);
    return null;
  }
}

async function supabase(path, method, body) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase non configuré');
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': method === 'POST' ? (path.includes('on_conflict') ? 'resolution=merge-duplicates,return=representation' : 'return=representation') : 'return=minimal'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Supabase ${res.status}`);
  }
  return res.status !== 204 ? await res.json() : null;
}

module.exports = async (req, res) => {
  /* Stripe refuse un return_url sans schéma et répond « Not a valid URL ». Une APP_URL
     renseignée « creatis.app » au lieu de « https://creatis.app » suffisait donc à bloquer la
     RÉSILIATION : le client voyait une erreur rouge et ne pouvait pas partir — c'est
     exactement ce qui finit en opposition bancaire, et c'est interdit par la loi française.
     On normalise plutôt que de faire confiance à une variable d'environnement. */
  const appUrl = (() => {
    const brut = String(process.env.APP_URL || '').trim().replace(/\/+$/, '');
    if (!brut) return 'https://creatis.app';
    const avecSchema = /^https?:\/\//i.test(brut) ? brut : `https://${brut}`;
    try { new URL(avecSchema); return avecSchema; } catch { return 'https://creatis.app'; }
  })();
  res.setHeader('Access-Control-Allow-Origin', appUrl);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Crons Vercel envoient GET — autoriser GET pour les actions cron
  const actionFromQuery = req.query?.action || req.url?.split('action=')[1]?.split('&')[0];
  if (req.method === 'GET' && ['email_cron', 'daily_report', 'expirer_plans_temporaires'].includes(actionFromQuery)) {
    req.body = { action: actionFromQuery };
  } else if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { userId, email, plan, chaine, action, metadata, source } = req.body || {};

  const isCronAction = action === 'email_cron' || action === 'daily_report' || action === 'expirer_plans_temporaires';
  // `portail_abonnement` s'identifie par le JWT Supabase, pas par un userId de corps de requête —
  // il ne doit donc pas être recalé par ce contrôle.
  const sansIdentifiantCorps = isCronAction || action === 'portail_abonnement' || action === 'retention_appliquer'
    || action === 'ugc_soumettre' || action === 'ugc_lister' || action === 'ugc_decider';
  if (!sansIdentifiantCorps && !userId && !email) return res.status(400).json({ error: 'userId ou email requis' });

  try {
    switch (action) {

      // ── Soumission publique : lien de la video ──────────────────────────────
      case 'ugc_soumettre': {
        const url = String(req.body?.videoUrl || '').trim();
        const mail = String(req.body?.email || '').trim();
        if (!mail || !url) return res.status(400).json({ error: 'email et videoUrl requis' });
        if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: "Lien invalide — colle l'URL complète (https://...)" });
        const plateforme = ugcDetecterPlateforme(url);
        if (!UGC_PLATEFORMES_VALIDES.includes(plateforme)) return res.status(400).json({ error: 'Plateforme non reconnue' });
        try {
          const [ligne] = await supabase('/ugc_soumissions', 'POST', {
            user_id: req.body?.userId || null,
            email: mail.toLowerCase(),
            video_url: url,
            plateforme,
          }) || [];
          /* Notification a l'equipe. Le panneau admin oblige a PENSER a aller voir ; un mail
             arrive tout seul et porte le lien cliquable, donc la video se regarde tout de
             suite. Non bloquant : la soumission est deja enregistree a ce stade, un echec
             d'envoi ne doit surtout pas la faire echouer cote utilisateur. */
          {
            const _labels = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', autre: 'Autre' };
            await ugcEnvoyerEmail({
                sender: { email: 'contact@creatis.app', name: 'Créatis' },
                // `replyTo` sur l'auteur : repondre au mail lui ecrit directement, sans copier
                // son adresse a la main (pour demander une precision, un autre lien, etc.).
                replyTo: { email: mail.toLowerCase() },
                to: [{ email: 'contact@creatis.app' }],
                subject: `🎬 Vidéo à vérifier (${_labels[plateforme] || plateforme}) — ${mail.toLowerCase()}`,
                htmlContent: `<div style="font-family:sans-serif;max-width:600px;margin:auto;color:#111;padding:24px">`
                  + `<h2 style="font-size:19px;margin:0 0 6px">Nouvelle vidéo soumise</h2>`
                  + `<p style="color:#666;font-size:14px;margin:0 0 20px">Programme « publie une vidéo, 1 mois offert »</p>`
                  + `<div style="background:#f6f6f6;border-radius:10px;padding:16px 18px;margin:0 0 20px;line-height:1.8;font-size:14px">`
                  + `<strong>Créateur :</strong> ${mail.toLowerCase()}<br>`
                  + `<strong>Plateforme :</strong> ${_labels[plateforme] || plateforme}<br>`
                  + `<strong>Compte lié :</strong> ${req.body?.userId ? 'oui' : '— aucun (à vérifier)'}`
                  + `</div>`
                  + `<a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:13px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:0 0 12px">▶ Regarder la vidéo</a><br>`
                  + `<a href="https://creatis.app/admin-ugc-croissance.html" style="display:inline-block;background:#10b981;color:#04120b;padding:13px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:0 0 20px">✅ Approuver ou rejeter</a>`
                  + `<p style="color:#999;font-size:12px;margin:0;word-break:break-all">Lien brut : ${url}</p>`
                  + `</div>`,
            }, 'ugc_soumettre');
          }
          return res.status(200).json({ ok: true, soumission: ligne });
        } catch (e) {
          if (/duplicate key|unique constraint/i.test(e.message)) {
            return res.status(409).json({ error: 'Ce lien a déjà été soumis.' });
          }
          throw e;
        }
      }

      /* Historique personnel. Distinct de `ugc_lister` (admin) : filtre sur le userId du corps
         et ne renvoie que les colonnes utiles a l'interesse — jamais essai_token, qui vaut un
         mois gratuit et n'a rien a faire dans une reponse lisible depuis le navigateur. */
      case 'ugc_mes_soumissions': {
        if (!userId) return res.status(400).json({ error: 'userId requis' });
        const lignes = await supabase(
          `/ugc_soumissions?user_id=eq.${encodeURIComponent(userId)}&select=id,video_url,plateforme,statut,note_admin,cree_le,traite_le&order=cree_le.desc`,
          'GET'
        );
        return res.status(200).json({ soumissions: lignes || [] });
      }

      // ── Liste admin (revue manuelle) ─────────────────────────────────────────
      case 'ugc_lister': {
        if (!ugcVerifierAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
        const statutFiltre = req.body?.statut;
        const filtre = statutFiltre ? `&statut=eq.${encodeURIComponent(statutFiltre)}` : '';
        const lignes = await supabase(`/ugc_soumissions?select=*&order=cree_le.desc&limit=500${filtre}`, 'GET');
        return res.status(200).json({ soumissions: lignes || [] });
      }

      // ── Décision admin (approuver/rejeter) ───────────────────────────────────
      case 'ugc_decider': {
        if (!ugcVerifierAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
        const { id, decision, vues_constatees, note } = req.body || {};
        if (!id || !['approuve', 'rejete'].includes(decision)) {
          return res.status(400).json({ error: 'id et decision (approuve|rejete) requis' });
        }
        const [soumission] = await supabase(`/ugc_soumissions?id=eq.${encodeURIComponent(id)}&select=*`, 'GET') || [];
        if (!soumission) return res.status(404).json({ error: 'Soumission introuvable' });
        if (soumission.statut !== 'en_attente') return res.status(409).json({ error: `Déjà traitée (${soumission.statut})` });

        await supabase(`/ugc_soumissions?id=eq.${encodeURIComponent(id)}`, 'PATCH', {
          statut: decision,
          vues_constatees: vues_constatees != null ? Number(vues_constatees) : null,
          note_admin: note || null,
          traite_le: new Date().toISOString(),
        });

        if (decision === 'approuve') {
          /* Le mois offert n'est PAS accordé ici en direct : la carte est requise pour que le
             2e mois se prélève tout seul, donc l'approbation ne fait qu'envoyer un lien de
             paiement en mode essai (voir api/create-checkout-session.js, paramètre essaiToken).
             `essai_token` existe déjà sur la ligne depuis la soumission — un jeton à part de
             `id`, pour qu'il ne soit pas devinable ni exposé ailleurs dans l'admin. */
          {
            const lienEssai = `https://creatis.app/paiement.html?plan=pro&essai=${soumission.essai_token}`;
            await ugcEnvoyerEmail({
                sender: { name: 'Créatis', email: 'contact@creatis.app' },
                to: [{ email: soumission.email }],
                subject: 'Ta vidéo est validée — active ton mois Pro offert 🎬',
                htmlContent: `<div style="font-family:sans-serif;max-width:600px;margin:auto;color:#111;padding:24px"><h2 style="font-size:20px;margin:0 0 16px">Bien joué !</h2><p style="line-height:1.7;margin:0 0 16px">Ta vidéo a été validée. Il reste une étape pour activer ton <strong>mois Pro offert</strong> : renseigne une carte (aucun prélèvement maintenant).</p><a href="${lienEssai}" style="display:inline-block;background:#10b981;color:#04120b;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:800;font-size:15px;margin:0 0 20px">Activer mon mois offert →</a><p style="line-height:1.7;margin:0 0 8px;color:#444;font-size:14px">Le mois est à 0€. Passé ce délai, l'abonnement Pro continue automatiquement à 14€/mois — résiliable à tout moment avant, sans rien devoir.</p><p style="color:#999;font-size:12px;margin:16px 0 0">Ce lien est personnel, ne le partage pas. Créatis · <a href="https://creatis.app" style="color:#999">creatis.app</a></p></div>`,
            }, 'ugc_decider/approbation');
          }
        }

        /* Un rejet ne prevenait PERSONNE : la personne restait en attente indefiniment, sans
           savoir si sa demande avait ete vue, et renvoyait le meme lien. Dire non clairement,
           avec le motif, vaut mieux qu'un silence — et lui laisse une chance de refaire une
           video conforme plutot que d'abandonner. */
        if (decision === 'rejete') {
          const motif = (note || '').trim();
          await ugcEnvoyerEmail({
              sender: { name: 'Créatis', email: 'contact@creatis.app' },
              replyTo: { email: 'contact@creatis.app' },
              to: [{ email: soumission.email }],
              subject: "Ta vidéo n'a pas été retenue",
              htmlContent: `<div style="font-family:sans-serif;max-width:600px;margin:auto;color:#111;padding:24px">`
                + `<h2 style="font-size:19px;margin:0 0 14px">Ta vidéo n'a pas été retenue</h2>`
                + (motif
                    ? `<div style="background:#f6f6f6;border-left:3px solid #999;border-radius:6px;padding:14px 16px;margin:0 0 18px;font-size:14px;line-height:1.6"><strong>Motif :</strong> ${motif}</div>`
                    : '')
                + `<p style="line-height:1.7;margin:0 0 16px;font-size:14px">Pour rappel, pour obtenir le mois offert la vidéo doit être <strong>la tienne</strong>, <strong>présenter Créatis</strong> (démo, avis, avant/après) et dépasser <strong>300 vues</strong>. Une vidéo qui ne parle pas de l'outil, ou qui appartient à quelqu'un d'autre, ne peut pas être acceptée.</p>`
                + `<p style="line-height:1.7;margin:0 0 20px;font-size:14px">Tu peux retenter autant de fois que tu veux avec une nouvelle vidéo.</p>`
                + `<a href="https://creatis.app/offre-createur" style="display:inline-block;background:#10b981;color:#04120b;padding:13px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:0 0 20px">Revoir les conditions →</a>`
                + `<p style="color:#999;font-size:12px;margin:0">Une question ? Réponds à cet email. Créatis · creatis.app</p>`
                + `</div>`,
          }, 'ugc_decider/rejet');
        }

        return res.status(200).json({ ok: true });
      }

      case 'get': {
        const identifier = userId ? `id=eq.${userId}` : `email=eq.${encodeURIComponent(email)}`;
        const users = await supabase(`/users?${identifier}&select=*`, 'GET');
        return res.status(200).json({ user: users?.[0] || null });
      }

      case 'upsert': {
        // Vérifier si l'utilisateur existe déjà avant l'upsert
        const existingUsers = await supabase(`/users?email=eq.${encodeURIComponent(email)}&select=id,plan`, 'GET').catch(() => []);
        const isNewUser = !existingUsers?.length;
        const existingPlan = existingUsers?.[0]?.plan;

        // Ne jamais rétrograder un plan payant vers gratuit
        const planToSave = (existingPlan && existingPlan !== 'gratuit') ? existingPlan : (plan || 'gratuit');

        const userData = {
          ...(userId && { id: userId }),
          email,
          plan: planToSave,
          chaine_nom: chaine?.nom || null,
          chaine_abonnes: chaine?.abonnes || 0,
          chaine_id: chaine?.id || null,
          updated_at: new Date().toISOString(),
          // Uniquement à la création : ne jamais écraser la vraie source d'un compte existant
          // (upsert est aussi appelé à chaque connexion, pas seulement au signup)
          ...(isNewUser && source && { source })
        };
        const result = await supabase('/users?on_conflict=email', 'POST', userData);

        // Email de bienvenue uniquement pour les nouveaux inscrits
        if (isNewUser && email) {
          await envoyerEmailBienvenue(email);
        }

        return res.status(200).json({ user: Array.isArray(result) ? result[0] : result });
      }

      case 'increment_generation': {
        if (!userId && !email) return res.status(400).json({ error: 'userId requis' });
        const identifier = userId ? `id=eq.${userId}` : `email=eq.${encodeURIComponent(email)}`;

        // Récupérer l'utilisateur
        const users = await supabase(`/users?${identifier}&select=id,plan,generations_count,generations_used,generations_reset_at`, 'GET');
        const user = users?.[0];
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        // Compteur mensuel (reset si nouveau mois)
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const resetAt = user.generations_reset_at ? new Date(user.generations_reset_at) : null;
        const resetMonth = resetAt ? `${resetAt.getFullYear()}-${String(resetAt.getMonth() + 1).padStart(2, '0')}` : null;
        const usedThisMonth = resetMonth === monthKey ? (user.generations_used || 0) : 0;
        const newUsed = usedThisMonth + 1;

        const newCount = (user.generations_count || 0) + 1;
        await supabase(`/users?${identifier}`, 'PATCH', {
          generations_count: newCount,
          generations_used: newUsed,
          generations_reset_at: resetMonth === monthKey ? user.generations_reset_at : now.toISOString(),
          last_generation_at: now.toISOString()
        });

        // Enregistrer dans la table generations
        if (metadata) {
          await supabase('/generations', 'POST', {
            user_id: user.id,
            agent_id: metadata.agentId || 'unknown',
            agent_nom: metadata.agentNom || '',
            sujet: (metadata.sujet || '—').substring(0, 120),
            plan: user.plan,
            created_at: new Date().toISOString()
          }).catch(() => {});
        }

        return res.status(200).json({ count: newCount, used_this_month: newUsed });
      }

      case 'get_history': {
        if (!userId && !email) return res.status(400).json({ error: 'userId requis' });
        const identifier = userId ? `id=eq.${userId}` : `email=eq.${encodeURIComponent(email)}`;
        const users = await supabase(`/users?${identifier}&select=id`, 'GET');
        const user = users?.[0];
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        const history = await supabase(
          `/generations?user_id=eq.${user.id}&order=created_at.desc&limit=20&select=agent_id,agent_nom,sujet,created_at`,
          'GET'
        ).catch(() => []);

        return res.status(200).json({ history: history || [] });
      }

      case 'upgrade_plan': {
        const identifier = userId ? `id=eq.${userId}` : `email=eq.${encodeURIComponent(email)}`;
        await supabase(`/users?${identifier}`, 'PATCH', {
          plan,
          stripe_customer_id: metadata?.stripeCustomerId || null,
          stripe_subscription_id: metadata?.stripeSubscriptionId || null,
          plan_expires_at: metadata?.periodEnd || null,
          updated_at: new Date().toISOString()
        });
        return res.status(200).json({ success: true });
      }

      case 'increment_miniature': {
        const identifier = userId ? `id=eq.${userId}` : `email=eq.${encodeURIComponent(email)}`;
        const users = await supabase(`/users?${identifier}&select=plan,miniatures_used,miniatures_reset_at`, 'GET');
        const user = users?.[0];
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const resetAt = user.miniatures_reset_at ? new Date(user.miniatures_reset_at) : null;
        const resetMonth = resetAt ? `${resetAt.getFullYear()}-${String(resetAt.getMonth() + 1).padStart(2, '0')}` : null;
        const used = resetMonth === monthKey ? (user.miniatures_used || 0) : 0;
        await supabase(`/users?${identifier}`, 'PATCH', {
          miniatures_used: used + 1,
          miniatures_reset_at: resetMonth === monthKey ? user.miniatures_reset_at : now.toISOString()
        });
        return res.status(200).json({ used: used + 1 });
      }

      case 'reset_miniatures': {
        // Appelé chaque début de mois via cron
        await supabase('/users?miniatures_used=gte.1', 'PATCH', {
          miniatures_used: 0,
          miniatures_reset_at: new Date().toISOString()
        });
        return res.status(200).json({ success: true });
      }

      case 'track_event': {
        // Meta CAPI — CompleteRegistration avec SHA256 email, déduplication via eventId
        if (!META_PIXEL_ID || !META_CAPI_TOKEN) {
          console.warn('[CAPI] META_PIXEL_ID ou META_CAPI_TOKEN non configurés — event ignoré');
          return res.status(200).json({ skipped: true });
        }
        const { eventName = 'CompleteRegistration', eventId, eventSourceUrl } = req.body;
        if (!email) return res.status(400).json({ error: 'email requis' });
        const emailHash = crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
        const capiPayload = {
          data: [{
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventId || ('capi_' + Date.now()),
            event_source_url: eventSourceUrl || 'https://creatis.app/auth.html',
            action_source: 'website',
            user_data: { em: [emailHash] }
          }]
        };
        const capiRes = await fetch(
          `https://graph.facebook.com/v18.0/${META_PIXEL_ID}/events?access_token=${META_CAPI_TOKEN}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(capiPayload) }
        );
        const capiData = await capiRes.json().catch(() => ({}));
        if (!capiRes.ok) {
          console.error('[CAPI] Erreur Meta:', JSON.stringify(capiData));
          return res.status(200).json({ error: capiData.error?.message });
        }
        console.log('[CAPI]', eventName, 'envoyé — received:', capiData.events_received);
        return res.status(200).json({ success: true, events_received: capiData.events_received });
      }

      case 'update_profile': {
        const { niche, plateformes } = req.body;
        if (!userId && !email) return res.status(400).json({ error: 'userId requis' });
        const identifier = userId ? `id=eq.${userId}` : `email=eq.${encodeURIComponent(email)}`;
        try {
          await supabase(`/users?${identifier}`, 'PATCH', {
            ...(niche !== undefined && { niche }),
            ...(plateformes !== undefined && { plateformes: Array.isArray(plateformes) ? plateformes.join(',') : plateformes }),
            updated_at: new Date().toISOString()
          });
        } catch (e) {
          // Colonnes peut-être absentes en DB — silencieux
          console.warn('[update_profile] PATCH échoué (colonnes manquantes ?):', e.message);
        }
        return res.status(200).json({ success: true });
      }

      case 'email_cron': {
        // Cron serveur-side : envoie J2/J5/J10/J14 aux utilisateurs gratuits
        const authHeader = req.headers['authorization'] || '';
        const cronSecret = req.headers['x-cron-secret'] || req.query?.secret || authHeader.replace('Bearer ', '');
        if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
          return res.status(401).json({ error: 'Non autorisé' });
        }
        const BREVO_KEY = (process.env.BREVO_API_KEY || '').trim();
        if (!BREVO_KEY) return res.status(200).json({ ok: true, sent: 0, note: 'BREVO_API_KEY manquante' });

        const origin = 'https://creatis.app';
        const now = new Date();
        let totalSent = 0;
        const cronLog = [];

        const EMAIL_SEQS = [
          { key: 'j1', days: 1, subject: 'Ton clip viral t\'attend — 2 minutes suffisent',
            body: n => `<div style="font-family:sans-serif;max-width:600px;margin:auto;color:#111;padding:24px"><h2 style="font-size:22px;margin:0 0 16px">Salut ${n} 👋</h2><p style="line-height:1.7;margin:0 0 16px">Tu t'es inscrit sur Créatis hier mais tu n'as pas encore créé ton premier clip viral.</p><p style="line-height:1.7;margin:0 0 20px">C'est simple : <strong>uploade une vidéo YouTube</strong>, l'IA détecte les 10 meilleurs moments et les coupe en Shorts 9:16 prêts à poster sur TikTok, Instagram et YouTube.</p><div style="background:#f9f9f9;border-radius:10px;padding:20px;margin:0 0 24px"><p style="margin:0 0 10px;font-weight:700;font-size:15px">Ce que tu obtiens en 2 minutes :</p><p style="margin:0;line-height:2;color:#333">✂️ Clips découpés automatiquement<br>📝 Sous-titres brûlés dans la vidéo<br>🎯 Hooks percutants générés par IA<br>📐 Format 9:16 prêt à publier</p></div><a href="${origin}/app" style="display:inline-block;background:#000;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:0 0 24px">Créer mes clips maintenant →</a><p style="color:#999;font-size:12px;margin:0">Créatis · <a href="https://creatis.app" style="color:#999">creatis.app</a></p></div>` },
          { key: 'j3', days: 3, subject: 'Comment transformer 1 vidéo en 10 clips viraux',
            body: n => `<div style="font-family:sans-serif;max-width:600px;margin:auto;color:#111;padding:24px"><h2 style="font-size:20px;margin:0 0 16px">Salut ${n},</h2><p style="line-height:1.7;margin:0 0 16px">Une vidéo YouTube de 10 minutes = 10 clips TikTok potentiels. La plupart des créateurs ne le font pas parce que ça prend des heures à la main.</p><p style="line-height:1.7;margin:0 0 20px">Créatis le fait en 2 minutes. L'IA analyse ta vidéo, identifie les moments les plus forts, les coupe et ajoute les sous-titres automatiquement.</p><div style="background:#f9f9f9;border-radius:10px;padding:20px;margin:0 0 24px;border-left:4px solid #000"><p style="margin:0;font-style:italic;line-height:1.7;color:#333">"Une seule vidéo = un mois de contenu court format. C'est exactement ce que fait Créatis."</p></div><a href="${origin}/app" style="display:inline-block;background:#000;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:0 0 24px">Essayer gratuitement →</a><p style="color:#999;font-size:12px;margin:0">Créatis · <a href="https://creatis.app" style="color:#999">creatis.app</a></p></div>` },
          { key: 'j7', days: 7, subject: 'Tu n\'as pas encore essayé — je t\'offre un accès guidé',
            body: n => `<div style="font-family:sans-serif;max-width:600px;margin:auto;color:#111;padding:24px"><h2 style="font-size:20px;margin:0 0 16px">Salut ${n},</h2><p style="line-height:1.7;margin:0 0 16px">Ça fait une semaine que tu es inscrit sur Créatis. Si tu n'as pas encore testé, c'est peut-être qu'il manque quelque chose.</p><p style="line-height:1.7;margin:0 0 20px">Dis-moi si je peux t'aider — réponds directement à cet email. En attendant, voici les 3 étapes pour créer ton premier clip :</p><div style="margin:0 0 24px"><div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px"><div style="background:#000;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;font-size:13px">1</div><p style="margin:0;line-height:1.6"><strong>Upload ta vidéo</strong> — depuis ton ordinateur ou colle une URL YouTube</p></div><div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px"><div style="background:#000;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;font-size:13px">2</div><p style="margin:0;line-height:1.6"><strong>L'IA analyse</strong> — 2 minutes, elle détecte les 10 meilleurs moments</p></div><div style="display:flex;align-items:flex-start;gap:12px"><div style="background:#000;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;font-size:13px">3</div><p style="margin:0;line-height:1.6"><strong>Télécharge tes clips</strong> — sous-titres inclus, format 9:16 prêt à poster</p></div></div><a href="${origin}/app" style="display:inline-block;background:#000;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:0 0 24px">Commencer maintenant →</a><p style="color:#999;font-size:12px;margin:0">Créatis · <a href="https://creatis.app" style="color:#999">creatis.app</a></p></div>` },
          { key: 'j14', days: 14, subject: '-50% le 1er mois — offre de lancement',
            body: n => `<div style="font-family:sans-serif;max-width:600px;margin:auto;color:#111;padding:24px"><h2 style="font-size:20px;margin:0 0 16px">Salut ${n},</h2><p style="line-height:1.7;margin:0 0 16px">Tu fais partie des premiers utilisateurs de Créatis. En tant qu'early adopter, je te réserve une offre spéciale.</p><div style="background:#f9f9f9;border-radius:10px;padding:24px;margin:0 0 24px;text-align:center"><p style="font-size:28px;font-weight:900;margin:0 0 8px">-50% le 1er mois</p><p style="color:#666;margin:0 0 16px;font-size:15px">Créatis Pro à 9,95€ au lieu de 19,90€</p><p style="margin:0;line-height:2;color:#333;font-size:14px">✂️ Clips viraux illimités · 📝 Sous-titres automatiques<br>🎯 Hooks IA · 🎬 Scripts YouTube · 🖼️ Miniatures</p></div><a href="${origin}/app" style="display:inline-block;background:#000;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:0 0 16px">Profiter de l'offre →</a><p style="color:#999;font-size:13px;margin:0 0 24px">Offre valable 7 jours.</p><p style="color:#999;font-size:12px;margin:0">Créatis · <a href="https://creatis.app" style="color:#999">creatis.app</a></p></div>` },
        ];

        for (const seq of EMAIL_SEQS) {
          try {
            const d = new Date(now);
            d.setDate(d.getDate() - seq.days);
            const from = new Date(d); from.setHours(0,0,0,0);
            const to = new Date(d); to.setHours(23,59,59,999);
            const users = await supabase(`/users?select=id,email,nom,plan&created_at=gte.${from.toISOString()}&created_at=lte.${to.toISOString()}&plan=eq.gratuit&repurpose_count=eq.0`);
            if (!Array.isArray(users)) continue;
            for (const u of users) {
              const nom = u.nom || u.email?.split('@')[0] || 'Créateur';
              const r = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY },
                body: JSON.stringify({ sender: { name: 'Créatis', email: 'contact@creatis.app' }, to: [{ email: u.email, name: nom }], subject: seq.subject, htmlContent: seq.body(nom) })
              });
              if (r.ok) { totalSent++; cronLog.push(`${seq.key} → ${u.email}`); }
            }
          } catch(e) { cronLog.push(`ERR ${seq.key}: ${e.message}`); }
        }
        console.log('[EmailCron]', cronLog);
        return res.status(200).json({ ok: true, sent: totalSent, log: cronLog });
      }

      /* Redescend en 'gratuit' tout compte dont `plan_expires_at` est dépassé. Ce champ n'a
         jamais été écrit par un chemin actif : un abonnement Stripe réel pose toujours
         plan_expires_at à null (« toujours actif », voir api/stripe-webhook.js) et se désactive
         par l'événement customer.subscription.deleted, pas par une date. Le programme UGC
         (case 'ugc_decider' ci-dessus) n'en écrit pas non plus — le mois offert y passe
         désormais par un vrai essai Stripe (carte requise, voir api/create-checkout-session.js),
         donc par le webhook, pas par ce champ. Cette action reste posée en filet générique : si
         un futur mécanisme pose un jour plan_expires_at pour un octroi temporaire, il sera
         expiré par ce même cron sans code supplémentaire — et elle ne peut structurellement
         jamais toucher un abonnement payant réel, qui ne pose jamais cette date. */
      case 'expirer_plans_temporaires': {
        const cronSecret = req.headers['x-cron-secret'] || req.query?.secret || (req.headers['authorization'] || '').replace('Bearer ', '');
        if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
          return res.status(401).json({ error: 'Non autorisé' });
        }
        const maintenant = new Date().toISOString();
        const expires = await supabase(
          `/users?plan_expires_at=lt.${maintenant}&plan=neq.gratuit&select=id,email,plan,plan_expires_at`
        ).catch(() => []);
        let downgrades = 0;
        for (const u of (expires || [])) {
          try {
            await supabase(`/users?id=eq.${u.id}`, 'PATCH', {
              plan: 'gratuit', plan_expires_at: null, updated_at: maintenant,
            });
            downgrades++;
          } catch (e) { console.error('[expirer_plans_temporaires]', u.email, e.message); }
        }
        console.log(`[expirer_plans_temporaires] ${downgrades} compte(s) redescendu(s) en gratuit`);
        return res.status(200).json({ ok: true, downgrades });
      }

      case 'daily_report': {
        const BREVO_KEY = (process.env.BREVO_API_KEY || '').trim();
        if (!BREVO_KEY) return res.status(200).json({ ok: false, note: 'BREVO_API_KEY manquante' });

        const TEST_EMAILS = ['otasso.andre@gmail.com', 'flemonosekai@gmail.com', 'flemonosekai2@gmail.com', 'flemonosekai+test1@gmail.com', 'flemonosekai+stripe@gmail.com'];

        const now = new Date();
        const yd = new Date(now); yd.setDate(yd.getDate() - 1);
        const hier      = yd.toISOString().slice(0, 10);
        const hierStart = hier + 'T00:00:00.000Z';
        const hierEnd   = hier + 'T23:59:59.999Z';

        const [usersHier, usersTotal, usersPro, gensHier, clipsHier, actifsHier, tousPlans, echecsPaiement, ph] = await Promise.all([
          supabase(`/users?select=id,email,plan&created_at=gte.${hierStart}&created_at=lte.${hierEnd}`, 'GET').catch(() => []),
          supabase(`/users?select=id,email`, 'GET').catch(() => []),
          supabase(`/users?select=id,email&plan=neq.gratuit`, 'GET').catch(() => []),
          supabase(`/generations?select=agent_id&created_at=gte.${hierStart}&created_at=lte.${hierEnd}`, 'GET').catch(() => []),
          supabase(`/generations?select=id&agent_id=eq.clips-viraux&created_at=gte.${hierStart}&created_at=lte.${hierEnd}`, 'GET').catch(() => []),
          supabase(`/generations?select=user_id&created_at=gte.${hierStart}&created_at=lte.${hierEnd}`, 'GET').catch(() => []),
          // Répartition par plan — « Abonnés Pro/Studio » masquait qui est sur quoi
          supabase(`/users?select=plan,email`, 'GET').catch(() => []),
          // Paiements échoués de la veille (table créée le 25/07) — pour ne plus les découvrir dans Stripe
          supabase(`/paiements_echoues?select=email,montant,devise,statut,raison&created_at=gte.${hierStart}&created_at=lte.${hierEnd}`, 'GET').catch(() => []),
          statsPostHog(hierStart, hierEnd)
        ]);

        const usersHierReels = (usersHier || []).filter(u => !TEST_EMAILS.includes(u.email));
        const nbInscrits = usersHierReels.length;
        const nbTotal    = (usersTotal || []).filter(u => !TEST_EMAILS.includes(u.email)).length;
        const nbPro      = (usersPro || []).filter(u => !TEST_EMAILS.includes(u.email)).length;
        const nbGens     = gensHier?.length || 0;
        const nbClips    = clipsHier?.length || 0;
        const nbActifs   = new Set((actifsHier || []).map(g => g.user_id)).size;

        // ── Répartition par plan (hors comptes de test) ──
        const plans = { gratuit: 0, starter: 0, pro: 0, studio: 0 };
        (tousPlans || []).filter(u => !TEST_EMAILS.includes(u.email))
          .forEach(u => { const p = u.plan || 'gratuit'; plans[p] = (plans[p] || 0) + 1; });

        // ── Tunnel PostHog (null si la clé n'est pas configurée) ──
        const val = (e, champ = 'n') => ph && ph[e] ? ph[e][champ] : null;
        const aff = (v) => (v === null || v === undefined) ? '—' : String(v);
        const pwVus   = val('paywall_shown');
        const pwPers  = val('paywall_shown', 'pers');
        const upClics = val('upgrade_clicked');
        const upPers  = val('upgrade_clicked', 'pers');
        const genOk   = val('clips_generated');
        const genKo   = val('generation_failed');
        const dlFini  = val('download_completed');
        const remb    = val('free_credit_refunded');
        // Combien de ceux qui voient le paywall cliquent réellement — la métrique qui compte
        const tauxClic = (pwPers && upPers !== null) ? Math.round(upPers / pwPers * 100) + ' %' : '—';
        const tauxEchec = (genOk !== null && genKo !== null && (genOk + genKo) > 0)
          ? Math.round(genKo / (genOk + genKo) * 100) + ' %' : '—';

        // ── Paiements échoués ──
        const echecs = echecsPaiement || [];
        const echecsHtml = echecs.length
          ? echecs.slice(0, 8).map(e => `• ${e.email || '?'} — ${e.montant || '?'} ${e.devise || ''} <span style="color:#f87171">${(e.raison || e.statut || '').slice(0, 60)}</span>`).join('<br>')
          : '';

        const agentCount = {};
        (gensHier || []).forEach(g => { agentCount[g.agent_id] = (agentCount[g.agent_id] || 0) + 1; });
        const topAgents = Object.entries(agentCount).sort((a,b) => b[1]-a[1]).slice(0,5).map(([id,n]) => `${n}× ${id}`).join('<br>') || '—';
        const inscritsList = usersHierReels.slice(0,10).map(u => `• ${u.email} (${u.plan})`).join('<br>') || '— aucun';

        const html = `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e7eb;padding:32px;border-radius:12px">
  <div style="margin-bottom:4px"><span style="font-size:22px;font-weight:800;color:#fff">Créatis<span style="color:#10b981">.</span></span>&nbsp;<span style="font-size:11px;font-weight:700;color:#10b981;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);padding:2px 8px;border-radius:20px">RAPPORT ${hier}</span></div>
  <p style="font-size:13px;color:#555;margin:0 0 24px">Résumé de la journée d'hier</p>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
    <div style="background:#111;border:1px solid #1f2937;border-radius:10px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:900;color:#10b981">${nbInscrits}</div><div style="font-size:11px;color:#6b7280;margin-top:4px">Nouveaux inscrits</div></div>
    <div style="background:#111;border:1px solid #1f2937;border-radius:10px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:900;color:#fff">${nbClips}</div><div style="font-size:11px;color:#6b7280;margin-top:4px">Clips exportés</div></div>
    <div style="background:#111;border:1px solid #1f2937;border-radius:10px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:900;color:#f0a500">${nbActifs}</div><div style="font-size:11px;color:#6b7280;margin-top:4px">Users actifs</div></div>
  </div>
  <div style="background:#111;border:1px solid #1f2937;border-radius:10px;padding:18px;margin-bottom:14px">
    <div style="font-size:11px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">STATS GLOBALES</div>
    <table style="width:100%;font-size:13px;border-collapse:collapse">
      <tr><td style="color:#9ca3af;padding:3px 0">Total inscrits</td><td style="text-align:right;font-weight:700;color:#fff">${nbTotal}</td></tr>
      <tr><td style="color:#9ca3af;padding:3px 0">Abonnés payants</td><td style="text-align:right;font-weight:700;color:#10b981">${nbPro}</td></tr>
      <tr><td style="color:#9ca3af;padding:3px 0">&nbsp;&nbsp;↳ Starter 9,95€</td><td style="text-align:right;font-weight:700;color:#d1d5db">${plans.starter}</td></tr>
      <tr><td style="color:#9ca3af;padding:3px 0">&nbsp;&nbsp;↳ Pro 14€ / annuel</td><td style="text-align:right;font-weight:700;color:#d1d5db">${plans.pro}</td></tr>
      <tr><td style="color:#9ca3af;padding:3px 0">&nbsp;&nbsp;↳ Gratuit</td><td style="text-align:right;font-weight:700;color:#6b7280">${plans.gratuit}</td></tr>
      <tr><td style="color:#9ca3af;padding:3px 0">Générations IA hier</td><td style="text-align:right;font-weight:700;color:#fff">${nbGens}</td></tr>
    </table>
  </div>

  <div style="background:#111;border:1px solid ${upClics ? '#10b981' : '#1f2937'};border-radius:10px;padding:18px;margin-bottom:14px">
    <div style="font-size:11px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">TUNNEL DE CONVERSION (hier)</div>
    <table style="width:100%;font-size:13px;border-collapse:collapse">
      <tr><td style="color:#9ca3af;padding:3px 0">Analyses réussies</td><td style="text-align:right;font-weight:700;color:#fff">${aff(genOk)}</td></tr>
      <tr><td style="color:#9ca3af;padding:3px 0">Analyses échouées</td><td style="text-align:right;font-weight:700;color:${genKo ? '#f87171' : '#6b7280'}">${aff(genKo)}${tauxEchec !== '—' ? `  <span style="color:#6b7280;font-weight:400">(${tauxEchec})</span>` : ''}</td></tr>
      <tr><td style="color:#9ca3af;padding:3px 0">Téléchargements terminés</td><td style="text-align:right;font-weight:700;color:#fff">${aff(dlFini)}</td></tr>
      <tr><td colspan="2" style="border-top:1px solid #1f2937;padding-top:6px"></td></tr>
      <tr><td style="color:#9ca3af;padding:3px 0">Paywalls affichés</td><td style="text-align:right;font-weight:700;color:#fff">${aff(pwVus)}${pwPers !== null ? `  <span style="color:#6b7280;font-weight:400">(${pwPers} pers.)</span>` : ''}</td></tr>
      <tr><td style="color:#fff;padding:3px 0;font-weight:700">Clics « Passer au Pro »</td><td style="text-align:right;font-weight:900;font-size:15px;color:${upClics ? '#10b981' : '#6b7280'}">${aff(upClics)}${upPers !== null ? `  <span style="color:#6b7280;font-weight:400;font-size:12px">(${upPers} pers.)</span>` : ''}</td></tr>
      <tr><td style="color:#9ca3af;padding:3px 0">Taux paywall → clic</td><td style="text-align:right;font-weight:700;color:#f0a500">${tauxClic}</td></tr>
      ${remb ? `<tr><td style="color:#9ca3af;padding:3px 0">Crédits d'essai remboursés</td><td style="text-align:right;font-weight:700;color:#f0a500">${remb}</td></tr>` : ''}
    </table>
    ${ph === null ? '<div style="font-size:11px;color:#6b7280;margin-top:10px">⚠️ PostHog non configuré — ajoute POSTHOG_API_KEY et POSTHOG_PROJECT_ID dans Vercel pour ces chiffres.</div>' : ''}
  </div>

  ${echecs.length ? `<div style="background:#1a0f0f;border:1px solid #7f1d1d;border-radius:10px;padding:18px;margin-bottom:14px">
    <div style="font-size:11px;font-weight:700;color:#f87171;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">💳 PAIEMENTS ÉCHOUÉS (${echecs.length})</div>
    <div style="font-size:12px;color:#d1d5db;line-height:1.9">${echecsHtml}</div>
    <div style="font-size:11px;color:#9ca3af;margin-top:10px">Ces personnes ont sorti leur carte — à relancer dans la journée.</div>
  </div>` : ''}
  <div style="background:#111;border:1px solid #1f2937;border-radius:10px;padding:18px;margin-bottom:14px">
    <div style="font-size:11px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">TOP AGENTS (hier)</div>
    <div style="font-size:13px;color:#d1d5db;line-height:2">${topAgents}</div>
  </div>
  ${nbInscrits > 0 ? `<div style="background:#111;border:1px solid #1f2937;border-radius:10px;padding:18px;margin-bottom:14px"><div style="font-size:11px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">NOUVEAUX INSCRITS</div><div style="font-size:13px;color:#d1d5db;line-height:2">${inscritsList}</div></div>` : ''}
  <p style="color:#374151;font-size:12px;text-align:center;margin-top:20px">Créatis · <a href="https://creatis.app" style="color:#10b981">creatis.app</a></p>
</div>`;

        const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY },
          body: JSON.stringify({
            sender: { name: 'Créatis Analytics', email: 'contact@creatis.app' },
            to: [{ email: 'creatis.app.contact@gmail.com', name: 'Créatis' }],
            subject: `📊 Créatis ${hier} — ${nbInscrits} inscrits · ${nbClips} clips · ${aff(upClics)} clic(s) paywall${echecs.length ? ` · ⚠️ ${echecs.length} paiement(s) échoué(s)` : ''}`,
            htmlContent: html
          })
        });
        const emailData = await emailRes.json().catch(() => ({}));
        if (!emailRes.ok) console.error('[DailyReport] Brevo erreur:', JSON.stringify(emailData));
        console.log(`[DailyReport] ${hier} — ${nbInscrits} inscrits, ${nbClips} clips, ${nbActifs} actifs`);
        /* `posthog` dans la réponse sert au diagnostic : sans lui, une clé invalide ou un mauvais
           projet ne se voit qu'en ouvrant l'email le lendemain et en le trouvant vide. */
        return res.status(200).json({
          ok: emailRes.ok, date: hier, inscrits: nbInscrits, clips: nbClips, actifs: nbActifs,
          posthog: ph === null ? 'NON CONFIGURÉ ou requête refusée' : ph
        });
      }

      case 'log_clip_export': {
        const identifier = userId ? `id=eq.${userId}` : `email=eq.${encodeURIComponent(email)}`;
        const users = await supabase(`/users?${identifier}&select=id,plan,repurpose_count,repurpose_reset`, 'GET');
        const user = users?.[0];
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
        /* nb négatif = REMBOURSEMENT d'un crédit après un export échoué ou abandonné.
           Le compteur est incrémenté avant l'export (pour empêcher de contourner le paywall en
           lançant plusieurs exports en parallèle), donc sans ce remboursement un échec consommait
           quand même le clip et murait l'utilisateur derrière le paywall sans rien lui livrer. */
        const brut = parseInt(metadata?.nb);
        const nb = Number.isFinite(brut) && brut !== 0 ? Math.max(-10, Math.min(10, brut)) : 1;
        const estRemboursement = nb < 0;

        /* Quota mensuel de clips exportés. Le compteur se périme tout seul : si `repurpose_reset`
           n'est pas le mois courant, on repart de 0 — pas besoin de cron de remise à zéro.
           DOIT rester aligné avec QUOTAS dans api/repurpose.js et CONFIG.PLANS dans js/config.js. */
        const QUOTA_CLIPS = { gratuit: 0, starter: 20, pro: 150, studio: 150 };
        const d = new Date();
        const moisCourant = `${d.getFullYear()}-${d.getMonth()}`;
        const dejaExportes = user.repurpose_reset === moisCourant ? (user.repurpose_count || 0) : 0;
        const maxClips = QUOTA_CLIPS[user.plan || 'gratuit'] ?? QUOTA_CLIPS.gratuit;
        // Un remboursement doit passer MÊME au quota plein — c'est justement là qu'il est utile.
        if (!estRemboursement && dejaExportes >= maxClips) {
          return res.status(429).json({
            error: 'quota_atteint',
            message: `Limite atteinte : ${maxClips} clips ce mois-ci. Le compteur repart le 1er du mois.`,
            clips_used: dejaExportes, clips_max: maxClips, plan: user.plan
          });
        }

        const nouveauCompteur = Math.max(0, dejaExportes + nb);
        await supabase(`/users?${identifier}`, 'PATCH', {
          repurpose_count: nouveauCompteur,
          repurpose_reset: moisCourant,
          ...(estRemboursement ? {} : { last_generation_at: new Date().toISOString() })
        });
        if (estRemboursement) {
          console.log(`[user-sync] ↩️ Crédit remboursé — ${user.email || userId} : ${dejaExportes} → ${nouveauCompteur}`);
          return res.status(200).json({ success: true, refunded: -nb, clips_used: nouveauCompteur });
        }
        for (let i = 0; i < nb; i++) {
          await supabase('/generations', 'POST', {
            user_id: user.id,
            agent_id: 'clips-viraux',
            plan: user.plan,
            created_at: new Date().toISOString()
          }).catch(() => {});
        }
        return res.status(200).json({ success: true, logged: nb });
      }

      /* ═══ Portail client Stripe — gestion et résiliation d'abonnement ═══
         Logé ici et non dans son propre fichier : le plan Vercel Hobby plafonne à 12 fonctions
         serverless et `api/` en comptait déjà 12. Une 13ᵉ fait échouer TOUT le déploiement.

         CADRE LÉGAL — article L215-1-1 du Code de la consommation (1er juin 2023) : pour un
         contrat souscrit en ligne, la résiliation doit être accessible « facilement, directement
         et en permanence ». Un écran de rétention avant confirmation est licite ; rendre ce
         chemin introuvable ne l'est pas. Le motif collecté est facultatif et ne conditionne
         jamais l'accès au portail.

         SÉCURITÉ — l'identité vient du JWT Supabase, JAMAIS d'un userId passé dans le corps :
         sinon n'importe qui ouvrirait le portail de facturation d'autrui en devinant un id. */
      case 'portail_abonnement': {
        const jeton = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
        const anon = (process.env.SUPABASE_ANON_KEY || '').trim();
        if (!jeton || !anon) return res.status(401).json({ error: 'Connexion requise' });

        let auth = null;
        try {
          const ra = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: { Authorization: `Bearer ${jeton}`, apikey: anon }
          });
          if (ra.ok) { const u = await ra.json(); if (u?.id) auth = { id: u.id, email: u.email }; }
        } catch {}
        if (!auth) return res.status(401).json({ error: 'Session expirée — reconnecte-toi.' });

        const stripeLib = require('stripe')((process.env.STRIPE_SECRET_KEY || '').trim());
        const lignes = await supabase(`/users?id=eq.${auth.id}&select=email,plan,stripe_customer_id`, 'GET');
        const ligne = lignes?.[0] || null;
        let customerId = ligne?.stripe_customer_id || null;

        /* Repli par email : un compte payé avant que le webhook n'ait enregistré le customer id
           n'aurait aucun moyen de résilier — c'est exactement le cas qui finit en opposition
           bancaire. On ne laisse pas ce trou. */
        if (!customerId) {
          const mail = ligne?.email || auth.email;
          if (mail) {
            const trouve = await stripeLib.customers.list({ email: mail, limit: 1 });
            customerId = trouve?.data?.[0]?.id || null;
          }
        }
        if (!customerId) {
          return res.status(404).json({
            error: "Aucun abonnement Stripe trouvé pour ce compte.",
            aide: "Si c'est une erreur, écris à contact@creatis.app avec l'email utilisé au paiement."
          });
        }

        if (metadata?.motif) {
          try {
            await stripeLib.customers.update(customerId, {
              metadata: {
                motif_resiliation: String(metadata.motif).slice(0, 200),
                commentaire_resiliation: String(metadata.commentaire || '').slice(0, 500),
                date_demande_resiliation: new Date().toISOString()
              }
            });
          } catch (e) { console.warn('[Portail] motif non enregistré:', e.message); }
        }

        const sess = await stripeLib.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${appUrl}/app`
        });
        return res.status(200).json({ url: sess.url });
      }

      /* ═══ Offre de rétention — alternative à la résiliation ═══
         Deux gestes seulement, choisis parce qu'ils répondent aux deux vrais motifs de départ :
         le prix et le manque de temps. Une remise uniforme serait plus simple mais offrirait de
         l'argent à des gens qui seraient restés de toute façon.

         Ne remplace JAMAIS l'accès au portail : l'utilisateur peut refuser et continuer. */
      case 'retention_appliquer': {
        const jetonR = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
        const anonR = (process.env.SUPABASE_ANON_KEY || '').trim();
        if (!jetonR || !anonR) return res.status(401).json({ error: 'Connexion requise' });

        let authR = null;
        try {
          const rr = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: { Authorization: `Bearer ${jetonR}`, apikey: anonR }
          });
          if (rr.ok) { const u = await rr.json(); if (u?.id) authR = { id: u.id, email: u.email }; }
        } catch {}
        if (!authR) return res.status(401).json({ error: 'Session expirée — reconnecte-toi.' });

        const st = require('stripe')((process.env.STRIPE_SECRET_KEY || '').trim());
        const ligneR = (await supabase(`/users?id=eq.${authR.id}&select=email,plan,stripe_customer_id,stripe_subscription_id`, 'GET'))?.[0];
        const subId = ligneR?.stripe_subscription_id;
        if (!subId) return res.status(404).json({ error: "Aucun abonnement actif trouvé." });

        const geste = metadata?.geste;
        const PRIX_STARTER = 'price_1Tx8TXAptK6HZtp5vB5clklV';   // 9,95 €/mois

        try {
          if (geste === 'pause') {
            /* Pause d'un mois : `void` n'émet aucune facture pendant la pause, et Stripe reprend
               tout seul à la date indiquée — rien à réactiver à la main de notre côté. */
            const reprise = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
            await st.subscriptions.update(subId, {
              pause_collection: { behavior: 'void', resumes_at: reprise }
            });
            return res.status(200).json({
              ok: true,
              message: "Abonnement mis en pause 1 mois. Rien ne te sera facturé d'ici là, et tout redémarre automatiquement."
            });
          }

          if (geste === 'starter') {
            const sub = await st.subscriptions.retrieve(subId);
            const itemId = sub?.items?.data?.[0]?.id;
            if (!itemId) return res.status(500).json({ error: "Abonnement illisible — écris à contact@creatis.app." });
            /* `proration_behavior: 'none'` : pas de facture immédiate ni d'avoir. Le client garde
               ce qu'il a déjà payé et la prochaine échéance passe simplement à 9,95 €. C'est le
               comportement le moins surprenant pour lui, donc le moins générateur de litige. */
            await st.subscriptions.update(subId, {
              items: [{ id: itemId, price: PRIX_STARTER }],
              proration_behavior: 'none'
            });
            await supabase(`/users?id=eq.${authR.id}`, 'PATCH', { plan: 'starter', updated_at: new Date().toISOString() });
            return res.status(200).json({
              ok: true,
              message: "Tu es passé au Starter à 9,95 €/mois. Ta période déjà payée reste acquise."
            });
          }

          return res.status(400).json({ error: 'Geste de rétention inconnu.' });
        } catch (e) {
          console.error('[Rétention]', geste, e.message);
          return res.status(500).json({ error: `Impossible d'appliquer : ${e.message}` });
        }
      }

      default:
        return res.status(400).json({ error: 'Action inconnue: ' + action });
    }
  } catch (err) {
    console.error('[User Sync] Erreur:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
