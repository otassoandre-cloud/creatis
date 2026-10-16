/**
 * Met à jour la vidéo de l'ad "Visuel UGC — Clips Viraux v2"
 * Lance : node scripts/update-ugc-video.js
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = (...a) => import('node-fetch').then(m => m.default(...a));

const TOKEN      = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT = process.env.META_AD_ACCOUNT_ID;
const PAGE_ID    = process.env.META_PAGE_ID;
const API        = 'https://graph.facebook.com/v20.0';

const NEW_VIDEO   = path.resolve('C:/Users/Utilisateur/Desktop/ADS META/e6bf0f75db754d26a5bf44b4958ab655.MOV');
const THUMBNAIL   = path.resolve('C:/Users/Utilisateur/Desktop/creatis/images/ads/slide1.jpg');

// ID de la campagne du 30/05
const CAMPAIGN_ID = '120248707209220683';

async function listAds() {
  const url = `${API}/${AD_ACCOUNT}/ads?fields=id,name,status,creative{id,name}&campaign_id=${CAMPAIGN_ID}&access_token=${TOKEN}&limit=50`;
  const res  = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data;
}

async function uploadVideo() {
  console.log('📹  Upload de la nouvelle vidéo…');
  const form = new FormData();
  form.append('source', fs.createReadStream(NEW_VIDEO));
  form.append('access_token', TOKEN);
  const res  = await fetch(`${API}/${AD_ACCOUNT}/advideos`, { method: 'POST', body: form });
  const data = await res.json();
  if (data.error) throw new Error(`[Upload vidéo] ${data.error.message}`);
  console.log(`✅  Vidéo uploadée : ${data.id}`);
  return data.id;
}

async function uploadThumbnail() {
  const form = new FormData();
  const filename = path.basename(THUMBNAIL);
  form.append(filename, fs.createReadStream(THUMBNAIL), { filename });
  form.append('access_token', TOKEN);
  const res  = await fetch(`${API}/${AD_ACCOUNT}/adimages`, { method: 'POST', body: form });
  const data = await res.json();
  if (data.error) throw new Error(`[Upload thumbnail] ${data.error.message}`);
  const key = Object.keys(data.images)[0];
  return data.images[key].hash;
}

async function apiPost(endpoint, body) {
  const url    = `${API}/${endpoint}`;
  const params = new URLSearchParams();
  params.append('access_token', TOKEN);
  for (const [k, v] of Object.entries(body)) {
    params.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  const res  = await fetch(url, { method: 'POST', body: params });
  const data = await res.json();
  if (data.error) {
    const msg = data.error.error_user_msg || data.error.message;
    throw new Error(`[Meta API] ${msg} (code ${data.error.code})`);
  }
  return data;
}

async function createCreative(videoId, thumbHash, adName) {
  return (await apiPost(`${AD_ACCOUNT}/adcreatives`, {
    name: adName + ' — nouvelle video',
    object_story_spec: {
      page_id: PAGE_ID,
      video_data: {
        video_id:  videoId,
        image_url: 'https://creatis.app/images/ads/slide1.jpg',
        message:    "J'ai teste tous les outils de montage IA.\n\nCreatis est le seul qui decoupe vraiment bien :\n- Detection des moments viraux automatique\n- Face tracking + recadrage 9:16 parfait\n- Captions burnees proprement\n- Score de viralite sur chaque clip\n\nJ'uploade ma video et j'ai mes Shorts prets en 30 secondes.\n\nAnalyse gratuite. Sans carte bancaire.",
        title:      'Une video - 10 Shorts viraux en 30s',
        call_to_action: {
          type:  'SIGN_UP',
          value: { link: 'https://creatis.app/lp' },
        },
      },
    },
  })).id;
}

async function updateAd(adId, creativeId) {
  const params = new URLSearchParams();
  params.append('access_token', TOKEN);
  params.append('creative', JSON.stringify({ creative_id: creativeId }));
  const res  = await fetch(`${API}/${adId}`, { method: 'POST', body: params });
  const data = await res.json();
  if (data.error) throw new Error(`[Update ad] ${data.error.message}`);
  return data;
}

async function deleteNewCampaign() {
  // Supprimer la campagne créée par erreur tout à l'heure
  const NEW_CAMPAIGN = '120248919722500683';
  const params = new URLSearchParams();
  params.append('access_token', TOKEN);
  params.append('status', 'DELETED');
  const res  = await fetch(`${API}/${NEW_CAMPAIGN}`, { method: 'POST', body: params });
  const data = await res.json();
  console.log('🗑️   Campagne en double supprimée :', data.success ? 'OK' : JSON.stringify(data));
}

(async () => {
  try {
    console.log('🔍  Recherche de l\'ad UGC dans la campagne du 30/05…');
    const ads = await listAds();
    console.log('   Ads trouvées :');
    ads.forEach(a => console.log(`   - [${a.id}] ${a.name} (${a.status})`));

    const ugcAd = ads.find(a => a.name.toLowerCase().includes('ugc'));
    if (!ugcAd) {
      console.log('\n⚠️   Pas d\'ad "UGC" trouvée. Voici toutes les ads — indique l\'ID à mettre à jour :');
      ads.forEach(a => console.log(`   node scripts/update-ugc-video.js ${a.id}`));
      process.exit(0);
    }

    console.log(`\n✅  Ad UGC trouvée : [${ugcAd.id}] ${ugcAd.name}`);

    const videoId   = await uploadVideo();
    const thumbHash = await uploadThumbnail();
    console.log(`✅  Thumbnail uploadée : ${thumbHash}`);

    const creativeId = await createCreative(videoId, ugcAd.name);
    console.log(`✅  Nouveau créatif : ${creativeId}`);

    await updateAd(ugcAd.id, creativeId);
    console.log(`✅  Ad mise à jour avec la nouvelle vidéo`);

    await deleteNewCampaign();

    console.log('\n🎉  Terminé — la vidéo UGC est remplacée dans la campagne du 30/05.');

  } catch (err) {
    console.error('\n❌  Erreur :', err.message);
    process.exit(1);
  }
})();
