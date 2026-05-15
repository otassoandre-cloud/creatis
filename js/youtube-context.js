/* ===== CRÉATIS — CERVEAU YOUTUBE ===== */
/* Collecte les données réelles de la chaîne connectée
   et construit un contexte de personnalisation pour chaque agent. */

const YouTubeContext = {

  TTL_MS: 30 * 60 * 1000, // 30 min avant de re-fetcher

  /* ============================================================
   * ENTRÉE PRINCIPALE — appelée au chargement de l'app
   * ============================================================ */
  async initialiser(forcer = false) {
    if (!YouTube.estConnecte()) return null;

    const cache = this._lireCache();
    if (cache && !forcer && (Date.now() - cache.timestampCollecte < this.TTL_MS)) {
      console.log('[YouTubeContext] Contexte chargé depuis le cache');
      return cache;
    }

    console.log('[YouTubeContext] Collecte des données de la chaîne...');
    try {
      const contexte = await this._collecter();
      this._ecrireCache(contexte);
      return contexte;
    } catch (err) {
      console.warn('[YouTubeContext] Collecte partielle :', err.message);
      return this._lireCache() || null;
    }
  },

  /* ============================================================
   * COLLECTE COMPLÈTE
   * ============================================================ */
  async _collecter() {
    // Toutes les requêtes en parallèle pour aller vite
    const [profil, topVideos, videosRecentes, commentairesCreateur] = await Promise.allSettled([
      YouTube.getProfil(),
      this._getTopVideos(10),
      this._getVideosRecentes(5),
      this._getReponsesCreateur(30)
    ]);

    const chaine = profil.status === 'fulfilled' ? profil.value : null;
    if (!chaine) throw new Error('Impossible de récupérer le profil de la chaîne');

    const videos = topVideos.status === 'fulfilled' ? topVideos.value : [];
    const recentes = videosRecentes.status === 'fulfilled' ? videosRecentes.value : [];
    const reponses = commentairesCreateur.status === 'fulfilled' ? commentairesCreateur.value : [];

    // Analyse locale (sans API supplémentaire)
    const analyse = this._analyser(chaine, videos, recentes, reponses);

    return {
      chaine,
      topVideos: videos,
      videosRecentes: recentes,
      reponsesCreateur: reponses,
      analyse,
      timestampCollecte: Date.now()
    };
  },

  /* ============================================================
   * REQUÊTES YOUTUBE API
   * ============================================================ */
  async _getTopVideos(max = 10) {
    const data = await YouTube.appel('search', {
      part: 'snippet',
      forMine: 'true',
      type: 'video',
      order: 'viewCount',
      maxResults: max
    });

    const ids = (data.items || []).map(v => v.id?.videoId).filter(Boolean).join(',');
    if (!ids) return [];

    // Récupère les stats détaillées
    const stats = await YouTube.appel('videos', {
      part: 'snippet,statistics,contentDetails',
      id: ids
    });

    return (stats.items || []).map(v => ({
      id: v.id,
      titre: v.snippet?.title || '',
      description: v.snippet?.description?.substring(0, 300) || '',
      tags: v.snippet?.tags || [],
      vues: parseInt(v.statistics?.viewCount || 0),
      likes: parseInt(v.statistics?.likeCount || 0),
      commentaires: parseInt(v.statistics?.commentCount || 0),
      duree: v.contentDetails?.duration || '',
      miniature: v.snippet?.thumbnails?.maxres?.url || v.snippet?.thumbnails?.high?.url || '',
      datePublication: v.snippet?.publishedAt || ''
    }));
  },

  async _getVideosRecentes(max = 5) {
    const data = await YouTube.appel('search', {
      part: 'snippet',
      forMine: 'true',
      type: 'video',
      order: 'date',
      maxResults: max
    });

    return (data.items || []).map(v => ({
      id: v.id?.videoId,
      titre: v.snippet?.title || '',
      miniature: v.snippet?.thumbnails?.medium?.url || '',
      date: v.snippet?.publishedAt || ''
    }));
  },

  async _getReponsesCreateur(max = 30) {
    try {
      const [recentes, profil] = await Promise.all([
        this._getVideosRecentes(3),
        YouTube.getProfil()
      ]);
      const chaineId = profil.id;
      const reponses = [];

      for (const video of recentes.slice(0, 2)) {
        if (!video.id) continue;
        try {
          const data = await YouTube.appel('commentThreads', {
            part: 'replies,snippet',
            videoId: video.id,
            maxResults: 15
          });

          for (const thread of (data.items || [])) {
            const replies = thread.replies?.comments || [];
            for (const r of replies) {
              if (r.snippet?.authorChannelId?.value === chaineId && r.snippet?.textDisplay) {
                reponses.push(r.snippet.textDisplay.substring(0, 200));
              }
            }
          }
        } catch { /* vidéo sans commentaires */ }
      }

      return reponses.slice(0, max);
    } catch { return []; }
  },

  /* ============================================================
   * ANALYSE LOCALE — extrait les patterns sans API
   * ============================================================ */
  _analyser(chaine, topVideos, recentes, reponsesCreateur) {
    return {
      stylesTitres: this._analyserTitres(topVideos),
      formatsGagnants: this._analyserFormats(topVideos),
      tagsFrequents: this._analyserTags(topVideos),
      tonCreateur: this._analyserTon(reponsesCreateur),
      nicheDetectee: this._detecterNiche(chaine, topVideos),
      tauxEngagement: this._calculerEngagement(topVideos),
      heuresPublication: this._analyserHeures(recentes),
      motsClesDescription: this._extraireMotsCles(topVideos)
    };
  },

  _analyserTitres(videos) {
    if (!videos.length) return [];
    const titres = videos.slice(0, 10).map(v => v.titre);

    // Détecter les patterns : chiffres, questions, "comment", etc.
    const patterns = {
      avecChiffres: titres.filter(t => /\d/.test(t)),
      questions: titres.filter(t => /\?/.test(t) || /^(comment|pourquoi|quand|qu[''e]st|est-ce)/i.test(t)),
      avecEmojis: titres.filter(t => /\p{Emoji}/u.test(t)),
      avecNom: titres.filter(t => t.toLowerCase().includes("j'ai") || t.toLowerCase().includes("mon") || t.toLowerCase().includes("ma ")),
      listicles: titres.filter(t => /top\s+\d|#\d|\d\s+(raisons|astuces|erreurs|conseils)/i.test(t))
    };

    // Identifier le type dominant
    const dominant = Object.entries(patterns)
      .sort((a, b) => b[1].length - a[1].length)[0];

    return {
      exemples: titres,
      patterns,
      formatDominant: dominant[0],
      longueurMoyenne: Math.round(titres.reduce((s, t) => s + t.length, 0) / titres.length),
      conseil: this._conseilTitre(patterns, titres)
    };
  },

  _conseilTitre(patterns, titres) {
    if (patterns.avecChiffres.length > titres.length * 0.5) return 'Cette chaîne performe avec des titres contenant des chiffres';
    if (patterns.questions.length > titres.length * 0.4) return 'Cette chaîne performe avec des titres en question';
    if (patterns.avecNom.length > titres.length * 0.4) return 'Cette chaîne performe avec des titres personnels (j\'ai, mon, ma)';
    return 'Cette chaîne utilise des titres variés';
  },

  _analyserFormats(videos) {
    const durees = videos.map(v => {
      const match = v.duree?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!match) return 0;
      return (parseInt(match[1] || 0) * 3600) + (parseInt(match[2] || 0) * 60) + parseInt(match[3] || 0);
    }).filter(d => d > 0);

    if (!durees.length) return { formatPrincipal: 'Non déterminé', dureeMoyenne: 0 };

    const dureeMoy = Math.round(durees.reduce((s, d) => s + d, 0) / durees.length);
    let format;
    if (dureeMoy < 60) format = 'Short (< 1 min)';
    else if (dureeMoy < 300) format = 'Court (1-5 min)';
    else if (dureeMoy < 900) format = 'Moyen (5-15 min)';
    else if (dureeMoy < 1800) format = 'Long (15-30 min)';
    else format = 'Très long (30+ min)';

    return { formatPrincipal: format, dureeMoyenneSecondes: dureeMoy, dureeMoyenneMin: Math.round(dureeMoy / 60) };
  },

  _analyserTags(videos) {
    const compteur = {};
    for (const v of videos) {
      for (const tag of (v.tags || [])) {
        const t = tag.toLowerCase().trim();
        compteur[t] = (compteur[t] || 0) + 1;
      }
    }
    return Object.entries(compteur)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag]) => tag);
  },

  _analyserTon(reponses) {
    if (!reponses.length) return { style: 'Non déterminé', exemples: [] };

    const texte = reponses.join(' ').toLowerCase();
    const indices = {
      tutoiement: (texte.match(/\btu\b|\bton\b|\bta\b|\btes\b/g) || []).length,
      vouvoiement: (texte.match(/\bvous\b|\bvotre\b|\bvos\b/g) || []).length,
      emojis: (texte.match(/\p{Emoji}/gu) || []).length,
      exclamations: (texte.match(/!/g) || []).length,
      questions: (texte.match(/\?/g) || []).length,
      merci: (texte.match(/merci|thanks/g) || []).length
    };

    const style = indices.tutoiement > indices.vouvoiement ? 'tutoiement' : 'vouvoiement';
    const chaleur = indices.emojis + indices.exclamations > 10 ? 'très chaleureux' : 'professionnel';

    return {
      style,
      chaleur,
      utiliseTutoiement: indices.tutoiement > indices.vouvoiement,
      utiliseSouvemojis: indices.emojis > 5,
      exemples: reponses.slice(0, 5)
    };
  },

  _detecterNiche(chaine, videos) {
    const texte = [
      chaine.description || '',
      ...videos.slice(0, 5).map(v => v.titre + ' ' + v.description),
      ...(videos[0]?.tags || [])
    ].join(' ').toLowerCase();

    const niches = [
      { nom: 'Finance & Investissement', mots: ['bourse', 'finance', 'investissement', 'crypto', 'trading', 'épargne', 'argent', 'dividende', 'portefeuille'] },
      { nom: 'Développement Personnel', mots: ['productivité', 'habitudes', 'mindset', 'discipline', 'motivation', 'méditation', 'succès', 'objectifs'] },
      { nom: 'Gaming', mots: ['gaming', 'jeux', 'gameplay', 'fps', 'rpg', 'stream', 'esport', 'minecraft', 'gta', 'fortnite'] },
      { nom: 'Tech & IA', mots: ['tech', 'technologie', 'code', 'programmation', 'ia', 'intelligence artificielle', 'startup', 'application'] },
      { nom: 'Fitness & Santé', mots: ['fitness', 'musculation', 'sport', 'nutrition', 'régime', 'perte de poids', 'entraînement', 'yoga'] },
      { nom: 'Cuisine & Food', mots: ['recette', 'cuisine', 'gastronomie', 'pâtisserie', 'restaurant', 'chef', 'plat', 'food'] },
      { nom: 'Voyage & Aventure', mots: ['voyage', 'travel', 'pays', 'aventure', 'backpack', 'expatrié', 'nomade', 'découverte'] },
      { nom: 'Entrepreneuriat & Business', mots: ['entrepreneur', 'business', 'startup', 'freelance', 'marketing', 'vente', 'e-commerce', 'revenus passifs'] },
      { nom: 'Lifestyle & Vlogs', mots: ['vlog', 'lifestyle', 'routine', 'haul', 'déco', 'beauté', 'mode', 'fashion'] },
      { nom: 'Éducation & Tutoriels', mots: ['tutoriel', 'tuto', 'apprendre', 'formation', 'cours', 'guide', 'débutant', 'niveau'] }
    ];

    let meilleur = { nom: 'Contenu Général', score: 0 };
    for (const niche of niches) {
      const score = niche.mots.filter(m => texte.includes(m)).length;
      if (score > meilleur.score) meilleur = { nom: niche.nom, score };
    }
    return meilleur.nom;
  },

  _calculerEngagement(videos) {
    if (!videos.length) return 0;
    const taux = videos.map(v => v.vues > 0 ? ((v.likes + v.commentaires) / v.vues) * 100 : 0);
    return Math.round((taux.reduce((s, t) => s + t, 0) / taux.length) * 10) / 10;
  },

  _analyserHeures(recentes) {
    if (!recentes.length) return 'Non déterminé';
    const heures = recentes.map(v => new Date(v.date).getHours()).filter(h => !isNaN(h));
    if (!heures.length) return 'Non déterminé';
    const moy = Math.round(heures.reduce((s, h) => s + h, 0) / heures.length);
    return `Habituellement vers ${moy}h00`;
  },

  _extraireMotsCles(videos) {
    const mots = {};
    for (const v of videos) {
      const texte = (v.titre + ' ' + v.description).toLowerCase();
      const tokens = texte.match(/\b[a-zàâéèêëîïôùûüç]{4,}\b/g) || [];
      for (const mot of tokens) {
        mots[mot] = (mots[mot] || 0) + 1;
      }
    }
    return Object.entries(mots)
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([m]) => m);
  },

  /* ============================================================
   * CONSTRUCTEURS DE CONTEXTE PAR AGENT
   * ============================================================ */
  getContexte(agentId) {
    const ctx = this._lireCache();
    // Si connecté via OAuth → contexte complet
    if (ctx) {
      switch (agentId) {
        case 'youtube-complet':     return this._contexteYouTubeComplet(ctx);
        case 'miniature-ia':        return this._contexteMiniature(ctx);
        case 'youtube-short':       return this._contexteShort(ctx);
        case 'recyclage-contenu':   return this._contexteRecyclage(ctx);
        case 'idees-videos':        return this._contexteIdees(ctx);
        case 'reponses-commentaires': return this._contexteCommentaires(ctx);
        case 'prospection-sponsors': return this._contexteProspection(ctx);
        case 'offre-commerciale':   return this._contexteOffre(ctx);
        default: return this._contexteGeneral(ctx);
      }
    }
    // Fallback : profil saisi manuellement
    return this.getContexteManuel(agentId);
  },

  /* Contexte construit depuis le profil saisi manuellement dans le dashboard */
  getContexteManuel(agentId = '') {
    try {
      const p = JSON.parse(localStorage.getItem('creatis_chaine_manuelle') || '{}');
      if (!p.nom) return '';

      const base = `
=== PROFIL DE LA CHAÎNE "${p.nom}" ===
• Niche / Thématique : ${p.niche || 'Non précisée'}
• Abonnés : ${p.abonnes || 'Non précisé'}
• Ton habituel : ${p.ton || 'Non précisé'}
• Audience : ${p.audience || 'Non précisée'}
${p.videos ? `• Meilleures vidéos (titres) :\n${p.videos.split('\n').filter(Boolean).map(v => `  - "${v.trim()}"`).join('\n')}` : ''}

INSTRUCTIONS : Personnalise TOUT le contenu généré pour cette chaîne — son style, son audience, sa niche. Chaque titre, chaque script, chaque conseil doit être taillé sur mesure pour "${p.nom}".
===`;

      // Pour les agents "offre commerciale" et "prospection sponsors", injecter un tarif estimé
      if (agentId === 'offre-commerciale' || agentId === 'prospection-sponsors') {
        const abo = parseInt((p.abonnes || '').replace(/\s/g, '').replace(/[^0-9]/g, '')) || 0;
        if (abo > 0) {
          const tarif = abo < 5000 ? '100-300€' : abo < 20000 ? '300-1000€' : abo < 100000 ? '1000-5000€' : '5000€+';
          return base + `\nTARIF ESTIMÉ PAR VIDÉO : ${tarif} (basé sur ${p.abonnes} abonnés)`;
        }
      }

      return base;
    } catch { return ''; }
  },

  _contexteYouTubeComplet(ctx) {
    const { chaine, analyse } = ctx;
    const topTitres = ctx.topVideos.slice(0, 8).map((v, i) =>
      `  ${i + 1}. "${v.titre}" — ${v.vues.toLocaleString('fr-FR')} vues`
    ).join('\n');

    return `
=== DONNÉES RÉELLES DE LA CHAÎNE "${chaine.nom}" ===
• Abonnés : ${chaine.abonnes.toLocaleString('fr-FR')}
• Vues totales : ${chaine.vues.toLocaleString('fr-FR')}
• Niche détectée : ${analyse.nicheDetectee}
• Taux d'engagement moyen : ${analyse.tauxEngagement}%
• Format de vidéo dominant : ${analyse.formatsGagnants.formatPrincipal} (${analyse.formatsGagnants.dureeMoyenneMin} min en moyenne)

TOP VIDÉOS (celles qui ont le mieux performé) :
${topTitres}

PATTERNS DES TITRES QUI MARCHENT :
• Format dominant : ${analyse.stylesTitres.formatDominant}
• Longueur moyenne : ${analyse.stylesTitres.longueurMoyenne} caractères
• Conseil : ${analyse.stylesTitres.conseil}

TAGS RÉCURRENTS (mots-clés de la chaîne) :
${(analyse.tagsFrequents || []).slice(0, 15).join(', ')}

INSTRUCTIONS : Génère le contenu en respectant EXACTEMENT ces patterns. Les titres doivent ressembler stylistiquement aux titres qui ont déjà performé. Adapte la durée du script au format habituel de la chaîne.
===`;
  },

  _contexteMiniature(ctx) {
    const { chaine, analyse } = ctx;
    const topMiniatures = ctx.topVideos.slice(0, 5)
      .filter(v => v.miniature)
      .map((v, i) => `  ${i + 1}. Vidéo "${v.titre}" (${v.vues.toLocaleString('fr-FR')} vues) — Miniature : ${v.miniature}`)
      .join('\n');

    return `
=== CONTEXTE MINIATURE POUR "${chaine.nom}" ===
• Niche : ${analyse.nicheDetectee}
• Abonnés : ${chaine.abonnes.toLocaleString('fr-FR')}
• Taux d'engagement : ${analyse.tauxEngagement}%

MINIATURES DES VIDÉOS LES PLUS VUES (ton style qui marche) :
${topMiniatures || '  Aucune donnée disponible'}

INSTRUCTIONS VISUELLES : Génère une miniature qui s'inscrit dans la continuité visuelle de cette chaîne. Garde cohérence avec le style des miniatures les plus performantes. La miniature doit être immédiatement reconnaissable comme appartenant à "${chaine.nom}".
===`;
  },

  _contexteShort(ctx) {
    const { chaine, analyse } = ctx;
    return `
=== CONTEXTE SHORT POUR "${chaine.nom}" ===
• Niche : ${analyse.nicheDetectee}
• Audience : ${chaine.abonnes.toLocaleString('fr-FR')} abonnés
• Ton habituel du créateur : ${analyse.tonCreateur.style}, ${analyse.tonCreateur.chaleur}
• Format dominant : ${analyse.formatsGagnants.formatPrincipal}

TITRES DE SES MEILLEURES VIDÉOS (pour copier le style accrocheur) :
${ctx.topVideos.slice(0, 5).map(v => `  • "${v.titre}"`).join('\n')}

INSTRUCTIONS : Le script doit sonner exactement comme si "${chaine.nom}" le disait. Utilise son vocabulaire habituel et son énergie.
===`;
  },

  _contexteRecyclage(ctx) {
    const { chaine, analyse } = ctx;
    return `
=== CONTEXTE RECYCLAGE POUR "${chaine.nom}" ===
• Niche : ${analyse.nicheDetectee}
• Ton du créateur : ${analyse.tonCreateur.style}, ${analyse.tonCreateur.chaleur}
• Utilise le tutoiement : ${analyse.tonCreateur.utiliseTutoiement ? 'oui' : 'non'}
• Utilise des emojis fréquemment : ${analyse.tonCreateur.utiliseSouvemojis ? 'oui' : 'non'}

STYLE D'ÉCRITURE (réplique ce ton sur tous les réseaux) :
${(analyse.tonCreateur.exemples || []).slice(0, 3).map(e => `  • "${e}"`).join('\n') || '  Standard'}

MOTS-CLÉS DE LA NICHE :
${(analyse.motsClesDescription || []).slice(0, 10).join(', ')}

INSTRUCTIONS : Adapte le contenu à l'audience ${analyse.nicheDetectee} de cette chaîne. Le ton doit être identique à celui de "${chaine.nom}" sur sa chaîne.
===`;
  },

  _contexteIdees(ctx) {
    const { chaine, analyse } = ctx;
    const topTitres = ctx.topVideos.slice(0, 10).map(v => v.titre);
    const tagsUniques = (analyse.tagsFrequents || []).slice(0, 20);

    return `
=== CONTEXTE IDÉES POUR "${chaine.nom}" ===
• Niche précise : ${analyse.nicheDetectee}
• Abonnés actuels : ${chaine.abonnes.toLocaleString('fr-FR')}
• Taux d'engagement : ${analyse.tauxEngagement}%
• Format qui marche : ${analyse.formatsGagnants.formatPrincipal}
• Heure de publication habituelle : ${analyse.heuresPublication}

CE QUI A DÉJÀ BIEN MARCHÉ SUR CETTE CHAÎNE :
${topTitres.map(t => `  ✓ "${t}"`).join('\n')}

UNIVERS SÉMANTIQUE DE LA CHAÎNE (pour rester dans la niche) :
${tagsUniques.join(', ')}

INSTRUCTIONS CRITIQUES :
1. NE PROPOSE PAS des idées similaires à ce qui a déjà été fait (listé ci-dessus)
2. Les idées doivent être complémentaires aux vidéos existantes
3. Identifie les "trous" dans le contenu existant — les sujets de la niche non encore traités
4. Tiens compte du format dominant (${analyse.formatsGagnants.formatPrincipal}) pour dimensionner les idées
===`;
  },

  _contexteCommentaires(ctx) {
    const { chaine, analyse } = ctx;
    const exemplesReponses = (analyse.tonCreateur.exemples || []).slice(0, 5);

    return `
=== CONTEXTE COMMENTAIRES POUR "${chaine.nom}" ===
• Chaîne : ${chaine.nom} — ${chaine.abonnes.toLocaleString('fr-FR')} abonnés
• Tutoiement : ${analyse.tonCreateur.utiliseTutoiement ? 'OUI — toujours tutoyer' : 'NON — vouvoyer'}
• Émojis : ${analyse.tonCreateur.utiliseSouvemojis ? 'OUI — utilise des émojis' : 'modérément'}
• Ton général : ${analyse.tonCreateur.chaleur}

EXEMPLES DE VRAIES RÉPONSES DE ${chaine.nom.toUpperCase()} (RÉPLIQUE CE TON EXACTEMENT) :
${exemplesReponses.length > 0
  ? exemplesReponses.map(e => `  • "${e}"`).join('\n')
  : '  Aucun exemple disponible — utilise le ton indiqué'}

RÈGLE ABSOLUE : Chaque réponse générée doit être indiscernable d'une vraie réponse de "${chaine.nom}". Le lecteur doit croire que c'est le créateur qui a écrit.
===`;
  },

  _contexteProspection(ctx) {
    const { chaine, analyse } = ctx;
    return `
=== CONTEXTE PROSPECTION POUR "${chaine.nom}" ===
• Statistiques réelles : ${chaine.abonnes.toLocaleString('fr-FR')} abonnés, ${chaine.vues.toLocaleString('fr-FR')} vues totales
• Niche : ${analyse.nicheDetectee}
• Taux d'engagement : ${analyse.tauxEngagement}% (${analyse.tauxEngagement > 7 ? 'EXCELLENT — bien au-dessus de la moyenne' : analyse.tauxEngagement > 4 ? 'BON' : 'Dans la moyenne'})
• Format dominant : ${analyse.formatsGagnants.formatPrincipal}

TOP PERFORMANCES (preuve sociale dans les emails) :
${ctx.topVideos.slice(0, 3).map(v =>
  `  • "${v.titre}" — ${v.vues.toLocaleString('fr-FR')} vues, ${v.likes.toLocaleString('fr-FR')} likes`
).join('\n')}

MOTS-CLÉS DE LA NICHE (pour cibler les bonnes marques) :
${(analyse.tagsFrequents || []).slice(0, 10).join(', ')}

INSTRUCTIONS : Utilise les vraies stats et les vraies performances dans les emails. Cite les vraies vidéos et les vrais chiffres pour crédibiliser la démarche.
===`;
  },

  _contexteOffre(ctx) {
    const { chaine, analyse } = ctx;
    const tarifs = Prospection.calculerTarif(chaine.abonnes, analyse.tauxEngagement);

    return `
=== CONTEXTE OFFRE COMMERCIALE POUR "${chaine.nom}" ===
• Nom officiel : ${chaine.nom}
• Abonnés : ${chaine.abonnes.toLocaleString('fr-FR')}
• Vues totales : ${chaine.vues.toLocaleString('fr-FR')}
• Vidéos publiées : ${chaine.videos}
• Niche : ${analyse.nicheDetectee}
• Taux d'engagement : ${analyse.tauxEngagement}%
• Format habituel : ${analyse.formatsGagnants.formatPrincipal} (${analyse.formatsGagnants.dureeMoyenneMin} min)

TARIFICATION RECOMMANDÉE (basée sur les stats réelles) :
  • Placement 60s mid-roll : ${tarifs.placement_60s}€
  • Vidéo dédiée : ${tarifs.video_dediee}€
  • Série 3 vidéos : ${tarifs.serie_3_videos}€
  • Ambassadeur mensuel : ${tarifs.ambassadeur_mensuel}€/mois

MEILLEURES PERFORMANCES (proof points pour la proposition) :
${ctx.topVideos.slice(0, 3).map(v =>
  `  • "${v.titre}" → ${v.vues.toLocaleString('fr-FR')} vues`
).join('\n')}

INSTRUCTIONS : Base toute la proposition sur ces chiffres réels. Les tarifs recommandés ci-dessus sont calibrés sur le marché YouTube francophone pour ces stats.
===`;
  },

  _contexteGeneral(ctx) {
    const { chaine, analyse } = ctx;
    return `
=== CHAÎNE CONNECTÉE : "${chaine.nom}" ===
• Abonnés : ${chaine.abonnes.toLocaleString('fr-FR')}
• Niche : ${analyse.nicheDetectee}
• Engagement : ${analyse.tauxEngagement}%
===`;
  },

  /* ============================================================
   * CACHE LOCAL (localStorage)
   * ============================================================ */
  _lireCache() {
    try {
      return JSON.parse(localStorage.getItem('creatis_yt_context'));
    } catch { return null; }
  },

  _ecrireCache(data) {
    try {
      localStorage.setItem('creatis_yt_context', JSON.stringify(data));
    } catch { /* quota dépassé */ }
  },

  viderCache() {
    localStorage.removeItem('creatis_yt_context');
  },

  /* ============================================================
   * RÉSUMÉ LISIBLE POUR L'UI
   * ============================================================ */
  getResume() {
    const ctx = this._lireCache();
    if (!ctx) return null;

    const { chaine, analyse } = ctx;
    return {
      nom: chaine.nom,
      abonnes: chaine.abonnes,
      niche: analyse.nicheDetectee,
      engagement: analyse.tauxEngagement,
      topVideo: ctx.topVideos[0]?.titre || '—',
      topVideoVues: ctx.topVideos[0]?.vues || 0,
      nombreTopVideos: ctx.topVideos.length,
      collecteIl: Math.round((Date.now() - ctx.timestampCollecte) / 60000),
      pret: true
    };
  }
};

window.YouTubeContext = YouTubeContext;
