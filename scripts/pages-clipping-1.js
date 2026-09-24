/**
 * Cluster « clipping rémunéré » — lot 1.
 *
 * Territoire choisi le 24/09/2026 : les requêtes commerciales du clipping payé.
 * Contrairement au terrain « outil vidéo » (VEED, CapCut, Submagic — inattaquables
 * à zéro autorité), les sites en place ici sont petits : leclipping.com, clipmax.co,
 * payoff-group.com, postroyalty.com. Concurrence réelle mais atteignable.
 *
 * Règle sur les chiffres : les taux sont TOUJOURS présentés comme annoncés par les
 * plateformes, jamais comme des revenus garantis. Aucune promesse de gain.
 */

module.exports = [
  {
    slug: 'campagnes-clipping-remunerees',
    title: 'Campagnes de clipping rémunérées : comment ça marche vraiment',
    h1: 'Campagnes de clipping rémunérées : comment ça marche vraiment',
    description:
      "Le fonctionnement réel d'une campagne de clipping payée à la vue : budget fermé, vue vérifiée, CPM annoncé, délais de paiement. Sans promesse de revenu.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 8,
    reponse:
      "Une <strong>campagne de clipping rémunérée</strong> fonctionne comme un budget publicitaire inversé : un annonceur — marque, streamer ou agence — met une somme fermée en jeu, publie un brief, et paie les clippeurs <strong>à la vue vérifiée</strong> selon un taux annoncé à l'avance (le CPM). Pas de sélection, pas de minimum d'abonnés : tu publies, tes vues sont comptées, tu es payé jusqu'à épuisement de l'enveloppe. La conséquence la plus importante, et celle qu'on oublie toujours : <strong>quand la cagnotte est vide, la campagne s'arrête</strong>, même si tes clips continuent de tourner.",
    sections: [
      {
        titre: 'Les quatre pièces du mécanisme',
        corps: `  <p>Toutes les plateformes décrivent la même mécanique avec un vocabulaire légèrement différent. Voici les quatre éléments qui reviennent systématiquement, et ce qu'ils impliquent pour toi.</p>

  <h3>1. Le budget fermé</h3>
  <p>L'annonceur dépose une somme. C'est un plafond, pas un objectif. Si une campagne affiche 5 000 € et que la communauté génère assez de vues pour atteindre ce montant en quatre jours, elle ferme le quatrième jour. C'est le point que les débutants comprennent le plus tard, souvent après avoir monté des clips qui ne seront jamais payés.</p>

  <h3>2. Le taux annoncé (CPM ou RPM)</h3>
  <p>Exprimé en euros pour 1 000 vues. Il est connu <em>avant</em> que tu publies — c'est la différence majeure avec la monétisation classique d'une plateforme, où tu découvres ton revenu après coup. Sur le marché francophone, les taux affichés publiquement par les plateformes se situent dans une fourchette de <strong>0,40 € à 2 € pour 1 000 vues</strong>. Le détail des écarts est dans <a href="/blog/combien-paye-1000-vues-clipping.html">combien paye réellement 1 000 vues en clipping</a>.</p>

  <h3>3. La vue vérifiée</h3>
  <p>Toutes les vues ne comptent pas. Les plateformes filtrent : vues trop courtes, trafic suspect, comptes récents sans historique, clips republiés à l'identique. Le compteur de TikTok et le compteur de la campagne divergent presque toujours, et c'est normal. Prévois un écart plutôt que de le découvrir au paiement.</p>

  <h3>4. Le brief</h3>
  <p>Il dit quel contenu clipper, quelles plateformes de publication sont acceptées, quelle mention créditer, et souvent ce qui est interdit (montage trompeur, sortie de contexte, sujets sensibles). Un clip hors brief n'est pas payé, même s'il fait un million de vues.</p>`,
      },
      {
        titre: 'Ce que le modèle change pour toi, concrètement',
        corps: `  <p>Payé à la vue et sans sélection, ce modèle a une propriété qu'aucun autre travail créatif n'a : <strong>ton revenu est directement proportionnel à ton volume de production</strong>, à qualité constante.</p>
  <p>Écris-le comme une multiplication et tout devient clair :</p>
  <p style="text-align:center"><strong>revenu ≈ nombre de clips × vues moyennes par clip × taux ÷ 1 000</strong></p>
  <p>Le taux, tu ne le contrôles pas — il est fixé par la campagne. Les vues moyennes, tu les contrôles en partie, par la qualité du choix d'extrait et du hook. Le nombre de clips, tu le contrôles <em>entièrement</em>. C'est le seul facteur sur lequel tu as la main pleine, et c'est celui que presque tout le monde néglige au profit des deux autres.</p>
  <p>D'où la question qui précède toutes les autres : <a href="/blog/combien-de-clips-par-jour.html">combien de clips peux-tu réellement sortir en une journée</a> ?</p>`,
      },
      {
        titre: 'Les délais et les frictions de paiement',
        corps: `  <p>Trois points à vérifier avant de t'engager sur une campagne, parce qu'ils ne sont jamais mis en avant :</p>
  <ul>
    <li><strong>Le délai de vérification.</strong> Les vues sont généralement comptées sur une fenêtre fixe après publication — souvent quelques jours à quelques semaines. Les vues qui arrivent après la fenêtre ne sont pas payées, même si le clip décolle plus tard.</li>
    <li><strong>Le seuil de retrait.</strong> Beaucoup de plateformes imposent un minimum avant de verser. Tant que tu es sous le seuil, l'argent est comptabilisé mais pas versé.</li>
    <li><strong>Le moyen de paiement.</strong> Virement SEPA, PayPal, Stripe ou crypto selon les plateformes. C'est le premier point à vérifier quand on est en dehors de la zone euro.</li>
  </ul>
  <p>Ajoute à ça que ces revenus sont imposables en France dès le premier euro, quel que soit le montant. Ce n'est pas un détail à régler « plus tard » si l'activité devient régulière.</p>`,
      },
      {
        titre: 'Un ordre de grandeur, et ses limites',
        corps: `  <p>En août 2026, l'équipe du streamer américain N3on a communiqué à <em>Business Insider</em> avoir versé <strong>plus de 1,4 million de dollars à 303 clippeurs sur une seule période de cinq semaines</strong> — environ 4 620 $ par clippeur sur la période, pour un réseau d'à peu près un millier de personnes.</p>
  <p>Ce chiffre dit une chose utile et une seule : l'échelle que ces budgets peuvent atteindre quand un créateur a une audience massive. Il ne dit rien de ce que touche un clippeur francophone moyen. C'est un cas américain, sur une chaîne exceptionnelle, et la répartition derrière la moyenne est probablement très inégale — quelques clippeurs prennent l'essentiel, la longue traîne se partage les miettes. Ne construis pas un projet sur cette division.</p>
  <p>L'échéance qui compte pour le marché francophone est ailleurs, et elle est datée : la sortie de GTA 6 le 19 novembre 2026. Voir <a href="/blog/clipper-gta-6.html">clipper GTA 6</a>.</p>`,
      },
      {
        titre: 'Les cinq erreurs qui coûtent le plus cher',
        corps: `  <ol>
    <li><strong>Publier avant d'avoir lu le brief en entier.</strong> Un format de publication non accepté et la campagne entière est perdue.</li>
    <li><strong>Ouvrir un compte le jour où on rejoint la campagne.</strong> Un compte sans historique est distribué au minimum. Les comptes qui performent ont plusieurs semaines de publications derrière eux.</li>
    <li><strong>Republier le même clip sur plusieurs comptes.</strong> Détecté, non payé, et souvent sanctionné sur la plateforme de publication elle-même.</li>
    <li><strong>Miser sur un seul clip parfait.</strong> Le modèle paye le volume ; un clip travaillé pendant deux heures rapporte rarement plus que dix clips corrects.</li>
    <li><strong>Ignorer les sous-titres.</strong> L'essentiel des vues courtes se fait son coupé. Voir <a href="/blog/generer-sous-titres-automatiques.html">générer des sous-titres automatiques</a>.</li>
  </ol>`,
      },
      {
        titre: 'Par où commencer',
        corps: `  <p>Dans l'ordre, sans sauter d'étape :</p>
  <ol>
    <li>Choisir une plateforme et lire ses conditions — voir <a href="/blog/plateformes-clipping-france.html">le comparatif des plateformes de clipping francophones</a>.</li>
    <li>Ouvrir les comptes de publication <strong>maintenant</strong>, et publier dessus même sans campagne, pour leur donner de l'ancienneté.</li>
    <li>Roder la chaîne de production jusqu'à sortir dix clips en moins d'une heure.</li>
    <li>Rejoindre une campagne et publier en continu dès le premier jour, pas au milieu.</li>
  </ol>
  <p>Si tu pars de zéro sur le métier lui-même, commence par <a href="/blog/devenir-clippeur-tiktok.html">devenir clippeur</a>, puis <a href="/blog/combien-gagne-clippeur.html">combien gagne un clippeur</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Faut-il des abonnés pour rejoindre une campagne de clipping ?",
        r: "Non, en général. La plupart des plateformes de clipping rémunéré ne posent aucun minimum d'abonnés : c'est la vue vérifiée qui paie, pas la taille du compte. En revanche un compte récent sans historique de publication est désavantagé par l'algorithme de distribution, ce qui est un problème différent.",
      },
      {
        q: "Qu'est-ce qu'une vue vérifiée ?",
        r: "Une vue que la plateforme de campagne accepte de payer après filtrage. Sont généralement écartées les vues trop courtes, le trafic jugé suspect, les publications hors brief et les clips republiés à l'identique. Le compteur public de TikTok ou d'Instagram et le compteur de la campagne divergent presque toujours.",
      },
      {
        q: "Que se passe-t-il quand le budget de la campagne est épuisé ?",
        r: "La campagne ferme. Les vues générées après la fermeture ne sont plus rémunérées, même si tes clips continuent de tourner. C'est la raison pour laquelle publier dès le premier jour d'une campagne compte davantage que publier beaucoup au milieu.",
      },
      {
        q: "Combien de temps avant d'être payé ?",
        r: "Cela dépend de la plateforme : il y a d'abord une fenêtre de vérification des vues après publication, puis souvent un seuil minimum de retrait à atteindre avant tout versement. Vérifie ces deux paramètres avant de t'engager, ils ne sont jamais mis en avant.",
      },
      {
        q: "Les revenus de clipping sont-ils imposables en France ?",
        r: "Oui, dès le premier euro, quel que soit le montant. Les seuils dont on entend parler concernent la transmission automatique d'informations par les plateformes à l'administration, pas une exonération. Pour une activité régulière, renseigne-toi sur le statut de micro-entrepreneur auprès des sources officielles.",
      },
    ],
    cta: { titre: 'Produis assez de clips pour que le modèle joue en ta faveur', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'plateformes-clipping-france',
    title: 'Plateformes de clipping rémunéré en France : le comparatif 2026',
    h1: 'Plateformes de clipping rémunéré en France : le comparatif',
    description:
      "Whop, PostRoyalty, Clip.farm, NF Clipping, Reachcat : comment ces plateformes de clipping payé fonctionnent, et ce qu'il faut vérifier avant de s'inscrire.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 8,
    reponse:
      "Cinq plateformes structurent aujourd'hui le <strong>clipping rémunéré francophone</strong> : <strong>Whop</strong> (Content Rewards, la plus internationale), <strong>PostRoyalty</strong>, <strong>Clip.farm</strong>, <strong>NF Clipping</strong> et <strong>Reachcat</strong>. Toutes fonctionnent sur le même principe — budget fermé, paiement à la vue vérifiée, taux annoncé à l'avance — et se distinguent surtout sur trois points : le type d'annonceurs présents, le seuil de retrait, et le moyen de paiement. L'inscription est gratuite partout : <strong>une plateforme qui te fait payer pour accéder à ses campagnes n'est pas une plateforme de clipping</strong>.",
    sections: [
      {
        titre: 'Ce qui les différencie réellement',
        corps: `  <p>Sur le papier elles se ressemblent toutes. Les vrais écarts sont ailleurs, et voici les critères à regarder dans cet ordre.</p>
  <ul>
    <li><strong>Le vivier d'annonceurs.</strong> Une plateforme ne vaut que par les campagnes qui y tournent réellement au moment où tu t'inscris. Une interface parfaite avec trois campagnes mortes ne sert à rien. Vérifie le nombre de campagnes <em>actives</em>, pas le catalogue historique.</li>
    <li><strong>La langue du contenu source.</strong> Les grosses plateformes internationales sont majoritairement anglophones. Si tu publies pour une audience francophone, une campagne sur un créateur américain te demandera un travail de contextualisation que le taux ne compense pas toujours.</li>
    <li><strong>Le seuil de retrait et le moyen de paiement.</strong> Un seuil élevé bloque ton argent pendant des semaines. Virement SEPA, PayPal ou autre : ça détermine aussi tes frais réels.</li>
    <li><strong>La transparence du comptage.</strong> Peux-tu voir, clip par clip, combien de vues ont été validées et combien ont été écartées ? Les plateformes sérieuses le montrent.</li>
  </ul>`,
      },
      {
        titre: 'Whop — Content Rewards',
        corps: `  <p>La plus grosse en volume, et la porte d'entrée de la plupart des campagnes internationales. Le fonctionnement est celui décrit plus haut : tu rejoins une communauté de clippeurs gratuitement, les briefs de campagnes sont publiés dedans, tu coupes, tu publies sur TikTok, Reels ou Shorts, et tu es payé selon les vues qualifiées à un taux fixé par campagne.</p>
  <p>Son avantage est le choix : c'est là qu'il y a le plus de campagnes actives à tout moment. Son inconvénient pour un francophone est le même que son avantage — l'essentiel du contenu source est anglophone, et les communautés francophones dédiées y sont minoritaires même si elles existent.</p>`,
      },
      {
        titre: 'PostRoyalty',
        corps: `  <p>Positionnée explicitement sur le marché francophone, avec les deux côtés du marché : les clippeurs qui veulent être payés, et les marques qui veulent faire clipper leur contenu. Elle met en avant l'absence de minimum d'abonnés et le paiement à la vue vérifiée quelle que soit la taille du compte.</p>
  <p>C'est le positionnement le plus lisible pour quelqu'un qui démarre en France : les briefs sont en français, les annonceurs aussi.</p>`,
      },
      {
        titre: 'Clip.farm',
        corps: `  <p>Modèle au prorata : le budget de la marque est réparti entre tous les clippeurs en fonction des vues générées par chacun. C'est la version la plus explicite du budget fermé — tu ne concours pas contre un taux fixe, tu concours contre le volume des autres participants.</p>
  <p>Conséquence directe : une campagne peu fréquentée est très rentable, une campagne très fréquentée dilue. Le réflexe utile est donc de regarder combien de clippeurs sont déjà sur une campagne avant de s'y lancer, pas seulement le montant affiché.</p>`,
      },
      {
        titre: 'NF Clipping et Reachcat',
        corps: `  <p><strong>NF Clipping</strong> annonce publiquement un taux de 0,40 € pour 1 000 vues, ce qui en fait un des repères bas du marché francophone — utile comme plancher de comparaison quand une autre plateforme t'annonce un chiffre.</p>
  <p><strong>Reachcat</strong> s'est fait connaître comme plateforme de campagnes de clipping avec une approche orientée volume. Comme pour les autres, le chiffre affiché ne vaut que rapporté au nombre de campagnes réellement actives.</p>`,
      },
      {
        titre: 'Les agences, une autre porte d\'entrée',
        corps: `  <p>À côté des plateformes en libre-service, des agences françaises recrutent directement des clippeurs pour leurs clients — <em>Agence Clipping</em>, <em>Notify</em> et quelques autres. Le modèle diffère : moins de volume disponible immédiatement, mais une relation suivie, des briefs plus précis et parfois une rémunération fixe plutôt qu'à la vue.</p>
  <p>Si tu produis déjà en volume, c'est souvent plus rentable qu'une plateforme ouverte. Voir <a href="/blog/clips-pour-agences-clipping.html">produire des clips pour une agence de clipping</a>.</p>`,
      },
      {
        titre: 'Les trois signaux qui doivent te faire fuir',
        corps: `  <ol>
    <li><strong>Une inscription payante</strong>, sous quelque forme que ce soit — frais de dossier, « formation » obligatoire, abonnement pour accéder aux campagnes. Les vraies plateformes se rémunèrent sur le budget de l'annonceur, pas sur toi.</li>
    <li><strong>Un revenu garanti annoncé à l'avance.</strong> Personne ne peut garantir un volume de vues. Un taux annoncé, oui ; un revenu promis, jamais.</li>
    <li><strong>Aucun détail sur le comptage des vues.</strong> Si la plateforme ne montre pas ce qui a été validé et ce qui a été écarté, tu n'as aucun moyen de contester.</li>
  </ol>
  <p>Le reste du raisonnement — pourquoi le volume prime sur la perfection, et comment le tenir — est dans <a href="/blog/campagnes-clipping-remunerees.html">comment marche une campagne de clipping rémunérée</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Quelle plateforme de clipping choisir quand on débute en France ?",
        r: "Commence par une plateforme dont les briefs et les annonceurs sont francophones, pour éviter le travail de contextualisation d'un contenu anglophone. PostRoyalty est positionnée explicitement sur ce marché. Whop offre davantage de campagnes mais majoritairement en anglais.",
      },
      {
        q: "Faut-il payer pour s'inscrire sur une plateforme de clipping ?",
        r: "Non, jamais. Les plateformes se rémunèrent sur le budget déposé par l'annonceur. Une inscription payante, des frais de dossier ou une formation obligatoire pour accéder aux campagnes sont le signal le plus fiable qu'il ne s'agit pas d'une plateforme de clipping.",
      },
      {
        q: "Peut-on s'inscrire sur plusieurs plateformes en même temps ?",
        r: "Oui, et c'est généralement recommandé : le nombre de campagnes réellement actives varie beaucoup d'une plateforme à l'autre et d'une semaine à l'autre. Attention en revanche à ne jamais republier le même clip sur deux campagnes, ce qui est détecté et non payé.",
      },
      {
        q: "Qu'est-ce que le modèle au prorata de Clip.farm change ?",
        r: "Au lieu d'un taux fixe par millier de vues, le budget de la campagne est réparti entre tous les participants selon les vues générées par chacun. Une campagne peu fréquentée devient donc très rentable, une campagne saturée dilue. Regarde le nombre de participants, pas seulement le montant affiché.",
      },
      {
        q: "Les agences de clipping paient-elles mieux que les plateformes ?",
        r: "Souvent, pour un clippeur qui produit déjà en volume : les briefs sont plus précis, la relation est suivie et la rémunération est parfois fixe plutôt qu'à la vue. En revanche le volume de travail disponible immédiatement est plus faible qu'en libre-service.",
      },
    ],
    cta: { titre: 'Tiens le volume que ces plateformes récompensent', bouton: 'Essayer Créatis gratuitement' },
  },

  {
    slug: 'combien-paye-1000-vues-clipping',
    title: 'Combien paye 1 000 vues en clipping ? Les taux réels en 2026',
    h1: 'Combien paye 1 000 vues en clipping ?',
    description:
      "Les taux annoncés par les plateformes de clipping francophones vont de 0,40 € à 2 € pour 1 000 vues. Ce que ce chiffre recouvre, et pourquoi le revenu réel en est éloigné.",
    date: '2026-09-24',
    dateLisible: '24 septembre 2026',
    minutes: 7,
    reponse:
      "Sur le marché francophone, les plateformes de clipping annoncent publiquement des taux allant de <strong>0,40 € à 2 € pour 1 000 vues vérifiées</strong> — NF Clipping affiche 0,40 €, le haut de fourchette se trouve sur des campagnes de marques à gros budget. Ce sont des <strong>taux annoncés, pas des revenus constatés</strong> : entre le taux et ce que tu touches s'intercalent trois filtres — les vues écartées au comptage, la fenêtre de vérification, et l'épuisement du budget de la campagne. Le taux est le plafond théorique, pas la moyenne.",
    sections: [
      {
        titre: 'Ce que le chiffre annoncé recouvre',
        corps: `  <p>Un taux de 1 € pour 1 000 vues ne veut pas dire qu'un clip à 100 000 vues rapporte 100 €. Trois choses se passent entre les deux.</p>
  <h3>Les vues écartées</h3>
  <p>Les plateformes filtrent les vues trop courtes, le trafic jugé non authentique et les publications hors brief. L'écart entre le compteur public de TikTok et le compteur de la campagne est structurel, pas accidentel. Compte dessus dans ton estimation.</p>
  <h3>La fenêtre de vérification</h3>
  <p>Les vues sont généralement comptées sur une période fixe après publication. Un clip qui décolle trois semaines plus tard génère des vues réelles — mais hors fenêtre, donc non payées.</p>
  <h3>Le budget fermé</h3>
  <p>C'est le filtre le plus brutal. La campagne s'arrête quand l'enveloppe est vide, quelles que soient les vues encore à venir. Sur une campagne populaire, la cagnotte peut partir en quelques jours. Voir <a href="/blog/campagnes-clipping-remunerees.html">le mécanisme complet d'une campagne</a>.</p>`,
      },
      {
        titre: 'Pourquoi les taux varient autant',
        corps: `  <p>Un facteur 5 entre 0,40 € et 2 €, ça n'est pas du hasard. Les écarts s'expliquent par :</p>
  <ul>
    <li><strong>Le type d'annonceur.</strong> Une marque qui cherche de la notoriété paie mieux qu'un créateur qui cherche de la visibilité pour lui-même — la valeur d'une vue n'est pas la même des deux côtés.</li>
    <li><strong>L'exigence du brief.</strong> Plus les contraintes sont fortes (mention obligatoire, format imposé, sous-titres à une charte), plus le taux monte, parce que moins de clippeurs suivent.</li>
    <li><strong>La plateforme de publication demandée.</strong> Toutes ne se valent pas côté portée ni côté difficulté.</li>
    <li><strong>La rareté du contenu source.</strong> Un contenu que peu de gens peuvent clipper vaut plus cher qu'un stream public que tout le monde exploite.</li>
  </ul>
  <p>Réflexe utile : un taux très au-dessus du marché cache presque toujours une contrainte lourde dans le brief. Lis-le avant de te réjouir.</p>`,
      },
      {
        titre: 'Faire le calcul honnêtement',
        corps: `  <p>Plutôt qu'une promesse de revenu, voici la structure du calcul — remplace les valeurs par les tiennes, jamais par celles d'un témoignage.</p>
  <p style="text-align:center"><strong>revenu = clips publiés × vues moyennes validées × taux ÷ 1 000</strong></p>
  <p>Les deux inconnues sont les vues moyennes validées et le taux. Le taux, tu le lis sur la campagne. Les vues moyennes, tu ne les connais qu'après avoir publié une trentaine de clips — avant ça, toute projection est une fiction.</p>
  <p>Ce que le calcul montre, en revanche, sans aucune inconnue : le <strong>nombre de clips est le seul terme que tu multiplies librement</strong>. Doubler ta production double ton revenu à qualité constante ; améliorer un clip de 10 % ne double rien. C'est pour ça que la vraie question de métier est <a href="/blog/combien-de-clips-par-jour.html">combien de clips tu peux produire par jour</a>.</p>`,
      },
      {
        titre: 'Ce qu\'il ne faut pas croire',
        corps: `  <p>Deux affirmations circulent partout et ne tiennent pas :</p>
  <ul>
    <li><strong>« 1 à 5 $ pour 1 000 vues ».</strong> Ce chiffre est repris de site en site sans source primaire identifiable. Il ne correspond pas aux taux affichés publiquement par les plateformes francophones. Ne construis rien dessus.</li>
    <li><strong>Les moyennes tirées de gros cas.</strong> Quand une opération verse 1,4 million de dollars à 303 clippeurs, la division donne 4 620 $ chacun — mais la répartition réelle est très inégale : une poignée prend l'essentiel, la longue traîne se partage le reste. Une moyenne n'est pas une prévision.</li>
  </ul>
  <p>Pour les modèles de rémunération dans leur ensemble, au-delà du paiement à la vue, voir <a href="/blog/combien-gagne-clippeur.html">combien gagne un clippeur</a>.</p>`,
      },
      {
        titre: 'Le levier qui change vraiment le taux effectif',
        corps: `  <p>Tu ne négocies pas le CPM d'une campagne ouverte. En revanche, deux choses relèvent le revenu par clip sans toucher au taux :</p>
  <ol>
    <li><strong>Publier tôt dans la campagne</strong>, tant que le budget est plein. Le même clip vaut plus le jour 1 que le jour 9.</li>
    <li><strong>Augmenter les vues validées par clip</strong> : un hook qui tient les trois premières secondes, des sous-titres lisibles, un cadrage vertical qui ne coupe pas le sujet. Voir <a href="/blog/hook-3-secondes.html">le hook de 3 secondes</a> et <a href="/blog/pourquoi-ton-crop-9-16-est-rate.html">pourquoi ton crop 9:16 est raté</a>.</li>
  </ol>
  <p>Et pour la fenêtre de marché la plus chargée des prochains mois : <a href="/blog/clipper-gta-6.html">clipper GTA 6, sortie le 19 novembre 2026</a>.</p>`,
      },
    ],
    faq: [
      {
        q: "Combien rapporte 1 000 vues en clipping ?",
        r: "Les plateformes francophones annoncent publiquement des taux de 0,40 € à 2 € pour 1 000 vues vérifiées, selon la campagne et l'annonceur. Ce sont des taux annoncés, pas des revenus constatés : les vues écartées au comptage, la fenêtre de vérification et l'épuisement du budget réduisent le montant réellement perçu.",
      },
      {
        q: "Pourquoi mes vues TikTok ne correspondent-elles pas aux vues payées ?",
        r: "C'est structurel. Les plateformes de campagne écartent les vues trop courtes, le trafic jugé non authentique et les publications hors brief, et ne comptent que sur une fenêtre fixe après publication. L'écart entre les deux compteurs est normal et doit être anticipé.",
      },
      {
        q: "Un taux élevé est-il toujours une bonne affaire ?",
        r: "Pas nécessairement. Un taux nettement au-dessus du marché s'accompagne presque toujours d'un brief exigeant — mention obligatoire, format imposé, charte de sous-titres — qui réduit le nombre de clippeurs capables de le respecter. Lis le brief avant de juger le taux.",
      },
      {
        q: "Le chiffre de « 1 à 5 $ pour 1 000 vues » est-il fiable ?",
        r: "Non. Il circule de site en site sans source primaire identifiable et ne correspond pas aux taux affichés publiquement par les plateformes francophones. Utilise les taux annoncés sur la campagne que tu rejoins, pas des moyennes reprises ailleurs.",
      },
      {
        q: "Comment augmenter son revenu sans pouvoir négocier le taux ?",
        r: "Deux leviers : publier tôt dans la campagne, tant que le budget est plein, et augmenter les vues validées par clip via un meilleur hook, des sous-titres lisibles et un cadrage vertical qui ne coupe pas le sujet. Le troisième, et le plus efficace, reste d'augmenter le nombre de clips publiés.",
      },
    ],
    cta: { titre: 'Le volume est le seul terme que tu multiplies librement', bouton: 'Essayer Créatis gratuitement' },
  },
];
