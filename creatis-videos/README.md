# Vidéos Créatis (Remotion)

Vidéos de promotion et de lancement, écrites en React et rendues en MP4.
Projet **hors périmètre de déploiement** : exclu de Vercel (`.vercelignore`) et de
Railway (`.railwayignore`). Rien d'ici n'est servi par creatis.app.

## Compositions

| Id | Format | Durée | Usage |
|---|---|---|---|
| `PubTikTok` | 1080×1920 | 19,1 s | **Pub TikTok/Reels** — sous-titres incrustés, la version à diffuser |
| `PubLancement` | 1080×1920 | 27,9 s | Pub de lancement — Remotion + HyperFrames + voix off |
| `PubVerticale` | 1080×1920 | 23,7 s | Pub courte, Remotion seul — **avec voix off** |
| `HeroSite` | 1920×1080 | 18 s | Boucle muette pour le hero de la landing page |
| `Scene1-Accroche` … `Scene5-CTA` | 1080×1920 | — | Les scènes de la pub, isolées pour retouche |

## Prévisualiser

```bash
cd creatis-videos
npx remotion studio --no-open
```

Double-cliquer une séquence dans la timeline de `PubVerticale` ouvre la scène
correspondante : les durées sont écrites en clair dans `PubVerticale.tsx` pour
rester modifiables directement depuis le Studio.

## Rendre

```bash
node dynamiser-voix.mjs                                # si les voix ont ete regenerees
npx remotion render PubTikTok out/creatis-pub-tiktok.mp4
node normaliser-audio.mjs out/creatis-pub-tiktok.mp4   # obligatoire avant diffusion
```

### La voix off doit etre resserree apres chaque generation

Gemini sort une voix « posee » qui tombe a 111-121 mots/minute sur certaines
repliques, quand une pub reseaux sociaux tourne a 180-200.
`dynamiser-voix.mjs` enleve les blancs entre les phrases puis applique un
`atempo` plafonne a 1,35. Il lit toujours `public/voix/source/` et n'ecrit
jamais dedans : relancer le script ne recompresse pas un fichier deja traite.

**`public/voix/source/` est la sauvegarde des voix, ne pas la vider.** Le quota
gratuit de Gemini TTS s'epuise en une dizaine de requetes par jour : un mp3
efface par erreur n'est pas regenerable avant le lendemain.

### La normalisation audio n'est pas optionnelle

Le rendu Remotion sort à **-13,3 LUFS avec un true peak à +1,0 dBTP**, donc en
écrêtage. TikTok, Instagram et YouTube visent -14 LUFS : au-delà elles rabaissent
le son elles-mêmes, et un pic positif sature sur un haut-parleur de téléphone.

`normaliser-audio.mjs` fait les deux passes (mesure puis application) et force
`-ar 48000` — sans ça `loudnorm` sort en 96 kHz, non standard pour une livraison.
La vidéo est copiée sans réencodage.

## Les deux moteurs, et pourquoi

`PubLancement` est la seule composition qui utilise les deux, chacun sur son terrain :

- **HyperFrames** (`../creatis-hyperframes/`) fabrique la scène « L'application, en
  vrai » : c'est littéralement l'interface du site, écrite en HTML/CSS avec les
  tokens de `css/style.css`, animée en GSAP. Elle sort en MP4, copié ici dans
  `public/interface-hyperframes.mp4`.
- **Remotion** monte le film : narration, minutage, voix off, transitions, et
  embarque ce MP4 comme une source vidéo parmi d'autres (`SceneInterface.tsx`).

Ce partage n'est pas décoratif. Rejouer du HTML évite de réécrire l'interface en
React, donc **la pub ne peut pas dériver du produit**. En prime, `npm run check`
côté HyperFrames vérifie le contraste WCAG, les débordements de mise en page et
le déterminisme des animations — 105/105 sur cette scène.

Pour régénérer la scène après une modification de l'interface :

```bash
cd ../creatis-hyperframes && npm run check && npm run render
cp renders/*.mp4 ../creatis-videos/public/interface-hyperframes.mp4
cd ../creatis-videos && npx remotion render PubLancement out/creatis-pub-lancement.mp4
```

## Voix off

Voix française générée par **Gemini TTS** (`gemini-2.5-flash-preview-tts`, voix
« Charon »), une réplique par scène dans `public/voix/`.

```bash
node generer-voix.mjs          # ne génère que ce qui manque
node generer-voix.mjs --tout   # force la régénération
```

Le script est idempotent **volontairement** : la TTS n'est pas déterministe. Une
même réplique est passée de 3,9 s à 6,7 s d'une génération à l'autre — ce qui
casse le montage, puisque les durées de scènes sont calées sur les répliques.
C'est aussi pourquoi les mp3 sont versionnés (contrairement aux vidéos de
`public/`) : les régénérer ne redonnerait pas le même film.

Deux pièges déjà traités dans le script :

- **Silences parasites** — Gemini ajoutait jusqu'à 2,5 s de blanc en début/fin,
  assez pour faire déborder une réplique de sa scène. Retirés au passage.
- **Chiffres** — écrits en toutes lettres dans le texte source, sinon « 66 K »
  se lit « soixante-six kelvin » et « 9:16 » « neuf heures seize ».

Le contenu réellement prononcé a été vérifié par transcription (Whisper via
Groq), pas seulement à l'oreille : c'est ce contrôle qui a révélé que
« pas retouché » s'entendait « par retouché », d'où la reformulation en
« Aucune retouche ».

La `HeroSite` reste **muette** : elle est faite pour tourner en boucle sur la
landing page, où les navigateurs bloquent de toute façon l'autoplay sonore.

## Assets

`public/` est régénérable — ne pas y éditer à la main :

- `showcase-1..8.mp4` — copies de `../images/loop/`, les vrais clips sortis du produit
- `clip-66k.mp4` — extrait de 6 s du clip client qui a fait 66 000 vues,
  recadré en 1080×1920

Pour les reconstruire après un clone :

```bash
node preparer-assets.mjs
```

## Ce que le contenu affirme

Les chiffres montrés sont réels et vérifiés, pas arrondis à la hausse :

- **66 K vues** — clip client réel, fourni le 24/08/2026
- **Essai 7 jours sur l'annuel, résiliable avant sans rien payer** — formulation
  identique à celle de `paiement.html` et des CGU

Si la grille tarifaire ou les conditions d'essai changent sur le site, la scène
`SceneCTA.tsx` doit être corrigée en même temps : une pub qui promet autre chose
que la page de paiement fabrique des remboursements, pas des clients.
