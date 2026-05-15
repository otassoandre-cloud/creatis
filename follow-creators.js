// follow-creators.js
// Trouve des créateurs YouTube FR qui ont un compte X et les follow (20/jour)
// Usage: node follow-creators.js
// Stocke les handles déjà followés dans followed-creators.json

const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync('.env', 'utf8');
const getEnv = key => { const m = envContent.match(new RegExp('^' + key + '=(.+)', 'm')); return m ? m[1].trim() : ''; };
const YT_KEY = getEnv('YOUTUBE_API_KEY');
const creds = {
  consumerKey: getEnv('X_API_KEY'), consumerSecret: getEnv('X_API_SECRET'),
  accessToken: getEnv('X_ACCESS_TOKEN'), tokenSecret: getEnv('X_ACCESS_TOKEN_SECRET')
};

const FOLLOWED_FILE = path.join(__dirname, 'followed-creators.json');
const DAILY_LIMIT = 20;

// ── Seed list — créateurs FR connus sur X ─────────────────────────
// Complété dynamiquement via YouTube API
const SEED_HANDLES = [
  // Gaming / divertissement
  'Squeezie', 'CyprienYT', 'NormanFaitDesV', 'MisterVFR', 'Amixem',
  'Gotaga', 'ZeratoR', 'joueurgrenier', 'Domingo', 'Maghla',
  'Michou', 'Doigby', 'Mynthos', 'Locklear', 'Alphacast',
  // Lifestyle / vlog
  'LenaSituations', 'EnjoyPhoenix', 'Natoo', 'AngDvs', 'Joyca',
  'McFlyetCarlito', 'HugoDecrypte', 'LaboiteverdeMJ',
  // Finance / business
  'TheoBousigue', 'VirgileMilletFR', 'Marc_Randolph_FR',
  // Tech / dev
  'grafikart', 'SimonDereeper', 'AntoineAubry_',
  // Fitness / sport
  'Tibo_InShape', 'WajdaFitness',
  // Voyage / culture
  'NotaBeneYT', 'DavidLafargePK', 'JulienRochedy',
];

// ── Handle extraction ─────────────────────────────────────────────
const X_URL_RE = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{2,50})(?:[\/?\s"'\n]|$)/gi;
const AT_TWITTER_RE = /\btwitter\s*:\s*@?([a-zA-Z0-9_]{2,50})/gi;
const SKIP_HANDLES = new Set(['home','search','explore','notifications','messages','i','share','intent',
  'hashtag','twitter','x','status','login','signup','tos','privacy','about','download','settings']);

function extractHandle(text) {
  if (!text) return null;
  const urlMatches = [...text.matchAll(X_URL_RE)];
  for (const m of urlMatches) {
    const h = m[1].toLowerCase();
    if (!SKIP_HANDLES.has(h) && !h.startsWith('status')) return h;
  }
  const atMatches = [...text.matchAll(AT_TWITTER_RE)];
  for (const m of atMatches) {
    const h = m[1].toLowerCase();
    if (!SKIP_HANDLES.has(h)) return h;
  }
  return null;
}

// ── YouTube API ───────────────────────────────────────────────────
function ytGet(ytPath, params) {
  return new Promise(resolve => {
    const url = new URL(`https://www.googleapis.com/youtube/v3${ytPath}`);
    Object.entries({ ...params, key: YT_KEY }).forEach(([k, v]) => url.searchParams.set(k, v));
    const req = https.request(url.toString(), res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          if (j.error) { resolve(null); }
          else resolve(j);
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null)); req.end();
  });
}

async function findCreatorsWithX(keyword) {
  const s = await ytGet('/search', { part: 'snippet', type: 'channel', q: keyword, maxResults: 50, relevanceLanguage: 'fr', regionCode: 'FR' });
  if (!s?.items?.length) return [];
  const ids = s.items.map(i => i.id?.channelId).filter(Boolean).join(',');
  if (!ids) return [];
  const d = await ytGet('/channels', { part: 'snippet,brandingSettings', id: ids });
  if (!d?.items) return [];
  const results = [];
  for (const ch of d.items) {
    const text = [ch.snippet?.description, ch.brandingSettings?.channel?.description].filter(Boolean).join(' ');
    const handle = extractHandle(text);
    if (handle) results.push({ nom: ch.snippet.title, handle, source: 'youtube' });
  }
  return results;
}

// ── Twitter OAuth ─────────────────────────────────────────────────
function pct(s) { return encodeURIComponent(String(s)).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase()); }
function oauthSign(method, url, params) {
  const sorted = Object.keys(params).sort().map(k => pct(k) + '=' + pct(params[k])).join('&');
  return crypto.createHmac('sha1', pct(creds.consumerSecret) + '&' + pct(creds.tokenSecret)).update(method + '&' + pct(url) + '&' + pct(sorted)).digest('base64');
}
function oauthHeader(method, url, extra = {}) {
  const o = { oauth_consumer_key: creds.consumerKey, oauth_nonce: crypto.randomBytes(16).toString('hex'), oauth_signature_method: 'HMAC-SHA1', oauth_timestamp: Math.floor(Date.now() / 1000).toString(), oauth_token: creds.accessToken, oauth_version: '1.0' };
  const all = { ...o, ...extra };
  o.oauth_signature = oauthSign(method, url, all);
  return 'OAuth ' + Object.keys(o).sort().map(k => pct(k) + '="' + pct(o[k]) + '"').join(', ');
}

function xRequest(method, hostname, urlPath, body, auth) {
  return new Promise(resolve => {
    const headers = { Authorization: auth };
    if (body) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = https.request({ hostname, path: urlPath, method, headers }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', () => resolve({ status: 0, body: null }));
    if (body) req.write(body);
    req.end();
  });
}

let _myUserId = null;
async function getMyUserId() {
  if (_myUserId) return _myUserId;
  const url = 'https://api.twitter.com/2/users/me';
  const auth = oauthHeader('GET', url);
  const r = await xRequest('GET', 'api.twitter.com', '/2/users/me', null, auth);
  _myUserId = r.body?.data?.id || null;
  return _myUserId;
}

async function getUserId(username) {
  const urlPath = `/2/users/by/username/${username}`;
  const url = `https://api.twitter.com${urlPath}`;
  const auth = oauthHeader('GET', url);
  const r = await xRequest('GET', 'api.twitter.com', urlPath, null, auth);
  return r.body?.data?.id || null;
}

async function followUser(handle) {
  const [targetId, myId] = await Promise.all([getUserId(handle), getMyUserId()]);
  if (!targetId) return { ok: false, reason: 'compte_introuvable' };
  if (!myId) return { ok: false, reason: 'auth_error' };

  const url = `https://api.twitter.com/2/users/${myId}/following`;
  const body = JSON.stringify({ target_user_id: targetId });
  const auth = oauthHeader('POST', url);
  const r = await xRequest('POST', 'api.twitter.com', `/2/users/${myId}/following`, body, auth);

  const ok = r.body?.data?.following === true || r.body?.data?.pending_follow === true;
  const errMsg = r.body?.errors?.[0]?.message || r.body?.detail || r.status;
  return { ok, reason: ok ? null : errMsg };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Main ──────────────────────────────────────────────────────────
const KEYWORDS = [
  'créateur youtube francais', 'youtuber francais gaming', 'youtuber finance personnelle',
  'youtuber fitness francais', 'youtuber tech tutoriel', 'youtuber développement personnel',
  'youtuber cuisine recette', 'youtuber lifestyle vlog', 'youtuber humour sketch',
  'youtuber sport francais', 'youtuber voyage france', 'youtuber entrepreneuriat france',
  'chaîne youtube française', 'vlog francais youtube', 'youtuber bien-être france'
];

async function main() {
  const followed = fs.existsSync(FOLLOWED_FILE) ? JSON.parse(fs.readFileSync(FOLLOWED_FILE, 'utf8')) : { handles: [], total: 0 };
  const alreadyFollowed = new Set(followed.handles.map(h => h.toLowerCase()));

  console.log(`Déjà followés : ${alreadyFollowed.size} comptes\n`);

  const candidates = [];

  // Phase 1: YouTube API (peut échouer si quota épuisé)
  console.log('Phase 1 — Recherche YouTube (handles X dans descriptions)...');
  let ytFound = 0;
  for (const kw of KEYWORDS) {
    const creators = await findCreatorsWithX(kw);
    for (const c of creators) {
      if (!alreadyFollowed.has(c.handle.toLowerCase()) && !candidates.some(x => x.handle.toLowerCase() === c.handle.toLowerCase())) {
        candidates.push(c);
        ytFound++;
      }
    }
    await sleep(200);
    if (candidates.length >= DAILY_LIMIT * 2) break;
  }
  console.log(`  → ${ytFound} trouvés via YouTube API\n`);

  // Phase 2: Seed list (si pas assez de candidats)
  if (candidates.length < DAILY_LIMIT) {
    console.log('Phase 2 — Seed list de créateurs FR connus...');
    for (const handle of SEED_HANDLES) {
      if (!alreadyFollowed.has(handle.toLowerCase()) && !candidates.some(x => x.handle.toLowerCase() === handle.toLowerCase())) {
        candidates.push({ nom: handle, handle, source: 'seed' });
      }
    }
    console.log(`  → ${candidates.length} candidats total\n`);
  }

  // Limiter à DAILY_LIMIT
  const toFollow = candidates.slice(0, DAILY_LIMIT);
  console.log(`Follow de ${toFollow.length} comptes (limite ${DAILY_LIMIT}/jour)\n`);

  let followed_today = 0;
  const newHandles = [];

  for (const creator of toFollow) {
    process.stdout.write(`  @${creator.handle}${creator.source === 'seed' ? '' : ` (${creator.nom})`} → `);
    const result = await followUser(creator.handle);
    if (result.ok) {
      followed_today++;
      newHandles.push(creator.handle.toLowerCase());
      alreadyFollowed.add(creator.handle.toLowerCase());
      console.log('✓ suivi');
    } else {
      console.log(`✗ ${result.reason}`);
    }
    await sleep(3000);
  }

  followed.handles = [...new Set([...followed.handles, ...newHandles])];
  followed.total = followed.handles.length;
  followed.last_run = new Date().toISOString().split('T')[0];
  fs.writeFileSync(FOLLOWED_FILE, JSON.stringify(followed, null, 2));

  console.log(`\n✅ ${followed_today} nouveaux follows aujourd'hui | Total : ${followed.total}`);
}

main().catch(console.error);
