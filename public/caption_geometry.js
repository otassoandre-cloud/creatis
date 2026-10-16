/* FICHIER GÉNÉRÉ — NE PAS MODIFIER À LA MAIN.
 * Source unique : repurpose-service/caption_geometry.py
 * Régénérer :     python -m caption_geometry --emit-js
 * Le serveur vérifie la fraîcheur de ce fichier au démarrage (assert_js_fresh).
 */
const CAPTION_STYLE = {
  "font_family": "Poppins SemiBold",
  "font_file": "Poppins-SemiBold.ttf",
  "font_size_h": 0.037,
  "active_scale": 1.35,
  "libass_cap_correction": 0.9013,
  "outline_h": 0.0047,
  "shadow_h": 0.0,
  "line1_top_h": 0.568,
  "line_gap_h": 0.0412,
  "max_line_w": 0.77,
  "color_idle": "#FFFFFF",
  "color_cycle": [
    "#3BFF2F",
    "#DD021A",
    "#FBFF1E"
  ],
  "color_outline": "#000000"
};

function captionPx(videoW, videoH) {
  const s = CAPTION_STYLE;
  const font = Math.round(videoH * s.font_size_h);
  return {
    font_px:        font,
    font_active_px: Math.round(font * s.active_scale),
    outline_px:     Math.round(videoH * s.outline_h),
    shadow_px:      Math.round(videoH * s.shadow_h),
    line1_top_px:   Math.round(videoH * s.line1_top_h),
    line_gap_px:    Math.round(videoH * s.line_gap_h),
    max_line_w_px:  Math.round(videoW * s.max_line_w),
    margin_px:      Math.round(videoW * (1 - s.max_line_w) / 2)
  };
}

function toCss(previewW, previewH) {
  const p = captionPx(previewW, previewH);
  return {
    // Correction libass appliquée ICI seulement : l'ASS est la référence.
    fontSize:         Math.round(p.font_px * CAPTION_STYLE.libass_cap_correction) + 'px',
    fontSizeActive:   Math.round(p.font_active_px * CAPTION_STYLE.libass_cap_correction) + 'px',
    // -webkit-text-stroke est CENTRÉ sur le tracé, \bord de l'ASS est ENTIÈREMENT
    // EXTÉRIEUR : pour le même rendu visuel, la valeur CSS vaut le double.
    webkitTextStroke: (p.outline_px * 2) + 'px ' + CAPTION_STYLE.color_outline,
    top:              p.line1_top_px + 'px',
    lineHeight:       p.line_gap_px + 'px',
    maxWidth:         p.max_line_w_px + 'px',
    marginLeft:       p.margin_px + 'px',
    marginRight:      p.margin_px + 'px',
    textShadow:       'none'
  };
}

if (typeof window !== 'undefined') {
  window.CAPTION_STYLE = CAPTION_STYLE;
  window.captionPx = captionPx;
  window.toCss = toCss;
}
