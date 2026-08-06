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
import os, uuid, json, re, asyncio, subprocess, tempfile, logging, io
from pathlib import Path
from typing import Optional, List, Dict

import httpx
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, UploadFile, File, Form, Request
from fastapi.responses import FileResponse, JSONResponse
from starlette.background import BackgroundTask
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("creatis")

try:
    import cv2 as _cv2_check
    logger.info(f"[startup] cv2 {_cv2_check.__version__} — CascadeClassifier={hasattr(_cv2_check, 'CascadeClassifier')}")
except Exception as _e:
    logger.error(f"[startup] cv2 import failed: {_e}")

GEMINI_API_KEY        = os.environ.get("GEMINI_API_KEY", "")
GROQ_API_KEY          = os.environ.get("GROQ_API_KEY", "")
SERVICE_SECRET        = os.environ.get("REPURPOSE_SERVICE_SECRET", "")
WHISPER_MODEL         = os.environ.get("WHISPER_MODEL", "base")

# Langue de transcription IMPOSÉE à Whisper. Sans ça, Whisper devine la langue sur les premières
# secondes : un jingle, de la musique, un silence ou un mot d'anglais en intro suffisent à ce qu'il
# détecte "en" sur une vidéo française — il transcrit alors phonétiquement en anglais et les
# sous-titres partent en vrac. Le produit s'adresse à des créateurs francophones, donc "fr" par
# défaut. Mettre TRANSCRIBE_LANG="" dans Railway pour revenir à la détection automatique.
TRANSCRIBE_LANG       = os.environ.get("TRANSCRIBE_LANG", "fr").strip()
YOUTUBE_COOKIES       = os.environ.get("YOUTUBE_COOKIES", "")
RESIDENTIAL_PROXY_URL = os.environ.get("RESIDENTIAL_PROXY_URL", "")
BGUTIL_URL            = os.environ.get("BGUTIL_URL", "")
RAPIDAPI_KEY          = os.environ.get("RAPIDAPI_KEY", "")
# youtube-download-api.org — API tierce qui gère la bot-detection YouTube côté serveur (IP
# résidentielles). Utilisée en priorité #0 quand la clé est présente ; fallback gratuit sinon.
YT_DOWNLOAD_API_KEY   = os.environ.get("YT_DOWNLOAD_API_KEY", "")
YT_DOWNLOAD_API_BASE  = os.environ.get("YT_DOWNLOAD_API_BASE", "https://youtube-download-api.org")
# ── Cache Cloudflare R2 (S3-compatible) : un segment téléchargé une seule fois, réutilisé par
# tous les users/sessions (egress R2 gratuit → économise le proxy et le re-téléchargement). ──
R2_ACCOUNT_ID         = os.environ.get("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY         = os.environ.get("R2_ACCESS_KEY_ID", "")
R2_SECRET_KEY         = os.environ.get("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET             = os.environ.get("R2_BUCKET", "")
# Fallback public — utilisé si BGUTIL_URL interne inaccessible depuis ce service
BGUTIL_PUBLIC_URL     = "https://bgutil-ytdlp-pot-provider-production-ff91.up.railway.app"

WORK_DIR = Path(tempfile.gettempdir()) / "creatis"
WORK_DIR.mkdir(exist_ok=True)
UPLOAD_DIR = WORK_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

JOBS:         dict = {}
CLIPS:        dict = {}
CLIP_EXPORTS: dict = {}
UPLOAD_JOBS:  dict = {}
RAW_SEGMENTS: dict = {}
PREVIEW_CLIPS: dict = {}

# Limite les ffmpeg lourds en parallèle — initialisé au premier appel async
_FFMPEG_SEM = None

def _get_ffmpeg_sem():
    global _FFMPEG_SEM
    if _FFMPEG_SEM is None:
        _FFMPEG_SEM = asyncio.Semaphore(1)
    return _FFMPEG_SEM


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


def _gen_visitor_data() -> str:
    """Génère un visitorData YouTube valide (proto3 base64). Même format que yt-dlp."""
    import struct, base64 as _b64, time as _time, random as _random, string as _string
    vid = ''.join(_random.choices(_string.ascii_letters + _string.digits + '_-', k=11))
    ts = int(_time.time())
    vid_b = vid.encode()
    proto = bytes([0x0a, len(vid_b)]) + vid_b  # field 1: string
    # field 5: varint timestamp
    ts_v = []
    v = ts
    while True:
        b = v & 0x7F; v >>= 7
        if v: b |= 0x80
        ts_v.append(b)
        if not v: break
    proto += bytes([0x28]) + bytes(ts_v)
    return _b64.urlsafe_b64encode(proto).rstrip(b'=').decode()


def _fetch_po_token_sync() -> tuple:
    """Appelle bgutil → PoToken + contentBinding. Retourne (content_binding, po_token)."""
    urls_to_try = [u for u in [BGUTIL_URL, BGUTIL_PUBLIC_URL] if u]
    for url in urls_to_try:
        with httpx.Client(timeout=25) as c:
            try:
                r = c.post(f"{url}/get_pot", json={})
                logger.info(f"[bgutil] {url}/get_pot → {r.status_code} body={r.text[:120]}")
                if r.status_code == 200:
                    data = r.json()
                    token = data.get("poToken") or data.get("po_token") or ""
                    # contentBinding remplace visitor_data (API bgutil mise à jour)
                    content_binding = data.get("contentBinding") or data.get("visitorData") or ""
                    if token:
                        logger.info(f"[bgutil] OK: PoToken={len(token)}c contentBinding={len(content_binding)}c")
                        return content_binding, token
            except Exception as e:
                logger.warning(f"[bgutil] {url}/get_pot failed: {e}")
    return "", ""


def _yt_extractor_args() -> dict:
    """Construit les extractor_args yt-dlp. Utilise bgutil public URL (fiable depuis Railway)."""
    # ALIGNEMENT CLIENT <-> JETON PO. bgutil ne produit un jeton valide que pour les clients
    # `web` et `mweb` : il intercepte leur requête et lie le jeton au `visitor_data` de CETTE
    # session. Dès que yt-dlp bascule sur un client Android ou iOS, le jeton ne correspond plus
    # et l'authentification tombe — d'où des listes de formats vides et le message
    # « Requested format is not available », alors même que le sélecteur finit par `/best`.
    # Retirés au passage : `android_creator` et `android_testsuite`, qui n'existent plus dans
    # yt-dlp, et `android_vr` / `android` / `ios`, dont les formats sont désormais dépouillés
    # de leur URL sauf jeton GVS dédié que nous ne savons pas produire.
    args = {"youtube": {"player_client": ["mweb", "web"]}}

    # Toujours configurer le plugin avec l'URL publique (connue joignable depuis Railway)
    # Le plugin bgutil-ytdlp-pot-provider intercepte le fetch du web client et génère un PoToken
    # bindé au visitor_data correct — ne pas injecter po_token directement (mismatch visitor_data)
    args["youtubepot-bgutilhttp"] = {"base_url": [BGUTIL_PUBLIC_URL]}
    logger.info(f"[bgutil] plugin configuré → {BGUTIL_PUBLIC_URL}")

    return args


_playwright_cookies_cache: dict = {}  # video_id → (cookies_path, ts)

async def _get_yt_cookies_playwright(video_id: str, out_dir: Path) -> Optional[str]:
    """Ouvre YouTube avec un vrai Chrome (Playwright) → extrait cookies valides depuis l'IP Railway.
    Retourne le chemin du fichier cookies.txt au format Netscape, ou None si échec."""
    cached = _playwright_cookies_cache.get("global")
    if cached:
        cookies_path, ts = cached
        if _time.time() - ts < 3600 and Path(cookies_path).exists():
            logger.info("[playwright] cookies depuis cache (< 1h)")
            return cookies_path
    try:
        from playwright.async_api import async_playwright
        logger.info("[playwright] lancement Chromium pour extraire cookies YouTube…")
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
                      "--disable-gpu", "--no-first-run", "--no-zygote"],
            )
            ctx = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 720},
                locale="fr-FR",
            )
            page = await ctx.new_page()
            await page.goto(f"https://www.youtube.com/watch?v={video_id}",
                            wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(3000)  # JS YouTube s'exécute
            cookies = await ctx.cookies(["https://www.youtube.com", "https://youtube.com"])
            await browser.close()

        if not cookies:
            logger.warning("[playwright] aucun cookie récupéré")
            return None

        # Écrire au format Netscape pour yt-dlp
        cookies_path = str(out_dir / "yt_cookies.txt")
        lines = ["# Netscape HTTP Cookie File", "# Generated by Playwright"]
        for c in cookies:
            domain = c.get("domain", ".youtube.com")
            flag = "TRUE" if domain.startswith(".") else "FALSE"
            path = c.get("path", "/")
            secure = "TRUE" if c.get("secure") else "FALSE"
            expiry = str(int(c.get("expires", 0))) if c.get("expires", 0) > 0 else "0"
            lines.append(f"{domain}\t{flag}\t{path}\t{secure}\t{expiry}\t{c['name']}\t{c['value']}")
        Path(cookies_path).write_text("\n".join(lines))
        _playwright_cookies_cache["global"] = (cookies_path, _time.time())
        logger.info(f"[playwright] {len(cookies)} cookies écrits → {cookies_path}")
        return cookies_path
    except Exception as e:
        logger.warning(f"[playwright] échec: {e}")
        return None


app = FastAPI(title="Créatis Shorts")
app.add_middleware(CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["Content-Disposition"],
)

# ── Global exception handler — empêche tout crash non catchée de tuer le worker ──
from fastapi import Request as _Request
from fastapi.responses import JSONResponse as _JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

class _CatchAllMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        try:
            return await call_next(request)
        except Exception as exc:
            logger.error(f"[middleware] exception non catchée: {exc}", exc_info=True)
            return _JSONResponse(status_code=500, content={"error": "Erreur interne", "detail": str(exc)})

app.add_middleware(_CatchAllMiddleware)

# ── Nettoyage périodique mémoire + disque (toutes les 2h) ─────────────────────
import time as _time

_LAST_CLEANUP = 0

def _cleanup_old_jobs():
    global _LAST_CLEANUP
    now = _time.time()
    if now - _LAST_CLEANUP < 7200:
        return
    _LAST_CLEANUP = now
    cutoff = now - 7200  # 2h

    for store in (JOBS, CLIPS, CLIP_EXPORTS, UPLOAD_JOBS):
        stale = [k for k, v in list(store.items())
                 if isinstance(v, dict) and v.get("status") in ("done", "error")
                 and v.get("_ts", now) < cutoff]
        for k in stale:
            store.pop(k, None)
        if stale:
            logger.info(f"[cleanup] {len(stale)} jobs expirés supprimés")

    # Supprime les dossiers temp > 2h
    try:
        for d in WORK_DIR.iterdir():
            if d.is_dir() and (now - d.stat().st_mtime) > 7200:
                import shutil as _sh
                _sh.rmtree(d, ignore_errors=True)
    except Exception as e:
        logger.warning(f"[cleanup] disk: {e}")


@app.on_event("startup")
async def startup():
    global _bgutil_ok
    if BGUTIL_URL:
        _bgutil_ok = await _check_bgutil()
        logger.info(f"[bgutil] URL={BGUTIL_URL} joignable={_bgutil_ok}")

    # Version yt-dlp réellement installée. La couche pip du Dockerfile est mise en cache tant que
    # requirements.txt ne bouge pas : la version peut donc dater de plusieurs mois alors que c'est
    # l'outil qui doit suivre chaque changement de YouTube. Sans cette ligne, invisible.
    try:
        import yt_dlp as _ydl_v
        logger.info(f"[yt-dlp] version installée = {_ydl_v.version.__version__}")
    except Exception as e:
        logger.warning(f"[yt-dlp] version illisible : {e}")

    # Auto-test R2 : l'historique des clips repose entièrement sur ce cache. Des identifiants
    # invalides ne se voient nulle part ailleurs — _r2_put et _r2_get sont fail-open, donc tout
    # continuerait à « marcher » en retéléchargeant depuis YouTube à chaque fois, en silence.
    if not _r2_enabled():
        logger.warning("[r2] DÉSACTIVÉ — variables manquantes, aucun clip ne sera conservé")
    else:
        def _test_r2():
            import io
            c = _r2_client()
            c.put_object(Bucket=R2_BUCKET, Key="_healthcheck.txt", Body=b"ok")
            return c.get_object(Bucket=R2_BUCKET, Key="_healthcheck.txt")["Body"].read()
        try:
            r = await asyncio.get_event_loop().run_in_executor(None, _test_r2)
            logger.info(f"[r2] ✓ opérationnel (bucket={R2_BUCKET}, aller-retour={r!r})")
        except Exception as e:
            logger.error(f"[r2] ÉCHEC aller-retour ({type(e).__name__}: {str(e)[:160]}) "
                         f"— les clips ne seront PAS conservés")

security = HTTPBearer(auto_error=False)


def auth(request: Request, creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    token = (creds.credentials if creds else None) or request.query_params.get("token")
    if SERVICE_SECRET and token != SERVICE_SECRET:
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


async def _innertube_download_audio(youtube_url: str, out_dir: Path) -> tuple:
    """Télécharge audio via InnerTube — WEB+PoToken en premier, puis ANDROID_VR fallback."""
    m = re.search(r'(?:v=|youtu\.be/|shorts/|embed/)([a-zA-Z0-9_-]{11})', youtube_url)
    if not m:
        raise ValueError("ID vidéo YouTube introuvable")
    video_id = m.group(1)

    # Android API key (yt-dlp source, client ID 3)
    _ANDROID_KEY = "AIzaSyA8eiZmM8IA8geBBmV1-zRx9HtCKV8qlKg"
    # iOS API key (yt-dlp source, client ID 5)
    _IOS_KEY = "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc"
    # WEB API key
    _WEB_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"

    # Obtenir PoToken bgutil pour WEB client
    _po_token = ""
    _visitor_data = ""
    try:
        _visitor_data, _po_token = _fetch_po_token_sync()
        if _po_token:
            logger.info(f"[innertube] bgutil PoToken OK ({len(_po_token)}c), contentBinding ({len(_visitor_data)}c)")
    except Exception as e:
        logger.warning(f"[innertube] bgutil /get_pot failed: {e}")

    clients = []

    # Client WEB + PoToken — bypasse la bot-detection via token cryptographique valide
    if _po_token:
        web_payload: dict = {
            "context": {
                "client": {
                    "clientName": "WEB",
                    "clientVersion": "2.20240726.00.00",
                    "hl": "en", "gl": "US",
                }
            },
            "videoId": video_id,
            "contentCheckOk": True,
            "racyCheckOk": True,
            "serviceIntegrityDimensions": {"poToken": _po_token},
        }
        if _visitor_data:
            web_payload["context"]["client"]["visitorData"] = _visitor_data
        clients.append({
            "name": "WEB+PoToken",
            "url": f"https://www.youtube.com/youtubei/v1/player?key={_WEB_KEY}&prettyPrint=false",
            "payload": web_payload,
            "headers": {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
                "X-YouTube-Client-Name": "1",
                "X-YouTube-Client-Version": "2.20240726.00.00",
                "Origin": "https://www.youtube.com",
                "Referer": f"https://www.youtube.com/watch?v={video_id}",
                **({"X-Goog-Visitor-Id": _visitor_data} if _visitor_data else {}),
            },
        })

    clients += [
        {
            "name": "ANDROID_VR",
            "url": "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
            "payload": {
                "context": {
                    "client": {
                        "clientName": "ANDROID_VR",
                        "clientVersion": "1.56.21",
                        "deviceMake": "Oculus",
                        "deviceModel": "Quest 3",
                        "androidSdkVersion": 32,
                        "userAgent": "com.google.android.apps.youtube.vr.oculus/1.56.21 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
                        "osName": "Android", "osVersion": "12L",
                        "platform": "MOBILE", "hl": "en", "gl": "US",
                    }
                },
                "videoId": video_id,
                "contentCheckOk": True,
                "racyCheckOk": True,
            },
            "headers": {
                "Content-Type": "application/json",
                "User-Agent": "com.google.android.apps.youtube.vr.oculus/1.56.21 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
                "X-YouTube-Client-Name": "28",
                "X-YouTube-Client-Version": "1.56.21",
                "X-Goog-Api-Format-Version": "2",
            },
        },
        {
            "name": "ANDROID",
            "url": f"https://www.youtube.com/youtubei/v1/player?key={_ANDROID_KEY}&prettyPrint=false",
            "payload": {
                "context": {
                    "client": {
                        "clientName": "ANDROID",
                        "clientVersion": "19.09.37",
                        "androidSdkVersion": 30,
                        "userAgent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
                        "osName": "Android", "osVersion": "11",
                        "platform": "MOBILE", "hl": "en", "gl": "US",
                    }
                },
                "videoId": video_id,
                "contentCheckOk": True,
                "racyCheckOk": True,
            },
            "headers": {
                "Content-Type": "application/json",
                "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
                "X-YouTube-Client-Name": "3",
                "X-YouTube-Client-Version": "19.09.37",
                "X-Goog-Api-Format-Version": "2",
            },
        },
        {
            "name": "IOS",
            "url": f"https://www.youtube.com/youtubei/v1/player?key={_IOS_KEY}&prettyPrint=false",
            "payload": {
                "context": {
                    "client": {
                        "clientName": "IOS",
                        "clientVersion": "19.09.3",
                        "deviceMake": "Apple",
                        "deviceModel": "iPhone16,2",
                        "userAgent": "com.google.ios.youtube/19.09.3 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X) gzip",
                        "osName": "iPhone", "osVersion": "17.5.1.21F90",
                        "hl": "en", "gl": "US",
                    }
                },
                "videoId": video_id,
                "contentCheckOk": True,
                "racyCheckOk": True,
            },
            "headers": {
                "Content-Type": "application/json",
                "User-Agent": "com.google.ios.youtube/19.09.3 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X) gzip",
                "X-YouTube-Client-Name": "5",
                "X-YouTube-Client-Version": "19.09.3",
                "X-Goog-Api-Format-Version": "2",
            },
        },
        {
            "name": "MWEB",
            "url": "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
            "payload": {
                "context": {
                    "client": {
                        "clientName": "MWEB",
                        "clientVersion": "2.20231204.01.00",
                        "hl": "en", "gl": "US",
                    }
                },
                "videoId": video_id,
                "contentCheckOk": True,
                "racyCheckOk": True,
            },
            "headers": {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                "X-YouTube-Client-Name": "2",
                "X-YouTube-Client-Version": "2.20231204.01.00",
                "Origin": "https://m.youtube.com",
                "Referer": "https://m.youtube.com/",
            },
        },
        {
            "name": "TVHTML5",
            "url": "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
            "payload": {
                "context": {
                    "client": {
                        "clientName": "TVHTML5",
                        "clientVersion": "7.20241029.00.00",
                        "hl": "en", "gl": "US",
                    }
                },
                "videoId": video_id,
                "contentCheckOk": True,
                "racyCheckOk": True,
            },
            "headers": {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/6.0 TV Safari/538.1",
                "X-YouTube-Client-Name": "7",
                "X-YouTube-Client-Version": "7.20241029.00.00",
                "Origin": "https://www.youtube.com",
            },
        },
    ]

    data = None
    for c in clients:
        try:
            async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
                r = await client.post(
                    c["url"],
                    json=c["payload"],
                    headers=c["headers"],
                )
                logger.info(f"[innertube] {c['name']} HTTP {r.status_code}")
                if r.status_code == 200:
                    d = r.json()
                    if d.get("streamingData"):
                        data = d
                        logger.info(f"[innertube] {c['name']} OK — streamingData présent")
                        break
                    ps = d.get("playabilityStatus", {})
                    logger.warning(f"[innertube] {c['name']} pas de streamingData: {ps.get('status')} — {ps.get('reason','')[:100]}")
                else:
                    logger.warning(f"[innertube] {c['name']} HTTP {r.status_code}: {r.text[:300]}")
        except Exception as e:
            logger.warning(f"[innertube] {c['name']} erreur: {e}")

    if not data:
        raise RuntimeError("InnerTube: aucun client n'a retourné de streamingData")

    status = data.get("playabilityStatus", {}).get("status", "")
    if status not in ("OK", "LIVE_STREAM_OFFLINE"):
        reason = data.get("playabilityStatus", {}).get("reason", status)
        raise RuntimeError(f"Vidéo non disponible: {reason}")

    title = data.get("videoDetails", {}).get("title", "")

    adaptive = data.get("streamingData", {}).get("adaptiveFormats", [])
    audio_streams = sorted(
        [f for f in adaptive if "audio" in f.get("mimeType", "") and f.get("url")],
        key=lambda f: f.get("averageBitrate", 0), reverse=True
    )
    if not audio_streams:
        # fallback: formats non-adaptatifs
        audio_streams = [f for f in data.get("streamingData", {}).get("formats", []) if f.get("url")]

    if not audio_streams:
        raise RuntimeError("Aucun stream audio dans la réponse InnerTube")

    audio_url = audio_streams[0]["url"]
    # Déterminer l'extension à partir du mimeType
    mime = audio_streams[0].get("mimeType", "audio/mp4")
    ext = "webm" if "webm" in mime else "m4a"
    out_path = out_dir / f"audio.{ext}"

    logger.info(f"[innertube] stream audio: {title[:50]} ({mime})")

    async with httpx.AsyncClient(timeout=300, follow_redirects=True) as client:
        async with client.stream("GET", audio_url) as resp:
            resp.raise_for_status()
            with open(str(out_path), "wb") as f:
                async for chunk in resp.aiter_bytes(65536):
                    f.write(chunk)

    size_mb = out_path.stat().st_size / 1_048_576
    if size_mb < 0.01:
        raise RuntimeError(f"Audio InnerTube vide ({size_mb:.3f} MB)")

    logger.info(f"[innertube] OK {size_mb:.1f}MB — {title[:50]}")
    return str(out_path), title


async def _download_audio_rapidapi(video_id: str, out_dir: Path) -> Optional[str]:
    """Fallback RapidAPI — leurs serveurs bypass YouTube bot detection.
    Free tier : 500 req/mois. Nécessite RAPIDAPI_KEY dans Railway env vars.
    youtube-mp36 est asynchrone pour les longues vidéos → polling jusqu'à status=ok."""
    if not RAPIDAPI_KEY:
        return None
    host = "youtube-mp36.p.rapidapi.com"
    headers = {"X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": host}
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        try:
            # Polling : max 24 tentatives × 5s = 2 minutes
            for attempt in range(24):
                logger.info(f"[rapidapi] poll {attempt+1}/24 video={video_id}")
                r = await client.get(
                    f"https://{host}/dl",
                    params={"id": video_id},
                    headers=headers,
                )
                if r.status_code != 200:
                    logger.warning(f"[rapidapi] {r.status_code}: {r.text[:100]}")
                    return None
                data = r.json()
                status = data.get("status")
                if status == "ok":
                    link = data.get("link", "")
                    if not link:
                        logger.warning("[rapidapi] status=ok mais lien vide")
                        return None
                    out_path = out_dir / "audio.mp3"
                    logger.info(f"[rapidapi] download {link[:80]}...")
                    resp = await client.get(link, timeout=120)
                    out_path.write_bytes(resp.content)
                    size = out_path.stat().st_size
                    if size > 10_000:
                        logger.info(f"[rapidapi] OK {size // 1024}KB")
                        return str(out_path)
                    logger.warning(f"[rapidapi] fichier trop petit: {size}B")
                    return None
                elif status in ("processing", "queued"):
                    progress = data.get("progress", 0)
                    logger.info(f"[rapidapi] processing {progress}%... attente 5s")
                    await asyncio.sleep(5)
                else:
                    logger.warning(f"[rapidapi] status inattendu: {data}")
                    return None
            logger.warning("[rapidapi] timeout après 2 minutes")
        except Exception as e:
            logger.warning(f"[rapidapi] échec: {e}")
    return None


def _get_yt_cookies_playwright_sync(video_id: str, out_dir: Path, force: bool = False) -> Optional[str]:
    """Wrapper sync — lance Playwright dans un nouveau event loop (safe depuis run_in_executor).
    force=True vide le cache 1h pour forcer des cookies vraiment frais (ex: après un bot-check)."""
    try:
        if force:
            _playwright_cookies_cache.pop("global", None)
        return asyncio.run(_get_yt_cookies_playwright(video_id, out_dir))
    except Exception as e:
        logger.warning(f"[playwright sync] {e}")
        return None


def _get_innertube_audio_url(video_id: str) -> Optional[tuple]:
    """Récupère URL audio directe via InnerTube (sans yt-dlp, sans cookies). Returns (url, title) or None."""
    import requests as _req
    _ANDROID_KEY = "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w"
    _IOS_KEY     = "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc"
    clients = [
        {
            "name": "ANDROID_VR",
            "url": "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
            "payload": {"context": {"client": {
                "clientName": "ANDROID_VR", "clientVersion": "1.56.21",
                "deviceMake": "Oculus", "deviceModel": "Quest 3", "androidSdkVersion": 32,
                "userAgent": "com.google.android.apps.youtube.vr.oculus/1.56.21 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
                "osName": "Android", "osVersion": "12L", "platform": "MOBILE", "hl": "en", "gl": "US",
            }}, "videoId": video_id, "contentCheckOk": True, "racyCheckOk": True},
            "headers": {"Content-Type": "application/json",
                "User-Agent": "com.google.android.apps.youtube.vr.oculus/1.56.21 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
                "X-YouTube-Client-Name": "28", "X-YouTube-Client-Version": "1.56.21", "X-Goog-Api-Format-Version": "2"},
        },
        {
            "name": "ANDROID",
            "url": f"https://www.youtube.com/youtubei/v1/player?key={_ANDROID_KEY}&prettyPrint=false",
            "payload": {"context": {"client": {
                "clientName": "ANDROID", "clientVersion": "19.09.37", "androidSdkVersion": 30,
                "userAgent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
                "osName": "Android", "osVersion": "11", "platform": "MOBILE", "hl": "en", "gl": "US",
            }}, "videoId": video_id, "contentCheckOk": True, "racyCheckOk": True},
            "headers": {"Content-Type": "application/json",
                "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
                "X-YouTube-Client-Name": "3", "X-YouTube-Client-Version": "19.09.37", "X-Goog-Api-Format-Version": "2"},
        },
        {
            "name": "IOS",
            "url": f"https://www.youtube.com/youtubei/v1/player?key={_IOS_KEY}&prettyPrint=false",
            "payload": {"context": {"client": {
                "clientName": "IOS", "clientVersion": "19.09.3", "deviceModel": "iPhone16,2",
                "userAgent": "com.google.ios.youtube/19.09.3 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X) gzip",
                "osName": "iPhone", "osVersion": "17.5.1.21F90", "hl": "en", "gl": "US",
            }}, "videoId": video_id, "contentCheckOk": True, "racyCheckOk": True},
            "headers": {"Content-Type": "application/json",
                "User-Agent": "com.google.ios.youtube/19.09.3 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X) gzip",
                "X-YouTube-Client-Name": "5", "X-YouTube-Client-Version": "19.09.3", "X-Goog-Api-Format-Version": "2"},
        },
    ]
    for c in clients:
        try:
            r = _req.post(c["url"], json=c["payload"], headers=c["headers"], timeout=30)
            if r.status_code != 200:
                logger.warning(f"[innertube-audio] {c['name']} HTTP {r.status_code}")
                continue
            d = r.json()
            streaming = d.get("streamingData", {})
            title = d.get("videoDetails", {}).get("title", "")
            # Audio-only adaptive formats (priorité)
            adaptive = [f for f in streaming.get("adaptiveFormats", [])
                        if f.get("url") and "audio" in f.get("mimeType", "")]
            adaptive.sort(key=lambda f: f.get("bitrate", 0), reverse=True)
            if adaptive:
                logger.info(f"[innertube-audio] {c['name']} OK — audio adaptive ({len(adaptive)} formats)")
                return adaptive[0]["url"], title
            # Fallback : formats muxés
            fmts = [f for f in streaming.get("formats", []) if f.get("url")]
            if fmts:
                logger.info(f"[innertube-audio] {c['name']} OK — muxed format")
                return fmts[0]["url"], title
            logger.warning(f"[innertube-audio] {c['name']} pas streamingData: {d.get('playabilityStatus',{}).get('status')}")
        except Exception as e:
            logger.warning(f"[innertube-audio] {c['name']} err: {e}")
    return None


def _ytapi_fetch(youtube_url: str, fmt: str, dest_path: Path, poll_timeout: int = 420) -> Optional[str]:
    """Télécharge une vidéo/audio via youtube-download-api.org (soumission → polling → download).
    fmt : "1080"|"720"|"480"|"360"|"mp3". Retourne le titre si OK, None sinon (jamais d'exception
    remontée — l'appelant retombe sur le chemin gratuit yt-dlp). Best-effort, non bloquant."""
    if not YT_DOWNLOAD_API_KEY:
        return None
    headers = {"Authorization": f"Bearer {YT_DOWNLOAD_API_KEY}", "Content-Type": "application/json"}
    try:
        # timeout court pour submit/poll, mais long en lecture pour le download d'un gros fichier
        with httpx.Client(timeout=httpx.Timeout(30.0, read=600.0)) as hc:
            # 1) Soumission du job
            r = hc.post(f"{YT_DOWNLOAD_API_BASE}/api/v2/download",
                        json={"url": youtube_url, "format": fmt}, headers=headers)
            if r.status_code not in (200, 201, 202):
                logger.warning(f"[ytapi] submit HTTP {r.status_code}: {r.text[:200]}")
                return None
            data = r.json()
            job_id = data.get("jobId") or data.get("job_id") or data.get("id")
            title  = data.get("title", "")
            # Certaines réponses renvoient directement l'URL si déjà en cache
            download_url = data.get("downloadUrl") or data.get("download_url")
            if not job_id and not download_url:
                logger.warning(f"[ytapi] pas de jobId/downloadUrl: {str(data)[:200]}")
                return None

            # 2) Polling jusqu'à COMPLETED
            if not download_url:
                deadline = _time.time() + poll_timeout
                while _time.time() < deadline:
                    _time.sleep(3)
                    sr = hc.get(f"{YT_DOWNLOAD_API_BASE}/api/v2/download/{job_id}", headers=headers)
                    if sr.status_code != 200:
                        continue
                    sd = sr.json()
                    st = (sd.get("status") or "").upper()
                    if st in ("COMPLETED", "DONE", "SUCCESS"):
                        download_url = sd.get("downloadUrl") or sd.get("download_url")
                        title = title or sd.get("title", "")
                        break
                    if st in ("FAILED", "ERROR", "CANCELLED"):
                        logger.warning(f"[ytapi] job {job_id} status={st}: {sd.get('error','')}")
                        return None
                if not download_url:
                    logger.warning(f"[ytapi] job {job_id} timeout après {poll_timeout}s")
                    return None

            # 3) Téléchargement du fichier résultat vers dest_path (streaming)
            with hc.stream("GET", download_url, headers=headers) as resp:
                if resp.status_code != 200:
                    logger.warning(f"[ytapi] download HTTP {resp.status_code}")
                    return None
                with open(dest_path, "wb") as f:
                    for chunk in resp.iter_bytes(1024 * 256):
                        f.write(chunk)
            if dest_path.exists() and dest_path.stat().st_size > 10_000:
                logger.info(f"[ytapi] OK {fmt} → {dest_path.name} ({dest_path.stat().st_size // 1024} KB)")
                return title or "video"
            logger.warning(f"[ytapi] fichier trop petit/absent")
            dest_path.unlink(missing_ok=True)
            return None
    except Exception as e:
        logger.warning(f"[ytapi] exception: {e}")
        try: dest_path.unlink(missing_ok=True)
        except Exception: pass
        return None


def _ytapi_cached_video(video_id: str, fmt: str = "480") -> Optional[Path]:
    """Télécharge la vidéo complète via l'API tierce UNE FOIS et la met en cache par video_id —
    réutilisée par tous les segments/previews/exports (économise le quota API). None si indispo."""
    if not YT_DOWNLOAD_API_KEY:
        return None
    cache = WORK_DIR / f"ytapi_{video_id}.mp4"
    if cache.exists() and cache.stat().st_size > 10_000:
        return cache
    title = _ytapi_fetch(f"https://www.youtube.com/watch?v={video_id}", fmt, cache)
    return cache if title else None


def _download_audio_for_transcription(youtube_url: str, out_dir: Path) -> tuple:
    """Télécharge audio via InnerTube direct puis yt-dlp fallback.
    Stratégie 0 : InnerTube ANDROID_VR/ANDROID/IOS — URL directe, pas de bot detection.
    Stratégie 1 : yt-dlp + YOUTUBE_COOKIES (authentifiés).
    Stratégie 2 : yt-dlp + bgutil PoToken.
    Stratégie 3 : yt-dlp + clients alternatifs.
    """
    import yt_dlp
    cookies_file = _get_cookies_file()

    m = re.search(r'(?:v=|youtu\.be/|shorts/)([a-zA-Z0-9_-]{11})', youtube_url)
    video_id = m.group(1) if m else None

    # Stratégie 0 : InnerTube direct (bypasse bot detection, pas de cookies nécessaires)
    if video_id:
        innertube = _get_innertube_audio_url(video_id)
        if innertube:
            audio_url, title = innertube
            out_path = out_dir / "audio.m4a"
            try:
                cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", audio_url,
                       "-t", "7200", "-c", "copy", str(out_path)]
                result = subprocess.run(cmd, timeout=600, capture_output=True)
                if result.returncode == 0 and out_path.exists() and out_path.stat().st_size > 10_000:
                    logger.info(f"[innertube-audio] téléchargé OK: {out_path.stat().st_size // 1024} KB")
                    return str(out_path), title
                else:
                    logger.warning(f"[innertube-audio] ffmpeg rc={result.returncode} size={out_path.stat().st_size if out_path.exists() else 0}")
                    out_path.unlink(missing_ok=True)
            except Exception as e:
                logger.warning(f"[innertube-audio] ffmpeg err: {e}")
                out_path.unlink(missing_ok=True)

    # Si pas de YOUTUBE_COOKIES statique du tout → cookies frais Playwright d'emblée
    if m and not cookies_file:
        pw = _get_yt_cookies_playwright_sync(m.group(1), out_dir)
        if pw:
            cookies_file = pw
            logger.info("[download] cookies Playwright (pas de YOUTUBE_COOKIES)")

    # Stratégies séparées — ordre de priorité
    attempts = [
        # 1. Railway IP + bgutil (PoToken cohérent avec l'IP de la requête)
        {"proxy": None, "extractor_args": _yt_extractor_args(), "label": "railway+bgutil"},
        # 2. Webshare IP + android/ios (pas de PoToken nécessaire, IP résidentielle)
        *(
            [{"proxy": RESIDENTIAL_PROXY_URL,
              # Meme alignement client/jeton que la strategie 1 : bgutil ne produit un jeton
              # valide que pour web/mweb. Avec android/ios le jeton ne correspond plus au
              # visitor_data, la liste de formats revient vide et yt-dlp annonce
              # "Requested format is not available" — message trompeur, c'est l'auth qui tombe.
              "extractor_args": _yt_extractor_args(),
              "label": "webshare+web"}]
            if RESIDENTIAL_PROXY_URL else []
        ),
        # 3. Railway IP clients alternatifs (android_creator, mweb — moins bloqués)
        {"proxy": None, "extractor_args": {"youtube": {"player_client": ["mweb", "web"]}},
         # android_creator et android_testsuite n'existent plus dans yt-dlp ; android_vr,
         # android et ios ont leurs formats prives d'URL sauf jeton GVS dedie.
         "label": "railway+web"},
    ]

    audio_formats = ["bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio", "bestaudio/best", "best"]

    def _run_attempts(ck):
        """Tente toutes les stratégies yt-dlp avec le fichier cookies `ck`. Retourne
        (path, title, None) au succès, sinon (None, None, dernière_erreur)."""
        last = None
        for attempt in attempts:
            for fmt in audio_formats:
                try:
                    opts = {
                        "quiet": True, "no_warnings": True,
                        "outtmpl": str(out_dir / "audio.%(ext)s"),
                        "check_formats": False, "no_playlist": True,
                        "extractor_args": attempt["extractor_args"],
                        "socket_timeout": 120, "retries": 3,
                    }
                    if fmt: opts["format"] = fmt
                    if ck: opts["cookiefile"] = ck
                    if attempt["proxy"]: opts["proxy"] = attempt["proxy"]
                    logger.info(f"yt-dlp audio: {attempt['label']} fmt={fmt}")
                    with yt_dlp.YoutubeDL(opts) as ydl:
                        info = ydl.extract_info(youtube_url, download=True)
                        title = (info or {}).get("title", "")
                    for p in out_dir.glob("audio.*"):
                        if p.stat().st_size > 1000:
                            logger.info(f"Audio OK [{attempt['label']}]: {p.name} ({p.stat().st_size // 1024} KB)")
                            return str(p), title, None
                except Exception as e:
                    err_str = str(e)
                    logger.warning(f"yt-dlp [{attempt['label']}] fmt={fmt} failed: {err_str[:200]}")
                    last = e
                    for p in out_dir.glob("audio.*"):
                        p.unlink(missing_ok=True)
                    if attempt["proxy"] and ("proxy" in err_str.lower() or "502" in err_str or "tunnel" in err_str.lower()):
                        break
        return None, None, last

    # 1) Essai avec le cookie statique (YOUTUBE_COOKIES)
    path, title, last_err = _run_attempts(cookies_file)
    if path:
        return path, title

    # 1b) RETRY sur bot-check TRANSITOIRE : le blocage de l'IP datacenter Railway est souvent
    # temporaire (la même vidéo passe quelques secondes/minutes plus tard). On attend puis on
    # retente — gros gain de fiabilité sans rien payer.
    if last_err and "not a bot" in str(last_err).lower():
        import time as _t
        for _wait in (7, 12):
            logger.info(f"[audio] bot-check → attente {_wait}s puis retry (blocage souvent transitoire)")
            _t.sleep(_wait)
            path, title, _e2 = _run_attempts(cookies_file)
            if path:
                logger.info(f"[audio] ✓ débloqué au retry (après {_wait}s)")
                return path, title
            last_err = _e2 or last_err

    # 2) RAFRAÎCHISSEMENT COOKIE AUTOMATIQUE : sur bot-check, on récupère des cookies FRAIS via
    # Playwright (navigateur headless depuis l'IP Railway) puis on re-tente. Résout les cas où le
    # cookie statique s'est "usé" / fait flagger, sans manip manuelle.
    if video_id and last_err and "not a bot" in str(last_err).lower():
        logger.info("[audio] bot-check → rafraîchissement cookies auto (Playwright)")
        fresh = _get_yt_cookies_playwright_sync(video_id, out_dir, force=True)
        if fresh and fresh != cookies_file:
            path, title, last_err = _run_attempts(fresh)
            if path:
                logger.info("[audio] ✓ débloqué avec cookies frais (Playwright)")
                return path, title

    # 3) DERNIER RECOURS : API tierce mp3 (rare, ~0 crédit) — seulement si tout le gratuit a échoué.
    if YT_DOWNLOAD_API_KEY:
        api_out = out_dir / "audio_api.mp3"
        title = _ytapi_fetch(youtube_url, "mp3", api_out)
        if title:
            logger.info("[audio] secours API mp3 utilisé (chemins gratuits épuisés)")
            return str(api_out), title

    raise RuntimeError(f"Téléchargement audio échoué: {last_err}")


def download_video(youtube_url: str, out_dir: Path) -> str:
    """Même logique que _download_audio : sépare les stratégies pour éviter mismatch IP/PoToken."""
    import yt_dlp
    cookies_file = _get_cookies_file()

    m = re.search(r'(?:v=|youtu\.be/|shorts/)([a-zA-Z0-9_-]{11})', youtube_url)
    if m:
        pw_cookies = _get_yt_cookies_playwright_sync(m.group(1), out_dir)
        if pw_cookies and not cookies_file:
            cookies_file = pw_cookies
            logger.info("[download_video] cookies Playwright utilisés (pas de YOUTUBE_COOKIES)")
    if cookies_file:
        logger.info("yt-dlp video: cookies actifs")

    # ⚠️ PAS de proxy résidentiel ici : download_video tire la VIDÉO ENTIÈRE (500 Mo-1,5 Go).
    # Faire passer ça par le proxy vidait 1 Go en quelques minutes. Le proxy est réservé aux
    # téléchargements de SEGMENT 60 s (_run_raw_segment / download_video_section, ~30 Mo).
    attempts = [
        {"proxy": None, "extractor_args": _yt_extractor_args(), "label": "railway+bgutil"},
        {"proxy": None, "extractor_args": _yt_extractor_args(), "label": "railway+android"},
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
              "extractor_args": _yt_extractor_args(),
              "label": "webshare+android+section"}]
            if RESIDENTIAL_PROXY_URL else []
        ),
        {"proxy": None, "extractor_args": _yt_extractor_args(), "label": "railway+android+section"},
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

    # Secours API (rare — seulement si yt-dlp bot-bloqué) : vidéo complète en cache puis découpe
    # locale de la section. Consomme du crédit, donc utilisé uniquement après échec du gratuit.
    _mv = re.search(r'(?:v=|youtu\.be/|shorts/)([a-zA-Z0-9_-]{11})', youtube_url)
    _vid = _mv.group(1) if _mv else None
    if _vid and YT_DOWNLOAD_API_KEY:
        cached = _ytapi_cached_video(_vid, "480")
        if cached and cached.exists():
            api_seg = out_dir / "source_apiseg.mp4"
            r = subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-ss", str(start), "-t", str(end - start),
                 "-i", str(cached), "-c", "copy", str(api_seg)],
                capture_output=True)
            if r.returncode == 0 and api_seg.exists() and api_seg.stat().st_size > 10_000:
                logger.info("[section] secours API utilisé (yt-dlp bot-bloqué)")
                return str(api_seg)

    logger.warning(f"Section download failed ({last_err}), fallback vers téléchargement complet")
    return download_video(youtube_url, out_dir)


# ── 2. TRANSCRIPTION ─────────────────────────────────────────────────────────

def _extract_audio(media_path: str, out_path: str) -> float:
    """Extrait audio en mp3 mono 16kHz 32kbps. Retourne la taille en MB."""
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", media_path,
        "-ar", "16000", "-ac", "1", "-b:a", "32k",
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
                    data={"model": "whisper-large-v3-turbo", "response_format": "verbose_json",
                          "timestamp_granularities[]": "word",
                          **({"language": TRANSCRIBE_LANG} if TRANSCRIBE_LANG else {})},
                    files={"file": ("audio.mp3", f, "audio/mpeg")},
                )
        r.raise_for_status()
        data = r.json()
        duration = float(data.get("duration", 0))
        raw_words = data.get("words", [])
        if raw_words:
            WORDS_PER_LINE = 4
            segments = []
            # Bornes monotones : Groq renvoie parfois un mot qui commence AVANT la fin du
            # precedent (mesure : "grand." finit a 2.02 alors que "C'est" commence a 1.98).
            # Sans correction, deux segments s'affichent simultanement et l'ecran clignote.
            _prev_end = 0.0
            _mots = []
            for w in raw_words:
                _t = (w.get("word") or w.get("text") or "").strip()
                # Whisper émet parfois des jetons de ponctuation SEULS ("...", "…", "-").
                # Ils n'apportent aucun texte mais portent les horodatages du silence : gardés,
                # ils étirent la cue jusqu'à la reprise de parole et le sous-titre reste affiché
                # pendant tout le blanc. Constaté à l'image ("BRINGE-TOI … … C'EST").
                if not _t or not any(c.isalnum() for c in _t):
                    continue
                _s = max(float(w.get("start", 0)), _prev_end)
                _e = float(w.get("end", _s + 0.12))
                if _e <= _s:
                    _e = _s + 0.12
                _prev_end = _e
                _mots.append({"word": _t, "start": _s, "end": _e})

            # Découpage : par paquets de WORDS_PER_LINE, MAIS on ferme la cue dès qu'un silence
            # dépasse le seuil. Sans ça, deux mots séparés par 15 s de silence se retrouvent
            # dans la même cue et le texte reste à l'écran d'un bout à l'autre.
            _SILENCE_MAX = 0.7
            _groupes, _cur = [], []
            for _i, _w in enumerate(_mots):
                if _cur:
                    _trou = _w["start"] - _cur[-1]["end"]
                    if _trou > _SILENCE_MAX or len(_cur) >= WORDS_PER_LINE:
                        _groupes.append(_cur); _cur = []
                _cur.append(_w)
            if _cur:
                _groupes.append(_cur)

            for chunk in _groupes:
                t0 = chunk[0]["start"]
                # Fin = fin du dernier mot, jamais au-delà : c'est ce qui fait disparaître le
                # sous-titre dès que la personne se tait.
                t1 = chunk[-1]["end"]
                text = " ".join(w["word"] for w in chunk)
                if text.strip():
                    # `words` conserve les timings REELS de chaque mot. Sans eux, tout rendu
                    # mot-a-mot ou ligne-par-ligne doit les reinventer par division egale du
                    # segment — c'est ce qui desynchronise le karaoke aujourd'hui.
                    segments.append({"start": t0, "end": t1, "text": text, "words": chunk})
        else:
            segments = [
                {"start": float(s["start"]), "end": float(s["end"]), "text": s["text"].strip()}
                for s in data.get("segments", [])
            ]
        if not duration and segments:
            duration = segments[-1]["end"]
        logger.info(f"[groq-whisper] {len(segments)} segments {duration:.0f}s")
        return {"duration": duration, "segments": segments}
    finally:
        Path(audio_path).unlink(missing_ok=True)


_whisper_model_cache = None

def _get_whisper_model():
    # Rechargé sur chaque appel avant ce fix : coûteux et inutile, le modèle ne change jamais
    # (aggrave le risque de timeout sur les vidéos longues qui retombent déjà sur ce fallback CPU).
    global _whisper_model_cache
    if _whisper_model_cache is None:
        from faster_whisper import WhisperModel
        logger.info(f"[whisper-local] chargement modèle model={WHISPER_MODEL} device=cpu")
        _whisper_model_cache = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    return _whisper_model_cache

def _transcribe_local(media_path: str) -> Dict:
    logger.info(f"[whisper-local] model={WHISPER_MODEL} device=cpu")
    model = _get_whisper_model()
    # beam_size=5 (Ret) était trop lent en CPU pur sur les vidéos longues — beam_size=1 est
    # nettement plus rapide (quasi le seul levier dispo sur ce fallback) pour rester sous le
    # timeout client, au prix d'une précision légèrement inférieure à celle de Groq (fallback
    # seulement, pas le chemin principal).
    segs_iter, info = model.transcribe(
        media_path, beam_size=1, vad_filter=True, condition_on_previous_text=False,
        language=(TRANSCRIBE_LANG or None)
    )
    segments = [
        {"start": float(s.start), "end": float(s.end), "text": (s.text or "").strip()}
        for s in segs_iter
    ]
    duration = float(getattr(info, "duration", 0.0)) or (segments[-1]["end"] if segments else 0.0)
    logger.info(f"[whisper-local] {len(segments)} segments {duration:.0f}s "
                f"langue={getattr(info, 'language', '?')} "
                f"conf={getattr(info, 'language_probability', 0):.2f} "
                f"imposee={TRANSCRIBE_LANG or 'auto'}")
    return {"duration": duration, "segments": segments}


async def transcribe(media_path: str) -> Dict:
    """Groq Whisper en priorité (rapide), local en fallback.
    Un 429 (rate limit, cf. quota Groq free 30 RPM) tombait direct sur le fallback local
    lent — un seul retry après un court backoff évite ce fallback pour ce qui n'est qu'un
    pic de charge temporaire, pas une vraie panne Groq."""
    if GROQ_API_KEY:
        for attempt in range(2):
            try:
                return await _transcribe_groq(media_path)
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429 and attempt == 0:
                    logger.warning("Groq Whisper rate-limited (429) — retry dans 3s avant fallback local")
                    await asyncio.sleep(3)
                    continue
                logger.warning(f"Groq Whisper failed ({e}) — fallback local")
                break
            except Exception as e:
                logger.warning(f"Groq Whisper failed ({e}) — fallback local")
                break
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
- Include hook_sentence: a short, punchy line (max ~12 words) capturing the most attention-grabbing
  moment IN this specific clip — the twist, the reveal, the punchline. Not necessarily its literal
  opening line. Also include virality_reason (one sentence why this is viral)

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
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-threads", "2",
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
    w = int(v.get("width", 1920))
    h = int(v.get("height", 1080))
    # Rotation metadata : vidéos iPhone/Android encodées en paysage avec rotate=90/270
    # ffprobe retourne les dimensions codées, ffmpeg les applique — on swap pour le vrai ratio
    rotation = 0
    try:
        rotation = int(v.get("tags", {}).get("rotate", 0))
    except (ValueError, TypeError):
        pass
    for sd in v.get("side_data_list", []):
        if "rotation" in sd:
            try: rotation = abs(int(sd["rotation"]))
            except (ValueError, TypeError): pass
    if abs(rotation) in (90, 270):
        w, h = h, w
    logger.info(f"[dimensions] {in_path.split('/')[-1]}: {w}x{h} (rotation={rotation})")
    return w, h


def _make_hook_pill_png(text: str, fg_hex: str, bg_hex: str, font_size_pt: int, canvas_w: int = 720):
    """Génère un PNG transparent (largeur canvas) avec une pill arrondie centrée.
    Retourne (bytes_png, pill_height_px)."""
    from PIL import Image, ImageDraw, ImageFont

    def hex2rgba(h: str, a: int = 255):
        h = h.lstrip("#").upper().zfill(6)
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)

    fg = hex2rgba(fg_hex)
    bg = hex2rgba(bg_hex)

    font = None
    for fp in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
               "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]:
        if os.path.exists(fp):
            try: font = ImageFont.truetype(fp, font_size_pt); break
            except: pass
    if font is None:
        font = ImageFont.load_default()

    tmp = Image.new("RGBA", (1, 1))
    bbox = ImageDraw.Draw(tmp).textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]

    pad_h = max(14, int(font_size_pt * 0.55))
    pad_v = max(10, int(font_size_pt * 0.32))
    pw = tw + pad_h * 2
    ph = th + pad_v * 2
    radius = ph // 2  # pill complète

    img = Image.new("RGBA", (canvas_w, ph), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    x0 = (canvas_w - pw) // 2
    draw.rounded_rectangle([x0, 0, x0 + pw, ph - 1], radius=radius, fill=bg)
    tx = (canvas_w - tw) // 2 - bbox[0]
    ty = pad_v - bbox[1]
    draw.text((tx, ty), text, font=font, fill=fg)

    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue(), ph


def _detect_letterbox(in_path: str, src_w: int, src_h: int):
    """Détecte des bandes noires déjà présentes DANS la source (fréquent avec du contenu
    re-téléchargé/recompilé) via cropdetect ffmpeg. Sans ça, une source déjà proche du
    9:16 mais avec des bandes noires intégrées passe telle quelle (bug rapporté :
    bordures noires visibles en haut/bas sur l'export final, présentes dès la source).
    Retourne (x,y,w,h) de la zone utile, ou None si rien de significatif détecté."""
    try:
        r = subprocess.run(
            ["ffmpeg", "-i", in_path, "-t", "8", "-vf", "cropdetect=50:2:0", "-f", "null", "-"],
            capture_output=True, text=True, timeout=30,
        )
        matches = re.findall(r"crop=(\d+):(\d+):(\d+):(\d+)", r.stderr)
        if not matches:
            return None
        w, h, x, y = (int(v) for v in matches[-1])
        # Ignore si ça ne retire presque rien (évite les faux positifs sur scènes sombres)
        if w >= src_w * 0.97 and h >= src_h * 0.97:
            return None
        logger.info(f"[letterbox] détecté dans la source : zone utile {w}x{h}@{x},{y} (source {src_w}x{src_h})")
        return (x, y, w, h)
    except Exception as e:
        logger.info(f"[letterbox] détection échouée ({e}), ignorée")
        return None


def _reframe_vertical(in_path: str, out_path: str, aspect_ratio: str = "9:16", reframe_mode: str = "center", overlay_vf: str = "", pill_png_path: Optional[str] = None, pill_y_px: int = 0, manual_x_frac: Optional[float] = None) -> None:
    tw, th = (float(x) for x in aspect_ratio.split(":"))
    target_ratio = tw / th

    src_w, src_h = _get_video_dimensions(in_path)

    lb = _detect_letterbox(in_path, src_w, src_h)
    lb_prefix = ""
    lb_x = 0
    if lb:
        lb_x, lb_y, lb_w, lb_h = lb
        lb_prefix = f"crop={lb_w}:{lb_h}:{lb_x}:{lb_y},"
        src_w, src_h = lb_w, lb_h  # tout le calcul qui suit se base sur la zone utile réelle

    src_ratio = src_w / src_h

    # Déjà au bon ratio (±1.5%) → juste scale à 720×1280, pas de crop
    if abs(src_ratio - target_ratio) / target_ratio < 0.015:
        logger.info(f"[reframe] already {aspect_ratio} ({src_w}x{src_h}) — scale only, no crop")
        vf = f"{lb_prefix}scale=720:1280"
    else:
        # Calcule le crop vers le ratio cible
        if target_ratio < src_ratio:
            crop_w = int(src_h * target_ratio)
            crop_h = src_h
        else:
            crop_w = src_w
            crop_h = int(src_w / target_ratio)
        crop_w = max(2, crop_w - crop_w % 2)
        crop_h = max(2, crop_h - crop_h % 2)

        x_default = (src_w - crop_w) // 2
        y0 = (src_h - crop_h) // 2

        x_crop = x_default  # par défaut : crop centré

        # Cadrage MANUEL (glisser) — prioritaire, saute la détection de visage.
        if manual_x_frac is not None:
            _cx = int(manual_x_frac * src_w)
            x_crop = max(0, min(src_w - crop_w, _cx - crop_w // 2))
            logger.info(f"[reframe] cadrage manuel x_frac={manual_x_frac:.2f} → x={x_crop}")
        # Face tracking uniquement si reframe_mode == "face" et pas de position manuelle
        elif reframe_mode == "face":
            try:
                import cv2
                cap = cv2.VideoCapture(in_path)
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
                cascades = [
                    cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml"),
                    cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml"),
                ]
                sample_frames = [int(total_frames * i / 8) for i in range(1, 8)]
                centers = []
                for fi in sample_frames:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, fi)
                    ret, frame = cap.read()
                    if not ret:
                        continue
                    h, w = frame.shape[:2]
                    scale = min(1.0, 640 / w)
                    if scale < 1.0:
                        frame = cv2.resize(frame, (int(w * scale), int(h * scale)))
                    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                    cv2.equalizeHist(gray, gray)
                    faces = []
                    for cas in cascades:
                        faces = cas.detectMultiScale(gray, 1.1, 3, minSize=(20, 20))
                        if len(faces) > 0:
                            break
                    if len(faces) > 0:
                        fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])
                        centers.append(int((fx + fw // 2) / scale))
                cap.release()
                # Exige un visage détecté dans au moins la moitié des frames échantillonnées —
                # sinon un faux positif isolé (élément de HUD/texture de jeu confondu avec un
                # visage par le Haar cascade, contenu gaming notamment) suffisait à décaler tout
                # le crop vers un bord de l'image au lieu de rester centré.
                if len(centers) >= max(2, len(sample_frames) // 2):
                    median_cx = sorted(centers)[len(centers) // 2]
                    if lb_x:  # cv2 lit in_path en coordonnées d'origine — recale sur la zone utile post-letterbox
                        median_cx -= lb_x
                    x_crop = max(0, min(src_w - crop_w, median_cx - crop_w // 2))
                    logger.info(f"[reframe] face tracking: médiane={median_cx}px ({len(centers)}/{len(sample_frames)} frames)")
                else:
                    logger.info(f"[reframe] face tracking: signal trop faible ({len(centers)}/{len(sample_frames)} frames) — crop centré")
            except Exception as e:
                logger.info(f"[reframe] face tracking skipped ({e}) — crop centré")
        else:
            logger.info(f"[reframe] mode={reframe_mode} — crop centré")

        # Pre-scale pour tout contenu > 720p (évite OOM sur Railway avec gaming/1080p)
        if src_w > 1280 or src_h > 720:
            sx = min(1280 / src_w, 720 / src_h)
            pw = int(src_w * sx / 2) * 2
            ph = int(src_h * sx / 2) * 2
            cw = max(2, int(crop_w * sx / 2) * 2)
            ch = max(2, int(crop_h * sx / 2) * 2)
            xc = max(0, min(pw - cw, int(x_crop * sx)))
            yy = max(0, int(y0 * sx))
            vf = f"{lb_prefix}scale={pw}:{ph}:flags=fast_bilinear,crop={cw}:{ch}:{xc}:{yy},scale=720:1280"
            logger.info(f"[reframe] pre-scale {src_w}x{src_h}→{pw}x{ph}, crop={cw}x{ch}@{xc},{yy}")
        else:
            vf = f"{lb_prefix}crop={crop_w}:{crop_h}:{x_crop}:{y0},scale=720:1280"
            logger.info(f"[reframe] {src_w}x{src_h} → crop={crop_w}x{crop_h}@{x_crop},{y0} → 720x1280")

    _enc_tail = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                 "-pix_fmt", "yuv420p", "-threads", "2", "-movflags", "+faststart",
                 "-c:a", "aac", "-b:a", "128k", out_path]

    if pill_png_path:
        vf_base = f"{vf},{overlay_vf}" if overlay_vf else vf
        fc = (
            f"[0:v]{vf_base}[sub];"
            f"[1:v]format=rgba[pill];"
            f"[sub][pill]overlay=x=0:y={pill_y_px}:enable=between(t\\,0\\,3):shortest=1[v_out]"
        )
        cmd = [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", in_path,
            "-loop", "1", "-i", pill_png_path,
            "-filter_complex", fc,
            "-map", "[v_out]", "-map", "0:a:0?",
        ] + _enc_tail
    else:
        final_vf = f"{vf},{overlay_vf}" if overlay_vf else vf
        cmd = [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", in_path,
            "-map", "0:v:0", "-map", "0:a:0?",
            "-vf", final_vf,
        ] + _enc_tail
    r = subprocess.run(cmd, capture_output=True, timeout=300)
    if r.returncode != 0:
        err = (r.stdout + r.stderr).decode(errors='replace')[:800]
        if r.returncode == -9 or not err.strip():
            logger.error(f"[reframe] ffmpeg OOM-killed (signal -9) — video too large for available memory")
            raise RuntimeError("Vidéo trop volumineuse — réessaie dans quelques secondes")
        logger.error(f"[reframe] ffmpeg error (code {r.returncode}): {err}")
        raise RuntimeError(f"ffmpeg crop: {err}")


def crop_clip(source: str, start: float, end: float, out: str) -> None:
    cut_tmp = out + ".cut.mp4"
    try:
        _cut_subclip(source, start, end, cut_tmp)
        _reframe_vertical(cut_tmp, out)
    finally:
        if os.path.exists(cut_tmp):
            os.remove(cut_tmp)


# ── 4b. SPLIT SCREEN DYNAMIQUE ADAPTATIF (podcast/interview) ─────────────────

def _reframe_positional_split(in_path: str, out_path: str, src_w: int, src_h: int, overlay_vf: str = "",
                              left_frac: float = 0.30, right_frac: float = 0.70) -> None:
    """Split 9:16 top/bottom POSITIONNEL : personne du haut cadrée à left_frac de la largeur,
    personne du bas à right_frac. Sans détection de visages (positions fixes ou manuelles via
    glisser). Pour 2 personnes côte à côte dont les visages ne sont pas détectables."""
    ratio = 720 / 640  # aspect d'une moitié
    crop_w = min(src_w, int(src_h * ratio))
    crop_h = int(crop_w / ratio)
    if crop_h > src_h:
        crop_h = src_h; crop_w = int(crop_h * ratio)
    crop_w = max(2, crop_w - crop_w % 2)
    crop_h = max(2, crop_h - crop_h % 2)
    # Positions horizontales des 2 personnes (fractions de largeur, custom ou défaut 30%/70%)
    lx = max(0, min(src_w - crop_w, int(src_w * left_frac) - crop_w // 2))
    rx = max(0, min(src_w - crop_w, int(src_w * right_frac) - crop_w // 2))
    # Biais VERTICAL vers le haut (~28% du haut) : en interview assise, les visages sont dans la
    # partie haute — un centrage vertical strict croppait la table et coupait les têtes.
    top_y = max(0, min(src_h - crop_h, int(src_h * 0.28) - crop_h // 2))
    cy = top_y
    vf_top = f"crop={crop_w}:{crop_h}:{lx}:{cy},scale=720:640"
    vf_bot = f"crop={crop_w}:{crop_h}:{rx}:{cy},scale=720:640"
    stack = f"[0:v]split=2[a][b];[a]{vf_top}[t];[b]{vf_bot}[bt];[t][bt]vstack=inputs=2[st]"
    fc = f"{stack};[st]{overlay_vf}[out]" if overlay_vf else f"{stack};[st]null[out]"
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", in_path,
           "-filter_complex", fc, "-map", "[out]", "-map", "0:a:0?",
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "128k", out_path]
    subprocess.run(cmd, check=True, timeout=180)
    logger.info("[split] ✓ split positionnel gauche/droite")


def _reframe_split_timeline(in_path: str, out_path: str, src_w: int, src_h: int,
                            top_frac: float, bot_frac: float, keyframes: list, overlay_vf: str = "") -> None:
    """Rend le clip par SECTIONS selon les repères manuels (timeline) : split / solo haut / solo bas.
    Chaque intervalle entre 2 repères est rendu dans son mode. Les sous-titres sont appliqués sur
    l'ensemble concaténé (timing correct). C'est le contrôle total 'moment par moment' de l'utilisateur."""
    import tempfile as _tf, shutil as _sh
    # Durée du clip
    _p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", in_path],
                        capture_output=True, text=True)
    try: dur = float(_p.stdout.strip())
    except Exception: dur = 0.0
    if dur <= 0:
        _reframe_positional_split(in_path, out_path, src_w, src_h, overlay_vf, top_frac, bot_frac); return

    # Chaque segment porte SON PROPRE cadrage (slide gauche/droite indépendant) — comme CapCut.
    def _vf(x):
        try: xf = float(x)
        except Exception: return None
        return xf if 0.0 <= xf <= 1.0 else None
    # Construire les intervalles (t0, t1, réglages) — défaut 'split' avant le 1er repère
    kfs = sorted([k for k in keyframes if isinstance(k, dict) and "t" in k], key=lambda k: float(k["t"]))
    ranges = []; prev_t = 0.0
    prev = {"mode": "split", "top": top_frac, "bot": bot_frac, "solo": None}
    for k in kfs:
        kt = max(0.0, min(dur, float(k["t"])))
        if kt > prev_t + 0.05:
            ranges.append((prev_t, kt, prev))
        prev = {
            "mode": k.get("mode", "split"),
            "top": _vf(k.get("topXFrac")) if _vf(k.get("topXFrac")) is not None else top_frac,
            "bot": _vf(k.get("botXFrac")) if _vf(k.get("botXFrac")) is not None else bot_frac,
            "solo": _vf(k.get("xFrac")),
        }
        prev_t = kt
    ranges.append((prev_t, dur, prev))

    # Géométrie
    ratioH = 720 / 640
    cw = min(src_w, int(src_h * ratioH)); ch = int(cw / ratioH)
    if ch > src_h: ch = src_h; cw = int(ch * ratioH)
    cw = max(2, cw - cw % 2); ch = max(2, ch - ch % 2)
    top_y = max(0, min(src_h - ch, int(src_h * 0.28) - ch // 2))
    def split_fc(tf, bf):
        lx = max(0, min(src_w - cw, int(src_w * tf) - cw // 2))
        rx = max(0, min(src_w - cw, int(src_w * bf) - cw // 2))
        vf_t = f"crop={cw}:{ch}:{lx}:{top_y},scale=720:640"
        vf_b = f"crop={cw}:{ch}:{rx}:{top_y},scale=720:640"
        return f"[0:v]split=2[a][b];[a]{vf_t}[t];[b]{vf_b}[bt];[t][bt]vstack=inputs=2[out]"
    def solo_fc(frac):
        sw = int(src_h * 9 / 16); sw = max(2, sw - sw % 2)
        x = max(0, min(src_w - sw, int(src_w * frac) - sw // 2))
        return f"[0:v]crop={sw}:{src_h}:{x}:0,scale=720:1280[out]"

    tmpdir = _tf.mkdtemp(); segs = []; list_file = os.path.join(tmpdir, "concat.txt")
    try:
        for i, (t0, t1, seg_o) in enumerate(ranges):
            if t1 - t0 < 0.05: continue
            mode = seg_o["mode"]
            seg = os.path.join(tmpdir, f"seg_{i:03d}.mp4")
            if mode == "split":
                fc = split_fc(seg_o["top"], seg_o["bot"])
            else:
                # solo : xFrac explicite du segment sinon fraction du côté (haut/bas)
                frac = seg_o["solo"] if seg_o["solo"] is not None else (seg_o["bot"] if mode == "bot" else seg_o["top"])
                fc = solo_fc(frac)
            r = subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{t0:.3f}", "-to", f"{t1:.3f}", "-i", in_path,
                 "-filter_complex", fc, "-map", "[out]", "-map", "0:a:0?",
                 "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
                 "-c:a", "aac", "-b:a", "128k", seg], capture_output=True, timeout=180)
            if r.returncode == 0 and os.path.exists(seg) and os.path.getsize(seg) > 0:
                segs.append(seg)
                logger.info(f"[split-timeline] section {i} {mode} {t0:.1f}-{t1:.1f}s ✓")
        if not segs:
            raise RuntimeError("aucune section générée")
        merged = os.path.join(tmpdir, "merged.mp4")
        if len(segs) == 1:
            _sh.copy(segs[0], merged)
        else:
            with open(list_file, "w") as f:
                for s in segs: f.write(f"file '{s}'\n")
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
                            "-i", list_file, "-c", "copy", merged], check=True, timeout=300)
        # Sous-titres appliqués sur l'ensemble (timing 0-based correct)
        if overlay_vf:
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", merged, "-vf", overlay_vf,
                            "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
                            "-c:a", "copy", out_path], check=True, timeout=300)
        else:
            _sh.copy(merged, out_path)
        logger.info(f"[split-timeline] ✓ {len(segs)} sections")
    except Exception as e:
        logger.warning(f"[split-timeline] échec ({e}) → split positionnel simple")
        _reframe_positional_split(in_path, out_path, src_w, src_h, overlay_vf, top_frac, bot_frac)
    finally:
        _sh.rmtree(tmpdir, ignore_errors=True)


def _reframe_split_dynamic(in_path: str, out_path: str, overlay_vf: str = "", pill_png_path: Optional[str] = None, pill_y_px: int = 0) -> None:
    """
    Split screen 9:16 adaptatif :
    - 2 visages détectés → split top/bottom, locuteur actif en haut
    - 1 visage → face tracking centré sur le visage
    - 0 visage → crop centré
    Analyse toutes les 0.5s pour switcher dynamiquement selon le nombre de visages.
    """
    import cv2
    import numpy as np
    import tempfile
    import shutil
    from collections import Counter

    cap = cv2.VideoCapture(in_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    src_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    src_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()

    if total_frames < 2:
        _reframe_vertical(in_path, out_path, reframe_mode="face", overlay_vf=overlay_vf, pill_png_path=pill_png_path, pill_y_px=pill_y_px)
        return

    face_cascades = [
        cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml"),
        cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml"),
    ]

    def detect_faces_scaled(frame):
        """Détection de VISAGES uniquement (position de tête précise). La détection haut-du-corps
        a été retirée : elle donnait des positions fausses (crop sur la table, même personne 2×).
        Mieux vaut un split précis mais seulement quand les visages sont détectables."""
        h, w = frame.shape[:2]
        scale = min(1.0, 640.0 / w)
        small = cv2.resize(frame, (int(w * scale), int(h * scale))) if scale < 1 else frame
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        cv2.equalizeHist(gray, gray)
        inv = 1.0 / scale
        faces = []
        for cas in face_cascades:
            det = cas.detectMultiScale(gray, 1.1, 4, minSize=(30, 30))
            if len(det) > len(faces):
                faces = det
                if len(faces) >= 2:
                    break
        return [(int((f[0] + f[2] // 2) * inv), int((f[1] + f[3] // 2) * inv),
                 int(f[2] * inv), int(f[3] * inv)) for f in faces]

    # ── 1. Analyser chaque ~0.5s ──
    sample_step = max(1, int(fps * 0.5))
    frame_data = []  # [(fi, [(cx,cy,w,h), ...])]

    cap = cv2.VideoCapture(in_path)
    fi = 0
    while fi < total_frames:
        cap.set(cv2.CAP_PROP_POS_FRAMES, fi)
        ret, frame = cap.read()
        if ret:
            frame_data.append((fi, detect_faces_scaled(frame)))
        fi += sample_step
    cap.release()

    if not frame_data:
        _reframe_vertical(in_path, out_path, reframe_mode="face", overlay_vf=overlay_vf, pill_png_path=pill_png_path, pill_y_px=pill_y_px)
        return

    # ── 2. Positions globales face A / face B (moyennées sur frames 2-visages) ──
    two_face_samples = [(fi, faces) for fi, faces in frame_data if len(faces) >= 2]

    if len(two_face_samples) < 2:
        # Pas 2 visages fiables. Il faut distinguer 2 cas très différents :
        #  - 1 SEULE personne à l'image → split = on la DUPLIQUE en haut ET en bas (bug visuel).
        #    Il faut alors 1 SEUL écran (face tracking centré).
        #  - 2 personnes présentes mais non détectées (têtes baissées / profil, interview à table)
        #    → split POSITIONNEL gauche/droite (ne dépend pas de la détection).
        one_face  = sum(1 for _, faces in frame_data if len(faces) == 1)
        zero_face = sum(1 for _, faces in frame_data if len(faces) == 0)
        if one_face >= zero_face and one_face >= max(2, len(frame_data) // 4):
            # Majorité de frames avec UNE tête → clip à 1 personne → 1 seul écran (jamais de doublon)
            logger.info(f"[split] 1 personne ({one_face} frames 1 visage) → 1 seul écran (pas de doublon)")
            _reframe_vertical(in_path, out_path, reframe_mode="face", overlay_vf=overlay_vf,
                              pill_png_path=pill_png_path, pill_y_px=pill_y_px)
        else:
            logger.info(f"[split] visages non détectés ({zero_face} frames 0 visage) → split positionnel")
            _reframe_positional_split(in_path, out_path, src_w, src_h, overlay_vf)
        return

    def avg_faces(samples_list):
        a, b = [], []
        for _, faces in samples_list:
            sf = sorted(faces, key=lambda f: f[0])
            a.append(sf[0]); b.append(sf[-1])
        def avg(lst): return int(sum(lst) / len(lst))
        fa = tuple(avg([s[i] for s in a]) for i in range(4))
        fb = tuple(avg([s[i] for s in b]) for i in range(4))
        return fa, fb

    face_A, face_B = avg_faces(two_face_samples)
    logger.info(f"[split] Face A=({face_A[0]},{face_A[1]}) Face B=({face_B[0]},{face_B[1]})")

    # ── 3. Speaker detection via mouvement de la bouche ──
    def mouth_region(gray, cx, cy, fw, fh):
        x1 = max(0, cx - fw // 2); x2 = min(gray.shape[1], cx + fw // 2)
        y1 = max(0, cy + fh // 8); y2 = min(gray.shape[0], cy + fh // 2 + 5)
        return gray[y1:y2, x1:x2]

    raw_speaker = {}  # fi → 0 (A parle) ou 1 (B parle)
    prev_mA = prev_mB = None

    cap = cv2.VideoCapture(in_path)
    for fi, faces in frame_data:
        if len(faces) < 2:
            continue
        cap.set(cv2.CAP_PROP_POS_FRAMES, fi)
        ret, frame = cap.read()
        if not ret:
            continue
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        mA = mouth_region(gray, face_A[0], face_A[1], face_A[2], face_A[3])
        mB = mouth_region(gray, face_B[0], face_B[1], face_B[2], face_B[3])
        if prev_mA is not None and prev_mB is not None:
            dA = float(np.mean(np.abs(mA.astype(float) - prev_mA.astype(float)))) if mA.size > 0 and mA.shape == prev_mA.shape else 0.0
            dB = float(np.mean(np.abs(mB.astype(float) - prev_mB.astype(float)))) if mB.size > 0 and mB.shape == prev_mB.shape else 0.0
            raw_speaker[fi] = 0 if dA >= dB else 1
        if mA.size > 0: prev_mA = mA.copy()
        if mB.size > 0: prev_mB = mB.copy()
    cap.release()

    # ── 4. Timeline : (fi, n_faces, speaker) + lissage ──
    timeline = []
    for fi, faces in frame_data:
        n = min(len(faces), 2)
        sp = raw_speaker.get(fi, 0)
        timeline.append([fi, n, sp])

    # Supprimer les outliers isolés (1 sample différent entouré de même valeur)
    for i in range(1, len(timeline) - 1):
        if timeline[i][1] != timeline[i-1][1] and timeline[i][1] != timeline[i+1][1]:
            timeline[i][1] = timeline[i-1][1]

    # Grouper en segments consécutifs de même n_faces
    groups = []  # [(t0, t1, n_faces, speaker)]
    cur_n = timeline[0][1]; cur_start = timeline[0][0]; sp_votes = [timeline[0][2]]
    for fi, n, sp in timeline[1:]:
        if n == cur_n:
            sp_votes.append(sp)
        else:
            maj_sp = Counter(sp_votes).most_common(1)[0][0]
            groups.append([cur_start / fps, fi / fps, cur_n, maj_sp])
            cur_n = n; cur_start = fi; sp_votes = [sp]
    maj_sp = Counter(sp_votes).most_common(1)[0][0]
    groups.append([cur_start / fps, total_frames / fps, cur_n, maj_sp])

    # Fusionner les segments < 1s avec le voisin précédent
    merged = []
    for g in groups:
        if merged and (g[1] - g[0]) < 1.0:
            merged[-1][1] = g[1]
        else:
            merged.append(list(g))
    groups = merged

    logger.info(f"[split] {len(groups)} groupes: {[(g[2], f'{g[1]-g[0]:.1f}s') for g in groups]}")

    # ── 5. Helpers VF ──
    def make_vf(cx, cy, fw, fh, out_w, out_h):
        """Crop centré sur le visage puis scale."""
        ratio = out_w / out_h
        crop_w = min(src_w, max(fw * 3, int(src_h * ratio)))
        crop_h = int(crop_w / ratio)
        if crop_h > src_h:
            crop_h = src_h; crop_w = int(crop_h * ratio)
        crop_w = max(2, crop_w - crop_w % 2)
        crop_h = max(2, crop_h - crop_h % 2)
        x = max(0, min(src_w - crop_w, cx - crop_w // 2))
        y = max(0, min(src_h - crop_h, cy - crop_h // 2))
        return f"crop={crop_w}:{crop_h}:{x}:{y},scale={out_w}:{out_h}"

    def make_half_vf(cx, cy, fw, fh, out_w=720, out_h=640):
        """Crop centré sur le visage à l'aspect d'une moitié (9:8) puis scale à 720x640 —
        pour le split top/bottom, chaque visage centré dans sa moitié."""
        ratio = out_w / out_h  # 720/640 = 1.125
        crop_w = min(src_w, max(int(fw * 2.6), int(src_h * ratio)))
        crop_h = int(crop_w / ratio)
        if crop_h > src_h:
            crop_h = src_h; crop_w = int(crop_h * ratio)
        crop_w = max(2, crop_w - crop_w % 2)
        crop_h = max(2, crop_h - crop_h % 2)
        x = max(0, min(src_w - crop_w, cx - crop_w // 2))
        y = max(0, min(src_h - crop_h, cy - crop_h // 2))
        return f"crop={crop_w}:{crop_h}:{x}:{y},scale={out_w}:{out_h}"

    def center_vf(out_w=720, out_h=1280):
        crop_w = int(src_h * out_w / out_h)
        crop_w = max(2, crop_w - crop_w % 2)
        x = (src_w - crop_w) // 2
        return f"crop={crop_w}:{src_h}:{x}:0,scale={out_w}:{out_h}"

    vf_A_full = make_vf(face_A[0], face_A[1], face_A[2], face_A[3], 720, 1280)
    vf_B_full = make_vf(face_B[0], face_B[1], face_B[2], face_B[3], 720, 1280)

    # ── 6. Générer les segments ──
    tmpdir = tempfile.mkdtemp()
    segment_files = []
    list_file = os.path.join(tmpdir, "concat.txt")

    try:
        for grp_idx, (t0, t1, n_faces, speaker) in enumerate(groups):
            if t1 - t0 < 0.05:
                continue
            seg_out = os.path.join(tmpdir, f"seg_{grp_idx:04d}.mp4")

            base = ["ffmpeg", "-y", "-loglevel", "error",
                    "-ss", f"{t0:.3f}", "-to", f"{t1:.3f}", "-i", in_path]
            tail = ["-map", "[out]", "-map", "0:a:0?",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                    "-pix_fmt", "yuv420p", "-threads", "2",
                    "-c:a", "aac", "-b:a", "128k", seg_out]

            if n_faces >= 2:
                # Split top/bottom : les 2 visages visibles simultanément, chacun centré dans
                # sa moitié (visage gauche en haut, visage droit en bas). Pas d'auto-speaker.
                vf_top = make_half_vf(face_A[0], face_A[1], face_A[2], face_A[3])
                vf_bot = make_half_vf(face_B[0], face_B[1], face_B[2], face_B[3])
                stack = (f"[0:v]split=2[va][vb];[va]{vf_top}[top];[vb]{vf_bot}[bot];"
                         f"[top][bot]vstack=inputs=2[st]")
                fc = f"{stack};[st]{overlay_vf}[out]" if overlay_vf else f"{stack};[st]null[out]"
                mode_str = "split-2"
            elif n_faces == 1:
                # Trouver la face la plus proche de ce segment
                seg_mid = (t0 + t1) / 2
                closest = min(frame_data, key=lambda x: abs(x[0] / fps - seg_mid))
                if closest[1]:
                    f1 = closest[1][0]
                    vf = make_vf(f1[0], f1[1], f1[2], f1[3], 720, 1280)
                else:
                    vf = center_vf()
                vf_final = f"{vf},{overlay_vf}" if overlay_vf else vf
                fc = f"[0:v]{vf_final}[out]"
                mode_str = "face"
            else:
                vf = center_vf()
                vf_final = f"{vf},{overlay_vf}" if overlay_vf else vf
                fc = f"[0:v]{vf_final}[out]"
                mode_str = "center"

            r = subprocess.run(base + ["-filter_complex", fc] + tail,
                               capture_output=True, timeout=120)
            if r.returncode == 0 and os.path.exists(seg_out) and os.path.getsize(seg_out) > 0:
                segment_files.append(seg_out)
                logger.info(f"[split] grp {grp_idx} {mode_str} ({t0:.1f}s-{t1:.1f}s) ✓")
            else:
                err = (r.stdout + r.stderr).decode(errors="replace")[:200]
                logger.warning(f"[split] grp {grp_idx} échoué: {err}")

        if not segment_files:
            raise RuntimeError("Aucun segment généré")

        if len(segment_files) == 1:
            shutil.copy(segment_files[0], out_path)
        else:
            with open(list_file, "w") as f:
                for seg in segment_files:
                    f.write(f"file '{seg}'\n")
            r = subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
                 "-i", list_file, "-c", "copy", out_path],
                capture_output=True, timeout=300
            )
            if r.returncode != 0:
                raise RuntimeError(f"concat: {(r.stdout+r.stderr).decode(errors='replace')[:300]}")

        logger.info(f"[split] ✓ split adaptatif ({len(segment_files)} segments)")

    except Exception as e:
        logger.warning(f"[split] erreur ({e}) — fallback face tracking")
        _reframe_vertical(in_path, out_path, reframe_mode="face", overlay_vf=overlay_vf, pill_png_path=pill_png_path, pill_y_px=pill_y_px)
    finally:
        for f in segment_files:
            try: os.remove(f)
            except: pass
        try: os.remove(list_file)
        except: pass
        try: os.rmdir(tmpdir)
        except: pass


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

        async def _extract_one(i: int, h: dict):
            out_path = str(out_dir / f"short_{i + 1:02d}_{job_id[:8]}.mp4")
            try:
                await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda st=float(h["start_time"]), en=float(h["end_time"]), o=out_path:
                        crop_clip(source, st, en, o),
                )
                size_mb = round(Path(out_path).stat().st_size / 1_048_576, 1)
                logger.info(f"Short {i + 1} OK  {size_mb} MB")
                return {
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
                }
            except Exception as e:
                logger.error(f"Short {i + 1} FAILED: {e}")
                return None

        upd(f"Extraction {len(top)} clips en parallèle…")
        results = await asyncio.gather(
            *[_extract_one(i, h) for i, h in enumerate(top)],
            return_exceptions=True,
        )
        clips = [r for r in results if isinstance(r, dict)]

        if source:
            Path(source).unlink(missing_ok=True)

        if not clips:
            raise RuntimeError("Tous les shorts ont échoué")

        JOBS[job_id] = {"status": "done", "clips": clips, "_ts": _time.time()}
        _cleanup_old_jobs()

    except Exception as e:
        logger.error(f"Job {job_id[:8]} fatal: {e}")
        if source:
            Path(source).unlink(missing_ok=True)
        JOBS[job_id] = {"status": "error", "error": str(e), "_ts": _time.time()}


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


_GROQ_CONTENT_TYPE_PROMPT = """Classe ce contenu. Choisis un type parmi : podcast, interview, tutoriel, conférence,
commentaire, débat, vlog, autre. Réponds UNIQUEMENT en JSON, sans markdown :
{"content_type": "...", "hint": "1 phrase sur ce qui rend CE type de contenu viral en clip court"}"""


async def _classify_content_type_groq(sample_text: str) -> Dict:
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={"model": "llama-3.3-70b-versatile",
                      "messages": [{"role": "user", "content": f"{_GROQ_CONTENT_TYPE_PROMPT}\n\nExtrait :\n{sample_text[:2000]}"}],
                      "temperature": 0.3, "max_tokens": 200},
            )
            r.raise_for_status()
            raw = r.json()["choices"][0]["message"]["content"].strip()
        return _parse_json(raw)
    except Exception as e:
        logger.warning(f"[identify_clips] classification type échouée: {e}")
        return {"content_type": "autre", "hint": ""}


def _chunk_segments(segments: List[Dict], chunk_chars: int = 7000, overlap: int = 5, max_chunks: int = 8) -> List[List[Dict]]:
    """Découpe les segments en morceaux d'environ chunk_chars caractères, avec un léger
    chevauchement entre morceaux pour ne pas rater un moment fort à cheval sur une coupure."""
    chunks: List[List[Dict]] = []
    cur: List[Dict] = []
    cur_len = 0
    chunk_start = 0  # index du 1er segment du morceau en cours
    i = 0
    while i < len(segments):
        s = segments[i]
        cur.append(s)
        cur_len += len(s.get("text", "")) + 20
        is_last = i == len(segments) - 1
        if cur_len >= chunk_chars or is_last:
            chunks.append(cur)
            if is_last:
                break
            # Prochain morceau : recule de `overlap` segments (sans dépasser le début du morceau
            # courant, pour toujours avancer) — évite de rater un moment fort à cheval sur la coupure.
            i = max(chunk_start, i - overlap + 1) + 1
            chunk_start = i
            cur, cur_len = [], 0
        else:
            i += 1
    return chunks[:max_chunks]


async def _identify_clips(transcript: Dict, n: int) -> List[Dict]:
    if GROQ_API_KEY:
        segments = transcript["segments"]
        full_text = "\n".join(f"[{s['start']:.1f}s-{s['end']:.1f}s] {s['text']}" for s in segments)

        # Découpage multi-passes : avant ce fix, le transcript était tronqué à 8000 caractères
        # (~8-10min de parole) — pour une vidéo de 50min, l'IA ne voyait donc jamais 80% du contenu
        # et ne pouvait choisir des clips que dans les toutes premières minutes.
        chunks = _chunk_segments(segments)
        content_info = await _classify_content_type_groq(full_text) if len(chunks) > 1 else {"content_type": "", "hint": ""}
        content_hint = f"\nType de contenu détecté : {content_info.get('content_type', '')}. {content_info.get('hint', '')}\n" if content_info.get("content_type") else ""

        per_chunk_n = max(2, min(n, 4)) if len(chunks) > 1 else n

        async def analyze_chunk(chunk_segments: List[Dict]) -> List[Dict]:
            chunk_text = "\n".join(f"[{s['start']:.1f}s-{s['end']:.1f}s] {s['text']}" for s in chunk_segments)
            prompt = f"""Tu es un expert en contenu viral TikTok/Shorts/Reels pour créateurs francophones.
{content_hint}
Analyse cet EXTRAIT de transcription et identifie les {per_chunk_n} meilleurs segments à extraire en clips courts viraux.

Critères de sélection (score chaque critère sur 20, total sur 100) :
1. ACCROCHE (0-20) : le segment commence par quelque chose qui accroche immédiatement (question, chiffre, affirmation forte, paradoxe)
2. AUTONOMIE (0-20) : le segment se comprend sans contexte — on peut le regarder sans avoir vu la vidéo entière
3. RÉTENTION (0-20) : rythme soutenu, pas de silence ou digression, le spectateur reste jusqu'à la fin
4. VALEUR (0-20) : conseil concret, révélation, moment émotionnel fort, ou information surprenante
5. VIRALITÉ (0-20) : suscite une réaction (surprise, émotion, désaccord, envie de partager)

Règles strictes :
- Durée : entre 30 et 90 secondes (OBLIGATOIRE)
- Pas de chevauchement entre les segments
- Privilégier les moments avec une conclusion claire (pas coupé au milieu d'une idée)
- Le hook est une phrase courte et percutante (10 mots max) qui capture ce qu'il y a de plus
  accrocheur DANS ce segment précis (le twist, la révélation, la punchline) — ce n'est pas
  forcément la première phrase prononcée, choisis ce qui donne le plus envie de regarder

Réponds UNIQUEMENT en JSON valide, sans markdown :
{{"clips":[{{"start_time":12.5,"end_time":67.0,"title":"Titre accrocheur max 8 mots","hook":"Phrase d'accroche courte et percutante tirée du segment","score":88,"virality_reason":"Pourquoi ce moment va performer"}}]}}

Transcription (extrait) :
{chunk_text}"""
            try:
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
            except Exception as e:
                logger.warning(f"[identify_clips] morceau échoué: {e}")
                return []

        # Concurrence bornée — ne pas taper trop fort sur les limites de débit Groq (30 RPM en free)
        sem = asyncio.Semaphore(3)
        async def bounded(c_segs):
            async with sem:
                return await analyze_chunk(c_segs)

        results = await asyncio.gather(*(bounded(c) for c in chunks))
        all_clips = [clip for chunk_clips in results for clip in chunk_clips]
        logger.info(f"[identify_clips] {len(chunks)} morceau(x), {len(all_clips)} candidats avant dédoublonnage")

        # Garde-fou anti-chevauchement en code (pas seulement dans le prompt) — nécessaire dès que
        # plusieurs morceaux sont fusionnés, et rattrape aussi le cas où le modèle suit mal la consigne.
        deduped = _dedupe_highlights(all_clips)
        return deduped[:n]

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
                # Audio seul — moins de CDN protection que vidéo complète
                source = None
                try:
                    result = await asyncio.get_event_loop().run_in_executor(
                        None, lambda: _download_audio_for_transcription(url, out_dir)
                    )
                    source = result[0] if isinstance(result, tuple) else result
                except Exception as e:
                    logger.warning(f"[clips] audio download failed: {e}")
                if not source:
                    raise RuntimeError(f"Téléchargement audio échoué: impossible d'obtenir l'audio")
            transcript = await transcribe(source)
            Path(source).unlink(missing_ok=True)

        if not transcript or not transcript["segments"]:
            raise RuntimeError("Impossible d'obtenir la transcription")

        clips = await _identify_clips(transcript, n_clips)
        CLIPS[session_id] = {"status": "done", "result": clips, "_ts": _time.time()}
        _cleanup_old_jobs()

    except Exception as e:
        logger.error(f"Clips {session_id[:8]} fatal: {e}")
        CLIPS[session_id] = {"status": "error", "error": str(e), "_ts": _time.time()}


# ── /clip-export — download + cut + crop a specific moment ────────────────────

async def run_clip_export(job_id: str, video_id: str, start: float, end: float, out_dir: Path) -> None:
    source = str(out_dir / "source.mp4")
    try:
        CLIP_EXPORTS[job_id]["progress"] = "Téléchargement section…"

        # Fichier uploadé localement (video_id préfixé "u_")
        upload_source = UPLOAD_DIR / video_id / "source.mp4"
        if upload_source.exists():
            logger.info(f"[clip-export] fichier local upload: {video_id}")
            import shutil
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: shutil.copy2(str(upload_source), source)
            )
            # Couper la section voulue depuis le fichier complet
            cut = str(out_dir / "cut.mp4")
            duration = end - start
            cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", source,
                   "-ss", str(start), "-t", str(duration),
                   "-c", "copy", cut]
            subprocess.run(cmd, check=True)
            Path(source).unlink(missing_ok=True)
            Path(cut).rename(source)
        else:
            yt_url = f"https://www.youtube.com/watch?v={video_id}"
            section_path = await asyncio.get_event_loop().run_in_executor(
                None, lambda: download_video_section(yt_url, out_dir, start, end)
            )
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

@app.get("/")
@app.get("/health")
def health():
    _cleanup_old_jobs()
    import shutil as _shu
    disk = _shu.disk_usage(WORK_DIR)
    free_gb = round(disk.free / 1_073_741_824, 1)
    return {"status": "ok", "gemini": bool(GEMINI_API_KEY), "whisper": WHISPER_MODEL, "disk_free_gb": free_gb}


class VideoMetaRequest(BaseModel):
    url: str

@app.post("/video-meta")
async def video_meta(body: VideoMetaRequest, _=Depends(auth)):
    """Fetch metadata + Gemini visual analysis for TikTok/Instagram via yt-dlp."""
    import yt_dlp, shutil, tempfile
    url = body.url.strip()
    platform = "tiktok" if "tiktok.com" in url else "instagram" if "instagram.com" in url else "youtube"

    # Step 1: metadata only (fast, no download)
    ydl_meta_opts = {"quiet": True, "no_warnings": True, "skip_download": True, "noplaylist": True}
    try:
        with yt_dlp.YoutubeDL(ydl_meta_opts) as ydl:
            info = ydl.extract_info(url, download=False)
        if not info:
            raise ValueError("Aucune info retournée")
    except Exception as e:
        logger.warning(f"[video-meta] metadata error for {url}: {e}")
        raise HTTPException(status_code=422, detail=str(e))

    duration_s = info.get("duration") or 0
    duration_str = f"{int(duration_s//60)}:{int(duration_s%60):02d}" if duration_s else "N/A"
    meta = {
        "platform": platform,
        "titre": info.get("title") or info.get("description") or "",
        "description": info.get("description") or "",
        "vues": info.get("view_count") or 0,
        "likes": info.get("like_count") or 0,
        "commentaires": info.get("comment_count") or 0,
        "duree": duration_str,
        "auteur": info.get("uploader") or info.get("channel") or "",
        "tags": info.get("tags") or [],
        "datePublication": info.get("upload_date") or "",
        "transcript": None,
        "transcriptSource": "none",
    }

    # Step 2: download + Gemini visual analysis (vidéos ≤ 5 min)
    if GEMINI_API_KEY and 0 < duration_s <= 300:
        tmp_dir = Path(tempfile.mkdtemp(dir=WORK_DIR))
        tmp_video = tmp_dir / "viral.mp4"
        try:
            ydl_dl_opts = {
                "format": "worst[height<=480][ext=mp4]/worst[ext=mp4]/worst",
                "outtmpl": str(tmp_video),
                "quiet": True, "no_warnings": True, "noplaylist": True,
            }
            with yt_dlp.YoutubeDL(ydl_dl_opts) as ydl:
                ydl.extract_info(url, download=True)

            if tmp_video.exists() and tmp_video.stat().st_size < 100 * 1024 * 1024:
                analysis = await _gemini_analyze_viral(tmp_video, platform)
                if analysis:
                    meta["transcript"] = analysis
                    meta["transcriptSource"] = "gemini"
        except Exception as e:
            logger.warning(f"[video-meta] Gemini step failed: {e}")
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    return meta


async def _gemini_analyze_viral(video_path: Path, platform: str) -> Optional[str]:
    """Upload video to Gemini Files API and analyze why it performs well."""
    platform_name = {"tiktok": "TikTok", "instagram": "Instagram Reels"}.get(platform, "vidéo courte")
    file_size = video_path.stat().st_size
    try:
        async with httpx.AsyncClient(timeout=180) as c:
            # Start resumable upload
            r = await c.post(
                f"https://generativelanguage.googleapis.com/upload/v1beta/files?key={GEMINI_API_KEY}",
                headers={
                    "X-Goog-Upload-Protocol": "resumable",
                    "X-Goog-Upload-Command": "start",
                    "X-Goog-Upload-Header-Content-Length": str(file_size),
                    "X-Goog-Upload-Header-Content-Type": "video/mp4",
                    "Content-Type": "application/json",
                },
                json={"file": {"display_name": "viral_video"}},
            )
            if r.status_code not in (200, 201):
                logger.warning(f"[Gemini Files upload-start] {r.status_code}: {r.text[:200]}")
                return None
            upload_url = r.headers.get("X-Goog-Upload-URL")
            if not upload_url:
                return None

            # Upload file bytes
            video_bytes = video_path.read_bytes()
            r2 = await c.post(
                upload_url,
                headers={
                    "Content-Length": str(file_size),
                    "X-Goog-Upload-Offset": "0",
                    "X-Goog-Upload-Command": "upload, finalize",
                },
                content=video_bytes,
            )
            if r2.status_code not in (200, 201):
                logger.warning(f"[Gemini Files upload-data] {r2.status_code}: {r2.text[:200]}")
                return None

            file_info = r2.json()
            file_uri = file_info.get("file", {}).get("uri")
            file_name_gcs = file_info.get("file", {}).get("name", "")
            if not file_uri:
                return None

            # Poll until ACTIVE
            for _ in range(15):
                await asyncio.sleep(3)
                sr = await c.get(
                    f"https://generativelanguage.googleapis.com/v1beta/{file_name_gcs}?key={GEMINI_API_KEY}"
                )
                if sr.status_code == 200 and sr.json().get("state") == "ACTIVE":
                    break

            # Analyze with Gemini
            prompt = f"""Tu regardes cette vidéo {platform_name} en intégralité. Analyse-la avec précision pour comprendre POURQUOI elle performe bien. Réponds en français.

## 🎬 HOOK (0-3 secondes)
Décris exactement ce qui se passe dans les 3 premières secondes. Qu'est-ce qui accroche immédiatement ? Pourquoi l'utilisateur ne scrolle pas ?

## 🎵 AUDIO & MUSIQUE
Quel son/musique est utilisé ? Quel effet ça crée (énergie, émotion, nostalgie, curiosité) ? Est-ce un son trending ?

## ✂️ MONTAGE & RYTHME
Style de montage : fréquence des coupes, transitions, effets. Rythme global (rapide/lent/varié) ? Pourquoi ce rythme fonctionne ?

## 📝 TEXTES À L'ÉCRAN
Y a-t-il du texte ? Transcris-le. Comment est-il positionné et chronométré ? Quel rôle joue-t-il ?

## 😮 DÉCLENCHEURS ÉMOTIONNELS
Quelles émotions cette vidéo déclenche (curiosité, humour, surprise, relatabilité, aspiration) ? Par quels mécanismes concrets ?

## 📖 STRUCTURE NARRATIVE
Comment la vidéo est construite ? Y a-t-il une montée en tension, une révélation, un twist ? Comment elle maintient l'attention jusqu'au bout ?

## 🔑 POURQUOI ÇA MARCHE — Synthèse
Les 3-5 raisons concrètes pour lesquelles cette vidéo performe sur {platform_name}. Ce qu'un créateur doit retenir et reproduire."""

            gr = await c.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}",
                json={
                    "contents": [{"parts": [
                        {"fileData": {"mimeType": "video/mp4", "fileUri": file_uri}},
                        {"text": prompt},
                    ]}],
                    "generationConfig": {"temperature": 0.3, "maxOutputTokens": 8192},
                },
            )
            if gr.status_code != 200:
                logger.warning(f"[Gemini analyze viral] {gr.status_code}: {gr.text[:200]}")
                return None

            text = gr.json().get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")

            # Cleanup Gemini file
            try:
                await c.delete(
                    f"https://generativelanguage.googleapis.com/v1beta/{file_name_gcs}?key={GEMINI_API_KEY}"
                )
            except Exception:
                pass

            return text.strip() if text else None
    except Exception as e:
        logger.warning(f"[_gemini_analyze_viral] {e}")
        return None


async def _run_upload_transcription(job_id: str, file_path: Path) -> None:
    try:
        UPLOAD_JOBS[job_id]["progress"] = "Transcription en cours…"
        result = await transcribe(str(file_path))
        logger.info(f"[upload] transcription OK: {len(result['segments'])} segments")
        UPLOAD_JOBS[job_id] = {
            "status": "done",
            "video_id": UPLOAD_JOBS[job_id]["video_id"],
            "segments": result["segments"],
            "duration": result["duration"],
        }
    except Exception as e:
        logger.error(f"[upload] transcription error: {e}")
        UPLOAD_JOBS[job_id] = {
            "status": "error",
            "video_id": UPLOAD_JOBS[job_id].get("video_id", ""),
            "error": str(e),
        }


@app.post("/upload-video")
async def upload_video(file: UploadFile = File(...), tasks: BackgroundTasks = BackgroundTasks(), _=Depends(auth)):
    video_id = "u_" + str(uuid.uuid4())[:12]
    job_id   = str(uuid.uuid4())[:12]
    upload_path = UPLOAD_DIR / video_id
    upload_path.mkdir(parents=True, exist_ok=True)
    file_path = upload_path / "source.mp4"
    logger.info(f"[upload] réception {file.filename} → {video_id}")
    with open(file_path, "wb") as f:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)
    size_mb = file_path.stat().st_size / 1_048_576
    logger.info(f"[upload] {size_mb:.1f} MB sauvegardé → job {job_id}")
    UPLOAD_JOBS[job_id] = {"status": "processing", "video_id": video_id, "progress": "Fichier reçu…"}
    tasks.add_task(_run_upload_transcription, job_id, file_path)
    return {"ok": True, "job_id": job_id, "video_id": video_id}


@app.post("/upload-chunk")
async def upload_chunk(
    video_id: str = Form(...), chunk_index: int = Form(...), is_last: str = Form("false"),
    chunk: UploadFile = File(...), _=Depends(auth),
):
    """Upload du fichier source par petits morceaux (envoyés séquentiellement, chacun avec son
    propre retry côté client) — un seul gros POST de 500-800Mo+ échouait trop souvent sur une
    connexion mobile instable, et un échec faisait tout recommencer depuis zéro. Ici, seul le
    morceau en échec est retenté, jamais tout le fichier."""
    upload_path = UPLOAD_DIR / video_id
    upload_path.mkdir(parents=True, exist_ok=True)
    file_path = upload_path / "source.mp4"
    data = await chunk.read()
    mode = "ab" if (chunk_index > 0 and file_path.exists()) else "wb"
    with open(file_path, mode) as f:
        f.write(data)
    size_mb = file_path.stat().st_size / 1_048_576
    if is_last == "true":
        logger.info(f"[upload-chunk] {video_id} terminé — {size_mb:.1f} MB")
        return {"ok": True, "done": True, "video_id": video_id}
    return {"ok": True, "done": False}


@app.get("/upload-status/{job_id}")
def upload_status(job_id: str, _=Depends(auth)):
    job = UPLOAD_JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Job introuvable")
    return job


@app.post("/thumbnail")
async def thumbnail_endpoint(video_id: str = Form(...), t: float = Form(0.0), _=Depends(auth)):
    """Extrait une frame JPEG basse résolution — miniature légère côté serveur, évite de décoder
    la vidéo dans le navigateur mobile (cause de crashs mémoire avec l'approche <video>+<canvas>)."""
    source = UPLOAD_DIR / video_id / "source.mp4"
    if not source.exists():
        raise HTTPException(400, f"Fichier pré-uploadé introuvable: {video_id}")
    out_path = WORK_DIR / f"thumb_{uuid.uuid4().hex[:8]}.jpg"
    # 480px (pas 180) : les cartes miniatures affichent bien plus large que 180px sur mobile,
    # d'où le flou remonté — -q:v 3 pour une qualité JPEG correcte, fichier reste petit (~20-30KB)
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-ss", str(max(0, t)),
           "-i", str(source), "-vframes", "1", "-vf", "scale=480:-2", "-q:v", "3", str(out_path)]
    r = subprocess.run(cmd, capture_output=True, timeout=20)
    if r.returncode != 0 or not out_path.exists() or out_path.stat().st_size == 0:
        raise HTTPException(500, "Extraction de la miniature échouée")
    return FileResponse(str(out_path), media_type="image/jpeg",
        background=BackgroundTask(lambda: out_path.unlink(missing_ok=True)))


@app.post("/reframe-clip")
async def reframe_clip_endpoint(file: UploadFile = File(...), _=Depends(auth)):
    """Reframe un segment vidéo en 9:16 (ffmpeg natif). Reçoit un segment MP4 stream-copié."""
    import shutil
    from fastapi.responses import FileResponse
    tmp_dir = WORK_DIR / f"rf_{uuid.uuid4().hex[:8]}"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    in_path = tmp_dir / "segment.mp4"
    out_path = tmp_dir / "clip_9x16.mp4"
    try:
        with open(in_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        await asyncio.get_event_loop().run_in_executor(
            None, lambda: _reframe_vertical(str(in_path), str(out_path))
        )
        if not out_path.exists():
            raise HTTPException(500, "Reframe échoué")
        return FileResponse(
            str(out_path), media_type="video/mp4",
            filename="clip_9x16.mp4",
            background=BackgroundTask(shutil.rmtree, tmp_dir, True)
        )
    except Exception as e:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise HTTPException(500, str(e))


def _compute_audio_energy_peaks(audio_path: str, top_fraction: float = 0.15) -> List[float]:
    """Détecte les pics de volume/énergie audio (cri, rire, réaction forte, silence dramatique) —
    un signal auxiliaire qu'une analyse texte-only ignore complètement (deux phrases identiques à
    l'écrit peuvent être dites calmement ou hurlées). Retourne les timestamps (s) des fenêtres de
    1s les plus fortes en RMS, à passer à l'IA de sélection de clips comme indice supplémentaire."""
    try:
        cmd = [
            "ffmpeg", "-i", audio_path,
            "-af", "aresample=8000,asetnsamples=n=8000,astats=metadata=1:reset=1,"
                   "ametadata=mode=print:key=lavfi.astats.Overall.RMS_level:file=-",
            "-f", "null", "-",
        ]
        r = subprocess.run(cmd, capture_output=True, timeout=30, text=True)
        lines = (r.stdout + "\n" + r.stderr).splitlines()
        levels = []
        cur_t = None
        for line in lines:
            m_t = re.search(r"pts_time:(-?\d+\.?\d*)", line)
            if m_t:
                cur_t = float(m_t.group(1))
                continue
            m_rms = re.search(r"RMS_level=(-?\d+\.?\d*|-inf)", line)
            if m_rms and cur_t is not None:
                val = m_rms.group(1)
                if val != "-inf":
                    levels.append((cur_t, float(val)))
                cur_t = None
        if len(levels) < 5:
            return []
        rms_sorted = sorted(v for _, v in levels)
        threshold = rms_sorted[max(0, int(len(rms_sorted) * (1 - top_fraction)) - 1)]
        peaks = sorted(t for t, v in levels if v >= threshold)
        return peaks
    except Exception as e:
        logger.info(f"[energy] détection échouée ({e}), ignorée")
        return []


async def _transcribe_audio_core(audio_path: Path) -> Dict:
    """Logique de transcription pure (Groq Whisper ou fallback local) + pics d'énergie audio.
    Extraite de l'ancien endpoint /transcribe-audio pour être réutilisée par la version job async
    (upload-token + poll) qui résiste aux coupures réseau/mise en veille mobile — contrairement à
    l'ancienne requête unique tenue ouverte jusqu'à 10 min, dont la moindre suspension d'onglet iOS
    en cours de route faisait perdre toute l'analyse."""
    size_mb = audio_path.stat().st_size / 1_048_576
    logger.info(f"[transcribe-audio] {audio_path.name} {size_mb:.1f}MB")
    if GROQ_API_KEY and size_mb <= 24:
        async with httpx.AsyncClient(timeout=180) as c:
            with open(audio_path, "rb") as af:
                r = await c.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                    data={"model": "whisper-large-v3-turbo", "response_format": "verbose_json",
                          "timestamp_granularities[]": "word",
                          **({"language": TRANSCRIBE_LANG} if TRANSCRIBE_LANG else {})},
                    files={"file": ("audio.mp3", af, "audio/mpeg")},
                )
        r.raise_for_status()
        data = r.json()
        duration = float(data.get("duration", 0))
        raw_words = data.get("words", [])
        if raw_words:
            # Regrouper les mots en lignes de 4 mots avec timing précis par mot
            WORDS_PER_LINE = 4
            segments = []
            for i in range(0, len(raw_words), WORDS_PER_LINE):
                chunk = raw_words[i:i + WORDS_PER_LINE]
                t0 = float(chunk[0].get("start", 0))
                t1 = float(chunk[-1].get("end", t0 + 1))
                text = " ".join((w.get("word") or w.get("text") or "").strip() for w in chunk)
                if text.strip():
                    segments.append({"start": t0, "end": t1, "text": text})
            logger.info(f"[transcribe-audio] word-level: {len(raw_words)} mots → {len(segments)} lignes")
        else:
            # Fallback : timestamps par segment
            segments = [
                {"start": float(s["start"]), "end": float(s["end"]), "text": s["text"].strip()}
                for s in data.get("segments", [])
            ]
        if not duration and segments:
            duration = segments[-1]["end"]
        result = {"segments": segments, "duration": duration}
    else:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, lambda: _transcribe_local(str(audio_path)))
    if not result.get("segments"):
        raise ValueError("Aucun segment — vidéo sans paroles détectées")
    loop = asyncio.get_event_loop()
    energy_peaks = await loop.run_in_executor(None, lambda: _compute_audio_energy_peaks(str(audio_path)))
    logger.info(f"[transcribe-audio] {len(result['segments'])} segments {result['duration']:.0f}s, {len(energy_peaks)} pics d'énergie")
    return {"segments": result["segments"], "duration": result["duration"], "energy_peaks": energy_peaks}


@app.post("/transcribe-audio")
async def transcribe_audio_endpoint(file: UploadFile = File(...), _=Depends(auth)):
    """Transcription d'un fichier audio uploadé (extrait en local via ffmpeg.wasm dans le browser).
    Requête unique bloquante — gardée pour compat, préférer /transcribe-audio-start + polling."""
    import shutil
    tmp_dir = WORK_DIR / f"ta_{uuid.uuid4().hex[:8]}"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    try:
        audio_path = tmp_dir / "audio.mp3"
        with open(audio_path, "wb") as f:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                f.write(chunk)
        result = await _transcribe_audio_core(audio_path)
        return {"ok": True, **result}
    except ValueError as e:
        raise HTTPException(502, str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[transcribe-audio] erreur: {e}")
        raise HTTPException(502, str(e))
    finally:
        shutil.rmtree(str(tmp_dir), ignore_errors=True)


# ── Version job async : upload rapide puis polling, résiste aux mises en veille mobile ──
_transcribe_jobs: Dict[str, Dict] = {}

async def _run_transcribe_job(job_id: str, tmp_dir: Path, audio_path: Path):
    import shutil
    try:
        result = await _transcribe_audio_core(audio_path)
        _transcribe_jobs[job_id] = {"status": "done", "ts": _time.time(), **result}
    except Exception as e:
        logger.error(f"[transcribe-job {job_id}] erreur: {e}")
        _transcribe_jobs[job_id] = {"status": "error", "ts": _time.time(), "error": str(e)}
    finally:
        shutil.rmtree(str(tmp_dir), ignore_errors=True)


@app.post("/transcribe-audio-start")
async def transcribe_audio_start(file: UploadFile = File(...), _=Depends(auth)):
    """Démarre la transcription en tâche de fond et retourne immédiatement un job_id — le client
    sonde /transcribe-audio-status ensuite. Chaque requête (démarrage + sondages) est courte, donc
    une brève suspension d'onglet mobile en cours de route ne casse plus toute l'analyse."""
    for jid in [j for j, v in list(_transcribe_jobs.items()) if _time.time() - v.get("ts", _time.time()) > 7200]:
        _transcribe_jobs.pop(jid, None)
    tmp_dir = WORK_DIR / f"ta_{uuid.uuid4().hex[:8]}"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    audio_path = tmp_dir / "audio.mp3"
    with open(audio_path, "wb") as f:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)
    job_id = uuid.uuid4().hex
    _transcribe_jobs[job_id] = {"status": "processing", "ts": _time.time()}
    asyncio.create_task(_run_transcribe_job(job_id, tmp_dir, audio_path))
    return {"ok": True, "job_id": job_id}


@app.get("/transcribe-audio-status")
async def transcribe_audio_status(job_id: str, _=Depends(auth)):
    job = _transcribe_jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job introuvable ou expiré")
    return {"ok": True, **{k: v for k, v in job.items() if k != "ts"}}


@app.get("/transcript/{video_id}")
async def get_transcript(video_id: str, _=Depends(auth)):
    # Méthode 1 : youtube-transcript-api Python
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        t = None
        for lang in ['fr', 'en']:
            try: t = transcript_list.find_transcript([lang]); break
            except: pass
        if not t:
            try: t = transcript_list.find_generated_transcript(['fr', 'en'])
            except:
                all_codes = list(transcript_list._manually_created_transcripts) + list(transcript_list._generated_transcripts)
                t = transcript_list.find_transcript(all_codes[:1]) if all_codes else None
        if t:
            fetched = t.fetch()
            segments = [
                {"start": s["start"], "end": s["start"] + s.get("duration", 2), "text": s["text"].replace("\n", " ").strip()}
                for s in fetched if s.get("text", "").strip()
            ]
            if segments:
                logger.info(f"[transcript/api] {video_id} — {len(segments)} segs lang={t.language_code}")
                return {"ok": True, "segments": segments, "language": t.language_code}
    except Exception as e:
        logger.warning(f"[transcript/api] {video_id} failed: {e}")

    # Méthode 2 : yt-dlp avec PoToken (sous-titres automatiques)
    try:
        with tempfile.TemporaryDirectory() as td:
            import yt_dlp
            ydl_opts = {
                "writeautomaticsub": True,
                "writesubtitles": True,
                "subtitleslangs": ["fr", "en"],
                "subtitlesformat": "json3",
                "skip_download": True,
                "outtmpl": os.path.join(td, "subs"),
                "quiet": True,
                "no_warnings": True,
                "extractor_args": _yt_extractor_args(),
            }
            url = f"https://www.youtube.com/watch?v={video_id}"
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
            # Cherche le fichier .json3 téléchargé
            sub_files = sorted(Path(td).glob("*.json3"))
            if sub_files:
                data = json.loads(sub_files[0].read_text(encoding="utf-8"))
                segments = []
                for event in data.get("events", []):
                    if not event.get("segs") or event.get("tStartMs") is None:
                        continue
                    text = " ".join(s.get("utf8", "").replace("\n", " ") for s in event["segs"]).strip()
                    if text:
                        start = event["tStartMs"] / 1000
                        end = start + event.get("dDurationMs", 2000) / 1000
                        segments.append({"start": start, "end": end, "text": text})
                if segments:
                    lang = sub_files[0].name.split(".")[-2] if len(sub_files[0].name.split(".")) > 2 else "fr"
                    logger.info(f"[transcript/ytdlp] {video_id} — {len(segments)} segs")
                    return {"ok": True, "segments": segments, "language": lang}
    except Exception as e:
        logger.warning(f"[transcript/ytdlp] {video_id} failed: {e}")

    raise HTTPException(status_code=404, detail="Aucun sous-titre disponible pour cette vidéo")


@app.get("/test-ytapi")
def test_ytapi(video_id: str = "dQw4w9WgXcQ", fmt: str = "mp3"):
    """Debug: teste youtube-download-api.org de bout en bout (submit→poll→download)."""
    if not YT_DOWNLOAD_API_KEY:
        return {"ok": False, "error": "YT_DOWNLOAD_API_KEY absente sur Railway"}
    out = WORK_DIR / f"ytapitest_{uuid.uuid4().hex[:6]}.{'mp3' if fmt.lower()=='mp3' else 'mp4'}"
    t0 = _time.time()
    title = _ytapi_fetch(f"https://www.youtube.com/watch?v={video_id}", fmt, out, poll_timeout=180)
    dt = round(_time.time() - t0, 1)
    size_kb = out.stat().st_size // 1024 if out.exists() else 0
    out.unlink(missing_ok=True)
    return {"ok": bool(title), "title": title, "fmt": fmt, "size_kb": size_kb, "seconds": dt,
            "api_base": YT_DOWNLOAD_API_BASE, "has_key": bool(YT_DOWNLOAD_API_KEY)}


@app.get("/test-bgutil")
def test_bgutil_endpoint():
    """Debug: vérifie bgutil + teste InnerTube par client."""
    visitor_data, po_token = _fetch_po_token_sync()
    return {
        "bgutil_url": BGUTIL_URL,
        "bgutil_public_url": BGUTIL_PUBLIC_URL,
        "po_token_length": len(po_token),
        "ok": bool(po_token),
    }


@app.get("/test-innertube")
async def test_innertube(video_id: str = "WVcfOsVewPk"):
    """Debug: teste InnerTube client par client, retourne status + raison (inclut WEB+PoToken)."""
    _ANDROID_KEY = "AIzaSyA8eiZmM8IA8geBBmV1-zRx9HtCKV8qlKg"
    _IOS_KEY = "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc"
    _WEB_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"

    # Bgutil PoToken pour WEB client — utilise _fetch_po_token_sync() qui essaie internal+public
    visitor_data_b, po_token = _fetch_po_token_sync()
    # contentBinding = visitorData que YouTube attend (structure proto encodée)
    # On utilise visitor_data comme visitorData car bgutil retourne visitorData si dispo

    clients = []
    if po_token:
        web_payload = {"context": {"client": {"clientName": "WEB", "clientVersion": "2.20240726.00.00", "hl": "en", "gl": "US"}}, "videoId": video_id, "contentCheckOk": True, "racyCheckOk": True, "serviceIntegrityDimensions": {"poToken": po_token}}
        if visitor_data_b:
            web_payload["context"]["client"]["visitorData"] = visitor_data_b
        clients.append({
            "name": "WEB+PoToken",
            "url": f"https://www.youtube.com/youtubei/v1/player?key={_WEB_KEY}&prettyPrint=false",
            "payload": web_payload,
            "headers": {"Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36", "X-YouTube-Client-Name": "1", "X-YouTube-Client-Version": "2.20240726.00.00", "Origin": "https://www.youtube.com", "Referer": f"https://www.youtube.com/watch?v={video_id}", **({"X-Goog-Visitor-Id": visitor_data_b} if visitor_data_b else {})},
        })

    clients += [
        {"name": "ANDROID_VR", "url": "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
         "payload": {"context": {"client": {"clientName": "ANDROID_VR", "clientVersion": "1.56.21", "deviceMake": "Oculus", "deviceModel": "Quest 3", "androidSdkVersion": 32, "userAgent": "com.google.android.apps.youtube.vr.oculus/1.56.21 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip", "osName": "Android", "osVersion": "12L", "platform": "MOBILE", "hl": "en", "gl": "US"}}, "videoId": video_id, "contentCheckOk": True, "racyCheckOk": True},
         "headers": {"Content-Type": "application/json", "User-Agent": "com.google.android.apps.youtube.vr.oculus/1.56.21 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip", "X-YouTube-Client-Name": "28", "X-YouTube-Client-Version": "1.56.21"}},
        {"name": "TVHTML5", "url": "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
         "payload": {"context": {"client": {"clientName": "TVHTML5", "clientVersion": "7.20241029.00.00", "hl": "en", "gl": "US"}}, "videoId": video_id, "contentCheckOk": True, "racyCheckOk": True},
         "headers": {"Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/6.0 TV Safari/538.1", "X-YouTube-Client-Name": "7", "X-YouTube-Client-Version": "7.20241029.00.00"}},
    ]

    results = [{"bgutil": f"po_token={len(po_token)}c visitorData={len(visitor_data_b)}c"}]
    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        for c in clients:
            try:
                r = await client.post(c["url"], json=c["payload"], headers=c["headers"])
                d = r.json() if r.status_code == 200 else {}
                ps = d.get("playabilityStatus", {})
                has_streaming = bool(d.get("streamingData"))
                audio_formats = len([f for f in d.get("streamingData", {}).get("adaptiveFormats", []) if "audio" in f.get("mimeType", "") and f.get("url")]) if has_streaming else 0
                results.append({
                    "client": c["name"],
                    "http_status": r.status_code,
                    "playability_status": ps.get("status"),
                    "reason": ps.get("reason", "")[:120],
                    "has_streaming_data": has_streaming,
                    "audio_formats": audio_formats,
                })
            except Exception as e:
                results.append({"client": c["name"], "error": str(e)})

    return {"video_id": video_id, "results": results}


@app.get("/test-formats")
def test_formats(video_id: str = "NwlPz4RaZ8s", use_proxy: bool = False):
    """Debug: teste l'extraction yt-dlp. use_proxy=false = chemin gratuit réel (cookies+bgutil, IP Railway)."""
    import yt_dlp
    output = []
    class LogCollector:
        def debug(self, msg): output.append(msg)
        def warning(self, msg): output.append(f"WARN: {msg}")
        def error(self, msg): output.append(f"ERR: {msg}")
    opts = {
        "quiet": False, "no_warnings": False,
        "extractor_args": _yt_extractor_args(),
        "logger": LogCollector(),
        "skip_download": True,
    }
    cookies_file = _get_cookies_file()
    if cookies_file:
        opts["cookiefile"] = cookies_file
    if use_proxy and RESIDENTIAL_PROXY_URL:
        opts["proxy"] = RESIDENTIAL_PROXY_URL
    result = {"video_id": video_id, "use_proxy": use_proxy, "has_cookies": bool(cookies_file)}
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            fmts = [f for f in (info or {}).get("formats", []) if f.get("url")]
            audio = [f for f in fmts if f.get("acodec") not in (None, "none")]
            result["ok"] = len(fmts) > 0
            result["title"] = (info or {}).get("title", "")[:80]
            result["total_formats"] = len(fmts)
            result["audio_formats"] = len(audio)
    except Exception as e:
        result["ok"] = False
        result["error"] = str(e)[:300]
    result["logs"] = [l for l in output if any(k in l.lower() for k in ("error", "bot", "sign in", "proxy", "402", "forbidden", "unavailable", "po token", "potoken"))][:15]
    return result


@app.get("/test-rapidapi")
async def test_rapidapi_endpoint(video_id: str = "A-RU8qOAtRk"):
    """Debug: teste RapidAPI YouTube downloader avec polling + diagnostic download."""
    if not RAPIDAPI_KEY:
        return {"ok": False, "error": "RAPIDAPI_KEY non configurée dans Railway"}
    host = "youtube-mp36.p.rapidapi.com"
    headers = {"X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": host}
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        # 1. Appel API
        r = await client.get(f"https://{host}/dl", params={"id": video_id}, headers=headers)
        api_status = r.status_code
        try:
            api_body = r.json()
        except Exception:
            api_body = r.text[:200]
        link = api_body.get("link", "") if isinstance(api_body, dict) else ""
        processing = api_body.get("status") == "processing" if isinstance(api_body, dict) else False
        # 2. Si processing, attente courte pour diagnostic rapide
        if processing:
            await asyncio.sleep(8)
            r2 = await client.get(f"https://{host}/dl", params={"id": video_id}, headers=headers)
            try:
                api_body = r2.json()
            except Exception:
                pass
            link = api_body.get("link", "") if isinstance(api_body, dict) else ""
        # 3. Test download du lien — avec headers navigateur
        dl_info = {}
        if link:
            try:
                browser_headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                    "Referer": "https://www.youtube.com/",
                    "Accept": "audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,application/ogg;q=0.7,video/*;q=0.6,*/*;q=0.5",
                }
                dl = await client.get(link, timeout=15, headers=browser_headers)
                dl_info = {"dl_status": dl.status_code, "dl_size": len(dl.content), "dl_url": link[:100]}
            except Exception as e:
                dl_info = {"dl_error": str(e), "dl_url": link[:100]}
        return {
            "api_status": api_status,
            "api_body": api_body,
            "download": dl_info,
        }


@app.get("/test-playwright")
async def test_playwright_endpoint(video_id: str = "A-RU8qOAtRk"):
    """Debug: teste Playwright → cookies YouTube depuis Railway."""
    tmp = WORK_DIR / "pw_test"
    tmp.mkdir(exist_ok=True)
    cookies_path = await _get_yt_cookies_playwright(video_id, tmp)
    if cookies_path:
        lines = Path(cookies_path).read_text().split("\n")
        n_cookies = len([l for l in lines if l and not l.startswith("#")])
        return {"ok": True, "n_cookies": n_cookies, "path": cookies_path}
    return {"ok": False, "error": "Playwright échec"}


@app.get("/test-captions")
def test_captions_endpoint(video_id: str = "A-RU8qOAtRk"):
    """Debug: teste youtube-transcript-api depuis Railway (API légère, pas de download)."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        tl = YouTubeTranscriptApi.list_transcripts(video_id)
        langs = [f"{t.language_code}(auto={t.is_generated})" for t in tl]
        return {"ok": True, "video_id": video_id, "langs": langs}
    except Exception as e:
        return {"ok": False, "video_id": video_id, "error": str(e)}


class StreamUrlRequest(BaseModel):
    video_id: str

class RawSegmentRequest(BaseModel):
    video_id: str
    start: float
    end: float
    allow_api_fallback: bool = True


# ── Cache R2 (S3-compatible Cloudflare) ──────────────────────────────────────
def _r2_enabled() -> bool:
    return bool(R2_ACCOUNT_ID and R2_ACCESS_KEY and R2_SECRET_KEY and R2_BUCKET)

_r2_client_cache = {}
def _r2_client():
    if "c" not in _r2_client_cache:
        import boto3
        from botocore.config import Config as _BotoCfg
        _r2_client_cache["c"] = boto3.client(
            "s3",
            endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=R2_ACCESS_KEY,
            aws_secret_access_key=R2_SECRET_KEY,
            region_name="auto",
            config=_BotoCfg(retries={"max_attempts": 2, "mode": "standard"},
                            connect_timeout=15, read_timeout=90),
        )
    return _r2_client_cache["c"]

def _seg_r2_key(video_id: str, start: float, end: float) -> str:
    # Clé stable par clip source (indépendante du cadrage/sous-titres appliqués ensuite).
    return f"seg/{video_id}/{start:.1f}_{end:.1f}.mp4"

def _r2_get(key: str, dest_path) -> bool:
    """Récupère l'objet depuis R2 s'il existe. Fail-open : False si absent ou erreur."""
    try:
        _r2_client().download_file(R2_BUCKET, key, str(dest_path))
        return Path(dest_path).exists() and Path(dest_path).stat().st_size > 1000
    except Exception:
        return False

def _r2_put(key: str, src_path):
    """Met le segment en cache dans R2 (best-effort, n'interrompt jamais le rendu)."""
    try:
        _r2_client().upload_file(str(src_path), R2_BUCKET, key,
                                 ExtraArgs={"ContentType": "video/mp4"})
        logger.info(f"[r2] ✓ mis en cache {key}")
    except Exception as e:
        logger.warning(f"[r2] upload échoué {key}: {str(e)[:120]}")

"""Plafond horaire d'utilisation du proxy résidentiel (facturé au gigaoctet).

Un segment pèse ~25 Mo. À 24 segments/heure, le pire cas est ~600 Mo/heure — largement au-dessus
de l'usage réel (1 ou 2 segments par action utilisateur), mais suffisant pour qu'une régression
côté client soit stoppée en une heure au lieu de vider le forfait en deux jours, comme fin juillet.
Compteur en mémoire : il repart à zéro si le service redémarre, c'est volontairement simple —
son rôle est d'arrêter un emballement, pas de tenir une comptabilité exacte."""
_PROXY_MAX_PAR_HEURE = 24
_proxy_horodatages: list = []

def _proxy_quota_ok() -> bool:
    global _proxy_horodatages
    maintenant = _time.time()
    _proxy_horodatages = [t for t in _proxy_horodatages if maintenant - t < 3600]
    if len(_proxy_horodatages) >= _PROXY_MAX_PAR_HEURE:
        logger.warning(f"[proxy] plafond atteint ({_PROXY_MAX_PAR_HEURE}/h) — segment servi sans proxy")
        return False
    _proxy_horodatages.append(maintenant)
    return True


def _r2_publier_clip(src_path, nom_fichier: str = "clip_9x16.mp4"):
    """Dépose le clip FINI sur R2 et renvoie une URL signée temporaire, ou None si indisponible.

    Pourquoi : jusqu'ici le fichier (~15 Mo) était renvoyé dans la réponse HTTP. Le téléphone
    devait le garder entièrement en mémoire, fabriquer un objet URL local puis simuler un clic
    sur un lien — trois opérations que les navigateurs mobiles gèrent mal. Mesuré : 14 % de
    téléchargements aboutis sur mobile contre 59 % sur ordinateur.

    Avec un lien, c'est le gestionnaire de téléchargement du système qui prend le relais : plus
    de blob en mémoire, plus de clic synthétique, et surtout le lien reste valable si l'onglet a
    été mis en veille pendant le rendu — aujourd'hui tout est perdu dans ce cas.

    URL signée plutôt que bucket public : rien à exposer, et le lien expire de lui-même.
    """
    if not _r2_enabled():
        return None
    try:
        cle = f"exports/{uuid.uuid4().hex[:16]}/{nom_fichier}"
        client = _r2_client()
        client.upload_file(str(src_path), R2_BUCKET, cle, ExtraArgs={
            "ContentType": "video/mp4",
            # Force le téléchargement plutôt qu'une lecture dans l'onglet
            "ContentDisposition": f'attachment; filename="{nom_fichier}"',
        })
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": R2_BUCKET, "Key": cle},
            ExpiresIn=7 * 24 * 3600,   # 7 jours : l'utilisateur peut revenir chercher son clip
        )
        logger.info(f"[r2] ✓ clip publié {cle}")
        return url
    except Exception as e:
        logger.warning(f"[r2] publication échouée: {str(e)[:150]}")
        return None


async def _run_raw_segment(video_id: str, start: float, end: float, job_id: str, out_dir: Path, allow_api_fallback: bool = True):
    RAW_SEGMENTS[job_id] = {"status": "processing", "progress": "Connexion YouTube…"}
    try:
        duration = end - start
        out_path = out_dir / "clip.mp4"

        # CACHE R2 : si ce segment a déjà été téléchargé (n'importe quel user/session), on le
        # récupère depuis R2 (egress gratuit) → 0 téléchargement YouTube, 0 proxy. Fail-open.
        _r2_hit = False
        _r2key = _seg_r2_key(video_id, start, end)
        if _r2_enabled():
            RAW_SEGMENTS[job_id]["progress"] = "Chargement (cache)…"
            _r2_hit = await asyncio.get_event_loop().run_in_executor(None, lambda: _r2_get(_r2key, out_path))
            if _r2_hit:
                logger.info(f"[raw-segment] ✓ cache R2 {_r2key}")

        _ANDROID_KEY = "AIzaSyA8eiZmM8IA8geBBmV1-zRx9HtCKV8qlKg"
        _IOS_KEY     = "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc"
        it_clients = [
            {
                "name": "ANDROID_VR",
                "url": "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
                "payload": {"context": {"client": {
                    "clientName": "ANDROID_VR", "clientVersion": "1.56.21",
                    "deviceMake": "Oculus", "deviceModel": "Quest 3", "androidSdkVersion": 32,
                    "userAgent": "com.google.android.apps.youtube.vr.oculus/1.56.21 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
                    "osName": "Android", "osVersion": "12L", "platform": "MOBILE", "hl": "en", "gl": "US",
                }}, "videoId": video_id, "contentCheckOk": True, "racyCheckOk": True},
                "headers": {"Content-Type": "application/json",
                    "User-Agent": "com.google.android.apps.youtube.vr.oculus/1.56.21 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
                    "X-YouTube-Client-Name": "28", "X-YouTube-Client-Version": "1.56.21", "X-Goog-Api-Format-Version": "2"},
            },
            {
                "name": "ANDROID",
                "url": f"https://www.youtube.com/youtubei/v1/player?key={_ANDROID_KEY}&prettyPrint=false",
                "payload": {"context": {"client": {
                    "clientName": "ANDROID", "clientVersion": "19.09.37", "androidSdkVersion": 30,
                    "userAgent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
                    "osName": "Android", "osVersion": "11", "platform": "MOBILE", "hl": "en", "gl": "US",
                }}, "videoId": video_id, "contentCheckOk": True, "racyCheckOk": True},
                "headers": {"Content-Type": "application/json",
                    "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
                    "X-YouTube-Client-Name": "3", "X-YouTube-Client-Version": "19.09.37", "X-Goog-Api-Format-Version": "2"},
            },
            {
                "name": "IOS",
                "url": f"https://www.youtube.com/youtubei/v1/player?key={_IOS_KEY}&prettyPrint=false",
                "payload": {"context": {"client": {
                    "clientName": "IOS", "clientVersion": "19.09.3", "deviceModel": "iPhone16,2",
                    "userAgent": "com.google.ios.youtube/19.09.3 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X) gzip",
                    "osName": "iPhone", "osVersion": "17.5.1.21F90", "hl": "en", "gl": "US",
                }}, "videoId": video_id, "contentCheckOk": True, "racyCheckOk": True},
                "headers": {"Content-Type": "application/json",
                    "User-Agent": "com.google.ios.youtube/19.09.3 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X) gzip",
                    "X-YouTube-Client-Name": "5", "X-YouTube-Client-Version": "19.09.3", "X-Goog-Api-Format-Version": "2"},
            },
        ]
        stream_url = None
        for c in ([] if _r2_hit else it_clients):
            try:
                async with httpx.AsyncClient(timeout=30, follow_redirects=True) as hc:
                    r = await hc.post(c["url"], json=c["payload"], headers=c["headers"])
                    if r.status_code == 200:
                        d = r.json()
                        if d.get("streamingData"):
                            fmts = [f for f in d["streamingData"].get("formats", [])
                                    if f.get("url") and "mp4" in f.get("mimeType", "")]
                            fmts.sort(key=lambda f: f.get("height", 0), reverse=True)
                            pick = next((f for f in fmts if (f.get("height") or 0) <= 720), fmts[0] if fmts else None)
                            if pick:
                                stream_url = pick["url"]
                                logger.info(f"[raw-segment] {c['name']} OK {pick.get('qualityLabel','?')}")
                                break
                        else:
                            logger.warning(f"[raw-segment] {c['name']} pas streamingData: {d.get('playabilityStatus',{}).get('status')}")
                    else:
                        logger.warning(f"[raw-segment] {c['name']} HTTP {r.status_code}")
            except Exception as e:
                logger.warning(f"[raw-segment] {c['name']} err: {e}")

        # out_path et duration déjà définis en haut de la fonction (avant la tentative API)
        if not _r2_hit and stream_url:
            RAW_SEGMENTS[job_id]["progress"] = "Extraction du segment…"
            proc = await asyncio.create_subprocess_exec(
                "ffmpeg", "-y", "-ss", str(start), "-t", str(duration),
                "-i", stream_url, "-c", "copy", "-movflags", "faststart", str(out_path),
                stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)

            if proc.returncode != 0 or not out_path.exists() or out_path.stat().st_size < 1000:
                logger.warning(f"[raw-segment] copy rc={proc.returncode}, re-encode fallback")
                proc2 = await asyncio.create_subprocess_exec(
                    "ffmpeg", "-y", "-ss", str(start), "-t", str(duration),
                    "-i", stream_url,
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                    "-c:a", "aac", "-movflags", "faststart", str(out_path),
                    stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE,
                )
                _, stderr2 = await asyncio.wait_for(proc2.communicate(), timeout=180)
                if proc2.returncode != 0:
                    raise RuntimeError(f"ffmpeg: {stderr2.decode()[-200:]}")
        elif not _r2_hit:
            # PRIORITÉ : yt-dlp télécharge UNIQUEMENT la section de 60s (efficace, 0 crédit API,
            # 720p). L'API tierce n'est qu'un secours si yt-dlp se fait bot-bloquer.
            RAW_SEGMENTS[job_id]["progress"] = "Téléchargement du segment…"
            youtube_url = f"https://www.youtube.com/watch?v={video_id}"
            tmp_path = out_dir / "full.%(ext)s"
            ydl_opts = {
                # Préférer H.264 (avc1) + AAC (mp4a) — lisibles nativement par tous les navigateurs.
                "format": "bestvideo[height<=720][vcodec^=avc1]+bestaudio[acodec^=mp4a]/best[height<=720][vcodec^=avc1]/best[height<=720]/best",
                "merge_output_format": "mp4",
                "outtmpl": str(tmp_path),
                "download_ranges": lambda _, __: [{"start_time": max(0, start - 1), "end_time": end + 1}],
                "force_keyframes_at_cuts": True,
                "extractor_args": _yt_extractor_args(),
                "no_playlist": True,
                "socket_timeout": 120,
                "retries": 3,
                "quiet": True,
            }
            cookies_file = _get_cookies_file()
            if cookies_file:
                ydl_opts["cookiefile"] = cookies_file

            segment_ready = False
            # Tentatives : gratuit, gratuit (retry), puis PROXY RÉSIDENTIEL en dernier recours.
            #
            # Historique, pour ne pas refaire les deux erreurs :
            #  1. Le proxy était ouvert dès que le client envoyait `allow_api_fallback=true`. Le
            #     25/07 le préchargement s'est mis à l'envoyer pour 2 clips par analyse — 0,9 → 5,1 Go
            #     de forfait brûlés en deux jours, pour des clips que personne n'avait ouverts.
            #  2. Le 01/08 j'ai coupé le proxy ici purement et simplement. Résultat : quand YouTube
            #     bot-check (SABR, jeton PO manquant), le gratuit échoue, l'API de secours est à court
            #     de crédits, et l'utilisateur ne peut RIEN ouvrir. Le remède était pire que le mal.
            #
            # Compromis : le proxy reste réservé à une action explicite (ouvrir/exporter), ET il est
            # borné par un plafond horaire côté serveur. Même si le client se remettait à demander
            # le proxy en rafale, la casse est bornée à une heure au lieu d'un forfait entier.
            _seg_attempts = [None, None]
            if RESIDENTIAL_PROXY_URL and allow_api_fallback:
                _seg_attempts.append(RESIDENTIAL_PROXY_URL)
            # Quand le gratuit échoue pour une raison non transitoire, on saute les essais gratuits
            # restants — mais JAMAIS la tentative proxy (voir le bloc `except` plus bas).
            _abandon_gratuit = False
            for _att, _proxy in enumerate(_seg_attempts):
                if _abandon_gratuit and not _proxy:
                    continue
                # Le jeton de forfait n'est consommé qu'ici, au moment où le proxy va réellement
                # servir — le décompter à la construction de la liste faisait fondre le quota sur
                # des jobs où le chemin gratuit avait suffi.
                if _proxy and not _proxy_quota_ok():
                    break
                if _att > 0:
                    RAW_SEGMENTS[job_id]["progress"] = ("Nouvelle tentative via IP dédiée…" if _proxy
                                                        else "Nouvelle tentative (blocage temporaire)…")
                    if _proxy:
                        logger.info(f"[raw-segment] {job_id} → tentative via PROXY résidentiel")
                    await asyncio.sleep(6 * _att)  # 6s, 12s
                try:
                    _opts = dict(ydl_opts)
                    if _proxy:
                        # On garde les extractor_args par défaut (client web + jetons PO bgutil).
                        # Les forcer sur ["android","ios"] faisait tomber la définition à 360p :
                        # ces clients n'exposent plus les formats 720p avc1, donc le sélecteur
                        # retombait sur le progressif (~3,3 Mo/60 s au lieu de ~9 Mo). Cette
                        # restriction servait à esquiver les bot-checks de l'IP datacenter —
                        # sur une IP résidentielle elle ne sert plus à rien et coûte la qualité.
                        # La liste par défaut finit de toute façon par android/ios en secours.
                        _opts["proxy"] = _proxy
                    loop = asyncio.get_event_loop()
                    def _dl(_o=_opts):
                        import yt_dlp
                        with yt_dlp.YoutubeDL(_o) as ydl:
                            ydl.download([youtube_url])
                    await asyncio.wait_for(loop.run_in_executor(None, _dl), timeout=180)
                    downloaded = next(out_dir.glob("full.*"), None)
                    if downloaded:
                        # Trace la définition réellement obtenue : c'est le seul moyen fiable de
                        # voir une chute de qualité, la taille du fichier dépendant du contenu.
                        try:
                            _pr = await asyncio.create_subprocess_exec(
                                "ffprobe", "-v", "error", "-select_streams", "v:0",
                                "-show_entries", "stream=width,height", "-of", "csv=p=0",
                                str(downloaded),
                                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
                            _po, _ = await asyncio.wait_for(_pr.communicate(), timeout=15)
                            logger.info(f"[raw-segment] {job_id} source {_po.decode().strip()} "
                                        f"via {'PROXY' if _proxy else 'gratuit'}")
                        except Exception:
                            pass
                        RAW_SEGMENTS[job_id]["progress"] = "Découpe précise…"
                        offset = start - max(0, start - 1)  # décalage dû au pré-roll de 1s
                        # Ré-encodage H.264/AAC (pas -c copy) — garantit la lecture navigateur.
                        proc = await asyncio.create_subprocess_exec(
                            "ffmpeg", "-y", "-ss", str(offset), "-t", str(duration),
                            "-i", str(downloaded),
                            "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p",
                            "-c:a", "aac", "-movflags", "faststart", str(out_path),
                            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE,
                        )
                        await asyncio.wait_for(proc.communicate(), timeout=180)
                        downloaded.unlink(missing_ok=True)
                        if proc.returncode == 0 and out_path.exists() and out_path.stat().st_size > 1000:
                            segment_ready = True
                    if segment_ready:
                        break
                except Exception as e:
                    _err = str(e)
                    logger.warning(f"[raw-segment] tentative {_att + 1}/{len(_seg_attempts)} ({'proxy' if _proxy else 'gratuit'}) échouée ({_err[:120]})")
                    if not _proxy and "not a bot" not in _err.lower() and "sign in" not in _err.lower():
                        # Refaire un essai gratuit identique ne sert à rien, mais le proxy doit
                        # quand même être tenté : un 403 SABR côté média se règle par l'IP, pas
                        # par l'attente. (Avant, un `break` ici rendait le proxy inatteignable.)
                        _abandon_gratuit = True
                for _p in out_dir.glob("full.*"):
                    _p.unlink(missing_ok=True)

            # DERNIER RECOURS : API tierce (rare — seulement si yt-dlp bot-bloqué). Télécharge la
            # vidéo complète (cache par video_id), puis découpe. Consomme du crédit API, d'où le
            # fait de ne l'utiliser qu'ici, jamais en premier. Et JAMAIS si allow_api_fallback=False
            # (préchargement en arrière-plan : on n'engage pas de crédit sans action utilisateur).
            if not segment_ready:
                if not allow_api_fallback:
                    raise RuntimeError("yt-dlp échoué (secours API désactivé pour le préchargement)")
                if not YT_DOWNLOAD_API_KEY:
                    raise RuntimeError("yt-dlp segment échoué et pas de clé API de secours")
                RAW_SEGMENTS[job_id]["progress"] = "Téléchargement (secours API)…"
                cached = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: _ytapi_cached_video(video_id, "480"))
                if not cached or not cached.exists():
                    raise RuntimeError("yt-dlp et API de secours ont tous deux échoué")
                RAW_SEGMENTS[job_id]["progress"] = "Découpe du segment…"
                proc = await asyncio.create_subprocess_exec(
                    "ffmpeg", "-y", "-ss", str(start), "-t", str(duration), "-i", str(cached),
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-movflags", "faststart", str(out_path),
                    stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE,
                )
                _, stderr = await asyncio.wait_for(proc.communicate(), timeout=180)
                if proc.returncode != 0 or not out_path.exists() or out_path.stat().st_size < 1000:
                    raise RuntimeError(f"ffmpeg cut (API): {stderr.decode()[-200:]}")

        size_kb = out_path.stat().st_size // 1024
        logger.info(f"[raw-segment] {job_id} done {size_kb}KB")
        RAW_SEGMENTS[job_id] = {"status": "done", "file": "clip.mp4"}

        # Mise en cache R2 APRÈS 'done' (ne retarde pas l'user) : ce segment ne sera plus jamais
        # retéléchargé depuis YouTube, quel que soit le user ou la session.
        if not _r2_hit and _r2_enabled():
            try:
                await asyncio.get_event_loop().run_in_executor(None, lambda: _r2_put(_r2key, out_path))
            except Exception:
                pass

    except Exception as e:
        logger.error(f"[raw-segment] {job_id} error: {e}")
        RAW_SEGMENTS[job_id] = {"status": "error", "error": str(e)}


@app.post("/raw-segment")
async def raw_segment_endpoint(req: RawSegmentRequest, tasks: BackgroundTasks, _=Depends(auth)):
    job_id  = str(uuid.uuid4())[:12]
    out_dir = WORK_DIR / f"rs_{job_id}"
    out_dir.mkdir(parents=True, exist_ok=True)
    RAW_SEGMENTS[job_id] = {"status": "processing", "progress": "Démarrage…"}
    tasks.add_task(_run_raw_segment, req.video_id, req.start, req.end, job_id, out_dir, req.allow_api_fallback)
    return {"ok": True, "job_id": job_id}


@app.get("/raw-segment-status/{job_id}")
def raw_segment_status_endpoint(job_id: str, _=Depends(auth)):
    job = RAW_SEGMENTS.get(job_id)
    if not job:
        raise HTTPException(404, "Job introuvable")
    return job


@app.get("/raw-segment-file/{job_id}/{filename}")
def raw_segment_file_endpoint(job_id: str, filename: str):
    if ".." in job_id + filename:
        raise HTTPException(400, "Chemin invalide")
    path = WORK_DIR / f"rs_{job_id}" / filename
    if not path.exists():
        raise HTTPException(404, "Fichier introuvable")
    return FileResponse(str(path), media_type="video/mp4", filename=filename)


class PreviewClipRequest(BaseModel):
    video_id: str
    start: float
    end: float


async def _run_preview_clip(video_id: str, start: float, end: float, job_id: str, out_dir: Path):
    """Découpe juste ce clip (quelques Mo, quelques secondes) depuis le fichier source déjà
    uploadé — pour que le navigateur mobile n'ait plus jamais à chercher une position profonde
    dans un fichier de plusieurs centaines de Mo à quelques Go, ce qui reste bloqué en silence
    sur certains appareils (décodeur matériel iOS moins robuste que sur PC pour un seek dans un
    gros blob local). Le petit fichier obtenu démarre à 0 — instantané et fiable à charger.
    Toujours ré-encodé en H.264 (jamais de -c copy) : une simple copie de flux garderait le codec
    de la source (HEVC ou autre) — si ce codec n'est pas décodable par le navigateur, le clip
    découpé serait tout aussi illisible que l'original malgré la découpe réussie côté serveur."""
    try:
        source = UPLOAD_DIR / video_id / "source.mp4"
        if not source.exists():
            raise RuntimeError(f"Fichier pré-uploadé introuvable: {video_id}")
        out_path = out_dir / "clip.mp4"
        duration = max(0.5, end - start)
        # Limite la largeur à 720px : encodage plus rapide, fichier plus léger — un aperçu n'a pas
        # besoin de la pleine résolution 4K de la source, et ça allège d'autant la charge mémoire
        # du <video> côté mobile pendant que le clip reste ouvert.
        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-y", "-ss", str(max(0, start)), "-t", str(duration),
            "-i", str(source),
            "-vf", "scale='min(720,iw)':-2",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "26",
            "-c:a", "aac", "-movflags", "+faststart", str(out_path),
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await asyncio.wait_for(proc.communicate(), timeout=90)
        if proc.returncode != 0 or not out_path.exists() or out_path.stat().st_size < 1000:
            raise RuntimeError(f"ffmpeg: {stderr.decode()[-200:]}")
        size_kb = out_path.stat().st_size // 1024
        logger.info(f"[preview-clip] {job_id} done {size_kb}KB")
        PREVIEW_CLIPS[job_id] = {"status": "done"}
    except Exception as e:
        logger.error(f"[preview-clip] {job_id} error: {e}")
        PREVIEW_CLIPS[job_id] = {"status": "error", "error": str(e)}


@app.post("/preview-clip-start")
async def preview_clip_start_endpoint(req: PreviewClipRequest, tasks: BackgroundTasks, _=Depends(auth)):
    job_id = uuid.uuid4().hex[:12]
    out_dir = WORK_DIR / f"pv_{job_id}"
    out_dir.mkdir(parents=True, exist_ok=True)
    PREVIEW_CLIPS[job_id] = {"status": "processing"}
    tasks.add_task(_run_preview_clip, req.video_id, req.start, req.end, job_id, out_dir)
    return {"ok": True, "job_id": job_id}


@app.get("/preview-clip-status/{job_id}")
def preview_clip_status_endpoint(job_id: str, _=Depends(auth)):
    job = PREVIEW_CLIPS.get(job_id)
    if not job:
        raise HTTPException(404, "Job introuvable")
    return job


@app.get("/preview-clip-file/{job_id}/clip.mp4")
def preview_clip_file_endpoint(job_id: str):
    path = WORK_DIR / f"pv_{job_id}" / "clip.mp4"
    if not path.exists():
        raise HTTPException(404, "Fichier introuvable")
    return FileResponse(str(path), media_type="video/mp4", filename="clip.mp4")


@app.post("/reencode-preview")
async def reencode_preview_endpoint(file: UploadFile = File(...), _=Depends(auth)):
    """Ré-encode en H.264 un petit clip déjà découpé côté client (mp4box.js) — ce découpage local
    est rapide (pas d'upload du fichier entier) mais ne fait que recopier le codec d'origine sans
    le transcoder : si ce codec (HEVC, etc.) n'est pas décodable par le navigateur, le clip extrait
    "tourne" (la durée avance) sans jamais afficher d'image, malgré une découpe réussie. Le fichier
    entrant est déjà petit (quelques Mo, un seul clip) → traitement synchrone rapide, pas de job."""
    import shutil
    tmp_dir = WORK_DIR / f"re_{uuid.uuid4().hex[:10]}"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    in_path = tmp_dir / "in.mp4"
    out_path = tmp_dir / "out.mp4"
    try:
        with open(in_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-y", "-i", str(in_path),
            "-vf", "scale='min(720,iw)':-2",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "26",
            "-c:a", "aac", "-movflags", "+faststart", str(out_path),
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await asyncio.wait_for(proc.communicate(), timeout=60)
        if proc.returncode != 0 or not out_path.exists() or out_path.stat().st_size < 500:
            raise HTTPException(502, f"ffmpeg: {stderr.decode()[-200:]}")
        return FileResponse(str(out_path), media_type="video/mp4", filename="clip.mp4",
                             background=BackgroundTask(lambda: shutil.rmtree(str(tmp_dir), ignore_errors=True)))
    except HTTPException:
        shutil.rmtree(str(tmp_dir), ignore_errors=True)
        raise
    except Exception as e:
        shutil.rmtree(str(tmp_dir), ignore_errors=True)
        raise HTTPException(502, str(e))


@app.post("/stream-url")
async def stream_url_endpoint(req: StreamUrlRequest, _=Depends(auth)):
    """Retourne l'URL de stream mp4 directe via InnerTube — pour lecture dans <video> côté browser."""
    youtube_url = f"https://www.youtube.com/watch?v={req.video_id}"

    _ANDROID_KEY = "AIzaSyA8eiZmM8IA8geBBmV1-zRx9HtCKV8qlKg"
    _IOS_KEY = "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc"
    clients = [
        {
            "name": "ANDROID_VR",
            "url": "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
            "payload": {
                "context": {"client": {
                    "clientName": "ANDROID_VR", "clientVersion": "1.56.21",
                    "deviceMake": "Oculus", "deviceModel": "Quest 3", "androidSdkVersion": 32,
                    "userAgent": "com.google.android.apps.youtube.vr.oculus/1.56.21 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
                    "osName": "Android", "osVersion": "12L",
                    "platform": "MOBILE", "hl": "en", "gl": "US",
                }},
                "videoId": req.video_id, "contentCheckOk": True, "racyCheckOk": True,
            },
            "headers": {
                "Content-Type": "application/json",
                "User-Agent": "com.google.android.apps.youtube.vr.oculus/1.56.21 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
                "X-YouTube-Client-Name": "28", "X-YouTube-Client-Version": "1.56.21",
                "X-Goog-Api-Format-Version": "2",
            },
        },
        {
            "name": "ANDROID",
            "url": f"https://www.youtube.com/youtubei/v1/player?key={_ANDROID_KEY}&prettyPrint=false",
            "payload": {
                "context": {"client": {
                    "clientName": "ANDROID", "clientVersion": "19.09.37",
                    "androidSdkVersion": 30,
                    "userAgent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
                    "osName": "Android", "osVersion": "11",
                    "platform": "MOBILE", "hl": "en", "gl": "US",
                }},
                "videoId": req.video_id, "contentCheckOk": True, "racyCheckOk": True,
            },
            "headers": {
                "Content-Type": "application/json",
                "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
                "X-YouTube-Client-Name": "3", "X-YouTube-Client-Version": "19.09.37",
                "X-Goog-Api-Format-Version": "2",
            },
        },
        {
            "name": "IOS",
            "url": f"https://www.youtube.com/youtubei/v1/player?key={_IOS_KEY}&prettyPrint=false",
            "payload": {
                "context": {"client": {
                    "clientName": "IOS", "clientVersion": "19.09.3",
                    "deviceModel": "iPhone16,2",
                    "userAgent": "com.google.ios.youtube/19.09.3 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X) gzip",
                    "osName": "iPhone", "osVersion": "17.5.1.21F90",
                    "hl": "en", "gl": "US",
                }},
                "videoId": req.video_id, "contentCheckOk": True, "racyCheckOk": True,
            },
            "headers": {
                "Content-Type": "application/json",
                "User-Agent": "com.google.ios.youtube/19.09.3 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X) gzip",
                "X-YouTube-Client-Name": "5", "X-YouTube-Client-Version": "19.09.3",
                "X-Goog-Api-Format-Version": "2",
            },
        },
    ]

    data = None
    client_used = None
    for c in clients:
        try:
            async with httpx.AsyncClient(timeout=30, follow_redirects=True) as hc:
                r = await hc.post(c["url"], json=c["payload"], headers=c["headers"])
                if r.status_code == 200:
                    d = r.json()
                    if d.get("streamingData"):
                        data = d
                        client_used = c["name"]
                        break
                    logger.warning(f"[stream-url] {c['name']} pas de streamingData: {d.get('playabilityStatus',{}).get('status')}")
                else:
                    logger.warning(f"[stream-url] {c['name']} HTTP {r.status_code}")
        except Exception as e:
            logger.warning(f"[stream-url] {c['name']} erreur: {e}")

    if not data:
        raise HTTPException(status_code=502, detail="InnerTube: aucun client n'a retourné de streamingData")

    # Formats combinés (audio+vidéo) mp4 en priorité, ≤ 720p pour fluidité browser
    combined = [f for f in data.get("streamingData", {}).get("formats", [])
                if f.get("url") and "mp4" in f.get("mimeType", "")]
    combined.sort(key=lambda f: f.get("height", 0), reverse=True)
    picked = next((f for f in combined if (f.get("height") or 0) <= 720), combined[0] if combined else None)

    if not picked:
        raise HTTPException(status_code=502, detail="Aucun format mp4 combiné disponible")

    logger.info(f"[stream-url] {client_used} OK — {picked.get('qualityLabel', picked.get('height', '?'))}p")
    return {
        "ok": True,
        "url": picked["url"],
        "height": picked.get("height"),
        "mimeType": picked.get("mimeType"),
        "client": client_used,
    }


@app.post("/transcribe-segments")
async def transcribe_segments_endpoint(req: TranscribeRequest, _=Depends(auth)):
    """InnerTube Android API → Whisper (stratégie 1). Fallback yt-dlp si InnerTube échoue."""
    if "youtube.com" not in req.youtube_url and "youtu.be" not in req.youtube_url:
        raise HTTPException(400, "URL YouTube invalide")
    job_dir = WORK_DIR / f"ts_{uuid.uuid4().hex[:8]}"
    job_dir.mkdir(parents=True, exist_ok=True)
    try:
        # Stratégie 1 : InnerTube Android API (bypass bot-detection)
        source, title = None, ""
        try:
            logger.info(f"[transcribe-segments] InnerTube: {req.youtube_url}")
            source, title = await _innertube_download_audio(req.youtube_url, job_dir)
            logger.info(f"[transcribe-segments] InnerTube OK: {title[:50]}")
        except Exception as e_it:
            logger.warning(f"[transcribe-segments] InnerTube failed ({e_it}), fallback yt-dlp")
            for p in job_dir.glob("audio.*"):
                p.unlink(missing_ok=True)
            # Stratégie 2 : yt-dlp (multiples tentatives proxy/bgutil)
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


@app.post("/process-clip")
async def process_clip_endpoint(
    request: Request,
    file: Optional[UploadFile] = File(None),
    video_id: str = Form(""),
    segments: str = Form(""),
    style: str = Form("bold"),
    font_size: int = Form(55),   # aligne sur le defaut client (bouton S), facteur x1.8 du 06/08
    color_text: str = Form("#ffffff"),
    color_bg: str = Form("#000000"),
    sub_y: float = Form(82.0),
    sub_x: float = Form(50.0),
    hook_enabled: str = Form("false"),
    hook_text: str = Form(""),
    hook_color: str = Form("#ffffff"),
    hook_bg: str = Form("#000000"),
    hook_font_size: int = Form(0),
    hook_y: float = Form(10.0),
    hook_style: str = Form("pill"),
    reframe_mode: str = Form("center"),
    clip_start: float = Form(-1.0),
    clip_end: float = Form(-1.0),
    crop_x_frac: float = Form(-1.0),
    split_top_x: float = Form(-1.0),
    split_bot_x: float = Form(-1.0),
    split_keyframes: str = Form("[]"),
    plan: str = Form("gratuit"),
    _=Depends(auth)
):
    """Reframe 9:16 (face tracking) + burn sous-titres en une seule passe. Retourne URL directe."""
    # plan_q = query param injecté par Vercel (non falsifiable par le client)
    plan_q = request.query_params.get("plan", "")
    if plan_q in ("gratuit", "pro", "studio", "agence"):
        plan = plan_q
    import shutil, json as _json, subprocess
    job_id = uuid.uuid4().hex[:10]
    tmp_dir = WORK_DIR / f"pc_{job_id}"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    in_path      = tmp_dir / "input.mp4"
    reframed     = tmp_dir / "reframed.mp4"
    ass_path     = tmp_dir / "subs.ass"
    out_path     = tmp_dir / "clip_final.mp4"
    try:
        if video_id:
            upload_source = UPLOAD_DIR / video_id / "source.mp4"
            if upload_source.exists():
                shutil.copy2(str(upload_source), str(in_path))
                logger.info(f"[process-clip] pré-upload {video_id} ({in_path.stat().st_size/1_048_576:.1f} MB)")
            elif YT_DOWNLOAD_API_KEY and re.fullmatch(r"[a-zA-Z0-9_-]{11}", video_id):
                # Source YouTube (pas d'upload) → récupère la vidéo complète via l'API (cache partagé)
                api_video = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: _ytapi_cached_video(video_id, "480"))
                if not api_video or not api_video.exists():
                    raise HTTPException(400, f"Téléchargement API échoué pour {video_id}")
                shutil.copy2(str(api_video), str(in_path))
                logger.info(f"[process-clip] source API {video_id} ({in_path.stat().st_size/1_048_576:.1f} MB)")
            else:
                raise HTTPException(400, f"Fichier pré-uploadé introuvable: {video_id}")
        elif file:
            with open(in_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
        else:
            raise HTTPException(400, "Fichier requis (upload direct ou video_id)")

        # Coupe côté serveur si start/end fournis (iOS ou pré-upload : évite FFmpeg.wasm client)
        if clip_start >= 0 and clip_end > clip_start:
            cut_path = tmp_dir / "cut.mp4"
            cut_cmd = ["ffmpeg", "-y", "-loglevel", "error",
                       "-ss", str(clip_start), "-to", str(clip_end),
                       "-i", str(in_path), "-c", "copy", str(cut_path)]
            r_cut = subprocess.run(cut_cmd, capture_output=True, timeout=120)
            if r_cut.returncode == 0 and cut_path.exists() and cut_path.stat().st_size > 0:
                in_path = cut_path
                logger.info(f"[process-clip] coupe serveur {clip_start:.1f}→{clip_end:.1f}s OK")
            else:
                logger.warning(f"[process-clip] coupe serveur échouée, utilise fichier entier")

        # Préparer le filtre ASS (avant la passe unique FFmpeg)
        segs = []
        logger.info(f"[subs-debug] raw segments param: {repr(segments[:120]) if segments else '(empty)'} len={len(segments)}")
        if segments:
            try: segs = _json.loads(segments)
            except Exception as pe: logger.warning(f"[subs-debug] JSON parse error: {pe}")

        hook_bool = hook_enabled.lower() in ("true", "1", "yes")

        def to_ass_time(secs):
            h = int(secs // 3600); m = int((secs % 3600) // 60); s = secs % 60
            return f"{h}:{m:02d}:{s:05.2f}"

        def hex_to_ass(h):
            h = h.lstrip("#").upper().zfill(6)
            return f"&H00{h[4:6]}{h[2:4]}{h[0:2]}"

        ct = hex_to_ass(color_text); cb = hex_to_ass(color_bg)
        # Couleur dim pour karaoke — 35% opaque (alpha A6), identique preview rgba(255,255,255,0.35)
        def hex_to_ass_dim(h):
            h = h.lstrip("#").upper().zfill(6)
            return f"&HA6{h[4:6]}{h[2:4]}{h[0:2]}"
        ct_dim = hex_to_ass_dim(color_text)

        def _rainbow_palette(n=24):
            # Dégradé lissé (pas 4 couleurs franches qui jurent) — mêmes teintes que
            # l'aperçu du bouton de style (émeraude → bleu → violet → rose → émeraude)
            anchors = [(16, 185, 129), (59, 130, 246), (139, 92, 246), (236, 72, 153), (16, 185, 129)]
            segs = len(anchors) - 1
            out = []
            for i in range(n):
                pos = i / n * segs
                seg = min(int(pos), segs - 1)
                t = pos - seg
                r = int(anchors[seg][0] + (anchors[seg + 1][0] - anchors[seg][0]) * t)
                g = int(anchors[seg][1] + (anchors[seg + 1][1] - anchors[seg][1]) * t)
                b = int(anchors[seg][2] + (anchors[seg + 1][2] - anchors[seg][2]) * t)
                out.append(f"&H00{b:02X}{g:02X}{r:02X}")
            return out

        margin_v = int((1 - sub_y / 100) * 1280)
        _x_px = int(max(0, min(100, sub_x)) / 100 * 720)
        _y_px = int(max(0, min(100, sub_y)) / 100 * 1280)
        # \an8 (ancrage HAUT-centre) = identique à l'aperçu (CSS top:subY%) → export = ce que l'user voit
        _pos_tag = "{" + f"\\pos({_x_px},{_y_px})\\an8" + "}"

        has_subs = bool(segs) or (hook_bool and hook_text)
        logger.info(f"[subs] style={style} has_subs={has_subs} segs={len(segs)} hook={hook_bool} hook_text={repr(hook_text[:30]) if hook_text else ''}")
        F  = "DejaVu Sans"
        FM = "DejaVu Sans Mono"
        # Le style "submagic" impose sa police : c'est elle qui fait l'essentiel du rendu.
        # Elle doit être IDENTIQUE à celle chargée par l'aperçu navigateur, sinon aperçu et
        # export divergent sur la largeur des lignes, donc sur l'endroit où le texte se coupe.
        FSM = "Montserrat ExtraBold"
        style_map = {
            "bold":      f"Style: Default,{F},{font_size},{ct},{ct},{cb},&H80000000,-1,0,0,0,100,100,0,0,1,4,2,2,44,44,{margin_v},1",
            "karaoke":   f"Style: Default,{F},{font_size},{ct},{ct_dim},{cb},&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,44,44,{margin_v},1",
            "typewriter":f"Style: Default,{FM},{font_size},{ct},{ct},{cb},&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,44,44,{margin_v},1",
            "wordpop":   f"Style: Default,{F},{font_size},{ct},{ct},{cb},&H80000000,-1,0,0,0,100,100,0,0,1,4,2,2,44,44,{margin_v},1",
            "slide":     f"Style: Default,{F},{font_size},{ct},{ct},&H00000000,&HBF000000,-1,0,0,0,100,100,0,0,3,10,0,2,44,44,{margin_v},1",
            "shake":     f"Style: Default,{F},{font_size},{ct},{ct},{cb},&H80000000,-1,0,0,0,100,100,0,0,1,4,2,2,44,44,{margin_v},1",
            "wave":      f"Style: Default,{F},{font_size},{ct},{ct},{cb},&H80000000,-1,0,0,0,100,100,0,0,1,4,2,2,44,44,{margin_v},1",
            # Style "submagic" : capitales, contour noir franc, AUCUNE ombre, alignement 8
            # (haut-centre) comme l'aperçu. Le contour est volontairement plus fin que la
            # mesure d'origine (0.0072 de la hauteur) : celle-ci vaut pour Montserrat, dont
            # les fûts sont plus fins. Sur une graisse plus lourde, le noir se rejoint entre
            # les lettres et forme un aplat au lieu d'un liseré.
            # libass dessine les majuscules a 0.63 du corps, le navigateur a 0.70. Pour que
            # l'export atteigne la taille de l'apercu (la reference), on agrandit le corps
            # de 0.70/0.63 = 1.112. Mesure sur cinq tailles, Poppins comme Montserrat.
            "submagic":  f"Style: Default,{FSM},{font_size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,{max(2, int(font_size * 0.06))},0,8,44,44,{margin_v},1",
        }
        style_line = style_map.get(style, style_map["bold"])
        hc = hex_to_ass(hook_color)
        def hex_to_ass_bg(h, alpha="12"):
            h = h.lstrip("#").upper().zfill(6)
            return f"&H{alpha}{h[4:6]}{h[2:4]}{h[0:2]}"
        hbg       = hex_to_ass_bg(hook_bg, "12")   # 93% opaque — fond de la boite
        hbg_solid = hex_to_ass_bg(hook_bg, "00")   # 100% opaque — OutlineColour = meme couleur que fond
        hfs = hook_font_size if hook_font_size > 0 else int(font_size * 0.9)
        # Hook style : pill (fond box), clean (ombre), outline (contour épais)
        # MarginV=0 car position exacte via \pos() dans le Dialogue
        if hook_style == "clean":
            hook_style_line = f"Style: Hook,{F},{hfs},{hc},{hc},&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,0,3,8,30,30,0,1"
        elif hook_style == "outline":
            hook_style_line = f"Style: Hook,{F},{hfs},{hc},{hc},{hbg_solid},&H00000000,-1,0,0,0,100,100,0,0,1,5,1,8,30,30,0,1"
        else:
            hook_style_line = f"Style: Hook,{F},{hfs},{hc},{hc},{hbg_solid},{hbg},-1,0,0,0,100,100,0,0,3,18,0,8,30,30,0,1"

        overlay_vf = ""
        if has_subs and style != "none":
            ass_lines = [
                "[Script Info]","ScriptType: v4.00+","PlayResX: 720","PlayResY: 1280","WrapStyle: 1","",
                "[V4+ Styles]",
                "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
                style_line, hook_style_line, "",
                "[Events]",
                "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
            ]
            if hook_bool and hook_text:
                _hook_x_px = 360  # centré sur 720px
                _hook_y_px = int(max(0, min(100, hook_y)) / 100 * 1280)
                if hook_style != "pill":
                    # clean / outline → ASS (pas de border-radius, mais style différent)
                    _hook_pos = "{" + f"\\pos({_hook_x_px},{_hook_y_px})\\an8" + "}"
                    ass_lines.append(f"Dialogue: 0,{to_ass_time(0)},{to_ass_time(3)},Hook,,0,0,0,,{_hook_pos}{hook_text}")
            # Max 2 lignes : ~2400 / font_size caractères par chunk (canvas 720px, 92% width)
            _max_chars = max(18, int(2400 / max(font_size, 30)))
            def split_seg(t0, t1, txt):
                words = txt.split()
                if not words: return
                chunks, cur, cur_len = [], [], 0
                for w in words:
                    add = len(w) + (1 if cur else 0)
                    if cur and cur_len + add > _max_chars:
                        chunks.append(cur); cur = [w]; cur_len = len(w)
                    else:
                        cur.append(w); cur_len += add
                if cur: chunks.append(cur)
                total = len(words); dur = t1 - t0; wi = 0
                for ch in chunks:
                    ct0 = t0 + dur * wi / total
                    wi += len(ch)
                    yield (ct0, t0 + dur * wi / total, " ".join(ch))
            # DÉ-CHEVAUCHEMENT : les segments (surtout auto-captions YouTube quand 2 personnes
            # parlent en même temps) se superposent en temps → sous-titres illisibles. On trie et
            # on tronque la fin de chaque segment au début du suivant : un seul sous-titre à la fois.
            _segs_clean = sorted([dict(s) for s in segs if str(s.get("text", "")).strip()],
                                 key=lambda s: float(s.get("t0", 0)))
            for _i in range(len(_segs_clean) - 1):
                _nt0 = float(_segs_clean[_i + 1].get("t0", 0))
                if float(_segs_clean[_i].get("t1", 0)) > _nt0 > float(_segs_clean[_i].get("t0", 0)):
                    _segs_clean[_i]["t1"] = _nt0
            segs = _segs_clean

            # Couleurs karaoke alternées par segment (jaune/vert — identique preview)
            _karo_colors = ["&H0000E0FF&", "&H0081B910&"]  # #FFE000 jaune, #10b981 vert
            _karo_idx = 0
            # Cycle du style "submagic" : vert -> rouge -> jaune, une couleur par segment.
            _SM_CYCLE = ["&H002FFF3B&", "&H001A02DD&", "&H0000E6FF&"]   # vert, rouge, jaune #FFE600
            # (remettre plusieurs entrees ici pour retrouver un cycle)
            _sm_idx = 0
            # Zone utile en largeur sur le canvas d'export (720 px moins les 2 marges de 44).
            _SM_ZONE_PX = 720 - 88
            _SM_TTF = "/usr/share/fonts/truetype/montserrat/Montserrat-ExtraBold.ttf"
            _sm_fonts = {}

            def _sm_largeur(txt, taille):
                """Largeur réelle de la chaîne dans la police d'export.
                Repli sur le coefficient moyen mesuré (0.743) si la police est illisible —
                le rendu resterait correct, seul le découpage serait approximatif."""
                try:
                    f = _sm_fonts.get(taille)
                    if f is None:
                        from PIL import ImageFont
                        f = ImageFont.truetype(_SM_TTF, int(taille))
                        _sm_fonts[taille] = f
                    b = f.getbbox(txt)
                    return b[2] - b[0]
                except Exception:
                    return len(txt) * taille * 0.743
            for s in segs:
                t0 = float(s.get("t0", 0)); t1 = float(s.get("t1", 0))
                txt = str(s.get("text","")).strip().replace("\n"," ")
                if not (txt and t1 > t0): continue
                seg_color = _karo_colors[_karo_idx % 2]; _karo_idx += 1

                if style == "submagic":
                    """Deux lignes empilées, la ligne en cours d'énonciation colorée, l'autre
                    blanche. La couleur tourne d'un segment à l'autre. La bascule entre les deux
                    lignes se fait sur le timing RÉEL du premier mot de la seconde ligne — c'est
                    ce qui la synchronise avec la voix, là où une division égale du segment
                    produit un décalage audible."""
                    _mots_seg = s.get("words") or []
                    _liste = [str(w.get("word", "")).strip().upper()
                              for w in _mots_seg if str(w.get("word", "")).strip()]
                    if not _liste:
                        _liste = [w.upper() for w in txt.split()]
                        _mots_seg = []

                    """Coupure SYSTÉMATIQUE en deux lignes, moitié-moitié (la première ligne
                    prend le mot en plus quand le compte est impair).

                    Le budget de caractères précédent (2400/taille) ne déclenchait quasiment
                    jamais : une cue de 4 mots fait ~25 caractères pour un budget de 43. Le
                    code concluait « une seule ligne » et colorait TOUT le bloc — alors que
                    libass, lui, repliait le texte sur deux lignes à cause des marges. Résultat
                    à l'écran : deux lignes de la même couleur, jamais de blanc. C'est
                    précisément ce qui distingue notre rendu de la référence."""
                    """Découpage sur la largeur MESURÉE, pas estimée.

                    Historique des erreurs sur ce point : le budget 2400/taille annonçait 43
                    caractères par ligne, puis un coefficient 0.62 en annonçait 18. Mesure
                    réelle sur Montserrat ExtraBold : le coefficient moyen est 0.743 et le pire
                    cas 1.185 (lettres M, W). Aucun coefficient unique ne peut donc convenir —
                    « CERVEAU FONCTIONNE » fait 691 px pour 632 px utiles alors que le compte
                    de caractères le déclarait bon. On mesure la chaîne elle-même."""
                    # Découpe la cue en PAGES de 2 lignes. Une page dont le reste ne tient pas
                    # engendre une page suivante, affichée après elle — jamais une 3e ligne.
                    _pages = []
                    _reste = list(range(len(_liste)))
                    while _reste:
                        _ln = []
                        for _k in range(2):
                            _cur = []
                            while _reste:
                                _essai = " ".join(_cur + [_liste[_reste[0]]])
                                if _cur and _sm_largeur(_essai, font_size) > _SM_ZONE_PX:
                                    break
                                _cur.append(_liste[_reste.pop(0)])
                            if _cur:
                                _ln.append(_cur)
                            else:
                                break
                        if not _ln:
                            break
                        # Une seule ligne remplie et rien après : on la coupe en deux pour que
                        # le blanc apparaisse (sinon toute la page serait d'une seule couleur).
                        if len(_ln) == 1 and not _reste and len(_ln[0]) >= 2:
                            _c = (len(_ln[0]) + 1) // 2
                            _ln = [_ln[0][:_c], _ln[0][_c:]]
                        _pages.append(_ln)

                    # \q2 interdit à libass de replier le texte lui-même. Sans ça il ajoute ses
                    # propres coupures par-dessus les nôtres : à l'écran on voyait deux lignes
                    # de la MÊME couleur (son repli), au lieu d'une colorée et d'une blanche.
                    _sm_tag = "{" + f"\\pos({_x_px},{_y_px})\\an8\\q2" + "}"

                    def _sm_t(_i, _defaut):
                        """Instant réel du i-ème mot de la cue, sinon valeur de repli."""
                        if _mots_seg and 0 <= _i < len(_mots_seg):
                            return float(_mots_seg[_i].get("start", _defaut))
                        return _defaut

                    _pos = 0   # index du 1er mot de la page courante dans la cue
                    for _pi, _ln in enumerate(_pages):
                        _n1 = len(_ln[0])
                        _n2 = len(_ln[1]) if len(_ln) > 1 else 0
                        _nb = _n1 + _n2
                        # Bornes de la page : début du 1er mot -> début du 1er mot de la page
                        # suivante (ou fin de la cue pour la dernière).
                        _pt0 = _sm_t(_pos, t0 + (t1 - t0) * _pos / max(len(_liste), 1))
                        _pt1 = (_sm_t(_pos + _nb, t1) if _pi < len(_pages) - 1 else t1)
                        _pt0 = max(t0, min(_pt0, t1 - 0.10))
                        _pt1 = max(_pt0 + 0.10, min(_pt1, t1))
                        _txt1 = " ".join(_ln[0])
                        _hl = _SM_CYCLE[_sm_idx % len(_SM_CYCLE)]; _sm_idx += 1

                        if _n2 == 0:
                            ass_lines.append(
                                f"Dialogue: 0,{to_ass_time(_pt0)},{to_ass_time(_pt1)},Default,,0,0,0,,"
                                f"{_sm_tag}{{\\c{_hl}}}{_txt1}")
                        else:
                            _txt2 = " ".join(_ln[1])
                            _tmid = _sm_t(_pos + _n1, (_pt0 + _pt1) / 2)
                            _tmid = max(_pt0 + 0.05, min(_tmid, _pt1 - 0.05))
                            ass_lines.append(
                                f"Dialogue: 0,{to_ass_time(_pt0)},{to_ass_time(_tmid)},Default,,0,0,0,,"
                                f"{_sm_tag}{{\\c{_hl}}}{_txt1}\\N{{\\c&H00FFFFFF&}}{_txt2}")
                            ass_lines.append(
                                f"Dialogue: 0,{to_ass_time(_tmid)},{to_ass_time(_pt1)},Default,,0,0,0,,"
                                f"{_sm_tag}{{\\c&H00FFFFFF&}}{_txt1}\\N{{\\c{_hl}}}{_txt2}")
                        _pos += _nb
                    continue

                for t0, t1, txt in split_seg(t0, t1, txt):
                    if style == "typewriter":
                        words = txt.split()
                        dt = (t1 - t0) / max(len(words), 1)
                        for wi in range(len(words)):
                            step_t0 = t0 + wi * dt
                            step_t1 = t0 + (wi + 1) * dt if wi < len(words) - 1 else t1
                            line_txt = " ".join(words[:wi + 1])
                            ass_lines.append(f"Dialogue: 0,{to_ass_time(step_t0)},{to_ass_time(step_t1)},Default,,0,0,0,,{_pos_tag}{line_txt}")
                    elif style == "karaoke":
                        words = txt.split()
                        n_w = max(len(words), 1)
                        dt = (t1 - t0) / n_w
                        for wi in range(n_w):
                            wt0 = t0 + wi * dt
                            wt1 = t0 + (wi + 1) * dt if wi < n_w - 1 else t1
                            parts = []; cur_clr = None
                            for j, w in enumerate(words):
                                clr = ct if j < wi else (seg_color if j == wi else ct_dim)
                                if clr != cur_clr:
                                    parts.append(f"{{\\1c{clr}}}"); cur_clr = clr
                                if j == wi:
                                    parts.append(f"{{\\fscx112\\fscy112}}{w}{{\\fscx100\\fscy100}}")
                                else:
                                    parts.append(w)
                                if j < n_w - 1:
                                    parts.append(" ")
                            ass_lines.append(f"Dialogue: 0,{to_ass_time(wt0)},{to_ass_time(wt1)},Default,,0,0,0,,{_pos_tag}{''.join(parts)}")
                    elif style == "shake":
                        # Un seul événement (pas de découpage en tranches — ça créait des
                        # textes dupliqués/superposés à l'export). Le tremblement vient de
                        # \t chaînés qui animent une légère rotation dans le temps.
                        dur_ms = max(1, int((t1 - t0) * 1000))
                        seg_ms = 120
                        n_steps = max(1, dur_ms // seg_ms)
                        transforms = []
                        for i in range(n_steps):
                            a = 2.5 if i % 2 == 0 else -2.5
                            transforms.append(f"\\t({i*seg_ms},{(i+1)*seg_ms},\\frz{a})")
                        tag = "{" + f"\\pos({_x_px},{_y_px})\\an8\\org({_x_px},{_y_px})" + "".join(transforms) + "}"
                        ass_lines.append(f"Dialogue: 0,{to_ass_time(t0)},{to_ass_time(t1)},Default,,0,0,0,,{tag}{txt}")
                    elif style == "wave":
                        # Dégradé arc-en-ciel qui défile vraiment (pas figé) — toujours un seul
                        # événement (pas de découpage en tranches, source des doublons constatés),
                        # chaque lettre anime sa propre couleur via \t chaînés (transform ASS
                        # natif, comme pour shake) au lieu de créer plusieurs Dialogue.
                        _palette = _rainbow_palette(12)
                        n_pal = len(_palette)
                        dur_ms = max(1, int((t1 - t0) * 1000))
                        step_ms = 350
                        n_steps = max(2, dur_ms // step_ms)
                        parts = []
                        for i, chch in enumerate(txt):
                            colors = [_palette[(i + s) % n_pal] for s in range(n_steps + 1)]
                            transforms = "".join(f"\\t({s*step_ms},{(s+1)*step_ms},\\1c{colors[s+1]})" for s in range(n_steps))
                            parts.append(f"{{\\1c{colors[0]}{transforms}}}{chch}")
                        colored_txt = "".join(parts)
                        ass_lines.append(f"Dialogue: 0,{to_ass_time(t0)},{to_ass_time(t1)},Default,,0,0,0,,{_pos_tag}{colored_txt}")
                    elif style == "slide":
                        # Fondu à l'apparition, position fixe — \move combiné à la boîte de fond
                        # (BorderStyle=3) empêchait la boîte de s'afficher à l'export.
                        dur_ms = max(1, min(300, int((t1 - t0) * 1000)))
                        tag = "{" + f"\\pos({_x_px},{_y_px})\\an8\\fad({dur_ms},0)" + "}"
                        ass_lines.append(f"Dialogue: 0,{to_ass_time(t0)},{to_ass_time(t1)},Default,,0,0,0,,{tag}{txt}")
                    elif style == "wordpop":
                        # Chaque mot apparaît avec un effet de zoom (\t anime l'échelle de 60% à 100%)
                        words = txt.split()
                        n_w = max(len(words), 1)
                        dt = (t1 - t0) / n_w
                        for wi in range(n_w):
                            wt0 = t0 + wi * dt
                            wt1 = t0 + (wi + 1) * dt if wi < n_w - 1 else t1
                            parts = []
                            for j, w in enumerate(words):
                                if j == wi:
                                    parts.append("{\\fscx60\\fscy60\\t(0,150,\\fscx100\\fscy100)}" + w + "{\\r}")
                                else:
                                    parts.append(w)
                                if j < n_w - 1:
                                    parts.append(" ")
                            ass_lines.append(f"Dialogue: 0,{to_ass_time(wt0)},{to_ass_time(wt1)},Default,,0,0,0,,{_pos_tag}{''.join(parts)}")
                    else:
                        ass_lines.append(f"Dialogue: 0,{to_ass_time(t0)},{to_ass_time(t1)},Default,,0,0,0,,{_pos_tag}{txt}")
            with open(ass_path, "w", encoding="utf-8") as f:
                f.write("\n".join(ass_lines))
            overlay_vf = f"ass={str(ass_path)}"

        # Hook pill arrondi via Pillow (uniquement pour hook_style=pill)
        pill_png_path_str = None
        pill_y_px_final = 0
        if hook_bool and hook_text and hook_style == "pill":
            try:
                _hook_y_px = int(max(0, min(100, hook_y)) / 100 * 1280)
                pill_bytes, _pill_h = _make_hook_pill_png(hook_text, hook_color, hook_bg, hfs, canvas_w=720)
                _pill_path = tmp_dir / "hook_pill.png"
                _pill_path.write_bytes(pill_bytes)
                pill_png_path_str = str(_pill_path)
                pill_y_px_final = max(0, _hook_y_px)
                logger.info(f"[hook-pill] PNG généré 720x{_pill_h} @y={pill_y_px_final}")
            except Exception as _pe:
                logger.warning(f"[hook-pill] Pillow échoué ({_pe}), hook ignoré")

        # Filigrane : pill sombre + icône ronde verte (style OpusClip) pour plan gratuit
        if plan == "gratuit":
            _font = ""
            for _fp in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]:
                if os.path.exists(_fp):
                    _font = f":fontfile={_fp}"; break
            # Pill sombre (fond) : x=10 y=68, w=152 h=44
            # Icône ronde : drawtext "C" avec box+boxradius élevé → cercle vert
            # "Creatis" blanc à droite sur fond transparent
            wm = (
                f"drawtext=text='C':fontsize=18:fontcolor=white:x=18:y=76"
                f":box=1:boxcolor=0x10b981:boxborderw=9{_font}"
                f",drawtext=text='Creatis':fontsize=16:fontcolor=white:x=54:y=78{_font}"
            )
            overlay_vf = f"{overlay_vf},{wm}" if overlay_vf else wm

        # Passe unique : reframe + sous-titres en une seule commande FFmpeg
        async with _get_ffmpeg_sem():
            if reframe_mode == "split":
                # Positions manuelles (glisser) — défaut 30%/70% si non fournies
                _tf_ = split_top_x if 0.0 <= split_top_x <= 1.0 else 0.30
                _bf_ = split_bot_x if 0.0 <= split_bot_x <= 1.0 else 0.70
                _has_manual_pos = (0.0 <= split_top_x <= 1.0) or (0.0 <= split_bot_x <= 1.0)
                try:
                    _kf = _json.loads(split_keyframes) if split_keyframes else []
                except Exception:
                    _kf = []
                if _kf:
                    # Repères timeline → rendu par sections (split/solo selon le moment). Contrôle total.
                    _sw, _sh = _get_video_dimensions(str(in_path))
                    await asyncio.get_event_loop().run_in_executor(
                        None, lambda: _reframe_split_timeline(str(in_path), str(out_path), _sw, _sh, _tf_, _bf_, _kf, overlay_vf=overlay_vf)
                    )
                elif _has_manual_pos:
                    # Positions manuelles fixes (sans repères) → split positionnel fixe.
                    _sw, _sh = _get_video_dimensions(str(in_path))
                    await asyncio.get_event_loop().run_in_executor(
                        None, lambda: _reframe_positional_split(str(in_path), str(out_path), _sw, _sh, overlay_vf=overlay_vf, left_frac=_tf_, right_frac=_bf_)
                    )
                else:
                    # Aucun réglage manuel → split adaptatif auto (détection visages).
                    await asyncio.get_event_loop().run_in_executor(
                        None, lambda: _reframe_split_dynamic(str(in_path), str(out_path), overlay_vf=overlay_vf, pill_png_path=pill_png_path_str, pill_y_px=pill_y_px_final)
                    )
            else:
                # crop_x_frac >= 0 → cadrage MANUEL (glisser) : prioritaire sur l'auto-détection
                _manual_x = crop_x_frac if 0.0 <= crop_x_frac <= 1.0 else None
                await asyncio.get_event_loop().run_in_executor(
                    None, lambda: _reframe_vertical(str(in_path), str(out_path), reframe_mode=reframe_mode, overlay_vf=overlay_vf, pill_png_path=pill_png_path_str, pill_y_px=pill_y_px_final, manual_x_frac=_manual_x)
                )
        if not out_path.exists() or out_path.stat().st_size == 0:
            raise HTTPException(500, "Reframe/burn échoué")
        logger.info(f"[process-clip] OK — {out_path.stat().st_size // 1024}KB")

        # On dépose sur R2 et on renvoie un LIEN plutôt que les 15 Mo du fichier : c'est ce qui
        # débloque le téléchargement mobile (voir _r2_publier_clip). Si R2 est indisponible, on
        # retombe sur l'ancien comportement — le flux ne casse jamais à cause de ça.
        url_r2 = await asyncio.get_event_loop().run_in_executor(
            None, lambda: _r2_publier_clip(out_path, "clip_9x16.mp4")
        )
        if url_r2:
            taille = out_path.stat().st_size
            shutil.rmtree(tmp_dir, ignore_errors=True)
            return JSONResponse({"ok": True, "url": url_r2, "filename": "clip_9x16.mp4", "size": taille})

        logger.warning("[process-clip] R2 indisponible — renvoi du fichier en direct (repli)")
        return FileResponse(str(out_path), media_type="video/mp4", filename="clip_9x16.mp4",
            background=BackgroundTask(shutil.rmtree, tmp_dir, True))

    except HTTPException:
        shutil.rmtree(tmp_dir, ignore_errors=True); raise
    except Exception as e:
        shutil.rmtree(tmp_dir, ignore_errors=True); raise HTTPException(500, str(e))


@app.get("/process-clip-file/{job_id}/{filename}")
def process_clip_file(job_id: str, filename: str):
    if ".." in job_id + filename:
        raise HTTPException(400, "Chemin invalide")
    path = WORK_DIR / f"pc_{job_id}" / "clip_final.mp4"
    if not path.exists():
        raise HTTPException(404, "Fichier introuvable ou expiré")
    return FileResponse(str(path), media_type="video/mp4", filename=filename)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
