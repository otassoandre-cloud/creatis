-- ===================================================
--  CRÉATIS — Schéma Supabase
--  Exécuter dans Supabase → SQL Editor
-- ===================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ===================================================
--  TABLE : users
-- ===================================================
CREATE TABLE IF NOT EXISTS public.users (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email                 TEXT UNIQUE NOT NULL,
  nom                   TEXT,
  avatar_url            TEXT,

  -- Plan & facturation
  plan                  TEXT NOT NULL DEFAULT 'gratuit'
                          CHECK (plan IN ('gratuit', 'trial', 'starter', 'pro', 'agency')),
  plan_expires_at       TIMESTAMPTZ,
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,

  -- YouTube
  chaine_id             TEXT,
  chaine_nom            TEXT,
  chaine_abonnes        INTEGER DEFAULT 0,
  chaine_avatar         TEXT,
  youtube_access_token  TEXT,
  youtube_refresh_token TEXT,
  youtube_token_expires TIMESTAMPTZ,

  -- Compteurs
  generations_count     INTEGER DEFAULT 0,
  miniatures_count      INTEGER DEFAULT 0,
  miniatures_used       INTEGER DEFAULT 0,
  miniatures_reset_at   TIMESTAMPTZ DEFAULT NOW(),
  last_generation_at    TIMESTAMPTZ,

  -- Meta
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  last_login_at         TIMESTAMPTZ,
  source                TEXT DEFAULT 'web'
);

-- Index
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan ON public.users(plan);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON public.users(stripe_customer_id);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Politique : service role a tous les droits (pour les Vercel Functions)
CREATE POLICY "Service role full access" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- Politique : utilisateur peut lire/modifier son propre profil (si auth Supabase activée)
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid()::text = id::text);


-- ===================================================
--  TABLE : generations
-- ===================================================
CREATE TABLE IF NOT EXISTS public.generations (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
  agent_id    TEXT NOT NULL,
  agent_type  TEXT DEFAULT 'texte' CHECK (agent_type IN ('texte', 'image', 'miniature')),
  plan        TEXT NOT NULL DEFAULT 'gratuit',
  tokens_used INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generations_user_id ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON public.generations(created_at);

ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.generations
  FOR ALL USING (auth.role() = 'service_role');


-- ===================================================
--  TABLE : abonnements
-- ===================================================
CREATE TABLE IF NOT EXISTS public.abonnements (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id               UUID REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id    TEXT,
  plan                  TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid')),
  montant_centimes      INTEGER NOT NULL,
  devise                TEXT DEFAULT 'eur',
  annuel                BOOLEAN DEFAULT FALSE,
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  canceled_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abonnements_user_id ON public.abonnements(user_id);
CREATE INDEX IF NOT EXISTS idx_abonnements_stripe ON public.abonnements(stripe_subscription_id);

ALTER TABLE public.abonnements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.abonnements
  FOR ALL USING (auth.role() = 'service_role');


-- ===================================================
--  TABLE : prospects
-- ===================================================
CREATE TABLE IF NOT EXISTS public.prospects (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  youtube_id    TEXT UNIQUE,
  nom           TEXT NOT NULL,
  email         TEXT,
  url           TEXT,
  abonnes       INTEGER DEFAULT 0,
  niche         TEXT,
  score         INTEGER DEFAULT 50,
  statut        TEXT DEFAULT 'nouveau'
                  CHECK (statut IN ('nouveau', 'contacte', 'repondu', 'interesse', 'client', 'refuse')),
  notes         TEXT,
  date_contact  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.prospects
  FOR ALL USING (auth.role() = 'service_role');


-- ===================================================
--  FONCTION : auto-mise à jour updated_at
-- ===================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_abonnements_updated_at
  BEFORE UPDATE ON public.abonnements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ===================================================
--  FONCTION : reset mensuel des miniatures
--  À déclencher via Supabase Edge Functions ou cron
-- ===================================================
CREATE OR REPLACE FUNCTION public.reset_miniatures_mensuelles()
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET miniatures_used = 0,
      miniatures_reset_at = NOW()
  WHERE miniatures_reset_at < date_trunc('month', NOW());
END;
$$ LANGUAGE plpgsql;


-- ===================================================
--  VIEWS : dashboard analytics
-- ===================================================
CREATE OR REPLACE VIEW public.stats_plans AS
SELECT
  plan,
  COUNT(*) AS nb_utilisateurs,
  SUM(generations_count) AS total_generations,
  AVG(generations_count) AS avg_generations,
  SUM(miniatures_used) AS total_miniatures
FROM public.users
GROUP BY plan
ORDER BY nb_utilisateurs DESC;

CREATE OR REPLACE VIEW public.stats_agents AS
SELECT
  agent_id,
  COUNT(*) AS nb_utilisations,
  AVG(tokens_used) AS avg_tokens,
  AVG(duration_ms) AS avg_duration_ms
FROM public.generations
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY agent_id
ORDER BY nb_utilisations DESC;


-- ===================================================
--  DONNÉES INITIALES (facultatif)
-- ===================================================
-- INSERT INTO public.users (email, plan, nom, source)
-- VALUES ('admin@creatis.app', 'agency', 'Admin', 'seed');


-- ===================================================
--  VÉRIFICATION
-- ===================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
