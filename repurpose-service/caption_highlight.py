"""
Style de sous-titres « highlight » — mot actif bleu, agrandi, plus bandeau bleu plein.

Ajouté à côté des styles existants, sans en modifier aucun. Toutes les valeurs sont des
FRACTIONS de la hauteur ou de la largeur vidéo, donc valables à n'importe quelle résolution.

Géométrie relevée au pixel sur un rendu Submagic de référence, puis vérifiée sur le rendu
réel (voir `.scratch-submagic/labo/` : calibrer.py, auditer.py, test_stabilite.py).

TROIS PIÈGES MESURÉS, à ne pas « simplifier » :

1. libass ne rend PAS la taille annoncée par les métriques de la police. Mesuré sur cinq
   corps avec Poppins SemiBold : la capitale sort à 0.408 du corps demandé, l'ascendante à
   0.4324, là où la police annonce 0.700 et 0.750. Déduire le corps des métriques donne un
   texte 1,75 fois trop petit. D'où COEF_ASCENDANTE_LIBASS ci-dessous.
   ATTENTION : ce coefficient dépend de la version de libass. Il a été mesuré avec ffmpeg
   6.1.1. Avant de se fier au rendu en production, relancer `verifier_geometrie.py` dans le
   conteneur — c'est fait pour ça.

2. Une cue de deux lignes SAUTE de 19 px quand le mot actif change de ligne : libass cale
   chaque ligne sur la plus grande police qu'elle contient, et une ligne sans mot actif
   rétrécit. Poser un grand Fontsize sur le style n'y change rien. Correctif : une ligne =
   un événement Dialogue posé en absolu, plus un glyphe invisible de largeur nulle à la
   grande taille (CALE) qui fige la hauteur de boîte. Vérifié à 0 px.

3. `\\q2` est obligatoire DANS le texte : `WrapStyle` dans l'en-tête ne suffit pas, libass
   replie par-dessus nos coupures. Et une ligne trop large est rognée au bord sans erreur.
"""

import os

# --- typographie ------------------------------------------------------------
FONT_FAMILY = "Poppins SemiBold"
FONT_FILE = "/usr/share/fonts/truetype/creatis/Poppins-SemiBold.ttf"

# Hauteur d'ascendante visée, en fraction de la hauteur vidéo (mesure de référence).
ASCENDER_H = 0.0269
# Ce que libass rend réellement, par unité de \fs. Voir piège 1.
COEF_ASCENDANTE_LIBASS = 0.4324
# Hauteur de la BOÎTE de ligne, elle, vaut le corps demandé : mesuré 1.00 sur trois corps
# (\fs40 -> 48 px de fond moins 2x4 de marge, \fs50 -> 58, \fs60 -> 68). C'est la clé du
# piège 1 : libass normalise la hauteur totale sur le \fs, ce qui écrase les glyphes à 0.43.
# Sert à dimensionner le fond du bandeau, qui épouse la boîte et non les glyphes.
COEF_HAUTEUR_BOITE_LIBASS = 1.0
# Taille PIL qui reproduit la largeur réellement rendue par libass pour un \fs donné.
# Mesurée à deux corps (120 -> 68, 162 -> 92), rapport constant.
COEF_PIL_PAR_FS = 0.567

ACTIVE_SCALE = 1.35          # agrandissement du mot actif
OUTLINE_H = 0.0045           # contour noir, fraction de la hauteur
LINE_GAP_H = 0.0412          # haut ligne 1 -> haut ligne 2
LINE1_TOP_H = 0.584          # haut des ascendantes de la ligne 1
MAX_LINE_W = 0.77            # largeur max d'une ligne

# Écart entre le \pos posé et le haut des ascendantes réellement rendu, en fraction de la
# hauteur. Mesuré à 53 px sur 1920 avec la cale de hauteur en place.
POS_TO_ASCENDER_H = 53.0 / 1920.0

# --- couleurs (format ASS &HBBGGRR) -----------------------------------------
COLOR_IDLE = "&H00FFFFFF"
COLOR_ACTIVE = "&H00F9AC10"      # #10ACF9
COLOR_OUTLINE = "&H00000000"

# --- découpage --------------------------------------------------------------
WORDS_PER_CUE = 4
MAX_LINES = 2
# Une cue reste affichée jusqu'à la suivante — c'est ce qui évite les trous. Mais au-delà
# de ce silence, on la fait disparaître à la fin du dernier mot : sinon un blanc de 15 s
# laisse le sous-titre figé à l'écran. Même seuil que le découpage de la transcription.
SILENCE_MAX = 0.7

# --- bandeau bleu plein -----------------------------------------------------
BANNER_TOP_H = 0.591         # haut du fond
BANNER_HEIGHT_H = 0.0215     # hauteur totale du fond
BANNER_PAD_H = 4.0 / 1920.0  # marge du fond autour du texte
BANNER_POS_OFFSET_H = -4.0 / 1920.0   # \pos -> haut du fond, mesuré
BANNER_MIN_DUR = 0.6         # en dessous, le bandeau clignote
BANNER_MAX_W = 0.70          # une cue plus large n'est plus « courte »
BANNER_CADENCE_S = 12.0      # une fenêtre = un bandeau, sur la cue la plus étroite

_FONTS = {}


def px(video_w: int, video_h: int) -> dict:
    """Convertit le style en pixels pour une résolution donnée."""
    corps = round(ASCENDER_H * video_h / COEF_ASCENDANTE_LIBASS)
    corps_actif = round(corps * ACTIVE_SCALE)
    corps_bandeau = round(
        (BANNER_HEIGHT_H * video_h - 2 * BANNER_PAD_H * video_h) / COEF_HAUTEUR_BOITE_LIBASS)
    return {
        "font_px": corps,
        "font_active_px": corps_actif,
        "outline_px": max(1, round(OUTLINE_H * video_h)),
        "line1_top_px": round(LINE1_TOP_H * video_h),
        "line_gap_px": round(LINE_GAP_H * video_h),
        "pos_offset_px": round(POS_TO_ASCENDER_H * video_h),
        "max_line_w_px": round(MAX_LINE_W * video_w),
        "margin_px": round(video_w * (1 - MAX_LINE_W) / 2),
        "banner_font_px": corps_bandeau,
        "banner_pad_px": max(1, round(BANNER_PAD_H * video_h)),
        "banner_top_px": round(BANNER_TOP_H * video_h),
        "banner_pos_offset_px": round(BANNER_POS_OFFSET_H * video_h),
    }


def style_lines(video_w: int, video_h: int, margin_v: int = 0) -> list:
    """Les DEUX lignes `Style:` du style — texte normal, puis bandeau.

    Le bandeau est obtenu avec BorderStyle=3 : le « contour » devient une boîte opaque
    remplie avec la couleur de contour. Pas de rectangle dessiné à la main.
    """
    p = px(video_w, video_h)
    return [
        f"Style: Hl,{FONT_FAMILY},{p['font_active_px']},{COLOR_IDLE},{COLOR_IDLE},"
        f"{COLOR_OUTLINE},{COLOR_OUTLINE},0,0,0,0,100,100,0,0,1,{p['outline_px']},0,8,"
        f"{p['margin_px']},{p['margin_px']},{margin_v},1",
        f"Style: HlB,{FONT_FAMILY},{p['banner_font_px']},{COLOR_IDLE},{COLOR_IDLE},"
        f"{COLOR_ACTIVE},{COLOR_ACTIVE},0,0,0,0,100,100,0,0,3,{p['banner_pad_px']},0,8,"
        f"{p['margin_px']},{p['margin_px']},{margin_v},1",
    ]


def _font(taille: int):
    f = _FONTS.get(taille)
    if f is None:
        from PIL import ImageFont
        f = ImageFont.truetype(FONT_FILE, taille)
        _FONTS[taille] = f
    return f


def _largeur(mots, index_actif, p):
    """Largeur rendue d'une ligne, le mot `index_actif` étant agrandi.

    Mesurée sur le vrai fichier de police, à la taille PIL qui reproduit ce que libass
    dessine. Aucun coefficient par nombre de caractères : « CERVEAU » et « iiiiiii » n'ont
    pas la même largeur, et c'est précisément là que les découpages se trompent.
    """
    try:
        f_repos = _font(max(1, round(p["font_px"] * COEF_PIL_PAR_FS)))
        f_actif = _font(max(1, round(p["font_active_px"] * COEF_PIL_PAR_FS)))
        total = f_repos.getlength(" ") * max(0, len(mots) - 1)
        for j, m in enumerate(mots):
            total += (f_actif if j == index_actif else f_repos).getlength(m)
        return total
    except Exception:
        # Repli grossier : le rendu reste correct, seul le découpage devient approximatif.
        return sum(len(m) for m in mots) * p["font_px"] * 0.45


def _largeur_pire_cas(mots, p):
    """Largeur quand le mot le plus large est agrandi — sinon la ligne déborde à son tour."""
    if not mots:
        return 0.0
    return max(_largeur(mots, i, p) for i in range(len(mots)))


def _couper_en_lignes(mots, p):
    """Répartit les mots en lignes selon la largeur mesurée. None si ça ne rentre pas."""
    lignes, courante = [], []
    for m in mots:
        essai = courante + [m]
        if _largeur_pire_cas(essai, p) <= p["max_line_w_px"]:
            courante = essai
        else:
            if not courante:
                return None
            lignes.append(courante)
            courante = [m]
            if len(lignes) >= MAX_LINES:
                return None
    if courante:
        lignes.append(courante)
    return lignes if len(lignes) <= MAX_LINES else None


def _mots_du_segment(seg):
    """Timings mot par mot, en imposant des débuts croissants.

    Groq en renvoie quelques-uns qui reculent ; la règle « fin du mot actif = début du
    suivant » produirait alors des durées négatives.
    """
    sortie, precedent = [], 0.0
    for w in (seg.get("words") or []):
        mot = str(w.get("word", "")).strip()
        if not mot or mot in ("...", "…"):
            continue
        debut = float(w.get("start", 0.0))
        if debut < precedent:
            debut = precedent
        sortie.append({"mot": mot, "start": debut, "end": float(w.get("end", debut))})
        precedent = debut
    return sortie


def _cues(mots, p):
    """Groupes de WORDS_PER_CUE mots, réduits tant que le pavage dépasse deux lignes."""
    cues, i = [], 0
    while i < len(mots):
        pris = None
        for n in range(min(WORDS_PER_CUE, len(mots) - i), 0, -1):
            paquet = mots[i:i + n]
            lignes = _couper_en_lignes([m["mot"] for m in paquet], p)
            if lignes is not None:
                pris = (paquet, lignes)
                break
        if pris is None:
            paquet = mots[i:i + 1]
            pris = (paquet, [[paquet[0]["mot"]]])
        cues.append({"mots": pris[0], "lignes": pris[1]})
        i += len(pris[0])
    return cues


def _bornes(cues):
    """(début, fin) de chaque cue, en tenant compte des silences.

    Contiguë par défaut : la cue court jusqu'au début de la suivante, donc du texte reste
    affiché en permanence. Au-delà de SILENCE_MAX, elle s'arrête à la fin de son dernier mot.
    """
    sortie = []
    for idx, cue in enumerate(cues):
        debut = cue["mots"][0]["start"]
        fin_mot = max(m["end"] for m in cue["mots"])
        if idx + 1 < len(cues):
            suivant = cues[idx + 1]["mots"][0]["start"]
            fin = suivant if (suivant - fin_mot) <= SILENCE_MAX else fin_mot
        else:
            fin = fin_mot
        sortie.append((debut, max(fin, debut)))
    return sortie


def _marquer_bandeaux(cues, bornes, p):
    """Un bandeau par fenêtre de BANNER_CADENCE_S, sur la cue la plus étroite.

    Un simple seuil de largeur rendait la fréquence otage du débit : sur un locuteur aux
    mots longs, aucune cue ne passait sous le seuil et le bandeau n'apparaissait jamais.
    """
    meilleure = {}
    for idx, cue in enumerate(cues):
        cue["bandeau"] = False
        if len(cue["lignes"]) != 1:
            continue
        debut, fin = bornes[idx]
        if (fin - debut) < BANNER_MIN_DUR:
            continue
        largeur = _largeur_pire_cas([m["mot"] for m in cue["mots"]], p)
        if largeur > BANNER_MAX_W * p["max_line_w_px"] / MAX_LINE_W:
            continue
        fenetre = int(debut // BANNER_CADENCE_S)
        if fenetre not in meilleure or largeur < meilleure[fenetre][0]:
            meilleure[fenetre] = (largeur, idx)
    for _, idx in meilleure.values():
        cues[idx]["bandeau"] = True
    return cues


def _echapper(texte):
    return texte.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")


def dialogues(segments, video_w, video_h, to_ass_time, y_px=None):
    """Construit les lignes `Dialogue:` du style.

    `segments` : les segments du service, chacun avec `t0`, `t1`, `text` et `words`.
    `y_px` : haut de la BOÎTE de la ligne 1, même convention que le `\\pos` des autres
    styles (donc que la position réglée dans le studio). Par défaut, la position de
    référence : le haut des ASCENDANTES tombe alors à 58,4 % de la hauteur.
    Renvoie [] si aucun timing mot par mot n'est disponible — le style repose entièrement
    dessus, mieux vaut ne rien produire que de réinventer les durées.
    """
    p = px(video_w, video_h)
    y_boite = (p["line1_top_px"] - p["pos_offset_px"]) if y_px is None else int(y_px)

    # Regroupement SEGMENT PAR SEGMENT : jamais de cue à cheval sur deux segments. Le
    # service a déjà coupé la transcription sur les silences de plus de 0,7 s ; fusionner
    # tous les mots ferait réapparaître les cues qui enjambent un blanc.
    cues = []
    for seg in sorted(segments, key=lambda s: float(s.get("t0", s.get("start", 0)) or 0)):
        mots = _mots_du_segment(seg)
        if mots:
            cues.extend(_cues(mots, p))
    if not cues:
        return []

    bornes = _bornes(cues)
    cues = _marquer_bandeaux(cues, bornes, p)
    cale = ("{\\fs%d\\alpha&HFF&\\fscx0}H{\\r\\fs%d}"
            % (p["font_active_px"], p["font_px"]))
    x_px = video_w // 2
    lignes = []

    for idx, cue in enumerate(cues):
        debut, fin_cue = bornes[idx]
        mots_cue = cue["mots"]

        if cue["bandeau"]:
            # Un seul événement, statique : sur fond bleu, un mot actif bleu serait
            # invisible — et la référence n'en montre aucun dans un bandeau.
            if fin_cue <= debut:
                continue
            # Le bandeau suit la position réglée, en conservant l'écart mesuré sur la
            # référence entre son fond et le haut de la ligne 1.
            y = y_boite + ((p["banner_top_px"] - p["banner_pos_offset_px"])
                           - (p["line1_top_px"] - p["pos_offset_px"]))
            texte = " ".join(_echapper(m["mot"]) for m in mots_cue)
            lignes.append(
                f"Dialogue: 0,{to_ass_time(debut)},{to_ass_time(fin_cue)},HlB,,0,0,0,,"
                f"{{\\q2\\an8\\pos({x_px},{y})}}{texte}")
            continue

        for k, mot in enumerate(mots_cue):
            t0 = mot["start"]
            t1 = mots_cue[k + 1]["start"] if k + 1 < len(mots_cue) else fin_cue
            if t1 <= t0:
                continue
            rang = 0
            for no_ligne, ligne in enumerate(cue["lignes"]):
                morceaux = []
                for mot_txt in ligne:
                    if rang == k:
                        morceaux.append(
                            "{\\fs%d\\c%s}%s{\\r\\fs%d}"
                            % (p["font_active_px"], COLOR_ACTIVE,
                               _echapper(mot_txt), p["font_px"]))
                    else:
                        morceaux.append(_echapper(mot_txt))
                    rang += 1
                # Une ligne = un événement posé en absolu : aucune ligne ne dépend de la
                # hauteur de l'autre, donc plus de saut vertical.
                y = y_boite + no_ligne * p["line_gap_px"]
                lignes.append(
                    f"Dialogue: 0,{to_ass_time(t0)},{to_ass_time(t1)},Hl,,0,0,0,,"
                    f"{{\\q2\\an8\\pos({x_px},{y})}}{{\\fs{p['font_px']}}}"
                    f"{cale}{' '.join(morceaux)}")
    return lignes
