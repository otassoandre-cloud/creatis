/* ===== CRÉATIS — INTÉGRATIONS YOUTUBE & STRIPE ===== */

/* ============================================================
 * YOUTUBE OAUTH 2.0
 * ============================================================ */
const YouTube = {
  /* Lance le flow OAuth — redirige vers Google */
  connecter() {
    if (!CONFIG.estYouTubeConfigured()) {
      console.warn('YOUTUBE_CLIENT_ID non configuré dans config.js');
      afficherAlerte('Connexion YouTube non disponible — clé manquante dans config.js');
      return;
    }

    const params = new URLSearchParams({
      client_id: CONFIG.YOUTUBE_CLIENT_ID,
      redirect_uri: CONFIG.YOUTUBE_REDIRECT_URI,
      response_type: 'token',
      scope: CONFIG.YOUTUBE_SCOPES,
      prompt: 'select_account',
      state: 'creatis_oauth_' + Date.now()
    });

    window.location.href = `${CONFIG.YOUTUBE_AUTH_URL}?${params.toString()}`;
  },

  /* Récupère le token depuis le hash URL après redirection */
  traiterCallback() {
    const hash = window.location.hash.substring(1);
    if (!hash) return null;

    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');

    if (!accessToken) return null;

    const expiration = Date.now() + parseInt(expiresIn || '3600') * 1000;
    const tokenData = { token: accessToken, expiration };

    localStorage.setItem('creatis_yt_token', JSON.stringify(tokenData));

    // Nettoyer le hash de l'URL
    window.history.replaceState(null, '', window.location.pathname);

    return accessToken;
  },

  /* Obtient le token stocké (vérifie l'expiration) */
  getToken() {
    try {
      const data = JSON.parse(localStorage.getItem('creatis_yt_token'));
      if (!data) return null;
      if (Date.now() > data.expiration) {
        localStorage.removeItem('creatis_yt_token');
        return null;
      }
      return data.token;
    } catch { return null; }
  },

  estConnecte() {
    return !!this.getToken();
  },

  deconnecter() {
    localStorage.removeItem('creatis_yt_token');
    localStorage.removeItem('creatis_user');
  },

  /* Appel générique à l'API YouTube Data v3 */
  async appel(endpoint, params = {}) {
    const token = this.getToken();
    if (!token) throw new Error('Non connecté à YouTube');

    const searchParams = new URLSearchParams({ ...params, access_token: token });
    const url = `${CONFIG.YOUTUBE_API_URL}/${endpoint}?${searchParams}`;

    const reponse = await fetch(url);
    if (!reponse.ok) {
      const erreur = await reponse.json().catch(() => ({}));
      throw new Error(erreur.error?.message || `Erreur YouTube API (${reponse.status})`);
    }
    return reponse.json();
  },

  /* Récupère le profil de l'utilisateur connecté */
  async getProfil() {
    const data = await this.appel('channels', {
      part: 'snippet,statistics',
      mine: 'true'
    });

    const chaine = data.items?.[0];
    if (!chaine) throw new Error('Aucune chaîne YouTube trouvée');

    return {
      id: chaine.id,
      nom: chaine.snippet?.title,
      description: chaine.snippet?.description,
      avatar: chaine.snippet?.thumbnails?.medium?.url,
      abonnes: parseInt(chaine.statistics?.subscriberCount || 0),
      vues: parseInt(chaine.statistics?.viewCount || 0),
      videos: parseInt(chaine.statistics?.videoCount || 0),
      pays: chaine.snippet?.country
    };
  },

  /* Récupère les dernières vidéos */
  async getVideos(maxResults = 10) {
    const data = await this.appel('search', {
      part: 'snippet',
      forMine: 'true',
      type: 'video',
      order: 'date',
      maxResults
    });

    return (data.items || []).map(v => ({
      id: v.id?.videoId,
      titre: v.snippet?.title,
      description: v.snippet?.description,
      miniature: v.snippet?.thumbnails?.medium?.url,
      datePublication: v.snippet?.publishedAt
    }));
  },

  /* Récupère les commentaires d'une vidéo */
  async getCommentaires(videoId, maxResults = 50) {
    const data = await this.appel('commentThreads', {
      part: 'snippet',
      videoId,
      maxResults,
      order: 'relevance'
    });

    return (data.items || []).map(c => ({
      id: c.id,
      texte: c.snippet?.topLevelComment?.snippet?.textDisplay,
      auteur: c.snippet?.topLevelComment?.snippet?.authorDisplayName,
      likes: c.snippet?.topLevelComment?.snippet?.likeCount,
      date: c.snippet?.topLevelComment?.snippet?.publishedAt
    }));
  },

  /* Récupère les stats d'analytics (si permission accordée) */
  async getStats() {
    return this.getProfil();
  }
};

/* ============================================================
 * STRIPE PAIEMENTS
 * ============================================================ */
const Stripe_Integration = {
  stripe: null,

  init() {
    if (!CONFIG.estStripeConfigured()) return false;
    if (typeof Stripe !== 'undefined') {
      this.stripe = Stripe(CONFIG.STRIPE_PUBLIC_KEY);
      return true;
    }
    return false;
  },

  /* Sauvegarde le plan cible avant l'auth OAuth */
  sauvegarderPlanCible(plan, annuel = false) {
    if (plan && CONFIG.PLANS[plan] && plan !== 'gratuit') {
      localStorage.setItem('creatis_plan_cible', plan);
      if (annuel) localStorage.setItem('creatis_plan_cible_annuel', '1');
      else localStorage.removeItem('creatis_plan_cible_annuel');
    }
  },

  /* Récupère et efface le plan cible post-auth */
  getPlanCible() {
    const plan = localStorage.getItem('creatis_plan_cible');
    localStorage.removeItem('creatis_plan_cible');
    return plan;
  },

  /* Récupère et efface le flag annuel du plan cible */
  getAnnuelCible() {
    const annuel = localStorage.getItem('creatis_plan_cible_annuel') === '1';
    localStorage.removeItem('creatis_plan_cible_annuel');
    return annuel;
  },

  /* Lance une session de paiement Stripe Checkout */
  async lancerPaiement(plan, annuel = false) {
    const planConfig = CONFIG.PLANS[plan];
    if (!planConfig || (!planConfig.stripeId && !planConfig.stripeIdAnnuel)) {
      afficherAlerte(`Plan "${plan}" non configuré — configure les stripeId dans config.js`);
      return;
    }

    if (!CONFIG.estStripeConfigured()) {
      afficherAlerte('Stripe non configuré — ajoute STRIPE_PUBLIC_KEY dans config.js (dashboard.stripe.com/apikeys)');
      return;
    }

    if (!this.stripe && !this.init()) {
      afficherAlerte('Impossible d\'initialiser Stripe — recharge la page');
      return;
    }

    try {
      const priceId = annuel ? (planConfig.stripeIdAnnuel || planConfig.stripeId) : planConfig.stripeId;
      const currentUser = JSON.parse(localStorage.getItem('creatis_user') || '{}');

      // Sauvegarder les infos pour paiement.html
      sessionStorage.setItem('creatis_paiement', JSON.stringify({
        priceId, plan, annuel,
        userId: this.getUserId(),
        userEmail: currentUser.email || null
      }));
      window.location.href = 'paiement.html';
      return;

    } catch (erreur) {
      console.error('Erreur Stripe:', erreur);
      afficherAlerte('Erreur paiement : ' + erreur.message);
    }
  },

  async verifierAbonnement() {
    const user = JSON.parse(localStorage.getItem('creatis_user') || '{}');
    return user.plan || 'gratuit';
  },

  getUserId() {
    const user = JSON.parse(localStorage.getItem('creatis_user') || '{}');
    return user.id || user.email || 'anonymous';
  }
};

/* ============================================================
 * UTILITAIRES
 * ============================================================ */
function afficherAlerte(message) {
  if (typeof app !== 'undefined' && app.afficherToast) {
    app.afficherToast(message, 'erreur');
  } else {
    alert(message);
  }
}
