/**
 * Lot 9 — jour 2 de la cadence (25/09/2026).
 *
 * Trois territoires vérifiés comme totalement vides sur le site :
 *   - « lancer une campagne de clipping » : zéro occurrence, et c'est le côté
 *     ANNONCEUR, distinct de combien-coute-faire-clipper (prestation au clip).
 *   - Snapchat : cité en passant sur 3 pages produit, aucune page dédiée.
 *   - podcast audio sans vidéo : une seule mention sur tout le site.
 *
 * Chiffres Snapchat vérifiés par recherche le 25/09/2026 (conditions Spotlight).
 * Le ~0,80 $/1 000 vues est une ESTIMATION EXTERNE : toujours l'attribuer.
 */

module.exports = [
  {
    slug: 'clips-pour-snapchat',
    tag: 'Publication',
    title: 'Clips sur Snapchat Spotlight : la plateforme la plus exigeante',
    h1: 'Clips sur Snapchat Spotlight : ce qu’il faut savoir avant',
    description:
      "Caméra native exigée, vidéos d'une minute minimum, 50 000 abonnés : Spotlight est la plateforme la plus hostile au contenu recyclé. Ce que ça implique vraiment.",
    date: '2026-09-25',
    dateLisible: '25 septembre 2026',
    minutes: 6,
    reponse:
      "Snapchat Spotlight est la <strong>plateforme la moins favorable au contenu recyclé</strong>, et il vaut mieux le savoir avant d'y investir du temps. Trois contraintes s'y cumulent : l'accès aux récompenses demande un <strong>seuil d'abonnés élevé et une publication très régulière</strong>, les vidéos doivent durer <strong>au moins une minute</strong> là où un clip efficace en fait trente à soixante, et surtout l'usage de la <strong>caméra native Snapchat</strong> conditionne l'accès aux revenus maximums — ce qui exclut par construction un clip monté ailleurs. Publier sur Spotlight a du sens comme diffusion complémentaire, pas comme source de revenu pour un clippeur.",
    sections: [
      {
        titre: 'Les conditions réelles du programme',
        corps: `  <p>Les critères communiqués par Snap pour le programme de récompenses Spotlight, à la date de rédaction :</p>
  <ul>
    <li><strong>50 000 abonnés</strong> au minimum ;</li>
    <li><strong>au moins 25 publications</strong> sur les 28 derniers jours ;</li>
    <li><strong>100 heures de temps de visionnage Spotlight</strong> sur les 28 derniers jours pour prétendre aux récompenses maximales ;</li>
    <li><strong>18 ans révolus</strong> et résidence dans un pays où le programme existe — une quarantaine à ce jour ;</li>
    <li>un <strong>seuil minimum de versement</strong> avant tout paiement.</li>
  </ul>
  <p>Ces critères évoluent régulièrement : vérifie-les sur les pages officielles de Snap avant de bâtir quoi que ce soit dessus. Des estimations externes circulent sur la rémunération — de l'ordre de 0,80 $ pour 1 000 vues éligibles — mais ce sont des estimations tierces, très variables, et Snap ne publie pas de taux garanti.</p>`,
      },
      {
        titre: 'Les deux contraintes qui bloquent le recyclage',
        corps: `  <h3>La durée minimale d’une minute</h3>
  <p>C'est frontalement contradictoire avec ce qui fait un bon clip. Un extrait de trente à soixante secondes a une bien meilleure complétion qu'un extrait d'une minute et plus, et la complétion est le signal qui compte partout ailleurs. Voir <a href="/blog/analyser-performance-clips.html">analyser ses clips</a>.</p>
  <p>Pour tenir la minute, il faut soit choisir des extraits plus longs — et accepter une complétion plus faible — soit assembler. Les deux abîment le clip par rapport à sa version publiée ailleurs.</p>
  <h3>La caméra native</h3>
  <p>C'est le point décisif. Un clip monté dans un outil puis importé n'a pas été filmé avec la caméra Snapchat, et cela le prive de l'accès aux revenus maximums. Aucun contournement n'existe : c'est une condition de conception du programme, pas un réglage.</p>
  <p>Autrement dit, Snapchat rémunère le contenu <strong>créé pour Snapchat</strong>. C'est un choix cohérent de sa part, et il ferme la porte au clippeur.</p>`,
      },
      {
        titre: 'Ce que ça veut dire concrètement',
        corps: `  <p><strong>Si tu clipes pour être payé</strong> — campagnes rémunérées, prestation pour un créateur — Spotlight n'est pas ton terrain. Le temps passé à adapter des clips à ses contraintes rapporte davantage investi sur TikTok, Reels et Shorts, où le contenu importé est traité comme le reste. Voir <a href="/blog/campagnes-clipping-remunerees.html">comment marche une campagne de clipping rémunérée</a>.</p>
  <p><strong>Si tu diffuses ton propre contenu</strong>, publier sur Spotlight garde du sens : la visibilité y est réelle et la concurrence moindre qu'ailleurs, précisément parce que moins de gens y publient. Ce sera une diffusion supplémentaire, pas une source de revenu.</p>
  <p><strong>Si tu vises une audience jeune</strong>, c'est un argument réel : la démographie de Snapchat reste plus jeune que celle des autres plateformes. À mettre en balance avec le coût d'adaptation.</p>`,
      },
      {
        titre: 'Comment publier quand même, proprement',
        corps: `  <p>Si tu décides d'y aller, quelques points qui évitent de perdre du temps :</p>
  <ol>
    <li><strong>Prépare une version longue</strong> de tes meilleurs clips plutôt que d'en bricoler une au dernier moment. Choisis à la source des extraits qui tiennent une minute sans s'affaisser.</li>
    <li><strong>Garde les sous-titres</strong> — ils servent autant ici qu'ailleurs, et Snapchat se consomme aussi son coupé. Voir <a href="/blog/generer-sous-titres-automatiques.html">générer des sous-titres automatiques</a>.</li>
    <li><strong>Le format vertical reste le même</strong>, 1080 × 1920 : rien à refaire de ce côté. Voir <a href="/blog/formats-video-reseaux-sociaux.html">les formats par réseau</a>.</li>
    <li><strong>Ne compte pas les vues Snapchat dans tes statistiques globales.</strong> Les conditions de comptage et de rémunération y sont trop différentes pour être comparées au reste.</li>
  </ol>
  <p>Pour les plateformes où le recyclage est pleinement accepté, voir <a href="/blog/cross-posting-clips.html">le cross-posting de clips</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Peut-on publier des clips recyclés sur Snapchat Spotlight ?",
        r: "Techniquement oui, mais l'usage de la caméra native Snapchat conditionne l'accès aux revenus maximums du programme de récompenses. Un clip monté dans un outil puis importé est donc désavantagé par construction, sans contournement possible.",
      },
      {
        q: "Quelles sont les conditions pour être rémunéré sur Spotlight ?",
        r: "Snap demande notamment 50 000 abonnés, au moins 25 publications sur 28 jours, et 100 heures de temps de visionnage Spotlight sur la même période pour les récompenses maximales, avec un âge minimum de 18 ans et une résidence dans un pays couvert. Ces critères évoluent — vérifie-les sur les pages officielles.",
      },
      {
        q: "Quelle durée minimale pour une vidéo Spotlight monétisable ?",
        r: "Au moins une minute, ce qui entre en contradiction avec le format court efficace : un extrait de trente à soixante secondes a une bien meilleure complétion. Tenir la minute impose soit des extraits plus longs, soit un assemblage — les deux dégradent le clip par rapport à sa version publiée ailleurs.",
      },
      {
        q: "Snapchat vaut-il le coup pour un clippeur ?",
        r: "Non, si l'objectif est le revenu : le temps passé à adapter des clips aux contraintes de Spotlight rapporte davantage investi sur TikTok, Reels et Shorts, où le contenu importé est traité comme le reste. Oui, comme diffusion complémentaire de son propre contenu, notamment auprès d'une audience jeune.",
      },
      {
        q: "Combien paye Snapchat pour 1 000 vues ?",
        r: "Snap ne publie pas de taux garanti. Des estimations externes évoquent un ordre de grandeur autour de 0,80 $ pour 1 000 vues éligibles, mais ce sont des chiffres tiers, très variables selon les périodes et les pays — à ne pas utiliser comme base de prévision.",
      },
    ],
    cta: { titre: 'Produis d’abord pour les plateformes qui acceptent le recyclage', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'lancer-campagne-clipping',
    tag: 'Clipping',
    title: 'Lancer une campagne de clipping pour sa marque',
    h1: 'Lancer une campagne de clipping pour sa marque ou sa chaîne',
    description:
      "Budget, taux au millier de vues, brief, garde-fous : comment structurer une campagne qui rémunère des clippeurs sans se faire diluer ni payer n'importe quoi.",
    date: '2026-09-25',
    dateLisible: '25 septembre 2026',
    minutes: 8,
    reponse:
      "Lancer une campagne de clipping, c'est <strong>acheter de la distribution au millier de vues</strong> plutôt que d'acheter de l'espace publicitaire. Tu déposes un budget fermé, tu publies un brief, et des dizaines de clippeurs produisent et diffusent à partir de ton contenu ; tu ne paies que les vues vérifiées. Le mécanisme est simple, mais trois décisions déterminent entièrement le résultat : le <strong>taux que tu affiches</strong> (il fixe le nombre de participants), la <strong>précision du brief</strong> (elle fixe ce que tu obtiens), et les <strong>garde-fous</strong> (ils évitent que ta marque apparaisse là où tu ne veux pas).",
    sections: [
      {
        titre: 'Ce que tu achètes, et ce que tu n’achètes pas',
        corps: `  <p>Tu achètes de la <strong>diffusion à la performance</strong> : des clips issus de ton contenu, publiés sur des comptes tiers, payés à la vue vérifiée. Comparé à de la publicité classique, les différences sont nettes :</p>
  <ul>
    <li><strong>Tu ne paies pas d'impression sans vue.</strong> Le risque de gaspillage est structurellement plus faible.</li>
    <li><strong>Tu ne contrôles pas le découpage.</strong> Des dizaines de personnes choisissent les extraits à ta place. C'est l'inconvénient majeur, et c'est aussi ce qui fait la force du format : ils trouveront des angles auxquels tu n'aurais pas pensé.</li>
    <li><strong>Tu ne contrôles pas le calendrier.</strong> Une campagne peut s'épuiser en trois jours si elle attire du monde, ou traîner des semaines si le taux est trop bas.</li>
  </ul>
  <p>Ce que tu n'achètes pas : de l'audience à toi. Les vues se font sur les comptes des clippeurs. Si l'objectif est de faire grossir <em>tes</em> comptes, le clipping n'est pas le bon outil — c'est une prestation directe qu'il te faut. Voir <a href="/blog/combien-coute-faire-clipper-ses-videos.html">combien coûte de faire clipper ses vidéos</a>.</p>`,
      },
      {
        titre: 'Fixer le taux — la décision qui commande tout',
        corps: `  <p>Le taux, exprimé en euros pour 1 000 vues vérifiées, détermine combien de clippeurs viennent. Trop bas, personne ne bouge et ton budget dort. Trop haut, la cagnotte part en quelques jours sur du volume médiocre.</p>
  <p>Les repères du marché francophone : les plateformes affichent publiquement des taux allant de l'ordre de <strong>0,40 € à 2 € pour 1 000 vues</strong>. Le détail de ce qui fait varier ces chiffres est dans <a href="/blog/combien-paye-1000-vues-clipping.html">combien paye 1 000 vues en clipping</a>.</p>
  <p>Trois règles pratiques :</p>
  <ol>
    <li><strong>Plus ton brief est contraignant, plus le taux doit monter.</strong> Mention obligatoire, charte de sous-titres, format imposé : chaque contrainte écarte des participants, et il faut compenser.</li>
    <li><strong>Commence bas, ajuste à la hausse.</strong> Un taux relevé en cours de campagne relance l'intérêt ; un taux baissé fait fuir tout le monde et abîme ta réputation auprès des clippeurs.</li>
    <li><strong>Ne publie jamais un budget énorme avec un taux dérisoire.</strong> Les clippeurs calculent, et une campagne qui a l'air d'une mauvaise affaire ne trouve personne.</li>
  </ol>`,
      },
      {
        titre: 'Le brief — ce qui détermine ce que tu obtiens',
        corps: `  <p>Un brief vague donne des clips vagues. Six points à écrire noir sur blanc :</p>
  <ul>
    <li><strong>La source exacte</strong> à cliper, avec les liens. Ne laisse pas les gens deviner ce qu'ils ont le droit d'utiliser.</li>
    <li><strong>Les plateformes de publication acceptées</strong>, sans ambiguïté.</li>
    <li><strong>La mention obligatoire</strong> — nom, identifiant, lien — et où elle doit apparaître.</li>
    <li><strong>La durée attendue</strong>, si tu en as une.</li>
    <li><strong>Les interdits explicites</strong> : sortie de contexte, montage trompeur, sujets à éviter, comparaisons concurrentes.</li>
    <li><strong>Un ou deux exemples de clips validés.</strong> C'est ce qui économise le plus d'allers-retours — un exemple vaut dix paragraphes de consignes.</li>
  </ul>
  <p>Écris aussi ce que tu ne veux <strong>pas</strong>. La plupart des briefs décrivent l'idéal et oublient les limites, et c'est exactement là que les problèmes arrivent.</p>`,
      },
      {
        titre: 'Les garde-fous à poser avant l’ouverture',
        corps: `  <p>Une campagne ouverte, c'est ta marque entre les mains de gens que tu n'as pas choisis. Quatre protections raisonnables :</p>
  <ol>
    <li><strong>Une clause de retrait.</strong> Le droit de demander la suppression d'un clip qui sort du cadre, écrit dans le brief plutôt que négocié après coup.</li>
    <li><strong>Un compte minimum ou une validation préalable</strong> si le sujet est sensible. Tu perds en volume, tu gagnes en contrôle — arbitrage à faire consciemment.</li>
    <li><strong>Une règle sur la musique.</strong> Un clip bloqué pour raison musicale ne génère aucune vue vérifiée : c'est du budget immobilisé pour rien. Voir <a href="/blog/musique-clips-droits.html">musique sur un clip : ce qui est autorisé</a>.</li>
    <li><strong>Une interdiction de republication du même clip</strong> sur plusieurs comptes. C'est le premier réflexe de ceux qui veulent gonfler leurs vues, et ça pollue tes statistiques autant que ta marque.</li>
  </ol>`,
      },
      {
        titre: 'Préparer la matière avant d’ouvrir',
        corps: `  <p>Une erreur fréquente : ouvrir une campagne en pointant une vidéo de deux heures et laisser chacun se débrouiller. Le résultat est prévisible — la moitié des clippeurs abandonne, l'autre moitié choisit les trois mêmes passages évidents.</p>
  <p>Ce qui marche beaucoup mieux :</p>
  <ul>
    <li><strong>Fournir des sources déjà bornées</strong> ou signaler les passages les plus riches. Tu augmentes mécaniquement la diversité des clips produits.</li>
    <li><strong>Fournir plusieurs sources</strong> plutôt qu'une seule, pour éviter que tout le monde clipe le même moment.</li>
    <li><strong>Donner le fichier source</strong> plutôt qu'un lien vers une version recompressée. La qualité des clips en dépend directement — voir <a href="/blog/video-floue-apres-export.html">vidéo floue après export</a>.</li>
  </ul>
  <p>Et si tu veux savoir à quoi ressemble ta campagne vue de l'autre côté, c'est <a href="/blog/campagnes-clipping-remunerees.html">comment marche une campagne de clipping rémunérée</a> qu'il faut lire — connaître le raisonnement des clippeurs est le meilleur moyen d'écrire un brief qui fonctionne.</p>`,
      },
      {
        titre: 'Où la lancer',
        corps: `  <p>Les plateformes qui hébergent ces campagnes côté francophone, et ce qui les distingue, sont détaillées dans <a href="/blog/plateformes-clipping-france.html">le comparatif des plateformes de clipping en France</a>. Le choix se fait sur trois critères : la langue des clippeurs présents, la transparence du comptage des vues, et la souplesse du brief.</p>
  <p>Pour une première campagne, vise petit : un budget modeste sur une source unique t'apprendra plus sur ton taux et ton brief que n'importe quelle projection. Tu ajusteras ensuite avec des chiffres réels.</p>`,
      },
    ],
    faq: [
      {
        q: "Comment fonctionne une campagne de clipping pour un annonceur ?",
        r: "Tu déposes un budget fermé, tu publies un brief indiquant le contenu à cliper et les règles, et des clippeurs produisent et diffusent sur leurs propres comptes. Tu ne paies que les vues vérifiées, à un taux au millier de vues que tu fixes à l'avance, jusqu'à épuisement du budget.",
      },
      {
        q: "Quel taux fixer pour attirer des clippeurs ?",
        r: "Les plateformes francophones affichent des taux allant de l'ordre de 0,40 € à 2 € pour 1 000 vues. Plus le brief est contraignant, plus le taux doit monter pour compenser les participants qu'il écarte. Commence bas et ajuste à la hausse : un taux relevé relance l'intérêt, un taux baissé fait fuir tout le monde.",
      },
      {
        q: "Que doit contenir le brief ?",
        r: "La source exacte avec les liens, les plateformes de publication acceptées, la mention obligatoire et son emplacement, la durée attendue, les interdits explicites, et un ou deux exemples de clips validés. Ce dernier point économise le plus d'allers-retours — un exemple vaut dix paragraphes de consignes.",
      },
      {
        q: "Comment éviter que sa marque apparaisse n'importe où ?",
        r: "En posant quatre garde-fous dans le brief avant l'ouverture : une clause de retrait des clips hors cadre, une validation préalable si le sujet est sensible, une règle explicite sur la musique, et l'interdiction de republier le même clip sur plusieurs comptes.",
      },
      {
        q: "Une campagne de clipping fait-elle grossir mes propres comptes ?",
        r: "Non. Les vues se font sur les comptes des clippeurs, pas sur les tiens. Si l'objectif est de développer ta propre audience, c'est une prestation directe qu'il te faut, pas une campagne ouverte.",
      },
    ],
    cta: { titre: 'Prépare des sources propres avant d’ouvrir ta campagne', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'clips-depuis-podcast-audio',
    tag: 'Sources',
    title: 'Podcast audio sans vidéo : peut-on en faire des clips ?',
    h1: 'Podcast audio sans vidéo : peut-on en faire des clips ?',
    description:
      "Sans image, un extrait de podcast donne un audiogramme — et les audiogrammes performent mal en format court. Les trois options réelles, classées par efficacité.",
    date: '2026-09-25',
    dateLisible: '25 septembre 2026',
    minutes: 6,
    reponse:
      "Techniquement oui, mais il faut être honnête sur le résultat : sans image, un extrait de podcast donne un <strong>audiogramme</strong> — une vignette fixe avec une forme d'onde et des sous-titres — et <strong>les audiogrammes performent mal</strong> sur TikTok, Reels et Shorts. Ces plateformes distribuent d'abord ce qui retient, et un plan fixe ne retient pas. La vraie réponse tient en une phrase : <strong>si tu comptes recycler ton podcast en clips, filme-le</strong>, même mal. Une webcam à 30 € change plus de choses que n'importe quel outil de montage.",
    sections: [
      {
        titre: 'Pourquoi l’audiogramme déçoit',
        corps: `  <p>Le format court n'est pas de la radio avec un habillage : c'est un média visuel où le spectateur décide en deux secondes. Un audiogramme lui présente une image fixe — ou animée d'une forme d'onde, ce qui revient au même en termes d'information.</p>
  <p>Trois conséquences mécaniques :</p>
  <ul>
    <li><strong>Le hook ne peut reposer que sur le texte.</strong> Il n'y a ni visage, ni réaction, ni mouvement pour accrocher. C'est deux fois plus dur. Voir <a href="/blog/hook-3-secondes.html">le hook de 3 secondes</a>.</li>
    <li><strong>La rétention décroche vite.</strong> Sans rien à regarder, l'attention se reporte ailleurs — et la complétion est le signal principal de distribution. Voir <a href="/blog/analyser-performance-clips.html">analyser ses clips</a>.</li>
    <li><strong>Le partage est rare.</strong> On partage une réaction, une tête, un moment. Un rectangle avec du texte se partage mal.</li>
  </ul>
  <p>Ça ne veut pas dire que ça ne marche jamais — un propos exceptionnel perce dans n'importe quel emballage. Mais tu pars avec un handicap qui n'a rien d'anecdotique.</p>`,
      },
      {
        titre: 'Les trois options, de la meilleure à la moins bonne',
        corps: `  <h3>1. Filmer le podcast — de loin la meilleure</h3>
  <p>Même une captation basique, une webcam par intervenant, suffit. Tu n'as pas besoin d'un studio : tu as besoin d'un visage qui parle. C'est ce qui transforme un podcast en source de clips exploitable, et ça change davantage le résultat que n'importe quel investissement de montage.</p>
  <p>Si l'enregistrement se fait à distance, la visio enregistrée en vue intervenant fait parfaitement l'affaire. Voir <a href="/blog/clips-depuis-visioconference.html">transformer une visio en clips</a>.</p>
  <h3>2. Filmer à partir du prochain épisode, et exploiter l’archive autrement</h3>
  <p>Si le passé n'est pas filmé, ne t'acharne pas dessus : bascule en vidéo dès maintenant et sers-toi de l'archive pour autre chose que du format court — citations en image, extraits écrits, newsletter, articles.</p>
  <h3>3. L’audiogramme, en dernier recours</h3>
  <p>Si tu n'as vraiment que l'audio et que tu veux publier quand même, quelques choix limitent les dégâts :</p>
  <ul>
    <li><strong>Des sous-titres très présents</strong>, mot par mot, qui deviennent l'élément visuel principal plutôt qu'un accessoire ;</li>
    <li><strong>Du mouvement</strong> — un défilement de texte, un changement de plan toutes les trois secondes, n'importe quoi qui bouge ;</li>
    <li><strong>Des extraits plus courts qu'ailleurs</strong> : vingt à trente secondes, parce que la rétention décroche plus vite ;</li>
    <li><strong>Les passages les plus forts uniquement.</strong> Sans image, seul le propos porte — il doit être exceptionnel.</li>
  </ul>`,
      },
      {
        titre: 'Ce qui reste valable sans image',
        corps: `  <p>Deux choses fonctionnent indépendamment du support et méritent d'être faites dans tous les cas :</p>
  <ul>
    <li><strong>La transcription.</strong> Elle sert au repérage des moments forts, aux sous-titres, et accessoirement au référencement si tu la publies. Voir <a href="/blog/generer-sous-titres-automatiques.html">générer des sous-titres automatiques</a>.</li>
    <li><strong>Le repérage des passages.</strong> Savoir où sont les trois meilleurs moments de ton épisode a de la valeur même si tu n'en fais pas de clips : pour les notes d'épisode, les extraits écrits, ou la promotion de l'épisode lui-même. Voir <a href="/blog/detecter-moments-viraux.html">détecter les moments viraux</a>.</li>
  </ul>
  <p>Autrement dit, l'analyse du contenu reste utile même quand la vidéo manque. C'est la mise en forme visuelle qui bloque, pas l'identification de ce qui vaut le coup.</p>`,
      },
      {
        titre: 'Si ton podcast est déjà filmé',
        corps: `  <p>Alors tu es dans le cas standard et le meilleur : voir <a href="/clips-podcast.html">transformer un podcast en clips</a>, et <a href="/blog/decouper-video-longue-format-interview.html">découper une vidéo longue au format interview</a> pour la méthode de découpage.</p>
  <p>Un point d'attention propre au podcast filmé : le cadrage. Si plusieurs personnes sont à l'image dans un plan large, le passage en vertical impose de suivre celui qui parle plutôt que de recadrer au centre. Voir <a href="/blog/pourquoi-ton-crop-9-16-est-rate.html">pourquoi ton crop 9:16 est raté</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Peut-on faire des clips depuis un podcast uniquement audio ?",
        r: "Techniquement oui, sous forme d'audiogramme — une image fixe avec une forme d'onde et des sous-titres. Mais ces formats performent mal sur TikTok, Reels et Shorts, qui distribuent d'abord ce qui retient l'attention, et un plan fixe ne retient pas.",
      },
      {
        q: "Pourquoi les audiogrammes fonctionnent-ils mal ?",
        r: "Parce que le hook ne peut reposer que sur le texte, sans visage ni mouvement pour accrocher ; parce que la rétention décroche vite faute de quelque chose à regarder, alors que la complétion est le signal principal de distribution ; et parce qu'on partage une réaction ou une tête, pas un rectangle avec du texte.",
      },
      {
        q: "Que faire si mon podcast n'est pas filmé ?",
        r: "Le filmer à partir du prochain épisode, même avec une simple webcam par intervenant — c'est ce qui change le plus le résultat, davantage que n'importe quel outil de montage. L'archive audio, elle, s'exploite mieux autrement : citations en image, extraits écrits, newsletter.",
      },
      {
        q: "Comment limiter les dégâts si je n'ai que l'audio ?",
        r: "Des sous-titres mot par mot très présents qui deviennent l'élément visuel principal, du mouvement à l'image toutes les trois secondes, des extraits plus courts qu'ailleurs — vingt à trente secondes — et uniquement les passages les plus forts, puisque seul le propos porte.",
      },
      {
        q: "L'analyse d'un podcast audio a-t-elle un intérêt sans vidéo ?",
        r: "Oui. La transcription sert au repérage, aux sous-titres et au référencement, et savoir où sont les trois meilleurs moments d'un épisode reste utile pour les notes d'épisode, les extraits écrits ou la promotion. C'est la mise en forme visuelle qui bloque, pas l'identification de ce qui vaut le coup.",
      },
    ],
    cta: { titre: 'Filme ton prochain épisode, le reste suivra', bouton: 'Essayer Créatis gratuitement' },
  },
];
