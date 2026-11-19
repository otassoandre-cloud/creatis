/**
 * Cluster « gaming / streaming » — lot 3.
 *
 * Aligné sur la 1re niche des inscrits : sur 186 utilisateurs ayant renseigné leur
 * niche au 08/09/2026, « gaming » arrive en tête (19). Aucune page du site ne s'y
 * adressait directement — clips-twitch.html couvre la plateforme, pas l'usage.
 *
 * Positionnement honnête tenu partout : Créatis lit la PAROLE, pas les événements
 * de jeu. Sur du gameplay muet, les outils gaming spécialisés sont meilleurs et
 * on le dit.
 */

module.exports = [
  {
    slug: 'clips-stream-gaming',
    tag: 'Gaming',
    title: 'Faire des clips depuis un stream gaming : la méthode',
    h1: 'Faire des clips depuis un stream gaming',
    description:
      "Six heures de stream donnent rarement six heures de contenu clipable. Comment repérer, découper et verticaliser les bons moments d'un stream gaming.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 7,
    reponse:
      "Un stream gaming se clipe à partir de <strong>deux signaux différents</strong>, et confondre les deux est l'erreur qui coûte le plus de temps : les <strong>événements de jeu</strong> (un kill, une victoire, un crash) se repèrent dans l'image, tandis que les <strong>réactions du streamer</strong> se repèrent dans la parole. La très grande majorité des clips qui tournent relèvent du second — ce n'est pas l'action qui fait le clip, c'est ce que le streamer en dit. Choisis ton outil en fonction du signal que tu exploites, pas de la plateforme.",
    sections: [
      {
        titre: 'Les deux signaux, et pourquoi ça change tout',
        corps: `  <h3>Le signal « jeu »</h3>
  <p>Un kill, un clutch, une victoire, un bug spectaculaire. Ça se détecte dans l'image ou dans les données du jeu : tableau de score, animation de mort, indicateur de victoire. C'est le terrain d'outils gaming spécialisés comme Eklipse, construits pour reconnaître ces événements automatiquement.</p>
  <h3>Le signal « parole »</h3>
  <p>Le cri, le fou rire, l'explication, l'engueulade, la punchline, le moment de gêne. Ça se détecte dans ce qui est dit — donc dans la transcription. C'est ce que fait Créatis.</p>
  <p>Regarde honnêtement les clips gaming qui dépassent le million de vues : la plupart ne montrent pas une action exceptionnelle. Ils montrent <strong>quelqu'un qui réagit</strong>. Un headshot sans commentaire est un highlight ; un headshot avec un « MAIS C'EST PAS POSSIBLE » est un clip. Le second se partage, pas le premier.</p>
  <p>Conséquence pratique : si ton streamer parle par-dessus son jeu — ce qui est le cas de l'écrasante majorité — la parole est ton meilleur signal, et de loin.</p>`,
      },
      {
        titre: 'Le problème du cadrage, plus sévère en gaming qu\'ailleurs',
        corps: `  <p>Un stream gaming a une composition particulière : le jeu occupe l'écran, la webcam du streamer est dans un coin, l'overlay et le chat mangent les bords. Quand tu passes ça en 9:16, tu ne gardes que <strong>607 pixels de large sur 1920</strong>, soit moins d'un tiers de l'image.</p>
  <p>Trois options, et elles ne se valent pas :</p>
  <ul>
    <li><strong>Centrer sur le jeu</strong> — tu perds le visage, donc l'émotion, donc l'essentiel du clip.</li>
    <li><strong>Centrer sur la webcam</strong> — tu gardes la réaction mais on ne voit plus ce qui la provoque.</li>
    <li><strong>Composer les deux</strong> — visage en haut, jeu en bas, ou suivi automatique qui bascule selon qui parle. C'est ce qui marche, et c'est aussi le plus long à faire à la main.</li>
  </ul>
  <p>Le détail du calcul et des cas où le cadrage automatique se trompe est dans <a href="/blog/pourquoi-ton-crop-9-16-est-rate.html">pourquoi ton crop 9:16 est raté</a>.</p>`,
      },
      {
        titre: 'Le rythme : ce qui distingue un clip gaming d\'un clip podcast',
        corps: `  <p>Un extrait de podcast supporte trois secondes d'installation. Un clip gaming, non : le spectateur arrive au milieu d'une action qu'il ne comprend pas, sur un jeu qu'il ne connaît peut-être pas.</p>
  <p>D'où trois règles propres au gaming :</p>
  <ol>
    <li><strong>Commencer juste avant la réaction</strong>, pas avant l'action. Une seconde de contexte suffit ; le reste se comprend par le cri.</li>
    <li><strong>Couper dès que la réaction retombe.</strong> Un clip gaming qui traîne cinq secondes après le pic perd tout son effet.</li>
    <li><strong>Sous-titrer, toujours.</strong> Un cri sans texte est inaudible son coupé, et l'essentiel des vues courtes se fait son coupé. Voir <a href="/blog/generer-sous-titres-automatiques.html">générer des sous-titres automatiques</a>.</li>
  </ol>
  <p>Sur la construction des trois premières secondes, voir <a href="/blog/hook-3-secondes.html">le hook de 3 secondes</a>.</p>`,
      },
      {
        titre: 'Quelle source utiliser',
        corps: `  <p>Par ordre de confort de travail :</p>
  <ul>
    <li><strong>Le VOD complet</strong> — le meilleur matériau : qualité maximale, pas de recompression, et tu choisis toi-même les bornes.</li>
    <li><strong>Le rediff YouTube du stream</strong> — pratique et souvent suffisant, attention seulement à la qualité servie : un clip découpé dans une source basse définition restera en basse définition, quoi que tu fasses ensuite.</li>
    <li><strong>Les clips natifs de la plateforme</strong> — déjà bornés par quelqu'un d'autre, donc peu de liberté de montage, mais utiles pour démarrer.</li>
  </ul>
  <p>Pour Twitch spécifiquement, voir <a href="/clips-twitch.html">faire des clips depuis un stream Twitch</a>. Pour Kick, voir <a href="/blog/clips-depuis-kick.html">clipper un stream Kick</a>.</p>`,
      },
      {
        titre: 'Si tu clipes pour être payé',
        corps: `  <p>Le gaming est le terrain le plus actif des campagnes de clipping rémunérées, et la fenêtre la plus chargée des prochains mois est datée : <a href="/blog/clipper-gta-6.html">GTA 6 sort le 19 novembre 2026</a>.</p>
  <p>Trois lectures pour la partie économique : <a href="/blog/campagnes-clipping-remunerees.html">comment marche une campagne</a>, <a href="/blog/plateformes-clipping-france.html">quelles plateformes existent en France</a>, et <a href="/blog/combien-de-clips-par-jour.html">combien de clips tu dois sortir par jour</a> pour que le modèle joue en ta faveur.</p>`,
      },
    ],
    faq: [
      {
        q: "Comment repérer les bons moments dans un stream de six heures ?",
        r: "En choisissant le bon signal. Les événements de jeu (kill, victoire) se repèrent dans l'image et relèvent d'outils gaming spécialisés. Les réactions du streamer se repèrent dans la parole, via la transcription — et c'est de là que vient la grande majorité des clips qui tournent réellement.",
      },
      {
        q: "Faut-il garder la webcam du streamer dans le clip ?",
        r: "Presque toujours, oui. Ce n'est pas l'action qui fait le clip, c'est la réaction : un exploit sans visage est un highlight, un exploit avec un visage qui réagit est un clip partageable. La meilleure composition verticale garde les deux, visage et jeu.",
      },
      {
        q: "Où doit commencer un clip gaming ?",
        r: "Juste avant la réaction, pas avant l'action. Une seconde de contexte suffit — le reste se comprend par le cri ou le commentaire. Et il faut couper dès que la réaction retombe : un clip qui traîne après le pic perd son effet.",
      },
      {
        q: "Créatis détecte-t-il les kills et les victoires ?",
        r: "Non. Créatis analyse ce qui est dit, pas les pixels du jeu. Pour de la détection d'événements purement en jeu, des outils gaming spécialisés comme Eklipse sont plus adaptés. Sur du stream commenté, où le streamer parle par-dessus son jeu, la parole est le meilleur signal disponible.",
      },
      {
        q: "Quelle source utiliser pour cliper un stream ?",
        r: "Le VOD complet quand c'est possible : qualité maximale, pas de recompression, et tu choisis toi-même les bornes. La rediffusion YouTube fonctionne aussi, à condition de vérifier la définition servie — un clip découpé dans une source basse définition le restera.",
      },
    ],
    cta: { titre: 'Six heures de stream, une série de clips prêts à publier', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'clips-depuis-kick',
    tag: 'Gaming',
    title: 'Clipper un stream Kick : ce qui change par rapport à Twitch',
    h1: 'Clipper un stream Kick',
    description:
      "Kick a ses propres règles de rediffusion et de clips. Ce qui change concrètement pour un clippeur, et comment produire du vertical depuis un stream Kick.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 6,
    reponse:
      "Clipper un stream <strong>Kick</strong> obéit à la même logique que Twitch — repérer une réaction, couper court, verticaliser, sous-titrer — avec deux différences pratiques : la <strong>disponibilité des rediffusions</strong>, qui dépend des réglages de chaque streamer, et un écosystème d'outils tiers <strong>beaucoup moins fourni</strong>. Le réflexe qui règle 90 % des cas : travailler à partir du VOD quand il est public, et demander la source directement au streamer quand il ne l'est pas.",
    sections: [
      {
        titre: 'Ce qui est identique à Twitch',
        corps: `  <p>L'essentiel, en fait. Kick est une plateforme de stream en direct avec chat, VOD et clips natifs — le matériau est de même nature. Ce qui vaut pour un stream vaut donc ici :</p>
  <ul>
    <li>le clip naît d'une <strong>réaction</strong>, pas d'une action ;</li>
    <li>le cadrage vertical impose de choisir entre le jeu, le visage ou une composition des deux ;</li>
    <li>les sous-titres ne sont pas optionnels, l'essentiel des vues courtes se faisant son coupé.</li>
  </ul>
  <p>Toute la méthode est dans <a href="/blog/clips-stream-gaming.html">faire des clips depuis un stream gaming</a>. Cette page ne traite que des écarts.</p>`,
      },
      {
        titre: 'Ce qui change vraiment',
        corps: `  <h3>La disponibilité des rediffusions</h3>
  <p>Sur Kick, la conservation et la visibilité des VOD dépendent des réglages du streamer. Certains laissent tout en ligne, d'autres non. Pour un clippeur, ça veut dire une chose : <strong>vérifie la disponibilité de la source avant de prévoir ton travail</strong>, pas après. Un stream repéré le soir peut ne plus être accessible le lendemain.</p>
  <h3>Un écosystème d'outils plus pauvre</h3>
  <p>Twitch bénéficie de dix ans d'outils tiers. Kick, non. En pratique, la chaîne de production passe souvent par un fichier : tu récupères la vidéo, tu la traites, tu publies. C'est moins confortable, mais ça a un avantage — tu travailles sur la source brute plutôt que sur un clip déjà recompressé par la plateforme, et la qualité finale est meilleure.</p>
  <h3>Une audience plus jeune sur la plateforme, pas sur tes clips</h3>
  <p>La composition de l'audience de Kick n'a aucune importance pour toi : tes clips ne sont pas publiés sur Kick, ils sont publiés sur TikTok, Reels et Shorts. C'est la source qui est sur Kick, pas la diffusion.</p>`,
      },
      {
        titre: 'La question de l\'autorisation',
        corps: `  <p>Elle se pose exactement comme ailleurs, et elle est plus simple qu'on ne croit : <strong>la plupart des streamers encouragent le clipping de leur contenu</strong>, parce que ça leur amène de l'audience. Beaucoup l'indiquent dans leur description ou leur Discord.</p>
  <p>Le réflexe utile : demander. Un message poli qui explique ce que tu veux faire et où tu publieras reçoit un oui bien plus souvent qu'un non. Et une autorisation explicite te protège si la question se pose plus tard, notamment dans le cadre d'une campagne rémunérée.</p>
  <p>Si le streamer est partant, demande-lui aussi <strong>le fichier source</strong> plutôt que de récupérer une version recompressée : c'est le meilleur gain de qualité disponible, et il ne coûte rien.</p>`,
      },
      {
        titre: 'La chaîne de production, concrètement',
        corps: `  <ol>
    <li><strong>Récupérer la source</strong> — VOD public, ou fichier fourni par le streamer.</li>
    <li><strong>Repérer les réactions</strong> — via la transcription plutôt qu'en regardant six heures. Voir <a href="/blog/detecter-moments-viraux.html">détecter les moments viraux</a>.</li>
    <li><strong>Découper court</strong> — commencer juste avant la réaction, couper dès qu'elle retombe.</li>
    <li><strong>Verticaliser</strong> avec suivi du visage. Voir <a href="/blog/recadrer-video-9-16-outil.html">recadrer une vidéo en 9:16</a>.</li>
    <li><strong>Sous-titrer et publier</strong> sur TikTok, Reels et Shorts.</li>
  </ol>
  <p>Si tu fais ça pour être payé, la partie économique est dans <a href="/blog/campagnes-clipping-remunerees.html">comment marche une campagne de clipping rémunérée</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Peut-on récupérer les rediffusions d'un stream Kick ?",
        r: "Cela dépend des réglages du streamer : certains laissent leurs VOD en ligne et publiques, d'autres non. Pour un clippeur, le réflexe est de vérifier la disponibilité de la source avant de planifier le travail — un stream repéré le soir peut ne plus être accessible le lendemain.",
      },
      {
        q: "Faut-il l'autorisation du streamer pour cliper son contenu ?",
        r: "C'est la bonne pratique, et c'est souvent accordé : la plupart des streamers encouragent le clipping parce que ça leur amène de l'audience, et beaucoup l'indiquent dans leur description ou leur Discord. Une autorisation explicite protège aussi dans le cadre d'une campagne rémunérée.",
      },
      {
        q: "Clipper depuis Kick est-il différent de Twitch ?",
        r: "La méthode est identique — repérer une réaction, couper court, verticaliser, sous-titrer. Les deux écarts pratiques sont la disponibilité des rediffusions, qui dépend du streamer, et un écosystème d'outils tiers nettement moins fourni que sur Twitch.",
      },
      {
        q: "Faut-il publier les clips sur Kick ?",
        r: "Non. Les clips se publient sur TikTok, Instagram Reels et YouTube Shorts — c'est là que se trouve la distribution des formats courts. Kick n'est que la source du contenu.",
      },
      {
        q: "Comment obtenir la meilleure qualité depuis un stream Kick ?",
        r: "En travaillant sur le fichier source plutôt que sur une version déjà recompressée par la plateforme. Si le streamer est d'accord pour que tu le clipes, demande-lui directement son fichier : c'est le meilleur gain de qualité disponible et il ne coûte rien.",
      },
    ],
    cta: { titre: 'Transforme un stream Kick en série de verticales', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'clipper-pour-un-streamer',
    tag: 'Clipping',
    title: 'Clipper pour un streamer : décrocher son premier client',
    h1: 'Clipper pour un streamer : décrocher son premier client',
    description:
      "Comment aborder un streamer, quoi lui proposer, comment fixer un prix et sur quoi s'engager quand on veut cliper son contenu contre rémunération.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 7,
    reponse:
      "Un streamer n'achète pas des clips, il achète du <strong>temps qu'il n'a pas</strong> et une présence sur des plateformes où il n'est pas. La seule approche qui fonctionne est donc de ne rien demander au premier contact : tu envoies <strong>deux ou trois clips déjà faits</strong> sur son contenu, publiés ou non, et tu le laisses juger. Un message qui dit « je peux faire des clips pour toi » est ignoré ; un message qui montre trois clips finis obtient une réponse.",
    sections: [
      {
        titre: 'Pourquoi le message classique ne marche jamais',
        corps: `  <p>Un streamer un peu installé reçoit ces messages toutes les semaines. « Bonjour, je suis clippeur, je peux travailler pour toi, voici mes tarifs. » Il ne peut rien en faire : il ne sait pas si tu sais choisir un extrait, si tu sais cadrer, si tu vas tenir le rythme.</p>
  <p>Inverse la charge de la preuve. Tu prends une de ses rediffusions, tu en tires trois clips, et tu les lui envoies. En trente secondes il sait tout ce qu'il a besoin de savoir, et la conversation démarre sur son contenu plutôt que sur toi.</p>
  <p>Cette approche a un coût — deux heures de travail non payé — et c'est précisément pour ça qu'il faut pouvoir produire vite. Voir <a href="/blog/combien-de-clips-par-jour.html">combien de clips par jour</a>.</p>`,
      },
      {
        titre: 'Qui cibler',
        corps: `  <p>Le réflexe de tout le monde est de viser le plus gros streamer possible. C'est le pire choix : il a déjà une équipe, et ta proposition se noie.</p>
  <p>Vise plutôt ceux qui remplissent ces trois conditions :</p>
  <ul>
    <li><strong>Il stream beaucoup</strong> — plusieurs heures par semaine, donc de la matière.</li>
    <li><strong>Il publie peu ou mal en format court</strong> — compte TikTok vide, ou abandonné, ou clips verticaux mal cadrés. C'est le signe qu'il y a un besoin et pas de réponse.</li>
    <li><strong>Il est assez installé pour avoir un budget</strong>, mais pas assez pour avoir déjà une équipe. C'est une fenêtre étroite, et c'est là que tout se joue.</li>
  </ul>
  <p>Un streamer qui coche les trois vaut cinquante prospects pris au hasard.</p>`,
      },
      {
        titre: 'Quoi proposer, et comment le facturer',
        corps: `  <p>Trois modèles existent, avec des risques différents :</p>
  <ul>
    <li><strong>Au clip.</strong> Simple, lisible, sans surprise pour personne. C'est le bon modèle pour démarrer.</li>
    <li><strong>Au forfait mensuel</strong> — un nombre de clips par mois pour un montant fixe. Plus confortable des deux côtés une fois la confiance installée, et c'est vers ça qu'il faut aller.</li>
    <li><strong>À la performance</strong>, indexé sur les vues. Attractif sur le papier, risqué en pratique : tu ne contrôles pas la distribution, et un mois creux ne paie pas ton loyer. À réserver aux campagnes structurées — voir <a href="/blog/campagnes-clipping-remunerees.html">comment marche une campagne de clipping rémunérée</a>.</li>
  </ul>
  <p>Sur les niveaux de rémunération observés et ce qui les fait varier, voir <a href="/blog/combien-gagne-clippeur.html">combien gagne un clippeur</a>.</p>`,
      },
      {
        titre: 'Les trois points à écrire noir sur blanc',
        corps: `  <ol>
    <li><strong>Qui publie.</strong> Sur ses comptes ou sur les tiens ? Les deux marchent, mais ça change tout : la propriété de l'audience, la mesure du résultat, et ce qui se passe si vous arrêtez de travailler ensemble.</li>
    <li><strong>Ce que tu as le droit d'utiliser.</strong> Une autorisation explicite sur le contenu source, écrite, même en deux lignes dans un message.</li>
    <li><strong>Le volume et le délai.</strong> « Des clips quand j'ai le temps » ne tient jamais. Un nombre par semaine et un délai de livraison, c'est ce qui transforme une faveur en prestation.</li>
  </ol>`,
      },
      {
        titre: 'Ce qui fait renouveler',
        corps: `  <p>Décrocher un premier client est une chose ; le garder en est une autre. Trois facteurs, dans l'ordre d'importance réelle :</p>
  <ol>
    <li><strong>La régularité.</strong> Un clippeur qui livre chaque semaine sans qu'on le relance vaut plus qu'un clippeur brillant et irrégulier. C'est le critère numéro un, loin devant la qualité.</li>
    <li><strong>Le jugement éditorial.</strong> Savoir choisir l'extrait, c'est la compétence qui ne s'automatise pas et celle qu'on te paie réellement.</li>
    <li><strong>Le fait de ne rien lui demander.</strong> Si tu as besoin qu'il te fournisse les fichiers, qu'il valide chaque clip et qu'il écrive les légendes, tu lui coûtes du temps au lieu de lui en rendre.</li>
  </ol>
  <p>Et si tu veux aborder plusieurs streamers en même temps sans t'effondrer sur la production, c'est le volume qui décide — voir <a href="/blog/clips-pour-agences-clipping.html">produire des clips en volume</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Comment aborder un streamer pour lui proposer ses services ?",
        r: "En ne demandant rien au premier contact : envoie deux ou trois clips déjà réalisés sur son propre contenu et laisse-le juger. Un message qui annonce des services est ignoré ; un message qui montre trois clips finis obtient une réponse.",
      },
      {
        q: "Quel type de streamer cibler quand on débute ?",
        r: "Celui qui stream beaucoup, qui publie peu ou mal en format court, et qui est assez installé pour avoir un budget sans l'être assez pour avoir déjà une équipe. C'est une fenêtre étroite, mais un prospect qui coche ces trois cases vaut cinquante contacts pris au hasard.",
      },
      {
        q: "Faut-il facturer au clip ou au forfait ?",
        r: "Au clip pour démarrer, parce que c'est lisible et sans surprise pour personne. Au forfait mensuel une fois la confiance installée, c'est plus confortable des deux côtés. La rémunération indexée sur les vues est risquée hors campagne structurée, puisque tu ne contrôles pas la distribution.",
      },
      {
        q: "Qui doit publier les clips, le streamer ou le clippeur ?",
        r: "Les deux fonctionnent, mais il faut le décider explicitement dès le départ : cela détermine qui possède l'audience créée, comment le résultat se mesure, et ce qu'il advient des comptes si la collaboration s'arrête.",
      },
      {
        q: "Qu'est-ce qui fait qu'un streamer renouvelle ?",
        r: "La régularité, avant la qualité. Un clippeur qui livre chaque semaine sans qu'on le relance vaut plus qu'un clippeur brillant et irrégulier. Ensuite viennent le jugement éditorial et le fait de ne rien demander au client — ni fichiers, ni validations, ni légendes.",
      },
    ],
    cta: { titre: 'Produis les trois clips de démonstration en dix minutes', bouton: 'Essayer Créatis gratuitement' },
  },
];
