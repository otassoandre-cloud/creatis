/* ===== RECHERCHE PROSPECTS YOUTUBE ===== */
/* Cherche des chaînes FR 1k-10k abonnés dans finance/entrepreneuriat/IA/business */

const ProspectionYT = (function() {

  // Niches cibles avec mots-clés de recherche
  const NICHES = {
    finance: {
      label: 'Finance & Investissement',
      keywords: ['investissement bourse', 'finances personnelles', 'épargne retraite', 'crypto investir', 'immobilier locatif', 'budget argent'],
      emoji: '💰',
      sponsorPotentiel: 'Élevé'
    },
    entrepreneuriat: {
      label: 'Entrepreneuriat & Business',
      keywords: ['créer entreprise', 'auto entrepreneur', 'dropshipping', 'business en ligne', 'side hustle', 'freelance'],
      emoji: '🚀',
      sponsorPotentiel: 'Très élevé'
    },
    ia: {
      label: 'Intelligence Artificielle',
      keywords: ['intelligence artificielle tutoriel', 'ChatGPT francais', 'IA productivité', 'automatisation IA', 'prompts IA'],
      emoji: '🤖',
      sponsorPotentiel: 'Très élevé'
    },
    marketing: {
      label: 'Marketing Digital',
      keywords: ['marketing digital', 'réseaux sociaux stratégie', 'personal branding', 'YouTube croissance', 'instagram croissance'],
      emoji: '📢',
      sponsorPotentiel: 'Élevé'
    },
    productivite: {
      label: 'Productivité & Lifestyle',
      keywords: ['productivité routines', 'organisation travail', 'développement personnel', 'discipline', 'focus deep work'],
      emoji: '⚡',
      sponsorPotentiel: 'Moyen'
    }
  };

  // Scoring de pertinence (0-100)
  function calculerScore(chaine) {
    let score = 50;

    // Abonnés : 1k-10k = sweet spot pour prospection
    const subs = chaine.abonnes;
    if (subs >= 2000 && subs <= 5000) score += 20;
    else if (subs >= 1000 && subs <= 2000) score += 10;
    else if (subs > 5000 && subs <= 10000) score += 15;
    else score -= 10;

    // Vues/vidéo (engagement)
    const vuesParVideo = chaine.vues_totales / Math.max(chaine.nb_videos, 1);
    if (vuesParVideo > 1000) score += 15;
    else if (vuesParVideo > 500) score += 8;

    // Fréquence de publication
    if (chaine.freq_semaine >= 1) score += 10;
    else if (chaine.freq_semaine >= 0.5) score += 5;

    // Niche à fort potentiel sponsor
    if (['entrepreneuriat', 'ia', 'finance'].includes(chaine.niche)) score += 10;

    // Email de contact disponible
    if (chaine.email_contact) score += 5;

    // Pas de sponsors actuels visibles
    if (!chaine.a_sponsors) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  // Cherche via YouTube Data API v3
  async function rechercherChaines(apiKey, niche, maxResults = 20) {
    if (!apiKey) {
      throw new Error('YouTube API Key manquante — configurez YOUTUBE_API_KEY dans config.js');
    }

    const nicheConfig = NICHES[niche];
    if (!nicheConfig) throw new Error('Niche inconnue : ' + niche);

    const resultats = [];
    const vus = new Set();

    for (const keyword of nicheConfig.keywords.slice(0, 3)) {
      try {
        // Chercher des vidéos récentes
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(keyword)}&type=video&regionCode=FR&relevanceLanguage=fr&order=viewCount&publishedAfter=${_dateIlYA(30)}&maxResults=10&key=${apiKey}`;
        const searchResp = await fetch(searchUrl);
        if (!searchResp.ok) throw new Error('YouTube API error ' + searchResp.status);
        const searchData = await searchResp.json();

        const channelIds = [...new Set(
          (searchData.items || [])
            .map(i => i.snippet.channelId)
            .filter(id => !vus.has(id))
        )];

        if (!channelIds.length) continue;
        channelIds.forEach(id => vus.add(id));

        // Récupérer les stats des chaînes
        const statsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelIds.join(',')}&key=${apiKey}`;
        const statsResp = await fetch(statsUrl);
        const statsData = await statsResp.json();

        for (const ch of (statsData.items || [])) {
          const subs = parseInt(ch.statistics.subscriberCount || 0);
          if (subs < 1000 || subs > 10000) continue;

          const chaine = {
            id: ch.id,
            nom: ch.snippet.title,
            description: ch.snippet.description?.substring(0, 200) || '',
            url: `https://youtube.com/channel/${ch.id}`,
            abonnes: subs,
            vues_totales: parseInt(ch.statistics.viewCount || 0),
            nb_videos: parseInt(ch.statistics.videoCount || 0),
            pays: ch.snippet.country || 'FR',
            niche: niche,
            niche_label: nicheConfig.label,
            niche_emoji: nicheConfig.emoji,
            date_creation: ch.snippet.publishedAt?.substring(0, 10) || '',
            avatar: ch.snippet.thumbnails?.default?.url || '',
            email_contact: _extraireEmail(ch.snippet.description),
            freq_semaine: _calculerFreq(ch.snippet.publishedAt, ch.statistics.videoCount),
            a_sponsors: _detecterSponsors(ch.snippet.description),
            sponsor_potentiel: nicheConfig.sponsorPotentiel,
            statut: 'nouveau',
            notes: '',
            date_ajout: new Date().toISOString().substring(0, 10)
          };

          chaine.score = calculerScore(chaine);
          resultats.push(chaine);
        }

        // Éviter le rate limit
        await _sleep(200);

      } catch (err) {
        console.warn('[ProspectionYT] Erreur keyword "' + keyword + '":', err.message);
      }
    }

    // Dédupliquer et trier par score
    const uniques = _dedupliquer(resultats);
    return uniques.sort((a, b) => b.score - a.score).slice(0, maxResults);
  }

  // Recherche sur toutes les niches
  async function rechercherToutes(apiKey, maxParNiche = 10) {
    const tous = [];
    for (const niche of Object.keys(NICHES)) {
      try {
        const chaines = await rechercherChaines(apiKey, niche, maxParNiche);
        tous.push(...chaines);
        await _sleep(500);
      } catch (err) {
        console.error('[ProspectionYT] Niche ' + niche + ' échec:', err.message);
      }
    }
    const uniques = _dedupliquer(tous);
    return uniques.sort((a, b) => b.score - a.score);
  }

  // Générer rapport HTML
  function genererRapportHTML(prospects) {
    const stats = {
      total: prospects.length,
      score90: prospects.filter(p => p.score >= 90).length,
      score70: prospects.filter(p => p.score >= 70 && p.score < 90).length,
      avecEmail: prospects.filter(p => p.email_contact).length,
      parNiche: {}
    };

    Object.keys(NICHES).forEach(n => {
      stats.parNiche[n] = prospects.filter(p => p.niche === n).length;
    });

    const rows = prospects.map((p, i) => `
      <tr class="prospect-row ${p.statut}" data-id="${p.id}">
        <td class="td-rank">${i + 1}</td>
        <td class="td-chaine">
          <div class="chaine-info">
            ${p.avatar ? `<img src="${p.avatar}" class="chaine-avatar" alt="">` : '<div class="chaine-avatar-placeholder"></div>'}
            <div>
              <a href="${p.url}" target="_blank" class="chaine-nom">${_esc(p.nom)}</a>
              <div class="chaine-niche">${p.niche_emoji} ${p.niche_label}</div>
            </div>
          </div>
        </td>
        <td class="td-stats">
          <div class="stat-ligne"><strong>${_formatNum(p.abonnes)}</strong> abonnés</div>
          <div class="stat-ligne text-muted">${_formatNum(p.vues_totales)} vues · ${p.nb_videos} vidéos</div>
        </td>
        <td class="td-score">
          <div class="score-badge score-${_scoreClass(p.score)}">${p.score}</div>
        </td>
        <td class="td-contact">
          ${p.email_contact ? `<a href="mailto:${p.email_contact}" class="email-link">✉ ${_esc(p.email_contact)}</a>` : '<span class="text-muted">—</span>'}
        </td>
        <td class="td-statut">
          <select class="statut-select" onchange="changerStatut('${p.id}', this.value)">
            <option value="nouveau" ${p.statut === 'nouveau' ? 'selected' : ''}>🆕 Nouveau</option>
            <option value="contacte" ${p.statut === 'contacte' ? 'selected' : ''}>📧 Contacté</option>
            <option value="repondu" ${p.statut === 'repondu' ? 'selected' : ''}>💬 Répondu</option>
            <option value="interessee" ${p.statut === 'interessee' ? 'selected' : ''}>⭐ Intéressé</option>
            <option value="client" ${p.statut === 'client' ? 'selected' : ''}>✅ Client</option>
            <option value="refuse" ${p.statut === 'refuse' ? 'selected' : ''}>❌ Refusé</option>
          </select>
        </td>
        <td class="td-actions">
          <button class="btn-email" onclick="genererEmail('${p.id}')">Générer email</button>
          <button class="btn-copier" onclick="copierEmail('${p.id}')">Copier</button>
        </td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prospects YouTube — Créatis</title>
  <style>
    :root { --bg: #0a0f0a; --bg2: #111711; --bg3: #1a221a; --border: #1e2b1e; --em: #10b981; --em2: #059669; --text: #e2e8f0; --muted: #94a3b8; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; }
    header { background: var(--bg2); border-bottom: 1px solid var(--border); padding: 20px 32px; display: flex; align-items: center; justify-content: space-between; }
    .logo { font-size: 1.3rem; font-weight: 700; color: var(--em); }
    .logo span { color: var(--text); }
    .header-meta { font-size: 0.85rem; color: var(--muted); }
    main { max-width: 1200px; margin: 0 auto; padding: 32px 20px; }
    h1 { font-size: 1.8rem; font-weight: 800; margin-bottom: 6px; }
    .subtitle { color: var(--muted); margin-bottom: 24px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 28px; }
    .stat-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; padding: 16px; text-align: center; }
    .stat-card .val { font-size: 1.8rem; font-weight: 800; color: var(--em); }
    .stat-card .lbl { font-size: 0.8rem; color: var(--muted); margin-top: 4px; }
    .filters { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
    .filter-btn { padding: 6px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: 1px solid var(--border); background: var(--bg2); color: var(--muted); transition: all 0.2s; }
    .filter-btn.active, .filter-btn:hover { background: var(--em); color: #fff; border-color: var(--em); }
    .table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--border); }
    table { width: 100%; border-collapse: collapse; }
    th { background: var(--bg3); padding: 12px 16px; text-align: left; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); border-bottom: 1px solid var(--border); white-space: nowrap; }
    td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--bg3); }
    .chaine-info { display: flex; align-items: center; gap: 10px; }
    .chaine-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
    .chaine-avatar-placeholder { width: 36px; height: 36px; border-radius: 50%; background: var(--bg3); flex-shrink: 0; }
    .chaine-nom { color: var(--em); text-decoration: none; font-weight: 600; font-size: 0.9rem; }
    .chaine-nom:hover { text-decoration: underline; }
    .chaine-niche { font-size: 0.78rem; color: var(--muted); margin-top: 2px; }
    .stat-ligne { font-size: 0.85rem; }
    .text-muted { color: var(--muted); font-size: 0.8rem; }
    .score-badge { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; font-weight: 800; font-size: 0.9rem; }
    .score-high { background: rgba(16,185,129,0.2); color: var(--em); }
    .score-med { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .score-low { background: rgba(148,163,184,0.1); color: var(--muted); }
    .email-link { color: var(--em); font-size: 0.82rem; text-decoration: none; }
    .email-link:hover { text-decoration: underline; }
    .statut-select { background: var(--bg3); border: 1px solid var(--border); color: var(--text); padding: 4px 8px; border-radius: 6px; font-size: 0.82rem; cursor: pointer; }
    .btn-email, .btn-copier { padding: 5px 10px; border-radius: 5px; border: 1px solid var(--border); font-size: 0.78rem; cursor: pointer; transition: all 0.2s; }
    .btn-email { background: rgba(16,185,129,0.15); color: var(--em); border-color: rgba(16,185,129,0.3); }
    .btn-email:hover { background: var(--em); color: #fff; }
    .btn-copier { background: var(--bg3); color: var(--muted); }
    .btn-copier:hover { color: var(--text); border-color: var(--em); }
    .td-rank { color: var(--muted); font-size: 0.85rem; width: 40px; }
    .modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000; align-items:center; justify-content:center; }
    .modal.open { display:flex; }
    .modal-box { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 28px; max-width: 600px; width: 90%; }
    .modal-box h3 { margin-bottom: 16px; }
    .modal-email-text { width: 100%; min-height: 200px; background: var(--bg3); border: 1px solid var(--border); color: var(--text); padding: 16px; border-radius: 8px; font-family: inherit; font-size: 0.9rem; line-height: 1.6; resize: vertical; }
    .modal-actions { display: flex; gap: 10px; margin-top: 16px; }
    .btn-primary { background: var(--em); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-secondary { background: var(--bg3); color: var(--muted); border: 1px solid var(--border); padding: 10px 20px; border-radius: 8px; cursor: pointer; }
    .btn-primary:hover { background: var(--em2); }
    .btn-secondary:hover { color: var(--text); }
    @media(max-width:640px) { td,th { padding: 8px 10px; } .btn-email,.btn-copier { display: block; width: 100%; margin-top: 4px; } }
  </style>
</head>
<body>
<header>
  <div class="logo">créa<span>tis</span> <span style="font-weight:400;color:var(--muted);font-size:0.9rem">— Prospects YouTube</span></div>
  <div class="header-meta">Généré le ${new Date().toLocaleDateString('fr-FR')} · ${stats.total} prospects</div>
</header>
<main>
  <h1>🎯 Liste de Prospects YouTube</h1>
  <p class="subtitle">Chaînes FR 1k–10k abonnés dans finance, IA, entrepreneuriat, marketing, productivité</p>

  <div class="stats-grid">
    <div class="stat-card"><div class="val">${stats.total}</div><div class="lbl">Prospects total</div></div>
    <div class="stat-card"><div class="val">${stats.score90}</div><div class="lbl">Score 90+</div></div>
    <div class="stat-card"><div class="val">${stats.score70}</div><div class="lbl">Score 70-89</div></div>
    <div class="stat-card"><div class="val">${stats.avecEmail}</div><div class="lbl">Avec email</div></div>
    ${Object.entries(stats.parNiche).map(([n, c]) => `<div class="stat-card"><div class="val">${c}</div><div class="lbl">${NICHES[n]?.emoji || ''} ${NICHES[n]?.label?.split(' ')[0] || n}</div></div>`).join('')}
  </div>

  <div class="filters">
    <button class="filter-btn active" onclick="filtrer('tous', this)">Tous (${stats.total})</button>
    <button class="filter-btn" onclick="filtrer('score90', this)">⭐ Score 90+ (${stats.score90})</button>
    <button class="filter-btn" onclick="filtrer('email', this)">✉ Avec email (${stats.avecEmail})</button>
    ${Object.entries(stats.parNiche).map(([n, c]) => `<button class="filter-btn" onclick="filtrer('${n}', this)">${NICHES[n]?.emoji || ''} ${NICHES[n]?.label?.split(' ')[0] || n} (${c})</button>`).join('')}
    <button class="filter-btn" onclick="filtrer('nouveau', this)">🆕 Non contactés</button>
  </div>

  <div class="table-wrap">
    <table id="table-prospects">
      <thead>
        <tr>
          <th>#</th><th>Chaîne</th><th>Stats</th><th>Score</th><th>Contact</th><th>Statut</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
</main>

<div class="modal" id="modal-email">
  <div class="modal-box">
    <h3>📧 Email personnalisé</h3>
    <textarea class="modal-email-text" id="modal-text"></textarea>
    <div class="modal-actions">
      <button class="btn-primary" onclick="copierDepuisModal()">Copier le texte</button>
      <button class="btn-secondary" onclick="fermerModal()">Fermer</button>
    </div>
  </div>
</div>

<script>
const PROSPECTS = ${JSON.stringify(prospects)};
const NICHES_INFO = ${JSON.stringify(NICHES)};

const TEMPLATES_EMAIL = {
  finance: (p) => \`Bonjour,

Je gère Créatis (creatis.app), un outil IA spécialisé pour les créateurs YouTube francophones.

J'ai regardé ta chaîne "${p.nom}" — tes vidéos sur les finances personnelles sont exactement le type de contenu qui bénéficierait le plus de notre outil : génération automatique de titres, descriptions SEO, scripts, et miniatures professionnelles en quelques secondes.

On a des créateurs dans ta niche qui gagnent 30% de clics en plus sur leurs miniatures depuis qu'ils utilisent Créatis.

Je t'offre 3 mois d'accès Pro offerts (valeur 147€) pour tester et partager ton retour.

Ça t'intéresse ?

Bonne journée,
[Ton prénom]
creatis.app\`,

  entrepreneuriat: (p) => \`Bonjour,

Je suis le fondateur de Créatis (creatis.app) — l'assistant IA pour créateurs YouTube.

Avec ${_formatNum(p.abonnes)} abonnés sur "${p.nom}", tu es exactement dans la phase où chaque vidéo compte et où le temps est précieux.

Créatis te génère en 30 secondes : titre optimisé, description SEO, script complet, idées d'hooks, et miniature pro. Plus de 200 créateurs francophones utilisent déjà l'outil.

Je t'offre 3 mois gratuits en échange d'un retour honnête.

Tu es dispo pour un appel rapide de 15 min cette semaine ?

Bonne journée,
[Ton prénom]
creatis.app\`,

  ia: (p) => \`Bonjour,

J'ai découvert ta chaîne "${p.nom}" en cherchant les meilleurs créateurs IA francophones — et ton contenu est vraiment de qualité.

Je développe Créatis (creatis.app), un outil IA qui automatise la création de contenu YouTube : titres, descriptions, scripts, miniatures FLUX.1...

Vu que tu couvres l'IA, tu pourrais toi-même être utilisateur et peut-être partager l'outil à ta communauté si tu le trouves utile.

Je t'offre l'accès Pro illimité à vie en échange d'un retour public si tu l'aimes.

Intéressé ?

Cordialement,
[Ton prénom]
creatis.app\`,

  default: (p) => \`Bonjour,

Je gère Créatis (creatis.app), un outil IA pour créateurs YouTube francophones.

Ta chaîne "${p.nom}" attire mon attention — ${_formatNum(p.abonnes)} abonnés et un contenu qui correspond parfaitement à notre audience.

Créatis génère automatiquement : titres YouTube optimisés, descriptions SEO, scripts complets, idées de vidéos et miniatures professionnelles en quelques secondes.

Je t'offre 3 mois d'accès Pro gratuit (valeur 147€). En échange, j'aimerais juste avoir ton retour honnête.

Tu es intéressé ?

Bonne journée,
[Ton prénom] — Créatis.app
Code bêta : BETA30 (30% de réduction à vie si tu décides de rester)\`
};

let prospectsData = JSON.parse(JSON.stringify(PROSPECTS));
let prospectActuel = null;

function _scoreClass(s) { return s >= 80 ? 'high' : s >= 60 ? 'med' : 'low'; }
function _formatNum(n) { return n >= 1000 ? (n/1000).toFixed(1)+'k' : n; }
function _esc(s) { const d=document.createElement('div');d.textContent=s;return d.innerHTML; }

function changerStatut(id, statut) {
  const p = prospectsData.find(x => x.id === id);
  if (p) {
    p.statut = statut;
    const state = JSON.parse(localStorage.getItem('creatis_prospects') || '{}');
    state[id] = { statut, notes: p.notes };
    localStorage.setItem('creatis_prospects', JSON.stringify(state));
  }
}

function genererEmail(id) {
  const p = prospectsData.find(x => x.id === id);
  if (!p) return;
  prospectActuel = p;
  const tpl = TEMPLATES_EMAIL[p.niche] || TEMPLATES_EMAIL.default;
  document.getElementById('modal-text').value = tpl(p);
  document.getElementById('modal-email').classList.add('open');
}

function copierEmail(id) {
  const p = prospectsData.find(x => x.id === id);
  if (!p) return;
  const tpl = TEMPLATES_EMAIL[p.niche] || TEMPLATES_EMAIL.default;
  navigator.clipboard.writeText(tpl(p)).then(() => {
    changerStatut(id, 'contacte');
    const btn = document.querySelector(\`tr[data-id="\${id}"] .btn-copier\`);
    if (btn) { btn.textContent = '✓ Copié'; setTimeout(() => btn.textContent = 'Copier', 2000); }
  });
}

function copierDepuisModal() {
  const text = document.getElementById('modal-text').value;
  navigator.clipboard.writeText(text).then(() => {
    if (prospectActuel) changerStatut(prospectActuel.id, 'contacte');
    fermerModal();
  });
}

function fermerModal() {
  document.getElementById('modal-email').classList.remove('open');
  prospectActuel = null;
}

function filtrer(type, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const rows = document.querySelectorAll('#table-prospects tbody tr');
  rows.forEach(row => {
    let show = true;
    if (type === 'score90') {
      const score = parseInt(row.querySelector('.score-badge').textContent);
      show = score >= 90;
    } else if (type === 'email') {
      show = !!row.querySelector('.email-link');
    } else if (type === 'nouveau') {
      const sel = row.querySelector('.statut-select');
      show = sel && sel.value === 'nouveau';
    } else if (type !== 'tous') {
      show = row.querySelector('.chaine-niche')?.textContent.includes(NICHES_INFO[type]?.emoji || '');
    }
    row.style.display = show ? '' : 'none';
  });
}

// Restaurer statuts depuis localStorage
const savedState = JSON.parse(localStorage.getItem('creatis_prospects') || '{}');
Object.entries(savedState).forEach(([id, data]) => {
  const row = document.querySelector(\`tr[data-id="\${id}"]\`);
  if (row) {
    const sel = row.querySelector('.statut-select');
    if (sel) sel.value = data.statut;
  }
});

document.getElementById('modal-email').addEventListener('click', function(e) {
  if (e.target === this) fermerModal();
});
<\/script>
</body>
</html>`;
  }

  // Helpers internes
  function _extraireEmail(desc) {
    if (!desc) return null;
    const m = desc.match(/[\w.+\-]+@[\w\-]+\.[\w.]+/);
    return m ? m[0] : null;
  }

  function _calculerFreq(dateCreation, nbVideos) {
    if (!dateCreation || !nbVideos) return 0;
    const mois = Math.max(1, (Date.now() - new Date(dateCreation).getTime()) / (1000 * 60 * 60 * 24 * 30));
    return (parseInt(nbVideos) / mois / 4.33);
  }

  function _detecterSponsors(desc) {
    if (!desc) return false;
    const motsCles = ['sponsoris', 'partenariat', 'partenaire', '#ad', '#sponsored', 'affilié'];
    return motsCles.some(m => desc.toLowerCase().includes(m));
  }

  function _dateIlYA(jours) {
    const d = new Date();
    d.setDate(d.getDate() - jours);
    return d.toISOString();
  }

  function _dedupliquer(arr) {
    const vus = new Set();
    return arr.filter(item => {
      if (vus.has(item.id)) return false;
      vus.add(item.id);
      return true;
    });
  }

  function _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function _esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _formatNum(n) {
    if (!n) return '0';
    return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
  }

  // Interface publique
  return {
    NICHES,
    rechercherChaines,
    rechercherToutes,
    genererRapportHTML,
    calculerScore,

    // Générer rapport depuis données mockées (pour démo sans API key)
    genererDemo() {
      const demo = _genererDonneesMock();
      return this.genererRapportHTML(demo);
    }
  };

  function _genererDonneesMock() {
    const niches = Object.keys(NICHES);
    const noms = [
      'Finance Simple', 'Investir Malin', 'Bourse Pour Tous', 'L\'Argent Libre',
      'Business Digitaux', 'Side Hustle FR', 'Entrepreneurs 2.0', 'Startup Mindset',
      'IA Pratique', 'ChatGPT Tips', 'Automatise Tout', 'Future Digital',
      'Marketing Digital Pro', 'Personal Brand FR', 'Growth Hacking FR',
      'Productivité Max', 'Deep Work FR', 'Routine Champion', 'Focus Créateur', 'Créateur Libre'
    ];

    return noms.map((nom, i) => {
      const niche = niches[i % niches.length];
      const abonnes = 1200 + Math.floor(Math.random() * 8000);
      const nb_videos = 20 + Math.floor(Math.random() * 100);
      const chaine = {
        id: 'ch_demo_' + i,
        nom,
        description: 'Chaîne YouTube francophone sur ' + NICHES[niche].label,
        url: 'https://youtube.com/c/' + nom.replace(/ /g, ''),
        abonnes,
        vues_totales: abonnes * (5 + Math.floor(Math.random() * 30)),
        nb_videos,
        pays: 'FR',
        niche,
        niche_label: NICHES[niche].label,
        niche_emoji: NICHES[niche].emoji,
        date_creation: '2022-0' + (1 + i % 9) + '-15',
        avatar: '',
        email_contact: i % 3 === 0 ? nom.toLowerCase().replace(/ /g, '') + '@gmail.com' : null,
        freq_semaine: 0.5 + Math.random() * 2,
        a_sponsors: i % 5 === 0,
        sponsor_potentiel: NICHES[niche].sponsorPotentiel,
        statut: 'nouveau',
        notes: '',
        date_ajout: new Date().toISOString().substring(0, 10)
      };
      chaine.score = calculerScore(chaine);
      return chaine;
    }).sort((a, b) => b.score - a.score);
  }
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProspectionYT;
}
