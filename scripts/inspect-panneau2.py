# -*- coding: utf-8 -*-
"""Ecrit dans un fichier ce qui suit le selecteur de styles du 2e panneau (intact),
pour determiner exactement quel fragment manque au 1er panneau."""
import io

s = io.open("clips-v2.html", encoding="utf-8").read()
# 3e occurrence : 1 = regle CSS, 2 = bouton panneau 1, 3 = bouton panneau 2
i = s.index('data-style="wave"')
i = s.index('data-style="wave"', i + 10)
i = s.index('data-style="wave"', i + 10)
fin = s.index("</button>", i) + len("</button>")
extrait = s[fin:fin + 6000]
io.open(".scratch-submagic/panneau2-suite.txt", "w", encoding="utf-8").write(extrait)
print("ecrit (%d caracteres)" % len(extrait))
for cle in ("modal-opt-row", "sz-btns", "Couleur", "Fond", "split", "modal-cad",
            "transcript", "modal-hook", "watermark"):
    pos = extrait.find(cle)
    print("  %-16s : %s" % (cle, ("position %d" % pos) if pos >= 0 else "-"))
