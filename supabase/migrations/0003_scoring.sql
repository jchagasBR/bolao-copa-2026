-- 0003_scoring.sql — scoring functions + the bet_match locking trigger.
--
-- Scoring rules (requirements §4.1):
--   • Exact score                                  → 10 pts (is_exact_score=true,    is_correct_winner=true)
--   • Correct winner + correct goal difference     →  7 pts (is_exact_score=false,   is_correct_winner=true)
--   • Correct winner (or correct draw) only        →  5 pts (is_exact_score=false,   is_correct_winner=true)
--   • Wrong                                        →  0 pts (is_exact_score=false,   is_correct_winner=false)
--
-- The compute_match_points function returns just the points number — the flags
-- are derived alongside it in recompute_match() for the score table.

-- ─── compute_match_points ──────────────────────────────────────────────────
create or replace function public.compute_match_points(
  predicted_h smallint,
  predicted_a smallint,
  actual_h    smallint,
  actual_a    smallint
)
returns smallint
language plpgsql
immutable
as $$
declare
  predicted_winner int;
  actual_winner    int;
begin
  if predicted_h = actual_h and predicted_a = actual_a then
    return 10;
  end if;

  predicted_winner := sign(predicted_h - predicted_a);
  actual_winner    := sign(actual_h - actual_a);

  if predicted_winner <> actual_winner then
    return 0;
  end if;

  if (predicted_h - predicted_a) = (actual_h - actual_a) then
    return 7;
  end if;

  return 5;
end;
$$;

-- ─── recompute_match — idempotent score upsert for a single match ──────────
create or replace function public.recompute_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m_home   smallint;
  m_away   smallint;
  m_status public.match_status;
begin
  select home_score, away_score, status into m_home, m_away, m_status
  from public.match where id = p_match_id;

  -- No score yet → nothing to recompute. We don't delete prior scores (there
  -- shouldn't be any), but if the admin reverts a finished match to scheduled
  -- with NULL scores, this is the place to handle it. For now we just exit.
  if m_home is null or m_away is null then
    return;
  end if;

  insert into public.score (
    user_id, pool_id, match_id, points, is_exact_score, is_correct_winner, computed_at
  )
  select
    bm.user_id,
    bm.pool_id,
    bm.match_id,
    public.compute_match_points(bm.home_score, bm.away_score, m_home, m_away) as points,
    (bm.home_score = m_home and bm.away_score = m_away)                       as is_exact_score,
    (sign(bm.home_score - bm.away_score) = sign(m_home - m_away))             as is_correct_winner,
    now()                                                                     as computed_at
  from public.bet_match bm
  where bm.match_id = p_match_id
  on conflict (user_id, pool_id, match_id) do update
    set points            = excluded.points,
        is_exact_score    = excluded.is_exact_score,
        is_correct_winner = excluded.is_correct_winner,
        computed_at       = excluded.computed_at;
end;
$$;

-- ─── recompute_bonuses — stub until Phase 4 wires the bonus rules ──────────
-- Will award the bonus points from requirements §4.2:
--   1st in group +5, 2nd in group +3, qualified R16 +3, QF +5, SF +8,
--   final +12, champion +20.
-- Phase 4 fills this in once group stage results and the knockout bracket are
-- finalized. For now it is a no-op so callers (the admin score-entry action,
-- cron jobs) compile.
create or replace function public.recompute_bonuses(p_pool_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- intentionally empty until Phase 4
  perform p_pool_id;
end;
$$;

-- ─── bet_match locking trigger ─────────────────────────────────────────────
-- Hard data-integrity rule: once a match has kicked off, predictions for it
-- are immutable (mirrors the RLS WITH CHECK, but catches service-role writes
-- and edge cases the RLS layer doesn't see).
create or replace function public.enforce_bet_match_locked()
returns trigger
language plpgsql
as $$
declare
  k timestamptz;
begin
  select kickoff_at into k from public.match where id = new.match_id;
  if k is null then
    raise exception 'bet_match_invalid_match'
      using message = 'Jogo não encontrado.';
  end if;
  if now() >= k then
    raise exception 'bet_match_locked'
      using errcode = 'check_violation',
            message = 'O palpite não pode mais ser editado após o início do jogo.';
  end if;
  return new;
end;
$$;

drop trigger if exists bet_match_locked on public.bet_match;
create trigger bet_match_locked
  before insert or update on public.bet_match
  for each row execute function public.enforce_bet_match_locked();
