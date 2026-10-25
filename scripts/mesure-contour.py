# -*- coding: utf-8 -*-
"""Mesure l'epaisseur du contour noir d'un sous-titre incruste.

Le rapport contour / hauteur-de-majuscule est la seule grandeur comparable entre
deux rendus de resolutions differentes.

Methode (verticale, robuste aux fonds charges) :
  1. on ne considere que le BLANC PUR (le fond d'une video est rarement blanc pur
     sur de longues plages horizontales, contrairement au texte) ;
  2. on trouve la ligne horizontale qui contient le plus de blanc = plein milieu
     d'une ligne de texte ;
  3. sur les colonnes blanches de cette ligne, on remonte pixel par pixel :
     l'epaisseur de noir traversee avant de sortir du glyphe est le contour ;
  4. la hauteur de majuscule est la hauteur du bloc blanc contigu.

Usage : python scripts/mesure-contour.py img.png [img2.png ...]
        options : --y0 0.40 --y1 0.85  (bande verticale a explorer, en % de l'image)
"""
import sys
from PIL import Image

BLANC = 235      # seuil de blanc pur
NOIR = 80        # seuil de noir


def blanc(p):
    return p[0] > BLANC and p[1] > BLANC and p[2] > BLANC


def noir(p):
    return max(p) < NOIR


def mesure(chemin, y0_pct=0.35, y1_pct=0.90):
    im = Image.open(chemin).convert("RGB")
    W, H = im.size
    px = im.load()

    # 1-2. ligne de balayage = celle qui contient le plus de blanc
    meilleure, nmax = None, 0
    for y in range(int(H * y0_pct), int(H * y1_pct)):
        n = sum(1 for x in range(W) if blanc(px[x, y]))
        if n > nmax:
            nmax, meilleure = n, y
    if nmax < 8:
        return None
    y = meilleure

    # 3. contour au-dessus de chaque colonne blanche
    contours = []
    hauteurs = []
    for x in range(W):
        if not blanc(px[x, y]):
            continue
        # remonte tant que c'est blanc -> haut du glyphe
        yt = y
        while yt > 0 and blanc(px[x, yt - 1]):
            yt -= 1
        # puis compte le noir juste au-dessus
        c, yy = 0, yt - 1
        while yy >= 0 and noir(px[x, yy]):
            c += 1
            yy -= 1
        # descend pour la hauteur du glyphe
        yb = y
        while yb < H - 1 and blanc(px[x, yb + 1]):
            yb += 1
        if c > 0:
            contours.append(c)
            hauteurs.append(yb - yt + 1)

    if not contours:
        return None
    contours.sort()
    hauteurs.sort()
    med_c = contours[len(contours) // 2]
    # hauteur de majuscule = la plus grande valeur frequente (les stems pleins)
    cap = hauteurs[int(len(hauteurs) * 0.9)]
    return {
        "fichier": chemin, "H": H, "y_scan": y,
        "contour_px": med_c, "cap_px": cap,
        "contour/cap": round(med_c / cap, 3) if cap else None,
        "cap/H": round(cap / H, 4),
        "contour/H": round(med_c / H, 4),
    }


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    y0, y1 = 0.35, 0.90
    if "--y0" in sys.argv:
        y0 = float(sys.argv[sys.argv.index("--y0") + 1])
    if "--y1" in sys.argv:
        y1 = float(sys.argv[sys.argv.index("--y1") + 1])
    for f in args:
        r = mesure(f, y0, y1)
        if not r:
            print(f"{f} : pas de texte blanc detecte")
            continue
        print(f"{f}")
        print(f"   hauteur image  : {r['H']}px   (balayage y={r['y_scan']})")
        print(f"   majuscule      : {r['cap_px']}px  = {r['cap/H']*100:.2f}% de l'image")
        print(f"   contour noir   : {r['contour_px']}px  = {r['contour/H']*100:.2f}% de l'image")
        print(f"   >> contour/cap : {r['contour/cap']}")
        print()
