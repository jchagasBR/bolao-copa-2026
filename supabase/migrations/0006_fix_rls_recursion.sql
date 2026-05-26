-- 0006_fix_rls_recursion.sql — fixes RLS infinite recursion that blocked
-- any pool creation in Phase 3 E2E testing.
--
-- The original pm_self_select policy (0002_rls.sql) contained an EXISTS
-- subquery against pool_member itself:
--
--   create policy pm_self_select on public.pool_member for select
--     using (
--       user_id = auth.uid()
--       or exists (select 1 from public.pool_member pm
--                  where pm.pool_id = pool_member.pool_id
--                    and pm.user_id = auth.uid())
--     );
--
-- That EXISTS triggers pm_self_select again, which evaluates the EXISTS again,
-- ad infinitum. Postgres detects it and aborts with code 42P17:
-- "infinite recursion detected in policy for relation pool_member".
--
-- Trigger path during pool creation:
--   1. INSERT INTO pool … RETURNING id
--   2. RETURNING re-reads the new row through pool's SELECT policy
--   3. pool's policy does `exists (select 1 from pool_member …)`
--   4. that SELECT goes through pm_self_select → recursion
--
-- Fix: replace the recursive EXISTS with a SECURITY DEFINER helper. The helper
-- is owned by `postgres` (which has BYPASSRLS), so the inner query reads
-- pool_member without re-entering the policy. Also broaden pool's SELECT
-- policy so the admin can RETURNING a freshly-created pool before they have
-- a pool_member row.

create or replace function public.is_pool_member(p_pool_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.pool_member
    where pool_id = p_pool_id and user_id = p_user_id
  );
$$;

revoke all on function public.is_pool_member(uuid, uuid) from public;
grant execute on function public.is_pool_member(uuid, uuid) to authenticated, anon;

-- ─── pool_member ────────────────────────────────────────────────────────────
drop policy if exists pm_self_select on public.pool_member;
create policy pm_self_select on public.pool_member for select
  using (
    user_id = auth.uid()
    or public.is_pool_member(pool_member.pool_id, auth.uid())
  );

-- ─── pool ───────────────────────────────────────────────────────────────────
-- Admin must see their newly-created pool even before the pool_member row
-- lands (otherwise INSERT … RETURNING fails on the post-insert SELECT).
drop policy if exists pool_member_select on public.pool;
create policy pool_member_select on public.pool for select
  using (
    admin_id = auth.uid()
    or public.is_pool_member(pool.id, auth.uid())
  );
