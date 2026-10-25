-- Suivi des paliers de récompenses du programme d'affiliation
-- Mémorise le plus haut palier déjà atteint par affilié pour éviter de renvoyer
-- l'email d'alerte à chaque fois que le compte de filleuls actifs est recalculé.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS affiliate_highest_tier INTEGER DEFAULT 0;
