# Créatis — Instructions pour Claude Code

## PRIORITÉ ABSOLUE — Lire en premier
**Lis toujours `PROJECT_MAP.md` en premier avant de lire n'importe quel fichier du projet.**
Il contient la structure complète, les fonctions clés, les variables config et les 10 agents.
Seulement après avoir lu PROJECT_MAP.md, utilise Grep/Read ciblés si tu as besoin de détails.

## Projet

SaaS YouTube IA pour créateurs francophones. Stack : HTML/CSS/JS vanilla, Groq API (llama-3.3-70b), HuggingFace FLUX.1-schnell, YouTube OAuth 2.0, Stripe.

Serveur local : `node serveur.js` → port 3000

## Règles de travail

- Travailler en autonomie totale : exécuter, corriger, livrer sans demander confirmation
- Ne s'arrêter que sur blocage réel (clé API manquante, erreur fatale irrésoluble)
- Tout le texte de l'interface en français
- Thème sombre : fond `#0a0f0a`, accent `#10b981` (émeraude)

## Économie de tokens (IMPORTANT — lire à chaque session)

**Fichiers volumineux — ne jamais lire en entier :**
- `js/app.js` (~1500 lignes) : utiliser `offset`+`limit` ou `Grep` pour cibler la section
- `js/agents.js` (~700 lignes) : idem
- `css/app.css` (~1400 lignes) : idem
- `index.html` : très long, cibler avec Grep

**Règles de lecture :**
- Toujours utiliser `Grep` en premier pour localiser un symbole/fonction
- `Read` avec `offset`/`limit` dès que le fichier dépasse 200 lignes
- Ne relire un fichier qu'une seule fois par session — mémoriser ce qui a été lu
- Préférer `Grep pattern --output_mode content -C 5` à `Read` pour de petites recherches

**Règles de réponse :**
- Pas de récapitulatif en fin de tâche si l'utilisateur peut voir le diff
- Pas de commentaires sur ce qu'on va faire — faire directement
- Mises à jour courtes : 1 phrase max entre les tool calls

**Déploiement :**
- Toujours grouper les changements et faire 1 seul `vercel --prod` à la fin
- Ne pas déployer après chaque petit fichier

## Architecture des fichiers

```
js/config.js          — clés API, modèles, plans tarifaires
js/agents.js          — 8 agents IA (construirePrompt signature fixe)
js/app.js             — AppCreatis class, logique principale
js/integrations.js    — YouTube OAuth, Stripe
js/youtube-context.js — collecte données chaîne, personnalisation agents
js/prospection.js     — base marques, calcul tarifs sponsors
css/style.css         — variables globales, composants communs
css/app.css           — layout app (sidebar + workspace)
serveur.js            — Node.js HTTP server port 3000
```

## Clés API configurées

- `GROQ_API_KEY` : configurée dans config.js ✓
- `GEMINI_API_KEY` : configurée dans config.js ✓
- `TOGETHER_API_KEY` : configurée dans config.js ✓
- `HF_TOKEN` : **vide** — à configurer pour activer la génération d'images
- `YOUTUBE_API_KEY` : **vide** — à configurer dans Vercel pour le fetch auto de chaîne (console.cloud.google.com → YouTube Data API v3 → Credentials → API Key)
- `YOUTUBE_CLIENT_ID` : **vide** — OAuth optionnel, non prioritaire
- `STRIPE_PUBLIC_KEY` : **vide** — à configurer pour les paiements

## Standards de code (issus des skills installés)

### Depuis prompt-master (prompt engineering)
- Les prompts Groq utilisent `temperature: 0.8`, `max_tokens: 4096`
- System prompt en français, rôle expert défini
- Chaque agent : contexte → sujet → instructions → format de sortie
- Ne pas ajouter Chain-of-Thought aux modèles llama (dégrade la qualité)
- Ajouter des critères de succès clairs dans chaque prompt

### Depuis cursor-skills (generating-images)
- Toujours vérifier HF_TOKEN avant d'appeler HuggingFace
- Fail fast : si erreur API, surface verbatim à l'utilisateur, ne pas retry silencieusement
- Prompt image structure : sujet + style + composition + palette + fond
- Pour thumbnails YouTube : `1280x720` (ratio 16:9)
- Ne jamais changer de modèle image en cas d'erreur — signaler l'erreur

### Depuis cursor-skills (auditing-security)
- **CRITIQUE** : config.js contient des clés API en clair côté client — acceptable en dev, à sécuriser en prod via un proxy backend
- Ne jamais utiliser `innerHTML` avec des données utilisateur non validées (XSS)
- Toujours `JSON.parse` dans un `try/catch`
- Tokens localStorage : vérifier expiration à chaque `getToken()`

### Depuis cursor-skills (writing-copy) — pour l'interface
- Messages d'erreur : dire QUOI et QUOI FAIRE ("Token HuggingFace invalide — va sur huggingface.co/settings/tokens")
- États vides : guider l'action ("Remplis le formulaire et clique sur Générer")
- Boutons : verbe + complément ("Générer avec l'IA", "Télécharger la miniature")
- Pas de "Cliquer ici" ni "OK"

### Depuis image-prompts (bibliothèque YouTube Thumbnail)
- Pour générer des miniatures YouTube, la bibliothèque `ai-image-prompts-skill` contient 204 prompts catégorisés "YouTube Thumbnail"
- Fichier de référence : `.skills/image-prompts/references/youtube-thumbnail.json`
- Utiliser `grep` pour chercher par mot-clé plutôt que charger tout le fichier
- Les prompts sont en anglais (requis pour les modèles image)
- Format : style clickbait, couleurs vives, fort contraste, composition dramatique

## Agents IA — règles fixes

Tous les agents respectent cette signature :
```js
construirePrompt(donnees, contexteYT = '') { ... }
```

`contexteYT` est injecté automatiquement par `app.js` quand une chaîne YouTube est connectée. Ne jamais hardcoder de données de chaîne dans les prompts.

Types d'agents :
- `type: 'texte'` → appel Groq via `appelGroq(prompt)`
- `type: 'image'` → appel HuggingFace via `appelHuggingFace(prompt)`

## Plan gratuit / Pro

- Gratuit : 10 générations, agents `['youtube-complet', 'youtube-short', 'idees-videos']`
- Pro 29€/mois : générations illimitées, tous les 8 agents
- Agence 97€/mois : 5 chaînes, tout illimité

## Commandes utiles

```powershell
# Démarrer le serveur
node serveur.js

# Tester un agent via Groq (PowerShell)
$body = @{model='llama-3.3-70b-versatile';messages=@(@{role='user';content='test'})} | ConvertTo-Json
Invoke-RestMethod -Uri 'https://api.groq.com/openai/v1/chat/completions' -Method POST -Headers @{'Authorization'='Bearer GROQ_KEY';'Content-Type'='application/json'} -Body $body
```

## Skills installés dans ce projet

| Dossier | Skill | Usage |
|---------|-------|-------|
| `.skills/cursor-skills/` | awesome-cursor-skills | 70+ patterns de développement |
| `.skills/image-prompts/` | ai-image-prompts | 10 000+ prompts image par catégorie |
| `.skills/prompt-master/` | prompt-master | Optimisation prompts par modèle IA |
| `.cursor/rules/clean-code.mdc` | Clean Code | Standards de code |
| `.cursor/rules/codequality.mdc` | Code Quality | Règles qualité Créatis |
