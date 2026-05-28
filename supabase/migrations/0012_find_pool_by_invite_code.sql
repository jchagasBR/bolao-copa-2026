-- 0012_find_pool_by_invite_code.sql — fix the "Código não encontrado" bug
-- on /boloes/entrar.
--
-- The pool table's SELECT policy (`pool_member_select`) only lets the admin
-- or existing members see the row. So a non-member trying to JOIN by invite
-- code couldn't look up the pool id — every valid code returned 0 rows and
-- the server action errored with "Código não encontrado." even when the
-- code was real. Caught during Phase 9 UAT 2026-05-29.
--
-- Fix: a SECURITY DEFINER helper that returns ONLY the pool id (no name,
-- no admin_id, nothing else). The caller already knows the code; we leak no
-- more than "this code exists". Granted to `authenticated` so any signed-in
-- user can call it; anon would be middleware-redirected to /entrar anyway.
--
-- Brute-force exposure: 36^4 = ~1.68M codes. Same exposure as the existing
-- join model — anyone with a code can join (requirements §4.6). If we ever
-- need rate limiting, do it at the route handler layer, not here.

create or replace function public.find_pool_by_invite_code(p_code text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from public.pool where invite_code = p_code limit 1;
$$;

revoke all on function public.find_pool_by_invite_code(text) from public;
grant execute on function public.find_pool_by_invite_code(text) to authenticated;
