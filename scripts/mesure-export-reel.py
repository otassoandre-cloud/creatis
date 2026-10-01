# -*- coding: utf-8 -*-
"""Mesure la hauteur de majuscule des sous-titres sur un EXPORT REEL.

Donne le seul chiffre directement comparable a l'apercu : la hauteur des capitales
exprimee en pourcentage de la hauteur video. Independant de la resolution.

On isole le blanc pur : le fond d'une video est rarement blanc pur sur de longues
plages horizontales, contrairement au texte.
"""
import glob
from PIL import Image

BLANC = 230
meilleur = None

for f in sorted(glob.glob(".scratch-submagic/exp/*.png")):
    im = Image.open(f).convert("RGB")
    W, H = im.size
    px = im.load()
    # bande basse : la ou vivent les sous-titres
    lignes = []
    for y in range(int(H * 0.45), int(H * 0.95)):
        n = sum(1 for x in range(0, W, 2)
                if px[x, y][0] > BLANC and px[x, y][1] > BLANC and px[x, y][2] > BLANC)
        if n > 6:
            lignes.append((y, n))
    if not lignes:
        continue
    # bloc contigu le plus haut = une ligne de texte
    blocs, cur = [], [lignes[0][0]]
    for y, _ in lignes[1:]:
        if y - cur[-1] <= 2:
            cur.append(y)
        else:
            blocs.append(cur); cur = [y]
    blocs.append(cur)
    bloc = max(blocs, key=len)
    cap = len(bloc)
    if cap < 8 or cap > H * 0.15:
        continue
    # largeur de cette ligne
    cols = [x for x in range(W)
            if any(px[x, y][0] > BLANC and px[x, y][1] > BLANC and px[x, y][2] > BLANC
                   for y in range(bloc[0], bloc[-1] + 1))]
    larg = (max(cols) - min(cols) + 1) if cols else 0
    if meilleur is None or cap > meilleur["cap"]:
        meilleur = {"f": f, "W": W, "H": H, "cap": cap, "larg": larg,
                    "haut": bloc[0]}

if not meilleur:
    print("aucune ligne de texte blanc detectee")
else:
    m = meilleur
    print("image      : %s" % m["f"].split("/")[-1])
    print("resolution : %dx%d" % (m["W"], m["H"]))
    print()
    print("hauteur majuscule : %d px  = %.3f %% de la hauteur" % (m["cap"], m["cap"] * 100 / m["H"]))
    print("largeur ligne     : %d px  = %.1f %% de la largeur" % (m["larg"], m["larg"] * 100 / m["W"]))
    print("haut du texte     : %.1f %% de la hauteur" % (m["haut"] * 100 / m["H"]))
    print()
    print("--- attendu par le calcul ---")
    print("  export  : (55 * 0.629) / 1280 = %.3f %%" % (55 * 0.629 / 1280 * 100))
    print("  apercu  : (55 * 0.899 * 0.70) / 1280 = %.3f %%" % (55 * 0.899 * 0.70 / 1280 * 100))
