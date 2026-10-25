/**
 * Lot 8 — la finition et l'après-publication.
 *
 * Trois sujets vérifiés comme absents des 62 pages existantes, et qui arrivent
 * tous après le montage : les droits sur la musique, l'image de couverture, et la
 * lecture des statistiques. Aucun chevauchement avec ameliorer-retention-short
 * (qui traite du montage) ni avec algorithme-page-pour-toi-tiktok (distribution).
 */

module.exports = [
  {
    slug: 'musique-clips-droits',
    tag: 'Publication',
    title: 'Musique sur un clip : ce qui est autorisé',
    h1: 'Musique sur un clip : ce qui est autorisé et ce qui ne l’est pas',
    description:
      "Son de l'application, musique ajoutée au montage, musique déjà dans la source : trois statuts très différents. La distinction qui évite les blocages.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 6,
    reponse:
      "Il faut distinguer <strong>trois situations qu'on confond tout le temps</strong>. La musique ajoutée <strong>depuis la bibliothèque de l'application</strong> est couverte par l'accord entre la plateforme et les ayants droit — c'est le cas le plus sûr. La musique <strong>incrustée au montage</strong> avant l'envoi ne l'est pas : la plateforme la détecte comme un fichier audio quelconque et peut couper le son ou bloquer la vidéo. Et la musique <strong>déjà présente dans la vidéo source</strong> — générique, fond sonore d'un stream — voyage avec ton extrait sans que tu l'aies choisie, et c'est la cause de blocage la plus fréquente chez les clippeurs.",
    sections: [
      {
        titre: 'Cas 1 — le son ajouté depuis l’application',
        corps: `  <p>Quand tu choisis un son dans la bibliothèque de TikTok, Instagram ou YouTube, tu utilises un catalogue que la plateforme a négocié. C'est la voie sûre, et elle a un bénéfice secondaire souvent sous-estimé : un son tendance est un <strong>axe de découverte</strong> à part entière, puisque les gens parcourent les vidéos qui l'utilisent.</p>
  <p>Deux réserves tout de même :</p>
  <ul>
    <li><strong>Les catalogues diffèrent entre comptes personnels et comptes professionnels.</strong> Un son disponible sur un compte perso peut être indisponible sur un compte pro, et c'est une mauvaise surprise classique au moment de publier.</li>
    <li><strong>Un son peut être retiré après coup.</strong> La vidéo reste, le son disparaît. Sur un clip dont l'intérêt reposait sur la musique, il ne reste rien.</li>
  </ul>
  <p>Conséquence pratique pour un clippeur : le son ajouté doit rester un <strong>accompagnement</strong>, jamais le contenu. Ce qui porte le clip, c'est la parole et le sous-titre.</p>`,
      },
      {
        titre: 'Cas 2 — la musique incrustée au montage',
        corps: `  <p>Ajouter une piste musicale dans ton logiciel avant d'envoyer le fichier revient à livrer un enregistrement que la plateforme ne reconnaît pas comme venant de son catalogue. Elle passe alors par la détection automatique, et les issues possibles sont :</p>
  <ul>
    <li>rien du tout — beaucoup de morceaux ne sont pas détectés ;</li>
    <li>le <strong>son coupé</strong> sur tout ou partie de la vidéo, ce qui laisse un clip muet ;</li>
    <li>la <strong>vidéo bloquée</strong> dans certains pays ;</li>
    <li>la <strong>monétisation redirigée</strong> vers l'ayant droit.</li>
  </ul>
  <p>Le problème n'est pas tant la sanction que l'<strong>imprévisibilité</strong> : le même morceau peut passer sur une plateforme et être bloqué sur une autre, ou passer aujourd'hui et être détecté dans trois mois. Pour quelqu'un qui publie en volume, c'est ingérable.</p>
  <p>Si tu veux vraiment incruster, utilise de la musique <strong>explicitement libre de droits</strong> avec sa licence conservée quelque part. « Trouvé sur YouTube » n'est pas une licence.</p>`,
      },
      {
        titre: 'Cas 3 — la musique déjà dans la source',
        corps: `  <p>C'est le cas propre au clipping, et le plus sournois, parce que tu ne l'as pas choisi. Un stream avec de la musique de fond, un podcast avec un générique, une vidéo avec un extrait sonore : tout ça voyage avec ton extrait.</p>
  <p>Deux réflexes qui évitent l'essentiel des ennuis :</p>
  <ol>
    <li><strong>Écouter le clip avant de publier</strong>, pas seulement le regarder. Un générique de dix secondes au début d'un extrait suffit à faire bloquer la vidéo entière.</li>
    <li><strong>Décaler les bornes</strong> quand un passage musical tombe dedans. Commencer deux secondes plus tard règle le problème dans la majorité des cas, et ne coûte rien au clip.</li>
  </ol>
  <p>C'est aussi une bonne raison de demander la source au créateur plutôt que de récupérer une version déjà diffusée : on obtient parfois une piste sans musique de fond. Voir <a href="/blog/clipper-pour-un-streamer.html">clipper pour un streamer</a>.</p>`,
      },
      {
        titre: 'Le cas des campagnes rémunérées',
        corps: `  <p>Dans une campagne, le brief tranche, et il prime sur tout le reste. Il précise généralement si une musique est imposée, autorisée ou interdite.</p>
  <p>Deux conséquences concrètes :</p>
  <ul>
    <li>un clip dont la musique viole le brief <strong>n'est pas payé</strong>, même s'il performe ;</li>
    <li>un clip bloqué pour raison musicale ne génère <strong>aucune vue vérifiée</strong>, donc aucun revenu — le travail est entièrement perdu.</li>
  </ul>
  <p>Voir <a href="/blog/campagnes-clipping-remunerees.html">comment marche une campagne de clipping rémunérée</a>.</p>`,
      },
      {
        titre: 'La règle simple, pour publier en volume',
        corps: `  <p>Quand on sort des dizaines de clips par semaine, on n'a pas le temps de statuer au cas par cas. Une règle unique suffit :</p>
  <p><strong>Pas de musique incrustée. Le son du clip, c'est la voix de la source. Si un son est nécessaire, il s'ajoute depuis la bibliothèque de l'application, au moment de publier.</strong></p>
  <p>C'est aussi ce qui marche le mieux : sur du format court regardé son coupé, ce sont les sous-titres et le rythme qui portent le clip, pas la bande-son. Voir <a href="/blog/generer-sous-titres-automatiques.html">générer des sous-titres automatiques</a> et <a href="/blog/ameliorer-retention-short.html">améliorer la rétention d'un Short</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Peut-on mettre n'importe quelle musique sur un clip ?",
        r: "Non, et tout dépend de la provenance. La musique choisie dans la bibliothèque de l'application est couverte par l'accord entre la plateforme et les ayants droit. Une musique incrustée au montage avant l'envoi ne l'est pas : la plateforme la traite comme un fichier audio quelconque et peut couper le son ou bloquer la vidéo.",
      },
      {
        q: "Que risque-t-on avec une musique incrustée au montage ?",
        r: "Selon la détection : rien, le son coupé sur tout ou partie de la vidéo, un blocage dans certains pays, ou la monétisation redirigée vers l'ayant droit. Le vrai problème est l'imprévisibilité — le même morceau peut passer sur une plateforme, être bloqué sur une autre, ou être détecté des mois plus tard.",
      },
      {
        q: "Que faire de la musique déjà présente dans la vidéo source ?",
        r: "L'écouter avant de publier, pas seulement regarder le clip : un générique de dix secondes suffit à faire bloquer la vidéo entière. Quand un passage musical tombe dans les bornes, les décaler de deux secondes règle le problème la plupart du temps sans rien coûter au clip.",
      },
      {
        q: "Un son tendance aide-t-il à être vu ?",
        r: "Oui, c'est un axe de découverte à part entière puisque les gens parcourent les vidéos qui l'utilisent. Mais il doit rester un accompagnement : un son peut être retiré après coup, et il ne reste alors rien d'un clip dont l'intérêt reposait sur la musique.",
      },
      {
        q: "Quelle règle adopter quand on publie beaucoup ?",
        r: "Pas de musique incrustée : le son du clip est la voix de la source, et si un son est nécessaire il s'ajoute depuis la bibliothèque de l'application au moment de publier. C'est aussi ce qui fonctionne le mieux, puisque sur du format court regardé son coupé ce sont les sous-titres et le rythme qui portent le clip.",
      },
    ],
    cta: { titre: 'Le son du clip, c’est la parole — le reste est accessoire', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'image-couverture-clip',
    tag: 'Publication',
    title: 'L’image de couverture d’un clip : à quoi elle sert vraiment',
    h1: 'L’image de couverture d’un clip : à quoi elle sert vraiment',
    description:
      "La couverture ne fait presque rien dans le fil, et presque tout sur ton profil. Ce que ça change dans la façon de la choisir, et l'erreur de cadrage classique.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 5,
    reponse:
      "L'image de couverture d'un clip ne sert <strong>presque à rien dans le fil</strong> — la vidéo s'y lance toute seule, personne ne voit la couverture. Elle sert <strong>presque à tout sur ton profil</strong>, où elle devient une vignette dans une grille que les visiteurs parcourent des yeux. Deux usages opposés qui imposent une seule règle : choisis la couverture pour la <strong>grille</strong>, pas pour le fil. Et attention au piège de cadrage — la grille rogne l'image, souvent là où tu as mis ton texte.",
    sections: [
      {
        titre: 'Pourquoi elle ne compte pas dans le fil',
        corps: `  <p>Sur TikTok, Reels et Shorts, la vidéo démarre immédiatement quand elle arrive à l'écran. La couverture n'est affichée qu'une fraction de seconde, parfois pas du tout.</p>
  <p>C'est ce qui distingue radicalement le format court de YouTube en format long, où la miniature est le premier facteur de clic. En vertical, ce rôle est tenu par les <strong>trois premières secondes de la vidéo</strong> — c'est là qu'il faut investir. Voir <a href="/blog/hook-3-secondes.html">le hook de 3 secondes</a>.</p>
  <p>Conclusion : passer vingt minutes sur une couverture pour gagner des vues dans le fil, c'est du temps perdu. Mieux vaut le mettre dans le choix de l'extrait.</p>`,
      },
      {
        titre: 'Pourquoi elle compte énormément sur le profil',
        corps: `  <p>Quand quelqu'un découvre un clip et veut en voir plus, il ouvre ton profil. Il y trouve une grille de vignettes, et ces vignettes <strong>sont</strong> les couvertures.</p>
  <p>C'est le moment où se décide s'il regarde une deuxième vidéo, puis une troisième, puis s'il s'abonne. Pour un clippeur, c'est aussi ce que voit un streamer ou une marque qui évalue ton travail avant de te confier une campagne.</p>
  <p>Ce qui marche dans une grille :</p>
  <ul>
    <li><strong>Un visage, grand et expressif.</strong> Rien n'attire l'œil comme un visage en réaction.</li>
    <li><strong>Un texte court</strong> — trois à cinq mots maximum. Une vignette fait quelques centimètres de haut : une phrase y est illisible.</li>
    <li><strong>Une cohérence d'ensemble.</strong> Une grille où les vignettes se ressemblent donne l'impression d'un compte tenu ; une grille disparate donne l'impression d'un compte abandonné.</li>
  </ul>`,
      },
      {
        titre: 'Le piège de cadrage que tout le monde rate',
        corps: `  <p>Voici l'erreur la plus fréquente, et elle est purement géométrique.</p>
  <p>Ton clip est vertical, au format 9:16. La grille de profil, elle, affiche des vignettes proches du carré ou du 3:4 — donc <strong>elle rogne le haut et le bas de ton image</strong>.</p>
  <p>Résultat : le texte que tu as soigneusement placé en haut de la couverture est coupé dans la grille. Ce qui était lisible à la conception ne l'est plus là où ça compte.</p>
  <p><strong>La règle : tout ce qui doit rester lisible va dans le tiers central de l'image.</strong> Les bords haut et bas sont une zone de sacrifice — n'y mets rien d'indispensable.</p>
  <p>C'est le même raisonnement que pour les sous-titres, qu'il ne faut jamais coller trop bas sous peine de les voir passer derrière l'interface. Voir <a href="/blog/sous-titres-automatiques-shorts.html">les sous-titres automatiques pour Shorts</a>.</p>`,
      },
      {
        titre: 'Comment la choisir en dix secondes',
        corps: `  <ol>
    <li><strong>Prends une image du clip lui-même</strong> plutôt que de fabriquer un visuel. Elle est cohérente avec le contenu, et l'écart entre la couverture et la vidéo est ce qui fait fuir les gens.</li>
    <li><strong>Cherche le pic d'expression</strong> — le moment où le visage réagit le plus fort. C'est presque toujours la meilleure image du clip.</li>
    <li><strong>Évite le premier plan du clip</strong> : c'est souvent un visage neutre, en installation.</li>
    <li><strong>Vérifie dans la grille</strong>, pas en plein écran. C'est le seul endroit où ta couverture sera réellement regardée.</li>
  </ol>
  <p>Pour un clippeur qui publie en volume, prendre une image du clip est aussi le seul choix tenable : fabriquer trente visuels par jour n'a aucun sens économique. Voir <a href="/blog/combien-de-clips-par-jour.html">combien de clips par jour</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "L'image de couverture influence-t-elle les vues d'un clip ?",
        r: "Très peu dans le fil, où la vidéo démarre immédiatement et où la couverture n'est visible qu'une fraction de seconde. Ce sont les trois premières secondes de la vidéo qui tiennent ce rôle en format vertical, contrairement à YouTube en format long où la miniature décide du clic.",
      },
      {
        q: "À quoi sert alors la couverture ?",
        r: "À la grille de ton profil. Quand quelqu'un découvre un clip et veut en voir plus, il ouvre ton profil et parcourt des vignettes — qui sont les couvertures. C'est là que se décide s'il regarde une deuxième vidéo et s'il s'abonne, et c'est aussi ce que regarde un client potentiel.",
      },
      {
        q: "Pourquoi mon texte de couverture est-il coupé ?",
        r: "Parce que le clip est au format 9:16 alors que la grille de profil affiche des vignettes proches du carré : elle rogne le haut et le bas. Tout ce qui doit rester lisible doit tenir dans le tiers central de l'image.",
      },
      {
        q: "Faut-il fabriquer un visuel ou prendre une image du clip ?",
        r: "Prendre une image du clip, dans la quasi-totalité des cas. Elle est cohérente avec le contenu — et l'écart entre la couverture et la vidéo est ce qui fait fuir les spectateurs. Pour quelqu'un qui publie en volume, fabriquer des visuels n'a de toute façon aucun sens économique.",
      },
      {
        q: "Quelle image du clip choisir ?",
        r: "Le pic d'expression, le moment où le visage réagit le plus fort — c'est presque toujours la meilleure image. Évite le tout premier plan, généralement un visage neutre en phase d'installation.",
      },
    ],
    cta: { titre: 'Une grille cohérente, sans fabriquer trente visuels', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'analyser-performance-clips',
    tag: 'Publication',
    title: 'Analyser la performance de ses clips : les 3 chiffres utiles',
    h1: 'Analyser ses clips : les 3 chiffres qui servent vraiment',
    description:
      "Les vues ne disent rien d'exploitable. Le taux de complétion, la courbe de rétention et le rapport partages/vues disent quoi corriger, et à quel endroit du clip.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 6,
    reponse:
      "Le nombre de vues est la statistique la moins utile qui soit : il te dit qu'un clip a marché, jamais <strong>pourquoi</strong>, donc il ne t'apprend rien de reproductible. Trois chiffres, eux, sont directement actionnables : le <strong>taux de complétion</strong> (le clip est-il trop long ?), la <strong>courbe de rétention</strong> (à quelle seconde exacte ils partent) et le <strong>rapport partages sur vues</strong> (le clip a-t-il une valeur sociale ?). Chacun pointe vers une correction précise, au lieu d'une satisfaction ou d'une déception.",
    sections: [
      {
        titre: 'Pourquoi les vues ne t’apprennent rien',
        corps: `  <p>Deux clips à 50 000 vues peuvent être des objets totalement différents : l'un a été montré à 60 000 personnes qui l'ont presque toutes regardé, l'autre à 500 000 personnes qui l'ont presque toutes ignoré. Le second est un échec déguisé en succès, et si tu en tires des leçons, tu reproduiras l'échec.</p>
  <p>Le nombre de vues est un <strong>résultat</strong>, pas un diagnostic. Il arrive en bout de chaîne et agrège tout : la distribution, le hook, le montage, le sujet, l'heure de publication, la chance. Impossible d'en isoler quoi que ce soit.</p>
  <p>Les trois chiffres qui suivent, eux, isolent chacun un problème précis.</p>`,
      },
      {
        titre: '1. Le taux de complétion — le clip est-il trop long ?',
        corps: `  <p>La proportion de spectateurs qui vont jusqu'au bout. C'est le signal le plus fortement corrélé à la distribution sur tous les formats courts : une plateforme qui voit les gens regarder en entier montre la vidéo à plus de monde.</p>
  <p>Ce qu'il te dit, concrètement :</p>
  <ul>
    <li><strong>Complétion faible, rétention correcte au début</strong> → le clip est trop long. Coupe la fin, presque toujours du délayage après la chute.</li>
    <li><strong>Complétion élevée</strong> → tu peux te permettre plus long sur ce type de sujet. C'est une autorisation, pas une obligation.</li>
  </ul>
  <p>C'est aussi le seul argument sérieux en faveur des clips courts : un clip de 25 secondes a structurellement une meilleure complétion qu'un clip de 90. Voir <a href="/blog/ameliorer-retention-short.html">améliorer la rétention d'un Short</a>.</p>`,
      },
      {
        titre: '2. La courbe de rétention — à quelle seconde ils partent',
        corps: `  <p>C'est le chiffre le plus riche, et le moins regardé. Il ne te dit pas seulement <em>combien</em> partent, mais <strong>quand</strong> — et le « quand » désigne directement le défaut.</p>
  <ul>
    <li><strong>Chute dans les 2 premières secondes</strong> → problème de hook. Le clip commence trop tôt, sur une mise en place plutôt que sur le contenu. Décale les bornes. Voir <a href="/blog/hook-3-secondes.html">le hook de 3 secondes</a>.</li>
    <li><strong>Chute vers 5-10 secondes</strong> → le hook a tenu mais la promesse n'est pas honorée. Le début annonce quelque chose que la suite ne donne pas.</li>
    <li><strong>Chute progressive régulière</strong> → c'est normal, c'est la respiration naturelle de l'audience. Rien à corriger.</li>
    <li><strong>Chute brutale en milieu de clip</strong> → il y a un trou : un silence, une digression, un changement de sujet. Coupe à cet endroit précis.</li>
  </ul>
  <p>Un seul clip analysé sérieusement de cette façon t'apprend plus que cinquante clips jugés aux vues.</p>`,
      },
      {
        titre: '3. Partages sur vues — le clip a-t-il une valeur sociale ?',
        corps: `  <p>Le partage est le seul geste qui coûte quelque chose au spectateur : il engage son image auprès de quelqu'un d'autre. Un like est gratuit, un partage non.</p>
  <p>C'est donc le meilleur indicateur de la <strong>valeur intrinsèque</strong> du clip, et celui qui prédit le mieux la reproductibilité. Un clip très partagé a trouvé quelque chose ; un clip très vu mais peu partagé a surtout été bien distribué.</p>
  <p>À regarder en rapport, jamais en absolu : compare le taux de partage entre tes propres clips, et cherche ce que les trois meilleurs ont en commun. C'est souvent une caractéristique nette — un type d'extrait, un format de hook, un sujet.</p>`,
      },
      {
        titre: 'Le rythme d’analyse qui fonctionne',
        corps: `  <ol>
    <li><strong>N'analyse jamais un clip isolé.</strong> La variance est énorme sur les formats courts ; un clip seul ne prouve rien, ni dans un sens ni dans l'autre.</li>
    <li><strong>Attends au moins vingt clips</strong> avant de tirer la moindre conclusion. En dessous, tu lis du bruit.</li>
    <li><strong>Compare les cinq meilleurs aux cinq pires</strong> sur la complétion, pas sur les vues. La différence saute presque toujours aux yeux.</li>
    <li><strong>Change une chose à la fois.</strong> Si tu modifies la durée, le style de sous-titres et le type d'extrait en même temps, tu ne sauras jamais ce qui a joué.</li>
  </ol>
  <p>Et si tu clipes pour des campagnes rémunérées, garde en tête que ces chiffres et ceux de la campagne ne mesurent pas la même chose — voir <a href="/blog/combien-paye-1000-vues-clipping.html">combien paye 1 000 vues en clipping</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Quelle statistique regarder en priorité sur un clip ?",
        r: "Le taux de complétion, c'est-à-dire la proportion de spectateurs qui vont jusqu'au bout. C'est le signal le plus fortement corrélé à la distribution : une plateforme qui voit les gens regarder en entier montre la vidéo à plus de monde.",
      },
      {
        q: "Pourquoi le nombre de vues est-il une mauvaise mesure ?",
        r: "Parce qu'il agrège tout — distribution, hook, montage, sujet, heure, chance — sans rien isoler. Deux clips à 50 000 vues peuvent être des objets opposés : l'un montré à 60 000 personnes qui l'ont regardé, l'autre à 500 000 qui l'ont ignoré. Le second est un échec déguisé en succès.",
      },
      {
        q: "Que signifie une chute de rétention dans les deux premières secondes ?",
        r: "Un problème de hook : le clip commence trop tôt, sur une mise en place au lieu du contenu. La correction est de décaler les bornes de départ. Une chute vers 5-10 secondes signale autre chose — le hook a tenu mais la promesse du début n'est pas honorée.",
      },
      {
        q: "Pourquoi le taux de partage est-il un bon indicateur ?",
        r: "Parce que le partage est le seul geste qui coûte quelque chose au spectateur : il engage son image auprès de quelqu'un d'autre, alors qu'un like est gratuit. C'est donc le meilleur signal de la valeur intrinsèque du clip, et celui qui prédit le mieux ce qui est reproductible.",
      },
      {
        q: "À partir de combien de clips peut-on tirer des conclusions ?",
        r: "Une vingtaine au minimum. La variance est énorme sur les formats courts : en dessous, on lit du bruit. Compare ensuite les cinq meilleurs aux cinq pires sur la complétion plutôt que sur les vues, et ne change qu'une variable à la fois.",
      },
    ],
    cta: { titre: 'Produis assez de clips pour que les chiffres veuillent dire quelque chose', bouton: 'Essayer Créatis gratuitement' },
  },
];
