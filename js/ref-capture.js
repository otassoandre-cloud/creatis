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

/* ===== Capture de la source d'acquisition (UTM / referrer) =====
   Avant ce fix, la colonne Supabase `users.source` valait toujours "web" (défaut de
   la table) — impossible de savoir d'où venait un inscrit. Même règle "premier gagne"
   que ?ref=. Relu au signup (js/auth.js _syncUtilisateur) → envoyé dans /api/user-sync. */
(function () {
  try {
    if (localStorage.getItem('creatis_source')) return; // premier gagne
    var params = new URLSearchParams(window.location.search);
    var utmSource = params.get('utm_source');
    var source;
    if (utmSource) {
      source = ['utm', utmSource, params.get('utm_medium'), params.get('utm_campaign')]
        .filter(Boolean).join('/');
    } else if (document.referrer) {
      try { source = 'ref:' + new URL(document.referrer).hostname.replace(/^www\./, ''); }
      catch (e) { source = 'web'; }
    } else {
      source = 'direct';
    }
    localStorage.setItem('creatis_source', source.slice(0, 64));
  } catch (e) {}
})();
