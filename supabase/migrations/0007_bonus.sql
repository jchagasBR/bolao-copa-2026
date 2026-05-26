-- 0007_bonus.sql — bonus points storage + the recompute_bonuses implementation
-- for the bonuses that can be computed today (group standings + champion).
-- Knockout-round bonuses (R32/R16/QF/SF/Final advancement) are deferred to a
-- follow-up migration once the bracket UI lands and knockout home/away teams
-- get populated by the admin.
--
-- Schema choice: bonus points live in a separate table from `score` because
-- score's primary key is (user_id, pool_id, match_id) — bonuses aren't tied
-- to a single match. The `pool_ranking` view UNIONs both so the leaderboard
-- sums match points and bonuses together.

-- ─── bonus table ────────────────────────────────────────────────────────────
create table if not exists public.bonus (
  user_id     uuid not null references public.profile(id) on delete cascade,
  pool_id     uuid not null references public.pool(id) on delete cascade,
  kind        text not null,
  points      smallint not null,
  computed_at timestamptz not null default now(),
  primary key (user_id, pool_id, kind)
);

alter table public.bonus enable row level security;

create index if not exists bonus_pool_idx on public.bonus(pool_id);

drop policy if exists bonus_pool_select on public.bonus;
create policy bonus_pool_select on public.bonus for select
  using (public.is_pool_member(bonus.pool_id, auth.uid()));

-- ─── pool_ranking view: include bonus points ────────────────────────────────
create or replace view public.pool_ranking as
with all_points as (
  select pool_id, user_id, points, is_exact_score, is_correct_winner
  from public.score
  union all
  select pool_id, user_id, points, false as is_exact_score, false as is_correct_winner
  from public.bonus
)
select
  ap.pool_id,
  ap.user_id,
  p.name,
  sum(ap.points)::int                                                       as points,
  count(*) filter (where ap.is_exact_score)                                 as exact_count,
  count(*) filter (where ap.is_correct_winner and not ap.is_exact_score)    as correct_winner_count
from all_points ap
join public.profile p on p.id = ap.user_id
group by ap.pool_id, ap.user_id, p.name;

-- ─── group standings helper ────────────────────────────────────────────────
-- Returns one row per (group_code, team_id) with the team's position within
-- the group (1-4) once the group's six matches have all been finished.
-- Tiebreakers: points desc → goal difference desc → goals scored desc →
-- alphabetical fallback. The full FIFA tiebreak chain (head-to-head, fair-play,
-- FIFA ranking, draw of lots) is out of scope for the MVP — extremely rare in
-- practice and would require either admin override or a much larger function.
create or replace function public.compute_group_standings()
returns table(group_code char(1), team_id uuid, place int)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with finished_groups as (
    select group_code
    from public.match
    where stage = 'group' and group_code is not null
    group by group_code
    having count(*) filter (where status = 'finished'
                              and home_score is not null
                              and away_score is not null) = 6
  ),
  team_matches as (
    select
      t.id as team_id,
      t.group_code,
      t.name,
      case when m.home_team_id = t.id then m.home_score else m.away_score end as gf,
      case when m.home_team_id = t.id then m.away_score else m.home_score end as ga
    from public.team t
    join public.match m on m.stage = 'group'
      and (m.home_team_id = t.id or m.away_team_id = t.id)
      and m.status = 'finished'
      and m.home_score is not null and m.away_score is not null
    where t.group_code is not null
      and t.group_code in (select group_code from finished_groups)
  ),
  team_aggregates as (
    select
      group_code,
      team_id,
      name,
      sum(case when gf > ga then 3 when gf = ga then 1 else 0 end) as points,
      sum(gf) - sum(ga) as gd,
      sum(gf) as gf_total
    from team_matches
    group by group_code, team_id, name
  )
  select
    group_code,
    team_id,
    row_number() over (
      partition by group_code
      order by points desc, gd desc, gf_total desc, name asc
    )::int as place
  from team_aggregates;
$$;

revoke all on function public.compute_group_standings() from public;
grant execute on function public.compute_group_standings() to authenticated, anon;

-- ─── recompute_bonuses ─────────────────────────────────────────────────────
-- Idempotent. Re-runs are safe because every INSERT uses ON CONFLICT DO UPDATE.
create or replace function public.recompute_bonuses(p_pool_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
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

  -- 3) Champion (+20 pts) — once the final is finished
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
      else null  -- a final that ends level after ET would need extra fields; out of MVP
    end
  where bc.pool_id = p_pool_id
  on conflict (user_id, pool_id, kind) do update
    set points      = excluded.points,
        computed_at = excluded.computed_at;

  -- Knockout-round bonuses (R16/QF/SF/Final advancement) — deferred. They
  -- depend on the admin having populated home_team_id / away_team_id on
  -- knockout match rows, which only happens after each round of group/knockout
  -- play. To be wired in once the bracket UI ships (see implementation.md
  -- Phase 4 deferral notes).
end;
$$;

revoke all on function public.recompute_bonuses(uuid) from public;
grant execute on function public.recompute_bonuses(uuid) to authenticated, anon;
