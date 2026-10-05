# -*- coding: utf-8 -*-
"""Restaure les deux </div> de fermeture apres les selecteurs de styles endommages.

Cause : un remplacement du bloc de vignettes a utilise index('data-style="wave"'), qui
tombe d'abord sur une REGLE CSS et non sur le bouton. La borne de fin etait donc fausse
et a emporte les fermetures </div></div> (modal-styles puis modal-styles-wrap).

Symptome : le panneau d'edition perdait Taille / Couleur / Fond, et les pastilles de
l'ecran d'upload remontaient dedans — le navigateur re-parentait tout le sous-arbre.

Reperage : un selecteur sain est suivi de "</div>\\n </div>". Un selecteur casse est
suivi directement d'autre chose. On ne repare que ces derniers.
"""
import io

FICHIER = "clips-v2.html"
FERMETURES = "\n          </div>\n          </div>"

s = io.open(FICHIER, encoding="utf-8").read()

positions = []
i = 0
while True:
    j = s.find('data-style="wave"', i)
    if j == -1:
        break
    i = j + 10
    if "ms-pill" not in s[max(0, j - 200):j]:
        continue                      # regle CSS, pas un bouton
    fin = s.index("</button>", j) + len("</button>")
    suite = s[fin:fin + 60]
    sain = "</div>" in suite and suite.strip().startswith("</div>")
    positions.append((fin, sain))

print("selecteurs trouves : %d" % len(positions))
for k, (pos, sain) in enumerate(positions, 1):
    print("   %d : %s" % (k, "sain" if sain else "A REPARER"))

# On insere en partant de la fin pour ne pas decaler les offsets precedents
n = 0
for pos, sain in reversed(positions):
    if not sain:
        s = s[:pos] + FERMETURES + s[pos:]
        n += 1

io.open(FICHIER, "w", encoding="utf-8").write(s)
print("fermetures restaurees sur %d selecteur(s)" % n)
