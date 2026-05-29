# PROJECT_MAP.md — Créatis
> Lire ce fichier EN PREMIER à chaque session. Évite de relire les gros fichiers en entier.
> Mis à jour : 2026-05-12

---

## Structure des fichiers

### Frontend (HTML)
| Fichier | Rôle |
|---------|------|
| `index.html` | Landing page publique — SEO, tarifs, FAQ JSON-LD |
| `app.html` | Application principale — sidebar + workspace agents |
| `auth.html` | Inscription / connexion — email+password, mode démo |
| `success.html` | Page post-paiement Stripe — confetti + activation plan |
| `cancel.html` | Page annulation Stripe |
| `cgu.html` | Conditions générales d'utilisation |
| `confidentialite.html` | Politique de confidentialité RGPD |
| `mentions-legales.html` | Mentions légales (SIRET 988 630 943 00013) |
| `checklist-lancement.html` | Checklist interne pré-lancement |

### JS (chargés dans app.html dans cet ordre)
| Fichier | Rôle |
|---------|------|
| `js/config.js` | CONFIG global — clés, plans, modèles, URLs |
| `js/agents.js` | Tableau AGENTS — 10 agents avec inputs + construirePrompt() |
| `js/auth.js` | Auth object — Supabase signup/login/demo/logout |
| `js/integrations.js` | YouTube OAuth + Stripe checkout |
| `js/youtube-context.js` | Collecte données chaîne, personnalisation prompts |
| `js/prospection.js` | Base marques sponsors, calcul tarifs |
| `js/emails.js` | EmailJS séquence email + Brevo contacts (client-side) |
| `js/app.js` | AppCreatis class — logique principale (~1500 lignes) |

### CSS
| Fichier | Rôle |
|---------|------|
| `css/style.css` | Variables globales, composants communs (--bg, --vert, etc.) |
| `css/app.css` | Layout app — sidebar + workspace + agents |

### API (Vercel Functions — `/api/`)
| Fichier | Rôle |
|---------|------|
| `api/groq.js` | Proxy Groq — POST {messages, model} → texte IA |
| `api/generate-image.js` | Proxy images — OpenAI gpt-image-1 (principal) + HF/Together (fallback) |
| `api/user-sync.js` | CRUD utilisateur Supabase — actions: get/upsert/increment_generation/upgrade_plan/reset_miniatures |
| `api/create-checkout-session.js` | Crée session Stripe Checkout — retourne {sessionId, url} |
| `api/stripe-webhook.js` | Webhook Stripe — met à jour plan Supabase + email confirmation Brevo |
| `api/youtube-channel.js` | Fetch données chaîne YouTube via API key |

### Config / Infra
| Fichier | Rôle |
|---------|------|
| `serveur.js` | Serveur Node local port 3000 (dev uniquement) |
| `vercel.json` | Config Vercel — routes, fonctions |
| `.env` | Variables locales (jamais commitées) |
| `package.json` | Dépendances Node (stripe, @supabase/supabase-js) |

---

## Fonctions principales par fichier JS

### js/config.js — objet CONFIG
- `estConfigured()` → toujours true (clés côté serveur)
- `estImageConfigured()` → true (FLUX gratuit)
- `estYouTubeConfigured()` → vérifie YOUTUBE_CLIENT_ID
- `estStripeConfigured()` → vérifie STRIPE_PUBLIC_KEY commence par 'pk_'
- `estSupabaseConfigured()` → vérifie URL + anon key

### js/agents.js — tableau AGENTS (export global)
Signature fixe de tous les agents :
```js
construirePrompt(donnees, contexteYT = '') { ... }
```
Types : `'texte'` (Groq), `'miniature'` (gpt-image-1), `'chat'` (conversationnel)

### js/auth.js — objet Auth
- `init()` → restore session Supabase depuis localStorage
- `inscrire(email, mdp)` → signUp + _syncUtilisateur → déclenche email bienvenue
- `connecter(email, mdp)` → signInWithPassword + sync
- `deconnecter()` → signOut + clear localStorage
- `connexionDemo()` → user fictif local, plan gratuit, 50 générations
- `estAuthentifie()` → booléen
- `getUser()` → objet user courant

### js/integrations.js — YouTube + Stripe
**YouTube :**
- `connecter()` → OAuth redirect
- `traiterCallback()` → échange code → token
- `getToken()` → token depuis localStorage (vérifie expiration)
- `estConnecte()` → booléen
- `deconnecter()` → clear tokens

**Stripe_Integration :**
- `init()` → charge Stripe.js avec STRIPE_PUBLIC_KEY
- `lancerPaiement(plan, annuel)` → POST /api/create-checkout-session → redirect
- `sauvegarderPlanCible(plan)` → localStorage (utilisé par auth.html?plan=pro)
- `getPlanCible()` → lit localStorage
- `getUserId()` → email ou id depuis localStorage

### js/app.js — class AppCreatis
**Gestion état :**
- `getUtilisateur()` / `setUtilisateur(user)` — localStorage `creatis_user`
- `getGenerations()` / `incrementerGenerations()` — quota mensuel
- `getMiniaturesMois()` / `getMaxMiniatures()` / `verifierQuotaMiniatures()`

**UI agents :**
- `selectionnerAgent(agentId)` → charge panneau agent dans workspace
- `construirePanneauAgent(agent)` → génère le formulaire HTML
- `construireFormulaire(agent)` → inputs dynamiques selon agent.inputs
- `construirePanneauChat(agent)` → interface chat pour agent chat-libre

**Résultats :**
- `afficherTexte(agentId, texte)` → rendu markdown
- `afficherImage(agentId, dataUrl)` → affiche miniature générée
- `afficherMiniaturePro(agentId, imageUrl, donnees)` → éditeur overlay miniature
- `telechargerResultat(agentId)` → télécharge texte ou image

**Dashboard :**
- `afficherDashboard()` / `mettreAJourDashboard()` → onglet stats
- `_dashMettreAJourStats()` → compteurs générations/miniatures
- `_dashMettreAJourPlan()` → affiche plan actif + bouton upgrade
- `_dashMettreAJourChaine()` → infos chaîne YouTube

**Paiement :**
- `_upgraderPlan()` → redirect vers index.html#tarifs
- `_acheterCredits(quantite, prix)` → Stripe one-time pour miniatures supplémentaires
- `afficherModalCreditsMiniatures(mode)` → modal achat/upgrade miniatures

**Onboarding :**
- `_afficherOnboarding()` → modal 3 étapes (localStorage `creatis_onboarding_done`)
- `_onbEtape(n)` / `_onbAnalyser()` / `_onbTerminer()`

---

## Variables importantes de config.js

```js
// Modèles IA
GROQ_MODEL: 'llama-3.3-70b-versatile'
TOGETHER_IMAGE_MODEL: 'black-forest-labs/FLUX.1-schnell-Free'

// Endpoints
GROQ_URL: '/api/groq'
USER_SYNC_URL: '/api/user-sync'

// Plans (generations: -1 = illimité)
gratuit → 50 générations, 5 miniatures, 4 agents (youtube-complet, youtube-short, idees-videos, chat-libre)
pro     → illimité, 30 miniatures/mois, tous agents — 19€/mois (9,50€ 1er mois avec CREATIS50) (stripeId: price_1TVo3PAKwn6IEnxDX4c2KBhC)
studio  → illimité, 100 miniatures/mois, tous agents — 49€/mois (stripeId: price_1TVo3QAKwn6IEnxDaZV9u9wE)

// Stripe price IDs (TEST mode)
pro_mensuel:    price_1TVo3PAKwn6IEnxDX4c2KBhC  (19€/mois)
pro_annuel:     price_1TVo3PAKwn6IEnxDK4AUilNb  (180€/an)
studio_mensuel: price_1TVo3QAKwn6IEnxDaZV9u9wE  (49€/mois)
studio_annuel:  price_1TVo3QAKwn6IEnxDZ1ke8FOD  (468€/an)

// localStorage keys
'creatis_user'            → objet user (id, email, plan, chaine_*)
'creatis_generations'     → count générations mois courant
'creatis_sb_session'      → session Supabase JWT
'creatis_onboarding_done' → '1' si onboarding vu
'creatis_yt_token'        → token YouTube OAuth
```

---

## Les 10 agents (js/agents.js)

| ID | Nom | Type | Plan | Description courte |
|----|-----|------|------|-------------------|
| `youtube-complet` | YouTube Complet | texte | Gratuit | Titres + script complet + description SEO + tags |
| `miniature-ia` | Miniature Pro | miniature | Pro | Image 1536×1024 via gpt-image-1, 5 formules visuelles |
| `youtube-short` | YouTube Short | texte | Gratuit | Script viral 30-60s (hook, storytelling, conseil, twist) |
| `recyclage-contenu` | Recyclage Contenu | texte | Pro | Vidéo → posts LinkedIn/Twitter/Instagram/Newsletter |
| `idees-videos` | Idées de Vidéos | texte | Gratuit | 30 idées personnalisées selon niche + tendances |
| `reponses-commentaires` | Réponses Commentaires | texte | Pro | Réponses authentiques aux commentaires YouTube |
| `prospection-sponsors` | Prospection Sponsors | texte | Pro | Marques compatibles + emails de prospection |
| `analyse-video` | Analyse Vidéo | texte | Pro | Analyse performance + recommandations |
| `chat-libre` | Chat IA Libre | chat | Gratuit | Assistant IA conversationnel libre |
| `offre-commerciale` | Offre Commerciale | texte | Pro | Rédige une offre de partenariat marque |

**Règle critique** : tous les prompts reçoivent `contexteYT` injecté automatiquement par app.js si YouTube connecté. Ne jamais hardcoder de données chaîne.

---

## API Vercel — variables d'environnement requises

| Variable | Où | Usage |
|----------|-----|-------|
| `GROQ_API_KEY` | Vercel ✓ | Génération texte |
| `OPENAI_API_KEY` | Vercel ✓ | Génération images (gpt-image-1) |
| `SUPABASE_URL` | Vercel ✓ | DB utilisateurs |
| `SUPABASE_SERVICE_KEY` | Vercel ✓ | CRUD Supabase server-side |
| `STRIPE_SECRET_KEY` | Vercel ✓ | Checkout (TEST mode) |
| `STRIPE_WEBHOOK_SECRET` | Vercel ✓ | Validation webhooks |
| `BREVO_API_KEY` | Vercel ✓ | Emails transactionnels |
| `YOUTUBE_API_KEY` | Vercel ✓ | Fetch chaîne YouTube |
| `APP_URL` | Vercel ✓ | https://creatis.app |
| `HF_TOKEN` | Vercel ✗ | Fallback images HuggingFace (optionnel) |

---

## Flows critiques

### Inscription → Email bienvenue
`auth.html` → `Auth.inscrire()` → Supabase signUp → `_syncUtilisateur()` → POST `/api/user-sync?action=upsert` → si `isNewUser` → `envoyerEmailBienvenue()` → Brevo SMTP

### Paiement Pro
`index.html#tarifs` → `auth.html?plan=pro` → connexion → `Stripe_Integration.lancerPaiement('pro')` → POST `/api/create-checkout-session` → redirect Stripe → `success.html` → webhook → `/api/stripe-webhook` → update plan Supabase + email confirmation Brevo

### Génération IA (texte)
`app.js` → `construireFormulaire()` → submit → `agent.construirePrompt(donnees, contexteYT)` → POST `/api/groq` → `afficherTexte()` + `incrementerGenerations()`

### Génération miniature
`app.js` → `verifierQuotaMiniatures()` → prompt image → POST `/api/generate-image` → `afficherMiniaturePro()` + éditeur overlay

---

## Dernières modifications importantes (2026-05-18)
- `api/user-sync.js` : fix Supabase upsert (`resolution=merge-duplicates`), email bienvenue retourne messageId
- `api/create-checkout-session.js` : trim APP_URL, variable const APP_URL
- `auth.html` : "10 agents" (était 8)
- DMARC DNS configuré sur `_dmarc.creatis.app`
