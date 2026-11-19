# -*- coding: utf-8 -*-
"""Affiche le conteneur parent de chaque selecteur de styles, pour savoir si l'un d'eux
est un doublon cree par erreur ou s'ils appartiennent bien a des panneaux distincts."""
import io
import re

s = io.open("clips-v2.html", encoding="utf-8").read()
print("occurrences de id=modal-style-btns : %d" % s.count('id="modal-style-btns"'))
print()

i = 0
n = 0
while True:
    j = s.find('data-style="wave"', i)
    if j == -1:
        break
    i = j + 10
    if "ms-pill" not in s[max(0, j - 200):j]:
        continue
    n += 1
    debut_bloc = s.rfind('<div class="modal-styles"', 0, j)
    avant = s[max(0, debut_bloc - 900):debut_bloc]
    # dernier conteneur nomme avant le selecteur
    ids = re.findall(r'id="([a-zA-Z0-9_-]+)"', avant)
    classes = re.findall(r'class="(mob-section|modal-panneau|edit-panel)[^"]*"', avant)
    ligne = s[:j].count("\n") + 1
    print("selecteur %d (ligne %d)" % (n, ligne))
    print("   ids parents proches : %s" % (", ".join(ids[-4:]) or "-"))
    print("   sections proches    : %s" % (", ".join(classes[-3:]) or "-"))
