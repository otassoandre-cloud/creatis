# -*- coding: utf-8 -*-
"""Ajoute le </div> manquant qui referme la section mob-sec-subs du 1er panneau.

Symptome constate dans le DOM reel (pas dans le source) :
    #clip-modal-overlay > #clip-modal-overlay > ...
La 2e fenetre d'edition etait imbriquee DANS la premiere, parce que la section
mob-sec-subs du 1er panneau n'etait jamais refermee. Le navigateur re-parente alors
tout ce qui suit, et le panneau affiche n'importe quoi.

Verifier le source ne suffisait pas : l'ordre des balises y paraissait correct.
Seule l'inspection du DOM construit revele ce genre de defaut.

INSPECTION par defaut ; --ecrire pour appliquer.
"""
import io
import sys

ANCRE = 'id="modal-color-bg"'
SUITE_CASSEE = '<div class="upload-trust">'

cur = io.open("clips-v2.html", encoding="utf-8").read()

cibles = []
pos = 0
while True:
    k = cur.find(ANCRE, pos)
    if k == -1:
        break
    pos = k + 10
    a = cur.index("</div>", k)          # ferme modal-opt-group
    b = cur.index("</div>", a + 6)      # ferme modal-opt-row
    fin = b + len("</div>")
    suite = cur[fin:fin + 200].lstrip()
    ligne = cur[:k].count("\n") + 1
    if suite.startswith(SUITE_CASSEE):
        print("panneau ligne %d : fermeture mob-sec-subs MANQUANTE" % ligne)
        cibles.append(fin)
    elif suite.startswith("</div>"):
        print("panneau ligne %d : correctement referme" % ligne)
    else:
        print("panneau ligne %d : suite inattendue -> %r" % (ligne, suite[:60]))

if "--ecrire" in sys.argv and cibles:
    out = cur
    for p in reversed(cibles):
        out = out[:p] + "\n        </div>" + out[p:]
    io.open("clips-v2.html", "w", encoding="utf-8").write(out)
    print("\nFERMETURE AJOUTEE sur %d panneau(x)" % len(cibles))
elif not cibles:
    print("\nrien a faire")
else:
    print("\n(inspection seule — relancer avec --ecrire)")
