// gen-reddit-post.js
// Génère un post Reddit prêt à copier-coller avec image
// Usage: node gen-reddit-post.js
// Lance chaque jour avant de poster

const https = require('https');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const envContent = fs.readFileSync('.env', 'utf8');
const getEnv = key => { const m = envContent.match(new RegExp('^' + key + '=(.+)', 'm')); return m ? m[1].trim() : ''; };
const GROQ_KEY = getEnv('GROQ_API_KEY');
const OPENAI_KEY = getEnv('OPENAI_API_KEY');

// ── Contexte réel Créatis (ne pas inventer) ───────────────────────
const CONTEXT = `
PRODUCT: Créatis (creatis.app) — AI tool for French YouTube creators.
In 30 seconds from a topic, it generates: full script with timecodes, 5 CTR-optimized titles, SEO description + 30 tags, AI thumbnail (16:9 or 9:16), 30 video ideas for your niche.
Stack: Groq llama-3.3-70b for scripts, HuggingFace FLUX.1 for thumbnails, YouTube OAuth for channel context.
FOUNDER: Solo builder. Also a YouTube creator (manga drawing channel, 6,600 subscribers). One 18-second AI-scripted short → 2.6M views.
REAL METRICS (day 1): Cold email outreach to 50 YouTube creators/day (automated via Brevo). 15 Twitter follows of French YT creators. Daily tweet automation live. Just launched.
DO NOT INVENT metrics. Use only the numbers above.
`;

// ── Rotation 7 jours ──────────────────────────────────────────────
const THEMES = [
  { // Dimanche
    subreddit: 'r/indiehackers',
    angle: 'builder',
    prompt: `IMPORTANT: Write 100% in English. No French words.
${CONTEXT}
Write a Reddit post for r/indiehackers in "I built X" format.
Angle: your personal builder journey — why you built it, the technical challenges, how your own channel (manga, 6,600 subs) got 2.6M views from one AI-scripted short. Authentic, not salesy.
Format — respond with exactly:
TITRE: [catchy title max 90 chars]
CORPS: [post body 300-400 words, link to creatis.app naturally]`
  },
  { // Lundi
    subreddit: 'r/youtube',
    angle: 'tip',
    prompt: `IMPORTANT: Write 100% in English. No French words.
${CONTEXT}
Write a Reddit post for r/youtube sharing a genuine tip about using AI to create YouTube content faster.
Angle: personal story — your manga channel, how AI scripting led to 2.6M views on a short, how creatis.app works. Helpful, not an ad.
Format — respond with exactly:
TITRE: [title starting with "How I" — max 90 chars]
CORPS: [post body 250-350 words, link to creatis.app as a resource]`
  },
  { // Mardi
    subreddit: 'r/artificial',
    angle: 'showcase',
    prompt: `IMPORTANT: Write 100% in English. No French words.
${CONTEXT}
Write a Reddit post for r/artificial showcasing an AI tool built for a specific niche.
Angle: technical showcase — explain the architecture (Groq llama-3.3-70b for scripts, HuggingFace FLUX.1-schnell for thumbnails, YouTube OAuth v2 for channel context personalization). Real results: 2.6M views short.
Format — respond with exactly:
TITRE: [technical catchy title max 90 chars]
CORPS: [post body 300-400 words, link to creatis.app]`
  },
  { // Mercredi
    subreddit: 'r/Entrepreneur',
    angle: 'niche',
    prompt: `IMPORTANT: Write 100% in English. No French words.
${CONTEXT}
Write a Reddit post for r/Entrepreneur about finding and validating a niche SaaS market.
Angle: how you identified underserved French YouTube creators (10M+ potential users, no good tool), built solo, validated with your own channel (2.6M views short), now doing 50 cold emails/day.
Format — respond with exactly:
TITRE: [title about niche finding — max 90 chars]
CORPS: [post body 350-450 words, link to creatis.app naturally]`
  },
  { // Jeudi
    subreddit: 'r/SaaS',
    angle: 'metrics',
    prompt: `IMPORTANT: Write 100% in English. No French words.
${CONTEXT}
Write a Reddit post for r/SaaS sharing honest early-stage metrics and asking for feedback.
Use ONLY real metrics: 50 cold emails/day to YouTube creators, 15 Twitter follows of YT creators on day 1, daily tweet automation, just launched. Ask the community for acquisition advice.
Format — respond with exactly:
TITRE: Show r/SaaS: Creatis — Day 1 metrics & asking for feedback
CORPS: [post body 300-400 words, link to creatis.app, end with specific questions for community]`
  },
  { // Vendredi
    subreddit: 'r/EntrepreneurRideAlong',
    angle: 'journey',
    prompt: `IMPORTANT: Write 100% in English. No French words.
${CONTEXT}
Write a Reddit post for r/EntrepreneurRideAlong as a weekly build log update.
Use ONLY real facts: built automated cold email (50/day), Twitter auto-follow (20 YT creators/day), daily tweet automation, Reddit post generation. Manga channel: 6,600 subs, 2.6M views short.
Format — respond with exactly:
TITRE: Week 1: Building Creatis — an AI script tool for YouTube creators
CORPS: [post body 350-450 words, authentic journal tone, link to creatis.app, what's next]`
  },
  { // Samedi
    subreddit: 'r/learnmachinelearning',
    angle: 'tutorial',
    prompt: `IMPORTANT: Write 100% in English. No French words.
${CONTEXT}
Write a Reddit post for r/learnmachinelearning as a practical tutorial.
Angle: how to use Groq API + llama-3.3-70b to generate structured YouTube scripts. Include real code snippet (Node.js or Python), explain prompt engineering for structured output (timecodes, sections), mention this powers creatis.app.
Format — respond with exactly:
TITRE: [tutorial title "How to use Groq + llama-3.3 to..." max 90 chars]
CORPS: [post body 400-500 words with code snippet, link to creatis.app]`
  },
];

// ── Image dédiée Reddit (1200×675, 16:9) ─────────────────────────
async function generateRedditImage(theme, title) {
  const day = new Date().getDay();
  const colors = ['#10b981','#059669','#34d399','#6ee7b7'];
  const accent = colors[day % colors.length];

  // Utilise le banner email comme image Reddit (propre et pro)
  const bannerImg = path.join(__dirname, 'images', 'email-banner.png');
  const outPath = path.join(__dirname, 'images', 'reddit-post.png');

  if (fs.existsSync(bannerImg)) {
    fs.copyFileSync(bannerImg, outPath);
    return outPath;
  }

  // Fallback si banner absent
  const svg = `<svg width="1200" height="500" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="500" fill="#0a0f0a"/>
    <circle cx="52" cy="44" r="6" fill="${accent}"/>
    <text x="64" y="50" font-family="Arial" font-size="22" font-weight="600" fill="${accent}">Créatis</text>
    <text x="52" y="210" font-family="Arial Black" font-size="72" font-weight="900" fill="#ffffff">TON SCRIPT</text>
    <text x="52" y="295" font-family="Arial Black" font-size="72" font-weight="900" fill="${accent}">EN 30 SECONDES.</text>
    <text x="52" y="350" font-family="Arial" font-size="20" fill="#9ca3af">Scripts · Miniatures · Idées · Shorts</text>
    <rect x="52" y="385" width="220" height="48" rx="8" fill="${accent}"/>
    <text x="162" y="416" font-family="Arial" font-size="17" font-weight="700" fill="#000" text-anchor="middle">creatis.app →</text>
  </svg>`;

  await sharp({ create: { width: 1200, height: 500, channels: 4, background: { r: 10, g: 15, b: 10, alpha: 1 } } })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(outPath);

  return outPath;
}

// ── Génération du texte via Groq ──────────────────────────────────
function groqPost(prompt) {
  const body = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.85, max_tokens: 800
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.groq.com', path: '/openai/v1/chat/completions', method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          resolve(j.choices?.[0]?.message?.content?.trim() || '');
        } catch { resolve(''); }
      });
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  const arg = process.argv[2];
  const dayOverride = arg ? parseInt(arg) : NaN;
  const day = !isNaN(dayOverride) ? dayOverride : new Date().getDay();
  const theme = THEMES[day];
  const jours = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];

  console.log(`\n📅 ${jours[day].toUpperCase()} → ${theme.subreddit} (angle: ${theme.angle})\n`);
  console.log('Génération du post...');

  const content = await groqPost(theme.prompt);
  const titleMatch = content.match(/TITRE:\s*(.+)/);
  const corpsMatch = content.match(/CORPS:\s*([\s\S]+)/);

  const title = titleMatch?.[1]?.trim() || 'Créatis — AI YouTube Script Generator';
  const body = corpsMatch?.[1]?.trim() || content;

  console.log('Génération de l\'image...');
  const imagePath = await generateRedditImage(theme, title);

  // Affiche le post prêt à copier
  console.log('\n' + '═'.repeat(60));
  console.log(`SUBREDDIT : ${theme.subreddit}`);
  console.log('═'.repeat(60));
  console.log(`\nTITRE :\n${title}`);
  console.log('\nCORPS :\n' + body);
  console.log('\n' + '═'.repeat(60));
  console.log(`IMAGE : ${imagePath}`);
  console.log('═'.repeat(60));
  console.log('\n✅ Prêt ! Copie le titre + corps sur Reddit et attache l\'image.');
  console.log(`→ Lien direct : https://www.reddit.com/${theme.subreddit}/submit\n`);

  // Sauvegarde dans un fichier texte pour référence
  const outFile = path.join(__dirname, 'reddit-post-today.txt');
  fs.writeFileSync(outFile, `SUBREDDIT: ${theme.subreddit}\n\nTITRE:\n${title}\n\nCORPS:\n${body}\n\nIMAGE: ${imagePath}\n`);
  console.log(`Post sauvegardé dans reddit-post-today.txt`);
}

main().catch(console.error);
