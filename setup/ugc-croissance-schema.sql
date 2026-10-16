-- ===== CRÉATIS — Programme « publie une vidéo, 1 mois offert (carte requise) » =====
-- Ajouté le 21/08/2026. Une personne bloquée au paywall peut, au lieu de payer,
-- soumettre le lien d'une vidéo qui parle de Créatis (TikTok/Instagram/YouTube).
-- Revue manuelle par un humain (pas de vérification automatique des vues — les
-- plateformes n'exposent pas ce chiffre de façon fiable) : voir admin-ugc-croissance.html.
--
-- Le mois offert n'est PAS un octroi silencieux : l'approbation envoie un lien vers un vrai
-- essai Stripe (carte enregistrée, 30 jours à 0€, puis prélèvement automatique au tarif normal
-- sauf résiliation). Voir api/create-checkout-session.js (paramètre essaiToken) et
-- api/user-sync.js (action ugc_decider). Logique complète dans PROJECT_MAP / mémoire de session
-- du 21/08/2026.
--
-- Usage : node setup/executer-sql.js setup/ugc-croissance-schema.sql

CREATE TABLE IF NOT EXISTS public.ugc_soumissions (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id           UUID REFERENCES public.users(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,             -- dénormalisé : lisible dans l'admin sans jointure
  video_url         TEXT NOT NULL,
  plateforme        TEXT NOT NULL DEFAULT 'autre'
                      CHECK (plateforme IN ('tiktok', 'instagram', 'youtube', 'autre')),

  statut            TEXT NOT NULL DEFAULT 'en_attente'
                      CHECK (statut IN ('en_attente', 'approuve', 'rejete')),
  vues_constatees   INTEGER,                   -- rempli par l'admin au moment de la décision
  note_admin        TEXT,

  -- Jeton du lien d'essai envoyé par email à l'approbation. Généré dès la soumission (pas
  -- seulement à la décision) pour n'avoir qu'une seule colonne à lire des deux côtés du flux.
  -- Un jeton devine-able (id séquentiel) permettrait à n'importe qui de forger un lien d'essai
  -- gratuit sans jamais avoir rien publié — d'où un UUID à part, distinct de `id`.
  essai_token       UUID DEFAULT uuid_generate_v4() NOT NULL,
  essai_utilise     BOOLEAN DEFAULT false NOT NULL,  -- passe à true dès qu'une session Stripe est créée avec ce jeton (empêche de réutiliser le lien)

  cree_le           TIMESTAMPTZ DEFAULT NOW(),
  traite_le         TIMESTAMPTZ,

  UNIQUE (video_url),  -- une même URL ne peut pas être soumise deux fois (par le même compte ou un autre)
  UNIQUE (essai_token)
);

CREATE INDEX IF NOT EXISTS idx_ugc_soumissions_statut ON public.ugc_soumissions (statut, cree_le DESC);
CREATE INDEX IF NOT EXISTS idx_ugc_soumissions_user ON public.ugc_soumissions (user_id);
CREATE INDEX IF NOT EXISTS idx_ugc_soumissions_essai_token ON public.ugc_soumissions (essai_token);

ALTER TABLE public.ugc_soumissions ENABLE ROW LEVEL SECURITY;
-- Aucune policy publique : la table n'est lue/écrite que via la clé service_role
-- côté serveur (api/user-sync.js et api/create-checkout-session.js), jamais directement
-- depuis le navigateur.
