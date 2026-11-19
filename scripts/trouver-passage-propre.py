# -*- coding: utf-8 -*-
"""Trouve dans un clip deja exporte un passage SANS sous-titres incrustes,
pour pouvoir y appliquer un nouveau style sans superposition trompeuse.

Detection : on echantillonne la bande basse (ou vivent les sous-titres actuels)
et on compte les pixels blancs purs. Un creux prolonge = pas de texte affiche.
"""
import subprocess, sys, os, glob, shutil
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else "C:/Users/Utilisateur/Downloads/clip_9x16.mp4"
TMP = ".scratch-submagic/scan"
FF = subprocess.run(["node", "-e", "process.stdout.write(require('ffmpeg-static'))"],
                    capture_output=True, text=True).stdout.strip()

shutil.rmtree(TMP, ignore_errors=True)
os.makedirs(TMP, exist_ok=True)
subprocess.run([FF, "-y", "-loglevel", "error", "-i", SRC,
                "-vf", "fps=2,crop=iw:ih/4:0:ih*3/4,scale=240:-1",
                os.path.join(TMP, "s%04d.png")], capture_output=True)

fichiers = sorted(glob.glob(os.path.join(TMP, "*.png")))
print("images analysees :", len(fichiers))
blancs = []
for f in fichiers:
    im = Image.open(f).convert("RGB")
    W, H = im.size
    px = im.load()
    n = sum(1 for y in range(0, H, 2) for x in range(0, W, 2)
            if px[x, y][0] > 230 and px[x, y][1] > 230 and px[x, y][2] > 230)
    blancs.append(n)

SEUIL = 12
libre = [i for i, n in enumerate(blancs) if n < SEUIL]
# plus longue plage contigue
best, cur = [], []
for i in libre:
    if cur and i == cur[-1] + 1:
        cur.append(i)
    else:
        if len(cur) > len(best):
            best = cur
        cur = [i]
if len(cur) > len(best):
    best = cur

if not best:
    print("aucun passage sans sous-titres trouve")
else:
    t0, t1 = best[0] / 2.0, best[-1] / 2.0
    print("passage le plus propre : %.1fs -> %.1fs  (%.1fs)" % (t0, t1, t1 - t0))
