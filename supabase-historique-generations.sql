-- Historique des générations de clips
--
-- ATTENTION AU NOM : une table `generations` PRÉEXISTAIT dans cette base (colonnes id, user_id,
-- created_at, count, plan) — un ancien compteur d'usage. Le premier jet de ce script utilisait ce
-- nom avec `create table if not exists` : voyant la table déjà présente, PostgreSQL n'a rien fait,
-- aucune colonne n'a été ajoutée, et toutes les écritures échouaient avec
-- « column generations.nom does not exist ». D'où `clip_generations`. Ne pas renommer.
--
-- Pourquoi cette table : avant, une génération ne vivait que dans le localStorage du navigateur
-- (clé `creatis_last_analysis`), écrasée à chaque nouvelle analyse et purgée au bout de 4 h. Un
-- utilisateur ouvrant l'email « Tes clips sont prêts » depuis son téléphone retombait sur un écran
-- d'upload vide. Signalé le 03/08/2026 : « c'est comme généré dans le vent ».
--
-- Ce qu'on stocke : uniquement les métadonnées (bornes des clips, titres, scores, source).
-- Les vidéos ne sont PAS ici — elles vivent dans le cache R2 `seg/{video_id}/{début}_{fin}.mp4`
-- et se re-téléchargent au besoin. C'est ce qui rend l'historique quasi gratuit en stockage.

create table if not exists public.clip_generations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  nom          text,
  source_type  text not null default 'youtube',   -- 'youtube' | 'upload'
  youtube_url  text,
  video_id     text,
  nb_clips     int  not null default 0,
  clips        jsonb not null default '[]'::jsonb,
  segments     jsonb not null default '[]'::jsonb,
  plan         text
);

-- La liste se lit toujours « mes générations, les plus récentes d'abord ».
create index if not exists clip_generations_user_date_idx
  on public.clip_generations (user_id, created_at desc);

alter table public.clip_generations enable row level security;

-- Un utilisateur ne voit et ne crée que ses propres générations.
drop policy if exists "clip_generations_select_own" on public.clip_generations;
create policy "clip_generations_select_own" on public.clip_generations
  for select using (auth.uid() = user_id);

drop policy if exists "clip_generations_insert_own" on public.clip_generations;
create policy "clip_generations_insert_own" on public.clip_generations
  for insert with check (auth.uid() = user_id);

drop policy if exists "clip_generations_delete_own" on public.clip_generations;
create policy "clip_generations_delete_own" on public.clip_generations
  for delete using (auth.uid() = user_id);

-- Vérification : doit renvoyer les 11 colonnes ci-dessus.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'clip_generations'
order by ordinal_position;
