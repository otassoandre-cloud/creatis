"""CONNECTEUR MCP CRÉATIS — serveur d'autorisation OAuth 2.1 + serveur MCP.

Permet à n'importe qui d'ajouter Créatis comme connecteur dans Claude et de
demander des clips en langage naturel.

POURQUOI OAUTH ET PAS UNE CLÉ D'API. Sur claude.ai, l'utilisateur qui ajoute un
connecteur ne peut pas saisir d'en-tête HTTP : il colle une URL, point. Les jetons
statiques ne fonctionnent que dans Claude Code, via un fichier de configuration
local. Pour viser le grand public, il faut donc être un vrai serveur
d'autorisation. L'enregistrement dynamique (RFC 7591) est tout aussi obligatoire
en pratique : sans lui, chacun devrait créer un client_id à la main dans les
« paramètres avancés », ce qui éliminerait la quasi-totalité des gens.

POURQUOI ICI ET PAS SUR VERCEL. Le plan Vercel Hobby plafonne à 12 fonctions et le
projet y était déjà : le déploiement échouait à l'étape « Deploying outputs ».
Railway héberge déjà ce service, n'a pas cette limite, et n'impose pas de durée
maximale d'exécution — ce qui convient mieux à des rendus de plusieurs minutes.

QUOTAS. Aucune règle métier ici. Les générations passent par
`{APP_URL}/api/repurpose` avec le jeton de l'utilisateur, et `verifyToken`
là-bas sait résoudre un jeton MCP. Plan, quota vidéos, quota clips et décompte
s'appliquent donc au connecteur exactement comme au site, sans duplication : un
abonné qui passe par Claude consomme le même quota que sur creatis.app.

SÉCURITÉ. PKCE obligatoire (le code transite par le navigateur), redirect_uri
vérifiée à l'identique, codes à usage unique, et les jetons ne sont stockés qu'en
SHA-256 — une fuite de la base ne donne accès à aucun compte.
"""

import os
import base64
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode, urlparse

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

logger = logging.getLogger("creatis.mcp")
router = APIRouter()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
APP_URL = os.environ.get("APP_URL", "https://creatis.app").rstrip("/")

# L'émetteur doit être l'origine réellement servie, sinon Claude refuse les jetons.
# MCP_ISSUER permet de basculer sur mcp.creatis.app le jour où le sous-domaine existe.
ISSUER = (os.environ.get("MCP_ISSUER")
          or f"https://{os.environ.get('RAILWAY_PUBLIC_DOMAIN', 'localhost:8080')}").rstrip("/")

PROTOCOLE = "2025-06-18"
MAX_CLIPS = 5
DUREE_CODE = timedelta(minutes=10)
DUREE_JETON = timedelta(days=30)


def _sha(v: str) -> str:
    return hashlib.sha256(v.encode()).hexdigest()


def _alea(n: int = 32) -> str:
    return secrets.token_urlsafe(n)


def _maintenant() -> datetime:
    return datetime.now(timezone.utc)


# ── Accès aux tables de suivi (service key : jamais exposées au client) ──────
async def _db(methode: str, chemin: str, **kw):
    entetes = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    entetes.update(kw.pop("headers", {}))
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.request(methode, f"{SUPABASE_URL}/rest/v1/{chemin}", headers=entetes, **kw)
    if r.status_code >= 400:
        raise RuntimeError(f"Supabase {r.status_code} {chemin} — {r.text[:180]}")
    if r.status_code == 204 or not r.content:
        return None
    return r.json()


async def _lire(chemin: str):
    return await _db("GET", chemin)


async def _inserer(table: str, data: dict):
    return await _db("POST", table, json=data, headers={"Prefer": "return=minimal"})


async def _patcher(chemin: str, data: dict):
    return await _db("PATCH", chemin, json=data, headers={"Prefer": "return=minimal"})


async def _connecter(email: str, mot_de_passe: str) -> Optional[dict]:
    """Valide un couple e-mail/mot de passe via Supabase Auth.

    On passe par le point d'entrée public plutôt que de lire la table nous-mêmes :
    c'est lui qui connaît le hachage des mots de passe.
    """
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={"apikey": ANON_KEY, "Content-Type": "application/json"},
            json={"email": email, "password": mot_de_passe},
        )
    if r.status_code >= 400:
        return None
    u = r.json().get("user") or {}
    return {"id": u["id"], "email": u.get("email")} if u.get("id") else None


async def utilisateur_du_jeton(entete: Optional[str]) -> Optional[dict]:
    """Résout le jeton porteur MCP en utilisateur, ou None."""
    if not entete or not entete.lower().startswith("bearer "):
        return None
    brut = entete[7:].strip()
    try:
        lignes = await _lire(
            f"mcp_tokens?token_hash=eq.{_sha(brut)}&revoked_at=is.null"
            "&select=user_id,expires_at"
        )
    except Exception as e:
        logger.warning(f"[mcp] lecture jeton impossible: {e}")
        return None
    if not lignes:
        return None
    t = lignes[0]
    if datetime.fromisoformat(t["expires_at"].replace("Z", "+00:00")) < _maintenant():
        return None
    return {"id": t["user_id"], "jeton": brut}


# ── Page de consentement ────────────────────────────────────────────────────
# Volontairement autonome (aucune dépendance, aucun CSS externe) : elle s'affiche
# dans une fenêtre surgissante souvent étroite, et doit fonctionner même si le
# reste du site est indisponible.
def _page(params: dict, erreur: str = "") -> str:
    caches = "".join(
        f'<input type="hidden" name="{k}" value="{str(v or "").replace(chr(34), "&quot;")}">'
        for k, v in params.items()
    )
    bloc_err = f'<div class="err">{erreur}</div>' if erreur else ""
    return f"""<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connecter Créatis à Claude</title><style>
*{{box-sizing:border-box}}
body{{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#0a0f0a;color:#e8eee9;font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;padding:24px}}
.b{{width:100%;max-width:380px}}
.logo{{display:flex;align-items:center;gap:10px;margin-bottom:26px}}
.m{{width:38px;height:38px;border-radius:11px;background:linear-gradient(180deg,#34d399,#059669);
display:flex;align-items:center;justify-content:center;font-weight:800;color:#05140b;font-size:22px}}
h1{{font-size:1.3rem;margin:0 0 6px;letter-spacing:-.02em}}
p.s{{color:#93a89a;margin:0 0 22px;font-size:.92rem}}
label{{display:block;font-size:.8rem;color:#93a89a;margin:0 0 6px}}
input[type=email],input[type=password]{{width:100%;padding:11px 13px;margin-bottom:16px;
background:#111a13;border:1px solid #23372a;border-radius:8px;color:#e8eee9;font-size:15px}}
input:focus{{outline:2px solid #10b981;outline-offset:1px;border-color:transparent}}
button{{width:100%;padding:12px;background:#10b981;color:#05140b;border:0;border-radius:8px;
font-weight:700;font-size:15px;cursor:pointer}}
button:hover{{background:#34d399}}
.err{{background:#3a1a1a;border:1px solid #6b2b2b;color:#f5b5b5;padding:10px 12px;
border-radius:8px;margin-bottom:16px;font-size:.88rem}}
.acces{{background:#111a13;border:1px solid #23372a;border-radius:8px;padding:14px 16px;margin-bottom:20px}}
.acces strong{{display:block;font-size:.82rem;margin-bottom:8px}}
.acces ul{{margin:0;padding-left:18px;color:#93a89a;font-size:.85rem}}
.pied{{margin-top:18px;color:#6d8074;font-size:.78rem;text-align:center}}
a{{color:#34d399}}
</style></head><body><div class="b">
<div class="logo"><div class="m">C</div><div><strong>Créatis</strong></div></div>
<h1>Connecter à Claude</h1>
<p class="s">Connecte-toi avec ton compte Créatis pour autoriser Claude à créer des clips à ta place.</p>
{bloc_err}
<div class="acces"><strong>Claude pourra :</strong><ul>
<li>analyser des vidéos et proposer des clips</li>
<li>exporter des clips au format vertical</li>
<li>consulter ton quota du mois</li></ul></div>
<form method="POST">{caches}
<label for="e">E-mail</label>
<input id="e" type="email" name="email" required autocomplete="email" autofocus>
<label for="p">Mot de passe</label>
<input id="p" type="password" name="mot_de_passe" required autocomplete="current-password">
<button type="submit">Autoriser Claude</button></form>
<p class="pied">Pas encore de compte ? <a href="{APP_URL}">Crée-en un sur creatis.app</a><br>
Les clips consomment ton quota habituel.</p>
</div></body></html>"""


# ── Découverte ──────────────────────────────────────────────────────────────
# Claude lit ces deux documents en premier. Sans eux, l'ajout du connecteur
# échoue avant même d'afficher quoi que ce soit.
@router.get("/.well-known/oauth-authorization-server")
@router.get("/.well-known/oauth-authorization-server/mcp")
@router.get("/.well-known/openid-configuration")
async def metadonnees_serveur():
    return {
        "issuer": ISSUER,
        "authorization_endpoint": f"{ISSUER}/oauth/authorize",
        "token_endpoint": f"{ISSUER}/oauth/token",
        "registration_endpoint": f"{ISSUER}/oauth/register",
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
        "code_challenge_methods_supported": ["S256"],
        "token_endpoint_auth_methods_supported": ["none", "client_secret_post"],
        "scopes_supported": ["clips"],
    }


@router.get("/.well-known/oauth-protected-resource")
@router.get("/.well-known/oauth-protected-resource/mcp")
async def metadonnees_ressource():
    return {
        "resource": f"{ISSUER}/mcp",
        "authorization_servers": [ISSUER],
        "scopes_supported": ["clips"],
    }


# ── Enregistrement dynamique (RFC 7591) ─────────────────────────────────────
@router.post("/oauth/register")
async def enregistrer(request: Request):
    corps = await request.json()
    redirects = corps.get("redirect_uris")
    if not isinstance(redirects, list) or not redirects:
        return JSONResponse(status_code=400, content={
            "error": "invalid_redirect_uri",
            "error_description": "redirect_uris est obligatoire",
        })
    client_id = "mcp_" + _alea(16)
    secret = _alea(32)
    await _inserer("mcp_clients", {
        "client_id": client_id,
        "client_secret": _sha(secret),      # haché, comme les jetons
        "client_name": str(corps.get("client_name") or "Claude")[:120],
        "redirect_uris": redirects,
    })
    logger.info(f"[mcp] client enregistré {client_id} ({corps.get('client_name')})")
    return JSONResponse(status_code=201, content={
        "client_id": client_id,
        "client_secret": secret,
        "client_id_issued_at": int(_maintenant().timestamp()),
        "client_secret_expires_at": 0,
        "redirect_uris": redirects,
        "token_endpoint_auth_method": "client_secret_post",
        "grant_types": ["authorization_code", "refresh_token"],
        "response_types": ["code"],
    })


# ── Autorisation ────────────────────────────────────────────────────────────
_CHAMPS = ("client_id", "redirect_uri", "state", "code_challenge",
           "code_challenge_method", "scope")


@router.get("/oauth/authorize")
async def autoriser_formulaire(request: Request):
    p = {k: request.query_params.get(k, "") for k in _CHAMPS}
    if not p["client_id"] or not p["redirect_uri"]:
        return HTMLResponse(_page(p, "Requête incomplète — relance la connexion depuis Claude."),
                            status_code=400)
    return HTMLResponse(_page(p))


@router.post("/oauth/authorize")
async def autoriser_soumission(request: Request):
    form = await request.form()
    p = {k: str(form.get(k) or "") for k in _CHAMPS}

    clients = await _lire(f"mcp_clients?client_id=eq.{p['client_id']}&select=redirect_uris")
    # La redirection doit correspondre EXACTEMENT à une URL déclarée : c'est ce qui
    # empêche de détourner le code d'autorisation vers un autre site.
    if not clients or p["redirect_uri"] not in (clients[0].get("redirect_uris") or []):
        return HTMLResponse(
            _page(p, "Application inconnue. Retire puis rajoute le connecteur dans Claude."),
            status_code=400)

    user = await _connecter(str(form.get("email") or ""), str(form.get("mot_de_passe") or ""))
    if not user:
        return HTMLResponse(_page(p, "E-mail ou mot de passe incorrect."), status_code=401)

    code = _alea(24)
    await _inserer("mcp_codes", {
        "code": code,
        "client_id": p["client_id"],
        "user_id": user["id"],
        "redirect_uri": p["redirect_uri"],
        "code_challenge": p["code_challenge"] or None,
        "code_challenge_method": p["code_challenge_method"] or None,
        "expires_at": (_maintenant() + DUREE_CODE).isoformat(),
    })

    sep = "&" if urlparse(p["redirect_uri"]).query else "?"
    retour = p["redirect_uri"] + sep + urlencode(
        {"code": code, **({"state": p["state"]} if p["state"] else {})})
    logger.info(f"[mcp] autorisation accordée à {user['email']}")
    return RedirectResponse(retour, status_code=302)


# ── Jeton ───────────────────────────────────────────────────────────────────
async def _emettre(user_id: str, client_id: str) -> dict:
    jeton, rafraichir = _alea(32), _alea(32)
    await _inserer("mcp_tokens", {
        "token_hash": _sha(jeton),
        "refresh_hash": _sha(rafraichir),
        "client_id": client_id,
        "user_id": user_id,
        "expires_at": (_maintenant() + DUREE_JETON).isoformat(),
    })
    return {
        "access_token": jeton, "refresh_token": rafraichir, "token_type": "Bearer",
        "expires_in": int(DUREE_JETON.total_seconds()), "scope": "clips",
    }


@router.post("/oauth/token")
async def jeton(request: Request):
    ctype = request.headers.get("content-type", "")
    corps = dict(await request.form()) if "form" in ctype else await request.json()
    corps = {k: str(v) for k, v in corps.items()}

    if corps.get("grant_type") == "refresh_token":
        lignes = await _lire(
            f"mcp_tokens?refresh_hash=eq.{_sha(corps.get('refresh_token', ''))}"
            "&revoked_at=is.null&select=user_id,client_id")
        if not lignes:
            return JSONResponse(status_code=400, content={"error": "invalid_grant"})
        return await _emettre(lignes[0]["user_id"], lignes[0]["client_id"])

    if corps.get("grant_type") != "authorization_code":
        return JSONResponse(status_code=400, content={"error": "unsupported_grant_type"})

    lignes = await _lire(f"mcp_codes?code=eq.{corps.get('code', '')}&select=*")
    if not lignes:
        return JSONResponse(status_code=400, content={
            "error": "invalid_grant", "error_description": "Code inconnu"})
    c = lignes[0]
    if c.get("used_at") or datetime.fromisoformat(
            c["expires_at"].replace("Z", "+00:00")) < _maintenant():
        return JSONResponse(status_code=400, content={
            "error": "invalid_grant", "error_description": "Code expiré ou déjà utilisé"})
    if c["redirect_uri"] != corps.get("redirect_uri") or c["client_id"] != corps.get("client_id"):
        return JSONResponse(status_code=400, content={
            "error": "invalid_grant", "error_description": "Paramètres incohérents"})

    # PKCE : prouve que celui qui échange le code est bien celui qui l'a demandé.
    # Sans cette vérification, un code intercepté dans le navigateur suffirait.
    if c.get("code_challenge"):
        verif = corps.get("code_verifier", "")
        if c.get("code_challenge_method") == "S256":
            calcule = base64.urlsafe_b64encode(
                hashlib.sha256(verif.encode()).digest()).decode().rstrip("=")
        else:
            calcule = verif
        if calcule != c["code_challenge"]:
            return JSONResponse(status_code=400, content={
                "error": "invalid_grant", "error_description": "PKCE invalide"})

    # Usage unique : consommé avant d'émettre quoi que ce soit.
    await _patcher(f"mcp_codes?code=eq.{corps['code']}",
                   {"used_at": _maintenant().isoformat()})
    return await _emettre(c["user_id"], c["client_id"])


# ── Outils MCP ──────────────────────────────────────────────────────────────
# Les descriptions sont écrites pour être lues par un modèle : elles disent quand
# appeler l'outil et ce qu'il coûte. `creer_clips` consomme un quota réel — c'est
# dit explicitement pour que Claude ne l'appelle pas en boucle « pour voir ».
OUTILS = [
    {
        "name": "creer_clips",
        "description": (
            "Découpe une vidéo YouTube longue en clips verticaux (9:16) prêts à publier sur "
            "TikTok, Reels ou Shorts. L'IA repère les moments les plus forts, recadre sur le "
            "visage et incruste les sous-titres. Le traitement dure plusieurs minutes : cet "
            "outil rend immédiatement un identifiant, puis il faut appeler `etat_clips` pour "
            "suivre l'avancement. ATTENTION : chaque appel consomme une vidéo du quota mensuel "
            "de l'utilisateur. Ne jamais relancer une génération déjà en cours — vérifier "
            "d'abord avec `etat_clips`."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "URL de la vidéo YouTube à découper."},
                "nombre": {"type": "integer", "minimum": 1, "maximum": MAX_CLIPS, "default": 3,
                           "description": f"Nombre de clips à produire (1 à {MAX_CLIPS}, 3 par défaut)."},
            },
            "required": ["url"],
        },
    },
    {
        "name": "etat_clips",
        "description": (
            "Donne l'avancement d'une génération lancée par `creer_clips`, et les liens de "
            "téléchargement des clips terminés. Une génération complète prend en général 3 à "
            "8 minutes selon la longueur de la vidéo ; les clips arrivent un par un. Rappeler "
            "cet outil après une trentaine de secondes tant que le statut est « en cours »."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {"job_id": {"type": "string",
                                      "description": "Identifiant rendu par `creer_clips`."}},
            "required": ["job_id"],
        },
    },
    {
        "name": "mon_quota",
        "description": (
            "Indique le plan de l'utilisateur et ce qu'il lui reste ce mois-ci (vidéos "
            "analysables, clips exportables). À appeler si l'utilisateur demande combien il lui "
            "reste, ou pour expliquer un refus de quota."
        ),
        "inputSchema": {"type": "object", "properties": {}},
    },
]

QUOTAS = {"gratuit": (2, 0), "starter": (5, 20), "pro": (30, 150), "studio": (30, 150)}


def _texte(t: str, erreur: bool = False) -> dict:
    return {"content": [{"type": "text", "text": t}], **({"isError": True} if erreur else {})}


async def _pipeline(jeton_utilisateur: str, corps: dict) -> dict:
    """Relaie vers /api/repurpose avec le jeton de l'utilisateur.

    C'est ce passage qui applique le plan et les quotas : on ne les réimplémente
    pas ici, sinon les deux copies divergeraient au premier changement de tarif.
    """
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(f"{APP_URL}/api/repurpose",
                         headers={"Authorization": f"Bearer {jeton_utilisateur}",
                                  "Content-Type": "application/json"},
                         json=corps)
    try:
        data = r.json()
    except Exception:
        data = {}
    if r.status_code >= 400:
        err = RuntimeError(data.get("message") or data.get("error") or f"Erreur {r.status_code}")
        err.code = data.get("error")
        raise err
    return data


def _rendu(clips: list) -> str:
    if not clips:
        return "La génération est terminée mais aucun clip n'a pu être produit."
    lignes = []
    for i, c in enumerate(clips, 1):
        meta = c.get("meta") or {}
        titre = meta.get("title") or c.get("title") or f"Clip {i}"
        duree = ""
        if meta.get("start") is not None and meta.get("end") is not None:
            duree = f" ({round(meta['end'] - meta['start'])} s)"
        lignes.append(f"{i}. **{titre}**{duree}\n   {c.get('download_url', '')}")
    pluriel = "s" if len(clips) > 1 else ""
    return (f"{len(clips)} clip{pluriel} prêt{pluriel} :\n\n" + "\n\n".join(lignes) +
            "\n\nLes liens restent valables 7 jours. Format vertical 1080×1920, "
            "sous-titres incrustés.")


async def _appeler_outil(nom: str, args: dict, user: dict) -> dict:
    jeton_u, user_id = user["jeton"], user["id"]

    if nom == "creer_clips":
        url = str(args.get("url") or "").strip()
        if "youtube.com/" not in url and "youtu.be/" not in url:
            return _texte("Cette URL n'est pas une vidéo YouTube. Seul YouTube est pris en "
                          "charge pour l'instant.", erreur=True)
        try:
            nombre = max(1, min(MAX_CLIPS, int(args.get("nombre") or 3)))
        except (TypeError, ValueError):
            nombre = 3

        try:
            depart = await _pipeline(jeton_u, {"mode": "shorts_start", "url": url,
                                               "n_clips": nombre})
        except RuntimeError as e:
            code = getattr(e, "code", None)
            if code == "upgrade_required":
                return _texte("Quota atteint sur le plan gratuit. Pour continuer : "
                              f"{APP_URL}/paiement.html", erreur=True)
            if code in ("paiement_en_defaut", "quota_atteint"):
                return _texte(str(e), erreur=True)
            return _texte(f"La génération n'a pas pu démarrer : {e}", erreur=True)

        jobs = depart.get("job_ids") or []
        attente = depart.get("pending_clips") or []
        total = len(jobs) + len(attente)
        ident = "j" + secrets.token_hex(4)
        await _inserer("mcp_jobs", {
            "id": ident, "user_id": user_id, "url": url, "statut": "en_cours",
            "etape": "Premier clip en cours de rendu…",
            "etat": {"job_ids": jobs, "pending_clips": attente, "total_clips": total},
            "clips": [],
        })
        pluriel = "s" if total > 1 else ""
        return _texte(
            f"Génération lancée — {total} clip{pluriel} en préparation.\n\n"
            f"Identifiant : {ident}\n\n"
            "Le rendu prend en général 3 à 8 minutes. Appelle `etat_clips` avec cet "
            "identifiant dans une trentaine de secondes pour suivre l'avancement.")

    if nom == "etat_clips":
        ident = str(args.get("job_id") or "").strip()
        lignes = await _lire(f"mcp_jobs?id=eq.{ident}&user_id=eq.{user_id}&select=*")
        if not lignes:
            return _texte(f"Aucune génération ne correspond à l'identifiant « {ident} ».",
                          erreur=True)
        job = lignes[0]
        if job["statut"] == "termine":
            return _texte(_rendu(job.get("clips") or []))
        if job["statut"] == "echec":
            return _texte(f"La génération a échoué : {job.get('erreur') or 'raison inconnue'}",
                          erreur=True)

        etat = job.get("etat") or {}
        try:
            suite = await _pipeline(jeton_u, {
                "mode": "shorts_status",
                "job_ids": etat.get("job_ids") or [],
                "pending_clips": etat.get("pending_clips") or [],
                "done_clips": job.get("clips") or [],
                "total_clips": etat.get("total_clips") or 0,
            })
        except RuntimeError as e:
            await _patcher(f"mcp_jobs?id=eq.{ident}", {
                "statut": "echec", "erreur": str(e)[:400],
                "updated_at": _maintenant().isoformat()})
            return _texte(f"La génération a échoué : {e}", erreur=True)

        fini = suite.get("status") == "done"
        clips = suite.get("clips") if fini else (suite.get("done_clips") or job.get("clips") or [])
        clips = clips or []
        await _patcher(f"mcp_jobs?id=eq.{ident}", {
            "statut": "termine" if fini else "en_cours",
            "etape": suite.get("progress"),
            "clips": clips,
            "etat": etat if fini else {
                "job_ids": suite.get("job_ids") or etat.get("job_ids") or [],
                "pending_clips": suite.get("pending_clips", etat.get("pending_clips") or []),
                "total_clips": suite.get("total_clips") or etat.get("total_clips") or 0,
            },
            "updated_at": _maintenant().isoformat(),
        })
        if fini:
            return _texte(_rendu(clips))
        pluriel = "s" if len(clips) > 1 else ""
        return _texte(
            f"{suite.get('progress') or 'Rendu en cours…'}\n\n"
            f"{len(clips)} clip{pluriel} terminé{pluriel} sur "
            f"{etat.get('total_clips') or '?'}. Rappelle `etat_clips` dans une trentaine "
            "de secondes.")

    if nom == "mon_quota":
        lignes = await _lire(
            f"users?id=eq.{user_id}"
            "&select=plan,videos_count,videos_reset,abonnements(status,past_due_depuis)")
        if not lignes:
            return _texte("Compte introuvable.", erreur=True)
        u = lignes[0]
        d = _maintenant()
        cle_mois = f"{d.year}-{d.month - 1}"        # même convention que le serveur web
        utilise = u.get("videos_count") or 0 if u.get("videos_reset") == cle_mois else 0
        v_max, c_max = QUOTAS.get(u.get("plan"), QUOTAS["gratuit"])
        impaye = any(a.get("status") in ("past_due", "unpaid")
                     for a in (u.get("abonnements") or []))
        clips_txt = ("aucun (aperçu seul sur le plan gratuit)" if c_max == 0
                     else f"{c_max} par mois")
        avert = ("\n\n⚠️ Un paiement est en défaut sur ce compte — l'accès payant sera "
                 "suspendu sous 72 h." if impaye else "")
        return _texte(
            f"Plan : {u.get('plan')}\n"
            f"Vidéos analysées ce mois-ci : {utilise} sur {v_max}\n"
            f"Clips exportables : {clips_txt}{avert}")

    return _texte(f"Outil inconnu : {nom}", erreur=True)


# ── Point d'entrée JSON-RPC ─────────────────────────────────────────────────
def _refus() -> JSONResponse:
    """401 porteur de l'en-tête qui déclenche la connexion OAuth côté Claude.

    Sans `WWW-Authenticate`, le connecteur échoue sans jamais proposer de se
    connecter : Claude ne sait pas où se trouve le serveur d'autorisation.
    """
    return JSONResponse(
        status_code=401, content={"error": "unauthorized"},
        headers={"WWW-Authenticate":
                 f'Bearer resource_metadata="{ISSUER}/.well-known/oauth-protected-resource"'})


@router.get("/mcp")
async def mcp_get():
    return _refus()


@router.post("/mcp")
async def mcp_post(request: Request):
    corps = await request.json()
    ident = corps.get("id")
    methode = corps.get("method") or ""

    def ok(result):
        return JSONResponse({"jsonrpc": "2.0", "id": ident, "result": result})

    # Les notifications n'attendent pas de réponse.
    if not methode or methode.startswith("notifications/"):
        return JSONResponse(status_code=202, content=None)

    if methode == "initialize":
        return ok({
            "protocolVersion": PROTOCOLE,
            "capabilities": {"tools": {"listChanged": False}},
            "serverInfo": {"name": "creatis", "title": "Créatis — clips viraux",
                           "version": "1.0.0"},
            "instructions": (
                "Créatis découpe des vidéos YouTube longues en clips verticaux prêts à "
                "publier. Le traitement est asynchrone : `creer_clips` lance la génération et "
                "rend un identifiant, `etat_clips` suit l'avancement et donne les liens de "
                "téléchargement. Chaque génération consomme le quota mensuel de l'utilisateur "
                "— ne jamais relancer sans avoir vérifié l'état."),
        })

    user = await utilisateur_du_jeton(request.headers.get("authorization"))
    if not user:
        return _refus()

    if methode == "tools/list":
        return ok({"tools": OUTILS})

    if methode == "tools/call":
        params = corps.get("params") or {}
        try:
            return ok(await _appeler_outil(params.get("name") or "",
                                           params.get("arguments") or {}, user))
        except Exception as e:
            logger.error(f"[mcp] {params.get('name')}: {e}", exc_info=True)
            return ok(_texte(f"Erreur interne : {e}", erreur=True))

    return JSONResponse({"jsonrpc": "2.0", "id": ident,
                         "error": {"code": -32601, "message": f"Méthode inconnue : {methode}"}})
