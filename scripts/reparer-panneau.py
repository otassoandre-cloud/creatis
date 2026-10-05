# -*- coding: utf-8 -*-
"""Repare le premier panneau d'edition de clips-v2.html.

Contexte : un remplacement du selecteur de styles a utilise une borne de fin fausse
(index('data-style="wave"') tombait sur une REGLE CSS, pas sur le bouton). Tout ce qui
suivait le selecteur a ete supprime : fermetures de div, astuce, Taille, Couleur, Fond.

Methode : on reprend le fragment manquant dans la version committee (git show HEAD),
entre le bouton "wave" du 1er panneau et le debut de la zone upload, puis on le
reinsere apres le bouton "wave" du fichier courant.
"""
import io
import subprocess
import sys

FICHIER = "clips-v2.html"

courant = io.open(FICHIER, encoding="utf-8").read()
head = subprocess.run(["git", "show", "HEAD:clips-v2.html"],
                      capture_output=True, text=True, encoding="utf-8").stdout
if not head:
    sys.exit("impossible de lire la version HEAD")

MARQUE_FIN = '<div class="upload-trust">'


def bloc_manquant(src):
    """Fragment entre la fin du 1er bouton wave et la zone upload."""
    i = src.index('data-style="wave"')          # 1re occurrence = regle CSS
    i = src.index('data-style="wave"', i + 10)  # 2e = bouton du 1er panneau
    fin_bouton = src.index("</button>", i) + len("</button>")
    fin_zone = src.index(MARQUE_FIN, fin_bouton)
    return src[fin_bouton:fin_zone]


fragment = bloc_manquant(head)
print("fragment recupere : %d caracteres" % len(fragment))
for cle in ("modal-opt-row", "Taille", "Couleur", "Fond", "modal-styles-wrap"):
    print("   contient %-18s : %s" % (cle, "oui" if cle in fragment else "NON"))

# Point d'insertion : apres le bouton wave du 1er panneau du fichier courant
i = courant.index('data-style="wave"')
i = courant.index('data-style="wave"', i + 10)
fin_bouton = courant.index("</button>", i) + len("</button>")
fin_zone = courant.index(MARQUE_FIN, fin_bouton)

repare = courant[:fin_bouton] + fragment + courant[fin_zone:]
io.open(FICHIER, "w", encoding="utf-8").write(repare)
print("panneau repare (+%d caracteres)" % (len(repare) - len(courant)))
