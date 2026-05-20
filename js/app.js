/* ===== CRÉATIS — LOGIQUE PRINCIPALE DE L'APPLICATION ===== */

class AppCreatis {
  constructor() {
    this.agentActuel = null;
    this.enChargement = false;
    this.resultatsActuels = '';
    this._chatHistoires = {};

    this.init();
  }

  async init() {
    await this.verifierAuth();
    this.construireSidebar();
    this.lierEvenements();
    this.afficherDashboard();

    // Traiter le callback YouTube OAuth si présent dans l'URL
    await this._traiterCallbackYouTube();

    this._initialiserContexteYT().then(() => {
      this.mettreAJourDashboard();
      this._mettreAJourChecklistOnboarding();
    });

    this._mettreAJourChecklistOnboarding();

    if (!localStorage.getItem('creatis_onboarding_done')) {
      setTimeout(() => this._afficherOnboarding(), 600);
    }

    const pendingRepurpose = localStorage.getItem('creatis_repurpose_pending');
    if (pendingRepurpose) {
      localStorage.removeItem('creatis_repurpose_pending');
      setTimeout(() => {
        this.selectionnerAgent('repurpose');
        setTimeout(() => {
          const el = document.getElementById('champ-repurpose-url');
          if (el) el.value = pendingRepurpose;
        }, 300);
      }, 600);
    }
  }

  async _traiterCallbackYouTube() {
    const token = YouTube.traiterCallback();
    if (!token) return;

    this.afficherToast('⏳ Connexion à ta chaîne YouTube…', 'info', 4000);
    try {
      const profil = await YouTube.getProfil();

      // Mettre à jour l'utilisateur connecté avec les infos de la chaîne
      const user = this.getUtilisateur() || {};
      user.chaine = { id: profil.id, nom: profil.nom, abonnes: profil.abonnes, vues: profil.vues, videos: profil.videos };
      user.avatar = user.avatar || profil.avatar;
      this.setUtilisateur(user);

      // Initialiser le contexte YouTube
      YouTubeContext.viderCache();
      await this._initialiserContexteYT();
      this.mettreAJourDashboard();
      this.afficherToast(`⚡ Chaîne "${profil.nom}" connectée — agents personnalisés !`, 'succes', 5000);
    } catch (err) {
      this.afficherToast(`❌ Connexion YouTube échouée : ${err.message}`, 'erreur');
    }
  }

  async _initialiserContexteYT() {
    if (!YouTube.estConnecte()) return;
    try {
      const ctx = await YouTubeContext.initialiser();
      if (ctx) {
        this.afficherBandeauChaine(ctx);
        console.log('[Créatis] Contexte YouTube chargé pour', ctx.chaine.nom);
      }
    } catch (e) {
      console.warn('[Créatis] Contexte YouTube non disponible :', e.message);
    }
  }

  /* ===== AUTH ===== */
  async verifierAuth() {
    // Initialiser le module Auth (Supabase ou demo)
    if (typeof Auth !== 'undefined') {
      await Auth.init();

      // En production avec Supabase configuré : forcer l'auth
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (CONFIG.estSupabaseConfigured() && !Auth.estAuthentifie() && !isLocal) {
        window.location.href = 'auth.html';
        return;
      }

      // Récupérer les infos utilisateur depuis Supabase
      if (Auth.estAuthentifie() && !Auth.estDemoMode()) {
        const authUser = await Auth.getUser();
        if (authUser) {
          const plan = await Auth.getPlanDistant() || 'gratuit';
          const cached = this.getUtilisateur() || {};
          this.setUtilisateur({
            id: authUser.id,
            nom: cached.nom || authUser.nom || authUser.email?.split('@')[0] || 'Créateur',
            email: authUser.email,
            plan,
            avatar: authUser.avatar || cached.avatar || null
          });
        }
      }
    }

    // Fallback démo si toujours pas d'utilisateur
    if (!this.getUtilisateur()) {
      if (typeof Auth !== 'undefined') Auth.connexionDemo();
      this.setUtilisateur({ nom: 'Créateur', email: 'demo@creatis.fr', plan: 'gratuit', avatar: null });
    }

    this.afficherUtilisateur();
  }

  getUtilisateur() {
    try {
      return JSON.parse(localStorage.getItem('creatis_user'));
    } catch { return null; }
  }

  setUtilisateur(user) {
    localStorage.setItem('creatis_user', JSON.stringify(user));
  }

  getGenerations() {
    return parseInt(localStorage.getItem('creatis_generations') || '0');
  }

  incrementerGenerations() {
    const before = this.getGenerations();
    const count = before + 1;
    localStorage.setItem('creatis_generations', count.toString());
    this.mettreAJourCompteur();
    this._mettreAJourChecklistOnboarding();

    if (before === 0) {
      // Première génération de tous les temps
      localStorage.setItem('creatis_first_gen_at', Date.now().toString());
      setTimeout(() => this._afficherNudgePostGen(), 1200);
      // Trigger email Brevo
      try {
        const user = this.getUtilisateur();
        if (user?.email && typeof Emails !== 'undefined') {
          Emails._api({ action: 'trigger_automation', email: user.email, eventName: 'premiere_generation' });
        }
      } catch (e) {}
    }
    return count;
  }

  _afficherNudgePostGen() {
    const user = this.getUtilisateur();
    if (user?.plan && user.plan !== 'gratuit') return; // Déjà Pro
    if (localStorage.getItem('creatis_postgen_shown')) return;
    localStorage.setItem('creatis_postgen_shown', '1');
    const modal = document.getElementById('modal-post-gen');
    if (modal) modal.classList.add('visible');
  }

  _mettreAJourChecklistOnboarding() {
    const checklist = document.getElementById('onb-sidebar-checklist');
    if (!checklist) return;

    const user = this.getUtilisateur();
    if (user?.plan && user.plan !== 'gratuit') {
      checklist.style.display = 'none';
      return;
    }

    // Étape génération
    const genFait = this.getGenerations() > 0;
    const genItem = document.getElementById('onb-sc-gen');
    const genIco = document.getElementById('onb-sc-gen-ico');
    if (genItem && genIco) {
      genItem.classList.toggle('done', genFait);
      genIco.textContent = genFait ? '✓' : '○';
    }

    // Étape YouTube
    const ytFait = typeof YouTube !== 'undefined' && YouTube.estConnecte();
    const ytItem = document.getElementById('onb-sc-yt');
    const ytIco = document.getElementById('onb-sc-yt-ico');
    if (ytItem && ytIco) {
      ytItem.classList.toggle('done', ytFait);
      ytIco.textContent = ytFait ? '✓' : '○';
    }

    // Masquer si tout est fait
    if (genFait && ytFait) {
      setTimeout(() => { checklist.style.display = 'none'; }, 3000);
    }
  }

  /* ===== QUOTA MINIATURES ===== */

  _getCleQuotaMois() {
    const d = new Date();
    return `creatis_mini_${d.getFullYear()}_${d.getMonth() + 1}`;
  }

  getMiniaturesMois() {
    return parseInt(localStorage.getItem(this._getCleQuotaMois()) || '0');
  }

  getMaxMiniatures() {
    const user = this.getUtilisateur();
    const plan = user?.plan || 'gratuit';
    return CONFIG.PLANS[plan]?.miniatures || 0;
  }

  incrementerMiniatures() {
    const cle = this._getCleQuotaMois();
    const count = this.getMiniaturesMois() + 1;
    localStorage.setItem(cle, count.toString());
    this._mettreAJourQuotaMiniaturesDash();
    return count;
  }

  verifierQuotaMiniatures() {
    const max = this.getMaxMiniatures();
    if (max <= 0) {
      this.afficherModalCreditsMiniatures('upgrade');
      return false;
    }
    const used = this.getMiniaturesMois();
    if (used >= max) {
      // Vérifier côté serveur si le quota a été remis à zéro
      this._syncQuotaMiniatures().then(serverUsed => {
        if (serverUsed < max) {
          localStorage.setItem(this._getCleQuotaMois(), serverUsed.toString());
          this.afficherToast('✅ Quota remis à jour — réessaie !', 'succes');
        }
      });
      this.afficherModalCreditsMiniatures('quota');
      return false;
    }
    return true;
  }

  async _syncQuotaMiniatures() {
    try {
      const user = this.getUtilisateur();
      const token = (typeof Auth !== 'undefined') ? Auth.getToken() : null;
      if (!user?.id && !user?.email) return this.getMiniaturesMois();
      const res = await fetch(CONFIG.USER_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action: 'get', userId: user.id, email: user.email })
      });
      if (!res.ok) return this.getMiniaturesMois();
      const { user: u } = await res.json();
      return u?.miniatures_used ?? this.getMiniaturesMois();
    } catch { return this.getMiniaturesMois(); }
  }

  /* ===== REPURPOSE CREDITS ===== */
  _getCleRepurposeMois() {
    const n = new Date();
    return `creatis_repurpose_${n.getFullYear()}_${n.getMonth()}`;
  }

  getRepurposeMois() {
    return parseInt(localStorage.getItem(this._getCleRepurposeMois()) || '0');
  }

  getMaxRepurpose() {
    const user = this.getUtilisateur();
    const plan = user?.plan || 'gratuit';
    const limits = { gratuit: 0, pro: 5, studio: 20 };
    return limits[plan] ?? 0;
  }

  incrementerRepurpose() {
    const cle = this._getCleRepurposeMois();
    const count = this.getRepurposeMois() + 1;
    localStorage.setItem(cle, count.toString());
    return count;
  }

  verifierQuotaRepurpose() {
    const user = this.getUtilisateur();
    if (!user || user.plan === 'gratuit') {
      this.afficherToast('🔒 Repurpose Vidéo est disponible à partir du plan Pro (5/mois).', 'info', 4000);
      this.afficherModalUpgrade();
      return false;
    }
    const max = this.getMaxRepurpose();
    const used = this.getRepurposeMois();
    if (used >= max) {
      this.afficherToast(`❌ Limite Repurpose atteinte (${used}/${max} ce mois). Renouvellement le 1er.`, 'erreur', 5000);
      return false;
    }
    return true;
  }

  async _appelRepurpose(url, mode = 'text') {
    const token = (typeof Auth !== 'undefined') ? Auth.getToken() : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/repurpose', {
      method: 'POST',
      headers,
      body: JSON.stringify({ url, mode })
    });

    const data = await res.json();
    if (!res.ok) {
      if (data.upgrade_required) { this.afficherModalUpgrade(); throw new Error('upgrade'); }
      throw new Error(data.error || 'Erreur Repurpose');
    }
    return data;
  }

  afficherRepurpose(agentId, data) {
    const workspace = document.getElementById('workspace');
    if (!workspace) return;

    const panneau = document.getElementById(`panneau-${agentId}`);
    const zone = panneau?.querySelector('.agent-resultat') || panneau?.querySelector('.resultat-zone');
    if (!zone) { this.afficherTexte(agentId, data.content); return; }

    const content = data.content || '';
    const titre = data.title ? `<div class="repurpose-meta"><strong>${data.title}</strong>${data.duration ? ` · ${data.duration}` : ''}</div>` : '';

    // Parser les sections du contenu
    const sections = [
      { key: 'tweets', label: '🐦 Tweets', icon: 'twitter', regex: /##\s*🐦\s*TWEETS.*?(?=##\s*💼|$)/s },
      { key: 'linkedin', label: '💼 LinkedIn', icon: 'linkedin', regex: /##\s*💼\s*POSTS LINKEDIN.*?(?=##\s*⚡|$)/s },
      { key: 'shorts', label: '⚡ Shorts', icon: 'shorts', regex: /##\s*⚡\s*IDÉES SHORTS.*?(?=##\s*🖼️|$)/s },
      { key: 'miniatures', label: '🖼️ Miniatures', icon: 'image', regex: /##\s*🖼️\s*CONCEPTS MINIATURES.*$/s }
    ];

    const tabs = sections.map((s, i) => `
      <button class="repurpose-tab${i === 0 ? ' actif' : ''}" onclick="app._repurposeTab(this, 'rp-${agentId}-${s.key}')">
        ${s.label}
      </button>`).join('');

    const panels = sections.map((s, i) => {
      const match = content.match(s.regex);
      const sectionContent = match ? match[0].replace(/##\s*[^\n]+\n/, '').trim() : '(Non généré)';
      return `<div class="repurpose-panel${i === 0 ? ' actif' : ''}" id="rp-${agentId}-${s.key}">
        ${this.renduMarkdown(sectionContent)}
      </div>`;
    }).join('');

    zone.innerHTML = `
      <div class="repurpose-resultat">
        ${titre}
        <div class="repurpose-tabs">${tabs}</div>
        <div class="repurpose-panels">${panels}</div>
        <div class="resultat-actions" style="margin-top:12px">
          <button class="btn-ghost btn-sm" onclick="app.telechargerResultat('${agentId}')">⬇️ Télécharger tout</button>
          <button class="btn-ghost btn-sm" onclick="navigator.clipboard.writeText(document.getElementById('panneau-${agentId}').querySelector('.repurpose-panels .actif')?.innerText||'').then(()=>app.afficherToast('✅ Copié !','succes'))">📋 Copier onglet</button>
        </div>
      </div>`;
  }

  _repurposeTab(btn, panelId) {
    const container = btn.closest('.repurpose-resultat');
    if (!container) return;
    container.querySelectorAll('.repurpose-tab').forEach(b => b.classList.remove('actif'));
    container.querySelectorAll('.repurpose-panel').forEach(p => p.classList.remove('actif'));
    btn.classList.add('actif');
    document.getElementById(panelId)?.classList.add('actif');
  }

  afficherClips(agentId, data) {
    const panneau = document.getElementById(`panneau-${agentId}`);
    if (!panneau) return;

    if (!data.clips || !data.clips.length) {
      panneau.innerHTML = `<div class="repurpose-resultat"><p style="color:var(--texte-secondaire);padding:2rem;text-align:center">Aucun clip généré.</p></div>`;
      return;
    }

    if (data.setup_required) {
      panneau.innerHTML = `<div class="clips-setup-msg">
        <p>⚙️ Le service de clips vidéo n'est pas encore activé.</p>
        <p style="font-size:13px;color:var(--texte-secondaire);margin-top:8px">Déploie le service Railway pour générer de vrais clips .mp4</p>
      </div>`;
      return;
    }

    const scoreColor = s => s >= 90 ? '#10b981' : s >= 75 ? '#f59e0b' : '#6b7280';

    const clipsHtml = data.clips.map((clip, i) => `
      <div class="clip-card">
        <div class="clip-header">
          <span class="clip-num">#${i + 1}</span>
          <span class="clip-score" style="background:${scoreColor(clip.score)}20;color:${scoreColor(clip.score)}">
            ⚡ ${clip.score}/100
          </span>
          <span class="clip-duration">${clip.duration || Math.round(clip.end - clip.start)}s</span>
        </div>
        <div class="clip-hook">${this._escapeHtml(clip.hook)}</div>
        <div class="clip-why">${this._escapeHtml(clip.why || '')}</div>
        ${clip.transcript ? `<div class="clip-transcript">"${this._escapeHtml(clip.transcript.substring(0, 150))}…"</div>` : ''}
        <div class="clip-actions">
          <a href="${clip.download_url}" download="clip-${i + 1}.mp4" class="btn-clip-dl" target="_blank">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Télécharger le clip
          </a>
        </div>
      </div>
    `).join('');

    panneau.innerHTML = `
      <div class="repurpose-resultat">
        <div class="clips-header">
          <strong>🎬 ${data.clips.length} clips viraux — "${this._escapeHtml(data.title || '')}"</strong>
          <span style="font-size:12px;color:var(--texte-secondaire)">Les fichiers expirent dans 1h</span>
        </div>
        <div class="clips-grid">${clipsHtml}</div>
      </div>`;
  }

  _escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  _mettreAJourQuotaMiniaturesDash() {
    const used = this.getMiniaturesMois();
    const max = this.getMaxMiniatures();
    const valEl = document.getElementById('dash-miniatures-val');
    const barEl = document.getElementById('dash-miniatures-remplie');
    if (valEl) valEl.textContent = `${used}/${max > 0 ? max : '—'}`;
    if (barEl && max > 0) barEl.style.width = `${Math.min(100, (used / max) * 100)}%`;
  }

  afficherModalCreditsMiniatures(mode = 'quota') {
    const existant = document.getElementById('modal-credits-mini');
    if (existant) existant.remove();

    const user = this.getUtilisateur();
    const plan = user?.plan || 'gratuit';
    const used = this.getMiniaturesMois();
    const max = this.getMaxMiniatures();

    const titre = mode === 'upgrade'
      ? '🎨 Miniatures IA non incluses dans votre plan'
      : `🎨 Quota atteint — ${used}/${max} miniatures ce mois`;

    const modal = document.createElement('div');
    modal.id = 'modal-credits-mini';
    modal.className = 'modal-overlay visible';
    modal.innerHTML = `
      <div class="modal-contenu modal-credits">
        <button class="modal-fermer" onclick="document.getElementById('modal-credits-mini').remove()">✕</button>
        <div class="modal-credits-icon">🎨</div>
        <h2>${titre}</h2>
        <p class="modal-credits-sub">Choisissez comment continuer à générer des miniatures professionnelles :</p>

        <div class="credits-options">
          <div class="credits-option" onclick="app._acheterCredits(5, 2)">
            <div class="credits-option-badge">Économique</div>
            <div class="credits-option-val">5 miniatures</div>
            <div class="credits-option-prix">2 €</div>
            <div class="credits-option-desc">0,40 €/miniature</div>
          </div>
          <div class="credits-option credits-option-best" onclick="app._acheterCredits(10, 3.5)">
            <div class="credits-option-badge">⭐ Populaire</div>
            <div class="credits-option-val">10 miniatures</div>
            <div class="credits-option-prix">3,50 €</div>
            <div class="credits-option-desc">0,35 €/miniature</div>
          </div>
          <div class="credits-option" onclick="app._acheterCredits(20, 6)">
            <div class="credits-option-badge">Meilleur prix</div>
            <div class="credits-option-val">20 miniatures</div>
            <div class="credits-option-prix">6 €</div>
            <div class="credits-option-desc">0,30 €/miniature</div>
          </div>
        </div>

        <div class="credits-separator">ou</div>

        <button class="btn-primaire" style="width:100%" onclick="app._upgraderPlan(); document.getElementById('modal-credits-mini').remove()">
          🚀 Passer au plan ${plan === 'gratuit' ? 'Pro' : 'Studio'} — miniatures incluses chaque mois
        </button>

        <p class="credits-attente">
          <button class="btn-ghost btn-sm" onclick="document.getElementById('modal-credits-mini').remove()">
            ⏳ Attendre le 1er du mois (reset gratuit)
          </button>
        </p>
      </div>
    `;
    document.body.appendChild(modal);
  }

  _acheterCredits(quantite, prix) {
    this.afficherToast(`💳 Achat de ${quantite} crédits miniatures (${prix}€) — Redirection Stripe…`, 'info', 4000);
    const user = this.getUtilisateur();
    const priceMap = { 5: 'price_credits_mini_5', 10: 'price_credits_mini_10', 20: 'price_credits_mini_20' };
    const priceId = priceMap[quantite];
    if (!priceId) return;

    fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId, plan: 'credits_miniatures',
        userId: user?.email || 'anonymous',
        mode: 'payment',
        successUrl: window.location.origin + `/success.html?credits=${quantite}&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: window.location.href,
        allowPromoCodes: false
      })
    })
    .then(r => r.json())
    .then(data => { if (data.url) window.location.href = data.url; })
    .catch(err => this.afficherToast('❌ Erreur paiement : ' + err.message, 'erreur'));
  }

  _upgraderPlan() {
    window.location.href = '/index.html#tarifs';
  }

  /* ===== SIDEBAR ===== */
  construireSidebar() {
    const nav = document.getElementById('agents-nav');
    const chatNav = document.getElementById('chat-nav');

    const renderBtn = agent => `
      <button class="agent-btn" id="btn-${agent.id}" onclick="app.selectionnerAgent('${agent.id}')" title="${agent.description}">
        <span class="agent-btn-icone">${agent.icone}</span>
        <span class="agent-btn-info">
          <span class="agent-btn-nom">${agent.nom}</span>
          <span class="agent-btn-desc">${agent.description.substring(0, 45)}${agent.description.length > 45 ? '…' : ''}</span>
        </span>
      </button>`;

    const agentsPrincipaux = AGENTS.filter(a => a.id !== 'chat-libre');
    const chatLibre = AGENTS.find(a => a.id === 'chat-libre');

    if (nav) nav.innerHTML = agentsPrincipaux.map(renderBtn).join('');
    if (chatNav && chatLibre) chatNav.innerHTML = renderBtn(chatLibre);
  }

  afficherUtilisateur() {
    const user = this.getUtilisateur();
    if (!user) return;

    const el = document.getElementById('user-nom');
    const planEl = document.getElementById('user-plan');
    const avatarEl = document.getElementById('user-avatar');

    if (el) el.textContent = user.nom || 'Créateur';
    if (planEl) {
      const labels = { pro: '✨ Pro', studio: '🎬 Studio', gratuit: 'Gratuit' };
      planEl.textContent = labels[user.plan] || 'Gratuit';
    }
    if (avatarEl) {
      if (user.avatar) {
        avatarEl.innerHTML = `<img src="${user.avatar}" alt="Avatar">`;
      } else {
        avatarEl.textContent = (user.nom || 'C').charAt(0).toUpperCase();
      }
    }
    this.mettreAJourCompteur();
  }

  mettreAJourCompteur() {
    const user = this.getUtilisateur();
    const estPro = user?.plan && user.plan !== 'gratuit';

    const btnUpgrade = document.getElementById('btn-upgrade-sidebar');
    if (btnUpgrade) btnUpgrade.style.display = estPro ? 'none' : '';

    if (estPro) {
      const compteur = document.getElementById('compteur-zone');
      if (compteur) compteur.style.display = 'none';
      return;
    }

    const count = this.getGenerations();
    const max = CONFIG.PLANS.gratuit.generations;
    const reste = Math.max(0, max - count);

    const label = document.getElementById('compteur-label');
    const barre = document.getElementById('barre-progression');

    if (label) label.querySelector('span').textContent = `${reste}/${max}`;
    if (barre) barre.style.width = `${Math.min(100, (count / max) * 100)}%`;
  }

  /* ===== SÉLECTION AGENT ===== */
  selectionnerAgent(agentId) {
    const agent = AGENTS.find(a => a.id === agentId);
    if (!agent) return;

    this.agentActuel = agent;

    // Mode split : dashboard à gauche, agent à droite (CSS Grid)
    const dash = document.getElementById('panneau-dashboard');
    const wsResizer = document.getElementById('workspace-resizer');
    const workspace = document.getElementById('workspace');
    const savedW = parseInt(localStorage.getItem('creatis_workspace_split') || '360', 10);
    if (dash) { dash.style.display = ''; dash.classList.add('split-mode'); }
    if (workspace) {
      workspace.classList.add('mode-split');
      workspace.style.gridTemplateColumns = `${savedW}px 6px 1fr`;
    }
    if (wsResizer) wsResizer.style.display = 'flex';
    if (!this._wsResizerInited) this._initWorkspaceResizer();

    // Mettre à jour sidebar
    document.querySelectorAll('.agent-btn').forEach(btn => btn.classList.remove('actif'));
    const btnActif = document.getElementById(`btn-${agentId}`);
    if (btnActif) btnActif.classList.add('actif');

    // Mettre à jour header
    const headerTitre = document.getElementById('header-titre');
    if (headerTitre) headerTitre.innerHTML = `<span class="header-icone-svg">${agent.icone}</span> ${agent.nom}`;

    // Afficher le bon panneau
    document.querySelectorAll('.panneau-agent').forEach(p => p.classList.remove('actif'));
    const panneau = document.getElementById(`panneau-${agentId}`);
    if (panneau) {
      panneau.classList.add('actif');
    } else {
      this.construirePanneauAgent(agent);
    }

    // Fermer sidebar sur mobile
    this.fermerSidebarMobile();
  }

  /* ===== RESTAURER UNE GÉNÉRATION DEPUIS L'HISTORIQUE ===== */
  restaurerGeneration(index) {
    const hist = this._getHistorique();
    const h = hist[index];
    if (!h) return;

    const agentId = h.agentId || h.agent_id;
    this.selectionnerAgent(agentId);

    // Attendre que le panneau soit construit puis restaurer le contenu
    requestAnimationFrame(() => {
      setTimeout(() => {
        // Restaurer les inputs
        if (h.donnees) {
          const agent = AGENTS.find(a => a.id === agentId);
          if (agent?.inputs) {
            agent.inputs.forEach(input => {
              if (input.type === 'file') return;
              const el = document.getElementById(`input-${agentId}-${input.id}`);
              if (el && h.donnees[input.id] !== undefined) el.value = h.donnees[input.id];
            });
          }
        }
        // Restaurer le contenu généré
        if (h.imageUrl) {
          const agent = AGENTS.find(a => a.id === agentId);
          if (agent) this.afficherMiniaturePro(agentId, h.imageUrl, h.donnees || {});
        } else if (h.contenu) {
          this.afficherTexte(agentId, h.contenu);
        }
      }, 80);
    });
  }

  /* ===== CONSTRUCTION PANNEAU AGENT ===== */
  construirePanneauAgent(agent) {
    if (agent.type === 'chat') {
      this.construirePanneauChat(agent);
      return;
    }
    if (agent.type === 'clips') {
      this.construirePanneauClips(agent);
      return;
    }

    const workspace = document.getElementById('workspace');
    if (!workspace) return;

    const panneau = document.createElement('div');
    panneau.className = 'panneau-agent actif';
    panneau.id = `panneau-${agent.id}`;

    const savedW = parseInt(localStorage.getItem('creatis_form_width') || '380');
    const formW = Math.min(600, Math.max(280, savedW));

    panneau.innerHTML = `
      <div class="zone-formulaire" id="form-zone-${agent.id}" style="width:${formW}px;min-width:${formW}px">
        <div class="formulaire-entete">
          <button class="btn-retour-dashboard" onclick="app.afficherDashboard()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Tableau de bord
          </button>
          <div class="agent-titre-form">
            <span class="agent-emoji">${agent.icone}</span>
            <h2>${agent.nom}</h2>
          </div>
          <p class="agent-desc-form">${agent.description}</p>
        </div>
        <div class="formulaire-corps" id="form-${agent.id}">
          ${this.construireFormulaire(agent)}
        </div>
        <div class="formulaire-pied">
          <button class="btn-generer" id="btn-generer-${agent.id}" onclick="app.generer('${agent.id}', event)">
            <span class="icone-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></span>
            <span class="texte-btn">Générer avec l'IA</span>
          </button>
        </div>
      </div>

      <div class="zone-resizer" id="resizer-${agent.id}" title="Glisser pour redimensionner">
        <div class="zone-resizer-handle"></div>
      </div>

      <div class="zone-resultats" id="resultats-${agent.id}">
        <div class="resultats-vide">
          <div class="agent-sphere-wrap">
            <canvas class="agent-sphere-canvas" id="sphere-${agent.id}" width="160" height="160"></canvas>
            <div class="agent-sphere-overlay">
              <span class="agent-sphere-icone">${agent.icone}</span>
            </div>
          </div>
          <h3>Prêt à générer</h3>
          <p>Remplis le formulaire et clique sur<br>"Générer avec l'IA"</p>
        </div>
        <div class="resultats-chargement" id="chargement-${agent.id}">
          <div class="spinner spinner-lg"></div>
          <p class="texte-chargement">L'IA génère votre contenu…</p>
        </div>
        <div class="resultats-contenu" id="contenu-${agent.id}">
          <div class="resultats-toolbar">
            <span class="resultats-toolbar-titre">Résultat généré</span>
            <div class="resultats-actions">
              <button class="btn-ghost btn-sm" onclick="app.copierResultat('${agent.id}')" title="Copier" style="display:flex;align-items:center;gap:5px">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copier
              </button>
              <button class="btn-ghost btn-sm" onclick="app.telechargerResultat('${agent.id}')" title="Télécharger" style="display:flex;align-items:center;gap:5px">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Télécharger
              </button>
              <button class="btn-ghost btn-sm" onclick="app.reinitialiserResultat('${agent.id}')" title="Effacer" style="display:flex;align-items:center;gap:5px">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                Effacer
              </button>
            </div>
          </div>
          <div class="resultats-texte" id="texte-${agent.id}"></div>
        </div>
      </div>
    `;

    workspace.appendChild(panneau);

    // Sphère animée
    requestAnimationFrame(() => {
      const canvas = document.getElementById(`sphere-${agent.id}`);
      if (canvas) this._animerSphere(canvas, 52, 160);
    });

    // Resizer draggable
    const resizer = document.getElementById(`resizer-${agent.id}`);
    const formZone = document.getElementById(`form-zone-${agent.id}`);
    if (resizer && formZone) {
      let startX, startW;
      const onMove = (e) => {
        const dx = (e.clientX || e.touches?.[0]?.clientX || 0) - startX;
        const newW = Math.min(620, Math.max(260, startW + dx));
        formZone.style.width = newW + 'px';
        formZone.style.minWidth = newW + 'px';
        localStorage.setItem('creatis_form_width', newW);
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      resizer.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        startW = formZone.offsetWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        e.preventDefault();
      });
    }
  }

  construireFormulaire(agent) {
    return agent.inputs.map(input => {
      const idChamp = `champ-${agent.id}-${input.id}`;

      if (input.type === 'textarea') {
        return `
          <div class="form-groupe">
            <label for="${idChamp}">${input.label}${input.requis ? ' <span class="texte-vert">*</span>' : ''}</label>
            <textarea
              id="${idChamp}"
              placeholder="${input.placeholder || ''}"
              rows="${input.rows || 4}"
              ${input.requis ? 'required' : ''}
            ></textarea>
          </div>
        `;
      }

      if (input.type === 'select') {
        const options = input.options.map(opt =>
          `<option value="${opt}">${opt}</option>`
        ).join('');
        return `
          <div class="form-groupe">
            <label for="${idChamp}">${input.label}${input.requis ? ' <span class="texte-vert">*</span>' : ''}</label>
            <select id="${idChamp}" ${input.requis ? 'required' : ''}>
              ${options}
            </select>
          </div>
        `;
      }

      if (input.type === 'file') {
        return `
          <div class="form-groupe">
            <label>${input.label}</label>
            <label class="input-fichier-label" for="${idChamp}">
              <span class="input-fichier-icone">📎</span>
              <span class="input-fichier-texte" id="${idChamp}-texte">Choisir un fichier…</span>
              <input type="file" id="${idChamp}" accept="${input.accept || 'image/*'}" style="display:none"
                onchange="document.getElementById('${idChamp}-texte').textContent = this.files[0]?.name || 'Choisir un fichier…'">
            </label>
            ${input.hint ? `<small class="form-hint">${input.hint}</small>` : ''}
          </div>
        `;
      }

      const hasWordLimit = input.label.includes('mots max');
      const wordLimitMatch = hasWordLimit ? (input.label.match(/(\d+)-?(\d+)?\s*mots/) || []) : [];
      const maxMots = wordLimitMatch[2] ? parseInt(wordLimitMatch[2]) : (wordLimitMatch[1] ? parseInt(wordLimitMatch[1]) : 0);
      const compteurId = `compteur-${idChamp}`;
      const onInputHandler = hasWordLimit
        ? `oninput="(function(el){var w=el.value.trim().split(/\\s+/).filter(Boolean).length;var c=document.getElementById('${compteurId}');if(c){c.textContent=w+' mot'+(w>1?'s':'');c.style.color=w>${maxMots}?'var(--rouge)':'var(--texte-muted)'}})(this)"`
        : '';
      return `
        <div class="form-groupe">
          <label for="${idChamp}" style="display:flex;justify-content:space-between;align-items:center;">
            <span>${input.label}${input.requis ? ' <span class="texte-vert">*</span>' : ''}</span>
            ${hasWordLimit ? `<span id="${compteurId}" style="font-size:11px;color:var(--texte-muted);font-weight:400;">0 mot</span>` : ''}
          </label>
          <input
            type="text"
            id="${idChamp}"
            placeholder="${input.placeholder || ''}"
            ${input.requis ? 'required' : ''}
            ${onInputHandler}
          >
        </div>
      `;
    }).join('');
  }

  /* ===== GÉNÉRATION ===== */
  async generer(agentId, evt) {
    if (this.enChargement) return;

    const agent = AGENTS.find(a => a.id === agentId);
    if (!agent) return;

    // Vérifier limites
    const user = this.getUtilisateur();
    if (user?.demo) {
      // Mode démo : 3 générations puis popup signup
      const demoCount = parseInt(localStorage.getItem('creatis_demo_count') || '0');
      if (demoCount >= 3) {
        evt?.stopPropagation();
        this.afficherModalSignup();
        return;
      }
    } else if (user?.plan === 'gratuit') {
      const count = this.getGenerations();
      if (count >= CONFIG.PLANS.gratuit.generations) {
        this.afficherModalUpgrade();
        return;
      }
    }

    // Vérifier clé API
    if (!CONFIG.estConfigured()) {
      this.afficherToast('⚠️ Clé API Groq manquante. Configure js/config.js', 'erreur');
      return;
    }

    // Collecter données formulaire
    const donnees = {};
    let formulaireValide = true;

    for (const input of agent.inputs) {
      const el = document.getElementById(`champ-${agentId}-${input.id}`);
      if (!el) continue;

      if (input.type === 'file') {
        // Préférer la version sans-fond déjà dans le DOM (après remove-bg)
        const domImg = document.getElementById(`mcreateur-${agentId}`);
        if (domImg?.src && domImg.src.startsWith('data:')) {
          donnees[input.id] = domImg.src;
        } else {
          const file = el.files?.[0];
          if (file) {
            donnees[input.id] = await new Promise((res) => {
              const reader = new FileReader();
              reader.onload = (e) => res(e.target.result);
              reader.readAsDataURL(file);
            });
          }
        }
        continue;
      }

      const valeur = el.value.trim();
      if (input.requis && !valeur) {
        el.focus();
        el.style.borderColor = 'var(--rouge)';
        setTimeout(() => el.style.borderColor = '', 2000);
        this.afficherToast(`❌ Le champ "${input.label}" est requis`, 'erreur');
        formulaireValide = false;
        break;
      }
      donnees[input.id] = valeur;
    }

    if (!formulaireValide) return;

    // UI : état chargement
    this.enChargement = true;
    this.afficherChargement(agentId, true);
    this.desactiverBouton(agentId, true);

    try {
      let resultat;

      // Auto-fetch données vidéo YouTube si url_video fournie
      if (donnees.url_video) {
        try {
          this.afficherToast('📡 Analyse de la vidéo en cours...', 'info', 6000);
          const token = (typeof Auth !== 'undefined') ? Auth.getToken() : null;
          const hdrs = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
          const vr = await fetch('/api/youtube', { method: 'POST', headers: hdrs, body: JSON.stringify({ type: 'video', videoUrl: donnees.url_video }) });
          if (vr.ok) {
            donnees._videoData = await vr.json();
            const src = donnees._videoData.transcriptSource;
            const srcLabel = src === 'gemini' ? '🤖 Gemini a regardé la vidéo' : src === 'vtt' ? '📝 Sous-titres récupérés' : '📊 Données YouTube récupérées';
            this.afficherToast(`✅ ${srcLabel} — génération en cours...`, 'succes', 3000);
          } else {
            const er = await vr.json().catch(() => ({}));
            this.afficherToast(`⚠️ ${er.error || 'Impossible d\'analyser la vidéo'} — génération avec les données disponibles`, 'info', 4000);
          }
        } catch { this.afficherToast('⚠️ Analyse vidéo échouée — génération en cours quand même', 'info', 3000); }
      }

      // Récupère le contexte YouTube personnalisé pour cet agent
      const contexteYT = (typeof YouTubeContext !== 'undefined')
        ? YouTubeContext.getContexte(agentId)
        : '';

      if (agent.type === 'clips') {
        return; // géré par lancerClips()
      } else if (agent.type === 'repurpose') {
        if (!this.verifierQuotaRepurpose()) return;
        this.afficherToast('🎙️ Récupération des sous-titres et génération en cours…', 'info', 15000);
        const data = await this._appelRepurpose(donnees.url, 'text');
        this.afficherRepurpose(agentId, data);
        this.incrementerRepurpose();
        resultat = data.content;
      } else if (agent.type === 'miniature') {
        if (!this.verifierQuotaMiniatures()) return;

        const panneau = document.getElementById(`panneau-${agentId}`);
        let imageUrl;
        let donneesDisplay = donnees;

        const prompt = agent.construirePrompt(donnees, contexteYT);
        const format = donnees.format || '16:9';
        imageUrl = await this.appelTogetherAI(prompt, format);
        if (panneau) panneau.dataset.prompt = prompt;
        if (panneau) panneau.dataset.format = format;
        if (panneau) panneau.dataset.donnees = JSON.stringify({ texte_overlay: donnees.texte_overlay, texte_overlay2: donnees.texte_overlay2 || '' });

        this.afficherMiniaturePro(agentId, imageUrl, donneesDisplay);
        this.incrementerMiniatures();
        resultat = imageUrl;
      } else if (agent.type === 'image') {
        if (!CONFIG.HF_TOKEN) {
          throw new Error('Token HuggingFace manquant — ajoute HF_TOKEN dans js/config.js (gratuit sur huggingface.co/settings/tokens)');
        }
        resultat = await this.appelHuggingFace(agent.construirePrompt(donnees, contexteYT));
        this.afficherImage(agentId, resultat);
      } else {
        const prompt = agent.construirePrompt(donnees, contexteYT);
        resultat = await this.appelGroq(prompt);
        this.afficherTexte(agentId, resultat);
      }

      this.incrementerGenerations();
      this._sauvegarderHistorique(agent, donnees, resultat);
      if (user?.demo) {
        const dc = parseInt(localStorage.getItem('creatis_demo_count') || '0');
        localStorage.setItem('creatis_demo_count', (dc + 1).toString());
        const restants = 3 - (dc + 1);
        if (restants > 0) this.afficherToast(`✅ Généré ! Il te reste ${restants} test${restants > 1 ? 's' : ''} gratuit${restants > 1 ? 's' : ''} en mode démo`, 'succes');
        else this.afficherToast('✅ Généré ! C\'est ton dernier test démo — crée ton compte pour continuer', 'succes', 5000);
      } else {
        this.afficherToast('✅ Contenu généré avec succès !', 'succes');
      }

    } catch (erreur) {
      console.error('Erreur génération:', erreur);
      this.afficherToast(`❌ ${erreur.message}`, 'erreur');
      this.afficherChargement(agentId, false);
      this.afficherVide(agentId);
    } finally {
      this.enChargement = false;
      this.desactiverBouton(agentId, false);
      this.afficherChargement(agentId, false);
    }
  }

  /* ===== CLIPS VIRAUX — Interface style OpusClip ===== */
  construirePanneauClips(agent) {
    const workspace = document.getElementById('workspace');
    if (!workspace) return;

    const panneau = document.createElement('div');
    panneau.className = 'panneau-agent panneau-clips actif';
    panneau.id = `panneau-${agent.id}`;

    panneau.innerHTML = `
      <div class="clips-page">
        <div class="clips-page-header">
          <button class="btn-retour-dashboard" onclick="app.afficherDashboard()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Tableau de bord
          </button>
        </div>

        <div class="clips-hero">
          <div class="clips-preview-box" id="clips-preview-${agent.id}">
            <div class="clips-preview-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="opacity:.3"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              <p>Aperçu de la vidéo</p>
            </div>
          </div>

          <div class="clips-input-row">
            <div class="clips-input-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.5;flex-shrink:0"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              <input type="text" id="clips-url-${agent.id}" class="clips-url-input"
                placeholder="Colle un lien YouTube, TikTok, Instagram…"
                oninput="app._clipsPreviewUrl('${agent.id}', this.value)"
                onkeydown="if(event.key==='Enter') app.lancerClips('${agent.id}')">
              <button class="btn-get-clips" id="btn-clips-${agent.id}" onclick="app.lancerClips('${agent.id}')">
                Créer les Shorts
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </button>
            </div>
            <p class="clips-hint">Formats supportés : YouTube · Vidéo longue → 5 Shorts viraux en 9:16 avec sous-titres</p>
          </div>
        </div>

        <div id="clips-results-${agent.id}" class="clips-results-zone"></div>
      </div>`;

    workspace.appendChild(panneau);
    this._initSphereCanvas(agent.id);
  }

  _clipsPreviewUrl(agentId, url) {
    const box = document.getElementById(`clips-preview-${agentId}`);
    if (!box) return;
    const videoId = this._extractYtId(url);
    if (videoId) {
      box.innerHTML = `<img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg"
        style="width:100%;height:100%;object-fit:cover;border-radius:12px" alt="aperçu">
        <div class="clips-preview-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>`;
    } else {
      box.innerHTML = `<div class="clips-preview-placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="opacity:.3"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="21"/></svg><p>Aperçu de la vidéo</p></div>`;
    }
  }

  _extractYtId(url) {
    const m = (url || '').match(/(?:[?&]v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  async lancerClips(agentId) {
    const agent = AGENTS.find(a => a.id === agentId);
    if (!agent) return;
    if (!this.verifierQuotaRepurpose()) return;

    const urlInput = document.getElementById(`clips-url-${agentId}`);
    const url = urlInput?.value?.trim();
    if (!url) { this.afficherToast('❌ Entre une URL YouTube', 'erreur'); urlInput?.focus(); return; }

    const btn = document.getElementById(`btn-clips-${agentId}`);
    const resultsZone = document.getElementById(`clips-results-${agentId}`);
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="clips-spinner"></span> Analyse en cours…'; }

    if (resultsZone) {
      resultsZone.innerHTML = `
        <div class="clips-loading">
          <div class="clips-loading-steps">
            ${['📥 Téléchargement de la vidéo…', '🎙️ Transcription audio…', '🧠 Identification des moments viraux…', '✂️ Création des clips 9:16…', '💬 Ajout des sous-titres…'].map((s,i) =>
              `<div class="clips-step" id="cstep-${agentId}-${i}" style="animation-delay:${i*1.2}s">${s}</div>`
            ).join('')}
          </div>
        </div>`;
      this._animateClipsSteps(agentId);
    }

    try {
      const data = await this._appelRepurpose(url, 'clips');
      this.incrementerRepurpose();
      this._afficherClipsResultats(agentId, data);
    } catch (err) {
      if (err.message !== 'upgrade') this.afficherToast(`❌ ${err.message}`, 'erreur');
      if (resultsZone) resultsZone.innerHTML = '';
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = 'Créer les Shorts <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>'; }
    }
  }

  _animateClipsSteps(agentId) {
    [0,1,2,3,4].forEach((i) => {
      setTimeout(() => {
        const el = document.getElementById(`cstep-${agentId}-${i}`);
        if (el) el.classList.add('actif');
      }, i * 1500);
    });
  }

  _afficherClipsResultats(agentId, data) {
    const zone = document.getElementById(`clips-results-${agentId}`);
    if (!zone) return;

    if (!data.clips?.length) {
      zone.innerHTML = `<p style="text-align:center;color:var(--texte-secondaire);padding:2rem">Aucun clip généré.</p>`;
      return;
    }

    const scoreColor = s => s >= 90 ? '#10b981' : s >= 75 ? '#f59e0b' : '#6b7280';
    const platforms = [
      { icon: '▶', label: 'YouTube', color: '#ff0000' },
      { icon: '📸', label: 'Instagram', color: '#e1306c' },
      { icon: '💼', label: 'LinkedIn', color: '#0077b5' },
      { icon: '♪', label: 'TikTok', color: '#000' },
      { icon: 'f', label: 'Facebook', color: '#1877f2' },
    ];

    const clipsHtml = data.clips.map((clip, i) => `
      <div class="clip-opus-card">
        <div class="clip-opus-preview">
          <video src="${clip.download_url}" class="clip-opus-video"
            preload="metadata" playsinline muted
            onmouseenter="this.play()" onmouseleave="this.pause();this.currentTime=0">
          </video>
          <div class="clip-opus-score" style="background:${scoreColor(clip.score)}">
            <span>SCORE</span>
            <strong>${clip.score}</strong>
          </div>
          <div class="clip-opus-platform">${platforms[i % platforms.length].label.substring(0,2)}</div>
        </div>
        <div class="clip-opus-info">
          <p class="clip-opus-hook">${this._escapeHtml(clip.hook)}</p>
          <p class="clip-opus-dur">${clip.duration}s</p>
        </div>
        <a href="${clip.download_url}" download="short-${i+1}.mp4" class="clip-opus-dl" target="_blank">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Télécharger
        </a>
      </div>`).join('');

    zone.innerHTML = `
      <div class="clips-opus-header">
        <strong>${data.clips.length} Shorts générés</strong>
        <span>"${this._escapeHtml((data.title || '').substring(0, 60))}"</span>
        <span class="clips-expire">⏱ Clips disponibles 1h</span>
      </div>
      <div class="clips-opus-grid">${clipsHtml}</div>`;
  }

  /* ===== CHAT LIBRE ===== */
  construirePanneauChat(agent) {
    const workspace = document.getElementById('workspace');
    if (!workspace) return;

    if (!this._chatHistoires[agent.id]) this._chatHistoires[agent.id] = [];

    const panneau = document.createElement('div');
    panneau.className = 'panneau-agent panneau-chat actif';
    panneau.id = `panneau-${agent.id}`;

    panneau.innerHTML = `
      <div class="chat-layout">
        <div class="chat-entete">
          <span class="chat-entete-icone">${agent.icone}</span>
          <div>
            <h2 class="chat-entete-titre">${agent.nom}</h2>
            <p class="chat-entete-desc">${agent.description}</p>
          </div>
          <button class="btn-ghost btn-sm" onclick="app._viderChat('${agent.id}')" title="Vider la conversation">
            🗑️
          </button>
        </div>
        <div class="chat-messages" id="chat-messages-${agent.id}">
          <div class="chat-message-bienvenue">
            <div class="chat-avatar-ia">C</div>
            <div class="chat-bubble chat-bubble-ia">
              Bonjour ! Je suis Créatis IA. Pose-moi n'importe quelle question sur ta chaîne YouTube — stratégie, algorithme, monétisation, scripts, sponsors… Je suis là pour t'aider.
            </div>
          </div>
        </div>
        <div class="chat-saisie-zone">
          <div class="chat-saisie">
            <textarea
              id="chat-input-${agent.id}"
              class="chat-input"
              placeholder="Pose ta question à Créatis IA…"
              rows="1"
              onkeydown="if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();app.envoyerMessageChat('${agent.id}')}"
              oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,120)+'px'"
            ></textarea>
            <button
              id="chat-envoyer-${agent.id}"
              class="chat-btn-envoyer"
              onclick="app.envoyerMessageChat('${agent.id}')"
              title="Envoyer (Ctrl+Entrée)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <p class="chat-raccourci">Ctrl+Entrée pour envoyer · Historique conservé pendant la session</p>
        </div>
      </div>
    `;

    workspace.appendChild(panneau);
  }

  async envoyerMessageChat(agentId) {
    const agent = AGENTS.find(a => a.id === agentId);
    if (!agent || this.enChargement) return;

    const input = document.getElementById(`chat-input-${agentId}`);
    const texte = input?.value.trim();
    if (!texte) return;

    // Vérifier quota gratuit
    const user = this.getUtilisateur();
    if (user?.plan === 'gratuit' && this.getGenerations() >= CONFIG.PLANS.gratuit.generations) {
      this.afficherModalUpgrade();
      return;
    }

    // Afficher message utilisateur
    this._ajouterMessageChat(agentId, 'user', texte);
    input.value = '';
    input.style.height = 'auto';

    // Ajouter à l'historique
    if (!this._chatHistoires[agentId]) this._chatHistoires[agentId] = [];
    this._chatHistoires[agentId].push({ role: 'user', content: texte });

    // Indicateur de frappe
    const indicateurId = this._ajouterIndicateurFrappe(agentId);

    this.enChargement = true;
    const btnEnvoyer = document.getElementById(`chat-envoyer-${agentId}`);
    if (btnEnvoyer) btnEnvoyer.disabled = true;

    try {
      const contexteYT = (typeof YouTubeContext !== 'undefined') ? YouTubeContext.getContexte(agentId) : '';
      const systemPrompt = agent.construireSystemPrompt(contexteYT);

      const messages = [
        { role: 'system', content: systemPrompt },
        ...this._chatHistoires[agentId]
      ];

      const reponse = await this.appelGroqChat(messages);

      this._supprimerIndicateurFrappe(indicateurId);
      this._ajouterMessageChat(agentId, 'ia', reponse);
      this._chatHistoires[agentId].push({ role: 'assistant', content: reponse });

      // Limiter l'historique à 20 échanges (40 messages)
      if (this._chatHistoires[agentId].length > 40) {
        this._chatHistoires[agentId] = this._chatHistoires[agentId].slice(-40);
      }

      this.incrementerGenerations();
    } catch (err) {
      this._supprimerIndicateurFrappe(indicateurId);
      this._ajouterMessageChat(agentId, 'erreur', `❌ ${err.message}`);
    } finally {
      this.enChargement = false;
      if (btnEnvoyer) btnEnvoyer.disabled = false;
      const inputEl = document.getElementById(`chat-input-${agentId}`);
      if (inputEl) inputEl.focus();
    }
  }

  _ajouterMessageChat(agentId, role, content) {
    const conteneur = document.getElementById(`chat-messages-${agentId}`);
    if (!conteneur) return;

    const div = document.createElement('div');
    div.className = `chat-message chat-message-${role === 'user' ? 'user' : 'ia'}`;

    if (role === 'user') {
      div.innerHTML = `<div class="chat-bubble chat-bubble-user">${this._echapper(content)}</div>`;
    } else if (role === 'erreur') {
      div.innerHTML = `<div class="chat-avatar-ia">C</div><div class="chat-bubble chat-bubble-erreur">${this._echapper(content)}</div>`;
    } else {
      div.innerHTML = `<div class="chat-avatar-ia">C</div><div class="chat-bubble chat-bubble-ia">${this.renduMarkdown(content)}</div>`;
    }

    conteneur.appendChild(div);
    conteneur.scrollTop = conteneur.scrollHeight;
  }

  _ajouterIndicateurFrappe(agentId) {
    const conteneur = document.getElementById(`chat-messages-${agentId}`);
    if (!conteneur) return null;

    const id = `chat-typing-${Date.now()}`;
    const div = document.createElement('div');
    div.id = id;
    div.className = 'chat-message chat-message-ia';
    div.innerHTML = `<div class="chat-avatar-ia">C</div><div class="chat-bubble chat-bubble-ia chat-typing"><span></span><span></span><span></span></div>`;
    conteneur.appendChild(div);
    conteneur.scrollTop = conteneur.scrollHeight;
    return id;
  }

  _supprimerIndicateurFrappe(id) {
    if (id) document.getElementById(id)?.remove();
  }

  _echapper(texte) {
    return texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  }

  _viderChat(agentId) {
    this._chatHistoires[agentId] = [];
    const conteneur = document.getElementById(`chat-messages-${agentId}`);
    if (!conteneur) return;
    const agent = AGENTS.find(a => a.id === agentId);
    conteneur.innerHTML = `
      <div class="chat-message-bienvenue">
        <div class="chat-avatar-ia">C</div>
        <div class="chat-bubble chat-bubble-ia">
          Conversation réinitialisée. Comment puis-je t'aider ?
        </div>
      </div>`;
  }

  async appelGroqChat(messages) {
    const headers = { 'Content-Type': 'application/json' };
    const token = (typeof Auth !== 'undefined') ? Auth.getToken() : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const reponse = await fetch(CONFIG.GROQ_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: CONFIG.GROQ_MODEL,
        messages,
        temperature: 0.75,
        max_tokens: 2048
      })
    });

    if (!reponse.ok) {
      const err = await reponse.json().catch(() => ({}));
      throw new Error(err.error || `Erreur API (${reponse.status})`);
    }

    const data = await reponse.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /* ===== APPEL API GROQ (via proxy sécurisé /api/groq) ===== */
  async appelGroq(prompt) {
    const headers = { 'Content-Type': 'application/json' };
    const token = (typeof Auth !== 'undefined') ? Auth.getToken() : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const reponse = await fetch(CONFIG.GROQ_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: CONFIG.GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Tu es Créatis, un assistant IA expert en création de contenu YouTube pour créateurs francophones. Tu génères du contenu de haute qualité, optimisé pour YouTube et adapté au marché francophone. Réponds toujours en français.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 8000
      })
    });

    if (!reponse.ok) {
      const erreur = await reponse.json().catch(() => ({}));
      if (reponse.status === 401) {
        localStorage.removeItem('creatis_user');
        setTimeout(() => { window.location.href = 'auth.html'; }, 1500);
        throw new Error('Session expirée — tu vas être redirigé pour te reconnecter');
      }
      if (reponse.status === 403 && erreur.demo_limit) {
        setTimeout(() => this.afficherModalSignup(), 100);
        throw new Error('Limite démo atteinte');
      }
      throw new Error(erreur.error || `Erreur API Groq (${reponse.status})`);
    }

    const data = await reponse.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /* ===== GÉNÉRATION IMAGE — via proxy /api/generate-image ===== */
  async appelHuggingFace(prompt) {
    const headers = { 'Content-Type': 'application/json' };
    const token = (typeof Auth !== 'undefined') ? Auth.getToken() : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt: `YouTube thumbnail clickbait style, ${prompt}, bold colors, high contrast, 16:9 format, professional`,
        width: 1280,
        height: 720
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 402) throw new Error('Génération image indisponible — configure OPENAI_API_KEY dans Vercel');
      if (response.status === 429) throw new Error('Trop de requêtes — réessaie dans une minute');
      if (response.status === 401) throw new Error('Reconnecte-toi pour générer des images');
      throw new Error(err.error || `Erreur génération image (${response.status})`);
    }

    const data = await response.json();
    const url = data.data?.[0]?.url;
    if (url) return url;
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error('Réponse image invalide du serveur');
    return `data:image/jpeg;base64,${b64}`;
  }

  /* ===== AFFICHAGE RÉSULTATS ===== */
  afficherChargement(agentId, visible) {
    const el = document.getElementById(`chargement-${agentId}`);
    const vide = document.querySelector(`#resultats-${agentId} .resultats-vide`);
    const contenu = document.getElementById(`contenu-${agentId}`);

    if (visible) {
      if (el) el.classList.add('visible');
      if (vide) vide.style.display = 'none';
      if (contenu) contenu.classList.remove('visible');
    } else {
      if (el) el.classList.remove('visible');
    }
  }

  afficherVide(agentId) {
    const vide = document.querySelector(`#resultats-${agentId} .resultats-vide`);
    if (vide) vide.style.display = 'flex';
  }

  afficherTexte(agentId, texte) {
    this.resultatsActuels = texte;
    const conteneur = document.getElementById(`contenu-${agentId}`);
    const texteEl = document.getElementById(`texte-${agentId}`);
    const vide = document.querySelector(`#resultats-${agentId} .resultats-vide`);

    if (vide) vide.style.display = 'none';
    if (texteEl) texteEl.innerHTML = this.renduMarkdown(texte);
    if (conteneur) {
      conteneur.classList.add('visible');
      setTimeout(() => conteneur.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }

  afficherImage(agentId, dataUrl) {
    this.resultatsActuels = dataUrl;
    const conteneur = document.getElementById(`contenu-${agentId}`);
    const texteEl = document.getElementById(`texte-${agentId}`);
    const vide = document.querySelector(`#resultats-${agentId} .resultats-vide`);

    if (vide) vide.style.display = 'none';

    if (texteEl) {
      texteEl.innerHTML = `
        <div class="zone-image">
          <img src="${dataUrl}" alt="Miniature générée" class="image-generee" id="img-${agentId}"
            onerror="this.style.display='none';document.getElementById('img-erreur-${agentId}').style.display='block'"
          >
          <p id="img-erreur-${agentId}" style="display:none;color:var(--texte-muted);font-size:13px;text-align:center;">
            ⚠️ L'image prend du temps à charger — <a href="${dataUrl}" target="_blank" style="color:var(--vert)">ouvrir directement</a>
          </p>
          <div class="image-actions">
            <button class="btn-primaire btn-sm" onclick="app.telechargerImage('img-${agentId}', '${dataUrl}')">
              ⬇️ Télécharger la miniature
            </button>
            <button class="btn-ghost btn-sm" onclick="app.copierImage('${agentId}')">
              📋 Copier l'image
            </button>
          </div>
          <p class="texte-muted" style="font-size:12px; text-align:center;">
            Miniature 16:9 générée par FLUX.1-schnell (HuggingFace) — Résolution recommandée : 1280×720px
          </p>
        </div>
      `;
    }

    if (conteneur) conteneur.classList.add('visible');
  }

  reinitialiserResultat(agentId) {
    const conteneur = document.getElementById(`contenu-${agentId}`);
    const texteEl = document.getElementById(`texte-${agentId}`);
    const vide = document.querySelector(`#resultats-${agentId} .resultats-vide`);

    if (conteneur) conteneur.classList.remove('visible');
    if (texteEl) texteEl.innerHTML = '';
    if (vide) vide.style.display = 'flex';
    this.resultatsActuels = '';
  }

  /* ===== RENDU MARKDOWN SIMPLE ===== */
  renduMarkdown(texte) {
    return texte
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Titres
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      // Gras et italique
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Code inline
      .replace(/`(.+?)`/g, '<code>$1</code>')
      // Séparateur
      .replace(/^---$/gm, '<hr>')
      // Listes
      .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
      // Paragraphes
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gm, (match) => {
        if (match.startsWith('<')) return match;
        return match;
      })
      // Wrapping listes
      .replace(/(<li>.+<\/li>(\n<li>.+<\/li>)*)/g, '<ul>$1</ul>')
      // Nettoyage
      .replace(/\n/g, '<br>')
      // Wrapper global
      .replace(/^(.)/gm, (match, char) => {
        if (!char.startsWith('<')) return `<p>${match}`;
        return match;
      });
  }

  /* ===== ACTIONS RÉSULTATS ===== */
  async copierResultat(agentId) {
    if (!this.resultatsActuels) return;
    if (this.resultatsActuels.startsWith('data:image')) {
      if (document.getElementById(`mfond-${agentId}`)) {
        await this.copierMiniaturePro(agentId);
      } else {
        await this.copierImage(agentId);
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(this.resultatsActuels);
      this.afficherToast('📋 Copié dans le presse-papier !', 'succes');
    } catch {
      this.afficherToast('❌ Impossible de copier', 'erreur');
    }
  }

  telechargerResultat(agentId) {
    if (!this.resultatsActuels) return;
    if (this.resultatsActuels.startsWith('data:image')) {
      this.telechargerMiniaturePro(agentId);
      return;
    }
    const agent = AGENTS.find(a => a.id === agentId);
    const blob = new Blob([this.resultatsActuels], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creatis-${agent?.id || 'resultat'}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    this.afficherToast('⬇️ Fichier téléchargé !', 'succes');
  }

  async telechargerImage(imgId, url) {
    try {
      // Fetch l'image via le navigateur puis force le téléchargement
      const blob = await fetch(url).then(r => r.blob());
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `miniature-creatis-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      this.afficherToast('⬇️ Miniature téléchargée !', 'succes');
    } catch {
      // Fallback : ouvrir dans un nouvel onglet
      window.open(url, '_blank');
      this.afficherToast('↗️ Image ouverte dans un nouvel onglet', 'info');
    }
  }

  async copierImage(agentId) {
    const img = document.getElementById(`img-${agentId}`);
    if (!img) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      canvas.toBlob(async (blob) => {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        this.afficherToast('📋 Image copiée !', 'succes');
      });
    } catch {
      this.afficherToast('❌ Impossible de copier l\'image', 'erreur');
    }
  }

  /* ===== DÉSACTIVER BOUTON ===== */
  desactiverBouton(agentId, desactiver) {
    const btn = document.getElementById(`btn-generer-${agentId}`);
    if (!btn) return;
    btn.disabled = desactiver;
    const icone = btn.querySelector('.icone-btn');
    const texte = btn.querySelector('.texte-btn');
    if (desactiver) {
      if (icone) icone.innerHTML = '<span class="spinner"></span>';
      if (texte) texte.textContent = 'Génération en cours…';
    } else {
      if (icone) icone.textContent = '✨';
      if (texte) texte.textContent = 'Générer avec l\'IA';
    }
  }

  /* ===== BANDEAU CHAÎNE CONNECTÉE ===== */
  afficherBandeauChaine(ctx) {
    const { chaine, analyse } = ctx;

    // Met à jour le nom et l'avatar dans la sidebar
    const nomEl = document.getElementById('user-nom');
    const planEl = document.getElementById('user-plan');
    const avatarEl = document.getElementById('user-avatar');

    if (nomEl) nomEl.textContent = chaine.nom;
    if (planEl) planEl.textContent = `${analyse.nicheDetectee} · ${chaine.abonnes.toLocaleString('fr-FR')} abo.`;
    if (avatarEl && chaine.avatar) {
      avatarEl.innerHTML = `<img src="${chaine.avatar}" alt="Avatar">`;
    }

    // Ajoute un badge "IA personnalisée" dans l'en-tête
    const header = document.getElementById('app-header-badge');
    if (header) {
      header.innerHTML = `<span class="badge badge-vert" title="Agents personnalisés avec les données de ta chaîne">⚡ IA personnalisée · ${chaine.nom}</span>`;
    }

    // Indique dans chaque bouton agent que le contexte est actif
    document.querySelectorAll('.agent-btn').forEach(btn => {
      const existing = btn.querySelector('.badge-ctx');
      if (!existing) {
        const badge = document.createElement('span');
        badge.className = 'badge-ctx';
        badge.title = 'Personnalisé avec ta chaîne';
        badge.style.cssText = 'width:6px;height:6px;background:var(--vert);border-radius:50%;flex-shrink:0;';
        btn.appendChild(badge);
      }
    });

    this.afficherToast(`⚡ Agents personnalisés avec "${chaine.nom}" (${ctx.topVideos.length} vidéos analysées)`, 'succes', 5000);
  }

  /* ===== TOAST NOTIFICATIONS ===== */
  afficherToast(message, type = 'info', duree = 3500) {
    const conteneur = document.getElementById('toast-conteneur');
    if (!conteneur) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    conteneur.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'glisserSortir 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duree);
  }

  /* ===== MODAL UPGRADE ===== */
  afficherModalUpgrade() {
    const modal = document.getElementById('modal-upgrade');
    if (modal) modal.classList.add('visible');
  }

  /* ===== MODAL SIGNUP (démo) ===== */
  afficherModalSignup() {
    const modal = document.getElementById('modal-signup');
    if (modal) modal.classList.add('visible');
  }

  fermerModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('visible');
  }

  /* ===== SIDEBAR MOBILE ===== */
  toggleSidebarMobile() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay-sidebar');
    const isOpen = sidebar?.classList.toggle('ouverte');
    overlay?.classList.toggle('visible');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  fermerSidebarMobile() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay-sidebar');
    if (window.innerWidth <= 900) {
      sidebar?.classList.remove('ouverte');
      overlay?.classList.remove('visible');
      document.body.style.overflow = '';
    }
  }

  afficherHistorique() {
    this.afficherDashboard();
    // Sur mobile, switcher sur l'onglet Historique
    setTimeout(() => {
      if (window.innerWidth <= 640 && typeof dashTab === 'function') dashTab('historique');
    }, 50);
    this.fermerSidebarMobile();
  }

  /* ===== TABLEAU DE BORD ===== */
  afficherDashboard() {
    document.querySelectorAll('.panneau-agent').forEach(p => p.classList.remove('actif'));
    document.querySelectorAll('.agent-btn').forEach(b => b.classList.remove('actif'));
    const dash = document.getElementById('panneau-dashboard');
    if (dash) {
      dash.style.display = '';
      dash.classList.remove('split-mode');
    }
    const workspace = document.getElementById('workspace');
    if (workspace) {
      workspace.classList.remove('mode-split');
      workspace.style.gridTemplateColumns = '';
    }
    const wsResizer = document.getElementById('workspace-resizer');
    if (wsResizer) wsResizer.style.display = 'none';
    const btnDash = document.getElementById('btn-dashboard');
    if (btnDash) btnDash.classList.add('actif');
    const headerTitre = document.getElementById('header-titre');
    if (headerTitre) headerTitre.innerHTML = '<span class="header-icone-svg"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></span> Tableau de bord';
    this.mettreAJourDashboard();
    this.fermerSidebarMobile();
  }

  mettreAJourDashboard() {
    this._dashMettreAJourPlan();
    this._dashMettreAJourAgents();
    this._dashMettreAJourStats();
    this._dashMettreAJourHistorique();
    this._dashMettreAJourChaine();

    const gens = this.getGenerations();

    // Affiliation après 3 générations
    const affilBloc = document.getElementById('dash-affiliation-bloc');
    if (affilBloc) affilBloc.style.display = gens >= 3 ? '' : 'none';

    // Stats compactes dans plan card
    const statsCompact = document.getElementById('dash-stats-compact');
    if (statsCompact) statsCompact.style.display = gens > 0 ? '' : 'none';

    // Greeting personnalisé
    const greetingEl = document.getElementById('dash-greeting');
    if (greetingEl) {
      const user = this.getUtilisateur();
      const nom = user?.nom || (user?.email && user.email !== 'demo@creatis.fr' ? user.email.split('@')[0] : '');
      const heure = new Date().getHours();
      const salut = heure < 18 ? 'Bonjour' : 'Bonsoir';
      greetingEl.textContent = nom ? `${salut} ${nom}` : salut;
    }

    // Date en haut à droite
    const dateEl = document.getElementById('dash-header-date');
    if (dateEl) {
      const now = new Date();
      const opts = { weekday: 'long', day: 'numeric', month: 'long' };
      dateEl.textContent = now.toLocaleDateString('fr-FR', opts);
    }

    // KPI quota restant
    const kpiQuota = document.getElementById('dash-kpi-quota');
    const kpiPlanLbl = document.getElementById('dash-kpi-plan-lbl');
    if (kpiQuota) {
      const user = this.getUtilisateur();
      const plan = user?.plan || 'gratuit';
      const planCfg = CONFIG.PLANS[plan] || CONFIG.PLANS.gratuit;
      if (plan !== 'gratuit') {
        kpiQuota.textContent = '∞';
        if (kpiPlanLbl) kpiPlanLbl.textContent = 'générations illimitées';
      } else {
        const restant = Math.max(0, planCfg.generations - gens);
        kpiQuota.textContent = restant;
        if (kpiPlanLbl) kpiPlanLbl.textContent = `sur ${planCfg.generations} gratuites`;
      }
    }

    // AI tip selon contexte
    const tipEl = document.getElementById('dash-ai-tip');
    if (tipEl) {
      if (gens === 0) {
        tipEl.textContent = 'Lance ton premier agent pour créer script, titres et description YouTube en 30 secondes.';
      } else if (gens < 5) {
        tipEl.textContent = `${gens} génération${gens > 1 ? 's' : ''} effectuée${gens > 1 ? 's' : ''} — continue, chaque vidéo optimisée compte !`;
      } else {
        tipEl.textContent = `${gens} générations — tu es sur la bonne voie. Essaie l'agent Prospection Sponsors !`;
      }
    }

    // Initialiser la sphère animée (une seule fois)
    if (!this._sphereInit) {
      this._sphereInit = true;
      requestAnimationFrame(() => this._initAISphere());
    }
  }

  _initAISphere() {
    const canvas = document.getElementById('ai-sphere-canvas');
    if (canvas) this._animerSphere(canvas, 72, 200);
  }


  _initWorkspaceResizer() {
    this._wsResizerInited = true;
    const resizer = document.getElementById('workspace-resizer');
    if (!resizer) return;
    let startX, startW;
    const onMove = (e) => {
      const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const dx = x - startX;
      const ws = document.getElementById('workspace');
      if (!ws) return;
      const maxW = ws.offsetWidth - 212;
      const newW = Math.min(maxW, Math.max(260, startW + dx));
      ws.style.gridTemplateColumns = `${newW}px 6px 1fr`;
      localStorage.setItem('creatis_workspace_split', newW);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    resizer.addEventListener('mousedown', (e) => {
      const ws = document.getElementById('workspace');
      if (!ws) return;
      startX = e.clientX;
      startW = parseInt(ws.style.gridTemplateColumns) || parseInt(localStorage.getItem('creatis_workspace_split') || '360', 10);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      e.preventDefault();
    });
  }

  _animerSphere(canvas, R = 60, size = 160) {
    if (!canvas || canvas._sphereRunning) return;
    canvas._sphereRunning = true;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const N = R > 60 ? 220 : 160;
    let angle = 0;
    let alive = true;

    const pts = Array.from({ length: N }, () => {
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      return {
        x: R * Math.sin(phi) * Math.cos(theta),
        y: R * Math.sin(phi) * Math.sin(theta),
        z: R * Math.cos(phi),
        r: Math.random() * 1.5 + 0.4
      };
    });

    // Stop animation when canvas leaves the DOM
    const observer = new IntersectionObserver(entries => {
      alive = entries[0].isIntersecting;
      if (alive) loop();
    }, { threshold: 0 });
    observer.observe(canvas);

    const loop = () => {
      if (!alive || !canvas.isConnected) { observer.disconnect(); return; }
      ctx.clearRect(0, 0, W, H);
      angle += 0.006;
      const cosA = Math.cos(angle), sinA = Math.sin(angle);
      const cosB = Math.cos(angle * 0.35), sinB = Math.sin(angle * 0.35);

      const projected = pts.map(p => {
        const x1 = p.x * cosA + p.z * sinA;
        const z1 = -p.x * sinA + p.z * cosA;
        const y1 = p.y * cosB - z1 * sinB;
        const z2 = p.y * sinB + z1 * cosB;
        const depth = (z2 + R * 1.2) / (R * 2.4);
        return { sx: cx + x1, sy: cy + y1, depth, r: p.r * depth };
      }).sort((a, b) => a.depth - b.depth);

      projected.forEach(p => {
        const alpha = Math.max(0.06, p.depth * 0.85);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, Math.max(0.3, p.r), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16,185,129,${alpha.toFixed(2)})`;
        ctx.fill();
      });

      const grad = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R * 1.05);
      grad.addColorStop(0, 'rgba(16,185,129,0)');
      grad.addColorStop(1, 'rgba(16,185,129,0.05)');
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.05, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      requestAnimationFrame(loop);
    };

    loop();
  }

  _dashMettreAJourStats() {
    const totalGen = this.getGenerations();
    const hist = this._getHistorique();
    const agentsDistincts = new Set(hist.map(h => h.agentId)).size;
    const joursDistincts = new Set(hist.map(h => new Date(h.date).toDateString())).size;

    // KPI cards (grands chiffres en haut)
    const elGen = document.getElementById('stat-generations');
    if (elGen) elGen.textContent = totalGen.toLocaleString('fr-FR');

    const elAgents = document.getElementById('stat-agents');
    if (elAgents) elAgents.textContent = `${agentsDistincts}/${AGENTS.length}`;

    const elStreak = document.getElementById('stat-streak');
    if (elStreak) elStreak.textContent = joursDistincts || 0;

    // Sous-titre KPI générations
    const subGen = document.getElementById('dash-kpi-gen-sub');
    if (subGen) {
      if (totalGen === 0) subGen.textContent = 'Lance ton premier agent →';
      else if (totalGen === 1) subGen.textContent = '1ère génération effectuée !';
      else subGen.textContent = `+${totalGen} depuis le début`;
    }

    // Stats mini dans plan card
    const elGenC = document.getElementById('stat-gen-compact');
    if (elGenC) elGenC.textContent = totalGen;
    const elAgC = document.getElementById('stat-agents-compact');
    if (elAgC) elAgC.textContent = `${agentsDistincts}/${AGENTS.length}`;
    const elStrC = document.getElementById('stat-streak-compact');
    if (elStrC) elStrC.textContent = `${joursDistincts || 0}j`;
  }

  _dashMettreAJourPlan() {
    const user = this.getUtilisateur();
    const plan = user?.plan || 'gratuit';
    const planConfig = CONFIG.PLANS[plan] || CONFIG.PLANS.gratuit;
    const badge = document.getElementById('dash-plan-badge');
    const desc = document.getElementById('dash-plan-desc');
    const upgradeBtn = document.getElementById('dash-upgrade-btn');
    if (badge) badge.textContent = planConfig.nom;
    if (desc) desc.textContent = planConfig.description;
    if (upgradeBtn) upgradeBtn.style.display = (plan === 'studio') ? 'none' : '';

    if (plan === 'gratuit') {
      const count = this.getGenerations();
      const max = CONFIG.PLANS.gratuit.generations;
      const quotaVal = document.getElementById('dash-quota-val');
      const quotaBar = document.getElementById('dash-quota-remplie');
      if (quotaVal) quotaVal.textContent = `${count}/${max}`;
      if (quotaBar) quotaBar.style.width = `${Math.min(100, (count / max) * 100)}%`;
    } else {
      const quotaZone = document.getElementById('dash-quota-zone');
      if (quotaZone) quotaZone.style.display = 'none';
    }

    const miniZone = document.getElementById('dash-miniatures-quota');
    if (miniZone && planConfig.miniatures > 0) {
      miniZone.style.display = '';
      const used = parseInt(localStorage.getItem('creatis_miniatures_mois') || '0');
      const max = planConfig.miniatures;
      document.getElementById('dash-miniatures-val').textContent = `${used}/${max}`;
      document.getElementById('dash-miniatures-remplie').style.width = `${Math.min(100, (used / max) * 100)}%`;
    }
  }

  _dashMettreAJourAgents() {
    const grid = document.getElementById('dash-agents-grid');
    if (!grid) return;
    const user = this.getUtilisateur();
    const plan = user?.plan || 'gratuit';
    const agentsAutorisés = CONFIG.PLANS[plan]?.agents || CONFIG.PLANS.gratuit.agents;
    const hasLocked = AGENTS.some(a => !(agentsAutorisés === 'tous' || agentsAutorisés.includes(a.id)));

    grid.innerHTML = AGENTS.map(agent => {
      const actif = agentsAutorisés === 'tous' || agentsAutorisés.includes(agent.id);
      const featured = agent.id === 'youtube-complet';
      const onClick = actif
        ? `app.selectionnerAgent('${agent.id}')`
        : `document.getElementById('modal-upgrade').classList.add('visible')`;
      return `<button class="dash-agent-btn${actif ? '' : ' dash-agent-locked'}${featured ? ' dash-agent-featured' : ''}"
        onclick="${onClick}">
        <div class="dash-agent-content">
          <div class="dash-agent-icone">${agent.icone}</div>
          <div class="dash-agent-nom">${agent.nom}</div>
          <div class="dash-agent-desc">${agent.description}</div>
        </div>
        <div class="dash-agent-footer">
          ${actif
            ? `<span class="dash-agent-cta">Utiliser <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>`
            : `<span class="dash-agent-lock-lbl"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Pro</span>`}
        </div>
      </button>`;
    }).join('');

    const hint = document.getElementById('dash-pro-hint');
    if (hint) hint.style.display = (plan === 'gratuit' && hasLocked) ? '' : 'none';
  }

  _dashMettreAJourHistorique() {
    const zone = document.getElementById('dash-historique');
    if (!zone) return;

    const _render = (hist) => {
      if (!hist.length) {
        zone.innerHTML = '<p class="dash-vide-msg">Aucune génération pour l\'instant — lance un agent !</p>';
        return;
      }
      zone.innerHTML = hist.slice(0, 8).map((h, i) => `
        <div class="dash-hist-item" onclick="app.restaurerGeneration(${i})" style="cursor:pointer">
          ${h.imageUrl
            ? `<img src="${h.imageUrl}" style="width:48px;height:27px;object-fit:cover;border-radius:4px;flex-shrink:0" loading="lazy">`
            : `<span class="dash-hist-icone">${(AGENTS.find(a => a.id === (h.agentId || h.agent_id))?.icone) || h.icone || ''}</span>`}
          <div class="dash-hist-info">
            <span class="dash-hist-agent">${h.agentNom || h.agent_nom || 'Agent'}</span>
            <span class="dash-hist-sujet">${h.sujet || '—'}</span>
          </div>
          <span class="dash-hist-date">${h.dateRel || this._dateRel(new Date(h.created_at).getTime())}</span>
        </div>`).join('');
    };

    // Afficher d'abord localStorage (immédiat)
    const local = this._getHistorique();
    _render(local);

    // Puis tenter de charger depuis Supabase (persistant, multi-device)
    const user = this.getUtilisateur();
    if (user?.email && user.email !== 'demo@creatis.fr') {
      const token = (typeof Auth !== 'undefined') ? Auth.getToken() : null;
      fetch('/api/user-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ userId: user.id, email: user.email, action: 'get_history' })
      }).then(r => r.ok ? r.json() : null).then(data => {
        if (!data?.history?.length) return;
        // Fusionner Supabase + localStorage (Supabase = source de vérité)
        _render(data.history);
      }).catch(() => {});
    }
  }

  _dashMettreAJourChaine() {
    const user = this.getUtilisateur();

    // Cas 1 : Données issues du fetch auto (analyserChaine) ou de l'OAuth
    const ctxCache = (() => { try { return JSON.parse(localStorage.getItem('creatis_yt_context') || 'null'); } catch { return null; } })();
    const chaineYT = ctxCache?.chaine || user?.chaine;

    if (chaineYT?.nom) {
      document.getElementById('dash-chaine-connectee').style.display = '';
      document.getElementById('dash-chaine-deconnectee').style.display = 'none';
      const avatarEl = document.getElementById('dash-avatar');
      if (avatarEl) {
        if (chaineYT.avatar) {
          avatarEl.src = chaineYT.avatar;
          avatarEl.onerror = () => { avatarEl.style.display = 'none'; };
        } else {
          avatarEl.style.display = 'none';
        }
      }
      const nomEl = document.getElementById('dash-chaine-nom');
      if (nomEl) nomEl.textContent = chaineYT.nom;
      const statsEl = document.getElementById('dash-chaine-stats');
      if (statsEl) {
        const sourceLabel = ctxCache ? '⚡ Données YouTube' : '✏️ Profil manuel';
        statsEl.textContent = `${(chaineYT.abonnes || 0).toLocaleString('fr-FR')} abonnés · ${(chaineYT.videos || 0)} vidéos · ${sourceLabel}`;
      }
      this._dashMettreAJourSuggestions(chaineYT);
      return;
    }

    // Cas 2 : Rien de connecté — afficher le formulaire
    document.getElementById('dash-chaine-connectee').style.display = 'none';
    document.getElementById('dash-chaine-deconnectee').style.display = '';

    try {
      const profil = JSON.parse(localStorage.getItem('creatis_chaine_manuelle') || '{}');

      // Pré-remplir les champs du formulaire
      const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
      set('profil-nom', profil.nom);
      set('profil-niche', profil.niche);
      set('profil-abonnes', profil.abonnes);
      set('profil-ton', profil.ton);
      set('profil-audience', profil.audience);
      set('profil-videos', profil.videos);

      // Si un profil est déjà sauvegardé, montrer un badge de confirmation
      if (profil.nom) {
        const msg = document.getElementById('profil-sauvegarde-msg');
        if (msg) {
          msg.textContent = `✅ Profil actif — agents personnalisés pour "${profil.nom}"`;
          msg.style.color = 'var(--vert)';
        }
        this._dashMettreAJourSuggestions(profil);
      }
    } catch { /* ignore */ }
  }

  async analyserChaine() {
    const input = document.getElementById('profil-handle')?.value.trim();
    if (!input) {
      this.afficherToast('❌ Entre l\'URL ou le @handle de ta chaîne', 'erreur');
      document.getElementById('profil-handle')?.focus();
      return;
    }

    const btn = document.getElementById('btn-analyser');
    const btnTexte = document.getElementById('btn-analyser-texte');
    const hint = document.getElementById('dash-analyse-hint');
    const msg = document.getElementById('profil-sauvegarde-msg');

    if (btn) btn.disabled = true;
    if (btnTexte) btnTexte.innerHTML = '<span class="spinner"></span> Analyse…';
    if (hint) hint.textContent = 'Récupération des données en cours…';
    if (msg) msg.textContent = '';

    try {
      const token = (typeof Auth !== 'undefined') ? Auth.getToken() : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/youtube', {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: 'channel', input })
      });

      const data = await res.json();

      if (!res.ok) {
        // API key non configurée → basculer en mode manuel
        if (res.status === 503) {
          if (hint) hint.innerHTML = '⚠️ Analyse auto non disponible — <strong>YOUTUBE_API_KEY</strong> manquante dans Vercel. Renseigne ta chaîne manuellement ci-dessous.';
          document.querySelector('.dash-manuel-details')?.setAttribute('open', '');
          return;
        }
        throw new Error(data.error || `Erreur ${res.status}`);
      }

      // Sauvegarder les données récupérées
      localStorage.setItem('creatis_yt_context', JSON.stringify(data));

      // Mettre à jour l'utilisateur
      const user = this.getUtilisateur() || {};
      user.chaine = data.chaine;
      user.avatar = user.avatar || data.chaine.avatar;
      this.setUtilisateur(user);

      // Rafraîchir le dashboard
      this.mettreAJourDashboard();
      this.afficherBandeauChaine(data);
      this.afficherUtilisateur();

      const abo = data.chaine.abonnes.toLocaleString('fr-FR');
      this.afficherToast(`⚡ "${data.chaine.nom}" analysée — ${abo} abonnés, niche : ${data.analyse.nicheDetectee}`, 'succes', 5000);

    } catch (err) {
      if (hint) hint.textContent = `❌ ${err.message}`;
      this.afficherToast(`❌ ${err.message}`, 'erreur');
    } finally {
      if (btn) btn.disabled = false;
      if (btnTexte) btnTexte.textContent = 'Analyser →';
    }
  }

  sauvegarderProfilChaine() {
    const val = id => document.getElementById(id)?.value.trim() || '';
    const nom = val('profil-nom');
    if (!nom) {
      this.afficherToast('❌ Le nom de la chaîne est requis', 'erreur');
      document.getElementById('profil-nom')?.focus();
      return;
    }

    const profil = {
      nom,
      niche: val('profil-niche'),
      abonnes: val('profil-abonnes'),
      ton: val('profil-ton'),
      audience: val('profil-audience'),
      videos: val('profil-videos')
    };

    localStorage.setItem('creatis_chaine_manuelle', JSON.stringify(profil));

    const msg = document.getElementById('profil-sauvegarde-msg');
    if (msg) {
      msg.textContent = `✅ Profil actif — agents personnalisés pour "${nom}"`;
      msg.style.color = 'var(--vert)';
    }

    // Mettre à jour les suggestions du dashboard
    this._dashMettreAJourSuggestions(profil);

    this.afficherToast(`⚡ Profil "${nom}" activé — tes agents sont maintenant personnalisés !`, 'succes', 4000);
  }

  _dashMettreAJourSuggestions(chaine) {
    const section = document.getElementById('dash-suggestions-section');
    const zone = document.getElementById('dash-suggestions');
    if (!section || !zone) return;
    section.style.display = '';
    const suggestions = [
      {
        icone: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
        texte: `Générer un script complet pour "${chaine.nom}"`, agentId: 'youtube-complet'
      },
      {
        icone: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
        texte: 'Créer un Short viral sur ta niche', agentId: 'youtube-short'
      },
      {
        icone: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
        texte: 'Générer une miniature ultra-cliquable', agentId: 'miniature-ia'
      },
      {
        icone: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/></svg>',
        texte: '30 idées de vidéos pour ce mois', agentId: 'idees-videos'
      }
    ];
    const chaineData = encodeURIComponent(JSON.stringify({ niche: chaine.niche || chaine.nicheDetectee || '', nom: chaine.nom || '', abonnes: chaine.abonnes || '', ton: chaine.ton || '' }));
    zone.innerHTML = suggestions.map(s => `
      <button class="dash-suggestion" onclick="app.selectionnerAgentSuggestion('${s.agentId}', '${chaineData}')">
        <span class="dash-suggestion-icone">${s.icone}</span>
        <span>${s.texte}</span>
      </button>`).join('');
  }

  selectionnerAgentSuggestion(agentId, chaineJson) {
    let profil = {};
    try { profil = JSON.parse(decodeURIComponent(chaineJson || '{}')); } catch { /* ignore */ }
    if (!profil.niche) {
      try { const m = JSON.parse(localStorage.getItem('creatis_chaine_manuelle') || '{}'); if (m.niche) profil = m; } catch { /* ignore */ }
    }

    this.selectionnerAgent(agentId);

    if (agentId === 'idees-videos') {
      const niche = profil.niche || profil.nom || 'YouTube';
      const infos = [
        profil.nom && `Chaîne : ${profil.nom}`,
        profil.abonnes && `${profil.abonnes} abonnés`,
        profil.ton && `Ton : ${profil.ton}`
      ].filter(Boolean).join(', ');
      const donnees = { niche, infos_chaine: infos, type_contenu: 'Mix varié', objectif: 'Gagner des abonnés rapidement' };
      setTimeout(() => this._genererDirectement(agentId, donnees), 200);
      return;
    }

    setTimeout(() => {
      const set = (fieldId, val) => {
        const el = document.getElementById(`champ-${agentId}-${fieldId}`);
        if (el && val) el.value = val;
      };
      if (profil.niche) set('niche', profil.niche);
      const infos = [
        profil.nom && `Chaîne : ${profil.nom}`,
        profil.abonnes && `${profil.abonnes} abonnés`,
        profil.ton && `Ton : ${profil.ton}`
      ].filter(Boolean).join(', ');
      if (infos) set('infos_chaine', infos);
    }, 200);
  }

  async _genererDirectement(agentId, donnees) {
    const agent = AGENTS.find(a => a.id === agentId);
    if (!agent || this.enChargement) return;
    const user = this.getUtilisateur();
    if (user?.plan === 'gratuit' && this.getGenerations() >= CONFIG.PLANS.gratuit.generations) { this.afficherModalUpgrade(); return; }
    if (!CONFIG.estConfigured()) { this.afficherToast('⚠️ Clé API Groq manquante', 'erreur'); return; }
    this.enChargement = true;
    this.afficherChargement(agentId, true);
    this.desactiverBouton(agentId, true);
    try {
      const contexteYT = (typeof YouTubeContext !== 'undefined') ? YouTubeContext.getContexte(agentId) : '';
      const prompt = agent.construirePrompt(donnees, contexteYT);
      const resultat = await this.appelGroq(prompt);
      this.afficherTexte(agentId, resultat);
      this.incrementerGenerations();
      this._sauvegarderHistorique(agent, donnees, resultat);
      if (user?.demo) localStorage.setItem('creatis_demo_count', (parseInt(localStorage.getItem('creatis_demo_count') || '0') + 1).toString());
    } catch (err) {
      this.afficherToast('❌ ' + err.message, 'erreur');
    } finally {
      this.enChargement = false;
      this.afficherChargement(agentId, false);
      this.desactiverBouton(agentId, false);
    }
  }

  _sauvegarderHistorique(agent, donnees, resultat = null) {
    const hist = this._getHistorique();
    const sujet = donnees.sujet || donnees.titre || donnees.sujet_video || donnees.niche || donnees.marque
      || donnees.description
      || (donnees.url_video ? `Vidéo : ${donnees.url_video.replace(/.*[?&]v=/, '').substring(0, 20)}` : null)
      || '—';

    // Pour les miniatures : garder l'imageUrl. Pour le texte : garder les 8000 premiers chars.
    const estMiniature = agent.type === 'miniature';
    const entry = {
      agentId: agent.id,
      agentNom: agent.nom,
      icone: agent.icone,
      sujet: sujet.substring(0, 60),
      date: Date.now(),
      dateRel: 'À l\'instant',
      donnees,
      ...(estMiniature && resultat ? { imageUrl: resultat } : {}),
      ...(!estMiniature && resultat ? { contenu: typeof resultat === 'string' ? resultat.substring(0, 8000) : null } : {})
    };
    hist.unshift(entry);
    localStorage.setItem('creatis_historique', JSON.stringify(hist.slice(0, 50)));

    // Sync non-bloquant vers Supabase
    const user = this.getUtilisateur();
    if (user?.email) {
      const token = (typeof Auth !== 'undefined') ? Auth.getToken() : null;
      fetch('/api/user-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          action: 'increment_generation',
          metadata: { agentId: agent.id, agentNom: agent.nom, sujet: entry.sujet }
        })
      }).then(r => r.json()).then(data => {
        // Mettre à jour le compteur localStorage avec la valeur serveur
        if (data.count) localStorage.setItem('creatis_generations', data.count.toString());
      }).catch(() => {});
    }
  }

  _getHistorique() {
    try {
      const h = JSON.parse(localStorage.getItem('creatis_historique') || '[]');
      return h.map(item => ({
        ...item,
        dateRel: this._dateRel(item.date)
      }));
    } catch { return []; }
  }

  _dateRel(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'À l\'instant';
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`;
    return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  /* ===== TOGETHER AI — via proxy sécurisé /api/generate-image ===== */
  async appelTogetherAI(prompt, format = '16:9') {
    const isShort = (format || '').includes('9:16');
    const width = isShort ? 720 : 1280;
    const height = isShort ? 1280 : 720;
    const headers = { 'Content-Type': 'application/json' };
    const token = (typeof Auth !== 'undefined') ? Auth.getToken() : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(CONFIG.TOGETHER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt, width, height, steps: 4, n: 1 })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 429) throw new Error('Quota image dépassé — réessaie dans quelques instants');
      throw new Error(err.error || `Erreur génération image (${response.status})`);
    }
    const data = await response.json();
    const url = data.data?.[0]?.url;
    if (url) return url;
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error('Aucune image retournée');
    return `data:image/png;base64,${b64}`;
  }

  /* ===== CANVAS PERSONNE — place la photo (fond transparent) à droite ===== */
  async _preparerCanvasPersonne(photoDataUrl) {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    // Fond transparent par défaut (pas de fillRect)
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Impossible de charger la photo'));
      img.src = photoDataUrl;
    });
    // Personne : droite de l'image, calée en bas, prend 45% de la largeur
    const targetW = canvas.width * 0.45;
    const scale = Math.min(targetW / img.width, canvas.height / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = canvas.width - w;
    const y = canvas.height - h;
    ctx.drawImage(img, x, y, w, h);
    return canvas.toDataURL('image/png');
  }

  /* ===== IMAGE EDIT — OpenAI génère le fond autour de la personne ===== */
  async appelImageEdit(prompt, imageB64) {
    const headers = { 'Content-Type': 'application/json' };
    const token = (typeof Auth !== 'undefined') ? Auth.getToken() : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers,
      body: JSON.stringify({ mode: 'edit', prompt, image_b64: imageB64 })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Erreur édition image (${response.status})`);
    }
    const data = await response.json();
    const url = data.data?.[0]?.url;
    if (url) return url;
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error('Réponse image invalide du serveur');
    return `data:image/jpeg;base64,${b64}`;
  }

  /* ===== MINIATURE PRO — AFFICHAGE SANDWICH ===== */
  afficherMiniaturePro(agentId, imageUrl, donnees) {
    this.resultatsActuels = imageUrl;
    const conteneur = document.getElementById(`contenu-${agentId}`);
    const texteEl = document.getElementById(`texte-${agentId}`);
    const vide = document.querySelector(`#resultats-${agentId} .resultats-vide`);
    if (vide) vide.style.display = 'none';

    const isShort = (donnees.format || '').includes('9:16');
    const resLabel = isShort ? '720×1280' : '1280×720';
    const canvasExtraClass = isShort ? ' miniature-canvas-short' : '';

    const couleurTexteDef = {
      'Jaune (#FFD700)': '#FFD700',
      'Blanc (#FFFFFF)': '#FFFFFF',
      'Rouge (#FF0000)': '#FF0000',
      'Orange (#FF6B00)': '#FF6B00',
      'Vert (#00FF00)': '#00FF00'
    };
    const couleurKey = Object.keys(couleurTexteDef).find(k => (donnees.couleur_texte || '').includes(k.split(' ')[0]));
    const couleur1 = couleurTexteDef[couleurKey] || '#FFD700';

    const t1 = (donnees.texte_overlay || '').toUpperCase();
    const t2 = (donnees.texte_overlay2 || '').toUpperCase();

    if (texteEl) {
      texteEl.innerHTML = `
        <div class="miniature-studio" id="mstudio-${agentId}">
          <div class="miniature-preview-wrap">
            <div class="miniature-canvas${canvasExtraClass}" id="mcanvas-${agentId}">
              <img src="${imageUrl}" class="miniature-fond-img" id="mfond-${agentId}" crossorigin="anonymous">
              <div class="miniature-overlay-layer" id="moverlay-${agentId}">
                <div class="overlay-text overlay-text-1" id="mot1-${agentId}"
                     contenteditable="true" spellcheck="false"
                     style="color:${couleur1};font-size:72px;text-shadow:-3px -3px 0 #000,3px -3px 0 #000,-3px 3px 0 #000,3px 3px 0 #000,-5px 0 0 #000,5px 0 0 #000,0 -5px 0 #000,0 5px 0 #000;"
                     data-size="72" data-color="${couleur1}">${t1}</div>
                ${t2 ? `<div class="overlay-text overlay-text-2" id="mot2-${agentId}"
                     contenteditable="true" spellcheck="false"
                     style="color:#FFFFFF;font-size:52px;text-shadow:-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,2px 2px 0 #000,-4px 0 0 #000,4px 0 0 #000,0 -4px 0 #000,0 4px 0 #000;"
                     data-size="52" data-color="#FFFFFF">${t2}</div>` : `<div class="overlay-text overlay-text-2" id="mot2-${agentId}"
                     contenteditable="true" spellcheck="false"
                     style="color:#FFFFFF;font-size:52px;text-shadow:-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,2px 2px 0 #000;"
                     data-size="52" data-color="#FFFFFF" data-placeholder="Texte ligne 2..."></div>`}
              </div>
            </div>
          </div>
          <div class="miniature-controls-panel">
            <div class="mc-row">
              <button class="btn-primaire btn-sm" onclick="app.telechargerMiniaturePro('${agentId}')">⬇️ Télécharger ${resLabel}</button>
              <button class="btn-ghost btn-sm" onclick="app.regenererFond('${agentId}')">🔄 Régénérer le fond</button>
            </div>
            <div class="mc-grid">
              <div class="mc-control">
                <label>Couleur texte 1</label>
                <input type="color" value="${couleur1}" oninput="app.changerCouleurOverlay('${agentId}',1,this.value)">
              </div>
              <div class="mc-control">
                <label>Couleur texte 2</label>
                <input type="color" value="#FFFFFF" oninput="app.changerCouleurOverlay('${agentId}',2,this.value)">
              </div>
              <div class="mc-control mc-control-wide">
                <label>Taille texte 1 — <span id="sz1val-${agentId}">72px</span></label>
                <input type="range" min="24" max="130" value="72" oninput="app.changerTailleOverlay('${agentId}',1,this.value)">
              </div>
              <div class="mc-control mc-control-wide">
                <label>Taille texte 2 — <span id="sz2val-${agentId}">52px</span></label>
                <input type="range" min="16" max="100" value="52" oninput="app.changerTailleOverlay('${agentId}',2,this.value)">
              </div>
            </div>
            <p style="font-size:11px;color:var(--texte-muted);margin-top:8px;">✏️ Clique sur les textes pour les modifier directement</p>
          </div>
        </div>`;
    }
    if (conteneur) conteneur.classList.add('visible');
  }

  async telechargerMiniaturePro(agentId) {
    const panneau = document.getElementById(`panneau-${agentId}`);
    const isShort = (panneau?.dataset.format || '').includes('9:16');
    const W = isShort ? 720 : 1280;
    const H = isShort ? 1280 : 720;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const loadImg = (src) => new Promise((res, rej) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });

    const fondEl = document.getElementById(`mfond-${agentId}`);
    if (fondEl?.src) {
      try { const img = await loadImg(fondEl.src); ctx.drawImage(img, 0, 0, W, H); } catch {}
    }

    const createurEl = document.getElementById(`mcreateur-${agentId}`);
    if (createurEl?.src) {
      try {
        const img = await loadImg(createurEl.src);
        const ratio = img.naturalHeight / img.naturalWidth;
        if (isShort) {
          const w = Math.round(W * 0.8), h = w * ratio;
          ctx.drawImage(img, (W - w) / 2, H - h - 40, w, h);
        } else {
          const h = 640, w = h / ratio;
          ctx.drawImage(img, W - w - 30, (H - h) / 2, w, h);
        }
      } catch {}
    }

    const drawText = (elId, y) => {
      const el = document.getElementById(elId);
      if (!el) return;
      const text = el.textContent.trim();
      if (!text) return;
      const size = parseInt(el.dataset.size || '72');
      const color = el.dataset.color || '#FFD700';
      ctx.font = `900 ${size}px Impact, "Arial Black", sans-serif`;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = Math.max(4, size / 9);
      ctx.lineJoin = 'round';
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.strokeText(text, 40, y);
      ctx.fillText(text, 40, y);
    };

    const y1 = isShort ? Math.round(H * 0.75) : 200;
    const y2 = isShort ? Math.round(H * 0.75) + 90 : 290;
    drawText(`mot1-${agentId}`, y1);
    drawText(`mot2-${agentId}`, y2);

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `miniature-creatis-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      this.afficherToast(`⬇️ Miniature téléchargée en ${W}×${H} !`, 'succes');
    }, 'image/png');
  }

  async copierMiniaturePro(agentId) {
    try {
      const panneau = document.getElementById(`panneau-${agentId}`);
      const isShort = (panneau?.dataset.format || '').includes('9:16');
      const W = isShort ? 720 : 1280;
      const H = isShort ? 1280 : 720;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      const loadImg = (src) => new Promise((res, rej) => {
        const img = new Image(); img.crossOrigin = 'anonymous';
        img.onload = () => res(img); img.onerror = rej; img.src = src;
      });
      const fondEl = document.getElementById(`mfond-${agentId}`);
      if (fondEl?.src) { try { const img = await loadImg(fondEl.src); ctx.drawImage(img, 0, 0, W, H); } catch {} }
      const createurEl = document.getElementById(`mcreateur-${agentId}`);
      if (createurEl?.src) {
        try {
          const img = await loadImg(createurEl.src);
          const ratio = img.naturalHeight / img.naturalWidth;
          if (isShort) {
            const w = Math.round(W * 0.8), h = w * ratio;
            ctx.drawImage(img, (W - w) / 2, H - h - 40, w, h);
          } else {
            const h = 640, w = h / ratio;
            ctx.drawImage(img, W - w - 30, (H - h) / 2, w, h);
          }
        } catch {}
      }
      const drawText = (elId, y) => {
        const el = document.getElementById(elId); if (!el) return;
        const text = el.textContent.trim(); if (!text) return;
        const size = parseInt(el.dataset.size || '72');
        const color = el.dataset.color || '#FFD700';
        ctx.font = `900 ${size}px Impact, "Arial Black", sans-serif`;
        ctx.strokeStyle = '#000'; ctx.lineWidth = Math.max(4, size / 9);
        ctx.lineJoin = 'round'; ctx.fillStyle = color; ctx.textAlign = 'left';
        ctx.strokeText(text, 40, y); ctx.fillText(text, 40, y);
      };
      const y1 = isShort ? Math.round(H * 0.75) : 200;
      const y2 = isShort ? Math.round(H * 0.75) + 90 : 290;
      drawText(`mot1-${agentId}`, y1); drawText(`mot2-${agentId}`, y2);
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          this.afficherToast('📋 Miniature copiée !', 'succes');
        } catch { this.afficherToast('❌ Impossible de copier (autorisations navigateur)', 'erreur'); }
      }, 'image/png');
    } catch { this.afficherToast('❌ Erreur lors de la copie', 'erreur'); }
  }

  async regenererFond(agentId) {
    const panneau = document.getElementById(`panneau-${agentId}`);
    const prompt = panneau?.dataset.prompt;
    if (!prompt) { this.afficherToast('❌ Lance d\'abord une génération', 'erreur'); return; }
    this.afficherToast('🔄 Régénération du fond en cours…', 'info', 8000);
    try {
      const format = panneau?.dataset.format || '16:9';
      const imageUrl = await this.appelTogetherAI(prompt, format);
      const fondEl = document.getElementById(`mfond-${agentId}`);
      if (fondEl) fondEl.src = imageUrl;
      this.afficherToast('✅ Nouveau fond généré !', 'succes');
    } catch (e) {
      this.afficherToast(`❌ ${e.message}`, 'erreur');
    }
  }

  changerCouleurOverlay(agentId, ligne, couleur) {
    const el = document.getElementById(`mot${ligne}-${agentId}`);
    if (!el) return;
    el.dataset.color = couleur;
    const size = el.dataset.size || (ligne === 1 ? '72' : '52');
    const s = parseInt(size);
    el.style.color = couleur;
    if (ligne === 1) {
      el.style.textShadow = `-3px -3px 0 #000,3px -3px 0 #000,-3px 3px 0 #000,3px 3px 0 #000,-${Math.max(3,s/18)}px 0 0 #000,${Math.max(3,s/18)}px 0 0 #000,0 -${Math.max(3,s/18)}px 0 #000,0 ${Math.max(3,s/18)}px 0 #000`;
    } else {
      el.style.textShadow = `-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,2px 2px 0 #000`;
    }
  }

  changerTailleOverlay(agentId, ligne, taille) {
    const el = document.getElementById(`mot${ligne}-${agentId}`);
    const valEl = document.getElementById(`sz${ligne}val-${agentId}`);
    if (!el) return;
    el.dataset.size = taille;
    el.style.fontSize = `${taille}px`;
    if (valEl) valEl.textContent = `${taille}px`;
  }

  changerPhotoCreateur(agentId, input) {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this._setPhotoCreateur(agentId, e.target.result);
      const ctrl = document.getElementById(`removebg-ctrl-${agentId}`);
      if (ctrl) ctrl.style.display = '';
      // Auto-déclencher la suppression de fond
      this.supprimerFondPhoto(agentId);
    };
    reader.readAsDataURL(file);
  }

  _setPhotoCreateur(agentId, dataUrl) {
    const layer = document.getElementById(`mphoto-${agentId}`);
    const existant = document.getElementById(`mcreateur-${agentId}`);
    if (!layer) return;
    layer.style.display = '';
    if (existant) {
      existant.src = dataUrl;
    } else {
      const img = document.createElement('img');
      img.src = dataUrl;
      img.className = 'miniature-createur-img';
      img.id = `mcreateur-${agentId}`;
      img.crossOrigin = 'anonymous';
      layer.appendChild(img);
    }
  }

  async supprimerFondPhoto(agentId) {
    const img = document.getElementById(`mcreateur-${agentId}`);
    if (!img?.src) { this.afficherToast('❌ Aucune photo à traiter', 'erreur'); return; }

    const btn = document.getElementById(`btn-removebg-${agentId}`);
    if (btn) { btn.textContent = '⏳ Suppression en cours…'; btn.disabled = true; }

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'remove-bg', image: img.src })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur API');
      this._setPhotoCreateur(agentId, data.image);
      this.afficherToast('✅ Fond supprimé !', 'succes');
      if (btn) { btn.textContent = '✅ Fond supprimé'; btn.disabled = false; }
    } catch (e) {
      this.afficherToast(`❌ ${e.message}`, 'erreur');
      if (btn) { btn.textContent = '✂️ Supprimer le fond automatiquement'; btn.disabled = false; }
    }
  }

  /* ===== ÉVÉNEMENTS ===== */
  lierEvenements() {
    // Touches clavier
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-fond.visible').forEach(m => m.classList.remove('visible'));
        this.fermerSidebarMobile();
      }
    });

    // Click-outside : ferme le modal uniquement si on clique sur le fond (pas à l'intérieur)
    document.querySelectorAll('.modal-fond').forEach(fond => {
      fond.addEventListener('click', (e) => {
        if (e.target === fond) fond.classList.remove('visible');
      });
    });

    // Déconnexion — le bouton a son onclick dans app.html (Auth.deconnecter)
    // Le listener ici sert de fallback si onclick n'est pas défini
    const btnDeconnexion = document.getElementById('btn-deconnexion');
    if (btnDeconnexion && !btnDeconnexion.getAttribute('onclick')) {
      btnDeconnexion.addEventListener('click', () => {
        if (typeof Auth !== 'undefined') { Auth.deconnecter(); } else {
          localStorage.removeItem('creatis_user');
          window.location.href = 'auth.html';
        }
      });
    }
  }

  /* ===== ONBOARDING ===== */
  _afficherOnboarding() {
    const modal = document.getElementById('modal-onboarding');
    if (!modal) return;

    // Peupler les cartes agents de l'étape 3
    const conteneur = document.getElementById('onb-agents');
    if (conteneur && typeof AGENTS !== 'undefined') {
      const agentsGratuits = ['youtube-complet', 'youtube-short', 'idees-videos'];
      const descs = {
        'youtube-complet': 'Titre, description et tags optimisés',
        'youtube-short': 'Script viral pour tes Shorts',
        'idees-videos': '30 idées adaptées à ton audience'
      };
      conteneur.innerHTML = agentsGratuits.map(id => {
        const agent = AGENTS.find(a => a.id === id);
        if (!agent) return '';
        return `<button class="onb-agent-card" onclick="app._onbLancerAgent('${id}')">
          <div class="onb-agent-icone">${agent.icone}</div>
          <div>
            <div class="onb-agent-nom">${agent.nom}</div>
            <div class="onb-agent-desc">${descs[id] || ''}</div>
          </div>
        </button>`;
      }).join('');
    }

    modal.classList.add('visible');
    this._onbEtape(1);
  }

  _onbEtape(n) {
    for (let i = 1; i <= 5; i++) {
      document.getElementById(`onb-step-${i}`)?.classList.toggle('actif', i === n);
      const dot = document.getElementById(`onb-dot-${i}`);
      if (dot) dot.classList.toggle('actif', i === n);
    }
  }

  _onbTogglePlateforme(btn) {
    btn.classList.toggle('actif');
  }

  _onbSauvegarderNiche() {
    const niche = document.getElementById('onb-niche')?.value.trim();
    if (niche) {
      const user = this.getUtilisateur() || {};
      user.niche = niche;
      this.setUtilisateur(user);
      // Sync Supabase silencieux
      const userId = user.id || user.email;
      if (userId) {
        fetch(CONFIG.USER_SYNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_profile', userId, email: user.email, niche })
        }).catch(() => {});
      }
    }
    this._onbEtape(3);
  }

  _onbSauvegarderPlateformes() {
    const selected = [...document.querySelectorAll('.onb-plateforme.actif')].map(b => b.dataset.plateforme);
    if (selected.length) {
      const user = this.getUtilisateur() || {};
      user.plateformes = selected;
      this.setUtilisateur(user);
      const userId = user.id || user.email;
      if (userId) {
        fetch(CONFIG.USER_SYNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_profile', userId, email: user.email, plateformes: selected })
        }).catch(() => {});
      }
    }
    this._onbEtape(4);
  }

  async _onbAnalyser() {
    const input = document.getElementById('onb-handle')?.value.trim();
    if (!input) {
      const msg = document.getElementById('onb-msg');
      if (msg) { msg.style.color = 'var(--rouge, #ef4444)'; msg.textContent = 'Entre le @handle de ta chaîne d\'abord.'; }
      return;
    }

    const btn = document.getElementById('onb-btn-analyser');
    const btnTxt = document.getElementById('onb-btn-texte');
    const msg = document.getElementById('onb-msg');
    if (btn) btn.disabled = true;
    if (btnTxt) btnTxt.innerHTML = '<span class="spinner"></span> Analyse…';
    if (msg) { msg.style.color = 'var(--texte-doux)'; msg.textContent = 'Récupération en cours…'; }

    try {
      const token = (typeof Auth !== 'undefined') ? Auth.getToken() : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/youtube', {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: 'channel', input })
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 503) {
          if (msg) { msg.style.color = 'var(--vert)'; msg.textContent = '✓ On continue — tu pourras connecter ta chaîne depuis l\'app.'; }
          this._onbEtape(5);
          return;
        }
        throw new Error(data.error || `Erreur ${res.status}`);
      }

      localStorage.setItem('creatis_yt_context', JSON.stringify(data));
      const user = this.getUtilisateur() || {};
      user.chaine = data.chaine;
      this.setUtilisateur(user);
      this.mettreAJourDashboard();
      this.afficherBandeauChaine(data);

      if (msg) { msg.style.color = 'var(--vert)'; msg.textContent = `✓ "${data.chaine.nom}" connectée — ${data.chaine.abonnes.toLocaleString('fr-FR')} abonnés`; }
      setTimeout(() => this._onbEtape(5), 1500);

    } catch (err) {
      if (msg) { msg.style.color = 'var(--rouge, #ef4444)'; msg.textContent = `❌ ${err.message}`; }
    } finally {
      if (btn) btn.disabled = false;
      if (btnTxt) btnTxt.textContent = 'Analyser ma chaîne';
    }
  }

  _onbLancerAgent(id) {
    this._onbTerminer(false); // false = don't auto-open (we open manually below)
    this.selectionnerAgent(id);

    const exemples = {
      'youtube-complet': { sujet: 'Comment gagner du temps avec l\'IA en 2025', niche: 'Technologie et productivité' },
      'youtube-short': { sujet: '3 astuces pour doubler ses abonnés YouTube', niche: 'Création de contenu' },
      'idees-videos': { niche: 'Technologie et productivité', style: 'Éducatif et pratique' }
    };
    const ex = exemples[id];
    if (!ex) return;

    setTimeout(() => {
      Object.entries(ex).forEach(([key, val]) => {
        const el = document.getElementById(`champ-${id}-${key}`);
        if (el && !el.value) el.value = val;
      });
    }, 300);
  }

  _onbTerminer(autoOpen = true) {
    localStorage.setItem('creatis_onboarding_done', '1');
    const modal = document.getElementById('modal-onboarding');
    if (modal) modal.classList.remove('visible');
    // Si l'utilisateur n'a pas encore généré, ouvrir youtube-complet directement
    if (autoOpen && this.getGenerations() === 0) {
      setTimeout(() => this.selectionnerAgent('youtube-complet'), 200);
    }
  }
}

/* ===== INITIALISATION ===== */
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new AppCreatis();
});
