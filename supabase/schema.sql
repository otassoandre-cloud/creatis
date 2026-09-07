-- ============================================================
--  ARDOISE — schéma Supabase
--  PROJET DÉDIÉ. Ne jamais exécuter sur le projet Créatis.
--  Supabase → SQL Editor → New query → coller → Run.
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILS  (1 ligne par compte, liée à auth.users)
-- ------------------------------------------------------------
create table if not exists public.profils (
  id              uuid primary key references auth.users(id) on delete cascade,
  cree_le         timestamptz not null default now(),
  email           text,
  nom_restaurant  text,
  telephone       text,
  -- abonnement
  plan            text not null default 'aucun',   -- aucun | service | maison | groupe
  statut_abo      text not null default 'inactif', -- inactif | actif | en_retard | annule
  nb_etablissements int not null default 1,
  stripe_client   text,
  stripe_abo      text,
  abo_fin_le      timestamptz,
  -- rapport hebdomadaire
  rapport_hebdo      boolean not null default true,
  dernier_rapport_le timestamptz
);
-- la tâche du lundi lit ces trois colonnes ensemble
create index if not exists profils_rapport_idx
  on public.profils (statut_abo, rapport_hebdo, dernier_rapport_le);

-- création automatique du profil à l'inscription
create or replace function public.cree_profil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profils (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.cree_profil();

-- ------------------------------------------------------------
-- 2. IMPORTS  (1 ligne par relevé déposé)
--    On stocke le RÉSULTAT, jamais le fichier.
-- ------------------------------------------------------------
create table if not exists public.imports (
  id             uuid primary key default gen_random_uuid(),
  profil         uuid not null references public.profils(id) on delete cascade,
  cree_le        timestamptz not null default now(),
  plateforme     text,
  fenetre_jours  int,
  delai_verifie  boolean default false,
  nom_fichier    text,
  nb_lignes      int  default 0,
  nb_deposer     int  default 0,
  nb_hors_delai  int  default 0,
  montant_total  numeric(10,2) default 0
);
create index if not exists imports_profil_idx on public.imports (profil, cree_le desc);

-- ------------------------------------------------------------
-- 3. PRÉLÈVEMENTS  (le détail, ligne à ligne)
-- ------------------------------------------------------------
create table if not exists public.prelevements (
  id             uuid primary key default gen_random_uuid(),
  import         uuid not null references public.imports(id) on delete cascade,
  profil         uuid not null references public.profils(id) on delete cascade,
  reference      text,
  motif          text,
  montant        numeric(10,2) not null default 0,
  contestable    boolean default false,
  date_ref       date,
  jours_restants int,
  -- suivi de la contestation, saisi par le restaurateur
  statut         text not null default 'a_deposer',
                 -- a_deposer | depose | gagne | perdu | hors_delai | non_contestable
  depose_le      timestamptz,
  resolu_le      timestamptz,
  montant_gagne  numeric(10,2)
);
create index if not exists prelev_profil_idx on public.prelevements (profil, statut);
create index if not exists prelev_import_idx on public.prelevements (import);
-- le rapport du lundi recalcule les jours restants à partir de date_ref
create index if not exists prelev_rapport_idx on public.prelevements (profil, statut, date_ref);

-- ------------------------------------------------------------
-- 4. PROSPECTS  (analyses anonymes depuis la page publique)
-- ------------------------------------------------------------
create table if not exists public.prospects (
  id            uuid primary key default gen_random_uuid(),
  cree_le       timestamptz not null default now(),
  email         text,
  plateforme    text,
  montant       numeric(10,2),
  nb_lignes     int,
  nb_deposer    int,
  nb_hors_delai int,
  delai_verifie boolean,
  source        text,
  referent      text
);
create index if not exists prospects_cree_le_idx on public.prospects (cree_le desc);

-- ------------------------------------------------------------
-- 5. ÉVÉNEMENTS STRIPE  (idempotence des webhooks)
--    Stripe peut rejouer un événement. Sans cette table, un
--    abonnement pourrait être activé deux fois.
-- ------------------------------------------------------------
create table if not exists public.evenements_stripe (
  id        text primary key,          -- l'id de l'événement Stripe
  recu_le   timestamptz not null default now(),
  type      text
);

-- ============================================================
--  SÉCURITÉ (RLS)
--  La clé anon est publique : elle part dans le code de la page.
--  Tout repose donc sur ces règles. Ne les désactivez jamais.
-- ============================================================

alter table public.profils        enable row level security;
alter table public.imports        enable row level security;
alter table public.prelevements   enable row level security;
alter table public.prospects      enable row level security;
alter table public.evenements_stripe enable row level security;

-- --- profils : chacun ne voit et ne modifie que le sien ---
drop policy if exists "profil lecture" on public.profils;
create policy "profil lecture" on public.profils
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profil maj" on public.profils;
create policy "profil maj" on public.profils
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Le plan et le statut d'abonnement ne sont écrits que par le webhook
-- Stripe, via la clé service_role. La policy ci-dessus, seule, ne suffit
-- pas à l'imposer : elle laisse un client modifier n'importe quelle
-- colonne de SON profil, donc s'activer un abonnement avec la clé anon,
-- qui est publique par construction. Ce déclencheur ramène ces colonnes
-- à leur ancienne valeur pour toute écriture venant du navigateur.
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

-- --- imports ---
drop policy if exists "imports siens" on public.imports;
create policy "imports siens" on public.imports
  for all to authenticated using (auth.uid() = profil) with check (auth.uid() = profil);

-- --- prélèvements ---
drop policy if exists "prelev siens" on public.prelevements;
create policy "prelev siens" on public.prelevements
  for all to authenticated using (auth.uid() = profil) with check (auth.uid() = profil);

-- --- prospects : insertion publique, AUCUNE lecture ---
drop policy if exists "prospect insertion" on public.prospects;
create policy "prospect insertion" on public.prospects
  for insert to anon, authenticated with check (true);
-- volontairement aucune policy de select : sans cela, n'importe qui
-- pourrait aspirer la liste d'emails avec la clé anon publique.

-- --- événements Stripe : aucune policy, donc inaccessible
--     sauf via service_role. C'est voulu.

-- --- fonctions de déclencheur : pas d'appel direct ---
-- PostgREST expose toute fonction du schéma public comme /rest/v1/rpc/...
-- Ces deux-là ne servent que de déclencheurs. Un appel direct échouerait,
-- mais rien ne justifie de laisser la porte ouverte — et l'analyseur de
-- sécurité Supabase le signale, à raison.
-- Les déclencheurs continuent de fonctionner : le droit d'exécution est
-- vérifié à la création du déclencheur, pas à chaque déclenchement.
revoke execute on function public.cree_profil()        from anon, authenticated, public;
revoke execute on function public.protege_champs_abo() from anon, authenticated, public;

-- ============================================================
--  VUE DE PILOTAGE (pour vous, dans le tableau de bord Supabase)
--  Une vue contourne la RLS des tables qu'elle lit, et Supabase
--  accorde le select à anon par défaut : le revoke plus bas est
--  ce qui l'empêche d'être lisible avec la clé publique.
-- ============================================================
create or replace view public.pilotage as
select
  date_trunc('week', cree_le) as semaine,
  plateforme,
  count(*)                    as nb_analyses,
  round(avg(montant), 2)      as montant_moyen,
  round(percentile_cont(0.5) within group (order by montant)::numeric, 2) as montant_median,
  count(*) filter (where email is not null) as nb_emails
from public.prospects
where montant is not null
group by 1, 2
order by 1 desc;

revoke all on public.pilotage from anon, authenticated;

-- ============================================================
--  VÉRIFICATIONS — doivent toutes renvoyer true
-- ============================================================
-- select relname, relrowsecurity from pg_class
--  where relname in ('profils','imports','prelevements','prospects','evenements_stripe');
