/* ===== VERCEL FUNCTION — Prospection automatisée ===== */
/* POST /api/prospect-finder
   Actions: search, send_outreach, post_tweet, post_reddit,
            tiktok_list, tiktok_batch, tiktok_send, tiktok_add */

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';
const BREVO_BASE  = 'https://api.brevo.com/v3';
const SUPA_BASE   = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
const EMAIL_RE    = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const SKIP_EMAILS = ['example.com', 'gmail.com', 'votreemail', 'youremail', 'email.com'];

/* --- TikTok micro-créateurs FR niche IA/Tech — 1k-10k followers --- */
const TIKTOK_CREATORS = [
  { handle: '@alexia.ia',          name: 'Alexia',   sujet: 'IA pour débutants',              followers: 4200, email: null },
  { handle: '@techbylouis',        name: 'Louis',    sujet: 'outils IA productivité',         followers: 7800, email: null },
  { handle: '@createur.numerique', name: 'Karim',    sujet: 'YouTube et réseaux sociaux',     followers: 3500, email: null },
  { handle: '@nocodenadia',        name: 'Nadia',    sujet: 'automatisation nocode',          followers: 6100, email: null },
  { handle: '@maxime.content',     name: 'Maxime',   sujet: 'création de contenu IA',         followers: 2900, email: null },
  { handle: '@iatutos.fr',         name: 'Théo',     sujet: 'tutoriels ChatGPT',              followers: 8400, email: null },
  { handle: '@laetitia.youtube',   name: 'Laetitia', sujet: 'croissance YouTube',             followers: 5200, email: null },
  { handle: '@promptmaster.fr',    name: 'Romain',   sujet: 'prompt engineering',             followers: 3800, email: null },
  { handle: '@ia.quotidien',       name: 'Sarah',    sujet: 'IA au quotidien',                followers: 9200, email: null },
  { handle: '@digitalmika',        name: 'Mika',     sujet: 'marketing digital et IA',        followers: 4700, email: null },
  { handle: '@youtube.secrets',    name: 'Julien',   sujet: 'algorithme et SEO YouTube',      followers: 6600, email: null },
  { handle: '@chatgpt.tips.fr',    name: 'Emma',     sujet: 'astuces ChatGPT',                followers: 7100, email: null },
  { handle: '@indie.hacker.fr',    name: 'Baptiste', sujet: 'indie hacking et IA',            followers: 2200, email: null },
  { handle: '@studiovia',          name: 'Camille',  sujet: "créer avec l'IA",                followers: 5900, email: null },
  { handle: '@techcreateur',       name: 'Antoine',  sujet: 'tech pour créateurs',            followers: 3300, email: null },
  { handle: '@aitools.fr',         name: 'Sophie',   sujet: 'top outils IA du mois',          followers: 8800, email: null },
  { handle: '@vincent.contenu',    name: 'Vincent',  sujet: 'monétiser sa chaîne YouTube',    followers: 4100, email: null },
  { handle: '@cloetiktok',         name: 'Chloé',    sujet: 'TikTok et IA créatifs',          followers: 6400, email: null },
  { handle: '@iadesk',             name: 'Lucas',    sujet: 'workspace productivité IA',      followers: 3000, email: null },
  { handle: '@mael.creator',       name: 'Maël',     sujet: "créer une audience avec l'IA",   followers: 7500, email: null },
];

function buildTikTokMsg(creator) {
  const html = `<div style="font-family:sans-serif;max-width:480px;color:#1a1a1a;line-height:1.8">
  <p>Salut ${creator.name} 👋</p>
  <p>J'ai vu tes vidéos sur ${creator.sujet} — vraiment cool ce que tu fais.</p>
  <p>Je lance <strong>Créatis</strong>, un outil IA pour créateurs YouTube FR. Script complet + miniature en 30 secondes.</p>
  <p>Programme affilié : <strong>30% récurrent à vie</strong>. Chaque abonné que tu amènes = <strong>5,70€/mois</strong> pour toi, sans fin. Pas d'audience minimale.</p>
  <p>Intéressé(e) ? Réponds juste à cet email, je t'envoie tout.</p>
  <p style="margin-top:24px">André<br><a href="https://creatis.app/affiliation" style="color:#10b981">creatis.app/affiliation</a></p>
</div>`;
  return {
    subject: `${creator.name} — collab affilié 30% récurrent ?`,
    html
  };
}

async function supaGet(table, filter = '') {
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (!SUPA_BASE || !key) return null;
  try {
    const r = await fetch(`${SUPA_BASE}/rest/v1/${table}?${filter}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

async function supaUpsert(table, data) {
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (!SUPA_BASE || !key) return false;
  try {
    const r = await fetch(`${SUPA_BASE}/rest/v1/${table}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(data)
    });
    return r.ok;
  } catch { return false; }
}

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  /* ================================================================
   * GET /api/prospect-finder?action=stats — tableau de bord chiffres
   * ================================================================ */
  if (req.method === 'GET' && req.query?.action === 'stats') {
    const secret = process.env.CRON_SECRET || '';
    const auth   = (req.headers['authorization'] || '').replace('Bearer ', '');
    if (secret && auth !== secret) return res.status(401).json({ error: 'unauthorized' });

    const supaKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
    if (!SUPA_BASE || !supaKey) return res.status(500).json({ error: 'supabase non configuré' });

    const h = { apikey: supaKey, Authorization: `Bearer ${supaKey}` };

    async function fetchAll(table, qs = '') {
      const url = `${SUPA_BASE}/rest/v1/${table}?select=*&limit=500${qs ? '&' + qs : ''}`;
      const r = await fetch(url, { headers: h });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error(`${table} ${r.status}: ${t.slice(0, 100)}`);
      }
      return r.json();
    }

    let allUsers, allGens, allProspects, allTiktok, fetchError;
    try {
      [allUsers, allGens, allProspects, allTiktok] = await Promise.all([
        fetchAll('users'),
        fetchAll('generations'),
        fetchAll('prospects_contacted'),
        fetchAll('tiktok_outreach', 'status=eq.sent'),
      ]);
    } catch (e) {
      fetchError = e.message;
      allUsers = allGens = allProspects = allTiktok = [];
    }

    const users = Array.isArray(allUsers) ? allUsers : [];
    const proUsers = users.filter(u => u.plan === 'pro').length;
    const studioUsers = users.filter(u => u.plan === 'studio').length;

    return res.status(200).json({
      users: { total: users.length, pro: proUsers, studio: studioUsers, gratuit: users.length - proUsers - studioUsers },
      generations: Array.isArray(allGens) ? allGens.length : 0,
      prospects_youtube_contacted: Array.isArray(allProspects) ? allProspects.length : 0,
      tiktok_outreach_sent: Array.isArray(allTiktok) ? allTiktok.length : 0,
      ...(fetchError ? { _error: fetchError } : {}),
    });
  }

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
    return res.status(503).json({ error: 'Envoi emails désactivé', disabled: true });
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
    return res.status(503).json({ error: 'Envoi emails désactivé', disabled: true });
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

  /* ================================================================
   * TIKTOK_LIST — liste des micro-créateurs TikTok + statuts
   * ================================================================ */
  if (action === 'tiktok_list') {
    const rows = await supaGet('tiktok_outreach', 'select=handle,status,sent_at') || [];
    const statusMap = {};
    if (Array.isArray(rows)) rows.forEach(r => { statusMap[r.handle] = r; });
    const list = TIKTOK_CREATORS.map(c => ({
      ...c,
      status: statusMap[c.handle]?.status || 'pending',
      sent_at: statusMap[c.handle]?.sent_at || null,
      can_email: !!c.email
    }));
    return res.status(200).json({ total: list.length, list });
  }

  /* ================================================================
   * TIKTOK_BATCH — envoyer à tous les pending avec email
   * ================================================================ */
  if (action === 'tiktok_batch') {
    const secret = process.env.CRON_SECRET || '';
    const auth   = (req.headers['authorization'] || '').replace('Bearer ', '');
    if (secret && auth !== secret) return res.status(401).json({ error: 'unauthorized' });

    const rows = await supaGet('tiktok_outreach', 'select=handle,status') || [];
    const done = new Set(Array.isArray(rows) ? rows.filter(r => r.status === 'sent').map(r => r.handle) : []);
    const pending = TIKTOK_CREATORS.filter(c => c.email && !done.has(c.handle));
    const results = [];

    for (const creator of pending) {
      const msg = buildTikTokMsg(creator);
      await brevoCall('/contacts', 'POST', {
        email: creator.email,
        attributes: { PRENOM: creator.name, SOURCE: 'tiktok-outreach', TIKTOK_HANDLE: creator.handle },
        listIds: [parseInt(process.env.BREVO_LIST_AFFILIATION || '4', 10)],
        updateEnabled: true
      });
      const r = await brevoCall('/smtp/email', 'POST', {
        sender: { name: 'André — Créatis', email: 'contact@creatis.app' },
        to: [{ email: creator.email, name: creator.name }],
        subject: msg.subject, htmlContent: msg.html, tags: ['tiktok-outreach']
      });
      const ok = !r._err;
      await supaUpsert('tiktok_outreach', {
        handle: creator.handle, name: creator.name, email: creator.email,
        followers: creator.followers, status: ok ? 'sent' : 'error',
        sent_at: ok ? new Date().toISOString() : null, error: ok ? null : r._err
      });
      results.push({ handle: creator.handle, ok, reason: r._err || null });
    }
    const no_email = TIKTOK_CREATORS.filter(c => !c.email && !done.has(c.handle));
    return res.status(200).json({
      sent: results.filter(r => r.ok).length,
      errors: results.filter(r => !r.ok).length,
      manual_dm_needed: no_email.length,
      results,
      manual_dm: no_email.map(c => c.handle)
    });
  }

  /* ================================================================
   * TIKTOK_SEND — envoyer à 1 créateur TikTok
   * ================================================================ */
  if (action === 'tiktok_send') {
    return res.status(503).json({ error: 'Envoi emails désactivé', disabled: true });
    const { handle } = params;
    const creator = TIKTOK_CREATORS.find(c => c.handle === handle);
    if (!creator) return res.status(404).json({ error: 'creator not found' });
    if (!creator.email) return res.status(400).json({ error: 'no email', dm_needed: true });

    const msg = buildTikTokMsg(creator);
    const r = await brevoCall('/smtp/email', 'POST', {
      sender: { name: 'André — Créatis', email: 'contact@creatis.app' },
      to: [{ email: creator.email, name: creator.name }],
      subject: msg.subject, htmlContent: msg.html, tags: ['tiktok-outreach']
    });
    const ok = !r._err;
    await supaUpsert('tiktok_outreach', {
      handle: creator.handle, name: creator.name, email: creator.email,
      followers: creator.followers, status: ok ? 'sent' : 'error',
      sent_at: ok ? new Date().toISOString() : null
    });
    return res.status(200).json({ handle, ok, reason: r._err || null });
  }

  /* ================================================================
   * AFFILIATE_YOUTUBE — envoie le message affilié aux prospects YT
   * Récupère les contacts Brevo liste 6 + envoie email affilié
   * ================================================================ */
  if (action === 'affiliate_youtube') {
    const secret = process.env.CRON_SECRET || '';
    const auth   = (req.headers['authorization'] || '').replace('Bearer ', '');
    if (secret && auth !== secret) return res.status(401).json({ error: 'unauthorized' });

    const brevoKey = (process.env.BREVO_API_KEY || '').trim();
    if (!brevoKey) return res.status(500).json({ error: 'no_brevo_key' });

    const listId = parseInt(params.listId || '6', 10);
    let allContacts = [];
    let offset = 0;
    const limit = 500;

    // Paginer tous les contacts de la liste
    while (true) {
      const r = await fetch(`${BREVO_BASE}/contacts?listId=${listId}&limit=${limit}&offset=${offset}&sort=desc`, {
        headers: { 'api-key': brevoKey }
      });
      if (!r.ok) break;
      const data = await r.json();
      const contacts = data.contacts || [];
      allContacts = allContacts.concat(contacts);
      if (contacts.length < limit) break;
      offset += limit;
    }

    if (!allContacts.length) {
      return res.status(200).json({ ok: true, sent: 0, message: 'Aucun contact dans la liste' });
    }

    let sent = 0, errors = 0, skipped = 0;

    for (const contact of allContacts) {
      const email = contact.email;
      if (!email) { skipped++; continue; }

      // Vérifier si déjà tagué affiliate-sent
      const tags = contact.attributes?.TAGS || '';
      if (typeof tags === 'string' && tags.includes('affiliate-sent')) { skipped++; continue; }

      const prenom = contact.attributes?.PRENOM || contact.attributes?.NOM || email.split('@')[0];
      const abonnes = contact.attributes?.ABONNES ? `${contact.attributes.ABONNES} abonnés` : '';

      const htmlContent = `<div style="font-family:sans-serif;max-width:480px;color:#1a1a1a;line-height:1.8">
  <p>Salut ${prenom} 👋</p>
  <p>On s'est déjà croisé — je t'avais parlé de Créatis, l'outil IA pour créateurs YouTube FR${abonnes ? ` (ta chaîne : ${abonnes})` : ''}.</p>
  <p>Cette fois j'ai une autre proposition : <strong>le programme affilié</strong>.</p>
  <p>Si tu parles de Créatis à ton audience (YouTube, TikTok, newsletter — peu importe), tu touches <strong>30% récurrent à vie</strong> sur chaque abonné Pro que tu amènes. Soit <strong>5,70€/mois par abonné</strong>, sans limite de durée.</p>
  <p>10 abonnés = 57€/mois. 50 abonnés = 285€/mois. Passif.</p>
  <p>Ton lien affilié personnalisé : <a href="https://creatis.app/affiliation" style="color:#10b981;font-weight:bold">creatis.app/affiliation</a></p>
  <p>Réponds à cet email si tu veux qu'on en parle.</p>
  <p style="margin-top:24px">André<br><span style="color:#888;font-size:13px">Fondateur · creatis.app</span></p>
</div>`;

      const r = await fetch(`${BREVO_BASE}/smtp/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': brevoKey },
        body: JSON.stringify({
          to: [{ email, name: prenom }],
          subject: `${prenom} — programme affilié Créatis (30% récurrent à vie)`,
          sender: { name: 'André — Créatis', email: 'contact@creatis.app' },
          htmlContent,
          tags: ['affiliate-youtube']
        })
      }).catch(() => null);

      if (r?.ok) sent++; else errors++;
      await new Promise(r => setTimeout(r, 150));
    }

    return res.status(200).json({ ok: true, sent, errors, skipped, total: allContacts.length });
  }


  /* ================================================================
   * TIKTOK_CAMPAIGN — emails affilié/produit aux TikTokeurs scrapés
   * ================================================================ */
  if (action === 'tiktok_campaign') {
    const secret = process.env.CRON_SECRET || '';
    const auth   = (req.headers['authorization'] || '').replace('Bearer ', '');
    if (secret && auth !== secret) return res.status(401).json({ error: 'unauthorized' });

    const brevoKey = (process.env.BREVO_API_KEY || '').trim();
    if (!brevoKey) return res.status(500).json({ error: 'no_brevo_key' });

    const FR_HASHTAGS = new Set(['conseilsyoutube','youtubeurfr','devenirYouTubeur','monetisationyoutube','youtubestrategie','vlogfr','gamingfr','podcastfr','entrepreneurfr','creationdecontenu','intelligenceartificielle','chatgptfrancais','iacontenu']);

    const CAMPAIGN = [
  {
    "handle": "@atheeflyest",
    "email": "theeflyestcollab@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@les_vlogs_de_roro",
    "email": "vlogderoro.collab@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@lilisuperbelle",
    "email": "lilibelle@foll-ow.com",
    "cat": "affiliation"
  },
  {
    "handle": "@loladornn",
    "email": "lola.management@mademoisellesoph.fr",
    "cat": "affiliation"
  },
  {
    "handle": "@artsofzhara",
    "email": "knowziggy@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@lolanannas_",
    "email": "hello@lolanannas.com",
    "cat": "affiliation"
  },
  {
    "handle": "@21.nesrine_",
    "email": "nesrine21_pro@hotmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@jimmy_laura_astuces",
    "email": "jimmy@expandia.io",
    "cat": "affiliation"
  },
  {
    "handle": "@tripswitheva",
    "email": "tripswitheva@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@jiji.irl",
    "email": "jijidesao@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@gabzer.mp4",
    "email": "contactgabzer@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@sabah.daily",
    "email": "sabahcontent@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@dozy.doz8",
    "email": "dozydoz31@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@juliette_bsnn",
    "email": "juliettebsnpro@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@amel_ioration",
    "email": "amel@gisele-paris.fr",
    "cat": "affiliation"
  },
  {
    "handle": "@khironi.astuce",
    "email": "contact.khironi@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@verbozz_",
    "email": "contact@verbozz.com",
    "cat": "affiliation"
  },
  {
    "handle": "@angelinaaa.rd",
    "email": "angelina.ard75@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@_tasnim.sk",
    "email": "souikitasnim.pro@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@bianje__",
    "email": "kabedesign.pro@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@yyov7",
    "email": "yyovdisiz@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@negreraffine1",
    "email": "nrtech221@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@guillaumeetkim_off",
    "email": "guillaumeetkim@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@oeil_numerique",
    "email": "numerique.contact@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@anyme023",
    "email": "anym@essor.ovh",
    "cat": "affiliation"
  },
  {
    "handle": "@hadja.lms",
    "email": "-hadjab.contact@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@albanquiz",
    "email": "albanquiz.pro@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@julsalright",
    "email": "juliapntr23@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@nathann_quiz",
    "email": "nathanonirl@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@inaya.abh0",
    "email": "inayacasting@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@th0mas_brs",
    "email": "thomasprtk@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@edgareact",
    "email": "edgareactpro@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@zervec_",
    "email": "contactzervec@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@monsieur_top",
    "email": "le.top.10@hotmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@byilhann",
    "email": "byilhan.contact@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@jacksons_ontop",
    "email": "collab.jacksons@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@kaatsup",
    "email": "kaatsup.collab@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@emmagraziano_",
    "email": "emmagraziano.pro@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@theagstiktok",
    "email": "theagsnpro@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@pidiyt",
    "email": "pidimeg.yt@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@cossi_tiktok",
    "email": "cossiyt.pro@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@soweeeto",
    "email": "sowetodpro@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@nihad_sdt",
    "email": "nihad.sdt@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@.kuddlez",
    "email": "kuddlezdocu@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@elriroberts_",
    "email": "elrirobertsbusiness@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@e_pakhohh",
    "email": "pakhoht@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@mnlhere",
    "email": "mnlherebox@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@ellodieelld",
    "email": "ellodietoua@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@charlinecherry",
    "email": "charlinecherryshorizons@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@shn00ki",
    "email": "nicole@embrtalent.com",
    "cat": "affiliation"
  },
  {
    "handle": "@evanv_77",
    "email": "evanvcollab@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@yzylereel",
    "email": "yzylereelpro@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@seyma_ytb",
    "email": "ytbseyma@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@shinto_sb",
    "email": "serineshinto@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@isabellal4i",
    "email": "isabellapartner67@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@vihau_ytb27",
    "email": "vihauvictoire@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@nirvatech.clo",
    "email": "contact@nirvatechies.com",
    "cat": "affiliation"
  },
  {
    "handle": "@ryn_ytb5",
    "email": "rynytb06@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@gio_off",
    "email": "giogiotiktok@icloud.com",
    "cat": "affiliation"
  },
  {
    "handle": "@sunkiste_l",
    "email": "laurie.crstp@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@elina_bllc",
    "email": "elina.bellec@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@jow7715",
    "email": "jonathanake.ugc@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@maisnannncestpasdsr",
    "email": "desireehrts8@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@lina_lamaline",
    "email": "klina.lamaline@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@nataliewtlee80",
    "email": "nataliewtunglee@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@regelegorila1",
    "email": "regelegorilacontact@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@yosheez",
    "email": "contact@yosheez.com",
    "cat": "affiliation"
  },
  {
    "handle": "@limmigreparisien",
    "email": "contactprolip@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@orpatchy",
    "email": "hi@georgedun.net",
    "cat": "affiliation"
  },
  {
    "handle": "@missdarkito.ytb",
    "email": "missdarkito@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@quentingrd",
    "email": "quentingiraudstjacques@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@casstonic",
    "email": "cassandreytb@outlook.fr",
    "cat": "affiliation"
  },
  {
    "handle": "@kieara.celina",
    "email": "kfrancisugc@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@bohdan.youtube",
    "email": "bohdan.chernenko@outlook.com",
    "cat": "affiliation"
  },
  {
    "handle": "@maryanndollars",
    "email": "maryannike74@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@briannafornes_",
    "email": "collaborate@briannafornes.com",
    "cat": "affiliation"
  },
  {
    "handle": "@paularoloye",
    "email": "paularoloye@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@leaztequeoff",
    "email": "lea@comtubrilles.com",
    "cat": "affiliation"
  },
  {
    "handle": "@dailyclips_333",
    "email": "quicktrend.ger@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@quarter.elh",
    "email": "quarter@expandia.io",
    "cat": "affiliation"
  },
  {
    "handle": "@redditaddic",
    "email": "redditaddic@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@maxime.astuces",
    "email": "partenariat@maxime-astuces.fr",
    "cat": "affiliation"
  },
  {
    "handle": "@dani.cinema",
    "email": "dani.cinema@initcreator.com",
    "cat": "affiliation"
  },
  {
    "handle": "@creationsinguliere",
    "email": "nolan.chretien@creationsinguliere.com",
    "cat": "affiliation"
  },
  {
    "handle": "@saratopo_",
    "email": "contact@saratopo.com",
    "cat": "affiliation"
  },
  {
    "handle": "@guillaumepley",
    "email": "guillaumepleypro@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@matheusgen",
    "email": "contact@matheusgen.com",
    "cat": "affiliation"
  },
  {
    "handle": "@doctor.anesthesia",
    "email": "le.medecin.anesthesiste@laperledigitale.fr",
    "cat": "affiliation"
  },
  {
    "handle": "@viralvibes.ia",
    "email": "viralvibesia@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@iamsammieai",
    "email": "collabs-iamsammieai@outlook.com",
    "cat": "affiliation"
  },
  {
    "handle": "@leodeep",
    "email": "leodeep.contact@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@z1000k_ai",
    "email": "deepdish22@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@kaislegg1",
    "email": "m23800572@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@misterneilyt",
    "email": "neil.contact00@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@natha_nael_r",
    "email": "natha444nael@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@jltomy",
    "email": "contact@jltomy.com",
    "cat": "affiliation"
  },
  {
    "handle": "@andoly_",
    "email": "doulboyrama@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@talya..94",
    "email": "talya.ld94@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@lumegpt",
    "email": "vichi977@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "👮‍♂️Enquête",
    "email": "secret",
    "cat": "produit"
  },
  {
    "handle": "@davynimal",
    "email": "davynimal@laposte.net",
    "cat": "affiliation"
  },
  {
    "handle": "@eloiljf",
    "email": "eloiljf@promote.sh",
    "cat": "affiliation"
  },
  {
    "handle": "@graceekitoko",
    "email": "gracekitoko.pro@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@ulyces.co",
    "email": "studio@ulyces.co",
    "cat": "affiliation"
  },
  {
    "handle": "@joruvy_crea",
    "email": "victoireruth30@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@kirxdiaz",
    "email": "hello@kirxdiaz.com",
    "cat": "produit"
  },
  {
    "handle": "@estaslife",
    "email": "esthermmedina03@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@ugc.withrach",
    "email": "hello@ugcwithrach.com",
    "cat": "produit"
  },
  {
    "handle": "@chloesatl",
    "email": "chloesat@outlook.fr",
    "cat": "produit"
  },
  {
    "handle": "@saladpictures_",
    "email": "madelyn@cozydesk.gg",
    "cat": "produit"
  },
  {
    "handle": "@minanovak",
    "email": "contactminanova@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@clara.communication.ugc",
    "email": "contact@cncommunication.fr",
    "cat": "produit"
  },
  {
    "handle": "@lautika",
    "email": "agent.lautika@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@sunnyrayy.jpg",
    "email": "sunnyray.jpg@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@hanaemrs",
    "email": "hanaemrss@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@carlanzb",
    "email": "carlanzb.pro@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@thomasprl_",
    "email": "thomasprl.work@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@_myamm_",
    "email": "myamdiak@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@filmwithalexis",
    "email": "alexismasson.creator@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@lise_favre",
    "email": "lisefavre.collab@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@elena.mih11",
    "email": "heyitselena.11@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@martiale_nt",
    "email": "martiale@irismanagement.fr",
    "cat": "produit"
  },
  {
    "handle": "@faceless.inc.proj",
    "email": "faceless.inc.proj@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@shybratbabie",
    "email": "shykittyxoxoxo@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@navypopoulos",
    "email": "partenariatjohn@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@mswandaxo",
    "email": "ilovechawanda@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@arvzpadilla",
    "email": "arvzpadilla@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@tom_rdg02",
    "email": "tomrodriguez31000@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@astuces.de.tiktok",
    "email": "nadrojoff@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@virtualpau_",
    "email": "pauline.virtualpau@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@hugoarcd",
    "email": "hugoarcd.pro@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@sarah_ast",
    "email": "sarahastorri@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@bemou0",
    "email": "hannahbmt1@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@eloisedufka",
    "email": "contact@eloisedufka.com",
    "cat": "produit"
  },
  {
    "handle": "@juntimes2",
    "email": "juntimes2.contact@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@ctrd65",
    "email": "trd.clea@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@madieplt",
    "email": "hello@madieplt.com",
    "cat": "produit"
  },
  {
    "handle": "@ocnbee",
    "email": "ocn.bee@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@tootiredema",
    "email": "emamog.collab@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@megane_bsn",
    "email": "meganecollab06@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@sophiiezhou",
    "email": "sophie@migosmedia.com",
    "cat": "produit"
  },
  {
    "handle": "@1ukzy",
    "email": "lukzypro@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@madamecoaster",
    "email": "madamecoaster@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@oonlynaya",
    "email": "onlynaya.paris@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@matthieuhochoa",
    "email": "matthieuhochoa@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@mau__asmr",
    "email": "mauasmrpro@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@chachou.core",
    "email": "chachou@amenagence.com",
    "cat": "produit"
  },
  {
    "handle": "@_cl8m_",
    "email": "cl8.meschou@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@hania_ttii",
    "email": "hania.ttii12@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@nrtds_",
    "email": "nrtdsreine@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@monica.yz",
    "email": "barbie.off@icloud.com",
    "cat": "produit"
  },
  {
    "handle": "@angeleaab",
    "email": "angeleaab@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@maeebrun",
    "email": "mae.brun@orange.fr",
    "cat": "produit"
  },
  {
    "handle": "@vahina_brd",
    "email": "vahinabrd@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@msvemma",
    "email": "msvemma02@icloud.com",
    "cat": "produit"
  },
  {
    "handle": "@fitiavaana",
    "email": "fitia.creator@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@lyi7106",
    "email": "lyiana.lifestyle@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@malou_japon",
    "email": "malou.collabb@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@iambrerose",
    "email": "iambrerose@nextchapter.agency",
    "cat": "produit"
  },
  {
    "handle": "@eliseebooks",
    "email": "eliseebooks@agencedesmots.com",
    "cat": "produit"
  },
  {
    "handle": "@graces.talk",
    "email": "gracedree55@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@cam.douaud",
    "email": "camilledouaud04@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@mryv.dm",
    "email": "marieyv.pro@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@yael.pg",
    "email": "yael.pgpro@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@ririkxrimi",
    "email": "rimwork04@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@aleydabs",
    "email": "aleidarosa222@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@maemfrt",
    "email": "mae@graceissey.com",
    "cat": "produit"
  },
  {
    "handle": "@.no.an2",
    "email": "noangornet@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@giray_exe",
    "email": "georges.giray2008@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@lysagl",
    "email": "lysaglpro@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@eloapstl",
    "email": "eloapstl@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@mathousbookshelf",
    "email": "mathousbookshelf@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@maelie3436",
    "email": "maelie3436pro@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@sisters.ss",
    "email": "sana.sisters.ss22@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@melina.gulb",
    "email": "melinaguilbon619@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@mholivia",
    "email": "oliviaa.mhh@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@anissa_tt",
    "email": "anissa.tiktokcollab@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@darkainzer_yt",
    "email": "contactdarkainzer@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@gappouille",
    "email": "gappy.pro9@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@afenishaks333",
    "email": "jennyfer.dzt-pro@outlook.es",
    "cat": "produit"
  },
  {
    "handle": "@naymiplays",
    "email": "naymi.gaming@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@suchakylie",
    "email": "suchkyliepro@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@broocoline_twitch",
    "email": "broocoline@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@zh_vlr",
    "email": "zhvlrpro@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@ryogisama",
    "email": "ryogisamaa@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@aminemp4_",
    "email": "aminereglise1@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@seinalemm",
    "email": "seinalemm@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@theofrnl",
    "email": "contacttheofrnl@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@maxenvr.tv",
    "email": "maxenvr@outlook.com",
    "cat": "produit"
  },
  {
    "handle": "@monsteriak77",
    "email": "monsteriakprod@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@c.polia",
    "email": "polia.yt.pro@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@celiaxsq",
    "email": "celiaxsq@hotmail.com",
    "cat": "produit"
  },
  {
    "handle": "@lebasspov",
    "email": "lebassclip@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@natmor_offi",
    "email": "contact@natmor.fr",
    "cat": "produit"
  },
  {
    "handle": "@onevme_",
    "email": "onevme.pro@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@pinkcorn8",
    "email": "contactpro@pinkcorn.fr",
    "cat": "produit"
  },
  {
    "handle": "@maeline.blh",
    "email": "maelineblhpro@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@icittvabien",
    "email": "icittvabien@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@sogirlyc",
    "email": "sogirlycpro@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@cynthiapled",
    "email": "aihtnycdelp@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@lisapowher",
    "email": "lisa@powherstudio.com",
    "cat": "produit"
  },
  {
    "handle": "@kordelia.ph",
    "email": "kordeliaphan@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@iamluum",
    "email": "iamluum.pro@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@just1.07",
    "email": "just1.07.contact@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@negotium100",
    "email": "negotium100@altragency.eu",
    "cat": "produit"
  },
  {
    "handle": "@mycleaners",
    "email": "mycleaners67@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@sisssyam",
    "email": "siham@irismanagement.fr",
    "cat": "produit"
  },
  {
    "handle": "@sephora.mld",
    "email": "sephoragracepro@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@sultanandceos",
    "email": "omarsultan@sultanandceos.com",
    "cat": "produit"
  },
  {
    "handle": "@manon.bian",
    "email": "manon.onlypro@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@avner_26",
    "email": "collabavner26@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@anais.ksla",
    "email": "anaiskmarketing@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@faon.x.0",
    "email": "hmcreator.business@proton.me",
    "cat": "produit"
  },
  {
    "handle": "@christopher_successful",
    "email": "christopher.ncagency@gmail.com",
    "cat": "produit"
  },
  {
    "handle": "@y0129k",
    "email": "yuri@fromatoztalent.com",
    "cat": "affiliation"
  },
  {
    "handle": "@allison.baek",
    "email": "allison.baek@thestation.io",
    "cat": "affiliation"
  },
  {
    "handle": "@chaymalogs",
    "email": "chayma@pagermgmt.com",
    "cat": "affiliation"
  },
  {
    "handle": "@amanda.nak",
    "email": "amandanakanobusiness@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@bigbeefwelly",
    "email": "wellingtontaruvinga888@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@thesamanthajd",
    "email": "hello@sociallysamantha.com",
    "cat": "affiliation"
  },
  {
    "handle": "workflows",
    "email": "ads",
    "cat": "produit"
  },
  {
    "handle": "@tess.barclay",
    "email": "tess@busyblooming.ca",
    "cat": "affiliation"
  },
  {
    "handle": "@itsthejadeplant",
    "email": "contact.thejadeplant@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@zoeunlimited",
    "email": "contact@zunlimited.co",
    "cat": "affiliation"
  },
  {
    "handle": "@twayne300",
    "email": "booking@twayne.com",
    "cat": "affiliation"
  },
  {
    "handle": "@thetoniaffect",
    "email": "collabs@thetoniaffect.com",
    "cat": "affiliation"
  },
  {
    "handle": "@misscuddy",
    "email": "missscuddy@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@tichina.marie",
    "email": "chinamariebusiness@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@modupe_falade",
    "email": "hellomo.falade03@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@haydarharry",
    "email": "haydarharry1@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@stridahsangels",
    "email": "stridahsangels1@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@cursivewind",
    "email": "collabs@maneagency.com",
    "cat": "affiliation"
  },
  {
    "handle": "@liv.social",
    "email": "livsocialhelp@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@techybhai_",
    "email": "alithegreat013@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@k8lynnsparby",
    "email": "kaitlynnsparby@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@angelinakhang",
    "email": "akhang810@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@jmavmedia",
    "email": "maverikmediaco@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@ray_fu",
    "email": "hello@raycfu.com",
    "cat": "affiliation"
  },
  {
    "handle": "@paula.inreallife",
    "email": "trulypaulabrand@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@bravetech.ai",
    "email": "thiago@graytalent.co.uk",
    "cat": "affiliation"
  },
  {
    "handle": "@setupspawn",
    "email": "setupspawn@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@ameerahtomi",
    "email": "ameerahtomi@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@sydneynicoleugc",
    "email": "sydney@mohnimakerugc.com",
    "cat": "affiliation"
  },
  {
    "handle": "@okaynotts",
    "email": "nothilemm@outlook.com",
    "cat": "affiliation"
  },
  {
    "handle": "@luzminellysocial",
    "email": "luzminellysocial@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@theblessingholyfield",
    "email": "write2ed.bliss@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@iphopad_",
    "email": "team.iphopad0@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@bakanekoz",
    "email": "bakatech@goldeninfluence.com",
    "cat": "affiliation"
  },
  {
    "handle": "@nathan_nrgt",
    "email": "contact@nathaan.me",
    "cat": "affiliation"
  },
  {
    "handle": "@ummmfox",
    "email": "ummmfoxllc@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@christelleangelexo",
    "email": "thatgirlchristelle@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@vaibhavv.ai",
    "email": "vbharts@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@thevanessakay",
    "email": "vanessabucknor@icloud.com",
    "cat": "affiliation"
  },
  {
    "handle": "@lopeztips",
    "email": "lopeztips534@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@kxleesky",
    "email": "kxleeskybusiness@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@drpc_officiel",
    "email": "contactdrpc001@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@vibewithnene",
    "email": "thehiddengemsco1@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@getriccardo",
    "email": "info@getriccardo.com",
    "cat": "affiliation"
  },
  {
    "handle": "@tyeisha.shardae",
    "email": "tyeishashardae@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@julia.huynh",
    "email": "juliachuynh@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@destiny.cazeau",
    "email": "destinycazbusiness@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@shortyshayla_",
    "email": "surelyshayla@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@astonemmm",
    "email": "astonemonline@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@may0kun1",
    "email": "wealthymayo@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@neliabedilia_",
    "email": "neliabedilia@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@itsmodernmillie",
    "email": "collab@itsmodernmillie.com",
    "cat": "affiliation"
  },
  {
    "handle": "@jrenee19_",
    "email": "jordanrenner00@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@kratoss.ia",
    "email": "kratoss.ia22@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@natefredetee",
    "email": "natefredettehorror@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@michelleelizal",
    "email": "michelleelizal@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@mycie.violett",
    "email": "mycie.violett@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@grownwomaninababytee_",
    "email": "grwm.in.a.baby.tee@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@nicolelaeno",
    "email": "nicolelaenoteam@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@lucie_baker",
    "email": "luciecamillabaker@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@hallo.alyssa",
    "email": "camsalyssa10@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@damien.rsl",
    "email": "damien.collaboration@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@girlnextsh0re",
    "email": "natalie@nurturebabyphotography.com",
    "cat": "affiliation"
  },
  {
    "handle": "@rogers_inc",
    "email": "tjcoolk12@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@rubycreatesagain",
    "email": "rubycreatesinquiries@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@jesshernandezx",
    "email": "jesshernandezx11@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@katrinamartin_",
    "email": "itskatrinamartin@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@soppy.com",
    "email": "sophiebillingx@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@judemanguee",
    "email": "pro.judemangue@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@morewaterboyz",
    "email": "waterboyzontt@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@ivymonaeyt",
    "email": "ivyadams57@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@oliviaffraser",
    "email": "oliviaffraser@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@chumwastaken_",
    "email": "chumsquared44@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@mara.mcginnis",
    "email": "mara@hermanaagency.com",
    "cat": "affiliation"
  },
  {
    "handle": "@kaylamzaa",
    "email": "kaylamzabusiness@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@daratheyoutuber",
    "email": "darasocialcontent@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@nlknikki",
    "email": "nikolettalyah@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@_vanessaromex",
    "email": "vanessaromex@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@sydwingold",
    "email": "syd@counterculture.agency",
    "cat": "affiliation"
  },
  {
    "handle": "@lifewmiahhh",
    "email": "miahhroman07@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@.ambergracexo",
    "email": "ambergracee27@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@promisemakeup_",
    "email": "pro.promisemakeup@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@renee.willss",
    "email": "renwwills@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@vidjournal",
    "email": "vidjournalinquiries@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@jordananais_",
    "email": "contact@jordananais.com",
    "cat": "affiliation"
  },
  {
    "handle": "@chocolatandvanillah",
    "email": "chocolatandvanillapro@gmail.ccom",
    "cat": "affiliation"
  },
  {
    "handle": "@202kingsleyy",
    "email": "kingsley.inquiries2025@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@justinturvy",
    "email": "trazeegg@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@lilyslone_",
    "email": "lilysloneofficial@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@symeon2707",
    "email": "symeon2707@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@katzspies",
    "email": "katrina.tapnio04@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@holly._.noelle",
    "email": "hollystrawberry2007@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@ashlynmichelyt",
    "email": "ashlynmichelb@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@a.manda.m",
    "email": "amaniraho421@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@ohthats_m4ria",
    "email": "itsjustmariama.j@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@justtjaydaa13",
    "email": "ajaydanevaeh@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@tayjarnn",
    "email": "tayjarnn@outlook.com",
    "cat": "affiliation"
  },
  {
    "handle": "@ilovekeiry",
    "email": "keirydq@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@_bethanycook",
    "email": "alice@sareagency.com",
    "cat": "affiliation"
  },
  {
    "handle": "@ofhindula_",
    "email": "ofhindula.nengovhela@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@madelinemarquez_",
    "email": "contactmadelinemarquez@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@chastencreates",
    "email": "chastencreates07@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@kayleemalcolm",
    "email": "kaylee@select.co",
    "cat": "affiliation"
  },
  {
    "handle": "@jaimeevlogs",
    "email": "iluvjaim33@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@patriciasuckss",
    "email": "patriciasuckss@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@mashmasilo",
    "email": "marciamaralala05@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@totilynnn",
    "email": "jocelynbusiness150@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@lsabelledeschamps",
    "email": "isabellechampsbusiness@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@itsmiawarren",
    "email": "miawarren180@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@jaswinterr",
    "email": "jasmine@beaumondeagency.com",
    "cat": "affiliation"
  },
  {
    "handle": "@alanikylee",
    "email": "alani.kylee24@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@leflopper_offical",
    "email": "leflopperyt@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@adoree.steph",
    "email": "therealstephanieee@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@renci_xo",
    "email": "rencimula@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@birlsters",
    "email": "birlsters@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@jenniebri3",
    "email": "ms.jlouis21@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@bronterose_",
    "email": "bronterose@vivemanagement.com.au",
    "cat": "affiliation"
  },
  {
    "handle": "@justkingkev",
    "email": "amy.gallagher@thedigitalbrandarchitects.com",
    "cat": "affiliation"
  },
  {
    "handle": "@akunwatapage",
    "email": "akumedia81@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@ugchristinecreate",
    "email": "ugchristinecreate@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@laurennrwebb",
    "email": "laurennrwebb@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@ciarabranigan",
    "email": "keira@theangelsmgmt.com",
    "cat": "affiliation"
  },
  {
    "handle": "@itsallaboutbe",
    "email": "itsallaboutbe@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@elliemay.ugc",
    "email": "hello@itselliemay.com",
    "cat": "affiliation"
  },
  {
    "handle": "@ashmodiano",
    "email": "ashmodiano@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@techwithgitte",
    "email": "gitteugc@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@lizzy.cardonaa",
    "email": "lizzy1212cardona@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@ugcbyornella03",
    "email": "contactornellaugc@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@its.amandaf",
    "email": "amandaflores.ugc@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@madisonbravenec",
    "email": "madison@hillermediagroup.com",
    "cat": "affiliation"
  },
  {
    "handle": "@ddk.kbi",
    "email": "divvkbi.23@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@sstephkoutss",
    "email": "steph@brinkmgmt.com",
    "cat": "affiliation"
  },
  {
    "handle": "@averyrizzotto",
    "email": "avery@zink-talent.com",
    "cat": "affiliation"
  },
  {
    "handle": "@_sydneypaigeberry",
    "email": "sydneyteam@bcreativbranding.com",
    "cat": "affiliation"
  },
  {
    "handle": "@aicenturyclips",
    "email": "aicenturyinfo@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@maverickgpt",
    "email": "mavgpt@smoothmedia.co",
    "cat": "affiliation"
  },
  {
    "handle": "@lorenzo.wouters",
    "email": "team@odesaai.com",
    "cat": "affiliation"
  },
  {
    "handle": "@ia.antony",
    "email": "antononis78130@outlook.fr",
    "cat": "affiliation"
  },
  {
    "handle": "@maxjohnscn",
    "email": "maxjohnson@briixai.com",
    "cat": "affiliation"
  },
  {
    "handle": "@willfrancis24",
    "email": "collab@willfrancis.com",
    "cat": "affiliation"
  },
  {
    "handle": "@aiwealthhubb",
    "email": "aiwealthhubbb@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@dani_douen",
    "email": "douendani@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@itsmariahbrunner",
    "email": "mariah@dreamtuesday.com",
    "cat": "affiliation"
  },
  {
    "handle": "@iamsmarttips",
    "email": "contact@iamsmarttips.com",
    "cat": "affiliation"
  },
  {
    "handle": "@theultimatejetguide",
    "email": "tom@avsalestalent.com",
    "cat": "affiliation"
  },
  {
    "handle": "@motivationedger",
    "email": "amdigitaluae@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@samdespo",
    "email": "hello@samdespo.com",
    "cat": "affiliation"
  },
  {
    "handle": "@dearbaddiexoxo1",
    "email": "dearbaddiexoxo@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@studywithlaia",
    "email": "contact@leahyzova.com",
    "cat": "affiliation"
  },
  {
    "handle": "@paula_b69",
    "email": "paulapro09@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@georgeavecuns",
    "email": "georgeavecuns@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@boogiebug0",
    "email": "boogie8616@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@khem_is_here",
    "email": "khemtech1@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@therealbeatrixramosaj",
    "email": "beatrix@caagency.com",
    "cat": "affiliation"
  },
  {
    "handle": "@chloebleinc",
    "email": "contact@chloeb.fr",
    "cat": "affiliation"
  },
  {
    "handle": "@jasoncoffee",
    "email": "business@jasoncoffee.com",
    "cat": "affiliation"
  },
  {
    "handle": "@tales_by_blessing",
    "email": "blessingrobert791@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@go2varsity",
    "email": "go2varsity@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@poopiblh",
    "email": "contact@poopiblhpro.com",
    "cat": "affiliation"
  },
  {
    "handle": "@lalousitayeb",
    "email": "lalousitayeb@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@mochiaimi",
    "email": "aimi0715.biz@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@alex.prompt",
    "email": "alex.prompt@outlook.com",
    "cat": "affiliation"
  },
  {
    "handle": "@clairxstudios",
    "email": "clairxstudios@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@evijanjohn",
    "email": "evijanjohn@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@your_youtube_big_sister",
    "email": "iwuohastella0@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@mirunaihub",
    "email": "mirunahub@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@toontribe_",
    "email": "toontribe03@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@avaaicreator",
    "email": "avaaicreator@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@h.nikishyna",
    "email": "nikishyna.hanna95@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@amandaalyynn",
    "email": "amandagotgoods@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@lilouchrg",
    "email": "liloucharrongontier@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@princesscoreeee",
    "email": "princesszaragosa@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@kate.telek",
    "email": "kate@socialaxisagency.com",
    "cat": "affiliation"
  },
  {
    "handle": "@ugcbysylwia",
    "email": "ugcbysylwia@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@mixmias",
    "email": "miamoranfilms@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@assemblycreation",
    "email": "assemblycreation@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@be_viky.beauty",
    "email": "pickyvicky2023@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@kcajmedia",
    "email": "kcajmediabusiness@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@akushika.q",
    "email": "aku.partnerships@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@ali.planner",
    "email": "hello@aliplanner.com",
    "cat": "affiliation"
  },
  {
    "handle": "@kamilsabathy",
    "email": "hello@kamilsabathy.com",
    "cat": "affiliation"
  },
  {
    "handle": "@tashidelekp",
    "email": "contact@tashidp.com",
    "cat": "affiliation"
  },
  {
    "handle": "@sametram_",
    "email": "sametram0093@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@zs.m3dia",
    "email": "zachary.saladino@zsm3dia.com",
    "cat": "affiliation"
  },
  {
    "handle": "@calidoniomia",
    "email": "miacalidonio@dulcedo.com",
    "cat": "affiliation"
  },
  {
    "handle": "@_sydpaige",
    "email": "hello@syd-paige.com",
    "cat": "affiliation"
  },
  {
    "handle": "@mafeanzures",
    "email": "mafe@viralnationtalent.com",
    "cat": "affiliation"
  },
  {
    "handle": "@carinewills",
    "email": "carinewills28@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@lyssknudsen",
    "email": "lyssknudsen@thesociablesociety.com",
    "cat": "affiliation"
  },
  {
    "handle": "@soleilssofiaa",
    "email": "soleil@meraki-group.co",
    "cat": "affiliation"
  },
  {
    "handle": "@gracenah",
    "email": "gracenah@undercurrent.net",
    "cat": "affiliation"
  },
  {
    "handle": "@mckennasalazar",
    "email": "mckennamarie@select.co",
    "cat": "affiliation"
  },
  {
    "handle": "@lovenabeelah",
    "email": "nabeelah@pomegranatee.com",
    "cat": "affiliation"
  },
  {
    "handle": "@sarahbanks.ugc",
    "email": "sarahbanksie.collab@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@judithgclub",
    "email": "hello@judithrios.com",
    "cat": "affiliation"
  },
  {
    "handle": "@annabelhalliday",
    "email": "annabelhalliday@amotalenthouse.com",
    "cat": "affiliation"
  },
  {
    "handle": "@itschikavictory",
    "email": "chikacllbs@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@kaitxamaya",
    "email": "thekaitlynamaya@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@simplyniquenique",
    "email": "simplyniquenique@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@asaxcameron",
    "email": "asacameron@yahoo.com",
    "cat": "affiliation"
  },
  {
    "handle": "@olena.ugc",
    "email": "olenaugccreator@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@_leenitaa",
    "email": "pro.leenitaa@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@whoisconstanceoff",
    "email": "whoisconstanceoff@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@geminivlogss",
    "email": "gabyrose@thedigitaldept.com",
    "cat": "affiliation"
  },
  {
    "handle": "@cosmina.neamtu",
    "email": "hello@cosminaneamtu.com",
    "cat": "affiliation"
  },
  {
    "handle": "@iiamlo",
    "email": "official.iiamlo@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@wetikshop",
    "email": "emailconstantchris@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@ellementsofadventure",
    "email": "elleclangton@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@sarahcontentstudio",
    "email": "blondewanderess19@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@good.girl.creative",
    "email": "stella@goodgirlcreative.co",
    "cat": "affiliation"
  },
  {
    "handle": "@jacklovestech",
    "email": "official.jacktech@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@_taychanelle",
    "email": "xotaychanelle@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@lifeofgracy_",
    "email": "thesecretlifeofgracy@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@brandon_.marketing",
    "email": "brandonmarketing11@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@decotechie",
    "email": "decotechie@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@fore.auggie",
    "email": "fore.auggie@gmail.com",
    "cat": "affiliation"
  },
  {
    "handle": "@positiveperk",
    "email": "workwithpositiveperk@gmail.com",
    "cat": "affiliation"
  }
];

    const sentRows = await supaGet('tiktok_outreach', 'select=email&status=eq.sent') || [];
    const blackRows = await supaGet('email_blacklist', 'select=email') || [];
    const sentEmails = new Set([
      ...sentRows.map(r => r.email),
      ...blackRows.map(r => (r.email || '').toLowerCase().trim())
    ]);

    const catFilter = params.cat || 'all';
    const targets = CAMPAIGN.filter(c => {
      if (sentEmails.has(c.email)) return false;
      if (catFilter !== 'all' && c.cat !== catFilter) return false;
      return true;
    });

    let sent = 0, errors = 0;

    for (const creator of targets) {
      const name = creator.handle.replace('@', '').split('.')[0].split('_')[0];
      const n = name.charAt(0).toUpperCase() + name.slice(1);
      const isFr = creator.cat === 'produit' || ['conseilsyoutube','youtubeurfr','devenirYouTubeur','monetisationyoutube','youtubestrategie','vlogfr','gamingfr','podcastfr','entrepreneurfr','creationdecontenu','intelligenceartificielle','chatgptfrancais','iacontenu'].includes(creator.hashtag || '');

      let subject, htmlContent;

      if (creator.cat === 'affiliation') {
        if (isFr) {
          subject = n + ' — programme affilié Créatis (30% récurrent à vie)';
          htmlContent = '<div style="font-family:sans-serif;max-width:480px;color:#1a1a1a;line-height:1.8">'
            + '<p>Salut ' + n + ' 👋</p>'
            + '<p>J’ai vu ton contenu sur TikTok — tu parles exactement aux créateurs qui ont besoin de Créatis.</p>'
            + '<p><strong>Créatis</strong> = outil IA pour YouTubeurs FR. Script complet + miniature en 30 secondes.</p>'
            + '<p>Programme affilié : <strong>30% récurrent à vie</strong>. Chaque abonné Pro = <strong>5,70€/mois</strong> pour toi, pour toujours.</p>'
            + '<p>10 abonnés = 57€/mois passif. 50 abonnés = 285€/mois.</p>'
            + '<p>Aucune audience minimale.</p>'
            + '<p>Intéressé(e) ? Réponds à cet email ou visite <a href="https://creatis.app/affiliation" style="color:#10b981;font-weight:bold">creatis.app/affiliation</a></p>'
            + '<p style="margin-top:24px">André<br><span style="color:#888;font-size:13px">Fondateur · Créatis</span></p>'
            + '<p style="font-size:11px;color:#aaa">Pour ne plus recevoir : <a href="mailto:contact@creatis.app?subject=unsubscribe">se désabonner</a></p>'
            + '</div>';
        } else {
          subject = n + ' — 30% recurring affiliate program (Créatis AI for YouTube)';
          htmlContent = '<div style="font-family:sans-serif;max-width:480px;color:#1a1a1a;line-height:1.8">'
            + '<p>Hey ' + n + ' 👋</p>'
            + '<p>Found your TikTok — you’re talking to exactly the audience that needs Créatis.</p>'
            + '<p><strong>Créatis</strong> is an AI tool for YouTube creators. Full script + thumbnail in 30 seconds.</p>'
            + '<p>Affiliate program: <strong>30% recurring forever</strong>. Each Pro subscriber you bring = <strong>€5.70/month</strong> for you, indefinitely.</p>'
            + '<p>10 subscribers = €57/month passive. 50 = €285/month.</p>'
            + '<p>No minimum audience required.</p>'
            + '<p>Interested? Reply or visit <a href="https://creatis.app/affiliation" style="color:#10b981;font-weight:bold">creatis.app/affiliation</a></p>'
            + '<p style="margin-top:24px">André<br><span style="color:#888;font-size:13px">Founder · Créatis</span></p>'
            + '<p style="font-size:11px;color:#aaa">To unsubscribe: <a href="mailto:contact@creatis.app?subject=unsubscribe">click here</a></p>'
            + '</div>';
        }
      } else {
        if (isFr) {
          subject = n + ' — génère tes scripts YouTube avec l’IA en 30s';
          htmlContent = '<div style="font-family:sans-serif;max-width:480px;color:#1a1a1a;line-height:1.8">'
            + '<p>Salut ' + n + ' 👋</p>'
            + '<p>Tu crées du contenu vidéo — <strong>Créatis</strong> peut te faire gagner des heures chaque semaine.</p>'
            + '<p>Script YouTube complet, idées de vidéos, miniature IA — tout en 30 secondes.</p>'
            + '<p>Gratuit pour commencer : <a href="https://creatis.app" style="color:#10b981;font-weight:bold">creatis.app</a></p>'
            + '<p style="margin-top:24px">André<br><span style="color:#888;font-size:13px">Fondateur · Créatis</span></p>'
            + '<p style="font-size:11px;color:#aaa">Pour ne plus recevoir : <a href="mailto:contact@creatis.app?subject=unsubscribe">se désabonner</a></p>'
            + '</div>';
        } else {
          subject = n + ' — generate your YouTube scripts with AI in 30s';
          htmlContent = '<div style="font-family:sans-serif;max-width:480px;color:#1a1a1a;line-height:1.8">'
            + '<p>Hey ' + n + ' 👋</p>'
            + '<p>You create video content — <strong>Créatis</strong> can save you hours every week.</p>'
            + '<p>Full YouTube script, video ideas, AI thumbnail — all in 30 seconds.</p>'
            + '<p>Free to start: <a href="https://creatis.app" style="color:#10b981;font-weight:bold">creatis.app</a></p>'
            + '<p style="margin-top:24px">André<br><span style="color:#888;font-size:13px">Founder · Créatis</span></p>'
            + '<p style="font-size:11px;color:#aaa">To unsubscribe: <a href="mailto:contact@creatis.app?subject=unsubscribe">click here</a></p>'
            + '</div>';
        }
      }

      const r = await fetch(BREVO_BASE + '/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': brevoKey },
        body: JSON.stringify({
          to: [{ email: creator.email, name: n }],
          subject,
          sender: { name: 'André — Créatis', email: 'contact@creatis.app' },
          htmlContent,
          tags: ['tiktok-campaign', creator.cat]
        })
      }).catch(() => null);

      if (r && r.ok) {
        sent++;
        await supaUpsert('tiktok_outreach', { handle: creator.handle, email: creator.email, status: 'sent', sent_at: new Date().toISOString() });
      } else {
        errors++;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return res.status(200).json({ ok: true, sent, errors, total: targets.length, cat: catFilter });
  }

  return res.status(400).json({ error: `Action inconnue: ${action}` });
};
