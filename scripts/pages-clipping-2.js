/**
 * Cluster « clipping rémunéré » — lot 2.
 * Mêmes règles que le lot 1 : aucun revenu promis, taux toujours attribués.
 */

module.exports = [
  {
    slug: 'combien-de-clips-par-jour',
    title: 'Combien de clips par jour un clippeur peut-il produire ?',
    h1: 'Combien de clips par jour un clippeur peut-il produire ?',
    description:
      "Le vrai plafond du métier de clippeur n'est pas le talent, c'est le débit. Le calcul étape par étape, du montage manuel à la chaîne automatisée.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 7,
    reponse:
      "À la main, un clippeur expérimenté produit <strong>10 à 15 clips par jour</strong> en y consacrant une journée entière : repérage dans la source, coupe, recadrage 9:16, sous-titres, export. Avec une chaîne automatisée sur le repérage, le cadrage et les sous-titres, le même travail descend à <strong>quelques minutes par clip</strong>, et le plafond se déplace — il n'est plus dans le montage mais dans le <strong>jugement éditorial</strong> : combien d'extraits tu es capable de choisir et de valider par heure.",
    sections: [
      {
        titre: 'Décomposer une journée de production manuelle',
        corps: `  <p>Prenons une source classique : un stream ou un podcast de deux heures. Voici où part le temps, poste par poste, pour quelqu'un qui maîtrise son logiciel.</p>
  <ul>
    <li><strong>Visionner et repérer</strong> — de 45 à 90 minutes. C'est le poste le plus lourd et le plus invisible : il ne produit aucun fichier, mais il conditionne tout le reste.</li>
    <li><strong>Couper et caler</strong> — 3 à 5 minutes par clip.</li>
    <li><strong>Recadrer en 9:16</strong> — 3 à 8 minutes par clip si le sujet bouge, parce qu'il faut suivre.</li>
    <li><strong>Sous-titrer</strong> — 5 à 15 minutes par clip à la main, selon la densité de parole.</li>
    <li><strong>Exporter et vérifier</strong> — 2 à 4 minutes par clip.</li>
  </ul>
  <p>Total : entre 15 et 30 minutes par clip une fois le repérage amorti. Sur une journée de travail réelle — pas une journée théorique de huit heures pleines — ça donne <strong>10 à 15 clips</strong>. C'est le chiffre à garder en tête, parce que c'est le plafond contre lequel tout le monde se cogne.</p>`,
      },
      {
        titre: 'Pourquoi ce plafond est un problème économique',
        corps: `  <p>Dans une campagne payée à la vue, le revenu s'écrit :</p>
  <p style="text-align:center"><strong>revenu = clips publiés × vues moyennes validées × taux ÷ 1 000</strong></p>
  <p>Le taux est fixé par la campagne, tu ne le négocies pas. Les vues moyennes dépendent en grande partie de l'algorithme, donc tu ne les contrôles qu'à moitié. Le nombre de clips est <strong>le seul terme que tu multiplies librement</strong>.</p>
  <p>Or c'est précisément celui que le montage manuel bloque. Passer de 10 à 30 clips par jour triple le revenu potentiel à qualité constante ; améliorer un clip de 10 % ne change presque rien. La plupart des clippeurs débutants optimisent le mauvais terme. Voir <a href="/blog/combien-paye-1000-vues-clipping.html">combien paye réellement 1 000 vues</a>.</p>`,
      },
      {
        titre: 'Les trois postes à automatiser, dans cet ordre',
        corps: `  <h3>1. Le repérage — le plus gros gain</h3>
  <p>C'est le poste le plus coûteux et celui qu'on automatise le mieux, parce qu'un modèle qui lit la transcription repère les pics de tension du discours plus vite qu'un humain ne regarde la vidéo. Voir <a href="/blog/detecter-moments-viraux.html">détecter les moments viraux</a>.</p>
  <h3>2. Les sous-titres — le plus rentable à l'usage</h3>
  <p>Écrire et caler des sous-titres à la main est le travail le plus ingrat du métier, et c'est aussi celui dont la qualité se voit le plus. Voir <a href="/blog/generer-sous-titres-automatiques.html">générer des sous-titres automatiques</a>.</p>
  <h3>3. Le recadrage 9:16 — le plus sous-estimé</h3>
  <p>Un crop vertical dans une source 1920×1080 ne conserve que 607 pixels de large, soit moins d'un tiers de l'image. Ce n'est pas un réglage cosmétique : c'est une décision de cadrage sur chaque plan. Un suivi automatique du visage fait ce travail en continu. Voir <a href="/blog/pourquoi-ton-crop-9-16-est-rate.html">pourquoi ton crop 9:16 est raté</a>.</p>`,
      },
      {
        titre: 'Le nouveau plafond, une fois la chaîne rodée',
        corps: `  <p>Quand ces trois postes tombent, le goulot se déplace — il ne disparaît pas. Le nouveau plafond est le <strong>jugement éditorial</strong> : regarder les propositions, écarter celles qui ne tiennent pas, valider les autres.</p>
  <p>C'est une bonne nouvelle, parce que c'est la partie du métier qui a de la valeur et qui ne s'automatise pas. Un clippeur qui sait choisir un extrait vaut beaucoup plus qu'un clippeur qui sait manier un logiciel — et ce sera de plus en plus vrai.</p>
  <p>En pratique, sur une chaîne automatisée, la journée ressemble à : une source traitée en quelques minutes, une série de propositions à trier, et le temps humain concentré sur le tri et sur le hook plutôt que sur la technique.</p>`,
      },
      {
        titre: 'Combien viser, concrètement',
        corps: `  <p>Trois repères, selon ton moment :</p>
  <ul>
    <li><strong>Tu démarres</strong> — vise la régularité avant le volume : 3 à 5 clips par jour tous les jours vaut mieux que 20 un dimanche. Les comptes ont besoin d'ancienneté et de constance.</li>
    <li><strong>Tu es en campagne</strong> — le volume prime, et publier tôt prime encore plus, tant que le budget est plein. Voir <a href="/blog/campagnes-clipping-remunerees.html">comment marche une campagne</a>.</li>
    <li><strong>Tu prépares une fenêtre de marché</strong> — comme la sortie de GTA 6 le 19 novembre 2026 : l'objectif n'est pas le volume du jour J mais d'avoir rodé la chaîne et vieilli les comptes avant. Voir <a href="/blog/clipper-gta-6.html">clipper GTA 6</a>.</li>
  </ul>`,
      },
    ],
    faq: [
      {
        q: "Combien de clips par jour peut produire un clippeur à la main ?",
        r: "10 à 15 clips par jour pour quelqu'un d'expérimenté qui y consacre une journée entière. Chaque clip demande 15 à 30 minutes une fois le repérage amorti : coupe, recadrage 9:16, sous-titres, export.",
      },
      {
        q: "Quelle étape du montage prend le plus de temps ?",
        r: "Le repérage des moments forts dans la source — 45 à 90 minutes pour une vidéo de deux heures. C'est le poste le plus lourd et le plus invisible, puisqu'il ne produit aucun fichier tout en conditionnant la qualité de tout le reste.",
      },
      {
        q: "Vaut-il mieux faire plus de clips ou de meilleurs clips ?",
        r: "Dans une campagne payée à la vue, le nombre de clips est le seul facteur que tu multiplies librement : le taux est fixé et les vues dépendent en grande partie de l'algorithme. Doubler la production double le revenu potentiel à qualité constante, alors qu'améliorer un clip de 10 % ne change presque rien.",
      },
      {
        q: "Qu'est-ce qui limite la production une fois le montage automatisé ?",
        r: "Le jugement éditorial : regarder les propositions, écarter celles qui ne tiennent pas, valider les autres. C'est la partie du métier qui a le plus de valeur et celle qui ne s'automatise pas.",
      },
      {
        q: "Combien de clips par jour viser quand on débute ?",
        r: "Vise la régularité avant le volume : 3 à 5 clips par jour tous les jours vaut mieux que 20 en une seule fois. Les comptes de publication ont besoin d'ancienneté et de constance pour être distribués correctement.",
      },
    ],
    cta: { titre: 'Passe de 10 clips par jour à 10 clips par heure', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'clipper-sans-audience',
    title: 'Clipper sans audience : par où commencer quand on part de zéro',
    h1: 'Clipper sans audience : par où commencer',
    description:
      "Le clipping est l'un des rares métiers créatifs qui ne demande pas d'audience préalable. Ce qui compte vraiment au démarrage, et les erreurs qui bloquent les comptes neufs.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 6,
    reponse:
      "Le clipping est l'un des rares métiers créatifs où <strong>l'audience personnelle ne sert à rien au démarrage</strong> : les campagnes paient à la vue vérifiée, sans minimum d'abonnés, et les plateformes courtes distribuent au contenu plutôt qu'au compte. Ce qui compte à la place, c'est l'<strong>ancienneté et la régularité de tes comptes de publication</strong> — un compte ouvert le jour où tu rejoins une campagne part avec un handicap qu'aucun budget ne compense. La bonne première action n'est donc pas de chercher une campagne, c'est d'ouvrir les comptes et de publier dessus dès maintenant.",
    sections: [
      {
        titre: 'Pourquoi l\'audience ne compte pas ici',
        corps: `  <p>Dans la plupart des métiers de contenu, on vend une audience. En clipping, non : l'annonceur achète des vues sur <em>son</em> contenu, pas ton influence. D'où trois conséquences qui rendent le métier accessible :</p>
  <ul>
    <li>les plateformes de campagne <strong>n'imposent généralement aucun minimum d'abonnés</strong> — c'est la vue vérifiée qui paie ;</li>
    <li>TikTok, Reels et Shorts distribuent d'abord au contenu, pas à la taille du compte : un compte de 40 abonnés peut faire 200 000 vues ;</li>
    <li>tu n'as pas besoin d'être à l'image, ni d'avoir une voix, ni un personnage.</li>
  </ul>
  <p>Ce que tu vends, c'est un <strong>jugement</strong> — savoir quel extrait de six heures de stream mérite quarante secondes — et un <strong>débit</strong>. Voir <a href="/blog/devenir-clippeur-tiktok.html">devenir clippeur</a>.</p>`,
      },
      {
        titre: 'Ce qui compte vraiment : l\'âge des comptes',
        corps: `  <p>C'est le point que presque tout le monde découvre trop tard. Un compte neuf est distribué prudemment : peu de vues sur les premières publications, le temps que la plateforme évalue à qui montrer ce contenu. Cette phase dure des semaines, pas des jours.</p>
  <p>Concrètement : si tu ouvres tes comptes le jour où une campagne intéressante démarre, tu passeras la campagne entière en phase d'évaluation, et tu en sortiras au moment où le budget sera épuisé.</p>
  <p><strong>La première action utile, aujourd'hui, est donc d'ouvrir les comptes et de publier dessus</strong> — même sans campagne, même sur du contenu que personne ne te paie. Ce n'est pas du travail perdu : c'est l'investissement qui rend le travail payé possible.</p>`,
      },
      {
        titre: 'Sur quoi publier quand on n\'a pas encore de campagne',
        corps: `  <p>Il faut de la matière légitime. Trois sources qui ne posent pas de problème :</p>
  <ol>
    <li><strong>Du contenu que tu es explicitement autorisé à clipper</strong> — beaucoup de créateurs et de streamers encouragent le clipping de leur contenu et le disent dans leur description ou leur Discord. Demande, c'est souvent oui.</li>
    <li><strong>Ton propre contenu</strong>, si tu en produis — un live, un podcast, une visio enregistrée.</li>
    <li><strong>Des campagnes à faible taux</strong> pour démarrer : moins rentables, mais elles fournissent une matière autorisée et un brief, ce qui vaut mieux que publier dans le vide.</li>
  </ol>
  <p>Choisis du <strong>contenu de divertissement</strong> — humour, gaming, podcasts, réactions. Évite l'actualité, la politique et les sujets sensibles : la distribution y est plus prudente et le risque de sortie de contexte est réel.</p>`,
      },
      {
        titre: 'Les quatre erreurs qui bloquent un compte neuf',
        corps: `  <ol>
    <li><strong>Publier vingt clips le premier jour.</strong> Un compte neuf qui publie en rafale ressemble à un compte automatisé. Trois à cinq par jour, tous les jours, vaut infiniment mieux.</li>
    <li><strong>Republier le même clip sur plusieurs comptes.</strong> Détecté, non payé, et sanctionné sur la plateforme de publication elle-même.</li>
    <li><strong>Publier sans sous-titres.</strong> L'essentiel des vues courtes se fait son coupé ; un clip muet est écarté dans les deux premières secondes. Voir <a href="/blog/generer-sous-titres-automatiques.html">générer des sous-titres automatiques</a>.</li>
    <li><strong>Négliger les trois premières secondes.</strong> C'est là que tout se joue, avant même que le spectateur sache de quoi parle le clip. Voir <a href="/blog/hook-3-secondes.html">le hook de 3 secondes</a>.</li>
  </ol>`,
      },
      {
        titre: 'Le plan des quatre premières semaines',
        corps: `  <ul>
    <li><strong>Semaine 1</strong> — ouvrir les comptes, trouver une source autorisée, publier 3 clips par jour. Objectif : exister, pas performer.</li>
    <li><strong>Semaine 2</strong> — garder le rythme, commencer à regarder quels clips tiennent au-delà de trois secondes et pourquoi.</li>
    <li><strong>Semaine 3</strong> — rôder la chaîne de production jusqu'à sortir dix clips en moins d'une heure. Voir <a href="/blog/combien-de-clips-par-jour.html">combien de clips par jour</a>.</li>
    <li><strong>Semaine 4</strong> — rejoindre une première campagne, avec des comptes qui ont désormais un mois d'historique. Voir <a href="/blog/plateformes-clipping-france.html">le comparatif des plateformes</a>.</li>
  </ul>
  <p>Si tu vises la fenêtre GTA 6 du 19 novembre 2026, ce calendrier dit quelque chose de simple : les quatre semaines doivent commencer maintenant, pas en novembre. Voir <a href="/blog/clipper-gta-6.html">clipper GTA 6</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Faut-il des abonnés pour devenir clippeur ?",
        r: "Non. Les plateformes de clipping rémunéré ne posent généralement aucun minimum d'abonnés, et TikTok, Reels et Shorts distribuent d'abord au contenu plutôt qu'à la taille du compte. Un compte de quelques dizaines d'abonnés peut faire des centaines de milliers de vues.",
      },
      {
        q: "Pourquoi mes premiers clips ne font-ils aucune vue ?",
        r: "Un compte neuf est distribué prudemment pendant plusieurs semaines, le temps que la plateforme évalue à qui montrer ce contenu. Ce n'est pas un jugement sur la qualité de tes clips : c'est une phase d'évaluation qu'il faut traverser en publiant régulièrement.",
      },
      {
        q: "Sur quoi publier quand on n'a pas encore rejoint de campagne ?",
        r: "Sur du contenu que tu es explicitement autorisé à clipper — beaucoup de créateurs l'encouragent et le disent dans leur description ou leur Discord —, sur ton propre contenu si tu en produis, ou via une campagne à faible taux qui fournit au moins une matière autorisée et un brief.",
      },
      {
        q: "Combien de clips publier par jour quand on démarre ?",
        r: "Trois à cinq par jour, tous les jours. Publier vingt clips d'un coup sur un compte neuf ressemble à un comportement automatisé et nuit à la distribution. La régularité compte davantage que le volume pendant les premières semaines.",
      },
      {
        q: "Peut-on publier le même clip sur plusieurs comptes ?",
        r: "Non. C'est détecté par les plateformes de campagne, non payé, et généralement sanctionné par la plateforme de publication elle-même. Chaque compte doit recevoir des clips distincts.",
      },
    ],
    cta: { titre: 'Publie dès cette semaine, pas le jour de la campagne', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'whop-clipping-guide',
    title: 'Whop Content Rewards : le guide du clippeur francophone',
    h1: 'Whop Content Rewards : le guide du clippeur francophone',
    description:
      "Comment fonctionnent les campagnes Content Rewards sur Whop, ce que change le contenu anglophone pour un clippeur français, et quoi vérifier avant de publier.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 7,
    reponse:
      "<strong>Whop Content Rewards</strong> est aujourd'hui le plus gros vivier de campagnes de clipping rémunéré. Le principe : tu rejoins gratuitement une communauté de clippeurs, les briefs des campagnes actives y sont publiés, tu coupes, tu publies sur TikTok, Reels ou Shorts, et tu es payé selon les <strong>vues qualifiées</strong> à un taux fixé par campagne et connu à l'avance. Son atout est le choix — c'est là qu'il y a le plus de campagnes actives à tout moment. Sa limite pour un francophone est la même : l'essentiel du contenu source est <strong>anglophone</strong>.",
    sections: [
      {
        titre: 'Le fonctionnement, étape par étape',
        corps: `  <ol>
    <li><strong>Rejoindre une communauté de clippeurs.</strong> L'accès est gratuit. Une communauté qui demande un paiement pour entrer n'est pas une campagne, c'est une formation déguisée.</li>
    <li><strong>Lire le brief.</strong> Il précise le contenu à clipper, le créateur ou le streamer concerné, les plateformes de publication acceptées, les mentions à créditer et les interdits.</li>
    <li><strong>Produire et publier.</strong> Sur tes propres comptes, en respectant le brief à la lettre.</li>
    <li><strong>Déclarer tes publications.</strong> C'est ce qui rattache tes vues à la campagne. Un clip non déclaré n'est pas payé, même conforme.</li>
    <li><strong>Être payé aux vues qualifiées</strong>, au taux annoncé, jusqu'à épuisement du budget de la campagne.</li>
  </ol>
  <p>C'est la mécanique générale des campagnes de clipping, décrite en détail dans <a href="/blog/campagnes-clipping-remunerees.html">comment marche une campagne de clipping rémunérée</a>.</p>`,
      },
      {
        titre: 'Ce que « vue qualifiée » veut dire ici',
        corps: `  <p>Le paiement est indexé sur la performance réelle, pas sur le fait d'avoir posté. Une vue qualifiée est une vue que la plateforme accepte de compter après filtrage — sont généralement écartées les vues trop courtes, le trafic jugé non authentique, les publications hors brief et les clips republiés à l'identique.</p>
  <p>Conséquence pratique : le compteur public de ton clip et le compteur de la campagne ne coïncideront pas. L'écart est structurel. Anticipe-le au lieu de le découvrir au moment du paiement.</p>`,
      },
      {
        titre: 'Ce que Whop verse réellement',
        corps: `  <p>Le suivi public des paiements de Content Rewards donne des repères qu'aucune page de vente ne met en avant :</p>
  <ul>
    <li><strong>887 000 $ versés sur le seul mois de février 2026</strong> ;</li>
    <li><strong>2,58 millions de dollars au total, à 8 466 gagnants, pour 6,6 milliards de vues</strong> ;</li>
    <li>soit un <strong>taux effectif d'environ 0,39 $ pour 1 000 vues</strong>, là où les campagnes affichent couramment 1 à 5 $ ;</li>
    <li>et <strong>environ 305 $ de gains cumulés en moyenne par clippeur</strong> — une moyenne tirée vers le haut par une minorité, donc la majorité est nettement en dessous.</li>
  </ul>
  <p>Deux lectures, et il faut tenir les deux. Le marché est <strong>réel et actif</strong> : près de neuf cent mille dollars en un mois ne sont pas une illusion. Et l'écart entre le taux affiché et le taux versé est <strong>d'un facteur trois à treize</strong>, parce que le taux annoncé ne s'applique qu'aux vues validées, dans la fenêtre de comptage, et tant que le budget tient.</p>
  <p>Le détail de ces trois filtres est dans <a href="/blog/combien-paye-1000-vues-clipping.html">combien paye 1 000 vues en clipping</a>.</p>`,
      },
      {
        titre: 'Le point qui change tout pour un clippeur français',
        corps: `  <p>La majorité des campagnes actives portent sur du contenu anglophone — créateurs américains, streamers internationaux, marques anglo-saxonnes. Pour un clippeur francophone, ça pose deux questions concrètes.</p>
  <p><strong>Sur quelle audience publies-tu ?</strong> Un clip anglophone publié depuis un compte configuré en français sera distribué à une audience mixte, souvent moins bien. Si tu prends des campagnes anglophones, assume l'anglais jusqu'au bout : compte, description, sous-titres.</p>
  <p><strong>Les sous-titres sont-ils dans la bonne langue ?</strong> C'est le détail qui tue le plus de clips. Un extrait anglais sous-titré en français perd sur les deux tableaux. Décide d'une langue par compte et t'y tiens.</p>
  <p>Des communautés de clippeurs francophones existent sur la plateforme, mais elles sont minoritaires. Si tu veux des briefs et des annonceurs en français dès le départ, les plateformes positionnées sur le marché francophone sont plus directes — voir <a href="/blog/plateformes-clipping-france.html">le comparatif des plateformes de clipping en France</a>.</p>`,
      },
      {
        titre: 'Les quatre points à vérifier avant de publier',
        corps: `  <ul>
    <li><strong>Le budget restant de la campagne.</strong> C'est l'information la plus importante et la moins regardée. Une campagne à moitié consommée vaut beaucoup moins qu'une campagne qui vient d'ouvrir.</li>
    <li><strong>Les plateformes de publication acceptées.</strong> Publier sur une plateforme non listée annule le paiement même si le clip performe.</li>
    <li><strong>Le seuil de retrait et le moyen de paiement.</strong> Détermine quand tu verras réellement l'argent, et avec quels frais.</li>
    <li><strong>La fenêtre de comptage.</strong> Les vues arrivant après la fenêtre ne sont pas payées, même réelles.</li>
  </ul>`,
      },
      {
        titre: 'La stratégie qui correspond au modèle',
        corps: `  <p>Trois choses découlent directement de la mécanique, et elles valent pour toutes les plateformes de ce type :</p>
  <ol>
    <li><strong>Publier tôt.</strong> Le même clip vaut plus le premier jour d'une campagne que le neuvième, parce que le budget est plein.</li>
    <li><strong>Publier beaucoup.</strong> Le revenu est proportionnel au volume à qualité constante — voir <a href="/blog/combien-de-clips-par-jour.html">combien de clips par jour</a>.</li>
    <li><strong>Avoir des comptes anciens.</strong> Un compte ouvert le jour de la campagne la passera entière en phase d'évaluation — voir <a href="/blog/clipper-sans-audience.html">clipper sans audience</a>.</li>
  </ol>
  <p>Et pour la fenêtre la plus chargée des prochains mois, le calendrier est déjà écrit : <a href="/blog/clipper-gta-6.html">GTA 6 sort le 19 novembre 2026</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Whop Content Rewards est-il gratuit pour les clippeurs ?",
        r: "Oui, rejoindre une communauté de clippeurs et participer aux campagnes est gratuit. La plateforme se rémunère sur le budget déposé par l'annonceur. Une communauté qui demande un paiement pour accéder aux campagnes est une formation déguisée, pas une campagne.",
      },
      {
        q: "Comment est-on payé sur Whop ?",
        r: "Selon les vues qualifiées générées par tes clips, à un taux par millier de vues fixé par campagne et connu avant que tu publies. Le paiement court jusqu'à épuisement du budget de la campagne.",
      },
      {
        q: "Les campagnes Whop sont-elles en français ?",
        r: "Majoritairement non. L'essentiel des campagnes actives porte sur du contenu anglophone. Des communautés francophones existent mais restent minoritaires. Pour des briefs et des annonceurs en français dès le départ, les plateformes positionnées sur le marché francophone sont plus directes.",
      },
      {
        q: "Faut-il sous-titrer en français un clip anglophone ?",
        r: "Non, c'est l'erreur la plus fréquente : un extrait anglais sous-titré en français perd sur les deux tableaux. Décide d'une langue par compte et tiens-la jusqu'au bout — compte, description et sous-titres compris.",
      },
      {
        q: "Que vérifier avant de se lancer sur une campagne ?",
        r: "Le budget restant — une campagne à moitié consommée vaut beaucoup moins qu'une campagne qui ouvre —, les plateformes de publication acceptées, le seuil de retrait et le moyen de paiement, et la fenêtre pendant laquelle les vues sont comptées.",
      },
    ],
    cta: { titre: 'Produis le volume que ces campagnes récompensent', bouton: 'Essayer Créatis gratuitement' },
  },
];
