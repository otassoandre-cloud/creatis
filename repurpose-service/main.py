"""
Créatis — Clips Viraux + Shorts Generator
Railway deployment

Identification (existant, fonctionnel) :
  POST /clips { url, n_clips=5 }       → { session_id }
  GET  /status/{session_id}            → { status, result }
  GET  /download/{session}/{file}      → FileResponse mp4

Génération Shorts — SamurAI pipeline :
  POST /generate-shorts { youtube_url, num_clips=3 } → { job_id }
  GET  /shorts-status/{job_id}                       → { status, progress, clips? }
  GET  /shorts-file/{job_id}/{filename}              → FileResponse mp4

GET  /health                           → { status }
"""

import os, uuid, json, tempfile, logging, asyncio, shutil, re, subprocess, base64
from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import yt_dlp

logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
logger = logging.getLogger("creatis")

# ── Config ────────────────────────────────────────────────────────────────────
SERVICE_SECRET        = os.environ.get("REPURPOSE_SERVICE_SECRET", "")
GEMINI_API_KEY        = os.environ.get("GEMINI_API_KEY", "")
GROQ_API_KEY          = os.environ.get("GROQ_API_KEY", "")
WHISPER_MODEL         = os.environ.get("WHISPER_MODEL", "tiny")
YOUTUBE_COOKIES_B64   = os.environ.get("YOUTUBE_COOKIES_B64", "")
COBALT_API_KEY        = os.environ.get("COBALT_API_KEY", "")

WORK_DIR = Path(tempfile.gettempdir()) / "creatis_work"
WORK_DIR.mkdir(exist_ok=True)

# Job stores en mémoire
CLIPS_JOBS:  dict = {}
SHORTS_JOBS: dict = {}

# ── Cookies YouTube ───────────────────────────────────────────────────────────
_COOKIE_FILE: Optional[str] = None
if YOUTUBE_COOKIES_B64:
    try:
        _cookie_path = str(WORK_DIR / "yt_cookies.txt")
        with open(_cookie_path, "w") as _f:
            _f.write(base64.b64decode(YOUTUBE_COOKIES_B64).decode("utf-8"))
        _COOKIE_FILE = _cookie_path
        logger.info(f"Cookies YouTube (B64) chargés ✓")
    except Exception as _e:
        logger.warning(f"Erreur cookies B64: {_e}")

# ── App & auth ─────────────────────────────────────────────────────────────────
app = FastAPI(title="Créatis Service", version="5.0.0")
security = HTTPBearer(auto_error=False)

def verify_secret(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if SERVICE_SECRET and (not creds or creds.credentials != SERVICE_SECRET):
        raise HTTPException(401, "Non autorisé")

# ── Models ────────────────────────────────────────────────────────────────────
class ClipsRequest(BaseModel):
    url: str
    n_clips: int = 5

class GenerateRequest(BaseModel):
    youtube_url: str
    num_clips: int = 3

class TranscribeRequest(BaseModel):
    url: str

# ── Helpers yt-dlp ────────────────────────────────────────────────────────────
COBALT_INSTANCES = [
    "https://cobalt.imput.net", "https://cobalt.catvibers.me",
    "https://cob.vert.run", "https://api.cobalt.tools",
]
INVIDIOUS_INSTANCES = [
    "https://inv.nadeko.net", "https://invidious.nerdvpn.de",
    "https://yt.artemislena.eu", "https://invidious.flokinet.to",
]

def _yt_opts(**extra) -> dict:
    opts = {"quiet": False, "no_warnings": False, **extra}
    if _COOKIE_FILE:
        opts["cookiefile"] = _COOKIE_FILE
    return opts

def _extract_video_id(url: str) -> Optional[str]:
    for pat in [r"[?&]v=([a-zA-Z0-9_-]{11})", r"youtu\.be/([a-zA-Z0-9_-]{11})", r"shorts/([a-zA-Z0-9_-]{11})"]:
        m = re.search(pat, url)
        if m:
            return m.group(1)
    return None

def _get_video_meta(video_id: str) -> tuple[str, int]:
    import requests as req_lib
    title, duration = "Vidéo YouTube", 0
    try:
        r = req_lib.get(f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json", timeout=8)
        if r.status_code == 200:
            title = r.json().get("title", title)
            logger.info(f"oEmbed OK: '{title}'")
    except Exception as e:
        logger.warning(f"oEmbed: {e}")
    for inst in INVIDIOUS_INSTANCES:
        try:
            r = req_lib.get(f"{inst}/api/v1/videos/{video_id}", timeout=8)
            if r.status_code == 200:
                d = r.json()
                if not title or title == "Vidéo YouTube":
                    title = d.get("title", title)
                duration = int(d.get("lengthSeconds", 0))
                break
        except Exception:
            continue
    return title, duration

def _get_invidious_stream(url: str) -> tuple[str, str, int]:
    import requests as req_lib
    video_id = _extract_video_id(url)
    if not video_id:
        raise RuntimeError("ID vidéo YouTube invalide")

    cobalt_headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if COBALT_API_KEY:
        cobalt_headers["Authorization"] = f"Api-Key {COBALT_API_KEY}"
    for cobalt in COBALT_INSTANCES:
        try:
            r = req_lib.post(f"{cobalt}/", json={"url": url, "videoQuality": "360"}, headers=cobalt_headers, timeout=15)
            if r.status_code == 200:
                data = r.json()
                if data.get("status") in ("stream", "redirect", "tunnel") and data.get("url"):
                    title, dur = _get_video_meta(video_id)
                    return data["url"], title, dur
        except Exception as e:
            logger.warning(f"cobalt {cobalt}: {e}")

    for inst in INVIDIOUS_INSTANCES:
        try:
            r = req_lib.get(f"{inst}/api/v1/videos/{video_id}", timeout=12)
            if r.status_code != 200:
                continue
            d = r.json()
            title = d.get("title", "Vidéo YouTube")
            dur = int(d.get("lengthSeconds", 0))
            fmts = d.get("formatStreams", [])
            itag = next((str(f.get("itag")) for f in fmts if str(f.get("itag")) == "18"), None)
            if not itag and fmts:
                itag = str(fmts[0].get("itag", "18"))
            return f"{inst}/latest_version?id={video_id}&itag={itag or '18'}&local=true", title, dur
        except Exception as e:
            logger.warning(f"Invidious {inst}: {e}")

    raise RuntimeError("Service vidéo indisponible")

def download_audio_only(url: str, out_dir: str) -> tuple[str, str, int]:
    stream_url, title, duration = _get_invidious_stream(url)
    out_path = f"{out_dir}/audio.mp3"
    cmd = ["ffmpeg", "-i", stream_url, "-t", "1200", "-vn", "-ar", "16000", "-ac", "1", "-b:a", "64k", "-y", out_path]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg audio: {r.stderr[-300:]}")
    return out_path, title, duration

# ── Sous-titres YouTube ───────────────────────────────────────────────────────
def _get_subtitles_fast(url: str) -> Optional[tuple[list[dict], str, int]]:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound
    except ImportError:
        return None
    try:
        video_id = _extract_video_id(url)
        if not video_id:
            return None
        tlist = YouTubeTranscriptApi.list_transcripts(video_id)
        transcript = None
        try:
            transcript = tlist.find_generated_transcript(["fr", "fr-FR", "en", "en-US"])
        except NoTranscriptFound:
            try:
                transcript = tlist.find_manually_created_transcript(["fr", "fr-FR", "en", "en-US"])
            except NoTranscriptFound:
                for t in tlist:
                    transcript = t
                    break
        if not transcript:
            return None
        data = transcript.fetch()
        segs, duration = [], 0
        for item in data:
            start = round(float(item.get("start", 0)), 2)
            end = round(start + float(item.get("duration", 2.0)), 2)
            text = str(item.get("text", "")).replace("\n", " ").strip()
            if text:
                segs.append({"start": start, "end": end, "text": text})
            duration = max(duration, int(end))
        if len(segs) < 10:
            return None
        logger.info(f"Sous-titres OK — {len(segs)} segments, {transcript.language_code}")
        return segs, "Vidéo YouTube", duration
    except Exception as e:
        logger.warning(f"Sous-titres indisponibles: {e}")
        return None

# ── Transcription Whisper ─────────────────────────────────────────────────────
def _transcribe_words_groq(audio_path: str) -> list[dict]:
    import requests as req_lib
    logger.info("Groq Whisper word-timestamps…")
    with open(audio_path, "rb") as f:
        r = req_lib.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            files={"file": (os.path.basename(audio_path), f, "audio/mpeg")},
            data={"model": "whisper-large-v3-turbo", "response_format": "verbose_json", "timestamp_granularities[]": "word"},
            timeout=180,
        )
    r.raise_for_status()
    data = r.json()
    words = []
    for w in data.get("words", []):
        word = w.get("word", "").strip()
        if word:
            words.append({"word": word, "start": round(float(w["start"]), 3), "end": round(float(w["end"]), 3)})
    logger.info(f"Groq Whisper OK — {len(words)} mots")
    return words

def _words_to_segments(words: list[dict]) -> list[dict]:
    if not words:
        return []
    segs, cur, cur_start = [], [], words[0]["start"]
    for w in words:
        cur.append(w["word"])
        if len(cur) >= 8 or w["end"] - cur_start > 5:
            segs.append({"start": cur_start, "end": w["end"], "text": " ".join(cur).strip()})
            cur, cur_start = [], w["end"]
    if cur:
        segs.append({"start": cur_start, "end": words[-1]["end"], "text": " ".join(cur).strip()})
    return segs

def _words_to_caption_segs(words: list[dict], clip_start: float, clip_end: float) -> list[dict]:
    clip_words = [w for w in words if clip_start <= w["start"] < clip_end]
    caps = []
    for j in range(0, len(clip_words), 3):
        group = clip_words[j:j+3]
        caps.append({
            "start": round(group[0]["start"] - clip_start, 3),
            "end":   round(group[-1]["end"] - clip_start, 3),
            "text":  " ".join(w["word"] for w in group).strip(),
        })
    return caps

def segments_to_text(segs: list[dict]) -> str:
    return " ".join(s["text"] for s in segs if s["text"])

# ── Gemini & Groq : identification moments viraux ─────────────────────────────
async def _gemini_call(payload: dict, timeout: int = 60) -> Optional[str]:
    models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"]
    async with httpx.AsyncClient(timeout=timeout) as client:
        for model in models:
            try:
                r = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}",
                    json=payload,
                )
                if r.status_code == 429:
                    await asyncio.sleep(8)
                    continue
                if r.status_code in (400, 404):
                    continue
                r.raise_for_status()
                candidates = r.json().get("candidates", [])
                if candidates:
                    return candidates[0]["content"]["parts"][0]["text"].strip()
            except Exception as e:
                logger.warning(f"Gemini {model}: {e}")
    return None

async def identify_moments_groq(segments: list[dict], title: str, n: int, video_duration: int) -> list[dict]:
    if not GROQ_API_KEY:
        return []
    if segments:
        formatted = "\n".join(f"[{int(s['start']//60):02d}:{int(s['start']%60):02d}] {s['text']}" for s in segments[:300])
        prompt = f"""Tu es expert en viralité TikTok/YouTube Shorts.
Vidéo : "{title}" (durée: {video_duration}s)
Transcription :
{formatted}

Identifie exactement {n} moments viraux de 45-90 secondes chacun.
Réponds UNIQUEMENT en JSON valide :
{{"clips":[{{"start":<float>,"end":<float>,"hook":"<accroche max 10 mots>","why":"<1 phrase>","score":<1-100>}}]}}
Contraintes : durée 45-90s, pas de chevauchement, trié par score décroissant."""
    else:
        dur_min = video_duration // 60
        prompt = f"""Tu es expert en viralité TikTok/YouTube Shorts.
Vidéo YouTube : "{title}" ({dur_min} min = {video_duration}s)
Sans transcription, génère {n} moments viraux probables de 45-90 secondes.
Réponds UNIQUEMENT en JSON valide :
{{"clips":[{{"start":<float>,"end":<float>,"hook":"<accroche <10 mots>","why":"<1 phrase>","score":<1-100>}}]}}
Contraintes : durée 45-90s, pas de chevauchement, couvrir toute la vidéo."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={"model": "llama-3.3-70b-versatile", "messages": [{"role": "user", "content": prompt}],
                      "temperature": 0.3, "max_tokens": 1024},
            )
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"].strip()
        m = re.search(r'\{[\s\S]*\}', text)
        if m:
            data = json.loads(m.group())
            clips = [c for c in data.get("clips", []) if 30 <= float(c.get("end", 0)) - float(c.get("start", 0)) <= 95]
            if clips:
                logger.info(f"Groq identify ✓ {len(clips)} moments")
                return sorted(clips, key=lambda x: x.get("score", 0), reverse=True)[:n]
    except Exception as e:
        logger.warning(f"Groq identify: {e}")
    return []

async def gemini_analyze_video(url: str, n: int) -> Optional[dict]:
    if not GEMINI_API_KEY:
        return None
    video_id = _extract_video_id(url)
    yt_url = f"https://www.youtube.com/watch?v={video_id}" if video_id else url
    prompt = f"""Tu es expert en viralité TikTok/YouTube Shorts.
Regarde cette vidéo YouTube et identifie exactement {n} moments viraux de 30-60 secondes.
Réponds UNIQUEMENT en JSON valide :
{{"title":"<titre>","duration":<durée totale secondes>,"clips":[{{"start":<float>,"end":<float>,"hook":"<accroche <10 mots>","why":"<1 phrase>","score":<1-100>,"transcript":"<texte>","caption_segments":[{{"start":<float relatif>,"end":<float>,"text":"<3-6s>"}}]}}]}}
Clips triés par score décroissant, pas de chevauchement."""
    text = await _gemini_call({
        "contents": [{"parts": [
            {"fileData": {"fileUri": yt_url, "mimeType": "video/mp4"}},
            {"text": prompt},
        ]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 4096},
    }, timeout=120)
    if not text:
        return None
    try:
        m = re.search(r'\{[\s\S]*\}', text)
        if not m:
            return None
        data = json.loads(m.group())
        if not data.get("clips"):
            return None
        logger.info(f"Gemini video analyze ✓ {len(data['clips'])} clips")
        return {"title": data.get("title", "Vidéo YouTube"), "duration": int(data.get("duration", 0)), "clips": data["clips"]}
    except Exception as e:
        logger.warning(f"Parse Gemini video: {e}")
    return None

def _fallback_moments(segments: list[dict], n: int, total: int) -> list[dict]:
    if total <= 0:
        total = 600
    clip_len, step = 45.0, max(75, total / (n + 1))
    return [{"start": min(30.0 + i * step, total - clip_len - 5), "end": min(30.0 + i * step + clip_len, total - 5),
             "hook": f"Moment clé {i+1}", "why": "Sélection auto", "score": 80 - i * 5}
            for i in range(n)]

def cleanup_old_sessions():
    import time
    now = time.time()
    for d in WORK_DIR.iterdir():
        if not d.is_dir():
            continue
        ttl = 7200 if d.name.startswith(("shorts_", "clips_")) else 3600
        if now - d.stat().st_mtime > ttl:
            shutil.rmtree(d, ignore_errors=True)

# ── Pipeline /clips (identification seule — fonctionnel) ─────────────────────
async def process_clips_job(session_id: str, url: str, n: int, session_dir: Path):
    sid = session_id[:8]
    try:
        video_id = _extract_video_id(url)
        title, video_duration, moments = "Vidéo YouTube", 600, []

        try:
            meta_title, meta_dur = await asyncio.get_event_loop().run_in_executor(None, lambda: _get_video_meta(video_id))
            if meta_title and meta_title != "Vidéo YouTube":
                title = meta_title
            if meta_dur > 0:
                video_duration = meta_dur
        except Exception as e:
            logger.warning(f"[{sid}] méta: {e}")

        CLIPS_JOBS[session_id]["progress"] = "Récupération des sous-titres…"
        segments, word_transcript = [], []

        try:
            sub_result = await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(None, lambda: _get_subtitles_fast(url)),
                timeout=12,
            )
            if sub_result:
                segments, _, dur2 = sub_result
                if dur2 > 0:
                    video_duration = dur2
        except asyncio.TimeoutError:
            logger.warning(f"[{sid}] timeout sous-titres")

        if not segments and GROQ_API_KEY:
            CLIPS_JOBS[session_id]["progress"] = "Transcription audio (Whisper)…"
            try:
                whis_tmp = tempfile.mkdtemp()
                audio_path, _, dur2 = await asyncio.get_event_loop().run_in_executor(None, lambda: download_audio_only(url, whis_tmp))
                if dur2 > 0:
                    video_duration = dur2
                word_transcript = await asyncio.get_event_loop().run_in_executor(None, lambda: _transcribe_words_groq(audio_path))
                segments = _words_to_segments(word_transcript)
            except Exception as e:
                logger.warning(f"[{sid}] Whisper: {e}")
            finally:
                shutil.rmtree(whis_tmp, ignore_errors=True)

        CLIPS_JOBS[session_id]["progress"] = "Analyse Groq…"
        moments = await identify_moments_groq(segments, title, n, video_duration)

        if not moments:
            CLIPS_JOBS[session_id]["progress"] = "Analyse Gemini…"
            video_result = await gemini_analyze_video(url, n)
            if video_result:
                title = video_result["title"] or title
                video_duration = video_result["duration"] or video_duration
                moments = video_result["clips"]

        if not moments:
            moments = _fallback_moments([], n, video_duration)

        clips_result = []
        for moment in moments:
            clip_start = float(moment["start"])
            clip_end = float(moment["end"])
            if word_transcript:
                caps = _words_to_caption_segs(word_transcript, clip_start, clip_end)
            elif segments:
                caps = [{"start": round(s["start"] - clip_start, 2), "end": round(s["end"] - clip_start, 2), "text": s["text"]}
                        for s in segments if clip_start <= s["start"] < clip_end]
            else:
                caps = moment.get("caption_segments", [])
            clips_result.append({
                "hook": str(moment.get("hook", ""))[:80],
                "why": str(moment.get("why", ""))[:200],
                "score": int(moment.get("score", 80)),
                "start": clip_start,
                "end": clip_end,
                "duration": round(clip_end - clip_start, 1),
                "transcript": str(moment.get("transcript", ""))[:300],
                "video_id": video_id,
                "youtube_url": f"https://www.youtube.com/watch?v={video_id}&t={int(clip_start)}s",
                "embed_url": f"https://www.youtube.com/embed/{video_id}?start={int(clip_start)}&end={int(clip_end)}&rel=0",
                "caption_segments": caps,
            })

        CLIPS_JOBS[session_id] = {
            "status": "done", "progress": None, "error": None,
            "result": {"ok": True, "title": title, "duration": video_duration,
                       "video_id": video_id, "session_id": session_id, "clips": clips_result},
        }
        logger.info(f"[{sid}] clips terminés — {len(clips_result)} clips")

    except Exception as e:
        shutil.rmtree(session_dir, ignore_errors=True)
        logger.error(f"[{sid}] erreur fatale: {e}")
        CLIPS_JOBS[session_id] = {"status": "error", "error": str(e), "progress": None, "result": None}

# ── Pipeline /generate-shorts (SamurAI) ───────────────────────────────────────

def _download_video_full(url: str, out_dir: Path) -> tuple[str, str, int]:
    """Télécharge la vidéo YouTube complète via yt-dlp. Retourne (path, title, duration_s)."""
    video_id = _extract_video_id(url) or "video"
    out_tpl = str(out_dir / f"source_{video_id}.%(ext)s")
    ydl_opts = _yt_opts(
        format=(
            "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]"
            "/best[height<=720][ext=mp4]/best[height<=720]/best"
        ),
        outtmpl=out_tpl,
        merge_output_format="mp4",
        noprogress=True,
    )
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        title = info.get("title", "Vidéo YouTube")
        duration = int(info.get("duration", 0))

    for ext in ["mp4", "mkv", "webm"]:
        p = out_dir / f"source_{video_id}.{ext}"
        if p.exists() and p.stat().st_size > 10_000:
            logger.info(f"[yt-dlp] {p.name} ({p.stat().st_size // 1024}Ko)")
            return str(p), title, duration
    raise RuntimeError("yt-dlp: aucun fichier produit")

def _transcribe_local(video_path: str) -> tuple[list[dict], str]:
    """Transcription locale via faster-whisper. Retourne (segments, langue)."""
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise RuntimeError("faster-whisper non installé — ajouter au requirements.txt")
    model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    segs_iter, info = model.transcribe(video_path, beam_size=1, word_timestamps=True)
    segs = []
    for s in segs_iter:
        segs.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()})
    logger.info(f"[whisper] {len(segs)} segments, lang={info.language}")
    return segs, info.language

async def _find_moments_gemini(segments: list[dict], duration: int, n: int) -> list[dict]:
    """Gemini Flash : sélectionne les N meilleurs moments viraux."""
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY manquant")
    transcript = "\n".join(f"[{s['start']:.1f}s-{s['end']:.1f}s] {s['text']}" for s in segments)
    prompt = f"""Tu es expert en viralité YouTube Shorts.
Analyse cette transcription et sélectionne les {n} meilleurs moments pour créer des Shorts viraux.

Règles : chaque moment dure 45-60s, commence par un hook fort, est auto-portant (compréhensible sans contexte).
Réponds UNIQUEMENT en JSON valide sans markdown :
{{"moments":[{{"start":<float>,"end":<float>,"hook":"<accroche 6-10 mots>","score":<0-100>}}]}}

Transcription (durée totale : {duration}s) :
{transcript[:8000]}"""

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={GEMINI_API_KEY}",
            json={"contents": [{"parts": [{"text": prompt}]}]},
        )
        r.raise_for_status()
        raw = r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()

    raw = re.sub(r"^```json\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
    moments = json.loads(raw)["moments"]

    result = []
    for m in moments[:n]:
        start = max(0.0, float(m.get("start", 0)))
        end = float(m.get("end", start + 55))
        end = min(max(end, start + 20), start + 90)
        result.append({"start": start, "end": min(end, float(duration)), "hook": str(m.get("hook", ""))[:100], "score": int(m.get("score", 80))})
    logger.info(f"[gemini] {len(result)} moments identifiés")
    return result

def _detect_face_x(video_path: str, src_w: int) -> int:
    """Position X moyenne du visage sur 10 frames via OpenCV Haar cascade."""
    try:
        import cv2
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        total = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        dur = total / fps if fps else 30
        cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        n = min(10, max(3, int(dur)))
        xs = []
        for i in range(n):
            cap.set(cv2.CAP_PROP_POS_MSEC, (dur / n) * i * 1000)
            ret, frame = cap.read()
            if not ret:
                continue
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = cascade.detectMultiScale(gray, 1.1, 5, minSize=(40, 40))
            if len(faces) > 0:
                f = max(faces, key=lambda x: x[2] * x[3])
                xs.append(f[0] + f[2] // 2)
        cap.release()
        if xs:
            avg = int(sum(xs) / len(xs))
            logger.info(f"[face] x={avg} ({len(xs)}/{n} frames)")
            return avg
    except Exception as e:
        logger.warning(f"[face] OpenCV erreur: {e}")
    return src_w // 2

def _get_dimensions(path: str) -> tuple[int, int]:
    """(width, height) via ffprobe."""
    try:
        cmd = ["ffprobe", "-v", "error", "-select_streams", "v:0",
               "-show_entries", "stream=width,height", "-of", "csv=p=0", path]
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=15).stdout.strip()
        w, h = out.split(",")
        return int(w), int(h)
    except Exception as e:
        logger.warning(f"[ffprobe] {e} → fallback 1920x1080")
        return 1920, 1080

def _make_srt(segments: list[dict], clip_start: float, clip_end: float) -> str:
    """SRT depuis segments Whisper, timestamps relatifs au clip."""
    def ts(s: float) -> str:
        s = max(0.0, float(s))
        ms = int((s % 1) * 1000)
        si = int(s)
        return f"{si//3600:02d}:{(si%3600)//60:02d}:{si%60:02d},{ms:03d}"
    lines, idx = [], 1
    for seg in segments:
        if seg["start"] < clip_start or seg["start"] >= clip_end:
            continue
        t0 = round(seg["start"] - clip_start, 2)
        t1 = round(min(seg["end"], clip_end) - clip_start, 2)
        text = seg["text"].strip()
        if not text or t1 <= t0:
            continue
        lines.append(f"{idx}\n{ts(t0)} --> {ts(t1)}\n{text}\n")
        idx += 1
    return "\n".join(lines)

def _ffmpeg(cmd: list, timeout: int = 300, label: str = "") -> None:
    """Lance ffmpeg. Raise RuntimeError avec les 1500 premiers chars de stderr si échec."""
    logger.info(f"[ffmpeg{' '+label if label else ''}] {' '.join(str(x) for x in cmd[:10])}…")
    r = subprocess.run(cmd, capture_output=True, timeout=timeout)
    if r.returncode != 0:
        err = (r.stdout.decode(errors="replace") + r.stderr.decode(errors="replace"))[:1500]
        raise RuntimeError(f"ffmpeg {label} (rc={r.returncode}): {err}")

def _extract_segment(source: str, start: float, duration: float, out: str) -> None:
    _ffmpeg([
        "ffmpeg", "-y",
        "-ss", str(start), "-i", source,
        "-t", str(duration),
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18",
        "-c:a", "aac", "-b:a", "128k",
        out,
    ], timeout=120, label="extract")

def _crop_9_16(raw: str, out: str, face_x: int, srt_path: Optional[str] = None) -> None:
    """Recadre le clip brut en 9:16 centré sur le visage + captions optionnelles."""
    src_w, src_h = _get_dimensions(raw)

    if src_h > src_w:
        # Vidéo déjà portrait : scale direct sans crop
        vf = "scale=1080:1920:flags=lanczos,setsar=1"
    else:
        # Landscape → bande verticale centrée sur le visage
        crop_w = int(src_h * 9 / 16)
        crop_w = min(crop_w, src_w)
        crop_w -= crop_w % 2  # pair pour YUV420
        x_off = max(0, min(face_x - crop_w // 2, src_w - crop_w))
        x_off -= x_off % 2
        vf = f"crop={crop_w}:{src_h}:{x_off}:0,scale=1080:1920:flags=lanczos,setsar=1"

    if srt_path and Path(srt_path).exists() and Path(srt_path).stat().st_size > 10:
        esc = srt_path.replace("\\", "/").replace(":", "\\:")
        style = "FontSize=22,Bold=1,Alignment=2,MarginV=80,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=3,Shadow=1"
        vf += f",subtitles='{esc}':force_style='{style}'"

    logger.info(f"[crop] src={src_w}x{src_h} vf={vf[:100]}")
    _ffmpeg([
        "ffmpeg", "-y", "-i", raw,
        "-vf", vf,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        out,
    ], timeout=300, label="crop")

async def process_shorts_job(job_id: str, youtube_url: str, num_clips: int, out_dir: Path):
    jid = job_id[:8]
    source_path = None

    def upd(msg: str):
        SHORTS_JOBS[job_id] = {**SHORTS_JOBS.get(job_id, {}), "status": "processing", "progress": msg}
        logger.info(f"[shorts {jid}] {msg}")

    try:
        # 1. Téléchargement
        upd("Téléchargement de la vidéo…")
        source_path, title, duration = await asyncio.get_event_loop().run_in_executor(
            None, lambda: _download_video_full(youtube_url, out_dir)
        )

        # 2. Transcription Whisper locale
        upd("Transcription audio (Whisper)…")
        segments, lang = await asyncio.get_event_loop().run_in_executor(
            None, lambda: _transcribe_local(source_path)
        )
        if not segments:
            raise RuntimeError("Transcription vide — vidéo sans parole ?")

        # 3. Identification moments viraux
        upd("Analyse des moments viraux (Gemini)…")
        try:
            moments = await _find_moments_gemini(segments, duration, num_clips)
        except Exception as e:
            logger.warning(f"[shorts {jid}] Gemini échoué ({e}), fallback Groq")
            moments = await identify_moments_groq(segments, title, num_clips, duration)
        if not moments:
            moments = _fallback_moments(segments, num_clips, duration)

        # 4. Génération des shorts
        clips = []
        for i, moment in enumerate(moments):
            clip_n = i + 1
            upd(f"Génération Short {clip_n}/{len(moments)}…")

            start   = max(0.0, float(moment["start"]))
            end     = min(float(moment["end"]), float(duration))
            dur     = end - start

            if dur < 10:
                logger.warning(f"[shorts {jid}] Short {clip_n} trop court ({dur:.1f}s), skip")
                continue

            raw_path   = out_dir / f"raw_{clip_n}.mp4"
            short_path = out_dir / f"short_{clip_n}_{jid}.mp4"
            srt_path   = out_dir / f"caps_{clip_n}.srt"

            try:
                # a. Extraire le segment brut
                await asyncio.get_event_loop().run_in_executor(
                    None, lambda s=str(raw_path), ss=start, d=dur: _extract_segment(source_path, ss, d, s)
                )
                if not raw_path.exists() or raw_path.stat().st_size < 1000:
                    raise RuntimeError("Segment extrait vide")

                # b. Générer le SRT
                srt_content = _make_srt(segments, start, end)
                if srt_content.strip():
                    srt_path.write_text(srt_content, encoding="utf-8")

                # c. Face tracking
                src_w, _ = _get_dimensions(str(raw_path))
                face_x = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: _detect_face_x(str(raw_path), src_w)
                )

                # d. Crop 9:16 + captions
                srt_arg = str(srt_path) if srt_path.exists() and srt_path.stat().st_size > 10 else None
                await asyncio.get_event_loop().run_in_executor(
                    None, lambda f=face_x, s=srt_arg: _crop_9_16(str(raw_path), str(short_path), f, s)
                )
                raw_path.unlink(missing_ok=True)

                if not short_path.exists() or short_path.stat().st_size < 1000:
                    raise RuntimeError("Short vide après traitement")

                size_mb = round(short_path.stat().st_size / 1_048_576, 1)
                clips.append({
                    "hook":         moment["hook"],
                    "score":        moment["score"],
                    "start":        round(start, 1),
                    "end":          round(end, 1),
                    "duration":     round(dur, 1),
                    "download_url": f"/shorts-file/{job_id}/{short_path.name}",
                    "filename":     short_path.name,
                    "size_mb":      size_mb,
                })
                logger.info(f"[shorts {jid}] Short {clip_n} OK ({size_mb}Mo)")

            except Exception as e:
                logger.error(f"[shorts {jid}] Short {clip_n} erreur: {e}")
                raw_path.unlink(missing_ok=True)

        if source_path:
            Path(source_path).unlink(missing_ok=True)

        if not clips:
            raise RuntimeError("Aucun Short produit — tous les clips ont échoué")

        SHORTS_JOBS[job_id] = {"status": "done", "title": title, "clips": clips}
        logger.info(f"[shorts {jid}] Terminé — {len(clips)} shorts")

    except Exception as e:
        logger.error(f"[shorts {jid}] Erreur fatale: {e}")
        if source_path:
            Path(source_path).unlink(missing_ok=True)
        SHORTS_JOBS[job_id] = {"status": "error", "error": str(e)}

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "5.0", "gemini": bool(GEMINI_API_KEY), "groq": bool(GROQ_API_KEY), "cookies": bool(_COOKIE_FILE)}

# — Identification clips viraux (existant) —
@app.post("/clips")
async def create_clips(req: ClipsRequest, background_tasks: BackgroundTasks, _=Depends(verify_secret)):
    url = req.url.strip()
    if "youtube.com" not in url and "youtu.be" not in url:
        raise HTTPException(400, "URL YouTube invalide")
    session_id = str(uuid.uuid4())
    session_dir = WORK_DIR / f"clips_{session_id}"
    session_dir.mkdir(parents=True, exist_ok=True)
    CLIPS_JOBS[session_id] = {"status": "processing", "progress": "Démarrage…", "result": None, "error": None}
    background_tasks.add_task(process_clips_job, session_id, url, min(max(1, req.n_clips), 7), session_dir)
    background_tasks.add_task(cleanup_old_sessions)
    return {"ok": True, "session_id": session_id, "status": "processing"}

@app.get("/status/{session_id}")
async def get_status(session_id: str, _=Depends(verify_secret)):
    job = CLIPS_JOBS.get(session_id)
    if not job:
        raise HTTPException(404, "Job introuvable")
    return job

@app.get("/download/{session_id}/{filename}")
def download_clip(session_id: str, filename: str):
    if ".." in session_id or ".." in filename or "/" in session_id or "/" in filename:
        raise HTTPException(400, "Chemin invalide")
    path = WORK_DIR / f"clips_{session_id}" / filename
    if not path.exists():
        raise HTTPException(404, "Clip expiré ou introuvable")
    return FileResponse(str(path), media_type="video/mp4", filename=filename)

# — Génération Shorts (SamurAI pipeline) —
@app.post("/generate-shorts")
async def generate_shorts(req: GenerateRequest, background_tasks: BackgroundTasks, _=Depends(verify_secret)):
    url = req.youtube_url.strip()
    if "youtube.com" not in url and "youtu.be" not in url:
        raise HTTPException(400, "URL YouTube invalide")
    job_id = str(uuid.uuid4())[:12]
    out_dir = WORK_DIR / f"shorts_{job_id}"
    out_dir.mkdir(parents=True, exist_ok=True)
    SHORTS_JOBS[job_id] = {"status": "processing", "progress": "Démarrage…"}
    background_tasks.add_task(process_shorts_job, job_id, url, min(max(1, req.num_clips), 5), out_dir)
    return {"ok": True, "job_id": job_id}

@app.get("/shorts-status/{job_id}")
def shorts_status(job_id: str, _=Depends(verify_secret)):
    job = SHORTS_JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Job introuvable")
    return job

@app.get("/shorts-file/{job_id}/{filename}")
def shorts_file(job_id: str, filename: str):
    if ".." in job_id + filename:
        raise HTTPException(400, "Chemin invalide")
    path = WORK_DIR / f"shorts_{job_id}" / filename
    if not path.exists():
        raise HTTPException(404, "Fichier introuvable")
    return FileResponse(str(path), media_type="video/mp4", filename=filename)

# — Transcription —
@app.post("/transcribe")
async def transcribe(req: TranscribeRequest, _=Depends(verify_secret)):
    url = req.url.strip()
    if "youtube.com" not in url and "youtu.be" not in url:
        raise HTTPException(400, "URL YouTube invalide")
    with tempfile.TemporaryDirectory() as tmp:
        sub_result = _get_subtitles_fast(url)
        if sub_result:
            segs, title, dur = sub_result
        else:
            audio_path, title, dur = download_audio_only(url, tmp)
            import requests as req_lib
            with open(audio_path, "rb") as f:
                r = req_lib.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                    files={"file": (os.path.basename(audio_path), f, "audio/mpeg")},
                    data={"model": "whisper-large-v3-turbo", "response_format": "verbose_json", "timestamp_granularities[]": "segment"},
                    timeout=120,
                )
            r.raise_for_status()
            segs = [{"start": s["start"], "end": s["end"], "text": s["text"].strip()} for s in r.json().get("segments", [])]
    if not segs:
        raise HTTPException(422, "Transcription vide")
    m, s = divmod(dur, 60)
    return {"ok": True, "title": title, "duration": f"{m}:{s:02d}", "transcript": segments_to_text(segs)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), workers=1)
