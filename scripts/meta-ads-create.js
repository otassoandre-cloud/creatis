/**
 * Créatis — Création campagne Meta Ads API
 * Lance : node scripts/meta-ads-create.js
 *
 * Prérequis dans .env :
 *   META_ACCESS_TOKEN=...   (token user avec ads_management + ads_read)
 *   META_AD_ACCOUNT_ID=...  (format act_XXXXXXXXX)
 *   META_PAGE_ID=...        (ID page Facebook Créatis)
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = (...a) => import('node-fetch').then(m => m.default(...a));

/* ── Config ────────────────────────────────────────────────────── */
const TOKEN      = process.env.META_ACCESS_TOKEN;
const AD_ACCOUNT = process.env.META_AD_ACCOUNT_ID; // act_XXXXXXXXX
const PAGE_ID    = process.env.META_PAGE_ID;
const IG_ID      = process.env.META_INSTAGRAM_ID;
const API        = 'https://graph.facebook.com/v20.0';
const SITE_URL   = 'https://creatis.app/lp';

if (!TOKEN || !AD_ACCOUNT || !PAGE_ID) {
  console.error('❌  Manque META_ACCESS_TOKEN, META_AD_ACCOUNT_ID ou META_PAGE_ID dans .env');
  process.exit(1);
}


/* ── Visuels + textes ──────────────────────────────────────────── */
const ADS = [
  {
    nom:    'Visuel 1 — FOMO Script',
    image:  path.resolve(__dirname, '../images/ads/slide1.jpg'),
    titre:  'Pendant que tu prépares, ils publient.',
    corps:  `Pendant que tu cherches ton script, les autres ont déjà publié.

Créatis gère tout à ta place :
⚡ Script + titre accrocheur en 30 secondes
🖼️ Miniature pro générée par l'IA
🔄 10 Shorts viraux 9:16 depuis tes vidéos longues
💬 Captions automatiques prêts à publier
📲 Pour YouTube, TikTok, Instagram & LinkedIn

Crée plus. Prépare moins. Publie plus vite.

→ 1 essai gratuit. Sans carte bancaire.`,
    cta:    'SIGN_UP',
    lien:   SITE_URL,
  },
  {
    nom:       'Visuel 2 — UGC Vidéo',
    image:     path.resolve('C:/Users/Utilisateur/Desktop/ADS META/e6bf0f75db754d26a5bf44b4958ab655.MOV'),
    thumbnail: path.resolve('C:/Users/Utilisateur/Desktop/ADS META/thumbnail.jpg'),
    isGif:     true,
    titre:     'Une vidéo → 10 Shorts viraux en 30s',
    corps:     `J'ai testé tous les outils de montage IA.

Créatis est le seul qui découpe vraiment bien :
✂️ Détection des moments viraux automatique
🎯 Face tracking + recadrage 9:16 parfait
💬 Captions burnées proprement
📊 Score de viralité sur chaque clip

J'uploader ma vidéo et j'ai mes Shorts prêts en 30 secondes.

→ 1 essai gratuit. Sans carte bancaire.`,
    cta:    'SIGN_UP',
    lien:   SITE_URL,
  },
  {
    nom:    'Visuel 3 — GIF Shorts',
    image:  path.resolve('C:/Users/Utilisateur/Desktop/ADS META/creatis-6s-ad.gif'),
    isGif:  true,
    titre:  'Une vidéo. Dix Shorts. Trente secondes.',
    corps:  `Tu as une vidéo ? Créatis la transforme en 10 Shorts viraux prêts à publier partout :

🚀 Détection automatique des meilleurs moments
✂️ Découpage 9:16 avec tracking de visage
💬 Captions burnées automatiquement
📊 Score viral sur chaque clip
📲 TikTok · Instagram Reels · YouTube Shorts · Snapchat

Une vidéo. Dix Shorts. Trente secondes.

→ 1 essai gratuit. Sans carte bancaire.`,
    cta:    'SIGN_UP',
    lien:   SITE_URL,
  },
  {
    nom:    'Visuel 4 — Tu filmes',
    image:  path.resolve('C:/Users/Utilisateur/Desktop/ADS META/creatis-ad-final.png'),
    titre:  'Tes moments en famille → prêts à partager en 30s',
    corps:  `Ces moments avec tes proches méritent d'être vus.

Tes sorties, tes voyages, tes fous rires — Créatis les transforme en Shorts viraux prêts à envoyer à tes proches.

✨ Automatique. Sans montage. En 30 secondes.
📲 Prêts à partager sur TikTok, Instagram, WhatsApp & Snapchat

Uploade ta vidéo.
Reçois tes Shorts.
Envoie-les à ceux que tu aimes.

→ 1 essai gratuit. Sans carte bancaire.`,
    cta:    'SIGN_UP',
    lien:   SITE_URL,
  },
];

/* ── Helpers API ───────────────────────────────────────────────── */
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
    throw new Error(`[Meta API] ${msg} (code ${data.error.code}/${data.error.error_subcode})`);
  }
  return data;
}

async function uploadImage(filePath) {
  const filename = path.basename(filePath);
  const form     = new FormData();
  form.append(filename, fs.createReadStream(filePath), { filename });
  form.append('access_token', TOKEN);

  const res  = await fetch(`${API}/${AD_ACCOUNT}/adimages`, { method: 'POST', body: form });
  const data = await res.json();
  if (data.error) throw new Error(`[Upload image] ${data.error.error_user_msg || data.error.message}`);

  const images = data.images;
  const key    = Object.keys(images)[0];
  return images[key].hash;
}

async function uploadGif(filePath) {
  const form = new FormData();
  form.append('source', fs.createReadStream(filePath));
  form.append('access_token', TOKEN);

  const res  = await fetch(`${API}/${AD_ACCOUNT}/advideos`, { method: 'POST', body: form });
  const data = await res.json();
  if (data.error) throw new Error(`[Upload GIF] ${data.error.message}`);
  return data.id;
}

/* ── Étape 1 — Campagne ────────────────────────────────────────── */
async function creerCampagne() {
  console.log('\n📣  Création de la campagne…');
  const camp = await apiPost(`${AD_ACCOUNT}/campaigns`, {
    name:                          'Créatis — UGC — ' + new Date().toLocaleDateString('fr-FR'),
    objective:                     'OUTCOME_TRAFFIC',
    status:                        'ACTIVE',
    special_ad_categories:         [],
    is_adset_budget_sharing_enabled: false,
  });
  console.log(`✅  Campagne créée : ${camp.id}`);
  return camp.id;
}

/* ── Étape 2 — Ad Set ──────────────────────────────────────────── */
async function creerAdSet(campaignId) {
  console.log('\n🎯  Création de l\'ad set (18-35 ans, France)…');
  const adSet = await apiPost(`${AD_ACCOUNT}/adsets`, {
    name:               'Créatis — Créateurs contenu — 18-35 — FR',
    campaign_id:        campaignId,
    billing_event:      'IMPRESSIONS',
    optimization_goal:  'LANDING_PAGE_VIEWS',
    bid_strategy:       'LOWEST_COST_WITHOUT_CAP',
    daily_budget:       1000,
    status:             'ACTIVE',
    targeting: {
      age_min:          18,
      age_max:          35,
      geo_locations:    { countries: ['FR'], location_types: ['home', 'recent'] },
      locales:          [44, 9],
      flexible_spec: [
        {
          interests: [
            { id: '6002898176962', name: 'Intelligence artificielle (informatique)' },
            { id: '6002968393168', name: 'A.I. Intelligence artificielle' },
            { id: '6003456566340', name: 'Montage vidéo' },
            { id: '6004158316095', name: 'YouTube (service de streaming)' },
          ],
        },
      ],
      publisher_platforms:  ['facebook', 'instagram'],
      facebook_positions:   ['feed'],
      instagram_positions:  ['stream', 'reels'],
      brand_safety_content_filter_levels: ['FACEBOOK_RELAXED', 'AN_RELAXED'],
      targeting_automation: { advantage_audience: 0 },
    },
  });
  console.log(`✅  Ad Set créé : ${adSet.id}`);
  return adSet.id;
}

/* ── Étape 3 — Créatifs + Ads ──────────────────────────────────── */
async function creerAd(adSetId, ad, index) {
  console.log(`\n🖼️   [${index + 1}/4] Upload image : ${ad.nom}`);

  let creativeBody;

  if (ad.isGif) {
    const videoId = await uploadGif(ad.image);
    console.log(`     → GIF uploadé : ${videoId}`);
    creativeBody = {
      name:     ad.nom,
      object_story_spec: {
        page_id: PAGE_ID,
        video_data: {
          video_id:   videoId,
          image_hash: await uploadImage(ad.thumbnail || path.resolve(__dirname, '../images/ads/gif-thumbnail.jpg')),
          message:    ad.corps,
          title:      ad.titre,
          call_to_action: {
            type:  ad.cta,
            value: { link: ad.lien },
          },
        },
      },
    };
  } else {
    const hash = await uploadImage(ad.image);
    console.log(`     → Hash image : ${hash}`);
    creativeBody = {
      name:     ad.nom,
      object_story_spec: {
        page_id:           PAGE_ID,
        instagram_user_id: IG_ID,
        link_data: {
          image_hash:  hash,
          link:        ad.lien,
          message:     ad.corps,
          name:        ad.titre,
          call_to_action: {
            type:  ad.cta,
            value: { link: ad.lien },
          },
        },
      },
    };
  }

  const creative = await apiPost(`${AD_ACCOUNT}/adcreatives`, creativeBody);
  console.log(`     → Créatif créé : ${creative.id}`);

  const adObj = await apiPost(`${AD_ACCOUNT}/ads`, {
    name:        ad.nom,
    adset_id:    adSetId,
    creative:    { creative_id: creative.id },
    status:      'ACTIVE',
  });
  console.log(`✅   Ad créée : ${adObj.id}`);
  return adObj.id;
}

/* ── Main ──────────────────────────────────────────────────────── */
// Pour ne lancer qu'un seul visuel : node scripts/meta-ads-create.js ugc
const SINGLE = process.argv[2]; // 'ugc' = Visuel 2 seulement, sinon tous
const adsToRun = SINGLE === 'ugc' ? [ADS[1]] : ADS;

(async () => {
  console.log('🚀  Création campagne Meta Ads — Créatis');
  console.log('   Compte : ' + AD_ACCOUNT);
  console.log('   Page   : ' + PAGE_ID);
  console.log('   Mode   : ' + (SINGLE === 'ugc' ? 'UGC vidéo seulement' : 'Tous les visuels'));

  try {
    const campId  = await creerCampagne();
    const adSetId = await creerAdSet(campId);

    const adIds = [];
    for (let i = 0; i < adsToRun.length; i++) {
      const id = await creerAd(adSetId, adsToRun[i], i);
      adIds.push(id);
    }

    console.log('\n✅  CAMPAGNE ACTIVE — publiée directement');
    console.log('   Campagne  :', campId);
    console.log('   Ad Set    :', adSetId);
    console.log('   Ads       :', adIds.join(', '));
    console.log('\n→  Visible dans business.facebook.com/adsmanager');

  } catch (err) {
    console.error('\n❌  Erreur :', err.message);
    process.exit(1);
  }
})();
