# -*- coding: utf-8 -*-
"""Mesure la hauteur de majuscule sur un export reel, en ciblant la COULEUR DE SURLIGNAGE.

Le blanc pur ne suffit pas comme detecteur : une image video en contient partout (ciel,
mur, reflet), et la mesure precedente a attrape une zone claire du decor au lieu du texte.

Les couleurs du cycle (#3BFF2F vert, #DD021A rouge, #FBFF1E jaune) sont saturees et
n'apparaissent quasiment jamais dans une prise de vue naturelle. Elles identifient donc
la ligne surlignee de facon fiable.
"""
import glob
from PIL import Image

CIBLES = [(0x3B, 0xFF, 0x2F), (0xDD, 0x02, 0x1A), (0xFB, 0xFF, 0x1E)]
TOL = 60


def proche(p):
    return any(abs(p[0] - c[0]) < TOL and abs(p[1] - c[1]) < TOL and abs(p[2] - c[2]) < TOL
               for c in CIBLES)


meilleur = None
for f in sorted(glob.glob(".scratch-submagic/exp/*.png")):
    im = Image.open(f).convert("RGB")
    W, H = im.size
    px = im.load()
    lignes = [y for y in range(H)
              if sum(1 for x in range(0, W, 2) if proche(px[x, y])) > 4]
    if not lignes:
        continue
    blocs, cur = [], [lignes[0]]
    for y in lignes[1:]:
        if y - cur[-1] <= 3:
            cur.append(y)
        else:
            blocs.append(cur); cur = [y]
    blocs.append(cur)
    bloc = max(blocs, key=len)
    cap = len(bloc)
    cols = [x for x in range(W)
            if any(proche(px[x, y]) for y in range(bloc[0], bloc[-1] + 1))]
    larg = (max(cols) - min(cols) + 1) if cols else 0
    if meilleur is None or cap > meilleur["cap"]:
        meilleur = {"f": f, "W": W, "H": H, "cap": cap, "larg": larg, "haut": bloc[0]}

if not meilleur:
    print("aucune couleur de surlignage trouvee — le clip exporte n'utilise peut-etre pas Punch")
else:
    m = meilleur
    print("image             : %s" % m["f"].replace("\\", "/").split("/")[-1])
    print("resolution export : %dx%d" % (m["W"], m["H"]))
    print()
    print("hauteur majuscule : %d px  = %.3f %% de la hauteur" % (m["cap"], m["cap"] * 100 / m["H"]))
    print("largeur ligne     : %d px  = %.1f %% de la largeur" % (m["larg"], m["larg"] * 100 / m["W"]))
    print("haut de la ligne  : %.1f %% de la hauteur" % (m["haut"] * 100 / m["H"]))
    print()
    print("attendu par le calcul : (55 * 0.629) / 1280 = %.3f %%" % (55 * 0.629 / 1280 * 100))
