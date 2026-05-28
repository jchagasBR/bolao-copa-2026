# Bolão Copa 2026

A private prediction pool web app for friends to bet on FIFA World Cup 2026 results. UI is in Portuguese (PT-BR); code and docs are in English.

## Documentation

- [requirements.md](./requirements.md) — what the app does and the business rules.
- [architecture.md](./architecture.md) — stack, infra, data model, RLS policies.
- [implementation.md](./implementation.md) — phased roadmap with checkpoints.
- [LAUNCH.md](./LAUNCH.md) — Phase 9 launch checklist (Vercel, Resend domain, Supabase URLs, smoke tests).

## Stack

- **Next.js 16** App Router + TypeScript + React 19
- **Tailwind CSS 4** + shadcn/ui (base-nova preset)
- **Supabase** Postgres + Auth + Realtime
- **Vercel** hosting + cron
- **Resend** transactional email

Match scores are entered manually by pool admins — no external sports API. See [architecture.md §5](./architecture.md).

## Local development

```sh
pnpm install
cp .env.example .env.local   # then fill in real values (see below)
pnpm dev                     # http://localhost:3000
```

### Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build locally |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript no-emit check |
| `pnpm test` | Vitest run (one-shot) |
| `pnpm test:watch` | Vitest watch mode |

## Environment variables

All required vars live in [.env.example](./.env.example). For local dev, copy it to `.env.local` and fill in real values. For production, set these in the Vercel project settings.

| Variable | Source | Used by | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings | Browser + server | Safe to expose; this is the public REST endpoint. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings → API | Browser + server | Public anon key (RLS-protected). |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings → API | Server only | **Bypasses RLS.** Only used by `lib/supabase/service.ts` (admin score-entry action + reminder cron). Never expose to the browser. |
| `RESEND_API_KEY` | Resend dashboard → API Keys | Server (reminder cron) | Hourly cron sends through this. |
| `RESEND_FROM_EMAIL` | Resend dashboard | Server (reminder cron) | Defaults to `onboarding@resend.dev` (sandbox sender — only delivers to the Resend account owner). For real launch, verify a domain and use e.g. `bolao@your-domain.com`. |
| `CRON_SECRET` | Generate with `openssl rand -base64 32` | Server (reminder cron route) | Vercel Cron injects this as `Authorization: Bearer ${CRON_SECRET}` automatically when set in the project env. |
| `APP_URL` | Vercel project URL | Server (reminder cron email links) | No trailing slash. Local dev: `http://localhost:3000`. Production: `https://your-app.vercel.app`. |

Supabase Auth (email confirmation, password recovery) is configured separately — see [LAUNCH.md](./LAUNCH.md#2-supabase-auth-config).

## Database migrations

Migrations live in [supabase/migrations/](./supabase/migrations/) as plain SQL files. They are applied **manually** via the Supabase SQL Editor — we do not use the Supabase CLI yet.

To apply a new migration:

1. Open the SQL Editor: `https://supabase.com/dashboard/project/<project-ref>/sql/new`
2. Paste the contents of the new `00NN_*.sql` file.
3. Click **Run**.
4. Verify expected behavior (most migrations include a comment with what to check).

All migrations are idempotent (`CREATE OR REPLACE`, `ADD COLUMN IF NOT EXISTS`, etc.) — re-running them is safe.

The current migrations (0001-0011) cover schema, RLS, scoring, fixture/team seeds, the bonus table + `recompute_bonuses` function, an RLS-recursion helper, `winner_team_id` for penalty-decided finals, Realtime publication opt-ins, and the reminder cron's `users_missing_prediction` RPC. See [architecture.md §3](./architecture.md) for the full list.

## Operations

### Entering a match score

After full time, any user who admins at least one pool can:

1. Navigate to `/jogos/<matchId>` and click **"Editar resultado / horário →"** (or hit `/admin/jogos/<matchId>` directly).
2. Enter the home/away regulation-time score. For knockout matches that end level, select who advanced (penalties).
3. Click **"Salvar placar"**.

The server action writes the score, calls `recompute_match(match_id)`, then loops `recompute_bonuses(pool_id)` across every pool. Ranking pages update within ~1s via the Realtime channel.

### Rescheduling a postponed match

On the same `/admin/jogos/<matchId>` page, the **"Reagendar jogo"** card lets the admin change `kickoff_at` without touching the score.

### Manually triggering the reminder cron

Vercel Cron fires `/api/cron/send-reminders` hourly in production. To test locally or manually trigger:

```sh
curl.exe -H "Authorization: Bearer ${CRON_SECRET}" http://localhost:3000/api/cron/send-reminders
```

(PowerShell users: extract `CRON_SECRET` from `.env.local` first.)

The route returns JSON with `{ window, matches, sent, results }`. Dedup is enforced by the `reminder_sent (user_id, match_id)` PK — running twice in a row should report `sent: 0` on the second call.

### Forcing a re-test of the cron

If you need to send a duplicate reminder for testing:

```sql
delete from public.reminder_sent where match_id = '<uuid>';
```

To fake-shift a match into the cron window:

```sql
update public.match
set kickoff_at = now() + interval '18 hours',
    status = 'scheduled', home_score = null, away_score = null, winner_team_id = null
where external_id = 1;
```

## Troubleshooting

### "Failed to load chunk … `_0refgpt._.js`" or "Cannot find module … `.next/dev/server/chunks/ssr/…`"

Turbopack dev-cache hash drift. Affects Windows particularly. **Fix:** stop the dev server, delete `.next/dev`, restart.

```powershell
# In a separate window:
Stop-Process -Name node -Force          # kill the dev server
Remove-Item -Recurse -Force .next\dev   # clear the stale cache
pnpm dev                                 # restart
```

Production builds on Vercel don't have this issue — it's strictly a local dev cache problem.

### Server action redirects to `/entrar` instead of running

The middleware redirects unauthenticated requests on protected routes to `/entrar`. If you're hitting an API route (`/api/*`) and getting a `307 → /entrar`, the middleware's `PUBLIC_PATH_PREFIXES` list (in `lib/supabase/middleware.ts`) is missing the route prefix. `/api`, `/auth`, `/entrar`, `/cadastro`, `/recuperar`, `/regras` should all be in there.

### RLS error: "infinite recursion detected in policy for relation pool_member"

Resolved in `0006_fix_rls_recursion.sql` (introduces a `SECURITY DEFINER` helper `public.is_pool_member(...)`). Any new RLS policy that needs to ask "is user X in pool Y?" must call this helper — **never** inline `EXISTS (SELECT 1 FROM pool_member …)`.

### Sandbox sender only delivers to the Resend account owner

`onboarding@resend.dev` is Resend's sandbox sender — it only delivers to the email address tied to your Resend account. Verify a custom domain before sharing invite codes with friends. See [LAUNCH.md §1](./LAUNCH.md#1-resend-domain-verification).

## Conventions

- All user-facing UI strings are in PT-BR; code identifiers in English.
- Timestamps stored as UTC; rendered in the browser's local TZ via `components/local-time.tsx`.
- Every new table must have RLS enabled (see `architecture.md` §4.2).
- Every pool-scoped server action must call `lib/pool.ts:assertMember()` before mutating.
- Every "is user X in pool Y?" RLS check must call `public.is_pool_member(...)` — never inline `EXISTS`.
- Tied users in `withSharedPositions()` share a position number (`1, 1, 3`), not (`1, 2, 3`). See requirements §4.5.

## Doc audits

A read-only `doc-auditor` subagent is defined in `.claude/agents/doc-auditor.md`. Run it at the end of each implementation phase to surface drift between the three founding docs and the code.
