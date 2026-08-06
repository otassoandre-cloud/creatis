/* ===== CRÉATIS — DÉFINITION DES 8 AGENTS IA ===== */
/* Prompts v2 — optimisés prompt-master : rôle expert + contexteYT injecté + critères de succès */
/* Signature fixe : construirePrompt(donnees, contexteYT = '') */

const AGENTS = [
  {
    id: 'clips-viraux',
    icone: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/><path d="M8 12l2-2 2 2"/></svg>',
    nom: 'Clips Viraux',
    description: 'Transforme n\'importe quelle vidéo en 10 Shorts viraux prêts à publier',
    couleur: '#f59e0b',
    type: 'clips',
    plan: 'gratuit',
    inputs: [
      { id: 'url', label: 'URL de la vidéo YouTube à découper', type: 'text', placeholder: 'https://youtube.com/watch?v=...', requis: true }
    ],
    construirePrompt(d) { return d.url; }
  },

  {
    id: 'youtube-complet',
    icone: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    nom: 'YouTube Complet',
    description: 'Titres, script complet, plan, description SEO et tags optimisés',
    couleur: '#10b981',
    type: 'texte',
    inputs: [
      {
        id: 'sujet',
        label: 'Sujet de la vidéo',
        type: 'text',
        placeholder: 'ex : Comment investir 1000€ en bourse pour débutant',
        requis: true
      },
      {
        id: 'niche',
        label: 'Niche / Thématique',
        type: 'text',
        placeholder: 'ex : Finance personnelle, Gaming, Développement personnel...',
        requis: true
      },
      {
        id: 'duree',
        label: 'Durée cible',
        type: 'select',
        options: ['5 à 10 minutes', '10 à 15 minutes', '15 à 20 minutes', '20 à 30 minutes', 'Plus de 30 minutes'],
        requis: true
      },
      {
        id: 'ton',
        label: 'Ton de la vidéo',
        type: 'select',
        options: ['Éducatif et pédagogue', 'Divertissant et dynamique', 'Inspirant et motivant', 'Expert et professionnel', 'Décontracté et proche'],
        requis: true
      }
    ],
    construirePrompt(d, contexteYT = '') {
      return `RÔLE : Tu es un expert en création de contenu YouTube. Tu produis des vidéos à fort CTR (taux de clic > 8%) et long watch time (> 60% de complétion). Tu connais par cœur les algorithmes YouTube FR, les attentes des créateurs et les codes visuels qui convertissent.

${contexteYT ? `CONTEXTE CHAÎNE YOUTUBE :\n${contexteYT}\n` : ''}

MISSION : Crée un package vidéo complet et directement tournant pour ce sujet.

SUJET : "${d.sujet}"
NICHE : ${d.niche}
DURÉE CIBLE : ${d.duree}
TON : ${d.ton}

LIVRABLE — génère dans cet ordre exact, sans rien omettre :

## 🏆 TITRES (5 options)
5 titres accrocheurs, max 60 caractères, optimisés CTR. Utilise ces 5 angles différents : [CURIOSITÉ], [LISTE], [RÉSULTAT CHIFFRÉ], [QUESTION], [BÉNÉFICE DIRECT]. Chaque titre doit donner envie de cliquer même sans voir la miniature.

## 📋 PLAN MINUTÉ
Introduction + 4 à 6 chapitres avec sous-points et timing précis (ex: 00:00 Intro, 01:30 Partie 1...). Chaque chapitre a 1 phrase de transition vers le suivant.

## 📝 SCRIPT COMPLET
Script mot pour mot. INCLURE obligatoirement :
— Hook d'ouverture (30 premières secondes) : commence par un fait surprenant ou une question qui pique
— Transitions entre parties avec formule de rétention ("Mais avant de te révéler ça...")
— Rappel abonnement placé naturellement (pas forcé) entre 1:30 et 2:00
— Conclusion avec CTA triple : like + commentaire + prochaine vidéo suggérée
— Balises [VISUEL : description], [COUPE RAPIDE], [MUSIQUE : ambiance] dans le texte

## 🔍 DESCRIPTION SEO (500+ mots)
Les 2 premières phrases doivent fonctionner seules avant "Voir plus". Ensuite : chapitres avec timestamps, 3 mots-clés principaux + 5 secondaires intégrés, liens placeholder, CTA communauté.

## 🏷️ TAGS (30 tags)
Du plus recherché au plus niche. Format : tag1, tag2, tag3...

## 💡 CARTES ET ÉCRAN DE FIN
3 suggestions de cartes (moment précis + sujet) + 4 éléments écran de fin.

CRITÈRES DE SUCCÈS : Le livrable est réussi si le script se dit à voix haute sans accroc, si les titres créent une envie irrésistible de cliquer, et si la description contient le mot-clé principal dans les 3 premières lignes.

Réponds entièrement en français. Pas de commentaires sur ta réponse — livre directement le contenu.`;
    }
  },

  {
    id: 'miniature-ia',
    icone: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    nom: 'Miniature Pro',
    description: 'Génère un fond réaliste sur-mesure — décris exactement ce que tu veux voir',
    couleur: '#8b5cf6',
    type: 'miniature',
    inputs: [
      {
        id: 'description',
        label: 'Décris ta miniature',
        type: 'textarea',
        placeholder: 'ex : moi debout devant ma Porsche 911 blanche garée dans un parking souterrain, éclairage LED bleu, je tiens les clés, regard caméra, sourire fier — ou : paysage Maldives au coucher de soleil, villa sur pilotis, eau turquoise',
        requis: true
      },
      {
        id: 'emotion',
        label: 'Émotion du personnage',
        type: 'select',
        options: ['Pas de personnage', 'Choc / Surprise', 'Joie / Fierté', 'Curiosité / Mystère', 'Suspense / Intensité']
      },
      {
        id: 'texte_overlay',
        label: 'Texte ligne 1 (3-5 mots max)',
        type: 'text',
        placeholder: 'ex : MA VOITURE DE RÊVES'
      },
      {
        id: 'texte_overlay2',
        label: 'Texte ligne 2 (3-5 mots max)',
        type: 'text',
        placeholder: 'ex : ENFIN RÉVÉLÉE'
      },
      {
        id: 'format',
        label: 'Format',
        type: 'select',
        options: [
          'YouTube Standard — 16:9 (miniature vidéo classique)',
          'YouTube Short — 9:16 (Short, TikTok, Reels)'
        ],
        requis: true
      },
      {
        id: 'style',
        label: 'Style photo',
        type: 'select',
        options: [
          'Réaliste naturel — photo authentique lumière naturelle',
          'Lifestyle luxe — golden hour ambiance premium',
          'Cinématique — éclairage dramatique professionnel',
          'Avant/Après — split reveal naturel'
        ],
        requis: true
      }
    ],
    construirePrompt(d, contexteYT = '') {
      const emotionMap = {
        'Choc / Surprise':    'with a SHOCKED open-mouth expression, eyes wide, eyebrows raised high',
        'Joie / Fierté':      'with a HUGE genuine smile, eyes bright, radiating pride and happiness',
        'Curiosité / Mystère':'with an INTRIGUED raised-eyebrow expression, slight smirk, knowing look',
        'Suspense / Intensité':'with an INTENSE serious expression, jaw clenched, focused gaze',
        'Pas de personnage':  ''
      };
      const emotionDesc = emotionMap[d.emotion] || '';
      const personPhrase = emotionDesc ? `A person ${emotionDesc}, positioned on the right side of the frame. ` : '';

      const styleKey = (d.style || '').split('—')[0].trim();
      const desc = d.description || '';
      const nicheCtx = contexteYT ? `Context: ${contexteYT.substring(0, 100)}. ` : '';
      const isShort = (d.format || '').includes('9:16');
      const ratio = isShort ? '9:16 vertical Short format' : '16:9 horizontal';
      const comp = isShort
        ? 'Portrait vertical composition, subject centered, completely clean image with no text anywhere'
        : 'Landscape cinematic composition, subject prominent, completely clean image with no text anywhere';

      const noText = 'NO TEXT, NO WORDS, NO LETTERS, NO SIGNS, NO WATERMARK, NO CAPTIONS, pure photographic image.';
      const styles = {
        'Réaliste naturel': `${noText} Photorealistic photograph, ${ratio} format. ${desc}. ${personPhrase}${nicheCtx}${comp}. Natural DSLR photography, authentic lighting, true-to-life colors, highly detailed.`,

        'Lifestyle luxe': `${noText} Photorealistic luxury lifestyle photograph, ${ratio} format. ${desc}. ${personPhrase}${nicheCtx}${comp}. Warm golden hour sunlight, premium environment, aspirational atmosphere, high-end editorial photography.`,

        'Cinématique': `${noText} Cinematic photorealistic photograph, ${ratio} format. ${desc}. ${personPhrase}${nicheCtx}${comp}. Professional cinematography lighting, dramatic shadows and highlights, movie-quality visual.`,

        'Avant/Après': `${noText} Photorealistic photograph, ${ratio} format, SPLIT SCREEN. LEFT HALF (BEFORE): ${desc} — darker, before state. RIGHT HALF (AFTER): same scene transformed — brighter, better result. Lightning bolt divider center. ${personPhrase}${nicheCtx}${comp}.`
      };

      return styles[styleKey] || styles['Réaliste naturel'];
    }
  },

  {
    id: 'recyclage-contenu',
    icone: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>',
    nom: 'Recyclage Contenu',
    description: 'Colle l\'URL d\'une vidéo — Créatis récupère le transcript et génère posts LinkedIn, Twitter/X, Instagram, Newsletter',
    couleur: '#06b6d4',
    type: 'texte',
    inputs: [
      {
        id: 'url_video',
        label: '🔗 URL de la vidéo YouTube',
        type: 'text',
        placeholder: 'https://youtube.com/watch?v=...',
        requis: false
      },
      {
        id: 'titre_video',
        label: 'Titre de la vidéo (si pas d\'URL)',
        type: 'text',
        placeholder: 'ex : Comment j\'ai multiplié mes revenus par 3 en 6 mois',
        requis: false
      },
      {
        id: 'contenu',
        label: 'Résumé / points clés (si pas d\'URL)',
        type: 'textarea',
        placeholder: 'Colle ici le résumé ou les points clés de ta vidéo...',
        requis: false
      },
      {
        id: 'plateformes',
        label: 'Plateformes à cibler',
        type: 'select',
        options: ['Toutes les plateformes', 'LinkedIn + Newsletter uniquement', 'Twitter/X + Instagram uniquement', 'LinkedIn + Twitter/X', 'Newsletter + Instagram'],
        requis: true
      },
      {
        id: 'ton_marque',
        label: 'Ton de ta marque personnelle',
        type: 'select',
        options: ['Professionnel et expert', 'Proche et authentique', 'Inspirant et motivant', 'Humoristique et léger', 'Pédagogue et clair']
      }
    ],
    construirePrompt(d, contexteYT = '') {
      const v = d._videoData?.video;
      const titre = v?.titre || d.titre_video || 'Vidéo YouTube';
      const stats = v ? `${v.vues} vues · ${v.likes} likes · ${v.duree}` : '';
      const transcript = d._videoData?.transcript;
      const videoChannelInfo = v?.description ? `\nDESCRIPTION YOUTUBE : ${v.description.substring(0, 500)}` : '';
      const contenuSource = transcript
        ? `TRANSCRIPT COMPLET (base-toi UNIQUEMENT sur ce contenu) :\n${transcript}`
        : (d.contenu ? `RÉSUMÉ/POINTS CLÉS :\n${d.contenu}` : 'Contenu non fourni');

      // Si une vidéo externe est analysée, ne pas injecter le contexte de la chaîne de l'utilisateur
      // pour éviter de mélanger son audience avec le contenu de la vidéo source
      const hasExternalVideo = !!d._videoData;
      const styleContext = !hasExternalVideo && contexteYT
        ? `CONTEXTE DE TA CHAÎNE (pour adapter le style) :\n${contexteYT}\n`
        : '';

      return `RÔLE : Tu es un expert en growth marketing multiplateforme. Tu transformes le contenu d'une vidéo YouTube en posts natifs ultra-engageants sur chaque réseau social.

RÈGLE ABSOLUE : Tes posts doivent être basés EXCLUSIVEMENT sur le contenu de la vidéo ci-dessous. N'invente rien, ne parle pas de la chaîne qui publie — parle uniquement des idées, insights et informations présents dans la vidéo.

${styleContext}VIDÉO SOURCE : "${titre}"${stats ? `\nSTATS : ${stats}` : ''}${videoChannelInfo}

${contenuSource}

PLATEFORMES : ${d.plateformes}
TON : ${d.ton_marque || 'Proche et authentique'}

Génère uniquement les plateformes demandées :

## 💼 POST LINKEDIN
1 200 à 1 500 caractères. Ligne 1 = accroche qui stop le scroll. Lignes 2-3 = visibles avant "Voir plus". Corps = storytelling ou 5 insights tirés de la vidéo. Fin = question ouverte. Max 5 hashtags. Max 3 emojis.

## 🐦 THREAD TWITTER/X
8 tweets numérotés. Tweet 1 = hook standalone viral. Tweets 2-7 = 1 insight par tweet tiré de la vidéo (max 250 chars). Tweet 8 = CTA. Zéro répétition.

## 📸 LÉGENDE INSTAGRAM
1 500 à 2 200 caractères. Hook ligne 1 → histoire → 3 leçons numérotées tirées de la vidéo → question communauté → tag quelqu'un. Puis 30 hashtags séparés (5 méga + 15 niche + 10 communauté).

## 📧 EMAIL NEWSLETTER
Objet A [curiosité] / Objet B [bénéfice]. Pré-header 30 chars. Corps 350-450 mots : accroche, 3 insights de la vidéo, CTA.

CRITÈRES : Chaque post fonctionne sans avoir vu la vidéo. Contenu fidèle à la vidéo source. Le LinkedIn donne envie de commenter. Le tweet 1 donne envie de RT seul.

Réponds en français. Contenu directement sans commentaires.`;
    }
  },

  {
    id: 'idees-videos',
    icone: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/></svg>',
    nom: 'Idées de Vidéos',
    description: '30 idées personnalisées basées sur ta niche et les tendances actuelles',
    couleur: '#10b981',
    type: 'texte',
    inputs: [
      {
        id: 'niche',
        label: 'Ta niche principale',
        type: 'text',
        placeholder: 'ex : Finance personnelle pour jeunes actifs',
        requis: true
      },
      {
        id: 'infos_chaine',
        label: 'Infos sur ta chaîne (optionnel)',
        type: 'textarea',
        placeholder: 'ex : 8 000 abonnés, audience 20-35 ans, 70% hommes, contenu éducatif, taux d\'engagement 9%...'
      },
      {
        id: 'type_contenu',
        label: 'Format de contenu préféré',
        type: 'select',
        options: ['Tutoriels / How-to', 'Vlogs et lifestyle', 'Listes / Top 10', 'Reviews et comparatifs', 'Interviews et podcasts', 'Storytelling personnel', 'Mix varié'],
        requis: true
      },
      {
        id: 'objectif',
        label: 'Objectif principal',
        type: 'select',
        options: ['Gagner des abonnés rapidement', 'Augmenter les revenus publicitaires', 'Vendre mes propres produits/services', 'Décrocher des partenariats sponsors', 'Construire une marque personnelle forte'],
        requis: true
      }
    ],
    construirePrompt(d, contexteYT = '') {
      return `RÔLE : Tu es le stratège YouTube. Tu sais exactement quelle idée de vidéo va performer dans chaque niche, pourquoi, et comment l'angle change tout. Tu penses en termes de clusters de contenu, de fenêtres de trending et de mots-clés long-tail.

${contexteYT ? `CONTEXTE CHAÎNE :\n${contexteYT}\n` : ''}

MISSION : 30 idées de vidéos ultra-personnalisées, directement tournables, classées par potentiel.

NICHE : ${d.niche}
INFOS CHAÎNE : ${d.infos_chaine || 'En développement'}
FORMAT : ${d.type_contenu}
OBJECTIF : ${d.objectif}

## 🔥 VIRAL POTENTIAL — 10 idées (nos 1 à 10)
Potentiel de dépassement de la chaîne. Format par idée :
**[Numéro]. TITRE EXACT** — Angle d'attaque | Raison du potentiel viral | Format recommandé

## 📚 SEO LONG TERME — 10 idées (nos 11 à 20)
Trafic organique durable sur 12+ mois. Format :
**[Numéro]. TITRE EXACT** — Mots-clés cibles | Difficulté concurrence (Faible/Moyen/Fort) | Volume estimé (Faible/Moyen/Fort)

## 💰 MONÉTISATION DIRECTE — 5 idées (nos 21 à 25)
Vidéos qui génèrent directement des revenus (sponsor, vente, CPM élevé). Format :
**[Numéro]. TITRE EXACT** — Source de revenu | Sponsor type | Tarif potentiel

## 🚀 TRENDING NOW — 5 idées (nos 26 à 30)
Fenêtre de tendance de 30 jours maximum. Format :
**[Numéro]. TITRE EXACT** — Tendance exploitée | Urgence : faire avant le [date estimée]

## 📅 CALENDRIER 4 SEMAINES
Planning recommandé avec les 8 meilleures idées (2/semaine), explication de la séquence choisie et des synergies entre vidéos.

## 🎯 TOP 3 — COMMENCE PAR CES VIDÉOS
Les 3 idées prioritaires avec justification business détaillée.

CRITÈRES DE SUCCÈS : Chaque titre doit être suffisamment précis pour être filmé demain. Aucune idée générique ou déjà surexploitée dans la niche. Au moins 5 idées avec angle contre-intuitif.

Réponds entièrement en français. Pas de commentaires sur ta réponse.`;
    }
  },

  {
    id: 'reponses-commentaires',
    icone: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    nom: 'Réponses Commentaires',
    description: 'Colle l\'URL d\'une vidéo — Créatis récupère les vrais commentaires et génère des réponses personnalisées',
    couleur: '#ec4899',
    type: 'texte',
    inputs: [
      {
        id: 'url_video',
        label: '🔗 URL de la vidéo YouTube',
        type: 'text',
        placeholder: 'https://youtube.com/watch?v=...',
        requis: false
      },
      {
        id: 'commentaires',
        label: 'Commentaires manuels (si pas d\'URL, un par ligne)',
        type: 'textarea',
        placeholder: 'Super vidéo !\nTu peux faire un tuto sur les ETF ?\nEncore une arnaque ces conseils...',
        requis: false
      },
      {
        id: 'ton_chaine',
        label: 'Ton de ta chaîne',
        type: 'select',
        options: ['Professionnel et bienveillant', 'Décontracté et proche de ma communauté', 'Humoristique et léger', 'Inspirant et motivant', 'Expert et pédagogue'],
        requis: true
      },
      {
        id: 'style_chaine',
        label: 'Ton style (optionnel)',
        type: 'text',
        placeholder: 'ex : Je tutoie mes abonnés, j\'utilise des emojis, j\'appelle ma communauté "la famille"...'
      },
      {
        id: 'nom_createur',
        label: 'Ton prénom (pour personnaliser)',
        type: 'text',
        placeholder: 'ex : Lucas, Marie, Alex...'
      }
    ],
    construirePrompt(d, contexteYT = '') {
      const v = d._videoData?.video;
      const comments = d._videoData?.comments || [];
      const videoAnalyse = d._videoData?.transcript; // analyse Gemini complète ou VTT

      let commentairesTexte = d.commentaires || '';
      if (comments.length > 0) {
        commentairesTexte = comments.slice(0, 30).map((c, i) =>
          `${i + 1}. [${c.likes} 👍] ${c.auteur} : ${c.texte}`
        ).join('\n');
      }

      if (!commentairesTexte.trim()) {
        commentairesTexte = 'Aucun commentaire fourni — génère des exemples de réponses types pour cette chaîne.';
      }

      // Contexte chaîne uniquement si pas de vidéo externe analysée
      const hasExternalVideo = !!d._videoData;
      const styleContext = !hasExternalVideo && contexteYT ? `CONTEXTE CHAÎNE :\n${contexteYT}\n` : '';

      return `RÔLE : Tu es le community manager expert des plus grandes chaînes YouTube françaises. Tu sais qu'une bonne réponse booste le watch time, transforme les détracteurs en fans et déclenche des dizaines de nouveaux commentaires.

${styleContext}${v ? `VIDÉO : "${v.titre}" — ${v.vues} vues · ${v.nombreCommentaires} commentaires\n` : ''}${videoAnalyse ? `\nCONTENU DE LA VIDÉO (pour contextualiser tes réponses) :\n${videoAnalyse.substring(0, 3000)}\n` : ''}
TON : ${d.ton_chaine}
STYLE : ${d.style_chaine || 'Authentique et direct'}
PRÉNOM CRÉATEUR : ${d.nom_createur || 'le créateur'}

COMMENTAIRES À TRAITER :
${commentairesTexte}

Pour CHAQUE commentaire, format exact :

---
💬 **COMMENTAIRE :** [verbatim]
✅ **RÉPONSE :** [prête à copier-coller, en s'appuyant sur le vrai contenu de la vidéo si pertinent]
🧠 **STRATÉGIE :** [1 phrase — objectif : engagement / fidélisation / gestion crise / SEO]
---

RÈGLES :
1. Traite CHAQUE commentaire sans exception
2. Base tes réponses sur le contenu réel de la vidéo quand c'est pertinent (cite un point précis, confirme une info...)
3. Négatif/troll → désamorce avec humour bienveillant, ne supprime jamais
4. Demande vidéo → remercie + note + crée l'attente
5. Compliment → personnalise + question pour générer des réponses
6. Question → réponse experte précise (si la vidéo répond, dis à quel moment) + renvoi vidéo si pertinent
7. 70% des réponses se terminent par une question ouverte courte
8. 1-2 lignes pour simples, 3-5 lignes pour questions substantielles

Réponds en français.`;
    }
  },

  {
    id: 'analyse-video',
    icone: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
    nom: 'Analyse Vidéo',
    description: 'Colle une vidéo virale — Créatis décrypte exactement pourquoi elle a explosé et extrait la formule à reproduire sur tes propres vidéos',
    couleur: '#3b82f6',
    type: 'texte',
    inputs: [
      {
        id: 'url_video',
        label: '🔗 URL de la vidéo virale à décrypter',
        type: 'text',
        placeholder: 'https://youtube.com/watch?v=... ou tiktok.com/@... ou instagram.com/reel/...',
        requis: true
      },
      {
        id: 'objectif',
        label: 'Qu\'est-ce que tu veux extraire ?',
        type: 'select',
        options: [
          'La formule complète (hook + structure + distribution)',
          'Le hook et les premiers instants qui accrochent',
          'Le style de montage et le rythme',
          'Les déclencheurs émotionnels et psychologiques',
          'La stratégie de distribution (hashtags, moment, format)'
        ],
        requis: true
      }
    ],
    construirePrompt(d, contexteYT = '') {
      const v = d._videoData?.video;
      const videoAnalyse = d._videoData?.transcript;
      const comments = d._videoData?.comments || [];

      const url = d.url_video || '';
      const isTikTok = url.includes('tiktok.com');
      const isInstagram = url.includes('instagram.com');
      const isYouTube = !isTikTok && !isInstagram;
      const plateforme = isTikTok ? 'TikTok' : isInstagram ? 'Instagram Reels' : 'YouTube';

      const titre = v?.titre || 'Non spécifié';
      const stats = v
        ? `${v.vues} vues · ${v.likes} likes · ${v.nombreCommentaires} commentaires · Durée : ${v.duree}`
        : 'Non fournies';
      const description = v?.description || '';
      const topComments = comments.slice(0, 5).map(c => `• [${c.likes}👍] "${c.texte.substring(0, 150)}"`).join('\n');

      const chaineContext = contexteYT ? `CHAÎNE DU CRÉATEUR QUI ANALYSE :\n${contexteYT}\n(Adapte les leçons actionnables à sa niche et son style)\n\n` : '';

      const hasGeminiAnalysis = !!videoAnalyse;

      const geminiBlock = hasGeminiAnalysis
        ? `\n🤖 GEMINI A REGARDÉ LA VIDÉO — Analyse visuelle frame par frame :\n${videoAnalyse.substring(0, 6000)}\n`
        : '';

      // Quand Gemini a regardé la vidéo : analyse profonde basée sur le visuel réel
      const rapportAvecGemini = `## 🎯 VERDICT VIRAL
Score de viralité X/10. En 1 phrase percutante : la raison principale pour laquelle cette vidéo a explosé sur ${plateforme}.
Puis les 3 mécanismes clés qui expliquent ce score.

## 🎬 DÉCRYPTAGE SECONDE PAR SECONDE
Raconte exactement ce qui se passe dans la vidéo et POURQUOI ça fonctionne à chaque moment :
• **0-3s (Hook)** : Décris précisément le visuel, le son, le mouvement ou le texte d'ouverture. Pourquoi ça force à rester ?
• **3s-milieu** : Comment la vidéo maintient l'attention ? Quelle tension ou curiosité est créée ?
• **Fin** : Comment ça se termine ? Y a-t-il un twist, une révélation, un cliffhanger qui pousse à revoir ou partager ?

## 🧠 LES MÉCANISMES PSYCHOLOGIQUES
Quelles émotions précises cette vidéo déclenche, et par quels éléments concrets ?
(ex : curiosité → "on ne sait pas si la bille va tomber", humour → ..., relatabilité → ...)
Quel biais cognitif ou déclencheur social est activé ? (FOMO, compétition, surprise, validation sociale...)

## 🎵 RÔLE DE L'AUDIO
Si de la musique/un son est utilisé : quel effet précis ça crée ? Est-ce un son trending ? Comment ça amplifie l'émotion ?
Si voix : quel style de narration ? Pourquoi ça fonctionne ?

## ✂️ MONTAGE & FORMAT
Style de montage décrypté : fréquence des coupes, transitions, effets. Pourquoi ce rythme est adapté à ce contenu ?
Format (durée, orientation, textes à l'écran) : en quoi c'est optimisé pour ${plateforme} ?

## 📋 LA FORMULE À REPRODUIRE
La formule exacte de cette vidéo, décrite de façon à pouvoir la répliquer :
**[Type de hook] + [Tension/émotion maintenue par] + [Résolution/fin] + [Audio] + [Format]**

Puis 5 idées de vidéos concrètes qui utilisent cette même formule, adaptées à la niche du créateur qui analyse.
Pour chaque idée : titre + comment reproduire le même mécanisme.`;

      // Sans Gemini : analyse basée sur les métadonnées + engagement
      const rapportSansGemini = `## 🎯 VERDICT VIRAL
Score de viralité X/10 basé sur les stats disponibles. La raison principale qui explique la performance de cette vidéo.

## 🔍 CE QU'ON PEUT DÉDUIRE DU SUCCÈS
À partir du titre, des stats et de l'engagement, explique pourquoi cette vidéo a probablement bien marché :
• **Le titre/concept** : Qu'est-ce qui crée la curiosité ou l'envie de cliquer ?
• **Le ratio engagement** : Que révèlent les likes/commentaires/vues sur l'émotion ressentie ?
• **La durée** : Est-elle optimale pour ${plateforme} ? Qu'est-ce que ça implique sur la rétention ?

## 🧠 LES MÉCANISMES PSYCHOLOGIQUES PROBABLES
Quels émotions et déclencheurs cette vidéo a probablement activés (curiosité, humour, relatabilité, compétition...) ?
Base-toi sur le titre/concept pour déduire le mécanisme viral.

## 📋 LA FORMULE PROBABLE
Reconstitue la formule de cette vidéo à partir des infos disponibles.
5 idées de vidéos qui reproduisent ce mécanisme, adaptées à la niche.

## ⚠️ LIMITE D'ANALYSE
Sans avoir regardé la vidéo directement, l'analyse reste partielle. Colle l'URL pour que Gemini regarde la vidéo et donne une analyse complète secondes par secondes.`;

      return `RÔLE : Tu es expert en analyse virale — tu décryptes les mécanismes qui font exploser les vidéos sur ${plateforme}. Ton but n'est PAS d'améliorer la vidéo analysée, mais d'expliquer POURQUOI elle a fonctionné et comment reproduire sa formule.

${chaineContext}VIDÉO VIRALE À DÉCRYPTER (${plateforme}) :
Titre/légende : "${titre}"
Stats d'engagement : ${stats}
${description ? `Description : ${description.substring(0, 400)}` : ''}
${topComments ? `\nCommentaires (ce que les gens ont ressenti) :\n${topComments}` : ''}
${geminiBlock}
Focus de l'analyse : ${d.objectif}

${hasGeminiAnalysis ? rapportAvecGemini : rapportSansGemini}

Réponds en français. Sois précis et concret — cite des éléments spécifiques de la vidéo, pas des généralités. Pas d'intro, va droit au but.`;
    }
  },

  {
    id: 'chat-libre',
    icone: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg>',
    nom: 'Assistant & Support',
    description: 'Aide sur l\'app, questions générales, support — répond à tout avec mémoire de conversation',
    couleur: '#10b981',
    type: 'chat',
    inputs: [],
    construireSystemPrompt(contexteYT = '') {
      return `Tu es l'assistant IA de Créatis — tu joues deux rôles à la fois : support client de l'application ET expert YouTube pour créateurs francophones.

## CONNAISSANCE DE L'APPLICATION CRÉATIS

**C'est quoi Créatis ?**
Créatis est un SaaS IA pour créateurs YouTube francophones. Son agent principal, Clips Viraux, transforme une vidéo longue en 10 Shorts viraux prêts à publier. Il propose aussi 6 autres agents pour scripts, miniatures, idées et analyse de contenu.

**Les agents disponibles :**
- Clips Viraux (agent principal) : transforme n'importe quelle vidéo en 10 Shorts viraux 9:16 prêts à publier
- YouTube Complet : titres, script complet, plan, description SEO et tags optimisés en une génération
- Miniature Pro : génère un fond réaliste sur-mesure par IA à partir d'une description
- Recyclage Contenu : colle l'URL d'une vidéo → récupère le transcript et génère des posts LinkedIn, Twitter/X, Instagram, Newsletter
- Idées de Vidéos : 30 idées personnalisées basées sur la niche et les tendances actuelles
- Réponses Commentaires : colle l'URL d'une vidéo → récupère les vrais commentaires et génère des réponses personnalisées
- Analyse Vidéo : colle une vidéo virale → décrypte pourquoi elle a explosé et extrait la formule à reproduire

**Plans :**
- Essai : 1 clip gratuit pour découvrir (Clips Viraux uniquement, avec watermark)
- Starter (9,95€/mois) : 20 clips téléchargeables et 5 vidéos analysées par mois
- Pro (14€/mois, ou 139€/an soit 2 mois offerts) : 150 clips et 30 vidéos par mois, tous les agents, 30 miniatures/mois
- Pour upgrader : cliquer sur "Upgrade" dans le tableau de bord

**Programme Affilié :**
- 30% de commission récurrente à vie sur chaque abonné Pro parrainé
- Accessible via la sidebar "Navigation > Programme Affilié"

**Questions fréquentes support :**
- "Comment uploader une vidéo pour les clips ?" → Dans l'agent Clips Viraux, glisser-déposer ou cliquer pour choisir un fichier MP4/MOV depuis l'appareil
- "Le téléchargement de clip ne fonctionne pas" → Sur mobile, l'app utilise le partage natif iOS/Android. Sur desktop, le clip se télécharge en MP4.
- "Comment connecter ma chaîne YouTube ?" → Dans le tableau de bord, section "Connecte ta chaîne YouTube", entrer son @handle ou l'URL de la chaîne et cliquer sur "Analyser"
- "Mes générations ne s'affichent plus" → L'historique est accessible via "Navigation > Historique" dans la sidebar
- "Bug ou problème technique persistant" → Écrire à contact@creatis.app en décrivant le problème

**Ce que tu NE peux PAS résoudre (renvoyer vers contact@creatis.app) :**
- Remboursements
- Problèmes de paiement Stripe
- Bugs techniques persistants après rechargement de page
${contexteYT ? `\n## CONTEXTE DE LA CHAÎNE DE L'UTILISATEUR\n${contexteYT}\n\nUtilise ce contexte pour personnaliser tes conseils YouTube.` : ''}

## RÔLE EXPERT YOUTUBE

Tu réponds aussi à toutes les questions sur YouTube : stratégie de contenu, algorithme, SEO, monétisation, partenariats sponsors, communauté, montage, équipement, croissance de chaîne. Conseils adaptés au marché francophone.

Réponds toujours en français. Sois direct et concret — 3 points actionnables valent mieux qu'un long discours. Pour les bugs sérieux, renvoie toujours vers contact@creatis.app.`;
    },
    construirePrompt() { return ''; }
  }
];

