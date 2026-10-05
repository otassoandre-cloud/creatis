# Carte topique Créatis — ÉTAPE 0 (audit de l'existant)

> Document de référence pour le calendrier de publication (carte topique Koray).
> Généré le 10/07/2026. À revalider si de nouvelles pages sont publiées entre-temps.

---

## 1. Design system à réutiliser

### Gabarit "page produit / landing" (index.html, lp.html, generateur-*.html, etc.)
- **Nav pill flottante** (`<nav class="navbar" id="navbar">`) : logo + ancres `#comment-ca-marche`, `#fonctionnalites`, `#resultats`, `#tarifs`, `/affiliation`, `#faq`, `/blog.html`, boutons `Se connecter` / `S'inscrire`. Menu mobile overlay équivalent.
- **Footer** (`.foot-grid`, 4 colonnes) : À propos · **Produit** (Fonctionnalités, Tarifs, Comment ça marche, Blog, Affiliation) · **Agents IA** (Clips Viraux, YouTube Complet, Miniature IA, Analyse Vidéo) · **Ressources** (Comparatifs → `/alternatives/`, Clips de podcast, Clips Twitch) · **Légal**.
- Palette : fond `#0a0f0a`/`#080A0F`, accent `#10b981` (émeraude), police Hanken Grotesk.
- Pricing = ancre `#tarifs` sur la page d'accueil (**pas de page /tarifs dédiée**).

### Gabarit "article de blog" (`/blog/*.html`, `blog.html`)
- Nav allégée spécifique (`blog-nav`) : logo + 1 seul CTA "Essayer gratuitement" → `/clips-v2.html`. **Différente de la nav pill du site principal** (choix assumé lors de la session du 09/07, pour cohérence entre les 11 articles).
- Footer allégé (`blog-footer`) : © + liens Blog/CGU/Confidentialité/Contact.
- `<article>` max-width 720px, H1 unique, H2/H3, `.cta-box` (2 par page : milieu + fin), `.faq-section` en accordéon `<details>`.
- 2 JSON-LD par page : `Article` (pas `BlogPosting`) + `FAQPage`.
- `<script src="/js/ref-capture.js"></script>` systématique (tracking `?ref=` — ne jamais toucher sa logique).
- OG image partagée : `https://creatis.app/images/og-clips-viraux.png`.

### Gabarit "page cas d'usage / comparatif" (`clips-podcast.html`, `clips-twitch.html`, `alternatives/*.html`)
- Reprend le design system principal (nav pill + footer complets), pas le gabarit blog allégé.

**Recommandation pour les nouvelles pages du calendrier** : les pages de type "définition/guide" (Semaines 1-2, une partie 5-7) → gabarit blog (`/blog/slug.html`). Les pages "pilier produit" et "cas d'usage cible" (Semaines 3, 5-6) → gabarit page produit complet, à la racine, comme `clips-podcast.html`.

### Technique
- `sitemap.xml` et `robots.txt` existent, à jour, propres. `/blog/` n'est pas bloqué.
- Convention d'URL : articles éducatifs → `/blog/slug.html` ; pages produit/cas d'usage → `/slug.html` à la racine ; comparatifs → `/alternatives/slug.html`.

---

## 2. Inventaire complet des pages existantes (au 10/07/2026)

### Pages produit / cœur business
| Page | Cible |
|---|---|
| `index.html` | Accueil, hub principal, `#tarifs` |
| `lp.html` | Landing "démo plongée" |
| `clips-v2.html` | L'outil (app de découpe) |
| `outils.html` | Hub des outils IA gratuits |
| `generateur-clips-viraux.html` | "Générateur de clips viraux IA" |
| `outil-ia-createurs-contenu.html` | "Outil IA créateurs de contenu" |
| `script-youtube-ia.html` | "Générateur de script YouTube IA" |
| `generateur-titres-youtube.html` | "Générateur de titres YouTube IA" |
| `description-seo-youtube.html` | "Générateur de description YouTube SEO" |
| `affiliation.html` / `programme-affiliation-youtuber.html` | Programme d'affiliation |
| `checklist-lancement.html` | **noindex/disallow** — hors périmètre SEO |

### Cas d'usage (pages "argent" par source de contenu)
| Page | Cible |
|---|---|
| `clips-podcast.html` | Podcast → clips |
| `clips-twitch.html` | VOD Twitch → clips |

### Comparatifs
| Page | Cible |
|---|---|
| `alternatives/index.html` | Hub comparatifs |
| `alternatives/opus-clip.html` | Alternative à Opus Clip |
| `alternatives/vidyo-ai.html` | Alternative à Vidyo AI |
| `alternatives/klap.html` | Alternative à Klap |
| `alternatives/submagic.html` | Alternative à Submagic |
| `alternatives/vizard.html` | Alternative à Vizard |
| `alternatives/capcut.html` | Alternative à CapCut |

### Blog éducatif — 11 articles (7 en ligne depuis fin juin/début juillet + 4 publiés le 09/07)
| # | Page | Sujet central | Statut sitemap/blog.html |
|---|---|---|---|
| 1 | `blog/decouper-video-shorts-automatiquement.html` | Comment découper une vidéo en Shorts (méthode IA) | ✅ live |
| 2 | `blog/meilleur-outil-clips-viraux-ia.html` | Comparatif 5 outils de clips viraux IA | ✅ live |
| 3 | `blog/transformer-video-youtube-tiktok.html` | YouTube → TikTok | ✅ live |
| 4 | `blog/sous-titres-automatiques-shorts.html` | Sous-titres automatiques : guide complet | ✅ live |
| 5 | `blog/creer-reels-video-longue.html` | Créer des Reels Instagram depuis une vidéo longue | ✅ live |
| 6 | `blog/clips-tiktok-ia.html` | Clips TikTok avec l'IA | ✅ live |
| 7 | `blog/format-shorts-youtube-2026.html` | Format Shorts YouTube (durée, ratio 9:16, résolution) | ✅ live |
| 8 | `blog/combien-shorts-extraire-video-youtube.html` | Ratio de recyclage : combien de Shorts par vidéo | 🟡 déployé, **en attente de sortie** (sitemap/blog.html), publié le 09/07 |
| 9 | `blog/decouper-video-longue-format-interview.html` | Découper une vidéo 1h+ (interview, conférence, live) | 🟡 déployé, en attente |
| 10 | `blog/erreurs-qui-tuent-tes-shorts.html` | 7 erreurs qui tuent tes Shorts | 🟡 déployé, en attente |
| 11 | `blog/pourquoi-ton-crop-9-16-est-rate.html` | Pourquoi ton crop 9:16 est raté | 🟡 déployé, en attente |

Les 4 lignes 🟡 sortent au rythme d'1/jour (décision utilisateur du 09-10/07). Rappel pour Cursor/Claude : ne pas les recréer, seulement les ajouter à `sitemap.xml` + `blog.html` à leur tour, et réactiver leurs liens internes déjà écrits.

---

## 3. Recoupement du calendrier "carte topique Koray" avec l'existant

Le calendrier fourni cite explicitement s'appuyer sur "les 5 articles déjà en ligne" — cet audit datait d'avant le batch du 09/07 (4 nouveaux articles) et n'a jamais tenu compte des pages `alternatives/`, `clips-podcast.html`, `clips-twitch.html`, ni des pages produit. Le tableau ci-dessous reclasse chaque page `NOUVEAU` prévue.

Légende : ✅ **OK** (nouveau sujet, pas de conflit) · ⚠️ **DOUBLON EXTERNE** (existe déjà ailleurs sur le site) · 🔁 **DOUBLON INTERNE** (le calendrier prévoit 2-3 fois le même sujet à des jours différents)

### Semaine 1 — Fondations
| Jour | Page prévue | Statut |
|---|---|---|
| 1 (pilier) | `qu-est-ce-qu-un-clip-viral` | ✅ OK |
| 3 | `repurposing-video-definition` | ✅ OK |
| 3 | `short-reel-tiktok-differences` | ✅ OK |
| 5 | `hook-video-definition` | ✅ OK |
| 5 | `hook-3-secondes` | ✅ OK (mais recouvre un sous-thème déjà traité dans plusieurs articles — prévoir maillage entrant depuis eux) |

### Semaine 2 — Best practices (hub prévu = article "erreurs" = `blog/erreurs-qui-tuent-tes-shorts.html`, publié le 09/07)
| Jour | Page prévue | Statut |
|---|---|---|
| 8 | `duree-ideale-short-reel-tiktok` | ⚠️ chevauche `format-shorts-youtube-2026.html` (durée Shorts YouTube) et `creer-reels-video-longue.html` (durée Reels). À repositionner en angle comparatif multi-plateforme, sinon fusionner. |
| 8 | `combien-de-clips-par-video` | ⚠️ **DOUBLON QUASI EXACT** de `blog/combien-shorts-extraire-video-youtube.html` (publié 09/07). **À retirer du calendrier.** |
| 10 | `pourquoi-mes-shorts-ne-marchent-pas` | ⚠️ **DOUBLON** direct de `blog/erreurs-qui-tuent-tes-shorts.html` — qui est justement désigné comme le hub de ce cluster. **À retirer.** |
| 10 | `ameliorer-retention-short` | ✅ OK, angle spécifique non couvert. Doit lier vers `erreurs-qui-tuent-tes-shorts.html`. |
| 12 | `sous-titres-importance` | ⚠️ chevauche `blog/sous-titres-automatiques-shorts.html` (existant depuis 27/06). À retirer ou fusionner en section. |
| 12 | `dimensions-tiktok-reels-shorts` | ⚠️ chevauche `format-shorts-youtube-2026.html` + 🔁 doublon interne avec `duree-ideale-short-reel-tiktok` (jour 8). À fusionner en une seule page "specs par plateforme". |

### Semaine 3 — Cœur produit (cluster A)
| Jour | Page prévue | Statut |
|---|---|---|
| 15 (pilier) | `logiciel-decouper-video-en-clips` | ⚠️ risque de cannibaliser `generateur-clips-viraux.html` (page produit existante, même requête cœur). **Arbitrage nécessaire** : cette page remplace-t-elle ou complète-t-elle `generateur-clips-viraux.html` ? |
| 17 | `creer-des-shorts-automatiquement` | ⚠️ **DOUBLON FORT** de `blog/decouper-video-shorts-automatiquement.html` (existant, même sujet). |
| 17 | `creer-des-reels-automatiquement` | ⚠️ **DOUBLON** de `blog/creer-reels-video-longue.html`. |
| 19 | `generer-sous-titres-automatiques` | 🔁 3ᵉ occurrence du sujet "sous-titres" dans le calendrier (jours 12, 19) + ⚠️ doublon de `sous-titres-automatiques-shorts.html`. |
| 19 | `sous-titres-animes-tiktok` | ⚠️ sous-angle du même sujet, à fusionner avec la page sous-titres plutôt que créer une page de plus. |

### Semaine 4 — Cœur produit (fin) + comparaisons (début)
| Jour | Page prévue | Statut |
|---|---|---|
| 22 | `detecter-moments-viraux` | ✅ OK, pas de page dédiée existante. |
| 22 | `monter-video-verticale-en-ligne` | ⚠️ à vérifier chevauchement avec `generateur-clips-viraux.html` (page produit). |
| 24 (pilier) | `meilleur-logiciel-clips-viraux` | ⚠️ **DOUBLON QUASI EXACT** de `blog/meilleur-outil-clips-viraux-ia.html` (existant depuis 27/06, comparatif 5 outils). Cannibalisation directe sur un pilier de cluster. |
| 26 | `alternative-opusclip` | ⚠️ **DOUBLON EXACT** de `alternatives/opus-clip.html`. **À retirer.** |
| 26 | `alternative-klap` | ⚠️ **DOUBLON EXACT** de `alternatives/klap.html`. **À retirer.** |

### Semaine 5 — Comparaisons (fin) + sources
| Jour | Page prévue | Statut |
|---|---|---|
| 29 | `meilleur-outil-repurposing-video` | ⚠️ chevauche `meilleur-outil-clips-viraux-ia.html` + le pilier jour 24. 🔁 doublon interne. |
| 29 | `logiciel-clips-viraux-gratuit` | ✅ OK, angle "gratuit" différenciant. |
| 29 | `clipper-lives-twitch` | ⚠️ **DOUBLON** de `clips-twitch.html` (existant). |
| 31 | `interview-en-clips` | ⚠️ **DOUBLON** de `blog/decouper-video-longue-format-interview.html` (publié 09/07, couvre déjà interviews/conférences/lives). |
| 31 | `webinaire-en-clips` | ✅ OK, angle non couvert. |
| 33 | `live-en-shorts` | ⚠️ chevauche `clips-twitch.html` et l'article vidéos longues — clarifier quelle plateforme de live. |
| 33 | `conference-en-clips` | ⚠️ **DOUBLON** de `blog/decouper-video-longue-format-interview.html` (couvre déjà "conférences"). |

### Semaine 6 — Sources (fin) + cibles + plateforme
| Jour | Page prévue | Statut |
|---|---|---|
| 36 | `stream-twitch-en-tiktok` | ⚠️ chevauche fortement `clips-twitch.html`. |
| 36 | `cours-en-ligne-en-clips` | ✅ OK. |
| 38 | `clips-pour-podcasteurs` | ⚠️ **DOUBLON EXACT** de `clips-podcast.html` (existant). **À retirer.** |
| 38 | `repurposing-coachs-infopreneurs` | ✅ OK. |
| 38 | `contenu-court-entreprise` | ✅ OK. |
| 38 | `clips-pour-agences-clipping` | ✅ OK. |
| 40 | `meilleur-moment-poster-tiktok` | ✅ OK. |
| 40 | `meilleur-moment-poster-instagram` | ✅ OK. |
| 40 | `algorithme-page-pour-toi-tiktok` | ✅ OK. |

### Semaine 7 — Plateforme (fin) + technique + arbitrages
| Jour | Page prévue | Statut |
|---|---|---|
| 43 | `cross-posting-clips` | ✅ OK. |
| 43 | `monetiser-youtube-shorts` | ✅ OK. |
| 43 | `monetiser-tiktok` | ✅ OK. |
| 45 | `formats-video-reseaux-sociaux` | ⚠️ chevauche partiellement `format-shorts-youtube-2026.html` — probablement OK si angle multi-plateforme clairement différencié. |
| 45 | `comment-sous-titrer-une-video` | 🔁 **4ᵉ occurrence** du sujet sous-titres dans le calendrier (jours 12, 19, 45) + doublon de `sous-titres-automatiques-shorts.html`. |
| 45 | `comment-recadrer-une-video` | ⚠️ chevauche `blog/pourquoi-ton-crop-9-16-est-rate.html` (publié 09/07) + `format-shorts-youtube-2026.html`. |
| 47 | `recadrer-video-9-16-outil` | Le calendrier prévoyait déjà un arbitrage vs l'article "format" existant, mais ignore que `pourquoi-ton-crop-9-16-est-rate.html` couvre maintenant ce sujet aussi. 🔁 **Triple chevauchement** avec jours 45 et 47 + l'article du 09/07. |

---

## 4. Synthèse — ce qu'il faut trancher avant de lancer le calendrier

**8 pages à retirer purement et simplement du calendrier** (doublons externes exacts) :
`combien-de-clips-par-video`, `pourquoi-mes-shorts-ne-marchent-pas`, `creer-des-shorts-automatiquement`, `creer-des-reels-automatiquement`, `meilleur-logiciel-clips-viraux`, `alternative-opusclip`, `alternative-klap`, `clipper-lives-twitch`, `clips-pour-podcasteurs`, `interview-en-clips`, `conference-en-clips`.

**Le sujet "sous-titres" est prévu 4 fois** (jours 12, 19, 45) en plus de l'article existant — à consolider en 1 seule page de support (ex. `sous-titres-importance` en angle "pourquoi", le reste en sections dans les piliers).

**Le sujet "recadrage 9:16"** est désormais couvert par `pourquoi-ton-crop-9-16-est-rate.html` (angle diagnostic) — les jours 45 et 47 doivent soit être retirés, soit repositionnés en angle strictement complémentaire (ex. jour 47 `recadrer-video-9-16-outil` = page produit/outil, différente de l'angle "erreurs" du blog).

**Un arbitrage business à faire** : `logiciel-decouper-video-en-clips` (jour 15, pilier du cluster produit) risque de cannibaliser `generateur-clips-viraux.html`, la page produit existante sur la même requête cœur.

## 5. Recommandation

Ne pas lancer le calendrier tel quel. Prochaine étape suggérée : produire une **v2 du calendrier** avec les 11 doublons retirés/fusionnés et les 2-3 arbitrages business tranchés, en conservant la méthode (momentum, pilier → support, lots de 2-3 pages, pas de spike). Une fois validée, on reprend "Jour 1" sur cette base assainie.

---

## 6. Calendrier v2 (dédoublonné) — validé le 10/07/2026

**Arbitrage produit tranché par l'utilisateur** : `logiciel-decouper-video-en-clips` (pilier prévu Jour 15) est **retiré**. `generateur-clips-viraux.html` reste le pilier du cluster produit A sur la requête cœur. Au lieu de créer une page concurrente, **enrichir la page existante** avec : définition de l'entité en tête, réponse-d'abord, FAQ + JSON-LD, maillage vers les pages support du cluster. Cette tâche d'enrichissement se fait en parallèle du Jour 1, hors comptage des nouvelles pages.

**Sujets fusionnés pour éviter les doublons internes au calendrier** :
- `duree-ideale-short-reel-tiktok` + `dimensions-tiktok-reels-shorts` → une seule page `specs-video-tiktok-reels-shorts` (durée + résolution + ratio par plateforme, comparatif TikTok/Reels/Shorts — différent de `format-shorts-youtube-2026.html` qui reste mono-YouTube).
- `sous-titres-animes-tiktok` → intégré comme section dans `generer-sous-titres-automatiques` plutôt qu'une page séparée. `sous-titres-importance` et `comment-sous-titrer-une-video` sont retirés (déjà couverts par `blog/sous-titres-automatiques-shorts.html`).

**Pages retirées (doublons externes)** : `combien-de-clips-par-video`, `pourquoi-mes-shorts-ne-marchent-pas`, `creer-des-shorts-automatiquement`, `creer-des-reels-automatiquement`, `meilleur-logiciel-clips-viraux`, `alternative-opusclip`, `alternative-klap`, `meilleur-outil-repurposing-video`, `clipper-lives-twitch`, `interview-en-clips`, `conference-en-clips`, `stream-twitch-en-tiktok`, `clips-pour-podcasteurs`, `comment-recadrer-une-video`.

**Résultat : 40 pages prévues → 25 pages réelles + 1 enrichissement.** Calendrier plus court (~25 jours / 13 lots au lieu de 7 semaines), toujours au rythme d'un lot tous les 2 jours, pilier en premier dans son lot.

| Jour | Lot | Gabarit | Cluster |
|---|---|---|---|
| 1 (pilier) | `qu-est-ce-qu-un-clip-viral` *(+ enrichir `generateur-clips-viraux.html` en parallèle)* | blog | Fondations |
| 3 | `repurposing-video-definition` + `short-reel-tiktok-differences` | blog | Fondations |
| 5 | `hook-video-definition` + `hook-3-secondes` | blog | Fondations |
| 7 | `specs-video-tiktok-reels-shorts` + `ameliorer-retention-short` | blog | Best practices (hub : `erreurs-qui-tuent-tes-shorts.html`) |
| 9 | `generer-sous-titres-automatiques` + `detecter-moments-viraux` | produit / blog | Cœur produit A (pilier : `generateur-clips-viraux.html`) |
| 11 | `monter-video-verticale-en-ligne` + `logiciel-clips-viraux-gratuit` | produit | Cœur produit A / Comparaisons (pilier existant : `meilleur-outil-clips-viraux-ia.html`) |
| 13 | `webinaire-en-clips` + `live-en-shorts` | blog | Sources (hub : `decouper-video-longue-format-interview.html`) |
| 15 | `cours-en-ligne-en-clips` + `repurposing-coachs-infopreneurs` | blog | Sources / Cibles |
| 17 | `contenu-court-entreprise` + `clips-pour-agences-clipping` | blog | Cibles |
| 19 | `meilleur-moment-poster-tiktok` + `meilleur-moment-poster-instagram` | blog | Plateforme |
| 21 | `algorithme-page-pour-toi-tiktok` + `cross-posting-clips` | blog | Plateforme |
| 23 | `monetiser-youtube-shorts` + `monetiser-tiktok` | blog | Plateforme |
| 25 | `formats-video-reseaux-sociaux` + `recadrer-video-9-16-outil` (repositionnée en page produit/outil, différenciée de `pourquoi-ton-crop-9-16-est-rate.html` qui reste l'angle diagnostic blog) | blog + produit | Technique |

**Coordination avec le drip des 4 articles du 09/07** : ces lots sont indépendants du drip 1/jour des articles `combien-shorts...`, `erreurs-qui-tuent...`, etc. (cf. section 2). Si les deux calendriers se chevauchent un même jour, rester sous la limite de 3-4 pages/jour au total sur le site.

**STOP — en attente de validation avant de créer le Jour 1.**
