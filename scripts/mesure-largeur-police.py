# -*- coding: utf-8 -*-
"""Mesure la largeur REELLE des majuscules en Montserrat ExtraBold.

Le coefficient 0.62 utilise jusqu'ici etait une estimation. Il produisait un budget
de 18 caracteres par ligne alors que le texte debordait encore : libass repliait,
d'ou une troisieme ligne coupee en bas.

On mesure ici l'avance moyenne d'un caractere majuscule pour en deduire le vrai
coefficient, ainsi que le pire cas (lettres larges type M/W).
"""
from PIL import ImageFont
import sys

TTF = ".scratch-submagic/Montserrat-ExtraBold.ttf"
TAILLE = 200  # grande taille = mesure precise, on ramene en ratio ensuite

f = ImageFont.truetype(TTF, TAILLE)

ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def largeur(txt):
    b = f.getbbox(txt)
    return b[2] - b[0]


# Avance moyenne : on mesure une chaine longue pour lisser le crenage
moy = largeur(ALPHA) / len(ALPHA) / TAILLE
pire = max(largeur(c) for c in ALPHA) / TAILLE
esp = largeur("A A") - 2 * largeur("A")

print("coefficient MOYEN  : %.3f  (0.62 utilise jusqu'ici)" % moy)
print("coefficient PIRE   : %.3f  (lettre la plus large)" % pire)
print()

ZONE = 720 - 88   # largeur utile en px sur le canvas d'export
print("caracteres par ligne sur %d px utiles :" % ZONE)
print("  taille | avec 0.62 | avec %.3f (mesure) | avec %.3f (pire cas)" % (moy, pire))
for t in (40, 55, 70, 90):
    print("    %3d  |    %3d    |        %3d          |       %3d"
          % (t, int(ZONE / (0.62 * t)), int(ZONE / (moy * t)), int(ZONE / (pire * t))))

print()
# Cas concret observe a l'ecran
for phrase in ("CERVEAU FONCTIONNE", "SEULEMENT, TON", "PLUSIEURS MILLIARDAIRES"):
    for t in (55,):
        px = largeur(phrase) / TAILLE * t
        print("%-26s taille %d -> %4.0f px  (zone utile %d px) %s"
              % (phrase, t, px, ZONE, "DEBORDE" if px > ZONE else "ok"))
