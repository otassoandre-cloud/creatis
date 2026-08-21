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
const THEMES = [
  { // Dimanche
    prompt: `Formate ce message en tweet percutant (max 230 caractères, français, 2 emojis max) : "Script YouTube en 30 secondes. Miniature en 45 secondes. 30 idées de vidéos en 10 secondes. Créatis fait le travail, tu crées. creatis.app" — Réponds uniquement avec le texte du tweet, aucun ajout.`,
    image: 'images/higgsfield/thumbnail-youtube.png'
  },
  { // Lundi
    prompt: `Formate ce message en tweet percutant (max 230 caractères, français, 2 emojis max) : "Tu remplis 3 champs. Tu cliques. Ton script YouTube est prêt en 30 secondes. C'est ça Créatis. creatis.app" — Ton direct, pas de jargon marketing. Réponds uniquement avec le texte du tweet.`,
    image: 'images/higgsfield/hero-landing.png'
  },
  { // Mardi
    prompt: `Formate ce message en tweet percutant (max 230 caractères, français, 2 emojis max) : "Chaîne manga dessin, 6 600 abonnés. Short de 18 secondes → 2,6 millions de vues. Créatis a généré le script. creatis.app" — Garde les chiffres exacts. Réponds uniquement avec le texte du tweet.`,
    image: 'images/higgsfield/thumbnail-youtube.png'
  },
  { // Mercredi
    prompt: `Formate ce message en tweet percutant (max 230 caractères, français, 2 emojis max) : "Avant : 2h pour écrire un script YouTube. Maintenant : 30 secondes avec Créatis. Script + miniature + 30 idées. creatis.app" — Garde les chiffres exacts. Réponds uniquement avec le texte du tweet.`,
    image: 'images/higgsfield/hero-landing.png'
  },
  { // Jeudi
    prompt: `Formate ce message en tweet percutant (max 230 caractères, français, 2 emojis max) : "Miniature YouTube professionnelle générée en 45 secondes. Format 16:9 ou Short 9:16. Téléchargement en 1 clic. Créatis. creatis.app" — Garde les chiffres exacts. Réponds uniquement avec le texte du tweet.`,
    image: 'images/higgsfield/thumbnail-youtube.png'
  },
  { // Vendredi
    prompt: `Formate ce message en tweet percutant (max 230 caractères, français, 2 emojis max) : "Ton contenu YouTube du weekend ? Créatis génère 30 idées personnalisées pour ta niche en 10 secondes. Tu choisis, tu tournes. creatis.app" — Garde les chiffres exacts. Réponds uniquement avec le texte du tweet.`,
    image: 'images/higgsfield/hero-landing.png'
  },
  { // Samedi
    prompt: `Formate ce message en tweet engageant (max 230 caractères, français, 2 emojis max) : "C'est quoi ton plus grand blocage en tant que créateur YouTube ? Idées / Scripts / Miniatures / Shorts — Créatis fait les 4 en secondes. creatis.app" — Réponds uniquement avec le texte du tweet.`,
    image: 'images/higgsfield/thumbnail-youtube.png'
  }
];

const PH_URL = 'https://www.producthunt.com/posts/creatis';

function getPHLaunchTweet() {
  const hour = new Date().getUTCHours();
  if (hour <= 8) {
    return {
      text: `🚀 Créatis est en live sur @ProductHunt aujourd'hui !\n\nL'IA qui génère ton script YouTube, tes titres et ta miniature en 30 secondes.\n→ Plan gratuit, sans CB\n→ Fait par un créateur, pour les créateurs\n\nSoutenez le lancement 👇 ${PH_URL}`,
      image: 'images/higgsfield/thumbnail-youtube.png'
    };
  } else if (hour <= 11) {
    return {
      text: `Ma chaîne manga a fait 2,6M de vues grâce à un short dont le script a été généré en 30 sec par une IA.\n\nJ'ai transformé ça en produit → Créatis\n\nAujourd'hui on est sur @ProductHunt 🎯\nUn vote compte énormément pour un solo founder 🙏\n\n${PH_URL}`,
      image: 'images/higgsfield/card-producthunt.png'
    };
  } else {
    return {
      text: `Il reste quelques heures pour voter pour Créatis sur @ProductHunt 🔥\n\nSi t'es créateur YouTube et que t'en as marre de passer 3h sur un script :\n→ creatis.app — 50 crédits gratuits, sans CB\n\nMerci à tous ceux qui ont déjà voté 🙏\n\n${PH_URL}`,
      image: 'images/higgsfield/hero-landing.png'
    };
  }
}

async function generateTweet(forcedDay = null) {
  const now = new Date();
  if (now.getFullYear() === 2026 && now.getMonth() === 4 && now.getDate() === 19 && forcedDay === null) {
    return getPHLaunchTweet();
  }

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
  return { text: data.choices?.[0]?.message?.content?.trim() || '', image: theme.image };
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
