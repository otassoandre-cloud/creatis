-- Créatis — Migration : crédits Repurpose Vidéo
-- À exécuter dans Supabase SQL Editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS repurpose_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repurpose_reset TEXT NOT NULL DEFAULT '';

-- Reset mensuel automatique via RPC (appelé par cron ou à la connexion)
CREATE OR REPLACE FUNCTION reset_repurpose_count_if_needed(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_reset TEXT;
  v_current TEXT;
BEGIN
  SELECT repurpose_reset INTO v_reset FROM users WHERE id = p_user_id;
  v_current := to_char(now(), 'YYYY-MM');
  IF v_reset IS DISTINCT FROM v_current THEN
    UPDATE users SET repurpose_count = 0, repurpose_reset = v_current WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
