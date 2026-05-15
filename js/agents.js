/* ===== CRÉATIS — DÉFINITION DES 8 AGENTS IA ===== */
/* Prompts v2 — optimisés prompt-master : rôle expert + contexteYT injecté + critères de succès */
/* Signature fixe : construirePrompt(donnees, contexteYT = '') */

const AGENTS = [
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
        ? 'Portrait vertical composition, subject centered, text in lower third well within frame'
        : 'Landscape cinematic composition, subject prominent';

      const styles = {
        'Réaliste naturel': `Photorealistic YouTube thumbnail ${ratio}. Scene: ${desc}. ${personPhrase}${nicheCtx}${comp}. Natural photography, DSLR quality, natural lighting and colors. NO TEXT NO WORDS NO LETTERS NO SIGNS.`,

        'Lifestyle luxe': `Photorealistic luxury lifestyle YouTube thumbnail ${ratio}. Scene: ${desc}. ${personPhrase}${nicheCtx}${comp}. Warm golden hour sunlight, premium environment, aspirational atmosphere. High-end editorial photography. NO TEXT NO WORDS NO LETTERS NO SIGNS.`,

        'Cinématique': `Cinematic photorealistic YouTube thumbnail ${ratio}. Scene: ${desc}. ${personPhrase}${nicheCtx}${comp}. Professional location lighting, dramatic shadows and highlights, movie-quality photography. NO TEXT NO WORDS NO LETTERS NO SIGNS.`,

        'Avant/Après': `Photorealistic YouTube thumbnail ${ratio}, SPLIT SCREEN. LEFT HALF (BEFORE): ${desc} — darker, before state. RIGHT HALF (AFTER): same scene transformed — brighter, better result. Lightning bolt divider center. ${personPhrase}${nicheCtx}${comp}. NO TEXT NO WORDS NO LETTERS NO SIGNS.`
      };

      return styles[styleKey] || styles['Réaliste naturel'];
    }
  },

  {
    id: 'youtube-short',
    icone: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    nom: 'YouTube Short',
    description: 'Script viral 30 à 60 secondes optimisé pour YouTube Shorts, TikTok et Reels',
    couleur: '#f59e0b',
    type: 'texte',
    inputs: [
      {
        id: 'sujet',
        label: 'Sujet du Short',
        type: 'text',
        placeholder: 'ex : La technique pour se lever à 5h du matin sans se forcer',
        requis: true
      },
      {
        id: 'duree',
        label: 'Durée cible',
        type: 'select',
        options: ['30 secondes', '45 secondes', '60 secondes'],
        requis: true
      },
      {
        id: 'style',
        label: 'Style narratif',
        type: 'select',
        options: ['Hook choc - phrase qui arrête le scroll', 'Storytelling rapide - mini histoire', 'Conseil express - tip actionnable', 'Révélation - twist final', 'Tendance virale - format populaire'],
        requis: true
      },
      {
        id: 'cible',
        label: 'Public cible',
        type: 'text',
        placeholder: 'ex : Entrepreneurs, étudiants, jeunes adultes 18-30 ans...'
      }
    ],
    construirePrompt(d, contexteYT = '') {
      return `RÔLE : Tu es le ghost-writer des Shorts viraux qui comptabilisent 500k+ vues. Tu maîtrises la grammaire du format vertical : les 3 premières secondes décident tout, le retour en arrière tue le watch time, chaque mot compte. Tu connais les codes de Squeezie pour l'humour, Inoxtag pour l'émotion, et EnjoyPhoenix pour l'authenticité.

${contexteYT ? `CONTEXTE CHAÎNE :\n${contexteYT}\n` : ''}

MISSION : Script Short viral ${d.duree}, format vertical 9:16, prêt à filmer immédiatement.

SUJET : "${d.sujet}"
STYLE : ${d.style}
CIBLE : ${d.cible || '18-35 ans'}

## ⚡ HOOK (0 à 3 sec) — OBLIGATOIRE
Première phrase qui stoppe le scroll net. Donne 3 versions :
— Version CHOC (fait surprenant)
— Version QUESTION (intrigue immédiate)
— Version PROMESSE (bénéfice ultra-rapide)
Retenir : le hook doit fonctionner sans son (60% regardent en muet).

## 📹 SCRIPT DÉCOUPÉ À LA SECONDE
Format obligatoire pour chaque segment :
[0:00-0:03] PAROLES : "..." | VISUEL : description | SOUS-TITRE ÉCRAN : texte affiché

Continue jusqu'à la fin de la durée cible. Chaque segement = max 15 mots dits.

## 🎵 SON ET MUSIQUE
Type de musique tendance recommandé (ex: beat trap lo-fi, son viral TikTok). Niveau audio relatif à la voix.

## 📱 INSTRUCTIONS TOURNAGE
4 conseils ultra-concrets (cadrage, lumière, rythme de montage, transitions).

## #️⃣ HASHTAGS (30)
Mélange : 5 hashtags mega (>1M posts) + 15 niche + 10 trending. Format : #hashtag

CRITÈRES DE SUCCÈS : Le hook doit créer une anxiété de ne pas finir la vidéo. Le script entier doit se dire à voix haute en exactement ${d.duree}. Aucune phrase de plus de 12 mots.

Réponds en français. Pas de commentaires sur ta réponse.`;
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
    id: 'prospection-sponsors',
    icone: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    nom: 'Prospection Sponsors',
    description: 'Identifie les marques compatibles et génère des emails de prospection percutants',
    couleur: '#f97316',
    type: 'texte',
    inputs: [
      {
        id: 'niche',
        label: 'Niche de ta chaîne',
        type: 'text',
        placeholder: 'ex : Développement personnel, Finance, Gaming, Tech, Cuisine...',
        requis: true
      },
      {
        id: 'stats',
        label: 'Tes statistiques chaîne',
        type: 'textarea',
        placeholder: 'ex : 15 000 abonnés, 50 000 vues/mois, audience 18-35 ans, 70% hommes, taux engagement 8%, CPM moyen 4€...',
        requis: true
      },
      {
        id: 'budget_cible',
        label: 'Budget sponsor visé par vidéo',
        type: 'select',
        options: ['100€ à 500€ par vidéo', '500€ à 2 000€ par vidéo', '2 000€ à 5 000€ par vidéo', '5 000€ et plus par vidéo'],
        requis: true
      },
      {
        id: 'type_contenu',
        label: 'Type de contenu',
        type: 'text',
        placeholder: 'ex : Tutoriels finance, reviews applications, lifestyle entrepreneuriat...'
      }
    ],
    construirePrompt(d, contexteYT = '') {
      return `RÔLE : Tu es un négociateur de partenariats YouTube avec un track record de 200+ deals conclus pour des créateurs YouTube — de 5 000 à 500 000 abonnés. Tu sais exactement quelles marques paient pour quelles audiences, comment pitcher en 3 phrases, et comment passer d'un "non" à un "oui" avec la bonne approche.

${contexteYT ? `CONTEXTE CHAÎNE :\n${contexteYT}\n` : ''}

NICHE : ${d.niche}
STATS CHAÎNE : ${d.stats}
BUDGET VISÉ : ${d.budget_cible}
TYPE DE CONTENU : ${d.type_contenu || 'Contenu éducatif et de valeur'}

## 🎯 20 MARQUES CIBLES — classées par réalisme
**TIER A — Grands comptes (difficile, budget élevé) — 5 marques**
Pour chaque : Nom + Pourquoi elle colle à ta niche + Qui contacter (département)

**TIER B — Mid-market (budget réaliste, approche directe) — 10 marques**
Pour chaque : Nom + Compatibilité + Taux de succès estimé (%) + Canal de contact recommandé

**TIER C — Startups & scale-ups (premiers partenariats, budget accessible) — 5 marques**
Pour chaque : Nom + Raison du fit + Avantage de commencer par elles

## 📊 PROFIL DU SPONSOR IDÉAL
Description précise : secteur exact, taille d'entreprise, budget habituel, signes qu'une marque cherche des créateurs, où la trouver.

## 📧 EMAIL 1 — APPROCHE DIRECTE (180-220 mots)
Objet A/B : [2 versions]
Corps : commence par une observation précise sur leur marque (montre que tu les connais), enchaine sur la valeur de ton audience pour eux, stats clés en 1 ligne, proposition en 1 phrase, CTA ultra-simple ("5 minutes cette semaine ?").

## 📧 EMAIL 2 — APPROCHE "VALEUR D'ABORD" (150-180 mots)
Objet différent. Commence par leur offrir quelque chose d'utile (feedback, idée de contenu pour eux, insight sur leur audience cible) avant de parler de partenariat.

## 📧 EMAIL 3 — RELANCE J+7 (60-80 mots)
Court, léger, sans pression. Rappelle la valeur, pas l'email précédent.

## 💰 GRILLE TARIFAIRE JUSTIFIÉE
Tarification par type de placement avec formules de calcul basées sur les stats fournies.

CRITÈRES DE SUCCÈS : Les emails doivent avoir un taux d'ouverture > 40% et un taux de réponse > 15%. Chaque email doit sembler personnalisé à la marque, pas générique.

Réponds en français. Livre directement les contenus.`;
    }
  },

  {
    id: 'analyse-video',
    icone: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
    nom: 'Analyse Vidéo',
    description: 'Colle l\'URL d\'une vidéo — Créatis analyse titre, stats, description, tags et génère un plan d\'optimisation complet',
    couleur: '#3b82f6',
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
        id: 'titre',
        label: 'Titre (si pas d\'URL)',
        type: 'text',
        placeholder: 'ex : J\'ai investi 1000€ en bourse pendant 6 mois',
        requis: false
      },
      {
        id: 'stats',
        label: 'Stats (si pas d\'URL)',
        type: 'textarea',
        placeholder: 'ex : 12 400 vues · 340 likes · 28 commentaires · 8 min · CTR 3,2%',
        requis: false
      },
      {
        id: 'objectif',
        label: 'Objectif d\'amélioration principal',
        type: 'select',
        options: [
          'Augmenter le CTR (taux de clic)',
          'Améliorer le watch time (rétention)',
          'Obtenir plus de commentaires et d\'engagement',
          'Mieux ranker sur YouTube / SEO',
          'Attirer plus d\'abonnés',
          'Optimiser pour les sponsors'
        ],
        requis: true
      }
    ],
    construirePrompt(d, contexteYT = '') {
      const v = d._videoData?.video;
      const videoAnalyse = d._videoData?.transcript; // analyse Gemini complète ou VTT
      const comments = d._videoData?.comments || [];

      const titre = v?.titre || d.titre || 'Non spécifié';
      const stats = v
        ? `${v.vues} vues · ${v.likes} likes · ${v.nombreCommentaires} commentaires · Durée : ${v.duree} · Publié le ${v.datePublication}`
        : (d.stats || 'Non fournies');
      const tags = v?.tags?.join(', ') || 'Non fournis';
      const description = v?.description || 'Non fournie';
      const topComments = comments.slice(0, 10).map(c => `• [${c.likes}👍] ${c.texte.substring(0, 200)}`).join('\n');

      // Contexte chaîne uniquement si pas de vidéo externe analysée
      const hasExternalVideo = !!d._videoData;
      const chaineContext = !hasExternalVideo && contexteYT ? `CONTEXTE CHAÎNE :\n${contexteYT}\n\n` : '';

      return `RÔLE : Tu es le directeur éditorial YouTube d'une agence qui a accompagné 500+ créateurs. Tu analyses chaque vidéo avec précision chirurgicale — titre, description, tags, engagement, tout compte.

${chaineContext}VIDÉO À ANALYSER :
Titre : "${titre}"
Stats : ${stats}
Tags : ${tags}
Description : ${description.substring(0, 800)}
${topComments ? `\nTOP COMMENTAIRES :\n${topComments}` : ''}
${videoAnalyse ? `\nANALYSE COMPLÈTE DU CONTENU VIDÉO (Gemini a regardé la vidéo) :\n${videoAnalyse.substring(0, 5000)}` : ''}

Objectif prioritaire : ${d.objectif}

RAPPORT EN 6 PARTIES :

## 🎯 DIAGNOSTIC GLOBAL
Score X/10 basé sur le contenu réel de la vidéo. 3 forces + 3 faiblesses concrètes tirées de l'analyse. Verdict en 1 phrase percutante.

## 📌 OPTIMISATION TITRE
Analyse du titre actuel (longueur, mots-clés, émotion, promesse). 5 alternatives classées par CTR estimé :
• Titre [CTR estimé X%] — justification 1 ligne.
Recommandation finale et pourquoi.

## 🖼️ RECOMMANDATIONS MINIATURE
3 concepts précis basés sur le contenu de la vidéo : composition, couleurs, texte overlay, émotion, style. Lequel choisir et pourquoi.

## 📝 OPTIMISATION DESCRIPTION
Les 2 premières lignes sont-elles accrocheuses ? Timestamps présents ? Mots-clés placés ?
Réécris les 5 premières lignes pour maximiser SEO + engagement.
5 ajouts prioritaires.

## 🏷️ OPTIMISATION TAGS
30 tags optimisés basés sur le vrai sujet de la vidéo : 5 méga + 15 niche + 10 longue traîne. Logique de sélection.

## 📈 PLAN D'ACTION — ${d.objectif}
5 actions concrètes par impact (fort/moyen/faible) et effort (rapide/moyen/long).
Action #1 faisable en moins d'1h. Projection 30 jours si tout est appliqué.

Réponds en français. Rapport direct sans commentaires introductifs.`;
    }
  },

  {
    id: 'chat-libre',
    icone: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg>',
    nom: 'Chat IA Libre',
    description: 'Pose n\'importe quelle question à Créatis — assistant avec mémoire de conversation',
    couleur: '#10b981',
    type: 'chat',
    inputs: [],
    construireSystemPrompt(contexteYT = '') {
      return `Tu es Créatis, un assistant IA expert en création de contenu YouTube pour créateurs francophones. Tu réponds à toutes les questions sur YouTube : stratégie de contenu, algorithme, SEO, monétisation, partenariats sponsors, communauté, montage, équipement, et croissance de chaîne. Tes réponses sont directes, actionnables et adaptées au marché francophone.${contexteYT ? `\n\nCONTEXTE DE LA CHAÎNE DE L'UTILISATEUR :\n${contexteYT}\n\nUtilise ce contexte pour personnaliser tes conseils.` : ''}

Réponds toujours en français. Sois concis et pratique — préfère 3 conseils actionnables à un long discours.`;
    },
    construirePrompt() { return ''; }
  },

  {
    id: 'offre-commerciale',
    icone: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    nom: 'Offre Commerciale',
    description: 'Crée une proposition sponsor complète, professionnelle et convaincante',
    couleur: '#eab308',
    type: 'texte',
    inputs: [
      {
        id: 'marque',
        label: 'Nom de la marque / entreprise',
        type: 'text',
        placeholder: 'ex : NordVPN, une marque de sport locale, une fintech...',
        requis: true
      },
      {
        id: 'stats',
        label: 'Tes statistiques YouTube',
        type: 'textarea',
        placeholder: 'ex : 25 000 abonnés, 80 000 vues/mois, CPM 15€, taux de clic 5,2%, audience 25-40 ans, 65% hommes, taux complétion 68%...',
        requis: true
      },
      {
        id: 'type_offre',
        label: "Type d'offre proposée",
        type: 'select',
        options: [
          'Placement 60 secondes en milieu de vidéo',
          'Vidéo entièrement dédiée à la marque',
          'Série de 3 vidéos sponsorisées',
          'Package complet : vidéo + réseaux sociaux',
          'Ambassadeur long terme (6 à 12 mois)'
        ],
        requis: true
      },
      {
        id: 'prix',
        label: 'Ton tarif pour cette offre',
        type: 'text',
        placeholder: 'ex : 1 200€ par vidéo, 3 500€ pour la série de 3...',
        requis: true
      },
      {
        id: 'valeur_unique',
        label: 'Ta proposition de valeur unique',
        type: 'textarea',
        placeholder: 'ex : Audience très qualifiée d\'entrepreneurs, niche ultra-spécifique, fort taux d\'engagement, communauté très active...'
      }
    ],
    construirePrompt(d, contexteYT = '') {
      return `RÔLE : Tu es le directeur commercial d'une agence de créateurs YouTube qui facture 5 000 à 50 000€ par campagne. Tu rédiges des propositions commerciales qui convainquent des directeurs marketing dans les 3 premières minutes de lecture. Tu sais que 80% du deal se joue sur la clarté du ROI et la personnalisation pour la marque.

${contexteYT ? `CONTEXTE CHAÎNE :\n${contexteYT}\n` : ''}

MARQUE CIBLÉE : ${d.marque}
STATISTIQUES CHAÎNE : ${d.stats}
OFFRE : ${d.type_offre}
TARIF : ${d.prix}
VALEUR UNIQUE : ${d.valeur_unique || 'Audience qualifiée et engagée'}

## 📄 PROPOSITION COMMERCIALE COMPLÈTE

### 🔥 TITRE COMMERCIAL
[Titre de la proposition orienté bénéfice pour ${d.marque}, pas description de l'offre]

### 📝 RÉSUMÉ EXÉCUTIF (2 paragraphes)
Pourquoi ${d.marque} a besoin de cette collaboration maintenant. Opportunité de marché + timing + différence vs concurrents qui font de la pub classique.

### 👥 PROFIL AUDIENCE — Ce qui intéresse ${d.marque}
Démographie précise, comportements d'achat, lien direct avec les produits de ${d.marque}, pouvoir d'achat. Formule : "Ton client idéal regarde déjà cette chaîne."

### 📊 MÉTRIQUES CLÉS CONTEXTUALISÉES
Présente les stats avec des comparaisons : "Taux d'engagement de X% vs moyenne YouTube de 1,5%". Met en valeur les chiffres les plus impressionnants avec contexte.

### 🎬 CE QUI EST LIVRÉ : ${d.type_offre}
Description précise livrable par livrable. Timeline de production. Processus de validation (nombre de corrections incluses).

### 💰 INVESTISSEMENT
Tarification : ${d.prix}
Options packagées avec pricing dégressif.
Ce qui est inclus (droits d'utilisation, durée, exclusivité éventuelle).

### 📈 ROI PROJETÉ POUR ${d.marque}
Calcul : impressions garanties + coût pour mille + conversions estimées (taux conservateur). Comparaison avec CPM pub Google/Meta pour la même audience.

### 🤝 GARANTIES
Délais de livraison. Vues minimales garanties (ou politique de compensation). Rapport de performance à J+30.

### ✅ PROCHAINES ÉTAPES
5 étapes numérotées de la signature au rapport final avec délais.

### 📞 APPEL À L'ACTION
Phrase finale chaleureuse + agenda pour un call de 20 minutes.

CRITÈRES DE SUCCÈS : La proposition doit se lire en 5 minutes maximum. Le ROI doit être calculé avec des chiffres précis. ${d.marque} doit se sentir compris dès la deuxième phrase.

Réponds en français. Livre directement la proposition.`;
    }
  }
];

