#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
resolve_channel.py — nom de créateur -> dernière vidéo longue exploitable.

Script 100 % autonome : aucune dépendance au reste du projet Créatis,
`requests` uniquement (pas de google-api-python-client).

Usage :
    python resolve_channel.py "Yomi Denzel"
    python resolve_channel.py "Yomi Denzel" --duree-min 600 --candidats 25

Clé API : variable d'environnement YOUTUBE_API_KEY
    (à défaut, le script lit un fichier .env posé à côté de lui)

Coût en quota YouTube Data API v3 (10 000 unités/jour par défaut) :
    search.list        = 100 unités   <-- l'appel cher, 1 seul par requête
    playlistItems.list =   1 unité    (par page de 50, pagination jusqu'à trouver du long)
    videos.list        =   1 unité    (par page)
    -------------------------------------------
    TOTAL              = 102 unités pour une chaîne normale,
                         +2 par page supplémentaire si la chaîne noie ses vidéos
                         longues sous les Shorts.
    Soit ~98 créateurs/jour avec le quota standard.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys

import requests

API_BASE = 'https://www.googleapis.com/youtube/v3'
TIMEOUT = 20

DUREE_MIN_DEFAUT = 300      # 5 min — en dessous, pas de matière à découper
# Nb de vidéos récentes balayées. 15 ne suffit pas : un créateur qui poste 4 Shorts
# par jour enterre sa dernière vidéo longue en moins d'une semaine. La pagination
# s'arrête dès qu'une vidéo longue est trouvée, donc ce plafond ne coûte rien
# en pratique (2 unités pour une chaîne normale).
CANDIDATS_DEFAUT = 200

# Coût documenté par Google, par appel (indépendant de maxResults)
COUT_QUOTA = {'search': 100, 'playlistItems': 1, 'videos': 1}


# ============================================================
# ERREURS
# ============================================================

class YouTubeError(Exception):
    """Erreur côté API YouTube (réseau, clé, quota)."""


class QuotaDepasse(YouTubeError):
    """Quota journalier épuisé ou débit trop élevé."""


class CleInvalide(YouTubeError):
    """Clé API absente, révoquée, ou API non activée sur le projet Google."""


# ============================================================
# CLÉ API
# ============================================================

def _lire_cle() -> str:
    cle = (os.environ.get('YOUTUBE_API_KEY') or '').strip()
    if cle:
        return cle

    # Repli pratique : .env posé à côté du script (aucune lib externe, simple parsing)
    chemin_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if os.path.isfile(chemin_env):
        with open(chemin_env, 'r', encoding='utf-8') as f:
            for ligne in f:
                ligne = ligne.strip()
                if ligne.startswith('YOUTUBE_API_KEY='):
                    return ligne.split('=', 1)[1].strip().strip('"').strip("'")

    raise CleInvalide(
        "YOUTUBE_API_KEY manquante — pose-la en variable d'environnement, "
        "ou dans un .env à côté du script. "
        "Clé : console.cloud.google.com -> APIs & Services -> YouTube Data API v3 -> Credentials"
    )


# ============================================================
# APPELS API + COMPTEUR DE QUOTA
# ============================================================

class Client:
    """Enveloppe requests + journal du coût en unités de quota."""

    def __init__(self, cle: str, verbeux: bool = True):
        self.cle = cle
        self.verbeux = verbeux
        self.quota_consomme = 0

    def _log(self, message: str) -> None:
        if self.verbeux:
            # stderr : stdout reste réservé au JSON de sortie
            print(message, file=sys.stderr)

    def get(self, endpoint: str, params: dict) -> dict:
        cout = COUT_QUOTA.get(endpoint, 1)
        self.quota_consomme += cout
        self._log('[quota] {:<14} +{:>3} unites  (total {})'.format(
            endpoint + '.list', cout, self.quota_consomme))

        params = dict(params)
        params['key'] = self.cle

        try:
            reponse = requests.get(API_BASE + '/' + endpoint, params=params, timeout=TIMEOUT)
        except requests.RequestException as exc:
            raise YouTubeError('Reseau injoignable sur {}.list : {}'.format(endpoint, exc))

        try:
            data = reponse.json()
        except ValueError:
            raise YouTubeError('Reponse non-JSON de {}.list (HTTP {})'.format(
                endpoint, reponse.status_code))

        if 'error' in data:
            self._lever_erreur_api(data['error'], endpoint)

        return data

    @staticmethod
    def _lever_erreur_api(erreur: dict, endpoint: str) -> None:
        code = erreur.get('code')
        message = erreur.get('message', 'erreur inconnue')
        raisons = [e.get('reason', '') for e in erreur.get('errors', [])]

        if 'quotaExceeded' in raisons or 'dailyLimitExceeded' in raisons:
            raise QuotaDepasse(
                'Quota YouTube journalier depasse ({}.list) — attends la remise a zero '
                '(minuit heure du Pacifique) ou demande une augmentation dans Google Cloud. '
                'Rappel : search.list coute 100 unites sur 10 000/jour.'.format(endpoint))

        if 'rateLimitExceeded' in raisons or 'userRateLimitExceeded' in raisons:
            raise QuotaDepasse(
                'Debit trop eleve sur {}.list — espace les appels puis reessaie.'.format(endpoint))

        if code == 403 or 'keyInvalid' in raisons or 'accessNotConfigured' in raisons:
            raise CleInvalide(
                'Cle refusee sur {}.list : {} — verifie YOUTUBE_API_KEY, ses restrictions '
                "(referrer/IP) et que YouTube Data API v3 est activee.".format(endpoint, message))

        raise YouTubeError('{}.list a echoue (HTTP {}) : {}'.format(endpoint, code, message))


# ============================================================
# OUTILS
# ============================================================

_RE_DUREE = re.compile(
    r'^P'
    r'(?:(?P<jours>\d+)D)?'
    r'(?:T'
    r'(?:(?P<heures>\d+)H)?'
    r'(?:(?P<minutes>\d+)M)?'
    r'(?:(?P<secondes>\d+)S)?'
    r')?$'
)


def parse_duree_iso(duree: str) -> int:
    """'PT12M34S' -> 754. Renvoie 0 si la chaine est vide ou illisible."""
    if not duree:
        return 0
    m = _RE_DUREE.match(duree.strip())
    if not m:
        return 0
    p = m.groupdict()
    return (
        int(p['jours'] or 0) * 86400
        + int(p['heures'] or 0) * 3600
        + int(p['minutes'] or 0) * 60
        + int(p['secondes'] or 0)
    )


def playlist_uploads(channel_id: str) -> str:
    """UC... -> UU... : la playlist 'uploads' d'une chaine, deductible sans appel API."""
    if not channel_id.startswith('UC'):
        raise YouTubeError('channelId inattendu : {}'.format(channel_id))
    return 'UU' + channel_id[2:]


# ============================================================
# FONCTION PRINCIPALE
# ============================================================

def get_latest_video(query: str,
                     duree_min: int = DUREE_MIN_DEFAUT,
                     candidats: int = CANDIDATS_DEFAUT,
                     verbeux: bool = True) -> dict | None:
    """
    Resout un nom de createur vers sa derniere video longue exploitable.

    Renvoie :
        { channel_id, channel_title, video_id, url, title,
          duration_seconds, published_at }
        ou None si la chaine est introuvable, sans upload, ou sans video
        atteignant `duree_min`.

    Leve QuotaDepasse / CleInvalide / YouTubeError si l'API ne repond pas
    normalement — un probleme d'infrastructure ne doit pas ressembler
    a un simple "pas de resultat".
    """
    query = (query or '').strip()
    if not query:
        raise ValueError('query vide')

    client = Client(_lire_cle(), verbeux=verbeux)

    # 1. search.list -> channelId (100 unites)
    recherche = client.get('search', {
        'part': 'snippet',
        'type': 'channel',
        'maxResults': 5,
        'q': query,
    })
    items = recherche.get('items') or []
    if not items:
        client._log('[info] aucune chaine trouvee pour "{}"'.format(query))
        return None

    premier = items[0]
    channel_id = (premier.get('id') or {}).get('channelId') or premier.get('snippet', {}).get('channelId')
    channel_title = (premier.get('snippet') or {}).get('title', '')
    if not channel_id:
        client._log('[info] resultat de recherche sans channelId exploitable')
        return None
    client._log('[info] chaine : {} ({})'.format(channel_title, channel_id))

    # 2. UC... -> UU... (gratuit)
    playlist_id = playlist_uploads(channel_id)

    # 3 a 6. Remonter la playlist page par page jusqu'a trouver du contenu long.
    # Une seule page ne suffit pas : un createur qui poste 4 Shorts par jour enterre sa
    # derniere video longue en quelques jours. Une page coute 1 unite quelle que soit sa
    # taille -> on prend 50 a la fois.
    page_token = ''
    inspectees = 0
    choisie = None

    while inspectees < candidats and choisie is None:
        params = {
            'part': 'contentDetails',
            'playlistId': playlist_id,
            'maxResults': min(50, candidats - inspectees),
        }
        if page_token:
            params['pageToken'] = page_token

        try:
            playlist = client.get('playlistItems', params)
        except YouTubeError as exc:
            # playlistNotFound / 404 : chaine sans onglet uploads public
            if '404' in str(exc) or 'playlistNotFound' in str(exc):
                client._log('[info] playlist uploads introuvable pour {}'.format(channel_id))
                return None
            raise

        video_ids = []
        for item in playlist.get('items') or []:
            vid = (item.get('contentDetails') or {}).get('videoId')
            if vid:
                video_ids.append(vid)
        if not video_ids:
            break
        inspectees += len(video_ids)

        # videos.list -> durees + titres de la page entiere, un seul appel (1 unite)
        videos = client.get('videos', {
            'part': 'contentDetails,snippet',
            'id': ','.join(video_ids),
        })

        # parsing des durees et filtre
        retenues = []
        for v in videos.get('items') or []:
            snippet = v.get('snippet') or {}
            # une video en direct ou programmee n'est pas telechargeable proprement
            if snippet.get('liveBroadcastContent', 'none') != 'none':
                continue
            secondes = parse_duree_iso((v.get('contentDetails') or {}).get('duration', ''))
            if secondes >= duree_min:
                retenues.append({
                    'channel_id': channel_id,
                    'channel_title': snippet.get('channelTitle') or channel_title,
                    'video_id': v.get('id'),
                    'url': 'https://www.youtube.com/watch?v={}'.format(v.get('id')),
                    'title': snippet.get('title', ''),
                    'duration_seconds': secondes,
                    'published_at': snippet.get('publishedAt', ''),
                })

        # La playlist descend du plus recent au plus ancien : la 1re page qui contient une
        # video longue contient LA bonne. On retrie quand meme, videos.list ne garantit
        # pas l'ordre des resultats.
        if retenues:
            retenues.sort(key=lambda x: x['published_at'], reverse=True)
            choisie = retenues[0]
            break

        page_token = playlist.get('nextPageToken') or ''
        if not page_token:
            break

    if not inspectees:
        client._log('[info] playlist uploads vide pour {}'.format(channel_id))
        return None

    if choisie is None:
        client._log('[info] aucune video >= {} s parmi les {} dernieres'.format(
            duree_min, inspectees))
        return None

    client._log('[info] retenue : {} ({} s) — {} videos inspectees, quota total {} unites'.format(
        choisie['title'][:60], choisie['duration_seconds'], inspectees, client.quota_consomme))
    return choisie


# ============================================================
# CLI
# ============================================================

def main() -> int:
    # Console Windows en cp1252 : un emoji dans un titre ferait planter l'ecriture
    for flux in (sys.stdout, sys.stderr):
        try:
            flux.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass

    parser = argparse.ArgumentParser(
        description="Nom de createur -> derniere video longue exploitable (YouTube Data API v3)")
    parser.add_argument('query', help='nom du createur, ex. "Yomi Denzel"')
    parser.add_argument('--duree-min', type=int, default=DUREE_MIN_DEFAUT,
                        help='duree minimale en secondes (defaut {})'.format(DUREE_MIN_DEFAUT))
    parser.add_argument('--candidats', type=int, default=CANDIDATS_DEFAUT,
                        help='nb de videos recentes balayees, par pages de 50 (defaut {})'.format(CANDIDATS_DEFAUT))
    parser.add_argument('--silencieux', action='store_true',
                        help='masque les logs de quota (stderr)')
    args = parser.parse_args()

    try:
        resultat = get_latest_video(
            args.query,
            duree_min=args.duree_min,
            candidats=args.candidats,
            verbeux=not args.silencieux,
        )
    except (QuotaDepasse, CleInvalide) as exc:
        print('ERREUR : {}'.format(exc), file=sys.stderr)
        return 2
    except YouTubeError as exc:
        print('ERREUR : {}'.format(exc), file=sys.stderr)
        return 3
    except ValueError as exc:
        print('ERREUR : {}'.format(exc), file=sys.stderr)
        return 1

    print(json.dumps(resultat, indent=2, ensure_ascii=False))
    return 0 if resultat else 1


if __name__ == '__main__':
    sys.exit(main())
