# -*- coding: utf-8 -*-
"""Mesure le rapport hauteur-de-majuscule / taille-de-police tel que le rend REELLEMENT
libass, a plusieurs tailles.

Enjeu : le navigateur applique le rapport typographique de Montserrat (~0.70 de l'em).
Si libass en applique un autre, l'apercu et l'export n'auront jamais la meme taille, quelle
que soit la valeur envoyee. Une seule mesure pouvait etre faussee par l'anticrenelage :
on en fait plusieurs pour degager le rapport reel.
"""
import subprocess
from PIL import Image

W, H = 720, 1280
ff = subprocess.run(["node", "-e", "process.stdout.write(require('ffmpeg-static'))"],
                    capture_output=True, text=True).stdout.strip()

GABARIT = """[Script Info]
ScriptType: v4.00+
PlayResX: %d
PlayResY: %d

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,Montserrat ExtraBold,%d,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,8,44,44,0,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
Dialogue: 0,0:00:00.00,0:00:05.00,Default,,0,0,0,,{\\pos(360,400)\\an8\\q2}HEXE
"""


def mesure(taille):
    ass = ".scratch-submagic/cap%d.ass" % taille
    png = ".scratch-submagic/cap%d.png" % taille
    open(ass, "w", encoding="utf-8").write(GABARIT % (W, H, taille))
    subprocess.run([ff, "-y", "-loglevel", "error", "-f", "lavfi",
                    "-i", "color=c=black:s=%dx%d:d=1" % (W, H),
                    "-vf", "ass=%s" % ass, "-frames:v", "1", png], check=True)
    im = Image.open(png).convert("L")
    px = im.load()
    ys = [y for y in range(H) if any(px[x, y] > 200 for x in range(0, W, 2))]
    return (max(ys) - min(ys) + 1) if ys else 0


print("%8s %10s %10s" % ("taille", "majuscule", "rapport"))
rapports = []
for t in (40, 55, 70, 90, 120, 160):
    cap = mesure(t)
    r = cap / t if t else 0
    rapports.append(r)
    print("%8d %10d %10.4f" % (t, cap, r))

moy = sum(rapports) / len(rapports)
print()
print("rapport libass moyen      : %.4f" % moy)
print("rapport navigateur (CSS)  : 0.7000  (cap height de Montserrat)")
print("facteur de correction     : %.4f" % (moy / 0.70))
print()
print("=> pour que l'apercu colle a l'export :")
print("   fs = fontSize * sc * %.4f" % (moy / 0.70))
