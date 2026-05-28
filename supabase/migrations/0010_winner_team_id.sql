-- 0010_winner_team_id.sql — fix the Phase 4 doc-audit P1 about finals decided
-- on penalties producing no champion bonus.
--
-- Until now `recompute_bonuses` picked the champion via a CASE on
-- home_score / away_score. When a final ends level (penalties or coin toss),
-- the CASE returns NULL and the +20 champion bonus is silently skipped.
--
-- Fix: add a nullable `winner_team_id` column on `match`. For group matches
-- it stays NULL (the score is decisive — draws are allowed). For knockout
-- matches the admin form requires it whenever the score is level. The new
-- `recompute_bonuses` body picks the champion from `winner_team_id` first and
-- falls back to the score comparison only when `winner_team_id` is NULL (so
-- existing finished knockouts that were not decided on penalties keep working
-- with no admin re-entry).
--
-- Idempotent — uses ADD COLUMN IF NOT EXISTS and CREATE OR REPLACE.
-- See implementation.md "Phase 6 dependencies — read before starting".

alter table public.match
  add column if not exists winner_team_id uuid references public.team(id);

-- A non-null winner must be one of the two teams listed on the match. We use
-- IF NOT EXISTS via a DO block since Postgres lacks `ADD CONSTRAINT IF NOT
-- EXISTS` directly.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'match_winner_is_a_team'
  ) then
    alter table public.match
      add constraint match_winner_is_a_team
      check (
        winner_team_id is null
        or winner_team_id = home_team_id
        or winner_team_id = away_team_id
      );
  end if;
end$$;

-- ─── recompute_bonuses ─────────────────────────────────────────────────────
-- Same delete-then-insert idempotency contract from 0008. The only change is
-- the champion clause, which now prefers winner_team_id when present.

create or replace function public.recompute_bonuses(p_pool_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Drop every bonus row this function owns for the pool, so stale awards
  -- from a corrected score don't linger. Knockout-round kinds (added in a
  -- future migration) will need to be listed here too.
  delete from public.bonus
  where pool_id = p_pool_id
    and (starts_with(kind, 'group_') or kind = 'champion');

  -- 1) Group 1st place (+5 pts per correct pick)
  insert into public.bonus (user_id, pool_id, kind, points, computed_at)
  select
    bg.user_id,
    bg.pool_id,
    'group_1st_' || bg.group_code,
    5,
    now()
  from public.bet_group bg
  join public.compute_group_standings() s
    on s.group_code = bg.group_code
   and s.place = 1
   and s.team_id = bg.first_team_id
  where bg.pool_id = p_pool_id
  on conflict (user_id, pool_id, kind) do update
    set points      = excluded.points,
        computed_at = excluded.computed_at;

  -- 2) Group 2nd place (+3 pts per correct pick)
  insert into public.bonus (user_id, pool_id, kind, points, computed_at)
  select
    bg.user_id,
    bg.pool_id,
    'group_2nd_' || bg.group_code,
    3,
    now()
  from public.bet_group bg
  join public.compute_group_standings() s
    on s.group_code = bg.group_code
   and s.place = 2
   and s.team_id = bg.second_team_id
  where bg.pool_id = p_pool_id
  on conflict (user_id, pool_id, kind) do update
    set points      = excluded.points,
        computed_at = excluded.computed_at;

  -- 3) Champion (+20 pts) — picks winner_team_id first (set by the admin for
  -- finals decided on penalties), falls back to the score comparison when the
  -- admin left winner_team_id NULL (regulation-decisive finals).
  insert into public.bonus (user_id, pool_id, kind, points, computed_at)
  select
    bc.user_id,
    bc.pool_id,
    'champion',
    20,
    now()
  from public.bet_champion bc
  join public.match m on m.stage = 'final'
    and m.status = 'finished'
    and m.home_score is not null
    and m.away_score is not null
    and bc.team_id = coalesce(
      m.winner_team_id,
      case
        when m.home_score > m.away_score then m.home_team_id
        when m.away_score > m.home_score then m.away_team_id
        else null
      end
    )
  where bc.pool_id = p_pool_id
  on conflict (user_id, pool_id, kind) do update
    set points      = excluded.points,
        computed_at = excluded.computed_at;
end;
$$;

revoke all on function public.recompute_bonuses(uuid) from public;
grant execute on function public.recompute_bonuses(uuid) to authenticated, anon;
