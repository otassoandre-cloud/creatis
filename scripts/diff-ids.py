# -*- coding: utf-8 -*-
"""Compare les identifiants et classes cles entre la version committee et le fichier
courant, pour mesurer precisement l'etendue de la suppression accidentelle."""
import io
import re

cur = io.open("clips-v2.html", encoding="utf-8").read()
head = io.open(".scratch-submagic/head.html", encoding="utf-8").read()

CLES = ["sz-btns", "modal-fontsize", "modal-color-text", "modal-color-bg",
        "mob-sec-cadrage", "modal-split-on", "cadrage-hint-single", "cadrage-timeline",
        "modal-styles-wrap", "modal-style-btns", "sub-lang-row", "modal-opt-row",
        "mob-section", "modal-hook-text", "wm-opacity-val"]

print("%-22s %6s %6s" % ("cle", "HEAD", "actuel"))
manquants = []
for k in CLES:
    a, b = head.count(k), cur.count(k)
    marque = "" if b >= a else "  <-- PERDU"
    if b < a:
        manquants.append((k, a, b))
    print("%-22s %6d %6d%s" % (k, a, b, marque))

print()
if manquants:
    print("elements dont des occurrences ont disparu :")
    for k, a, b in manquants:
        print("   %s : %d -> %d" % (k, a, b))
else:
    print("aucune perte detectee sur ces cles")
