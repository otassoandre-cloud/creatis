/**
 * Lot 6 — usages non couverts.
 *
 * Contrainte de véracité vérifiée dans api/repurpose.js (mode translate_segments)
 * le 24/09/2026 : la traduction est FRANÇAIS ↔ ANGLAIS uniquement, et elle porte
 * sur les SOUS-TITRES, pas sur l'audio. Ne jamais écrire « toutes les langues »
 * ni laisser croire à du doublage.
 */

module.exports = [
  {
    slug: 'sous-titres-anglais-clips',
    tag: 'Usages',
    title: 'Publier ses clips en anglais : ce que ça change',
    h1: 'Publier ses clips en anglais',
    description:
      "Sous-titrer ses clips en anglais ouvre un marché dix fois plus grand. Ce que ça marche vraiment, ce que ça ne remplace pas, et comment s'y prendre sans tout refaire.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 6,
    reponse:
      "Sous-titrer un clip français en anglais fonctionne sur les formats courts pour une raison mécanique : <strong>la majorité des vues s'y font son coupé</strong>, donc le spectateur lit plus qu'il n'écoute. Une parole française sous-titrée en anglais reste parfaitement suivable. Ce n'est en revanche <strong>pas du doublage</strong> : celui qui active le son entendra du français. C'est une limite réelle, et elle décide du type de contenu pour lequel ça vaut le coup.",
    sections: [
      {
        titre: 'Pourquoi ça marche sur du format court',
        corps: `  <p>Sur TikTok, Reels et Shorts, l'écrasante majorité des lectures démarre sans le son — dans les transports, en classe, au bureau, le soir à côté de quelqu'un. Le sous-titre n'y est pas une aide à l'accessibilité, il <strong>est</strong> le contenu.</p>
  <p>Conséquence directe : si le texte à l'écran est en anglais, le clip est intelligible pour un anglophone, quelle que soit la langue parlée. Le décalage entre la voix et le texte ne gêne que ceux qui activent le son — une minorité, et une minorité qui a de toute façon choisi de l'activer.</p>
  <p>Le marché derrière est sans commune mesure : le francophone se compte en centaines de millions de locuteurs, l'anglophone en milliards une fois les non-natifs inclus. Pour le même travail de montage, l'audience adressable change d'ordre de grandeur.</p>`,
      },
      {
        titre: 'Ce que ça ne remplace pas',
        corps: `  <p>Autant poser les limites tout de suite, parce qu'elles sont réelles.</p>
  <ul>
    <li><strong>Ce n'est pas du doublage.</strong> L'audio reste en français. Un spectateur qui active le son entend une langue qu'il ne comprend pas — il peut rester s'il lit, il peut partir.</li>
    <li><strong>L'humour de langue ne se traduit pas.</strong> Les jeux de mots, les références culturelles et les expressions idiomatiques perdent l'essentiel. Un clip dont la chute repose sur un calembour français ne fonctionnera pas en anglais, quel que soit le sous-titre.</li>
    <li><strong>Le contexte local non plus.</strong> Une blague sur une émission française, une polémique hexagonale ou un personnage public connu ici seulement n'a aucune prise ailleurs.</li>
  </ul>
  <p>Le test avant de traduire : <strong>l'idée tiendrait-elle si elle était dite par quelqu'un d'autre, dans un autre pays ?</strong> Si oui, traduis. Si la valeur du clip vient de la langue ou du contexte français, ne traduis pas — tu diluerais.</p>`,
      },
      {
        titre: 'Quel contenu traduire en priorité',
        corps: `  <p>Par ordre de rendement :</p>
  <ol>
    <li><strong>La démonstration et le tutoriel.</strong> On montre quelque chose, le texte accompagne. C'est le format qui passe le mieux les frontières.</li>
    <li><strong>Le chiffre et le fait.</strong> Une donnée est une donnée dans toutes les langues.</li>
    <li><strong>La prise de position argumentée</strong> sur un sujet universel — travail, argent, outils, technologie.</li>
    <li><strong>La réaction</strong>, à condition qu'elle soit visuelle : un fou rire, une surprise, une tête. L'émotion n'a pas besoin de traduction.</li>
  </ol>
  <p>Et ce qui ne vaut pas le détour : les échanges rapides à plusieurs voix, l'ironie, et tout ce qui repose sur un ton plutôt que sur un propos.</p>`,
      },
      {
        titre: 'La méthode, sans tout refaire',
        corps: `  <p>L'erreur fréquente est de reprendre le montage depuis zéro pour la version anglaise. Inutile : le clip est le même, seul le texte change.</p>
  <ol>
    <li><strong>Monte ton clip en français</strong>, normalement — découpe, cadrage, sous-titres.</li>
    <li><strong>Traduis les sous-titres</strong> sans toucher aux bornes ni au cadrage. Créatis le fait en un passage, ligne à ligne, en conservant les timings d'origine : une ligne française donne une ligne anglaise, jamais deux fusionnées.</li>
    <li><strong>Relis</strong> les noms propres et les chiffres, qui sont ce qu'une traduction automatique abîme en premier.</li>
    <li><strong>Publie sur un compte distinct.</strong> C'est le point qui décide de tout — voir la section suivante.</li>
  </ol>
  <p>Attention au fait que l'anglais est souvent plus court que le français : une ligne traduite tient généralement mieux à l'écran, mais l'inverse arrive. Un contrôle visuel sur deux ou trois lignes suffit.</p>`,
      },
      {
        titre: 'Un compte par langue, sans exception',
        corps: `  <p>C'est la règle qui fait échouer ceux qui l'ignorent. Les plateformes apprennent à qui montrer ton contenu à partir de ce que tu publies. Un compte qui alterne français et anglais envoie un signal contradictoire : l'algorithme ne sait plus à quelle audience te rattacher, et te distribue mal <strong>dans les deux langues</strong>.</p>
  <p>Un compte par langue, avec sa description, ses légendes et ses hashtags dans cette langue. C'est plus de travail, et c'est la seule configuration qui fonctionne.</p>
  <p>Le même principe vaut pour les campagnes de clipping rémunérées : un extrait anglophone sous-titré en français perd sur les deux tableaux. Voir <a href="/blog/whop-clipping-guide.html">le guide Whop Content Rewards</a>.</p>
  <p>Sur la publication multi-plateformes, voir <a href="/blog/cross-posting-clips.html">le cross-posting de clips</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Peut-on publier un clip français pour une audience anglophone ?",
        r: "Oui, en sous-titrant en anglais. Sur les formats courts, la majorité des vues se font son coupé : le spectateur lit plus qu'il n'écoute, donc une parole française sous-titrée en anglais reste parfaitement suivable.",
      },
      {
        q: "Les sous-titres traduits remplacent-ils un doublage ?",
        r: "Non. L'audio reste en français : celui qui active le son entend une langue qu'il ne comprend pas. C'est une limite réelle, qui n'empêche pas le format de fonctionner en lecture silencieuse mais qui écarte les contenus dont la valeur tient à la voix.",
      },
      {
        q: "Quel contenu vaut la peine d'être traduit ?",
        r: "Les démonstrations et tutoriels, les chiffres et les faits, les prises de position sur des sujets universels, et les réactions visuelles où l'émotion se passe de traduction. À l'inverse, l'humour de langue, les références culturelles françaises et l'ironie perdent l'essentiel.",
      },
      {
        q: "Faut-il un compte séparé pour l'anglais ?",
        r: "Oui, sans exception. Un compte qui alterne deux langues envoie un signal contradictoire à l'algorithme, qui ne sait plus à quelle audience le rattacher et le distribue mal dans les deux. Un compte par langue, avec description, légendes et hashtags dans cette langue.",
      },
      {
        q: "Faut-il remonter le clip pour la version anglaise ?",
        r: "Non. Le clip est identique, seul le texte change : on garde les bornes, le cadrage et les timings, et on ne traduit que les lignes de sous-titres. Il reste à relire les noms propres et les chiffres, que les traductions automatiques abîment en premier.",
      },
    ],
    cta: { titre: 'Traduis les sous-titres sans retoucher le montage', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'clips-pour-linkedin',
    tag: 'Usages',
    title: 'Clips vidéo pour LinkedIn : ce qui marche vraiment',
    h1: 'Clips vidéo pour LinkedIn : ce qui marche vraiment',
    description:
      "LinkedIn n'est pas TikTok avec des costumes. Format, durée, ton et première seconde : ce qui change quand on recycle une vidéo longue pour un public professionnel.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 6,
    reponse:
      "LinkedIn récompense le format vertical comme les autres plateformes, mais avec <strong>trois différences de fond</strong> : le spectateur y est identifié et lié à son employeur, donc il interagit prudemment ; le <strong>texte du post compte autant que la vidéo</strong>, ce qui n'est le cas nulle part ailleurs ; et le contenu y a une <strong>durée de vie de plusieurs jours</strong> au lieu de quelques heures. Conséquence pratique : on y publie moins, plus argumenté, et on soigne autant les trois premières lignes de texte que les trois premières secondes d'image.",
    sections: [
      {
        titre: 'Ce qui est identique aux autres plateformes',
        corps: `  <ul>
    <li><strong>Le format vertical</strong> occupe plus de place dans le fil et arrête mieux le défilement.</li>
    <li><strong>Les sous-titres sont indispensables</strong> — peut-être plus qu'ailleurs, puisqu'une bonne partie des lectures se fait au bureau, son coupé par nécessité.</li>
    <li><strong>Les premières secondes décident.</strong> Voir <a href="/blog/hook-3-secondes.html">le hook de 3 secondes</a>.</li>
  </ul>
  <p>Les spécifications techniques ne sont pas un sujet : un clip 1080 × 1920 correctement sous-titré passe partout. Voir <a href="/blog/formats-video-reseaux-sociaux.html">les formats vidéo par réseau</a>.</p>`,
      },
      {
        titre: 'Le texte du post fait la moitié du travail',
        corps: `  <p>C'est la différence la plus mal comprise. Sur TikTok, la légende est un accessoire. Sur LinkedIn, le post <strong>est</strong> une publication à part entière, et la vidéo l'illustre.</p>
  <p>En pratique, cela veut dire :</p>
  <ul>
    <li><strong>Les trois premières lignes comptent autant que les trois premières secondes.</strong> Elles sont visibles avant le « voir plus » et décident si quelqu'un déroule.</li>
    <li><strong>Écris l'idée, ne la teasse pas.</strong> « J'ai appris quelque chose d'incroyable cette semaine 👇 » ne marche pas ici. Annonce l'idée, la vidéo la développe.</li>
    <li><strong>Un clip sans texte est un clip orphelin</strong>, même excellent. Il n'a rien pour être compris ni partagé.</li>
  </ul>`,
      },
      {
        titre: 'Le ton : la prudence du spectateur identifié',
        corps: `  <p>Sur LinkedIn, personne n'est anonyme. Chaque interaction est visible par les collègues, le patron et les clients. Ça change radicalement le comportement : on commente moins vite, on s'engage plus prudemment, et on ne partage que ce qu'on assume publiquement.</p>
  <p>Ce qui en découle :</p>
  <ul>
    <li><strong>La provocation gratuite ne prend pas.</strong> Un hook agressif qui marche sur TikTok fait fuir ici, parce que réagir coûte quelque chose.</li>
    <li><strong>L'affirmation argumentée prend très bien</strong>, même clivante, du moment qu'elle est défendable. Les gens veulent pouvoir se ranger derrière sans se compromettre.</li>
    <li><strong>Le retour d'expérience chiffré est le format roi.</strong> « Voilà ce qu'on a essayé, voilà ce que ça a donné » est ce qui circule le plus.</li>
  </ul>`,
      },
      {
        titre: 'Le rythme de publication',
        corps: `  <p>Un clip TikTok vit quelques heures ; un post LinkedIn continue d'être vu pendant plusieurs jours, et les commentaires tardifs le relancent.</p>
  <p>Deux conséquences qui vont à l'encontre des réflexes acquis ailleurs :</p>
  <ol>
    <li><strong>Publier moins.</strong> Deux à trois fois par semaine suffit largement, et publier davantage peut se cannibaliser — tes propres posts se font concurrence dans le fil des mêmes personnes.</li>
    <li><strong>Rester disponible après.</strong> Répondre aux commentaires dans les heures qui suivent pèse plus ici qu'ailleurs, parce que chaque réponse remet le post en circulation.</li>
  </ol>
  <p>Le volume n'est donc pas la stratégie sur LinkedIn — contrairement au clipping rémunéré, où il est le facteur déterminant. Voir <a href="/blog/combien-de-clips-par-jour.html">combien de clips par jour</a>.</p>`,
      },
      {
        titre: 'Quelle source recycler',
        corps: `  <p>Les meilleures sources pour LinkedIn sont celles où quelqu'un explique quelque chose de professionnel de façon autonome :</p>
  <ul>
    <li><strong>Une captation de conférence ou un keynote</strong> — le format le plus direct. Voir <a href="/blog/clips-depuis-conference.html">clips depuis une conférence</a>.</li>
    <li><strong>Un webinaire</strong>, qui a déjà le bon registre. Voir <a href="/blog/webinaire-en-clips.html">transformer un webinaire en clips</a>.</li>
    <li><strong>Un épisode de podcast métier</strong>, où la réponse à une question précise fait un clip autonome.</li>
    <li><strong>Une visio enregistrée</strong>, à condition qu'elle ait été captée en vue intervenant. Voir <a href="/blog/clips-depuis-visioconference.html">transformer une visio en clips</a>.</li>
  </ul>
  <p>Pour une entreprise qui veut structurer ça, voir <a href="/blog/contenu-court-entreprise.html">le contenu court en entreprise</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Le format vertical fonctionne-t-il sur LinkedIn ?",
        r: "Oui, il occupe plus de place dans le fil et arrête mieux le défilement, comme sur les autres plateformes. Un clip 1080 × 1920 correctement sous-titré n'a aucun problème technique sur LinkedIn.",
      },
      {
        q: "Qu'est-ce qui change par rapport à TikTok ?",
        r: "Trois choses : le spectateur est identifié et lié à son employeur, donc il interagit prudemment ; le texte du post compte autant que la vidéo, ce qui n'est le cas nulle part ailleurs ; et le contenu vit plusieurs jours au lieu de quelques heures.",
      },
      {
        q: "Faut-il écrire un texte avec sa vidéo LinkedIn ?",
        r: "Oui, et il fait la moitié du travail. Les trois premières lignes sont visibles avant le « voir plus » et décident si quelqu'un déroule. Annonce l'idée plutôt que de la teaser : la vidéo la développe ensuite.",
      },
      {
        q: "À quelle fréquence publier des clips sur LinkedIn ?",
        r: "Deux à trois fois par semaine suffisent. Publier davantage peut se cannibaliser, puisque tes propres posts se font concurrence dans le fil des mêmes personnes. Le volume n'est pas la stratégie ici, contrairement au clipping rémunéré.",
      },
      {
        q: "Quelles sources recycler pour LinkedIn ?",
        r: "Celles où quelqu'un explique quelque chose de professionnel de façon autonome : captation de conférence ou keynote, webinaire, épisode de podcast métier, ou visio enregistrée en vue intervenant. Le retour d'expérience chiffré est le format qui circule le mieux.",
      },
    ],
    cta: { titre: 'Un webinaire, une conférence, et de quoi tenir le mois', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'recycler-anciennes-videos',
    tag: 'Usages',
    title: 'Recycler ses anciennes vidéos en clips : par où commencer',
    h1: 'Recycler ses anciennes vidéos en clips',
    description:
      "Une archive de vidéos longues est le stock de clips le moins cher qui existe. Comment choisir quoi ressortir, et repérer ce qui a mal vieilli avant de republier.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 6,
    reponse:
      "Une archive de vidéos longues est le <strong>stock de clips le moins cher qui existe</strong> : le contenu est déjà produit, déjà payé, et personne ne le regarde plus. Deux règles suffisent à l'exploiter. D'abord, trier sur le <strong>caractère intemporel</strong> plutôt que sur la performance passée — une vidéo qui a marché à l'époque a marché pour des raisons d'époque. Ensuite, vérifier ce qui a <strong>mal vieilli</strong> avant de republier : un prix, une interface, une statistique ou une affirmation devenue fausse détruit plus de crédibilité que le clip n'apporte de vues.",
    sections: [
      {
        titre: 'Pourquoi l\'archive vaut plus que le nouveau contenu',
        corps: `  <p>Trois raisons, et la troisième est celle qu'on oublie.</p>
  <ol>
    <li><strong>Le coût marginal est nul.</strong> La vidéo existe, elle a déjà été tournée, montée, payée. Il ne reste que le découpage.</li>
    <li><strong>Personne ne l'a vue.</strong> Une vidéo de 2024 a été vue par ton audience de 2024 — beaucoup plus petite que celle d'aujourd'hui. Pour la majorité de tes abonnés actuels, c'est du contenu inédit.</li>
    <li><strong>Les plateformes courtes n'ont aucune mémoire.</strong> Un extrait d'une vidéo de trois ans est un contenu neuf pour TikTok, qui ne sait pas et ne cherche pas à savoir d'où il vient.</li>
  </ol>
  <p>Le calcul de rendement — combien de clips espérer d'une vidéo donnée — est dans <a href="/blog/combien-shorts-extraire-video-youtube.html">combien de Shorts extraire d'une vidéo YouTube</a>.</p>`,
      },
      {
        titre: 'Trier sur l\'intemporel, pas sur la performance',
        corps: `  <p>Le réflexe est de commencer par ses plus gros succès. C'est le mauvais critère : une vidéo qui a explosé à l'époque l'a souvent fait pour des raisons d'époque — une actualité, une polémique, une tendance, une collaboration. Rien de tout ça ne se rejoue.</p>
  <p>Le bon critère est l'<strong>autonomie temporelle</strong> : l'extrait est-il aussi vrai aujourd'hui qu'au moment de l'enregistrement ?</p>
  <p>Ce qui vieillit bien :</p>
  <ul>
    <li>les <strong>définitions et explications de principe</strong> ;</li>
    <li>les <strong>anecdotes personnelles</strong>, qui ne périment jamais ;</li>
    <li>les <strong>méthodes</strong>, tant que l'outil cité n'a pas changé ;</li>
    <li>les <strong>prises de position de fond</strong>, à condition que tu les assumes encore.</li>
  </ul>
  <p>Ce qui vieillit mal : les prix, les captures d'interface, les classements, les « cette année », les réactions à l'actualité et tout ce qui cite une version de logiciel.</p>`,
      },
      {
        titre: 'Le contrôle avant publication',
        corps: `  <p>Quatre questions, dans cet ordre, sur chaque clip candidat :</p>
  <ol>
    <li><strong>Un chiffre est-il cité ?</strong> Vérifie-le. Une statistique de 2023 présentée sans date en 2026 est une erreur factuelle, pas un raccourci.</li>
    <li><strong>Une interface ou un produit est-il montré ?</strong> S'il a changé d'apparence, le clip te fera passer pour quelqu'un qui n'a pas ouvert l'outil depuis deux ans.</li>
    <li><strong>Un prix est-il annoncé ?</strong> C'est le piège le plus fréquent et le plus coûteux en crédibilité.</li>
    <li><strong>L'assumes-tu encore ?</strong> Une position ancienne ressortie sans recul t'engage aujourd'hui comme si tu la tenais aujourd'hui.</li>
  </ol>
  <p>Quand un clip échoue sur un seul de ces points mais reste bon, une mention datée à l'écran suffit souvent — « enregistré en 2024 » désamorce tout.</p>`,
      },
      {
        titre: 'Le problème technique de l\'archive',
        corps: `  <p>Les vidéos anciennes ont souvent une <strong>définition plus faible</strong> que celles d'aujourd'hui. C'est un vrai obstacle, parce que le recadrage vertical ne conserve qu'un tiers de la largeur d'origine et agrandit ce tiers pour remplir l'écran.</p>
  <p>Une source 1080p donne un vertical correct. Une source 720p donne un résultat mou. En dessous, ce n'est plus publiable en 2026, quoi qu'on fasse au montage. Le détail est dans <a href="/blog/video-floue-apres-export.html">vidéo floue après export</a>.</p>
  <p>Si tu as gardé les <strong>fichiers sources</strong> plutôt que les versions publiées, utilise-les : ils sont souvent d'une définition supérieure à ce qui a été mis en ligne à l'époque, et c'est le gain de qualité le moins cher disponible.</p>`,
      },
      {
        titre: 'Par quoi commencer, concrètement',
        corps: `  <ol>
    <li><strong>Liste tes dix vidéos les plus intemporelles</strong>, pas les dix plus vues. Le tri prend une heure et vaut le reste.</li>
    <li><strong>Commence par la plus longue.</strong> Une vidéo d'une heure produit plus de clips qu'une de dix minutes, pour le même temps de traitement.</li>
    <li><strong>Étale la publication.</strong> Sortir trente clips d'un coup depuis une seule source ressemble à du remplissage, et ta propre audience le voit.</li>
    <li><strong>Mesure avant d'industrialiser.</strong> Si les dix premiers clips d'archive tiennent, l'archive entière est exploitable. Sinon, le problème est dans le choix des extraits, pas dans l'âge du contenu.</li>
  </ol>
  <p>Sur la méthode de découpage elle-même, voir <a href="/blog/decouper-video-shorts-automatiquement.html">découper une vidéo en Shorts automatiquement</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Peut-on republier des extraits de vidéos anciennes ?",
        r: "Oui, et c'est le stock de clips le moins cher qui existe. Une vidéo ancienne n'a été vue que par ton audience de l'époque, bien plus petite qu'aujourd'hui, et les plateformes courtes n'ont aucune mémoire de son origine : un extrait d'une vidéo de trois ans y est un contenu neuf.",
      },
      {
        q: "Quelles anciennes vidéos choisir en priorité ?",
        r: "Les plus intemporelles, pas les plus vues. Une vidéo qui a explosé à l'époque l'a souvent fait pour des raisons d'époque — actualité, polémique, tendance — qui ne se rejouent pas. Le bon critère est : l'extrait est-il aussi vrai aujourd'hui qu'au moment de l'enregistrement ?",
      },
      {
        q: "Qu'est-ce qui vieillit mal dans un clip ?",
        r: "Les prix, les captures d'interface, les classements, les formulations du type « cette année », les réactions à l'actualité et les mentions de versions de logiciels. Un prix obsolète coûte plus de crédibilité que le clip n'apporte de vues.",
      },
      {
        q: "Les vidéos anciennes sont-elles assez nettes pour du vertical ?",
        r: "Souvent non. Le recadrage 9:16 ne conserve qu'un tiers de la largeur d'origine et l'agrandit : une source 1080p donne un vertical correct, une source 720p un résultat mou, et en dessous ce n'est plus publiable. Si tu as gardé les fichiers sources plutôt que les versions publiées, utilise-les.",
      },
      {
        q: "Faut-il signaler qu'un clip vient d'une ancienne vidéo ?",
        r: "Ce n'est pas obligatoire, mais une mention datée à l'écran — « enregistré en 2024 » — désamorce la plupart des objections quand le clip cite un chiffre, un prix ou une interface qui a changé depuis.",
      },
    ],
    cta: { titre: 'Ton archive vaut des centaines de clips déjà payés', bouton: 'Essayer Créatis gratuitement' },
  },
];
