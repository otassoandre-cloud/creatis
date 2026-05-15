// scrape-emails-yt.js
// Cherche des chaînes YouTube par niche et extrait les emails des descriptions
// Usage: node scrape-emails-yt.js [niche]
// Ex:    node scrape-emails-yt.js "gaming français"

const https = require('https');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const getEnv = key => { const m = envContent.match(new RegExp('^' + key + '=(.+)', 'm')); return m ? m[1].trim() : process.env[key] || ''; };
const YT_KEY = getEnv('YOUTUBE_API_KEY');

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const NICHES = [
  'finance personnelle YouTube français',
  'investissement bourse YouTube',
  'gaming YouTube français',
  'fitness musculation YouTube',
  'développement personnel YouTube français',
  'tech tutoriel YouTube français',
  'cuisine recette YouTube français',
  'lifestyle vlog YouTube français'
];

// ── Helpers HTTP ──────────────────────────────────────────────────
function ytGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'www.googleapis.com', path, method: 'GET' }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
    });
    req.on('error', reject); req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── YouTube API calls ─────────────────────────────────────────────
async function searchChannels(query, pageToken = '') {
  const p = new URLSearchParams({
    part: 'snippet', type: 'channel', q: query,
    maxResults: 50, relevanceLanguage: 'fr', regionCode: 'FR',
    key: YT_KEY, ...(pageToken && { pageToken })
  });
  return ytGet(`/youtube/v3/search?${p}`);
}

async function getChannelDetails(ids) {
  const p = new URLSearchParams({
    part: 'snippet,statistics,brandingSettings',
    id: ids.join(','), key: YT_KEY
  });
  return ytGet(`/youtube/v3/channels?${p}`);
}

// ── Extraction email ──────────────────────────────────────────────
function extractEmail(text) {
  if (!text) return null;
  const found = (text.match(EMAIL_RE) || []).filter(e =>
    !e.includes('example') && !e.includes('yourmail') && !e.endsWith('.png') && !e.endsWith('.jpg')
  );
  return found[0] || null;
}

// ── Scrape une niche ──────────────────────────────────────────────
async function scrapeNiche(niche) {
  console.log(`\n🔍 "${niche}"`);
  const results = [];
  let pageToken = '';
  let pages = 0;

  do {
    const search = await searchChannels(niche, pageToken);
    if (!search?.items?.length) break;

    const ids = search.items.map(i => i.snippet.channelId).filter(Boolean);
    const details = await getChannelDetails(ids);

    if (details?.items) {
      for (const ch of details.items) {
        const subs = parseInt(ch.statistics?.subscriberCount || '0');
        if (subs < 500 || subs > 50000) continue;

        const desc = [
          ch.brandingSettings?.channel?.description,
          ch.snippet?.description
        ].filter(Boolean).join(' ');

        const email = extractEmail(desc);
        if (!email) continue;

        const entry = {
          nom: ch.snippet.title,
          abonnes: subs,
          email,
          niche,
          url: `https://youtube.com/channel/${ch.id}`,
          pays: ch.snippet.country || 'FR'
        };
        results.push(entry);
        console.log(`  ✓ ${ch.snippet.title} (${subs.toLocaleString()} abonnés) → ${email}`);
      }
    }

    pageToken = search.nextPageToken || '';
    pages++;
    await sleep(250); // respect quota
  } while (pageToken && pages < 4); // max 200 chaînes par niche

  return results;
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  if (!YT_KEY) {
    console.error('❌ YOUTUBE_API_KEY manquante dans .env');
    console.error('   → console.cloud.google.com → YouTube Data API v3 → Credentials → API Key');
    process.exit(1);
  }

  const niches = process.argv[2] ? [process.argv[2]] : NICHES;
  const all = [];

  for (const niche of niches) {
    const found = await scrapeNiche(niche);
    all.push(...found);
    await sleep(500);
  }

  // Dédupliquer par email
  const unique = [...new Map(all.map(r => [r.email.toLowerCase(), r])).values()];

  // Trier par abonnés décroissant
  unique.sort((a, b) => b.abonnes - a.abonnes);

  // CSV
  const header = 'Nom,Abonnés,Email,Niche,URL,Pays';
  const rows = unique.map(r =>
    `"${r.nom.replace(/"/g, '')}","${r.abonnes}","${r.email}","${r.niche}","${r.url}","${r.pays}"`
  );
  const csv = [header, ...rows].join('\n');
  const outFile = `leads-youtube-${new Date().toISOString().slice(0,10)}.csv`;
  fs.writeFileSync(outFile, '﻿' + csv, 'utf8'); // BOM pour Excel

  console.log(`\n✅ ${unique.length} emails uniques → ${outFile}`);
  console.log(`   Ouvre avec Excel ou Google Sheets pour envoyer les emails`);
}

main().catch(console.error);
