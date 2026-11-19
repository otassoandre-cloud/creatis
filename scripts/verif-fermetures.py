# -*- coding: utf-8 -*-
"""Verifie l'equilibre des balises div, et ce qui suit immediatement chaque selecteur
de styles. Un selecteur doit etre suivi de deux fermetures (modal-styles puis
modal-styles-wrap) avant l'astuce en italique."""
import io

cur = io.open("clips-v2.html", encoding="utf-8").read()
head = io.open(".scratch-submagic/head.html", encoding="utf-8").read()

for nom, s in (("HEAD", head), ("actuel", cur)):
    ouv = s.count("<div")
    fer = s.count("</div>")
    print("%-7s : %d <div  |  %d </div>  |  ecart %+d" % (nom, ouv, fer, ouv - fer))

print()
# Ce qui suit chaque bouton "wave" (hors regle CSS)
i = 0
n = 0
while True:
    j = cur.find('data-style="wave"', i)
    if j == -1:
        break
    i = j + 10
    if "ms-pill" not in cur[max(0, j - 200):j]:
        continue          # regle CSS, pas un bouton
    n += 1
    fin = cur.index("</button>", j) + len("</button>")
    suite = cur[fin:fin + 90].replace("\n", "\\n")
    print("selecteur %d -> suite : %r" % (n, suite))
