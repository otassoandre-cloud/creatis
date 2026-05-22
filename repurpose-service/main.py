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

SERVICE_SECRET       = os.environ.get("REPURPOSE_SERVICE_SECRET", "")
GEMINI_API_KEY       = os.environ.get("GEMINI_API_KEY", "")
WHISPER_MODEL        = os.environ.get("WHISPER_MODEL", "base")
YOUTUBE_COOKIES_B64  = os.environ.get("YOUTUBE_COOKIES_B64", "")

SESSIONS_DIR = Path(tempfile.gettempdir()) / "creatis_clips"
SESSIONS_DIR.mkdir(exist_ok=True)

# Job store en mémoire (session_id → état)
JOBS: dict = {}

# Fichier cookies YouTube (écrit une fois au démarrage)
_COOKIE_FILE: Optional[str] = None
if YOUTUBE_COOKIES_B64:
    try:
        import base64 as _b64
        _cookie_path = str(SESSIONS_DIR / "yt_cookies.txt")
        with open(_cookie_path, "w") as _f:
            _f.write(_b64.b64decode(YOUTUBE_COOKIES_B64).decode("utf-8"))
        _COOKIE_FILE = _cookie_path
        logger.info("Cookies YouTube chargés ✓")
    except Exception as _e:
        logger.warning(f"Erreur chargement cookies: {_e}")

def _yt_opts(**extra) -> dict:
    """Options yt-dlp de base avec cookies si disponibles."""
    opts = {
        "quiet": True,
        "no_warnings": True,
        "extractor_args": {"youtube": {"player_client": ["android", "ios", "web"]}},
        **extra,
    }
    if _COOKIE_FILE:
        opts["cookiefile"] = _COOKIE_FILE
    return opts

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
    opts = _yt_opts(
        format=f"best[height<={quality}][ext=mp4]/best[height<={quality}]/best[ext=mp4]/best",
        outtmpl=f"{out_dir}/video.%(ext)s",
        noplaylist=True,
        max_filesize=500 * 1024 * 1024,
    )
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        title = info.get("title", "Vidéo YouTube")
        duration = int(info.get("duration", 0))

    video = next((str(p) for p in Path(out_dir).iterdir() if p.suffix == ".mp4"), None)
    if not video:
        raise RuntimeError("Vidéo non trouvée après téléchargement")
    return video, title, duration

def download_audio_only(url: str, out_dir: str) -> tuple[str, str, int]:
    opts = _yt_opts(
        format="bestaudio/best",
        outtmpl=f"{out_dir}/audio.%(ext)s",
        noplaylist=True,
        max_filesize=200 * 1024 * 1024,
        postprocessors=[{"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "64"}],
    )
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        title = info.get("title", "Vidéo YouTube")
        duration = int(info.get("duration", 0))

    files = list(Path(out_dir).iterdir())
    logger.info(f"download_audio_only: fichiers dans {out_dir}: {[f.name for f in files]}")
    audio = next((str(p) for p in files if p.suffix in (".mp3", ".m4a", ".webm", ".opus", ".ogg", ".flac")), None)
    if not audio:
        raise RuntimeError(f"Audio non trouvé — fichiers présents: {[f.name for f in files]}")
    return audio, title, duration

def get_subtitles_youtube(url: str, out_dir: str) -> Optional[tuple[list[dict], str, int]]:
    """Extrait les sous-titres auto YouTube via extract_info (pas de téléchargement vidéo)."""
    import requests as req_lib
    try:
        with yt_dlp.YoutubeDL(_yt_opts()) as ydl:
            info = ydl.extract_info(url, download=False)

        title = info.get("title", "Vidéo YouTube")
        duration = int(info.get("duration", 0))

        # Chercher piste de sous-titres : auto > manuel, fr > en > n'importe quelle langue
        auto_caps = info.get("automatic_captions", {})
        manual = info.get("subtitles", {})
        sub_track = None
        for lang in ["fr", "fr-FR", "en", "en-US", "en-GB"]:
            sub_track = auto_caps.get(lang) or manual.get(lang)
            if sub_track:
                break
        if not sub_track:
            for tracks in list(auto_caps.values()) + list(manual.values()):
                sub_track = tracks
                break
        if not sub_track:
            return None

        entry = next((t for t in sub_track if t.get("ext") == "json3"), sub_track[0] if sub_track else None)
        if not entry or not entry.get("url"):
            return None

        r = req_lib.get(entry["url"], timeout=15)
        r.raise_for_status()
        data = r.json()

        segments = []
        for ev in data.get("events", []):
            if not ev.get("segs"):
                continue
            start_s = ev["tStartMs"] / 1000
            dur_ms = ev.get("dDurationMs", 2000)
            text = "".join(s.get("utf8", "") for s in ev["segs"]).replace("\n", " ").strip()
            if text:
                segments.append({"start": round(start_s, 2), "end": round(start_s + dur_ms / 1000, 2), "text": text})

        if len(segments) < 10:
            return None

        logger.info(f"Sous-titres YouTube OK — {len(segments)} segments")
        return segments, title, duration
    except Exception as e:
        logger.warning(f"Sous-titres YouTube indisponibles: {e}")
        return None

def download_video_segment(url: str, dl_start: float, dl_end: float, out_dir: str, stem: str) -> str:
    """Télécharge uniquement un segment vidéo via yt-dlp download_ranges."""
    from yt_dlp.utils import download_range_func
    opts = _yt_opts(
        format="best[height<=480][ext=mp4]/best[height<=480]/best[ext=mp4]/best",
        outtmpl=f"{out_dir}/{stem}.%(ext)s",
        download_ranges=download_range_func(None, [(dl_start, dl_end)]),
        noplaylist=True,
    )
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])
    result = next(
        (str(p) for p in Path(out_dir).iterdir() if p.stem == stem and p.suffix in (".mp4", ".mkv", ".webm")),
        None
    )
    if not result:
        raise RuntimeError("Segment vidéo non trouvé après téléchargement")
    return result

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

async def process_clips_job(session_id: str, url: str, n: int, session_dir: Path):
    """Traitement asynchrone — 2 phases : transcript rapide puis segments ciblés."""
    sid = session_id[:8]
    try:
        with tempfile.TemporaryDirectory() as tmp:
            # ── Phase 1 : Transcript (sous-titres YouTube si dispo, sinon Whisper) ──
            JOBS[session_id]["progress"] = "Récupération des sous-titres…"
            sub_result = get_subtitles_youtube(url, tmp)
            if sub_result:
                segments, title, video_duration = sub_result
                logger.info(f"[{sid}] Sous-titres YouTube ✓ {len(segments)} segs, {video_duration}s")
            else:
                JOBS[session_id]["progress"] = "Téléchargement audio…"
                audio_path, title, video_duration = download_audio_only(url, tmp)
                JOBS[session_id]["progress"] = "Transcription Whisper…"
                audio_16k = str(Path(tmp) / "audio16k.mp3")
                subprocess.run(["ffmpeg", "-y", "-i", audio_path, "-ar", "16000", "-ac", "1", "-b:a", "32k", audio_16k],
                               capture_output=True, check=True)
                segments = transcribe_with_timestamps(audio_16k)
                logger.info(f"[{sid}] Whisper ✓ {len(segments)} segs")

            if not segments:
                JOBS[session_id] = {"status": "error", "error": "Transcription vide", "progress": None, "result": None}
                return

            # ── Phase 2 : Identifier les moments viraux ──
            JOBS[session_id]["progress"] = "Analyse des moments viraux…"
            moments = await identify_moments_gemini(segments, title, n, video_duration)
            logger.info(f"[{sid}] {len(moments)} moments identifiés")

            # ── Phase 3 : Télécharger et processer chaque segment individuellement ──
            clips_result = []
            for i, moment in enumerate(moments):
                clip_start = float(moment["start"])
                clip_end = float(moment["end"])
                clip_filename = f"clip_{i+1:02d}.mp4"
                final_clip_path = str(session_dir / clip_filename)

                JOBS[session_id]["progress"] = f"Clip {i+1}/{len(moments)} — téléchargement {clip_start:.0f}s→{clip_end:.0f}s…"
                logger.info(f"[{sid}] Clip {i+1}: segment {clip_start:.0f}s→{clip_end:.0f}s")

                try:
                    seg_dir = Path(tmp) / f"seg_{i+1}"
                    seg_dir.mkdir(exist_ok=True)

                    # Buffer 5s : sans force_keyframes_at_cuts, le segment peut démarrer
                    # 0-4s avant la cible (dépend de la position des keyframes YouTube)
                    pre_buf = min(clip_start, 5.0)
                    dl_start = max(0.0, clip_start - pre_buf)
                    seg_video = download_video_segment(url, dl_start, clip_end + 2.0, str(seg_dir), f"seg{i+1}")

                    # Timestamps relatifs dans le segment téléchargé
                    seg_clip_start = clip_start - dl_start  # ~5.0
                    seg_clip_end = seg_clip_start + (clip_end - clip_start)

                    # Petite pause entre les clips pour éviter le rate limiting YouTube
                    await asyncio.sleep(1)

                    JOBS[session_id]["progress"] = f"Clip {i+1}/{len(moments)} — recadrage 9:16…"

                    srt_content = generate_srt(segments, clip_start, clip_end)
                    srt_path = str(seg_dir / f"clip_{i+1}.srt")
                    with open(srt_path, "w", encoding="utf-8") as f:
                        f.write(srt_content)

                    face_pos = compute_face_track(seg_video, seg_clip_start, seg_clip_end, sample_fps=1.0)
                    face_pos = smooth_positions(face_pos)
                    cut_clip_9_16(seg_video, seg_clip_start, seg_clip_end, final_clip_path, face_pos, srt_path)

                    clips_result.append({
                        "clip_id": clip_filename,
                        "download_url": f"/download/{session_id}/{clip_filename}",
                        "hook": str(moment.get("hook", ""))[:80],
                        "why": str(moment.get("why", ""))[:200],
                        "score": int(moment.get("score", 80)),
                        "start": clip_start,
                        "end": clip_end,
                        "duration": round(clip_end - clip_start, 1),
                        "transcript": " ".join(
                            s["text"] for s in segments if s["start"] >= clip_start and s["end"] <= clip_end
                        )[:300],
                    })
                    logger.info(f"[{sid}] Clip {i+1} OK")
                except Exception as e:
                    logger.error(f"[{sid}] Clip {i+1} FAILED: {e}")

            if not clips_result:
                JOBS[session_id] = {"status": "error", "error": "Aucun clip généré", "progress": None, "result": None}
                return

            JOBS[session_id] = {
                "status": "done", "progress": None, "error": None,
                "result": {
                    "ok": True, "title": title, "duration": video_duration,
                    "session_id": session_id, "clips": clips_result,
                }
            }
            logger.info(f"[{sid}] Job terminé — {len(clips_result)} clips")

    except Exception as e:
        shutil.rmtree(session_dir, ignore_errors=True)
        logger.error(f"[{sid}] Erreur fatale: {e}")
        JOBS[session_id] = {"status": "error", "error": str(e), "progress": None, "result": None}


@app.post("/clips")
async def create_clips(req: ClipsRequest, background_tasks: BackgroundTasks, _: None = Depends(verify_secret)):
    url = req.url.strip()
    n = min(max(1, req.n_clips), 7)

    if "youtube.com" not in url and "youtu.be" not in url:
        raise HTTPException(400, "URL YouTube invalide")

    session_id = str(uuid.uuid4())
    session_dir = SESSIONS_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    JOBS[session_id] = {"status": "processing", "progress": "Démarrage…", "result": None, "error": None}
    background_tasks.add_task(process_clips_job, session_id, url, n, session_dir)
    background_tasks.add_task(cleanup_old_sessions)

    return {"ok": True, "session_id": session_id, "status": "processing"}


@app.get("/status/{session_id}")
async def get_status(session_id: str, _: None = Depends(verify_secret)):
    job = JOBS.get(session_id)
    if not job:
        raise HTTPException(404, "Job introuvable")
    return job


@app.post("/transcribe")
async def transcribe(req: TranscribeRequest, _: None = Depends(verify_secret)):
    url = req.url.strip()
    if "youtube.com" not in url and "youtu.be" not in url:
        raise HTTPException(400, "URL YouTube invalide")

    with tempfile.TemporaryDirectory() as tmp:
        # Essai 1 : sous-titres YouTube (pas de download, quasi instantané)
        sub_result = get_subtitles_youtube(url, tmp)
        if sub_result:
            segs, title, duration_s = sub_result
            transcript = segments_to_text(segs)
        else:
            # Fallback : télécharger audio + Whisper
            audio_path, title, duration_s = download_audio_only(url, tmp)
            segs = transcribe_with_timestamps(audio_path)
            transcript = segments_to_text(segs)

    if not transcript:
        raise HTTPException(422, "Transcription vide — sous-titres indisponibles et Whisper vide")
    m, s = divmod(duration_s, 60)
    return {"ok": True, "title": title, "duration": f"{m}:{s:02d}", "transcript": transcript, "r2_url": None}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), workers=1)
