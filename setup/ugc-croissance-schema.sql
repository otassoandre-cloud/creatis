-- ===== CRÉATIS — Programme « publie une vidéo, 1 mois offert » =====
-- Ajouté le 21/08/2026. Une personne bloquée au paywall peut, au lieu de payer,
-- soumettre le lien d'une vidéo qui parle de Créatis (TikTok/Instagram/YouTube).
-- Revue manuelle par un humain (pas de vérification automatique des vues — les
-- plateformes n'exposent pas ce chiffre de façon fiable) : voir admin-ugc-croissance.html.
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

  cree_le           TIMESTAMPTZ DEFAULT NOW(),
  traite_le         TIMESTAMPTZ,

  UNIQUE (video_url)  -- une même URL ne peut pas être soumise deux fois (par le même compte ou un autre)
);

CREATE INDEX IF NOT EXISTS idx_ugc_soumissions_statut ON public.ugc_soumissions (statut, cree_le DESC);
CREATE INDEX IF NOT EXISTS idx_ugc_soumissions_user ON public.ugc_soumissions (user_id);

ALTER TABLE public.ugc_soumissions ENABLE ROW LEVEL SECURITY;
-- Aucune policy publique : la table n'est lue/écrite que via la clé service_role
-- côté serveur (api/ugc-croissance.js), jamais directement depuis le navigateur.
