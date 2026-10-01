-- Quotas mensuels par plan — grille Starter 9,95€ / Pro 14€ / Pro Annuel 149€ (25/07/2026)
--
-- Deux compteurs distincts, tous deux à remise à zéro implicite : la colonne `*_reset` stocke
-- le mois ("YYYY-M"). Si elle ne correspond pas au mois courant, le compteur est considéré à 0.
-- Aucun cron n'est nécessaire.
--
--   repurpose_count / repurpose_reset  → clips EXPORTÉS ce mois   (existait déjà)
--   videos_count    / videos_reset     → vidéos ANALYSÉES ce mois (nouveau)
--
-- Pourquoi deux compteurs : une analyse coûte surtout du CPU de transcription, un export coûte du
-- téléchargement + de l'encodage. Ne plafonner que les exports laissait quelqu'un analyser
-- 200 vidéos sans rien exporter — c'est le poste le plus cher.

-- CRITIQUE : la contrainte d'origine n'autorisait que ('gratuit','pro','studio'). Sans ce ALTER,
-- toute écriture de plan='starter' par le webhook Stripe est REJETÉE par PostgreSQL → le client
-- paie 9,95 € et reste en gratuit, en silence (l'erreur est avalée par le try/catch du webhook).
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE public.users ADD CONSTRAINT users_plan_check
  CHECK (plan IN ('gratuit', 'starter', 'pro', 'studio'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS videos_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS videos_reset TEXT;

-- repurpose_reset existait dans le code mais pas forcément en base (le quota n'était jamais
-- appliqué qu'au plan gratuit, où un simple "> 0" suffisait).
ALTER TABLE users ADD COLUMN IF NOT EXISTS repurpose_reset TEXT;

CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

-- Quotas appliqués par le code (api/repurpose.js → QUOTAS, api/user-sync.js → QUOTA_CLIPS,
-- js/config.js → CONFIG.PLANS). Table de référence, non lue par l'application :
--
--   plan     | vidéos/mois | clips/mois
--   ---------|-------------|------------
--   gratuit  |      1      |      1      (essai, sans carte bancaire)
--   starter  |      5      |     20      (9,95 €/mois)
--   pro      |     30      |    150      (14 €/mois — et 149 €/an)
--   studio   |     30      |    150      (legacy, aligné sur pro)

-- Les abonnés existants au tarif 19,90€ restent en plan 'pro' : ils gagnent le quota Pro sans
-- rien faire, et leur price ID legacy reste mappé dans api/stripe-webhook.js.
