"""
Créatis Repurpose Service
Based on: github.com/SamurAIGPT/AI-Youtube-Shorts-Generator (local mode)

POST /generate-shorts  { youtube_url, num_clips=3 }  → { job_id }
GET  /shorts-status/{job_id}                          → { status, clips? }
GET  /shorts-file/{job_id}/{filename}                 → MP4
POST /clips            { url, n_clips=5 }             → { session_id }
GET  /status/{session_id}                             → { status, result }
POST /clip-export      { video_id, start, end }       → { job_id }
GET  /clip-export-status/{job_id}                     → { status, download_url? }
GET  /clip-export-file/{job_id}/{filename}            → MP4
GET  /health
"""
import os, uuid, json, re, asyncio, subprocess, tempfile, logging
from pathlib import Path
from typing import Optional, List, Dict

import httpx
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("creatis")

GEMINI_API_KEY        = os.environ.get("GEMINI_API_KEY", "")
GROQ_API_KEY          = os.environ.get("GROQ_API_KEY", "")
SERVICE_SECRET        = os.environ.get("REPURPOSE_SERVICE_SECRET", "")
WHISPER_MODEL         = os.environ.get("WHISPER_MODEL", "base")
YOUTUBE_COOKIES       = os.environ.get("YOUTUBE_COOKIES", "")
RESIDENTIAL_PROXY_URL = os.environ.get("RESIDENTIAL_PROXY_URL", "")
BGUTIL_URL            = os.environ.get("BGUTIL_URL", "")

WORK_DIR = Path(tempfile.gettempdir()) / "creatis"
WORK_DIR.mkdir(exist_ok=True)

JOBS:         dict = {}
CLIPS:        dict = {}
CLIP_EXPORTS: dict = {}


_bgutil_ok: bool = False


async def _check_bgutil() -> bool:
    if not BGUTIL_URL:
        return False
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get(f"{BGUTIL_URL}/")
            logger.info(f"[bgutil] GET / → {r.status_code} body={r.text[:200]}")
            return True
    except Exception as e:
        logger.error(f"[bgutil] INJOIGNABLE: {e}")
        return False


def _fetch_po_token_sync() -> tuple:
    """Appelle bgutil (sync). Retourne (visitor_data, po_token)."""
    if not BGUTIL_URL:
        return "", ""
    with httpx.Client(timeout=20) as c:
        try:
            r = c.post(f"{BGUTIL_URL}/get_pot", json={})
            logger.info(f"[bgutil] réponse complète: {r.text}")  # log sans troncature
            if r.status_code == 200:
                data = r.json()
                logger.info(f"[bgutil] clés disponibles: {list(data.keys())}")
                token   = data.get("poToken") or data.get("po_token") or ""
                visitor = (data.get("visitorData") or data.get("visitor_data")
                           or data.get("contentBinding") or "")
                if token:
                    logger.info(f"[bgutil] PoToken={len(token)}c contentBinding={len(visitor)}c")
                    return visitor, token
        except Exception as e:
            logger.warning(f"[bgutil] /get_pot failed: {e}")
    return "", ""


def _yt_extractor_args() -> dict:
    # web = prioritaire (PoToken bgutil), android/ios = fallback si web sans formats
    args = {"youtube": {"player_client": ["web", "android", "ios"]}}
    if BGUTIL_URL:
        args["youtubepot-bgutilhttp"] = {"base_url": [BGUTIL_URL]}
        logger.info(f"[bgutil] plugin configuré: {BGUTIL_URL}")
    return args


app = FastAPI(title="Créatis Shorts")


@app.on_event("startup")
async def startup():
    global _bgutil_ok
    if BGUTIL_URL:
        _bgutil_ok = await _check_bgutil()
        logger.info(f"[bgutil] URL={BGUTIL_URL} joignable={_bgutil_ok}")
security = HTTPBearer(auto_error=False)


def auth(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if SERVICE_SECRET and (not creds or creds.credentials != SERVICE_SECRET):
        raise HTTPException(401, "Non autorisé")


# ── Models ────────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    youtube_url: str
    num_clips: int = 3
    video_url: Optional[str] = None   # stream URL pré-résolu par Vercel (Innertube)
    audio_url: Optional[str] = None
    proxy_url: Optional[str] = None   # proxy résidentiel à utiliser pour le téléchargement de video_url

class ClipsRequest(BaseModel):
    url: str
    n_clips: int = 5
    video_url: Optional[str] = None
    audio_url: Optional[str] = None

class ClipExportRequest(BaseModel):
    video_id: str
    start: float
    end: float

class TranscribeRequest(BaseModel):
    youtube_url: str


# ── 1. DOWNLOAD ───────────────────────────────────────────────────────────────

_COOKIES_FILE: Optional[str] = None

def _get_cookies_file() -> Optional[str]:
    global _COOKIES_FILE
    if _COOKIES_FILE and os.path.exists(_COOKIES_FILE):
        return _COOKIES_FILE
    if not YOUTUBE_COOKIES:
        return None
    import tempfile as _tf
    # Railway peut stocker les \n comme littéraux — normalise
    content = YOUTUBE_COOKIES.replace("\\n", "\n")
    f = _tf.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, prefix="yt_cookies_")
    f.write(content)
    f.close()
    _COOKIES_FILE = f.name
    lines = [l for l in content.splitlines() if l and not l.startswith("#")]
    logger.info(f"Cookies écrits → {_COOKIES_FILE} ({len(lines)} cookies)")
    return _COOKIES_FILE


def _resolve_path(ydl: "yt_dlp.YoutubeDL", info: dict, out_dir: Path) -> str:
    path = ydl.prepare_filename(info)
    if not os.path.exists(path):
        stem = os.path.splitext(path)[0]
        for ext in (".mp4", ".mkv", ".webm"):
            if os.path.exists(stem + ext):
                return stem + ext
        # search any mp4 in dir
        for p in out_dir.glob("*.mp4"):
            return str(p)
    return path


def download_from_direct_url(video_url: str, audio_url: Optional[str], out_dir: Path, proxy_url: Optional[str] = None) -> str:
    """Télécharge via URL signée (Innertube) + proxy résidentiel si l'URL est liée à une IP."""
    out_path = str(out_dir / "source.mp4")
    # ffmpeg -http_proxy "http://user:pass@host:port" pour respecter l'IP signataire de l'URL CDN
    proxy_args = ["-http_proxy", proxy_url] if proxy_url else []
    if audio_url:
        cmd = [
            "ffmpeg", "-y", "-loglevel", "error",
            *proxy_args,
            "-i", video_url, "-i", audio_url,
            "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
            "-map", "0:v:0", "-map", "1:a:0",
            out_path,
        ]
    else:
        cmd = [
            "ffmpeg", "-y", "-loglevel", "error",
            *proxy_args,
            "-i", video_url,
            "-c", "copy",
            out_path,
        ]
    r = subprocess.run(cmd, capture_output=True, timeout=300)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg download: {(r.stdout + r.stderr).decode(errors='replace')[:300]}")
    if not os.path.exists(out_path) or os.path.getsize(out_path) < 10_000:
        raise RuntimeError("Fichier téléchargé vide ou manquant")
    size_mb = os.path.getsize(out_path) / 1_048_576
    logger.info(f"Direct download OK: {size_mb:.1f} MB (proxy={'yes' if proxy_url else 'no'})")
    return out_path


def _download_audio_for_transcription(youtube_url: str, out_dir: Path) -> tuple:
    """Télécharge audio via yt-dlp.
    Stratégie 1 : IP Railway + bgutil PoToken (session cohérente, pas de mismatch IP).
    Stratégie 2 : IP résidentielle Webshare + client android/ios (pas de bgutil → pas de mismatch).
    Stratégie 3 : cookies YouTube si configurés (bypass total).
    NE JAMAIS combiner proxy résidentiel + bgutil : le PoToken est lié à l'IP Railway,
    pas à l'IP Webshare → YouTube voit une incohérence et retourne une liste vide.
    """
    import yt_dlp
    cookies_file = _get_cookies_file()

    # Stratégies séparées — ordre de priorité
    attempts = [
        # 1. Railway IP + bgutil (PoToken cohérent avec l'IP de la requête)
        {"proxy": None, "extractor_args": _yt_extractor_args(), "label": "railway+bgutil"},
        # 2. Webshare IP + android/ios (pas de PoToken nécessaire, IP résidentielle)
        *(
            [{"proxy": RESIDENTIAL_PROXY_URL,
              "extractor_args": {"youtube": {"player_client": ["android", "ios"]}},
              "label": "webshare+android"}]
            if RESIDENTIAL_PROXY_URL else []
        ),
        # 3. Railway IP sans bgutil, android/ios seulement
        {"proxy": None, "extractor_args": {"youtube": {"player_client": ["android", "ios"]}}, "label": "railway+android"},
    ]

    audio_formats = ["bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio", "bestaudio/best", "best"]
    last_err = None

    for attempt in attempts:
        for fmt in audio_formats:
            try:
                opts = {
                    "quiet": True, "no_warnings": True,
                    "outtmpl": str(out_dir / "audio.%(ext)s"),
                    "check_formats": False,
                    "no_playlist": True,
                    "extractor_args": attempt["extractor_args"],
                }
                if fmt:
                    opts["format"] = fmt
                if cookies_file:
                    opts["cookiefile"] = cookies_file
                if attempt["proxy"]:
                    opts["proxy"] = attempt["proxy"]
                logger.info(f"yt-dlp audio: {attempt['label']} fmt={fmt}")
                with yt_dlp.YoutubeDL(opts) as ydl:
                    info = ydl.extract_info(youtube_url, download=True)
                    title = (info or {}).get("title", "")
                for p in out_dir.glob("audio.*"):
                    if p.stat().st_size > 1000:
                        logger.info(f"Audio OK [{attempt['label']}]: {p.name} ({p.stat().st_size // 1024} KB)")
                        return str(p), title
            except Exception as e:
                err_str = str(e)
                logger.warning(f"yt-dlp [{attempt['label']}] fmt={fmt} failed: {err_str[:200]}")
                last_err = e
                for p in out_dir.glob("audio.*"):
                    p.unlink(missing_ok=True)
                # Si le proxy résidentiel est cassé, inutile de continuer les formats
                if attempt["proxy"] and ("proxy" in err_str.lower() or "502" in err_str or "tunnel" in err_str.lower()):
                    break

    raise RuntimeError(f"Téléchargement audio échoué: {last_err}")


def download_video(youtube_url: str, out_dir: Path) -> str:
    """Même logique que _download_audio : sépare les stratégies pour éviter mismatch IP/PoToken."""
    import yt_dlp
    cookies_file = _get_cookies_file()
    if cookies_file:
        logger.info("yt-dlp video: cookies actifs")

    attempts = [
        {"proxy": None, "extractor_args": _yt_extractor_args(), "label": "railway+bgutil"},
        *(
            [{"proxy": RESIDENTIAL_PROXY_URL,
              "extractor_args": {"youtube": {"player_client": ["android", "ios"]}},
              "label": "webshare+android"}]
            if RESIDENTIAL_PROXY_URL else []
        ),
        {"proxy": None, "extractor_args": {"youtube": {"player_client": ["android", "ios"]}}, "label": "railway+android"},
    ]

    formats = [
        "bestvideo[height<=720]+bestaudio/bestvideo+bestaudio/best[height<=720]/best",
        "best",
        None,
    ]
    last_err = None

    for attempt in attempts:
        for fmt in formats:
            try:
                opts = {
                    "quiet": True, "no_warnings": True,
                    "outtmpl": str(out_dir / "source_%(id)s.%(ext)s"),
                    "merge_output_format": "mp4",
                    "check_formats": False,
                    "extractor_args": attempt["extractor_args"],
                }
                if cookies_file:
                    opts["cookiefile"] = cookies_file
                if attempt["proxy"]:
                    opts["proxy"] = attempt["proxy"]
                logger.info(f"yt-dlp video: {attempt['label']} fmt={fmt}")
                with yt_dlp.YoutubeDL(opts) as ydl:
                    info = ydl.extract_info(youtube_url, download=True)
                    path = _resolve_path(ydl, info, out_dir)
                if os.path.exists(path) and os.path.getsize(path) > 10_000:
                    logger.info(f"yt-dlp video OK [{attempt['label']}]: {path}")
                    return path
            except Exception as e:
                err_str = str(e)
                logger.warning(f"yt-dlp video [{attempt['label']}] fmt={fmt} failed: {err_str[:200]}")
                last_err = e
                if attempt["proxy"] and ("proxy" in err_str.lower() or "502" in err_str or "tunnel" in err_str.lower()):
                    break

    raise RuntimeError(f"Téléchargement YouTube échoué: {last_err}")


def download_video_section(youtube_url: str, out_dir: Path, start: float, end: float) -> str:
    """Télécharge uniquement la section [start, end] — ~50x plus rapide qu'un téléchargement complet.
    Les timestamps du fichier résultant sont les timestamps originaux de la vidéo.
    crop_clip(path, start, end, out) fonctionne sans modification.
    Fallback vers download_video complet en cas d'échec."""
    import yt_dlp
    cookies_file = _get_cookies_file()

    attempts = [
        {"proxy": None, "extractor_args": _yt_extractor_args(), "label": "railway+bgutil+section"},
        *(
            [{"proxy": RESIDENTIAL_PROXY_URL,
              "extractor_args": {"youtube": {"player_client": ["android", "ios"]}},
              "label": "webshare+android+section"}]
            if RESIDENTIAL_PROXY_URL else []
        ),
        {"proxy": None, "extractor_args": {"youtube": {"player_client": ["android", "ios"]}}, "label": "railway+android+section"},
    ]

    last_err = None
    for attempt in attempts:
        try:
            opts = {
                "quiet": True, "no_warnings": True,
                "outtmpl": str(out_dir / "source_%(id)s.%(ext)s"),
                "merge_output_format": "mp4",
                "check_formats": False,
                "extractor_args": attempt["extractor_args"],
                "download_ranges": yt_dlp.utils.download_range_func(None, [(start, end)]),
            }
            if cookies_file:
                opts["cookiefile"] = cookies_file
            if attempt["proxy"]:
                opts["proxy"] = attempt["proxy"]
            logger.info(f"yt-dlp section {start:.0f}s-{end:.0f}s [{attempt['label']}]")
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(youtube_url, download=True)
                path = _resolve_path(ydl, info, out_dir)
            if os.path.exists(path) and os.path.getsize(path) > 10_000:
                size_mb = os.path.getsize(path) / 1_048_576
                logger.info(f"yt-dlp section OK [{attempt['label']}] {size_mb:.1f}MB: {path}")
                return path
        except Exception as e:
            err_str = str(e)
            logger.warning(f"yt-dlp section [{attempt['label']}] failed: {err_str[:200]}")
            last_err = e
            if attempt["proxy"] and ("proxy" in err_str.lower() or "502" in err_str or "tunnel" in err_str.lower()):
                break

    logger.warning(f"Section download failed ({last_err}), fallback vers téléchargement complet")
    return download_video(youtube_url, out_dir)


# ── 2. TRANSCRIPTION ─────────────────────────────────────────────────────────

def _extract_audio(media_path: str, out_path: str) -> float:
    """Extrait audio en mp3 mono 16kHz 64kbps. Retourne la taille en MB."""
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", media_path,
        "-ar", "16000", "-ac", "1", "-b:a", "64k",
        out_path,
    ]
    r = subprocess.run(cmd, capture_output=True, timeout=120)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg audio: {(r.stdout + r.stderr).decode(errors='replace')[:300]}")
    return Path(out_path).stat().st_size / 1_048_576


async def _transcribe_groq(media_path: str) -> Dict:
    """Transcription via Groq Whisper API — beaucoup plus rapide que local."""
    audio_path = media_path + ".audio.mp3"
    try:
        size_mb = _extract_audio(media_path, audio_path)
        logger.info(f"[groq-whisper] audio extrait: {size_mb:.1f} MB")
        if size_mb > 24:
            raise RuntimeError(f"Audio trop grand pour Groq: {size_mb:.1f} MB")
        async with httpx.AsyncClient(timeout=180) as c:
            with open(audio_path, "rb") as f:
                r = await c.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                    data={"model": "whisper-large-v3", "response_format": "verbose_json"},
                    files={"file": ("audio.mp3", f, "audio/mpeg")},
                )
        r.raise_for_status()
        data = r.json()
        segments = [
            {"start": float(s["start"]), "end": float(s["end"]), "text": s["text"].strip()}
            for s in data.get("segments", [])
        ]
        duration = float(data.get("duration", 0)) or (segments[-1]["end"] if segments else 0.0)
        logger.info(f"[groq-whisper] {len(segments)} segments {duration:.0f}s")
        return {"duration": duration, "segments": segments}
    finally:
        Path(audio_path).unlink(missing_ok=True)


def _transcribe_local(media_path: str) -> Dict:
    from faster_whisper import WhisperModel
    logger.info(f"[whisper-local] model={WHISPER_MODEL} device=cpu")
    model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    segs_iter, info = model.transcribe(
        media_path, beam_size=5, vad_filter=True, condition_on_previous_text=False
    )
    segments = [
        {"start": float(s.start), "end": float(s.end), "text": (s.text or "").strip()}
        for s in segs_iter
    ]
    duration = float(getattr(info, "duration", 0.0)) or (segments[-1]["end"] if segments else 0.0)
    logger.info(f"[whisper-local] {len(segments)} segments {duration:.0f}s")
    return {"duration": duration, "segments": segments}


async def transcribe(media_path: str) -> Dict:
    """Groq Whisper en priorité (rapide), local en fallback."""
    if GROQ_API_KEY:
        try:
            return await _transcribe_groq(media_path)
        except Exception as e:
            logger.warning(f"Groq Whisper failed ({e}) — fallback local")
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, lambda: _transcribe_local(media_path))


# ── 3. HIGHLIGHT DETECTION — SamurAI prompts + Gemini ────────────────────────

_VIRALITY_CRITERIA = """
1. HOOK MOMENTS — statements that create immediate curiosity ("The secret is...", "Nobody talks about...")
2. EMOTIONAL PEAKS — genuine surprise, laughter, anger, vulnerability, excitement
3. OPINION BOMBS — strong, polarizing or counter-intuitive statements
4. REVELATION MOMENTS — surprising facts, stats, or confessions that reframe thinking
5. CONFLICT/TENSION — disagreement, pushback, or a problem being confronted head-on
6. QUOTABLE ONE-LINERS — a sentence that works as a standalone quote card
7. STORY PEAKS — the climax or twist of an anecdote; the payoff moment
8. PRACTICAL VALUE — a concrete tip, hack, or insight the viewer can immediately apply
"""

_CONTENT_TYPE_PROMPT = """Analyze this transcript sample and classify the content type.
Choose one: podcast, interview, tutorial, lecture, commentary, debate, vlog, other.
Also estimate density: low, medium, or high.
Respond ONLY with JSON (no markdown): {"content_type": "...", "density": "..."}"""

_HIGHLIGHT_PROMPT = """You are an elite short-form video editor who has studied thousands of viral clips.

Virality signals (ranked by impact):{virality_criteria}

Content type: {content_type} | Density: {density}

Find the most viral-worthy highlights from this transcript.

Rules:
- Every highlight must open with a strong HOOK that grabs attention within 3 seconds
- Duration sweet spot: 45-90 seconds. Shorter (20-44s) only for a perfect one-liner
- Never cut mid-sentence — each clip must feel complete and self-contained
- Clips must not overlap significantly with each other
- Score 0-100 on viral potential (not general quality)
- Generate at least {min_clips} highlights
- Include hook_sentence (the opening line) and virality_reason (one sentence why this is viral)

Respond ONLY with valid JSON (no markdown, no explanation):
{{"highlights":[{{"title":"string","start_time":float,"end_time":float,"score":int,"hook_sentence":"string","virality_reason":"string"}}]}}"""


async def _gemini(prompt: str) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY manquant")
    async with httpx.AsyncClient(timeout=120) as c:
        r = await c.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}",
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.2, "maxOutputTokens": 8192},
            },
        )
        r.raise_for_status()
        return r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()


def _parse_json(raw: str) -> Dict:
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        s, e = text.find("{"), text.rfind("}")
        if s != -1 and e != -1:
            return json.loads(text[s : e + 1])
        raise


def _dedupe_highlights(highlights: List[Dict]) -> List[Dict]:
    highlights = sorted(highlights, key=lambda h: int(h.get("score", 0)), reverse=True)
    kept: List[Dict] = []
    for h in highlights:
        hs, he = float(h["start_time"]), float(h["end_time"])
        dur = he - hs
        if not any(
            min(he, float(k["end_time"])) - max(hs, float(k["start_time"])) > 0.5 * dur
            for k in kept
        ):
            kept.append(h)
    return kept


async def get_highlights(transcript: Dict, num_clips: int) -> List[Dict]:
    segments = transcript["segments"]

    # Detect content type
    sample = " ".join(s["text"] for s in segments[:25])[:3000]
    try:
        raw = await _gemini(f"{_CONTENT_TYPE_PROMPT}\n\nTranscript sample:\n{sample}")
        content_info = _parse_json(raw)
    except Exception:
        content_info = {"content_type": "other", "density": "medium"}
    logger.info(f"[highlights] content={content_info.get('content_type')} density={content_info.get('density')}")

    # Build transcript text (limit to 12k chars)
    transcript_text = "\n".join(
        f"[{s['start']:.1f}s] {s['text'].strip()}" for s in segments
    )[:12000]

    prompt = (
        _HIGHLIGHT_PROMPT.format(
            virality_criteria=_VIRALITY_CRITERIA,
            content_type=content_info.get("content_type", "other"),
            density=content_info.get("density", "medium"),
            min_clips=max(num_clips * 2, 5),
        )
        + f"\n\nTranscript:\n{transcript_text}"
    )

    raw = await _gemini(prompt)
    data = _parse_json(raw)
    highlights = _dedupe_highlights(data.get("highlights", []))
    logger.info(f"[highlights] {len(highlights)} moments after dedup")
    return highlights


# ── 4. CLIP CROP — SamurAI exact (ffmpeg + OpenCV face tracking) ──────────────

def _cut_subclip(source: str, start: float, end: float, out: str) -> None:
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", source,
        "-ss", f"{start:.3f}", "-to", f"{end:.3f}",
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        "-c:a", "aac", "-b:a", "128k",
        out,
    ]
    r = subprocess.run(cmd, capture_output=True, timeout=120)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg cut: {(r.stdout + r.stderr).decode(errors='replace')[:500]}")


def _get_video_dimensions(in_path: str):
    r = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", in_path],
        capture_output=True, text=True, timeout=30,
    )
    streams = json.loads(r.stdout).get("streams", []) if r.returncode == 0 else []
    v = next((s for s in streams if s.get("codec_type") == "video"), {})
    return int(v.get("width", 1920)), int(v.get("height", 1080))


def _reframe_vertical(in_path: str, out_path: str, aspect_ratio: str = "9:16") -> None:
    tw, th = (float(x) for x in aspect_ratio.split(":"))
    target_ratio = tw / th

    src_w, src_h = _get_video_dimensions(in_path)

    # Calcule le crop 9:16 centré
    if target_ratio < src_w / src_h:
        crop_w = int(src_h * target_ratio)
        crop_h = src_h
    else:
        crop_w = src_w
        crop_h = int(src_w / target_ratio)
    crop_w = max(2, crop_w - crop_w % 2)
    crop_h = max(2, crop_h - crop_h % 2)

    x_default = (src_w - crop_w) // 2
    y0 = (src_h - crop_h) // 2

    # Face tracking dynamique : 1 position par seconde + lissage + expression ffmpeg
    x_expr = str(x_default)
    try:
        import cv2
        cap = cv2.VideoCapture(in_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        duration_sec = max(1, int(total_frames / fps) + 1)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

        # Détecte le centre du visage à chaque seconde
        raw = {}
        for sec in range(duration_sec):
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(sec * fps))
            ret, frame = cap.read()
            if not ret:
                break
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(40, 40))
            if len(faces) > 0:
                fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])
                raw[sec] = fx + fw // 2
        cap.release()

        if raw:
            # Interpolation : remplit les secondes sans visage avec la dernière valeur connue
            filled = []
            last = raw.get(0, x_default + crop_w // 2)
            for s in range(duration_sec):
                if s in raw:
                    last = raw[s]
                filled.append(last)

            # Lissage : moyenne glissante sur 3 secondes pour éviter les sauts brusques
            window = 3
            smoothed = []
            for i in range(len(filled)):
                start, end = max(0, i - window), min(len(filled), i + window + 1)
                cx = int(sum(filled[start:end]) / (end - start))
                smoothed.append(max(0, min(src_w - crop_w, cx - crop_w // 2)))

            # Construit l'expression ffmpeg : if(gte(t,N),xN,...,x0)
            # Réduit à 1 point toutes les 2s pour limiter la longueur de l'expression
            step = max(1, len(smoothed) // 60)
            keypoints = [(i, smoothed[i]) for i in range(0, len(smoothed), step)]
            expr = str(keypoints[0][1])
            for t_sec, x_val in keypoints[1:]:
                expr = f"if(gte(t,{t_sec}),{x_val},{expr})"
            x_expr = expr
            logger.info(f"Face tracking dynamique OK: {len(raw)}/{duration_sec}s détectés, {len(keypoints)} keypoints")
        else:
            logger.info("Face tracking: aucun visage détecté — crop centré")
    except Exception as e:
        logger.info(f"Face tracking skipped ({e}) — crop centré")

    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", in_path,
        "-vf", f"crop={crop_w}:{crop_h}:{x_expr}:{y0}:eval=frame",
        "-c:v", "libx264", "-preset", "fast", "-crf", "22",
        "-c:a", "aac", "-b:a", "128k",
        out_path,
    ]
    r = subprocess.run(cmd, capture_output=True, timeout=300)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg crop: {(r.stdout + r.stderr).decode(errors='replace')[:500]}")


def crop_clip(source: str, start: float, end: float, out: str) -> None:
    cut_tmp = out + ".cut.mp4"
    try:
        _cut_subclip(source, start, end, cut_tmp)
        _reframe_vertical(cut_tmp, out)
    finally:
        if os.path.exists(cut_tmp):
            os.remove(cut_tmp)


# ── 5. JOBS ────────────────────────────────────────────────────────────────────

async def run_generate_shorts(
    job_id: str, url: str, num_clips: int, out_dir: Path,
    video_url: Optional[str] = None, audio_url: Optional[str] = None,
    proxy_url: Optional[str] = None,
) -> None:
    source = None

    def upd(msg: str) -> None:
        JOBS[job_id]["progress"] = msg
        logger.info(f"[{job_id[:8]}] {msg}")

    try:
        upd("Téléchargement…")
        if video_url:
            logger.info(f"Direct URL download (Innertube) proxy={'yes' if proxy_url else 'no'}")
            source = await asyncio.get_event_loop().run_in_executor(
                None, lambda: download_from_direct_url(video_url, audio_url, out_dir, proxy_url)
            )
        else:
            source = await asyncio.get_event_loop().run_in_executor(
                None, lambda: download_video(url, out_dir)
            )

        upd("Transcription Whisper…")
        transcript = await transcribe(source)
        if not transcript["segments"]:
            raise RuntimeError("Aucun segment Whisper — vidéo sans parole ?")

        upd("Analyse Gemini…")
        highlights = await get_highlights(transcript, num_clips)
        if not highlights:
            raise RuntimeError("Aucun moment viral identifié")

        top = sorted(highlights, key=lambda h: int(h.get("score", 0)), reverse=True)[:num_clips]

        clips = []
        for i, h in enumerate(top):
            upd(f"Short {i + 1}/{len(top)}…")
            out_path = str(out_dir / f"short_{i + 1:02d}_{job_id[:8]}.mp4")
            try:
                await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda st=float(h["start_time"]), en=float(h["end_time"]), o=out_path:
                        crop_clip(source, st, en, o),
                )
                size_mb = round(Path(out_path).stat().st_size / 1_048_576, 1)
                clips.append({
                    "title":           h.get("title", f"Short {i + 1}"),
                    "hook":            h.get("hook_sentence", ""),
                    "virality_reason": h.get("virality_reason", ""),
                    "score":           int(h.get("score", 80)),
                    "start":           round(float(h["start_time"]), 1),
                    "end":             round(float(h["end_time"]), 1),
                    "duration":        round(float(h["end_time"]) - float(h["start_time"]), 1),
                    "download_url":    f"/shorts-file/{job_id}/{Path(out_path).name}",
                    "filename":        Path(out_path).name,
                    "size_mb":         size_mb,
                })
                logger.info(f"Short {i + 1} OK  {size_mb} MB")
            except Exception as e:
                logger.error(f"Short {i + 1} FAILED: {e}")

        if source:
            Path(source).unlink(missing_ok=True)

        if not clips:
            raise RuntimeError("Tous les shorts ont échoué")

        JOBS[job_id] = {"status": "done", "clips": clips}

    except Exception as e:
        logger.error(f"Job {job_id[:8]} fatal: {e}")
        if source:
            Path(source).unlink(missing_ok=True)
        JOBS[job_id] = {"status": "error", "error": str(e)}


# ── /clips — identify viral moments (transcript + Gemini, no video render) ────

def _get_video_id(url: str) -> Optional[str]:
    m = re.search(r"(?:v=|youtu\.be/|shorts/)([a-zA-Z0-9_-]{11})", url)
    return m.group(1) if m else None


async def _get_subtitles(video_id: str) -> Optional[Dict]:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        proxies = {"http": RESIDENTIAL_PROXY_URL, "https": RESIDENTIAL_PROXY_URL} if RESIDENTIAL_PROXY_URL else None
        api = YouTubeTranscriptApi(proxies=proxies) if proxies else YouTubeTranscriptApi()
        if hasattr(api, "list"):
            transcript_list = api.list(video_id)
        else:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

        # Essaie fr/en d'abord, puis n'importe quelle langue dispo
        transcript = None
        try:
            transcript = transcript_list.find_transcript(["fr", "en"])
        except Exception:
            all_transcripts = list(transcript_list)
            if all_transcripts:
                transcript = all_transcripts[0]
                logger.info(f"Subtitles: langue fallback → {getattr(transcript, 'language_code', '?')}")

        if transcript is None:
            raise RuntimeError("Aucune piste de sous-titres disponible")

        fetched = transcript.fetch()
        raw = fetched.to_raw_data() if hasattr(fetched, "to_raw_data") else list(fetched)
        segments = [
            {"start": s["start"], "end": s["start"] + s["duration"], "text": s["text"]}
            for s in raw
        ]
        duration = segments[-1]["end"] if segments else 0.0
        logger.info(f"Subtitles OK: {len(segments)} segments")
        return {"duration": duration, "segments": segments}
    except Exception as e:
        logger.warning(f"Subtitles failed: {e}")
        return None


async def _identify_clips(transcript: Dict, n: int) -> List[Dict]:
    if GROQ_API_KEY:
        transcript_text = "\n".join(
            f"[{s['start']:.1f}s-{s['end']:.1f}s] {s['text']}" for s in transcript["segments"]
        )
        prompt = f"""Tu es un expert YouTube Shorts. Analyse cette transcription et identifie les {n} meilleurs moments pour en faire des Shorts viraux.

Pour chaque moment :
- start_time : timestamp début (secondes)
- end_time : timestamp fin (secondes, max 90s après start)
- title : titre accrocheur (max 8 mots)
- hook : première phrase d'accroche
- score : score viralité 0-100

Réponds UNIQUEMENT en JSON valide :
{{"clips":[{{"start_time":12.5,"end_time":67.0,"title":"...","hook":"...","score":88}}]}}

Transcription :
{transcript_text[:8000]}"""
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={"model": "llama-3.3-70b-versatile", "messages": [{"role": "user", "content": prompt}],
                      "temperature": 0.7, "max_tokens": 2048},
            )
            r.raise_for_status()
            raw = r.json()["choices"][0]["message"]["content"].strip()
        data = _parse_json(raw)
        return data.get("clips", [])

    # fallback Gemini
    highlights = await get_highlights(transcript, n)
    return [
        {"start_time": h["start_time"], "end_time": h["end_time"],
         "title": h.get("title", ""), "hook": h.get("hook_sentence", ""),
         "score": h.get("score", 80)}
        for h in highlights[:n]
    ]


async def run_clips(
    session_id: str, url: str, n_clips: int,
    video_url: Optional[str] = None, audio_url: Optional[str] = None,
) -> None:
    try:
        video_id = _get_video_id(url)
        if not video_id:
            raise RuntimeError("URL YouTube invalide")

        transcript = await _get_subtitles(video_id)

        if not transcript:
            out_dir = WORK_DIR / f"cl_{session_id}"
            out_dir.mkdir(parents=True, exist_ok=True)
            if video_url:
                logger.info("Clips: direct URL download (Innertube)")
                source = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: download_from_direct_url(video_url, audio_url, out_dir)
                )
            else:
                source = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: download_video(url, out_dir)
                )
            transcript = await transcribe(source)
            Path(source).unlink(missing_ok=True)

        if not transcript or not transcript["segments"]:
            raise RuntimeError("Impossible d'obtenir la transcription")

        clips = await _identify_clips(transcript, n_clips)
        CLIPS[session_id] = {"status": "done", "result": clips}

    except Exception as e:
        logger.error(f"Clips {session_id[:8]} fatal: {e}")
        CLIPS[session_id] = {"status": "error", "error": str(e)}


# ── /clip-export — download + cut + crop a specific moment ────────────────────

async def run_clip_export(job_id: str, video_id: str, start: float, end: float, out_dir: Path) -> None:
    source = str(out_dir / "source.mp4")
    yt_url = f"https://www.youtube.com/watch?v={video_id}"
    try:
        CLIP_EXPORTS[job_id]["progress"] = "Téléchargement section…"
        section_path = await asyncio.get_event_loop().run_in_executor(
            None, lambda: download_video_section(yt_url, out_dir, start, end)
        )
        # Normalize to source.mp4
        if section_path != source and os.path.exists(section_path):
            Path(section_path).rename(source)

        if not Path(source).exists() or Path(source).stat().st_size < 10_000:
            raise RuntimeError("Téléchargement échoué")

        CLIP_EXPORTS[job_id]["progress"] = "Découpe…"
        out_path = str(out_dir / f"clip_{job_id[:8]}.mp4")
        # Source = section déjà découpée → on reframe directement sans re-couper
        await asyncio.get_event_loop().run_in_executor(
            None, lambda: _reframe_vertical(source, out_path)
        )
        Path(source).unlink(missing_ok=True)
        CLIP_EXPORTS[job_id] = {
            "status": "done",
            "download_url": f"/clip-export-file/{job_id}/{Path(out_path).name}",
        }
    except Exception as e:
        logger.error(f"clip-export {job_id[:8]} fatal: {e}")
        try:
            Path(source).unlink(missing_ok=True)
        except Exception:
            pass
        CLIP_EXPORTS[job_id] = {"status": "error", "error": str(e)}


# ── ENDPOINTS ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "gemini": bool(GEMINI_API_KEY), "whisper": WHISPER_MODEL}


@app.get("/test-formats")
def test_formats(video_id: str = "NwlPz4RaZ8s"):
    """Debug: liste les formats yt-dlp disponibles avec PoToken."""
    import yt_dlp
    output = []
    class LogCollector:
        def debug(self, msg): output.append(msg)
        def warning(self, msg): output.append(f"WARN: {msg}")
        def error(self, msg): output.append(f"ERR: {msg}")
    opts = {
        "quiet": False, "no_warnings": False,
        "listformats": True,
        "extractor_args": _yt_extractor_args(),
        "logger": LogCollector(),
    }
    cookies_file = _get_cookies_file()
    if cookies_file:
        opts["cookiefile"] = cookies_file
    if RESIDENTIAL_PROXY_URL:
        opts["proxy"] = RESIDENTIAL_PROXY_URL
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
    except Exception as e:
        output.append(f"EXCEPTION: {e}")
    return {"bgutil_url": BGUTIL_URL, "logs": output[:80]}


@app.post("/transcribe-segments")
async def transcribe_segments_endpoint(req: TranscribeRequest, _=Depends(auth)):
    """yt-dlp (proxy) + Groq Whisper → segments horodatés. Fallback quand sous-titres YouTube indispos."""
    if "youtube.com" not in req.youtube_url and "youtu.be" not in req.youtube_url:
        raise HTTPException(400, "URL YouTube invalide")
    job_dir = WORK_DIR / f"ts_{uuid.uuid4().hex[:8]}"
    job_dir.mkdir(parents=True, exist_ok=True)
    try:
        logger.info(f"[transcribe-segments] download {req.youtube_url}")
        source, title = await asyncio.get_event_loop().run_in_executor(
            None, lambda: _download_audio_for_transcription(req.youtube_url, job_dir)
        )
        logger.info(f"[transcribe-segments] transcription '{title}'")
        transcript = await transcribe(source)
        if not transcript["segments"]:
            raise HTTPException(502, "Aucun segment — vidéo sans paroles")
        logger.info(f"[transcribe-segments] {len(transcript['segments'])} segments, {transcript['duration']:.0f}s")
        return {"ok": True, "segments": transcript["segments"], "duration": transcript["duration"], "title": title}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[transcribe-segments] erreur: {e}")
        raise HTTPException(502, str(e))
    finally:
        import shutil
        shutil.rmtree(str(job_dir), ignore_errors=True)


@app.post("/generate-shorts")
async def generate_shorts(req: GenerateRequest, tasks: BackgroundTasks, _=Depends(auth)):
    if "youtube.com" not in req.youtube_url and "youtu.be" not in req.youtube_url:
        raise HTTPException(400, "URL YouTube invalide")
    job_id  = str(uuid.uuid4())[:12]
    out_dir = WORK_DIR / job_id
    out_dir.mkdir(parents=True, exist_ok=True)
    JOBS[job_id] = {"status": "processing", "progress": "Démarrage…"}
    tasks.add_task(run_generate_shorts, job_id, req.youtube_url, min(max(1, req.num_clips), 5), out_dir, req.video_url, req.audio_url, req.proxy_url)
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


@app.post("/clips")
async def clips(req: ClipsRequest, tasks: BackgroundTasks, _=Depends(auth)):
    session_id = str(uuid.uuid4())[:12]
    CLIPS[session_id] = {"status": "processing"}
    tasks.add_task(run_clips, session_id, req.url, min(max(1, req.n_clips), 10), req.video_url, req.audio_url)
    return {"session_id": session_id}


@app.get("/status/{session_id}")
def clips_status(session_id: str, _=Depends(auth)):
    job = CLIPS.get(session_id)
    if not job:
        raise HTTPException(404, "Session introuvable")
    return job


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
