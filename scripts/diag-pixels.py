# -*- coding: utf-8 -*-
"""Diagnostic : que contiennent reellement les pixels de la bande sous-titres ?
Sert a calibrer les seuils de mesure avant toute comparaison chiffree."""
from PIL import Image
import sys

for f, a, b in [(".scratch-submagic/g_01.png", 0.50, 0.75),
                (".scratch-submagic/ref/r18.png", 0.55, 0.75)]:
    try:
        im = Image.open(f).convert("RGB")
    except Exception as e:
        print(f"{f} : illisible ({e})")
        continue
    W, H = im.size
    px = im.load()
    best_n, best_y = 0, None
    for y in range(int(H * a), int(H * b)):
        n = sum(1 for x in range(W)
                if px[x, y][0] > 200 and px[x, y][1] > 200 and px[x, y][2] > 200)
        if n > best_n:
            best_n, best_y = n, y
    print(f"{f}  ({W}x{H})")
    print(f"   ligne la plus claire : y={best_y}  ({best_n} px > 200)")
    if best_y is not None:
        y = best_y
        clairs = sorted({px[x, y] for x in range(W)}, key=lambda p: -sum(p))[:4]
        sombres = sorted({px[x, y] for x in range(W)}, key=lambda p: sum(p))[:3]
        print(f"   plus clairs : {clairs}")
        print(f"   plus sombres: {sombres}")
    print()
