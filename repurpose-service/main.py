"""
Créatis — Service Clips Viraux
Railway deployment

Stack (100% gratuit) :
- yt-dlp : téléchargement vidéo YouTube
- faster-whisper : transcription avec timestamps
- Gemini Flash API : détection moments viraux (1500 req/jour gratuit)
- MediaPipe + OpenCV : face tracking pour recadrage 9:16
- FFmpeg : découpe + captions burnées

POST /clips    { url, n_clips=5 }  →  { clips: [{download_url, hook, score, ...}] }
POST /transcribe { url }           →  { transcript, title, duration }
GET  /download/{session}/{file}    →  FileResponse mp4
GET  /health                       →  { status }
"""

import os, uuid, json, tempfile, logging, asyncio, shutil, re, subprocess
from pathlib import Path
from typing import Optional

import httpx
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, Security, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import yt_dlp
from faster_whisper import WhisperModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("creatis-clips")

SERVICE_SECRET  = os.environ.get("REPURPOSE_SERVICE_SECRET", "")
GEMINI_API_KEY  = os.environ.get("GEMINI_API_KEY", "")
WHISPER_MODEL   = os.environ.get("WHISPER_MODEL", "base")

SESSIONS_DIR = Path(tempfile.gettempdir()) / "creatis_clips"
SESSIONS_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Créatis Clips Service", version="3.0.0")
security = HTTPBearer(auto_error=False)

def verify_secret(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)):
    if SERVICE_SECRET and (not credentials or credentials.credentials != SERVICE_SECRET):
        raise HTTPException(status_code=401, detail="Secret invalide")

# ── Whisper (lazy) ────────────────────────────────────────────────────────────
_whisper = None
def get_whisper():
    global _whisper
    if _whisper is None:
        logger.info(f"Chargement Whisper '{WHISPER_MODEL}'…")
        _whisper = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    return _whisper

# ── yt-dlp ────────────────────────────────────────────────────────────────────
def download_video(url: str, out_dir: str, quality: str = "480") -> tuple[str, str, int]:
    """Télécharge la vidéo en qualité réduite. Retourne (path, titre, durée_s)."""
    opts = {
        "format": f"bestvideo[height<={quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<={quality}][ext=mp4]/best[height<={quality}]/best",
        "outtmpl": f"{out_dir}/video.%(ext)s",
        "noplaylist": True,
        "max_filesize": 500 * 1024 * 1024,
        "quiet": True, "no_warnings": True,
        "merge_output_format": "mp4",
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        title = info.get("title", "Vidéo YouTube")
        duration = int(info.get("duration", 0))

    video = next((str(p) for p in Path(out_dir).iterdir() if p.suffix == ".mp4"), None)
    if not video:
        raise RuntimeError("Vidéo non trouvée après téléchargement")
    return video, title, duration

def download_audio_only(url: str, out_dir: str) -> tuple[str, str, int]:
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
        title = info.get("title", "Vidéo YouTube")
        duration = int(info.get("duration", 0))
    audio = next((str(p) for p in Path(out_dir).iterdir() if p.suffix in (".mp3", ".m4a", ".webm", ".opus")), None)
    if not audio:
        raise RuntimeError("Audio non trouvé")
    return audio, title, duration

# ── Transcription avec timestamps ─────────────────────────────────────────────
def transcribe_with_timestamps(audio_path: str) -> list[dict]:
    model = get_whisper()
    segments, info = model.transcribe(
        audio_path, beam_size=5, vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 500},
        word_timestamps=True,
    )
    logger.info(f"Langue: {info.language} ({info.language_probability:.0%})")
    result = []
    for s in segments:
        result.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()})
    return result

def segments_to_text(segs: list[dict]) -> str:
    return " ".join(s["text"] for s in segs if s["text"])

# ── Gemini Flash : identifier moments viraux ──────────────────────────────────
async def identify_moments_gemini(segments: list[dict], title: str, n: int, video_duration: int) -> list[dict]:
    if not GEMINI_API_KEY:
        return _fallback_moments(segments, n, video_duration)

    formatted = "\n".join(
        f"[{int(s['start']//60):02d}:{int(s['start']%60):02d}] {s['text']}"
        for s in segments[:400]
    )

    prompt = f"""Tu es expert en viralité TikTok/YouTube Shorts.

Vidéo : "{title}" (durée: {video_duration}s)

Transcription (timestamps mm:ss) :
{formatted}

Identifie exactement {n} moments pour créer des Shorts viraux de 30-60 secondes.
Critères : accroche forte, valeur/surprise/émotion, compréhensible sans contexte.

Réponds UNIQUEMENT en JSON valide :
{{
  "clips": [
    {{
      "start": <float secondes>,
      "end": <float secondes>,
      "hook": "<accroche <10 mots>",
      "why": "<raison viralité 1 phrase>",
      "score": <1-100>
    }}
  ]
}}

Contraintes :
- Durée clip : 30-60s (end-start entre 30 et 60)
- Pas de chevauchement
- Commence au début d'une phrase
- Trié par score décroissant"""

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}",
                json={"contents": [{"parts": [{"text": prompt}]}],
                      "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1024}}
            )
            r.raise_for_status()
            text = r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            m = re.search(r'\{[\s\S]*\}', text)
            if m:
                data = json.loads(m.group())
                clips = [c for c in data.get("clips", [])
                         if 25 <= float(c.get("end",0)) - float(c.get("start",0)) <= 70]
                if clips:
                    return sorted(clips, key=lambda x: x.get("score", 0), reverse=True)[:n]
    except Exception as e:
        logger.warning(f"Gemini failed: {e}")

    return _fallback_moments(segments, n, video_duration)

def _fallback_moments(segments: list[dict], n: int, total: int) -> list[dict]:
    if not segments: return []
    clip_len = 45.0
    step = max(clip_len + 30, total / (n + 1))
    clips = []
    for i in range(n):
        start = min(30.0 + i * step, total - clip_len - 5)
        if start < 0: start = 0
        clips.append({"start": start, "end": start + clip_len,
                       "hook": f"Moment clé {i+1}", "why": "Sélection auto", "score": 80 - i*5})
    return clips

# ── Face tracking (MediaPipe → OpenCV Haar fallback) ─────────────────────────
def get_face_crop_center(frame: np.ndarray) -> Optional[tuple[int,int]]:
    """Retourne (cx, cy) du visage principal, ou None si absent."""
    try:
        import mediapipe as mp
        mp_face = mp.solutions.face_detection
        with mp_face.FaceDetection(model_selection=0, min_detection_confidence=0.5) as det:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            res = det.process(rgb)
            if res.detections:
                d = res.detections[0].location_data.relative_bounding_box
                h, w = frame.shape[:2]
                cx = int((d.xmin + d.width / 2) * w)
                cy = int((d.ymin + d.height / 2) * h)
                return cx, cy
    except Exception:
        pass

    # Fallback Haar
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = cascade.detectMultiScale(gray, 1.1, 5, minSize=(30,30))
    if len(faces):
        x, y, w, h = max(faces, key=lambda f: f[2]*f[3])
        return x + w//2, y + h//2
    return None

def compute_face_track(video_path: str, start: float, end: float, sample_fps: float = 2.0) -> list[Optional[tuple]]:
    """Échantillonne les positions de visage pour le tracking."""
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    positions = []
    t = start
    while t <= end:
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ret, frame = cap.read()
        if not ret: break
        positions.append((t, get_face_crop_center(frame)))
        t += 1.0 / sample_fps
    cap.release()
    return positions

def smooth_positions(positions: list) -> list:
    """Lissage des positions pour éviter le sautillement."""
    pts = [(t, p) for t, p in positions if p is not None]
    if not pts: return positions
    xs = [p[0] for _, p in pts]
    ys = [p[1] for _, p in pts]
    # Moyenne mobile
    win = max(3, len(xs) // 5)
    def smooth(arr):
        result = []
        for i in range(len(arr)):
            lo, hi = max(0, i-win//2), min(len(arr), i+win//2+1)
            result.append(int(sum(arr[lo:hi]) / (hi-lo)))
        return result
    sx, sy = smooth(xs), smooth(ys)
    smoothed = dict(zip([t for t,_ in pts], zip(sx, sy)))
    return [(t, smoothed.get(t, p)) for t, p in positions]

def cut_clip_9_16(video_path: str, start: float, end: float, out_path: str,
                  face_positions: list = None, srt_path: str = None):
    """Coupe un clip, recadre en 9:16 avec face tracking, brûle les captions."""
    # Dimensions cibles
    OUT_W, OUT_H = 1080, 1920

    cap = cv2.VideoCapture(video_path)
    src_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    src_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps_src = cap.get(cv2.CAP_PROP_FPS) or 25.0
    cap.release()

    # Calcul crop 9:16 depuis les dimensions source
    crop_h = src_h
    crop_w = int(crop_h * OUT_W / OUT_H)
    if crop_w > src_w:
        crop_w = src_w
        crop_h = int(crop_w * OUT_H / OUT_W)

    # Construire le filtre de crop animé (face tracking via expressions ffmpeg)
    # Par défaut : centré horizontalement
    default_cx = src_w // 2

    # Si face_positions, construire une expression de positionnement
    # Simplification : on prend la position médiane pour ce clip
    if face_positions:
        valid_x = [p[0] for _, p in face_positions if p is not None]
        if valid_x:
            median_cx = int(sorted(valid_x)[len(valid_x)//2])
            # Clamper pour que le crop reste dans l'image
            median_cx = max(crop_w//2, min(src_w - crop_w//2, median_cx))
            default_cx = median_cx

    crop_x = max(0, default_cx - crop_w // 2)
    crop_y = max(0, (src_h - crop_h) // 2)

    duration = end - start

    # Construire la commande FFmpeg
    vf_parts = [
        f"crop={crop_w}:{crop_h}:{crop_x}:{crop_y}",
        f"scale={OUT_W}:{OUT_H}:flags=lanczos"
    ]

    # Ajouter les captions si dispo
    if srt_path and Path(srt_path).exists():
        # Captions style OpusClip : texte centré, gros, blanc avec ombre
        srt_escaped = srt_path.replace("\\", "/").replace(":", "\\:")
        vf_parts.append(
            f"subtitles='{srt_escaped}':force_style='FontName=Arial,FontSize=18,Bold=1,"
            f"PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H80000000,"
            f"Outline=2,Shadow=1,Alignment=2,MarginV=60'"
        )

    vf = ",".join(vf_parts)

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start),
        "-i", video_path,
        "-t", str(duration),
        "-vf", vf,
        "-c:v", "libx264", "-preset", "fast", "-crf", "26",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        out_path
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=180)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg: {result.stderr.decode()[-400:]}")

# ── Génération SRT pour un segment ───────────────────────────────────────────
def generate_srt(segments: list[dict], clip_start: float, clip_end: float) -> str:
    """Génère le contenu SRT pour les segments dans [clip_start, clip_end]."""
    lines = []
    idx = 1
    for seg in segments:
        if seg["end"] < clip_start or seg["start"] > clip_end: continue
        # Recaler les timestamps par rapport au début du clip
        s = max(0, seg["start"] - clip_start)
        e = min(clip_end - clip_start, seg["end"] - clip_start)
        if e <= s: continue

        def to_srt_time(t):
            h = int(t // 3600)
            m = int((t % 3600) // 60)
            s = int(t % 60)
            ms = int((t % 1) * 1000)
            return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

        lines.append(f"{idx}")
        lines.append(f"{to_srt_time(s)} --> {to_srt_time(e)}")
        # Limiter à 7 mots par ligne pour lisibilité
        words = seg["text"].split()
        chunks = [" ".join(words[i:i+7]) for i in range(0, len(words), 7)]
        lines.append("\n".join(chunks))
        lines.append("")
        idx += 1

    return "\n".join(lines)

# ── Cleanup sessions ──────────────────────────────────────────────────────────
def cleanup_old_sessions():
    import time
    now = time.time()
    for d in SESSIONS_DIR.iterdir():
        if d.is_dir() and now - d.stat().st_mtime > 3600:
            shutil.rmtree(d, ignore_errors=True)

# ── API ───────────────────────────────────────────────────────────────────────
class ClipsRequest(BaseModel):
    url: str
    n_clips: int = 5

class TranscribeRequest(BaseModel):
    url: str

@app.get("/health")
def health():
    return {"status": "ok", "model": WHISPER_MODEL, "gemini": bool(GEMINI_API_KEY)}

@app.get("/download/{session_id}/{filename}")
def download_clip(session_id: str, filename: str):
    if ".." in session_id or ".." in filename or "/" in session_id or "/" in filename:
        raise HTTPException(400, "Chemin invalide")
    clip_path = SESSIONS_DIR / session_id / filename
    if not clip_path.exists():
        raise HTTPException(404, "Clip expiré ou introuvable")
    return FileResponse(str(clip_path), media_type="video/mp4", filename=filename)

@app.post("/clips")
async def create_clips(req: ClipsRequest, background_tasks: BackgroundTasks, _: None = Depends(verify_secret)):
    url = req.url.strip()
    n = min(max(1, req.n_clips), 7)

    if "youtube.com" not in url and "youtu.be" not in url:
        raise HTTPException(400, "URL YouTube invalide")

    session_id = str(uuid.uuid4())
    session_dir = SESSIONS_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    background_tasks.add_task(cleanup_old_sessions)

    try:
        with tempfile.TemporaryDirectory() as tmp:
            # 1. Télécharger la vidéo complète (480p pour économiser espace)
            logger.info(f"[{session_id[:8]}] Téléchargement vidéo…")
            video_path, title, video_duration = download_video(url, tmp, quality="480")
            logger.info(f"[{session_id[:8]}] Vidéo OK — {video_duration}s — {Path(video_path).stat().st_size // 1024 // 1024}MB")

            # 2. Extraire audio + transcrire
            logger.info(f"[{session_id[:8]}] Transcription…")
            audio_path = str(Path(tmp) / "audio.mp3")
            subprocess.run(["ffmpeg", "-y", "-i", video_path, "-vn", "-ar", "16000",
                            "-ac", "1", "-b:a", "32k", audio_path],
                           capture_output=True, check=True)
            segments = transcribe_with_timestamps(audio_path)
            logger.info(f"[{session_id[:8]}] {len(segments)} segments")

            if not segments:
                raise HTTPException(422, "Transcription vide")

            # 3. Identifier moments viraux avec Gemini Flash
            logger.info(f"[{session_id[:8]}] Analyse Gemini…")
            moments = await identify_moments_gemini(segments, title, n, video_duration)
            logger.info(f"[{session_id[:8]}] {len(moments)} moments identifiés")

            # 4. Couper chaque clip
            clips_result = []
            for i, moment in enumerate(moments):
                start, end = float(moment["start"]), float(moment["end"])
                clip_filename = f"clip_{i+1:02d}.mp4"
                clip_path = str(session_dir / clip_filename)

                logger.info(f"[{session_id[:8]}] Clip {i+1}: {start:.0f}s→{end:.0f}s ({end-start:.0f}s)")

                try:
                    # Générer SRT pour ce clip
                    srt_content = generate_srt(segments, start, end)
                    srt_path = str(Path(tmp) / f"clip_{i+1}.srt")
                    with open(srt_path, "w", encoding="utf-8") as f:
                        f.write(srt_content)

                    # Face tracking (échantillonné, léger)
                    face_pos = compute_face_track(video_path, start, end, sample_fps=1.0)
                    face_pos = smooth_positions(face_pos)

                    # Couper + recadrer 9:16 + captions
                    cut_clip_9_16(video_path, start, end, clip_path, face_pos, srt_path)

                    clips_result.append({
                        "clip_id": clip_filename,
                        "download_url": f"/download/{session_id}/{clip_filename}",
                        "hook": str(moment.get("hook", ""))[:80],
                        "why": str(moment.get("why", ""))[:200],
                        "score": int(moment.get("score", 80)),
                        "start": start,
                        "end": end,
                        "duration": round(end - start, 1),
                        "transcript": " ".join(
                            s["text"] for s in segments if s["start"] >= start and s["end"] <= end
                        )[:300],
                    })
                    logger.info(f"[{session_id[:8]}] Clip {i+1} OK")

                except Exception as e:
                    logger.error(f"[{session_id[:8]}] Clip {i+1} FAILED: {e}")

            if not clips_result:
                raise HTTPException(500, "Aucun clip généré")

            return {
                "ok": True,
                "title": title,
                "duration": video_duration,
                "session_id": session_id,
                "clips": clips_result,
            }

    except HTTPException:
        shutil.rmtree(session_dir, ignore_errors=True)
        raise
    except Exception as e:
        shutil.rmtree(session_dir, ignore_errors=True)
        logger.error(f"[{session_id[:8]}] Erreur: {e}")
        raise HTTPException(500, str(e))


@app.post("/transcribe")
async def transcribe(req: TranscribeRequest, _: None = Depends(verify_secret)):
    url = req.url.strip()
    if "youtube.com" not in url and "youtu.be" not in url:
        raise HTTPException(400, "URL YouTube invalide")
    # Vérifier la durée avant de télécharger
    with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True}) as ydl:
        meta = ydl.extract_info(url, download=False)
        dur = int(meta.get("duration", 0))
        if dur > 900:
            raise HTTPException(400, f"Vidéo trop longue ({dur//60} min). Maximum 15 minutes.")
    with tempfile.TemporaryDirectory() as tmp:
        audio_path, title, duration_s = download_audio_only(url, tmp)
        segs = transcribe_with_timestamps(audio_path)
    transcript = segments_to_text(segs)
    if not transcript:
        raise HTTPException(422, "Transcription vide")
    m, s = divmod(duration_s, 60)
    return {"ok": True, "title": title, "duration": f"{m}:{s:02d}", "transcript": transcript, "r2_url": None}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), workers=1)
