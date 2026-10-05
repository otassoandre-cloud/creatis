# Diagnostic — « les clips YouTube ne passent plus »

> Procédure établie le 06/08/2026, après une panne totale résolue **sans dépense**.
> À suivre dans l'ordre : chaque étape est plus coûteuse que la précédente.

---

## Règle n°1 — lire la signature d'erreur AVANT de toucher au code

Trois pannes différentes produisent le même symptôme visible (« aucun clip ne passe »)
mais appellent trois corrections opposées. Se tromper de diagnostic coûte de l'argent
ou du temps, parfois les deux.

```bash
railway logs 2>&1 > /tmp/rl.txt
grep -aoiE "not a bot|LOGIN_REQUIRED|SABR|PO Token|Requested format is not available|code 8|Credit limit" /tmp/rl.txt \
  | sort | uniq -c | sort -rn
```

| Signature dominante | Cause | Correction | Coût |
|---|---|---|---|
| `Sign in to confirm you're not a bot`<br>`LOGIN_REQUIRED` | **Cookies expirés** | Régénérer `YOUTUBE_COOKIES` | gratuit |
| `Requested format is not available` | **Client ≠ jeton PO** | Restreindre à `mweb`, `web` | gratuit |
| `SABR-only streaming experiment`<br>`GVS PO Token`<br>`ffmpeg exited with code 8` | **YouTube bloque la plage d'IP** | Attendre, ou API payante | payant |
| `Credit limit reached` | **API tierce épuisée** | Recharger | payant |

---

## Étape 1 — Régénérer les cookies (gratuit, 5 min)

C'est la panne la plus fréquente et la moins chère à réparer. Les cookies expirent
naturellement au bout de quelques semaines.

1. Se connecter à YouTube avec un **compte secondaire**, jamais le compte principal.
2. Exporter les cookies de `youtube.com` au format **Netscape** (extension navigateur).
3. Remplacer `YOUTUBE_COOKIES` dans Railway, en gardant les `\n` échappés.
4. Redéployer : `railway up --detach` **depuis la racine du dépôt**.

⚠️ Exporter depuis une fenêtre de **navigation privée** puis la fermer **sans se
déconnecter**. Une déconnexion invalide la session côté YouTube et tue les cookies.

---

## Étape 2 — Aligner les clients sur le jeton PO (gratuit)

`bgutil` ne produit un jeton valide que pour les clients **`web` et `mweb`** : il
intercepte leur requête et lie le jeton au `visitor_data` de cette session précise.
Dès que yt-dlp bascule sur un client Android ou iOS, le jeton ne correspond plus,
YouTube renvoie une **liste de formats vide**, et le sélecteur échoue — *même s'il se
termine par `/best`*. Le message `Requested format is not available` est donc trompeur :
ce n'est pas le format qui manque, c'est l'authentification qui a sauté.

Dans `repurpose-service/main.py`, fonction `_yt_extractor_args()` :

```python
args = {"youtube": {"player_client": ["mweb", "web"]}}
```

Ne pas remettre `android_creator` ni `android_testsuite` : ils **n'existent plus** dans
yt-dlp. Ni `android` / `android_vr` / `ios` : leurs formats sont dépouillés de leur URL
sauf jeton GVS dédié, que nous ne savons pas produire.

> Cinq autres emplacements (~lignes 924, 929, 1030, 1083, 1087) imposent encore
> `android`/`ios` dans des stratégies de secours. Ils reproduiront le même désalignement
> le jour où ils seront sollicités.

---

## Étape 3 — Vérifier quel chemin a servi

Après correction, confirmer que ça passe **en gratuit** et pas en payant :

```bash
railway logs 2>&1 > /tmp/rl.txt
printf "cache R2      %s\n" "$(grep -ac 'cache R2' /tmp/rl.txt)"
printf "gratuit       %s\n" "$(grep -ac 'tentative 1/[0-9] (gratuit)' /tmp/rl.txt)"
printf "proxy         %s\n" "$(grep -ac 'PROXY résidentiel' /tmp/rl.txt)"
printf "API payante   %s\n" "$(grep -ac 'ytapi' /tmp/rl.txt)"
grep -aoE "done [0-9]+KB|mis en cache seg/[A-Za-z0-9_-]+" /tmp/rl.txt | tail -6
```

Repères : un segment de 60 s en 720p pèse **~17 Mo**. Beaucoup moins (~3 Mo) signale un
repli en 360p, donc un problème de client ou de format.

---

## Ce qu'il NE faut PAS faire

**Passer le proxy en 1ʳᵉ tentative sans preuve.** Testé le 06/08 : l'erreur était
`LOGIN_REQUIRED`, pas un refus d'IP. Une adresse résidentielle avec des cookies morts
reçoit exactement le même message. On aurait brûlé du forfait Webshare pour rien —
la panne s'est résolue sans toucher au proxy.

**S'abonner à l'API payante dans la panique.** Le 06/08, le devis était à 200 $/mois.
La panne s'est réglée gratuitement. Garder l'API comme filet, en **plan Lite (~20 $)**,
pas en Pro : elle ne sert que pendant les épisodes de blocage réels.

**Se fier à un diagnostic vieux de quelques heures.** La signature a changé deux fois
dans la même journée : SABR le matin, cookies expirés le soir. Toujours relire les logs
avant d'agir.

---

## Architecture, pour mémoire

| Étape | Où |
|---|---|
| Déclenchement | `POST /raw-segment` — **backend Railway**, jamais le navigateur |
| Extraction | `yt-dlp` + `yt-dlp-ejs` (Deno, anti-throttling) + `bgutil` (jetons PO) |
| Portée | **Segments de 60 s uniquement** (`download_ranges`), jamais la vidéo entière |
| Ordre des tentatives | cache R2 → InnerTube → yt-dlp gratuit ×2 → proxy → API payante |
| Cache | R2 `seg/{video_id}/{début}_{fin}.mp4`, **permanent et partagé entre utilisateurs** |

Le cache R2 court-circuite **intégralement** InnerTube, yt-dlp et le proxy quand le
segment existe déjà. C'est le principal amortisseur de coût : une vidéo n'est
téléchargée qu'une fois, quel que soit le nombre d'utilisateurs qui en tirent des clips.

---

## Journal des pannes

**06/08/2026** — Panne totale, zéro clip. Deux causes empilées : cookies expirés
(`Sign in to confirm you're not a bot`, 69 occurrences) puis désalignement client/jeton
(`Requested format is not available`). Réglé par les étapes 1 et 2, **sans dépense**.
Résultat : 7 téléchargements gratuits, 0 proxy, 0 crédit API, segments à 17 Mo.

**02/08/2026** — Blocage SABR sur la plage d'IP Railway. Rien à faire côté code : aucune
version de yt-dlp publiée après le changement. Rouvert seul le 03/08, refermé ensuite.
