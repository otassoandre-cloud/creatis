-- Table blacklist emails — jamais contacter ces adresses
CREATE TABLE IF NOT EXISTS email_blacklist (
  email TEXT PRIMARY KEY,
  reason TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sidjie — a reçu trop d'emails par bug, demande explicite de ne plus contacter
INSERT INTO email_blacklist (email, reason) VALUES
  ('sidjiepro@gmail.com', 'demande explicite - trop d emails reçus par bug')
ON CONFLICT (email) DO NOTHING;

-- Index
CREATE INDEX IF NOT EXISTS idx_blacklist_email ON email_blacklist(email);
