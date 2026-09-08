#!/usr/bin/env sh
# Recalcule les empreintes SHA-256 dans public/verif.html.
#
#   sh outils/empreintes.sh
#
# A lancer apres TOUTE modification d'un fichier de public/. Sinon la page
# de verification signalerait un echec sur un fichier pourtant sain, et on
# prendrait l'habitude de l'ignorer — c'est ainsi qu'un vrai probleme passe
# inapercu.

set -eu
RACINE="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
PUB="$RACINE/public"
CIBLE="$PUB/verif.html"

FICHIERS="index.html app.html parseur.js config.js pages.css logo.svg
          mentions-legales.html cgv.html confidentialite.html
          robots.txt sitemap.xml"

BLOC=""
for f in $FICHIERS; do
  [ -f "$PUB/$f" ] || continue
  h=$(sha256sum "$PUB/$f" | cut -d' ' -f1)
  BLOC="$BLOC  \"$f\": \"$h\",
"
done
# retirer la virgule finale
BLOC=$(printf '%s' "$BLOC" | sed '$ s/,$//')

python3 - "$CIBLE" "$BLOC" <<'PY'
import io, re, sys
cible, bloc = sys.argv[1], sys.argv[2]
s = io.open(cible, encoding="utf-8").read()
nouveau = "var ATTENDU = {\n" + bloc + "\n};"
s2 = re.sub(r"var ATTENDU = \{.*?\n\};", nouveau, s, flags=re.S)
if s2 == s and "var ATTENDU" not in s:
    raise SystemExit("bloc ATTENDU introuvable dans " + cible)
io.open(cible, "w", encoding="utf-8").write(s2)
PY

echo "Empreintes mises a jour dans public/verif.html :"
printf '%s\n' "$BLOC" | sed 's/^/  /'
