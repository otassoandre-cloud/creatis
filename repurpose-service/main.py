"""
Créatis — Service de transcription vidéo
Déployé sur Google Cloud Run

Stack : FastAPI + yt-dlp + faster-whisper + Cloudflare R2 (boto3)
POST /transcribe  { url: str }  →  { transcript, title, duration, r2_url }
"""

import os
import uuid
import json
import tempfile
import logging
from pathlib import Path
from datetime import datetime, timedelta

import boto3
from botocore.config import Config
from fastapi import FastAPI, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import yt_dlp
from faster_whisper import WhisperModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("repurpose")

# ── Config ────────────────────────────────────────────────────────────────────
SERVICE_SECRET = os.environ.get("REPURPOSE_SERVICE_SECRET", "")
R2_ACCOUNT_ID  = os.environ.get("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY  = os.environ.get("R2_ACCESS_KEY", "")
R2_SECRET_KEY  = os.environ.get("R2_SECRET_KEY", "")
R2_BUCKET      = os.environ.get("R2_BUCKET", "creatis-repurpose")
WHISPER_MODEL  = os.environ.get("WHISPER_MODEL", "base")  # base/small/medium/large-v3

# ── FastAPI ───────────────────────────────────────────────────────────────────
app = FastAPI(title="Créatis Repurpose Service", version="1.0.0")
security = HTTPBearer()

def verify_secret(credentials: HTTPAuthorizationCredentials = Security(security)):
    if SERVICE_SECRET and credentials.credentials != SERVICE_SECRET:
        raise HTTPException(status_code=401, detail="Secret invalide")
    return credentials.credentials

# ── Cloudflare R2 ─────────────────────────────────────────────────────────────
def get_r2_client():
    if not R2_ACCOUNT_ID:
        return None
    return boto3.client(
        "s3",
        endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto"
    )

def upload_to_r2(content: str, key: str) -> str | None:
    """Upload texte → R2. Retourne URL publique ou None."""
    client = get_r2_client()
    if not client:
        return None
    try:
        client.put_object(
            Bucket=R2_BUCKET,
            Key=key,
            Body=content.encode("utf-8"),
            ContentType="text/plain; charset=utf-8",
            # Les objets expirent après 24h via lifecycle rule à configurer dans R2
            Metadata={"expires": (datetime.utcnow() + timedelta(hours=24)).isoformat()}
        )
        return f"https://{R2_BUCKET}.{R2_ACCOUNT_ID}.r2.cloudflarestorage.com/{key}"
    except Exception as e:
        logger.warning(f"R2 upload failed: {e}")
        return None

# ── Transcription ─────────────────────────────────────────────────────────────
_whisper_model = None

def get_whisper():
    global _whisper_model
    if _whisper_model is None:
        logger.info(f"Chargement modèle Whisper '{WHISPER_MODEL}'…")
        _whisper_model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    return _whisper_model

def download_audio(url: str, output_dir: str) -> tuple[str, str, str]:
    """Télécharge l'audio. Retourne (audio_path, titre, durée)."""
    ydl_opts = {
        "format": "bestaudio[filesize<100M]/bestaudio/best",
        "outtmpl": f"{output_dir}/audio.%(ext)s",
        "noplaylist": True,
        "max_filesize": 100 * 1024 * 1024,  # 100 MB max
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "64",
        }],
        "quiet": True,
        "no_warnings": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        title = info.get("title", "Vidéo YouTube")
        duration_s = info.get("duration", 0)
        mins, secs = divmod(int(duration_s), 60)
        duration = f"{mins}:{secs:02d}"

    audio_path = f"{output_dir}/audio.mp3"
    if not Path(audio_path).exists():
        # Cherche tout fichier audio créé
        for f in Path(output_dir).iterdir():
            if f.suffix in (".mp3", ".m4a", ".webm", ".opus"):
                audio_path = str(f)
                break
    return audio_path, title, duration

def transcribe_audio(audio_path: str) -> str:
    """Transcrit l'audio avec faster-whisper. Retourne le texte complet."""
    model = get_whisper()
    segments, info = model.transcribe(
        audio_path,
        language="fr",
        beam_size=5,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 500}
    )
    logger.info(f"Langue détectée : {info.language} ({info.language_probability:.0%})")
    transcript = " ".join(seg.text.strip() for seg in segments)
    return transcript.strip()

# ── API ───────────────────────────────────────────────────────────────────────
class TranscribeRequest(BaseModel):
    url: str

@app.get("/health")
def health():
    return {"status": "ok", "model": WHISPER_MODEL}

@app.post("/transcribe")
async def transcribe(req: TranscribeRequest, _: str = Depends(verify_secret)):
    url = req.url.strip()
    if not ("youtube.com" in url or "youtu.be" in url):
        raise HTTPException(status_code=400, detail="URL YouTube invalide")

    logger.info(f"Transcription : {url}")

    with tempfile.TemporaryDirectory() as tmp:
        try:
            audio_path, title, duration = download_audio(url, tmp)
        except yt_dlp.utils.DownloadError as e:
            raise HTTPException(status_code=422, detail=f"Impossible de télécharger la vidéo : {e}")

        try:
            transcript = transcribe_audio(audio_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erreur transcription : {e}")

    if not transcript:
        raise HTTPException(status_code=422, detail="Transcription vide — la vidéo n'a peut-être pas de paroles en français")

    # Upload transcript vers R2 (expiration 24h)
    r2_key = f"transcripts/{uuid.uuid4()}.txt"
    r2_url = upload_to_r2(f"TITRE: {title}\nDURÉE: {duration}\n\n{transcript}", r2_key)

    logger.info(f"Transcription OK — {len(transcript)} caractères — R2: {r2_url or 'non configuré'}")

    return {
        "ok": True,
        "title": title,
        "duration": duration,
        "transcript": transcript,
        "r2_url": r2_url
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
