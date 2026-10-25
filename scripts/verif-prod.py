# -*- coding: utf-8 -*-
"""Verifie dans la page EN PRODUCTION que chaque selecteur de styles est bien suivi de
son bloc d'options. On controle l'ORDRE des elements, pas seulement leur presence :
un simple comptage ne dirait rien de la structure."""
import io
import urllib.request

url = "https://creatis.app/clips-v2.html"
req = urllib.request.Request(url, headers={"Cache-Control": "no-cache"})
html = urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "replace")
io.open(".scratch-submagic/prod.html", "w", encoding="utf-8").write(html)
print("page recuperee : %d caracteres" % len(html))
print()

n = 0
pos = 0
while True:
    k = html.find('data-style="wave"', pos)
    if k == -1:
        break
    pos = k + 10
    if "ms-pill" not in html[max(0, k - 200):k]:
        continue
    fin = html.index("</button>", k) + len("</button>")
    if fin - k > 400:
        continue
    n += 1
    suite = html[fin:fin + 700]
    print("panneau %d :" % n)
    for cle, libelle in (("</div>", "fermetures"),
                         ("Glisse l'image", "astuce"),
                         ("modal-opt-row", "ligne d'options"),
                         ("sz-btns", "Taille"),
                         ("modal-color-text", "Couleur texte"),
                         ("modal-color-bg", "Fond")):
        print("   %-16s : %s" % (libelle, "oui" if cle in suite else "NON"))
    print()

print("vignettes 'Wow' dans la page : %d" % html.count('class="mt">Wow'))
print("bouton Punch                 : %d" % html.count('data-style="submagic"'))
