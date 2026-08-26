-- ===== Essai gratuit 7 jours sur le plan Pro Annuel =====
-- Deploye le 26/08/2026 directement via l'API Management Supabase (SUPABASE_ACCESS_TOKEN
-- fonctionnel ce jour-la) — ce fichier sert de trace, la migration a deja ete appliquee.
--
-- trial_ends_at : date de fin d'essai, ecrite par api/stripe-webhook.js (checkout.session.completed)
--   a partir de session.metadata.trial_ends_at, elle-meme calculee au moment de la creation de la
--   session dans api/create-checkout-session.js. NULL pour tout abonnement sans essai.
-- relance_essai_envoyee : evite de renvoyer 2 fois l'email de relance J-2 (api/user-sync.js,
--   action relance_essai_annuel_j5). Passe a true apres l'envoi, jamais remise a false.

ALTER TABLE public.abonnements
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS relance_essai_envoyee BOOLEAN DEFAULT FALSE;
