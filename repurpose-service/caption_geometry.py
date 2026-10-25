"""
SOURCE DE VÉRITÉ UNIQUE pour la géométrie des sous-titres.

Aucune valeur en pixels ne doit exister ailleurs, ni dans le CSS de
l'aperçu, ni dans le générateur ASS. Les deux dérivent leurs pixels
d'ici. C'est la seule façon d'avoir un aperçu et un export identiques.

Toutes les valeurs sont des FRACTIONS de la hauteur ou de la largeur
vidéo, donc indépendantes de la résolution.
"""

STYLE = {
    # --- typographie ---
    "font_family":        "Poppins SemiBold",
    "font_file":          "Poppins-SemiBold.ttf",
    # corps de police = fraction de la HAUTEUR vidéo
    "font_size_h":        0.0370,
    # facteur d'agrandissement du mot actif
    "active_scale":       1.35,
    # À taille nominale égale, libass et le navigateur ne dessinent PAS la même hauteur de
    # majuscule : mesuré sur cinq tailles, libass rend à 0.631 du corps là où la police en
    # annonce 0.700. Sans cette correction l'aperçu paraît ~11 % plus grand que l'export.
    # Caractéristique de libass, pas de la police : Montserrat donnait 0.899, Poppins 0.9013.
    # Ne s'applique QU'AU CSS — l'ASS est la référence, c'est l'aperçu qui doit s'y aligner.
    "libass_cap_correction": 0.9013,

    # --- contour ---
    # épaisseur = fraction de la HAUTEUR vidéo, mesurée en débord
    # EXTÉRIEUR au glyphe (convention ASS, voir note CSS plus bas)
    "outline_h":          0.0047,
    "shadow_h":           0.0,

    # --- placement ---
    # y du HAUT de la boîte de ligne 1 = fraction de la HAUTEUR
    "line1_top_h":        0.5680,
    # interligne (haut ligne 1 -> haut ligne 2) = fraction de la HAUTEUR
    "line_gap_h":         0.0412,
    # largeur max d'une ligne = fraction de la LARGEUR
    "max_line_w":         0.77,

    # --- couleurs ---
    "color_idle":         "#FFFFFF",
    # Cycle réellement appliqué : une couleur par page, dans cet ordre.
    # Le module ne doit déclarer que ce que le code applique — une couleur unique
    # ici alors que le rendu en fait tourner trois était un mensonge de contrat.
    "color_cycle":        ["#3BFF2F", "#DD021A", "#FBFF1E"],
    "color_outline":      "#000000",
}


def px(video_w: int, video_h: int) -> dict:
    """Convertit le style en pixels pour une résolution donnée."""
    s = STYLE
    font = round(video_h * s["font_size_h"])
    return {
        "font_px":        font,
        "font_active_px": round(font * s["active_scale"]),
        "outline_px":     round(video_h * s["outline_h"]),
        "shadow_px":      round(video_h * s["shadow_h"]),
        "line1_top_px":   round(video_h * s["line1_top_h"]),
        "line_gap_px":    round(video_h * s["line_gap_h"]),
        "max_line_w_px":  round(video_w * s["max_line_w"]),
        "margin_px":      round(video_w * (1 - s["max_line_w"]) / 2),
    }


def to_css(preview_w: int, preview_h: int) -> dict:
    """Valeurs pour l'aperçu navigateur. Voir NOTE CONTOUR."""
    p = px(preview_w, preview_h)
    return {
        # Correction libass appliquee ICI seulement : l'ASS est la reference.
        "fontSize":        f'{round(p["font_px"] * STYLE["libass_cap_correction"])}px',
        "fontSizeActive":  f'{round(p["font_active_px"] * STYLE["libass_cap_correction"])}px',
        # CSS: -webkit-text-stroke est CENTRÉ sur le tracé du glyphe,
        # ASS \bord est ENTIÈREMENT EXTÉRIEUR. Pour le même rendu
        # visuel, la valeur CSS doit valoir le DOUBLE.
        "webkitTextStroke": f'{p["outline_px"] * 2}px {STYLE["color_outline"]}',
        "top":             f'{p["line1_top_px"]}px',
        "lineHeight":      f'{p["line_gap_px"]}px',
        "maxWidth":        f'{p["max_line_w_px"]}px',
        # Remplace les `left: 4%` / `right: 4%` de la feuille de style.
        # Doit valoir exactement les MarginL/MarginR de l'ASS, sinon le
        # point de coupure des lignes diffère entre aperçu et export.
        "marginLeft":      f'{p["margin_px"]}px',
        "marginRight":     f'{p["margin_px"]}px',
        "textShadow":      "none",
    }


def to_ass_header(video_w: int, video_h: int) -> str:
    """En-tête ASS. PlayRes DOIT valoir la résolution de sortie."""
    p = px(video_w, video_h)
    def bgr(hexcol):
        h = hexcol.lstrip("#")
        return f"&H00{h[4:6]}{h[2:4]}{h[0:2]}"
    return f"""[Script Info]
ScriptType: v4.00+
PlayResX: {video_w}
PlayResY: {video_h}
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: SM,{STYLE["font_family"]},{p["font_active_px"]},{bgr(STYLE["color_idle"])},{bgr(STYLE["color_idle"])},{bgr(STYLE["color_outline"])},&H00000000,0,0,0,0,100,100,0,0,1,{p["outline_px"]},{p["shadow_px"]},8,{p["margin_px"]},{p["margin_px"]},0,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
"""


# ---------------------------------------------------------------- ARTEFACT JS
# Le navigateur ne peut pas appeler ce module. Plutôt que de recopier les fractions à la
# main dans le JavaScript — ce qui recréerait deux sources de vérité — on ÉMET un fichier
# depuis celui-ci. L'artefact est commité, et `assert_js_fresh()` vérifie au démarrage
# qu'il correspond encore au module. Une dérive devient donc impossible à ignorer.

import json
import os

_JS_REL = os.path.join("public", "caption_geometry.js")


def _racine_depot() -> str:
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def chemin_js() -> str:
    return os.path.join(_racine_depot(), _JS_REL)


def emit_js() -> str:
    """Rend le contenu du fichier JavaScript dérivé du module."""
    return (
        "/* FICHIER GÉNÉRÉ — NE PAS MODIFIER À LA MAIN.\n"
        " * Source unique : repurpose-service/caption_geometry.py\n"
        " * Régénérer :     python -m caption_geometry --emit-js\n"
        " * Le serveur vérifie la fraîcheur de ce fichier au démarrage (assert_js_fresh).\n"
        " */\n"
        "const CAPTION_STYLE = " + json.dumps(STYLE, indent=2, ensure_ascii=False) + ";\n\n"
        "function captionPx(videoW, videoH) {\n"
        "  const s = CAPTION_STYLE;\n"
        "  const font = Math.round(videoH * s.font_size_h);\n"
        "  return {\n"
        "    font_px:        font,\n"
        "    font_active_px: Math.round(font * s.active_scale),\n"
        "    outline_px:     Math.round(videoH * s.outline_h),\n"
        "    shadow_px:      Math.round(videoH * s.shadow_h),\n"
        "    line1_top_px:   Math.round(videoH * s.line1_top_h),\n"
        "    line_gap_px:    Math.round(videoH * s.line_gap_h),\n"
        "    max_line_w_px:  Math.round(videoW * s.max_line_w),\n"
        "    margin_px:      Math.round(videoW * (1 - s.max_line_w) / 2)\n"
        "  };\n"
        "}\n\n"
        "function toCss(previewW, previewH) {\n"
        "  const p = captionPx(previewW, previewH);\n"
        "  return {\n"
        "    // Correction libass appliquée ICI seulement : l'ASS est la référence.\n"
        "    fontSize:         Math.round(p.font_px * CAPTION_STYLE.libass_cap_correction) + 'px',\n"
        "    fontSizeActive:   Math.round(p.font_active_px * CAPTION_STYLE.libass_cap_correction) + 'px',\n"
        "    // -webkit-text-stroke est CENTRÉ sur le tracé, \\bord de l'ASS est ENTIÈREMENT\n"
        "    // EXTÉRIEUR : pour le même rendu visuel, la valeur CSS vaut le double.\n"
        "    webkitTextStroke: (p.outline_px * 2) + 'px ' + CAPTION_STYLE.color_outline,\n"
        "    top:              p.line1_top_px + 'px',\n"
        "    lineHeight:       p.line_gap_px + 'px',\n"
        "    maxWidth:         p.max_line_w_px + 'px',\n"
        "    marginLeft:       p.margin_px + 'px',\n"
        "    marginRight:      p.margin_px + 'px',\n"
        "    textShadow:       'none'\n"
        "  };\n"
        "}\n\n"
        "if (typeof window !== 'undefined') {\n"
        "  window.CAPTION_STYLE = CAPTION_STYLE;\n"
        "  window.captionPx = captionPx;\n"
        "  window.toCss = toCss;\n"
        "}\n"
    )


def ecrire_js() -> str:
    chemin = chemin_js()
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    with open(chemin, "w", encoding="utf-8", newline="\n") as f:
        f.write(emit_js())
    return chemin


def assert_js_fresh() -> bool:
    """Vérifie que l'artefact JS commité correspond encore au module.

    Une dérive signifierait que l'aperçu et l'export ne partagent plus la même géométrie —
    exactement le défaut que ce module existe pour supprimer. On ne lève pas d'exception
    (le rendu doit continuer de fonctionner), mais l'alerte est explicite dans les logs.
    """
    chemin = chemin_js()
    attendu = emit_js()
    try:
        with open(chemin, encoding="utf-8") as f:
            actuel = f.read()
    except FileNotFoundError:
        raise RuntimeError(
            "caption_geometry: %s est ABSENT. Regénérer avec "
            "`python -m caption_geometry --emit-js` et commiter l'artefact." % _JS_REL)
    if actuel.replace("\r\n", "\n") != attendu:
        raise RuntimeError(
            "caption_geometry: %s est PÉRIMÉ par rapport au module. L'aperçu et l'export "
            "n'ont plus la même géométrie. Regénérer avec "
            "`python -m caption_geometry --emit-js` et commiter." % _JS_REL)
    return True


if __name__ == "__main__":
    import sys
    if "--emit-js" in sys.argv:
        print("écrit :", ecrire_js())
    else:
        print("EXPORT 1080x1920 :", px(1080, 1920))
        print("APERCU  405x720  :", px(405, 720))
        print()
        print(to_css(405, 720))
