-- 0008_recompute_bonuses_idempotent.sql — fix the bonus-correction bug
-- surfaced by the Phase 4 doc-audit (2026-05-26).
--
-- The previous recompute_bonuses (0007_bonus.sql) only INSERTed/UPSERTed rows
-- for currently-correct picks. If an admin entered a wrong group-stage score
-- such that team X finished 1st, the function awarded +5 to every user who
-- picked X. If the admin then corrected the score so team Y is 1st, the
-- function would award +5 to Y-pickers BUT never remove the stale X-picker
-- bonus row — silently double-awarding the group.
--
-- Fix: at the top of recompute_bonuses, DELETE every bonus row whose kind is
-- owned by this function (`group_*` and `champion`), then re-INSERT from the
-- current correct picks. Function is plpgsql so the DELETE + INSERT run in a
-- single implicit transaction; readers either see the old state or the new
-- state, never an empty interval. starts_with() requires Postgres 14+ which
-- Supabase comfortably exceeds.

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

  -- 3) Champion (+20 pts) — once the final is finished, regulation-decisive.
  -- TODO (Phase 6): finals decided on penalties currently produce no champion
  -- bonus because the case-when can't pick a winner when home_score = away_score.
  -- Address by adding a `winner_team_id` column to match for knockouts.
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
    and bc.team_id = case
      when m.home_score > m.away_score then m.home_team_id
      when m.away_score > m.home_score then m.away_team_id
      else null
    end
  where bc.pool_id = p_pool_id
  on conflict (user_id, pool_id, kind) do update
    set points      = excluded.points,
        computed_at = excluded.computed_at;
end;
$$;

revoke all on function public.recompute_bonuses(uuid) from public;
grant execute on function public.recompute_bonuses(uuid) to authenticated, anon;
