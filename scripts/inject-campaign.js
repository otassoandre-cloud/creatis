const fs = require('fs');

const data = JSON.parse(fs.readFileSync(__dirname + '/tiktok-campaign-data.json', 'utf8'));
const arrayLiteral = JSON.stringify(data, null, 2);

const newAction = `
  /* ================================================================
   * TIKTOK_CAMPAIGN — emails affilié/produit aux TikTokeurs scrapés
   * ================================================================ */
  if (action === 'tiktok_campaign') {
    const secret = process.env.CRON_SECRET || '';
    const auth   = (req.headers['authorization'] || '').replace('Bearer ', '');
    if (secret && auth !== secret) return res.status(401).json({ error: 'unauthorized' });

    const brevoKey = (process.env.BREVO_API_KEY || '').trim();
    if (!brevoKey) return res.status(500).json({ error: 'no_brevo_key' });

    const FR_HASHTAGS = new Set(['conseilsyoutube','youtubeurfr','devenirYouTubeur','monetisationyoutube','youtubestrategie','vlogfr','gamingfr','podcastfr','entrepreneurfr','creationdecontenu','intelligenceartificielle','chatgptfrancais','iacontenu']);

    const CAMPAIGN = ${arrayLiteral};

    const sentRows = await supaGet('tiktok_outreach', 'select=email&status=eq.sent') || [];
    const sentEmails = new Set(sentRows.map(r => r.email));

    const catFilter = params.cat || 'all';
    const targets = CAMPAIGN.filter(c => {
      if (sentEmails.has(c.email)) return false;
      if (catFilter !== 'all' && c.cat !== catFilter) return false;
      return true;
    });

    let sent = 0, errors = 0;

    for (const creator of targets) {
      const name = creator.handle.replace('@', '').split('.')[0].split('_')[0];
      const n = name.charAt(0).toUpperCase() + name.slice(1);
      const isFr = creator.cat === 'produit' || ['conseilsyoutube','youtubeurfr','devenirYouTubeur','monetisationyoutube','youtubestrategie','vlogfr','gamingfr','podcastfr','entrepreneurfr','creationdecontenu','intelligenceartificielle','chatgptfrancais','iacontenu'].includes(creator.hashtag || '');

      let subject, htmlContent;

      if (creator.cat === 'affiliation') {
        if (isFr) {
          subject = n + ' — programme affilié Créatis (30% récurrent à vie)';
          htmlContent = '<div style="font-family:sans-serif;max-width:480px;color:#1a1a1a;line-height:1.8">'
            + '<p>Salut ' + n + ' \u{1F44B}</p>'
            + '<p>J’ai vu ton contenu sur TikTok — tu parles exactement aux créateurs qui ont besoin de Créatis.</p>'
            + '<p><strong>Créatis</strong> = outil IA pour YouTubeurs FR. Script complet + miniature en 30 secondes.</p>'
            + '<p>Programme affilié : <strong>30% récurrent à vie</strong>. Chaque abonné Pro = <strong>5,70€/mois</strong> pour toi, pour toujours.</p>'
            + '<p>10 abonnés = 57€/mois passif. 50 abonnés = 285€/mois.</p>'
            + '<p>Aucune audience minimale.</p>'
            + '<p>Intéressé(e) ? Réponds à cet email ou visite <a href="https://creatis.app/affiliation" style="color:#10b981;font-weight:bold">creatis.app/affiliation</a></p>'
            + '<p style="margin-top:24px">André<br><span style="color:#888;font-size:13px">Fondateur · Créatis</span></p>'
            + '<p style="font-size:11px;color:#aaa">Pour ne plus recevoir : <a href="mailto:contact@creatis.app?subject=unsubscribe">se désabonner</a></p>'
            + '</div>';
        } else {
          subject = n + ' — 30% recurring affiliate program (Créatis AI for YouTube)';
          htmlContent = '<div style="font-family:sans-serif;max-width:480px;color:#1a1a1a;line-height:1.8">'
            + '<p>Hey ' + n + ' \u{1F44B}</p>'
            + '<p>Found your TikTok — you’re talking to exactly the audience that needs Créatis.</p>'
            + '<p><strong>Créatis</strong> is an AI tool for YouTube creators. Full script + thumbnail in 30 seconds.</p>'
            + '<p>Affiliate program: <strong>30% recurring forever</strong>. Each Pro subscriber you bring = <strong>€5.70/month</strong> for you, indefinitely.</p>'
            + '<p>10 subscribers = €57/month passive. 50 = €285/month.</p>'
            + '<p>No minimum audience required.</p>'
            + '<p>Interested? Reply or visit <a href="https://creatis.app/affiliation" style="color:#10b981;font-weight:bold">creatis.app/affiliation</a></p>'
            + '<p style="margin-top:24px">André<br><span style="color:#888;font-size:13px">Founder · Créatis</span></p>'
            + '<p style="font-size:11px;color:#aaa">To unsubscribe: <a href="mailto:contact@creatis.app?subject=unsubscribe">click here</a></p>'
            + '</div>';
        }
      } else {
        if (isFr) {
          subject = n + ' — génère tes scripts YouTube avec l’IA en 30s';
          htmlContent = '<div style="font-family:sans-serif;max-width:480px;color:#1a1a1a;line-height:1.8">'
            + '<p>Salut ' + n + ' \u{1F44B}</p>'
            + '<p>Tu crées du contenu vidéo — <strong>Créatis</strong> peut te faire gagner des heures chaque semaine.</p>'
            + '<p>Script YouTube complet, idées de vidéos, miniature IA — tout en 30 secondes.</p>'
            + '<p>Gratuit pour commencer : <a href="https://creatis.app" style="color:#10b981;font-weight:bold">creatis.app</a></p>'
            + '<p style="margin-top:24px">André<br><span style="color:#888;font-size:13px">Fondateur · Créatis</span></p>'
            + '<p style="font-size:11px;color:#aaa">Pour ne plus recevoir : <a href="mailto:contact@creatis.app?subject=unsubscribe">se désabonner</a></p>'
            + '</div>';
        } else {
          subject = n + ' — generate your YouTube scripts with AI in 30s';
          htmlContent = '<div style="font-family:sans-serif;max-width:480px;color:#1a1a1a;line-height:1.8">'
            + '<p>Hey ' + n + ' \u{1F44B}</p>'
            + '<p>You create video content — <strong>Créatis</strong> can save you hours every week.</p>'
            + '<p>Full YouTube script, video ideas, AI thumbnail — all in 30 seconds.</p>'
            + '<p>Free to start: <a href="https://creatis.app" style="color:#10b981;font-weight:bold">creatis.app</a></p>'
            + '<p style="margin-top:24px">André<br><span style="color:#888;font-size:13px">Founder · Créatis</span></p>'
            + '<p style="font-size:11px;color:#aaa">To unsubscribe: <a href="mailto:contact@creatis.app?subject=unsubscribe">click here</a></p>'
            + '</div>';
        }
      }

      const r = await fetch(BREVO_BASE + '/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': brevoKey },
        body: JSON.stringify({
          to: [{ email: creator.email, name: n }],
          subject,
          sender: { name: 'André — Créatis', email: 'contact@creatis.app' },
          htmlContent,
          tags: ['tiktok-campaign', creator.cat]
        })
      }).catch(() => null);

      if (r && r.ok) {
        sent++;
        await supaUpsert('tiktok_outreach', { handle: creator.handle, email: creator.email, status: 'sent', sent_at: new Date().toISOString() });
      } else {
        errors++;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return res.status(200).json({ ok: true, sent, errors, total: targets.length, cat: catFilter });
  }

`;

const api = fs.readFileSync(__dirname + '/../api/prospect-finder.js', 'utf8');
const marker = "  return res.status(400).json({ error: `Action inconnue: ${action}` });";
if (!api.includes(marker)) {
  console.error('Marker not found!');
  process.exit(1);
}
const updated = api.replace(marker, newAction + marker);
fs.writeFileSync(__dirname + '/../api/prospect-finder.js', updated);
console.log('Done. Added tiktok_campaign action. File size:', updated.length);
