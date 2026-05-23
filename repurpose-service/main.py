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
from fastapi import FastAPI, HTTPException, Security, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import yt_dlp

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("creatis-clips")

SERVICE_SECRET       = os.environ.get("REPURPOSE_SERVICE_SECRET", "")
GEMINI_API_KEY       = os.environ.get("GEMINI_API_KEY", "")
GROQ_API_KEY         = os.environ.get("GROQ_API_KEY", "")
COBALT_API_KEY       = os.environ.get("COBALT_API_KEY", "")
WHISPER_MODEL        = os.environ.get("WHISPER_MODEL", "tiny")
YOUTUBE_COOKIES_B64  = os.environ.get("YOUTUBE_COOKIES_B64", "")

SESSIONS_DIR = Path(tempfile.gettempdir()) / "creatis_clips"
SESSIONS_DIR.mkdir(exist_ok=True)

# Job store en mémoire (session_id → état)
JOBS: dict = {}
EXPORT_JOBS: dict = {}

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
        "extractor_args": {"youtube": {"player_client": ["tv_embedded", "ios"]}},
        "http_headers": {
            "User-Agent": "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)",
        },
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

# ── yt-dlp ────────────────────────────────────────────────────────────────────
COBALT_INSTANCES = [
    "https://cobalt.imput.net",
    "https://cobalt.catvibers.me",
    "https://cob.vert.run",
    "https://cobalt.hukibarak.hu",
    "https://co.wuk.sh",
    "https://api.cobalt.tools",
]
INVIDIOUS_INSTANCES = [
    "https://inv.nadeko.net",
    "https://invidious.nerdvpn.de",
    "https://yt.artemislena.eu",
    "https://invidious.flokinet.to",
    "https://iv.melmac.space",
]

def _extract_video_id(url: str) -> Optional[str]:
    for pat in [r"[?&]v=([a-zA-Z0-9_-]{11})", r"youtu\.be/([a-zA-Z0-9_-]{11})", r"shorts/([a-zA-Z0-9_-]{11})"]:
        m = re.search(pat, url)
        if m:
            return m.group(1)
    return None

def _get_invidious_stream(url: str) -> tuple[str, str, int]:
    """Récupère l'URL stream via cobalt.tools puis Invidious en fallback."""
    import requests as req_lib
    video_id = _extract_video_id(url)
    if not video_id:
        raise RuntimeError("ID vidéo YouTube invalide")

    # 1. cobalt.tools — service de download YouTube dédié
    cobalt_headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if COBALT_API_KEY:
        cobalt_headers["Authorization"] = f"Api-Key {COBALT_API_KEY}"
    for cobalt in COBALT_INSTANCES:
        try:
            r = req_lib.post(
                f"{cobalt}/",
                json={"url": url, "videoQuality": "360"},
                headers=cobalt_headers,
                timeout=15,
            )
            logger.info(f"cobalt {cobalt} → HTTP {r.status_code}: {r.text[:200]}")
            if r.status_code == 200:
                data = r.json()
                status = data.get("status", "")
                stream_url = data.get("url", "")
                if status in ("stream", "redirect", "tunnel") and stream_url:
                    logger.info(f"cobalt OK via {cobalt} (status={status})")
                    title, duration = _get_video_meta(video_id)
                    return stream_url, title, duration
                logger.warning(f"cobalt {cobalt} status inattendu: {status} — {data}")
        except Exception as e:
            logger.warning(f"cobalt {cobalt} échoué: {e}")

    # 2. Invidious proxy
    for instance in INVIDIOUS_INSTANCES:
        try:
            r = req_lib.get(f"{instance}/api/v1/videos/{video_id}", timeout=12)
            if r.status_code != 200:
                continue
            data = r.json()
            title = data.get("title", "Vidéo YouTube")
            duration = int(data.get("lengthSeconds", 0))
            fmts = data.get("formatStreams", [])
            itag = next((str(f.get("itag")) for f in fmts if str(f.get("itag")) == "18"), None)
            if not itag and fmts:
                itag = str(fmts[0].get("itag", "18"))
            proxy_url = f"{instance}/latest_version?id={video_id}&itag={itag or '18'}&local=true"
            logger.info(f"Invidious OK via {instance}")
            return proxy_url, title, duration
        except Exception as e:
            logger.warning(f"Invidious {instance} échoué: {e}")

    raise RuntimeError("Service vidéo indisponible — réessaie dans quelques minutes")

def _get_video_meta(video_id: str) -> tuple[str, int]:
    """Récupère titre via YouTube oEmbed (public, jamais bloqué) + durée via Invidious."""
    import requests as req_lib
    title = "Vidéo YouTube"
    duration = 0

    # 1. YouTube oEmbed — API publique, pas de clé, fonctionne partout
    try:
        r = req_lib.get(
            f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json",
            timeout=8
        )
        if r.status_code == 200:
            title = r.json().get("title", title)
            logger.info(f"oEmbed OK: '{title}'")
    except Exception as e:
        logger.warning(f"oEmbed failed: {e}")

    # 2. Invidious pour la durée
    for instance in INVIDIOUS_INSTANCES:
        try:
            r = req_lib.get(f"{instance}/api/v1/videos/{video_id}", timeout=8)
            if r.status_code == 200:
                d = r.json()
                if not title or title == "Vidéo YouTube":
                    title = d.get("title", title)
                duration = int(d.get("lengthSeconds", 0))
                break
        except Exception:
            continue

    return title, duration

def download_audio_only(url: str, out_dir: str) -> tuple[str, str, int]:
    """Télécharge l'audio via pytubefix + ffmpeg extract audio (max 20 min pour Whisper)."""
    stream_url, title, duration = _get_invidious_stream(url)
    out_path = f"{out_dir}/audio.mp3"
    # Limite à 20 min pour éviter OOM sur Railway
    cmd = ["ffmpeg", "-i", stream_url, "-t", "1200", "-vn", "-ar", "16000", "-ac", "1", "-b:a", "64k", "-y", out_path]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg audio: {result.stderr[-300:]}")
    return out_path, title, duration

def get_subtitles_youtube(url: str, out_dir: str) -> Optional[tuple[list[dict], str, int]]:
    """Extrait les sous-titres via youtube-transcript-api (sans yt-dlp, sans bot detection)."""
    import re
    try:
        from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled
    except ImportError:
        logger.warning("youtube-transcript-api non installé")
        return None
    try:
        video_id = None
        for pat in [r"[?&]v=([a-zA-Z0-9_-]{11})", r"youtu\.be/([a-zA-Z0-9_-]{11})", r"shorts/([a-zA-Z0-9_-]{11})"]:
            m = re.search(pat, url)
            if m:
                video_id = m.group(1)
                break
        if not video_id:
            return None

        # Récupérer la liste des transcripts disponibles
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

        # Priorité : fr auto-généré > fr manuel > en auto > n'importe
        transcript = None
        try:
            transcript = transcript_list.find_generated_transcript(["fr", "fr-FR", "en", "en-US"])
        except NoTranscriptFound:
            try:
                transcript = transcript_list.find_manually_created_transcript(["fr", "fr-FR", "en", "en-US"])
            except NoTranscriptFound:
                # Prendre n'importe quel transcript disponible
                for t in transcript_list:
                    transcript = t
                    break

        if not transcript:
            logger.warning("Aucun transcript disponible pour cette vidéo")
            return None

        data = transcript.fetch()
        segments = []
        duration = 0
        for item in data:
            start = round(float(item.get("start", 0)), 2)
            dur = float(item.get("duration", 2.0))
            end = round(start + dur, 2)
            text = str(item.get("text", "")).replace("\n", " ").strip()
            if text:
                segments.append({"start": start, "end": end, "text": text})
            duration = max(duration, int(end))

        if len(segments) < 10:
            logger.warning(f"Transcript trop court ({len(segments)} segments)")
            return None

        # Titre via yt-dlp en mode silencieux (extract_info only)
        title = "Vidéo YouTube"
        try:
            with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True, "skip_download": True}) as ydl:
                info = ydl.extract_info(url, download=False)
                title = info.get("title", title)
                duration = int(info.get("duration", duration))
        except Exception:
            pass

        logger.info(f"Transcript YouTube OK — {len(segments)} segments, durée {duration}s, lang={transcript.language_code}")
        return segments, title, duration
    except Exception as e:
        logger.warning(f"Sous-titres YouTube indisponibles: {e}")
        return None

# ── Transcription avec timestamps ─────────────────────────────────────────────
def transcribe_with_timestamps(audio_path: str) -> list[dict]:
    """Transcription via Groq Whisper API (zéro RAM locale) ou fallback faster-whisper."""
    if GROQ_API_KEY:
        import requests as req_lib
        logger.info("Transcription via Groq Whisper API…")
        with open(audio_path, "rb") as f:
            r = req_lib.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                files={"file": (os.path.basename(audio_path), f, "audio/mpeg")},
                data={"model": "whisper-large-v3-turbo", "response_format": "verbose_json", "timestamp_granularities[]": "segment"},
                timeout=120,
            )
        r.raise_for_status()
        data = r.json()
        result = []
        for s in data.get("segments", []):
            result.append({"start": round(float(s["start"]), 2), "end": round(float(s["end"]), 2), "text": s["text"].strip()})
        logger.info(f"Groq Whisper OK — {len(result)} segments")
        return result

    raise RuntimeError("GROQ_API_KEY manquant — transcription impossible sans Groq Whisper API")

def segments_to_text(segs: list[dict]) -> str:
    return " ".join(s["text"] for s in segs if s["text"])

def _transcribe_words_groq(audio_path: str) -> list[dict]:
    """Groq Whisper avec timestamps mot par mot — précision OpusClip-level."""
    import requests as req_lib
    logger.info("Transcription Groq Whisper word-timestamps…")
    with open(audio_path, "rb") as f:
        r = req_lib.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            files={"file": (os.path.basename(audio_path), f, "audio/mpeg")},
            data={"model": "whisper-large-v3-turbo", "response_format": "verbose_json",
                  "timestamp_granularities[]": "word"},
            timeout=180,
        )
    r.raise_for_status()
    data = r.json()
    words = []
    for w in data.get("words", []):
        word = w.get("word", "").strip()
        if word:
            words.append({"word": word, "start": round(float(w["start"]), 3), "end": round(float(w["end"]), 3)})
    logger.info(f"Groq Whisper word-timestamps OK — {len(words)} mots")
    return words

def _words_to_segments(words: list[dict]) -> list[dict]:
    """Regroupe mots en segments de ~5s pour l'analyse Groq/Gemini."""
    if not words: return []
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
    """Chunks de 3 mots avec timestamps exacts pour un clip donné."""
    clip_words = [w for w in words if clip_start <= w["start"] < clip_end]
    caps = []
    for j in range(0, len(clip_words), 3):
        group = clip_words[j:j+3]
        caps.append({
            "start": round(group[0]["start"] - clip_start, 3),
            "end":   round(group[-1]["end"]   - clip_start, 3),
            "text":  " ".join(w["word"] for w in group).strip()
        })
    return caps

# ── Gemini Flash : identifier moments viraux ──────────────────────────────────
async def _gemini_call(payload: dict, timeout: int = 60) -> Optional[str]:
    """Appel Gemini avec fallback sur plusieurs modèles. Retourne le texte ou None."""
    models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"]
    async with httpx.AsyncClient(timeout=timeout) as client:
        for model in models:
            try:
                r = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}",
                    json=payload
                )
                if r.status_code == 429:
                    logger.warning(f"Gemini {model} rate limit, essai suivant…")
                    await asyncio.sleep(8)
                    continue
                if r.status_code in (404, 400):
                    logger.warning(f"Gemini {model} {r.status_code}, essai suivant…")
                    continue
                r.raise_for_status()
                data = r.json()
                candidates = data.get("candidates", [])
                if candidates:
                    return candidates[0]["content"]["parts"][0]["text"].strip()
                logger.warning(f"Gemini {model} : réponse sans candidates")
            except Exception as e:
                logger.warning(f"Gemini {model} exception: {e}")
    logger.warning("Tous les modèles Gemini ont échoué")
    return None


async def identify_moments_groq(segments: list[dict], title: str, n: int, video_duration: int) -> list[dict]:
    """Identifie les moments viraux via Groq (httpx async). Avec ou sans transcription."""
    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY absent — identification Groq impossible")
        return []
    if segments:
        formatted = "\n".join(
            f"[{int(s['start']//60):02d}:{int(s['start']%60):02d}] {s['text']}"
            for s in segments[:300]
        )
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
Vidéo YouTube : "{title}" (durée: {dur_min} minutes = {video_duration}s)
Sans transcription, génère {n} moments viraux probables de 45-90 secondes.
Utilise la structure narrative habituelle : accroche forte tôt, révélation au milieu, climax et conclusion.
Réponds UNIQUEMENT en JSON valide :
{{"clips":[{{"start":<float>,"end":<float>,"hook":"<accroche <10 mots liée au sujet>","why":"<1 phrase>","score":<1-100>}}]}}
Contraintes : durée 45-90s, pas de chevauchement, couvrir toute la vidéo, trié par score décroissant."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={"model": "llama-3.3-70b-versatile",
                      "messages": [{"role": "user", "content": prompt}],
                      "temperature": 0.3, "max_tokens": 1024},
            )
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"].strip()
        logger.info(f"Groq raw response: {text[:200]}")
        m = re.search(r'\{[\s\S]*\}', text)
        if m:
            data = json.loads(m.group())
            clips = [c for c in data.get("clips", [])
                     if 30 <= float(c.get("end", 0)) - float(c.get("start", 0)) <= 95]
            if clips:
                logger.info(f"Groq identify ✓ {len(clips)} moments")
                return sorted(clips, key=lambda x: x.get("score", 0), reverse=True)[:n]
            logger.warning(f"Groq: {len(data.get('clips',[]))} clips reçus mais 0 dans la plage 30-95s")
    except Exception as e:
        logger.warning(f"Groq identify failed: {e}")
    return []


async def identify_moments_gemini(segments: list[dict], title: str, n: int, video_duration: int) -> list[dict]:
    """Identifie les moments viraux depuis une transcription texte."""
    if not GEMINI_API_KEY:
        return _fallback_moments(segments, n, video_duration)

    formatted = "\n".join(
        f"[{int(s['start']//60):02d}:{int(s['start']%60):02d}] {s['text']}"
        for s in segments[:400]
    )
    prompt = f"""Tu es expert en viralité TikTok/YouTube Shorts.
Vidéo : "{title}" (durée: {video_duration}s)
Transcription :
{formatted}

Identifie exactement {n} moments viraux de 30-60 secondes.
Réponds UNIQUEMENT en JSON :
{{"clips":[{{"start":<float>,"end":<float>,"hook":"<accroche<10mots>","why":"<1phrase>","score":<1-100>}}]}}
Contraintes : durée 30-60s, pas de chevauchement, trié par score."""

    text = await _gemini_call({"contents": [{"parts": [{"text": prompt}]}],
                               "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1024}})
    if text:
        try:
            m = re.search(r'\{[\s\S]*\}', text)
            if m:
                data = json.loads(m.group())
                clips = [c for c in data.get("clips", [])
                         if 25 <= float(c.get("end", 0)) - float(c.get("start", 0)) <= 60]
                if clips:
                    return sorted(clips, key=lambda x: x.get("score", 0), reverse=True)[:n]
        except Exception as e:
            logger.warning(f"Parse moments Gemini: {e}")
    return _fallback_moments(segments, n, video_duration)


async def gemini_analyze_video(url: str, n: int) -> Optional[dict]:
    """Gemini regarde la vidéo YouTube directement (sans sous-titres) et identifie les moments viraux."""
    if not GEMINI_API_KEY:
        return None
    video_id = _extract_video_id(url)
    yt_url = f"https://www.youtube.com/watch?v={video_id}" if video_id else url
    prompt = f"""Tu es expert en viralité TikTok/YouTube Shorts.
Regarde cette vidéo YouTube et identifie exactement {n} moments viraux de 30-60 secondes.
Critères : accroche forte, valeur/surprise/émotion, compréhensible sans contexte.

Réponds UNIQUEMENT en JSON valide :
{{
  "title": "<titre>",
  "duration": <durée totale en secondes>,
  "clips": [
    {{
      "start": <float secondes>,
      "end": <float secondes>,
      "hook": "<accroche <10 mots>",
      "why": "<raison viralité 1 phrase>",
      "score": <1-100>,
      "transcript": "<texte dit dans ce moment>",
      "caption_segments": [
        {{"start": <float relatif au clip>, "end": <float relatif>, "text": "<segment 3-6s>"}}
      ]
    }}
  ]
}}
Clips triés par score décroissant, pas de chevauchement."""

    text = await _gemini_call({
        "contents": [{"parts": [
            {"fileData": {"fileUri": yt_url, "mimeType": "video/mp4"}},
            {"text": prompt}
        ]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 4096}
    }, timeout=120)

    if not text:
        return None
    try:
        m = re.search(r'\{[\s\S]*\}', text)
        if not m:
            return None
        data = json.loads(m.group())
        clips = data.get("clips", [])
        if not clips:
            return None
        title = data.get("title", "Vidéo YouTube")
        duration = int(data.get("duration", 0))
        logger.info(f"Gemini video analyze ✓ {len(clips)} clips, '{title}'")
        return {"title": title, "duration": duration, "clips": clips}
    except Exception as e:
        logger.warning(f"Parse Gemini video analyze: {e}")
    return None

def _fallback_moments(segments: list[dict], n: int, total: int) -> list[dict]:
    if total <= 0: total = 600
    clip_len = 45.0
    step = max(clip_len + 30, total / (n + 1))
    clips = []
    for i in range(n):
        start = min(30.0 + i * step, total - clip_len - 5)
        if start < 0: start = 0
        clips.append({"start": start, "end": start + clip_len,
                       "hook": f"Moment clé {i+1}", "why": "Sélection auto", "score": 80 - i*5})
    return clips

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
    return {"status": "ok", "version": "4.0", "gemini": bool(GEMINI_API_KEY), "groq": bool(GROQ_API_KEY)}

@app.get("/download/{session_id}/{filename}")
def download_clip(session_id: str, filename: str):
    if ".." in session_id or ".." in filename or "/" in session_id or "/" in filename:
        raise HTTPException(400, "Chemin invalide")
    clip_path = SESSIONS_DIR / session_id / filename
    if not clip_path.exists():
        raise HTTPException(404, "Clip expiré ou introuvable")
    return FileResponse(str(clip_path), media_type="video/mp4", filename=filename)

async def get_transcript_via_gemini(url: str) -> Optional[tuple[list[dict], str, int]]:
    """Transcrit une vidéo YouTube via Gemini (accès direct Google, pas de download)."""
    if not GEMINI_API_KEY:
        return None
    try:
        video_id = _extract_video_id(url)
        yt_url = f"https://www.youtube.com/watch?v={video_id}" if video_id else url
        prompt = """Transcris cette vidéo YouTube avec les timestamps précis.
Réponds UNIQUEMENT en JSON valide :
{
  "title": "<titre de la vidéo>",
  "duration": <durée totale en secondes entier>,
  "segments": [
    {"start": <float secondes>, "end": <float secondes>, "text": "<texte du segment>"}
  ]
}
Segments de 3-8 secondes max, couvrir toute la vidéo (max 400 segments).
Pas d'introduction, juste le JSON."""

        async with httpx.AsyncClient(timeout=120) as client:
            for model in ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash-8b"]:
                r = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}",
                    json={
                        "contents": [{"parts": [
                            {"fileData": {"fileUri": yt_url, "mimeType": "video/mp4"}},
                            {"text": prompt}
                        ]}],
                        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 8192}
                    }
                )
                if r.status_code == 429:
                    logger.warning(f"Gemini {model} rate limit, essai modèle suivant…")
                    await asyncio.sleep(8)
                    continue
                if r.status_code in (404, 400):
                    logger.warning(f"Gemini {model} introuvable, essai modèle suivant…")
                    continue
                r.raise_for_status()
                break
            else:
                logger.warning("Tous les modèles Gemini ont échoué (rate limit / quota épuisé)")
                return None
            text = r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            m = re.search(r'\{[\s\S]*\}', text)
            if not m:
                return None
            data = json.loads(m.group())
            segments = [
                {"start": round(float(s["start"]), 2), "end": round(float(s["end"]), 2), "text": str(s["text"]).strip()}
                for s in data.get("segments", []) if s.get("text")
            ]
            if len(segments) < 5:
                return None
            title = data.get("title", "Vidéo YouTube")
            duration = int(data.get("duration", 0)) or (int(segments[-1]["end"]) if segments else 0)
            logger.info(f"Gemini transcription ✓ {len(segments)} segments, {duration}s")
            return segments, title, duration
    except Exception as e:
        logger.warning(f"Gemini transcription échouée: {e}")
        return None

def _get_subtitles_fast(url: str) -> Optional[tuple[list[dict], str, int]]:
    """Sous-titres YouTube via youtube-transcript-api uniquement (sans yt-dlp, sans timeout réseau)."""
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
        segments, duration = [], 0
        for item in data:
            start = round(float(item.get("start", 0)), 2)
            end   = round(start + float(item.get("duration", 2.0)), 2)
            text  = str(item.get("text", "")).replace("\n", " ").strip()
            if text:
                segments.append({"start": start, "end": end, "text": text})
            duration = max(duration, int(end))
        if len(segments) < 10:
            return None
        logger.info(f"Sous-titres OK — {len(segments)} segments, {duration}s, {transcript.language_code}")
        return segments, "Vidéo YouTube", duration
    except Exception as e:
        logger.warning(f"Sous-titres indisponibles: {e}")
        return None


async def process_clips_job(session_id: str, url: str, n: int, session_dir: Path):
    """Traitement asynchrone : sous-titres+Groq → Groq sans subs → Gemini vision → fallback."""
    sid = session_id[:8]
    try:
        video_id = _extract_video_id(url)
        title, video_duration, moments = "Vidéo YouTube", 600, []

        # ── Étape 0 : métadonnées via Invidious (titre + durée) ──
        try:
            meta_title, meta_dur = await asyncio.get_event_loop().run_in_executor(
                None, lambda: _get_video_meta(video_id)
            )
            if meta_title and meta_title != "Vidéo YouTube":
                title = meta_title
            if meta_dur > 0:
                video_duration = meta_dur
            logger.info(f"[{sid}] Méta OK : '{title}' {video_duration}s")
        except Exception as e:
            logger.warning(f"[{sid}] Méta indisponible: {e}")

        # ── Étape 1 : sous-titres YouTube → Groq (0 quota Gemini, ~3s) ──
        JOBS[session_id]["progress"] = "Récupération des sous-titres…"
        segments = []
        word_transcript: list[dict] = []
        try:
            sub_result = await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(None, lambda: _get_subtitles_fast(url)),
                timeout=12
            )
            if sub_result:
                segments, _, dur2 = sub_result
                if dur2 > 0: video_duration = dur2
        except asyncio.TimeoutError:
            logger.warning(f"[{sid}] Timeout sous-titres")

        # ── Fallback Whisper word-timestamps si pas de CC YouTube ──
        if not segments and GROQ_API_KEY:
            JOBS[session_id]["progress"] = "Transcription audio (Whisper)…"
            try:
                whis_tmp = tempfile.mkdtemp()
                audio_path, _, dur2 = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: download_audio_only(url, whis_tmp)
                )
                if dur2 > 0: video_duration = dur2
                word_transcript = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: _transcribe_words_groq(audio_path)
                )
                segments = _words_to_segments(word_transcript)
                logger.info(f"[{sid}] Whisper word-timestamps OK — {len(word_transcript)} mots")
            except Exception as e:
                logger.warning(f"[{sid}] Whisper fallback échoué: {e}")
            finally:
                shutil.rmtree(whis_tmp, ignore_errors=True)

        # ── Étape 2 : Groq (avec ou sans transcription) ──
        JOBS[session_id]["progress"] = "Analyse Groq…"
        moments = await identify_moments_groq(segments, title, n, video_duration)
        if moments:
            logger.info(f"[{sid}] Groq ✓ {len(moments)} moments ({'avec subs' if segments else 'sans subs'})")

        # ── Étape 3 : Gemini regarde la vidéo directement (si Groq vide) ──
        if not moments:
            JOBS[session_id]["progress"] = "Analyse Gemini…"
            video_result = await gemini_analyze_video(url, n)
            if video_result:
                title          = video_result["title"] or title
                video_duration = video_result["duration"] or video_duration
                moments        = video_result["clips"]
                logger.info(f"[{sid}] Gemini ✓ {len(moments)} moments — '{title}'")

        # ── Étape 4 : fallback régulier (clips distribués uniformément) ──
        if not moments:
            logger.warning(f"[{sid}] Tous les chemins ont échoué — fallback distribué")
            moments = _fallback_moments([], n, video_duration)

        # ── Construire les clips metadata ──
        clips_result = []
        for moment in moments:
            clip_start = float(moment["start"])
            clip_end   = float(moment["end"])
            # Priorité : word-timestamps Whisper > CC YouTube > fallback Groq
            if word_transcript:
                real_caps = _words_to_caption_segs(word_transcript, clip_start, clip_end)
            elif segments:
                real_caps = []
                for seg in segments:
                    t = seg.get("start", 0)
                    d = seg.get("duration", seg.get("end", t + 2) - t)
                    if t >= clip_start and t < clip_end:
                        real_caps.append({
                            "start": round(t - clip_start, 2),
                            "end":   round(min(t + d - clip_start, clip_end - clip_start), 2),
                            "text":  seg.get("text", "").strip()
                        })
            else:
                real_caps = []
            caption_segs = real_caps if real_caps else moment.get("caption_segments", [])
            clips_result.append({
                "hook":      str(moment.get("hook", ""))[:80],
                "why":       str(moment.get("why",  ""))[:200],
                "score":     int(moment.get("score", 80)),
                "start":     clip_start,
                "end":       clip_end,
                "duration":  round(clip_end - clip_start, 1),
                "transcript": str(moment.get("transcript", ""))[:300],
                "video_id":   video_id,
                "youtube_url":  f"https://www.youtube.com/watch?v={video_id}&t={int(clip_start)}s",
                "embed_url":    f"https://www.youtube.com/embed/{video_id}?start={int(clip_start)}&end={int(clip_end)}&rel=0",
                "caption_segments": caption_segs,
            })

        JOBS[session_id] = {
            "status": "done", "progress": None, "error": None,
            "result": {
                "ok": True, "title": title, "duration": video_duration,
                "video_id": video_id, "session_id": session_id,
                "clips": clips_result,
            }
        }
        logger.info(f"[{sid}] Job terminé — {len(clips_result)} clips")

    except Exception as e:
        shutil.rmtree(session_dir, ignore_errors=True)
        logger.error(f"[{sid}] Erreur fatale: {e}")
        JOBS[session_id] = {"status": "error", "error": str(e), "progress": None, "result": None}


class ClipExportRequest(BaseModel):
    video_id: str
    start: float
    end: float

async def process_export_job(job_id: str, video_id: str, start: float, end: float, out_dir: Path):
    try:
        yt_url = f"https://www.youtube.com/watch?v={video_id}"
        filename = f"clip_{video_id}_{int(start)}_{int(end)}.mp4"
        out_path = out_dir / filename
        duration = end - start

        def _export():
            import requests as req_lib

            # Appel direct à l'API Innertube de YouTube (API interne Android/TV)
            # Ces clients mobile/TV ne déclenchent pas la bot detection des IPs datacenter
            INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
            CLIENTS = [
                ("ANDROID_EMBEDDED_PLAYER", "55", "19.29.37",
                 "com.google.android.youtube/19.29.37 (Linux; U; Android 11) gzip"),
                ("TVHTML5_SIMPLY_EMBEDDED_PLAYER", "85", "2.0",
                 "Mozilla/5.0 (SMART-TV; LINUX; Tizen 5.0) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/2.1 Chrome/56.0.2924.0 TV Safari/537.36"),
                ("ANDROID", "3", "19.29.37",
                 "com.google.android.youtube/19.29.37 (Linux; U; Android 11) gzip"),
                ("IOS", "5", "19.29.1",
                 "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)"),
            ]

            video_url = None
            for client_name, client_id, client_ver, ua in CLIENTS:
                try:
                    ctx = {"client": {"clientName": client_name, "clientVersion": client_ver, "hl": "fr", "gl": "FR"}}
                    if "EMBEDDED" in client_name or "SIMPLY" in client_name:
                        ctx["thirdParty"] = {"embedUrl": f"https://www.youtube.com/watch?v={video_id}"}
                    r = req_lib.post(
                        f"https://www.youtube.com/youtubei/v1/player?key={INNERTUBE_KEY}",
                        json={"context": ctx, "videoId": video_id, "contentCheckOk": True, "racyCheckOk": True},
                        headers={"Content-Type": "application/json", "User-Agent": ua,
                                 "X-Youtube-Client-Name": client_id, "X-Youtube-Client-Version": client_ver},
                        timeout=15,
                    )
                    if r.status_code != 200:
                        continue
                    data = r.json()
                    if data.get("playabilityStatus", {}).get("status") not in ("OK", "CONTENT_CHECK_REQUIRED"):
                        logger.warning(f"[export {job_id[:8]}] innertube {client_name}: {data.get('playabilityStatus',{}).get('status')}")
                        continue
                    # Formats pré-fusionnés (video+audio) → URLs directes
                    fmts = data.get("streamingData", {}).get("formats", [])
                    direct = [f for f in fmts if f.get("url") and "video/mp4" in f.get("mimeType", "")]
                    if not direct:
                        # Fallback : formats adaptatifs avec video+audio
                        adaptive = data.get("streamingData", {}).get("adaptiveFormats", [])
                        direct = [f for f in adaptive if f.get("url") and "video/mp4" in f.get("mimeType", "") and f.get("audioQuality")]
                    if not direct:
                        logger.warning(f"[export {job_id[:8]}] innertube {client_name}: aucune URL directe MP4")
                        continue
                    direct.sort(key=lambda f: f.get("height", 0), reverse=True)
                    best = next((f for f in direct if f.get("height", 0) <= 720), direct[0])
                    video_url = best["url"]
                    logger.info(f"[export {job_id[:8]}] innertube OK {client_name}: {best.get('qualityLabel')} h={best.get('height')}")
                    break
                except Exception as exc:
                    logger.warning(f"[export {job_id[:8]}] innertube {client_name}: {exc}")

            # Fallback Invidious si Innertube échoue
            if not video_url:
                for instance in INVIDIOUS_INSTANCES:
                    try:
                        r = req_lib.get(f"{instance}/api/v1/videos/{video_id}", timeout=10)
                        if r.status_code != 200:
                            continue
                        fmts = r.json().get("formatStreams", [])
                        itag = next((t for t in ["22", "18"] if any(str(f.get("itag")) == t for f in fmts)), None)
                        if itag:
                            video_url = f"{instance}/latest_version?id={video_id}&itag={itag}&local=true"
                            logger.info(f"[export {job_id[:8]}] invidious OK {instance} itag={itag}")
                            break
                    except Exception as exc:
                        logger.warning(f"[export {job_id[:8]}] invidious {instance}: {exc}")

            if not video_url:
                raise Exception("Service indisponible — réessaie dans quelques minutes")

            # Étape 2 : ffmpeg — HTTP range seek + extraction + 9:16
            # -ss avant -i = fast seek via HTTP range (ne télécharge pas tout le fichier)
            vf = "scale='if(gt(iw/ih,9/16),1920*iw/ih,-2)':'if(gt(iw/ih,9/16),-2,1920)',crop=1080:1920,setsar=1"
            cmd = [
                "ffmpeg", "-y",
                "-ss", str(start),
                "-i", video_url,
                "-t", str(duration),
                "-vf", vf,
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart",
                str(out_path)
            ]
            logger.info(f"[export {job_id[:8]}] ffmpeg start={start:.1f}s dur={duration:.1f}s")
            result = subprocess.run(cmd, capture_output=True, timeout=300)
            if result.returncode != 0:
                err = (result.stdout.decode() + result.stderr.decode())[-800:]
                raise Exception(f"ffmpeg: {err}")
            if not out_path.exists() or out_path.stat().st_size < 1000:
                raise Exception("ffmpeg n'a pas produit de fichier valide")

        await asyncio.get_event_loop().run_in_executor(None, _export)

        EXPORT_JOBS[job_id] = {
            "status": "done",
            "download_url": f"/clip-export-file/{job_id}/{filename}",
            "filename": filename,
        }
        logger.info(f"[export {job_id[:8]}] OK → {filename}")
    except Exception as e:
        logger.error(f"[export {job_id[:8]}] Erreur: {e}")
        EXPORT_JOBS[job_id] = {"status": "error", "error": str(e)}
        shutil.rmtree(out_dir, ignore_errors=True)

@app.post("/clip-export")
async def start_clip_export(req: ClipExportRequest, background_tasks: BackgroundTasks, _: None = Depends(verify_secret)):
    job_id = str(uuid.uuid4())[:12]
    out_dir = SESSIONS_DIR / f"export_{job_id}"
    out_dir.mkdir(parents=True, exist_ok=True)
    EXPORT_JOBS[job_id] = {"status": "processing"}
    background_tasks.add_task(process_export_job, job_id, req.video_id, req.start, req.end, out_dir)
    return {"ok": True, "job_id": job_id}

@app.get("/clip-export-status/{job_id}")
async def clip_export_status(job_id: str, _: None = Depends(verify_secret)):
    job = EXPORT_JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Job introuvable")
    return job

@app.get("/clip-export-file/{job_id}/{filename}")
def clip_export_file(job_id: str, filename: str):
    if ".." in job_id or ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(400, "Chemin invalide")
    path = SESSIONS_DIR / f"export_{job_id}" / filename
    if not path.exists():
        raise HTTPException(404, "Fichier expiré ou introuvable")
    return FileResponse(str(path), media_type="video/mp4", filename=filename)


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
