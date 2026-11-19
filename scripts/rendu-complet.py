# -*- coding: utf-8 -*-
"""Chaine COMPLETE sur un clip reel : audio -> Groq Whisper (timings mot par mot)
-> ASS style Submagic -> rendu ffmpeg.

C'est la demonstration de bout en bout de ce que donnerait la production une fois
corrigee. Difference essentielle avec l'existant : on CONSERVE les timings mot par
mot renvoyes par Groq au lieu de les jeter en regroupant par 4. C'est ce qui permet
a la bascule ligne 1 -> ligne 2 de tomber sur la voix reelle.

Usage : python scripts/rendu-complet.py <video.mp4> [sortie.mp4]
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


def ffmpeg_bin():
    r = subprocess.run(["node", "-e", "process.stdout.write(require('ffmpeg-static'))"],
                       capture_output=True, text=True)
    return r.stdout.strip()


def cle_groq():
    chemin = os.path.join(RACINE, ".env")
    with open(chemin, encoding="utf-8", errors="ignore") as f:
        for ligne in f:
            if ligne.startswith("GROQ_API_KEY="):
                return ligne.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("GROQ_API_KEY introuvable dans .env")


def transcrire(video, ff):
    """Renvoie la liste des mots avec leurs vrais timings."""
    audio = os.path.join(TMP, "audio.mp3")
    subprocess.run([ff, "-y", "-loglevel", "error", "-i", video,
                    "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", audio],
                   check=True, capture_output=True)
    taille = os.path.getsize(audio) / 1_048_576
    print("audio extrait : %.1f Mo" % taille)
    if taille > 24:
        raise RuntimeError("audio trop volumineux pour Groq (%.1f Mo)" % taille)

    import urllib.request
    frontiere = "----creatis"
    corps = []

    def champ(nom, valeur):
        corps.append(("--%s\r\nContent-Disposition: form-data; name=\"%s\"\r\n\r\n%s\r\n"
                      % (frontiere, nom, valeur)).encode())

    champ("model", "whisper-large-v3-turbo")
    champ("response_format", "verbose_json")
    champ("timestamp_granularities[]", "word")
    champ("language", "fr")
    with open(audio, "rb") as f:
        donnees = f.read()
    corps.append(("--%s\r\nContent-Disposition: form-data; name=\"file\"; "
                  "filename=\"audio.mp3\"\r\nContent-Type: audio/mpeg\r\n\r\n"
                  % frontiere).encode())
    corps.append(donnees)
    corps.append(("\r\n--%s--\r\n" % frontiere).encode())
    charge = b"".join(corps)

    req = urllib.request.Request(
        "https://api.groq.com/openai/v1/audio/transcriptions", data=charge,
        headers={"Authorization": "Bearer " + cle_groq(),
                 "Content-Type": "multipart/form-data; boundary=" + frontiere})
    with urllib.request.urlopen(req, timeout=300) as r:
        data = json.loads(r.read().decode("utf-8"))

    mots = data.get("words") or []
    print("Groq : %d mots, duree %.1fs" % (len(mots), float(data.get("duration", 0))))
    return [{"word": m.get("word", ""), "start": float(m.get("start", 0)),
             "end": float(m.get("end", 0))} for m in mots if m.get("word", "").strip()]


def main():
    src = sys.argv[1]
    sortie = sys.argv[2] if len(sys.argv) > 2 else os.path.join(TMP, "clip-complet.mp4")
    ff = ffmpeg_bin()
    os.makedirs(TMP, exist_ok=True)

    mots = transcrire(src, ff)
    if not mots:
        raise RuntimeError("aucun mot renvoye par Groq")

    # Sous-titres au milieu : les clips fournis ont deja des sous-titres incrustes en bas.
    S.LINE1_CAPTOP_PCT = 0.42
    S.CAP_HEIGHT_PCT = 0.0350        # taille retenue sur la comparaison visuelle

    ass = S.build_ass(S.cues_from_words(mots), 1080, 1920,
                      font_name=FONT, font_path=FONT_PATH)
    chemin_ass = os.path.join(TMP, "complet.ass")
    with open(chemin_ass, "w", encoding="utf-8") as f:
        f.write(ass)
    print("ASS : %d evenements" % ass.count("Dialogue:"))

    rel = os.path.relpath(chemin_ass, RACINE).replace("\\", "/")
    subprocess.run([ff, "-y", "-loglevel", "error", "-i", src,
                    "-vf", "scale=1080:1920:flags=lanczos,ass='%s'" % rel,
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", sortie],
                   check=True, cwd=RACINE)
    print("rendu :", sortie)


if __name__ == "__main__":
    main()
