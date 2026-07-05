/* ===== Capture du code d'affiliation ?ref= =====
   Inclus sur toutes les pages d'atterrissage live.
   Règle : PREMIER referrer gagne — on n'écrase jamais une valeur déjà stockée.
   La clé `creatis_ref` est relue au signup (auth.html + js/auth.js) → POST /api/parrainage. */
(function () {
  try {
    var ref = new URLSearchParams(window.location.search).get('ref');
    if (!ref) return;
    if (localStorage.getItem('creatis_ref')) return;   // premier gagne, pas d'écrasement
    ref = ref.trim().slice(0, 64);                      // garde-fou anti-valeur aberrante
    if (ref) localStorage.setItem('creatis_ref', ref);
  } catch (e) {}
})();
