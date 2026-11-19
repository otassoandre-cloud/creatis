# -*- coding: utf-8 -*-
"""
Style de sous-titres mesuré au pixel sur un rendu Submagic réel.
Toutes les valeurs sont exprimées en % de la hauteur/largeur vidéo,
donc valables quelle que soit la résolution de sortie.

MÉCANIQUE CLÉ : le surlignage se fait LIGNE PAR LIGNE, pas mot par mot.
Une cue = 2 lignes. La ligne en cours d'énonciation est colorée,
l'autre reste blanche. La couleur tourne vert -> rouge -> jaune à
chaque nouvelle cue.
"""

# ---------------------------------------------------------------- MESURES
# Référence : zone vidéo 314 x 558 px extraite du screen recording.
CAP_HEIGHT_PCT   = 0.0269   # hauteur des majuscules / hauteur vidéo
OUTLINE_PCT      = 0.0072   # épaisseur du contour noir / hauteur vidéo
LINE1_CAPTOP_PCT = 0.5806   # haut des majuscules ligne 1 / hauteur vidéo
LINE_SPACING_PCT = 0.0412   # interligne (haut ligne 1 -> haut ligne 2)
MAX_LINE_W_PCT   = 0.77     # largeur max d'une ligne / largeur vidéo

# Rapport hauteur-de-majuscule / corps de la police.
# 0.70 = Montserrat. À recalibrer si tu changes de police (voir plus bas).
CAP_RATIO = 0.70

# --------------------------------------------------- CALIBRAGE PAR POLICE
# OUTLINE_PCT ci-dessus est mesuré sur un rendu Montserrat ExtraBold. Il ne se
# transpose PAS tel quel : Arial Black a des fûts plus épais et une approche plus
# serrée, si bien qu'à 0.0072 le contour se rejoint entre les lettres et forme un
# aplat noir au lieu d'un liseré (vérifié à l'image, comparaison à 14/10/7 px).
# Retenu à l'œil sur la comparaison : 0.0035 pour Arial Black.
CALIBRAGE = {
    "Montserrat ExtraBold": {"cap_ratio": 0.70, "outline_pct": 0.0072},
    "Arial Black":          {"cap_ratio": 0.716, "outline_pct": 0.0035},
}

WHITE  = "&H00FFFFFF"
BLACK  = "&H00000000"
CYCLE  = ["&H002FFF3B",   # vert   #3BFF2F
          "&H001A02DD",   # rouge  #DD021A
          "&H001EFFFB"]   # jaune  #FBFF1E

MAX_WORDS_PER_CUE = 4


def _ts(t):
    cs = int(round(t * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return f"{h:d}:{m:02d}:{s:02d}.{cs:02d}"


def _text_width(text, font_px, font_path=None):
    """Largeur en px. PIL si la police est dispo, sinon approximation."""
    if font_path:
        try:
            from PIL import ImageFont
            f = ImageFont.truetype(font_path, font_px)
            return f.getbbox(text)[2] - f.getbbox(text)[0]
        except Exception:
            pass
    return len(text) * font_px * 0.62   # approx police très grasse


def _wrap(words, font_px, max_w, font_path=None):
    """Coupe en 2 lignes max, par largeur pixel. Renvoie (l1, l2|None)."""
    txt = " ".join(w["word"].strip().upper() for w in words)
    if _text_width(txt, font_px, font_path) <= max_w or len(words) == 1:
        return words, None
    for split in range(len(words) - 1, 0, -1):
        l1 = " ".join(w["word"].strip().upper() for w in words[:split])
        if _text_width(l1, font_px, font_path) <= max_w:
            return words[:split], words[split:]
    return words[:1], words[1:]


def build_ass(cues, video_w, video_h, font_name="Montserrat ExtraBold",
              font_path=None):
    """
    cues : liste de dicts {"words": [{"word": str, "start": float, "end": float}]}
           -> les VRAIS timings mot par mot renvoyés par Groq.
    """
    # Applique le calibrage de la police demandée si on en a un, sinon les valeurs
    # mesurées sur la référence (Montserrat).
    cal = CALIBRAGE.get(font_name, {})
    cap_ratio = cal.get("cap_ratio", CAP_RATIO)
    outline_pct = cal.get("outline_pct", OUTLINE_PCT)

    font_px  = round(video_h * CAP_HEIGHT_PCT / cap_ratio)
    outline  = round(video_h * outline_pct)
    max_w    = video_w * MAX_LINE_W_PCT
    margin   = round((video_w - max_w) / 2)
    spacing  = round(video_h * LINE_SPACING_PCT)
    # \an8 ancre le HAUT de la boîte de ligne, pas le haut des majuscules.
    ascent_gap = round(font_px * (0.968 - cap_ratio))
    pos_y    = round(video_h * LINE1_CAPTOP_PCT) - ascent_gap

    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {video_w}
PlayResY: {video_h}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: SM,{font_name},{font_px},{WHITE},{WHITE},{BLACK},{BLACK},0,0,0,0,100,100,0,0,1,{outline},0,8,{margin},{margin},0,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
"""

    lines = []
    for i, cue in enumerate(cues):
        words = cue["words"][:MAX_WORDS_PER_CUE]
        if not words:
            continue
        hl = CYCLE[i % len(CYCLE)]
        w1, w2 = _wrap(words, font_px, max_w, font_path)
        t_start = float(w1[0]["start"])
        t_end   = float(words[-1]["end"])
        l1 = " ".join(w["word"].strip().upper() for w in w1)

        def ev(a, b, body):
            lines.append(f"Dialogue: 0,{_ts(a)},{_ts(b)},SM,,0,0,0,,"
                         f"{{\\an8\\pos({video_w//2},{pos_y})}}{body}")

        if w2 is None:
            ev(t_start, t_end, f"{{\\c{hl}}}{l1}")
        else:
            l2 = " ".join(w["word"].strip().upper() for w in w2)
            t_mid = float(w2[0]["start"])          # <-- le timing mot réel
            ev(t_start, t_mid, f"{{\\c{hl}}}{l1}\\N{{\\c{WHITE}}}{l2}")
            ev(t_mid, t_end,   f"{{\\c{WHITE}}}{l1}\\N{{\\c{hl}}}{l2}")

    return head + "\n".join(lines) + "\n"


def cues_from_words(raw_words, max_words=MAX_WORDS_PER_CUE):
    """Regroupe la liste de mots Groq en cues, timings conservés."""
    return [{"words": raw_words[i:i + max_words]}
            for i in range(0, len(raw_words), max_words)]


if __name__ == "__main__":
    demo = [{"word": w, "start": i * 0.28, "end": (i + 1) * 0.28}
            for i, w in enumerate(
                "so please feel free to play with the product".split())]
    print(build_ass(cues_from_words(demo), 1080, 1920))
