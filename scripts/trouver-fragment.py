# -*- coding: utf-8 -*-
"""Determine EXACTEMENT le fragment supprime du 1er panneau.

Principe : dans la version committee (HEAD), on part de la fin du bouton "wave" du
1er panneau et on avance jusqu'a trouver un morceau de texte qui existe aussi dans le
fichier courant APRES le point de rupture. Ce morceau marque l'endroit ou les deux
versions se rejoignent : tout ce qui le precede est ce qui a ete supprime.

Aucune supposition sur des noms de classes qui auraient pu changer entre les versions.
"""
import io

cur = io.open("clips-v2.html", encoding="utf-8").read()
head = io.open(".scratch-submagic/head.html", encoding="utf-8").read()


def apres_wave(src):
    i = src.index('data-style="wave"')          # 1 = regle CSS
    i = src.index('data-style="wave"', i + 10)  # 2 = bouton panneau 1
    return src.index("</button>", i) + len("</button>")


h0 = apres_wave(head)
c0 = apres_wave(cur)
print("rupture dans le fichier courant a l'offset %d" % c0)

# On avance dans HEAD par pas de 1 caractere, en cherchant une ancre de 120 caracteres
# presente dans le fichier courant apres le point de rupture.
ancre = None
for k in range(0, 12000):
    bout = head[h0 + k: h0 + k + 120]
    if len(bout) < 120:
        break
    pos = cur.find(bout, c0)
    if pos != -1:
        ancre = (k, pos, bout)
        break

if not ancre:
    print("aucune ancre trouvee — les versions ont trop divergE")
else:
    k, pos, bout = ancre
    fragment = head[h0: h0 + k]
    io.open(".scratch-submagic/fragment.html", "w", encoding="utf-8").write(fragment)
    print("fragment manquant : %d caracteres" % len(fragment))
    print("il se rebranche dans le courant a l'offset %d" % pos)
    print("ancre : %r" % bout[:80])
    for cle in ("modal-opt-row", "sz-btns", "Couleur", "Fond", "modal-styles-wrap"):
        print("   %-18s : %s" % (cle, "oui" if cle in fragment else "NON"))
