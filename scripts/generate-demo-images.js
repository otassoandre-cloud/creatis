require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const fetch = (...a) => import('node-fetch').then(m => m.default(...a));

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OUT = path.resolve('images/clips');

const SHORTS = [
  // PODCAST — 5 clips verticaux 9:16
  { name: 'short-podcast-1.webp', prompt: `Vertical 9:16 short clip screenshot. Close-up of a young French woman, 25 years old, speaking passionately into a podcast microphone, warm studio lighting, acoustic panels background, animated hand gesture, mid-sentence expression. Shot on Sony A7IV. Photorealistic, vertical format, no AI artifacts.` },
  { name: 'short-podcast-2.webp', prompt: `Vertical 9:16 short clip screenshot. Young French man, 27 years old, laughing genuinely at something just said in a podcast studio. Microphone in foreground, warm amber lighting, relaxed casual outfit. Candid reaction shot. Photorealistic, vertical format.` },
  { name: 'short-podcast-3.webp', prompt: `Vertical 9:16 short clip screenshot. Two people at a podcast table, woman leaning forward intensely making a point, man listening with raised eyebrows surprised expression. Warm studio light, microphones visible. Dynamic conversation moment. Photorealistic vertical.` },
  { name: 'short-podcast-4.webp', prompt: `Vertical 9:16 short clip screenshot. Young French man podcaster, serious face looking directly at camera, microphone close, LED light panel visible, dark acoustic studio background. Intense eye contact moment. Photorealistic vertical format.` },
  { name: 'short-podcast-5.webp', prompt: `Vertical 9:16 short clip screenshot. Two young French podcasters both laughing hard, heads tilted back, studio microphones in foreground, warm cozy lighting. Genuine hilarious moment. Photorealistic, vertical 9:16.` },

  // GAMING — 5 clips verticaux 9:16
  { name: 'short-gaming-1.webp', prompt: `Vertical 9:16 video game screenshot, AAA action game, dramatic close-up of a character face with intense expression, cinematic lighting, ultra realistic game graphics, HUD partially visible. Vertical format game cutscene moment. Photorealistic render.` },
  { name: 'short-gaming-2.webp', prompt: `Vertical 9:16 video game screenshot, open world game, spectacular explosion in urban environment at night, neon lights, rain, action gameplay moment with motion blur, mini-map in corner. Ultra high settings. Photorealistic vertical game capture.` },
  { name: 'short-gaming-3.webp', prompt: `Vertical 9:16 video game screenshot, victory screen moment, confetti and golden light effects, score display, dramatic cinematic composition. AAA game UI elements. High quality render, vertical format.` },
  { name: 'short-gaming-4.webp', prompt: `Vertical 9:16 video game screenshot, tense stealth moment, character hiding in shadows, foggy urban alley, green tinted night vision effect, health bar visible, ultra realistic game graphics. Photorealistic vertical.` },
  { name: 'short-gaming-5.webp', prompt: `Vertical 9:16 video game screenshot, epic boss fight moment, massive creature looming over player, dramatic lighting, health bars on screen, spectacular particle effects, AAA graphics quality. Photorealistic vertical game capture.` },

  // FACECAM — 5 clips verticaux 9:16
  { name: 'short-facecam-1.webp', prompt: `Vertical 9:16 YouTube short screenshot. Young French creator man, shocked open mouth expression, pointing at something off camera, ring light reflection in eyes, blurred bedroom studio background with LED strips. Tight crop chest up. Photorealistic vertical.` },
  { name: 'short-facecam-2.webp', prompt: `Vertical 9:16 YouTube short screenshot. Young French creator man, laughing hard, eyes slightly squinted, casual hoodie, ring light, modern room setup blurred behind. Genuine reaction moment. Photorealistic vertical format.` },
  { name: 'short-facecam-3.webp', prompt: `Vertical 9:16 YouTube short screenshot. Young French creator man, intense serious look directly into camera, leaning slightly forward, dramatic shadows on face, dark moody background with purple LED. Confident creator energy. Photorealistic vertical.` },
  { name: 'short-facecam-4.webp', prompt: `Vertical 9:16 YouTube short screenshot. Young French creator man, excited wide smile, thumbs up gesture, bright ring light, colorful background with gaming posters blurred. Celebration moment. Photorealistic vertical.` },
  { name: 'short-facecam-5.webp', prompt: `Vertical 9:16 YouTube short screenshot. Young French creator man, whispering to camera, finger on lips, secretive expression, close tight crop, soft studio lighting, dark vignette edges. Suspenseful moment. Photorealistic vertical.` },
];

async function generateImage(prompt, filename, size='1536x1024') {
  console.log(`\n🎨  Génération : ${filename}…`);
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size,
      quality: 'high',
      output_format: 'webp'
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const b64 = data.data[0].b64_json;
  const buf = Buffer.from(b64, 'base64');
  const outPath = path.join(OUT, filename);
  fs.writeFileSync(outPath, buf);
  console.log(`✅  Sauvegardé : ${outPath} (${(buf.length/1024).toFixed(0)}KB)`);
  return outPath;
}

(async () => {
  if (!OPENAI_KEY) { console.error('❌ OPENAI_API_KEY manquante'); process.exit(1); }
  for (const img of SHORTS) {
    await generateImage(img.prompt, img.name, '1024x1536');
    await new Promise(r => setTimeout(r, 800));
  }
  console.log('\n🎉  15 shorts générés dans images/clips/');
})();
