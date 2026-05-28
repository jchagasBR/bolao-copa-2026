-- 0011_users_missing_prediction.sql — helper RPC for the Phase 7 reminder cron.
--
-- For a given match id, returns one row per user who:
--   1. Belongs to at least one pool;
--   2. Has NO bet_match for that match in ANY pool they belong to (so a user
--      who predicted the match in pool A doesn't get reminded because they
--      didn't predict it in pool B);
--   3. Has profile.email_opt_out = false;
--   4. Has NO reminder_sent row for the (user, match) pair yet.
--
-- Joins auth.users for the email — the cron client (service-role) could read
-- auth.users directly, but pulling it into a SECURITY DEFINER function keeps
-- the cron route's TypeScript clean and the criterion in one place.
--
-- Returns no rows if nobody needs an email — the cron loops match by match,
-- so an empty result for one match doesn't stop the others.

create or replace function public.users_missing_prediction(p_match_id uuid)
returns table(user_id uuid, email text, name text)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  with pool_members as (
    select distinct pm.user_id
    from public.pool_member pm
  ),
  predicted as (
    select distinct bm.user_id
    from public.bet_match bm
    where bm.match_id = p_match_id
  ),
  reminded as (
    select rs.user_id
    from public.reminder_sent rs
    where rs.match_id = p_match_id
  )
  select
    p.id        as user_id,
    u.email     as email,
    p.name      as name
  from public.profile p
  join auth.users u on u.id = p.id
  where p.id in (select user_id from pool_members)
    and p.id not in (select user_id from predicted)
    and p.id not in (select user_id from reminded)
    and p.email_opt_out = false
    and u.email is not null;
$$;

revoke all on function public.users_missing_prediction(uuid) from public;
-- Only the service-role client (cron) needs this. Do NOT grant to
-- authenticated or anon — it would leak emails of opted-in users.
