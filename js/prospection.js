/* ===== CRÉATIS — AGENT PROSPECTION SPONSORS ===== */

const Prospection = {
  /* Base de données de marques par niche */
  marqesParNiche: {
    finance: [
      'Trade Republic', 'Boursorama', 'Fortuneo', 'Nalo', 'Yomoni',
      'Linxea', 'Ramify', 'Finary', 'Cashbee', 'Mon Petit Placement',
      'Shine', 'Qonto', 'Revolut Business', 'N26', 'Lydia'
    ],
    developpement_personnel: [
      'Audible', 'Blinkist', 'Headspace', 'Calm', 'Notion',
      'Skillshare', 'Coursera', 'Udemy', 'MasterClass', 'Readwise',
      'Roam Research', 'Obsidian', 'Todoist', 'Things', 'Superhuman'
    ],
    gaming: [
      'Razer', 'Corsair', 'SteelSeries', 'HyperX', 'Logitech',
      'ASUS ROG', 'MSI', 'NZXT', 'Secretlab', 'Herman Miller',
      'NordVPN', 'Surfshark', 'ExpressVPN', 'G2A', 'Fanatical'
    ],
    tech: [
      'NordVPN', 'Surfshark', 'Dashlane', '1Password', 'Bitwarden',
      'Hostinger', 'OVHcloud', 'Cloudflare', 'Notion', 'Figma',
      'Canva Pro', 'Adobe Creative Cloud', 'Setapp', 'CleanMyMac', 'Raycast'
    ],
    fitness: [
      'Gymshark', 'MyProtein', 'Decathlon', 'Under Armour', 'Nike Training',
      'Whoop', 'Garmin', 'Polar', 'Freeletics', 'Noom',
      'Huel', 'Foodspring', 'Apurna', 'Protéalpes', 'Eric Favre'
    ],
    cuisine: [
      'HelloFresh', 'Quitoque', 'La Belle Vie', 'Picard', 'Marmiton Premium',
      'Kenwood', 'KitchenAid', 'Vitamix', 'Le Creuset', 'Zwilling',
      'Amazon Fresh', 'Cronuts', 'Deliveroo', 'Uber Eats', 'Deliverect'
    ],
    voyage: [
      'Booking.com', 'Airbnb', 'SafetyWing', 'World Nomads', 'Revolut',
      'Wise', 'Priority Pass', 'Lounge Key', 'G Adventures', 'Intrepid',
      'Expedia', 'TripAdvisor', 'GetYourGuide', 'Viator', 'Klook'
    ],
    entrepreneuriat: [
      'Shopify', 'WooCommerce', 'Stripe', 'PayPlug', 'Mollie',
      'HubSpot', 'Pipedrive', 'Monday.com', 'Asana', 'ClickUp',
      'Mailchimp', 'Brevo', 'ActiveCampaign', 'Lemlist', 'Phantombuster'
    ]
  },

  /* Détecte la niche la plus proche */
  detecterNiche(texte) {
    const text = texte.toLowerCase();
    const niches = {
      finance: ['finance', 'bourse', 'investissement', 'argent', 'crypto', 'trading', 'épargne', 'patrimoine'],
      developpement_personnel: ['développement personnel', 'productivité', 'mindset', 'motivation', 'habitudes', 'bien-être', 'méditation'],
      gaming: ['gaming', 'jeux vidéo', 'stream', 'esport', 'fps', 'rpg', 'minecraft', 'gta', 'lol'],
      tech: ['tech', 'technologie', 'développement', 'code', 'ia', 'intelligence artificielle', 'startup', 'numérique'],
      fitness: ['fitness', 'sport', 'musculation', 'nutrition', 'santé', 'yoga', 'course', 'crossfit'],
      cuisine: ['cuisine', 'recette', 'gastronomie', 'food', 'restaurant', 'pâtisserie', 'chef'],
      voyage: ['voyage', 'travel', 'nomade', 'aventure', 'backpack', 'pays', 'monde', 'découverte'],
      entrepreneuriat: ['entrepreneur', 'business', 'freelance', 'startup', 'marketing', 'vente', 'e-commerce', 'dropshipping']
    };

    let nicheDetectee = null;
    let scoreMax = 0;

    for (const [niche, mots] of Object.entries(niches)) {
      const score = mots.filter(mot => text.includes(mot)).length;
      if (score > scoreMax) {
        scoreMax = score;
        nicheDetectee = niche;
      }
    }

    return nicheDetectee;
  },

  /* Suggestions de marques pour une niche */
  getSuggestions(niche, limite = 10) {
    const nicheDetectee = this.detecterNiche(niche);
    if (!nicheDetectee) return [];

    const marques = this.marqesParNiche[nicheDetectee] || [];
    return marques.slice(0, limite);
  },

  /* Calcule le tarif recommandé selon les abonnés */
  calculerTarif(abonnes, engagement = 5) {
    let base;

    if (abonnes < 1000) base = 50;
    else if (abonnes < 5000) base = 150;
    else if (abonnes < 10000) base = 300;
    else if (abonnes < 25000) base = 600;
    else if (abonnes < 50000) base = 1200;
    else if (abonnes < 100000) base = 2500;
    else if (abonnes < 500000) base = 6000;
    else base = 15000;

    // Bonus engagement
    const multiplicateurEngagement = engagement > 7 ? 1.3 : engagement > 4 ? 1.0 : 0.8;

    return {
      placement_60s: Math.round(base * multiplicateurEngagement),
      video_dediee: Math.round(base * multiplicateurEngagement * 2.5),
      serie_3_videos: Math.round(base * multiplicateurEngagement * 6),
      ambassadeur_mensuel: Math.round(base * multiplicateurEngagement * 4)
    };
  },

  /* Génère un email de prospection de base (sans IA) */
  genererEmailBase(donnes) {
    const { marque, nomCreateur, niche, abonnes, vues } = donnes;

    return `Objet : Partenariat ${marque} × ${nomCreateur || 'votre chaîne'} — Opportunité ${niche}

Bonjour à l'équipe ${marque},

Je me permets de vous contacter car je pense qu'un partenariat entre ${marque} et ma chaîne YouTube créerait une vraie valeur pour votre marque.

Ma chaîne est suivie par ${(abonnes || 0).toLocaleString('fr-FR')} abonnés dans la niche ${niche}, générant ${(vues || 0).toLocaleString('fr-FR')} vues par mois.

Ce qui rend cette audience particulièrement intéressante pour ${marque} : elle est composée de personnes directement concernées par vos produits et services.

Je propose un placement naturel et authentique dans mes vidéos, avec un brief créatif pour s'assurer que le message résonne avec mon audience.

Seriez-vous disponible pour un échange rapide de 15 minutes cette semaine ?

Cordialement,
${nomCreateur || '[Votre prénom]'}`;
  },

  /* Formate les données de la chaîne YouTube pour l'agent */
  formaterDonneesChaine(profil) {
    if (!profil) return '';

    const abonnes = profil.abonnes || 0;
    const vues = profil.vues || 0;

    let taille;
    if (abonnes < 1000) taille = 'nano-créateur';
    else if (abonnes < 10000) taille = 'micro-créateur';
    else if (abonnes < 100000) taille = 'créateur mid-tier';
    else taille = 'macro-créateur';

    return `${abonnes.toLocaleString('fr-FR')} abonnés (${taille}), ${vues.toLocaleString('fr-FR')} vues totales`;
  },

  /* Pré-remplit le formulaire de l'agent avec les données YouTube */
  préremplirFormulaire(agentId, profil) {
    if (!profil) return;

    const champStats = document.getElementById(`champ-${agentId}-stats`);
    if (champStats && !champStats.value) {
      champStats.value = this.formaterDonneesChaine(profil);
    }
  }
};

/* Exporter pour usage global */
window.Prospection = Prospection;
