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
  GROQ_MODEL: 'llama-3.3-70b-versatile',
  GEMINI_IMAGE_MODEL: 'gemini-2.0-flash-exp-image-generation', // non utilisé (Together AI actif)
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
  PLANS: {
    gratuit: {
      nom: 'Gratuit',
      prix: 0,
      generations: 1, // 1 génération gratuite pour découvrir
      miniatures: 5,
      agents: ['clips-viraux', 'youtube-complet', 'idees-videos', 'chat-libre'],
      description: '10 générations/mois · 5 miniatures pour tester',
      stripeId: null
    },
    pro: {
      nom: 'Pro',
      prix: 19,
      prixAnnuel: 15,
      generations: 50,
      miniatures: 30,
      agents: 'tous',
      description: '50 générations/mois · 30 miniatures/mois',
      stripeId: 'price_1TWISZAptK6HZtp5uBP0RHe8',
      stripeIdAnnuel: 'price_1TWIU8AptK6HZtp5SbYvQ12d'
    },
    studio: {
      nom: 'Studio',
      prix: 49,
      prixAnnuel: 39,
      generations: -1, // illimité
      miniatures: 100,
      agents: 'tous',
      description: 'Générations illimitées · 100 miniatures/mois',
      stripeId: 'price_1TWIV6AptK6HZtp5qlNhu47w',
      stripeIdAnnuel: 'price_1TWIVeAptK6HZtp5zIef773D'
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
