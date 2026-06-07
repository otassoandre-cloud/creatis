/* ===== CRÉATIS — MODULE AUTH SUPABASE ===== */
/* Gère l'authentification : Supabase email/password OU mode démo localStorage
   Chargé après config.js dans auth.html et app.html */

const Auth = (() => {
  let _client = null;
  let _session = null;
  let _demoMode = false;

  function _createClient() {
    if (_client) return _client;
    if (!CONFIG.estSupabaseConfigured()) return null;
    if (!window.supabase) { console.warn('[Auth] SDK Supabase non chargé'); return null; }
    _client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'creatis_sb_session' }
    });
    return _client;
  }

  return {

    /* ── Initialisation ── */
    async init() {
      const client = _createClient();
      if (!client) {
        // Pas de Supabase → mode démo si l'utilisateur est stocké localement
        const stored = localStorage.getItem('creatis_user');
        if (stored) _demoMode = true;
        return;
      }

      const { data } = await client.auth.getSession();
      _session = data?.session || null;

      // No active session but user was previously registered → grant access
      // (email confirmation pending, or token expired between visits)
      if (!_session) {
        try {
          const u = JSON.parse(localStorage.getItem('creatis_user') || '{}');
          if (u?.email) _demoMode = true;
        } catch {}
      }

      client.auth.onAuthStateChange((event, session) => {
        _session = session;
        if (session) _demoMode = false; // real session restored → exit demo mode
        if (event === 'SIGNED_OUT') {
          _demoMode = false;
          localStorage.removeItem('creatis_user');
        }
      });
    },

    /* ── Inscription email/mot de passe ── */
    async inscrire(email, motDePasse) {
      const client = _createClient();
      if (!client) throw new Error('Supabase non configuré — utilise le mode démo');
      const { data, error } = await client.auth.signUp({ email, password: motDePasse });
      if (error) throw new Error(_traduireErreur(error));
      _session = data.session;
      if (data.user) {
        await _syncUtilisateur(data.user, null);
        // Store user in localStorage so app.html stays accessible even if session is null
        // (Supabase returns null session when email confirmation is required)
        if (!_session) {
          localStorage.setItem('creatis_user', JSON.stringify({
            id: data.user.id, email: data.user.email, plan: 'gratuit'
          }));
        }
        const refCode = localStorage.getItem('creatis_ref');
        if (refCode && data.user.id) {
          fetch('/api/parrainage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id, refCode })
          }).catch(() => {});
        }
      }
      return data;
    },

    /* ── Connexion email/mot de passe ── */
    async connecter(email, motDePasse) {
      const client = _createClient();
      if (!client) throw new Error('Supabase non configuré — utilise le mode démo');
      const { data, error } = await client.auth.signInWithPassword({ email, password: motDePasse });
      if (error) throw new Error(_traduireErreur(error));
      _session = data.session;
      await _syncUtilisateur(data.user, data.session);
      return data;
    },

    /* ── Déconnexion ── */
    async deconnecter() {
      const client = _createClient();
      if (client) await client.auth.signOut();
      _session = null;
      _demoMode = false;
      localStorage.removeItem('creatis_user');
      localStorage.removeItem('creatis_generations');
      window.location.href = 'auth.html';
    },

    /* ── Google OAuth ── */
    // TODO: activer Google dans Supabase Dashboard → Authentication > Providers > Google
    async signInWithGoogle() {
      const client = _createClient();
      if (!client) throw new Error('Supabase non configuré');
      const redirectTo = window.location.origin + '/auth/callback';
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
      });
      if (error) throw new Error(error.message);
    },

    /* ── Callback OAuth + confirmation email (appelé depuis auth/callback.html) ── */
    async handleOAuthCallback() {
      const client = _createClient();
      if (!client) throw new Error('Supabase non configuré');

      // Supabase renvoie une erreur (ex: Google OAuth mal configuré)
      const urlError = new URLSearchParams(window.location.search).get('error_description') ||
                       new URLSearchParams(window.location.search).get('error');
      if (urlError) throw new Error(decodeURIComponent(urlError.replace(/\+/g, ' ')));

      // Supabase v2 PKCE : ?code=xxx dans l'URL → échange explicite
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { data, error } = await client.auth.exchangeCodeForSession(code);
        if (error) throw new Error(error.message);
        if (data?.session) {
          _session = data.session;
          await _syncUtilisateur(data.session.user, data.session);
          return data.session.user;
        }
      }

      // Implicit flow : #access_token=xxx dans le hash
      const hash = Object.fromEntries(new URLSearchParams(window.location.hash.replace('#', '')));
      if (hash.access_token) {
        const { data, error } = await client.auth.setSession({ access_token: hash.access_token, refresh_token: hash.refresh_token || '' });
        if (error) throw new Error(error.message);
        if (data?.session) {
          _session = data.session;
          await _syncUtilisateur(data.session.user, data.session);
          return data.session.user;
        }
      }

      // Fallback : session déjà active
      const { data } = await client.auth.getSession();
      if (data?.session) {
        _session = data.session;
        await _syncUtilisateur(data.session.user, data.session);
        return data.session.user;
      }

      throw new Error('Connexion échouée — réessaie');
    },

    /* ── Mode démo (sans compte) ── */
    connexionDemo() {
      _demoMode = true;
      const user = { nom: 'Créateur', email: 'demo@creatis.fr', plan: 'gratuit', avatar: null, demo: true };
      localStorage.setItem('creatis_user', JSON.stringify(user));
      if (!localStorage.getItem('creatis_generations')) {
        localStorage.setItem('creatis_generations', '0');
      }
    },

    /* ── Getters ── */
    estAuthentifie() { return !!_session || _demoMode; },
    estDemoMode() { return _demoMode; },
    getToken() { return _session?.access_token || null; },

    async getSession() {
      const client = _createClient();
      if (!client) return _demoMode ? { demo: true } : null;
      if (_session) return _session;
      const { data } = await client.auth.getSession();
      _session = data?.session || null;
      return _session;
    },

    async getUser() {
      if (_session?.user) {
        const u = _session.user;
        const meta = u.user_metadata || {};
        return {
          id: u.id,
          email: u.email,
          nom: meta.full_name || meta.name || u.email.split('@')[0],
          avatar: meta.avatar_url || null,
          plan: 'gratuit'
        };
      }
      if (_demoMode) {
        try { return JSON.parse(localStorage.getItem('creatis_user')); } catch { return null; }
      }
      return null;
    },

    /* ── Récupérer le plan et le compteur mensuel depuis Supabase ── */
    async getPlanDistant() {
      if (!_session?.user?.id) return null;
      try {
        const res = await fetch(CONFIG.USER_SYNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get', userId: _session.user.id })
        });
        if (!res.ok) return null;
        const { user } = await res.json();
        if (!user) return 'gratuit';
        // Retourner l'objet complet pour que app.js puisse sync le compteur mensuel
        return { plan: user.plan || 'gratuit', generations_used: user.generations_used || 0, generations_reset_at: user.generations_reset_at || null, repurpose_count: user.repurpose_count || 0 };
      } catch { return null; }
    }
  };

  /* ── Helpers privés ── */
  async function _syncUtilisateur(user, session) {
    if (!user?.email) return;
    try {
      await fetch(CONFIG.USER_SYNC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ action: 'upsert', userId: user.id, email: user.email, plan: 'gratuit' })
      });
    } catch (e) { console.warn('[Auth] Sync utilisateur échoué:', e.message); }
  }

  function _traduireErreur(error) {
    const map = {
      'Invalid login credentials': 'Email ou mot de passe incorrect',
      'Email not confirmed': 'Confirme ton email avant de te connecter',
      'User already registered': 'Ce compte existe déjà — connecte-toi',
      'Password should be at least 6 characters': 'Le mot de passe doit faire au moins 6 caractères',
      'Unable to validate email address: invalid format': 'Adresse email invalide',
    };
    return map[error.message] || error.message;
  }
})();
