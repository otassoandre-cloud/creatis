# Guide déploiement Vercel — Créatis

## Étape 1 — Prérequis
- Compte GitHub : github.com
- Compte Vercel : vercel.com (gratuit)
- Domaine creatis.app configuré chez OVH

## Étape 2 — Push sur GitHub

```bash
git init
git add .
git commit -m "feat: Créatis v1.0 — lancement initial"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/creatis.git
git push -u origin main
```

## Étape 3 — Déploiement Vercel

1. Va sur vercel.com → "New Project"
2. Importe le repo GitHub `creatis`
3. Settings :
   - Framework Preset : **Other**
   - Root Directory : `.`
   - Build Command : *(laisser vide)*
   - Output Directory : `.`
4. Clique "Deploy"

## Étape 4 — Variables d'environnement Vercel

Dans Vercel Dashboard → Settings → Environment Variables :

| Variable | Valeur | Environnement |
|----------|--------|---------------|
| `GROQ_API_KEY` | ta clé Groq | Production, Preview |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Production seulement |
| `STRIPE_WEBHOOK_SECRET` | webhook secret Stripe | Production |
| `TOGETHER_API_KEY` | ta clé Together AI | Production, Preview |
| `HF_TOKEN` | ton token HuggingFace | Production, Preview |
| `BREVO_API_KEY` | ta clé Brevo | Production |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview |
| `SUPABASE_SERVICE_KEY` | service role key | Production, Preview |
| `APP_URL` | `https://creatis.app` | Production |

## Étape 5 — Domaine personnalisé

1. Vercel Dashboard → Settings → Domains
2. Ajoute `creatis.app` et `www.creatis.app`
3. Vercel affiche les enregistrements DNS à configurer

## Étape 6 — DNS OVH

Dans OVH → Zone DNS → Modifier les entrées :

```
# Entrée A principale
Type : A
Sous-domaine : (vide = @)
Valeur : 76.76.21.21  (IP Vercel)
TTL : 3600

# Sous-domaine www
Type : CNAME
Sous-domaine : www
Valeur : cname.vercel-dns.com.
TTL : 3600
```

Vérification DNS : `nslookup creatis.app` (propagation 5 à 30 min)

## Étape 7 — Stripe Webhook

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL : `https://creatis.app/api/stripe-webhook`
3. Événements à écouter :
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copie le **Webhook Secret** → ajoute dans Vercel env `STRIPE_WEBHOOK_SECRET`

## Étape 8 — Test final

- [ ] https://creatis.app charge
- [ ] https://creatis.app/app.html fonctionne
- [ ] Connexion YouTube OAuth fonctionne
- [ ] Génération Groq fonctionne
- [ ] Stripe Checkout s'ouvre
- [ ] Webhook Stripe reçoit les events
- [ ] Success.html affiche le bon plan

## Rollback

```bash
vercel rollback  # Revenir au déploiement précédent
```
