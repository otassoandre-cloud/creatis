-- Table paiements_echoues — trace chaque tentative de paiement Stripe qui échoue
-- Alimentée par api/stripe-webhook.js (invoice.payment_failed + customer.subscription.updated)
-- But : mesurer les ventes perdues sans avoir à ouvrir le dashboard Stripe
CREATE TABLE IF NOT EXISTS paiements_echoues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_invoice_id TEXT,
  montant NUMERIC,
  devise TEXT,
  -- 'souscription_echouee' (1er paiement) | 'renouvellement_echoue' | 'incomplete_expired'
  statut TEXT,
  raison TEXT,
  code_erreur TEXT,
  billing_reason TEXT,
  plan TEXT,
  relance_envoyee BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_paiements_echoues_email ON paiements_echoues(email);
CREATE INDEX IF NOT EXISTS idx_paiements_echoues_date ON paiements_echoues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paiements_echoues_statut ON paiements_echoues(statut);

-- Écriture réservée à la service key (le webhook) — aucun accès public
ALTER TABLE paiements_echoues ENABLE ROW LEVEL SECURITY;

-- Cas déjà constaté le 25/07/2026 (rattrapage manuel — le webhook ne l'avait pas tracé)
INSERT INTO paiements_echoues
  (created_at, email, stripe_customer_id, stripe_subscription_id, stripe_invoice_id,
   montant, devise, statut, raison, code_erreur, billing_reason, plan)
VALUES
  ('2026-07-25T01:00:00Z', 'vantegardy11@gmail.com', 'cus_UwIZoaAfAfUIW4mQ',
   'sub_1Tws26AptK6HZtp5CLDW4JOo', 'VNPHSMQK-0014',
   9.95, 'EUR', 'souscription_echouee',
   'Authentification 3D Secure échouée (2 tentatives) — carte de débit Visa La Banque Postale',
   'payment_intent_authentication_failure', 'subscription_create', 'pro');
