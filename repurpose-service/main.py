"""
Créatis Shorts Generator
Basé sur github.com/SamurAIGPT/AI-Youtube-Shorts-Generator (local mode)

POST /generate-shorts  { youtube_url, num_clips=3 }  → { job_id }
GET  /shorts-status/{job_id}                          → { status, progress, clips? }
GET  /shorts-file/{job_id}/{filename}                 → MP4
GET  /health
"""
import os, uuid, json, re, asyncio, subprocess, tempfile, logging, base64
from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import yt_dlp

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("creatis")

# ── Config ─────────────────────────────────────────────────────────────────────
GEMINI_API_KEY      = os.environ.get("GEMINI_API_KEY", "")
GROQ_API_KEY        = os.environ.get("GROQ_API_KEY", "")
SERVICE_SECRET      = os.environ.get("REPURPOSE_SERVICE_SECRET", "")
WHISPER_MODEL       = os.environ.get("WHISPER_MODEL", "tiny")
YOUTUBE_COOKIES_B64 = os.environ.get("YOUTUBE_COOKIES_B64", "")

WORK_DIR = Path(tempfile.gettempdir()) / "creatis"
WORK_DIR.mkdir(exist_ok=True)

JOBS: dict = {}

# Cookies YouTube
_COOKIE_FILE: Optional[str] = None
if YOUTUBE_COOKIES_B64:
    try:
        p = str(WORK_DIR / "cookies.txt")
        with open(p, "w") as f:
            f.write(base64.b64decode(YOUTUBE_COOKIES_B64).decode())
        _COOKIE_FILE = p
        logger.info("Cookies YouTube chargés ✓")
    except Exception as e:
        logger.warning(f"Cookies: {e}")

# ── App ─────────────────────────────────────────────────────────────────────────
app = FastAPI(title="Créatis Shorts")
security = HTTPBearer(auto_error=False)

def auth(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if SERVICE_SECRET and (not creds or creds.credentials != SERVICE_SECRET):
        raise HTTPException(401, "Non autorisé")

class GenerateRequest(BaseModel):
    youtube_url: str
    num_clips: int = 3

# ── STEP 1 : Téléchargement yt-dlp ─────────────────────────────────────────────
def download_video(url: str, out_dir: Path) -> tuple[str, str, int]:
    ydl_opts = {
        "format": (
            "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]"
            "/best[height<=720][ext=mp4]/best[height<=720]/best"
        ),
        "outtmpl": str(out_dir / "source.%(ext)s"),
        "merge_output_format": "mp4",
        "quiet": True,
        "no_warnings": True,
    }
    if _COOKIE_FILE:
        ydl_opts["cookiefile"] = _COOKIE_FILE

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        title    = info.get("title", "Video")
        duration = int(info.get("duration", 0))

    for ext in ["mp4", "mkv", "webm"]:
        p = out_dir / f"source.{ext}"
        if p.exists() and p.stat().st_size > 10_000:
            logger.info(f"[yt-dlp] {p.name}  {p.stat().st_size // 1024} KB")
            return str(p), title, duration

    raise RuntimeError("yt-dlp: aucun fichier produit")

# ── STEP 2 : Transcription faster-whisper ──────────────────────────────────────
def transcribe(video_path: str) -> tuple[list, float]:
    from faster_whisper import WhisperModel
    model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    segs_iter, info = model.transcribe(video_path, beam_size=1)
    segments = [
        {"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()}
        for s in segs_iter
    ]
    duration = segments[-1]["end"] if segments else 0.0
    logger.info(f"[whisper] {len(segments)} segments  {duration:.0f}s  lang={info.language}")
    return segments, duration

# ── STEP 3 : Moments viraux — Gemini Flash ──────────────────────────────────────
async def find_moments(segments: list, duration: float, n: int) -> list:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY manquant")

    transcript = "\n".join(
        f"[{s['start']:.1f}s-{s['end']:.1f}s] {s['text']}" for s in segments
    )
    prompt = f"""You are a viral YouTube Shorts expert.
Analyze this transcript and find the {n} best moments for Shorts.

Rules:
- Each clip: 45-60 seconds
- Must start with a strong hook
- Self-contained, no prior context needed
- Score virality 0-100

Return ONLY valid JSON, no markdown:
{{"moments":[{{"start_time":12.5,"end_time":67.0,"title":"Short title","hook_sentence":"Opening hook","score":88}}]}}

Transcript (total: {duration:.0f}s):
{transcript[:8000]}"""

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={GEMINI_API_KEY}",
            json={"contents": [{"parts": [{"text": prompt}]}]},
        )
        r.raise_for_status()
        raw = r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()

    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
    data = json.loads(raw)

    result = []
    for m in data["moments"][:n]:
        s = max(0.0, float(m["start_time"]))
        e = float(m["end_time"])
        e = min(max(e, s + 20), s + 90, duration)
        result.append({
            "start_time":    s,
            "end_time":      e,
            "title":         str(m.get("title", f"Short {len(result)+1}")),
            "hook_sentence": str(m.get("hook_sentence", ""))[:120],
            "score":         int(m.get("score", 80)),
        })

    logger.info(f"[gemini] {len(result)} moments")
    return result

# ── STEP 4 : Cut + face-aware crop (SamurAI exact implementation) ───────────────

def _cut_subclip(source: str, start: float, end: float, out: str) -> None:
    """ffmpeg: extrait le segment, ré-encode H264/AAC."""
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", source,
        "-ss", f"{start:.3f}",
        "-to", f"{end:.3f}",
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        "-c:a", "aac", "-b:a", "128k",
        out,
    ]
    r = subprocess.run(cmd, capture_output=True, timeout=120)
    if r.returncode != 0:
        err = (r.stdout + r.stderr).decode(errors="replace")[:1500]
        raise RuntimeError(f"ffmpeg cut (rc={r.returncode}): {err}")


def _reframe_vertical(in_path: str, out_path: str, aspect_ratio: str = "9:16") -> None:
    """
    OpenCV frame-par-frame : Haar cascade face detection + exponential smoothing.
    Approche exacte du repo SamurAI (smoothing=0.15, fallback centre).
    Écrit une vidéo silencieuse, puis remixe l'audio via ffmpeg.
    """
    import cv2

    ratio_w, ratio_h = (float(x) for x in aspect_ratio.split(":"))
    target_ratio = ratio_w / ratio_h

    cap = cv2.VideoCapture(in_path)
    if not cap.isOpened():
        raise RuntimeError(f"Impossible d'ouvrir: {in_path}")

    src_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    src_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps   = cap.get(cv2.CAP_PROP_FPS) or 30.0

    # Calcul dimensions crop (SamurAI exact)
    if target_ratio < src_w / src_h:
        crop_h = src_h
        crop_w = int(crop_h * target_ratio)
    else:
        crop_w = src_w
        crop_h = int(crop_w / target_ratio)
    crop_w = max(2, crop_w - (crop_w % 2))
    crop_h = max(2, crop_h - (crop_h % 2))

    logger.info(f"[reframe] src={src_w}x{src_h} → crop={crop_w}x{crop_h}  fps={fps:.1f}")

    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )

    silent_path = out_path + ".silent.mp4"
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(silent_path, fourcc, fps, (crop_w, crop_h))

    last_center = None
    smoothing   = 0.15  # SamurAI exact value

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40))

        if len(faces) > 0:
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            cx, cy = x + w // 2, y + h // 2
            if last_center is None:
                last_center = (cx, cy)
            else:
                lx, ly = last_center
                last_center = (
                    int(lx + (cx - lx) * smoothing),
                    int(ly + (cy - ly) * smoothing),
                )

        if last_center is None:
            last_center = (src_w // 2, src_h // 2)

        cx, cy = last_center
        x0 = max(0, min(src_w - crop_w, cx - crop_w // 2))
        y0 = max(0, min(src_h - crop_h, cy - crop_h // 2))
        writer.write(frame[y0:y0 + crop_h, x0:x0 + crop_w])

    cap.release()
    writer.release()

    # Remux audio (SamurAI exact)
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", silent_path,
        "-i", in_path,
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "128k",
        "-map", "0:v:0", "-map", "1:a:0?",
        "-shortest",
        out_path,
    ]
    r = subprocess.run(cmd, capture_output=True, timeout=120)
    try:
        os.remove(silent_path)
    except OSError:
        pass
    if r.returncode != 0:
        err = (r.stdout + r.stderr).decode(errors="replace")[:1500]
        raise RuntimeError(f"ffmpeg remux (rc={r.returncode}): {err}")


def crop_clip(source: str, start: float, end: float, out: str) -> str:
    """SamurAI crop_clip_local : cut → reframe."""
    cut_path = out + ".cut.mp4"
    try:
        _cut_subclip(source, start, end, cut_path)
        _reframe_vertical(cut_path, out)
    finally:
        if os.path.exists(cut_path):
            os.remove(cut_path)
    return out

# ── Job runner ──────────────────────────────────────────────────────────────────
async def run_job(job_id: str, url: str, num_clips: int, out_dir: Path) -> None:
    source: Optional[str] = None

    def upd(msg: str) -> None:
        JOBS[job_id].update({"progress": msg})
        logger.info(f"[{job_id[:8]}] {msg}")

    try:
        upd("Téléchargement…")
        source, title, _ = await asyncio.get_event_loop().run_in_executor(
            None, lambda: download_video(url, out_dir)
        )

        upd("Transcription Whisper…")
        segments, duration = await asyncio.get_event_loop().run_in_executor(
            None, lambda: transcribe(source)
        )
        if not segments:
            raise RuntimeError("Transcription vide — vidéo sans parole ?")

        upd("Analyse Gemini…")
        moments = await find_moments(segments, duration, num_clips)
        if not moments:
            raise RuntimeError("Aucun moment viral identifié")

        clips = []
        for i, m in enumerate(moments):
            upd(f"Short {i+1}/{len(moments)}…")
            out_path = str(out_dir / f"short_{i+1:02d}_{job_id[:8]}.mp4")
            try:
                await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda st=m["start_time"], en=m["end_time"], o=out_path:
                        crop_clip(source, st, en, o),
                )
                size_mb = round(Path(out_path).stat().st_size / 1_048_576, 1)
                clips.append({
                    "title":        m["title"],
                    "hook":         m["hook_sentence"],
                    "score":        m["score"],
                    "start":        round(m["start_time"], 1),
                    "end":          round(m["end_time"], 1),
                    "duration":     round(m["end_time"] - m["start_time"], 1),
                    "download_url": f"/shorts-file/{job_id}/{Path(out_path).name}",
                    "filename":     Path(out_path).name,
                    "size_mb":      size_mb,
                })
                logger.info(f"Short {i+1} OK  {size_mb} MB")
            except Exception as e:
                logger.error(f"Short {i+1} FAILED: {e}")

        if source:
            Path(source).unlink(missing_ok=True)

        if not clips:
            raise RuntimeError("Tous les shorts ont échoué")

        JOBS[job_id] = {"status": "done", "title": title, "clips": clips}

    except Exception as e:
        logger.error(f"Job {job_id[:8]} fatal: {e}")
        if source:
            Path(source).unlink(missing_ok=True)
        JOBS[job_id] = {"status": "error", "error": str(e)}

# ── Endpoints ───────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "gemini": bool(GEMINI_API_KEY), "whisper": WHISPER_MODEL}

@app.post("/generate-shorts")
async def generate_shorts(req: GenerateRequest, tasks: BackgroundTasks, _=Depends(auth)):
    if "youtube.com" not in req.youtube_url and "youtu.be" not in req.youtube_url:
        raise HTTPException(400, "URL YouTube invalide")
    job_id  = str(uuid.uuid4())[:12]
    out_dir = WORK_DIR / job_id
    out_dir.mkdir(parents=True, exist_ok=True)
    JOBS[job_id] = {"status": "processing", "progress": "Démarrage…"}
    tasks.add_task(run_job, job_id, req.youtube_url, min(max(1, req.num_clips), 5), out_dir)
    return {"ok": True, "job_id": job_id}

@app.get("/shorts-status/{job_id}")
def shorts_status(job_id: str, _=Depends(auth)):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Job introuvable")
    return job

@app.get("/shorts-file/{job_id}/{filename}")
def shorts_file(job_id: str, filename: str):
    if ".." in job_id + filename:
        raise HTTPException(400, "Chemin invalide")
    path = WORK_DIR / job_id / filename
    if not path.exists():
        raise HTTPException(404, "Fichier introuvable")
    return FileResponse(str(path), media_type="video/mp4", filename=filename)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), workers=1)
