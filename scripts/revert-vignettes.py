# -*- coding: utf-8 -*-
"""Remet les vignettes de styles d'origine (celles avec "Wow" et l'etiquette dessous).

Methode SURE : on ne remplace que le contenu INTERIEUR du conteneur
<div class="modal-styles" id="modal-style-btns"> ... </div>, delimite par sa propre
balise fermante. Aucune arithmetique de position, aucune borne devinee — c'est ce qui
avait casse la structure la premiere fois (index('data-style="wave"') tombait sur une
regle CSS et emportait les fermetures du conteneur).

INSPECTION par defaut ; --ecrire pour appliquer.
"""
import io
import sys

OUVRANT = '<div class="modal-styles" id="modal-style-btns">'
FERMANT = "\n          </div>"


def interieur(src, depart=0):
    """(debut, fin) du contenu interieur du conteneur, sans les balises."""
    i = src.index(OUVRANT, depart) + len(OUVRANT)
    j = src.index(FERMANT, i)
    return i, j


cur = io.open("clips-v2.html", encoding="utf-8").read()
head = io.open(".scratch-submagic/head.html", encoding="utf-8").read()

hi, hj = interieur(head)
modele = head[hi:hj]
print("vignettes d'origine : %d caracteres, %d boutons, %d 'Wow'"
      % (len(modele), modele.count("<button"), modele.count("Wow")))

cibles = []
pos = 0
while True:
    try:
        a, b = interieur(cur, pos)
    except ValueError:
        break
    cibles.append((a, b))
    pos = b + 1

print("conteneurs trouves dans le fichier courant : %d" % len(cibles))
for a, b in cibles:
    extrait = cur[a:b]
    print("   ligne %d : %d caracteres, %d boutons"
          % (cur[:a].count("\n") + 1, b - a, extrait.count("<button")))

if "--ecrire" in sys.argv:
    out = cur
    for a, b in reversed(cibles):
        out = out[:a] + modele + out[b:]
    io.open("clips-v2.html", "w", encoding="utf-8").write(out)
    print("\nVIGNETTES RESTAUREES (%+d caracteres)" % (len(out) - len(cur)))
else:
    print("\n(inspection seule — relancer avec --ecrire)")
