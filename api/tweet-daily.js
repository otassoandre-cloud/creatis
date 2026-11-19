const crypto = require('crypto');
const https = require('https');
const path = require('path');
const fs = require('fs');

// ── OAuth 1.0a helper ──────────────────────────────────────────────
function oauthSign(method, url, params, creds) {
  const sorted = Object.keys(params).sort()
    .map(k => `${pct(k)}=${pct(params[k])}`).join('&');
  const base = `${method}&${pct(url)}&${pct(sorted)}`;
  const sigKey = `${pct(creds.consumerSecret)}&${pct(creds.tokenSecret)}`;
  return crypto.createHmac('sha1', sigKey).update(base).digest('base64');
}

function pct(s) {
  return encodeURIComponent(String(s)).replace(/[!'()*]/g, c =>
    '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function oauthHeader(method, url, extraParams, creds) {
  const oauth = {
    oauth_consumer_key: creds.consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.accessToken,
    oauth_version: '1.0'
  };
  const all = { ...oauth, ...extraParams };
  oauth.oauth_signature = oauthSign(method, url, all, creds);
  const header = 'OAuth ' + Object.keys(oauth).sort()
    .map(k => `${pct(k)}="${pct(oauth[k])}"`).join(', ');
  return header;
}

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── Upload media (Twitter API v1.1) ───────────────────────────────
async function uploadMedia(imagePath, creds) {
  let imageBuffer;
  try {
    const fullPath = path.join(process.cwd(), imagePath);
    if (!fs.existsSync(fullPath)) return null;
    imageBuffer = fs.readFileSync(fullPath);
  } catch {
    return null; // Image non disponible en serverless — tweet sans image
  }
  const boundary = '----CreatisFormBoundary' + crypto.randomBytes(8).toString('hex');
  const url = 'https://upload.twitter.com/1.1/media/upload.json';

  // multipart/form-data: OAuth signature does NOT include the media bytes
  const auth = oauthHeader('POST', url, {}, creds);

  const partHeader = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="media"\r\n\r\n`);
  const partFooter = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([partHeader, imageBuffer, partFooter]);

  const res = await httpsRequest({
    hostname: 'upload.twitter.com',
    path: '/1.1/media/upload.json',
    method: 'POST',
    headers: {
      'Authorization': auth,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length
    }
  }, body);

  return res.body?.media_id_string || null;
}

// ── Post tweet (Twitter API v2) ───────────────────────────────────
async function postTweet(text, mediaId, creds) {
  const url = 'https://api.twitter.com/2/tweets';
  const payload = JSON.stringify(
    mediaId ? { text, media: { media_ids: [mediaId] } } : { text }
  );
  const auth = oauthHeader('POST', url, {}, creds);
  return httpsRequest({
    hostname: 'api.twitter.com',
    path: '/2/tweets',
    method: 'POST',
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, payload);
}

// ── Rotation des thèmes (7 jours) ────────────────────────────────
/* Réécrits le 25/09/2026. Les sept thèmes précédents vendaient le produit d'avant —
   script YouTube, miniature, 30 idées — alors que l'activité porte sur Clips Viraux
   depuis des mois. Et le bloc « lancement Product Hunt » se déclenchait sur une date
   de mai 2026, depuis longtemps passée : il est supprimé.

   Chaque thème porte un LIEN TRAÇABLE distinct (creatis.app/x/<code>). C'est ce qui
   permet à scripts/social-brief.js de dire quel angle amène des inscrits — sans ça,
   on publie sans jamais savoir lequel fonctionne, ce qui est exactement ce qui s'est
   passé pendant 68 vidéos.

   Les chiffres sont vérifiés (suivi public des paiements Whop Content Rewards) et ne
   doivent jamais être arrondis à la hausse : c'est leur exactitude qui les rend
   partageables. */
const THEMES = [
  { // Dimanche — le chiffre qui dérange
    code: 'taux',
    prompt: `Formate en tweet percutant (max 230 caractères, français, 2 emojis max) : "Les campagnes de clipping affichent 1 à 5 $ pour 1000 vues. Le taux réellement versé, mesuré sur 6,6 milliards de vues : 0,39 $. Trois à treize fois moins. creatis.app/x/taux" — Ne change aucun chiffre. Réponds uniquement avec le texte du tweet.`,
    image: 'images/higgsfield/hero-landing.png'
  },
  { // Lundi — l'échelle du marché
    code: 'marche',
    prompt: `Formate en tweet percutant (max 230 caractères, français, 2 emojis max) : "887 000 $ versés à des clippeurs sur le seul mois de février. 2,58 M$ au total, 8 466 gagnants. Le marché est réel — le taux affiché, lui, ne l'est pas. creatis.app/x/marche" — Ne change aucun chiffre. Réponds uniquement avec le texte du tweet.`,
    image: 'images/higgsfield/thumbnail-youtube.png'
  },
  { // Mardi — le mécanisme, démontré
    code: 'crop',
    prompt: `Formate en tweet percutant (max 230 caractères, français, 2 emojis max) : "Un recadrage 9:16 dans une vidéo 1920x1080 ne garde que 607 pixels de large. Tu jettes 68 % de l'image. C'est pour ça que tes clips sont mous. creatis.app/x/crop" — Ne change aucun chiffre. Réponds uniquement avec le texte du tweet.`,
    image: 'images/higgsfield/hero-landing.png'
  },
  { // Mercredi — l'échéance datée
    code: 'gta',
    prompt: `Formate en tweet percutant (max 230 caractères, français, 2 emojis max) : "GTA 6 sort le 19 novembre. Les comptes qui capteront la vague sont ceux qui publient déjà aujourd'hui — un compte créé le jour J passe l'événement en distribution minimale. creatis.app/x/gta" — Réponds uniquement avec le texte du tweet.`,
    image: 'images/higgsfield/thumbnail-youtube.png'
  },
  { // Jeudi — le plafond du métier
    code: 'volume',
    prompt: `Formate en tweet percutant (max 230 caractères, français, 2 emojis max) : "À la main, un clippeur sort 10 à 15 clips par jour, en y passant la journée. Payé à la vue, le volume est le seul facteur qu'il contrôle. C'est là que ça bloque. creatis.app/x/volume" — Ne change aucun chiffre. Réponds uniquement avec le texte du tweet.`,
    image: 'images/higgsfield/hero-landing.png'
  },
  { // Vendredi — l'outil gratuit, sans argumentaire
    code: 'calc',
    prompt: `Formate en tweet utile (max 230 caractères, français, 2 emojis max) : "Calculateur gratuit : combien de clips par jour pour atteindre ton objectif de revenu en clipping. Basé sur le taux réellement versé, pas sur celui affiché. creatis.app/x/calc" — Ton factuel, aucune promesse de gain. Réponds uniquement avec le texte du tweet.`,
    image: 'images/higgsfield/thumbnail-youtube.png'
  },
  { // Samedi — question ouverte
    code: 'question',
    prompt: `Formate en tweet engageant (max 230 caractères, français, 2 emojis max) : "Clippeurs : c'est quoi qui vous prend le plus de temps ? Trouver les bons passages / recadrer en vertical / caler les sous-titres / publier. Je demande sérieusement." — Pas de lien, pas de promotion, c'est une vraie question. Réponds uniquement avec le texte du tweet.`,
    image: 'images/higgsfield/hero-landing.png'
  }
];

async function generateTweet(forcedDay = null) {
  const now = new Date();
  const day = forcedDay !== null ? forcedDay : now.getDay();
  const theme = THEMES[day];
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: 'Tu es un copywriter. Tu reformules uniquement le message fourni en tweet court et percutant. Tu ne changes pas les chiffres. Tu n\'ajoutes rien d\'inventé. Tu réponds UNIQUEMENT avec le texte du tweet, sans guillemets ni introduction.' },
        { role: 'user', content: theme.prompt }
      ],
      temperature: 0.85, max_tokens: 150
    })
  });
  const data = await res.json();
  return { text: data.choices?.[0]?.message?.content?.trim() || '', image: theme.image, code: theme.code };
}

// ── Handler Vercel ────────────────────────────────────────────────
module.exports = async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['authorization'] !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  try {
    const forcedDay = req.query.day !== undefined ? parseInt(req.query.day) : null;
    const { text, image } = await generateTweet(forcedDay);

    if (req.query.preview === 'true') {
      return res.json({ preview: true, tweet: text, image });
    }

    // Debug : vérifie les credentials et appelle GET /2/users/me
    if (req.query.debug === 'true') {
      const creds = {
        consumerKey: process.env.X_API_KEY,
        consumerSecret: process.env.X_API_SECRET,
        accessToken: process.env.X_ACCESS_TOKEN,
        tokenSecret: process.env.X_ACCESS_TOKEN_SECRET
      };
      const url = 'https://api.twitter.com/2/users/me';
      const auth = oauthHeader('GET', url, {}, creds);
      const result = await httpsRequest({
        hostname: 'api.twitter.com',
        path: '/2/users/me',
        method: 'GET',
        headers: { 'Authorization': auth }
      });
      return res.json({
        keys_present: {
          api_key: !!process.env.X_API_KEY,
          api_key_len: process.env.X_API_KEY?.length,
          api_secret_len: process.env.X_API_SECRET?.length,
          access_token_len: process.env.X_ACCESS_TOKEN?.length,
          access_token_secret_len: process.env.X_ACCESS_TOKEN_SECRET?.length,
        },
        twitter_verify: result
      });
    }

    const creds = {
      consumerKey: process.env.X_API_KEY,
      consumerSecret: process.env.X_API_SECRET,
      accessToken: process.env.X_ACCESS_TOKEN,
      tokenSecret: process.env.X_ACCESS_TOKEN_SECRET
    };

    const mediaId = image ? await uploadMedia(image, creds) : null;
    const result = await postTweet(text, mediaId, creds);

    if (result.status !== 201) {
      throw new Error(`Twitter error ${result.status}: ${JSON.stringify(result.body)}`);
    }

    console.log('✅ Tweet posté:', text);
    res.json({ success: true, tweet: text, id: result.body?.data?.id });

  } catch (err) {
    console.error('Erreur tweet:', err);
    res.status(500).json({ error: err.message });
  }
};
