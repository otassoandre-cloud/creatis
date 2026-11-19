# -*- coding: utf-8 -*-
"""Affiche ce qui suit le selecteur de styles du 1er panneau dans la version committee.
Ecrit dans un fichier plutot que sur la sortie standard : la console Windows est en cp1252
et ne peut pas afficher les emoji presents dans le HTML."""
import io

s = io.open(".scratch-submagic/head.html", encoding="utf-8").read()
i = s.index('data-style="wave"')
i = s.index('data-style="wave"', i + 10)
fin = s.index("</button>", i) + len("</button>")
extrait = s[fin:fin + 1500]
io.open(".scratch-submagic/apres-selecteur.txt", "w", encoding="utf-8").write(extrait)
print("ecrit : .scratch-submagic/apres-selecteur.txt (%d caracteres)" % len(extrait))
# Reperes utiles, en ASCII uniquement
for cle in ("modal-opt-row", "Taille", "Couleur", "Fond", "sz-btns",
            "modal-styles-wrap", "state-upload", "drop-zone", "modal-cad"):
    print("  %-20s : %s" % (cle, "present" if cle in extrait else "-"))
