/**
 * Lot 11 — trois trous à zéro occurrence (vérifiés le 25/09/2026) :
 *   « créative publicitaire » 0 · « publicité vidéo » 0 · « premiers résultats » 0
 *
 * Une idée ABANDONNÉE au passage : une page dédiée au style karaoké. L'audit a
 * montré que generer-sous-titres-automatiques a déjà un H2 « Style karaoke mot
 * par mot vs sous-titres classiques » et sous-titres-automatiques-shorts un H2
 * « Les 3 styles de sous-titres ». Une page de plus les aurait cannibalisés.
 *
 * Sur le sport : on traite UNIQUEMENT le contenu dont le club est propriétaire.
 * Cliper une retransmission télévisée est une contrefaçon — la page le dit.
 */

module.exports = [
  {
    slug: 'clips-pour-publicite',
    tag: 'Usages',
    title: 'Transformer du contenu long en créatives publicitaires',
    h1: 'Transformer du contenu long en créatives publicitaires',
    description:
      "Un webinaire ou un podcast contient déjà les arguments qui convertissent. Comment en tirer des créatives testables sans tourner, et ce qui change face à un clip organique.",
    date: '2026-09-25',
    dateLisible: '25 septembre 2026',
    minutes: 7,
    reponse:
      "Une créative publicitaire et un clip organique ne poursuivent pas le même but : le clip cherche à <strong>retenir</strong>, la publicité cherche à <strong>qualifier</strong>. Elle doit écarter vite ceux qui ne sont pas concernés, parce que chaque vue non qualifiée est payée. Mais la matière est la même — un webinaire, un podcast ou une démonstration contient déjà les arguments et les objections traitées. En tirer dix créatives testables coûte une fraction d'un tournage, et surtout permet de <strong>tester dix angles au lieu d'en parier un</strong>.",
    sections: [
      {
        titre: 'Ce qui change par rapport à un clip organique',
        corps: `  <p>Trois inversions, et elles comptent toutes :</p>
  <ul>
    <li><strong>Le hook doit qualifier, pas seulement accrocher.</strong> « Tu vas pas y croire » attire tout le monde, donc fait payer des vues inutiles. « Si tu gères une équipe de cinq personnes ou plus » écarte 90 % de l'audience — et c'est exactement l'objectif.</li>
    <li><strong>Il faut un appel à l'action explicite.</strong> Un clip organique n'en a pas besoin, une publicité en meurt sans.</li>
    <li><strong>La durée se juge autrement.</strong> En organique, la complétion est reine. En publicité, une créative plus longue qui qualifie mieux peut coûter moins cher au résultat, même avec une complétion médiocre.</li>
  </ul>
  <p>Pour la logique organique, voir <a href="/blog/analyser-performance-clips.html">analyser la performance de ses clips</a> — les indicateurs n'y sont pas les mêmes.</p>`,
      },
      {
        titre: 'Où sont les créatives dans ton contenu long',
        corps: `  <p>Quatre types de passages font de bonnes publicités, et ils sont presque toujours déjà enregistrés quelque part :</p>
  <ol>
    <li><strong>L'objection traitée.</strong> Quelqu'un dit « oui mais ça coûte cher / c'est compliqué / j'ai pas le temps » et on lui répond. C'est la créative la plus efficace qui existe, parce qu'elle parle exactement à ceux qui hésitent.</li>
    <li><strong>La démonstration courte.</strong> Montrer plutôt qu'affirmer, surtout si le produit fait quelque chose de visible.</li>
    <li><strong>Le retour d'expérience chiffré.</strong> « On est passé de X à Y » — factuel, vérifiable, et crédible parce que ce n'est pas la marque qui parle.</li>
    <li><strong>La prise de position clivante</strong>, qui trie l'audience toute seule : ceux qui sont d'accord s'arrêtent, les autres passent.</li>
  </ol>
  <p>Les sources les plus riches sont le webinaire — voir <a href="/blog/webinaire-en-clips.html">transformer un webinaire en clips</a> — la captation de conférence et l'entretien client. Le point commun : quelqu'un y parle de vrais problèmes avec de vrais mots.</p>`,
      },
      {
        titre: 'Le vrai bénéfice : le nombre d’angles testés',
        corps: `  <p>Le coût d'une campagne ne vient pas du tournage, il vient du budget dépensé sur un angle qui ne marche pas. Et on ne sait pas à l'avance lequel marche — c'est la seule chose dont tout le monde s'accorde en publicité.</p>
  <p>D'où la conséquence pratique : ce qui compte, c'est le <strong>nombre d'angles distincts que tu peux mettre en test</strong> pour un budget donné. Tourner une créative coûte une journée ; en extraire dix d'un webinaire existant coûte une heure.</p>
  <p>Tu passes donc de « on parie sur notre meilleure idée » à « on en teste dix et on garde celle qui gagne ». C'est le même raisonnement que le volume en clipping — voir <a href="/blog/combien-de-clips-par-jour.html">combien de clips par jour</a> — appliqué à un budget publicitaire au lieu d'un revenu.</p>`,
      },
      {
        titre: 'Les points à vérifier avant diffusion',
        corps: `  <ul>
    <li><strong>Les droits sur les personnes filmées.</strong> Une intervention enregistrée pour un webinaire n'emporte pas automatiquement l'accord d'être utilisée en publicité. Demande, par écrit.</li>
    <li><strong>La musique.</strong> Un usage publicitaire est plus contraint qu'un usage organique. Voir <a href="/blog/musique-clips-droits.html">musique sur un clip : ce qui est autorisé</a>.</li>
    <li><strong>Les affirmations.</strong> Un chiffre lâché à l'oral dans un webinaire devient une allégation commerciale une fois payé pour être diffusé. Vérifie ou coupe.</li>
    <li><strong>La date.</strong> Un prix ou une interface obsolète dans une publicité active est bien pire que dans un clip organique. Voir <a href="/blog/recycler-anciennes-videos.html">recycler ses anciennes vidéos</a>.</li>
  </ul>`,
      },
      {
        titre: 'La méthode, en une demi-journée',
        corps: `  <ol>
    <li><strong>Prends ton contenu long le plus argumenté</strong> — webinaire, démonstration, entretien client.</li>
    <li><strong>Repère les passages d'objection</strong> en priorité : ce sont eux qui convertissent.</li>
    <li><strong>Produis dix variantes</strong> plutôt que d'en polir une.</li>
    <li><strong>Sous-titre tout</strong> : en publicité aussi, la lecture se fait son coupé. Voir <a href="/blog/generer-sous-titres-automatiques.html">générer des sous-titres automatiques</a>.</li>
    <li><strong>Teste à petit budget, tue vite</strong>, et remets le budget sur ce qui survit.</li>
  </ol>
  <p>Pour le cadre général du contenu court en organisation, voir <a href="/blog/contenu-court-entreprise.html">le contenu court en entreprise</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Quelle différence entre un clip organique et une créative publicitaire ?",
        r: "Le clip cherche à retenir, la publicité à qualifier. Chaque vue non qualifiée étant payée, le hook d'une créative doit écarter vite ceux qui ne sont pas concernés, et elle a besoin d'un appel à l'action explicite dont le clip organique se passe.",
      },
      {
        q: "Quels passages d'un contenu long font de bonnes publicités ?",
        r: "L'objection traitée avant tout — quelqu'un dit que c'est cher ou compliqué et on lui répond, ce qui parle exactement à ceux qui hésitent. Ensuite la démonstration courte, le retour d'expérience chiffré, et la prise de position clivante qui trie l'audience toute seule.",
      },
      {
        q: "Pourquoi produire dix créatives plutôt qu'une bonne ?",
        r: "Parce que le coût d'une campagne ne vient pas du tournage mais du budget dépensé sur un angle qui ne marche pas — et qu'on ne sait pas lequel marche à l'avance. Extraire dix angles d'un webinaire existant coûte une heure, contre une journée pour tourner une seule créative.",
      },
      {
        q: "Peut-on utiliser un webinaire en publicité sans autorisation ?",
        r: "Non. Une intervention enregistrée pour un webinaire n'emporte pas automatiquement l'accord d'être diffusée en publicité payante : il faut le demander, par écrit. Les règles sur la musique sont également plus strictes en usage publicitaire.",
      },
      {
        q: "Faut-il sous-titrer une créative publicitaire ?",
        r: "Oui, comme un clip organique : la lecture se fait majoritairement son coupé, et une créative muette perd son audience avant d'avoir qualifié quoi que ce soit.",
      },
    ],
    cta: { titre: 'Dix angles testables depuis un webinaire déjà enregistré', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'combien-de-temps-avant-resultats-clips',
    tag: 'Stratégie',
    title: 'Combien de temps avant d’avoir des résultats avec des clips ?',
    h1: 'Combien de temps avant d’avoir des résultats avec des clips ?',
    description:
      "Les trois phases réelles — distribution prudente, calibrage, régime — et les délais associés. Pourquoi juger avant trente clips ne veut rien dire.",
    date: '2026-09-25',
    dateLisible: '25 septembre 2026',
    minutes: 6,
    reponse:
      "Compte <strong>trois à six semaines avant que les chiffres veuillent dire quelque chose</strong>, et environ <strong>trente clips publiés</strong> avant de pouvoir en tirer la moindre conclusion. Cela se décompose en trois phases : une <strong>distribution prudente</strong> les deux premières semaines, où la plateforme évalue à qui te montrer ; un <strong>calibrage</strong> entre la deuxième et la sixième semaine, où elle trouve ton audience ; puis un <strong>régime</strong> où les résultats deviennent lisibles. Juger avant la fin de la phase 2, c'est lire du bruit et en tirer de mauvaises leçons.",
    sections: [
      {
        titre: 'Phase 1 — la distribution prudente (semaines 1-2)',
        corps: `  <p>Un compte neuf, ou un compte qui change de format, est distribué au minimum. La plateforme ne sait pas encore à qui montrer ce contenu, alors elle teste sur de petits échantillons.</p>
  <p>Ce que tu observes : peu de vues, très variables d'un clip à l'autre. C'est normal et ça ne dit rien de la qualité de ton travail.</p>
  <p>L'erreur classique à ce stade est de <strong>changer de stratégie tous les trois jours</strong> parce que « ça ne marche pas ». Chaque changement remet le compteur à zéro : la plateforme recommence son évaluation, et tu prolonges la phase indéfiniment.</p>
  <p>La seule chose à faire ici : <strong>publier régulièrement et ne rien changer</strong>. Voir <a href="/blog/clipper-sans-audience.html">clipper sans audience</a>.</p>`,
      },
      {
        titre: 'Phase 2 — le calibrage (semaines 2-6)',
        corps: `  <p>La plateforme commence à cerner ton audience. Les vues deviennent moins erratiques, et surtout un motif apparaît : certains types de clips tiennent, d'autres non.</p>
  <p>C'est ici que se situe le vrai travail d'analyse — et il ne porte pas sur les vues :</p>
  <ul>
    <li><strong>Le taux de complétion</strong> te dit si tes clips sont trop longs ;</li>
    <li><strong>La courbe de rétention</strong> te dit à quelle seconde exacte ils partent, donc quel défaut corriger ;</li>
    <li><strong>Le rapport partages sur vues</strong> te dit si le propos a une valeur propre.</li>
  </ul>
  <p>Le détail de chacun est dans <a href="/blog/analyser-performance-clips.html">analyser ses clips : les 3 chiffres qui servent vraiment</a>.</p>
  <p>Règle de discipline : <strong>ne change qu'une variable à la fois</strong>. Modifier la durée, le style de sous-titres et le type d'extrait en même temps rend l'expérience ininterprétable.</p>`,
      },
      {
        titre: 'Phase 3 — le régime (à partir de la 6e semaine)',
        corps: `  <p>Les résultats deviennent lisibles et reproductibles. Tu sais quel type d'extrait fonctionne sur ton contenu, et l'écart entre un bon et un mauvais clip s'explique.</p>
  <p>C'est aussi le moment où la <strong>variance reste énorme</strong> — c'est une propriété permanente du format court, pas une phase transitoire. Un clip sur dix fera dix fois les vues des autres, sans qu'on puisse toujours dire pourquoi. C'est précisément pour ça que le volume prime : il faut assez de tirages pour que les bons sortent. Voir <a href="/blog/combien-de-clips-par-jour.html">combien de clips par jour</a>.</p>`,
      },
      {
        titre: 'Ce qui allonge inutilement le délai',
        corps: `  <ol>
    <li><strong>Publier irrégulièrement.</strong> Trois clips un jour puis rien pendant six jours rallonge la phase 1 au lieu de l'accélérer.</li>
    <li><strong>Changer de cap trop tôt.</strong> Chaque changement de format, de langue ou de sujet relance l'évaluation.</li>
    <li><strong>Mélanger les langues sur un même compte.</strong> Signal contradictoire, distribution dégradée dans les deux — voir <a href="/blog/sous-titres-anglais-clips.html">publier ses clips en anglais</a>.</li>
    <li><strong>Juger sur les vues.</strong> Ça n'allonge pas le délai techniquement, mais ça t'y fait prendre les mauvaises décisions, ce qui revient au même.</li>
  </ol>`,
      },
      {
        titre: 'Le cas particulier : une échéance datée',
        corps: `  <p>Si tu vises un événement précis, le calendrier se lit à l'envers : il faut avoir <strong>traversé les phases 1 et 2 avant</strong> le jour J, pas pendant.</p>
  <p>Concrètement, pour un événement, il faut commencer à publier <strong>six à huit semaines plus tôt</strong>. Les comptes créés le jour même passeront l'événement entier en distribution prudente, c'est-à-dire au pire moment possible.</p>
  <p>C'est tout le raisonnement de <a href="/blog/clipper-gta-6.html">clipper GTA 6</a>, dont la sortie est fixée au 19 novembre 2026 : ce qui compte n'est pas le volume du jour J, c'est d'y arriver avec des comptes déjà calibrés.</p>`,
      },
    ],
    faq: [
      {
        q: "Combien de temps avant de voir des résultats avec des clips ?",
        r: "Trois à six semaines avant que les chiffres veuillent dire quelque chose, et environ trente clips publiés avant de pouvoir en tirer des conclusions. Avant cela, la variance domine et on lit du bruit.",
      },
      {
        q: "Pourquoi mes premiers clips font-ils si peu de vues ?",
        r: "Parce qu'un compte neuf, ou un compte qui change de format, est distribué au minimum : la plateforme ne sait pas encore à qui montrer ce contenu et teste sur de petits échantillons. Cette phase dure environ deux semaines et ne dit rien de la qualité du travail.",
      },
      {
        q: "Faut-il changer de stratégie si ça ne décolle pas ?",
        r: "Pas pendant les deux premières semaines : chaque changement remet le compteur à zéro et relance l'évaluation de la plateforme, ce qui prolonge la phase indéfiniment. Publier régulièrement sans rien changer est la seule action utile à ce stade.",
      },
      {
        q: "Sur quoi juger pendant la phase de calibrage ?",
        r: "Sur le taux de complétion, la courbe de rétention et le rapport partages sur vues — jamais sur le nombre de vues, qui agrège tout sans rien isoler. Et en ne modifiant qu'une variable à la fois, sous peine de rendre l'expérience ininterprétable.",
      },
      {
        q: "Combien de temps avant un événement faut-il commencer ?",
        r: "Six à huit semaines, pour avoir traversé les phases de distribution prudente et de calibrage avant le jour J. Un compte créé le jour même passera l'événement entier en distribution minimale, c'est-à-dire au pire moment possible.",
      },
    ],
    cta: { titre: 'Trente clips, c’est une soirée — pas trois mois', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'clips-club-sportif',
    tag: 'Usages',
    title: 'Clips pour un club sportif : quoi filmer, quoi publier',
    h1: 'Clips pour un club sportif ou une association',
    description:
      "Un club produit déjà de la matière chaque week-end. Ce qui se clipe légalement, ce qui marche auprès des licenciés et des parents, et les droits à l'image.",
    date: '2026-09-25',
    dateLisible: '25 septembre 2026',
    minutes: 6,
    reponse:
      "Un club sportif produit chaque week-end une matière que presque personne n'exploite : matchs, entraînements, interviews d'après-match, présentations de joueurs. La règle qui commande tout : <strong>on ne clipe que ce dont le club est propriétaire</strong> — ses propres captations, ses propres interviews. Reprendre une retransmission télévisée ou les images d'un diffuseur est une contrefaçon, quelle que soit la mention ajoutée. Sur la matière propre, en revanche, le rendement est excellent, parce que l'audience est captive et locale.",
    sections: [
      {
        titre: 'Ce que tu as le droit de cliper — et ce que non',
        corps: `  <p>Cette section n'est pas un avis juridique, mais la ligne de partage est claire et vaut d'être posée avant tout le reste.</p>
  <p><strong>Ce qui est à toi</strong> : les captations réalisées par le club ou avec son accord, les interviews que le club a menées, les images d'entraînement, les prises de vue en tribune ou au bord du terrain quand le club en a le droit.</p>
  <p><strong>Ce qui ne l'est pas</strong> : les images d'un diffuseur télé ou d'une plateforme de streaming sportif, les résumés produits par un média, les images d'une fédération sans autorisation. Créditer la source ne change rien — le crédit n'est pas une licence.</p>
  <p>Et dans tous les cas, le <strong>droit à l'image des personnes filmées</strong> s'applique, avec une vigilance particulière pour les mineurs : autorisation parentale écrite, sans exception, et beaucoup de clubs choisissent simplement de ne pas publier de gros plans de mineurs.</p>`,
      },
      {
        titre: 'Ce qui marche auprès d’une audience locale',
        corps: `  <p>Un club n'a pas la même audience qu'un créateur : elle est petite, mais elle est <strong>captive et impliquée</strong> — licenciés, familles, anciens, partenaires. Elle ne cherche pas du divertissement générique, elle cherche à se reconnaître.</p>
  <p>Ce qui fonctionne, par ordre de rendement :</p>
  <ol>
    <li><strong>L'action décisive</strong> — le but, le point, l'arrêt. Court, immédiat, partagé dans les groupes de famille.</li>
    <li><strong>La réaction d'après-match.</strong> Un joueur ou un entraîneur qui parle à chaud vaut plus que trois minutes d'action.</li>
    <li><strong>Le portrait de joueur</strong> — trente secondes, un nom, un poste, une phrase. C'est ce qui crée l'attachement, et ça se produit en série avant la saison.</li>
    <li><strong>Les coulisses</strong> : vestiaire, déplacement, préparation. C'est ce que personne d'autre ne peut filmer.</li>
  </ol>
  <p>Ce qui ne marche pas : les matchs entiers, les remerciements institutionnels, les communiqués filmés.</p>`,
      },
      {
        titre: 'Le problème technique du terrain',
        corps: `  <p>Une captation sportive est presque toujours en <strong>plan large fixe</strong>, filmée de loin, souvent depuis une tribune. Passée en vertical, elle ne conserve qu'un tiers de la largeur — et les joueurs deviennent des silhouettes.</p>
  <p>Trois adaptations concrètes :</p>
  <ul>
    <li><strong>Privilégier les plans rapprochés</strong> quand ils existent : célébration, banc, interview. Le plan large sert au contexte, pas au clip.</li>
    <li><strong>Filmer les interviews en vertical dès le départ.</strong> Un téléphone tenu à la verticale au bord du terrain donne une meilleure source que n'importe quel recadrage a posteriori.</li>
    <li><strong>Accepter le format horizontal recadré avec bandes</strong> pour les actions de jeu, plutôt que de zoomer et de perdre en netteté. Voir <a href="/blog/pourquoi-ton-crop-9-16-est-rate.html">pourquoi ton crop 9:16 est raté</a> et <a href="/blog/video-floue-apres-export.html">vidéo floue après export</a>.</li>
  </ul>`,
      },
      {
        titre: 'L’organisation qui tient sur une saison',
        corps: `  <p>Le piège d'un club est l'irrégularité : un pic de publications après une victoire, puis trois semaines de silence. Or la régularité compte plus que le volume. Voir <a href="/blog/combien-de-temps-avant-resultats-clips.html">combien de temps avant d'avoir des résultats</a>.</p>
  <p>Ce qui tient dans la durée :</p>
  <ol>
    <li><strong>Une seule personne responsable</strong> de la captation, même bénévole. À plusieurs sans référent, personne ne filme.</li>
    <li><strong>Un rituel fixe</strong> : un clip d'action et une réaction après chaque match, systématiquement.</li>
    <li><strong>Une réserve de portraits</strong> tournée en début de saison, à publier pendant les semaines creuses.</li>
    <li><strong>Des sous-titres toujours</strong> : les interviews de bord de terrain sont bruyantes, et se regardent son coupé. Voir <a href="/blog/generer-sous-titres-automatiques.html">générer des sous-titres automatiques</a>.</li>
  </ol>
  <p>Pour une structure qui veut industrialiser au-delà du bénévolat, la logique générale est dans <a href="/blog/contenu-court-entreprise.html">le contenu court en entreprise</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Un club peut-il cliper les images télé de ses propres matchs ?",
        r: "Non. Les images d'un diffuseur ou d'un média appartiennent à celui-ci, même quand elles montrent votre équipe, et créditer la source ne constitue pas une licence. Seules les captations réalisées par le club ou avec son accord sont exploitables.",
      },
      {
        q: "Que faire des mineurs filmés ?",
        r: "Une autorisation parentale écrite est nécessaire, sans exception. Beaucoup de clubs choisissent par prudence de ne pas publier de gros plans de mineurs et se limitent aux plans d'ensemble.",
      },
      {
        q: "Quels contenus fonctionnent le mieux pour un club ?",
        r: "L'action décisive en premier — but, point, arrêt —, puis la réaction d'après-match à chaud, le portrait de joueur en trente secondes, et les coulisses que personne d'autre ne peut filmer. Les matchs entiers et les communiqués filmés ne fonctionnent pas.",
      },
      {
        q: "Comment gérer les captations en plan large ?",
        r: "En privilégiant les plans rapprochés quand ils existent — célébration, banc, interview —, en filmant les interviews directement en vertical avec un téléphone, et en acceptant un recadrage avec bandes pour les actions de jeu plutôt que de zoomer et perdre en netteté.",
      },
      {
        q: "À quelle fréquence un club doit-il publier ?",
        r: "Régulièrement plutôt que beaucoup : un clip d'action et une réaction après chaque match, systématiquement, valent mieux qu'un pic après une victoire suivi de trois semaines de silence. Une réserve de portraits tournée en début de saison couvre les semaines creuses.",
      },
    ],
    cta: { titre: 'Chaque week-end produit déjà la matière', bouton: 'Essayer Créatis gratuitement' },
  },
];
