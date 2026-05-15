const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

const envContent = fs.readFileSync('.env', 'utf8');
const getEnv = key => { const m = envContent.match(new RegExp('^' + key + '=(.+)', 'm')); return m ? m[1].trim() : ''; };
const OPENAI_KEY = getEnv('OPENAI_API_KEY');

const W = 1200;
const H = 500;

const BG_PROMPT = `A professional dark laptop computer floating at slight angle, screen showing a beautiful dark dashboard UI with YouTube content creation tools, green (#10b981) neon glow from the screen illuminating the dark background (#0a0f0a), cinematic product photography, emerald green particle effects around the laptop, very dark atmospheric background, no text on the laptop screen, 4K quality, professional studio lighting`;

async function generateBackground(prompt) {
  const payload = JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: '1024x1024', quality: 'medium' });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com', path: '/v1/images/generations', method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, res => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => {
        const json = JSON.parse(data);
        if (json.error) return reject(new Error(json.error.message));
        resolve(Buffer.from(json.data[0].b64_json, 'base64'));
      });
    });
    req.on('error', reject); req.write(payload); req.end();
  });
}

function buildSvg() {
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Dégradé gauche pour le texte -->
      <linearGradient id="leftFade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#0a0f0a" stop-opacity="0.97"/>
        <stop offset="55%" stop-color="#0a0f0a" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="#0a0f0a" stop-opacity="0"/>
      </linearGradient>
      <!-- Dégradé bord haut/bas -->
      <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0a0f0a" stop-opacity="0.6"/>
        <stop offset="20%" stop-color="#0a0f0a" stop-opacity="0"/>
        <stop offset="80%" stop-color="#0a0f0a" stop-opacity="0"/>
        <stop offset="100%" stop-color="#0a0f0a" stop-opacity="0.6"/>
      </linearGradient>
    </defs>

    <!-- Overlays -->
    <rect width="${W}" height="${H}" fill="url(#leftFade)"/>
    <rect width="${W}" height="${H}" fill="url(#topFade)"/>

    <!-- Logo -->
    <circle cx="52" cy="44" r="6" fill="#10b981"/>
    <text x="64" y="50" font-family="Arial, sans-serif" font-size="22" font-weight="600" fill="#10b981" letter-spacing="1">Créatis</text>

    <!-- Tagline petite -->
    <text x="52" y="130" font-family="Arial, sans-serif" font-size="18" fill="#6b7280" letter-spacing="2">OUTIL IA POUR CRÉATEURS YOUTUBE</text>

    <!-- Titre principal -->
    <text x="52" y="210" font-family="Arial Black, Arial, sans-serif" font-size="72" font-weight="900" fill="#ffffff" letter-spacing="-2">TON SCRIPT</text>
    <text x="52" y="295" font-family="Arial Black, Arial, sans-serif" font-size="72" font-weight="900" fill="#10b981" letter-spacing="-2">EN 30 SECONDES.</text>

    <!-- Sous-titre -->
    <text x="52" y="350" font-family="Arial, sans-serif" font-size="20" fill="#9ca3af">Scripts · Miniatures · Idées · Shorts · Prospection sponsors</text>

    <!-- Bouton CTA simulé -->
    <rect x="52" y="385" width="260" height="52" rx="8" fill="#10b981"/>
    <text x="182" y="418" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#000000" text-anchor="middle">Essayer gratuitement →</text>

    <!-- Petit texte sous le bouton -->
    <text x="52" y="460" font-family="Arial, sans-serif" font-size="14" fill="#4b5563">50 générations gratuites · Sans carte bancaire</text>
  </svg>`;
}

async function main() {
  console.log('Génération background...');
  const bgBuffer = await generateBackground(BG_PROMPT);

  console.log('Composition...');
  const svg = buildSvg();
  const outDir = path.join(process.cwd(), 'images');
  const outPath = path.join(outDir, 'email-banner.png');

  await sharp(bgBuffer)
    .resize(W, H, { fit: 'cover', position: 'center' })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(outPath);

  console.log(`✅ ${outPath}`);
}

main().catch(console.error);
