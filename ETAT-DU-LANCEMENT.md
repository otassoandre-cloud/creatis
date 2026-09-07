# État du lancement

Ce fichier dit ce qui tourne réellement, et ce qui manque encore. Il est tenu à
jour à chaque étape franchie — ne pas le laisser mentir.

---

## Fait, et vérifié

### Base de données — en service

| | |
|---|---|
| Projet Supabase | **Ardoise** (`rbjegjctaqynnmnuxuee`) |
| Région | **eu-west-3, Paris** — les données des clients restent en France |
| URL | `https://rbjegjctaqynnmnuxuee.supabase.co` |
| État | actif, sain |

Projet **distinct** de celui de Créatis (`zjzcgcpphzcghigzpghq`, eu-north-1) :
autre base, autres clés, aucune table ni utilisateur en commun. Seule
l'organisation de facturation est commune — il n'y a qu'un compte Supabase.

Les cinq tables, la vue de pilotage, la RLS et les deux déclencheurs sont
appliqués. Vérifié en base, en endossant le rôle `anon` :

| Contrôle | Résultat |
|---|---|
| `prospects` lus par `anon` | 0 ligne, alors qu'une ligne existait |
| `profils`, `imports`, `prelevements` lus par `anon` | 0 ligne |
| `evenements_stripe` lus par `anon` | 0 ligne |
| Vue `pilotage` lue par `anon` | `permission denied for view pilotage` |
| Vue `pilotage` lue par le service | lit bien |

L'analyseur de sécurité Supabase ne remonte plus aucun avertissement. Il en
signalait deux : `cree_profil()` et `protege_champs_abo()` étaient exposées en
`SECURITY DEFINER` via `/rest/v1/rpc/`. Le droit d'exécution leur a été retiré,
et `supabase/schema.sql` porte la correction pour toute installation future.

Il reste un avis d'information : `evenements_stripe` a la RLS active sans
policy. C'est voulu — seule la clé `service_role` doit y toucher.

### Clés publiques — posées

`public/config.js` contient l'URL du projet et la clé `anon`. Cette clé est
publique par construction : c'est la RLS, vérifiée ci-dessus, qui protège les
données.

**Conséquence immédiate : dès que le site est en ligne, ces parties marchent
sans rien d'autre**, parce qu'elles parlent à Supabase depuis le navigateur —
l'analyseur gratuit, la connexion par lien, le dépôt d'un relevé, le suivi des
contestations, l'historique, les réglages.

---

## Ce qui manque, et pourquoi je ne peux pas le faire

Trois étapes vivent dans des tableaux de bord, derrière une connexion à vos
comptes. Aucune n'est longue.

### 1. Vercel — mettre le site en ligne, et poser les variables

**Le connecteur Vercel ne sait pas écrire de variables d'environnement.** Il
sait déployer, acheter, lire des journaux — pas configurer. Et créer un projet
lié à Git exige un identifiant d'équipe : le compte n'en a aucune, c'est un
compte personnel.

Déployer les fichiers directement contournerait le premier point mais pas le
second : sans variables, `/api/checkout`, `/api/webhook`, `/api/rapport-hebdo`
et `/api/diagnostic` répondraient en erreur. Un site où le bouton « S'abonner »
échoue vaut moins qu'un site pas encore en ligne.

À faire, dans l'interface Vercel :

1. **Add New → Project → Import** le dépôt GitHub.
2. **Réglez la branche de production** sur `claude/nouveau-projet-independant-8m44mf`.
   Par défaut Vercel prend `main`, qui contient **Créatis** — vous déploieriez
   le mauvais projet.
3. **Settings → Environment Variables** : les treize variables de `.env.exemple`.
   Deux se fabriquent en une commande chacune :
   `openssl rand -hex 32` pour `CRON_SECRET`, puis pour `SECRET_RAPPORT`.
4. Redéployez après avoir posé les variables — celles ajoutées après un
   déploiement ne sont pas prises en compte.

`SUPABASE_URL` est déjà connue : `https://rbjegjctaqynnmnuxuee.supabase.co`.
`SUPABASE_SERVICE_ROLE` se copie dans Supabase → Project Settings → API.

### 2. Stripe — un compte séparé, et le mode live

Le compte connecté est **l'environnement de test de Créatis**
(`acct_1TVnwYAKwn6IEnxD`, `livemode: false`). Deux problèmes, chacun bloquant :

- **C'est le compte de Créatis.** Y créer les tarifs d'Ardoise mélangerait les
  deux activités, ce que la règle 3 du projet interdit.
- **Il est en mode test.** Un client pourrait souscrire sans qu'un centime soit
  encaissé.

Créer un compte Stripe distinct est une inscription — elle ne passe pas par un
connecteur. Une fois le compte créé et connecté, je crée les quatre tarifs et
je vérifie le webhook.

### 3. Brevo — une clé d'API, et un expéditeur pour Ardoise

Le compte est actif, plan gratuit, 300 courriers par jour : très au-delà du
besoin. Mais les deux expéditeurs déclarés sont ceux de Créatis
(`otasso.andre@gmail.com`, `contact@creatis.app`).

Le connecteur Brevo sait lire les expéditeurs, pas en créer, ni fabriquer une
clé d'API. À faire :

1. **Senders, Domains & Dedicated IPs → Domains** : ajouter le domaine
   d'Ardoise et poser les enregistrements DNS (SPF, DKIM, DMARC). Sans domaine
   authentifié, les rapports partent en indésirables — c'est l'étape qui décide
   si le client lit son courrier.
2. **SMTP & API → API Keys** : générer une clé → `BREVO_API_KEY`.
3. Déclarer `contact@` ou `rapport@` du domaine comme expéditeur.

---

## Le contrôle qui tranche

Une fois les trois étapes faites :

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://VOTRE-URL/api/diagnostic
```

Il répond `"pret": true` seulement si tout est branché — les treize variables,
chaque table et ses colonnes, l'étanchéité de la clé publique, les quatre
tarifs Stripe avec leur montant et leur récurrence, le mode live, la clé Brevo
et son expéditeur validé.

Tant qu'il ne dit pas `true`, le site n'est pas prêt à recevoir un client.
