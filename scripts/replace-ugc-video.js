/**
 * replace-ugc-video.js
 * Upload la nouvelle vidéo UGC et remplace le creative de l'ad Meta
 * node scripts/replace-ugc-video.js
 */

const fs    = require('fs');
const path  = require('path');
const FormData = require('form-data');
const fetch = (...a) => import('node-fetch').then(m => m.default(...a));

const TOKEN      = 'EAAMYZAoqlzzYBRuecZBMxWQazo7ZCv0GqKuV6lrWYFo1FZBnxlWet7ogR7SYiPwaLICgTBjQF2P1RW70aNYNydXYlFDSwZCTHv5D9L1SIv1ZCBl4SOFG3st3hXyyWHzx6iQERojf4cMswxxFcR0HkUcUpZBxq4a4Ffy36qJg2ZAxfeJj2rM3pZACIlbKzUDZCHrJL8xZCNjZBWIXHEKlrF3dfqk7dZA2ZCGP9gZC5KqqiBWVEXICOYnJMIvCt7yUpxlEnM4jOYEZAb0P03ekYPzZAPVqQWvrDYmYs';
const AD_ACCOUNT = 'act_874177626272630';
const PAGE_ID    = '1115113228350453';
const AD_ID      = '120248817270690683'; // Visuel UGC — Clips Viraux v2

const VIDEO_PATH = path.resolve('C:/Users/Utilisateur/Desktop/ADS META/copy_67E68B83-6C2C-4BBD-B8DD-15CDEA4F9DB5.MOV');
const API        = 'https://graph.facebook.com/v20.0';
const VIDEO_API  = 'https://graph-video.facebook.com/v20.0';

// Texte et CTA de l'ad existant (inchangés)
const MESSAGE = `Tu passes encore 3h à couper tes vidéos ? 😤

1 fichier → 10 Shorts viraux prêts à poster en 30 secondes.

TikTok · Reels · YouTube Shorts · Snapchat

✅ Gratuit · Sans carte bancaire`;

async function step(label, fn) {
  process.stdout.write(`⏳ ${label}...`);
  const r = await fn();
  console.log(' ✅');
  return r;
}

async function uploadVideo() {
  const form = new FormData();
  form.append('access_token', TOKEN);
  form.append('source', fs.createReadStream(VIDEO_PATH), {
    filename: 'ugc-new.mov',
    contentType: 'video/quicktime',
  });

  const res  = await fetch(`${VIDEO_API}/${AD_ACCOUNT}/advideos`, { method: 'POST', body: form });
  const data = await res.json();
  if (data.error) throw new Error(`Upload video: ${data.error.error_user_msg || data.error.message}`);
  return data.id;
}

async function createCreative(videoId) {
  const params = new URLSearchParams({
    access_token: TOKEN,
    name: 'UGC Clips Viraux v3',
    object_story_spec: JSON.stringify({
      page_id: PAGE_ID,
      video_data: {
        video_id: videoId,
        message: MESSAGE,
        image_hash: '31d003678064306196555f33840580f5',
        call_to_action: {
          type: 'SIGN_UP',
          value: { link: 'https://creatis.app/lp' },
        },
      },
    }),
  });

  const res  = await fetch(`${API}/${AD_ACCOUNT}/adcreatives`, { method: 'POST', body: params });
  const data = await res.json();
  if (data.error) throw new Error(`Create creative: ${data.error.error_user_msg || data.error.message}`);
  return data.id;
}

async function updateAd(creativeId) {
  const params = new URLSearchParams({
    access_token: TOKEN,
    creative: JSON.stringify({ creative_id: creativeId }),
  });

  const res  = await fetch(`${API}/${AD_ID}`, { method: 'POST', body: params });
  const data = await res.json();
  if (data.error) throw new Error(`Update ad: ${data.error.error_user_msg || data.error.message}`);
  return data.success;
}

(async () => {
  try {
    console.log('🎬 Remplacement vidéo UGC — Créatis Meta Ads\n');

    // Vidéo déjà uploadée — on réutilise l'ID obtenu
    const videoId    = '1743378396674045';
    console.log(`✅ Upload vidéo MOV (déjà fait)\n   → video_id: ${videoId}`);

    const creativeId = await step('Création nouveau creative', () => createCreative(videoId));
    console.log(`   → creative_id: ${creativeId}`);

    await step(`Mise à jour de l'ad ${AD_ID}`, () => updateAd(creativeId));

    console.log('\n✅ Done — la nouvelle vidéo UGC est active dans la campagne.');
  } catch (e) {
    console.error('\n❌ Erreur :', e.message);
    process.exit(1);
  }
})();
