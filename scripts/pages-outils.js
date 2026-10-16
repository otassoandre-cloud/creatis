/**
 * Données des pages d'outil. Une page = une tâche, nommée comme les gens la tapent.
 *
 * Les trois grappes ci-dessous sortent du mineur de mots-clés du 25/09/2026, sur des
 * requêtes réellement suggérées par Google en français. Ce ne sont pas des intuitions.
 */

module.exports = [
  {
    slug: 'montage-video-ia',
    date: '2026-09-25',
    title: 'Montage vidéo IA — découpe et sous-titres automatiques',
    h1: 'Montage vidéo par IA',
    h1html: 'Montage vidéo par <span>IA</span>',
    badge: '🤖 Gratuit · sans inscription pour tester',
    description:
      "Donne une vidéo longue : l'IA repère les meilleurs passages, les découpe, recadre en 9:16 et incruste les sous-titres. Sans logiciel de montage.",
    sub: "Tu donnes une vidéo longue, l'IA lit ce qui est dit, repère les passages qui tiennent, les découpe et les met au format vertical avec les sous-titres incrustés. Aucun logiciel à installer, aucune compétence de montage.",
    placeholder: 'Colle un lien YouTube',
    bouton: 'Monter',
    cta: 'Laisse l’IA faire le repérage, garde le jugement',
    corps: `
  <h2>Ce que l'IA fait, et ce qu'elle ne fait pas</h2>
  <p>Le terme « montage vidéo IA » recouvre des choses très différentes selon les outils. Ici, l'IA fait exactement trois choses, et il vaut mieux savoir lesquelles avant de tester.</p>
  <div class="etapes">
    <div class="etape"><b>1. Elle lit</b><span>La transcription de ta vidéo, pas les images. Elle repère les pics de tension dans ce qui est <em>dit</em>.</span></div>
    <div class="etape"><b>2. Elle découpe</b><span>Elle pose les bornes autour de ces passages, en cherchant un début et une fin qui se tiennent seuls.</span></div>
    <div class="etape"><b>3. Elle met en forme</b><span>Recadrage 9:16 avec suivi du visage, sous-titres calés mot par mot et incrustés dans l'image.</span></div>
  </div>
  <p>Ce qu'elle <strong>ne fait pas</strong> : elle n'invente rien, n'ajoute ni musique ni effets, et ne remplace pas ton jugement sur ce qui mérite d'être publié. Elle propose, tu tries. C'est d'ailleurs la partie du travail qui a le plus de valeur, et la seule qui ne s'automatise pas.</p>

  <h2>Pourquoi partir de la parole plutôt que de l'image</h2>
  <p>Beaucoup d'outils analysent l'image : changements de plan, mouvement, visages. Ça marche sur du contenu visuel — du gameplay, du sport, du voyage.</p>
  <p>Sur du contenu <strong>parlé</strong> — podcast, interview, conférence, stream commenté — l'image ne dit presque rien : quelqu'un parle, le plan ne bouge pas. Tout est dans ce qui est dit. C'est pour ça que le découpage part ici de la transcription.</p>
  <p>Conséquence honnête : si ta source est du gameplay muet, où il faut repérer un kill ou une victoire dans les pixels, des outils gaming spécialisés feront mieux. Voir <a href="/blog/clips-stream-gaming.html">faire des clips depuis un stream gaming</a>.</p>

  <h2>Le français change le résultat</h2>
  <p>Puisque tout part de la transcription, sa qualité décide du découpage. Un modèle qui entend mal une liaison, un nom propre ou de l'oral relâché posera ses bornes au milieu d'une phrase — et tu verras des clips médiocres sans comprendre pourquoi.</p>
  <p>Le détail de ce que ça change est dans <a href="/blog/outil-clips-ia-francais.html">outil de clips IA français</a>.</p>

  <h2>Combien de temps ça prend</h2>
  <p>À la main, un clip vertical sous-titré demande quinze à trente minutes : repérer, couper, recadrer, écrire et caler les sous-titres, exporter. Une vidéo d'une heure occupe donc une journée.</p>
  <p>Ici, l'analyse tourne en quelques minutes et rend une série de propositions. Le temps qui reste est celui du tri — regarder, écarter, valider. Le calcul complet est dans <a href="/blog/combien-de-clips-par-jour.html">combien de clips par jour</a>.</p>
`,
    faq: [
      { q: "Le montage vidéo par IA est-il vraiment automatique ?", r: "Le repérage, le découpage, le recadrage vertical et les sous-titres le sont. Le choix final ne l'est pas : l'outil propose une série d'extraits, c'est toi qui décides lesquels méritent d'être publiés. C'est la partie du travail qui a le plus de valeur et la seule qui ne s'automatise pas." },
      { q: "Faut-il installer un logiciel ?", r: "Non. Tout se passe dans le navigateur : tu donnes un lien YouTube ou un fichier, l'analyse tourne côté serveur et tu récupères les clips au format vertical, sous-titres incrustés." },
      { q: "Sur quel type de vidéo ça marche le mieux ?", r: "Sur le contenu parlé — podcast, interview, conférence, webinaire, stream commenté — parce que le découpage part de ce qui est dit. Sur du gameplay muet, où l'information est dans les pixels, des outils gaming spécialisés sont plus adaptés." },
      { q: "L'IA comprend-elle bien le français ?", r: "C'est le point décisif, puisque tout le découpage repose sur la transcription. Les liaisons, les noms propres français et l'oral relâché mettent en difficulté les modèles entraînés surtout sur de l'anglais — et une transcription approximative fausse silencieusement les bornes de découpage." },
      { q: "Est-ce gratuit ?", r: "L'analyse et l'aperçu des clips sont gratuits, sans carte bancaire : tu vois le résultat complet avant de décider. Le téléchargement des clips nécessite une formule payante, à partir de 9,95 €/mois." },
    ],
  },

  {
    slug: 'couper-video-youtube',
    date: '2026-09-25',
    title: 'Couper une vidéo YouTube en ligne — extraits verticaux',
    h1: 'Couper une vidéo YouTube',
    h1html: 'Couper une vidéo <span>YouTube</span>',
    badge: '✂️ En ligne · rien à installer',
    description:
      "Colle un lien YouTube et récupère les meilleurs passages découpés, recadrés en 9:16 et sous-titrés. Sans téléchargement ni logiciel de montage.",
    sub: "Colle l'adresse d'une vidéo YouTube. Plutôt que de te demander où couper, l'outil repère lui-même les passages qui tiennent tout seuls et te les rend au format vertical, sous-titres incrustés.",
    placeholder: 'https://youtu.be/…',
    bouton: 'Couper',
    cta: 'Une adresse YouTube, une série d’extraits',
    corps: `
  <h2>Couper où, exactement ?</h2>
  <p>C'est la vraie difficulté, et les outils de découpage classiques ne la traitent pas : ils te donnent deux curseurs et te laissent chercher. Or sur une vidéo d'une heure, trouver les cinq passages qui valent le coup prend plus de temps que le découpage lui-même.</p>
  <p>Ici, les bornes sont proposées : l'outil lit la transcription, repère les passages les plus forts et coupe autour, en cherchant un début et une fin qui se comprennent sans contexte. Tu ajustes ensuite si tu veux.</p>

  <h2>Ce qui distingue un bon point de coupe</h2>
  <div class="etapes">
    <div class="etape"><b>Le début</b><span>Commencer sur l'idée, jamais sur sa mise en place. « Ce que je vais vous dire va vous surprendre » est du remplissage.</span></div>
    <div class="etape"><b>La fin</b><span>Couper dès que la chute est passée. Un extrait qui traîne après son point culminant perd tout son effet.</span></div>
    <div class="etape"><b>L'autonomie</b><span>L'extrait doit se comprendre seul, sans avoir vu ce qui précède. C'est le critère qui élimine le plus de candidats.</span></div>
  </div>
  <p>Le détail de la méthode est dans <a href="/blog/decouper-video-shorts-automatiquement.html">découper une vidéo en Shorts automatiquement</a>.</p>

  <h2>Du 16:9 au 9:16 : ce qu'on perd</h2>
  <p>Un point souvent découvert trop tard : une source 1920×1080 recadrée en vertical ne conserve que <strong>607 pixels de large</strong>, soit moins d'un tiers de l'image. Ce n'est pas un réglage cosmétique, c'est une décision de cadrage sur chaque plan.</p>
  <p>D'où le suivi automatique du visage plutôt qu'un recadrage centré, qui coupe le sujet dès qu'il se déplace. Voir <a href="/blog/pourquoi-ton-crop-9-16-est-rate.html">pourquoi ton crop 9:16 est raté</a>.</p>

  <h2>Et si la vidéo n'est pas la mienne ?</h2>
  <p>C'est le cas le plus fréquent, et il mérite d'être dit clairement : la bonne pratique est de demander l'autorisation du créateur et de le créditer visiblement. Beaucoup encouragent le clipping de leur contenu parce que ça leur amène de l'audience, et l'indiquent dans leur description.</p>
  <p>Attention aussi à la musique déjà présente dans la source : un générique de dix secondes pris dans tes bornes suffit à faire bloquer la publication. Décaler le début de deux secondes règle le problème la plupart du temps. Voir <a href="/blog/musique-clips-droits.html">musique sur un clip : ce qui est autorisé</a>.</p>
`,
    faq: [
      { q: "Comment couper une vidéo YouTube sans logiciel ?", r: "En collant son adresse dans un outil en ligne. Ici, tu n'as pas besoin d'indiquer où couper : l'outil lit la transcription, repère les passages qui se tiennent seuls et propose les bornes, que tu peux ensuite ajuster." },
      { q: "Faut-il télécharger la vidéo d'abord ?", r: "Non. L'adresse suffit, le traitement se fait côté serveur. Tu peux aussi envoyer un fichier depuis ton ordinateur si la vidéo n'est pas en ligne." },
      { q: "Où faut-il couper pour qu'un extrait fonctionne ?", r: "Commencer sur l'idée elle-même et non sur sa mise en place, couper dès que la chute est passée, et vérifier que l'extrait se comprend sans avoir vu ce qui précède. Ce dernier critère élimine la grande majorité des passages candidats." },
      { q: "Pourquoi le format vertical dégrade-t-il l'image ?", r: "Parce qu'un recadrage 9:16 dans une source 1920×1080 ne garde que 607 pixels de large, soit moins d'un tiers, ensuite agrandis pour remplir l'écran. Plus la source est petite, plus ce recadrage punit." },
      { q: "Peut-on couper la vidéo de quelqu'un d'autre ?", r: "Techniquement oui, mais la bonne pratique est de demander l'autorisation du créateur et de le créditer visiblement — beaucoup l'encouragent parce que ça leur amène de l'audience. Attention aussi à la musique présente dans la source, qui peut faire bloquer la publication." },
    ],
  },

  {
    slug: 'video-longue-en-short',
    date: '2026-09-25',
    title: 'Transformer une vidéo longue en Shorts — automatique',
    h1: 'Une vidéo longue, une série de Shorts',
    h1html: 'Une vidéo longue, <span>une série de Shorts</span>',
    badge: '📐 Format 9:16 · sous-titres inclus',
    description:
      "Une vidéo d'une heure contient de quoi faire une dizaine de formats courts. L'IA repère les passages, découpe, recadre en 9:16 et sous-titre.",
    sub: "Une vidéo d'une heure contient presque toujours de quoi tenir plusieurs semaines en format court. Le travail qui coûte n'est pas le montage, c'est de trouver les passages — et c'est exactement ce que l'outil fait à ta place.",
    placeholder: 'Colle un lien YouTube',
    bouton: 'Transformer',
    cta: 'Ce que tu as déjà tourné vaut plus que ce que tu vas tourner',
    corps: `
  <h2>Combien de Shorts dans une vidéo longue ?</h2>
  <p>La réponse dépend beaucoup moins de la durée que de la <strong>densité</strong>. Un podcast dense donne plus qu'un stream de six heures où il ne se passe rien.</p>
  <div class="etapes">
    <div class="etape"><b>Podcast ou interview</b><span>Format le plus rentable : chaque réponse à une question est structurellement autonome.</span></div>
    <div class="etape"><b>Conférence</b><span>Trois à six extraits solides pour 45 minutes. La densité d'affirmations autonomes y est faible.</span></div>
    <div class="etape"><b>Stream commenté</b><span>Très variable. Ce sont les réactions qui font les clips, pas l'action elle-même.</span></div>
  </div>
  <p>Le calcul détaillé est dans <a href="/blog/combien-shorts-extraire-video-youtube.html">combien de Shorts extraire d'une vidéo YouTube</a>.</p>

  <h2>Le vrai coût n'est pas le montage</h2>
  <p>Sur une vidéo de deux heures, le repérage — regarder, noter les bons moments — prend 45 à 90 minutes. C'est le poste le plus lourd, et le plus invisible : il ne produit aucun fichier alors qu'il décide de la qualité de tout le reste.</p>
  <p>C'est cette étape qui est automatisée ici. Le montage, lui, est la partie facile une fois qu'on sait où couper.</p>

  <h2>Ton archive vaut probablement plus que ta prochaine vidéo</h2>
  <p>Une vidéo publiée il y a deux ans n'a été vue que par ton audience d'il y a deux ans — beaucoup plus petite qu'aujourd'hui. Et les plateformes courtes n'ont aucune mémoire de son origine : pour TikTok, un extrait d'une vieille vidéo est un contenu neuf.</p>
  <p>Le tri se fait sur le caractère intemporel, pas sur la performance passée. Voir <a href="/blog/recycler-anciennes-videos.html">recycler ses anciennes vidéos en clips</a>.</p>

  <h2>Où publier ensuite</h2>
  <p>Le même fichier vertical part sur TikTok, Reels et Shorts sans retouche. Deux plateformes méritent une attention particulière : <a href="/blog/clips-pour-linkedin.html">LinkedIn</a>, où le texte du post compte autant que la vidéo, et <a href="/blog/clips-pour-facebook-reels.html">Facebook Reels</a>, nettement moins saturé parce que presque personne n'y publie.</p>
`,
    faq: [
      { q: "Combien de Shorts peut-on tirer d'une vidéo longue ?", r: "Cela dépend de la densité plus que de la durée. Un podcast ou une interview est le format le plus rentable, chaque réponse étant autonome. Une conférence de 45 minutes donne raisonnablement trois à six extraits solides." },
      { q: "Quelle est l'étape qui prend le plus de temps ?", r: "Le repérage : 45 à 90 minutes pour une vidéo de deux heures. C'est le poste le plus lourd et le plus invisible, puisqu'il ne produit aucun fichier tout en décidant de la qualité de tout le reste. C'est celui qui est automatisé ici." },
      { q: "Peut-on utiliser d'anciennes vidéos ?", r: "Oui, et c'est souvent le stock le plus rentable : une vidéo ancienne n'a été vue que par ton audience de l'époque, et les plateformes courtes n'ont aucune mémoire de son origine. Trie sur le caractère intemporel plutôt que sur la performance passée." },
      { q: "Faut-il refaire les clips pour chaque plateforme ?", r: "Non. Le même fichier vertical 1080×1920 part sur TikTok, Reels et Shorts sans retouche. Seule la légende mérite d'être réécrite selon la plateforme, en particulier sur LinkedIn où le texte compte autant que la vidéo." },
      { q: "Les sous-titres sont-ils inclus ?", r: "Oui, calés mot par mot et incrustés dans l'image. Ce n'est pas une option : l'essentiel des vues en format court se fait son coupé, et un clip sans sous-titres perd son audience dans les deux premières secondes." },
    ],
  },
];
