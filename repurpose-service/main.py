"""
Créatis Service
Basé sur github.com/SamurAIGPT/AI-Youtube-Shorts-Generator (local mode)

POST /clips             { url, n_clips=5 }            → { session_id }  ← identification
GET  /status/{sid}                                    → { status, result }
POST /generate-shorts  { youtube_url, num_clips=3 }  → { job_id }       ← génération
GET  /shorts-status/{job_id}                          → { status, clips? }
GET  /shorts-file/{job_id}/{filename}                 → MP4
GET  /health
"""
import os, uuid, json, re, asyncio, subprocess, tempfile, logging, base64, shutil
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

JOBS: dict  = {}   # shorts jobs
CLIPS: dict = {}   # clips identification jobs

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

class ClipsRequest(BaseModel):
    url: str
    n_clips: int = 5

class GenerateRequest(BaseModel):
    youtube_url: str
    num_clips: int = 3
    video_url: Optional[str] = None   # URL CDN stream combiné (Vercel→Railway)
    audio_url: Optional[str] = None   # URL CDN audio séparé (si adaptatif)

# ── Innertube iOS — download direct sans bot detection ─────────────────────────
_INNERTUBE_URL = "https://www.youtube.com/youtubei/v1/player"

# Clients à essayer dans l'ordre — TV embedded ne requiert pas de PO token
_INNERTUBE_CLIENTS = [
    {   # TVHTML5 Simply Embedded — le moins restrictif, pas de PO token requis
        "name": "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
        "headers": {"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"},
        "context": {"client": {"clientName": "TVHTML5_SIMPLY_EMBEDDED_PLAYER", "clientVersion": "2.0",
                                "clientScreen": "EMBED", "hl": "en", "gl": "US"}},
    },
    {   # Android — API key officielle yt-dlp
        "name": "ANDROID",
        "url": "https://www.youtube.com/youtubei/v1/player?key=AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
        "headers": {
            "Content-Type": "application/json",
            "User-Agent": "com.google.android.youtube/17.36.4 (Linux; U; Android 12; GB) gzip",
            "X-YouTube-Client-Name": "3",
            "X-YouTube-Client-Version": "17.36.4",
        },
        "context": {"client": {
            "clientName": "ANDROID", "clientVersion": "17.36.4",
            "platform": "MOBILE", "osName": "Android", "osVersion": "12",
            "androidSdkVersion": 31,
            "userAgent": "com.google.android.youtube/17.36.4 (Linux; U; Android 12; GB) gzip",
            "hl": "en", "gl": "US",
        }},
    },
    {   # iOS — API key officielle yt-dlp
        "name": "IOS",
        "url": "https://www.youtube.com/youtubei/v1/player?key=AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc",
        "headers": {
            "Content-Type": "application/json",
            "User-Agent": "com.google.ios.youtube/19.29.1 (iPhone14,5; U; CPU iOS 15_5 like Mac OS X)",
            "X-YouTube-Client-Name": "5",
            "X-YouTube-Client-Version": "19.29.1",
        },
        "context": {"client": {
            "clientName": "IOS", "clientVersion": "19.29.1",
            "deviceModel": "iPhone14,5",
            "userAgent": "com.google.ios.youtube/19.29.1 (iPhone14,5; U; CPU iOS 15_5 like Mac OS X)",
            "osName": "iPhone", "osVersion": "15.5.0.19F77",
            "hl": "en", "gl": "US",
        }},
    },
]

def _innertube_download(video_id: str, out_path: str) -> tuple[str, int]:
    """Essaie plusieurs clients Innertube jusqu'à obtenir un stream."""
    last_err = None
    for client in _INNERTUBE_CLIENTS:
        try:
            payload = {"videoId": video_id, "context": client["context"]}
            with httpx.Client(timeout=30) as c:
                r = c.post(client.get("url", _INNERTUBE_URL), headers=client["headers"], json=payload)
                r.raise_for_status()
                data = r.json()

            # Vérifier que la vidéo est accessible
            status = data.get("playabilityStatus", {})
            if status.get("status") not in ("OK", None):
                raise RuntimeError(f"Innertube {client['name']}: {status.get('reason', status.get('status'))}")

            title    = data.get("videoDetails", {}).get("title", "video")
            duration = int(data.get("videoDetails", {}).get("lengthSeconds", 0))

            formats = data.get("streamingData", {}).get("formats", [])
            best = max(
                (f for f in formats if "url" in f and 0 < f.get("height", 0) <= 720),
                key=lambda f: f.get("height", 0),
                default=None,
            )
            if not best:
                raise RuntimeError(f"Innertube {client['name']}: aucun stream combiné")

            dl_ua = client["headers"].get("User-Agent", "Mozilla/5.0")
            with httpx.Client(timeout=600, follow_redirects=True) as c:
                with c.stream("GET", best["url"], headers={"User-Agent": dl_ua}) as r:
                    r.raise_for_status()
                    with open(out_path, "wb") as f:
                        for chunk in r.iter_bytes(65536):
                            f.write(chunk)

            sz = Path(out_path).stat().st_size
            if sz < 100_000:
                raise RuntimeError(f"Fichier trop petit ({sz} bytes)")

            logger.info(f"Innertube {client['name']} OK: {title}  {sz // 1024} KB")
            return title, duration

        except Exception as e:
            logger.warning(f"Innertube {client['name']} failed: {e}")
            last_err = e
            continue

    raise RuntimeError(f"Tous les clients Innertube ont échoué: {last_err}")


def _direct_download(stream_url: str, out_path: str) -> None:
    """Télécharge une URL CDN directe (googlevideo.com) — pas de bot detection."""
    with httpx.Client(timeout=600, follow_redirects=True) as c:
        with c.stream("GET", stream_url) as r:
            r.raise_for_status()
            with open(out_path, "wb") as f:
                for chunk in r.iter_bytes(65536):
                    f.write(chunk)
    sz = Path(out_path).stat().st_size
    if sz < 100_000:
        raise RuntimeError(f"Fichier trop petit ({sz} bytes)")
    logger.info(f"Direct CDN download OK: {sz // 1024} KB")


def _direct_download_adaptive(video_url: str, audio_url: str, out_path: str) -> None:
    """Télécharge streams vidéo+audio séparés et les merge avec ffmpeg."""
    vid_tmp = out_path + ".vid.mp4"
    aud_tmp = out_path + ".aud.mp4"
    try:
        _direct_download(video_url, vid_tmp)
        _direct_download(audio_url, aud_tmp)
        cmd = ["ffmpeg", "-y", "-loglevel", "error",
               "-i", vid_tmp, "-i", aud_tmp,
               "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
               "-shortest", out_path]
        r = subprocess.run(cmd, capture_output=True, timeout=120)
        if r.returncode != 0:
            raise RuntimeError(f"ffmpeg merge: {(r.stdout+r.stderr).decode(errors='replace')[:500]}")
        logger.info(f"Adaptive merge OK: {Path(out_path).stat().st_size // 1024} KB")
    finally:
        for p in [vid_tmp, aud_tmp]:
            if os.path.exists(p): os.remove(p)


def _ytdlp_download(url: str, out_dir: Path) -> tuple[str, str, int]:
    """Fallback yt-dlp si Innertube échoue."""
    # D'abord lister les formats disponibles pour diagnostic
    ydl_base = {
        "quiet": True,
        "no_warnings": True,
        "extractor_args": {"youtube": {"player_client": ["tv_embedded", "web", "ios"]}},
    }
    if _COOKIE_FILE:
        ydl_base["cookiefile"] = _COOKIE_FILE

    try:
        with yt_dlp.YoutubeDL({**ydl_base}) as ydl:
            info = ydl.extract_info(url, download=False)
            fmts = info.get("formats", []) if info else []
            fmt_ids = [(f.get("format_id"), f.get("height"), f.get("vcodec","?")[:4], f.get("acodec","?")[:4]) for f in fmts]
            logger.info(f"Formats disponibles ({len(fmt_ids)}): {fmt_ids[:15]}")
    except Exception as e:
        logger.warning(f"Liste formats échouée: {e}")

    ydl_opts = {
        **ydl_base,
        # bestvideo+bestaudio couvre les formats adaptatifs (séparés), /best couvre les combinés
        "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best/worst",
        "outtmpl": str(out_dir / "source.%(ext)s"),
        "merge_output_format": "mp4",
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        title    = info.get("title", "Video")
        duration = int(info.get("duration", 0))
    for ext in ["mp4", "mkv", "webm"]:
        p = out_dir / f"source.{ext}"
        if p.exists() and p.stat().st_size > 10_000:
            return str(p), title, duration
    raise RuntimeError("yt-dlp: aucun fichier produit")


# ── STEP 1 : Téléchargement ─────────────────────────────────────────────────────
# ── Cobalt API — téléchargement via service tiers (IPs résidentielles) ──────────
_COBALT_INSTANCES = [
    "https://api.cobalt.tools",
    "https://co.wuk.sh",
    "https://cobalt.imput.net",
]

def _cobalt_download(youtube_url: str, out_path: str) -> None:
    """Télécharge via Cobalt API — contourne bot detection YouTube."""
    last_err = None
    for base in _COBALT_INSTANCES:
        try:
            with httpx.Client(timeout=30) as c:
                r = c.post(f"{base}/",
                    headers={"Accept": "application/json", "Content-Type": "application/json"},
                    json={"url": youtube_url, "videoQuality": "720", "filenameStyle": "basic"}
                )
                r.raise_for_status()
                data = r.json()
            status = data.get("status")
            logger.info(f"Cobalt {base}: status={status}")
            if status in ("stream", "tunnel", "redirect", "picker"):
                dl_url = data.get("url") or (data.get("picker", [{}])[0].get("url"))
                if not dl_url:
                    raise RuntimeError(f"Cobalt: pas d'URL dans la réponse")
                _direct_download(dl_url, out_path)
                return
            else:
                raise RuntimeError(f"Cobalt: {data.get('error', {}).get('code', status)}")
        except Exception as e:
            logger.warning(f"Cobalt {base} failed: {e}")
            last_err = e
            continue
    raise RuntimeError(f"Tous les serveurs Cobalt ont échoué: {last_err}")


def download_video(url: str, out_dir: Path, direct_url: Optional[str] = None, audio_url: Optional[str] = None) -> tuple[str, str, int]:
    out_path = str(out_dir / "source.mp4")

    # Priorité 1 : URL CDN pré-fetchée par Vercel
    if direct_url:
        if audio_url:
            _direct_download_adaptive(direct_url, audio_url, out_path)
        else:
            _direct_download(direct_url, out_path)
        return out_path, "Video", 0

    # Priorité 2 : Cobalt API (IPs résidentielles, pas de bot detection)
    try:
        _cobalt_download(url, out_path)
        return out_path, "Video", 0
    except Exception as e:
        logger.warning(f"Cobalt failed ({e}) — fallback Innertube")

    # Priorité 3 : Innertube direct
    m = re.search(r'(?:v=|youtu\.be/|shorts/)([a-zA-Z0-9_-]{11})', url)
    if m:
        try:
            title, duration = _innertube_download(m.group(1), out_path)
            if Path(out_path).stat().st_size > 100_000:
                return out_path, title, duration
        except Exception as e:
            logger.warning(f"Innertube failed ({e}) — fallback yt-dlp")

    # Priorité 4 : yt-dlp last resort
    return _ytdlp_download(url, out_dir)

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
async def run_job(job_id: str, url: str, num_clips: int, out_dir: Path, direct_url: Optional[str] = None, audio_url: Optional[str] = None) -> None:
    source: Optional[str] = None

    def upd(msg: str) -> None:
        JOBS[job_id].update({"progress": msg})
        logger.info(f"[{job_id[:8]}] {msg}")

    try:
        upd("Téléchargement…")
        source, title, _ = await asyncio.get_event_loop().run_in_executor(
            None, lambda: download_video(url, out_dir, direct_url, audio_url)
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
    tasks.add_task(run_job, job_id, req.youtube_url, min(max(1, req.num_clips), 5), out_dir, req.video_url, req.audio_url)
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

# ── Clip Export (télécharge + découpe un clip précis) ───────────────────────────
CLIP_EXPORTS: dict = {}

class ClipExportRequest(BaseModel):
    video_id: str
    start: float
    end: float

async def run_clip_export(job_id: str, video_id: str, start: float, end: float, out_dir: Path) -> None:
    tmp = str(out_dir / "source.mp4")
    try:
        CLIP_EXPORTS[job_id]["progress"] = "Téléchargement…"
        try:
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: _innertube_download(video_id, tmp)
            )
        except Exception as e:
            logger.warning(f"clip-export Innertube failed ({e}), fallback yt-dlp")
            url = f"https://www.youtube.com/watch?v={video_id}"
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: _ytdlp_download(url, out_dir)
            )
            for ext in ["mp4", "mkv", "webm"]:
                p = out_dir / f"source.{ext}"
                if p.exists():
                    if str(p) != tmp:
                        p.rename(tmp)
                    break

        if not Path(tmp).exists() or Path(tmp).stat().st_size < 10_000:
            raise RuntimeError("Téléchargement échoué")

        CLIP_EXPORTS[job_id]["progress"] = "Découpe…"
        out_path = str(out_dir / f"clip_{job_id[:8]}.mp4")
        await asyncio.get_event_loop().run_in_executor(
            None, lambda: crop_clip(tmp, start, end, out_path)
        )
        Path(tmp).unlink(missing_ok=True)
        CLIP_EXPORTS[job_id] = {
            "status": "done",
            "download_url": f"/clip-export-file/{job_id}/{Path(out_path).name}",
        }
    except Exception as e:
        logger.error(f"clip-export {job_id[:8]} fatal: {e}")
        Path(tmp).unlink(missing_ok=True)
        CLIP_EXPORTS[job_id] = {"status": "error", "error": str(e)}

@app.post("/clip-export")
async def clip_export(req: ClipExportRequest, tasks: BackgroundTasks, _=Depends(auth)):
    job_id  = str(uuid.uuid4())[:12]
    out_dir = WORK_DIR / f"ce_{job_id}"
    out_dir.mkdir(parents=True, exist_ok=True)
    CLIP_EXPORTS[job_id] = {"status": "processing", "progress": "Démarrage…"}
    tasks.add_task(run_clip_export, job_id, req.video_id, req.start, req.end, out_dir)
    return {"ok": True, "job_id": job_id}

@app.get("/clip-export-status/{job_id}")
def clip_export_status(job_id: str, _=Depends(auth)):
    job = CLIP_EXPORTS.get(job_id)
    if not job:
        raise HTTPException(404, "Job introuvable")
    return job

@app.get("/clip-export-file/{job_id}/{filename}")
def clip_export_file(job_id: str, filename: str):
    if ".." in job_id + filename:
        raise HTTPException(400, "Chemin invalide")
    path = WORK_DIR / f"ce_{job_id}" / filename
    if not path.exists():
        raise HTTPException(404, "Fichier introuvable")
    return FileResponse(str(path), media_type="video/mp4", filename=filename)

# ══════════════════════════════════════════════════════════════════════════════
# CLIPS IDENTIFICATION (no video download — subtitles + LLM only)
# ══════════════════════════════════════════════════════════════════════════════

def _extract_video_id(url: str) -> Optional[str]:
    for pat in [r"[?&]v=([a-zA-Z0-9_-]{11})", r"youtu\.be/([a-zA-Z0-9_-]{11})", r"shorts/([a-zA-Z0-9_-]{11})"]:
        m = re.search(pat, url)
        if m:
            return m.group(1)
    return None

def _get_subtitles(url: str) -> Optional[tuple]:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound
    except ImportError:
        return None
    try:
        vid = _extract_video_id(url)
        if not vid:
            return None
        tlist = YouTubeTranscriptApi.list_transcripts(vid)
        t = None
        try:
            t = tlist.find_generated_transcript(["fr", "fr-FR", "en", "en-US"])
        except NoTranscriptFound:
            try:
                t = tlist.find_manually_created_transcript(["fr", "fr-FR", "en", "en-US"])
            except NoTranscriptFound:
                for tr in tlist:
                    t = tr; break
        if not t:
            return None
        data = t.fetch()
        segs, dur = [], 0
        for item in data:
            start = round(float(item.get("start", 0)), 2)
            end   = round(start + float(item.get("duration", 2.0)), 2)
            text  = str(item.get("text", "")).replace("\n", " ").strip()
            if text:
                segs.append({"start": start, "end": end, "text": text})
            dur = max(dur, int(end))
        if len(segs) < 10:
            return None
        logger.info(f"Sous-titres OK — {len(segs)} segments")
        return segs, dur
    except Exception as e:
        logger.warning(f"Sous-titres: {e}")
        return None

def _get_video_meta(vid: str) -> tuple:
    import requests as rq
    title, dur = "Vidéo YouTube", 0
    try:
        r = rq.get(f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json", timeout=8)
        if r.status_code == 200:
            title = r.json().get("title", title)
    except Exception:
        pass
    for inst in ["https://inv.nadeko.net", "https://invidious.nerdvpn.de"]:
        try:
            r = rq.get(f"{inst}/api/v1/videos/{vid}", timeout=8)
            if r.status_code == 200:
                d = r.json()
                title = d.get("title", title)
                dur   = int(d.get("lengthSeconds", 0))
                break
        except Exception:
            continue
    return title, dur

async def _identify_groq(segs: list, title: str, n: int, dur: int) -> list:
    if not GROQ_API_KEY:
        return []
    if segs:
        formatted = "\n".join(f"[{int(s['start']//60):02d}:{int(s['start']%60):02d}] {s['text']}" for s in segs[:300])
        prompt = f'Vidéo "{title}" ({dur}s). Transcription:\n{formatted}\nTrouve {n} moments viraux 45-90s. JSON:\n{{"clips":[{{"start":<float>,"end":<float>,"hook":"<10 mots>","why":"<phrase>","score":<100>}}]}}'
    else:
        prompt = f'Vidéo "{title}" ({dur}s). Sans transcription, génère {n} moments probables 45-90s. JSON:\n{{"clips":[{{"start":<float>,"end":<float>,"hook":"<10 mots>","why":"<phrase>","score":<100>}}]}}'
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={"model": "llama-3.3-70b-versatile", "messages": [{"role": "user", "content": prompt}],
                      "temperature": 0.3, "max_tokens": 1024},
            )
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"]
        m = re.search(r'\{[\s\S]*\}', text)
        if m:
            clips = json.loads(m.group()).get("clips", [])
            clips = [c for c in clips if 30 <= float(c.get("end", 0)) - float(c.get("start", 0)) <= 95]
            if clips:
                return sorted(clips, key=lambda x: x.get("score", 0), reverse=True)[:n]
    except Exception as e:
        logger.warning(f"Groq: {e}")
    return []

async def _process_clips(sid: str, url: str, n: int) -> None:
    try:
        vid = _extract_video_id(url)
        CLIPS[sid]["progress"] = "Métadonnées…"
        title, dur = await asyncio.get_event_loop().run_in_executor(None, lambda: _get_video_meta(vid))

        CLIPS[sid]["progress"] = "Sous-titres…"
        sub = None
        try:
            sub = await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(None, lambda: _get_subtitles(url)), timeout=12
            )
        except asyncio.TimeoutError:
            pass
        segs = sub[0] if sub else []
        if sub and sub[1] > 0:
            dur = sub[1]

        CLIPS[sid]["progress"] = "Analyse Groq…"
        moments = await _identify_groq(segs, title, n, dur)

        if not moments:
            moments = [
                {"start": max(30.0, dur//(n+1)*i), "end": max(30.0, dur//(n+1)*i) + 55,
                 "hook": f"Moment clé {i+1}", "why": "Sélection auto", "score": 80 - i*5}
                for i in range(n)
            ]

        clips_result = []
        for m in moments:
            cs, ce = float(m["start"]), float(m["end"])
            if segs:
                caps = [{"start": round(s["start"]-cs,2), "end": round(s["end"]-cs,2), "text": s["text"]}
                        for s in segs if cs <= s["start"] < ce]
            else:
                caps = m.get("caption_segments", [])
            clips_result.append({
                "hook": str(m.get("hook",""))[:80], "why": str(m.get("why",""))[:200],
                "score": int(m.get("score", 80)), "start": cs, "end": ce,
                "duration": round(ce-cs, 1), "transcript": "",
                "video_id": vid,
                "youtube_url": f"https://www.youtube.com/watch?v={vid}&t={int(cs)}s",
                "embed_url": f"https://www.youtube.com/embed/{vid}?start={int(cs)}&end={int(ce)}&rel=0",
                "caption_segments": caps,
            })

        CLIPS[sid] = {"status": "done", "progress": None, "error": None,
                      "result": {"ok": True, "title": title, "duration": dur,
                                 "video_id": vid, "session_id": sid, "clips": clips_result}}
    except Exception as e:
        logger.error(f"clips {sid[:8]}: {e}")
        CLIPS[sid] = {"status": "error", "error": str(e), "progress": None, "result": None}

@app.post("/clips")
async def create_clips(req: ClipsRequest, tasks: BackgroundTasks, _=Depends(auth)):
    url = req.url.strip()
    if "youtube.com" not in url and "youtu.be" not in url:
        raise HTTPException(400, "URL YouTube invalide")
    sid = str(uuid.uuid4())
    CLIPS[sid] = {"status": "processing", "progress": "Démarrage…", "result": None, "error": None}
    tasks.add_task(_process_clips, sid, url, min(max(1, req.n_clips), 7))
    return {"ok": True, "session_id": sid, "status": "processing"}

@app.get("/status/{session_id}")
async def clips_status(session_id: str, _=Depends(auth)):
    job = CLIPS.get(session_id)
    if not job:
        raise HTTPException(404, "Job introuvable")
    return job

# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), workers=1)
