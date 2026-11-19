# -*- coding: utf-8 -*-
"""Rend le style sur un clip a nous, sous-titres places au MILIEU du cadre
(pour ne pas se superposer aux anciens sous-titres deja incrustes en bas).
Genere aussi trois tailles pour trancher la hauteur de majuscule.
"""
import sys, os, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import submagic_style as S

MOTS = [("CE", .00, .22), ("QUE", .22, .44), ("PERSONNE", .44, 1.05), ("NE", 1.05, 1.20),
        ("TE", 1.20, 1.36), ("DIT", 1.36, 1.85), ("SUR", 1.85, 2.10), ("LES", 2.10, 2.30),
        ("CLIPS", 2.30, 2.85), ("VIRAUX", 2.85, 3.60), ("ET", 3.60, 3.78),
        ("POURQUOI", 3.78, 4.40), ("CA", 4.40, 4.62), ("CHANGE", 4.62, 5.10),
        ("TOUT", 5.10, 5.90)]
RAW = [{"word": w, "start": a, "end": b} for w, a, b in MOTS]
FONT_PATH = "C:/Windows/Fonts/ariblk.ttf"
FONT = "Arial Black"

S.LINE1_CAPTOP_PCT = 0.42        # bloc centre verticalement

for pct in (0.0269, 0.0350, 0.0430):
    S.CAP_HEIGHT_PCT = pct
    ass = S.build_ass(S.cues_from_words(RAW), 1080, 1920,
                      font_name=FONT, font_path=FONT_PATH)
    nom = ".scratch-submagic/mid%d.ass" % round(pct * 10000)
    open(nom, "w", encoding="utf-8").write(ass)
    print("%s -> majuscule %.2f%% de la hauteur" % (nom, pct * 100))
