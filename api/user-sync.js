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
  <p style="color:#10b981;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 12px;">Ton essai gratuit — 3 étapes</p>
  <p style="color:#d1d5db;font-size:14px;margin:0 0 8px;line-height:1.6;">① Va sur <strong style="color:#fff;">creatis.app</strong> → Clips Viraux</p>
  <p style="color:#d1d5db;font-size:14px;margin:0 0 8px;line-height:1.6;">② Uploade n'importe quelle vidéo YouTube (même une vieille)</p>
  <p style="color:#d1d5db;font-size:14px;margin:0;line-height:1.6;">③ Reçois tes clips en 30 secondes</p>
</div>

<a href="https://creatis.app/generateur-clips-viraux.html" style="display:block;background:#10b981;color:#000;font-weight:800;font-size:16px;padding:16px 28px;border-radius:10px;text-decoration:none;text-align:center;margin-bottom:24px;">Générer mes clips maintenant →</a>

<p style="color:#4b5563;font-size:13px;line-height:1.6;margin:0 0 8px;">Gratuit · Sans carte bancaire · 1 analyse offerte</p>
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

  // Crons Vercel envoient GET — autoriser GET uniquement pour email_cron
  const actionFromQuery = req.query?.action || req.url?.split('action=')[1]?.split('&')[0];
  if (req.method === 'GET' && actionFromQuery === 'email_cron') {
    req.body = { action: 'email_cron' };
  } else if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { userId, email, plan, chaine, action, metadata } = req.body || {};

  const isCronAction = action === 'email_cron' || action === 'daily_report';
  if (!isCronAction && !userId && !email) return res.status(400).json({ error: 'userId ou email requis' });

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
        const cronSecret = req.headers['x-cron-secret'] || req.query?.secret;
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
            body: n => `<div style="font-family:sans-serif;max-width:600px;margin:auto;color:#111;padding:24px"><h2 style="font-size:20px;margin:0 0 16px">Salut ${n},</h2><p style="line-height:1.7;margin:0 0 16px">Tu fais partie des premiers utilisateurs de Créatis. En tant qu'early adopter, je te réserve une offre spéciale.</p><div style="background:#f9f9f9;border-radius:10px;padding:24px;margin:0 0 24px;text-align:center"><p style="font-size:28px;font-weight:900;margin:0 0 8px">-50% le 1er mois</p><p style="color:#666;margin:0 0 16px;font-size:15px">Créatis Pro à 9,90€ au lieu de 19,90€</p><p style="margin:0;line-height:2;color:#333;font-size:14px">✂️ Clips viraux illimités · 📝 Sous-titres automatiques<br>🎯 Hooks IA · 🎬 Scripts YouTube · 🖼️ Miniatures</p></div><a href="${origin}/app" style="display:inline-block;background:#000;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:0 0 16px">Profiter de l'offre →</a><p style="color:#999;font-size:13px;margin:0 0 24px">Offre valable 7 jours.</p><p style="color:#999;font-size:12px;margin:0">Créatis · <a href="https://creatis.app" style="color:#999">creatis.app</a></p></div>` },
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

      case 'daily_report': {
        const BREVO_KEY = (process.env.BREVO_API_KEY || '').trim();
        if (!BREVO_KEY) return res.status(200).json({ ok: false, note: 'BREVO_API_KEY manquante' });

        const now = new Date();
        const yd = new Date(now); yd.setDate(yd.getDate() - 1);
        const hier      = yd.toISOString().slice(0, 10);
        const hierStart = hier + 'T00:00:00.000Z';
        const hierEnd   = hier + 'T23:59:59.999Z';

        const [usersHier, usersTotal, usersPro, gensHier, clipsHier, actifsHier] = await Promise.all([
          supabase(`/users?select=id,email,plan&created_at=gte.${hierStart}&created_at=lte.${hierEnd}`, 'GET').catch(() => []),
          supabase(`/users?select=id`, 'GET').catch(() => []),
          supabase(`/users?select=id&plan=neq.gratuit`, 'GET').catch(() => []),
          supabase(`/generations?select=agent_id&created_at=gte.${hierStart}&created_at=lte.${hierEnd}`, 'GET').catch(() => []),
          supabase(`/generations?select=id&agent_id=eq.clips-viraux&created_at=gte.${hierStart}&created_at=lte.${hierEnd}`, 'GET').catch(() => []),
          supabase(`/generations?select=user_id&created_at=gte.${hierStart}&created_at=lte.${hierEnd}`, 'GET').catch(() => [])
        ]);

        const nbInscrits = usersHier?.length || 0;
        const nbTotal    = usersTotal?.length || 0;
        const nbPro      = usersPro?.length || 0;
        const nbGens     = gensHier?.length || 0;
        const nbClips    = clipsHier?.length || 0;
        const nbActifs   = new Set((actifsHier || []).map(g => g.user_id)).size;

        const agentCount = {};
        (gensHier || []).forEach(g => { agentCount[g.agent_id] = (agentCount[g.agent_id] || 0) + 1; });
        const topAgents = Object.entries(agentCount).sort((a,b) => b[1]-a[1]).slice(0,5).map(([id,n]) => `${n}× ${id}`).join('<br>') || '—';
        const inscritsList = (usersHier || []).slice(0,10).map(u => `• ${u.email} (${u.plan})`).join('<br>') || '— aucun';

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
      <tr><td style="color:#9ca3af;padding:3px 0">Abonnés Pro/Studio</td><td style="text-align:right;font-weight:700;color:#10b981">${nbPro}</td></tr>
      <tr><td style="color:#9ca3af;padding:3px 0">Générations IA hier</td><td style="text-align:right;font-weight:700;color:#fff">${nbGens}</td></tr>
    </table>
  </div>
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
            subject: `📊 Créatis ${hier} — ${nbInscrits} inscrits · ${nbClips} clips · ${nbActifs} actifs`,
            htmlContent: html
          })
        });
        const emailData = await emailRes.json().catch(() => ({}));
        if (!emailRes.ok) console.error('[DailyReport] Brevo erreur:', JSON.stringify(emailData));
        console.log(`[DailyReport] ${hier} — ${nbInscrits} inscrits, ${nbClips} clips, ${nbActifs} actifs`);
        return res.status(200).json({ ok: emailRes.ok, date: hier, inscrits: nbInscrits, clips: nbClips, actifs: nbActifs });
      }

      case 'log_clip_export': {
        const identifier = userId ? `id=eq.${userId}` : `email=eq.${encodeURIComponent(email)}`;
        const users = await supabase(`/users?${identifier}&select=id,plan,repurpose_count`, 'GET');
        const user = users?.[0];
        if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
        const nb = Math.max(1, parseInt(metadata?.nb) || 1);
        await supabase(`/users?${identifier}`, 'PATCH', {
          repurpose_count: (user.repurpose_count || 0) + nb,
          last_generation_at: new Date().toISOString()
        });
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

      default:
        return res.status(400).json({ error: 'Action inconnue: ' + action });
    }
  } catch (err) {
    console.error('[User Sync] Erreur:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
