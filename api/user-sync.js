/* ===== VERCEL FUNCTION — Sync utilisateur Supabase ===== */
/* POST /api/user-sync
   Body: { userId, email, plan, chaine, action }
   Actions: 'get', 'upsert', 'increment_generation'
   Accès Supabase sécurisé côté serveur (service key jamais exposée) */

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();

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
        subject: '🚀 Bienvenue sur Créatis — tes 50 crédits t\'attendent',
        htmlContent: `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0a0f0a;color:#e5e7eb;padding:40px 32px;border-radius:12px;"><div style="font-size:28px;font-weight:800;color:#fff;margin-bottom:4px;">Créatis<span style="color:#10b981;">.</span></div><p style="color:#6b7280;font-size:14px;margin:0 0 32px;">Votre assistant YouTube IA</p><h1 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 12px;">Bienvenue ! 👋</h1><p style="color:#9ca3af;line-height:1.6;margin:0 0 24px;">Ton compte est créé. Tu as <strong style="color:#10b981;">50 crédits gratuits</strong> pour tester Créatis — aucune carte bancaire requise.</p><div style="background:#111827;border:1px solid #1f2937;border-radius:8px;padding:20px;margin-bottom:28px;"><p style="color:#10b981;font-weight:600;margin:0 0 12px;">Pour commencer :</p><p style="color:#d1d5db;font-size:14px;margin:4px 0;">1. Connecte ton @handle YouTube</p><p style="color:#d1d5db;font-size:14px;margin:4px 0;">2. Choisis un agent IA (YouTube Complet, Short, Idées…)</p><p style="color:#d1d5db;font-size:14px;margin:4px 0;">3. Génère ton contenu en 30 secondes</p></div><a href="https://creatis.app/app.html" style="display:inline-block;background:#10b981;color:#000;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;">Démarrer avec Créatis →</a><p style="color:#4b5563;font-size:12px;margin-top:32px;">Questions ? <a href="mailto:contact@creatis.app" style="color:#10b981;">contact@creatis.app</a></p></div>`
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
        const users = await supabase(`/users?${identifier}&select=id,plan,generations_count,miniatures_count`, 'GET');
        const user = users?.[0];
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        const newCount = (user.generations_count || 0) + 1;
        await supabase(`/users?${identifier}`, 'PATCH', {
          generations_count: newCount,
          last_generation_at: new Date().toISOString()
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

        return res.status(200).json({ count: newCount });
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

      default:
        return res.status(400).json({ error: 'Action inconnue: ' + action });
    }
  } catch (err) {
    console.error('[User Sync] Erreur:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
