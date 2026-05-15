/* ===== VERCEL FUNCTION — Prospection automatisée ===== */
/* POST /api/prospect-finder
   Actions: search, send_outreach, post_tweet, post_reddit */

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';
const BREVO_BASE  = 'https://api.brevo.com/v3';
const EMAIL_RE    = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const SKIP_EMAILS = ['example.com', 'gmail.com', 'votreemail', 'youremail', 'email.com'];

/* ---- YouTube helpers ---- */
async function ytGet(path, params) {
  const key = (process.env.YOUTUBE_API_KEY || '').trim();
  if (!key) return { _err: 'no_yt_key' };
  const url = new URL(`${YOUTUBE_API}${path}`);
  Object.entries({ ...params, key }).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return { _err: `http_${res.status}` };
    return await res.json();
  } catch (e) { return { _err: e.message }; }
}

/* ---- Brevo helpers ---- */
async function brevoCall(path, method = 'POST', body) {
  const key = (process.env.BREVO_API_KEY || '').trim();
  if (!key) return { _err: 'no_brevo_key' };
  try {
    const res = await fetch(`${BREVO_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'api-key': key },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) return { _err: `http_${res.status}` };
    return res.status === 204 ? {} : await res.json().catch(() => ({}));
  } catch (e) { return { _err: e.message }; }
}

function extractEmail(text) {
  const found = (text || '').match(EMAIL_RE) || [];
  return found.find(e => !SKIP_EMAILS.some(skip => e.includes(skip))) || null;
}

function formatAbonnes(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

module.exports = async (req, res) => {
  const APP_URL = (process.env.APP_URL || 'https://creatis.app').trim();
  res.setHeader('Access-Control-Allow-Origin', APP_URL);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { action, ...params } = req.body || {};

  /* ================================================================
   * SEARCH — cherche des chaînes YouTube FR par mot-clé
   * ================================================================ */
  if (action === 'search') {
    const { keyword = 'créateur youtube france', maxResults = 30, minAbonnes = 500, maxAbonnes = 0 } = params;

    const searchData = await ytGet('/search', {
      part: 'snippet',
      type: 'channel',
      q: keyword,
      relevanceLanguage: 'fr',
      regionCode: 'FR',
      maxResults: Math.min(parseInt(maxResults) || 30, 50),
      order: 'relevance'
    });

    if (searchData._err) {
      return res.status(200).json({ ok: false, channels: [], error: searchData._err });
    }

    const channelIds = (searchData.items || [])
      .map(i => i.id?.channelId).filter(Boolean).join(',');

    if (!channelIds) return res.status(200).json({ ok: true, channels: [] });

    const details = await ytGet('/channels', {
      part: 'snippet,statistics,brandingSettings',
      id: channelIds
    });

    const channels = (details.items || []).map(ch => {
      const desc = ch.snippet?.description || '';
      const branding = ch.brandingSettings?.channel?.description || '';
      const email = extractEmail(desc) || extractEmail(branding);
      const abonnes = parseInt(ch.statistics?.subscriberCount || 0);

      return {
        id: ch.id,
        nom: ch.snippet?.title || '',
        description: desc.substring(0, 300),
        email,
        abonnes,
        abonnesFormat: formatAbonnes(abonnes),
        videos: parseInt(ch.statistics?.videoCount || 0),
        avatar: ch.snippet?.thumbnails?.medium?.url || '',
        url: ch.snippet?.customUrl
          ? `https://youtube.com/${ch.snippet.customUrl}`
          : `https://youtube.com/channel/${ch.id}`
      };
    }).filter(ch => {
      const min = parseInt(minAbonnes) || 500;
      const max = parseInt(maxAbonnes) || 0;
      return ch.abonnes >= min && (max === 0 || ch.abonnes <= max);
    }).sort((a, b) => b.abonnes - a.abonnes);

    return res.status(200).json({ ok: true, channels, total: channels.length });
  }

  /* ================================================================
   * SEND_OUTREACH — ajoute à Brevo + envoie email de prospection
   * ================================================================ */
  if (action === 'send_outreach') {
    const { channel } = params;
    if (!channel?.email) return res.status(400).json({ error: 'email manquant' });

    await brevoCall('/contacts', 'POST', {
      email: channel.email,
      attributes: {
        PRENOM: channel.nom,
        SOURCE: 'youtube_prospection_auto',
        CHAINE_NOM: channel.nom,
        ABONNES: channel.abonnes || 0,
        DATE_CONTACT: new Date().toISOString().split('T')[0],
        PAYS: 'FR'
      },
      listIds: [6],
      updateEnabled: true
    });

    const subject = `${channel.nom} — un outil pour préparer tes vidéos YouTube en 30s`;
    const htmlContent = `<div style="font-family:sans-serif;max-width:600px;margin:auto;background:#ffffff;padding:32px;border-radius:12px;color:#111">
      <p style="margin-top:0">Bonjour,</p>
      <p>J'ai découvert ta chaîne YouTube (${channel.abonnesFormat} abonnés) — beau travail.</p>
      <p>Je viens de lancer <strong>Créatis</strong>, un outil pour les créateurs YouTube francophones. En 30 secondes à partir d'un sujet, il génère :</p>
      <ul style="line-height:2.2;padding-left:20px">
        <li>5 titres optimisés pour le CTR</li>
        <li>Un script complet avec timecodes</li>
        <li>La description SEO + 30 tags</li>
        <li>Une miniature générée par IA</li>
      </ul>
      <p>Tout est calibré pour YouTube FR. Pas de prompt à écrire. Différent de ChatGPT parce que c'est fait uniquement pour le workflow d'un créateur.</p>
      <a href="${APP_URL}" style="display:inline-block;background:#10b981;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:16px 0">Essayer gratuitement (50 générations) →</a>
      <p style="color:#888;font-size:13px">Si ça ne t'intéresse pas, c'est le seul email que tu recevras de ma part.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#aaa;font-size:12px;margin:0">Créatis · <a href="${APP_URL}" style="color:#10b981">creatis.app</a> · <a href="mailto:contact@creatis.app" style="color:#10b981">contact@creatis.app</a></p>
    </div>`;

    const result = await brevoCall('/smtp/email', 'POST', {
      to: [{ email: channel.email, name: channel.nom }],
      subject,
      htmlContent,
      sender: { name: 'Créatis', email: 'contact@creatis.app' }
    });

    return res.status(200).json({ ok: !result._err });
  }

  /* ================================================================
   * SEND_OUTREACH_BULK — envoie à tous les channels avec email
   * ================================================================ */
  if (action === 'send_outreach_bulk') {
    const { channels = [] } = params;
    const withEmail = channels.filter(c => c.email);
    let sent = 0, errors = 0;

    for (const ch of withEmail) {
      try {
        const fakeReq = { body: { action: 'send_outreach', channel: ch }, method: 'POST' };
        // Direct call
        await brevoCall('/contacts', 'POST', {
          email: ch.email,
          attributes: { PRENOM: ch.nom, SOURCE: 'youtube_prospection_auto', CHAINE_NOM: ch.nom, ABONNES: ch.abonnes || 0, DATE_CONTACT: new Date().toISOString().split('T')[0] },
          listIds: [6], updateEnabled: true
        });

        const subject = `${ch.nom} — un outil pour préparer tes vidéos YouTube en 30s`;
        const htmlContent = `<div style="font-family:sans-serif;max-width:600px;margin:auto;background:#fff;padding:32px;color:#111">
          <p>Bonjour,</p><p>J'ai découvert ta chaîne (${formatAbonnes(ch.abonnes)} abonnés).</p>
          <p>Je viens de lancer <strong>Créatis</strong> — en 30s depuis un sujet il génère titres, script, SEO et miniature IA pour YouTube FR.</p>
          <a href="${APP_URL}" style="display:inline-block;background:#10b981;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0">Essayer gratuitement →</a>
          <p style="color:#aaa;font-size:12px">Créatis · ${APP_URL}</p>
        </div>`;

        const r = await brevoCall('/smtp/email', 'POST', {
          to: [{ email: ch.email, name: ch.nom }], subject, htmlContent,
          sender: { name: 'Créatis', email: 'contact@creatis.app' }
        });
        if (!r._err) sent++; else errors++;
        await new Promise(r => setTimeout(r, 200));
      } catch { errors++; }
    }

    return res.status(200).json({ ok: true, sent, errors, total: withEmail.length });
  }

  /* ================================================================
   * POST_TWEET — publie un tweet depuis le compte Créatis
   * ================================================================ */
  if (action === 'post_tweet') {
    const { text } = params;
    const apiKey     = (process.env.TWITTER_API_KEY || '').trim();
    const apiSecret  = (process.env.TWITTER_API_SECRET || '').trim();
    const accToken   = (process.env.TWITTER_ACCESS_TOKEN || '').trim();
    const accSecret  = (process.env.TWITTER_ACCESS_SECRET || '').trim();

    if (!apiKey || !accToken) {
      return res.status(200).json({ ok: false, skipped: true, reason: 'TWITTER_API_KEY non configuré dans Vercel' });
    }

    const crypto = require('crypto');
    const ts    = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const endpoint = 'https://api.twitter.com/2/tweets';

    const oauthBase = { oauth_consumer_key: apiKey, oauth_nonce: nonce, oauth_signature_method: 'HMAC-SHA1', oauth_timestamp: ts, oauth_token: accToken, oauth_version: '1.0' };
    const baseStr   = 'POST&' + encodeURIComponent(endpoint) + '&' + encodeURIComponent(Object.entries(oauthBase).sort().map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&'));
    const sigKey    = encodeURIComponent(apiSecret) + '&' + encodeURIComponent(accSecret);
    const sig       = crypto.createHmac('sha1', sigKey).update(baseStr).digest('base64');

    const authHeader = 'OAuth ' + Object.entries({ ...oauthBase, oauth_signature: sig }).map(([k, v]) => `${k}="${encodeURIComponent(v)}"`).join(', ');

    try {
      const tRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ text })
      });
      const tData = await tRes.json();
      return res.status(200).json({ ok: tRes.ok, tweetId: tData?.data?.id, error: tData?.title });
    } catch (e) {
      return res.status(200).json({ ok: false, error: e.message });
    }
  }

  /* ================================================================
   * POST_REDDIT — publie dans un subreddit
   * ================================================================ */
  if (action === 'post_reddit') {
    const { subreddit, title, text } = params;
    const clientId     = (process.env.REDDIT_CLIENT_ID || '').trim();
    const clientSecret = (process.env.REDDIT_CLIENT_SECRET || '').trim();
    const username     = (process.env.REDDIT_USERNAME || '').trim();
    const password     = (process.env.REDDIT_PASSWORD || '').trim();

    if (!clientId || !username) {
      return res.status(200).json({ ok: false, skipped: true, reason: 'REDDIT_CLIENT_ID non configuré dans Vercel' });
    }

    try {
      const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': `Creatis/1.0 by ${username}`
        },
        body: `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
      });

      if (!tokenRes.ok) return res.status(200).json({ ok: false, reason: 'Reddit auth échouée' });
      const { access_token } = await tokenRes.json();

      const submitRes = await fetch('https://oauth.reddit.com/api/submit', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': `Creatis/1.0 by ${username}`
        },
        body: new URLSearchParams({ sr: subreddit, kind: 'self', title, text, resubmit: 'true', nsfw: 'false' }).toString()
      });

      const sData = await submitRes.json();
      const url   = sData?.jquery?.find?.(a => Array.isArray(a) && a[0] === 10)?.[3]?.[0] || null;
      return res.status(200).json({ ok: submitRes.ok, url });
    } catch (e) {
      return res.status(200).json({ ok: false, error: e.message });
    }
  }

  return res.status(400).json({ error: `Action inconnue: ${action}` });
};
