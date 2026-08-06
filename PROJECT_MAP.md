# PROJECT_MAP.md — Créatis
> Lire ce fichier EN PREMIER à chaque session. Évite de relire les gros fichiers en entier.
> Mis à jour : 2026-08-03

**Le produit a changé de centre de gravité.** Créatis a démarré comme suite d'agents IA pour
YouTube (`app.html` + 10 agents). Aujourd'hui l'activité, les paiements et la quasi-totalité du
développement portent sur **Clips Viraux** : `clips-v2.html` + `api/repurpose.js` +
`repurpose-service/main.py`. Les agents existent toujours mais ne sont plus le sujet.

---

## Fichiers à connaître en priorité

| Fichier | Taille | Rôle |
|---|---|---|
| `clips-v2.html` | **6 661 lignes** | Éditeur de clips complet — upload, analyse, studio, sous-titres, cadrage, export. Tout est inline (HTML+CSS+JS). **Ne jamais lire en entier**, cibler au Grep. |
| `api/repurpose.js` | 1 761 lignes | Cerveau serveur des clips — 22 modes (voir plus bas) |
| `repurpose-service/main.py` | 4 259 lignes | Service Railway — yt-dlp, Whisper, ffmpeg, cadrage visage, R2 |
| `js/config.js` | 150 lignes | CONFIG global — plans, prix, clés publiques |
| `api/user-sync.js` | 567 lignes | CRUD utilisateur + rapport quotidien par email |
| `api/stripe-webhook.js` | 748 lignes | Webhooks Stripe → plan Supabase + alertes échec paiement |

`clips-v2.html` est chargé **dans une iframe** par `app.html` (URL visible : `creatis.app/app`).
Conséquence pratique : penser au contexte iframe pour tout ce qui touche au stockage ou à l'auth.

---

## Structure des fichiers

### Frontend (HTML)
| Fichier | Rôle |
|---|---|
| `clips-v2.html` | **Éditeur Clips Viraux — le produit** |
| `app.html` | Coque application (rail latéral + iframe clips-v2) |
| `lp.html` / `index.html` | Landing pages publiques |
| `auth.html` | Inscription / connexion — supporte `?returnUrl=` et `?plan=` |
| `paiement.html` | Checkout Stripe embarqué |
| `success.html` / `cancel.html` | Retours Stripe |
| `parrainage.html` / `affiliation.html` | Programme d'affiliation |
| `admin-affiliation.html` / `admin-prospection.html` | Pages admin |
| `alternatives/*.html` (7) | SEO comparatifs concurrents |
| `blog/*.html` (39) | SEO — 2 articles/semaine |

### JS
| Fichier | Rôle |
|---|---|
| `js/config.js` | CONFIG — plans, prix, clés publiques, Supabase |
| `js/auth.js` | Auth — Supabase signup/login, `Auth.getToken()` |
| `js/agents.js` | 10 agents IA (hérité, peu touché) |
| `js/app.js` | AppCreatis (hérité, ~1500 lignes) |
| `js/ref-capture.js` | Capture `?ref=` affiliation sur 26 pages |
| `js/integrations.js` | YouTube + Stripe |

### API (Vercel Functions)
| Fichier | Rôle |
|---|---|
| `api/repurpose.js` | **Clips — 22 modes** |
| `api/user-sync.js` | CRUD user, quotas, rapport quotidien, `log_clip_export` |
| `api/stripe-webhook.js` | Plan Supabase, `paiements_echoues`, alertes admin |
| `api/create-checkout-session.js` | Session Stripe (embarquée) |
| `api/groq.js` / `api/generate-image.js` | Agents hérités |
| `api/youtube-channel.js` | Fetch chaîne par handle (pas OAuth) |
| `api/parrainage.js` | Affiliation, paliers |

### Infra
| Fichier | Rôle |
|---|---|
| `repurpose-service/main.py` | Service Railway (FastAPI) |
| `repurpose-service/Dockerfile` | **Contient une couche `pip --upgrade yt-dlp` APRÈS les COPY** — voir Gotchas |
| `vercel.json` | Config Vercel |
| `supabase-*.sql` (9 fichiers) | Migrations à exécuter à la main dans Supabase |

---

## Tarification (refonte du 27/07/2026)

| Plan | Prix | Vidéos/mois | Clips téléchargeables/mois | Stripe price ID (LIVE) |
|---|---|---|---|---|
| **Découverte** | 0 € | 2 | **0** | — |
| **Starter** | 9,95 €/mois | 5 | 20 | `price_1Tx8TXAptK6HZtp5vB5clklV` |
| **Pro** | 14 €/mois | 30 | 150 | `price_1Tx8U8AptK6HZtp5DrLkfs5m` |
| **Pro annuel** | 139 €/an | 30 | 150 | `price_1TxaweAptK6HZtp5p0LjSDk5` |

Legacy encore mappés dans `stripe-webhook.js` : `price_1Tonw3…` (149 €/an), `price_1Tonvg…` (19,90 €).

**Le gratuit ne donne aucun clip.** L'analyse et l'aperçu des 10 clips sont libres ; le paywall se
déclenche au clic sur **Export** (`trigger: 'export_gratuit'`). Le plan `gratuit` est masqué dans
la grille tarifaire (`masqueDansGrille: true`) — l'essai existe, mais n'est pas vendu comme un plan.

Quotas dupliqués côté serveur dans `api/repurpose.js` (`QUOTAS`, ~ligne 81) — les deux doivent
rester synchronisés avec `js/config.js`.

---

## Les 22 modes de `api/repurpose.js`

**Analyse** — `clips`, `clips_status`, `rank_clips_visual`, `confirmer_analyse`, `text`
**Upload** — `upload-token`, `upload-status`
**Médias** — `raw_segment`, `raw_segment_status`, `preview_clip`, `preview_clip_status`,
`clip_stream_url`, `clip_export`, `clip_export_status`
**Shorts** — `shorts_start`, `shorts_status`
**Historique** — `save_generation`, `list_generations`, `get_generation`
**Divers** — `translate_segments`, `notify_clips_ready`, `debug_log`

`PUBLIC_MODES` (sans auth) : `upload-token`, `clips`, `rank_clips_visual`, `upload-status`,
`log_lead`, `notify_clips_ready`, `debug_log`. Tout le reste exige un JWT Supabase.

`confirmer_analyse` existe pour une raison précise : le quota vidéo n'est décompté **qu'après**
que le client a affiché ses clips. Sans ça, une réponse perdue en route brûlait un crédit sur un
écran d'erreur.

---

## Stockage et persistance

### Cloudflare R2 — bucket `creatis-r2`
| Préfixe | Contenu | Durée |
|---|---|---|
| `seg/{video_id}/{début}_{fin}.mp4` | Segments bruts 60 s, 720p | **Permanent — ne jamais faire expirer** |
| `exports/{uuid}/clip_9x16.mp4` | Clip fini livré par lien signé | 7 jours (durée du lien) |

La clé `seg/` est **indépendante du cadrage et des sous-titres** : un segment téléchargé une fois
ne le sera plus jamais, quel que soit l'utilisateur. Consulté **avant** toute tentative YouTube.
Un auto-test aller-retour tourne au démarrage → `[r2] ✓ opérationnel`.

### Supabase — tables
| Table | Rôle |
|---|---|
| `users` | plan, `repurpose_count`, `videos_count`, compteurs mensuels |
| **`clip_generations`** | Historique des analyses (métadonnées seules) |
| `paiements_echoues` | Échecs Stripe + alerte admin |
| `affiliate_promo_codes` | Attribution affilié par code promo |
| `prospects`, `blacklist`, `tiktok_*` | Prospection |

⚠️ **Une table `generations` préexiste** (id, user_id, created_at, `count`, plan) — vieux compteur
d'usage, **sans rapport** avec l'historique. Voir Gotchas.

---

## Téléchargement YouTube — la partie fragile

> **En cas de panne : lire `DIAGNOSTIC_YOUTUBE.md` en premier.** Trois causes distinctes
> produisent le même symptôme et appellent des corrections opposées ; la signature dans les
> logs est la seule chose qui les sépare. La panne totale du 06/08 s'est réglée sans dépense.

Trois chemins, dans cet ordre :

1. **Cache R2** — instantané, gratuit, aucune requête YouTube
2. **yt-dlp gratuit** depuis l'IP Railway (+ jetons PO via service `bgutil`) — gratuit mais
   dépend du bon vouloir de YouTube
3. **Proxy résidentiel Webshare** (`RESIDENTIAL_PROXY_URL`) — ~7 €/Go, plafonné à
   **24 segments/heure** (`_PROXY_MAX_PAR_HEURE`)

Le chemin gratuit **casse par périodes** quand YouTube durcit le contrôle sur les plages d'IP
datacenter (épisode du 02/08/2026 : `ffmpeg exited with code 8` = 403 sur le média alors que
l'extraction des formats réussit). Ce n'est ni une régression du code ni une question de version
yt-dlp — c'est YouTube. Vérifier avant de chercher un bug chez nous.

Diagnostic dans les logs Railway :
```
[yt-dlp] version installée = …          au démarrage
[r2] ✓ opérationnel                     au démarrage
[raw-segment] … → tentative via PROXY résidentiel
[raw-segment] … source 1280,720 via gratuit|PROXY
[r2] ✓ mis en cache seg/…
```

---

## Analytics

**Un seul projet PostHog** : `Default project`, **ID 205829**, région EU,
token `phc_vdxr7qhoBWZKASMMnJcefKcUKYbMti34FDd933nur6pJ`.

Utilisé par les **90 fichiers** HTML/JS du site. Une seconde clé `phc_hYTq…` a traîné jusqu'au
03/08/2026 sur 89 pages — elle ne correspondait à **aucun projet existant**, donc ces pages
n'envoyaient rien. C'était la cause du « tracking landing page mort depuis le 22 juin ».

Le rapport quotidien (`api/user-sync.js?action=daily_report`) interroge
`/api/projects/205829/query/` en HogQL. Il renvoie un champ `posthog` dans sa réponse JSON :
`null` = clé absente ou refusée, `{}` = connexion OK mais aucun événement sur la période.

Microsoft Clarity tourne aussi sur clips-v2 (`wqzt6m475j`).

---

## Variables d'environnement

### Vercel
`GROQ_API_KEY`, `GEMINI_API_KEY`, `TOGETHER_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_URL`,
`SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`BREVO_API_KEY`, `YOUTUBE_API_KEY`, `APP_URL`, `REPURPOSE_SERVICE_URL`,
`REPURPOSE_SERVICE_SECRET`, `POSTHOG_API_KEY`, `POSTHOG_PROJECT_ID` (= 205829)

### Railway (service `lavish-warmth`, projet `vibrant-grace`)
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
`RESIDENTIAL_PROXY_URL`, `YOUTUBE_COOKIES`, `YT_DOWNLOAD_API_KEY`, `BGUTIL_URL`,
`WHISPER_MODEL`, `GROQ_API_KEY`, `REPURPOSE_SERVICE_SECRET`, `SUPABASE_*`, `STRIPE_*`

⚠️ Les noms diffèrent entre code et plateforme : le code lit `R2_ACCESS_KEY_ID` dans une variable
Python nommée `R2_ACCESS_KEY`. Vérifier `os.environ.get(...)`, pas le nom de la variable Python.

---

## Flows critiques

### Analyse depuis un lien YouTube
`clips-v2.html` → `startAnalyze()` → Railway transcription → `mode:'clips'` (LLM) →
`renderStudio()` → `_prefetchYtSegments()` → `_saveAnalysisAndNotify()` →
`save_generation` + email `notify_clips_ready` (lien `?g=<id>`)

### Historique
Grille *TES VIDÉOS* sous le formulaire ← `_chargerHistorique()` ← `list_generations`
Clic → `_ouvrirGeneration(id)` → `get_generation` → `renderStudio()` — **aucune réanalyse**.
Les médias reviennent du cache R2 ; les segments jamais téléchargés se retéléchargent au clic.
Une génération issue d'un **fichier uploadé** n'est pas rejouable (source non conservée).

### Paiement
`lp.html` → `auth.html?plan=X` → `paiement.html` (checkout embarqué) → webhook Stripe →
`users.plan` → email Brevo

### Résiliation d'abonnement
Volet *Mon compte* → **Gérer mon abonnement** (visible seulement si plan payant) → modal motif →
**offre de rétention adaptée au motif** → portail client Stripe.

| Motif | Geste proposé | Mécanisme Stripe |
|---|---|---|
| `trop_cher` | Passer au Starter 9,95 € | `subscriptions.update` + `proration_behavior:'none'` |
| `pas_le_temps` | Pause 1 mois | `pause_collection: {behavior:'void', resumes_at}` |
| `bug` / `qualite` | Contact support | `mailto:` pré-rempli |
| `concurrent` / `autre` | aucun | direct vers le portail |

Actions serveur : `user-sync.js` → `portail_abonnement` et `retention_appliquer`.
Identité vérifiée par **JWT Supabase**, jamais par un `userId` du corps de requête.
Événements PostHog : `resiliation_intention`, `retention_offre_vue`, `retention_acceptee`.
Alerte email à `contact@creatis.app` sur `customer.subscription.deleted`, avec le motif.

⚖️ **Article L215-1-1 du Code de la consommation** : la résiliation doit être accessible
« facilement, directement et en permanence ». Un écran de rétention est licite, **un seul**.
Ne jamais déplacer ce bouton vers une page de contact ni le masquer.

### Export d'un clip
Studio → **Export** → paywall si plan gratuit → Canvas + MediaRecorder (720×1280, 4 Mbps) →
Railway → R2 → **lien signé** (plus de blob : mobile passait de 14 % à un taux bien meilleur)

---

## Gotchas — lire avant de déboguer

**`create table if not exists` peut ne rien faire.** Une table `generations` préexistait ; mon
script a « réussi » sans rien créer, et toutes les écritures échouaient sur
`column generations.nom does not exist`. D'où le nom `clip_generations`.
→ *Tester l'existence d'une table avec `select=id` ne prouve RIEN* (`id` existe partout).
Interroger une colonne propre au schéma attendu.

**`#state-upload.active` est un `display:flex` EN LIGNE** centré sur les deux axes. Tout bloc
ajouté par JS devient un élément flex posé *à côté* du formulaire. Passer le conteneur en
`flex-direction:column` avant d'ajouter quoi que ce soit.

**La couche pip du Dockerfile est mise en cache indéfiniment.** `requirements.txt` inchangé =
`pip install` jamais rejoué, donc yt-dlp figé. D'où la couche `--upgrade yt-dlp` placée **après**
les `COPY`, rejouée à chaque déploiement.

**PLAFOND DE 12 FONCTIONS VERCEL (plan Hobby).** `api/` en contient exactement 12 —
**le dossier est plein**. Ajouter un 13ᵉ fichier fait échouer TOUT le déploiement avec
`No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan`, et
la production reste silencieusement sur la version précédente. Le piège : le CLI affiche
quand même une URL de déploiement, donc filtrer sa sortie (`| grep https://`) masque l'erreur.
→ Toute nouvelle route doit être une **action d'une fonction existante**, jamais un fichier de
plus. C'est pourquoi le portail de résiliation vit dans `user-sync.js`.
→ Toujours lire la **fin complète** de la sortie de `vercel --prod`, pas seulement l'URL.

**`railway up` toujours depuis la RACINE du dépôt**, jamais depuis `repurpose-service/` —
échec silencieux masqué par le CLI.

**Supabase `id=uuid` : jamais de `LIKE`.** Utiliser une plage `gte`/`lte`.

**Les clés Vercel ne sont pas lisibles** : `vercel env pull` renvoie des valeurs vides pour les
secrets. Inutile d'essayer de lire `SUPABASE_SERVICE_KEY` depuis le poste local.

**`setBar` / `setStep` sont des `const` LOCAUX** aux fonctions d'analyse de clips-v2 — invisibles
ailleurs. Piloter `#analyze-bar` directement depuis une autre fonction.

**Vercel n'a PAS de limite à 15 s** sur ce projet. Une analyse de 230 s a abouti. Ne pas ajouter
de `maxDuration` ni de timeouts clients « préventifs » : ça a cassé la production le 30/07.

---

## Commandes

```bash
node serveur.js                    # dev local port 3000
vercel --prod --yes                # déploiement front + API
railway up --detach                # déploiement Railway (DEPUIS LA RACINE)
railway logs | grep "\[r2\]"       # santé du cache clips
curl "https://creatis.app/api/user-sync?action=daily_report"   # rapport + diagnostic PostHog
```

Validation de syntaxe avant tout déploiement :
```bash
node --check api/xxx.js
python -c "import ast; ast.parse(open('repurpose-service/main.py',encoding='utf-8').read())"
# clips-v2.html : extraire les <script> inline et les passer dans vm.Script
```

---

## Historique des changements majeurs

**2026-08-03** — Historique des générations (`clip_generations` + grille de vignettes + lien email
`?g=`) · correctif qualité 720p (le proxy forçait des clients android/ios sans formats HD) ·
proxy résidentiel rendu réellement atteignable (un `break` le court-circuitait) · clé PostHog
réparée sur 89 fichiers · bouton « Reprendre » corrigé pour les sources YouTube

**2026-07-30** — Tunnel de paiement réparé sur les deux chemins · analyses coupées à 15 s (faux
diagnostic, reverté) · retour mobile destructeur corrigé

**2026-07-27** — Refonte tarifaire : gratuit permanent → essai unique · Starter 9,95 € · Pro 14 €

**2026-07-21** — API payante de téléchargement YouTube en secours du chemin gratuit

**2026-07-13** — Découpage multi-passes, job asynchrone anti-mise-en-veille iOS

**2026-06-19** — PostHog + funnel · `YOUTUBE_COOKIES` débloque les vidéos protégées

**2026-05-30** — Chaîne LLM Groq → Gemini → Together AI · CORS mobile via `?token=`

---

## Hérité — agents IA (`app.html`)

10 agents dans `js/agents.js`, signature fixe :
```js
construirePrompt(donnees, contexteYT = '') { ... }
```
`contexteYT` est injecté automatiquement par `app.js` si une chaîne YouTube est connectée —
ne jamais coder en dur de données de chaîne.

Types : `'texte'` (Groq), `'miniature'` (gpt-image-1), `'chat'`.
Agents : `youtube-complet`, `miniature-ia`, `youtube-short`, `recyclage-contenu`, `idees-videos`,
`reponses-commentaires`, `prospection-sponsors`, `analyse-video`, `chat-libre`, `offre-commerciale`.

⚠️ **YouTube OAuth n'a jamais été configuré** (`YOUTUBE_CLIENT_ID` vide). Le vrai chemin utilisé
est le fetch public par handle via `api/youtube-channel.js`. Ne pas supposer OAuth sans vérifier.
