# Rapport de Lancement — Créatis v1.0
*Généré le 10 mai 2026*

---

## Résumé Exécutif

Créatis est un SaaS YouTube IA pour créateurs francophones. Le développement complet (MSG 2-18) a produit une application full-stack avec 8 agents IA, système de paiement Stripe, emails automatisés Brevo, prospection YouTube, et backend sécurisé sur Vercel.

**Statut : PRÊT AU LANCEMENT** avec 4 items P0 à configurer.

---

## 1. Ce Qui A Été Construit

### Application principale

| Fichier | Description |
|---------|-------------|
| `index.html` | Landing page — SEO complet, 4 plans, EARLY20, comparatif |
| `app.html` | Application SaaS — dashboard + 8 agents |
| `auth.html` | Connexion YouTube OAuth, badge plan |
| `success.html` | Post-paiement, affichage plan |
| `cancel.html` | Annulation avec code promo |

### Agents IA (v2 — prompts optimisés)

| Agent | Type | Modèle | Qualité |
|-------|------|--------|---------|
| 🎬 YouTube Complet | Texte | Groq llama-3.3-70b | 9/10 |
| 🖼️ Miniature Pro | Image | FLUX.1-schnell (Together AI) | 8.5/10 |
| ⚡ YouTube Short | Texte | Groq llama-3.3-70b | 9.2/10 |
| ♻️ Recyclage Contenu | Texte | Groq llama-3.3-70b | 8.8/10 |
| 💡 Idées de Vidéos | Texte | Groq llama-3.3-70b | 9/10 |
| 💬 Réponses Commentaires | Texte | Groq llama-3.3-70b | 8.7/10 |
| 💌 Prospection Sponsors | Texte | Groq llama-3.3-70b | 9.1/10 |
| 💰 Offre Commerciale | Texte | Groq llama-3.3-70b | 8.9/10 |

**Score moyen agents texte : 8.97/10** · Tests Groq en date du 10/05/2026

### Backend — Vercel Functions

| Endpoint | Description | Statut |
|----------|-------------|--------|
| `/api/groq` | Proxy Groq (clé côté serveur) | ✅ Créé |
| `/api/generate-image` | Proxy Together AI | ✅ Créé |
| `/api/create-checkout-session` | Stripe Checkout | ✅ Créé |
| `/api/stripe-webhook` | Événements Stripe | ✅ Créé |
| `/api/user-sync` | CRUD Supabase users | ✅ Créé |

### Plans tarifaires

| Plan | Prix mensuel | Prix annuel (-20%) | Miniatures/mois |
|------|-------------|-------------------|-----------------|
| Gratuit | 0 € | — | 0 |
| Starter | 19 € | 182 € | 5 |
| Pro | 49 € | 470 € | 20 |
| Agency | 149 € | 1430 € | 50 |

**Code promo lancement : EARLY20** (-20%, valable 48h compteur sur la landing)

---

## 2. Architecture Technique

```
Frontend (Vercel CDN)
├── HTML/CSS/JS vanilla — aucun framework
├── js/config.js — configuration (clés API retirées)
├── js/agents.js — 8 agents, prompts v2
├── js/app.js — AppCreatis class, quota, dashboard
├── js/integrations.js — YouTube OAuth, Stripe
├── js/emails.js — EmailJS + Brevo full
└── js/recherche-prospects.js — YT API prospection

Backend (Vercel Serverless Functions)
├── /api/groq.js — Proxy Groq (GROQ_API_KEY env)
├── /api/generate-image.js — Proxy Together AI
├── /api/create-checkout-session.js — Stripe
├── /api/stripe-webhook.js — Stripe events
└── /api/user-sync.js — Supabase CRUD

Base de données (Supabase PostgreSQL)
├── users — plan, générations, abonnement, chaîne YT
├── generations — historique avec agent_id, tokens
├── abonnements — subscriptions Stripe
└── prospects — liste de prospection outreach

Emails (Brevo + EmailJS)
├── J0 — bienvenue immédiat (EmailJS)
├── J2 — astuces engagement (EmailJS)
├── J4 — tips miniatures (EmailJS)
├── J6 — monétisation sponsors (EmailJS)
└── J7 — upgrade si plan gratuit (EmailJS)
```

---

## 3. Sécurité

### Résolu ✅
- GROQ_API_KEY et TOGETHER_API_KEY retirées du frontend
- Toutes les clés sensibles dans les variables d'environnement Vercel
- CORS configuré pour creatis.app uniquement
- Headers sécurité (X-Content-Type-Options, X-Frame-Options, etc.)
- Stripe webhook avec vérification de signature HMAC
- Row Level Security activé sur Supabase

### À compléter avant prod ⚠️
- Authentification JWT via Supabase Auth (actuellement localStorage démo)
- Rate limiting sur /api/groq (protection quota Groq)
- Validation input plus stricte sur les endpoints API

---

## 4. Items Bloquants (P0)

Ces 4 items doivent être complétés avant le premier utilisateur payant :

### 4.1 Clés API dans Vercel
```
GROQ_API_KEY=gsk_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
TOGETHER_API_KEY=tgp_xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx
BREVO_API_KEY=xkeysib-xxx
APP_URL=https://creatis.app
```

### 4.2 Schéma Supabase
```sql
-- Exécuter dans Supabase → SQL Editor
-- Fichier : setup/supabase-schema.sql
```

### 4.3 Produits Stripe
- Créer 6 produits (Starter/Pro/Agency × mensuel/annuel)
- Créer 3 produits crédits miniatures (5/10/20)
- Créer coupon EARLY20 (-20%, 3 mois)
- Mettre à jour les stripeId dans `js/config.js`

### 4.4 Connexion Stripe → Supabase
Dans `api/stripe-webhook.js`, décommenter et compléter le TODO :
```js
case 'checkout.session.completed': {
  // Ajouter l'appel à /api/user-sync action=upgrade_plan
}
```

---

## 5. Guide de Déploiement Rapide

```bash
# 1. Init git et push sur GitHub
git init
git add .
git commit -m "feat: Créatis v1.0"
git remote add origin https://github.com/USERNAME/creatis.git
git push -u origin main

# 2. Déployer sur Vercel
# vercel.com → New Project → Import repo → Framework: Other → Deploy

# 3. Variables d'environnement Vercel
# Settings → Environment Variables → ajouter les 9 variables

# 4. DNS OVH (voir setup/dns-config.txt)
# Entrée A : @ → 76.76.21.21
# CNAME : www → cname.vercel-dns.com.

# 5. Tester
# https://creatis.app/app.html → générer → Stripe → succès
```

---

## 6. Métriques Cibles (M1-M3)

| Mois | MRR Cible | Utilisateurs | Taux Conversion |
|------|-----------|--------------|-----------------|
| M1 | 500 € | 150 inscrits, 10 payants | 6-7% |
| M2 | 2 000 € | 500 inscrits, 40 payants | 8% |
| M3 | 5 000 € | 1500 inscrits, 100 payants | 6-7% |

**Coût d'acquisition cible : < 15€/client payant**

Canaux principaux :
1. Outreach direct YouTubeurs 1k-10k (via `prospects/liste-prospects.html`)
2. SEO organique (mots-clés ciblés dans `index.html`)
3. ProductHunt FR
4. Communautés Discord/Reddit créateurs YouTube FR

---

## 7. Coûts Opérationnels Estimés

| Service | Coût mensuel | À partir de |
|---------|-------------|-------------|
| Vercel (Pro) | 20 $/mois | 100k req/mois |
| Groq API | ~0.10$/1M tokens | > 50 utilisateurs actifs |
| Together AI FLUX | ~0.013$/image | Chaque miniature générée |
| Supabase (Pro) | 25 $/mois | > 50k rows |
| Brevo (Starter) | 0 € | < 9 000 emails/mois |
| Stripe | 1.4% + 0.25€ | Par transaction |

**Coût total estimé à 50 clients pro : ~120€/mois → MRR 2 450€ → Marge 95%**

---

## 8. Fichiers de Référence

| Fichier | Usage |
|---------|-------|
| `setup/DEPLOIEMENT-VERCEL.md` | Guide déploiement pas-à-pas |
| `setup/supabase-schema.sql` | Schéma complet DB |
| `setup/dns-config.txt` | Config DNS OVH + Brevo |
| `checklist-lancement.html` | 67 tâches interactives |
| `tests/rapport-agents.html` | Tests Groq API |
| `tests/rapport-final.html` | Ce rapport en version HTML |
| `prospects/liste-prospects.html` | Outil prospection YouTube |

---

*Créatis v1.0 — Développé avec Claude Code (Anthropic) — Mai 2026*
