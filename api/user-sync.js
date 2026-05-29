/* ===== VERCEL FUNCTION — Sync utilisateur Supabase ===== */
/* POST /api/user-sync
   Body: { userId, email, plan, chaine, action }
   Actions: 'get', 'upsert', 'increment_generation', 'track_event'
   Accès Supabase sécurisé côté serveur (service key jamais exposée) */

const crypto = require('crypto');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
// TODO: configurer META_PIXEL_ID et META_CAPI_TOKEN dans Vercel → Settings → Environment Variables
const META_PIXEL_ID = (process.env.META_PIXEL_ID || '').trim();
const META_CAPI_TOKEN = (process.env.META_CAPI_TOKEN || '').trim();

async function envoyerEmailBienvenue(email) {
  if (!process.env.BREVO_API_KEY) return;
  try {
    await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
      body: JSON.stringify({ email, attributes: { PLAN: 'gratuit' }, updateEnabled: true })
    });
    const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
      body: JSON.stringify({
        sender: { email: 'contact@creatis.app', name: 'Créatis' },
        to: [{ email }],
        subject: '🚀 Bienvenue sur Créatis — ta génération gratuite t\'attend',
        htmlContent: `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0a0f0a;color:#e5e7eb;padding:40px 32px;border-radius:12px;"><div style="font-size:28px;font-weight:800;color:#fff;margin-bottom:4px;">Créatis<span style="color:#10b981;">.</span></div><p style="color:#6b7280;font-size:14px;margin:0 0 32px;">Votre assistant YouTube IA</p><h1 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 12px;">Bienvenue ! 👋</h1><p style="color:#9ca3af;line-height:1.6;margin:0 0 24px;">Ton compte est créé. Tu as <strong style="color:#10b981;">1 génération gratuite</strong> pour découvrir Créatis — aucune carte bancaire requise.</p><div style="background:#111827;border:1px solid #1f2937;border-radius:8px;padding:20px;margin-bottom:28px;"><p style="color:#10b981;font-weight:600;margin:0 0 12px;">Pour commencer :</p><p style="color:#d1d5db;font-size:14px;margin:4px 0;">1. Connecte ton @handle YouTube</p><p style="color:#d1d5db;font-size:14px;margin:4px 0;">2. Choisis un agent IA (YouTube Complet, Short, Idées…)</p><p style="color:#d1d5db;font-size:14px;margin:4px 0;">3. Génère ton contenu en 30 secondes</p></div><a href="https://creatis.app/app.html" style="display:inline-block;background:#10b981;color:#000;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;">Démarrer avec Créatis →</a><p style="color:#4b5563;font-size:12px;margin-top:32px;">Questions ? <a href="mailto:contact@creatis.app" style="color:#10b981;">contact@creatis.app</a></p></div>`
      })
    });
    const emailData = await emailRes.json().catch(() => ({}));
    if (!emailRes.ok) {
      console.error('[Email] Brevo erreur:', emailRes.status, JSON.stringify(emailData));
    } else {
      console.log('[Email] Brevo OK:', emailData.messageId);
      return emailData.messageId;
    }
  } catch (e) {
    console.warn('[Email] Bienvenue non envoyé:', e.message);
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
  const appUrl = process.env.APP_URL || 'https://creatis.app';
  res.setHeader('Access-Control-Allow-Origin', appUrl);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { userId, email, plan, chaine, action, metadata } = req.body || {};

  if (!userId && !email) return res.status(400).json({ error: 'userId ou email requis' });

  try {
    switch (action) {

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
          updated_at: new Date().toISOString()
        };
        const result = await supabase('/users?on_conflict=email', 'POST', userData);

        // Email de bienvenue uniquement pour les nouveaux inscrits
        let emailStatus = 'skipped';
        let emailMessageId = null;
        if (email && process.env.BREVO_API_KEY) {
          if (isNewUser) {
            emailMessageId = await envoyerEmailBienvenue(email);
            emailStatus = emailMessageId ? 'delivered' : 'error';
          } else {
            emailStatus = 'existing_user';
          }
        } else if (!process.env.BREVO_API_KEY) {
          emailStatus = 'no_api_key';
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
          // test_event_code: 'TEST_XXXXX' // décommenter pour tester dans Events Manager Meta
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

      default:
        return res.status(400).json({ error: 'Action inconnue: ' + action });
    }
  } catch (err) {
    console.error('[User Sync] Erreur:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
