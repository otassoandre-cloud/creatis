FROM python:3.11-slim

# FFmpeg requis par yt-dlp pour l'extraction audio
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pré-télécharger le modèle Whisper au build (évite le cold start)
ARG WHISPER_MODEL=base
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('${WHISPER_MODEL}', device='cpu', compute_type='int8')"

COPY main.py .

ENV PORT=8080
EXPOSE 8080

CMD ["python", "main.py"]
