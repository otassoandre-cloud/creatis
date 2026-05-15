const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

const envContent = fs.readFileSync('.env', 'utf8');
const getEnv = key => { const m = envContent.match(new RegExp('^' + key + '=(.+)', 'm')); return m ? m[1].trim() : ''; };
const OPENAI_KEY = getEnv('OPENAI_API_KEY');

const W = 1080;
const H = 1080;

// ── 7 visuels pour la rotation hebdo ──────────────────────────────
const THEMES = [
  {
    name: 'dimanche',
    line1: 'UNE IA.',
    line2: 'TOUT LE',
    line3: 'CONTENU.',
    line1Color: '#10b981',
    line2Color: '#ffffff',
    line3Color: '#ffffff',
    sub: 'Scripts · Miniatures · Idées · Shorts',
    bgPrompt: 'A floating glowing laptop computer showing a video editing dashboard, surrounded by small glowing green orbs and particles, very dark background almost black #0a0f0a, emerald green (#10b981) neon accent lighting from below, cinematic product shot, no text, professional studio photography, 4K'
  },
  {
    name: 'lundi',
    line1: 'SCRIPT',
    line2: 'EN 30',
    line3: 'SECONDES.',
    line1Color: '#10b981',
    line2Color: '#ffffff',
    line3Color: '#ffffff',
    sub: 'Tu remplis 3 champs. Tu cliques. C\'est prêt.',
    bgPrompt: 'A glowing 3D document scroll floating in dark space, emerald green (#10b981) neon light glow, very dark background #0a0f0a, futuristic holographic effect, no text, cinematic studio lighting, 4K product photography'
  },
  {
    name: 'mardi',
    line1: '2,6M',
    line2: 'DE VUES.',
    line3: '',
    line1Color: '#10b981',
    line2Color: '#ffffff',
    line3Color: '#ffffff',
    sub: 'Chaîne manga · Short de 18 secondes · Créatis',
    bgPrompt: 'A glowing 3D smartphone displaying a vertical short video with massive view counter, surrounded by floating play button icons, very dark background #0a0f0a, emerald green neon lighting, no text on screen, cinematic product photography, 4K'
  },
  {
    name: 'mercredi',
    line1: 'AVANT : 2H.',
    line2: 'APRÈS :',
    line3: '30 SEC.',
    line1Color: '#ffffff',
    line2Color: '#ffffff',
    line3Color: '#10b981',
    sub: 'Script + Miniature + 30 idées',
    bgPrompt: 'A minimalist 3D hourglass with emerald green sand, glowing neon green light, very dark background #0a0f0a, floating digital particles around it, no text, cinematic studio atmosphere, 4K'
  },
  {
    name: 'jeudi',
    line1: 'MINIATURE',
    line2: 'EN 45',
    line3: 'SECONDES.',
    line1Color: '#10b981',
    line2Color: '#ffffff',
    line3Color: '#ffffff',
    sub: 'Format 16:9 ou Short 9:16 · Téléchargeable en 1 clic',
    bgPrompt: 'A glowing 3D picture frame floating in dark space, emerald green neon light outline, dramatic green lighting on very dark background #0a0f0a, futuristic holographic image generation effect, no text, 4K cinematic product photography'
  },
  {
    name: 'vendredi',
    line1: '30 IDÉES.',
    line2: '10',
    line3: 'SECONDES.',
    line1Color: '#10b981',
    line2Color: '#ffffff',
    line3Color: '#ffffff',
    sub: 'Personnalisées pour ta niche YouTube',
    bgPrompt: 'Multiple glowing 3D light bulbs floating in dark space, emerald green neon glow, very dark background #0a0f0a, some bulbs bright green others fading into darkness, creative idea concept, no text, cinematic 4K product photography'
  },
  {
    name: 'samedi',
    line1: 'TON PLUS',
    line2: 'GRAND',
    line3: 'BLOCAGE ?',
    line1Color: '#ffffff',
    line2Color: '#ffffff',
    line3Color: '#10b981',
    sub: 'Idées · Scripts · Miniatures · Shorts — Créatis fait les 4',
    bgPrompt: 'A glowing 3D question mark symbol floating in dark space, emerald green neon light, very dark background #0a0f0a, surrounded by small glowing particles, dramatic studio lighting, no text, cinematic 4K product photography'
  }
];

// ── Générer image background via gpt-image-1 ──────────────────────
async function generateBackground(prompt) {
  const payload = JSON.stringify({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'medium'
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/images/generations',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const json = JSON.parse(data);
        if (json.error) return reject(new Error(json.error.message));
        // gpt-image-1 returns base64
        const b64 = json.data[0].b64_json;
        resolve(Buffer.from(b64, 'base64'));
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── Composer le visuel final avec Sharp + SVG ─────────────────────
function buildSvgOverlay(theme) {
  const hasLine3 = theme.line3 && theme.line3.length > 0;

  // Positions adaptées selon nombre de lignes
  const y1 = hasLine3 ? 420 : 460;
  const y2 = hasLine3 ? 560 : 600;
  const y3 = 700;
  const fontSize = theme.line1.length > 8 ? 100 : 120;

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <!-- Dégradé sombre en haut pour le logo -->
    <defs>
      <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0a0f0a" stop-opacity="0.85"/>
        <stop offset="30%" stop-color="#0a0f0a" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="70%" stop-color="#0a0f0a" stop-opacity="0"/>
        <stop offset="100%" stop-color="#0a0f0a" stop-opacity="0.9"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#topFade)"/>
    <rect width="${W}" height="${H}" fill="url(#bottomFade)"/>

    <!-- Logo -->
    <circle cx="508" cy="52" r="7" fill="#10b981"/>
    <text x="522" y="60" font-family="Arial, sans-serif" font-size="26" font-weight="600" fill="#10b981" letter-spacing="1">Créatis</text>

    <!-- Ligne 1 -->
    <text x="60" y="${y1}" font-family="Arial Black, Arial, sans-serif" font-size="${fontSize}" font-weight="900" fill="${theme.line1Color}" letter-spacing="-2">${theme.line1}</text>

    <!-- Ligne 2 -->
    <text x="60" y="${y2}" font-family="Arial Black, Arial, sans-serif" font-size="${fontSize}" font-weight="900" fill="${theme.line2Color}" letter-spacing="-2">${theme.line2}</text>

    ${hasLine3 ? `<!-- Ligne 3 -->
    <text x="60" y="${y3}" font-family="Arial Black, Arial, sans-serif" font-size="${fontSize}" font-weight="900" fill="${theme.line3Color}" letter-spacing="-2">${theme.line3}</text>` : ''}

    <!-- Ligne séparatrice -->
    <rect x="60" y="${hasLine3 ? 730 : 650}" width="80" height="3" fill="#10b981" rx="2"/>

    <!-- Sous-titre -->
    <text x="60" y="${hasLine3 ? 770 : 690}" font-family="Arial, sans-serif" font-size="26" fill="#9ca3af">${theme.sub}</text>

    <!-- URL -->
    <text x="60" y="1040" font-family="Arial, sans-serif" font-size="24" fill="#10b981">creatis.app</text>
  </svg>`;
}

async function generateVisual(theme) {
  console.log(`\n[${theme.name}] Génération background...`);
  const bgBuffer = await generateBackground(theme.bgPrompt);

  console.log(`[${theme.name}] Composition texte...`);
  const svg = buildSvgOverlay(theme);

  const outDir = path.join(process.cwd(), 'images', 'twitter');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, `creatis-${theme.name}.png`);
  await sharp(bgBuffer)
    .resize(W, H)
    .composite([{
      input: Buffer.from(svg),
      top: 0,
      left: 0
    }])
    .png()
    .toFile(outPath);

  console.log(`[${theme.name}] ✅ ${outPath}`);
  return outPath;
}

async function main() {
  const arg = process.argv[2]; // ex: node gen-twitter-visuals.js lundi
  const themes = arg ? THEMES.filter(t => t.name === arg) : THEMES;

  if (themes.length === 0) {
    console.error('Thème non trouvé. Options:', THEMES.map(t => t.name).join(', '));
    process.exit(1);
  }

  console.log(`Génération de ${themes.length} visuel(s)...`);
  for (const theme of themes) {
    await generateVisual(theme);
  }
  console.log('\n✅ Terminé. Fichiers dans images/twitter/');
}

main().catch(console.error);
