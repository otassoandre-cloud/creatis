/**
 * Cluster « problèmes de production » — lot 4.
 *
 * Requêtes de dépannage : intention forte, faible concurrence en français, et
 * surtout un terrain où Créatis a une expertise réelle plutôt qu'une opinion
 * (qualité de source, dérive de sous-titres, recompression plateforme).
 *
 * Sur le filigrane : vérifié dans le code de production le 24/09/2026 — Créatis
 * n'appose AUCUN filigrane. L'essai gratuit ne permet simplement pas l'export.
 * Ne jamais écrire l'inverse sans revérifier.
 */

module.exports = [
  {
    slug: 'video-floue-apres-export',
    tag: 'Dépannage',
    title: 'Vidéo floue après export : les 4 causes réelles',
    h1: 'Ta vidéo est floue après export : les 4 causes réelles',
    description:
      "Un clip net à l'écran et flou une fois publié : la cause est presque toujours en amont. Source, recadrage, définition d'export, recompression plateforme.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 7,
    reponse:
      "Un clip flou à la publication a presque toujours une cause <strong>en amont de l'export</strong>, pas dans l'export lui-même. Par ordre de fréquence : la <strong>source téléchargée en basse définition</strong> sans qu'on s'en rende compte, le <strong>recadrage 9:16 qui agrandit un tiers d'image</strong>, l'<strong>export en 720p au lieu de 1080</strong>, et la <strong>recompression de la plateforme</strong>. Les trois premières se corrigent ; la quatrième se contourne en lui donnant un fichier assez propre pour qu'elle ait peu à faire.",
    sections: [
      {
        titre: '1. La source était déjà en basse définition',
        corps: `  <p>C'est de loin la cause la plus fréquente, et la plus invisible. Quand tu récupères une vidéo en ligne, rien ne garantit qu'on te serve la meilleure définition disponible : selon l'outil et le format demandé, tu peux recevoir du <strong>360p alors que la vidéo existe en 1080p</strong>.</p>
  <p>Le piège, c'est que ça ne se voit pas tout de suite. Une vidéo 360p affichée dans une petite fenêtre a l'air correcte. Recadrée en vertical et affichée plein écran sur un téléphone, elle est catastrophique.</p>
  <p><strong>Rien de ce que tu feras ensuite ne rattrapera ça.</strong> Aucun réglage d'export, aucun filtre, aucune IA ne recrée des pixels qui n'ont jamais été enregistrés. Le réflexe est donc de vérifier la définition de ta source <em>avant</em> de travailler, pas après avoir monté dix clips.</p>`,
      },
      {
        titre: '2. Le recadrage 9:16 agrandit un tiers d\'image',
        corps: `  <p>Voici le calcul que presque personne ne fait. Une source classique fait 1920 × 1080. Pour en tirer du 9:16, on garde toute la hauteur et on coupe la largeur :</p>
  <p style="text-align:center"><strong>1080 × 9 ÷ 16 = 607 pixels de large</strong></p>
  <p>Soit <strong>31,6 % de la largeur d'origine — on jette plus des deux tiers de l'image</strong>. Et ces 607 pixels sont ensuite étirés pour remplir un écran de téléphone qui en attend 1080. L'agrandissement est de près de 80 %.</p>
  <p>Conséquence : <strong>plus la source est petite, plus le recadrage vertical punit</strong>. Une source 1080p donne un vertical tout juste correct. Une source 720p donne un vertical mou. Une source 360p ne donne rien d'utilisable. Le détail est dans <a href="/blog/pourquoi-ton-crop-9-16-est-rate.html">pourquoi ton crop 9:16 est raté</a>.</p>`,
      },
      {
        titre: '3. L\'export sort en 720 au lieu de 1080',
        corps: `  <p>Beaucoup d'outils exportent par défaut en 720 × 1280 plutôt qu'en <strong>1080 × 1920</strong>, pour des raisons de vitesse de traitement. Sur un écran d'ordinateur, la différence est discrète. Sur un téléphone récent, elle saute aux yeux — et c'est là que tes clips sont regardés.</p>
  <p>Vérifie la définition de sortie de ton outil et force le 1080 × 1920 quand l'option existe. C'est le réglage le plus rentable de toute la chaîne : zéro effort, gain immédiat.</p>
  <p>Vérifie aussi ce que tu <em>télécharges</em> : certains outils montrent un aperçu en pleine définition et servent un fichier allégé au téléchargement. Ce n'est pas le même fichier.</p>`,
      },
      {
        titre: '4. La plateforme recompresse — et tu ne peux pas l\'empêcher',
        corps: `  <p>TikTok, Instagram et YouTube recompressent systématiquement ce que tu envoies. C'est non négociable et ça touche tout le monde de la même façon.</p>
  <p>Ce que tu peux faire, en revanche, c'est <strong>lui donner un fichier sur lequel elle a peu de travail</strong> :</p>
  <ul>
    <li>livrer en <strong>1080 × 1920</strong>, la définition que les plateformes attendent — ni moins, ni plus ;</li>
    <li>éviter les <strong>aplats très sombres et les dégradés lents</strong>, qui sont ce que la compression abîme le plus visiblement ;</li>
    <li>éviter les mouvements de caméra rapides sur toute l'image, très coûteux en débit ;</li>
    <li>ne pas ré-exporter un clip déjà exporté : chaque passage dégrade, et ça ne se rattrape jamais.</li>
  </ul>
  <p>Les définitions attendues par chaque plateforme sont détaillées dans <a href="/blog/specs-video-tiktok-reels-shorts.html">les specs vidéo TikTok, Reels et Shorts</a>.</p>`,
      },
      {
        titre: 'Le diagnostic en trois questions',
        corps: `  <p>Dans cet ordre, ça tombe presque toujours en moins d'une minute :</p>
  <ol>
    <li><strong>Ouvre ta source en plein écran.</strong> Elle est déjà molle ? C'est la cause n° 1, tout le reste est perdu d'avance.</li>
    <li><strong>Regarde la définition du fichier exporté.</strong> Si ce n'est pas 1080 × 1920, c'est la cause n° 3.</li>
    <li><strong>Compare ton fichier local et la version publiée.</strong> Le fichier local est net et la version en ligne ne l'est pas ? C'est la recompression, cause n° 4 — travaille la composition plutôt que les réglages.</li>
  </ol>
  <p>Si ta source est nette, ton export en 1080 × 1920 et le résultat toujours mou, il reste le cas n° 2 : la source n'était pas assez grande pour supporter le recadrage vertical. La seule vraie solution est une source de meilleure définition.</p>`,
      },
    ],
    faq: [
      {
        q: "Pourquoi mon clip est-il flou alors que la vidéo d'origine est nette ?",
        r: "Le plus souvent parce que la source réellement récupérée n'était pas celle affichée : selon l'outil, une vidéo disponible en 1080p peut être téléchargée en 360p sans avertissement. Vérifie la définition du fichier source avant de monter, aucun réglage d'export ne rattrape des pixels jamais enregistrés.",
      },
      {
        q: "Pourquoi le recadrage vertical dégrade-t-il autant l'image ?",
        r: "Parce qu'un crop 9:16 dans une source 1920 × 1080 ne conserve que 607 pixels de large, soit 31,6 % de la largeur d'origine, ensuite étirés pour remplir un écran qui en attend 1080. Plus la source est petite, plus ce recadrage punit.",
      },
      {
        q: "En quelle définition faut-il exporter un clip vertical ?",
        r: "1080 × 1920. Beaucoup d'outils exportent par défaut en 720 × 1280 pour aller plus vite : la différence est discrète sur un écran d'ordinateur et très visible sur un téléphone, c'est-à-dire là où tes clips sont regardés.",
      },
      {
        q: "Peut-on empêcher TikTok ou Instagram de recompresser la vidéo ?",
        r: "Non, la recompression est systématique et touche tout le monde. On peut seulement lui donner peu de travail : livrer en 1080 × 1920, éviter les aplats très sombres et les dégradés lents que la compression abîme le plus, et ne jamais ré-exporter un clip déjà exporté.",
      },
      {
        q: "Comment savoir d'où vient le flou ?",
        r: "Trois vérifications dans l'ordre : ouvre la source en plein écran (si elle est molle, tout le reste est perdu d'avance), contrôle que le fichier exporté fait bien 1080 × 1920, puis compare ton fichier local à la version publiée — si seule la version en ligne est molle, c'est la recompression de la plateforme.",
      },
    ],
    cta: { titre: 'Des clips exportés en 1080 × 1920, sans réglage à chercher', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'sous-titres-decales',
    tag: 'Dépannage',
    title: 'Sous-titres décalés : décalage constant ou dérive ?',
    h1: 'Sous-titres décalés : comment identifier et corriger',
    description:
      "Un décalage constant et une dérive progressive n'ont ni la même cause ni le même remède. Comment les distinguer en dix secondes et corriger les deux.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 6,
    reponse:
      "Il existe <strong>deux défauts de synchronisation totalement différents</strong>, et les confondre fait perdre des heures. Le <strong>décalage constant</strong> : les sous-titres ont toujours la même avance ou le même retard, du début à la fin — cause simple, correction immédiate. La <strong>dérive progressive</strong> : synchrone au début, de plus en plus faux à mesure que le clip avance — cause technique, et aucun décalage global ne la corrigera. Première chose à faire : regarder la fin du clip pour savoir dans lequel des deux cas tu es.",
    sections: [
      {
        titre: 'Le test qui prend dix secondes',
        corps: `  <p>Ne regarde pas le début. Regarde <strong>la fin</strong>.</p>
  <ul>
    <li>Le décalage à la fin est <strong>le même</strong> qu'au début → décalage constant.</li>
    <li>Le décalage à la fin est <strong>nettement plus grand</strong> → dérive progressive.</li>
  </ul>
  <p>Tout le reste du diagnostic découle de cette seule observation. Les deux cas n'ont rien en commun, ni dans la cause ni dans la correction.</p>`,
      },
      {
        titre: 'Cas 1 — le décalage constant',
        corps: `  <p>Les sous-titres sont toujours en avance ou en retard de la même durée. C'est le cas le plus fréquent et le plus bénin.</p>
  <h3>Les causes</h3>
  <ul>
    <li><strong>La transcription porte sur la vidéo longue, pas sur le clip.</strong> Si les timings sont calculés sur la source complète et appliqués à un extrait qui commence à 14 min 32, tout est décalé d'exactement 14 min 32 — ou d'une fraction si une correction partielle a été appliquée.</li>
    <li><strong>Le clip a été recoupé après la transcription.</strong> Rogner deux secondes au début décale tout de deux secondes.</li>
    <li><strong>Un générique ou une intro a été ajouté</strong> devant le clip sans décaler les sous-titres.</li>
  </ul>
  <h3>La correction</h3>
  <p>Un décalage global. Mesure l'écart sur un mot précis, applique-le à l'ensemble, vérifie sur un autre mot ailleurs dans le clip. Si le second point tombe juste, c'est réglé.</p>`,
      },
      {
        titre: 'Cas 2 — la dérive progressive',
        corps: `  <p>Synchrone sur les premières secondes, de plus en plus faux ensuite. C'est le cas qui rend fou, parce qu'on corrige le début et on casse la fin.</p>
  <h3>Les causes</h3>
  <ul>
    <li><strong>Une différence de cadence entre le fichier transcrit et le fichier monté.</strong> Les écarts classiques sont 29,97 contre 30 images par seconde, ou 23,976 contre 24. L'écart est minuscule — de l'ordre de 0,1 % — mais il s'accumule : sur trois minutes, ça fait déjà une fraction de seconde visible, et bien plus sur une source longue.</li>
    <li><strong>Une source à cadence variable</strong> (typiquement un enregistrement d'écran ou de visioconférence). La durée réelle et la durée déclarée ne coïncident pas, et le décalage grandit.</li>
    <li><strong>Un décalage audio/vidéo déjà présent dans la source.</strong> Dans ce cas les sous-titres sont justes : c'est l'image qui ment.</li>
  </ul>
  <h3>La correction</h3>
  <p>Un décalage global ne sert à rien ici — c'est le signe distinctif du cas 2. Il faut soit <strong>re-transcrire depuis le fichier réellement monté</strong> (la solution propre, et souvent la plus rapide), soit appliquer une correction proportionnelle plutôt qu'additive. Dans la pratique, re-transcrire coûte moins cher que de rattraper une dérive à la main.</p>`,
      },
      {
        titre: 'Le cas particulier du mot par mot',
        corps: `  <p>Les sous-titres dits karaoké, où chaque mot s'allume à son tour, ne tolèrent pas ce que les sous-titres par phrase pardonnent. Un décalage de 200 millisecondes passe inaperçu sur une phrase entière ; sur un mot isolé, il est immédiatement visible, parce que le spectateur voit le mot s'allumer <em>après</em> l'avoir entendu.</p>
  <p>Deux points d'attention propres à ce style :</p>
  <ul>
    <li><strong>Les silences.</strong> Un blanc d'une seconde au milieu d'une phrase doit rester un blanc. Les systèmes qui répartissent les mots uniformément sur la durée de la phrase produisent un décalage qui se répare de lui-même à la phrase suivante — le pire des deux mondes, puisque ça ressemble à une dérive sans en être une.</li>
    <li><strong>Les nombres et les sigles.</strong> « 2026 » se prononce en plusieurs syllabes mais compte pour un mot : la durée allouée est souvent trop courte.</li>
  </ul>
  <p>Sur la génération elle-même, voir <a href="/blog/generer-sous-titres-automatiques.html">générer des sous-titres automatiques</a>.</p>`,
      },
      {
        titre: 'Comment éviter le problème plutôt que le corriger',
        corps: `  <ol>
    <li><strong>Transcrire le clip, pas la source.</strong> Découper d'abord, transcrire ensuite : le décalage constant devient structurellement impossible.</li>
    <li><strong>Ne plus toucher aux bornes après la transcription.</strong> Tout recadrage temporel ultérieur décale tout.</li>
    <li><strong>Vérifier à la fin, pas au début.</strong> Un contrôle de trois secondes sur la dernière phrase attrape 100 % des dérives.</li>
  </ol>
  <p>C'est l'ordre qu'applique Créatis : le clip est borné d'abord, la transcription porte sur l'extrait, et les timings sont calculés mot par mot sur ce fichier-là. Voir aussi <a href="/blog/sous-titres-automatiques-shorts.html">les sous-titres automatiques pour Shorts</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Comment savoir si mes sous-titres ont un décalage constant ou une dérive ?",
        r: "Regarde la fin du clip plutôt que le début. Si l'écart y est le même qu'au début, c'est un décalage constant, corrigeable par un simple décalage global. S'il est nettement plus grand, c'est une dérive progressive et aucun décalage global ne la corrigera.",
      },
      {
        q: "Pourquoi mes sous-titres sont-ils décalés d'un temps fixe ?",
        r: "Presque toujours parce que la transcription porte sur la vidéo longue et non sur l'extrait : les timings calculés sur la source complète appliqués à un clip qui commence plus loin décalent tout d'autant. Un recoupage du clip après transcription produit le même effet.",
      },
      {
        q: "Pourquoi mes sous-titres dérivent-ils de plus en plus ?",
        r: "Généralement à cause d'une différence de cadence entre le fichier transcrit et le fichier monté — 29,97 contre 30 images par seconde, par exemple. L'écart est infime mais il s'accumule. Les sources à cadence variable, comme les enregistrements d'écran ou de visioconférence, produisent le même symptôme.",
      },
      {
        q: "Comment corriger une dérive progressive ?",
        r: "En re-transcrivant depuis le fichier réellement monté, ce qui est la solution propre et souvent la plus rapide. Un décalage global n'y change rien — c'est même le signe distinctif de ce type de défaut.",
      },
      {
        q: "Les sous-titres mot par mot sont-ils plus difficiles à synchroniser ?",
        r: "Oui. Un décalage de 200 millisecondes passe inaperçu sur une phrase entière mais devient immédiatement visible sur un mot isolé, puisqu'on voit le mot s'allumer après l'avoir entendu. Les silences en milieu de phrase et les nombres, qui comptent pour un mot mais se prononcent en plusieurs syllabes, sont les deux pièges principaux.",
      },
    ],
    cta: { titre: 'Des sous-titres calés sur le clip, pas sur la source', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'clips-sans-filigrane',
    tag: 'Dépannage',
    title: 'Faire des clips sans filigrane : ce qu\'il faut savoir',
    h1: 'Faire des clips sans filigrane',
    description:
      "Pourquoi les outils gratuits apposent un filigrane, ce que ça coûte réellement en portée, et comment obtenir des exports propres sans y passer un budget.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 6,
    reponse:
      "Le filigrane d'un outil tiers sur un clip n'est pas qu'une question d'esthétique : c'est un <strong>logo de marque étrangère dans une vidéo</strong>, et les plateformes courtes favorisent le contenu qui a l'air natif. La plupart des outils l'apposent sur leur offre gratuite pour inciter au passage payant. <strong>Créatis ne pose aucun filigrane, sur aucune formule</strong> — son essai gratuit fonctionne autrement : tu vois tes clips complets avant de payer, et l'export est ce qui devient payant.",
    sections: [
      {
        titre: 'Pourquoi les outils apposent un filigrane',
        corps: `  <p>Deux raisons, et une seule est avouée.</p>
  <p>La raison avouée est la publicité : chaque clip publié transporte le logo, et l'outil recrute des utilisateurs gratuitement. C'est efficace, et c'est de bonne guerre.</p>
  <p>La raison réelle est le levier commercial : le filigrane rend l'offre gratuite <strong>tout juste inutilisable en production</strong>. Assez bonne pour évaluer la qualité, pas assez pour publier sérieusement. C'est un choix de conception, pas une contrainte technique — il n'y a aucune raison technique d'ajouter un logo à une vidéo.</p>`,
      },
      {
        titre: 'Ce qu\'un filigrane coûte réellement',
        corps: `  <ul>
    <li><strong>Il signale un contenu recyclé.</strong> Les plateformes courtes favorisent le contenu qui paraît natif ; un logo d'éditeur tiers est un signal inverse, et plusieurs d'entre elles le disent explicitement dans leurs recommandations aux créateurs.</li>
    <li><strong>Il occupe la zone la plus précieuse.</strong> Les filigranes se placent en général dans un coin — exactement là où passent les sous-titres, le nom du compte et les boutons d'interface. Sur un format vertical où chaque pixel compte, c'est cher payé.</li>
    <li><strong>Il interdit le travail client.</strong> Aucun streamer, aucune marque n'acceptera des clips portant le logo d'un outil tiers. C'est rédhibitoire dès que tu clipes pour quelqu'un d'autre — voir <a href="/blog/clipper-pour-un-streamer.html">clipper pour un streamer</a>.</li>
    <li><strong>Il ne se retire pas après coup.</strong> Les outils qui promettent d'effacer un filigrane laissent une zone floue ou reconstruite, souvent plus visible que le logo d'origine. Mieux vaut exporter propre dès le départ.</li>
  </ul>`,
      },
      {
        titre: 'Comment s\'en passer sans budget',
        corps: `  <ol>
    <li><strong>Vérifier avant de produire, pas après.</strong> La question « l'export est-il filigrané sur cette formule ? » se pose avant de monter quarante clips, pas en les découvrant marqués.</li>
    <li><strong>Distinguer l'aperçu de l'export.</strong> Certains outils montrent un aperçu propre et posent le filigrane au téléchargement. Teste le fichier téléchargé, pas la fenêtre de prévisualisation.</li>
    <li><strong>Comparer le coût réel à l'usage.</strong> Une formule d'entrée qui exporte proprement coûte souvent moins qu'un abonnement haut de gamme dont tu n'utiliseras pas les options. Voir <a href="/blog/meilleur-logiciel-clippeur.html">le meilleur logiciel pour clippeur</a>.</li>
  </ol>`,
      },
      {
        titre: 'Ce que fait Créatis, précisément',
        corps: `  <p>Autant l'écrire sans détour, parce que les formulations vagues sur ce sujet sont la norme :</p>
  <ul>
    <li><strong>Aucun filigrane n'est apposé, sur aucune formule.</strong> Les clips exportés ne portent aucun logo.</li>
    <li><strong>L'essai gratuit ne limite pas la qualité, il limite l'export.</strong> Tu envoies une vidéo, l'analyse tourne, et tu vois tes clips en entier — montage, cadrage vertical, sous-titres compris. C'est au moment de télécharger que la formule payante devient nécessaire.</li>
    <li><strong>Tu juges donc sur le résultat réel</strong>, pas sur une version dégradée destinée à te faire payer.</li>
  </ul>
  <p>C'est un arbitrage assumé : plutôt que de livrer un fichier abîmé, on montre le vrai travail et on fait payer l'usage. Les formules et ce qu'elles incluent sont sur la <a href="/#tarifs">page tarifs</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Pourquoi les outils de clips ajoutent-ils un filigrane ?",
        r: "Pour deux raisons : la publicité, puisque chaque clip publié transporte leur logo, et surtout le levier commercial — le filigrane rend l'offre gratuite tout juste inutilisable en production. Il n'existe aucune raison technique d'ajouter un logo à une vidéo.",
      },
      {
        q: "Un filigrane pénalise-t-il la portée d'un clip ?",
        r: "Les plateformes courtes favorisent le contenu qui paraît natif, et un logo d'éditeur tiers est un signal inverse — plusieurs le disent explicitement dans leurs recommandations aux créateurs. Il occupe en plus la zone la plus précieuse du format vertical, celle des sous-titres et de l'interface.",
      },
      {
        q: "Peut-on retirer un filigrane après coup ?",
        r: "Mal. Les outils qui promettent de l'effacer laissent une zone floue ou reconstruite, souvent plus visible que le logo d'origine. Il vaut bien mieux exporter proprement dès le départ.",
      },
      {
        q: "Créatis met-il un filigrane sur les clips ?",
        r: "Non, aucun filigrane n'est apposé, sur aucune formule. L'essai gratuit fonctionne autrement : il ne dégrade pas la qualité, il limite l'export — tu vois tes clips complets, montage, cadrage et sous-titres compris, et la formule payante devient nécessaire au moment de télécharger.",
      },
      {
        q: "Peut-on livrer à un client des clips filigranés ?",
        r: "En pratique, non. Aucun streamer ni aucune marque n'acceptera des clips portant le logo d'un outil tiers. C'est rédhibitoire dès que tu produis pour quelqu'un d'autre que toi.",
      },
    ],
    cta: { titre: 'Vois tes clips en entier avant de payer quoi que ce soit', bouton: 'Essayer Créatis gratuitement' },
  },
];
