-- 0001_init.sql — full Phase 2 schema for Bolão Copa 2026.
--
-- This migration is idempotent: every CREATE uses IF NOT EXISTS, every TRIGGER
-- is preceded by DROP IF EXISTS, every FUNCTION/VIEW uses OR REPLACE. Safe to
-- re-run after the Phase 1 slice (profile + handle_new_user trigger) was applied.
--
-- RLS policies live in 0002_rls.sql; scoring functions in 0003_scoring.sql;
-- seed data in 0004_seed_teams_groups.sql and 0005_seed_matches.sql.

-- ─── enums ──────────────────────────────────────────────────────────────────
do $$ begin
  create type public.match_stage as enum ('group', 'r32', 'r16', 'qf', 'sf', 'third', 'final');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.match_status as enum ('scheduled', 'live', 'finished', 'postponed');
exception
  when duplicate_object then null;
end $$;

-- ─── profile ────────────────────────────────────────────────────────────────
create table if not exists public.profile (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  avatar_url    text,
  email_opt_out boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table public.profile enable row level security;

-- ─── pool ───────────────────────────────────────────────────────────────────
create table if not exists public.pool (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  invite_code  text not null unique,
  admin_id     uuid not null references public.profile(id),
  created_at   timestamptz not null default now()
);

alter table public.pool enable row level security;

create index if not exists pool_admin_idx on public.pool(admin_id);

-- ─── pool_member ────────────────────────────────────────────────────────────
-- A user can belong to many pools, capped at 10 by enforce_pool_member_cap().
create table if not exists public.pool_member (
  pool_id   uuid not null references public.pool(id) on delete cascade,
  user_id   uuid not null references public.profile(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (pool_id, user_id)
);

alter table public.pool_member enable row level security;

create index if not exists pool_member_user_idx on public.pool_member(user_id);

create or replace function public.enforce_pool_member_cap()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.pool_member where user_id = new.user_id) >= 10 then
    raise exception 'pool_member_cap_reached'
      using errcode = 'check_violation',
            message = 'Você já participa do número máximo de bolões (10).';
  end if;
  return new;
end;
$$;

drop trigger if exists pool_member_cap on public.pool_member;
create trigger pool_member_cap
  before insert on public.pool_member
  for each row execute function public.enforce_pool_member_cap();

-- ─── team ───────────────────────────────────────────────────────────────────
-- iso_code stores the FIFA 3-letter code (BRA, ARG, GER, NED, KSA, ...) — these
-- match ISO 3166-1 alpha-3 for most teams but differ for some (FIFA: GER, NED,
-- SUI, KSA, ALG, RSA, HAI; ISO: DEU, NLD, CHE, SAU, DZA, ZAF, HTI). Stored UNIQUE
-- so the match seed can use ISO codes as the join key in a single INSERT … SELECT.
create table if not exists public.team (
  id          uuid primary key default gen_random_uuid(),
  external_id integer unique,
  name        text not null,
  iso_code    text not null unique,
  flag_url    text,
  group_code  char(1)
);

alter table public.team enable row level security;

create index if not exists team_group_idx on public.team(group_code);

-- ─── match ──────────────────────────────────────────────────────────────────
-- external_id = FIFA match number (1..104). Surrogate UUID PK so a future
-- re-seed from a different source doesn't break existing bet rows.
create table if not exists public.match (
  id            uuid primary key default gen_random_uuid(),
  external_id   integer unique,
  stage         public.match_stage not null,
  group_code    char(1),
  home_team_id  uuid references public.team(id),
  away_team_id  uuid references public.team(id),
  kickoff_at    timestamptz not null,
  home_score    smallint,
  away_score    smallint,
  status        public.match_status not null default 'scheduled',
  updated_at    timestamptz not null default now()
);

alter table public.match enable row level security;

create index if not exists match_kickoff_idx on public.match(kickoff_at);
create index if not exists match_stage_idx on public.match(stage);

-- ─── bet_match ──────────────────────────────────────────────────────────────
create table if not exists public.bet_match (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profile(id) on delete cascade,
  pool_id       uuid not null references public.pool(id) on delete cascade,
  match_id      uuid not null references public.match(id),
  home_score    smallint not null check (home_score between 0 and 20),
  away_score    smallint not null check (away_score between 0 and 20),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, pool_id, match_id)
);

alter table public.bet_match enable row level security;

create index if not exists bet_match_pool_user_idx on public.bet_match(pool_id, user_id);
create index if not exists bet_match_match_idx on public.bet_match(match_id);

-- ─── bet_group ──────────────────────────────────────────────────────────────
create table if not exists public.bet_group (
  user_id        uuid not null references public.profile(id) on delete cascade,
  pool_id        uuid not null references public.pool(id) on delete cascade,
  group_code     char(1) not null,
  first_team_id  uuid not null references public.team(id),
  second_team_id uuid not null references public.team(id),
  updated_at     timestamptz not null default now(),
  primary key (user_id, pool_id, group_code),
  check (first_team_id <> second_team_id)
);

alter table public.bet_group enable row level security;

-- ─── bet_knockout ───────────────────────────────────────────────────────────
create table if not exists public.bet_knockout (
  user_id     uuid not null references public.profile(id) on delete cascade,
  pool_id     uuid not null references public.pool(id) on delete cascade,
  stage       public.match_stage not null check (stage in ('r32','r16','qf','sf','final')),
  slot        smallint not null,
  team_id     uuid not null references public.team(id),
  updated_at  timestamptz not null default now(),
  primary key (user_id, pool_id, stage, slot)
);

alter table public.bet_knockout enable row level security;

-- ─── bet_champion ───────────────────────────────────────────────────────────
create table if not exists public.bet_champion (
  user_id    uuid not null references public.profile(id) on delete cascade,
  pool_id    uuid not null references public.pool(id) on delete cascade,
  team_id    uuid not null references public.team(id),
  updated_at timestamptz not null default now(),
  primary key (user_id, pool_id)
);

alter table public.bet_champion enable row level security;

-- ─── score ──────────────────────────────────────────────────────────────────
-- Materialized per-user-per-match score, including the tiebreaker flags from
-- requirements §4.5. Populated by recompute_match() (see 0003_scoring.sql).
create table if not exists public.score (
  user_id              uuid not null references public.profile(id) on delete cascade,
  pool_id              uuid not null references public.pool(id) on delete cascade,
  match_id             uuid not null references public.match(id),
  points               smallint not null,
  is_exact_score       boolean  not null default false,
  is_correct_winner    boolean  not null default false,
  computed_at          timestamptz not null default now(),
  primary key (user_id, pool_id, match_id)
);

alter table public.score enable row level security;

create index if not exists score_pool_idx on public.score(pool_id);

-- ─── reminder_sent ──────────────────────────────────────────────────────────
create table if not exists public.reminder_sent (
  user_id   uuid not null references public.profile(id) on delete cascade,
  match_id  uuid not null references public.match(id),
  sent_at   timestamptz not null default now(),
  primary key (user_id, match_id)
);

alter table public.reminder_sent enable row level security;

-- ─── helper views for RLS deadlines ─────────────────────────────────────────
create or replace view public.first_kickoff as
  select min(kickoff_at) as t from public.match where stage = 'group';

create or replace view public.first_r32_kickoff as
  select min(kickoff_at) as t from public.match where stage = 'r32';

-- ─── pool_ranking aggregated view ───────────────────────────────────────────
-- Read path for the ranking page. The client orders by
--   points desc, exact_count desc, correct_winner_count desc, name asc
-- exactly as per requirements §4.5.
create or replace view public.pool_ranking as
select
  s.pool_id,
  s.user_id,
  p.name,
  sum(s.points)::int                                                       as points,
  count(*) filter (where s.is_exact_score)                                 as exact_count,
  count(*) filter (where s.is_correct_winner and not s.is_exact_score)     as correct_winner_count
from public.score s
join public.profile p on p.id = s.user_id
group by s.pool_id, s.user_id, p.name;

-- ─── auth.users → public.profile trigger ────────────────────────────────────
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
