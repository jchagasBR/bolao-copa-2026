# Implementation Plan — Bolão Copa 2026

> **Document language:** English (dev artifact).
> **Companion docs:** [`requirements.md`](./requirements.md), [`architecture.md`](./architecture.md).
> **Hard deadline:** WC 2026 starts **2026-06-11**. MVP must be live before kickoff of match 1.
> **Today:** 2026-05-22 → ~20 days until kickoff, with Phase 9 reserved for launch on 06-10 and a **buffer day (06-09)** between polish/UAT and launch.

## How to use this file

- Each phase has a checklist of concrete deliverables and a **"Verify"** acceptance criterion.
- Mark items `[x]` when done; only mark a phase complete when its Verify step passes end-to-end.
- If a phase slips, the **first thing to cut is Phase 7 (notifications)**, then **Phase 4's bracket UI** (it can be added during the WC before R32 starts on ~06-29 — there are ~17 days between end of group stage and R32).
- All phases assume the user reviews and merges Claude's PRs; CI must pass before merge.
- **Doc audits:** at the end of Phases 2, 4, 6, and 8, run the project-scoped subagent `doc-auditor` (defined at `.claude/agents/doc-auditor.md`) to surface drift between the three founding docs and the code. The agent is read-only and produces a structured report; the human applies any fixes.

---

## Phase 0 — Documentation & setup (Day 1: 2026-05-22) ✅ in progress

**Goal:** repo and infrastructure are ready to receive code.

- [x] `requirements.md`, `architecture.md`, `implementation.md` written
- [ ] User reviews all three docs and approves
- [ ] **User signs off on the bonus point values in `requirements.md` §4.2** (defaults stand unless changed)
- [ ] Create public GitHub repo `bolao-copa-2026` and push the three docs as the first commit
- [ ] Bootstrap Next.js app: `pnpm create next-app@latest . --ts --tailwind --eslint --app --src-dir=false --import-alias="@/*"`
- [ ] Install core deps: `pnpm add @supabase/supabase-js @supabase/ssr zod react-hook-form @hookform/resolvers date-fns date-fns-tz resend`
- [ ] Install dev deps: `pnpm add -D vitest @vitest/ui @types/node`
- [ ] Initialize shadcn/ui: `pnpm dlx shadcn@latest init` (Slate, CSS variables, RSC)
- [ ] Create Supabase project (region: `sa-east-1` São Paulo) and capture URL + anon key + service role key
- [ ] Create Resend account, verify a sender domain (or use Resend's `onboarding@resend.dev` for development) and capture API key
- [ ] Create API-Football account (free tier first), capture key, and **test WC 2026 coverage** with: `GET https://v3.football.api-sports.io/leagues?id=1&season=2026`
- [ ] **Send a test email through Resend SMTP from Supabase Auth to a real Gmail address and confirm it doesn't land in spam** (early deliverability check; flips on Phase 1 risk)
- [ ] Create `.env.local` with all keys from §8 of `architecture.md`; create `.env.example` with empty values
- [ ] Connect GitHub repo to Vercel; configure all env vars in Vercel project settings (Production + Preview)
- [ ] Set up GitHub Actions CI (`.github/workflows/ci.yml`) and branch protection on `main`
- [ ] Deploy a placeholder landing page to Vercel

**Verify:**
- The Vercel production URL serves a "Bolão Copa 2026" landing page in PT-BR.
- `GET /leagues?id=1&season=2026` returns at least one league entry confirming WC 2026 is in the API-Football catalog.
- A test PR triggers CI and a Vercel preview deploy.
- The Gmail deliverability test email is in the inbox (not spam).

---

## Phase 1 — Auth and navigation shell (Days 2-3: 2026-05-23 to 2026-05-24)

**Goal:** users can sign up, confirm email, log in, and see the "Meus bolões" dashboard with a path to create or join a pool.

- [ ] Configure Resend as Supabase Auth SMTP (Supabase dashboard → Authentication → SMTP)
- [ ] Customize Supabase Auth email templates in PT-BR (confirmation only; reset template stays default since the flow is out of scope)
- [ ] Build PT-BR pages: `/cadastro` (sign up), `/entrar` (login)
- [ ] Implement server actions for sign up / login / logout
- [ ] Add a Postgres trigger that inserts a `profile` row whenever `auth.users` gets a new row
- [ ] Implement `middleware.ts` to protect `(app)/*` and `admin/*`, refresh sessions, and **set the `active_pool_id` cookie** to the user's first membership when missing (see architecture §6)
- [ ] Build authenticated layout `app/(app)/layout.tsx` with header (logo + `<PoolSwitcher />` + user menu) and mobile bottom nav (Início, Jogos, Palpites, Ranking, Perfil)
- [ ] Implement `components/pool-switcher.tsx` — Client Component listing the user's pools, writes `active_pool_id` cookie on selection, navigates to `/jogos`
- [ ] Dashboard at `/` showing "Meus bolões" (list of memberships with name, member count, your rank) + "+ Criar bolão" + "+ Entrar em bolão" CTAs

**Verify:**
- Create an account, receive and click the confirmation email, log in, see the dashboard with zero pools and the create/join CTAs, log out — full round trip works.
- Visiting `/jogos` while logged out redirects to `/entrar`.
- Visiting `/jogos` while logged in with zero pools redirects to `/` (no active pool to scope to).
- CI is green; preview deploy reflects the new pages.

---

## Phase 2 — Data model and seed (Days 4-7: 2026-05-25 to 2026-05-28)

**Goal:** schema, RLS, and scoring are in place and exercised. Extended to 4 days — the RLS predicates and the 104-fixture seed each consume ~1 day and need real testing.

- [ ] Write `supabase/migrations/0001_init.sql` with all tables, enums, indexes, and the `pool_ranking` view from §4 of `architecture.md`
- [ ] Write `supabase/migrations/0002_rls.sql` enabling RLS and adding the concrete predicates from §4.2 (`profile`, `pool`, `pool_member`, `bet_match`, `bet_group`, `bet_knockout`, `bet_champion`, `score`, `reminder_sent`, plus the public-read policies for `team` and `match`) and the helper views `first_kickoff` and `first_r32_kickoff`
- [ ] Include the `enforce_pool_member_cap()` function and trigger in the init migration (rejects an 11th membership with PT-BR error)
- [ ] Write `supabase/migrations/0003_scoring.sql` with:
  - SQL function `compute_match_points(predicted_h, predicted_a, actual_h, actual_a) returns smallint`
  - SQL function `recompute_match(match_id uuid) returns void` (idempotent upsert into `score`, sets tiebreaker flags)
  - SQL function `recompute_bonuses(pool_id uuid) returns void` (stub: bonus rules wired in Phase 4)
  - Trigger `bet_match_locked` on `bet_match` (writes after kickoff rejected)
- [ ] **Source the official FIFA WC 2026 schedule** (decide source in this phase: FIFA's public JSON, an Excel export, or scrape — document choice in a comment in the migration)
- [ ] Write `supabase/migrations/0004_seed_teams_groups.sql` with the 48 WC 2026 teams and their group letters (A-L)
- [ ] Write `supabase/migrations/0005_seed_matches.sql` with all 104 fixtures and `kickoff_at` from the chosen source
- [ ] Implement `lib/scoring/match.ts` mirroring `compute_match_points` in TypeScript (so the UI can preview points)
- [ ] Implement `lib/scoring/ranking.ts` with the tie-break logic per `requirements.md` §4.5
- [ ] Write vitest tests covering all four scoring branches and tie-break scenarios

**Verify:**
- `pnpm test` passes with ≥10 scoring tests.
- Updating a match score via SQL and then calling `recompute_match(...)` produces the expected `score` rows including tiebreaker flags — same result whether called once or twice.
- A non-admin user attempting to read another user's `bet_match` for a future match is rejected; the same query for a past match succeeds.
- A user trying to insert an 11th `pool_member` row is rejected by the `enforce_pool_member_cap` trigger with the PT-BR error.
- A user is able to insert a 2nd, 3rd, …, 10th `pool_member` row successfully (multi-pool is allowed up to the cap).
- **Run `doc-auditor` subagent.** Address any P0/P1 items in its report before moving to Phase 3.

---

## Phase 3 — Pool create/join + match bets (Days 8-10: 2026-05-29 to 2026-05-31)

**Goal:** participants can create or join pools, switch between them, and submit/edit predictions for any scheduled match in the active pool.

- [ ] Implement `/boloes/criar` — form with a `name` input, server action that creates the `pool` row with `admin_id = auth.uid()`, generates a unique invite code, inserts the creator into `pool_member`, sets the `active_pool_id` cookie, and redirects to `/jogos`
- [ ] Implement `/boloes/entrar` — input for invite code, server action validates the code exists, the user is not already a member, and the 10-cap is respected (the trigger enforces it; UI shows a friendly error)
- [ ] `lib/pool.ts` — implement `readActivePoolId()`, `assertMember(poolId, userId)`, `listMyPools()` helpers
- [ ] Implement `components/local-time.tsx` — Client Component using `Intl.DateTimeFormat` + `date-fns-tz` to render UTC timestamps in the browser's TZ
- [ ] Implement `/jogos` listing all matches grouped by date, kickoff via `<LocalTime />`, team flags, and a "Palpitar" CTA per match. Bets shown are filtered by the active pool.
- [ ] Implement `/jogos/[matchId]` with two number inputs (home/away score), Zod validation, server action that reads active pool from cookie, calls `assertMember`, then saves
- [ ] Show "Bloqueado" state when `now() >= kickoff_at`, displaying the saved prediction as read-only
- [ ] Implement `/palpites` listing the user's predictions grouped by stage with edit links, scoped to the active pool
- [ ] Add seed SQL for QA fixtures with past `kickoff_at` to test the locked state

**Verify:**
- A test user creates a pool, becomes its admin, sees themself in the switcher.
- A 2nd test user joins via invite code and sees the same pool. Both can switch between this pool and a 2nd pool they share.
- A user in a 2nd pool sees only their bets for the pool selected in the switcher; switching pools changes the displayed bets without page reload errors.
- A test user predicts a future match in pool A, switches to pool B, predicts the same match differently, switches back — pool A still shows the pool A prediction.
- A user past kickoff cannot edit; the form shows read-only.
- Open the site from a Lisbon-set browser TZ and from a São Paulo TZ — both see kickoff times in their local zone.
- Lighthouse mobile Performance on `/jogos` ≥ 85.

---

## Phase 4 — Group-stage, bracket, and champion bets (Day 11: 2026-06-01)

**Goal:** all non-match bet types are functional before WC kickoff. Compressed to 1 day — groups/champion are simple forms; bracket is a skeleton (real bracket UI can ship between end of group stage and R32 if needed).

- [ ] Implement `/palpites/grupos` with a section per group showing the 4 teams and two dropdowns (1st, 2nd)
- [ ] Validation: the two picks within a group must be different teams (DB `CHECK` plus client validation)
- [ ] Implement `/palpites/campeao` with a single team picker over all 48 teams
- [ ] Bracket page `/palpites/mata-mata` skeleton — shows "Aguardando classificados" placeholder until 06-28; real bracket UI deferred to a follow-up before the first R32 kickoff
- [ ] Implement bonus scoring inside `recompute_bonuses(pool_id uuid)` using the values signed off in Phase 0
- [ ] Wire `recompute_bonuses` to be called by the cron when the group stage ends and after each knockout round closes

**Verify:**
- A participant completes group bets + champion in under 5 minutes.
- Submitting an invalid group bet (same team twice) is rejected with a clear PT-BR error.
- Calling `recompute_bonuses(...)` after seeding a fake group result produces the expected bonus points.
- **Run `doc-auditor` subagent.** Address any P0/P1 items in its report before moving to Phase 5.

---

## Phase 5 — Ranking and personal views (Days 12-13: 2026-06-02 to 2026-06-03)

**Goal:** results visibility is live.

- [ ] Implement `/ranking` reading the `pool_ranking` view (already created in Phase 2); subscribe to `score` via Supabase Realtime to refetch on changes
- [ ] Implement `/perfil` showing total points, position, and the list of personal predictions (no chart — cosmetic, cut from MVP)
- [ ] Implement `/jogos/[matchId]` "post-kickoff" mode showing every member's prediction and points earned

**Verify:**
- Admin updates a test match score via SQL + `recompute_match(...)`; ranking page reorders within 60 seconds without a manual refresh.
- The tiebreaker ordering works: build a fake scenario with two users tied on points but different `exact_count` and verify the higher exact-count user ranks first.

---

## Phase 6 — API-Football sync + cron + admin override (Days 14-15: 2026-06-04 to 2026-06-05)

**Goal:** real match results flow in automatically; admin can fix any miss.

- [ ] Implement `lib/football-api/client.ts` with fetch wrapper (retry, 5s timeout, header-based caching)
- [ ] Implement `app/api/cron/sync-scores/route.ts` — protected by `CRON_SECRET` header check, queries matches in the live window, updates `home_score`/`away_score`/`status`, and calls `recompute_match(match_id)` for each changed match
- [ ] Declare the cron in `vercel.json` running every 5 minutes
- [ ] Implement `/admin/jogos/[matchId]` editor with a score override form (no list page — reached by direct URL)
- [ ] Page guard: visible only if `exists (select 1 from pool where admin_id = auth.uid())` — any pool admin may override any match score (architecture §2.4 / §6)
- [ ] Server action behind the admin form calls `recompute_match(match_id)` after the manual override write; this rescore propagates to **every pool's** bets on that match
- [ ] Verify that a user who created at least one pool gets through the guard; a user who is only a member (not admin) of any pool is rejected
- [ ] Add structured logging in the cron and a Resend email alert on ≥3 consecutive API failures

**Verify:**
- Trigger the cron manually with a past test match — `match.home_score` updates and `score` rows are recomputed.
- Admin edits a score in the panel and the ranking updates within 60 seconds.
- A non-admin user hitting `/admin/jogos/[matchId]` gets `notFound()`.
- **Run `doc-auditor` subagent.** Address any P0/P1 items in its report before moving to Phase 7.

---

## Phase 7 — Email reminders (Days 16-17: 2026-06-06 to 2026-06-07) — first-to-cut if slipping

**Goal:** users get a heads-up before they miss a bet.

- [ ] Create React Email template `BetReminderEmail` (PT-BR)
- [ ] Implement `app/api/cron/send-reminders/route.ts` running hourly: find users in any pool with no `bet_match` for matches starting in the next 12-24h, send max 1 email per user per match (dedupe via `reminder_sent`, already created in Phase 2 schema)
- [ ] Expose the `profile.email_opt_out` toggle on `/perfil`

**Verify:**
- Create a test user opted in with no prediction for a fake match 12-24h away → reminder email is received once when the cron runs.
- Toggling opt-out prevents future sends.

---

## Phase 8 — Polish and UAT (Day 18: 2026-06-08)

**Goal:** the app is ready for real friends.

- [ ] Recruit 3-5 beta testers among the closest friends
- [ ] Create a real pool, share the invite code, observe sign-up and prediction submission
- [ ] Triage and fix bugs in priority order (auth and prediction first, everything else second)
- [ ] Write a short "Regras do bolão" page accessible from the footer summarizing scoring and deadlines
- [ ] Verify Lighthouse mobile Performance ≥ 85 on `/`, `/jogos`, `/ranking`
- [ ] Accessibility pass: keyboard nav + contrast on sign-up, login, and prediction pages
- [ ] Smoke test on iPhone Safari and Android Chrome at 360px width

**Verify:**
- All 5 beta testers complete the full flow (sign up → confirm email → join pool → predict 3 matches → see ranking) without 1:1 help.
- No P0 or P1 bugs open.
- **Run `doc-auditor` subagent for the final pre-launch sweep.** Address any P0 items; defer P1+ to post-launch.

---

## Buffer day — slip absorber (Day 19: 2026-06-09)

**Goal:** absorb any slippage from Phases 2-8 without delaying launch. If everything is on track, use this day for an extra round of bug fixes, copy polish, or an early invite to a couple of friends.

- [ ] Resolve any P0/P1 bugs surfaced in UAT
- [ ] Re-run the full end-to-end smoke test
- [ ] Walk away from the keyboard if all is well — fresh eyes on launch day matter more than extra features

---

## Phase 9 — Launch (Day 20: 2026-06-10)

**Goal:** all 5-30 friends are onboarded before the first match.

- [ ] Send the invite code + signup link to the full friend list via WhatsApp with a short intro message
- [ ] Set a personal reminder to monitor the cron and ranking during the first match (2026-06-11)
- [ ] Have the admin panel open during that match to handle any API miss in real time

**Verify:**
- First WC match completes; final score is reflected in the database, points are computed, and ranking is correct.
- Friends report (informally) that the experience worked end-to-end.

---

## Post-WC — Phase 10 (July 2026, after the final)

**Goal:** wrap up cleanly.

- [ ] Show a final results page declaring the pool champion (with confetti)
- [ ] Add a "Exportar meus palpites" button on `/perfil` that downloads JSON
- [ ] Downgrade API-Football to free tier or cancel to stop the monthly charge
- [ ] Retrospective: what we'd build differently for the next tournament

---

## Cross-cutting checklist (applies to every phase)

- [ ] Every PR has CI green (lint + typecheck + build + tests)
- [ ] No real secrets committed; `.env.example` mirrors the required vars
- [ ] All user-facing copy is in PT-BR
- [ ] All times displayed to users use `<LocalTime />` (renders in the browser's TZ); emails use São Paulo time with the "(horário de Brasília)" label
- [ ] Every server action that touches pool-scoped data calls `assertMember(activePoolId, userId)` from `lib/pool.ts`
- [ ] RLS is enabled on every new table from migration 0001 onward
- [ ] Vercel preview URL on each PR for visual review before merge
