# -*- coding: utf-8 -*-
"""Genere un fichier ASS reproduisant les parametres mesures sur la reference concurrente.

Parametres releves image par image sur l'enregistrement fourni :
  - texte en CAPITALES, police lourde (geometrique grasse)
  - contour noir epais, pas d'ombre portee
  - mot actif : texte NOIR sur pave JAUNE #F3FF26
  - 2 a 3 mots par ligne
  - bloc positionne a ~60% de la hauteur

IMPORTANT : ne jamais generer ce fichier via un heredoc shell. Les antislashs des balises ASS
(\\an5, \\1c, \\bord) sont alors interpretes comme des caracteres de controle et le fichier
produit est silencieusement corrompu (verifiable avec `cat -A`).
"""
import sys

W, H = 1080, 1920
FS = 96          # ~5% de la hauteur — mesure sur la reference
BORD = 7         # contour noir du texte inactif
BORD_ACTIF = 20  # contour epais colore = effet "pave" derriere le mot actif
JAUNE = "&H26FFF3&"   # #F3FF26 converti en BGR
NOIR = "&H000000&"
BLANC = "&HFFFFFF&"
Y = int(H * 0.60)

# Bloc = 2 lignes empilees, 2 a 3 mots par ligne (structure relevee sur la reference).
# Chaque entree : (debut, fin, [ligne1], [ligne2])
BLOCS = [
    (0.0, 2.0, ["CE", "QUE"], ["PERSONNE"]),
    (2.0, 4.0, ["NE", "TE"], ["DIT"]),
    (4.0, 6.0, ["SUR", "LES"], ["CLIPS"]),
]


def t(s):
    h = int(s // 3600)
    m = int((s % 3600) // 60)
    sec = s % 60
    return "%d:%02d:%05.2f" % (h, m, sec)


BS = chr(92)   # antislash isole — evite toute ambiguite d'echappement

entete = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: %d" % W,
    "PlayResY: %d" % H,
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,"
    "Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,"
    "Alignment,MarginL,MarginR,MarginV,Encoding",
    "Style: Def,Arial Black,%d,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,"
    "-1,0,0,0,100,100,0,0,1,%d,0,5,60,60,0,1" % (FS, BORD),
    "",
    "[Events]",
    "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text",
]

evenements = []
for t0, t1, mots in LIGNES:
    n = len(mots)
    dt = (t1 - t0) / n
    for i in range(n):
        a, b = t0 + i * dt, t0 + (i + 1) * dt
        parts = []
        for j, mot in enumerate(mots):
            if j == i:
                parts.append(
                    "{" + BS + "1c" + NOIR + BS + "3c" + JAUNE + BS + "bord" + str(BORD_ACTIF) + "}"
                    + mot +
                    "{" + BS + "1c" + BLANC + BS + "3c" + NOIR + BS + "bord" + str(BORD) + "}"
                )
            else:
                parts.append(mot)
        pos = "{" + BS + "pos(%d,%d)" % (W // 2, Y) + BS + "an5}"
        evenements.append(
            "Dialogue: 0,%s,%s,Def,,0,0,0,,%s%s" % (t(a), t(b), pos, " ".join(parts))
        )

sortie = sys.argv[1] if len(sys.argv) > 1 else ".scratch-submagic/demo.ass"
with open(sortie, "w", encoding="utf-8") as f:
    f.write("\n".join(entete + evenements) + "\n")
print("ASS ecrit : %s (%d evenements)" % (sortie, len(evenements)))
