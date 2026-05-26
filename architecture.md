# Architecture — Bolão Copa 2026

> **Document language:** English (dev artifact).
> **Audience:** the developer (you + Claude) implementing the app.
> **Companion docs:** [`requirements.md`](./requirements.md), [`implementation.md`](./implementation.md).

## 1. High-level architecture

```
                    ┌──────────────────────────┐
                    │   Browser (mobile-first) │
                    └────────────┬─────────────┘
                                 │ HTTPS
                                 ▼
                  ┌──────────────────────────────┐
                  │ Vercel — Next.js (SSR/RSC)   │
                  │  - App Router pages          │
                  │  - Server Actions            │
                  │  - Route Handlers            │
                  │  - Cron (reminders only)     │
                  └────────────┬─────────────────┘
                               │ Supabase JS client
                               ▼
        ┌─────────────────────────────┐
        │ Supabase                    │
        │  - Postgres (data)          │
        │  - Auth (email + password)  │
        │  - Realtime (live ranking)  │
        └─────────────────────────────┘

        ┌─────────────────────────────┐
        │ Resend (transactional email) │
        └─────────────────────────────┘
```

**Why this shape:**
- Single deployment target (Vercel) — no separate API server to operate.
- Supabase covers DB + Auth + Realtime in one managed service, with a generous free tier.
- **No external sports API** in the MVP. Match scores are entered manually by a pool admin via the admin panel (see §5). Decision rationale: the only viable API (API-Football) paywalls WC 2026 even on its trial tier, free alternatives have uncertain coverage, and manual entry for ~104 matches over 6 weeks is a small operational cost for a friends-only product.

## 2. Stack

### 2.1 Frontend
| Concern | Choice | Reason |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | RSC + Server Actions remove the need for a separate API server. Best deploy story on Vercel. |
| Language | **TypeScript (strict mode)** | Catches schema mismatches with the DB at compile time. |
| Styling | **Tailwind CSS** | Fast iteration, mobile-first utilities built-in. |
| UI components | **shadcn/ui** | Accessible (Radix-based), unstyled-by-default, owned-in-repo (no version lock). |
| Forms | **React Hook Form + Zod** | Type-safe forms with one schema reused for client + server validation. |
| Charts | _none in MVP_ | Cut from scope to save time; ranking list is enough. |
| State | RSC + URL state + a single cookie (`active_pool_id`), **no client store** | Most data is server-owned; the active pool is the one piece of UI state needed across pages. |
| Dates | `date-fns` + `Intl.DateTimeFormat` in a `<LocalTime />` Client Component | Server renders UTC; client reformats to the browser's TZ. No per-user TZ column — see §2.9. |

### 2.2 Backend
| Concern | Choice |
|---|---|
| Runtime | Next.js Server Actions + Route Handlers (Node runtime, not Edge — Supabase server client doesn't run reliably on Edge for this use case) |
| ORM / DB client | `@supabase/supabase-js` v2 |
| Validation | Zod (shared with frontend) |
| Cron | Vercel Cron (declared in `vercel.json`) hitting `/api/cron/*` endpoints |
| Background jobs | None — Postgres triggers handle score recomputation synchronously |

### 2.3 Database
- **Supabase Postgres** (free tier: 500MB storage, 50k MAU — more than enough for ≤30 users).
- All schema changes go through **`supabase/migrations/`** as plain SQL files; we use the Supabase CLI to apply them.
- Row-Level Security (RLS) **enabled on every table** without exception.

### 2.4 Authentication and authorization model
- **Supabase Auth** — email + password.
- Email confirmation **required**.
- SMTP: Resend (configured in Supabase Auth settings) to escape the very low default Supabase SMTP rate limit.
- Sessions handled via Supabase's `@supabase/ssr` helpers (cookie-based, works in App Router).
- **Pool admin** = the user who created the pool (`pool.admin_id = auth.uid()`). Per-pool authority for pool metadata edits (name, invite code).
- **Match score override authority**: any user who is admin of **at least one pool** may override any match score, because match data is global (the score of a fixture is one fact shared by all pools). RLS predicate: `exists (select 1 from pool where admin_id = auth.uid())`. The trust model is that all pool admins are trusted friends.
- **Active pool selection** is browser state, not auth: a cookie named `active_pool_id` (set by the pool switcher) tells server-rendered pages which pool to scope to. The middleware (see §6) sets a sensible default on first request.
- No `app_metadata` role claim. Password reset is out of scope (see `requirements.md` §6).

### 2.5 Realtime
- **Supabase Realtime** subscription on the `score` table only (a `match` score update propagates into `score` rows, so subscribing to `score` is sufficient and cheaper).
- The ranking page subscribes once per pool and re-fetches the aggregated ranking on change events.

### 2.6 External sports data
- **None.** Match scores and statuses are entered by a pool admin via the admin panel (see §5).
- The 104 WC 2026 fixtures (teams, groups, kickoff times) are seeded **once** during Phase 2 from a public schedule source (FIFA.com or the Wikipedia "2026 FIFA World Cup" page). No live data dependency at runtime.
- _History note:_ we originally planned to use API-Football (api-sports.io) at $19/mo, but verified on 2026-05-23 that the free trial only covers seasons 2022-2024 and WC 2026 is paywalled. Rather than pay $19 to verify Pro coverage, we dropped the dependency.

### 2.7 Email (transactional)
- **Resend** — free tier 3,000/mo, 100/day.
- React Email for templates.
- Used for: Supabase Auth confirmation/reset emails (via SMTP), and the prediction-reminder email.

### 2.8 Hosting and CI
- **Vercel** (free tier; upgrade to Pro $20/mo only if bandwidth or function invocations exceed the limit during match days).
- **GitHub Actions** for CI on every PR: lint + typecheck + build.
- Vercel **preview deploys** per PR; **production deploy** on `main`.

### 2.9 Time zones and internationalization
Users live in different time zones — primarily Brazil and Europe — so the app must show match kickoffs in each user's local time without storing a preference.

- **Storage:** every timestamp is `timestamptz` in UTC.
- **Display:** a small `<LocalTime utc={...} format="..." />` Client Component wraps every date string in the UI. It reads `Intl.DateTimeFormat().resolvedOptions().timeZone` and formats via `date-fns-tz`'s `formatInTimeZone`.
- **SSR fallback:** the server renders the timestamp as UTC text with a `<time dateTime>` attribute; the Client Component swaps it after hydration. Acceptable for the MVP — we accept the brief flicker on first paint.
- **Deadline comparisons** are done server-side in UTC (`now() >= match.kickoff_at`), so locking behavior is timezone-independent.
- **Emails** cannot know the recipient's browser TZ. The reminder template shows São Paulo time with the label "(horário de Brasília)" plus a relative phrase (`começa em ~12h`). The "Abrir no app" CTA opens the app where times render locally.
- **Language:** PT-BR only in MVP; no i18n framework. PT-BR copy lives inline in components (no JSON catalog).

If we later decide users want to override the auto-detected TZ, add a `profile.timezone` column and let the `<LocalTime />` server-render with the stored TZ on the first paint, eliminating the flicker. Not in MVP.

## 3. Repository layout

```
bolao-copa-2026/
├── .github/
│   └── workflows/
│       └── ci.yml                 # lint + typecheck + build
├── .vscode/                       # optional, recommended extensions
├── app/                           # Next.js App Router
│   ├── entrar/page.tsx            # /entrar  (login)              — public
│   ├── cadastro/page.tsx          # /cadastro                     — public
│   ├── cadastro/verifique-email/  # confirm-email landing         — public
│   ├── recuperar/page.tsx         # /recuperar (request reset)    — public
│   ├── recuperar/redefinir/       # /recuperar/redefinir (new pw) — public, valid only with a recovery session
│   ├── auth/confirm/route.ts      # OTP/PKCE email callback       — public (signup + recovery)
│   ├── auth/signout/route.ts      # POST signout                  — auth required
│   ├── (app)/                     # authenticated routes (own / via middleware)
│   │   ├── layout.tsx             # nav shell + <PoolSwitcher /> in header
│   │   ├── page.tsx               # dashboard: list of "Meus bolões" + criar/entrar CTAs
│   │   ├── boloes/                # pool management
│   │   │   ├── criar/page.tsx     # create a pool (any authed user)
│   │   │   └── entrar/page.tsx    # join via invite code
│   │   ├── jogos/                 # matches — scoped to active_pool_id cookie
│   │   │   ├── page.tsx
│   │   │   └── [matchId]/page.tsx
│   │   ├── palpites/              # bets — scoped to active pool
│   │   │   ├── grupos/page.tsx
│   │   │   ├── mata-mata/page.tsx
│   │   │   └── campeao/page.tsx
│   │   ├── ranking/page.tsx       # ranking of the active pool
│   │   └── perfil/page.tsx        # user's bets across pools, with a pool filter
│   ├── admin/                     # admin panel (per-pool admin only)
│   │   ├── layout.tsx
│   │   └── jogos/[matchId]/page.tsx   # single editor reached by direct URL
│   ├── api/
│   │   └── cron/
│   │       └── send-reminders/route.ts
│   ├── layout.tsx                 # root layout
│   └── globals.css
├── components/
│   ├── ui/                        # shadcn primitives
│   ├── pool-switcher.tsx          # header dropdown (Client) — writes active_pool_id cookie
│   ├── local-time.tsx             # Client Component formatting UTC → browser TZ
│   └── ...                        # other app-specific components
├── lib/
│   ├── supabase/
│   │   ├── server.ts              # createServerClient
│   │   ├── client.ts              # createBrowserClient
│   │   └── middleware.ts          # session refresh + active_pool_id default
│   ├── pool.ts                    # readActivePoolId(), assertMember(), listMyPools()
│   ├── scoring/
│   │   ├── match.ts               # pure functions for §4.1
│   │   ├── bonus.ts               # pure functions for §4.2
│   │   └── ranking.ts             # tiebreak per §4.5
│   └── time.ts                    # date-fns-tz helpers (formatInTimeZone, parseISO)
├── supabase/
│   ├── migrations/                # versioned SQL
│   │   ├── 0001_init.sql               # schema (tables, enums, indexes, views, triggers)
│   │   ├── 0002_rls.sql                # RLS policies for every table
│   │   ├── 0003_scoring.sql            # compute_match_points, recompute_match, bet_match_locked
│   │   ├── 0004_seed_teams_groups.sql  # 48 teams, groups A-L
│   │   └── 0005_seed_matches.sql       # 104 fixtures with UTC kickoffs
│   └── README.md                  # how to apply migrations via the SQL Editor
├── tests/
│   └── scoring.spec.ts            # vitest, tests pure scoring functions
├── middleware.ts                  # protects /(app)/* and /admin/*
├── vercel.json                    # cron declarations
├── .env.example
├── .env.local                     # gitignored
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
├── eslint.config.mjs
├── README.md
├── requirements.md
├── architecture.md
└── implementation.md
```

**Naming convention:** user-facing route segments are in **Portuguese** to match the UI (`/jogos`, `/palpites`, `/ranking`); everything in code (variable names, component names, file identifiers, table columns) is in **English**.

## 4. Data model

All tables live in the `public` schema. Every table has RLS enabled.

```sql
-- profile: 1:1 with auth.users, holds public-facing user data
create table profile (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  avatar_url  text,
  email_opt_out boolean not null default false,
  created_at  timestamptz not null default now()
);

-- pool: a betting pool (one per group of friends in MVP)
create table pool (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  invite_code  text not null unique,
  admin_id     uuid not null references profile(id),
  created_at   timestamptz not null default now()
);

-- pool_member: membership.
-- A user can belong to many pools, capped at 10 by a BEFORE INSERT trigger
-- (requirements.md §4.6). No UNIQUE on user_id alone.
create table pool_member (
  pool_id   uuid not null references pool(id) on delete cascade,
  user_id   uuid not null references profile(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (pool_id, user_id)
);

-- enforce_pool_member_cap: rejects an INSERT that would push the user past 10 memberships.
create or replace function enforce_pool_member_cap() returns trigger as $$
begin
  if (select count(*) from pool_member where user_id = new.user_id) >= 10 then
    raise exception 'pool_member_cap_reached'
      using errcode = 'check_violation',
            message = 'Você já participa do número máximo de bolões (10).';
  end if;
  return new;
end$$ language plpgsql;

create trigger pool_member_cap before insert on pool_member
  for each row execute function enforce_pool_member_cap();

-- team: the 48 teams in WC 2026
create table team (
  id         uuid primary key default gen_random_uuid(),
  external_id integer unique,                -- optional id from whatever source seeded the team (nullable)
  name       text not null,                  -- "Brasil"
  iso_code   text not null,                  -- "BRA"
  flag_url   text,
  group_code char(1)                         -- 'A'..'L' (12 groups in WC 2026)
);

-- match: a fixture.
-- Surrogate UUID PK so re-seeding from a different data source isn't destructive;
-- external_id is optional and refers to whatever schedule source we seeded from.
create type match_stage as enum ('group', 'r32', 'r16', 'qf', 'sf', 'third', 'final');
create type match_status as enum ('scheduled', 'live', 'finished', 'postponed');

create table match (
  id            uuid primary key default gen_random_uuid(),
  external_id   integer unique,              -- optional id from the schedule source (nullable)
  stage         match_stage not null,
  group_code    char(1),                     -- only for stage='group'
  home_team_id  uuid references team(id),
  away_team_id  uuid references team(id),
  kickoff_at    timestamptz not null,
  home_score    smallint,
  away_score    smallint,
  status        match_status not null default 'scheduled',
  updated_at    timestamptz not null default now()
);

-- bet_match: a per-match prediction. Range 0–20 to match requirements §3.3.
-- The unique key is (user_id, pool_id, match_id): a user belongs to many
-- pools and predicts the same match independently in each — predictions are
-- pool-scoped (requirements §3.5).
create table bet_match (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profile(id) on delete cascade,
  pool_id       uuid not null references pool(id) on delete cascade,
  match_id      uuid not null references match(id),
  home_score    smallint not null check (home_score between 0 and 20),
  away_score    smallint not null check (away_score between 0 and 20),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, pool_id, match_id)
);

-- bet_group: predicted standings (1st/2nd) per group
create table bet_group (
  user_id        uuid not null references profile(id) on delete cascade,
  pool_id        uuid not null references pool(id) on delete cascade,
  group_code     char(1) not null,
  first_team_id  uuid not null references team(id),
  second_team_id uuid not null references team(id),
  updated_at     timestamptz not null default now(),
  primary key (user_id, pool_id, group_code),
  check (first_team_id <> second_team_id)
);

-- bet_knockout: predicted team at each bracket slot.
-- For WC 2026: stage='r32' has slots 0..15, 'r16' has 0..7, 'qf' has 0..3,
-- 'sf' has 0..1, 'final' has slot 0 (the champion pick — duplicated in bet_champion
-- for convenience and to allow editing them independently).
create table bet_knockout (
  user_id     uuid not null references profile(id) on delete cascade,
  pool_id     uuid not null references pool(id) on delete cascade,
  stage       match_stage not null check (stage in ('r32','r16','qf','sf','final')),
  slot        smallint not null,
  team_id     uuid not null references team(id),
  updated_at  timestamptz not null default now(),
  primary key (user_id, pool_id, stage, slot)
);

-- bet_champion: predicted champion (separate table so it can be set before the
-- bracket is unlocked).
create table bet_champion (
  user_id    uuid not null references profile(id) on delete cascade,
  pool_id    uuid not null references pool(id) on delete cascade,
  team_id    uuid not null references team(id),
  updated_at timestamptz not null default now(),
  primary key (user_id, pool_id)
);

-- score: materialized per-user-per-match score.
-- Includes the tiebreaker counters from requirements §4.5 so the ranking view
-- can sort without joining bet_match + match.
create table score (
  user_id              uuid not null references profile(id) on delete cascade,
  pool_id              uuid not null references pool(id) on delete cascade,
  match_id             uuid not null references match(id),
  points               smallint not null,
  is_exact_score       boolean  not null default false,
  is_correct_winner    boolean  not null default false,
  computed_at          timestamptz not null default now(),
  primary key (user_id, pool_id, match_id)
);

-- reminder_sent: dedupes the prediction-reminder email (Phase 7).
create table reminder_sent (
  user_id   uuid not null references profile(id) on delete cascade,
  match_id  uuid not null references match(id),
  sent_at   timestamptz not null default now(),
  primary key (user_id, match_id)
);
```

### 4.1 Scoring — explicit function, no triggers

We deliberately **do not** use Postgres triggers to recompute scores. A trigger fired by every `match` update compounds debugging with RLS and Realtime. Instead:

- A SQL function **`recompute_match(match_id uuid) returns void`** reads the match score and upserts the corresponding `score` row for every `bet_match` against that match. It also sets `is_exact_score` and `is_correct_winner` for tiebreaker support.
- It is called explicitly from one place: the admin score-entry server action, after the manual write to `match.home_score` / `match.away_score`.
- A `BEFORE INSERT OR UPDATE ON bet_match` trigger remains — `bet_match_locked` — which rejects writes when `now() >= match.kickoff_at`. This is a hard data integrity rule, not a scoring concern, so a trigger is the right place.

Idempotency: `recompute_match` performs `INSERT … ON CONFLICT DO UPDATE`. Calling it twice with the same input produces the same `score` rows.

A separate function **`recompute_bonuses(pool_id uuid) returns void`** computes group / knockout / champion bonuses per `requirements.md` §4.2; called from the cron after group stage ends, after each knockout round closes, and after the final.

### 4.2 RLS policies — explicit predicates

Every policy below assumes RLS is enabled with no default permissive policy. `auth.uid()` returns the current user's UUID. The cron and the admin override use the `service_role` key, which bypasses RLS — RLS only protects the browser client.

**`profile`**
```sql
-- A user sees their own profile; other profiles are visible iff they share a pool.
create policy profile_self_select on profile for select
  using (id = auth.uid()
      or exists (
        select 1
        from pool_member pm_self join pool_member pm_other using (pool_id)
        where pm_self.user_id = auth.uid() and pm_other.user_id = profile.id
      ));
create policy profile_self_update on profile for update
  using (id = auth.uid()) with check (id = auth.uid());
```

**Helper function — `is_pool_member`**

A `SECURITY DEFINER` function (owned by `postgres`, which has `BYPASSRLS`) is used in every policy that needs to ask "is user X a member of pool Y?". Calling the function from inside an RLS predicate avoids the infinite-recursion that bites the obvious `exists (select 1 from pool_member …)` predicate — when the policy is on `pool_member` itself, that subquery re-enters the same policy. Lives in `0006_fix_rls_recursion.sql`.

```sql
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
grant execute on function public.is_pool_member(uuid, uuid) to authenticated, anon;
```

**`pool`**
```sql
-- Admin sees their pool from the moment of insert (lets INSERT … RETURNING
-- succeed before the pool_member row is created); members see pools they
-- belong to.
create policy pool_member_select on pool for select
  using (
    admin_id = auth.uid()
    or public.is_pool_member(pool.id, auth.uid())
  );
create policy pool_insert_self_admin on pool for insert
  with check (admin_id = auth.uid());
create policy pool_admin_update on pool for update
  using (admin_id = auth.uid()) with check (admin_id = auth.uid());
```

**`pool_member`**
```sql
create policy pm_self_select on pool_member for select
  using (
    user_id = auth.uid()
    or public.is_pool_member(pool_member.pool_id, auth.uid())
  );
create policy pm_self_insert on pool_member for insert
  with check (user_id = auth.uid());
create policy pm_self_delete on pool_member for delete
  using (user_id = auth.uid());
```

**`bet_match`** — own bets always readable/writable until kickoff; other members' bets visible **only after kickoff**.
```sql
create policy bm_self_all on bet_match for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
              and exists (select 1 from match m
                          where m.id = bet_match.match_id and now() < m.kickoff_at));
create policy bm_peer_after_kickoff on bet_match for select
  using (user_id <> auth.uid()
      and exists (select 1 from pool_member pm
                  where pm.pool_id = bet_match.pool_id and pm.user_id = auth.uid())
      and exists (select 1 from match m
                  where m.id = bet_match.match_id and now() >= m.kickoff_at));
```

**`bet_group`** — own bets writable until **the first WC match** kicks off (the global "group phase opens" deadline). Peer-readable only after that same deadline.
```sql
-- Helper: kickoff of the first group-stage match in the tournament.
create or replace view first_kickoff as
  select min(kickoff_at) as t from match where stage = 'group';

create policy bg_self_all on bet_group for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (select t from first_kickoff) > now());
create policy bg_peer_after_deadline on bet_group for select
  using (user_id <> auth.uid()
      and exists (select 1 from pool_member pm
                  where pm.pool_id = bet_group.pool_id and pm.user_id = auth.uid())
      and (select t from first_kickoff) <= now());
```

**`bet_knockout`** — deadline is the kickoff of the **first R32 match**.
```sql
create or replace view first_r32_kickoff as
  select min(kickoff_at) as t from match where stage = 'r32';

create policy bk_self_all on bet_knockout for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (select t from first_r32_kickoff) > now());
create policy bk_peer_after_deadline on bet_knockout for select
  using (user_id <> auth.uid()
      and exists (select 1 from pool_member pm
                  where pm.pool_id = bet_knockout.pool_id and pm.user_id = auth.uid())
      and (select t from first_r32_kickoff) <= now());
```

**`bet_champion`** — deadline is the kickoff of the first WC match (same as `bet_group`).
```sql
create policy bc_self_all on bet_champion for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (select t from first_kickoff) > now());
create policy bc_peer_after_deadline on bet_champion for select
  using (user_id <> auth.uid()
      and exists (select 1 from pool_member pm
                  where pm.pool_id = bet_champion.pool_id and pm.user_id = auth.uid())
      and (select t from first_kickoff) <= now());
```

**`score`** — read-only for any member of the same pool.
```sql
create policy score_pool_select on score for select
  using (exists (select 1 from pool_member pm
                 where pm.pool_id = score.pool_id and pm.user_id = auth.uid()));
```

**`team` and `match`** — fixture and team data is public information; all authenticated users (and the SSR server) can read it. Writes are server-only via the service role.
```sql
create policy team_public_select  on team  for select using (true);
create policy match_public_select on match for select using (true);
```

**`reminder_sent`** — service-role only (no policies needed beyond enabling RLS with no permissive policy).

**Aggregated view `pool_ranking`** is the read path for the ranking page:
```sql
create or replace view pool_ranking as
select
  s.pool_id,
  s.user_id,
  p.name,
  sum(s.points)::int                                                as points,
  count(*) filter (where s.is_exact_score)                          as exact_count,
  count(*) filter (where s.is_correct_winner and not s.is_exact_score) as correct_winner_count
from score s join profile p on p.id = s.user_id
group by s.pool_id, s.user_id, p.name;
```
Order on the client by `points desc, exact_count desc, correct_winner_count desc, name asc` — exactly the tiebreak rule in `requirements.md` §4.5.

## 5. Match score entry (manual, by admin)

There is no external sports data API. Match scores arrive in the system through a single path: an admin opens the admin panel, enters the score, submits.

**Flow:**
1. Admin navigates to `/admin/jogos/[matchId]` (reached by direct URL from the matches list when logged in as an admin of any pool).
2. Form shows two number inputs (home/away) and the match metadata.
3. On submit, the server action:
   a. Verifies `exists (select 1 from pool where admin_id = auth.uid())` — any pool admin may edit any score (architecture §2.4 / §6).
   b. Writes `home_score`, `away_score`, and sets `status = 'finished'` on the `match` row.
   c. Calls `recompute_match(match_id)` to upsert `score` rows for every `bet_match` against that match.
4. Realtime subscribers on `score` get notified; ranking pages across all pools refresh within ~60s.

**Cron strategy (declared in `vercel.json`):**
- `/api/cron/send-reminders` — hourly. Finds users in any pool with no prediction for a match starting in the next 12-24h and sends a Resend email; the `reminder_sent (user_id, match_id)` table prevents duplicates across runs.
- _(No `sync-scores` cron — match data is admin-driven.)_

**Operational expectations:**
- WC 2026 has ~104 matches over ~6 weeks. ~3-4 group-stage matches per day at peak.
- Admin enters a score in ~30s. Total operational cost: ~50 minutes over the tournament.
- Admin SLA: enter the score within 12 hours of full time. Participants understand "ranking updates when [admin] enters the result."

**Fixture seeding:** the 104 fixtures (teams, groups, kickoffs) are seeded once during Phase 2 from FIFA's public schedule (FIFA.com or the Wikipedia "2026 FIFA World Cup" article). Captured as plain SQL in `supabase/migrations/0005_seed_matches.sql`. No runtime fetch.

## 6. Authentication and authorization

- **Sign up:** Supabase Auth, server action creates a `profile` row in the same transaction (via trigger on `auth.users`).
- **Email confirmation:** required; Supabase sends via Resend SMTP.
- **Login:** server action returns the session via cookies (`@supabase/ssr`).
- **Password recovery:** `/recuperar` calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: <APP_URL>/auth/confirm?next=/recuperar/redefinir })`. Supabase sends a magic link through the same Resend SMTP. The link hits `/auth/confirm` with `type=recovery`, which verifies the OTP and redirects to `/recuperar/redefinir` with a recovery session in cookies. That page lets the user call `supabase.auth.updateUser({ password })` then redirects to `/`. To avoid leaking email existence, the request page always shows the same success message regardless of whether the email is registered.
- **Middleware** (`middleware.ts`): runs on `/(app)/:path*` and `/admin/:path*`. Responsibilities:
  1. Refresh the Supabase session.
  2. Redirect unauthenticated requests to `/entrar`.
  3. **Set a default `active_pool_id` cookie** if absent: SELECT the user's most-recently-joined `pool_member.pool_id` and write the cookie. If the user has zero memberships, redirect to `/` (the "Meus bolões" dashboard with a "Criar/Entrar em bolão" prompt).
- **Admin guard for score override:** `admin/jogos/[matchId]/page.tsx` checks `exists (select 1 from pool where admin_id = auth.uid())` — i.e., the user must admin at least one pool. Because match data is global, any pool admin may correct any score. Pool-metadata edits (renaming, regenerating invite code) are scoped to that pool's `admin_id`.
- **Authorization helpers** in `lib/pool.ts`:
  - `readActivePoolId(): Promise<string>` — reads the cookie or falls back to the user's first membership.
  - `assertMember(poolId, userId): Promise<void>` — throws if the user is not a member; called by every server action that mutates pool-scoped data.

## 7. Email notifications

- **Template:** React Email, single template `BetReminderEmail` with the participant's name, match details, and a deep link.
- **Trigger:** `/api/cron/send-reminders` hourly. Idempotency via the `reminder_sent` table.
- **Opt-out:** `profile.email_opt_out` boolean (see §4 schema), toggle on `/perfil`.

## 8. GitHub setup

- **Repo:** public, named `bolao-copa-2026`.
- **Branch protection on `main`:**
  - PR required (no direct pushes).
  - Status checks: GitHub Actions CI must pass.
- **CI workflow (`.github/workflows/ci.yml`):**
  - `pnpm install --frozen-lockfile`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm test` (vitest)
- **Vercel integration:** connected via the Vercel GitHub app. Preview deploy per PR, production deploy from `main`.
- **Secrets management:** real values only in Vercel project env vars and GitHub Actions secrets. `.env.example` is the single source of truth for required variable names.

### Required env vars
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
CRON_SECRET=
APP_URL=
```

## 9. Cost estimate (during the WC, ~1 month)

| Item | Plan | Monthly cost |
|---|---|---|
| Vercel | Hobby (free) | R$0 |
| Supabase | Free | R$0 |
| Resend | Free | R$0 |
| **Total** | | **R$0** |

Well under the R$150 budget. If Vercel free tier is exceeded on a match day, Pro is $20/mo (~R$100) — acceptable as a one-off upgrade only if needed. The R$150 budget is now a safety margin rather than a target.

## 10. Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Admin forgets / delays entering a score | Medium | One pool admin per pool, and *any* pool admin may edit any score (§2.4 / §6) — so the burden is shared across all pool creators. UI shows "aguardando placar" so participants know it's pending, not broken. |
| Admin enters a wrong score | Low-Medium | The same form is also the correction form; re-submitting reruns `recompute_match` idempotently and ranking refreshes in ~60s. |
| Vercel free tier exhausted on big match day | Low-Medium | Upgrade to Pro on demand; not a code change. |
| Supabase Auth emails go to spam | Medium | Use Resend SMTP from day 1; warn users to check spam in the welcome message. |
| ~3-week schedule slips | Medium-High | Notifications (Phase 7) is the natural cut — ship after kickoff if needed. Bracket UI (Phase 4) is the second cut. |
| Realtime ranking adds load on Supabase free tier | Low | Limit subscription to one channel per pool; fallback to manual refresh button if degraded. |
| Time zone bugs (UTC vs browser) | Medium | Single `<LocalTime />` Client Component + `lib/time.ts`; vitest coverage on the helpers. |
| Seed schedule diverges from real fixtures (postponements, time changes) | Low-Medium | Admin can edit `kickoff_at` from the same `/admin/jogos/[matchId]` panel. |
