FROM python:3.11-slim

# Deps système : ffmpeg + dépendances Chromium pour Playwright + libs requises par opencv-python-headless
# (libgl1/libglib2.0-0 : sans elles, cv2 s'importe mais son module objdetect ne charge pas
# correctement — cv2.CascadeClassifier absent, le face tracking retombe silencieusement en crop centré)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-dejavu-core \
    fontconfig \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libdbus-1-3 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    libatspi2.0-0 libwayland-client0 libx11-6 libx11-xcb1 libxcb1 \
    libxext6 libxshmfence1 libgl1 libglib2.0-0 ca-certificates wget unzip \
    && rm -rf /var/lib/apt/lists/*

# Runtime JavaScript (Deno) — INDISPENSABLE pour la vitesse de téléchargement YouTube.
# Sans lui, yt-dlp n'arrive pas à résoudre le "n challenge" de YouTube ("n challenge solving
# failed: Ensure you have a supported JavaScript runtime") et YouTube throttle volontairement le
# débit à ~280-350 Ko/s : un segment de 20 Mo mettait ~75 s à descendre. Avec le challenge résolu,
# YouTube sert à pleine vitesse. C'est LA cause de l'attente "Téléchargement du clip…".
#
# VERSION FIGÉE, À BUMPER À LA MAIN. L'URL était `releases/latest` : n'importe quel redéploiement,
# même sans rapport, pouvait changer de version de Deno et casser la résolution du "n challenge"
# sans un seul changement de code — panne invisible au diff et impossible à reproduire en local.
# Pour monter de version : changer ce numéro, redéployer, et vérifier dans le log de build que le
# `deno --version` ci-dessous affiche bien la nouvelle. Ne PAS repasser sur `latest`.
ARG DENO_VERSION=2.9.5
RUN wget -q https://github.com/denoland/deno/releases/download/v${DENO_VERSION}/deno-x86_64-unknown-linux-gnu.zip -O /tmp/deno.zip \
    && unzip -q /tmp/deno.zip -d /usr/local/bin \
    && chmod +x /usr/local/bin/deno \
    && rm /tmp/deno.zip \
    && deno --version

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Installer Chromium pour Playwright (après pip install playwright)
RUN playwright install chromium

# Polices des sous-titres. Licence SIL OFL, donc librement redistribuables. Installées AVANT
# les COPY pour rester en cache d'un déploiement à l'autre. Sans elles, libass retombe sur
# DejaVu Sans et le rendu n'a plus rien à voir avec l'aperçu.
# Poppins SemiBold est la police déclarée par caption_geometry.py (source de vérité).
# Montserrat est conservée : d'anciens exports y font encore référence.
#
# COMMITS FIGÉS, À BUMPER À LA MAIN. Les URL pointaient sur les branches `main` / `master` : le
# fichier de police pouvait donc changer entre deux builds. Ce n'est pas cosmétique — le placement
# des sous-titres est calculé à partir des métriques de la police (caption_geometry.py), donc un
# binaire différent décale le rendu et l'aperçu ne correspond plus à l'export.
# Les deux commits ci-dessous servent des fichiers identiques au bit près à ce que servaient
# `main` / `master` le 15/08/2026 (sha256 vérifiés) : aucun changement de rendu.
#   Poppins-SemiBold.ttf    sha256 d3bf1bda…0286  (157 312 o)
#   Montserrat-ExtraBold.ttf sha256 d3ac6a84…2c1b  (455 468 o)
# PIÈGE : le tag `v9.000` de JulietaUla/Montserrat sert un fichier DIFFÉRENT de `master` (même
# taille, hash différent). Ne pas « moderniser » vers ce tag en croyant que c'est équivalent.
# Pour bumper : remplacer le SHA, redéployer, et revalider un export sous-titré avant de garder.
RUN mkdir -p /usr/share/fonts/truetype/creatis \
    && wget -q -O /usr/share/fonts/truetype/creatis/Poppins-SemiBold.ttf \
       https://raw.githubusercontent.com/google/fonts/7dc16b7de42db624b902f2292b68ed9e489e5053/ofl/poppins/Poppins-SemiBold.ttf \
    && wget -q -O /usr/share/fonts/truetype/creatis/Montserrat-ExtraBold.ttf \
       https://raw.githubusercontent.com/JulietaUla/Montserrat/679ead9bcd0d6cef6d3712369dc49fe72e8bd8d7/fonts/ttf/Montserrat-ExtraBold.ttf \
    && fc-cache -f \
    && fc-list | grep -iE "poppins|montserrat"

COPY main.py .
# Sans cette ligne, `import caption_geometry` échoue au chargement et le conteneur ne
# démarre pas du tout. Le contexte de build est repurpose-service/, donc tout module
# importé par main.py doit y être copié explicitement.
COPY caption_geometry.py .
# Oubli constaté en production le 16/08/2026 : le style « Focus » était bien demandé par le
# client et bien reçu par le serveur — `[subs] style=highlight has_subs=True segs=62` — mais
# le module n'étant pas dans l'image, main.py partait dans son repli silencieux :
#   [subs] style 'highlight' indisponible — import impossible : No module named 'caption_highlight'
# L'export sortait donc avec l'ancien rendu, sans un mot d'erreur pour l'utilisateur. Mesuré sur
# le fichier livré : zéro pixel #10ACF9, alors que ce style colore le mot actif en bleu.
COPY caption_highlight.py .
# Sert à vérifier DANS le conteneur que le coefficient libass vaut encore celui codé en dur.
# Sans cette copie, le script n'est exécutable que sur un poste de développement — donc jamais
# là où le rendu se fait réellement, ce qui lui retire tout intérêt.
COPY verifier_geometrie.py .
COPY watermark_base.png .

# yt-dlp est le seul composant qui doit suivre YouTube au jour le jour. Placé APRÈS les COPY,
# donc reconstruit à chaque déploiement : on repart toujours sur la dernière version publiée.
# Sans ça la couche `pip install -r requirements.txt` reste en cache indéfiniment et la version
# se fige — constaté le 03/08/2026 : yt-dlp datait du 04/07 et le téléchargement gratuit était
# cassé depuis un changement YouTube du 02/08, ce qui faisait tout basculer sur le proxy payant.
# bgutil-ytdlp-pot-provider n'est volontairement PAS mis à jour ici : le plugin doit rester
# compatible avec le service bgutil déployé à côté, qui a son propre cycle de version.
RUN pip install --no-cache-dir --upgrade yt-dlp yt-dlp-ejs

ENV PORT=8080
EXPOSE 8080

CMD ["python", "main.py"]
