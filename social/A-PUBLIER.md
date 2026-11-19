# Journée du 02/10/2026 — tout est publié

| Réseau | Pièce | Lien |
|---|---|---|
| YouTube (long) | methode-clips, 1 min 33 | [youtu.be/IX6481WSO6Y](https://youtu.be/IX6481WSO6Y) |
| YouTube (Short) | vocal-squeezie, 13,5 s | [youtube.com/shorts/kHYROVYEKhY](https://youtube.com/shorts/kHYROVYEKhY) |
| TikTok | vocal-squeezie | andre.ai26 |
| Instagram | vocal-squeezie | [reel/Dd_GQkruF6M](https://www.instagram.com/andre.creatis/reel/Dd_GQkruF6M/) |

Le Short renvoie à la vidéo longue : le lien est en 2ᵉ ligne de sa description.

## Ce que le relevé du jour a changé

**YouTube Shorts médiane 903 vues contre 290 sur TikTok.** Trois fois mieux, et
c'est le seul réseau où le lien est cliquable sans mille abonnés. On traitait
TikTok comme le canal principal ; les chiffres disent l'inverse.

Les vidéos LONGUES font 1, 2, 2 et 9 vues. Le format long ne décolle pas sur
cette chaîne — à savoir avant d'y remettre une heure de travail.

## Ce qui manque encore

- **Le son du clip** dans le dernier plan. Playwright n'enregistre que l'image
  (vérifié : zéro piste audio). Il faut le vrai clip exporté — `exporter-clip.mjs`
  — qui demande `CREATIS_EMAIL` et `CREATIS_MDP` dans le `.env`, ou
  l'autorisation de `railway variables`. Le câblage est prêt : `sonClip` dans
  les deux compositions, départ calculé à 3,9 s.
- **L'âge des Shorts.** Les cartes ne l'affichent pas, donc comparer un Short de
  deux mois à un Short de deux jours n'est pas honnête tant qu'on n'a pas les
  dates. Une passe vidéo par vidéo serait nécessaire.
- **La rétention**, sur aucun réseau.
- L'avertissement YouTube pour non-respect du règlement de la communauté, qui
  bloque sans doute la vérification de la chaîne.
