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
RUN wget -q https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip -O /tmp/deno.zip \
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
RUN mkdir -p /usr/share/fonts/truetype/creatis \
    && wget -q -O /usr/share/fonts/truetype/creatis/Poppins-SemiBold.ttf \
       https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-SemiBold.ttf \
    && wget -q -O /usr/share/fonts/truetype/creatis/Montserrat-ExtraBold.ttf \
       https://raw.githubusercontent.com/JulietaUla/Montserrat/master/fonts/ttf/Montserrat-ExtraBold.ttf \
    && fc-cache -f \
    && fc-list | grep -iE "poppins|montserrat"

COPY main.py .
# Sans cette ligne, `import caption_geometry` échoue au chargement et le conteneur ne
# démarre pas du tout. Le contexte de build est repurpose-service/, donc tout module
# importé par main.py doit y être copié explicitement.
COPY caption_geometry.py .
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
