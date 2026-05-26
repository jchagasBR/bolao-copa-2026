# Implementation Plan — Bolão Copa 2026

> **Document language:** English (dev artifact).
> **Companion docs:** [`requirements.md`](./requirements.md), [`architecture.md`](./architecture.md).
> **Hard deadline:** WC 2026 starts **2026-06-11**. MVP must be live before kickoff of match 1.
> **Original plan start:** 2026-05-22 → ~20 days until kickoff, with Phase 9 reserved for launch on 06-10 and a **buffer day (06-09)** between polish/UAT and launch.

## Session log

**Last session:** resumed 2026-05-26.
**Current phase:** Phase 1 ✅ verified end-to-end (sign-up → email confirmation → dashboard → sign-out → sign-in). Ready for Phase 2.
**Schedule status:** Phases 0 and 1 done on the same day (2026-05-26). Phase 2 (4-day budget) starts next. Phase 6 freed 1 day and the buffer day (06-09) absorbs any further slip. Still on track for 2026-06-11 launch.

### What's done

- All local Phase 0 deliverables (toolchain, scaffold, deps, shadcn, landing page, CI workflow).
- Public GitHub repo live at **https://github.com/jchagasBR/bolao-copa-2026**.
- Two commits on `main`, both pushed and CI-green:
  - `1589b0e` — chore: bootstrap project (Phase 0)
  - `b952b40` — docs: drop API-Football, switch to manual admin score entry
- gh CLI authenticated as `jchagasBR` with `workflow` scope.
- Three founding docs and `doc-auditor` subagent in place.
- **Strategy change:** dropped API-Football (free tier excludes WC 2026); match scores will be entered manually by pool admins. Phase 6 shrank from 2 days to 1.

### What's pending (resume here)

Three external accounts the user must create — Claude cannot do these. **All are blockers for Phase 1.**

1. ~~**Supabase project**~~ — **DONE 2026-05-26.** Project `bolao-copa-2026` created in region `eu-central-1` (Frankfurt; chosen to balance latency for users in Poland and São Paulo). Credentials wired into `.env.local`; both publishable and secret keys verified against `/auth/v1/health` and `/rest/v1/`.

2. ~~**Resend account**~~ — **DONE 2026-05-26.** API key + sandbox sender `onboarding@resend.dev` wired into Supabase Auth SMTP (Host: `smtp.resend.com`, Port: `465`, User: `resend`). Test invitation arrived in Gmail **Inbox**. ⚠️ Sandbox sender only delivers to the Resend account owner's email — a custom domain must be verified on Resend before Phase 9 (launch) so invitations can reach all friends. See [[project-resend-sandbox-limit]].

3. **Vercel project** _(deferred — Phase 1 can proceed locally without it)_ → import the GitHub repo, paste env vars, trigger a first deploy. Paste back the production URL → that becomes `APP_URL`.

### First action when resuming

When ready, paste the Supabase/Resend/Vercel values to Claude. Claude will then:
1. Write `.env.local` with the real values
2. Verify `pnpm dev` connects to Supabase (sanity check)
3. Move directly into **Phase 1** (auth pages, middleware, pool dashboard, pool switcher)

If you want to do Phase 1 *before* all three accounts exist: Supabase is the only hard requirement (auth needs it). Resend can be deferred until you want real confirmation emails (Supabase Auth will use its low-rate default until SMTP is configured). Vercel can be deferred until you want a public preview URL.

### Useful refresh commands for the next session

```powershell
# Refresh PATH (PowerShell tool sessions need this each invocation)
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')

# Sanity check the toolchain
node --version; pnpm --version; git --version; gh --version

# Pull latest (in case of any GitHub-side edits)
git pull --ff-only

# Local dev server
pnpm dev
```

---

## How to use this file

- Each phase has a checklist of concrete deliverables and a **"Verify"** acceptance criterion.
- Mark items `[x]` when done; only mark a phase complete when its Verify step passes end-to-end.
- If a phase slips, the **first thing to cut is Phase 7 (notifications)**, then **Phase 4's bracket UI** (it can be added during the WC before R32 starts on ~06-29 — there are ~17 days between end of group stage and R32).
- All phases assume the user reviews and merges Claude's PRs; CI must pass before merge.
- **Doc audits:** at the end of Phases 2, 4, 6, and 8, run the project-scoped subagent `doc-auditor` (defined at `.claude/agents/doc-auditor.md`) to surface drift between the three founding docs and the code. The agent is read-only and produces a structured report; the human applies any fixes.

---

## Phase 0 — Documentation & setup (started 2026-05-22, code done 2026-05-23, Supabase + Resend done 2026-05-26) 🟢 nearly complete (Vercel deferred)

**Goal:** repo and infrastructure are ready to receive code.

**Local / code work — done:**

- [x] `requirements.md`, `architecture.md`, `implementation.md` written
- [x] User reviews all three docs and approves
- [x] User signs off on the bonus point values in `requirements.md` §4.2 (defaults stand)
- [x] Create public GitHub repo `bolao-copa-2026` (https://github.com/jchagasBR/bolao-copa-2026) and push (commit `1589b0e`)
- [x] Bootstrap Next.js app — _actual: Next **16** + React 19 + Tailwind 4 (newer than the planned 14)_
- [x] Install core deps: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `react-hook-form`, `@hookform/resolvers`, `date-fns`, `date-fns-tz`, `resend`, `@react-email/components`
- [x] Install dev deps: `vitest`, `@vitest/ui`
- [x] Initialize shadcn/ui (preset `base-nova`, neutral colors, RSC) — added `button` and `card`
- [x] Set up GitHub Actions CI (`.github/workflows/ci.yml`) — lint + typecheck + test + build; first run passed
- [x] Deploy a placeholder PT-BR landing page locally (`pnpm build` succeeds)
- [x] ~~Create API-Football account and test WC 2026 coverage~~ — **dropped 2026-05-23.** Free tier covers only seasons 2022-2024 and WC 2026 is paywalled. Rather than pay $19 to verify Pro coverage, we dropped the external sports API entirely. Match scores will be entered manually by admins. See `architecture.md` §2.6 / §5. (commit `b952b40`)
- [x] Create `.env.example` (without `API_FOOTBALL_KEY`); `.env.local` will be created when keys arrive

**External / user work — pending (the resume point):**

- [x] **Create Supabase project** (region `eu-central-1`, Frankfurt) and capture URL + publishable key + secret key — _done 2026-05-26_
- [x] **Create Resend account**, get API key + sender email (`onboarding@resend.dev` sandbox sender) — _done 2026-05-26_
- [x] **Configure Supabase Auth → SMTP** with Resend (Host: `smtp.resend.com`, Port: `465`, User: `resend`, Password: Resend API key) — _done 2026-05-26 (after 535 username/password debug — username must be exactly `resend`, password must be the actual API key value, not the masked dashboard display)_
- [x] **Send a test confirmation email** through Supabase Auth to a real Gmail address; confirm it lands in inbox, not spam — _done 2026-05-26, landed in Gmail Inbox_
- [ ] **Verify a custom domain on Resend** before sharing the invite code with friends (Phase 9 blocker). Sandbox sender only delivers to the Resend account owner's email.
- [ ] **Connect Vercel to the GitHub repo**, configure env vars (placeholders OK initially), trigger first deploy, capture production URL → `APP_URL` — _deferred; Phase 1 can proceed locally without it_
- [ ] _(Deferred)_ Set branch protection on `main` (requires CI status check name to exist; can wait until after Phase 2)

**Verify (gate to Phase 1):**
- The Vercel production URL serves the "Bolão Copa 2026" landing page in PT-BR.
- A test PR triggers CI and a Vercel preview deploy.
- The Gmail deliverability test email is in the inbox (not spam).
- `pnpm dev` locally connects to Supabase without error (a `supabase.auth.getSession()` call succeeds).

---

## Phase 1 — Auth and navigation shell (done 2026-05-26) — 🟢 verified

**Goal:** users can sign up, confirm email, log in, and see the "Meus bolões" dashboard with a path to create or join a pool.

- [x] ~~Configure Resend as Supabase Auth SMTP~~ — _done in Phase 0, 2026-05-26_
- [x] **Apply `supabase/migrations/0001_init.sql` via Supabase SQL Editor** — _done 2026-05-26_
- [x] **Customize the Supabase confirmation email template** to use the PKCE/OTP flow that hits our `/auth/confirm` route — _done 2026-05-26._ Template body:

  ```html
  <h2>Bolão Copa 2026</h2>
  <p>Olá! Clique no botão abaixo para confirmar seu email e começar a palpitar:</p>
  <p>
    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/"
       style="display:inline-block;padding:10px 16px;background:#171717;color:#fff;text-decoration:none;border-radius:6px;">
      Confirmar email
    </a>
  </p>
  <p style="color:#666;font-size:13px;">Se você não criou esta conta, ignore este email.</p>
  ```

- [x] Build PT-BR pages: `/cadastro` (sign up), `/entrar` (login)
- [x] Implement server actions for sign up / login / logout (`app/cadastro/actions.ts`, `app/entrar/actions.ts`, `app/auth/signout/route.ts`)
- [x] Add a Postgres trigger that inserts a `profile` row whenever `auth.users` gets a new row — _in `0001_init.sql`, applied to Supabase manually_
- [x] Implement `middleware.ts` to protect `(app)/*` and `admin/*`, refresh sessions — _`active_pool_id` cookie default deferred to Phase 3 when pool data exists_
- [x] Build authenticated layout `app/(app)/layout.tsx` with header (logo + `<PoolSwitcher />` + user menu) and mobile bottom nav (Início, Jogos, Palpites, Ranking, Perfil)
- [x] Implement `components/pool-switcher.tsx` — _stub: renders "Sem bolões" placeholder; Phase 3 will populate it_
- [x] Dashboard at `/` showing "Meus bolões" (list of memberships with name, member count, your rank) + "+ Criar bolão" + "+ Entrar em bolão" CTAs — _list is empty for now (no pool data); CTAs route to `/boloes/criar` and `/boloes/entrar` which are Phase 3 routes_

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

## Phase 6 — Admin score entry (Day 14: 2026-06-04)

**Goal:** the admin can enter / edit a match score and have every pool's points recompute.

Scope shrank significantly on 2026-05-23 when we dropped the external sports API (see `architecture.md` §2.6 / §5). What used to be "API wrapper + cron + admin override" is now just the admin form. Estimated at 1 day; surplus day flows into the buffer or earlier-phase slip.

- [ ] Implement `/admin/jogos/[matchId]` editor with a score-entry form (home/away number inputs, Zod validation, no list page — reached by direct URL or from `/jogos` when authenticated as a pool admin)
- [ ] Page guard: visible only if `exists (select 1 from pool where admin_id = auth.uid())` — any pool admin may edit any match score (architecture §2.4 / §6)
- [ ] Server action: validates input, writes `home_score` / `away_score` / `status='finished'` on the `match` row, then calls `recompute_match(match_id)` — rescore propagates to **every pool's** bets on that match
- [ ] Add an "edit kickoff" affordance on the same form so the admin can adjust `kickoff_at` if a fixture is postponed
- [ ] Add a small "Aguardando placar" badge to past-kickoff matches with `status != 'finished'` so participants can see the score is pending entry, not broken

**Verify:**
- Admin enters a score in the panel and the ranking updates within 60 seconds.
- Re-entering a different score for the same match (correction case) updates ranking again without errors (idempotent `recompute_match`).
- A non-admin user hitting `/admin/jogos/[matchId]` gets `notFound()`.
- A past-kickoff unscored match shows "Aguardando placar" on the participant `/jogos` view.
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
