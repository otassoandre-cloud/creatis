# Ardoise — contexte projet

Ce fichier est lu au démarrage. Il contient les décisions déjà prises et **les pièges à ne pas refaire**.

---

## Le produit en une phrase

Ardoise lit les relevés des plateformes de livraison et dit à un restaurateur indépendant, **avant qu'il n'émette**, quels prélèvements sont contestables, pour combien, et combien de jours il lui reste.

Cible : restaurants indépendants de 1 à 3 établissements en France. Pas les groupes — ils sont déjà servis par des acteurs installés en vente directe.

---

## Règles absolues

**1. Ne jamais inventer un chiffre.** Toute donnée affichée doit venir d'un fichier déposé ou d'une source vérifiée. Si le moteur ne sait pas, il le dit et propose un mappage manuel. Il n'a jamais le droit de sortir un montant plausible.

**2. Ne jamais déposer une contestation à la place du client.** Les conditions commerçant de certaines plateformes interdisent les contestations automatisées par un tiers. Un compte restreint coûterait au client bien plus que ce qu'on lui fait récupérer. Ardoise détecte, chiffre, prépare — le restaurateur clique.

**3. Aucun mélange avec Créatis.** Projet Supabase séparé, compte Stripe séparé, dépôt séparé, projet Vercel séparé. Aucune table, aucune clé, aucun utilisateur en commun.

**4. Aucune clé serveur dans `public/`.** `SUPABASE_SERVICE_ROLE` et `STRIPE_SECRET_KEY` vivent uniquement dans les variables d'environnement Vercel. Seule la clé `anon` va dans le navigateur, et uniquement parce que la RLS interdit la lecture.

**4 bis. Le client ne décide pas de son abonnement.** La RLS laisse un compte modifier son propre profil — donc, telle quelle, s'attribuer un plan Groupe avec la clé anon, qui est publique par construction. Le déclencheur `profils_protege_abo` ramène `plan`, `statut_abo`, `nb_etablissements` et les identifiants Stripe à leur ancienne valeur pour toute écriture venant du navigateur. Seul le webhook Stripe (`service_role`) les écrit. Ne pas le supprimer en ajoutant un champ de réglage : ajouter le champ à la table, pas d'exception au déclencheur.

**5. Le relevé ne quitte pas le navigateur.** C'est la promesse affichée sur la page et c'est l'argument qui lève l'objection principale. Seul le résultat agrégé est enregistré. Ne jamais transmettre le fichier.

---

## Faits vérifiés — ne pas les modifier sans source

Délais de contestation, relevés dans la documentation officielle des plateformes :

| Plateforme | Fenêtre | Point de départ |
|---|---|---|
| Uber Eats | **30 jours** | date de commande |
| Deliveroo | **7 jours** | date d'émission du remboursement |
| Just Eat | **non vérifié** | signalé comme tel dans le produit |

Une première version utilisait 30 jours partout. C'était faux pour Deliveroo, et dangereux : un client s'y fiant aurait raté toutes ses fenêtres. Ces valeurs sont dans `PLATEFORMES` au début de `public/parseur.js`.

Rapport Uber Eats à utiliser : **Reports → Order Errors (Transaction)**. Il contient déjà une ligne par erreur avec le montant réellement facturé au restaurant.

**Piège de correctness :** une ligne peut afficher un remboursement client de 31 € avec `Merchant charge amount = 0` et `Amount covered by Uber = 31`. Le restaurant n'a rien payé. Le parseur ignore ces lignes. Ne pas « corriger » ce comportement — `test/parseur.test.js` le fige.

**Deuxième piège, du même genre :** un montant dont la fenêtre est fermée ne rejoint jamais le total récupérable du rapport. Il est signalé à part, comme une perte, pendant sept jours. Additionner les deux gonflerait le chiffre que le client compare à son abonnement. `test/rapport.test.js` le fige aussi.

---

## Architecture

Vanilla HTML/CSS/JS, aucun framework, aucune étape de build. Vercel + Supabase + Stripe.

```
public/config.js       clés publiques Supabase — LE SEUL fichier à remplir
public/index.html      page publique + analyseur gratuit
public/app.html        espace client
public/parseur.js      lecteur de relevés (détection de plateforme + mappage flou)
lib/rapport.js         calcul et rédaction du rapport hebdomadaire, sans réseau
api/checkout.js        session Stripe Checkout
api/webhook.js         webhook Stripe (signature + idempotence)
api/portail.js         portail de facturation client
api/rapport-hebdo.js   tâche planifiée du lundi, envoi via Brevo
api/desinscription.js  lien « ne plus recevoir », signé
api/diagnostic.js      vérifie que toute la chaîne est branchée
outils/domaine.sh      change le domaine aux 9 endroits d'un coup
supabase/schema.sql    tables, RLS, vue pilotage
test/                  node --test — `npm test`
```

**Le parseur ne code aucun en-tête en dur.** Les intitulés varient selon le pays, la langue et la version du portail. Il normalise, puis rapproche par alias FR/EN. Pour ajouter une plateforme : compléter `PLATEFORMES` et `ALIAS`, pas écrire un parseur dédié.

**Le webhook exige le corps brut.** `bodyParser` est désactivé en bas de `api/webhook.js` — la vérification de signature Stripe en dépend. Ne pas le réactiver.

**Idempotence :** chaque événement Stripe est inséré dans `evenements_stripe` avant traitement. Un conflit de clé primaire signifie « déjà vu ». Stripe rejoue les événements ; sans ça un abonnement pourrait être activé deux fois.

**Le rapport recalcule, il ne relit pas.** `prelevements.jours_restants` est une photo prise au moment de l'import : trois semaines plus tard elle ment. Le rapport du lundi recalcule à partir de `date_ref` et de `imports.fenetre_jours`. C'est pourquoi le parseur renvoie `dateRef` et pourquoi `app.html` l'enregistre — **une ligne sans `date_ref` ne peut plus être comptée à rebours du tout.**

**La tâche planifiée passe tous les jours, le code n'envoie que le lundi.** Le plan Hobby de Vercel ne sait pas déclarer une fois par semaine. `estLundiAParis()` dans `api/rapport-hebdo.js` tient le rendez-vous, `dernier_rapport_le` empêche le doublon. Ne pas remplacer ce test par un cron hebdomadaire sans vérifier le plan Vercel du compte.

**La logique du rapport ne fait aucun appel réseau.** Tout ce qui décide d'un montant ou d'un délai est dans `lib/rapport.js`, testé par `npm test`. `api/rapport-hebdo.js` ne fait que lire la base, appeler Brevo, et écrire la date d'envoi. Garder cette séparation : c'est ce qui rend la règle « ne jamais inventer un chiffre » vérifiable.

---

## Design

Territoire : **craie sur ardoise**. Fond sombre, grain, titres manuscrits en Caveat, montants en JetBrains Mono, tarifs en carte de menu avec pointillés.

**Le jaune `#E8B84B` ne sert qu'à écrire de l'argent.** Aucun bouton, aucun titre décoratif. C'est la règle qui fait que l'œil trouve le montant sans effort.

Polices auto-hébergées dans `public/fonts/` (licences SIL OFL). Aucune requête vers Google : plus rapide, et rien qui parte chez un tiers.

Contrastes vérifiés au calcul WCAG. `--sourdine: #889084` a été choisi pour passer 4,5:1 sur les **trois** fonds (`#12140F`, `#1B1E18`, `#242821`). Ne pas l'assombrir.

---

## Tarifs

| Plan | Prix | Périmètre |
|---|---|---|
| Service | 99 € / mois | 1 établissement |
| Maison | 249 € / mois | 2 à 5 |
| Groupe | 249 € + 45 € par établissement au-delà de 5 | 6 à 20 |

**Pourquoi 45 € et pas 79 €.** Une version antérieure facturait 79 € par établissement à partir de 6. Deux défauts : un saut de +225 € entre 5 et 6 établissements, et un prix par site qui *remontait* de 50 € à 79 € — l'inverse d'une dégressivité. Le socle amorti sur 5 sites revient à 49,80 € ; tout incrément au-dessus ferait remonter la moyenne. Ne pas augmenter les 45 € sans refaire ce calcul.

Statut : **auto-entrepreneur, franchise en base de TVA**. Mention obligatoire : *TVA non applicable, art. 293 B du CGI*. Seuils 2026 pour les prestations de services : 37 500 € (majoré 41 250 €), plafond micro 77 700 € — **cumulés avec Créatis** s'ils relèvent de la même auto-entreprise.

---

## Identité de l'entreprise

Reprise des mentions légales de Créatis : **même auto-entreprise**, donc mêmes
nom, adresse et SIRET. C'est le seul point commun entre les deux projets, et il
est inévitable : il n'y a qu'un entrepreneur.

| | |
|---|---|
| Éditeur | Otasso André, entrepreneur individuel (EI) |
| Adresse | 11 avenue Varavilla, 06190, France |
| SIRET | 988 630 943 00013 |
| Téléphone | 06 59 42 64 01 |
| Contact Ardoise | contact@ardoise.app |

**L'adresse de contact d'Ardoise n'est pas celle de Créatis.** Mettre
`contact@creatis.app` sur ce site relierait publiquement les deux projets pour
n'importe quel visiteur. La boîte `contact@ardoise.app` doit exister.

**L'adresse postale ne mentionne pas la commune** — elle est déjà ainsi sur
Créatis. Si les mentions légales doivent être parfaitement exactes, c'est à
compléter aux deux endroits.

**Le code APE a été retiré** des mentions légales : l'article 19 de la LCEN ne
l'exige pas, et une ligne vide vaut moins qu'une ligne absente. À rajouter s'il
est souhaité, il figure sur l'avis de situation INSEE.

**Le médiateur de la consommation a été écarté**, parce que les CGV réservent
le service aux professionnels (article 10). Si le service s'ouvre un jour aux
consommateurs, l'adhésion à un médiateur redevient obligatoire et la mention
doit revenir.

---

## Ce qui reste à faire, par ordre de priorité

**1. Détection de schémas par plat et créneau.** C'est ce qui justifie le plan Maison à 249 €. **Ne pas vendre Maison tant que ça n'existe pas.**

**2. Interface multi-établissements.** Le schéma le supporte, l'interface non. Ne pas vendre Groupe avant.

**3. Délai et format Just Eat.** Non trouvés. Le produit signale l'incertitude plutôt que de deviner — garder ce comportement tant que la source manque.

**4. Relance des prospects de la page publique.** La page ne promet plus d'envoi
automatique — elle annonce un message pour ouvrir l'espace, et le rapport du
lundi à partir du premier relevé déposé. **Cette promesse suppose que vous
répondiez à la main.** Si vous ne le faites pas, retirez le formulaire.

**Fait :** le rapport hebdomadaire (Brevo + tâche planifiée + désinscription
signée + réglages), les pages légales remplies, la configuration ramenée à un
seul fichier, le diagnostic de déploiement, et `PREMIER-CLIENT.md`.

---

## La question ouverte qui décide de tout

Le montant médian réellement récupérable par un restaurant **français** est inconnu. La référence de 400 $/mois vient d'un éditeur américain, en 2024, qui vend ce service.

La vue `pilotage` répond :

```sql
select * from public.pilotage;
```

Au-dessus de 200 € médian, les 99 € sont confortables. À 90 €, il faut revoir le prix avant de recruter des clients qu'il faudra rembourser.

---

## Tests

`npm test` — `node --test`, aucune dépendance. Couvre le parseur (pièges Uber et Deliveroo, dates) et le rapport (montants, fenêtres fermées, échappement, signature des liens). **À lancer avant tout commit** : c'est le seul endroit où la règle « ne jamais inventer un chiffre » est vérifiée automatiquement.

Playwright pour l'interface. Vérifier après toute modification, aux largeurs 375 / 768 / 1024 / 1440 :

- aucun débordement horizontal
- aucune cible tactile sous 44 px
- aucun champ sans étiquette ni `aria-label`
- aucune erreur console
- parcours complet : import d'un relevé → montant affiché → enregistrement → suivi

Servir en HTTP local (`python3 -m http.server`) et non en `file://` : les polices échouent en CORS sur `file://`, ce qui produit de fausses erreurs.
