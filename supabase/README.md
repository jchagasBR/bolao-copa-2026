# Supabase migrations

Migrations live in `migrations/`. Each file is plain SQL, applied in order.

## Applying a migration (manual, until Phase 2 wires the Supabase CLI)

1. Open the Supabase project: https://fzsqraciucckavhlndjp.supabase.co
2. **SQL Editor** (left sidebar) → **New query**
3. Paste the contents of the migration file
4. Click **Run**

A migration is idempotent if it uses `create table if not exists`, `create or replace function`, and `drop trigger if exists` before `create trigger`. The migrations in this directory follow that pattern so re-running a file is safe.

## Current migrations

- `0001_init.sql` — Phase 1: `profile` table + RLS + `auth.users → profile` trigger. Phase 2 will extend this same file with the rest of the schema (`pool`, `match`, `score`, `bet_*`, scoring functions).
