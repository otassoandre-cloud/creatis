"""
Vérifie que les coefficients de caption_highlight.py valent encore pour CE libass.

Les tailles du style « highlight » ne se déduisent pas des métriques de la police : libass
écrase les glyphes pour faire tenir ascendante et jambages dans le corps demandé. Le
rapport a été mesuré avec ffmpeg 6.1.1 ; une autre version peut le déplacer, et rien ne le
signalerait — le rendu paraîtrait juste « un peu petit » ou « un peu gros ».

À lancer dans le conteneur après toute mise à jour de ffmpeg, de libass ou de la police :

    python verifier_geometrie.py

Sortie 0 si les coefficients tiennent, 1 sinon (avec les valeurs à reporter dans le module).
"""

import os
import subprocess
import sys
import tempfile

import caption_highlight as CH

LARGEUR, HAUTEUR = 720, 1280
SEUIL_PIXEL = 40
TOLERANCE = 0.05          # 5 % d'écart admis avant de crier
CORPS_ESSAI = [60, 90, 120]

ENTETE = """[Script Info]
ScriptType: v4.00+
PlayResX: {w}
PlayResY: {h}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: V,{police},{corps},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,8,20,20,0,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
"""


def _mesurer(png):
    """Hauteur d'encre : le fond est noir, tout pixel allumé est un glyphe."""
    from PIL import Image
    im = Image.open(png).convert("L")
    masque = im.point(lambda p: 255 if p > SEUIL_PIXEL else 0)
    boite = masque.getbbox()
    return (boite[3] - boite[1]) if boite else 0


def main():
    if not os.path.exists(CH.FONT_FILE):
        print(f"ECHEC : police introuvable — {CH.FONT_FILE}")
        print("       libass retombera silencieusement sur une autre police.")
        return 1

    tmp = tempfile.mkdtemp()
    mesures = []
    for corps in CORPS_ESSAI:
        ass = os.path.join(tmp, f"v{corps}.ass")
        png = os.path.join(tmp, f"v{corps}.png")
        with open(ass, "w", encoding="utf-8") as f:
            f.write(ENTETE.format(w=LARGEUR, h=HAUTEUR, police=CH.FONT_FAMILY, corps=corps))
            f.write(f"Dialogue: 0,0:00:00.00,0:00:01.00,V,,0,0,0,,"
                    f"{{\\q2\\an7\\pos(20,300)\\fs{corps}}}Adl\n")
        r = subprocess.run(
            ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
             "-f", "lavfi", "-i", f"color=c=black:s={LARGEUR}x{HAUTEUR}:d=1",
             "-vf", f"ass={ass}", "-frames:v", "1", png],
            capture_output=True)
        if r.returncode != 0:
            print("ECHEC ffmpeg :", (r.stdout + r.stderr).decode(errors="replace")[:300])
            return 1
        hauteur = _mesurer(png)
        mesures.append(hauteur / float(corps))
        print(f"  \\fs{corps:<4} -> ascendante rendue {hauteur:>3} px  "
              f"(coefficient {hauteur / float(corps):.4f})")

    mesure = sum(mesures) / len(mesures)
    attendu = CH.COEF_ASCENDANTE_LIBASS
    ecart = abs(mesure - attendu) / attendu

    print("")
    print(f"coefficient mesuré : {mesure:.4f}")
    print(f"coefficient codé   : {attendu:.4f}   (caption_highlight.COEF_ASCENDANTE_LIBASS)")
    print(f"écart              : {ecart * 100:.1f} %")

    if ecart > TOLERANCE:
        taille = CH.px(LARGEUR, HAUTEUR)
        print("")
        print("ECART TROP GRAND — le texte ne sortira pas à la taille voulue.")
        print(f"  corriger COEF_ASCENDANTE_LIBASS = {mesure:.4f}")
        print(f"  (le corps passerait de {taille['font_px']} à "
              f"{round(CH.ASCENDER_H * HAUTEUR / mesure)} px en {LARGEUR}x{HAUTEUR})")
        return 1

    print("OK — les tailles du style highlight sont valables sur cet environnement.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
