/* ===== CRÉATIS — SYSTÈME EMAILS & BREVO ===== */
/* Toutes les appels Brevo passent par /api/email-sequence (clé côté serveur)
   EmailJS retiré — remplacé par Brevo transactionnel */

const Emails = {

  /* Helper interne : appel proxy serveur (non-bloquant, jamais d'erreur visible) */
  async _api(body) {
    try {
      await fetch('/api/email-sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch {}
  },

  /* J0 — Email bienvenue immédiat */
  async envoyerBienvenue(user) {
    if (!user?.email) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://creatis.app';
    await this._api({
      action: 'send_email',
      email: user.email,
      to: user.email,
      toName: user.nom || 'Créateur',
      subject: '🎉 Bienvenue sur Créatis — commence dès maintenant',
      htmlContent: `<div style="font-family:sans-serif;max-width:600px;margin:auto;color:#111">
        <h2 style="color:#10b981">Bienvenue sur Créatis, ${user.nom || 'Créateur'} !</h2>
        <p>Ton compte est prêt. Commence à générer des titres, des idées de vidéos et des miniatures avec l'IA.</p>
        <a href="${origin}/app.html" style="display:inline-block;background:#10b981;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0">Accéder à l'application →</a>
        <p style="color:#666;font-size:14px">Code promo early adopter : <strong>CREATIS20</strong> (-20% sur le Pro)</p>
        <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0">
          <p style="margin:0 0 8px;font-weight:700;color:#059669">💸 Gagne 30% récurrent avec ton lien affilié</p>
          <p style="margin:0 0 12px;font-size:14px;color:#333">Partage Créatis avec d'autres créateurs YouTube. Pour chaque abonnement Pro (19€/mois), tu touches <strong>5,70€/mois à vie</strong>.</p>
          <a href="${origin}/affiliation" style="display:inline-block;background:#059669;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Obtenir mon lien affilié →</a>
        </div>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="color:#999;font-size:12px">Créatis · <a href="https://creatis.app">creatis.app</a> · <a href="mailto:contact@creatis.app">contact@creatis.app</a></p>
      </div>`
    });
    localStorage.setItem('creatis_email_j0_sent', Date.now().toString());
  },

  /* Vérifie et déclenche les séquences selon le jour d'inscription */
  verifierSequence() {
    const user = JSON.parse(localStorage.getItem('creatis_user') || '{}');
    if (!user.email || !user.dateInscription) return;

    const jours = Math.floor((Date.now() - user.dateInscription) / 86400000);
    const envois = JSON.parse(localStorage.getItem('creatis_email_envois') || '{}');
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://creatis.app';

    const nom = user.nom || 'Créateur';

    const sequences = [
      {
        jour: 'j2', joursMin: 2,
        subject: 'As-tu fait ta première génération ?',
        html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;background:#fff;color:#111;padding:32px;border-radius:12px">
          <h2 style="color:#10b981;margin-top:0">30 secondes pour voir ce que Créatis fait</h2>
          <p>Salut ${nom},</p>
          <p>Si tu n'as pas encore essayé — choisis l'agent <strong>Workflow Complet</strong>, tape un sujet, clique Générer.</p>
          <p>Tu récupères titres, script avec timecodes, description SEO et tags en une seule génération.</p>
          <a href="${origin}/app.html" style="display:inline-block;background:#10b981;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0">Faire ma première génération →</a>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="color:#999;font-size:12px;margin:0">Créatis · <a href="https://creatis.app" style="color:#10b981">creatis.app</a> · <a href="mailto:contact@creatis.app" style="color:#10b981">contact@creatis.app</a></p>
        </div>`
      },
      {
        jour: 'j5', joursMin: 5,
        condition: () => user.plan === 'gratuit',
        subject: 'Tu brûles tes crédits vite — c\'est bon signe',
        html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;background:#fff;color:#111;padding:32px;border-radius:12px">
          <h2 style="color:#10b981;margin-top:0">Tu utilises Créatis — tant mieux</h2>
          <p>Salut ${nom},</p>
          <p>Si tu arrives à mi-chemin de tes 50 crédits gratuits, c'est que l'outil t'est utile.</p>
          <p>Quand tu arrives à la limite, la suite logique c'est le <strong>Pro à 19€/mois</strong> :</p>
          <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0">
            <ul style="margin:0;padding-left:20px;line-height:2">
              <li>Générations <strong>illimitées</strong></li>
              <li>10 miniatures HD / mois</li>
              <li>Prospection sponsors IA</li>
              <li>Recyclage multiplateforme (LinkedIn, Instagram, Twitter)</li>
              <li>Offre Commerciale + Media Kit automatisés</li>
            </ul>
          </div>
          <a href="${origin}/index.html#tarifs" style="display:inline-block;background:#10b981;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0">Voir l'offre Pro →</a>
          <p style="color:#666;font-size:14px">Code early adopter : <strong>CREATIS20</strong> (-20% à vie)</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="color:#999;font-size:12px;margin:0">Créatis · <a href="https://creatis.app" style="color:#10b981">creatis.app</a></p>
        </div>`
      },
      {
        jour: 'j10', joursMin: 10,
        condition: () => user.plan === 'gratuit',
        subject: 'Ce qu\'un créateur a généré en 28 secondes avec Créatis',
        html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;background:#fff;color:#111;padding:32px;border-radius:12px">
          <h2 style="color:#10b981;margin-top:0">Exemple réel — sujet : "économiser 400€/mois"</h2>
          <p>Salut ${nom},</p>
          <p>Voici ce que Créatis a généré en 28 secondes pour un créateur finance :</p>
          <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:16px;margin:16px 0;border-radius:0 8px 8px 0">
            <p style="margin:0 0 8px;font-weight:700;color:#059669">5 titres :</p>
            <ul style="margin:0;padding-left:20px;color:#333;line-height:1.8">
              <li>🔴 J'ai économisé 400€/mois sans changer de salaire</li>
              <li>Ces 3 habitudes m'ont fait perdre 400€/mois pendant 2 ans</li>
              <li>400€ économisés en 30 jours : mon bilan honnête</li>
              <li>Tu dépenses trop ? Ces 3 changements m'ont transformé</li>
              <li>Comment économiser quand on gagne 2 000€ net</li>
            </ul>
            <p style="margin:12px 0 4px;font-weight:700;color:#059669">Début de script :</p>
            <p style="margin:0;font-style:italic;color:#555">"Il y a 18 mois, je perdais 400€ par mois sans m'en rendre compte. Pas sur des restaurants ou des vacances. Sur des trucs invisibles..."</p>
          </div>
          <p>+ description SEO, 30 tags. Tout ça en une génération.</p>
          <a href="${origin}/app.html" style="display:inline-block;background:#10b981;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0">Générer avec Créatis →</a>
          <p style="color:#666;font-size:14px">Code : <strong>CREATIS20</strong> (-20% sur le Pro)</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="color:#999;font-size:12px;margin:0">Créatis · <a href="https://creatis.app" style="color:#10b981">creatis.app</a></p>
        </div>`
      },
      {
        jour: 'j14', joursMin: 14,
        condition: () => user.plan === 'gratuit',
        subject: 'Dernière chose — puis on te laisse tranquille',
        html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;background:#fff;color:#111;padding:32px;border-radius:12px">
          <h2 style="color:#10b981;margin-top:0">On sera là quand tu es prêt</h2>
          <p>Salut ${nom},</p>
          <p>C'est le dernier email de notre séquence. On ne va pas continuer à te relancer.</p>
          <p>Si Créatis n'est pas pour toi maintenant, pas de problème. Mais si un jour tu veux passer au Pro, le code <strong>CREATIS20</strong> reste valable — c'est -20% à vie pour les early adopters.</p>
          <a href="${origin}/index.html#tarifs" style="display:inline-block;background:#10b981;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0">Voir les offres →</a>
          <p style="color:#666;font-size:14px">Une question ? Réponds directement à cet email.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="color:#999;font-size:12px;margin:0">Créatis · <a href="https://creatis.app" style="color:#10b981">creatis.app</a> · <a href="mailto:contact@creatis.app" style="color:#10b981">contact@creatis.app</a></p>
        </div>`
      }
    ];

    for (const seq of sequences) {
      if (jours >= seq.joursMin && !envois[seq.jour]) {
        if (seq.condition && !seq.condition()) continue;
        this._envoyerSequence(seq.jour, user.email, user.nom, seq.subject, seq.html);
      }
    }
  },

  async _envoyerSequence(jour, email, nom, subject, htmlContent) {
    if (!email) return;
    await this._api({ action: 'send_email', email, to: email, toName: nom || 'Créateur', subject, htmlContent });
    const envois = JSON.parse(localStorage.getItem('creatis_email_envois') || '{}');
    envois[jour] = Date.now();
    localStorage.setItem('creatis_email_envois', JSON.stringify(envois));
    console.log(`[Emails] Séquence ${jour} envoyée`);
  },

  /* ===== BREVO CONTACTS (via proxy serveur) ===== */

  /* Ajouter un nouveau contact après inscription */
  async ajouterContactBrevo(user) {
    if (!user?.email) return;
    await this._api({
      action: 'add_contact',
      email: user.email,
      nom: user.nom,
      plan: user.plan,
      chaine: user.chaine,
      source: 'app_inscription'
    });
    await this._api({ action: 'trigger_automation', email: user.email, eventName: 'onboarding_j0' });
    console.log('[Brevo] Contact ajouté:', user.email);
  },

  /* Mettre à jour le plan d'un contact (post-paiement) */
  async mettreAJourPlanBrevo(email, nouveauPlan, meta = {}) {
    if (!email) return;
    await this._api({
      action: 'update_plan',
      email,
      nouveauPlan,
      stripeCustomerId: meta.stripeCustomerId,
      montantMensuel: meta.montantMensuel
    });
    await this._api({ action: 'trigger_automation', email, eventName: `upgrade_vers_${nouveauPlan}` });
    console.log('[Brevo] Plan mis à jour:', email, '→', nouveauPlan);
  },

  /* Ajouter un contact en liste Prospects (outreach) */
  async ajouterProspectBrevo(prospect) {
    if (!prospect?.email) return;
    await this._api({
      action: 'add_prospect',
      email: prospect.email,
      nom: prospect.nom,
      chaine: prospect.chaine,
      abonnes: prospect.abonnes,
      niche: prospect.niche
    });
    console.log('[Brevo] Prospect ajouté:', prospect.email);
  },

  /* Ajouter un affilié */
  async ajouterAffilie(user, codeAffilie) {
    if (!user?.email) return;
    await this._api({ action: 'add_affilie', email: user.email, codeAffilie });
  },

  /* Envoyer email de recrutement UGC TikTok à un affilié potentiel */
  async envoyerRecrutementAffilie(user, codeAffilie) {
    if (!user?.email) return;
    await this._api({
      action: 'send_affilie_recruitment',
      email: user.email,
      nom: user.nom || user.email.split('@')[0],
      codeAffilie: codeAffilie || user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
    });
    console.log('[Emails] Recrutement affilié envoyé:', user.email);
  },

  /* Désabonner un contact d'une liste */
  async desabonner(email, listId) {
    if (!email) return;
    await this._api({ action: 'unsubscribe', email, listId });
  },

  /* Envoyer email transactionnel */
  async envoyerEmailBrevo({ to, toName, subject, htmlContent, templateId, params }) {
    if (!to) return false;
    await this._api({ action: 'send_email', email: to, to, toName, subject, htmlContent, templateId, templateParams: params });
    return true;
  },

  /* Broadcast lancement — envoie une campagne à toute la liste */
  async envoyerBroadcastLancement() {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://creatis.app';
    await this._api({
      action: 'create_campaign',
      name: 'Lancement Créatis — Mai 2026',
      subject: 'Créatis est en ligne — voici ce qu\'il peut faire pour ta chaîne YouTube',
      htmlContent: `<div style="font-family:sans-serif;max-width:600px;margin:auto;background:#fff;color:#111;padding:32px;border-radius:12px">
        <h1 style="color:#10b981;margin-top:0;font-size:24px">Créatis est officiellement en ligne.</h1>
        <p>Si tu t'es inscrit sur la liste d'attente, voici ce que tu peux faire dès maintenant :</p>
        <div style="background:#f0fdf4;border-radius:8px;padding:20px;margin:20px 0">
          <p style="margin:0 0 12px;font-weight:700">En 30 secondes, Créatis génère :</p>
          <ul style="margin:0;padding-left:20px;line-height:2">
            <li>5 titres optimisés pour ton CTR YouTube</li>
            <li>Un script complet avec timecodes</li>
            <li>Une description SEO + 30 tags</li>
            <li>Une miniature IA (plan Pro)</li>
          </ul>
        </div>
        <p>Tout est calibré pour YouTube FR. Sans prompt à écrire. Sans ChatGPT.</p>
        <a href="${origin}/app.html" style="display:inline-block;background:#10b981;color:#000;padding:16px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;margin:16px 0">Accéder à Créatis →</a>
        <p style="color:#666;font-size:14px">Code early adopter : <strong>CREATIS20</strong> (-20% sur le Pro, valable 48h)</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="color:#999;font-size:12px;margin:0">Créatis · <a href="https://creatis.app" style="color:#10b981">creatis.app</a> · <a href="mailto:contact@creatis.app" style="color:#10b981">contact@creatis.app</a></p>
      </div>`,
      listIds: [3, 4, 5, 6]
    });
    console.log('[Emails] Broadcast lancement envoyé');
  },

  /* Récupérer les stats d'un contact */
  async getContactBrevo(email) {
    if (!email) return null;
    try {
      const res = await fetch('/api/email-sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_contact', email })
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.ok ? data.contact : null;
    } catch { return null; }
  }
};

/* Auto-vérification de séquence au chargement de la page */
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('creatis_user') || '{}');
    if (user.email && user.dateInscription) {
      Emails.verifierSequence();
    }
  });
}
