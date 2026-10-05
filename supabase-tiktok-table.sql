-- Colle ce SQL dans Supabase > SQL Editor > New Query
-- Table de suivi outreach TikTok micro-influenceurs

CREATE TABLE IF NOT EXISTS tiktok_outreach (
  handle      TEXT PRIMARY KEY,
  name        TEXT,
  email       TEXT,
  followers   INTEGER DEFAULT 0,
  sujet       TEXT,
  status      TEXT DEFAULT 'pending',  -- pending | sent | error | dm_done
  sent_at     TIMESTAMPTZ,
  error       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index statut pour filtrer rapidement les pending
CREATE INDEX IF NOT EXISTS idx_tiktok_status ON tiktok_outreach(status);

-- Trigger updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tiktok_outreach_updated_at
  BEFORE UPDATE ON tiktok_outreach
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Pas de RLS — accès serveur uniquement via service key
ALTER TABLE tiktok_outreach DISABLE ROW LEVEL SECURITY;
