/* ===== VERCEL FUNCTION — Proxy Brevo API ===== */
/* POST /api/email-sequence
   Body: { action, ...params }
   Actions: add_contact, update_plan, send_email, trigger_automation, unsubscribe, get_contact
   Sécurité : BREVO_API_KEY reste côté serveur uniquement */

const BREVO_BASE = 'https://api.brevo.com/v3';

const LISTES = { gratuit: 3, pro: 4, studio: 5, prospects: 6, affilies: 7 };

function getListesPlan(plan) {
  return { gratuit: [LISTES.gratuit], pro: [LISTES.pro], studio: [LISTES.studio] }[plan] || [LISTES.gratuit];
}

async function brevo(path, method = 'GET', body) {
  const key = (process.env.BREVO_API_KEY || '').replace(/^﻿/, '').trim();
  if (!key) return { _err: 'no_brevo_key' };
  try {
    const res = await fetch(`${BREVO_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'api-key': key },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { _err: `http_${res.status}`, _msg: txt.substring(0, 200) };
    }
    return method !== 'DELETE' && res.status !== 204 ? await res.json().catch(() => ({})) : {};
  } catch (e) {
    return { _err: 'fetch_fail', _msg: e.message };
  }
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  const appUrl = process.env.APP_URL || 'https://creatis.app';
  const isAllowed = origin.startsWith(appUrl) || origin.includes('localhost') || origin.includes('vercel.app');

  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : appUrl);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  if (!process.env.BREVO_API_KEY) {
    return res.status(200).json({ ok: false, skipped: true }); // Fail silently — Brevo non configuré
  }

  const { action, email, ...params } = req.body || {};

  if (!action) return res.status(400).json({ error: 'action manquante' });
  if (!email && !['send_email', 'create_campaign'].includes(action)) return res.status(400).json({ error: 'email manquant' });

  try {
    switch (action) {

      case 'add_contact': {
        const { nom, plan, chaine, source } = params;
        const listIds = getListesPlan(plan || 'gratuit');
        const result = await brevo('/contacts', 'POST', {
          email,
          attributes: {
            PRENOM: nom || '',
            PLAN: plan || 'gratuit',
            DATE_INSCRIPTION: new Date().toISOString().split('T')[0],
            SOURCE: source || 'app_inscription',
            CHAINE_NOM: chaine?.nom || '',
            ABONNES: chaine?.abonnes || 0,
            PAYS: 'FR',
            LANGUE: 'fr'
          },
          listIds,
          updateEnabled: true
        });
        if (result._err && result._err !== 'http_400') {
          console.warn('[Brevo] add_contact error:', result._err, result._msg);
        }
        return res.status(200).json({ ok: !result._err });
      }

      case 'update_plan': {
        const { nouveauPlan, stripeCustomerId, montantMensuel } = params;
        const oldListIds = [LISTES.gratuit, LISTES.pro, LISTES.studio];
        const newListIds = getListesPlan(nouveauPlan);

        // Retirer des anciennes listes
        for (const listId of oldListIds) {
          if (!newListIds.includes(listId)) {
            await brevo(`/contacts/lists/${listId}/contacts/remove`, 'POST', { emails: [email] }).catch(() => {});
          }
        }

        // Mettre à jour attributs + nouvelles listes
        await brevo(`/contacts/${encodeURIComponent(email)}`, 'PUT', {
          attributes: {
            PLAN: nouveauPlan,
            DATE_UPGRADE: new Date().toISOString().split('T')[0],
            STRIPE_CUSTOMER: stripeCustomerId || '',
            MONTANT_MRR: montantMensuel || 0
          },
          listIds: newListIds
        });

        return res.status(200).json({ ok: true });
      }

      case 'send_email': {
        const { to, toName, subject, htmlContent, templateId, templateParams } = params;
        const dest = to || email;
        if (!dest) return res.status(400).json({ error: 'destinataire manquant' });

        const body = templateId
          ? { to: [{ email: dest, name: toName || '' }], templateId, params: templateParams }
          : {
              to: [{ email: dest, name: toName || '' }],
              subject,
              htmlContent,
              sender: { email: 'contact@creatis.app', name: 'Créatis' },
              trackOpens: 1,
              trackClicks: 1
            };

        const result = await brevo('/smtp/email', 'POST', body);
        return res.status(200).json({ ok: !result._err, messageId: result.messageId });
      }

      case 'trigger_automation': {
        const { eventName, eventData } = params;
        const key = process.env.BREVO_API_KEY;
        if (!key) return res.status(200).json({ ok: false, skipped: true });

        await fetch(`${BREVO_BASE}/trackEvent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'ma-key': key },
          body: JSON.stringify({
            email,
            event: eventName,
            eventdata: { source: 'creatis_app', timestamp: Date.now(), ...eventData }
          })
        }).catch(() => {});

        return res.status(200).json({ ok: true });
      }

      case 'unsubscribe': {
        const { listId } = params;
        if (!listId) return res.status(400).json({ error: 'listId manquant' });
        await brevo(`/contacts/lists/${listId}/contacts/remove`, 'POST', { emails: [email] });
        return res.status(200).json({ ok: true });
      }

      case 'get_contact': {
        const result = await brevo(`/contacts/${encodeURIComponent(email)}`);
        if (result._err) return res.status(200).json({ ok: false });
        return res.status(200).json({ ok: true, contact: result });
      }

      case 'add_prospect': {
        const { nom, chaine, abonnes, niche } = params;
        const result = await brevo('/contacts', 'POST', {
          email,
          attributes: {
            PRENOM: nom || '',
            SOURCE: 'prospection_yt',
            CHAINE_NOM: chaine || '',
            ABONNES: abonnes || 0,
            NICHE: niche || '',
            DATE_CONTACT: new Date().toISOString().split('T')[0]
          },
          listIds: [LISTES.prospects],
          updateEnabled: true
        });
        return res.status(200).json({ ok: !result._err });
      }

      case 'create_campaign': {
        const { name, subject, htmlContent, listIds } = params;
        if (!name || !subject || !htmlContent) return res.status(400).json({ error: 'name/subject/htmlContent manquants' });

        const created = await brevo('/emailCampaigns', 'POST', {
          name,
          subject,
          htmlContent,
          sender: { name: 'Créatis', email: 'contact@creatis.app' },
          recipients: { listIds: listIds || [3] },
          scheduledAt: new Date(Date.now() + 60000).toISOString()
        });

        if (created._err) {
          console.error('[Brevo] create_campaign error:', created._err, created._msg);
          return res.status(200).json({ ok: false, error: created._msg });
        }

        if (created.id) {
          await brevo(`/emailCampaigns/${created.id}/sendNow`, 'POST');
        }

        return res.status(200).json({ ok: true, campaignId: created.id });
      }

      case 'add_prospect_landing': {
        const { nom } = params;
        const result = await brevo('/contacts', 'POST', {
          email,
          attributes: {
            PRENOM: nom || '',
            SOURCE: 'popup_landing',
            DATE_CONTACT: new Date().toISOString().split('T')[0],
            PAYS: 'FR'
          },
          listIds: [LISTES.prospects],
          updateEnabled: true
        });
        if (!result._err && email) {
          await brevo('/smtp/email', 'POST', {
            to: [{ email, name: nom || 'Créateur' }],
            subject: 'Tes 5 scripts YouTube prêts à filmer',
            sender: { name: 'Créatis', email: 'contact@creatis.app' },
            trackOpens: 1,
            trackClicks: 1,
            htmlContent: `<div style="font-family:sans-serif;max-width:600px;margin:auto;background:#fff;padding:32px;border-radius:12px;color:#111">
              <h2 style="color:#10b981;margin-top:0">Voici tes 5 idées de scripts YouTube</h2>
              <p>Salut${nom ? ' ' + nom : ''} ! Voici les formats qui cartonnent le plus sur YouTube FR en 2026 :</p>
              <ol style="line-height:2.2">
                <li><strong>"J'ai essayé [X] pendant 30 jours"</strong> — format bilan honnête, fort engagement</li>
                <li><strong>"Ce que personne ne te dit sur [sujet]"</strong> — angle révélation, CTR élevé</li>
                <li><strong>"De 0 à [résultat] en [durée]"</strong> — transformation, preuve sociale</li>
                <li><strong>"J'ai tout arrêté pour [X] — voici pourquoi"</strong> — angle émotionnel</li>
                <li><strong>"Le guide complet [sujet] pour débutants en 2026"</strong> — SEO long terme</li>
              </ol>
              <p>Créatis génère le script complet, les titres, la description SEO et les tags pour n'importe lequel de ces formats en 30 secondes.</p>
              <a href="https://creatis.app/app.html" style="display:inline-block;background:#10b981;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0">Essayer gratuitement →</a>
              <p style="color:#666;font-size:14px">50 générations offertes — sans carte bancaire.</p>
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
              <p style="color:#999;font-size:12px;margin:0">Créatis · <a href="https://creatis.app" style="color:#10b981">creatis.app</a></p>
            </div>`
          });
        }
        return res.status(200).json({ ok: !result._err });
      }

      case 'add_affilie': {
        const { codeAffilie } = params;
        await brevo(`/contacts/${encodeURIComponent(email)}`, 'PUT', {
          attributes: {
            CODE_AFFILIE: codeAffilie || '',
            DATE_AFFILIATION: new Date().toISOString().split('T')[0],
            COMMISSION_PCT: '30'
          },
          listIds: [LISTES.affilies]
        });
        return res.status(200).json({ ok: true });
      }

      case 'send_affilie_recruitment': {
        const { nom, codeAffilie } = params;
        const affilieLink = `https://creatis.app?ref=${codeAffilie || ''}`;

        const result = await brevo('/smtp/email', 'POST', {
          to: [{ email, name: nom || 'Créateur' }],
          subject: `${nom ? nom + ' — ' : ''}Programme affilié Créatis — 30% à vie + script TikTok prêt`,
          sender: { email: 'contact@creatis.app', name: 'Créatis' },
          trackOpens: 1,
          trackClicks: 1,
          htmlContent: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0a0f0a;color:#e5e7eb;padding:40px 32px;border-radius:12px;">
            <div style="font-size:26px;font-weight:800;color:#fff;margin-bottom:4px;">Créatis<span style="color:#10b981;">.</span></div>
            <p style="color:#6b7280;font-size:13px;margin:0 0 28px;">Programme Affilié</p>
            <h1 style="font-size:20px;font-weight:700;color:#fff;margin:0 0 8px;">Salut ${nom || ''} 👋</h1>
            <p style="color:#9ca3af;line-height:1.6;margin:0 0 20px;">J'ai lancé <strong style="color:#fff;">Créatis</strong> — un outil IA qui génère scripts YouTube, titres et miniatures en 30 secondes. J'ai besoin de créateurs TikTok pour en parler.</p>
            <div style="background:#111827;border:1px solid #1f2937;border-radius:10px;padding:20px;margin-bottom:24px;">
              <p style="color:#10b981;font-weight:700;margin:0 0 12px;font-size:15px;">Ton offre affilié :</p>
              <p style="color:#d1d5db;font-size:14px;margin:6px 0;">💰 <strong style="color:#fff;">30% de commission récurrente</strong> — à vie, sur chaque abonné Pro que tu amènes</p>
              <p style="color:#d1d5db;font-size:14px;margin:6px 0;">📱 <strong style="color:#fff;">1 vidéo TikTok</strong> suffit — script fourni ci-dessous</p>
              <p style="color:#d1d5db;font-size:14px;margin:6px 0;">🎯 <strong style="color:#fff;">Produit gratuit à tester</strong> — 50 crédits offerts pour que tu voies toi-même</p>
              <p style="color:#d1d5db;font-size:14px;margin:6px 0;">📊 Dashboard affilié en temps réel sur creatis.app/affiliation</p>
            </div>
            <div style="background:#0d1f17;border:1px solid rgba(16,185,129,.3);border-radius:10px;padding:20px;margin-bottom:24px;">
              <p style="color:#10b981;font-weight:700;margin:0 0 8px;">Ton lien affilié :</p>
              <p style="background:#111;border:1px solid #1f2937;border-radius:6px;padding:10px 14px;color:#10b981;font-family:monospace;font-size:14px;margin:0 0 12px;word-break:break-all;">${affilieLink}</p>
              <p style="color:#6b7280;font-size:13px;margin:0;">Chaque vente depuis ce lien = <strong style="color:#10b981;">5,70€/mois à vie</strong> (30% de 19€)</p>
            </div>
            <div style="background:#111827;border:1px solid #1f2937;border-radius:10px;padding:20px;margin-bottom:28px;">
              <p style="color:#f59e0b;font-weight:700;margin:0 0 12px;">🎬 Script TikTok prêt à filmer :</p>
              <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 8px;"><strong style="color:#fff;">Hook (0-3s) :</strong> "Cet outil génère mon script YouTube en 30 secondes..."</p>
              <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 8px;"><strong style="color:#fff;">Corps (4-45s) :</strong> "Tu rentres juste ton sujet — Créatis te donne 5 titres, un script complet avec timecodes, une description SEO et 30 tags. Avant j'utilisais ChatGPT, ça prenait 2h. Là c'est 30 secondes, calibré YouTube FR."</p>
              <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 12px;"><strong style="color:#fff;">CTA (46-60s) :</strong> "50 crédits gratuits, sans CB → lien en bio"</p>
              <p style="color:#6b7280;font-size:12px;margin:0;">Montre l'interface en screen record pendant le corps — ça convertit bien</p>
            </div>
            <a href="${affilieLink}" style="display:inline-block;background:#10b981;color:#000;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;margin-bottom:20px;">Voir mon espace affilié →</a>
            <p style="color:#4b5563;font-size:12px;margin-top:20px;">Questions ? Réponds directement à cet email — je réponds en moins de 24h.</p>
            <hr style="border:none;border-top:1px solid #1f2937;margin:24px 0">
            <p style="color:#374151;font-size:12px;margin:0;">Créatis · <a href="https://creatis.app" style="color:#10b981;">creatis.app</a> · <a href="mailto:contact@creatis.app" style="color:#10b981;">contact@creatis.app</a></p>
          </div>`
        });
        return res.status(200).json({ ok: !result._err, messageId: result.messageId });
      }

      case 'contact': {
        const { nom, email: from, sujet, message } = body;
        if (!message || message.trim().length < 5) return res.status(400).json({ error: 'Message trop court' });
        const html = `<div style="font-family:sans-serif;max-width:600px;color:#1a1a1a;line-height:1.7">
          <div style="background:#0a0f0a;padding:20px 24px;border-radius:8px 8px 0 0"><span style="font-size:20px;font-weight:900;color:#fff">Créatis<span style="color:#10b981">.</span></span></div>
          <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e5e5">
            <h2 style="margin:0 0 16px;font-size:18px">Nouveau message de contact</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
              <tr><td style="padding:8px 0;color:#666;width:80px">De</td><td style="padding:8px 0;font-weight:600">${nom || 'Inconnu'} &lt;${from || 'inconnu'}&gt;</td></tr>
              <tr><td style="padding:8px 0;color:#666">Sujet</td><td style="padding:8px 0;font-weight:600">${sujet || 'Sans sujet'}</td></tr>
            </table>
            <div style="background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:20px;white-space:pre-wrap;font-size:15px">${(message||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
          </div></div>`;
        const result = await brevo('/smtp/email', 'POST', {
          sender: { name: 'Créatis Contact', email: 'noreply@creatis.app' },
          to: [{ email: 'creatis.app.contact@gmail.com', name: 'André — Créatis' }],
          replyTo: { email: from || 'noreply@creatis.app', name: nom || 'Utilisateur' },
          subject: `[Contact Créatis] ${sujet || 'Nouveau message'}`,
          htmlContent: html,
        });
        if (result._err) return res.status(502).json({ error: result._msg || result._err });
        return res.status(200).json({ ok: true });
      }

      default:
        return res.status(400).json({ error: `Action inconnue: ${action}` });
    }
  } catch (e) {
    console.error('[email-sequence] Erreur:', e.message);
    return res.status(502).json({ error: e.message });
  }
};
