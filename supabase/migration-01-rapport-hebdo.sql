-- ============================================================
--  ARDOISE — migration 01 : rapport hebdomadaire
--  PROJET DÉDIÉ. Ne jamais exécuter sur le projet Créatis.
--  Supabase → SQL Editor → New query → coller → Run.
--
--  Rejouable sans dommage : tout est en "if not exists" / "or replace".
--  Inutile si vous venez d'exécuter schema.sql, qui contient déjà tout ceci.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Préférences d'envoi
-- ------------------------------------------------------------
alter table public.profils
  add column if not exists rapport_hebdo      boolean not null default true,
  add column if not exists dernier_rapport_le timestamptz;

comment on column public.profils.rapport_hebdo is
  'Reçoit le rapport du lundi. Coupé par le lien de désinscription ou depuis Réglages.';
comment on column public.profils.dernier_rapport_le is
  'Dernier envoi réussi. Empêche un doublon si la tâche planifiée se déclenche deux fois.';

-- La tâche du lundi lit ces trois colonnes ensemble.
create index if not exists profils_rapport_idx
  on public.profils (statut_abo, rapport_hebdo, dernier_rapport_le);

-- Le rapport recalcule les jours restants à la date du jour à partir de
-- date_ref : sans elle, une ligne ne peut pas être comptée à rebours.
create index if not exists prelev_rapport_idx
  on public.prelevements (profil, statut, date_ref);

-- ------------------------------------------------------------
-- 2. Le plan et le statut d'abonnement n'appartiennent pas au client
--
--    La policy "profil maj" autorise un client à modifier SON profil —
--    y compris, jusqu'ici, statut_abo et plan. Avec la clé anon, qui est
--    publique par construction, n'importe quel compte pouvait donc
--    s'activer un abonnement Groupe sans payer. Le commentaire du schéma
--    disait que seuls les webhooks écrivent ces colonnes ; ce déclencheur
--    le rend vrai.
--
--    Les écritures venant du navigateur (rôles anon / authenticated) sont
--    ramenées à l'ancienne valeur. Le webhook Stripe (service_role) et
--    l'éditeur SQL passent.
-- ------------------------------------------------------------
create or replace function public.protege_champs_abo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role()::text, '') in ('anon', 'authenticated') then
    new.id                := old.id;
    new.cree_le           := old.cree_le;
    new.plan              := old.plan;
    new.statut_abo        := old.statut_abo;
    new.nb_etablissements := old.nb_etablissements;
    new.stripe_client     := old.stripe_client;
    new.stripe_abo        := old.stripe_abo;
    new.abo_fin_le        := old.abo_fin_le;
  end if;
  return new;
end $$;

drop trigger if exists profils_protege_abo on public.profils;
create trigger profils_protege_abo
  before update on public.profils
  for each row execute function public.protege_champs_abo();

-- ------------------------------------------------------------
-- 3. La vue de pilotage est pour vous, pas pour le public
--
--    Une vue appartient à son créateur et contourne donc la RLS des
--    tables qu'elle lit. Supabase accorde par défaut le select aux rôles
--    anon et authenticated : la vue rendait lisible, avec la clé publique,
--    ce que la table prospects interdit justement de lire.
--    Elle reste consultable dans l'éditeur SQL du tableau de bord.
-- ------------------------------------------------------------
revoke all on public.pilotage from anon, authenticated;

-- ============================================================
--  VÉRIFICATIONS
-- ============================================================
-- Les colonnes sont là :
--   select column_name from information_schema.columns
--    where table_name = 'profils' and column_name in ('rapport_hebdo','dernier_rapport_le');
--
-- Le déclencheur est actif :
--   select tgname from pg_trigger where tgrelid = 'public.profils'::regclass;
--
-- La vue n'est plus publique (doit renvoyer 0 ligne) :
--   select grantee from information_schema.role_table_grants
--    where table_name = 'pilotage' and grantee in ('anon','authenticated');
