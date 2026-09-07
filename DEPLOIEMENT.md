# Lancer Ardoise

Projet **entièrement séparé de Créatis** : autre Supabase, autre Stripe, autre dépôt, autre projet Vercel. Aucune table, aucune clé, aucun utilisateur en commun.

---

## L'arborescence

```
ardoise-app/
├── public/
│   ├── config.js             LE SEUL FICHIER À REMPLIR : clés publiques Supabase
│   ├── index.html            page publique + analyseur gratuit
│   ├── app.html              espace client (connexion, import, suivi, abonnement)
│   ├── parseur.js            lecteur de relevés (Uber Eats, Deliveroo)
│   ├── pages.css             styles des pages légales
│   ├── mentions-legales.html
│   ├── cgv.html
│   ├── confidentialite.html
│   ├── logo.svg, og.png, fonts/
├── api/
│   ├── checkout.js           crée la session de paiement Stripe
│   ├── webhook.js            reçoit Stripe, active l'abonnement
│   ├── portail.js            le client gère son abonnement seul
│   ├── rapport-hebdo.js      le courrier du lundi (tâche planifiée)
│   ├── desinscription.js     le lien « ne plus recevoir », signé
│   └── diagnostic.js         « est-ce que tout est vraiment branché ? »
├── lib/rapport.js            calcul et rédaction du rapport, sans réseau
├── test/                     node --test : parseur et rapport
├── supabase/
│   ├── schema.sql            tables, RLS, vue de pilotage
│   └── migration-01-rapport-hebdo.sql   pour une base déjà en service
├── outils/domaine.sh         change le domaine partout d'un coup
├── PREMIER-CLIENT.md         comment aller chercher le premier client
├── vercel.json, package.json, .env.exemple
```

---

## Les 10 étapes, dans l'ordre

### 1. Créer le projet Supabase

**New project**, nommé `ardoise`, **région Europe (Paris ou Francfort)** — vos clients sont français, leurs données restent dans l'UE.

SQL Editor → coller `supabase/schema.sql` → Run.

> Base déjà en service, créée avant le rapport hebdomadaire ? Exécutez en plus `supabase/migration-01-rapport-hebdo.sql`. Il est rejouable sans dommage, et inutile si vous venez d'exécuter `schema.sql`, qui contient déjà tout.

Vérifier ensuite :

```sql
select relname, relrowsecurity from pg_class
 where relname in ('profils','imports','prelevements','prospects','evenements_stripe');
```

Les cinq doivent renvoyer `true`. Si une seule est à `false`, arrêtez tout et corrigez : sans RLS, la clé publique donne accès à toute la base.

### 2. Activer la connexion par lien

Authentication → Providers → **Email** activé, **Confirm email** activé.
Authentication → URL Configuration → Redirect URLs : ajouter `https://VOTRE-URL/app.html`.

### 3. Renseigner les clés publiques

Project Settings → API. Copier l'URL du projet et la clé **anon** dans **un seul
fichier**, `public/config.js` :

```js
window.ARDOISE_CONFIG = {
  SB_URL: "https://xxxx.supabase.co",
  SB_KEY: "eyJ..."          // clé anon / public
};
```

Jamais la clé `service_role` ici : elle contourne toute la RLS et donnerait,
depuis le navigateur, accès à l'ensemble de la base.

Tant que ce fichier est vide, la page publique fonctionne normalement — elle
n'enregistre simplement aucune analyse — et l'espace client affiche
« Connexion indisponible ».

### 4. Créer les tarifs Stripe

Nouveau compte Stripe (ou au minimum un compte distinct de Créatis). Produits → créer quatre tarifs récurrents mensuels en euros :

| Tarif | Montant | Note |
|---|---|---|
| Service | 99 € | quantité fixe 1 |
| Maison | 249 € | quantité fixe 1 |
| Groupe — socle | 249 € | quantité fixe 1 |
| Groupe — établissement | 45 € | **quantité variable** |

Noter les quatre identifiants `price_...`.

### 5. Les variables d'environnement Vercel

Settings → Environment Variables. Modèle complet dans `.env.exemple` :

```
SITE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE,
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
PRIX_SERVICE, PRIX_MAISON, PRIX_GROUPE_BASE, PRIX_GROUPE_ETAB,
BREVO_API_KEY, EXPEDITEUR_EMAIL, EXPEDITEUR_NOM, CRON_SECRET, SECRET_RAPPORT
```

`SUPABASE_SERVICE_ROLE`, `STRIPE_SECRET_KEY`, `BREVO_API_KEY`, `CRON_SECRET` et `SECRET_RAPPORT` sont des secrets serveur. Ils ne doivent jamais apparaître dans `public/`.

Les deux secrets du rapport se fabriquent en une commande chacun :

```bash
openssl rand -hex 32   # CRON_SECRET
openssl rand -hex 32   # SECRET_RAPPORT
```

`SECRET_RAPPORT` signe les liens de désinscription. **Le changer invalide les liens des courriers déjà partis** : un client qui clique sur un ancien lien tombera sur « lien invalide » et devra couper le rapport depuis Réglages.

### 6. Déployer

```bash
npm install
npx vercel login
npx vercel --prod
```

### 7. Brancher le webhook Stripe

Stripe → Developers → Webhooks → Add endpoint : `https://VOTRE-URL/api/webhook`

Événements à cocher :
`checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

Copier le `whsec_...` dans `STRIPE_WEBHOOK_SECRET`, puis **redéployer** — une variable ajoutée après le déploiement n'est pas prise en compte.

> Sur Créatis, le webhook Stripe avait échoué à cause d'un `STRIPE_WEBHOOK_SECRET` qui ne correspondait pas côté Vercel. C'est le même piège ici.

### 8. Brancher le rapport du lundi

**Chez Brevo** (le plan gratuit couvre 300 courriers par jour, très au-delà du besoin) :

1. Créer le compte, puis **Senders, Domains & Dedicated IPs → Domains** : ajouter votre domaine et poser les enregistrements DNS proposés (SPF, DKIM, DMARC). Sans domaine authentifié, les courriers partent en indésirables — c'est la seule étape qui décide vraiment si le client lit son rapport.
2. **SMTP & API → API Keys → Generate a new API key** → dans `BREVO_API_KEY`.
3. `EXPEDITEUR_EMAIL` doit appartenir au domaine authentifié à l'étape 1.

**Chez Vercel**, rien à faire : la tâche planifiée est déclarée dans `vercel.json` et se crée au déploiement. Elle passe **tous les jours à 6 h UTC**, et le code n'envoie que le lundi — le plan Hobby ne sait pas planifier une fois par semaine, et un rendez-vous manqué vaut mieux qu'un rendez-vous impossible à déclarer. Vercel joint automatiquement `Authorization: Bearer $CRON_SECRET` ; sans ce secret configuré, l'entrée refuse tout le monde, y compris Vercel.

Vérifier sans rien envoyer à personne :

```bash
# ce que recevrait chaque client, calculé pour de vrai, mais sans envoi
curl -H "Authorization: Bearer $CRON_SECRET" \
     "https://VOTRE-URL/api/rapport-hebdo?simulation=1"

# envoi réel un autre jour que lundi (rattrapage)
curl -H "Authorization: Bearer $CRON_SECRET" \
     "https://VOTRE-URL/api/rapport-hebdo?forcer=1"
```

Le rapport ne part **qu'aux abonnés actifs**, **qu'une fois par semaine** (garde-fou de 6 jours, pour qu'un rejeu de la tâche n'écrive pas deux fois), et **seulement s'il reste quelque chose à déposer** : un courrier vide chaque lundi ne fabrique que des désabonnements.

### 9. Le domaine, et la boîte de contact

Le domaine est écrit à neuf endroits : adresse canonique, métadonnées de partage, `sitemap.xml`, `robots.txt`, et l'adresse de contact des trois pages légales. Une seule commande les change tous :

```bash
sh outils/domaine.sh mon-domaine.fr
```

Puis, hors de ces fichiers : `SITE_URL` dans les variables Vercel, et **la boîte `contact@votre-domaine` doit exister**. Les mentions légales, les CGV et la politique de confidentialité la donnent comme point de contact : elle doit recevoir du courrier, sinon la mention est inexacte.

Les pages légales sont **déjà remplies** — nom, adresse, SIRET, statut, sous-traitants. Rien à compléter, sauf si votre situation change.

### 10. Vérifier que tout est branché

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://VOTRE-URL/api/diagnostic
```

Le diagnostic contrôle les treize variables d'environnement, l'existence de chaque table Supabase avec ses colonnes, le fait que la clé publique ne puisse rien lire dans `prospects`, les quatre tarifs Stripe (montant, devise, récurrence), le mode live ou test, la validité de la clé Brevo et le fait que l'expéditeur soit validé chez eux.

Il répond `"pret": true` seulement quand tout passe, et sinon liste ce qui manque avec la manœuvre pour le corriger. Il ne renvoie jamais la valeur d'un secret.

**Un déploiement en mode test Stripe est signalé comme un blocage**, pas comme un avertissement : un client pourrait souscrire sans qu'un centime soit encaissé.

---

## Le régime auto-entrepreneur : ce qu'il impose

**Sur les factures et le site**, la mention est déjà en place : *TVA non applicable, art. 293 B du CGI*. Depuis le 1er septembre 2026 la référence évolue vers l'article L. 223 et suivants du CIBS, avec tolérance pour l'ancienne rédaction jusqu'au 31 décembre 2027.

Ajoutez **« EI »** ou **« entrepreneur individuel »** à votre nom sur les documents commerciaux.

**Les seuils 2026 pour les prestations de services :**

| Seuil | Montant | Effet |
|---|---|---|
| Franchise de TVA | 37 500 € | au-delà, vous facturez la TVA |
| Seuil majoré | 41 250 € | dépassement = TVA dès le 1er du mois |
| Plafond micro-entreprise | 77 700 € | au-delà, changement de régime |

**Ces seuils portent sur vous, pas sur chaque activité.** Le chiffre d'affaires de Créatis et celui d'Ardoise s'additionnent tant qu'ils relèvent de la même auto-entreprise.

Traduit en abonnés Ardoise à 99 € : la TVA arrive vers le **32e abonné**, le plafond micro vers le **65e** — et moins si Créatis en consomme déjà une partie. Ce n'est pas un frein au démarrage, c'est un calendrier à surveiller.

En B2B, facturer la TVA n'est pas un désavantage : vos clients restaurateurs la récupèrent.

---

## Vérifier avant d'envoyer du trafic

| Test | Attendu |
|---|---|
| Dépôt d'un relevé Uber Eats sur la page publique | montant affiché, fenêtre de 30 jours annoncée |
| Dépôt d'un relevé Deliveroo | fenêtre de **7 jours** à compter du remboursement |
| Dépôt d'un fichier non reconnu | liste des colonnes proposée, aucun montant inventé |
| Demande de lien de connexion | e-mail reçu, retour connecté sur `/app.html` |
| Enregistrement d'un relevé | apparaît dans l'historique et dans « À déposer » |
| Souscription avec la carte de test `4242 4242 4242 4242` | retour sur `/app.html?paiement=ok`, badge passé à « Plan Service » |
| Stripe → Webhooks → onglet des tentatives | réponses `200`, aucune en échec |
| `npm test` | 26 tests au vert |
| `/api/diagnostic` avec le bon secret | `"pret": true` |
| `/api/rapport-hebdo?simulation=1` avec le bon secret | montants calculés, `"envoye": false` partout |
| Le même sans en-tête `Authorization` | `401`, aucune donnée renvoyée |
| Un envoi forcé vers votre propre adresse | courrier reçu, montants identiques à ceux de l'espace client |
| Le lien « ne plus recevoir » du courrier | page de confirmation, case décochée dans Réglages |
| Le même lien avec un autre identifiant dans l'URL | « lien invalide » |

---

## Ce qui n'est pas construit, et pourquoi

| Manque | Raison |
|---|---|
| Relance des prospects de la page publique | La page promet « vous recevrez le premier lundi prochain » à qui laisse son adresse sans créer de compte. Or le rapport se calcule à partir des relevés enregistrés : un prospect n'en a aucun. Tant que cette relance n'existe pas, cette promesse n'est pas tenue — corrigez la phrase ou construisez l'envoi. |
| Délai de contestation Just Eat | Non trouvé dans leur documentation. Signalé comme non vérifié dans le produit plutôt que deviné. |
| Lecture des exports Just Eat | Aucun fichier réel ni structure documentée. Le mappage manuel prend le relais. |
| Détection de schémas par plat | Vendue dans le plan Maison. Demande plusieurs semaines de données. **À livrer avant de facturer un plan Maison.** |
| Multi-établissements | Le schéma le supporte, l'interface non. Ne vendez pas Groupe avant. |

---

## Ce que je continue de te dire

Tout est en place pour encaisser. Mais **le montant médian réellement récupérable par un restaurant français reste inconnu** — les 400 $/mois du dossier viennent d'un éditeur américain, en 2024.

La vue `pilotage` dans Supabase répond à cette question toute seule :

```sql
select * from public.pilotage;
```

Après vingt analyses, tu as le montant médian réel. S'il est au-dessus de 200 €, les 99 € sont confortables. S'il est à 90 €, il faut revoir le prix avant de recruter des clients que tu devras rembourser.

**Ne vends que le plan Service tant que la détection de schémas n'existe pas.** C'est ce qui distingue Maison, et facturer 249 € pour une fonctionnalité absente est le meilleur moyen de perdre un client et sa confiance.
