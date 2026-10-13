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
- **LES QUATRE ERREURS QUI TUENT UNE VIDEO DE SaaS** (methode relevee le 07/10
  dans < Personne ne veut de ton SaaS >, Leo Grindarss — structure des
  chapitres et description ; le script integral n a pas pu etre extrait).
  Les quatre decrivent exactement ce que je produisais :
    1. LE PRODUIT EST LE SUJET. Mes films montrent l interface, la commande,
       la grille. Le sujet doit etre le PROBLEME DU SPECTATEUR ; l outil
       n apparait qu en passant.
    2. ON PROMET CE QUE FAIT L OUTIL, PAS CE QU IL FAIT GAGNER. < dix clips
       notes, recadres, sous-titres > est une fonction. Le gain, c est la
       soiree recuperee, les trente clips de la semaine, les vues.
    3. ON MONTRE LA FEATURE AU LIEU DU RESULTAT. La commande vocale et la
       grille sont des features. Le resultat, c est le clip fini qui tourne.
    4. ON DEVOILE TOUT D UN COUP. Treize secondes qui deroulent tout le
       processus ne laissent rien a vouloir. Garder une part hors champ.
- **LE HOOK PARLE DU SPECTATEUR, PAS DE NOUS.** Releve le 06/10 sur six Shorts
  de 3,3 a 20 MILLIONS de vues : TROIS n ont aucun visage — ils montrent des
  MAINS en train de faire quelque chose, en gros plan. Le visage n est donc pas
  la variable, et ma conclusion de la veille etait fausse.
  Ce qu ils ont tous : un texte qui nomme la SITUATION DU SPECTATEUR, a la
  deuxieme personne.
      < quand t es dans un endroit ou t as pas de reseau >
      < Voici ce qu il faut faire si ton smartphone prend l eau >
      < 3 outils IA GRATUITS que personne n utilise >
  Les miens disaient < Ce clip n existait pas il y a 3 minutes >, < J ai change
  une seule chose > : je parlais de moi et d un logiciel.
  REGLE : le hook contient < tu >, < ton >, ou un probleme que la personne
  reconnait. Jamais < je > ni le nom du produit.
- **LE PLAFOND A 300 VUES, ET CE QUI LE DEPASSE.** Releve le 06/10 en ouvrant
  enfin les Shorts de la chaine qui depassent mille vues :
    1 967 — un VISAGE en gros plan, webcam, expression marquee, avec DEUX
            LIGNES DE TEXTE ENORMES par-dessus des la premiere image ;
    1 332 — un montage sportif avec un badge rouge, lisible en 1/2 seconde.
  Les miens plafonnaient a 330 en ouvrant sur une interface, legende discrete
  a mi-hauteur. Deux leviers :
    1. UN VISAGE en premiere image — demande de filmer le proprietaire de la
       chaine, je ne peux pas le fabriquer. C'est le plus gros levier.
    2. Une ACCROCHE enorme et haute des la premiere image (reglage `accroche`
       du gabarit Vocal, 96 px a 22 % du haut). Celui-la est a ma portee.
- **Les reperes du tournage peuvent DECROCHER du fichier.** Le 06/10 les
  reperes allaient a 226,6 s pour un fichier de 203,2 s : Playwright avait
  perdu les 23 PREMIERES secondes. Comparer la duree du fichier au dernier
  repere, et relever sur planche contact des qu'ils divergent.
- **Normaliser le son du clip** a l extraction :
  `ffmpeg -i clip-X.mp4 -vn -af "loudnorm=I=-16:TP=-1.5:LRA=11" son-clip-X.mp3`.
  Le 06/10 un clip sortait a -24 dB de moyenne : sur un film qui mise tout sur
  sa premiere seconde, l ouverture etait inaudible. Pousser le gain saturerait
  (crete a -1,4 dB) ; loudnorm amene a -19 dB sans ecreter.
- **Le format long doit MONTRER, pas seulement dire.** Chaque point expliqué
  s'illustre avec du matériau réel : une forme d'onde avec les silences
  marqués, un clip qui joue, la grille des notes, une capture de Studio. Les
  diapos de texte enchaînées sur une voix off, c'est « tout plat, tout doux »
  (04/10) — et c'est ce que je produis par défaut si je n'y prends pas garde.
  Le matériau existe : neuf tournages, leurs grilles, leurs clips avec son.
- **La legende se pose entre 45 et 65 % de la hauteur**, jamais plus bas.
  Mesure du 04/10 sur une capture reelle : la ligne du pseudo commence a 84 %,
  la colonne de boutons monte jusqu a 53 %, et les sous-titres incrustes du
  clip sont a 65 %. Une legende a 78 % est recouverte sans qu on le voie.
  Marges laterales de 170 px : la colonne de boutons ET le rognage 19,5:9.
- **Le clip d ouverture decide de tout.** Depuis que le film ouvre sur le
  resultat, un clip sombre, granuleux ou au sous-titre grossier annule la
  correction. Deux tournages jetes le 04/10 pour cette raison (vision nocturne,
  sequence veterinaire). Regarder la planche contact du clip AVANT de monter.
- **Gemini TTS refuse certains noms** (`PROHIBITED_CONTENT`, faux positif).
  Changer de chaine plutot que de chercher la cause.
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

## Le plafond des 300 vues est franchi — ce qui l'a franchi (08/10)

`resultat-seul`, publié le 07/10 à 9 h : **361 vues à 14 h, 1 207 le lendemain**.
Les précédents plafonnaient à 232. C'est le premier film de la série qui ne
montre **ni interface, ni commande vocale, ni grille de notes** : rien que des
clips finis, un texte qui nomme le problème du spectateur, et `creatis.app` sur
la dernière seconde.

Ce qu'on garde de ce gabarit, et qu'on ne négocie plus :
- quatre ou cinq plans, **13 à 14 secondes**. La rétention mesurée le 08/10 le
  confirme : médiane de 55 % de la vidéo regardée, et le seul 100 % de la chaîne
  est un Short de 13 s ;
- le texte **en haut** (7 % de la hauteur), pas dans la bande basse ;
- chaque plan porte **le son de son propre clip** ;
- le produit n'est jamais le sujet ; il est la réponse, et elle vient à la fin.

## TikTok plafonne à 250 vues quel que soit le contenu (08/10)

Relevé sur les huit dernières publications : **241, 247, 251, 254, 259, 263, 263**.
Un contenu qui fait ×5 sur YouTube ne bouge pas d'un pour cent sur TikTok. En
revanche l'engagement, lui, suit : 10 j'aime sur `resultat-seul` contre 0 à 6.

Conséquence pratique : **ne jamais juger un changement de forme sur TikTok**. La
mesure se lit sur YouTube, où le compteur réagit.

## Le format long ne marche pas sur cette chaîne, et c'est mesuré (08/10)

Neuf vidéos 16:9 publiées, **1 à 6 vues chacune**, miniature soignée ou non.
Elles continuent parce qu'elles sont demandées et qu'elles coûtent peu une fois
la narration écrite — mais aucune décision ne doit s'appuyer sur leurs chiffres,
et on ne leur sacrifie jamais le Short du jour.

## Vérifier les secondes AVANT de monter (08/10)

Trois plans sur cinq du premier montage du jour étaient inutilisables : écran
« Téléchargement du clip… », triptyque de gameplay, image floue de mouvement.
Rien de tout cela ne se voit dans le code.

Le geste : extraire les secondes candidates au ffmpeg, **déjà recadrées**, les
assembler en planche, les REGARDER.

```sh
ffmpeg -ss <t> -i public/rec-<x>-h264.mp4 \
  -vf "crop=540:980:150:300,scale=190:-1,drawtext=text='<x> <t>'..." -frames:v 1 ...
ffmpeg -i pr-%02d.png -vf "tile=8x2" -frames:v 1 sonde.png
```

Et `tile` n'accepte pas `-pattern_type glob` sur la build Windows : numéroter
les fichiers `pr-01.png`, `pr-02.png`…

## Cadrer une image dans Remotion : l'échelle est un MAXIMUM

Pour faire **remplir** un cadre, `e = Math.max(l/cl, h/ch)`. Avec `Math.min` on
obtient un « contain » : l'interface de l'app reste dans le champ, ce qui est
exactement ce qu'on cherchait à faire sortir. `CarteClip` utilise `min` à
dessein (vignette entière visible) — ne pas copier son calcul pour un fond.

Et pour une miniature, ne pas piloter le cadrage depuis Remotion : extraire
l'image **déjà coupée** au ffmpeg et la poser en `<Img>`. Une image coupée ne
peut pas se décadrer.

## Chrome CDP : on peut l'ouvrir soi-même

Instagram exige un Chrome branché sur le port 9222. Le profil dédié existe :

```sh
"/c/Program Files/Google/Chrome/Application/chrome.exe" \
  --remote-debugging-port=9222 \
  --user-data-dir="C:\Users\Utilisateur\Desktop\creatis\.chrome-social" \
  --no-first-run about:blank &
```

Le Chrome personnel de l'utilisateur peut rester ouvert : les profils sont
distincts. Ne plus déclarer Instagram « bloqué » sans avoir tenté ça.

## Format long : la cause est le TAUX DE CLIC, pas la distribution (08/10)

Pendant quatre jours j'ai refait des miniatures en croyant que YouTube ne
montrait pas les vidéos. Mesure faite, c'est l'inverse.

| Impressions | Clics | Vues | Titre |
|---|---|---|---|
| 1 537 | **0,5 %** | 14 | Transformer une vidéo YouTube en Short avec l'IA |
| 1 100 | **0,6 %** | 31 | Créatis — transforme tes vidéos longues en clips |
| 396 | **0,8 %** | 6 | Noter un clip sur 100 |
| 195 | 0,5 % | 3 | Découper une vidéo longue en Shorts |
| 64 | 1,6 % | 3 | J'ai changé une seule chose |
| 11 · 10 · 5 · 2 | ~0 % | 2–3 | les quatre dernières |

La zone saine est 4–6 %. Sous 2 %, YouTube coupe la distribution : d'où
l'effondrement de 1 537 à 2 impressions. C'est une spirale, pas un plafond.

**Deux conséquences, contre ce que je croyais :**

1. **Les quatre miniatures refaites n'ont jamais été testées.** Elles sont
   arrivées sur des vidéos déjà tombées à 5–11 impressions. J'ai conclu
   « ça ne marche pas » sur un échantillon vide — la même faute que le
   compteur illisible rendu à zéro le 05/10.
2. **Nos titres n'étaient pas des requêtes.** Le seul qui en était une
   (« Transformer une vidéo YouTube en Short ») a reçu le plus d'impressions
   de toute la chaîne. À dix abonnés il n'y a pas de fil d'accueil : les
   impressions viennent de la RECHERCHE, et rien d'autre.

**Ce qui change, désormais :**
- le titre reprend une requête réelle, relevée dans les suggestions YouTube
  (`scratchpad/suggest.js`, l'autocomplétion est gratuite et sans clé) ;
- la miniature **montre la transformation** au lieu de proclamer. Une vignette
  de fil d'accueil (« CE CLIP EST MORT ») ne gagne pas un résultat de
  recherche : là, on clique sur ce qu'on est venu chercher ;
- on juge sur le **taux de clic**, pas sur les vues. Référence à battre : 0,5 %.

### Où lire le chiffre

L'onglet « Couverture » de Studio s'affiche **entièrement vide** sous un certain
volume — pas un zéro, rien. Le chiffre vit derrière le bouton **Mode avancé**,
qu'il faut CLIQUER (l'URL `…/explore` rend une page blanche) :
`node scripts/youtube-couverture.js --ids a,b,c`

## Ne jamais lancer deux travaux Playwright sur le même profil (08/10)

La vidéo longue n'est pas partie : mes relevés analytiques tournaient en fond
sur `.playwright-profile-social` et l'ont verrouillé. Message :
« Target page, context or browser has been closed ».
Relevés et publications s'enchaînent, ils ne se chevauchent pas.

## `public/` fait 3,1 Go et Remotion le recopie à chaque rendu (08/10)

Symptôme : « Timed out after 30000ms while setting up the headless browser »,
précédé de « Copying public dir 3.2 GB ». Le navigateur n'est pas en cause.

Le geste : un dossier réduit aux seuls fichiers du film, puis
`npx remotion render <id> <sortie> --public-dir=public-mince`.
114 Mo au lieu de 3,1 Go, et le rendu passe.

## Écrire aux gens : ce qui existe, et ce qui n'existe pas (08/10)

Vérifié plateforme par plateforme, pas supposé :

| | Liste de ceux qui aiment | Message privé | Réponse en commentaire |
|---|---|---|---|
| Instagram | **non** sur le web (voir ci-dessous) | oui | oui |
| TikTok | non | seulement entre comptes liés | oui |
| YouTube | **non** | **n'existe pas** | oui |

« Qui a regardé » n'existe nulle part. Ne jamais le promettre.

**Instagram ne donne pas la liste des J'aime d'un reel** : `/p/<id>/liked_by/`
ne rend plus de boîte de dialogue et le compteur n'est pas cliquable. La seule
source de pseudos réels est le **flux d'activité**
(`instagram.com/accounts/activity/`), où les lots sont agrégés (« X, Y et 27
autres personnes ») — on tient donc une PARTIE des gens, et on le dit.

### La chaîne d'outils

```sh
node scripts/destinataires.js      # qui s'est manifesté → social/destinataires.json
node scripts/ecrire.js             # ESSAI À BLANC : montre les textes
node scripts/ecrire.js --envoyer   # 5 par jour, 45-110 s d'écart
node scripts/reponses.js           # quelle variante fait répondre
node scripts/repondre.js --reseau youtube --envoyer
```

### Les garde-fous, et pourquoi ils sont là

- **Cinq messages par jour, plafond en dur.** Instagram coupe l'envoi pendant
  des jours aux comptes qui écrivent en rafale à des non-abonnés. Sur un compte
  à 92 abonnés, un blocage coûte plus que trente messages ne rapportent.
- **Personne n'est écrit deux fois**, jamais (`ecrit_le`).
- **On ne coche « envoyé » que si le texte est VISIBLE dans la discussion.**
  Au premier essai le témoin était pris dans la ligne du pseudo, qui contient
  un émoji : Instagram le rend en nœuds séparés, `innerText` insérait des
  espaces, et le script a dit « non envoyé » alors que le message était parti.
  Un relancement l'aurait envoyé deux fois. Témoin dans une ligne de texte NU,
  comparaison à espaces écrasés.
- **Un pseudo introuvable est marqué, jamais remplacé par un approchant.**
  `no.e_brn` n'existe plus ; la recherche propose `noe__brn_`, `noebrnt`… leur
  écrire serait écrire à des inconnus.

### Par où on envoie, et pas par où on croyait

Le profil n'offre un bouton de message **que si la personne nous suit déjà** :
sur quatre comptes testés, aucun n'en avait, et le script concluait « compte
privé » à tort. Le bon chemin est `instagram.com/direct/new/` → recherche →
clic sur le pseudo exact : le fil s'ouvre directement.

### Le test A/B/C

Trois variantes, une hypothèse chacune, tourniquet sur la file :
- **A — méthode** : le test des 10 secondes, Créatis en incise.
- **B — question courte** : trois lignes, aucune méthode, aucun produit.
- **C — preuve chiffrée** : 48 → 1 207, et les trois causes en échange d'un oui.

Constantes : tutoiement, aucun lien, une question à la fin. `reponses.js`
compte les réponses par variante — et rappelle que sous une quinzaine d'envois
un écart d'une ou deux réponses ne départage rien.

### Les commentaires

Le champ de réponse de Studio est un `textarea#textarea` (placeholder
« Ajouter une réponse… »), **pas** un `contenteditable` : chercher un
contenteditable rendait « champ introuvable » alors que le champ était ouvert.
Le bouton d'envoi porte le même libellé que celui qui ouvre le champ — viser
`#submit-button`.

Règle du lien : jamais dans un message privé, **mais toujours quand on le
demande**. « Le site pour avoir les 10 clips » appelle `creatis.app`, pas une
méthode. La condition est volontairement étroite : « ton outil est nul »
contient « outil » sans rien demander.

## Les zones d'interface, mesurées sur une vraie capture (08/10)

Relevé sur une capture YouTube Shorts, iPhone 1179×2556, fournie par
l'utilisateur. La légende posée à **7 % de la hauteur passait dans la rangée
d'icônes de YouTube** — flèche retour, loupe, menu. La deuxième ligne
disparaissait derrière la loupe.

Les trois zones que les plateformes occupent :

| Zone | Bande | Ce qu'il y a |
|---|---|---|
| Haut | 0 → 14 % | retour, recherche, menu |
| Droite | 49 → 89 % | J'aime, commenter, partager, remixer |
| Bas | 66 → 92 % | nom de chaîne, légende, vues, bouton Partager |

**La bande libre est 14 → 48 %.** La légende se pose à **30 %** : sous toute
barre d'outils, au-dessus de la colonne de boutons, et à hauteur des yeux sur
un plan serré — ce qui était la demande du 05/10. L'adresse `creatis.app` va à
40 %, jamais en bas.

### Un fond, pas un voile

Le dégradé plein cadre éclaircissait toute l'image sans jamais garantir le
contraste sous le texte. Un **panneau sombre arrondi** (`rgba(0,0,0,0.70)`,
rayon 26, padding 26/34) qui épouse le bloc le garantit sur n'importe quelle
image. Le cerne noir reste par-dessus pour les débordements.

Même traitement pour `creatis.app` : en vert sur une chemise claire, l'adresse
était illisible — vérifié sur l'image de fin avant publication.

### Le contrôle visuel qui prouve que c'est bon

Avant de publier, superposer les trois zones sur une image du film :

```sh
ffmpeg -ss 1.5 -i out/<film>.mp4 -vf \
 "drawbox=x=0:y=0:w=1080:h=269:color=red@0.35:t=fill,\
  drawbox=x=886:y=941:w=194:h=768:color=red@0.35:t=fill,\
  drawbox=x=0:y=1267:w=1080:h=499:color=red@0.35:t=fill" -frames:v 1 zones.png
```

Si du texte touche une bande rouge, il sera recouvert sur le téléphone.

## Le format long devient un TUTORIEL (08/10)

Consigne du 08/10 : arrêter de commenter nos propres statistiques, **apprendre
un métier**. Exemple donné : comment se faire rémunérer en clipping — montrer
Whop, montrer le site, montrer le rendu, avec des enregistrements d'écran
« comme si c'était moi qui présentais sur mon ordinateur ».

### Ce que ça change concrètement

- **Le titre est une requête**, relevée dans l'autocomplétion YouTube
  (`scratchpad/suggest.js`). « gagner de l'argent avec le clipping » en est
  une. Les neuf vidéos précédentes avaient des titres-affirmations et 0,5 % de
  clics.
- **Des enregistrements d'écran réels**, en 16:9 : `enregistrer-tuto.mjs`
  (`--whop` ou `--creatis <url>`). Il filme en 1920×1080 et écrit ses repères.
- **Le film enseigne d'abord, l'outil arrive à la fin** comme réponse au
  goulot nommé (produire le volume), jamais comme sujet.

### La règle sur ce qu'on filme

On ne filme QUE ce qu'on a réellement ouvert. Les campagnes Whop sont derrière
un compte ; créer un compte sur un service tiers n'est pas une décision à
prendre seul. Les chiffres des campagnes sont donc **affichés et attribués**,
pas mis en scène comme une capture. Filmer une interface qu'on n'a pas ouverte
serait une démonstration fabriquée — exactement ce qu'on reproche aux autres.

### Montrer une attente de deux minutes en seize secondes

L'enregistrement complet du parcours dure 3 min 57, dont 2 min 40 d'analyse.
On ne montre pas l'attente, mais on ne la masque pas : **trois plans étiquetés**
(1 — on colle le lien · 2 — dix passages notés · 3 — le clip fini), et le
dernier est le clip qui TOURNE, jamais l'écran « Téléchargement du clip ».
Secondes utiles de ce tournage : lien 10-16 s, grille 174-186 s, clip fini
213-236 s.

### Les chiffres du clipping rémunéré, relevés le 08/10

| | |
|---|---|
| Versé sur Whop | 4,6 milliards $ (lu à l'écran) |
| Tarif | 0,20 $ à 6 $ pour 1 000 vues, moyenne ≈ 1 $ |
| Roobet | 1,50 $/1 000, budget 250 000 $ |
| Mutuum | 6 $/1 000 |
| Minimum d'abonnés | aucun |
| Frais plateforme | ~10 % + traitement du paiement |

Source des tarifs : relevés publics openclip.app et findclout.com, 2026.
**L'arithmétique se dit en entier** : à 1 $ les mille, un million de vues fait
mille dollars, et notre meilleur Short de la semaine (1 207 vues) vaut 1,20 $.
Cacher ça ferait une vidéo de plus qui promet de l'argent facile.

## Le son doit venir de ce qu'on voit (08/10)

Faute commise le 08/10 : le Short « Tu veux être payé en clipping » est parti
avec, en fond, la bande-son d'un clip de Koh-Lanta. On entendait parler de
coffres et de bateaux sur des images de Whop et d'une grille de clips. J'avais
posé un `son-clip-*.mp3` juste pour que le film ne soit pas muet.

**Le son d'un clip n'a de sens que si CE clip est à l'image.** Dès que les
images ne sont pas celles du clip — captures d'écran, typographie, graphiques —
il faut une **voix off qui parle de ce qu'on voit**. Jamais un fond sonore
emprunté à autre chose.

Le contrôle le refuse désormais (`controle-avant-publication.js`) : il lit le
composant du gabarit, et si un `son-clip-X.mp3` y est posé sans qu'un `rec-X`
apparaisse dans le même fichier, il sort en code 5.

```
✖ ShortClipping : le son du clip « domingo » est posé sans que ce clip soit à
  l'image. Mettre une voix off qui parle de ce qu'on voit, ou retirer ce son.
```

Vérifié sans faux positif sur ResultatSeul2/3, ZeroVues, Clipping, Autonomie
et QuatreErreurs, où chaque son de clip accompagne bien son enregistrement.

## Les sous-titres incrustés du clip doivent sortir du champ (09/10)

Relevé sur une capture TikTok : les sous-titres **du clip source** occupent
86 à 96 % du cadre utile. Repris en entier, ils tombent à 82 % de la hauteur
du film — pile sous le pseudo, la légende et la ligne de musique de la
plateforme. Trois couches de texte superposées, illisibles.

On ne peut pas les remonter : ils sont au bas du clip, et les amener en zone
sûre (14-48 %) demanderait un zoom de quatre fois. **On les sort du champ** :
le cadre utile passe de `[150, 300, 540, 980]` à `[150, 300, 540, 820]`.
C'est notre légende qui porte le texte — une seule couche.

Effet de bord accepté : l'échelle passe de 2,0 à 2,34, donc 8,5 % de largeur
rognée de chaque côté. Les clips sont cadrés sur le visage, ça ne coupe rien.

## Ne jamais transcrire un identifiant depuis une capture d'écran (09/10)

J'ai lu `uANCapowfWk` sur une capture du dialogue de partage. Le vrai
identifiant est `uAnCapowfWk` — un `n` minuscule. Deux tentatives de
commentaire ont échoué sur « Vidéo non disponible », et j'ai failli croire la
publication perdue.

Pire : ma vérification cherchait « n'est plus disponible » alors que la page
dit « n'est **pas** disponible ». J'ai donc déclaré le Short en bon état sur
un contrôle incapable de détecter la panne.

Les identifiants se lisent dans Studio, jamais à l'œil :
`studio.youtube.com/channel/<id>/videos/short`, attribut `href` des lignes.

## La passerelle Shorts → format long (09/10)

Les formats longs reçoivent HUIT à NEUF impressions en vingt heures. Titre en
requête et miniature refaite n'y changent rien : YouTube ne montre pas les
vidéos longues d'une chaîne à dix abonnés. Pendant ce temps les Shorts font
700 à 1 200 vues.

Le champ « vidéo associée » n'existe pas sur un Short (vérifié dans Studio).
La seule passerelle est le **commentaire épinglé** : `scripts/epingler.js`.

Deux pièges du script, déjà payés :
- l'adresse d'un Short est `youtube.com/shorts/<id>`, pas `watch?v=<id>` ;
- le bouton d'ouverture des commentaires s'appelle « Afficher **le
  commentaire** » — au singulier. Chercher « Commentaires » ne trouve rien.

## Le B-roll : filmer les vidéos sources (09/10)

Le kit visuel a supprimé les diaporamas, mais toute notre matière est SOMBRE
— clips en intérieur, application en thème noir, page Whop qui vire au gris
dès qu'on la floute. Les vidéos sources, elles, sont lumineuses et montées
serré : c'est exactement ce qui manquait.

```sh
node enregistrer-broll.mjs <id-youtube> <depart> <duree> <nom>
```

### Quatre pièges, tous payés le 09/10

1. **L'embed ne marche pas.** `/embed/<id>` rend « Erreur de configuration du
   lecteur vidéo » : YouTube le refuse sans origine légitime. On prend
   `/watch`.
2. **Le plein écran (`f`) ne tient pas.** On lit la BOÎTE RÉELLE du lecteur
   (`getBoundingClientRect` sur `video`) et on recadre au ffmpeg. Relevé :
   `crop=1344:756:16:68` sur une fenêtre 1920×1080.
3. **Le mur de consentement apparaît en plein tournage** sur un contexte neuf
   — il s'est retrouvé dans deux plans sur six. Utiliser le profil
   `.playwright-profile-social`, déjà connecté.
4. **Les publicités.** Une pré-roll Shopify a mangé 56 secondes sur 70. Le
   détecteur `#movie_player.ad-showing` ne les voit PAS toutes : il a rendu
   « 0 fenêtre de publicité » alors que l'écran en montrait. Tant que ce n'est
   pas fiable, **filmer long et choisir les plages à l'œil sur une planche**.

### Ce qui n'est pas disponible pour les visuels (09/10)

Pas d'images générées : `HF_TOKEN` vide, clé OpenAI du dépôt sans crédits,
Gemini Image en 429. Ne pas repartir dessus sans avoir revérifié.

### La règle du fond de texte

Un fond de texte doit être **sombre et coloré**. Une source claire floutée et
assombrie (la page Whop) rend un gris plat : le texte se lit, mais aucune
image ne porte le plan. Les pages claires servent en plein cadre NET, sans
texte par-dessus, ou en carte posée.

## Le B-roll ne marche PAS dans un Short (09/10)

Essai du 09/10 : un Short bâti en alternant B-roll lumineux et clip fini.
Verdict de l'utilisateur, et il est juste : « on ne voit rien, rien n'est
centré, on ne comprend pas ». Sur quatre plans, deux montraient une table
basse et un formulaire Amazon zoomé — aucun sujet.

**La cause** : un B-roll est en 16:9. Le recadrer en 9:16 demande 178 % de
zoom et ne garde que le tiers central de l'image. Le sujet, lui, est rarement
au centre. En 16:9 (format long) le B-roll fonctionne ; en vertical il perd
ce qui le rendait utile.

### Ce que disent les chiffres, et qu'on ne discute plus

| Short | Vues | Ce qu'on voit |
|---|---|---|
| Ta dernière vidéo contient dix moments | **1 208** | visages en gros plan |
| Pourquoi tes Shorts de 30 s | **703** | visages en gros plan |
| Le test des 10 secondes | **698** | visages en gros plan |
| Tu veux être payé en clipping | **91** | captures d'écran |

**Règle : chaque plan d'un Short montre un VISAGE qui remplit le cadre.** Pas
une interface, pas une page web, pas un décor. La variété vient de visages
DIFFÉRENTS — `ClipNarre` accepte une `source` et un `rec` par légende, ce qui
permet quatre personnes en onze secondes.

Le kit visuel 16:9 (`Visuel.tsx`) reste valable pour le format long, où le
B-roll est à son format natif.

## Les clips se TÉLÉCHARGENT, ils ne se filment plus (10/10)

Pendant une semaine, les Shorts ont été montés en FILMANT le lecteur de
l'application : une zone de 540×820 px dans un tournage 1080×1920, qu'il
fallait ensuite agrandir pour remplir le cadre. Avec le rognage des
sous-titres du 09/10, l'agrandissement est passé à **234 %**. L'utilisateur
l'a vu immédiatement sur son téléphone : « c'est zoomé, les clips sont flous ».

```sh
node telecharger-clips.mjs <url-youtube> <prefixe> [combien]
```

Le fichier obtenu est **1080×1920 natif**, sous-titres et son compris.
`ClipNarre` a donc désormais **le plein cadre par défaut** (`[0,0,1080,1920]`,
échelle 1) : oublier de préciser le cadre ne peut plus ramener le flou.

### Trois pièges du téléchargement, tous payés

1. **Le blob du lecteur n'est PAS le clip.** `#modal-video.src` rend le
   SEGMENT SOURCE : 1920×1080, sans sous-titres, sans recadrage. C'est
   l'entrée du traitement. Le clip vertical ne sort qu'au clic sur
   `#modal-dl-btn` (« Exporter ce clip en 9:16 »), et l'encodage prend une à
   deux minutes côté serveur.
2. **La fiche ne se ferme pas toute seule.** `Escape` la laisse ouverte, et
   `#modal-play-overlay` intercepte le clic suivant — un clip récupéré sur
   cinq au premier essai. Fermer par `V2.closeModal()` ET cliquer la carte
   suivante en `{ force: true }`.
3. **Tous les clips ne montrent pas un visage.** Le tournage Amixem du 10/10
   était un documentaire maritime : cartes, vagues, bassin. Un clip neuf sans
   visage ne sert pas — la règle du 09/10 prime.

## Ne jamais enchaîner avec `&&` après un TUBE (10/10, répétition)

```sh
node scripts/publier.js … | tail -3 && node scripts/youtube-miniature.js …
```

Le code de sortie d'un tube est celui de sa DERNIÈRE commande — `tail`, qui
réussit toujours. Le contrôle a refusé la publication, et la miniature s'est
quand même posée… sur la vidéo longue de la VEILLE, qu'il a fallu restaurer.

C'est exactement le piège que `publier.js` documente depuis le 04/10, et j'y
suis retombé. La forme correcte :

```sh
node scripts/publier.js … > /tmp/pub.log 2>&1; code=$?
if [ $code -eq 0 ]; then node scripts/youtube-miniature.js … ; fi
```

Et `--derniere` vise la dernière vidéo de la chaîne, pas celle qu'on vient de
publier : si la publication a échoué, elle désigne une AUTRE vidéo.

## Les miniatures qui gagnent dans la niche (relevé le 10/10)

Capture des résultats YouTube sur « gagner de l'argent avec le clipping ».
Les deux premiers (24 k et 32 k vues) ont la même recette :

| | |
|---|---|
| Chiffre | énorme, JAUNE, cerné de noir, empilé à gauche |
| Visage | regarde la caméra, à droite du texte |
| Preuve | un objet à droite (chez eux : téléphone avec les paiements Whop) |
| Bandeau | vert en bas, « GUIDE COMPLET ✅ » |
| Fond | clair, rayons, aucune zone sombre |

Nos onze premières miniatures étaient des rectangles sombres avec du texte.
Correctes, et invisibles à côté.

**Ce qu'on ne reprend pas** : leur chiffre est une somme d'argent. On ne l'a
pas, et l'inventer se paierait à la rétention. Le chiffre honnête est celui
du contenu (« 5 critères »), et la preuve est la vraie grille de clips.

**Et vérifier l'image choisie** : le premier tirage montrait un accessoire
d'Amixem qui ressemble à une arme. Une miniature se regarde avant d'être posée.

## Un format long sort ? Les Shorts du jour y renvoient (10/10)

Demande du 10/10 : quand une vidéo longue sort, les Shorts doivent l'annoncer
explicitement — « va voir la vidéo complète » — pour lui amener du trafic.
C'est la seule passerelle réelle : seule, une vidéo longue de cette chaîne
reçoit huit à neuf impressions.

### Comment on construit la grappe

- **Un Short = UN critère de la vidéo longue**, traité en entier. Un Short qui
  résume les cinq ne donne aucune raison de cliquer.
- **Le renvoi est dans la VOIX et à l'image.** `ReglagesClipNarre.renvoi`
  affiche une carte verte sur le dernier plan ; elle REMPLACE l'adresse —
  deux appels concurrents sur la même seconde n'en font aboutir aucun.
- **Le commentaire épinglé porte le lien** (`scripts/epingler.js`), posé sur
  chaque Short du jour, y compris ceux déjà en ligne.
- **La légende redit le renvoi** et énumère ce que contient la vidéo longue.

### Le libellé

« Dans la vidéo complète, **sur la chaîne** » — jamais « au-dessus » : sur
TikTok et Instagram il n'y a rien au-dessus, et une indication fausse coûte
plus cher qu'une formulation plate. La voix off a été regénérée pour ça.

## Ne jamais parler des statistiques de NOTRE compte (11/10)

Faute commise le 11/10 : un Short disait « j'ai mesuré sur ma chaîne : 56 % en
moyenne ». Nos chiffres n'intéressent personne et ne montrent rien de ce que
Créatis sait faire. C'est du nombrilisme déguisé en pédagogie.

**Deux formes autorisées, et deux seulement :**
1. **Raconter une histoire.**
2. **Apprendre à se faire rémunérer en clipping** — c'est ce que le public
   vient chercher, et c'est là qu'est la demande (les vidéos de la niche qui
   font 24 à 32 k vues parlent toutes d'argent).

Les chiffres cités doivent être **externes et vérifiables** : tarifs des
campagnes, budgets, durées. Jamais nos vues, notre rétention, nos inscrits.

## La valeur se MONTRE, elle ne s'annonce pas (11/10)

Le spectateur doit comprendre que la valeur vient de Créatis **sans qu'on le
lui dise**, et sans effet publicitaire. Le moyen : un plan qui montre le
RÉSULTAT — dix clips notés sortis d'une seule vidéo — posé en carte sur le
clip (`legendes[].incrust`, entre 44 et 64 % de la hauteur).

Une carte qui montre dix clips dit la valeur en une seconde. Une phrase qui
l'annonce ne dit que de la réclame.

L'adresse reste discrète, sur la dernière seconde. On ne demande jamais
d'aller sur le site dans la voix.

## Trois Shorts par jour = trois lots visuels distincts (11/10)

Le contrôle refuse deux publications d'affilée partageant gabarit ET
réservoir de clips. Il a raison : ce sont les mêmes visages. Prévoir donc
**un lot par Short**, et faire tourner — on ne renomme jamais la source pour
passer le garde-fou.

## La chaîne porte un avertissement actif : jamais de promesse de facilité (12/10)

Relevé sur la page des infractions de la chaîne, le 12/10 :

| Date | Sanction | Contenu | Règle invoquée |
|---|---|---|---|
| 27/07 | mise en garde | « Le clipping rentable en 3 étape simple » | Contenus nuisibles ou dangereux |
| 30/07 | **1er avertissement sur 3** | « Si tu veut être rémunéré en clipping fais ça c'est ultra simple. » | Contenus nuisibles ou dangereux |

L'avertissement **expire le 28 octobre 2026**. Jusque-là, la marge est nulle :
un deuxième avertissement interdit toute mise en ligne pendant **deux
semaines** — la machine à contenu s'arrête net — et le troisième supprime la
chaîne. Supprimer la vidéo ne lève pas l'avertissement ; YouTube le dit sur
cette page.

**Ce qui a été sanctionné n'est pas le chiffre, c'est la facilité annoncée.**
« Contenus nuisibles ou dangereux » est la règle qui couvre les combines
d'enrichissement rapide. Les deux vidéos promettaient un revenu *simple*, en
*3 étapes*. Nos Shorts qui marchent disent au contraire une somme avec son
coût : « 30 clips par semaine à 5 000 vues : le compte y est », « le métier,
c'est le volume ». C'est cette forme-là qu'il faut tenir.

Donc, dans un titre, une légende ou une narration :

- **jamais** : ultra simple, en 3 étapes simples, c'est facile, argent facile,
  sans rien faire, revenus passifs/automatiques, garanti, du jour au
  lendemain, sans compétences, n'importe qui peut, devenir riche ;
- **toujours**, dès qu'une somme apparaît : ce qu'elle coûte — un nombre de
  clips, une durée, une moyenne, ou le fait que ce n'est pas garanti.

Décrire le mode opératoire n'est pas promettre la facilité : « sans jamais
allumer une caméra » dit ce qu'on fait, pas que c'est sans effort. C'est la
frontière.

**C'est en code, pas en prose.** `controle-avant-publication.js` reçoit
désormais `--titre` et `--legende` depuis `publier.js`, refuse les marqueurs de
facilité, et signale toute somme annoncée sans son coût.

## Le compte de production a un quota mensuel, et il se vide (13/10)

Trois analyses lancées le 13/10 sur des vidéos sorties dans la semaine (Amixem
51 min, Konbini 24 min, Konbini 15 min) n'ont rendu **aucun clip**. Le script
attendait `.clip-card` pendant quinze minutes, puis abandonnait.

Ce n'était ni le script, ni la durée des vidéos, ni une panne : en base,
`studio-video@creatis.app` est à **30 analyses sur les 30** de son plan Pro
pour le mois. Les demandes étaient refusées au quota.

```sql
select u.plan,
       (select count(*) from clip_generations c
         where c.user_id = u.id and c.created_at > date_trunc('month', now()))
from users u where u.email = 'studio-video@creatis.app';
```

**Le réflexe, avant de lancer une série de téléchargements :** passer cette
requête. Trois analyses perdues, c'est quarante-cinq minutes.

Et la vérification qui a évité un faux diagnostic : `clip_generations` montrait
3 analyses le jour même et 16 la veille, par d'autres comptes. Le produit
marchait ; seul notre compte était à sec. Ne jamais conclure « panne » sans
regarder si les clients, eux, produisent.

**Ce qui reste à trancher par l'utilisateur** : relever le quota du compte
interne, ou accepter de réutiliser les lots existants jusqu'au 1er novembre.
Les trois lots verticaux disponibles sont `sqz2`, `sqz3` et `amx4` — et on
change au moins les SECONDES, choisies sur planche contact.

## Un renvoi doit NOMMER sa destination (13/10)

Capture de l'utilisateur, sur un reel Instagram : la carte verte disait
« Le calcul complet est dans la vidéo sur la chaîne ». Sur Instagram, **il n'y
a pas de « chaîne »** — le spectateur lit une promesse sans aucun chemin pour
y aller. Même chose sur TikTok. Le renvoi ne marchait que sur YouTube, et
encore : il ne disait pas quelle vidéo.

**Règle : un renvoi porte deux lignes — ce qu'on y trouve, et OÙ.**

```
  La vidéo complète
  ─────────────────
  YouTube · @Creatis_officiel
```

`ReglagesClipNarre` a donc un champ `ou`, rendu en gros sous le libellé. Le
handle se lit dans le DOM de la page de chaîne, jamais de mémoire : c'est
`@Creatis_officiel` (sans accent sur le premier e, contrairement au nom
affiché « Créatis_officiel »).

Et la même exigence vaut pour la **description** : première ligne = le titre
exact de la vidéo longue + son URL complète. « Sur la chaîne » ne suffit pas.

### Rattraper une publication déjà en ligne

- **YouTube** : `scripts/epingler.js --video <id> --texte "… <url>"`. Le lien
  y est cliquable, c'est la meilleure des trois.
- **Instagram** : un COMMENTAIRE, pas une récriture de légende. Le dialogue
  « Modifier » ne s'ouvre pas de façon fiable, et un `Ctrl+A` qui rate le
  champ sélectionne toute la page. Le script est
  `scratchpad/commenter-ig.js`, avec deux pièges déjà payés :
  · l'étiquette est « Plus d’options » avec une apostrophe TYPOGRAPHIQUE
    (U+2019) — un sélecteur avec l'apostrophe droite ne trouve rien ;
  · « Publier » existe en plusieurs exemplaires dans la page : cliquer le
    premier venu laisse le texte dans le champ sans rien envoyer. On envoie
    par la touche **Entrée**, qui vise le formulaire qui a le focus.
