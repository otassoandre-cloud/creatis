# CONSIGNES — à relire EN ENTIER au début de chaque session, et avant chaque publication

Ce fichier existe parce que je fais répéter les mêmes choses. Il est la source de
vérité. Si une consigne n'est pas ici, elle sera oubliée : l'ajouter au moment où
elle est donnée, pas plus tard.

**Réflexe d'ouverture de session :**
1. Lire ce fichier en entier.
2. `node scripts/tiktok-stats.js` — les vues et J'aime par publication.
3. Ouvrir l'onglet Données analytiques de TikTok — **rétention et sources de trafic**.
4. `node scripts/social-brief.js` — les inscriptions attribuées (souvent nulles, voir §5).
5. Décider le contenu du jour À PARTIR de ces chiffres, pas avant de les avoir lus.

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
recommandation par le son, et le spectateur passe. **Toute pièce sortie désormais
porte une bande-son.** Musique libre de droits (TikTok Studio → « Sons libres de
droits », ou la bibliothèque audio YouTube), posée sous la voix quand il y en a une.

## 6. CE QUE DIT LA MESURE, ET OÙ LA CHERCHER

- `social-brief.js` mesure les VISITES du site attribuées à un réseau. Sur TikTok ce
  chiffre est **structurellement nul sous 1 000 abonnés** : le lien de la bio n'est
  pas cliquable. En conclure « TikTok ne marche pas » est une **erreur de lecture**.
- La donnée qui compte est chez la plateforme : **rétention, durée moyenne de
  visionnage, sources de trafic**. Pas les vues seules.
- Référence au 28/09 : TikTok médiane 313 vues, meilleures 780–860.
  Instagram @andre.creatis 71 publications / 92 abonnés. YouTube 9 abonnés.

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
- Juger une session sur un **marqueur POSITIF**, jamais sur l'absence de bouton de
  connexion — une page blanche n'en a pas non plus.
- TikTok/Instagram empilent des modales : boucler jusqu'à ce qu'un tour ne ferme rien.

## 10. CE QUI RESTE BLOQUÉ SUR L'UTILISATEUR

- **Armer les tâches planifiées** : voir `ARMER-LA-PUBLICATION.txt`. Je ne peux pas
  le faire, le contrôle de permissions refuse (à juste titre).
- **Régénérer `META_ACCESS_TOKEN`** (expiré) avec `instagram_basic` +
  `instagram_content_publish` + `pages_show_list`. Sans lui, **pas de stories** :
  Instagram web n'a pas de création de story.
- **Supprimer le Reel carré** `DdOfSvAIXEZ` du 28/09 et les 2 doublons TikTok du 27/09.
- **Recharger Together AI** (402 depuis le 15/09).
