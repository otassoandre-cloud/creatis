-- ===== CRÉATIS — SCHÉMA SUPABASE =====
-- Exécuter dans : Supabase Dashboard > SQL Editor
-- URL : https://supabase.com/dashboard/project/[ton-projet]/sql

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- TABLE : users
-- Un enregistrement par utilisateur Supabase Auth
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                 TEXT UNIQUE NOT NULL,
  plan                  TEXT NOT NULL DEFAULT 'gratuit' CHECK (plan IN ('gratuit', 'pro', 'studio')),
  generations_count     INTEGER NOT NULL DEFAULT 0,
  miniatures_count      INTEGER NOT NULL DEFAULT 0,
  miniatures_used       INTEGER NOT NULL DEFAULT 0,
  miniatures_reset_at   TIMESTAMPTZ,
  chaine_id             TEXT,
  chaine_nom            TEXT,
  chaine_abonnes        INTEGER DEFAULT 0,
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  plan_expires_at       TIMESTAMPTZ,
  last_generation_at    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- TABLE : generations
-- Historique de chaque appel IA
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.generations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES public.users(id) ON DELETE CASCADE,
  agent_id   TEXT NOT NULL,
  plan       TEXT NOT NULL DEFAULT 'gratuit',
  tokens     INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- TABLE : abonnements
-- Historique des abonnements Stripe
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.abonnements (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                UUID REFERENCES public.users(id) ON DELETE SET NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id     TEXT,
  plan                   TEXT NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'active',
  montant_centimes       INTEGER DEFAULT 0,
  annuel                 BOOLEAN DEFAULT FALSE,
  canceled_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- RLS (Row Level Security)
-- ─────────────────────────────────────────────────────────────

-- Activer RLS sur toutes les tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abonnements ENABLE ROW LEVEL SECURITY;

-- users : chaque utilisateur ne voit que son propre enregistrement
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Le service role peut tout faire (pour les Vercel Functions)
-- (le service_key bypasse RLS par défaut dans Supabase)

-- generations : lecture propre
CREATE POLICY "generations_select_own" ON public.generations
  FOR SELECT USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- FONCTION : auto-créer un user après signup Auth
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, plan, created_at, updated_at)
  VALUES (NEW.id, NEW.email, 'gratuit', NOW(), NOW())
  ON CONFLICT (email) DO UPDATE SET updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger : déclencher après chaque nouveau signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- INDEX pour performances
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON public.users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON public.generations(created_at);
CREATE INDEX IF NOT EXISTS idx_abonnements_stripe_sub ON public.abonnements(stripe_subscription_id);

-- ─────────────────────────────────────────────────────────────
-- VÉRIFICATION
-- ─────────────────────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
