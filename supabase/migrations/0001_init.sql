-- 0001_init.sql — Phase 1 slice: profile table + auth trigger.
-- Phase 2 will extend this migration with pool, match, score, bet_* tables, RLS,
-- and scoring functions per architecture.md §4. Keep all schema additions
-- consolidated here so the project has a single initial migration.

-- ─── profile ────────────────────────────────────────────────────────────────
create table if not exists public.profile (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  avatar_url    text,
  email_opt_out boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table public.profile enable row level security;

-- A user can always read and update their own profile.
-- Phase 2 will broaden the read policy so members of the same pool can see
-- each other's names.
create policy profile_self_select on public.profile for select
  using (id = auth.uid());

create policy profile_self_update on public.profile for update
  using (id = auth.uid()) with check (id = auth.uid());

-- ─── auth.users → public.profile trigger ────────────────────────────────────
-- Inserts a profile row when a new auth.users row is created. The user's name
-- is taken from user_metadata.name (set by the sign-up server action); falls
-- back to the email local-part if absent.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile (id, name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
