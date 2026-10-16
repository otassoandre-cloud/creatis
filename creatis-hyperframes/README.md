# Vidéos Créatis (HyperFrames)

Alternative HTML/CSS/GSAP à Remotion — compositions écrites en HTML plutôt qu'en
React, rendues en MP4 en local. Apache 2.0, aucun compte HeyGen requis pour le
rendu local.

Projet **hors périmètre de déploiement** : exclu de Vercel (`.vercelignore`) et de
Railway (`.railwayignore`).

## Commandes

```bash
npm run dev      # aperçu navigateur avec rechargement
npm run check    # lint + layout + motion + contraste WCAG
npm run render   # MP4 dans renders/
```

## Le piège ffmpeg, déjà réglé

HyperFrames exige **ffmpeg ET ffprobe sur le PATH** et s'arrête net sinon, en
proposant `winget install Gyan.FFmpeg`. Plutôt que d'installer ffmpeg au niveau
système, `hf.mjs` enveloppe la CLI et ajoute au PATH les binaires déjà fournis par
npm (`ffmpeg-static` + `ffprobe-static`, en devDependencies).

Conséquence : rien à configurer sur la machine, et un `npm i` après clone suffit.
Ne pas remettre `npx hyperframes` directement dans les scripts — l'erreur
reviendrait.

## Quand utiliser celui-ci plutôt que Remotion

`../creatis-videos` (Remotion) porte les vidéos livrées : la pub verticale et la
boucle hero. Il est en React, avec un Studio complet et une timeline éditable.

HyperFrames a deux avantages ici :

- **HTML/CSS direct** — le reste de Créatis est en HTML/CSS vanilla, donc un
  visuel du site peut être repris quasi tel quel, sans réécriture en React.
- **`npm run check`** — vérifie automatiquement le contraste WCAG, les
  débordements de mise en page et les animations non déterministes.

Remotion reste le choix par défaut tant que les vidéos ressemblent à celles déjà
faites. HyperFrames devient intéressant pour animer un vrai bout d'interface
Créatis récupéré du site.
