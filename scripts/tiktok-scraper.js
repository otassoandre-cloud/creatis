const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CHROME_PROFILE = 'C:\\Users\\Utilisateur\\AppData\\Local\\Temp\\tiktok-scraper-profile';

const HASHTAGS = [
  // FR — YouTubeurs
  'conseilsyoutube',
  'youtubeurfr',
  'devenirYouTubeur',
  'monetisationyoutube',
  'youtubestrategie',
  // FR — IA & outils
  'intelligenceartificielle',
  'chatgptfrancais',
  'iacontenu',
  // FR — Créateurs
  'creationdecontenu',
  'vlogfr',
  'gamingfr',
  'podcastfr',
  'entrepreneurfr',
  // EN — YouTubers
  'youtubegrowthtips',
  'youtubetips',
  'howtogrowonyoutube',
  'youtubestrategy',
  'youtubecreator',
  'smallyoutuber',
  'contentcreator',
  // EN — AI tools
  'aitools',
  'chatgpt',
  'aitiktok',
  'aicontentcreation',
  // EN — Creators general
  'videocreator',
  'contentcreation',
  'growyourchannel',
];

const MAX_FOLLOWERS = 50000;
const MIN_FOLLOWERS = 500;
const THREE_MONTHS_AGO = Date.now() - 90 * 24 * 60 * 60 * 1000;
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'tiktok-reels.csv');

function parseFollowers(raw) {
  if (!raw) return -1;
  const clean = raw.trim().replace(/\s/g, '').replace(',', '.');
  const match = clean.match(/^([\d.]+)([KkMm]?)$/);
  if (!match) return -1;
  let num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'k') num *= 1000;
  if (unit === 'm') num *= 1000000;
  return Math.round(num);
}

function extractEmail(text) {
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : '';
}

// Récupère les handles depuis les TOP vidéos d'un hashtag
async function getHandlesFromTopVideos(page, hashtag) {
  const handles = new Set();
  console.log(`\n🔍 #${hashtag} — Top vidéos...`);

  try {
    // Aller sur la page hashtag (onglet Top par défaut)
    await page.goto(`https://www.tiktok.com/tag/${hashtag}`, {
      waitUntil: 'domcontentloaded', timeout: 15000
    });
    await page.waitForTimeout(3000);

    // Scroll pour charger plus de vidéos
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(800);
    }

    // Extraire les handles des auteurs des vidéos
    const found = await page.evaluate(() => {
      const results = [];
      // Liens vers les profils dans les cartes vidéo
      document.querySelectorAll('a[href*="/@"]').forEach(a => {
        const match = a.href.match(/tiktok\.com\/@([^/?&#]+)/);
        if (match && match[1] && match[1].length > 2) {
          results.push('@' + match[1]);
        }
      });
      return [...new Set(results)];
    });

    found.forEach(h => handles.add(h));
    console.log(`   → ${handles.size} créateurs trouvés`);

  } catch (e) {
    console.log(`   ⚠️ Erreur: ${e.message.slice(0, 60)}`);
  }

  return [...handles];
}

// Visite le profil et récupère les vraies stats
async function scrapeProfile(page, handle) {
  try {
    await page.goto(`https://www.tiktok.com/${handle}`, {
      waitUntil: 'domcontentloaded', timeout: 12000
    });
    await page.waitForTimeout(2000);

    const data = await page.evaluate(() => {
      // Abonnés — plusieurs sélecteurs possibles selon version TikTok
      const selectors = [
        '[data-e2e="followers-count"]',
        '[title*="Follower"]',
        '[title*="Abonn"]',
      ];
      let followersEl = null;
      for (const sel of selectors) {
        followersEl = document.querySelector(sel);
        if (followersEl) break;
      }
      // Fallback : chercher les strong avec des chiffres dans la zone stats
      if (!followersEl) {
        const strongs = [...document.querySelectorAll('strong[title]')];
        followersEl = strongs[1]; // généralement : following, followers, likes
      }

      const followersRaw = followersEl?.getAttribute('title') || followersEl?.innerText || '';

      // Bio
      const bioEl = document.querySelector('[data-e2e="user-bio"]');
      const bio = bioEl?.innerText || '';

      // Date dernière vidéo (timestamp dans les liens vidéo)
      const videoLinks = [...document.querySelectorAll('a[href*="/video/"]')];
      const timestamps = videoLinks.map(a => {
        const match = a.href.match(/\/video\/(\d+)/);
        if (!match) return 0;
        // TikTok video ID contient le timestamp dans les premiers bits
        const id = BigInt(match[1]);
        return Number(id >> 32n) * 1000;
      }).filter(t => t > 1600000000000);

      const lastVideo = timestamps.length ? Math.max(...timestamps) : 0;

      return { followersRaw, bio, lastVideo };
    });

    const abonnes = parseFollowers(data.followersRaw);
    const email = extractEmail(data.bio);

    return {
      abonnes,
      email,
      bio: data.bio.slice(0, 150),
      lastVideo: data.lastVideo,
    };
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log('🚀 TikTok scraper v3 — Top vidéos → profils réels\n');

  const context = await chromium.launchPersistentContext(CHROME_PROFILE, {
    executablePath: CHROME_PATH,
    headless: false,
    args: ['--no-first-run', '--no-default-browser-check'],
  });

  const page = await context.newPage();
  await page.goto('https://www.tiktok.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);

  console.log('⏳ Connecte-toi à TikTok (email + mdp, PAS Google)...');
  console.log('   Démarrage auto dès connexion détectée.\n');

  let loggedIn = false;
  for (let i = 0; i < 80; i++) {
    await page.waitForTimeout(3000);
    const url = page.url();
    if (!url.includes('/login') && !url.includes('/signup') && !url.includes('accounts.google') && url.includes('tiktok.com')) {
      loggedIn = true;
      break;
    }
    process.stdout.write(`\r   Attente connexion... ${(i + 1) * 3}s`);
  }

  if (!loggedIn) {
    console.log('\n❌ Timeout. Relance le script.');
    await context.close(); process.exit(1);
  }
  console.log('\n✅ Connecté ! Phase 1 : collecte des handles depuis Top vidéos...\n');

  // Phase 1 : collecter tous les handles depuis les top vidéos
  const allHandles = new Map(); // handle → hashtag source

  for (const hashtag of HASHTAGS) {
    const handles = await getHandlesFromTopVideos(page, hashtag);
    for (const h of handles) {
      if (!allHandles.has(h)) allHandles.set(h, hashtag);
    }
    await page.waitForTimeout(1000);
  }

  console.log(`\n📋 ${allHandles.size} handles uniques collectés`);
  console.log('Phase 2 : visite des profils...\n');

  // Phase 2 : visiter chaque profil
  const results = [];
  const handles = [...allHandles.entries()];

  for (let i = 0; i < handles.length; i++) {
    const [handle, hashtag] = handles[i];
    process.stdout.write(`[${i + 1}/${handles.length}] ${handle} → `);

    const profile = await scrapeProfile(page, handle);
    if (!profile) { console.log('erreur'); continue; }

    const { abonnes, email, bio, lastVideo } = profile;

    // Filtre abonnés
    if (abonnes !== -1 && (abonnes < MIN_FOLLOWERS || abonnes > MAX_FOLLOWERS)) {
      console.log(`skip (${abonnes?.toLocaleString()} abonnés)`);
      continue;
    }

    // Filtre activité récente (3 derniers mois)
    if (lastVideo > 0 && lastVideo < THREE_MONTHS_AGO) {
      console.log(`skip (inactif depuis ${Math.round((Date.now() - lastVideo) / 86400000)}j)`);
      continue;
    }

    const prio = abonnes < 5000 ? 'nano' : abonnes < 20000 ? 'micro' : 'mid';
    results.push({ handle, abonnes, email, hashtag, prio, bio });
    console.log(`✅ ${abonnes > 0 ? abonnes.toLocaleString() : '?'} abonnés${email ? ' 📧' : ''}`);

    await page.waitForTimeout(1000);
  }

  await context.close();

  // Sauvegarde CSV
  results.sort((a, b) => b.abonnes - a.abonnes);
  const header = 'handle,abonnes,email,hashtag,priorite,bio';
  const rows = results.map(r =>
    `${r.handle},${r.abonnes},${r.email},"${r.hashtag}",${r.prio},"${r.bio.replace(/"/g, "'")}"`
  );
  fs.writeFileSync(OUTPUT_FILE, [header, ...rows].join('\n'), 'utf8');

  console.log(`\n✅ ${results.length} créateurs actifs sauvegardés dans data/tiktok-reels.csv`);
  console.log(`   Avec email: ${results.filter(r => r.email).length}`);
  console.log(`   Nano (<5k):   ${results.filter(r => r.prio === 'nano').length}`);
  console.log(`   Micro (5-20k): ${results.filter(r => r.prio === 'micro').length}`);
  console.log(`   Mid (20-50k):  ${results.filter(r => r.prio === 'mid').length}`);
}

main().catch(console.error);
