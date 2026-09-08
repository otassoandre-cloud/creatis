/* SERVEUR OAUTH 2.1 POUR LE CONNECTEUR MCP
   ────────────────────────────────────────────────────────────────────────────
   Pourquoi tout ce code plutôt qu'une simple clé d'API : sur claude.ai, un
   utilisateur qui ajoute un connecteur ne peut pas saisir d'en-tête HTTP. Les
   jetons statiques ne fonctionnent que dans Claude Code, en local, via un fichier
   de configuration. Pour que « n'importe qui branche Créatis dans Claude et
   demande des clips », il faut donc qu'on soit un serveur d'autorisation OAuth.

   Ce fichier expose les cinq routes que Claude appelle, dans cet ordre :

     GET  /.well-known/oauth-authorization-server  → découverte des URL
     GET  /.well-known/oauth-protected-resource    → à quel serveur s'adresser
     POST /oauth/register                          → Claude s'inscrit tout seul (RFC 7591)
     GET  /oauth/authorize                         → l'utilisateur se connecte et approuve
     POST /oauth/token                             → code → jeton d'accès

   L'enregistrement dynamique évite de faire créer un client_id à la main : sans
   lui, chaque utilisateur devrait coller un identifiant et un secret dans les
   « paramètres avancés » du connecteur, ce qui élimine 90 % des gens.

   PKCE est obligatoire (OAuth 2.1). Le code d'autorisation transite par le
   navigateur ; sans le vérificateur, quiconque l'intercepte pourrait l'échanger.

   Les jetons ne sont JAMAIS stockés en clair : la base ne garde qu'un SHA-256.
   Une fuite de la base ne donne donc accès à aucun compte.  */

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const APP_URL = process.env.APP_URL || 'https://creatis.app';

const DUREE_CODE = 10 * 60 * 1000;            // 10 min — le temps d'un aller-retour
const DUREE_JETON = 30 * 24 * 3600 * 1000;    // 30 jours, renouvelable

const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const alea = (n = 32) => crypto.randomBytes(n).toString('base64url');

/* ── Accès Supabase (service key : ces tables ne sont jamais exposées au client) ── */
async function db(chemin, options = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${chemin}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Supabase ${r.status} ${chemin} — ${t.slice(0, 200)}`);
  }
  return r.status === 204 ? null : r.json();
}

const inserer = (table, data) =>
  db(table, { method: 'POST', body: JSON.stringify(data), headers: { Prefer: 'return=representation' } });

/* ── Vérifie un e-mail + mot de passe Supabase et renvoie l'utilisateur ──
   On passe par le point d'entrée public d'authentification plutôt que de lire la
   table nous-mêmes : c'est lui qui connaît le hachage des mots de passe. */
async function connecter(email, motDePasse) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: motDePasse }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j?.user?.id ? { id: j.user.id, email: j.user.email } : null;
}

/* ── Page d'autorisation ──
   Volontairement autonome (pas de CSS externe, pas de dépendance) : elle s'affiche
   dans une fenêtre surgissante ouverte par Claude, souvent étroite, et doit
   fonctionner même si le reste du site est en panne. */
function pageAutorisation({ erreur = '', params }) {
  const champs = Object.entries(params)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${String(v || '').replace(/"/g, '&quot;')}">`)
    .join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connecter Créatis à Claude</title>
<style>
 *{box-sizing:border-box}
 body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
   background:#0a0f0a;color:#e8eee9;font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;padding:24px}
 .b{width:100%;max-width:380px}
 .logo{display:flex;align-items:center;gap:10px;margin-bottom:28px}
 .m{width:38px;height:38px;border-radius:11px;background:linear-gradient(180deg,#34d399,#059669);
   display:flex;align-items:center;justify-content:center;font-weight:800;color:#05140b;font-size:22px}
 h1{font-size:1.3rem;margin:0 0 6px;letter-spacing:-.02em}
 p.s{color:#93a89a;margin:0 0 24px;font-size:.92rem}
 label{display:block;font-size:.8rem;color:#93a89a;margin:0 0 6px}
 input[type=email],input[type=password]{width:100%;padding:11px 13px;margin-bottom:16px;
   background:#111a13;border:1px solid #23372a;border-radius:8px;color:#e8eee9;font-size:15px}
 input:focus{outline:2px solid #10b981;outline-offset:1px;border-color:transparent}
 button{width:100%;padding:12px;background:#10b981;color:#05140b;border:0;border-radius:8px;
   font-weight:700;font-size:15px;cursor:pointer}
 button:hover{background:#34d399}
 .err{background:#3a1a1a;border:1px solid #6b2b2b;color:#f5b5b5;padding:10px 12px;
   border-radius:8px;margin-bottom:16px;font-size:.88rem}
 .acces{background:#111a13;border:1px solid #23372a;border-radius:8px;padding:14px 16px;margin-bottom:20px}
 .acces strong{display:block;font-size:.82rem;margin-bottom:8px;color:#e8eee9}
 .acces ul{margin:0;padding-left:18px;color:#93a89a;font-size:.85rem}
 .acces li{margin-bottom:3px}
 .pied{margin-top:18px;color:#6d8074;font-size:.78rem;text-align:center}
 a{color:#34d399}
</style></head><body><div class="b">
 <div class="logo"><div class="m">C</div><div><strong>Créatis</strong></div></div>
 <h1>Connecter à Claude</h1>
 <p class="s">Connecte-toi avec ton compte Créatis pour autoriser Claude à créer des clips à ta place.</p>
 ${erreur ? `<div class="err">${erreur}</div>` : ''}
 <div class="acces"><strong>Claude pourra :</strong><ul>
   <li>analyser des vidéos et proposer des clips</li>
   <li>exporter des clips au format vertical</li>
   <li>consulter ton quota du mois</li>
 </ul></div>
 <form method="POST">${champs}
  <label for="e">E-mail</label>
  <input id="e" type="email" name="email" required autocomplete="email" autofocus>
  <label for="p">Mot de passe</label>
  <input id="p" type="password" name="mot_de_passe" required autocomplete="current-password">
  <button type="submit">Autoriser Claude</button>
 </form>
 <p class="pied">Pas encore de compte ? <a href="${APP_URL}">Crée-en un sur creatis.app</a><br>
 Les clips consomment ton quota habituel.</p>
</div></body></html>`;
}

module.exports = async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const chemin = url.pathname;

  /* ── DÉCOUVERTE ────────────────────────────────────────────────────────────
     Claude lit d'abord ces deux documents pour savoir où envoyer l'utilisateur.
     Sans eux, l'ajout du connecteur échoue avant même d'afficher quoi que ce soit. */
  if (chemin.endsWith('/oauth-authorization-server') || chemin.endsWith('/openid-configuration')) {
    return res.status(200).json({
      issuer: APP_URL,
      authorization_endpoint: `${APP_URL}/oauth/authorize`,
      token_endpoint: `${APP_URL}/oauth/token`,
      registration_endpoint: `${APP_URL}/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
      scopes_supported: ['clips'],
    });
  }

  if (chemin.endsWith('/oauth-protected-resource')) {
    return res.status(200).json({
      resource: `${APP_URL}/api/mcp`,
      authorization_servers: [APP_URL],
      scopes_supported: ['clips'],
    });
  }

  /* ── ENREGISTREMENT DYNAMIQUE (RFC 7591) ──
     Claude s'inscrit lui-même. C'est ce qui permet à l'utilisateur de ne coller
     qu'une URL, sans identifiant ni secret à créer à la main. */
  if (chemin.endsWith('/register')) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const corps = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const redirects = corps.redirect_uris;
    if (!Array.isArray(redirects) || !redirects.length) {
      return res.status(400).json({ error: 'invalid_redirect_uri', error_description: 'redirect_uris est obligatoire' });
    }
    const client_id = 'mcp_' + alea(16);
    const client_secret = alea(32);
    await inserer('mcp_clients', {
      client_id,
      client_secret: sha(client_secret),   // haché, comme les jetons
      client_name: String(corps.client_name || 'Claude').slice(0, 120),
      redirect_uris: redirects,
    });
    return res.status(201).json({
      client_id,
      client_secret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0,     // n'expire pas
      redirect_uris: redirects,
      token_endpoint_auth_method: 'client_secret_post',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    });
  }

  /* ── AUTORISATION ── */
  if (chemin.endsWith('/authorize')) {
    const p = {
      client_id: url.searchParams.get('client_id'),
      redirect_uri: url.searchParams.get('redirect_uri'),
      state: url.searchParams.get('state') || '',
      code_challenge: url.searchParams.get('code_challenge') || '',
      code_challenge_method: url.searchParams.get('code_challenge_method') || '',
      scope: url.searchParams.get('scope') || 'clips',
    };

    if (req.method === 'GET') {
      const params = new URLSearchParams(Object.entries(p).filter(([, v]) => v));
      // Les champs cachés du formulaire rejouent la requête à l'identique au POST
      const depuisPost = Object.fromEntries(params);
      if (!p.client_id || !p.redirect_uri) {
        return res.status(400).send(pageAutorisation({
          erreur: 'Requête incomplète — relance la connexion depuis Claude.', params: depuisPost,
        }));
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(pageAutorisation({ params: depuisPost }));
    }

    if (req.method === 'POST') {
      const corps = typeof req.body === 'string'
        ? Object.fromEntries(new URLSearchParams(req.body))
        : (req.body || {});
      const champs = {
        client_id: corps.client_id, redirect_uri: corps.redirect_uri, state: corps.state || '',
        code_challenge: corps.code_challenge || '', code_challenge_method: corps.code_challenge_method || '',
        scope: corps.scope || 'clips',
      };
      res.setHeader('Content-Type', 'text/html; charset=utf-8');

      const clients = await db(`mcp_clients?client_id=eq.${encodeURIComponent(champs.client_id || '')}&select=redirect_uris`);
      const client = clients?.[0];
      /* L'URL de redirection doit correspondre EXACTEMENT à l'une des URL
         déclarées : c'est ce qui empêche de détourner le code vers un autre site. */
      if (!client || !client.redirect_uris.includes(champs.redirect_uri)) {
        return res.status(400).send(pageAutorisation({
          erreur: 'Application inconnue. Retire puis rajoute le connecteur dans Claude.', params: champs,
        }));
      }

      const user = await connecter(corps.email, corps.mot_de_passe);
      if (!user) {
        return res.status(401).send(pageAutorisation({
          erreur: 'E-mail ou mot de passe incorrect.', params: champs,
        }));
      }

      const code = alea(24);
      await inserer('mcp_codes', {
        code, client_id: champs.client_id, user_id: user.id, redirect_uri: champs.redirect_uri,
        code_challenge: champs.code_challenge || null,
        code_challenge_method: champs.code_challenge_method || null,
        expires_at: new Date(Date.now() + DUREE_CODE).toISOString(),
      });

      const retour = new URL(champs.redirect_uri);
      retour.searchParams.set('code', code);
      if (champs.state) retour.searchParams.set('state', champs.state);
      res.setHeader('Location', retour.toString());
      return res.status(302).end();
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  }

  /* ── ÉCHANGE DU CODE CONTRE UN JETON ── */
  if (chemin.endsWith('/token')) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const corps = typeof req.body === 'string'
      ? Object.fromEntries(new URLSearchParams(req.body))
      : (req.body || {});

    const emettre = async (user_id, client_id) => {
      const jeton = alea(32);
      const rafraichir = alea(32);
      await inserer('mcp_tokens', {
        token_hash: sha(jeton), refresh_hash: sha(rafraichir), client_id, user_id,
        expires_at: new Date(Date.now() + DUREE_JETON).toISOString(),
      });
      return {
        access_token: jeton, refresh_token: rafraichir, token_type: 'Bearer',
        expires_in: Math.floor(DUREE_JETON / 1000), scope: 'clips',
      };
    };

    if (corps.grant_type === 'refresh_token') {
      const l = await db(`mcp_tokens?refresh_hash=eq.${sha(corps.refresh_token || '')}&revoked_at=is.null&select=user_id,client_id`);
      if (!l?.[0]) return res.status(400).json({ error: 'invalid_grant' });
      return res.status(200).json(await emettre(l[0].user_id, l[0].client_id));
    }

    if (corps.grant_type !== 'authorization_code') {
      return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    const lignes = await db(`mcp_codes?code=eq.${encodeURIComponent(corps.code || '')}&select=*`);
    const c = lignes?.[0];
    if (!c || c.used_at || new Date(c.expires_at) < new Date()) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Code expiré ou déjà utilisé' });
    }
    if (c.redirect_uri !== corps.redirect_uri || c.client_id !== corps.client_id) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Paramètres incohérents' });
    }

    /* PKCE : le vérificateur prouve que celui qui échange le code est bien celui
       qui l'a demandé. Sans ça, un code intercepté dans le navigateur suffirait. */
    if (c.code_challenge) {
      const verif = corps.code_verifier || '';
      const calcule = c.code_challenge_method === 'S256'
        ? crypto.createHash('sha256').update(verif).digest('base64url')
        : verif;
      if (calcule !== c.code_challenge) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE invalide' });
      }
    }

    // Usage unique : marqué consommé avant d'émettre quoi que ce soit
    await db(`mcp_codes?code=eq.${encodeURIComponent(corps.code)}`, {
      method: 'PATCH', body: JSON.stringify({ used_at: new Date().toISOString() }),
      headers: { Prefer: 'return=minimal' },
    });

    return res.status(200).json(await emettre(c.user_id, c.client_id));
  }

  return res.status(404).json({ error: 'not_found' });
};

/* Exporté pour api/mcp.js : valide le jeton porteur et rend l'utilisateur. */
module.exports.utilisateurDuJeton = async function utilisateurDuJeton(entete) {
  const m = /^Bearer\s+(.+)$/i.exec(entete || '');
  if (!m) return null;
  try {
    const l = await db(
      `mcp_tokens?token_hash=eq.${sha(m[1])}&revoked_at=is.null&select=user_id,expires_at`
    );
    const t = l?.[0];
    if (!t || new Date(t.expires_at) < new Date()) return null;
    // Trace de dernière utilisation, sans bloquer la requête si elle échoue
    db(`mcp_tokens?token_hash=eq.${sha(m[1])}`, {
      method: 'PATCH', body: JSON.stringify({ derniere_util: new Date().toISOString() }),
      headers: { Prefer: 'return=minimal' },
    }).catch(() => {});
    return { id: t.user_id };
  } catch { return null; }
};
