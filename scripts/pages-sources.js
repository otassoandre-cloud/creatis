/**
 * Lot 5 — l'angle français, et les sources de contenu non encore couvertes.
 *
 * Stratégie de longue traîne : chacune de ces pages vise un volume modeste, mais
 * sur des requêtes que les outils anglophones ne traitent pas en français et que
 * les concurrents FR n'ont pas écrites. C'est l'addition qui compte, pas la page.
 *
 * Vérifié avant écriture : aucun chevauchement avec webinaire-en-clips (événement
 * marketing), cours-en-ligne-en-clips (pédagogie) ni live-en-shorts (direct public).
 */

module.exports = [
  {
    slug: 'outil-clips-ia-francais',
    tag: 'Outils',
    title: 'Outil de clips IA français : ce que ça change vraiment',
    h1: 'Outil de clips IA français : ce que ça change vraiment',
    description:
      "Transcription qui comprend le français, facturation en euros, données en Europe, support dans ta langue : ce qui distingue un outil FR d'un outil anglophone.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 7,
    reponse:
      "Choisir un outil de clips <strong>conçu pour le français</strong> plutôt qu'un outil anglophone traduit change quatre choses concrètes : la <strong>qualité de la transcription</strong> (c'est elle qui décide du découpage, donc de tout le reste), la <strong>facturation en euros</strong> sans frais de change ni TVA surprise, le <strong>traitement des données en Europe</strong>, et un <strong>support qui répond dans ta langue</strong>. La première est de loin la plus importante : un outil qui comprend mal ce qui est dit choisit mal les extraits, et aucun réglage ne rattrape ça.",
    sections: [
      {
        titre: 'La transcription décide de tout le reste',
        corps: `  <p>C'est le point que les comparatifs ratent systématiquement. Un outil de clips ne « regarde » pas ta vidéo : il lit ce qui est dit, repère les passages les plus forts dans le texte, et découpe autour. <strong>La transcription est la matière première de la décision de découpage.</strong></p>
  <p>Si elle est approximative, la chaîne entière est faussée en silence : les bornes tombent au milieu d'une phrase, un passage fort passe inaperçu parce que le mot-clé a été mal entendu, et les sous-titres affichés sont faux. Tu ne vois pas la cause, tu vois seulement que les clips sont médiocres.</p>
  <p>Ce qui met un modèle en difficulté sur du français :</p>
  <ul>
    <li><strong>Les liaisons.</strong> « les amis » et « lézard » se ressemblent beaucoup plus qu'on ne croit pour un modèle entraîné majoritairement sur de l'anglais.</li>
    <li><strong>Les noms propres français</strong> — pseudos de créateurs, villes, marques — souvent transformés en mots courants.</li>
    <li><strong>L'oral relâché</strong> : « chuis », « ya », « ptet », les négations sans « ne ». C'est pourtant exactement ce qui compose un stream ou un podcast.</li>
    <li><strong>Les anglicismes prononcés à la française</strong>, très fréquents dans le gaming et le marketing.</li>
  </ul>`,
      },
      {
        titre: 'Le prix réel, une fois les frais comptés',
        corps: `  <p>Un abonnement affiché en dollars coûte plus cher que le montant affiché. S'ajoutent, selon les cas :</p>
  <ul>
    <li>les <strong>frais de conversion</strong> de ta banque ou de ta carte, souvent 1 à 3 % ;</li>
    <li>la <strong>variation du taux de change</strong> d'un mois sur l'autre, qui rend le budget imprévisible ;</li>
    <li>la <strong>TVA</strong>, parfois ajoutée au moment du paiement plutôt qu'affichée dans le prix ;</li>
    <li>une <strong>facture non conforme</strong> aux attentes comptables françaises, ce qui devient un vrai sujet dès que tu factures ton activité.</li>
  </ul>
  <p>Sur des abonnements à deux chiffres, ce n'est pas anecdotique, et c'est entièrement évitable avec une facturation en euros. Le détail des formules est sur la <a href="/#tarifs">page tarifs</a>.</p>`,
      },
      {
        titre: 'Les données, et où elles passent',
        corps: `  <p>Une vidéo n'est pas un fichier neutre : elle contient des visages, des voix, parfois une réunion interne ou du contenu client non publié. Savoir où elle est traitée et combien de temps elle est conservée n'est pas de la paranoïa, c'est une question qu'un client professionnel finira par te poser.</p>
  <p>Trois points à vérifier chez n'importe quel outil, français ou non :</p>
  <ol>
    <li><strong>Où le traitement a lieu</strong> et sous quelle juridiction.</li>
    <li><strong>Combien de temps les fichiers sont conservés</strong> après traitement, et comment les supprimer.</li>
    <li><strong>Si tes vidéos servent à entraîner des modèles</strong>, et si tu peux t'y opposer.</li>
  </ol>`,
      },
      {
        titre: 'Ce qu\'un outil français ne t\'apporte pas',
        corps: `  <p>Autant être clair, parce que l'argument « français » est souvent vendu au-delà de ce qu'il vaut.</p>
  <p>Être français ne rend pas un outil meilleur en soi. Un outil français mal conçu reste mal conçu. Les critères qui décident sont les mêmes pour tout le monde : qualité du découpage, fiabilité du recadrage, lisibilité des sous-titres, absence de filigrane, rapidité de traitement. Voir <a href="/blog/meilleur-logiciel-clippeur.html">le meilleur logiciel pour clippeur</a>.</p>
  <p>Et sur certains usages, un outil anglophone spécialisé sera meilleur — la détection d'événements de jeu, par exemple, où des outils gaming dédiés font un travail que nous ne faisons pas. Voir <a href="/blog/clips-stream-gaming.html">faire des clips depuis un stream gaming</a>.</p>
  <p>L'argument français vaut pour ce qu'il est : une transcription qui ne se trompe pas sur ta langue, une facture lisible et un interlocuteur joignable. C'est déjà beaucoup, ce n'est pas tout.</p>`,
      },
      {
        titre: 'Comment vérifier en dix minutes',
        corps: `  <p>Ne te fie pas aux pages de vente, teste. Le protocole tient en quatre étapes :</p>
  <ol>
    <li>Prends <strong>une vraie vidéo à toi</strong>, pas un extrait propre — avec l'accent, le débit et le vocabulaire réels.</li>
    <li>Lance l'analyse et <strong>lis la transcription</strong> avant de regarder les clips. C'est là que tout se joue.</li>
    <li>Vérifie les <strong>noms propres et les anglicismes</strong> : ce sont les premiers à tomber.</li>
    <li>Regarde <strong>où les clips commencent et finissent</strong>. Des bornes au milieu d'une phrase trahissent une transcription approximative, même si les sous-titres ont l'air corrects.</li>
  </ol>
  <p>C'est exactement ce que permet l'essai de Créatis : l'analyse et les clips complets sont visibles avant tout paiement, sans filigrane. Voir <a href="/blog/clips-sans-filigrane.html">faire des clips sans filigrane</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Un outil de clips français est-il meilleur qu'un outil anglophone ?",
        r: "Pas en soi. Il apporte quatre choses concrètes — une transcription entraînée sur le français, une facturation en euros, un traitement des données en Europe et un support dans ta langue — mais les critères qui décident restent les mêmes pour tous : qualité du découpage, fiabilité du recadrage, lisibilité des sous-titres, absence de filigrane.",
      },
      {
        q: "Pourquoi la qualité de transcription compte-t-elle autant ?",
        r: "Parce qu'un outil de clips ne regarde pas la vidéo : il lit ce qui est dit, repère les passages forts dans le texte et découpe autour. Une transcription approximative fausse silencieusement toute la chaîne — bornes au milieu d'une phrase, passages forts manqués, sous-titres erronés.",
      },
      {
        q: "Qu'est-ce qui met un modèle en difficulté sur du français ?",
        r: "Les liaisons, qui rendent certains mots ambigus pour un modèle entraîné surtout sur de l'anglais ; les noms propres français souvent transformés en mots courants ; l'oral relâché (« chuis », « ya », négations sans « ne ») qui compose pourtant l'essentiel d'un stream ou d'un podcast ; et les anglicismes prononcés à la française.",
      },
      {
        q: "Un abonnement en dollars coûte-t-il vraiment plus cher ?",
        r: "Oui, au-delà du montant affiché : frais de conversion bancaire de 1 à 3 %, variation du taux de change d'un mois sur l'autre, TVA parfois ajoutée au paiement, et facture pas toujours conforme aux attentes comptables françaises dès que tu factures ton activité.",
      },
      {
        q: "Comment tester la qualité française d'un outil ?",
        r: "Avec une vraie vidéo à toi plutôt qu'un extrait propre, en lisant la transcription avant de regarder les clips, en vérifiant les noms propres et les anglicismes — les premiers à tomber —, et en regardant où les clips commencent et finissent : des bornes au milieu d'une phrase trahissent une transcription approximative.",
      },
    ],
    cta: { titre: 'Teste sur une vraie vidéo à toi, transcription comprise', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'clips-depuis-visioconference',
    tag: 'Sources',
    title: 'Transformer une visio Zoom, Meet ou Teams en clips',
    h1: 'Transformer une visio Zoom, Meet ou Teams en clips',
    description:
      "Les enregistrements de visioconférence ont trois défauts qui cassent le montage vertical : vue en grille, cadence variable, audio inégal. Comment les contourner.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 6,
    reponse:
      "Un enregistrement de visioconférence est une excellente source de clips — il y a de la parole, des idées et des échanges — mais il arrive avec trois défauts qui lui sont propres : la <strong>vue en grille</strong>, qui rend le recadrage vertical impossible tel quel ; la <strong>cadence d'images variable</strong>, qui fait dériver les sous-titres ; et un <strong>audio très inégal</strong> d'un participant à l'autre. Les trois se règlent, mais <strong>au moment de l'enregistrement</strong>, pas au montage.",
    sections: [
      {
        titre: 'Le réglage à faire avant, pas après',
        corps: `  <p>Toutes les plateformes de visio proposent d'enregistrer en <strong>vue intervenant</strong> plutôt qu'en vue grille : l'image bascule automatiquement sur la personne qui parle, en plein cadre.</p>
  <p>C'est le seul réglage qui compte vraiment, et il change tout :</p>
  <ul>
    <li>en <strong>vue grille</strong>, chaque visage occupe un quart ou un neuvième de l'image. Recadré en 9:16, un visage devient une vignette minuscule et illisible ;</li>
    <li>en <strong>vue intervenant</strong>, le visage remplit le cadre et le recadrage vertical fonctionne immédiatement.</li>
  </ul>
  <p>Si l'enregistrement est déjà fait en grille, il n'existe pas de bonne solution — seulement des compromis : recadrer sur un seul participant et perdre les autres, ou garder la grille entière avec des bandes, ce qui donne un clip qu'on ne regarde pas sur un téléphone.</p>
  <p>Demande aussi, quand c'est possible, l'enregistrement <strong>en local plutôt que dans le cloud</strong> : la qualité est généralement meilleure, parce qu'elle ne dépend pas de la bande passante du moment.</p>`,
      },
      {
        titre: 'La cadence variable, et pourquoi tes sous-titres dérivent',
        corps: `  <p>Les enregistrements de visio sont fréquemment en <strong>cadence d'images variable</strong> : le nombre d'images par seconde fluctue selon la connexion. C'est invisible à la lecture, et c'est la cause typique d'un défaut précis — des sous-titres justes au début et de plus en plus faux à mesure que le clip avance.</p>
  <p>C'est une <strong>dérive progressive</strong>, pas un décalage constant, et un décalage global n'y changera rien. La distinction et les deux remèdes sont dans <a href="/blog/sous-titres-decales.html">sous-titres décalés : décalage constant ou dérive ?</a></p>
  <p>Le réflexe qui évite le problème : découper le clip d'abord, transcrire ensuite, sur le fichier réellement monté.</p>`,
      },
      {
        titre: 'L\'audio, le vrai facteur limitant',
        corps: `  <p>Dans une visio, chacun a son micro, sa pièce et sa connexion. Résultat : un participant clair, un autre lointain, un troisième qui sature. Pour un clip, c'est plus pénalisant que l'image — on pardonne une image moyenne, pas un son inaudible.</p>
  <p>Trois conséquences pratiques :</p>
  <ul>
    <li><strong>Privilégie les passages où parle la personne la mieux enregistrée.</strong> C'est un critère de sélection à part entière, au même titre que l'intérêt du propos.</li>
    <li><strong>Les sous-titres ne sont pas optionnels</strong>, ils sont ici le filet de sécurité de l'audio.</li>
    <li><strong>Méfie-toi des coupures de parole.</strong> Les chevauchements, courants en visio, rendent la transcription approximative et les bornes de découpage hasardeuses.</li>
  </ul>`,
      },
      {
        titre: 'Ce qui se clipe bien dans une visio',
        corps: `  <p>Toutes les visios ne donnent pas des clips. Celles qui marchent ont un point commun : <strong>quelqu'un explique ou raconte quelque chose de façon continue</strong> pendant au moins trente secondes.</p>
  <ul>
    <li><strong>Une réponse développée à une question précise</strong> — le format le plus efficace, parce qu'il est autonome.</li>
    <li><strong>Une démonstration ou un partage d'écran commenté</strong>, à condition que l'écran soit lisible en vertical, ce qui est rarement le cas sans recadrage sur la zone utile.</li>
    <li><strong>Un désaccord argumenté</strong> entre deux participants — ça tient, parce qu'il y a une tension.</li>
  </ul>
  <p>Ce qui ne donne rien : les tours de table, les points d'organisation, les passages où tout le monde acquiesce. Pas de tension, pas de clip.</p>
  <p>Pour un webinaire au sens événement marketing, voir <a href="/blog/webinaire-en-clips.html">transformer un webinaire en clips</a>. Pour un cours structuré, <a href="/blog/cours-en-ligne-en-clips.html">un cours en ligne en clips</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Comment enregistrer une visio pour pouvoir en faire des clips ?",
        r: "En vue intervenant plutôt qu'en vue grille : l'image bascule sur la personne qui parle et son visage remplit le cadre, ce qui rend le recadrage vertical immédiatement exploitable. En vue grille, un visage recadré en 9:16 devient une vignette illisible. Préfère aussi l'enregistrement local au cloud quand c'est possible.",
      },
      {
        q: "Que faire si l'enregistrement est déjà en vue grille ?",
        r: "Il n'existe pas de bonne solution, seulement des compromis : recadrer sur un seul participant en perdant les autres, ou conserver la grille entière avec des bandes, ce qui donne un clip qu'on ne regarde pas sur un téléphone. Le réglage se fait avant l'enregistrement, pas au montage.",
      },
      {
        q: "Pourquoi mes sous-titres dérivent-ils sur un enregistrement de visio ?",
        r: "Parce que ces enregistrements sont souvent en cadence d'images variable : le nombre d'images par seconde fluctue selon la connexion. C'est une dérive progressive, pas un décalage constant, et un décalage global ne la corrige pas. Découpe le clip d'abord et transcris ensuite, sur le fichier monté.",
      },
      {
        q: "Quels passages d'une réunion se clipent le mieux ?",
        r: "Ceux où quelqu'un explique ou raconte quelque chose de façon continue pendant au moins trente secondes : une réponse développée à une question précise, une démonstration commentée, un désaccord argumenté. Les tours de table et les points d'organisation ne donnent rien — pas de tension, pas de clip.",
      },
      {
        q: "L'audio inégal entre participants est-il un problème ?",
        r: "C'est le vrai facteur limitant, plus pénalisant que l'image : on pardonne une image moyenne, pas un son inaudible. Privilégie les passages où parle la personne la mieux enregistrée, et considère les sous-titres comme le filet de sécurité de l'audio plutôt que comme une option.",
      },
    ],
    cta: { titre: 'Une visio enregistrée, une série de clips verticaux', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'clips-depuis-conference',
    tag: 'Sources',
    title: 'Clips depuis une conférence ou un keynote : la méthode',
    h1: 'Clips depuis une conférence ou un keynote',
    description:
      "Une captation de conférence est une mine de clips si on sait quoi en extraire. Ce qui marche, ce qui ne marche jamais, et les contraintes de captation à anticiper.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 6,
    reponse:
      "Une captation de conférence produit d'excellents clips, à condition d'accepter une règle : <strong>on ne clipe pas une conférence, on clipe une affirmation</strong>. Les passages qui fonctionnent sont ceux où l'intervenant énonce quelque chose de net et d'autonome — un chiffre, une prise de position, une formule — que le spectateur comprend sans connaître le reste du propos. Tout ce qui dépend du contexte, de la diapositive précédente ou de la question posée dix minutes plus tôt est perdu d'avance.",
    sections: [
      {
        titre: 'La règle de l\'autonomie',
        corps: `  <p>Un spectateur sur TikTok ou Reels arrive sans contexte et décide en deux secondes. Il n'a pas vu l'introduction, ne sait pas qui parle et ignore le thème de l'événement.</p>
  <p>Le test est donc simple, et il élimine 90 % des extraits candidats : <strong>l'extrait se comprend-il seul, sans rien d'autre ?</strong></p>
  <p>Ce qui passe ce test :</p>
  <ul>
    <li>une <strong>affirmation tranchée</strong>, surtout si elle prend le contre-pied d'une idée reçue ;</li>
    <li>un <strong>chiffre marquant</strong> avec sa source énoncée dans la foulée ;</li>
    <li>une <strong>anecdote complète</strong>, avec son début et sa chute, en moins de soixante secondes ;</li>
    <li>une <strong>définition nette</strong> d'une notion que le public cherche.</li>
  </ul>
  <p>Ce qui échoue : les transitions, les remerciements, les renvois à une diapositive, les « comme je le disais tout à l'heure », et les réponses de session de questions dont on n'entend pas la question.</p>`,
      },
      {
        titre: 'Les contraintes propres à la captation d\'événement',
        corps: `  <ul>
    <li><strong>Le plan large fixe.</strong> Beaucoup de captations filment la scène en plan large, immobile. Recadré en 9:16, l'intervenant devient une silhouette lointaine. Quand une caméra rapprochée existe, c'est elle qu'il faut, même si l'autre est mieux exposée.</li>
    <li><strong>Les diapositives.</strong> Un keynote alterne souvent l'orateur et sa présentation. Une diapositive conçue pour du 16:9 est illisible en vertical : soit tu recadres sur la zone utile, soit tu restes sur l'orateur et tu laisses les sous-titres porter l'information.</li>
    <li><strong>Le son de salle.</strong> Une captation qui prend le son d'ambiance plutôt que la sortie de la console donne une transcription approximative — écho, brouhaha, applaudissements. Si la sortie console existe, réclame-la : c'est le plus gros gain de qualité disponible.</li>
    <li><strong>Les droits.</strong> Sur un événement, l'intervenant, l'organisateur et le captateur peuvent avoir des droits distincts. Vérifie avant de publier, surtout si c'est pour un client.</li>
  </ul>`,
      },
      {
        titre: 'La durée qui fonctionne',
        corps: `  <p>Le réflexe naturel est de garder la totalité d'un bon passage. C'est presque toujours une erreur.</p>
  <p>Un orateur en conférence développe : il annonce, il illustre, il nuance, il conclut. Pour un format court, seule l'annonce et sa chute comptent — le développement se coupe. Un extrait de deux minutes réduit à quarante secondes est souvent plus fort, pas plus faible.</p>
  <p>Deux repères concrets :</p>
  <ul>
    <li><strong>Commencer sur l'affirmation elle-même</strong>, jamais sur sa mise en place. « Ce que je vais vous dire va vous surprendre » est du remplissage ; commence après.</li>
    <li><strong>Finir sur la chute</strong>, pas sur la transition qui suit. Le moment où l'orateur enchaîne est le moment où ton clip doit être terminé.</li>
  </ul>
  <p>Sur la construction des premières secondes, voir <a href="/blog/hook-3-secondes.html">le hook de 3 secondes</a>.</p>`,
      },
      {
        titre: 'Combien de clips espérer',
        corps: `  <p>Une conférence de quarante-cinq minutes donne raisonnablement <strong>trois à six clips solides</strong>. C'est peu rapporté à la durée, et c'est normal : la densité d'affirmations autonomes est faible dans un discours construit, qui progresse par étapes liées entre elles.</p>
  <p>À l'inverse, une table ronde ou une session de questions produit souvent plus, parce que chaque réponse est structurellement autonome — elle répond à une question précise et se suffit à elle-même. Si tu as le choix de la source, prends la session de questions.</p>
  <p>Le calcul général est détaillé dans <a href="/blog/combien-shorts-extraire-video-youtube.html">combien de Shorts extraire d'une vidéo</a>. Pour une entreprise qui veut industrialiser ça, voir <a href="/blog/contenu-court-entreprise.html">le contenu court en entreprise</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Quels passages d'une conférence se clipent bien ?",
        r: "Ceux qui se comprennent seuls, sans contexte : une affirmation tranchée, un chiffre marquant avec sa source, une anecdote complète avec sa chute en moins d'une minute, une définition nette. Les transitions, les renvois aux diapositives et les réponses dont on n'entend pas la question échouent systématiquement.",
      },
      {
        q: "Que faire quand la captation est en plan large fixe ?",
        r: "Chercher une caméra plus rapprochée si elle existe, même moins bien exposée : recadré en 9:16, un plan large transforme l'intervenant en silhouette lointaine. À défaut, le clip reposera presque entièrement sur les sous-titres.",
      },
      {
        q: "Comment gérer les diapositives dans un clip vertical ?",
        r: "Une diapositive conçue pour du 16:9 est illisible en vertical. Deux options : recadrer sur la seule zone utile de la diapositive, ou rester sur l'orateur et laisser les sous-titres porter l'information. La seconde fonctionne mieux dans la plupart des cas.",
      },
      {
        q: "Quelle durée pour un clip de conférence ?",
        r: "Plus court que l'extrait d'origine, presque toujours. Un orateur annonce, illustre, nuance et conclut : pour un format court, seules l'annonce et la chute comptent. Commence sur l'affirmation elle-même, pas sur sa mise en place, et coupe dès que l'orateur enchaîne.",
      },
      {
        q: "Combien de clips tirer d'une conférence de 45 minutes ?",
        r: "Trois à six clips solides, ce qui est peu rapporté à la durée mais normal : un discours construit progresse par étapes liées, donc la densité d'affirmations autonomes y est faible. Une table ronde ou une session de questions en produit davantage, chaque réponse étant structurellement autonome.",
      },
    ],
    cta: { titre: 'Une captation de conférence, six clips autonomes', bouton: 'Essayer Créatis gratuitement' },
  },
];
