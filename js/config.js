/* ===== CRÉATIS — CONFIGURATION ===== */

const CONFIG = {
  /* ======================================
   * CLÉS API — À REMPLIR
   * ====================================== */
  // API keys sont gérées côté serveur (Vercel env vars) — ne jamais mettre ici en prod
  GROQ_API_KEY: '',           // Laissé vide — appels via /api/groq (proxy sécurisé)
  GEMINI_API_KEY: '',
  TOGETHER_API_KEY: '',       // Laissé vide — appels via /api/generate-image
  HF_TOKEN: '',
  STRIPE_PUBLIC_KEY: 'pk_live_51TVnwOAptK6HZtp5ZmWHF3ug1RQltYbAzTesqQHHdZ3UqXRHp0vUnZ1CK376qfdUYP4294XZTjuiKpCl11KF0CpK00fqYK1cAI',
  YOUTUBE_CLIENT_ID: '',     // https://console.cloud.google.com/apis/credentials

  /* ======================================
   * SUPABASE
   * ====================================== */
  SUPABASE_URL: 'https://zjzcgcpphzcghigzpghq.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_pXryfyg4vvBzoJqD5Gr1_Q_R_VKDzwg',

  /* ======================================
   * MODÈLES IA
   * ====================================== */
  GROQ_MODEL: 'openai/gpt-oss-120b',
  // Hors service chez Google depuis 2026, et de toute facon jamais branche (Together AI actif).
  // Laisse tel quel volontairement : ne pas inventer un nom de remplacement sans l'avoir teste.
  GEMINI_IMAGE_MODEL: null,
  TOGETHER_IMAGE_MODEL: 'black-forest-labs/FLUX.1-schnell-Free',
  TOGETHER_URL: 'https://api.together.xyz/v1/images/generations',
  HF_URL: 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',

  /* ======================================
   * ENDPOINTS API
   * ====================================== */
  // Endpoints — proxy sécurisé Vercel Functions en production
  GROQ_URL: '/api/groq',
  TOGETHER_URL: '/api/generate-image',
  USER_SYNC_URL: '/api/user-sync',
  GEMINI_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
  YOUTUBE_API_URL: 'https://www.googleapis.com/youtube/v3',

  /* ======================================
   * YOUTUBE OAUTH
   * ====================================== */
  YOUTUBE_SCOPES: [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ].join(' '),

  get YOUTUBE_REDIRECT_URI() {
    return window.location.origin + '/app.html';
  },

  YOUTUBE_AUTH_URL: 'https://accounts.google.com/o/oauth2/v2/auth',

  /* ======================================
   * BREVO — clé côté serveur uniquement (Vercel env vars)
   * Les appels Brevo passent par /api/email-sequence
   * ====================================== */

  /* ======================================
   * STRIPE — CODES PROMO
   * ====================================== */
  STRIPE_PROMO_CODE: 'LAUNCH50',  // -50% premier mois offre de lancement
  STRIPE_SUCCESS_URL: window.location.origin + '/success.html?session_id={CHECKOUT_SESSION_ID}',
  STRIPE_CANCEL_URL: window.location.origin + '/cancel.html',


  /* ======================================
   * PLANS TARIFAIRES — 3 plans
   * ====================================== */
  /* Quotas : `videos` = analyses lancées, `clips` = clips téléchargés (exports), par mois.
     Les deux comptent — une analyse coûte surtout du CPU de transcription, un export coûte du
     téléchargement + de l'encodage. Plafonner seulement les clips laissait la porte ouverte à
     quelqu'un qui analyse 200 vidéos sans rien exporter (le poste le plus cher). */
  PLANS: {
    // Découverte — plus affiché dans la grille tarifaire, mais accordé à l'inscription : c'est le
    // tunnel d'acquisition. 2 analyses (et non 1) pour qu'un échec ne condamne pas le compte —
    // 6 analyses sur 24 échouaient sur 3 jours, une seule tentative aurait suffi à perdre la personne.
    gratuit: {
      nom: 'Découverte',
      prix: 0,
      videos: 2,
      clips: 0,          // aucun téléchargement — l'analyse et l'aperçu restent gratuits
      generations: 0,
      miniatures: 0,
      agents: ['clips-viraux'],
      description: 'Analyse et aperçu gratuits · téléchargement réservé aux plans payants',
      masqueDansGrille: true,
      stripeId: null
    },
    starter: {
      nom: 'Starter',
      prix: 9.95,
      videos: 5,
      clips: 20,
      generations: 20,
      miniatures: 0,
      agents: ['clips-viraux'],
      description: '20 clips/mois · 5 vidéos analysées',
      stripeId: 'price_1Tx8TXAptK6HZtp5vB5clklV'
    },
    pro: {
      nom: 'Pro',
      prix: 14,
      prixAnnuel: 139,
      videos: 30,
      clips: 150,
      generations: 150,
      miniatures: 30,
      agents: 'tous',
      description: '150 clips/mois · 30 vidéos · tous les outils IA',
      stripeId: 'price_1Tx8U8AptK6HZtp5DrLkfs5m',
      stripeIdAnnuel: 'price_1TxaweAptK6HZtp5p0LjSDk5'
    }
  },

  /* ======================================
   * PARAMÈTRES APP
   * ====================================== */
  APP_NOM: 'Créatis',
  VERSION: '1.0.0',
  DEBUG: false,

  /* ======================================
   * MÉTHODES UTILITAIRES
   * ====================================== */
  estConfigured() {
    // En production, les clés sont côté serveur — on assume toujours configuré
    return true;
  },

  estImageConfigured() {
    return true; // HuggingFace FLUX.1-schnell — gratuit, aucune clé requise
  },

  estYouTubeConfigured() {
    return this.YOUTUBE_CLIENT_ID && this.YOUTUBE_CLIENT_ID.length > 10;
  },

  estStripeConfigured() {
    return this.STRIPE_PUBLIC_KEY && this.STRIPE_PUBLIC_KEY.startsWith('pk_');
  },

  estSupabaseConfigured() {
    return !!(this.SUPABASE_URL && this.SUPABASE_ANON_KEY &&
      this.SUPABASE_URL.includes('supabase.co') &&
      this.SUPABASE_ANON_KEY.length > 20);
  }
};
