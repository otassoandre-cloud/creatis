# -*- coding: utf-8 -*-
"""Construit l'ASS a partir des mots Groq (words.json) et rend le clip complet.

Demonstration de bout en bout : les timings utilises sont ceux renvoyes par Groq,
mot par mot. C'est la difference avec la production actuelle, qui les remplace par
une division egale du segment.

Usage : python scripts/rendu-depuis-json.py <source.mp4> <sortie.mp4>
"""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import submagic_style as S

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP = os.path.join(RACINE, ".scratch-submagic")
FONT_PATH = "C:/Windows/Fonts/ariblk.ttf"
FONT = "Arial Black"

src = sys.argv[1]
sortie = sys.argv[2] if len(sys.argv) > 2 else os.path.join(TMP, "clip-complet.mp4")

with open(os.path.join(TMP, "words.json"), encoding="utf-8") as f:
    data = json.load(f)

mots = []
for m in data.get("words") or []:
    txt = (m.get("word") or "").strip()
    if not txt:
        continue
    mots.append({"word": txt, "start": float(m.get("start", 0)),
                 "end": float(m.get("end", 0))})

# Groq renvoie parfois des bornes qui se chevauchent legerement d'un mot a l'autre.
# On les rend monotones, sinon une cue peut commencer avant la fin de la precedente
# et les deux s'affichent en meme temps.
for i in range(1, len(mots)):
    if mots[i]["start"] < mots[i - 1]["end"]:
        mots[i]["start"] = mots[i - 1]["end"]
    if mots[i]["end"] <= mots[i]["start"]:
        mots[i]["end"] = mots[i]["start"] + 0.12

print("mots utilises :", len(mots))

# Les clips fournis ont deja des sous-titres incrustes en bas -> on place au milieu.
S.LINE1_CAPTOP_PCT = 0.42
S.CAP_HEIGHT_PCT = 0.0350

ass = S.build_ass(S.cues_from_words(mots), 1080, 1920,
                  font_name=FONT, font_path=FONT_PATH)
chemin = os.path.join(TMP, "complet.ass")
with open(chemin, "w", encoding="utf-8") as f:
    f.write(ass)
print("evenements ASS :", ass.count("Dialogue:"))

ff = subprocess.run(["node", "-e", "process.stdout.write(require('ffmpeg-static'))"],
                    capture_output=True, text=True).stdout.strip()
rel = os.path.relpath(chemin, RACINE).replace("\\", "/")
subprocess.run([ff, "-y", "-loglevel", "error", "-i", src,
                "-vf", "scale=1080:1920:flags=lanczos,ass='%s'" % rel,
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                "-pix_fmt", "yuv420p", "-c:a", "aac", sortie],
               check=True, cwd=RACINE)
print("rendu :", sortie)
