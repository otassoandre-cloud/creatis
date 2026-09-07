#!/usr/bin/env sh
# Change le domaine partout d'un coup.
#
#   sh outils/domaine.sh mon-restaurant-ardoise.fr
#
# Le domaine apparaît dans l'adresse canonique, les métadonnées de partage,
# le sitemap et le robots.txt. En oublier un, c'est une balise canonique qui
# désigne un site qui n'est pas le vôtre — Google suit la balise, pas vos
# intentions.
#
# L'adresse de contact des pages légales est INDÉPENDANTE : elle doit recevoir
# du courrier pour de vrai, ce qu'un sous-domaine .vercel.app ne permet pas.
# Elle se change à la main dans mentions-legales.html, cgv.html et
# confidentialite.html.

set -eu

NOUVEAU="${1:-}"
ANCIEN="${2:-ardoise.app}"

if [ -z "$NOUVEAU" ]; then
  echo "Usage : sh outils/domaine.sh NOUVEAU-DOMAINE [ANCIEN-DOMAINE]" >&2
  echo "Exemple : sh outils/domaine.sh ardoise.fr" >&2
  exit 1
fi

case "$NOUVEAU" in
  *://*|*/*) echo "Donnez le domaine seul, sans https:// ni barre oblique." >&2; exit 1 ;;
  *.*) : ;;
  *) echo "« $NOUVEAU » ne ressemble pas à un domaine." >&2; exit 1 ;;
esac

RACINE="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
FICHIERS="public/index.html public/sitemap.xml public/robots.txt
          public/mentions-legales.html public/cgv.html public/confidentialite.html"

TOTAL=0
for f in $FICHIERS; do
  [ -f "$RACINE/$f" ] || continue
  n=$(grep -c "$ANCIEN" "$RACINE/$f" 2>/dev/null || true)
  [ "${n:-0}" -eq 0 ] && continue
  sed -i.bak "s/$ANCIEN/$NOUVEAU/g" "$RACINE/$f"
  rm -f "$RACINE/$f.bak"
  echo "  $f — $n remplacement(s)"
  TOTAL=$((TOTAL + n))
done

echo ""
echo "$TOTAL occurrence(s) de « $ANCIEN » remplacées par « $NOUVEAU »."
echo ""
echo "Il reste SITE_URL=https://$NOUVEAU dans les variables Vercel, puis un"
echo "redéploiement : une variable ajoutée après un déploiement est ignorée."
echo ""
echo "L'adresse de contact des pages légales n'a pas été touchée : elle doit"
echo "recevoir du courrier, donc elle ne suit pas forcément le domaine du site."
