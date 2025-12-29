-- Enable required extensions (usually enabled by default on Supabase)
create extension if not exists pgcrypto;

-- Tasks table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  scope text not null check (scope in ('perso','travail')),
  type text not null check (type in ('loisir','menage','travail')),
  importance text not null check (importance in ('petite','moyenne','grande','urgente')),
  status text not null check (status in ('a_faire','en_cours','fini')),
  location text not null check (location in ('partout','maison','travail')),
  duration text not null check (duration in ('courte','moyenne','longue')),
  due_date date,
  notes text,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_scope_idx on public.tasks(scope);
create index if not exists tasks_created_at_idx on public.tasks(created_at desc);

-- RLS
alter table public.tasks enable row level security;

do $$ begin
  create policy "Tasks are viewable by owner" on public.tasks
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Tasks are insertable by owner" on public.tasks
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Tasks are updatable by owner" on public.tasks
    for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Tasks are deletable by owner" on public.tasks
    for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Optional seed helper: insert a task for a given email
-- Replace YOUR_EMAIL here before running this block in Supabase SQL Editor
-- Note: auth.uid() is NULL in the SQL Editor; we resolve the user_id via the email
-- begin;
-- with u as (
--   select id from auth.users where email = 'YOUR_EMAIL'
-- )
-- insert into public.tasks (user_id, title, scope, type, importance, status, location, duration, due_date, notes)
-- select u.id, 'Première tâche', 'perso', 'loisir', 'moyenne', 'a_faire', 'partout', 'courte', null, 'Tâche de test'
-- from u;
-- commit;
