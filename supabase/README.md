# Supabase migrations

Migrations live in `migrations/`. Each file is plain SQL, applied in order.

## Applying a migration (manual, until Phase 2 wires the Supabase CLI)

1. Open the Supabase project: https://fzsqraciucckavhlndjp.supabase.co
2. **SQL Editor** (left sidebar) → **New query**
3. Paste the contents of the migration file
4. Click **Run**

A migration is idempotent if it uses `create table if not exists`, `create or replace function`, and `drop trigger if exists` before `create trigger`. The migrations in this directory follow that pattern so re-running a file is safe.

## Current migrations

Apply in this order. Each file is idempotent; re-running a file is safe.

1. `0001_init.sql` — full schema: enums, `profile`, `pool`, `pool_member` (with 10-pool cap trigger), `team`, `match`, `bet_match`, `bet_group`, `bet_knockout`, `bet_champion`, `score`, `reminder_sent`, the `first_kickoff` / `first_r32_kickoff` / `pool_ranking` views, and the `auth.users → profile` trigger.
2. `0002_rls.sql` — RLS policies for every table per `architecture.md` §4.2 (own-bets-before-kickoff, peer-bets-after-kickoff, member-only pool reads, public team/match reads, etc.).
3. `0003_scoring.sql` — scoring functions `compute_match_points`, `recompute_match`, `recompute_bonuses` (stub until Phase 4), and the `bet_match_locked` trigger.
4. `0004_seed_teams_groups.sql` — the 48 WC 2026 teams with their group letter (A-L). Source: Wikipedia "2026 FIFA World Cup Group A".."Group L".
5. `0005_seed_matches.sql` — the 104 fixtures with `kickoff_at` in UTC. Group-stage matches have home/away assigned; knockout fixtures (73-104) have NULL teams until the admin populates them.
6. `0006_fix_rls_recursion.sql` — fixes the infinite-recursion error in `pm_self_select` that blocked any pool creation. Introduces the `is_pool_member(pool_id, user_id)` SECURITY DEFINER helper and broadens pool's SELECT policy so the admin can `INSERT … RETURNING` a brand-new pool.
7. `0007_bonus.sql` — adds the `bonus` table for non-match bonus points, the `compute_group_standings()` helper, and the Phase 4 implementation of `recompute_bonuses(pool_id)` covering group 1st/2nd (+5/+3) and champion (+20). Updates `pool_ranking` to UNION `score` and `bonus`. Knockout-round bonuses deferred until the bracket UI lands.
