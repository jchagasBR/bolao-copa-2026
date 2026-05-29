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
| Framework | **Next.js 16 (App Router)** + **React 19** | RSC + Server Actions remove the need for a separate API server. Best deploy story on Vercel. Originally planned Next 14 in Phase 0; bootstrapped at 16 since 16 was current at scaffold time (2026-05-22). |
| Language | **TypeScript (strict mode)** | Catches schema mismatches with the DB at compile time. |
| Styling | **Tailwind CSS 4** | Fast iteration, mobile-first utilities built-in. |
| UI components | **shadcn/ui (base-nova preset, neutral colors)** + Base UI primitives where shadcn doesn't ship one (e.g. dropdown) | Accessible, unstyled-by-default, owned-in-repo (no version lock). |
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
| Background jobs | None. Score recomputation runs inline in the admin server action (explicit `recompute_match` + `recompute_bonuses` calls — see §4.1). The one Postgres trigger is `bet_match_locked`, which enforces the kickoff cutoff on `bet_match` writes/deletes — a data-integrity invariant, not a scoring concern. |

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
- **Match score override authority**: any user who is admin of **at least one pool** may override any match score, because match data is global (the score of a fixture is one fact shared by all pools). The check `exists (select 1 from pool where admin_id = auth.uid())` is enforced twice — once in `app/admin/layout.tsx` (gates the route segment with `notFound()`) and once in the score server action via `assertAnyPoolAdmin()`. The actual write goes through the service-role client (`lib/supabase/service.ts`); the `match` table has only a SELECT policy for end users — no INSERT/UPDATE policy. The trust model is that all pool admins are trusted friends.
- **Active pool selection** is browser state, not auth: a cookie named `active_pool_id` (set by the pool switcher) tells server-rendered pages which pool to scope to. The middleware (see §6) sets a sensible default on first request.
- No `app_metadata` role claim. Password reset is out of scope (see `requirements.md` §6).

### 2.5 Realtime
- **Supabase Realtime** subscriptions on the `score` and `bonus` tables (both opted into the `supabase_realtime` publication by `0009_realtime.sql`). A `match` write triggers `recompute_match` → rows on `score`; the same admin action then loops `recompute_bonuses` → rows on `bonus`. Subscribing to both surfaces the full ranking change to clients.
- The ranking page mounts a small `<RankingLive />` Client Component that subscribes once per active pool and calls `router.refresh()` on every `postgres_changes` event filtered by `pool_id`. Re-fetch happens via the server re-render, not a client-side aggregation — keeps the tiebreak logic in one place (the server).

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
- **GitHub Actions** for CI on every PR: lint + typecheck + test (vitest) + build.
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
│   ├── regras/page.tsx            # /regras (PT-BR rules summary) — public
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
│   │   └── perfil/
│   │       ├── page.tsx           # user's per-pool stats + opt-out toggle + atalhos
│   │       ├── actions.ts         # setEmailOptOut server action
│   │       └── opt-out-toggle.tsx # Client Component, auto-submits on change
│   ├── admin/                          # admin area (any pool admin)
│   │   ├── layout.tsx                  # gates /admin/* via any-pool-admin check; notFound() otherwise
│   │   └── jogos/[matchId]/            # single per-match editor
│   │       ├── page.tsx                # score + reagendar UI
│   │       ├── actions.ts              # saveScore / saveKickoff server actions
│   │       ├── score-form.tsx          # Client Component
│   │       └── kickoff-form.tsx        # Client Component
│   ├── api/
│   │   └── cron/
│   │       └── send-reminders/route.ts
│   ├── layout.tsx                 # root layout
│   └── globals.css
├── components/
│   ├── ui/                        # shadcn primitives (button, card, input, label, dropdown-menu)
│   ├── pool-switcher.tsx          # header dropdown (Client) — writes active_pool_id cookie
│   ├── user-menu.tsx              # header user dropdown (Client) — name + signout
│   ├── local-time.tsx             # Client Component formatting UTC → browser TZ
│   ├── nav-items.ts               # shared NAV_ITEMS array (5 top-level routes + icons)
│   ├── mobile-nav.tsx             # md:hidden bottom bar
│   ├── desktop-nav.tsx            # hidden md:block header nav
│   └── footer.tsx                 # global footer rendered by root layout — links to /regras
├── lib/
│   ├── supabase/
│   │   ├── server.ts              # createServerClient — SSR/Server Action client, RLS-respecting
│   │   ├── client.ts              # createBrowserClient
│   │   ├── service.ts             # createServiceClient — bypasses RLS; only used by admin score action
│   │   └── middleware.ts          # session refresh + active_pool_id default
│   ├── pool.ts                    # readActivePoolId(), assertMember(), listMyPools()
│   ├── scoring/
│   │   ├── match.ts               # pure functions mirroring §4.1 (covered by vitest)
│   │   └── ranking.ts             # tiebreak per §4.5 (covered by vitest)
│   └── utils.ts                   # cn() class-merge helper for shadcn components
├── supabase/
│   ├── migrations/                # versioned SQL
│   │   ├── 0001_init.sql                       # schema (tables, enums, indexes, views, triggers)
│   │   ├── 0002_rls.sql                        # RLS policies for every table
│   │   ├── 0003_scoring.sql                    # compute_match_points, recompute_match, bet_match_locked
│   │   ├── 0004_seed_teams_groups.sql          # 48 teams, groups A-L
│   │   ├── 0005_seed_matches.sql               # 104 fixtures with UTC kickoffs
│   │   ├── 0006_fix_rls_recursion.sql          # is_pool_member() SECURITY DEFINER helper
│   │   ├── 0007_bonus.sql                      # bonus table, compute_group_standings, recompute_bonuses v1
│   │   ├── 0008_recompute_bonuses_idempotent.sql # delete-then-insert idempotency on score corrections
│   │   ├── 0009_realtime.sql                   # opts score + bonus into supabase_realtime publication
│   │   ├── 0010_winner_team_id.sql             # match.winner_team_id + champion bonus on penalty finals
│   │   ├── 0011_users_missing_prediction.sql   # SECURITY DEFINER RPC powering the reminder cron
│   │   └── 0012_find_pool_by_invite_code.sql   # SECURITY DEFINER RPC so non-members can join by code
│   └── README.md                  # how to apply migrations via the SQL Editor
├── emails/
│   └── bet-reminder.tsx           # React Email template for the prediction-reminder email (PT-BR)
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
  id              uuid primary key default gen_random_uuid(),
  external_id     integer unique,              -- optional id from the schedule source (nullable)
  stage           match_stage not null,
  group_code      char(1),                     -- only for stage='group'
  home_team_id    uuid references team(id),
  away_team_id    uuid references team(id),
  kickoff_at      timestamptz not null,
  home_score      smallint,
  away_score      smallint,
  -- winner_team_id: nullable. NULL for group matches (a draw IS the result) and
  -- for knockout matches decided in regulation (the score comparison wins). The
  -- admin form requires it on knockout matches that finish level — captures who
  -- advanced on penalties or coin toss. Added in 0010 so `recompute_bonuses`
  -- can award the +20 champion bonus for a final decided on pens.
  winner_team_id  uuid references team(id),
  status          match_status not null default 'scheduled',
  updated_at      timestamptz not null default now(),
  -- A non-null winner must be one of the two teams listed on this match.
  constraint match_winner_is_a_team check (
    winner_team_id is null
    or winner_team_id = home_team_id
    or winner_team_id = away_team_id
  )
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

-- bonus: non-match bonus points. Group standings (kind='group_1st_X' / 'group_2nd_X'),
-- champion (kind='champion'), and (deferred) knockout-round advancement
-- (kind='r16_<team_iso>' etc.). Kept separate from `score` because score is
-- keyed on (user_id, pool_id, match_id) and bonuses aren't tied to a single
-- match. The pool_ranking view UNIONs both.
create table bonus (
  user_id     uuid not null references profile(id) on delete cascade,
  pool_id     uuid not null references pool(id) on delete cascade,
  kind        text not null,
  points      smallint not null,
  computed_at timestamptz not null default now(),
  primary key (user_id, pool_id, kind)
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
- A `BEFORE INSERT OR UPDATE OR DELETE ON bet_match` trigger remains — `bet_match_locked` — which rejects writes (including deletes, since a deleted bet would silently downgrade to a missing-prediction zero per §4.4 of requirements) when `now() >= match.kickoff_at`. This is a hard data integrity rule, not a scoring concern, so a trigger is the right place.

**Per-match scoring is regulation-time only.** `recompute_match` compares the home/away scores stored on the match row, which the admin enters as the regulation-time result. A knockout match that ended 1-1 in regulation and was decided 4-2 on penalties is scored against the 1-1. `is_correct_winner` is false for any prediction that picked a non-draw against an actual regulation-time draw, even when the predicted team later advanced. Penalties / extra-time advancement only matters for the champion bonus (see below) via `match.winner_team_id`.

Idempotency: `recompute_match` performs `INSERT … ON CONFLICT DO UPDATE`. Calling it twice with the same input produces the same `score` rows.

A separate function **`recompute_bonuses(pool_id uuid) returns void`** computes group / knockout / champion bonuses per `requirements.md` §4.2. It is called from the same admin score-entry server action that calls `recompute_match`, immediately after the match write — so corrections propagate through both layers in one round-trip. To stay idempotent under score corrections (e.g. admin re-enters a wrong score and the group standings flip), the function first DELETEs every bonus row in the target pool whose `kind` it owns (`group_*` and `champion`) and then re-INSERTs the currently-correct ones. A helper `compute_group_standings()` returns one row per (group_code, team_id, place) once all six matches in a group are finished; tiebreakers are points → goal difference → goals scored → alphabetical (full FIFA tiebreak chain is out of MVP scope).

**Champion bonus — `winner_team_id`-first, score-fallback.** The +20 champion bonus needs to know who won the final, but a final decided on penalties has `home_score = away_score`. Migration 0010 adds a nullable `winner_team_id` column on `match` (constrained to be one of the two listed teams). `recompute_bonuses` resolves the champion by `coalesce(m.winner_team_id, <case on score comparison>)` — so admins who never set `winner_team_id` for regulation-decisive finals get the right answer for free, and finals decided on pens require the admin to set `winner_team_id` (the admin form rejects a level knockout score with no winner). Group matches stay `winner_team_id is null` — draws ARE the result there.

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

**Joining by invite code from outside the pool.** Because `pool_member_select` only lets admins and existing members read pool rows, a non-member trying to look up a pool by `invite_code` via a direct table query gets 0 rows even for a valid code. The `/boloes/entrar` server action therefore calls a SECURITY DEFINER RPC `find_pool_by_invite_code(text) → uuid` (added in `0012_find_pool_by_invite_code.sql`) which returns only the pool id (no name, admin_id, or other data) — granted to `authenticated`. The user can then INSERT a `pool_member` row themselves under their own `auth.uid()` per `pm_self_insert`. This preserves the §4.6 "anyone with the code can join" model without loosening the SELECT policy on `pool`.

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

**Aggregated view `pool_ranking`** is the read path for the ranking page. It UNIONs match-level `score` with `bonus` so the leaderboard sums both:
```sql
create or replace view pool_ranking as
with all_points as (
  select pool_id, user_id, points, is_exact_score, is_correct_winner
  from score
  union all
  select pool_id, user_id, points, false as is_exact_score, false as is_correct_winner
  from bonus
)
select
  ap.pool_id,
  ap.user_id,
  p.name,
  sum(ap.points)::int                                                  as points,
  count(*) filter (where ap.is_exact_score)                            as exact_count,
  count(*) filter (where ap.is_correct_winner and not ap.is_exact_score) as correct_winner_count
from all_points ap
join profile p on p.id = ap.user_id
group by ap.pool_id, ap.user_id, p.name;
```
Order on the client by `points desc, exact_count desc, correct_winner_count desc, name asc` — exactly the tiebreak rule in `requirements.md` §4.5. Bonus rows contribute `points` only; they synthesize `is_exact_score=false` and `is_correct_winner=false` so they don't pollute the tiebreak counts.

## 5. Match score entry (manual, by admin)

There is no external sports data API. Match scores arrive in the system through a single path: an admin opens the admin panel, enters the score, submits.

**Flow:**
1. Admin navigates to `/admin/jogos/[matchId]` — either by direct URL or via the "Editar resultado / horário →" link rendered on `/jogos/[matchId]` for users who admin at least one pool. The `/admin/*` route segment is gated by `app/admin/layout.tsx`, which `notFound()`s any user not in `pool.admin_id`.
2. The page renders two cards. The **score card** has two number inputs (home/away). For knockout matches it also renders a winner picker (`<select>` with "decided by score" / "home advanced" / "away advanced") used when the regulation score is level (penalties / coin toss). The **kickoff card** lets the admin reschedule a postponed fixture by submitting a `datetime-local` value in their browser TZ plus a hidden `kickoffTzOffsetMinutes` field, so the server converts to UTC without trusting browser ISO output.
3. On submit, the score server action (`app/admin/jogos/[matchId]/actions.ts → saveScore`):
   a. Re-verifies the any-pool-admin invariant via `assertAnyPoolAdmin()` — defense in depth on top of the layout guard.
   b. Validates the input with Zod (`home_score`/`away_score` in [0,20], optional `winner_team_id`). Rejects a knockout submission with `home_score = away_score` and no `winner_team_id` with a PT-BR error. Rejects a `winner_team_id` that isn't one of the two listed teams (defense in depth on top of the `match_winner_is_a_team` CHECK).
   c. Switches to the **service-role client** (`lib/supabase/service.ts → createServiceClient()`) and writes `home_score`, `away_score`, `winner_team_id` (NULL for group matches), and `status = 'finished'` on the `match` row. The browser/SSR client cannot do this — `match` has only `match_public_select` per §4.2; there is no INSERT/UPDATE policy. The service-role boundary lives in exactly this one place.
   d. Calls `recompute_match(match_id)` to upsert `score` rows for every `bet_match` against that match.
   e. Loops `recompute_bonuses(pool_id)` over every row in `pool` — match data is global, so a score correction can flip group standings in any pool. The fan-out is sequential and matches the MVP cap (≤30 users × ≤10 pools = a handful of `pool` rows); if user count grows materially this loop should be replaced with a single SQL function that iterates pools internally.
4. The kickoff server action (`saveKickoff`) re-verifies admin, converts the local datetime + offset to UTC, and updates `match.kickoff_at` only — no scoring side effects.
5. Realtime subscribers on `score` and `bonus` (publication opted-in by 0009) get notified; ranking pages across all pools refresh within ~1s via `router.refresh()` driven by the `<RankingLive />` Client Component.

**Cron strategy (declared in `vercel.json`):**
- `/api/cron/send-reminders` — runs once daily at 12:00 UTC (09:00 BRT). Finds users in any pool with no prediction for a match starting in the next 24h and sends a Resend email; the `reminder_sent (user_id, match_id)` table prevents duplicates across runs. Schedule constrained by Vercel Hobby's "1 cron run per day" limit; bumping to Pro would allow hourly precision but isn't worth the cost for ≤30 users.
- _(No `sync-scores` cron — match data is admin-driven.)_
- _(No `recompute_bonuses` cron either — the function is called from the admin score-entry server action right after `recompute_match`, so bonuses refresh on every score write or correction.)_

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
- **Admin guard for score override:** `app/admin/layout.tsx` runs an `exists (select 1 from pool where admin_id = auth.uid())` check on every request to `/admin/*` and `notFound()`s the response if false. Because match data is global, any pool admin may correct any score. The score server action re-runs the same check via `assertAnyPoolAdmin()` so a stale layout decision can't be bypassed by a direct POST. Pool-metadata edits (renaming, regenerating invite code) are scoped to that pool's `admin_id` and live under `/(app)/boloes/*`, not under `/admin/*`. There is no `/admin` index page — admins reach the per-match editor from the "Editar resultado / horário →" link on `/jogos/[matchId]` or by typing the URL. Deliberate: the only admin operation in the MVP is per-match editing, so a list page would just duplicate `/jogos`.
- **Authorization helpers** in `lib/pool.ts`:
  - `readActivePoolId(): Promise<string>` — reads the cookie or falls back to the user's first membership.
  - `assertMember(poolId, userId): Promise<void>` — throws if the user is not a member; called by every server action that mutates pool-scoped data.

## 7. Email notifications

- **Template:** React Email, single template `emails/bet-reminder.tsx` with the participant's name, the match metadata (stage + teams), São Paulo time labeled "(horário de Brasília)" plus a relative phrase ("Começa em ~12h"), and a "Palpitar agora" CTA deep-linking to `/jogos/[matchId]`.
- **Trigger:** `app/api/cron/send-reminders/route.ts` runs once daily at 12:00 UTC via Vercel Cron (declared in `vercel.json` at `0 12 * * *`). Gated by an `Authorization: Bearer ${CRON_SECRET}` header — Vercel Cron sets this automatically when `CRON_SECRET` is in the project env vars; locally the user passes the same header by hand. (Hobby plan only allows daily crons; we accepted slightly less precision instead of the $20/mo Pro upgrade.)
- **Selection logic** (per match in the `now .. now+24h` window): a SECURITY DEFINER SQL function `users_missing_prediction(match_id)` returns `(user_id, email, name)` for users who are pool members, have no `bet_match` for the match in any of their pools, are not `email_opt_out`, and haven't already been reminded. The function is granted only to the service role — it joins `auth.users` for the email and would leak addresses if exposed.
- **Idempotency:** the `reminder_sent (user_id, match_id)` PK rejects duplicate inserts from concurrent runs; the cron treats the duplicate-key error as a benign "already sent". A user who predicts the match between two cron runs drops out of the selection naturally — no email goes out.
- **Opt-out:** `profile.email_opt_out` boolean (see §4 schema), toggled on `/perfil` via an auto-submitting `OptOutToggle` Client Component. The selection query filters opt-outs at source.

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
