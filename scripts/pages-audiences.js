/**
 * Lot 7 — trois audiences distinctes, trois intentions distinctes.
 *
 * Note anti-cannibalisation : `combien-coute-faire-clipper-ses-videos` vise
 * l'ACHETEUR (créateur ou marque qui veut faire produire), quand
 * `combien-gagne-clippeur` vise le PRESTATAIRE. Même sujet, intentions opposées.
 * Les deux pages se citent explicitement pour que la distinction soit lisible.
 */

module.exports = [
  {
    slug: 'clips-sans-montrer-son-visage',
    tag: 'Usages',
    title: 'Faire des clips sans montrer son visage',
    h1: 'Faire des clips sans jamais montrer son visage',
    description:
      "Le clipping est l'un des rares formats vidéo où l'on n'apparaît jamais : on met en valeur le visage de quelqu'un d'autre. Ce que ça permet, et ce que ça impose.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 6,
    reponse:
      "Le clipping est le format vidéo le plus naturellement <strong>sans visage</strong> qui existe : tu ne te filmes pas, tu mets en valeur quelqu'un d'autre qui, lui, est déjà à l'aise devant la caméra. Ni voix, ni personnage, ni matériel. En contrepartie, tout repose sur <strong>le choix de l'extrait et la mise en forme</strong> — le jugement éditorial devient la totalité de ta valeur ajoutée, puisqu'il ne reste rien d'autre pour porter le clip.",
    sections: [
      {
        titre: 'Pourquoi le clipping résout le problème par construction',
        corps: `  <p>La plupart des méthodes « sans visage » qui circulent sont des contournements : voix off sur des images de banque, textes défilants, montages d'archives, avatars synthétiques. Elles ont toutes le même défaut — <strong>il n'y a pas d'humain à l'écran</strong>, et les plateformes courtes distribuent mal ce qui n'a pas de visage, parce que le spectateur n'accroche pas.</p>
  <p>Le clipping fait l'inverse : il y a bel et bien un visage, une voix et une émotion à l'écran. Simplement, ce ne sont pas les tiens. Tu obtiens l'avantage du contenu incarné sans rien exposer de toi.</p>
  <p>Ce n'est pas un détail de confort. C'est la raison pour laquelle le clipping marche là où les formats sans visage plafonnent.</p>`,
      },
      {
        titre: 'Ce que ça permet concrètement',
        corps: `  <ul>
    <li><strong>Aucun matériel.</strong> Pas de caméra, pas de micro, pas d'éclairage, pas de pièce dédiée.</li>
    <li><strong>Aucune compétence de présentation.</strong> Tu n'as pas à savoir parler face caméra — compétence longue à acquérir et qui décourage la plupart des gens.</li>
    <li><strong>Aucune exposition personnelle.</strong> Ni pour un employeur, ni pour des proches, ni pour de futurs clients. Personne n'a besoin de savoir que tu fais ça.</li>
    <li><strong>Aucun besoin d'audience préalable.</strong> Voir <a href="/blog/clipper-sans-audience.html">clipper sans audience</a>.</li>
    <li><strong>La possibilité de travailler plusieurs sujets à la fois</strong> sans incohérence : tu n'es pas la marque, donc rien ne t'oblige à la cohérence d'un personnage.</li>
  </ul>`,
      },
      {
        titre: 'Ce que ça impose en échange',
        corps: `  <p>Retirer son visage retire aussi une béquille. Ce qui reste doit porter seul.</p>
  <ol>
    <li><strong>Le choix de l'extrait devient tout.</strong> Un clippeur qui se trompe d'extrait n'a rien pour rattraper — ni charisme, ni relation avec l'audience, ni « c'est moi qui le dis ».</li>
    <li><strong>La mise en forme doit être irréprochable.</strong> Cadrage sur le bon sujet, sous-titres lisibles, coupe nette. Ce sont les seuls leviers qui te restent. Voir <a href="/blog/pourquoi-ton-crop-9-16-est-rate.html">pourquoi ton crop 9:16 est raté</a>.</li>
    <li><strong>Tu dépends du contenu d'autrui.</strong> Si le créateur que tu clipes s'arrête, change de format ou te retire son autorisation, ton activité s'arrête avec lui. Diversifier les sources est une protection, pas un luxe.</li>
    <li><strong>Tu ne construis pas de marque personnelle.</strong> C'est un arbitrage : tu gagnes la discrétion, tu perds la capitalisation. Un compte de clips vaut ce qu'il produit, pas ce que tu es.</li>
  </ol>`,
      },
      {
        titre: 'La question de l\'autorisation, qui se pose forcément',
        corps: `  <p>Utiliser le visage et la voix de quelqu'un d'autre n'est pas neutre. La bonne pratique tient en trois points :</p>
  <ul>
    <li><strong>Demander.</strong> Beaucoup de créateurs et de streamers encouragent le clipping parce que ça leur amène de l'audience, et l'indiquent dans leur description ou leur Discord. Un message poli reçoit un oui bien plus souvent qu'un non.</li>
    <li><strong>Créditer visiblement</strong> — nom du créateur à l'écran ou en légende. C'est ce qui transforme un clip pillé en clip qui sert les deux parties.</li>
    <li><strong>Ne jamais sortir du contexte.</strong> Un montage qui fait dire à quelqu'un l'inverse de ce qu'il a dit est le meilleur moyen de perdre une autorisation, et pire.</li>
  </ul>
  <p>Le cadre le plus simple reste la campagne de clipping, où l'autorisation fait partie du brief. Voir <a href="/blog/campagnes-clipping-remunerees.html">comment marche une campagne de clipping rémunérée</a>.</p>`,
      },
      {
        titre: 'Par où démarrer',
        corps: `  <ol>
    <li><strong>Choisis une source de divertissement</strong> — humour, gaming, podcast, réactions. Évite l'actualité et la politique : la distribution y est plus prudente et le risque de sortie de contexte est réel.</li>
    <li><strong>Ouvre tes comptes maintenant</strong> et publie dessus, même avant toute campagne. L'ancienneté compte davantage que le volume au début.</li>
    <li><strong>Vise la régularité</strong> : trois à cinq clips par jour tous les jours battent vingt clips un dimanche.</li>
    <li><strong>Rode la chaîne</strong> jusqu'à sortir dix clips en moins d'une heure. Voir <a href="/blog/combien-de-clips-par-jour.html">combien de clips par jour</a>.</li>
  </ol>
  <p>Et si l'objectif est d'en faire un revenu, le cadre économique est dans <a href="/blog/devenir-clippeur-tiktok.html">devenir clippeur</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Peut-on faire des vidéos courtes sans montrer son visage ?",
        r: "Oui, et le clipping est le format le mieux adapté : tu ne te filmes pas, tu mets en valeur quelqu'un d'autre déjà à l'aise devant la caméra. Contrairement aux montages sans visage, il y a bel et bien un humain à l'écran — ce qui change tout pour la distribution.",
      },
      {
        q: "Pourquoi les formats sans visage fonctionnent-ils mal en général ?",
        r: "Parce que les plateformes courtes distribuent mal ce qui n'a pas de visage : le spectateur n'accroche pas sur de la voix off posée sur des images de banque ou du texte défilant. Le clipping contourne ce problème puisqu'il y a un visage, une voix et une émotion — simplement pas les tiens.",
      },
      {
        q: "Faut-il une voix off pour faire des clips ?",
        r: "Non. La voix du clip est celle du créateur dont tu tires l'extrait. Tu n'as ni à parler, ni à enregistrer quoi que ce soit : ton travail est le choix de l'extrait et la mise en forme.",
      },
      {
        q: "Faut-il l'autorisation du créateur ?",
        r: "C'est la bonne pratique, et c'est souvent accordé : beaucoup de créateurs encouragent le clipping parce que ça leur amène de l'audience. Crédite visiblement le créateur et ne sors jamais un propos de son contexte. Dans une campagne de clipping, l'autorisation fait partie du brief.",
      },
      {
        q: "Quel est l'inconvénient de ne pas montrer son visage ?",
        r: "Tu ne construis pas de marque personnelle : un compte de clips vaut ce qu'il produit, pas ce que tu es. Et tu dépends du contenu d'autrui — si le créateur que tu clipes s'arrête ou retire son autorisation, ton activité s'arrête avec lui. Diversifier les sources est une protection.",
      },
    ],
    cta: { titre: 'Aucune caméra, aucun micro, aucune exposition', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'combien-coute-faire-clipper-ses-videos',
    tag: 'Clipping',
    title: 'Combien coûte de faire clipper ses vidéos ?',
    h1: 'Combien coûte de faire clipper ses vidéos ?',
    description:
      "Prestataire, agence ou outil en interne : les trois façons de faire produire ses clips, ce qui fait varier la facture et à partir de quel volume chacune devient rentable.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 7,
    reponse:
      "Il existe <strong>trois façons de faire produire ses clips</strong>, et le choix se fait au volume, pas au budget. En dessous d'une dizaine de clips par mois, un <strong>prestataire indépendant</strong> payé au clip est le plus simple. Entre dix et cent, un <strong>forfait mensuel</strong> avec un clippeur régulier ou une petite agence devient plus économique et plus fiable. Au-delà, ou dès que le délai compte, <strong>internaliser avec un outil</strong> coûte une fraction du reste — l'abonnement se situe à deux chiffres par mois là où la prestation se compte en centaines.",
    sections: [
      {
        titre: 'Ce que tu achètes réellement',
        corps: `  <p>Avant les prix, il faut savoir ce qui est facturé. Un clip, ce n'est pas « une découpe ». C'est une chaîne de cinq opérations :</p>
  <ol>
    <li><strong>Le repérage</strong> — regarder la source et choisir les passages. Le poste le plus coûteux en temps et le plus invisible sur une facture.</li>
    <li><strong>La coupe</strong> — fixer les bornes, ce qui décide à quel point le clip tient.</li>
    <li><strong>Le recadrage vertical</strong> avec suivi du sujet.</li>
    <li><strong>Les sous-titres</strong> — génération, correction, mise en forme.</li>
    <li><strong>L'export et le contrôle</strong>.</li>
  </ol>
  <p>Un prestataire qui facture « au clip » facture ces cinq étapes. Un devis nettement moins cher que les autres a généralement sauté la première — et c'est celle qui décide de tout. Voir <a href="/blog/combien-de-clips-par-jour.html">combien de clips par jour</a> pour le détail du temps réel de chaque poste.</p>`,
      },
      {
        titre: 'Ce qui fait varier la facture',
        corps: `  <ul>
    <li><strong>La longueur de la source.</strong> Un podcast de trois heures demande plus de repérage qu'une vidéo de quinze minutes, pour un nombre de clips parfois identique.</li>
    <li><strong>La qualité de la source.</strong> Une captation en plan large fixe, un audio inégal ou une vue en grille multiplient le travail de cadrage. Voir <a href="/blog/clips-depuis-visioconference.html">transformer une visio en clips</a>.</li>
    <li><strong>Le niveau de finition.</strong> Sous-titres bruts, sous-titres à une charte graphique, ou habillage complet avec logo et transitions : l'écart entre les deux extrêmes peut tripler le prix.</li>
    <li><strong>Le délai.</strong> Le même travail livré sous 24 heures coûte plus cher que sous une semaine — et sur du contenu lié à l'actualité, le délai est souvent le critère principal.</li>
    <li><strong>Le nombre de formats.</strong> Une version par plateforme, ou avec traduction, multiplie la livraison sans multiplier le repérage. C'est le poste où négocier.</li>
  </ul>`,
      },
      {
        titre: 'Les trois modèles, et leur seuil de bascule',
        corps: `  <h3>Le prestataire indépendant, au clip</h3>
  <p>Le plus simple pour démarrer : tu paies à la pièce, sans engagement, et tu juges sur pièce. L'inconvénient est la disponibilité — un indépendant qui trouve un client régulier devient moins disponible pour le ponctuel. Convient en dessous d'une dizaine de clips par mois.</p>
  <h3>Le forfait mensuel, avec un clippeur régulier ou une agence</h3>
  <p>Un volume convenu pour un montant fixe. Plus économique au clip, plus prévisible des deux côtés, et le prestataire finit par connaître ton contenu — ce qui améliore le choix des extraits, c'est-à-dire la seule chose qui compte vraiment. C'est le bon modèle entre dix et cent clips par mois. Voir <a href="/blog/clips-pour-agences-clipping.html">produire des clips en volume</a>.</p>
  <h3>L'internalisation avec un outil</h3>
  <p>Un abonnement à deux chiffres par mois contre des centaines d'euros de prestation : l'écart n'est pas marginal, il est d'un ordre de grandeur. Ce que tu payes en échange, c'est ton propre temps de tri — l'outil produit les propositions, quelqu'un chez toi choisit. À partir du moment où le volume est régulier ou le délai serré, c'est le modèle qui l'emporte. Les formules sont sur la <a href="/#tarifs">page tarifs</a>.</p>`,
      },
      {
        titre: 'Les trois erreurs des acheteurs',
        corps: `  <ol>
    <li><strong>Payer au clip livré sans définir ce qu'est un clip acceptable.</strong> Sans critère écrit — durée, sous-titres, cadrage, mention — tu paieras des clips que tu ne publieras pas.</li>
    <li><strong>Choisir sur le prix unitaire.</strong> Le prestataire le moins cher a presque toujours économisé sur le repérage. Dix clips bien choisis valent mieux que trente pris au hasard, et coûtent moins cher au clip publié.</li>
    <li><strong>Oublier qui possède les comptes.</strong> Si le prestataire publie depuis ses propres comptes, l'audience créée lui appartient. C'est à décider avant, pas après. Voir <a href="/blog/clipper-pour-un-streamer.html">clipper pour un streamer</a>, qui décrit la même relation vue de l'autre côté.</li>
  </ol>`,
      },
      {
        titre: 'Comment trancher',
        corps: `  <p>Trois questions suffisent :</p>
  <ul>
    <li><strong>Combien de clips par mois ?</strong> En dessous de dix, prestataire ponctuel. Entre dix et cent, forfait. Au-delà, outil.</li>
    <li><strong>Le délai compte-t-il ?</strong> Si tu publies sur de l'actualité ou sur un événement daté, l'internalisation est la seule option qui tient.</li>
    <li><strong>Qui choisit les extraits ?</strong> Si tu veux garder ce contrôle — et c'est souvent justifié, c'est là qu'est la valeur — un outil te le rend ; un prestataire te le prend.</li>
  </ul>
  <p>Et si tu te poses la question depuis l'autre côté, en tant que clippeur qui veut fixer ses tarifs, c'est <a href="/blog/combien-gagne-clippeur.html">combien gagne un clippeur</a> qu'il faut lire.</p>`,
      },
    ],
    faq: [
      {
        q: "Combien coûte de faire produire ses clips par un prestataire ?",
        r: "Cela dépend surtout du volume et du niveau de finition. Ce qui est facturé au clip couvre cinq opérations : repérage, coupe, recadrage vertical, sous-titres, export et contrôle. Un devis nettement moins cher que les autres a généralement sauté le repérage, qui est pourtant le poste décisif.",
      },
      {
        q: "Qu'est-ce qui fait varier le prix d'un clip ?",
        r: "La longueur et la qualité de la source, le niveau de finition demandé — sous-titres bruts, charte graphique ou habillage complet peuvent tripler le prix —, le délai de livraison, et le nombre de formats livrés. C'est sur ce dernier point qu'il y a le plus à négocier, puisqu'il ne multiplie pas le repérage.",
      },
      {
        q: "À partir de quel volume faut-il internaliser ?",
        r: "En dessous d'une dizaine de clips par mois, un prestataire au clip suffit. Entre dix et cent, un forfait mensuel est plus économique et plus fiable. Au-delà, ou dès que le délai devient un critère, un outil interne coûte un ordre de grandeur moins cher.",
      },
      {
        q: "Quelle est l'erreur la plus fréquente quand on achète des clips ?",
        r: "Choisir sur le prix unitaire. Le prestataire le moins cher a presque toujours économisé sur le repérage, et dix clips bien choisis valent mieux que trente pris au hasard — tout en revenant moins cher rapportés au clip réellement publié.",
      },
      {
        q: "Qui doit posséder les comptes de publication ?",
        r: "C'est à décider avant de commencer. Si le prestataire publie depuis ses propres comptes, l'audience créée lui appartient et repart avec lui à la fin de la collaboration.",
      },
    ],
    cta: { titre: 'Compare à ce que coûte une heure de prestation', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'clips-depuis-instagram-live',
    tag: 'Sources',
    title: 'Transformer un live Instagram en clips',
    h1: 'Transformer un live Instagram en clips',
    description:
      "Un live Instagram est déjà vertical, ce qui supprime l'étape la plus coûteuse. Mais il disparaît vite et sa qualité est faible : ce qu'il faut faire, et quand.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 5,
    reponse:
      "Un live Instagram a un avantage qu'aucune autre source n'offre : il est <strong>déjà au format vertical</strong>, donc l'étape de recadrage — la plus destructrice en qualité — disparaît complètement. En contrepartie, il cumule deux handicaps : une <strong>définition faible</strong>, parce qu'il a été diffusé en direct depuis un téléphone, et une <strong>disponibilité limitée dans le temps</strong>. Le réflexe qui compte : <strong>récupérer le fichier tout de suite après le direct</strong>, pas quand on aura le temps.",
    sections: [
      {
        titre: 'Le seul avantage, mais il est énorme',
        corps: `  <p>Toutes les autres sources — YouTube, Twitch, podcast filmé, visio, conférence — sont horizontales. Les passer en 9:16 impose de ne conserver que <strong>607 pixels de large sur 1920</strong>, soit moins d'un tiers de l'image, ensuite agrandis pour remplir l'écran. C'est la principale cause de clips mous.</p>
  <p>Un live Instagram est nativement vertical. Pas de crop, pas d'agrandissement, pas de choix douloureux entre le visage et le décor. Le cadrage est celui que le créateur a choisi en direct, et il est déjà bon pour le format court.</p>
  <p>Le détail du calcul est dans <a href="/blog/video-floue-apres-export.html">vidéo floue après export</a>.</p>`,
      },
      {
        titre: 'Les deux handicaps, et ce qu\'on peut en faire',
        corps: `  <h3>La définition</h3>
  <p>Un live est encodé pour passer en temps réel sur un réseau mobile : la définition et le débit sont volontairement bas. Ce qui est sauvegardé après coup est cet encodage-là, pas un master. Tu ne récupéreras pas mieux que ce qui a été diffusé.</p>
  <p>Conséquence pratique : <strong>évite tout traitement qui agrandit</strong>. Pas de zoom, pas de recadrage supplémentaire, pas de ré-export en chaîne. Chaque passage dégrade un fichier déjà fragile.</p>
  <h3>La disponibilité</h3>
  <p>Un live n'est pas un VOD : sa conservation dépend de ce que le créateur en fait juste après le direct. Si rien n'est sauvegardé, il n'y a plus rien à cliper — et aucun outil ne récupère ce qui n'existe plus.</p>
  <p>D'où la seule règle qui compte ici : <strong>récupérer le fichier le jour même</strong>. C'est une contrainte d'organisation, pas de montage.</p>`,
      },
      {
        titre: 'Ce qui se clipe bien dans un live',
        corps: `  <p>Un live est décousu par nature : on salue les arrivants, on répond au chat, on laisse des silences. La densité de moments forts y est faible, et c'est normal.</p>
  <p>Ce qui fonctionne :</p>
  <ul>
    <li><strong>Les réponses aux questions du chat</strong> — structurellement autonomes, comme dans une session de questions.</li>
    <li><strong>Les annonces</strong> et les prises de position spontanées, souvent plus franches qu'en contenu préparé.</li>
    <li><strong>Les réactions en direct</strong>, dont l'authenticité est précisément ce qui rend le format live intéressant.</li>
  </ul>
  <p>Ce qui ne donne rien : les salutations, les temps d'attente, les « je vous laisse arriver ». Compte raisonnablement <strong>deux à quatre clips pour une heure de live</strong> — moins qu'un podcast, à durée égale.</p>`,
      },
      {
        titre: 'Les sous-titres, encore plus décisifs ici',
        corps: `  <p>L'audio d'un live est capté au micro du téléphone, souvent dans un environnement non contrôlé. Il est moins propre que sur n'importe quelle autre source, ce qui a deux conséquences :</p>
  <ul>
    <li>la <strong>transcription est plus fragile</strong> — relis les noms propres, qui tombent en premier ;</li>
    <li>les <strong>sous-titres portent davantage</strong>, puisqu'ils compensent un son que le spectateur n'aurait de toute façon pas activé.</li>
  </ul>
  <p>Voir <a href="/blog/generer-sous-titres-automatiques.html">générer des sous-titres automatiques</a>, et <a href="/blog/sous-titres-decales.html">sous-titres décalés</a> si le calage part en dérive — fréquent sur des enregistrements à cadence variable, ce qui est le cas des lives.</p>`,
      },
      {
        titre: 'Pour un direct sur une autre plateforme',
        corps: `  <p>Un live diffusé ailleurs n'a ni les mêmes avantages ni les mêmes contraintes : il est horizontal, donc il faut recadrer, mais il est généralement mieux encodé et conservé plus longtemps.</p>
  <p>Voir <a href="/blog/live-en-shorts.html">transformer un live en Shorts</a> pour le cas général, <a href="/clips-twitch.html">les clips depuis Twitch</a>, et <a href="/blog/clips-depuis-kick.html">clipper un stream Kick</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Faut-il recadrer un live Instagram pour en faire des clips ?",
        r: "Non, et c'est son grand avantage : il est nativement vertical. L'étape de recadrage, qui sur une source horizontale ne conserve qu'un tiers de la largeur avant de l'agrandir, disparaît complètement.",
      },
      {
        q: "Pourquoi la qualité d'un live est-elle faible ?",
        r: "Parce qu'il est encodé pour passer en temps réel sur un réseau mobile : définition et débit sont volontairement bas. Ce qui est sauvegardé après le direct est cet encodage-là, pas un master — on ne récupère jamais mieux que ce qui a été diffusé.",
      },
      {
        q: "Combien de temps un live reste-t-il récupérable ?",
        r: "Cela dépend de ce que le créateur en fait juste après le direct : un live n'est pas une rediffusion permanente. Si rien n'a été sauvegardé, il n'y a plus rien à cliper. Le réflexe est de récupérer le fichier le jour même.",
      },
      {
        q: "Combien de clips tirer d'une heure de live ?",
        r: "Deux à quatre clips solides, moins qu'un podcast de durée équivalente. Un live est décousu par nature — salutations, temps d'attente, réponses au chat — et la densité de moments autonomes y est plus faible.",
      },
      {
        q: "Quels passages d'un live fonctionnent le mieux ?",
        r: "Les réponses aux questions du chat, structurellement autonomes ; les annonces et prises de position spontanées, souvent plus franches qu'en contenu préparé ; et les réactions en direct, dont l'authenticité est précisément l'intérêt du format.",
      },
    ],
    cta: { titre: 'Déjà vertical : il ne reste qu\'à choisir les moments', bouton: 'Essayer Créatis gratuitement' },
  },
];
