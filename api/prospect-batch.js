/* ===== VERCEL FUNCTION — Batch Prospection + Cron + Lemlist + Follow =====
   POST /api/prospect-batch  { action:'batch', keywords, ... }
   GET  /api/prospect-batch             → cron emails quotidien
   GET  /api/prospect-batch?action=follow → follow 20 créateurs/jour sur X
   POST /api/prospect-batch  { action:'lemlist', channels, campaignId }
*/
const crypto = require('crypto');

const YOUTUBE_API  = 'https://www.googleapis.com/youtube/v3';
const BREVO_BASE   = 'https://api.brevo.com/v3';
const LEMLIST_BASE = 'https://api.lemlist.com/api';
const SUPA_BASE    = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const EMAIL_RE     = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const SKIP         = ['example.com','youremail','votreemail','email.com','domain.com','sentry.io'];

// Rotation des mots-clés — 6 sets de 30 mots-clés (1 par jour de la semaine)
const KEYWORD_SETS = [
  // Set 0 — Tech & IA
  ["intelligence artificielle youtube","chatgpt tutoriel francais","IA actualites france","automatisation IA","prompt engineering francais",
   "machine learning francais","llm gpt france youtube","IA créateur contenu","nocode automatisation france","n8n automatisation francais",
   "crypto bitcoin youtube france","blockchain nft youtube francais","investissement crypto france","web3 france youtube","metaverse france youtube",
   "cybersécurité youtube france","hacking éthique francais","informatique tutoriel france","réseaux sociaux stratégie france","tiktok croissance france youtube",
   "youtube algorithm francais","référencement youtube france","créer chaîne youtube conseils","monétiser youtube france","revenus passifs youtube france",
   "podcast tech france","newsletter marketing france","saas fondateur france youtube","indie hacker francais","product hunt france youtube"],
  // Set 1 — Business & Finance
  ["entrepreneur freelance france youtube","digital marketing france youtube","finance personnelle youtube france","investissement bourse youtube",
   "personal branding france youtube","dropshipping youtube france","affiliation youtube france","growth hacking france youtube",
   "email marketing france youtube","copywriting youtube france",
   "e-commerce france youtube","shopify france tutoriel","amazon fba france youtube","immobilier investissement france youtube","trading forex france youtube",
   "bourse débutant france youtube","epargne retraite france youtube","crédit immobilier france youtube","assurance vie france youtube","impôts optimisation france youtube",
   "auto entrepreneur france youtube","micro entreprise france youtube","business en ligne france","revenus multiples france youtube","liberté financière france youtube",
   "marketing digital débutant france","publicité facebook ads france","google ads france youtube","seo naturel france youtube","stratégie contenu france youtube"],
  // Set 2 — Lifestyle & Divertissement
  ["gaming youtube france","vlog quotidien france youtube","fitness muscu youtube france","voyage vlog france youtube","lifestyle youtube france",
   "cuisine recette facile youtube","mode fashion france youtube","maison décoration youtube france","beauté maquillage youtube france","humour sketch youtube france",
   "challenge youtube france","réaction youtube france","test produit youtube france","avis honnête youtube france","haul shopping youtube france",
   "routine quotidienne youtube france","morning routine france youtube","sport maison france youtube","yoga france youtube","running marathon france youtube",
   "randonnée montagne france youtube","camping survie france youtube","pêche chasse france youtube","bricolage maison france youtube","jardinage france youtube",
   "animaux domestiques france youtube","chien chat youtube france","aquarium youtube france","reptiles youtube france","oiseaux perruche youtube france"],
  // Set 3 — Formation & Éducation
  ["formation en ligne france youtube","développeur web youtube france","python tutoriel francais youtube","javascript youtube france",
   "cours gratuit france youtube","e-learning france youtube","productivité youtube france","développement personnel youtube france",
   "tutoriel gratuit france","seo youtube france",
   "graphisme design france youtube","photoshop illustrator france youtube","figma design france youtube","after effects france youtube","premiere pro france youtube",
   "musique production france youtube","dj mix france youtube","guitare débutant france youtube","piano clavier france youtube","chant vocal france youtube",
   "photographie débutant france youtube","lightroom france youtube","smartphone photo france youtube","drone pilotage france youtube","vidéo youtube débutant france",
   "dessin manga france youtube","illustration numérique france youtube","peinture aquarelle france youtube","sculpture france youtube","artisanat diy france youtube"],
  // Set 4 — Santé & Bien-être
  ["psychologie bien-être youtube france","méditation mindfulness france youtube","histoire france youtube","science vulgarisation youtube france",
   "philosophie youtube france","sport youtube france","musique guitare france youtube","photographie france youtube","animaux chien youtube france","podcast france youtube",
   "nutrition alimentation france youtube","régime santé france youtube","véganisme vegan france youtube","intermittent fasting france youtube","perte poids france youtube",
   "musculation naturelle france youtube","crossfit france youtube","boxe mma france youtube","arts martiaux france youtube","natation france youtube",
   "sophrologie relaxation france youtube","gestion stress anxiété france youtube","sommeil insomnie france youtube","jeûne santé france youtube","naturopathie france youtube",
   "couples relation france youtube","parentalité enfants france youtube","développement enfant france youtube","école parents france youtube","famille nombreuse youtube france"],
  // Set 5 — Créateurs & Marketing
  ["agence marketing france youtube","consultant seo france youtube","startup france youtube","saas france youtube","webmarketing france youtube",
   "interview entreprise france youtube","monétisation youtube france","chaîne youtube croissance france","créateur youtube conseils","tuto youtube abonnés",
   "influenceur instagram france youtube","tiktok france stratégie","réseaux sociaux manager france","community management france youtube","social media france tutoriel",
   "branding identité visuelle france","logo design france youtube","communication entreprise france","relations presse france youtube","storytelling france youtube",
   "podcast créer lancer france","newsletter substack france","blog créer monétiser france","affiliate marketing france","partenariat marque france youtube",
   "ugc contenu sponsorisé france","média kit créateur france","agence influence france youtube","casting youtube france","production vidéo france youtube"],
];

// ---- YouTube helpers ----
async function ytGet(path, params) {
  const key = (process.env.YOUTUBE_API_KEY || '').trim();
  if (!key) return null;
  const url = new URL(`${YOUTUBE_API}${path}`);
  Object.entries({ ...params, key }).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  try {
    const r = await fetch(url.toString());
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

function extractEmail(text) {
  const found = (text || '').match(EMAIL_RE) || [];
  return found.find(e => !SKIP.some(s => e.toLowerCase().includes(s))) || null;
}

function fmt(n) {
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n/1000)}k`;
  return String(n);
}

function nicheFromKeyword(keyword) {
  const k = keyword.toLowerCase();
  if (k.includes('manga') || k.includes('anime')) return 'manga';
  if (k.includes('gaming') || k.includes('jeux')) return 'gaming';
  if (k.includes('finance') || k.includes('bourse') || k.includes('investissement')) return 'finance';
  if (k.includes('fitness') || k.includes('muscul') || k.includes('sport')) return 'fitness';
  if (k.includes('cuisine') || k.includes('food') || k.includes('recette')) return 'cuisine';
  if (k.includes('voyage') || k.includes('travel')) return 'voyage';
  if (k.includes('tech') || k.includes('ia') || k.includes('intelligence artificielle') || k.includes('code')) return 'tech';
  if (k.includes('développement personnel') || k.includes('productivité') || k.includes('mindset')) return 'développement personnel';
  if (k.includes('entrepreneur') || k.includes('marketing') || k.includes('business')) return 'business';
  if (k.includes('formation') || k.includes('tutoriel') || k.includes('e-learning')) return 'formation';
  return '';
}

async function searchKeyword(keyword, maxResults, minAb, maxAb) {
  const s = await ytGet('/search', {
    part: 'snippet', type: 'channel', q: keyword,
    relevanceLanguage: 'fr', regionCode: 'FR',
    maxResults: Math.min(maxResults, 50), order: 'relevance'
  });
  if (!s?.items?.length) return [];
  const ids = s.items.map(i => i.id?.channelId).filter(Boolean).join(',');
  if (!ids) return [];
  const d = await ytGet('/channels', { part: 'snippet,statistics', id: ids });
  if (!d?.items) return [];
  const niche = nicheFromKeyword(keyword);
  return d.items.map(ch => {
    const desc = ch.snippet?.description || '';
    const ab = parseInt(ch.statistics?.subscriberCount || 0);
    const email = extractEmail(desc);
    return { id: ch.id, nom: ch.snippet?.title || '', email, abonnes: ab, abonnesFormat: fmt(ab), niche, url: `https://youtube.com/channel/${ch.id}` };
  }).filter(ch => ch.abonnes >= minAb && (maxAb === 0 || ch.abonnes <= maxAb));
}

// ---- Supabase helpers ----
async function supaGet(table, select, filter) {
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (!SUPA_BASE || !key) return null;
  const url = `${SUPA_BASE}/rest/v1/${table}?select=${select || '*'}${filter ? `&${filter}` : ''}`;
  try {
    const r = await fetch(url, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

async function supaInsert(table, rows) {
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (!SUPA_BASE || !key) return false;
  try {
    const r = await fetch(`${SUPA_BASE}/rest/v1/${table}`, {
      method: 'POST',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=ignore-duplicates' },
      body: JSON.stringify(rows)
    });
    return r.ok || r.status === 201 || r.status === 409;
  } catch { return false; }
}

// ---- Brevo outreach ----
async function sendOutreach(ch, appUrl) {
  const key = (process.env.BREVO_API_KEY || '').trim();
  if (!key) return false;

  const r = await fetch(`${BREVO_BASE}/smtp/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': key },
    body: JSON.stringify({
      to: [{ email: ch.email, name: ch.nom }],
      subject: `${ch.nom} — une idée en vidéo YouTube prête à publier en 30s`,
      sender: { name: 'Créatis', email: 'contact@creatis.app' },
      htmlContent: `<div style="font-family:sans-serif;max-width:600px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;color:#111">
        <!-- Banner -->
        <a href="${appUrl}" style="display:block">
          <img src="${appUrl}/images/email-banner.png" alt="Créatis — Ton script YouTube en 30 secondes" width="600" style="width:100%;display:block;border:0"/>
        </a>
        <!-- Corps -->
        <div style="padding:32px">
          <p style="margin-top:0">Bonjour,</p>
          <p>J'ai vu ta chaîne${ch.niche ? ' ' + ch.niche : ''} (${ch.abonnesFormat} abonnés) — ta niche a un énorme potentiel en ce moment.</p>
          <p>Je viens de lancer <strong>Créatis</strong> : en 30 secondes, il transforme une idée en vidéo YouTube prête à publier.</p>
          <p style="color:#444">Titres CTR, script complet, miniature IA — tout d'un coup.</p>
          <p>Gratuit à tester — 50 générations, sans carte bancaire :</p>
          <a href="${appUrl}" style="display:inline-block;background:#10b981;color:#000;padding:14px 28px;border-radius:8px;font-weight:700;text-decoration:none;margin:12px 0">Essayer Créatis →</a>
          <p style="color:#888;font-size:13px;margin-top:24px">C'est le seul email que tu recevras de ma part si ça ne t'intéresse pas.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
          <p style="color:#aaa;font-size:12px;margin:0">Créatis · <a href="${appUrl}" style="color:#10b981">creatis.app</a></p>
        </div>
      </div>`
    })
  }).catch(() => ({ ok: false }));

  return r.ok;
}

// ======================================================
// ---- Follow creators on X ----
// ======================================================
const FOLLOW_SEED = [
  'Squeezie','MisterVFR','Amixem','Gotaga','ZeratoR','Domingo','Maghla',
  'Michou','Doigby','Mynthos','Locklear','Alphacast','McFlyetCarlito',
  'LenaSituations','EnjoyPhoenix','Natoo','HugoDecrypte','TheoBousigue',
  'grafikart','Tibo_InShape','WajdaFitness','NotaBeneYT','JulienRochedy',
  'Sylvqin','Deujna','Joyca_officiel','CarlottaVinesYT','AnthonyNevo',
  'SimonDereeper','DavidLafargePK','LeoBrandup','pierre_cauchy',
  'Nasdas','Shisheyu','Domingo','NaomiKitenge','JulienQuaglierini',
  'Florent_Fouque','LaboiteverdeMJ','Julien_Bam',
];
const X_HANDLE_RE = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{2,50})(?:[\/?\s"'\n]|$)/gi;
const SKIP_X = new Set(['home','search','explore','i','share','hashtag','twitter','x','status','login','signup','tos','privacy','about','notifications','messages']);

function extractXHandle(text) {
  if (!text) return null;
  for (const m of [...text.matchAll(X_HANDLE_RE)]) {
    const h = m[1].toLowerCase();
    if (!SKIP_X.has(h)) return h;
  }
  return null;
}

function xPct(s) {
  return encodeURIComponent(String(s)).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}
function xOauthHeader(method, url) {
  const ck = process.env.X_API_KEY || '', cs = process.env.X_API_SECRET || '';
  const at = process.env.X_ACCESS_TOKEN || '', ts = process.env.X_ACCESS_TOKEN_SECRET || '';
  const o = { oauth_consumer_key: ck, oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1', oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: at, oauth_version: '1.0' };
  const sorted = Object.keys(o).sort().map(k => `${xPct(k)}=${xPct(o[k])}`).join('&');
  o.oauth_signature = crypto.createHmac('sha1', `${xPct(cs)}&${xPct(ts)}`).update(`${method}&${xPct(url)}&${xPct(sorted)}`).digest('base64');
  return 'OAuth ' + Object.keys(o).sort().map(k => `${xPct(k)}="${xPct(o[k])}"`).join(', ');
}

let _xMyId = null;
async function xGetMyId() {
  if (_xMyId) return _xMyId;
  const url = 'https://api.twitter.com/2/users/me';
  try {
    const r = await fetch(url, { headers: { Authorization: xOauthHeader('GET', url) } });
    _xMyId = (await r.json())?.data?.id || null;
  } catch {}
  return _xMyId;
}

async function xBatchGetUserIds(usernames) {
  const url = `https://api.twitter.com/2/users/by?usernames=${usernames.join(',')}&user.fields=id`;
  try {
    const r = await fetch(url, { headers: { Authorization: xOauthHeader('GET', url) } });
    const j = await r.json();
    const map = {};
    for (const u of (j?.data || [])) map[u.username.toLowerCase()] = u.id;
    return map;
  } catch { return {}; }
}

async function xFollowById(myId, targetId) {
  const url = `https://api.twitter.com/2/users/${myId}/following`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: xOauthHeader('POST', url), 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: targetId })
    });
    const j = await r.json();
    return j?.data?.following === true || j?.data?.pending_follow === true;
  } catch { return false; }
}

async function findXHandlesViaYoutube(alreadyFollowed) {
  const ytKeywords = [
    'créateur youtube francais','youtuber francais gaming',
    'youtuber finance personnelle','youtuber fitness francais','youtuber tech tutoriel',
  ];
  const found = [];
  for (const kw of ytKeywords) {
    try {
      const s = await ytGet('/search', { part: 'snippet', type: 'channel', q: kw, maxResults: 50, relevanceLanguage: 'fr', regionCode: 'FR' });
      if (!s?.items?.length) continue;
      const ids = s.items.map(i => i.id?.channelId).filter(Boolean).join(',');
      const d = await ytGet('/channels', { part: 'snippet,brandingSettings', id: ids });
      if (!d?.items) continue;
      for (const ch of d.items) {
        const text = [ch.snippet?.description, ch.brandingSettings?.channel?.description].filter(Boolean).join(' ');
        const h = extractXHandle(text);
        if (h && !alreadyFollowed.has(h) && !found.some(f => f.handle === h)) {
          found.push({ handle: h, nom: ch.snippet.title, source: 'youtube' });
        }
      }
    } catch {}
    await new Promise(r => setTimeout(r, 300));
    if (found.length >= 30) break;
  }
  return found;
}

// ---- Lemlist outreach ----
async function addToLemlist(ch, campaignId, apiKey) {
  const [firstName, ...rest] = (ch.nom || '').trim().split(' ');
  const url = `${LEMLIST_BASE}/campaigns/${campaignId}/leads/${encodeURIComponent(ch.email)}`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`anystring:${apiKey}`).toString('base64')
      },
      body: JSON.stringify({
        firstName: firstName || ch.nom,
        lastName: rest.join(' ') || '',
        companyName: ch.nom,
        icebreaker: `J'ai vu ta chaîne "${ch.nom}" (${ch.abonnesFormat} abonnés)`,
        chaineNom: ch.nom,
        abonnes: ch.abonnesFormat,
        youtubeUrl: ch.url || ''
      })
    });
    return r.ok || r.status === 200 || r.status === 201;
  } catch { return false; }
}

// ======================================================
// ---- Handler principal ----
// ======================================================
module.exports = async (req, res) => {
  const APP_URL = (process.env.APP_URL || 'https://creatis.app').trim();
  res.setHeader('Access-Control-Allow-Origin', APP_URL);
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const body = req.body || {};

  // =====================================================
  // ACTION : FOLLOW — suit 20 créateurs YT FR sur X
  // GET /api/prospect-batch?action=follow (cron-job.org)
  // =====================================================
  if (req.query?.action === 'follow' || body.action === 'follow') {
    const cronSecret = process.env.CRON_SECRET || '';
    const authHeader = req.headers['authorization'] || '';
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const now = new Date().toISOString().split('T')[0];
    const followedRows = await supaGet('x_followed', 'handle');
    const alreadyFollowed = new Set((followedRows || []).map(r => r.handle?.toLowerCase()).filter(Boolean));

    // Candidats via YouTube API + seed
    const candidates = [];
    const ytFound = await findXHandlesViaYoutube(alreadyFollowed);
    candidates.push(...ytFound);
    for (const h of FOLLOW_SEED) {
      const hl = h.toLowerCase();
      if (!alreadyFollowed.has(hl) && !candidates.some(c => c.handle.toLowerCase() === hl)) {
        candidates.push({ handle: h, nom: h, source: 'seed' });
      }
    }

    const toFollow = candidates.slice(0, 20);
    if (!toFollow.length) {
      return res.json({ ok: true, followed: 0, total: alreadyFollowed.size, note: 'Pas de nouveaux candidats' });
    }

    const idMap = await xBatchGetUserIds(toFollow.map(c => c.handle));
    const myId = await xGetMyId();
    if (!myId) return res.status(500).json({ error: 'Twitter auth error' });

    const newFollows = [];
    for (const c of toFollow) {
      const targetId = idMap[c.handle.toLowerCase()];
      if (!targetId) continue;
      const ok = await xFollowById(myId, targetId);
      if (ok) newFollows.push({ handle: c.handle.toLowerCase(), nom: c.nom, source: c.source, date_followed: now });
      await new Promise(r => setTimeout(r, 500));
    }
    if (newFollows.length > 0) await supaInsert('x_followed', newFollows);

    return res.json({ ok: true, followed: newFollows.length, total: alreadyFollowed.size + newFollows.length, handles: newFollows.map(f => f.handle) });
  }

  // =====================================================
  // ACTION : LEMLIST — ajoute une liste de chaînes à une campagne
  // =====================================================
  if (body.action === 'lemlist') {
    const lemlistKey = (process.env.LEMLIST_API_KEY || '').trim();
    if (!lemlistKey) return res.status(400).json({ error: 'LEMLIST_API_KEY manquante dans Vercel env' });
    const { channels = [], campaignId } = body;
    if (!campaignId) return res.status(400).json({ error: 'campaignId requis' });

    let added = 0, errors = 0;
    for (const ch of channels) {
      if (!ch.email) continue;
      const ok = await addToLemlist(ch, campaignId, lemlistKey);
      if (ok) added++; else errors++;
      await new Promise(r => setTimeout(r, 200));
    }
    return res.status(200).json({ ok: true, added, errors });
  }

  // =====================================================
  // ACTION : CRON — prospection quotidienne automatique (GET)
  // =====================================================
  if (req.method === 'GET' || body.action === 'cron') {
    // Vérification secret
    const cronSecret = process.env.CRON_SECRET || '';
    const authHeader = req.headers['authorization'] || '';
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const now = new Date();
    const baseIndex = now.getUTCDate() % KEYWORD_SETS.length;
    const keywords = KEYWORD_SETS[baseIndex];

    // Récupère les emails déjà contactés depuis Supabase
    const existing = await supaGet('prospects_contacted', 'email');
    const alreadySent = new Set((existing || []).map(r => r.email?.toLowerCase()).filter(Boolean));

    const found = [];
    for (let i = 0; i < keywords.length; i += 5) {
      const batch = keywords.slice(i, i + 5);
      const results = await Promise.all(batch.map(kw => searchKeyword(kw, 50, 0, 100000)));
      for (const channels of results) {
        for (const ch of channels) {
          if (ch.email && !alreadySent.has(ch.email.toLowerCase())) {
            alreadySent.add(ch.email.toLowerCase());
            found.push(ch);
          }
        }
      }
    }

    const DAILY_LIMIT = 200;
    let sent = 0, errors = 0;
    const newContacts = [];
    for (const ch of found) {
      if (!ch.email) continue;
      if (sent >= DAILY_LIMIT) break;
      try {
        const ok = await sendOutreach(ch, APP_URL);
        if (ok) {
          sent++;
          newContacts.push({ email: ch.email.toLowerCase(), nom: ch.nom, abonnes: ch.abonnes, source: 'cron', date_contact: now.toISOString().split('T')[0] });
        } else { errors++; }
      } catch { errors++; }
      await new Promise(r => setTimeout(r, 50));
    }

    if (newContacts.length > 0) await supaInsert('prospects_contacted', newContacts);

    return res.status(200).json({ ok: true, date: now.toISOString(), keywordSet: baseIndex, found: found.length, sent, errors });
  }

  // =====================================================
  // ACTION : BATCH — prospection manuelle (POST par défaut)
  // =====================================================
  if (req.method !== 'POST') return res.status(405).end();

  const {
    keywords = [],
    minAbonnes = 0,
    maxAbonnes = 100000,
    maxPerKeyword = 50,
    sendEmails = true,
    useLemlist = false,
    lemlistCampaignId = '',
    alreadySent = []
  } = body;

  if (!keywords.length) return res.status(400).json({ error: 'keywords requis' });

  const sentSet = new Set(alreadySent.map(e => e.toLowerCase()));
  const found = [];
  let sent = 0, errors = 0;

  for (let i = 0; i < keywords.length; i += 5) {
    const batch = keywords.slice(i, i + 5);
    const results = await Promise.all(batch.map(kw => searchKeyword(kw, maxPerKeyword, minAbonnes, maxAbonnes)));
    for (const channels of results) {
      for (const ch of channels) {
        if (ch.email && !sentSet.has(ch.email.toLowerCase())) {
          sentSet.add(ch.email.toLowerCase());
          found.push(ch);
        }
      }
    }
    await new Promise(r => setTimeout(r, 200));
  }

  if (sendEmails) {
    const lemlistKey = (process.env.LEMLIST_API_KEY || '').trim();

    for (const ch of found) {
      if (!ch.email) continue;
      try {
        let ok = false;
        if (useLemlist && lemlistKey && lemlistCampaignId) {
          ok = await addToLemlist(ch, lemlistCampaignId, lemlistKey);
        } else {
          ok = await sendOutreach(ch, APP_URL);
        }
        if (ok) sent++; else errors++;
      } catch { errors++; }
      await new Promise(r => setTimeout(r, 150));
    }
  }

  return res.status(200).json({
    ok: true,
    found: found.length,
    withEmail: found.filter(c => c.email).length,
    sent,
    errors,
    channels: found.map(c => ({ nom: c.nom, email: c.email, abonnesFormat: c.abonnesFormat }))
  });
};
