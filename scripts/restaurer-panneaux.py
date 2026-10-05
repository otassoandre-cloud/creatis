# -*- coding: utf-8 -*-
"""Prepare la restauration des panneaux de styles a partir de la version committee.

Mode INSPECTION par defaut : n'ecrit rien, affiche seulement ce qui serait remplace.
Passer --ecrire pour appliquer.

On restaure le bloc complet allant du conteneur des vignettes jusqu'a la fin des options
(Taille / Couleur / Fond), c'est-a-dire exactement la zone abimee.
"""
import io
import sys

DEBUT = '<div class="modal-styles" id="modal-style-btns">'
FIN_APRES = 'modal-opt-row'


def bloc(src, depart=0):
    """Renvoie (i_debut, i_fin) du bloc vignettes+options a partir de `depart`."""
    i = src.index(DEBUT, depart)
    # fin = fermeture du modal-opt-row qui suit, + sa balise fermante de groupe
    j = src.index(FIN_APRES, i)
    # on avance jusqu'a la fermeture du bloc d'options : 3 </div> apres le dernier input color
    k = src.index('id="modal-color-bg"', j)
    k = src.index("</div>", k)              # ferme modal-opt-group
    k = src.index("</div>", k + 6)          # ferme modal-opt-row
    return i, k + len("</div>")


cur = io.open("clips-v2.html", encoding="utf-8").read()
head = io.open(".scratch-submagic/head.html", encoding="utf-8").read()

h1, h2 = bloc(head)
modele = head[h1:h2]
print("bloc de reference (HEAD) : %d caracteres" % len(modele))
for cle in ("Wow", "sz-btns", "modal-color-text", "modal-color-bg", "ms-more-btn"):
    print("   %-18s : %d" % (cle, modele.count(cle)))

# Emplacements a remplacer dans le fichier courant
cibles = []
pos = 0
while True:
    try:
        a, b = bloc(cur, pos)
    except ValueError:
        break
    cibles.append((a, b))
    pos = b
print()
print("emplacements a restaurer dans le fichier courant : %d" % len(cibles))
for a, b in cibles:
    print("   ligne %d -> %d  (%d caracteres)"
          % (cur[:a].count("\n") + 1, cur[:b].count("\n") + 1, b - a))

if "--ecrire" in sys.argv:
    out = cur
    for a, b in reversed(cibles):
        out = out[:a] + modele + out[b:]
    io.open("clips-v2.html", "w", encoding="utf-8").write(out)
    print("\nRESTAURE (%+d caracteres)" % (len(out) - len(cur)))
else:
    print("\n(inspection seule — relancer avec --ecrire pour appliquer)")
