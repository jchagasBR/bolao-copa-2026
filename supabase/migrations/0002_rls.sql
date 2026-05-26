-- 0002_rls.sql — Row-Level Security policies for every table in the public schema.
--
-- Every policy uses DROP IF EXISTS first, so this file is idempotent.
-- Service role bypasses RLS entirely; these policies only constrain the
-- browser/SSR client acting as a logged-in user.

-- ─── profile ────────────────────────────────────────────────────────────────
-- A user sees their own profile. They also see other profiles iff they share
-- at least one pool (so the ranking page can render member names).
drop policy if exists profile_self_select on public.profile;
create policy profile_self_select on public.profile for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.pool_member pm_self
      join public.pool_member pm_other using (pool_id)
      where pm_self.user_id = auth.uid()
        and pm_other.user_id = profile.id
    )
  );

drop policy if exists profile_self_update on public.profile;
create policy profile_self_update on public.profile for update
  using (id = auth.uid()) with check (id = auth.uid());

-- ─── pool ───────────────────────────────────────────────────────────────────
-- Any authed user can create a pool (they become admin). Visible to members.
-- Lookup-by-invite-code from /boloes/entrar uses the service role via a server
-- action, so we don't need a public-by-code policy here.
drop policy if exists pool_member_select on public.pool;
create policy pool_member_select on public.pool for select
  using (exists (select 1 from public.pool_member where pool_id = pool.id and user_id = auth.uid()));

drop policy if exists pool_insert_self_admin on public.pool;
create policy pool_insert_self_admin on public.pool for insert
  with check (admin_id = auth.uid());

drop policy if exists pool_admin_update on public.pool;
create policy pool_admin_update on public.pool for update
  using (admin_id = auth.uid()) with check (admin_id = auth.uid());

-- ─── pool_member ────────────────────────────────────────────────────────────
-- Members see other members of pools they belong to. A user inserts themselves
-- as a member (the 10-pool cap is enforced by the trigger in 0001_init.sql).
drop policy if exists pm_self_select on public.pool_member;
create policy pm_self_select on public.pool_member for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.pool_member pm
      where pm.pool_id = pool_member.pool_id and pm.user_id = auth.uid()
    )
  );

drop policy if exists pm_self_insert on public.pool_member;
create policy pm_self_insert on public.pool_member for insert
  with check (user_id = auth.uid());

drop policy if exists pm_self_delete on public.pool_member;
create policy pm_self_delete on public.pool_member for delete
  using (user_id = auth.uid());

-- ─── bet_match ──────────────────────────────────────────────────────────────
-- Own bets always readable/writable up to kickoff. Other members' bets visible
-- only after kickoff (so participants can compare predictions post-match).
drop policy if exists bm_self_all on public.bet_match;
create policy bm_self_all on public.bet_match for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.match m
      where m.id = bet_match.match_id and now() < m.kickoff_at
    )
  );

drop policy if exists bm_peer_after_kickoff on public.bet_match;
create policy bm_peer_after_kickoff on public.bet_match for select
  using (
    user_id <> auth.uid()
    and exists (
      select 1 from public.pool_member pm
      where pm.pool_id = bet_match.pool_id and pm.user_id = auth.uid()
    )
    and exists (
      select 1 from public.match m
      where m.id = bet_match.match_id and now() >= m.kickoff_at
    )
  );

-- ─── bet_group ──────────────────────────────────────────────────────────────
-- Deadline: kickoff of the first WC match.
drop policy if exists bg_self_all on public.bet_group;
create policy bg_self_all on public.bet_group for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (select t from public.first_kickoff) > now());

drop policy if exists bg_peer_after_deadline on public.bet_group;
create policy bg_peer_after_deadline on public.bet_group for select
  using (
    user_id <> auth.uid()
    and exists (
      select 1 from public.pool_member pm
      where pm.pool_id = bet_group.pool_id and pm.user_id = auth.uid()
    )
    and (select t from public.first_kickoff) <= now()
  );

-- ─── bet_knockout ───────────────────────────────────────────────────────────
-- Deadline: kickoff of the first R32 match.
drop policy if exists bk_self_all on public.bet_knockout;
create policy bk_self_all on public.bet_knockout for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (select t from public.first_r32_kickoff) > now());

drop policy if exists bk_peer_after_deadline on public.bet_knockout;
create policy bk_peer_after_deadline on public.bet_knockout for select
  using (
    user_id <> auth.uid()
    and exists (
      select 1 from public.pool_member pm
      where pm.pool_id = bet_knockout.pool_id and pm.user_id = auth.uid()
    )
    and (select t from public.first_r32_kickoff) <= now()
  );

-- ─── bet_champion ───────────────────────────────────────────────────────────
-- Deadline: kickoff of the first WC match (same as bet_group).
drop policy if exists bc_self_all on public.bet_champion;
create policy bc_self_all on public.bet_champion for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (select t from public.first_kickoff) > now());

drop policy if exists bc_peer_after_deadline on public.bet_champion;
create policy bc_peer_after_deadline on public.bet_champion for select
  using (
    user_id <> auth.uid()
    and exists (
      select 1 from public.pool_member pm
      where pm.pool_id = bet_champion.pool_id and pm.user_id = auth.uid()
    )
    and (select t from public.first_kickoff) <= now()
  );

-- ─── score ──────────────────────────────────────────────────────────────────
-- Read-only for any member of the same pool. Writes only via service role.
drop policy if exists score_pool_select on public.score;
create policy score_pool_select on public.score for select
  using (
    exists (
      select 1 from public.pool_member pm
      where pm.pool_id = score.pool_id and pm.user_id = auth.uid()
    )
  );

-- ─── team & match — public read ─────────────────────────────────────────────
drop policy if exists team_public_select on public.team;
create policy team_public_select on public.team for select using (true);

drop policy if exists match_public_select on public.match;
create policy match_public_select on public.match for select using (true);

-- ─── reminder_sent — service role only (no policies); RLS already enabled ──
