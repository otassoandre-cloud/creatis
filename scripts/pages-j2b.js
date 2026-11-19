/**
 * Lot 10 — trois trous confirmés par recherche le 25/09/2026 :
 *   « facebook reels » 0 fichier · « équipe de clippeurs » 0 · « sous-traiter » 0
 *   « trop lourde » 1 seule mention (dans video-floue-apres-export, en passant)
 *
 * Note anti-chevauchement : video-trop-lourde traite du POIDS et du refus à
 * l'envoi ; video-floue-apres-export traite de la NETTETÉ. Deux symptômes
 * distincts, deux causes distinctes — les pages se citent pour lever l'ambiguïté.
 */

module.exports = [
  {
    slug: 'clips-pour-facebook-reels',
    tag: 'Publication',
    title: 'Clips sur Facebook Reels : la plateforme qu’on oublie',
    h1: 'Clips sur Facebook Reels : la plateforme qu’on oublie',
    description:
      "Facebook Reels accepte le recyclage, touche une audience plus âgée et reste moins saturé que TikTok. Ce que ça change dans le choix des extraits.",
    date: '2026-09-25',
    dateLisible: '25 septembre 2026',
    minutes: 6,
    reponse:
      "Facebook Reels est la plateforme verticale la plus <strong>négligée par les créateurs francophones</strong>, et c'est précisément ce qui la rend intéressante : moins de concurrence sur les mêmes formats, une audience <strong>sensiblement plus âgée</strong> que TikTok, et une publication qui ne coûte rien puisque le fichier est déjà prêt. Le piège est de croire qu'on peut y republier à l'identique : le public n'est pas le même, donc le <strong>choix des extraits</strong> doit changer, même si le format technique, lui, est rigoureusement identique.",
    sections: [
      {
        titre: 'Zéro coût technique, vrai gain de portée',
        corps: `  <p>Le format est le même que partout ailleurs : vertical, 1080 × 1920, sous-titres incrustés. Un clip produit pour TikTok se publie sur Facebook Reels sans retouche. Voir <a href="/blog/formats-video-reseaux-sociaux.html">les formats vidéo par réseau</a>.</p>
  <p>Le coût marginal est donc nul, ce qui est rare. L'essentiel des créateurs francophones publie sur TikTok, Instagram et YouTube, et s'arrête là — soit parce que Facebook leur paraît dépassé, soit par simple oubli. Résultat : moins de contenu en concurrence pour la même attention.</p>
  <p>Et contrairement à Snapchat, Facebook n'impose rien sur l'origine du fichier : le contenu importé est traité comme le reste. Voir <a href="/blog/clips-pour-snapchat.html">clips sur Snapchat Spotlight</a> pour le contre-exemple.</p>`,
      },
      {
        titre: 'Une audience qui n’est pas la même',
        corps: `  <p>C'est la seule vraie différence, et elle est structurante. L'audience de Facebook est en moyenne plus âgée que celle de TikTok, et ses réflexes de consommation ne sont pas identiques.</p>
  <p>Ce qui en découle pour le choix des extraits :</p>
  <ul>
    <li><strong>Les références générationnelles ne portent pas pareil.</strong> Un clip qui repose sur un code TikTok, un son tendance ou un format de niche tombera à plat.</li>
    <li><strong>Le rythme peut être légèrement plus posé.</strong> La coupe ultra-nerveuse n'est pas un avantage ici, elle peut même perdre.</li>
    <li><strong>Les sujets pratiques et les retours d'expérience marchent mieux</strong> que les sujets identitaires ou communautaires.</li>
    <li><strong>Le partage fonctionne différemment</strong> : sur Facebook, on partage davantage dans son propre fil, à une audience de proches, que vers l'extérieur.</li>
  </ul>
  <p>Autrement dit : même bibliothèque de clips, sélection différente. Ne publie pas tout partout, publie ce qui correspond.</p>`,
      },
      {
        titre: 'Ce qui change pour une entreprise',
        corps: `  <p>Pour une marque ou un indépendant qui vend à un public non-adolescent, Facebook Reels est souvent <strong>plus rentable que TikTok</strong>, et beaucoup moins travaillé. La raison est simple : le pouvoir d'achat et l'intention d'achat y sont plus élevés qu'auprès d'une audience très jeune.</p>
  <p>Les sources qui s'y recyclent le mieux :</p>
  <ul>
    <li>un <strong>webinaire</strong> — voir <a href="/blog/webinaire-en-clips.html">transformer un webinaire en clips</a> ;</li>
    <li>une <strong>captation de conférence</strong> — voir <a href="/blog/clips-depuis-conference.html">clips depuis une conférence</a> ;</li>
    <li>un <strong>témoignage client</strong> ou une démonstration produit.</li>
  </ul>
  <p>Le raisonnement d'ensemble est dans <a href="/blog/contenu-court-entreprise.html">le contenu court en entreprise</a>, et le pendant professionnel dans <a href="/blog/clips-pour-linkedin.html">clips vidéo pour LinkedIn</a>.</p>`,
      },
      {
        titre: 'La méthode, en trois minutes par clip',
        corps: `  <ol>
    <li><strong>Publie d'abord ailleurs</strong>, puis reprends les clips qui ont tenu. Inutile de tester sur Facebook : sers-toi de TikTok ou Reels comme banc d'essai.</li>
    <li><strong>Écarte ce qui est trop marqué générationnellement.</strong> Un tri de trente secondes suffit.</li>
    <li><strong>Réécris la légende.</strong> C'est le seul vrai travail : le ton qui marche sur TikTok ne marche pas ici, et une légende recopiée se voit immédiatement.</li>
    <li><strong>Ne mélange pas les statistiques.</strong> Compare Facebook à Facebook, pas au reste — les bases d'audience n'ont rien à voir. Voir <a href="/blog/analyser-performance-clips.html">analyser ses clips</a>.</li>
  </ol>
  <p>Sur l'organisation générale d'une publication multi-plateformes, voir <a href="/blog/cross-posting-clips.html">le cross-posting de clips</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Peut-on publier les mêmes clips sur Facebook Reels que sur TikTok ?",
        r: "Techniquement oui : le format est identique, vertical 1080 × 1920 avec sous-titres incrustés, et Facebook n'impose rien sur l'origine du fichier. Mais l'audience étant sensiblement plus âgée, le choix des extraits doit changer même si le fichier ne change pas.",
      },
      {
        q: "Pourquoi Facebook Reels est-il moins concurrentiel ?",
        r: "Parce que l'essentiel des créateurs francophones publie sur TikTok, Instagram et YouTube et s'arrête là — par perception de plateforme dépassée ou par simple oubli. Moins de contenu en concurrence pour la même attention, pour un coût marginal nul puisque le fichier est déjà prêt.",
      },
      {
        q: "Quels extraits fonctionnent mieux sur Facebook ?",
        r: "Les sujets pratiques et les retours d'expérience, sur un rythme un peu plus posé. À l'inverse, les clips qui reposent sur un code TikTok, un son tendance ou une référence générationnelle marquée tombent à plat auprès d'une audience plus âgée.",
      },
      {
        q: "Facebook Reels vaut-il le coup pour une entreprise ?",
        r: "Souvent davantage que TikTok, si la clientèle n'est pas adolescente : le pouvoir d'achat et l'intention d'achat y sont plus élevés, et la plateforme est bien moins travaillée. Les webinaires, captations de conférence et témoignages clients s'y recyclent particulièrement bien.",
      },
      {
        q: "Faut-il réécrire la légende pour Facebook ?",
        r: "Oui, c'est le seul vrai travail d'adaptation. Le ton qui fonctionne sur TikTok ne fonctionne pas ici, et une légende recopiée telle quelle se repère immédiatement.",
      },
    ],
    cta: { titre: 'Un clip produit, quatre plateformes à alimenter', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'video-trop-lourde-tiktok',
    tag: 'Dépannage',
    title: 'Vidéo trop lourde ou refusée à l’envoi : que faire',
    h1: 'Vidéo trop lourde ou refusée à l’envoi',
    description:
      "Envoi qui échoue, fichier refusé, téléversement interminable : les causes sont le poids, la durée, le codec ou la cadence. Le diagnostic dans l'ordre.",
    date: '2026-09-25',
    dateLisible: '25 septembre 2026',
    minutes: 6,
    reponse:
      "Quand une plateforme refuse un fichier, quatre causes couvrent la quasi-totalité des cas, et il faut les vérifier <strong>dans cet ordre</strong> : le <strong>poids</strong> du fichier, sa <strong>durée</strong>, son <strong>codec</strong>, et sa <strong>cadence d'images</strong>. Le réflexe de tout le monde — réduire la qualité jusqu'à ce que ça passe — est le mauvais : il dégrade l'image alors que le problème vient rarement de la définition. Un clip de 45 secondes en 1080 × 1920 ne devrait jamais peser lourd ; s'il le fait, c'est le <strong>débit</strong> qui est mal réglé, pas la définition qui est trop haute.",
    sections: [
      {
        titre: '1. Le poids — et pourquoi ce n’est pas la définition',
        corps: `  <p>Le poids d'une vidéo, c'est la durée multipliée par le débit. La définition n'y intervient qu'indirectement, via le débit nécessaire pour la servir correctement.</p>
  <p>Un clip vertical de 45 secondes en 1080 × 1920 correctement encodé pèse quelques dizaines de mégaoctets. S'il en pèse plusieurs centaines, c'est qu'il a été exporté à un débit très supérieur à ce qui sert — typiquement un réglage « qualité maximale » ou « sans perte » laissé par défaut.</p>
  <p><strong>La bonne correction est de baisser le débit, pas la définition.</strong> Passer de 1080 à 720 pour alléger un fichier revient à jeter de l'image pour corriger un réglage d'encodage : tu perds de la netteté sans régler la cause. Voir <a href="/blog/video-floue-apres-export.html">vidéo floue après export</a>, qui traite du symptôme inverse.</p>`,
      },
      {
        titre: '2. La durée — la cause la plus bête',
        corps: `  <p>Chaque plateforme a ses bornes, minimales comme maximales, et elles diffèrent selon le mode de publication et parfois selon le type de compte.</p>
  <p>Deux pièges classiques :</p>
  <ul>
    <li><strong>Un clip trop court</strong> peut être refusé ou privé de monétisation. C'est le cas de Snapchat Spotlight, qui demande au moins une minute — voir <a href="/blog/clips-pour-snapchat.html">clips sur Snapchat Spotlight</a>.</li>
    <li><strong>Un clip qui dépasse de quelques dixièmes de seconde</strong> la limite est refusé exactement comme s'il durait une heure. Rogner une demi-seconde suffit.</li>
  </ul>
  <p>Vérifie la durée exacte de ton fichier avant de chercher plus loin : c'est trente secondes de contrôle contre une heure de tâtonnement.</p>`,
      },
      {
        titre: '3. Le codec et le conteneur',
        corps: `  <p>Les plateformes attendent des fichiers ordinaires : un conteneur MP4 avec de la vidéo H.264 et de l'audio AAC passe partout. Ce qui coince :</p>
  <ul>
    <li><strong>Des codecs plus récents ou exotiques</strong> — certains encodages modernes issus de téléphones ou de logiciels spécialisés sont mal acceptés, ou acceptés puis réencodés en perdant beaucoup.</li>
    <li><strong>Une piste audio absente ou dans un format inhabituel.</strong> Une vidéo sans piste audio du tout est refusée par plusieurs plateformes, même si le clip est muet par choix — il faut alors une piste silencieuse.</li>
    <li><strong>Un conteneur inhabituel</strong> — MKV, AVI, MOV avec un encodage spécifique. Le MP4 reste le choix sûr.</li>
  </ul>
  <p>Si le fichier vient directement d'un outil de clips, c'est rarement le problème : les exports sont faits pour ces plateformes. Le cas se présente surtout après un passage par un logiciel de montage configuré pour la diffusion ou l'archivage.</p>`,
      },
      {
        titre: '4. La cadence d’images',
        corps: `  <p>Deux situations posent problème :</p>
  <ul>
    <li><strong>Une cadence très élevée</strong> — 120 images par seconde issues d'un enregistrement de jeu, par exemple. Certaines plateformes refusent, d'autres réencodent brutalement.</li>
    <li><strong>Une cadence variable</strong>, typique des enregistrements d'écran et de visioconférence. C'est le cas le plus sournois : le fichier passe parfois, mais la durée déclarée et la durée réelle divergent, ce qui décale l'audio et fait dériver les sous-titres.</li>
  </ul>
  <p>Ce second cas est la cause classique de sous-titres justes au début et de plus en plus faux ensuite. Le diagnostic complet est dans <a href="/blog/sous-titres-decales.html">sous-titres décalés : décalage constant ou dérive ?</a></p>`,
      },
      {
        titre: 'L’ordre de diagnostic',
        corps: `  <ol>
    <li><strong>Regarde la durée.</strong> Trente secondes, et ça élimine la cause la plus fréquente.</li>
    <li><strong>Regarde le poids.</strong> Anormalement élevé pour la durée ? C'est le débit, pas la définition.</li>
    <li><strong>Vérifie qu'il y a une piste audio</strong>, même silencieuse.</li>
    <li><strong>Réexporte en MP4 / H.264 / AAC</strong> à cadence fixe. Cette seule opération règle tout ce qui reste.</li>
  </ol>
  <p>Et la meilleure prévention reste de ne pas passer par une chaîne de montage intermédiaire : un clip exporté directement aux spécifications des plateformes n'a aucune raison d'être refusé. Voir <a href="/blog/specs-video-tiktok-reels-shorts.html">les specs vidéo TikTok, Reels et Shorts</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Ma vidéo est trop lourde, faut-il baisser la définition ?",
        r: "Non, presque jamais. Le poids est le produit de la durée par le débit : un clip de 45 secondes en 1080 × 1920 correctement encodé pèse quelques dizaines de mégaoctets. S'il pèse beaucoup plus, c'est le débit d'export qui est mal réglé — le baisser règle le problème sans sacrifier la netteté.",
      },
      {
        q: "Pourquoi ma vidéo est-elle refusée à l'envoi ?",
        r: "Quatre causes couvrent la quasi-totalité des cas, à vérifier dans cet ordre : la durée (hors bornes de la plateforme), le poids, le codec ou le conteneur, et la cadence d'images. La durée est la plus fréquente et la plus rapide à contrôler.",
      },
      {
        q: "Une vidéo sans son peut-elle être refusée ?",
        r: "Oui. Plusieurs plateformes refusent un fichier dépourvu de piste audio, même quand le clip est muet volontairement. Il faut dans ce cas ajouter une piste silencieuse plutôt que de laisser le fichier sans audio.",
      },
      {
        q: "Quel format de fichier choisir pour éviter les refus ?",
        r: "Un conteneur MP4 avec de la vidéo H.264 et de l'audio AAC, à cadence fixe. C'est accepté partout. Les codecs plus récents, les conteneurs MKV ou AVI et les cadences variables sont les sources d'ennuis les plus courantes.",
      },
      {
        q: "Qu'est-ce qu'une cadence variable et pourquoi pose-t-elle problème ?",
        r: "C'est un nombre d'images par seconde qui fluctue, typique des enregistrements d'écran et de visioconférence. Le fichier passe parfois, mais la durée déclarée et la durée réelle divergent — ce qui décale l'audio et fait dériver progressivement les sous-titres.",
      },
    ],
    cta: { titre: 'Des exports déjà aux specs, sans réglage à chercher', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'monter-equipe-clippeurs',
    tag: 'Clipping',
    title: 'Monter une équipe de clippeurs : ce qui casse à l’échelle',
    h1: 'Monter une équipe de clippeurs : ce qui casse à l’échelle',
    description:
      "Passer de un à cinq clippeurs ne multiplie pas la production par cinq. Les trois points de rupture — la source, la cohérence, la mesure — et comment les tenir.",
    date: '2026-09-25',
    dateLisible: '25 septembre 2026',
    minutes: 7,
    reponse:
      "Passer d'un clippeur à cinq ne multiplie pas la production par cinq, parce que trois choses cassent en chemin. <strong>L'accès à la source</strong> devient un goulot dès que plusieurs personnes doivent travailler sur les mêmes fichiers. <strong>La cohérence</strong> s'effondre si rien n'est écrit — cinq personnes produisent cinq styles. Et <strong>la mesure</strong> devient impossible si tout le monde publie depuis des comptes différents sans nomenclature. Les trois se règlent avant de recruter, jamais après : une équipe montée sans ces trois décisions produit du volume qu'on ne peut ni utiliser ni évaluer.",
    sections: [
      {
        titre: 'Rupture 1 — l’accès à la source',
        corps: `  <p>Avec un clippeur, la source est un fichier sur son disque. Avec cinq, c'est un problème d'organisation à part entière.</p>
  <p>Ce qui casse concrètement :</p>
  <ul>
    <li><strong>Plusieurs personnes clipent le même passage</strong> sans le savoir. Sur une fenêtre de forte activité, ça peut représenter un tiers du travail perdu.</li>
    <li><strong>Chacun télécharge sa version</strong>, et les qualités diffèrent. Le résultat final est inégal sans que personne comprenne pourquoi — voir <a href="/blog/video-floue-apres-export.html">vidéo floue après export</a>.</li>
    <li><strong>Personne ne sait ce qui a déjà été publié</strong>, et les doublons sortent sur des comptes différents.</li>
  </ul>
  <p>La solution tient en deux règles : <strong>une seule source de référence</strong>, partagée, à la meilleure qualité disponible ; et <strong>une attribution explicite des passages</strong> — qui traite quelle plage horaire. Un simple tableau partagé suffit, il n'y a pas besoin d'outil dédié.</p>`,
      },
      {
        titre: 'Rupture 2 — la cohérence',
        corps: `  <p>Cinq personnes qui clipent la même source produisent cinq styles : des sous-titres différents, des durées différentes, des hooks différents. Vu d'un compte, ça ressemble à un fil abandonné par son propriétaire.</p>
  <p>Ce qui doit être écrit — une page suffit, pas un manuel :</p>
  <ol>
    <li><strong>La durée cible</strong> et sa tolérance.</li>
    <li><strong>Le style de sous-titres</strong> : police, taille, position, animation. C'est le plus visible et le plus facile à unifier.</li>
    <li><strong>La règle de cadrage</strong> : ce qu'on garde quand plusieurs personnes sont à l'image.</li>
    <li><strong>La règle de hook</strong> : où commence un clip. Voir <a href="/blog/hook-3-secondes.html">le hook de 3 secondes</a>.</li>
    <li><strong>Deux ou trois clips de référence</strong> validés. C'est ce qui économise le plus de discussions — un exemple vaut dix paragraphes de consignes.</li>
  </ol>
  <p>Utiliser le même outil pour tout le monde règle mécaniquement les points 2 et 3, qui sont les plus difficiles à tenir à la main.</p>`,
      },
      {
        titre: 'Rupture 3 — la mesure',
        corps: `  <p>C'est celle qu'on découvre le plus tard, et la plus coûteuse. Si cinq personnes publient sur des comptes différents sans convention, tu ne peux répondre à aucune des questions qui comptent : quel type d'extrait marche, quelle durée tient, qui produit ce qui performe.</p>
  <p>Le minimum vital :</p>
  <ul>
    <li><strong>Une nomenclature de fichiers</strong> qui porte la source, la plage horaire et l'auteur. Ça coûte zéro et ça sauve tout.</li>
    <li><strong>Un relevé hebdomadaire</strong> des mêmes indicateurs pour tout le monde — complétion en premier, pas les vues. Voir <a href="/blog/analyser-performance-clips.html">analyser la performance de ses clips</a>.</li>
    <li><strong>Une règle de comparaison</strong> : on compare à volume égal et sur des comptes d'ancienneté comparable, sinon on compare des choses qui n'ont rien à voir.</li>
  </ul>`,
      },
      {
        titre: 'Ce qu’il ne faut pas faire',
        corps: `  <ul>
    <li><strong>Recruter avant d'avoir saturé une personne.</strong> Si un clippeur ne sort que dix clips par jour parce que sa chaîne de production est manuelle, le problème n'est pas l'effectif — c'est l'outillage. Automatiser d'abord, recruter ensuite. Voir <a href="/blog/combien-de-clips-par-jour.html">combien de clips par jour</a>.</li>
    <li><strong>Payer au clip livré sans critère d'acceptation écrit.</strong> Tu paieras des clips que tu ne publieras pas.</li>
    <li><strong>Laisser chacun ouvrir ses propres comptes sans cadre.</strong> Si la collaboration s'arrête, l'audience part avec la personne. À décider avant — voir <a href="/blog/clipper-pour-un-streamer.html">clipper pour un streamer</a>.</li>
    <li><strong>Grossir pour un pic.</strong> Une équipe montée pour un événement daté est une équipe à dissoudre juste après. Une campagne ouverte est souvent plus adaptée qu'un recrutement — voir <a href="/blog/lancer-campagne-clipping.html">lancer une campagne de clipping</a>.</li>
  </ul>`,
      },
      {
        titre: 'L’ordre qui marche',
        corps: `  <ol>
    <li><strong>Automatiser</strong> jusqu'à ce qu'une personne seule sature réellement.</li>
    <li><strong>Écrire la page de règles</strong> — durée, sous-titres, cadrage, hook, exemples.</li>
    <li><strong>Mettre en place la nomenclature et le relevé</strong>, avant le premier recrutement.</li>
    <li><strong>Recruter une seule personne</strong>, et vérifier que les trois points tiennent à deux avant de passer à cinq.</li>
  </ol>
  <p>Ce qui vaut aussi pour une agence, avec une contrainte de plus : plusieurs clients, donc plusieurs chartes à tenir en parallèle. Voir <a href="/blog/clips-pour-agences-clipping.html">produire des clips pour une agence de clipping</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Pourquoi une équipe de clippeurs ne produit-elle pas proportionnellement plus ?",
        r: "Parce que trois choses cassent à l'échelle : l'accès à la source devient un goulot et génère des doublons, la cohérence s'effondre faute de règles écrites, et la mesure devient impossible si chacun publie sans nomenclature commune.",
      },
      {
        q: "Comment éviter que plusieurs clippeurs traitent le même passage ?",
        r: "Avec une source de référence unique et partagée, à la meilleure qualité disponible, et une attribution explicite des plages horaires — qui traite quel segment. Un simple tableau partagé suffit, aucun outil dédié n'est nécessaire.",
      },
      {
        q: "Que faut-il écrire avant de recruter ?",
        r: "Une page, pas un manuel : la durée cible et sa tolérance, le style de sous-titres, la règle de cadrage quand plusieurs personnes sont à l'image, la règle de hook, et deux ou trois clips de référence validés. Les exemples économisent plus de discussions que les consignes.",
      },
      {
        q: "Faut-il recruter quand on n'arrive plus à suivre ?",
        r: "Pas avant d'avoir saturé une personne seule. Si un clippeur plafonne à dix clips par jour parce que sa chaîne est manuelle, le problème est l'outillage et non l'effectif : automatiser d'abord coûte bien moins cher que recruter.",
      },
      {
        q: "Faut-il monter une équipe pour un événement ponctuel ?",
        r: "Rarement. Une équipe constituée pour un pic est une équipe à dissoudre juste après, avec tout ce que ça implique. Une campagne de clipping ouverte, payée à la vue vérifiée, est généralement mieux adaptée à un besoin daté.",
      },
    ],
    cta: { titre: 'Sature une personne avant d’en recruter une deuxième', bouton: 'Essayer Créatis gratuitement' },
  },
];
