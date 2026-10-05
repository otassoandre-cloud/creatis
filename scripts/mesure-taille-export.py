# -*- coding: utf-8 -*-
"""Reproduit la ligne de style ASS du serveur pour le style Punch et mesure la hauteur
reelle des majuscules obtenue, en pourcentage de la hauteur video.

But : comparer ce chiffre a ce que produit l'apercu navigateur, qui applique
    fs = fontSize * (largeur_du_conteneur / 720)
Si les deux ne donnent pas le meme pourcentage, l'ecart de taille constate entre
l'apercu et l'export vient de la.

Ne modifie rien : rend un fichier de test dans .scratch-submagic/.
"""
import subprocess
import os

TAILLE = 55                     # valeur par defaut du client (bouton "S")
W, H = 720, 1280                # canvas ASS du serveur
TTF = ".scratch-submagic/Montserrat-ExtraBold.ttf"

ff = subprocess.run(["node", "-e", "process.stdout.write(require('ffmpeg-static'))"],
                    capture_output=True, text=True).stdout.strip()

contour = max(3, int(TAILLE * 0.10))
marge_v = int((1 - 60 / 100) * H)      # sub_y = 60 % par defaut

ass = """[Script Info]
ScriptType: v4.00+
PlayResX: %d
PlayResY: %d

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,Montserrat ExtraBold,%d,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,%d,0,8,44,44,%d,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
Dialogue: 0,0:00:00.00,0:00:05.00,Default,,0,0,0,,{\\pos(360,700)\\an8\\q2}BALANCE SA\\NCOUVERTURE COMME
""" % (W, H, TAILLE, contour, marge_v)

os.makedirs(".scratch-submagic", exist_ok=True)
open(".scratch-submagic/test-taille.ass", "w", encoding="utf-8").write(ass)

# Fond uni pour isoler le texte
subprocess.run([ff, "-y", "-loglevel", "error", "-f", "lavfi",
                "-i", "color=c=black:s=%dx%d:d=1" % (W, H),
                "-vf", "ass=.scratch-submagic/test-taille.ass",
                "-frames:v", "1", ".scratch-submagic/test-taille.png"], check=True)

from PIL import Image
im = Image.open(".scratch-submagic/test-taille.png").convert("RGB")
px = im.load()
lignes = [y for y in range(H)
          if any(px[x, y][0] > 235 and px[x, y][1] > 235 and px[x, y][2] > 235
                 for x in range(0, W, 2))]
if not lignes:
    print("aucun texte blanc detecte")
else:
    # Deux lignes : on isole la premiere en coupant sur le premier trou vertical
    blocs, cur = [], [lignes[0]]
    for y in lignes[1:]:
        if y - cur[-1] <= 3:
            cur.append(y)
        else:
            blocs.append(cur); cur = [y]
    blocs.append(cur)
    cap = len(blocs[0])
    cols = [x for x in range(W)
            if any(px[x, y][0] > 235 for y in range(blocs[0][0], blocs[0][-1] + 1))]
    largeur = (max(cols) - min(cols)) if cols else 0
    print("taille de police demandee : %d" % TAILLE)
    print("hauteur de majuscule      : %d px  = %.2f %% de la hauteur (%d)" % (cap, cap * 100 / H, H))
    print("largeur ligne 1           : %d px  = %.2f %% de la largeur (%d)" % (largeur, largeur * 100 / W, W))
    print()
    print("l'apercu doit viser le MEME pourcentage :")
    print("   fs = %d * (largeur_conteneur / 720)" % TAILLE)
    print("   -> conteneur 360 px : fs = %d px" % round(TAILLE * 360 / 720))
    print("   -> conteneur 405 px : fs = %d px" % round(TAILLE * 405 / 720))
