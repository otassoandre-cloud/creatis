-- Ajouter la colonne de suivi J+7 sur la table prospects
ALTER TABLE prospects_contacted
  ADD COLUMN IF NOT EXISTS affiliate_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS affiliate_sent_at TIMESTAMPTZ;

-- Index pour requêter rapidement les J+7 pending
CREATE INDEX IF NOT EXISTS idx_prospects_affiliate
  ON prospects_contacted(date_contact, affiliate_sent);
