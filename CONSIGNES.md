# CONSIGNES — à relire EN ENTIER au début de chaque session, et avant chaque publication

Ce fichier existe parce que je fais répéter les mêmes choses. Il est la source de
vérité. Si une consigne n'est pas ici, elle sera oubliée : l'ajouter au moment où
elle est donnée, pas plus tard.

**Ce fichier ne suffit pas, et c'est prouvé.** Le 28/09 j'y ai écrit que chaque
vidéo longue doit être promue par des Shorts, en la marquant « la consigne la
plus souvent oubliée » — puis j'ai publié la vidéo longue le jour même sans
faire les Shorts. Un texte ne force rien.

**Donc : toute consigne vérifiable devient une VÉRIFICATION qui refuse**, dans
`scripts/controle-avant-publication.js`, appelé par le planificateur avant
chaque publication. Il bloque sur le doublon, sur deux gabarits identiques
d'affilée, et sur une vidéo longue sans Shorts qui y renvoient. Quand une
nouvelle consigne arrive : l'écrire ici ET, si elle est contrôlable, l'ajouter
au contrôle.

**Réflexe d'ouverture de session :**
1. Lire ce fichier en entier.
2. `node scripts/tiktok-stats.js` — les vues et J'aime par publication.
3. Ouvrir l'onglet Données analytiques de TikTok — **rétention et sources de trafic**.
4. **`node scripts/apprendre.js`** — relie ce qu'on a publié à ce que ça a donné,
   et écrit `social/verdict.md`. **C'est LUI qu'on lit pour décider du contenu.**
5. `node scripts/social-brief.js` — les inscriptions attribuées (souvent nulles, voir §6).
6. Décider le contenu du jour À PARTIR du verdict, pas avant de l'avoir lu.

## 0. COMMENT LE CONTENU S'AMÉLIORE — le seul mécanisme qui marche

Je ne retiens rien d'une session à l'autre. L'amélioration ne peut donc pas
venir de ma mémoire, elle vient d'une **boucle écrite sur le disque** :

1. **Chaque pièce porte ses variables** au moment où on la produit, dans
   `social/registre.json` : `gabarit`, `accroche` (question / chiffre /
   affirmation), `son` (le nom du son posé, ou `null`), `heure`, `promeut`.
2. Le lendemain, `tiktok-stats.js` relève les chiffres et les écrit en JSON.
3. `apprendre.js` fait la **jointure** et classe chaque variable par résultat.
4. Le verdict dit quoi refaire et quoi arrêter — et **refuse de conclure sous
   trois publications par valeur**, parce qu'en dessous c'est du bruit.
5. Une publication **du jour n'entre pas dans le classement** : elle n'a pas
   fini d'accumuler ses vues. Elle est listée à part.

**Conséquence pratique : ne faire varier qu'une chose à la fois.** Changer le
gabarit ET l'accroche ET le son le même jour ne permet d'attribuer le résultat
à rien. Fixer les autres variables, bouger celle qu'on teste.

**Ce que la boucle NE voit pas encore, au 28/09 :**
- **Instagram.** La grille du profil n'affiche aucun compteur de vues —
  vérifié à la capture. Il faudrait ouvrir chaque publication, ou l'API Graph
  (jeton expiré). Tant que c'est le cas, les publications Instagram ne
  comptent pour rien dans l'apprentissage.
- **YouTube.** Pas encore relevé du tout.
- **La rétention.** On ne lit que vues et J'aime. La durée moyenne de
  visionnage est dans « Voir les données » de chaque publication TikTok, un
  clic par vidéo — pas encore automatisé.

Donc aujourd'hui la boucle n'apprend QUE sur TikTok, QUE sur les vues et les
J'aime. Ne pas prétendre le contraire.

---

## 1. LE RYTHME

- **Une publication par heure, de 8 h à 21 h, heure de Paris.** Quatorze créneaux.
- **11 h est réservé à la vidéo longue YouTube du jour.**
- Reels **et** stories.
- Comptes visés : TikTok principal + secondaire, Instagram principal + secondaire,
  YouTube. X et LinkedIn quand ils seront reconnectés.

## 2. LA VIDÉO LONGUE YOUTUBE, TOUS LES JOURS

- Format **16:9**, 30 s à 1 min. Pensée pour un écran d'ordinateur, pas un téléphone :
  plein cadre, zoom qui désigne, texte en tiers inférieur, titre 48 px / corps 30 px.
- Elle **apprend aux gens à faire du clipping avec Créatis, du début à la fin** :
  prendre une vidéo sur YouTube, la mettre dans Créatis, générer les clips, publier.
- **CHAQUE vidéo longue doit être PROMUE par des Shorts qui y renvoient**, publiés
  sur toutes les plateformes. Pas un seul : plusieurs, chacun sur un temps différent
  de la vidéo longue. C'est la consigne la plus souvent oubliée.

## 3. LE CONTENU DOIT APPRENDRE

- **Donner de la valeur. Apprendre quelque chose aux gens.**
- Test sévère : si le spectateur peut appliquer la leçon SANS l'outil, il y a de la
  valeur. Sinon c'est une réclame déguisée.
- Mesuré le 28/09 : sur 41 publications TikTok, **toute légende qui VEND est au
  niveau ou sous la médiane**. « Le clipping en 3 étapes simple » → 6 vues.
  Les dix meilleures n'ont aucune légende commerciale.

## 2 bis. UNE HEURE ENTRE DEUX PUBLICATIONS, ET MONTRER PLUTÔT QU'AFFIRMER

**Espacement.** Au moins une heure entre deux publications sur un même compte.
Consigne du 28/09, après que j'ai envoyé quatre pièces en quelques minutes.
Deux vidéos coup sur coup se cannibalisent, et le compte ressemble à un robot.
C'est contrôlé par `controle-avant-publication.js`, qui BLOQUE sous une heure.

**Valeur.** Les pièces du 28/09 énonçaient : « un clip qui marche ne montre pas
tout », « tu as trois secondes ». Ce sont des SLOGANS. Le spectateur n'y apprend
rien qu'il puisse faire, et il part.

Le test : **est-ce que la vidéo MONTRE, ou est-ce qu'elle AFFIRME ?** Une
affirmation ne vaut rien. Il faut un mécanisme visible, un chiffre, une échelle,
un avant-après — quelque chose que le spectateur puisse refaire.

Le gabarit `Mecanique` est né de là : motion design intégral, zéro capture
d'écran, qui montre la vidéo longue, le balayage de la transcription, les
moments notés, le basculement 16:9 → 9:16 et les sous-titres. On comprend
en regardant. Il porte aussi l'échelle (règle 0:00 → 47:00) et le compte
chiffré, parce que sans échelle on ne sait pas de quoi on parle.

## 3 ter. CE QUI MARCHE VRAIMENT SUR CE COMPTE — relevé le 28/09

Comparaison des vignettes, vues à l'appui :

| Vues | Ce que montre l'image d'ouverture |
|---|---|
| **1 229** | Gros plan d'un visage, **GTA 6**. « Ce que Rockstar a montré » |
| **1 228** | Une voiture dans Vice City, **GTA 6**. « GTA 6 — la route de Vice City » |
| 99 | Un couple avec un téléphone, plein cadre (gabarit ShortPleinCadre) |
| 58 | Fond noir, texte centré, capture de l'app (gabarit LeTri) |
| 54 | Fond noir, texte centré, capture de l'app (gabarit LeTri) |

**Trois leçons, dans l'ordre d'importance :**

1. **Le SUJET pèse plus que le gabarit.** Les deux meilleures ne parlent pas de
   Créatis : elles parlent de GTA 6. Un sujet à forte demande porte la vidéo,
   quel que soit son habillage. Facteur douze entre les deux extrêmes.
2. **Image pleine, colorée, avec un visage ou du mouvement.** Les deux
   meilleures remplissent le cadre d'une scène. Mes fonds noirs à texte centré
   sont à 54-58 vues — le plein cadre à 99, soit deux fois mieux. C'est le
   premier signal exploitable, et il valide le gabarit `ShortPleinCadre`.
3. **Texte court en haut, deux lignes maximum**, pas un paragraphe centré.

**Conséquence : arrêter les fonds noirs à texte centré.** Et chercher des
sujets qui ont une demande propre, où Créatis n'est que l'outil montré en
passant — pas le sujet.

## 3 bis. VISUELLEMENT DIFFÉRENT, PAS SEULEMENT TEXTUELLEMENT

Consigne du 28/09 : **les publications doivent être différentes AUSSI à l'œil.**

Le défaut constaté : `LeTri` et `ShortVersYouTube` se ressemblent trait pour
trait — fond noir, texte blanc centré, une carte avec la capture de l'app. Deux
publications d'affilée sur le même compte donnaient l'impression d'une seule
vidéo répétée, et une grille de profil où tout se ressemble ne donne aucune
raison de cliquer sur la deuxième vignette.

**Règle : alterner les gabarits, jamais deux fois le même d'affilée.**
Gabarits disponibles :
- `ShortPleinCadre` — le clip occupe tout le cadre, texte en haut à gauche,
  aucune carte. L'aspect change tous les jours puisque le clip change.
- `LeTri` — fond sombre, carte de l'app, chiffres en typographie.
- `ShortVersYouTube` — leçon, démonstration, renvoi.

Avant de rendre une pièce : regarder la vignette de la PRÉCÉDENTE. Si les deux
se ressemblent, changer de gabarit ou de fond.

## 4. JAMAIS DEUX FOIS LE MÊME CONTENU

- Contenu **neuf chaque jour**, choisi après analyse de la veille.
- `creatis-videos/out/` est l'**archive du déjà publié**, PAS du stock.
- Vérifier le compte AVANT de publier :
  - `node scripts/youtube-deja-publie.js --titre "..."` (code 3 = déjà publié)
  - `node scripts/instagram-deja-publie.js --cdp`
  - `node scripts/tiktok-stats.js`
- Une même pièce peut viser plusieurs COMPTES (publics différents), jamais deux fois
  le même compte.
- Un créneau sans pièce prête reste **vide**. On ne recycle pas.

## 5. LE SON — RÈGLE CORRIGÉE LE 28/09

**L'ancienne règle était : livrer muet, le son tendance sera posé dans l'app.**
Elle est **abandonnée**. Elle ne tenait pas : les vidéos partaient muettes et le son
n'était jamais ajouté.

Preuve chiffrée, onglet Données analytiques TikTok, 7 jours :
- source de trafic **« Son » : 0 %**
- vues **−74,8 %**, J'aime **−81,5 %**

Une vidéo muette sur TikTok ou Reels est morte : pas de page de son, pas de
recommandation par le son, et le spectateur passe.

**Règle : on prend les sons TENDANCE, sur TikTok et sur Instagram.** Pas une
musique libre de droits générique — un son tendance met la vidéo sur la page de
ce son, ce qui est une source de trafic à part entière (celle qui est à 0 %).
Le son se choisit DANS l'outil de publication de chaque plateforme, au moment de
l'envoi, pas au montage : c'est là que la bibliothèque des tendances est offerte.

Corollaire de montage : quand une pièce porte une voix off, elle reste montée
pour qu'un son puisse passer dessous — voix claire, pas de silence total, et
niveau laissé bas.

## 6. CE QUE DIT LA MESURE, ET OÙ LA CHERCHER

- `social-brief.js` mesure les VISITES du site attribuées à un réseau. Sur TikTok ce
  chiffre est **structurellement nul sous 1 000 abonnés** : le lien de la bio n'est
  pas cliquable. En conclure « TikTok ne marche pas » est une **erreur de lecture**.
- La donnée qui compte est chez la plateforme : **rétention, durée moyenne de
  visionnage, sources de trafic**. Pas les vues seules.
- Référence au 28/09 : TikTok médiane 313 vues, meilleures 780–860.
  Instagram @andre.creatis 71 publications / 92 abonnés. YouTube 9 abonnés.
- **Le compte TikTok est `andre.ai26` — 8 abonnés. C'est un CHOIX, tranché le
  28/09 : on garde ce compte.** Ne plus proposer de basculer sur celui à 500
  abonnés. Le petit nombre d'abonnés n'est d'ailleurs pas le frein — 99 % des
  vues viennent de « Pour toi », pas des abonnés.

## 7. LES SOURCES DE CLIPS

- **Divertissement uniquement** : Amixem, Squeezie, podcasts, défis.
- **JAMAIS** politique, actualité, enquête — même si l'image est bonne.
- Source différente chaque jour, pour que les vidéos ne se ressemblent pas.

## 8. FORME

- Tout en **français**, y compris mes réponses.
- Thème sombre : fond `#0a0f0a`, accent `#10b981`.
- Zones sûres 9:16 : 0–16 % barre d'état, 16–78 % zone libre, >78 % légende et
  bandeau musical, colonne de droite x>78 % pour y entre 45 % et 88 %.
- **La première image devient la couverture** : elle doit être lisible dès l'image
  zéro, jamais un fondu depuis le noir.
- Instagram : flux « Publication » → étape **Rogner** → sélectionner **« Original »**,
  sinon le 9:16 part en carré.

## 9. LES PIÈGES DÉJÀ PAYÉS — ne pas les repayer

- Les **repères** de `enregistrer-parcours.mjs` se posent quand le sélecteur entre
  dans le DOM, pas quand l'écran est peint. Écart mesuré : 12 s, puis 6 s. **Toujours
  relever les vrais temps sur une planche contact** avant de monter.
- Playwright rend du **VP8** : transcoder en H.264 (`-g 25 -sc_threshold 0`) avant
  tout montage segmenté, sinon le rendu n'aboutit pas.
- Remotion ne lance plus Chrome quand la machine en a déjà 40 : `--concurrency=1`.
- **ffmpeg écrit `volumedetect` sur STDERR, jamais sur stdout.** Lire stdout rend
  une chaîne vide, donc « pas de son », donc un morceau tendance par-dessus une
  voix off. Payé deux fois : le film de lancement, puis la commande vocale du
  01/10. Utiliser `spawnSync` (qui rend les deux flux), pas `execFileSync`.
- **Ne JAMAIS appeler le contrôle dans un tube.** Le code de sortie d'un tube
  est celui de sa derniere commande : `controle... | tail -3 && publier...`
  voyait toujours un succes, meme quand le controle ecrivait « NE PAS
  PUBLIER ». Pendant quatre jours le garde-fou n'a donc rien garde dans mes
  propres lignes de commande. Passer par **`node scripts/publier.js`**, qui
  enchaine controle -> publication -> inscription sans trou possible.
- **La retention se lit dans Studio** (`node scripts/youtube-retention.js`) :
  « Ont continue de regarder » et « Duree moyenne d'une vue ». Mesure du
  04/10 : 9,9 % seulement passent la premiere seconde, mais ceux qui restent
  voient 79 % du film. Le montage tient, c'est l'OUVERTURE qui perd. D'ou la
  regle : **ouvrir sur le resultat, expliquer ensuite**. Studio n'affiche rien
  sous ~100 vues : ne pas lire zero la ou il n'y a rien.
- **Un plan ne tombe JAMAIS sur un écran d'attente** (« Téléchargement du
  clip… », « Analyse en cours »). Le dernier plan surtout : il porte la
  récompense, il doit montrer le résultat fini qui joue. Contrôlé par
  `scripts/controle-fin-de-film.js` sur les fenêtres relevées pendant le
  tournage. `freezedetect` ne sert à rien ici : un écran d'attente bouge
  (spinner), et la grille de résultats est immobile parce qu'on la lit.
  → L'enregistrement doit durer **jusqu'à ce que le résultat s'affiche**.
- **Pour filmer le clip fini** : interroger `#modal-video` et `#modal-player-ph`,
  puis CLIQUER sur `#modal-play-overlay` — le clip ne démarre pas seul.
  `document.querySelector("video")` rend l'aperçu 16:9 de l'accueil, déjà
  chargé : il a fait perdre deux tournages le 01/10. Le téléchargement prend
  ~25 s, prévoir plusieurs minutes d'attente. Le dernier plan se monte à
  **vitesse réelle** : des sous-titres accélérés ne se lisent pas.
- **Deux publications du même gabarit d'affilée sont admises si la SOURCE
  change** (décision du 02/10 : « tu montres la commande vocale, comme on a
  fait avant »). Ce qui est interdit, c'est le même gabarit ET la même source.
- **La musique démarre à la frame où la voix se tait**, sur un impact. Pas de
  silence après une commande vocale : ça vide le montage. Mesurer la durée
  réelle du fichier de voix, ne pas l'estimer.
- **TikTok ne permet pas de changer le son après publication.** Vérifier le niveau
  AVANT d'envoyer : au-dessus de −45 dB, la vidéo porte déjà sa bande-son, on
  n'ajoute rien.
- Juger une session sur un **marqueur POSITIF**, jamais sur l'absence de bouton de
  connexion — une page blanche n'en a pas non plus.
- TikTok/Instagram empilent des modales : boucler jusqu'à ce qu'un tour ne ferme rien.

## 10. CE QUI RESTE BLOQUÉ SUR L'UTILISATEUR

- **Armer les tâches planifiées** : voir `ARMER-LA-PUBLICATION.txt`. Je ne peux pas
  le faire, le contrôle de permissions refuse (à juste titre).
- **Régénérer `META_ACCESS_TOKEN`** (expiré) avec `instagram_basic` +
  `instagram_content_publish` + `pages_show_list`.

  **Sans lui, pas de stories du tout.** Quatre chemins navigateur testés le
  28/09, tous négatifs : menu « Créer » du bureau (ne propose que Publication),
  `/create/story/` (redirige vers l'accueil), `/stories/create/` (tombe sur un
  profil nommé « create »), et l'anneau « Votre Story » en émulation mobile
  (aucune création ne s'ouvre). Instagram réserve la publication de stories à
  son application native et à l'API Graph. Ce n'est pas contournable depuis
  Chrome — arrêter de chercher de ce côté.
- **Supprimer le Reel carré** `DdOfSvAIXEZ` du 28/09 et les 2 doublons TikTok du 27/09.
- **Recharger Together AI** (402 depuis le 15/09).
