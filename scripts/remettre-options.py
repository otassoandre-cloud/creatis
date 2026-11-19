# -*- coding: utf-8 -*-
"""Remet le bloc d'options (astuce + Taille / Couleur texte / Fond) apres le 1er panneau.

Ce bloc avait ete emporte par un remplacement dont la borne de fin etait fausse. Le 2e
panneau, intact, sert de modele : sa structure est identique.

Delimitation par chaines exactes uniquement — aucune arithmetique de position.
INSPECTION par defaut ; --ecrire pour appliquer.
"""
import io
import sys

FERMETURES = "\n          </div>\n          </div>"
DEBUT_ASTUCE = '<div style="font-size:11px;color:var(--texte-muted);margin-top:8px'
FIN_OPTIONS = 'id="modal-color-bg"'

cur = io.open("clips-v2.html", encoding="utf-8").read()

# --- Modele : le bloc du panneau qui possede encore ses options ---
i = cur.index(DEBUT_ASTUCE)
j = cur.index(FIN_OPTIONS, i)
j = cur.index("</div>", j)          # ferme modal-opt-group
j = cur.index("</div>", j + 6)      # ferme modal-opt-row
modele = cur[i:j + len("</div>")]
print("bloc modele : %d caracteres" % len(modele))
for cle in ("Taille", "Couleur texte", "Fond", "sz-btns", "modal-color-text"):
    print("   %-16s : %s" % (cle, "oui" if cle in modele else "NON"))

# --- Cible : le panneau suivi de </div></div> puis d'autre chose que l'astuce ---
cibles = []
pos = 0
while True:
    k = cur.find('data-style="wave"', pos)
    if k == -1:
        break
    pos = k + 10
    if "ms-pill" not in cur[max(0, k - 200):k]:
        continue                                  # regle CSS
    fin_btn = cur.index("</button>", k) + len("</button>")
    # Garde de distance : une REGLE CSS contient elle aussi .ms-pill[data-style="wave"],
    # et son premier </button> se trouve des centaines de lignes plus loin, dans le balisage.
    # Sans ce controle, la regle CSS pointe vers le meme endroit qu'un vrai bouton et
    # l'insertion serait faite deux fois. C'est exactement l'erreur d'origine.
    if fin_btn - k > 400:
        continue
    if not cur[fin_btn:].startswith(FERMETURES):
        print("panneau ligne %d : fermetures absentes, ignore" % (cur[:k].count("\n") + 1))
        continue
    apres = fin_btn + len(FERMETURES)
    suite = cur[apres:apres + 200].lstrip()
    if suite.startswith(DEBUT_ASTUCE[:40]):
        print("panneau ligne %d : options deja presentes" % (cur[:k].count("\n") + 1))
    else:
        print("panneau ligne %d : OPTIONS MANQUANTES -> a restaurer" % (cur[:k].count("\n") + 1))
        cibles.append(apres)

if "--ecrire" in sys.argv and cibles:
    out = cur
    for pos_ins in reversed(cibles):
        out = out[:pos_ins] + "\n          " + modele + out[pos_ins:]
    io.open("clips-v2.html", "w", encoding="utf-8").write(out)
    print("\nOPTIONS RESTAUREES sur %d panneau(x) (%+d caracteres)"
          % (len(cibles), len(out) - len(cur)))
elif not cibles:
    print("\nrien a faire")
else:
    print("\n(inspection seule — relancer avec --ecrire)")
