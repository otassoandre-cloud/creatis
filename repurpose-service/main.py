"""
Créatis — Service clips viraux
Railway deployment (FastAPI + yt-dlp + faster-whisper + FFmpeg)

POST /clips    { url, n_clips=5 }  →  { clips: [{url, hook, score, start, end}] }
POST /transcribe { url }           →  { transcript, title, duration }
GET  /download/{session}/{file}    →  FileResponse (clip mp4)
GET  /health                       →  { status }
"""

import os, uuid, json, tempfile, logging, asyncio, shutil, re
from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Security, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import yt_dlp
from faster_whisper import WhisperModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("creatis-clips")

SERVICE_SECRET = os.environ.get("REPURPOSE_SERVICE_SECRET", "")
GROQ_API_KEY   = os.environ.get("GROQ_API_KEY", "")
WHISPER_MODEL  = os.environ.get("WHISPER_MODEL", "base")

SESSIONS_DIR = Path(tempfile.gettempdir()) / "creatis_clips"
SESSIONS_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Créatis Clips Service", version="2.0.0")
security = HTTPBearer(auto_error=False)

def verify_secret(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)):
    if SERVICE_SECRET and (not credentials or credentials.credentials != SERVICE_SECRET):
        raise HTTPException(status_code=401, detail="Secret invalide")

# ── Whisper model (lazy load) ─────────────────────────────────────────────────
_whisper = None
def get_whisper():
    global _whisper
    if _whisper is None:
        logger.info(f"Chargement Whisper '{WHISPER_MODEL}'…")
        _whisper = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    return _whisper

# ── yt-dlp helpers ────────────────────────────────────────────────────────────
def get_video_info(url: str) -> dict:
    with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True}) as ydl:
        return ydl.extract_info(url, download=False)

def download_audio(url: str, out_dir: str) -> tuple[str, str, int]:
    opts = {
        "format": "bestaudio/best",
        "outtmpl": f"{out_dir}/audio.%(ext)s",
        "noplaylist": True,
        "max_filesize": 200 * 1024 * 1024,
        "postprocessors": [{"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "64"}],
        "quiet": True, "no_warnings": True,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        title = info.get("title", "Vidéo")
        duration = int(info.get("duration", 0))
    audio = next((str(p) for p in Path(out_dir).iterdir() if p.suffix in (".mp3", ".m4a", ".webm", ".opus")), None)
    if not audio:
        raise RuntimeError("Audio non trouvé après téléchargement")
    return audio, title, duration

def download_video_segment(url: str, start: float, end: float, out_path: str):
    """Télécharge uniquement le segment [start, end] en 720p max."""
    opts = {
        "format": "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]/best",
        "outtmpl": out_path,
        "noplaylist": True,
        "download_ranges": yt_dlp.utils.download_range_func(None, [(start, end)]),
        "force_keyframes_at_cuts": True,
        "quiet": True, "no_warnings": True,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])

# ── Transcription avec timestamps ─────────────────────────────────────────────
def transcribe_with_timestamps(audio_path: str) -> list[dict]:
    """Retourne liste de segments {start, end, text}."""
    model = get_whisper()
    segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 500},
        word_timestamps=False,
    )
    logger.info(f"Langue détectée: {info.language} ({info.language_probability:.0%})")
    return [{"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()} for s in segments]

def segments_to_text(segments: list[dict]) -> str:
    return " ".join(s["text"] for s in segments if s["text"])

def segments_in_range(segments: list[dict], start: float, end: float) -> str:
    return " ".join(s["text"] for s in segments if s["start"] >= start and s["end"] <= end + 2)

# ── Groq : identifier les meilleurs moments ───────────────────────────────────
async def identify_best_moments(transcript_segments: list[dict], title: str, n: int = 5) -> list[dict]:
    if not GROQ_API_KEY:
        return _fallback_moments(transcript_segments, n)

    # Formater la transcription avec timestamps
    formatted = "\n".join(
        f"[{int(s['start']//60):02d}:{int(s['start']%60):02d}] {s['text']}"
        for s in transcript_segments[:300]  # Max 300 segments
    )

    prompt = f"""Tu analyses une vidéo YouTube intitulée "{title}".

TRANSCRIPTION (avec timestamps en mm:ss) :
{formatted}

MISSION : Identifie les {n} meilleurs moments pour créer des Shorts/Reels viraux (30-60 secondes chacun).
Critères de viralité : accroche forte, valeur/surprise/émotion, moment autonome (compréhensible sans contexte).

Réponds UNIQUEMENT avec un JSON valide, rien d'autre :
{{
  "clips": [
    {{
      "start": <secondes float>,
      "end": <secondes float>,
      "hook": "<phrase d'accroche courte (<10 mots) pour le clip>",
      "why": "<raison virale en 1 phrase>",
      "score": <score entier 1-100>
    }}
  ]
}}

Règles :
- Chaque clip = 30 à 65 secondes (end - start entre 30 et 65)
- Pas de chevauchement entre clips
- Commence toujours au début d'une phrase
- Score = estimation viralité TikTok/YouTube Shorts
- Trie par score décroissant"""

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 1000,
                }
            )
            r.raise_for_status()
            content = r.json()["choices"][0]["message"]["content"].strip()
            # Extraire le JSON (au cas où il y a du texte autour)
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                data = json.loads(json_match.group())
                clips = data.get("clips", [])
                # Valider et nettoyer
                valid = []
                for c in clips:
                    start = float(c.get("start", 0))
                    end = float(c.get("end", 0))
                    duration = end - start
                    if 20 <= duration <= 75:
                        valid.append({
                            "start": start,
                            "end": end,
                            "hook": str(c.get("hook", ""))[:80],
                            "why": str(c.get("why", ""))[:200],
                            "score": min(100, max(1, int(c.get("score", 80)))),
                        })
                if valid:
                    return sorted(valid, key=lambda x: x["score"], reverse=True)[:n]
    except Exception as e:
        logger.warning(f"Groq moment identification failed: {e}")

    return _fallback_moments(transcript_segments, n)

def _fallback_moments(segments: list[dict], n: int) -> list[dict]:
    """Fallback : découpe régulière si Groq échoue."""
    if not segments:
        return []
    total = segments[-1]["end"] if segments else 120
    clip_len = 45.0
    step = max(clip_len + 30, total / (n + 1))
    clips = []
    for i in range(n):
        start = min(30.0 + i * step, total - clip_len - 5)
        if start < 0: start = 0
        end = start + clip_len
        clips.append({"start": start, "end": end, "hook": f"Moment clé {i+1}", "why": "Sélection automatique", "score": 80 - i * 5})
    return clips

# ── FFmpeg : couper un clip ───────────────────────────────────────────────────
def cut_clip(input_path: str, start: float, end: float, output_path: str, add_subtitles_file: Optional[str] = None):
    import subprocess
    duration = end - start
    filters = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black"
    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start),
        "-i", input_path,
        "-t", str(duration),
        "-vf", filters,
        "-c:v", "libx264", "-preset", "fast", "-crf", "28",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        output_path
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=120)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg error: {result.stderr.decode()[-500:]}")

# ── Cleanup sessions expirées ─────────────────────────────────────────────────
def cleanup_old_sessions():
    import time
    now = time.time()
    for session_dir in SESSIONS_DIR.iterdir():
        if session_dir.is_dir():
            age = now - session_dir.stat().st_mtime
            if age > 3600:  # 1h
                shutil.rmtree(session_dir, ignore_errors=True)

# ── API ───────────────────────────────────────────────────────────────────────
class ClipsRequest(BaseModel):
    url: str
    n_clips: int = 5

class TranscribeRequest(BaseModel):
    url: str

@app.get("/health")
def health():
    return {"status": "ok", "model": WHISPER_MODEL}

@app.get("/download/{session_id}/{filename}")
def download_clip(session_id: str, filename: str):
    # Sécurité : pas de path traversal
    if ".." in session_id or ".." in filename or "/" in session_id or "/" in filename:
        raise HTTPException(status_code=400, detail="Chemin invalide")
    clip_path = SESSIONS_DIR / session_id / filename
    if not clip_path.exists():
        raise HTTPException(status_code=404, detail="Clip expiré ou introuvable")
    return FileResponse(str(clip_path), media_type="video/mp4", filename=filename)

@app.post("/clips")
async def create_clips(
    req: ClipsRequest,
    background_tasks: BackgroundTasks,
    _: None = Depends(verify_secret)
):
    url = req.url.strip()
    n = min(max(1, req.n_clips), 7)

    if not ("youtube.com" in url or "youtu.be" in url):
        raise HTTPException(status_code=400, detail="URL YouTube invalide")

    session_id = str(uuid.uuid4())
    session_dir = SESSIONS_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    background_tasks.add_task(cleanup_old_sessions)

    try:
        # 1. Téléchargement audio
        logger.info(f"[{session_id}] Téléchargement audio: {url}")
        with tempfile.TemporaryDirectory() as tmp:
            audio_path, title, video_duration = download_audio(url, tmp)
            logger.info(f"[{session_id}] Audio OK — titre: {title}, durée: {video_duration}s")

            # 2. Transcription avec timestamps
            logger.info(f"[{session_id}] Transcription Whisper…")
            segments = transcribe_with_timestamps(audio_path)
            logger.info(f"[{session_id}] {len(segments)} segments transcrits")

        if not segments:
            raise HTTPException(status_code=422, detail="Transcription vide — la vidéo n'a pas de paroles")

        # 3. Identifier les meilleurs moments
        logger.info(f"[{session_id}] Identification des moments viraux…")
        moments = await identify_best_moments(segments, title, n)
        logger.info(f"[{session_id}] {len(moments)} moments identifiés")

        # 4. Télécharger et couper chaque clip vidéo
        clips_result = []
        for i, moment in enumerate(moments):
            clip_filename = f"clip_{i+1:02d}.mp4"
            clip_path = str(session_dir / clip_filename)
            raw_path = str(session_dir / f"raw_{i+1:02d}.mp4")

            logger.info(f"[{session_id}] Clip {i+1}/{len(moments)}: {moment['start']:.0f}s → {moment['end']:.0f}s")

            try:
                # Télécharger le segment vidéo
                download_video_segment(url, moment["start"] - 1, moment["end"] + 1, raw_path)

                # Recadrer en format vertical (9:16)
                cut_clip(raw_path, 1.0, moment["end"] - moment["start"] + 1, clip_path)

                # Supprimer le fichier brut
                Path(raw_path).unlink(missing_ok=True)

                # Sous-titres du segment
                subtitle_text = segments_in_range(segments, moment["start"], moment["end"])

                clips_result.append({
                    "clip_id": clip_filename,
                    "download_url": f"/download/{session_id}/{clip_filename}",
                    "hook": moment["hook"],
                    "why": moment["why"],
                    "score": moment["score"],
                    "start": moment["start"],
                    "end": moment["end"],
                    "duration": round(moment["end"] - moment["start"], 1),
                    "transcript": subtitle_text[:300],
                })
                logger.info(f"[{session_id}] Clip {i+1} OK: {clip_path}")
            except Exception as e:
                logger.error(f"[{session_id}] Clip {i+1} FAILED: {e}")
                # On continue avec les autres clips

        if not clips_result:
            raise HTTPException(status_code=500, detail="Aucun clip n'a pu être généré. Vérifie que la vidéo est accessible.")

        return {
            "ok": True,
            "title": title,
            "duration": video_duration,
            "session_id": session_id,
            "clips": clips_result,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[{session_id}] Erreur: {e}")
        shutil.rmtree(session_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/transcribe")
async def transcribe(req: TranscribeRequest, _: None = Depends(verify_secret)):
    """Compatibilité avec l'ancienne API repurpose texte."""
    url = req.url.strip()
    if not ("youtube.com" in url or "youtu.be" in url):
        raise HTTPException(status_code=400, detail="URL YouTube invalide")

    with tempfile.TemporaryDirectory() as tmp:
        try:
            audio_path, title, duration_s = download_audio(url, tmp)
        except yt_dlp.utils.DownloadError as e:
            raise HTTPException(status_code=422, detail=f"Impossible de télécharger: {e}")
        segments = transcribe_with_timestamps(audio_path)

    transcript = segments_to_text(segments)
    if not transcript:
        raise HTTPException(status_code=422, detail="Transcription vide")

    mins, secs = divmod(duration_s, 60)
    return {"ok": True, "title": title, "duration": f"{mins}:{secs:02d}", "transcript": transcript, "r2_url": None}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), workers=1)
