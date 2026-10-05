# -*- coding: utf-8 -*-
"""Genere plusieurs ASS identiques sauf l'epaisseur du contour, pour juger a l'oeil.

Pourquoi ce test : OUTLINE_PCT = 0.0072 a ete mesure sur un rendu Montserrat
ExtraBold. Arial Black (notre substitut local) a des fûts plus epais et un
approche plus serree : au meme rapport, le noir se rejoint entre les lettres et
forme un pave continu au lieu d'un lisere. Le bon reglage depend donc de la police.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import submagic_style as S

MOTS = [("CE", .00, .22), ("QUE", .22, .44), ("PERSONNE", .44, 1.05), ("NE", 1.05, 1.20),
        ("TE", 1.20, 1.36), ("DIT", 1.36, 1.85), ("SUR", 1.85, 2.10), ("LES", 2.10, 2.30),
        ("CLIPS", 2.30, 2.85), ("VIRAUX", 2.85, 3.60), ("ET", 3.60, 3.78),
        ("POURQUOI", 3.78, 4.40), ("CA", 4.40, 4.62), ("CHANGE", 4.62, 5.10),
        ("TOUT", 5.10, 5.90)]

RAW = [{"word": w, "start": a, "end": b} for w, a, b in MOTS]
FONT_PATH = "C:/Windows/Fonts/ariblk.ttf"
FONT_NAME = "Arial Black"

for pct in (0.0072, 0.0050, 0.0035):
    S.OUTLINE_PCT = pct
    ass = S.build_ass(S.cues_from_words(RAW), 1080, 1920,
                      font_name=FONT_NAME, font_path=FONT_PATH)
    nom = ".scratch-submagic/o%d.ass" % round(pct * 10000)
    with open(nom, "w", encoding="utf-8") as f:
        f.write(ass)
    print("%s  -> contour %d px sur 1920" % (nom, round(1920 * pct)))
