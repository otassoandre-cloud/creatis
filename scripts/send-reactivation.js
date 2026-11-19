// Script one-shot — réactivation des fantômes (repurpose_count = 0)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zjzcgcpphzcghigzpghq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const BREVO_KEY   = process.env.BREVO_API_KEY || '';

async function main() {
  // 1. Récupérer tous les fantômes (gratuit + jamais utilisé)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,email,nom&plan=eq.gratuit&repurpose_count=eq.0`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const users = await res.json();
  console.log(`→ ${users.length} fantômes trouvés`);

  let sent = 0, errors = 0;

  for (const user of users) {
    if (!user.email) continue;
    const prenom = user.nom ? user.nom.split(' ')[0] : 'toi';

    const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY },
      body: JSON.stringify({
        sender: { email: 'contact@creatis.app', name: 'Créatis' },
        to: [{ email: user.email }],
        subject: "t'as vu ton clip ?",
        htmlContent: `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#111;">

<p style="font-size:16px;line-height:1.7;margin:0 0 16px;">Salut ${prenom},</p>

<p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Tu t'es inscrit sur Créatis mais t'as pas encore lancé ton analyse.</p>

<p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Ça prend 30 secondes — uploade n'importe quelle vidéo, même une vieille. L'IA trouve les moments viraux, coupe en 9:16, brûle les sous-titres.</p>

<p style="font-size:15px;line-height:1.7;margin:0 0 24px;">Un créateur a fait <strong>532€</strong> avec un seul clip sorti de cette façon.</p>

<a href="https://creatis.app/generateur-clips-viraux.html" style="display:inline-block;background:#10b981;color:#000;font-weight:800;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;">Voir mes clips →</a>

<p style="font-size:13px;color:#999;margin-top:32px;">— Créatis · <a href="https://creatis.app" style="color:#999;">creatis.app</a></p>

</div>`
      })
    });

    if (emailRes.ok) {
      sent++;
      console.log(`✓ ${user.email}`);
    } else {
      errors++;
      const err = await emailRes.json().catch(() => ({}));
      console.error(`✗ ${user.email} —`, err.message || emailRes.status);
    }

    // Pause 200ms pour éviter rate limit Brevo
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n✅ Envoyés : ${sent} | Erreurs : ${errors}`);
}

main().catch(console.error);
