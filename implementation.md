# Implementation Plan — Bolão Copa 2026

> **Document language:** English (dev artifact).
> **Companion docs:** [`requirements.md`](./requirements.md), [`architecture.md`](./architecture.md).
> **Hard deadline:** WC 2026 starts **2026-06-11**. MVP must be live before kickoff of match 1.
> **Original plan start:** 2026-05-22 → ~20 days until kickoff, with Phase 9 reserved for launch on 06-10 and a **buffer day (06-09)** between polish/UAT and launch.

## Session log

**Last session ended:** 2026-05-29 — Phase 9 (launch) kicked off and got ~70% through. Vercel + Resend domain wiring complete; first auth round-trip verified end-to-end on prod; first colleague hit a real bug (invite-code lookup blocked by RLS — fixed in 0012 in the same session). Stopping mid-phase to come back fresh tomorrow.
**Current phase:** Phase 9 🟡 partially deployed. Production is live at `https://bolaofutebolfutebolclube.vercel.app` with the verified Resend domain `bolaofutebolfutebolclube.com`. Next code items are admin score entry smoke + cron prod smoke + branch protection + doc-auditor sweep + broader friend invites. See "Phase 9 — Launch" below for the full pending checklist.
**Schedule status:** Phase 9 was budgeted for Day 20 (2026-06-10) and started on 2026-05-29 — about 12 days early. 13 days until WC kickoff (2026-06-11). Plenty of buffer to absorb anything UAT surfaces.

### Done (in order, with the commit that closed each piece)

| Phase | Status | Notes |
|---|---|---|
| **0** — Setup | 🟢 | Toolchain, scaffold, deps, shadcn (base-nova), CI, placeholder landing, founding docs, doc-auditor agent, Supabase + Resend + SMTP wired, Gmail deliverability verified. |
| **1** — Auth + nav shell | 🟢 | `/cadastro`, `/entrar`, `/auth/confirm`, `/auth/signout`, middleware, authenticated layout, mobile bottom nav, dashboard, `auth.users → profile` trigger. End-to-end verified. |
| **1.5** — Password reset addendum | 🟢 | `/recuperar`, `/recuperar/redefinir`, "Esqueci minha senha" link on `/entrar`. Rescoped into MVP after end-to-end testing surfaced the case where even the admin couldn't recover. |
| **2** — Schema + RLS + scoring | 🟢 | 0001 (full schema) + 0002 (RLS) + 0003 (`compute_match_points`, `recompute_match`, `bet_match_locked` trigger) + 0004 (48 teams) + 0005 (104 fixtures with UTC kickoffs). 16 vitest specs cover scoring + tie-breaks. doc-auditor pass + follow-up (DELETE arm on `bet_match_locked`, `pool_id` membership guard on `bet_*` WITH CHECK). |
| **3** — Pool create/join + match bets | 🟢 | `/boloes/criar`, `/boloes/entrar`, real `PoolSwitcher` dropdown, `lib/pool.ts` queries, `<LocalTime />`, `/jogos`, `/jogos/[matchId]`, `/palpites`. RLS recursion fix in 0006. |
| **4** — Group + champion + bracket placeholder | 🟢 | `/palpites/grupos`, `/palpites/campeao`, `/palpites/mata-mata` placeholder, `/palpites` hub. 0007 bonus table + `compute_group_standings()` + group/champion `recompute_bonuses`. 0008 makes it idempotent under score corrections. doc-auditor pass. |
| **5** — Ranking + perfil + peer predictions | 🟢 | `/ranking` (live via Realtime), `/perfil` (per-pool stats), `/jogos/[matchId]` post-kickoff peer predictions card. 0009 opted `score` + `bonus` into the realtime publication. User verified live ranking refresh. |
| **6** — Admin score entry | 🟢 | `/admin/jogos/[matchId]` with score-entry + reagendar forms; new `lib/supabase/service.ts` for the only write path that bypasses RLS. 0010 adds `match.winner_team_id` + the `match_winner_is_a_team` CHECK, and rewrites `recompute_bonuses` so finals decided on penalties still award the champion bonus (closes the Phase 4 P1). Server action recomputes `recompute_match` then loops `recompute_bonuses` across every pool. "Editar resultado / horário →" link wired into `/jogos/[matchId]` for admins. Desktop nav added (`components/desktop-nav.tsx` + shared `components/nav-items.ts`) — Phase 1 only shipped the mobile bottom nav. User manually verified happy-path score entry. Doc-auditor + P0/P1 follow-up applied. |
| **7** — Email reminders | 🟢 | `emails/bet-reminder.tsx` (React Email, PT-BR), `app/api/cron/send-reminders/route.ts` (hourly, Bearer-gated, dedup via `reminder_sent`), `vercel.json` cron declaration, `/perfil` opt-out toggle. 0011 adds the `users_missing_prediction()` RPC (service-role only). Auth gate + empty-window happy path verified locally (401/401/200 with empty results); inbox-delivery verification deferred to production. Multi-user E2E still deferred to Phase 9 (Resend domain). Middleware fix shipped to let `/api/*` bypass the session redirect. |
| **8** — Polish (code parts) | 🟡 | `/regras` public PT-BR rules page, global `Footer` (later updated to plug the Futebol Futebol Clube podcast), "Regras" link in `/perfil` Atalhos for mobile. Clickable pool cards on the dashboard (community fix during UAT, commit `7ce8882`). Shared-position helper so tied users share a ranking number (rule change requested by the pool owner, commit `c883278`). A11y polish: skip-link in root layout, `aria-current="page"` on nav. UAT (recruit testers + Lighthouse run + mobile smoke test) deferred — most is gated on Resend domain + Vercel deploy. |
| **9** — Launch | 🟡 | Resend domain `bolaofutebolfutebolclube.com` verified (Cloudflare auto-config). Vercel project `bolaofutebolfutebolclube` deployed, prod URL `https://bolaofutebolfutebolclube.vercel.app`. All 7 env vars set (prod-specific `CRON_SECRET` + `RESEND_FROM_EMAIL=bolao@bolaofutebolfutebolclube.com` + the real `APP_URL`). Cron schedule downgraded to daily 12:00 UTC because Hobby plan limit (commit `da67af7`); window widened from 12-24h to next-24h. Supabase Site URL / Redirect URLs / SMTP sender updated. First auth round-trip verified end-to-end on prod 2026-05-29. First UAT bug surfaced + closed in-session: 0012 added a `find_pool_by_invite_code()` SECURITY DEFINER RPC because the pool table's SELECT policy blocked non-members from looking up by invite code (commit `eded48e`). Pending: admin-score-entry prod smoke, cron prod smoke, branch protection, doc-auditor pre-launch sweep, broader friend invites. |

12 of 12 migrations have been applied to the live Supabase project (`fzsqraciucckavhlndjp` in `eu-central-1`). Production is live and multi-user friendly (first colleague test passed end-to-end after the 0012 fix).

### Outstanding manual / external work

Nothing blocks Phase 6 code. The carry-overs:

1. **Customize Supabase recovery email template** — Phase 1 password-reset code is live but the Supabase dashboard template still uses the default link shape, so clicking the recovery link won't land on our `/recuperar/redefinir`. Template body to paste lives under "Phase 1 password-reset addendum" below.
2. **Vercel project + production URL** — Phase 9 blocker, not earlier. Import the GitHub repo, paste env vars, deploy.
3. **Custom Resend domain** — Phase 9 blocker. Sandbox sender (`onboarding@resend.dev`) only delivers to `j.cesarchagas94@gmail.com`. See `[[project-resend-sandbox-limit]]` in memory.
4. **Branch protection on `main`** — defer until after Phase 6 (CI status check name needs to exist).

### First action when resuming

1. `git pull --ff-only` (the resume agent's machine might be behind if it was synced earlier).
2. `pnpm install` if `node_modules` looks stale.
3. `pnpm dev` to bring the local server up at `http://localhost:3000`.
4. Open MEMORY.md (loaded automatically) and skim this section for context.
5. Start **Phase 6** unless the user redirects. The first task is the admin form at `/admin/jogos/[matchId]` — read the Phase 6 section below for the checklist.

### Phase 6 dependencies — read before starting

- **`winner_team_id` column on `match`** — Phase 4 doc-audit flagged that finals decided on penalties produce no champion bonus because the CASE in `recompute_bonuses` can't pick a winner when `home_score = away_score`. Add a nullable `winner_team_id uuid references team(id)` column to `match` (new migration). For group matches, leave it NULL (the score is decisive). For knockout matches, the admin form requires it. Update `recompute_bonuses` to use `winner_team_id` instead of the score-comparison CASE.
- **`recompute_bonuses` call site** — Phase 4 left this unwired. Phase 6's admin score-entry action calls `recompute_match` *and* `recompute_bonuses` in the same server action, after the `UPDATE match … set home_score=…, status='finished'`.
- **Admin guard** — `/admin/jogos/[matchId]` should `notFound()` for users who aren't admin of any pool. Check via `exists (select 1 from pool where admin_id = auth.uid())` per `architecture.md` §6.

### Useful refresh commands for the next session

```powershell
# Refresh PATH (PowerShell tool sessions need this each invocation)
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')

# Sanity check the toolchain
node --version; pnpm --version; git --version; gh --version

# Pull latest
git pull --ff-only

# Sanity-check the existing build
pnpm typecheck; pnpm lint; pnpm test; pnpm build

# Local dev server
pnpm dev
```

### How to drive an end-to-end test of any phase without waiting for real WC matches

```sql
-- Fake-finish a match you have a bet_match row against
update public.match
set home_score = 2, away_score = 1, status = 'finished'
where external_id = 1;  -- MEX vs RSA, kicks off 2026-06-11

-- Push the score into the score table
select public.recompute_match((select id from public.match where external_id = 1));

-- After enough fixtures are finished to close a group, also:
select public.recompute_bonuses((select pool_id from public.pool_member where user_id = auth.uid() limit 1));
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

## Phase 2 — Data model and seed (code done 2026-05-26) — 🟡 awaiting DB apply + doc audit

**Goal:** schema, RLS, and scoring are in place and exercised. Extended to 4 days — the RLS predicates and the 104-fixture seed each consume ~1 day and need real testing.

- [x] Write `supabase/migrations/0001_init.sql` with all tables, enums, indexes, and the `pool_ranking` view from §4 of `architecture.md`
- [x] Write `supabase/migrations/0002_rls.sql` enabling RLS and adding the concrete predicates from §4.2 (`profile`, `pool`, `pool_member`, `bet_match`, `bet_group`, `bet_knockout`, `bet_champion`, `score`, plus the public-read policies for `team` and `match`); helper views `first_kickoff` and `first_r32_kickoff` live in `0001_init.sql` so RLS predicates can reference them.
- [x] Include the `enforce_pool_member_cap()` function and trigger in the init migration (rejects an 11th membership with PT-BR error)
- [x] Write `supabase/migrations/0003_scoring.sql` with `compute_match_points`, `recompute_match` (idempotent upsert into `score` with tiebreaker flags), `recompute_bonuses` stub, and the `bet_match_locked` trigger
- [x] **Source the official FIFA WC 2026 schedule** — chose Wikipedia (per-group articles + the dedicated knockout-stage article). Documented as a header comment in `0005_seed_matches.sql`.
- [x] Write `supabase/migrations/0004_seed_teams_groups.sql` with the 48 WC 2026 teams and their group letters (A-L)
- [x] Write `supabase/migrations/0005_seed_matches.sql` with all 104 fixtures; group-stage with assigned teams, knockout (73-104) with NULL teams until the admin populates them.
- [x] Implement `lib/scoring/match.ts` mirroring `compute_match_points` in TypeScript
- [x] Implement `lib/scoring/ranking.ts` with the tie-break logic per `requirements.md` §4.5
- [x] Write vitest tests — **16 tests** in `tests/scoring.spec.ts` covering all 4 match-scoring branches + ranking tie-breaks; `vitest.config.ts` added so `@/` alias resolves in tests.

**Closed 2026-05-26:**

- [x] Migrations 0001–0005 applied to Supabase. Verified `select group_code, count(*) from team` returns 4 per group (×12) and `select stage, count(*) from match` returns the expected 72/16/8/4/2/1/1.
- [x] `doc-auditor` subagent run. Findings triaged in the commit log; P0/P1 fixes applied in the same session (see "Phase 2 doc-audit follow-up" commit). Deferred DB-level verification (cap trigger, RLS predicates) — can be exercised in Phase 3 when real pool data exists.

### Phase 3 RLS-recursion fix (2026-05-26)

End-to-end testing surfaced a Postgres `42P17` "infinite recursion detected in policy for relation pool_member" error on **every** pool creation attempt. Root cause: `pm_self_select` (from `0002_rls.sql`) contained an `exists (select 1 from pool_member …)` subquery, and `INSERT … RETURNING` on pool reads the new row through pool's SELECT policy → which reads pool_member → which re-enters `pm_self_select`. Recursion.

- [x] Add `supabase/migrations/0006_fix_rls_recursion.sql` introducing a `SECURITY DEFINER` `is_pool_member(pool_id, user_id)` helper (owned by `postgres`, `BYPASSRLS`) and rewriting both `pm_self_select` and `pool.pool_member_select` to use it. Broadened pool's SELECT to also let the admin see their own pool (so `RETURNING` works on the initial insert).
- [x] Updated `architecture.md` §4.2 to document the helper and the new policy shape.
- [ ] **Apply `supabase/migrations/0006_fix_rls_recursion.sql` in the Supabase SQL Editor.** Idempotent — uses `DROP POLICY IF EXISTS` and `CREATE OR REPLACE FUNCTION`.

### Phase 1 password-reset addendum (2026-05-26)

The original plan deferred password reset (`requirements.md` §6) on the assumption that the admin would reset via the Supabase dashboard. End-to-end testing surfaced that even the admin can't reliably do this without a `/recuperar/redefinir` page in the app, since Supabase's recovery email links land somewhere our app needs to handle. Brought back into MVP scope.

- [ ] Build `/recuperar` (email input + server action calling `resetPasswordForEmail` with `redirectTo` pointing at `/auth/confirm?next=/recuperar/redefinir`). Always show the same success state regardless of whether the email exists (anti-enumeration).
- [ ] Build `/recuperar/redefinir` — Server Component that checks for an authenticated session (recovery token already verified by `/auth/confirm`), renders a new-password form, action calls `supabase.auth.updateUser({ password })`.
- [ ] Add an **"Esqueci minha senha"** link to `/entrar` pointing at `/recuperar`.
- [ ] **Customize the Supabase recovery email template** (Authentication → Email Templates → "Reset Password") to use the PKCE `{{ .TokenHash }}` flow, pointing at `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/recuperar/redefinir`.

### Phase 2 doc-audit follow-up (2026-05-26)

Tightening pass after the `doc-auditor` report. **All idempotent — user must re-apply `0002_rls.sql` and `0003_scoring.sql` in the Supabase SQL Editor for the changes to take effect.**

- [ ] **Re-apply `0002_rls.sql`** — adds a `pool_id` membership guard to every `bet_*` WITH CHECK predicate (defense in depth — the server action's `assertMember` is no longer the only barrier).
- [ ] **Re-apply `0003_scoring.sql`** — extends the `bet_match_locked` trigger to also fire on `DELETE`, closing the path where a member could delete their own bet after kickoff and silently downgrade to a missing-prediction zero (§4.4).
- [x] `architecture.md` §4 corrected: `bet_match` unique key is `(user_id, pool_id, match_id)` per the multi-pool requirement.
- [x] `architecture.md` §3 file layout updated to match the actual auth route names and the 5 migration filenames; `/recuperar` removed (out of scope per `requirements.md` §6).
- [x] `lib/pool.ts` stub comments updated — tables exist; queries land in Phase 3.

### Note on the §4.1 example

The rule table in `requirements.md` §4.1 says "Correct winner + correct goal difference → 7 pts" and "Correct winner only → 5 pts". The illustrative example with "Brasil 1-0 Argentina → 5 pts" against actual 2-1 is **mathematically inconsistent** with that rule, because 1-0 and 2-1 have the same goal difference (+1) — the rule would award 7 pts. The implementation follows the **rule table** (the canonical statement), not the example. This means any predicted draw against any actual draw (e.g. 1-1 prediction vs 4-4 actual) scores 7 pts.

**Verify:**
- `pnpm test` passes with ≥10 scoring tests.
- Updating a match score via SQL and then calling `recompute_match(...)` produces the expected `score` rows including tiebreaker flags — same result whether called once or twice.
- A non-admin user attempting to read another user's `bet_match` for a future match is rejected; the same query for a past match succeeds.
- A user trying to insert an 11th `pool_member` row is rejected by the `enforce_pool_member_cap` trigger with the PT-BR error.
- A user is able to insert a 2nd, 3rd, …, 10th `pool_member` row successfully (multi-pool is allowed up to the cap).
- **Run `doc-auditor` subagent.** Address any P0/P1 items in its report before moving to Phase 3.

---

## Phase 3 — Pool create/join + match bets (code done 2026-05-26) — 🟡 awaiting E2E test

**Goal:** participants can create or join pools, switch between them, and submit/edit predictions for any scheduled match in the active pool.

- [x] `/boloes/criar` — form + server action that generates a unique invite code (retries on collision), inserts pool + creator's pool_member row, sets `active_pool_id`, redirects to `/jogos`.
- [x] `/boloes/entrar` — invite-code input + server action with Zod validation (`COPA-XXXX` format), friendly errors for "code not found", "already a member", "10-pool cap reached".
- [x] `lib/pool.ts` — `readActivePoolId`, `setActivePoolCookie`, `listMyPools` (with member counts), `assertMember`, `generateInviteCode` (4-char alphanumeric).
- [x] `components/local-time.tsx` — Client Component using `Intl.DateTimeFormat`. Initial paint is null (matches SSR); client effect fills in localised text. `suppressHydrationWarning` set explicitly.
- [x] `/jogos` — all 104 matches grouped by São Paulo calendar date, kickoff via `<LocalTime />`, team names, status pill (Palpitar → / Palpite: X-Y / Aguardando placar / Resultado).
- [x] `/jogos/[matchId]` — Server Component with two number inputs (0-20), Zod validation in the server action, reads active pool from cookie, calls `assertMember`, upserts into `bet_match` on `(user_id, pool_id, match_id)`.
- [x] "Bloqueado" state — when `now() >= kickoff_at`, the prediction form is replaced with a read-only display of the saved prediction (or a "you didn't predict" message). Final match score shown when `status='finished'`.
- [x] `/palpites` — user's predictions grouped by stage with edit links, scoped to the active pool. Empty state with a Jogos link.
- [x] `PoolSwitcher` upgraded to a base-ui dropdown with switch action; middleware sets `active_pool_id` default to the user's most-recently-joined pool when the cookie is missing.

**Pending (need user):**

- [ ] **End-to-end test:** sign up a second test user, create a pool as user A, copy the invite code, log in as user B, join the pool, submit predictions in both pools, switch between them via the header dropdown, verify bets in each pool are independent.
- [ ] (Optional) Add a seed SQL block for QA fixtures with past `kickoff_at` to exercise the locked state without waiting for real WC kickoff. Defer to Phase 8 polish if not needed now.

**Verify:**
- A test user creates a pool, becomes its admin, sees themself in the switcher.
- A 2nd test user joins via invite code and sees the same pool. Both can switch between this pool and a 2nd pool they share.
- A user in a 2nd pool sees only their bets for the pool selected in the switcher; switching pools changes the displayed bets without page reload errors.
- A test user predicts a future match in pool A, switches to pool B, predicts the same match differently, switches back — pool A still shows the pool A prediction.
- A user past kickoff cannot edit; the form shows read-only.
- Open the site from a Lisbon-set browser TZ and from a São Paulo TZ — both see kickoff times in their local zone.
- Lighthouse mobile Performance on `/jogos` ≥ 85.

---

## Phase 4 — Group-stage, bracket, and champion bets (done 2026-05-26) — 🟢 verified by doc-auditor

**Goal:** all non-match bet types are functional before WC kickoff. Compressed to 1 day — groups/champion are simple forms; bracket is a skeleton (real bracket UI can ship between end of group stage and R32 if needed).

- [x] `/palpites/grupos` — server-side page reads 48 teams + existing `bet_group` rows + `first_kickoff` deadline; client form renders a fieldset per group with two `<select>`s. Save action validates 12×2 picks (different teams per group), upserts all 12 in one round-trip. Read-only once the deadline passes.
- [x] Validation: same-team-twice rejected by Zod-equivalent server check + DB CHECK on `bet_group`.
- [x] `/palpites/campeao` — single team picker grouped by group A-L via `<optgroup>`. Saves to `bet_champion`.
- [x] `/palpites/mata-mata` — placeholder card with the R32 kickoff date and the +3/+5/+8/+12 bonus values. Real bracket UI deferred to a follow-up before 2026-06-28.
- [x] `/palpites` hub — links to grupos / campeao / mata-mata with status counters (e.g. "8 / 12") and the existing match-bet list below.
- [x] `recompute_bonuses(p_pool_id uuid)` — implemented in `supabase/migrations/0007_bonus.sql` for the cases that can be computed today:
  - Group 1st place (+5) and 2nd place (+3) — once a group's six matches are all finished. Uses the new `compute_group_standings()` helper.
  - Champion (+20) — once the final has `status='finished'`.
  - Knockout-round bonuses (+3/+5/+8/+12) deferred — they need knockout match home/away teams populated by the admin, which happens after group stage finishes.
- [x] Bonus storage — new `bonus` table with `(user_id, pool_id, kind, points)`. `pool_ranking` view UNIONs `score` + `bonus` so the leaderboard sums both.

**Pending (need user / DB):**

- [x] **Apply `supabase/migrations/0007_bonus.sql` in the Supabase SQL Editor.** Done 2026-05-26 (after a one-character rename: `position` → `place`, since `position` is a PG reserved word in `RETURNS TABLE`).
- [ ] Wire `recompute_bonuses` to be called by the admin score-entry action (Phase 6) after each match update — currently only `recompute_match` is called. Add the call when Phase 6 lands.
- [x] **Run `doc-auditor` subagent** at end of Phase 4. Found one P0 (bonus rows leak on score corrections) and four P1/P2 doc-drift items. All addressed in the "Phase 4 doc-audit follow-up" commit.

### Phase 4 doc-audit follow-up (2026-05-26)

- [x] **P0:** `recompute_bonuses` now DELETEs every `group_*` and `champion` bonus row for the pool before re-INSERTing. Without this, an admin correcting a wrong score would leave the previous +5/+3/+20 awards in place, double-counting points. Lives in `supabase/migrations/0008_recompute_bonuses_idempotent.sql`.
- [x] **P1:** `architecture.md` §4 schema block now documents the `bonus` table; §4.1 documents the delete-then-insert idempotency contract and `compute_group_standings()`; §4.2 view block shows the UNION shape; §5 cron strategy note clarifies that `recompute_bonuses` is called by the admin server action, not a cron.
- [x] **P2:** `0003_scoring.sql` `recompute_bonuses` stub now has a comment pointing readers at 0007 + 0008; `/palpites/mata-mata` copy fixed ("32 times em 16 jogos").
- [x] **P1:** finals decided on penalties currently produce no champion bonus because the CASE in `recompute_bonuses` can't pick a winner when `home_score = away_score`. Closed by `0010_winner_team_id.sql` in Phase 6 (2026-05-28) — added `match.winner_team_id` + `match_winner_is_a_team` CHECK, and rewrote the champion clause to `coalesce(m.winner_team_id, <case on score>)`. The admin form requires `winner_team_id` for any knockout match that ends level in regulation.
- [x] **Apply `supabase/migrations/0008_recompute_bonuses_idempotent.sql` in the Supabase SQL Editor.** Done 2026-05-26.

**Verify:**
- A participant completes group bets + champion in under 5 minutes.
- Submitting an invalid group bet (same team twice) is rejected with a clear PT-BR error.
- Calling `recompute_bonuses(...)` after seeding a fake group result produces the expected bonus points.
- **Run `doc-auditor` subagent.** Address any P0/P1 items in its report before moving to Phase 5.

---

## Phase 5 — Ranking and personal views (code done 2026-05-26) — 🟡 awaiting realtime apply + E2E test

**Goal:** results visibility is live.

- [x] `/ranking` — Server Component reads `pool_ranking` for the active pool, runs through `sortRanking()` (requirements §4.5 tie-breaks: points → exact_count → correct_winner_count → name asc), renders a numbered list highlighting the caller's row. A client-side `<RankingLive />` subscribes to `postgres_changes` on `score` and `bonus` filtered by `pool_id` and calls `router.refresh()` on every event — the page re-renders within ~1s of an admin score write.
- [x] `/perfil` — shows the user's display name + email, then a card per pool with position (`Nº de M`), total points, exact-score count, correct-winner count, plus a crown icon when the user is admin. The active pool is highlighted. One pool_ranking SELECT per pool — capped at 10 by the membership cap, fine for the MVP.
- [x] `/jogos/[matchId]` post-kickoff — after the kickoff timestamp passes, the page also fetches every member's bet_match row for the same pool + the corresponding score rows, and renders a "Palpites do bolão" card showing each prediction, the point value earned, and a "Cravou! / Acertou o vencedor / Errou" label. RLS (`bm_peer_after_kickoff`) makes this safe — peer bets are only visible after kickoff.
- [x] `0009_realtime.sql` — opts the `score` and `bonus` tables into the `supabase_realtime` publication so the ranking page actually receives events. Idempotent (`DO`-block check against `pg_publication_tables`).

**Pending (need user):**

- [ ] **Apply `supabase/migrations/0009_realtime.sql` in the Supabase SQL Editor.** Without this, the ranking page works on every reload but doesn't update live.
- [ ] **E2E test:** create at least two `bet_match` rows in the same pool (via the UI), then in the SQL Editor `update match set home_score = 2, away_score = 1, status = 'finished' where external_id = 1; select recompute_match((select id from match where external_id = 1));` — open `/ranking` and watch the points appear without a manual refresh.
- [ ] **Tie-break verification:** seed a scenario with two users tied on points but different `exact_count` — verify the higher-exact user ranks first.

**Verify:**
- Admin updates a test match score via SQL + `recompute_match(...)`; ranking page reorders within 60 seconds without a manual refresh.
- The tiebreaker ordering works: build a fake scenario with two users tied on points but different `exact_count` and verify the higher exact-count user ranks first.

---

## Phase 6 — Admin score entry (done 2026-05-28, 7 days early) — 🟢 verified

**Goal:** the admin can enter / edit a match score and have every pool's points recompute.

Scope shrank significantly on 2026-05-23 when we dropped the external sports API (see `architecture.md` §2.6 / §5). What used to be "API wrapper + cron + admin override" is now just the admin form. Estimated at 1 day; landed in 1 session.

- [x] Implement `/admin/jogos/[matchId]` editor with a score-entry form (home/away number inputs, Zod validation, no list page — reached by direct URL or from `/jogos` when authenticated as a pool admin)
- [x] Page guard: moved up to `app/admin/layout.tsx` and runs `exists (select 1 from pool where admin_id = auth.uid())` — any pool admin may edit any match score (architecture §2.4 / §6). Server action re-checks via `assertAnyPoolAdmin()`.
- [x] Server action: validates input, writes `home_score` / `away_score` / `winner_team_id` / `status='finished'` on the `match` row via the new service-role client, then calls `recompute_match(match_id)` and loops `recompute_bonuses(pool_id)` across every pool — rescore + bonuses propagate to **every pool's** bets on that match
- [x] Add an "edit kickoff" affordance — separate `saveKickoff` action on the same page; the admin can adjust `kickoff_at` for a postponed fixture without touching scores
- [x] "Aguardando placar" badge — already shipped in Phase 3 on `/jogos` for past-kickoff matches with `status != 'finished'`
- [x] `0010_winner_team_id.sql` — adds `match.winner_team_id` + `match_winner_is_a_team` CHECK, rewrites `recompute_bonuses` so the champion clause uses `coalesce(winner_team_id, <case on score>)`. Closes the Phase 4 P1 about finals on penalties.
- [x] Desktop nav (`components/desktop-nav.tsx` + shared `components/nav-items.ts`) — Phase 1 only shipped the mobile bottom bar, leaving desktop users without a Ranking link. Found and fixed on 2026-05-28.

**Pending (need user / future):**

- [x] **Apply `supabase/migrations/0010_winner_team_id.sql` in the Supabase SQL Editor.** Done 2026-05-28 — verified by the admin form successfully writing `winner_team_id` during the happy-path test.
- [x] **Run `doc-auditor` subagent.** Done 2026-05-28. P0/P1 items addressed in the "Phase 6 doc-audit follow-up" sub-section below.
- [ ] **Correction-case E2E test:** re-submit a different score for the same match; confirm `/ranking` updates again with no leftover bonus rows.
- [ ] **Non-admin guard E2E test:** sign out (or log in as a non-admin) and hit `/admin/jogos/<id>` directly → expect 404.

### Phase 6 doc-audit follow-up (2026-05-28)

Tightening pass after the `doc-auditor` report. **All docs-only — no code or migrations changed.**

- [x] **P0:** `architecture.md` §4 schema block updated to include `winner_team_id` + `match_winner_is_a_team` CHECK. §4.1 prose now documents the winner_team_id-first / score-fallback contract in `recompute_bonuses`, plus the regulation-time-only invariant for `recompute_match`.
- [x] **P0:** `architecture.md` §5 "Flow" rewritten to list all writes (score + status + winner_team_id), both recomputations (recompute_match + loop of recompute_bonuses across all pools), and the service-role boundary (`lib/supabase/service.ts`) since `match` has no INSERT/UPDATE policy.
- [x] **P1:** `architecture.md` §3 repo layout now lists the new admin files (`actions.ts`, `score-form.tsx`, `kickoff-form.tsx`), `lib/supabase/service.ts`, `components/nav-items.ts`, `components/desktop-nav.tsx`, and migrations 0006-0010. §6 admin guard description moved to the layout level, and a note added that `/admin` has no index page on purpose.
- [x] **P1:** `requirements.md` §3.4b added (admin score-entry sub-flow including the pênaltis winner prompt). §4.1 clarified that per-match scoring uses regulation-time results only.
- [x] **P2:** This session-log update.

**Verify:**
- Admin enters a score in the panel and the ranking updates within 60 seconds. — **Done 2026-05-28, observed live by user.**
- Re-entering a different score for the same match (correction case) updates ranking again without errors (idempotent `recompute_match`). — _pending E2E_
- A non-admin user hitting `/admin/jogos/[matchId]` gets `notFound()`. — _pending E2E_
- A past-kickoff unscored match shows "Aguardando placar" on the participant `/jogos` view. — already verified in Phase 3.
- **Run `doc-auditor` subagent.** Address any P0/P1 items in its report before moving to Phase 7. — **Done 2026-05-28.**

---

## Phase 7 — Email reminders (code done 2026-05-28, 9 days early) — 🟡 awaiting DB apply + E2E

**Goal:** users get a heads-up before they miss a bet.

- [x] Create React Email template `emails/bet-reminder.tsx` (PT-BR, São Paulo time + "(horário de Brasília)" + relative hours, "Palpitar agora" CTA).
- [x] Implement `app/api/cron/send-reminders/route.ts` — daily at 12:00 UTC (= 09:00 BRT), Bearer-gated by `CRON_SECRET`. Pulls every match in the `now .. now+24h` window, calls the new `users_missing_prediction(match_id)` SQL function per match, renders the email via `@react-email/components`, sends via Resend, inserts a `reminder_sent` row to dedupe across runs. Race-safe: a duplicate-key error from a concurrent run is treated as a benign "already sent". Schedule was originally hourly with a 12-24h window, downgraded to daily during the Phase 9 Vercel deploy because Hobby plan caps cron frequency at once per day.
- [x] `supabase/migrations/0011_users_missing_prediction.sql` — `SECURITY DEFINER` function returning `(user_id, email, name)` for users who are pool members, have no `bet_match` for the match in any of their pools, are not `email_opt_out`, and haven't been reminded yet. Function is service-role only (no grant to `authenticated`/`anon`) so it can't leak email addresses.
- [x] `vercel.json` declares `/api/cron/send-reminders` on the `0 12 * * *` schedule (daily at 12:00 UTC = 09:00 BRT).
- [x] Expose the `profile.email_opt_out` toggle on `/perfil` — `OptOutToggle` (Client) auto-submits on change via `requestSubmit()`, server action upserts on `profile`.

**Pending (need user / external):**

- [ ] **Apply `supabase/migrations/0011_users_missing_prediction.sql` in the Supabase SQL Editor.** Idempotent — uses `CREATE OR REPLACE`.
- [ ] **Set `CRON_SECRET` in `.env.local`** (generate with e.g. `openssl rand -base64 32`). The cron route returns 401 without it.
- [ ] **Local E2E smoke test** — fake-shift a match into the next 24h via SQL, hit `http://localhost:3001/api/cron/send-reminders` with `Authorization: Bearer <secret>` (curl / Thunder Client / browser DevTools), confirm the reminder lands in the account-owner inbox (sandbox sender limit applies until the Resend domain is verified — see Phase 9 carry-over).
- [ ] **Multi-user E2E** is deferred to Phase 9 (waiting on a verified Resend domain).
- [ ] **Set `CRON_SECRET` and `APP_URL` in Vercel project env vars** when the project is created (Phase 9).

**Verify:**
- Fake-shift a match into the window, hit the route, confirm a single reminder email arrives and a `reminder_sent` row gets created.
- Run the route a second time — no duplicate email, no new `reminder_sent` row, response shows `sent: 0`.
- Predict the match → run the route → no email (the user no longer satisfies `users_missing_prediction`).
- Toggle the opt-out checkbox on `/perfil` → run the route → no email.
- Hit the route without the Bearer header → 401.

---

## Phase 8 — Polish and UAT (code parts done 2026-05-28, 11 days early) — 🟡 awaiting UAT

**Goal:** the app is ready for real friends.

- [x] Write a short "Regras do bolão" page accessible from the footer summarizing scoring and deadlines — `/regras` (public route, in the middleware allow-list), covers per-match scoring, bonuses, deadlines, missing-prediction policy, tiebreakers, invite-code rules, and admin score entry. Linked from a new global footer (`components/footer.tsx`, in root layout) and from `/perfil` Atalhos (the footer is hidden behind the fixed mobile bottom-nav on small screens, so mobile users find it in Perfil).
- [x] Accessibility pass — partial. Added a skip-link ("Pular para o conteúdo") in the root layout (visible only on focus, target `#conteudo`), and `aria-current="page"` on the active nav item in both `MobileNav` and `DesktopNav`. The auth + prediction forms were already in good shape (labeled inputs, `autoComplete`, `required`, `role="alert"` on errors, descriptive button text with pending state). Real contrast/keyboard testing happens during UAT.
- [ ] **Recruit 3-5 beta testers among the closest friends.** — user task.
- [ ] **Create a real pool, share the invite code, observe sign-up and prediction submission.** — user task; effectively blocked on a verified Resend domain (sandbox sender only emails the account owner). Possible workaround: invite a couple of friends in person and use a Gmail trick or share-screen so they can confirm with a real address.
- [ ] **Triage and fix bugs in priority order (auth and prediction first, everything else second).** — emerges from UAT.
- [ ] **Verify Lighthouse mobile Performance ≥ 85 on `/`, `/jogos`, `/ranking`.** — requires a production-mode build; easiest after the Vercel deploy in Phase 9. Locally: `pnpm build && pnpm start`, then Lighthouse against `http://localhost:3000` with the mobile profile.
- [ ] **Smoke test on iPhone Safari and Android Chrome at 360px width.** — user task with real devices.

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

## Phase 9 — Launch (started 2026-05-29, 12 days early) — 🟡 partially deployed

**Goal:** all 5-30 friends are onboarded before the first match.

See [LAUNCH.md](./LAUNCH.md) for the canonical step-by-step launch sequence; this section tracks the high-level state.

### Done 2026-05-29

- [x] **Resend domain verified** — `bolaofutebolfutebolclube.com`. DKIM/SPF/DMARC records added via Cloudflare's auto-configure integration. Domain marked "ready to send emails" in Resend.
- [x] **Vercel project created** — `bolaofutebolfutebolclube`. Production URL: `https://bolaofutebolfutebolclube.vercel.app`. All 7 env vars set including the new prod `CRON_SECRET` and `RESEND_FROM_EMAIL=bolao@bolaofutebolfutebolclube.com`. `APP_URL` updated post-first-deploy to the actual production URL.
- [x] **Vercel Hobby cron constraint** — Hobby plan caps cron at 1 run/day, so `vercel.json` schedule was downgraded from `0 * * * *` to `0 12 * * *` (daily 12:00 UTC = 09:00 BRT) and the cron route's window widened from `[now+12h, now+24h]` to `[now, now+24h]`. Copy on `/regras` and `/perfil` updated to "no dia anterior". See commit `da67af7`.
- [x] **Supabase Auth config updated** — Site URL, Redirect URLs, and SMTP sender all switched from `localhost` / sandbox to the prod URL and `bolao@bolaofutebolfutebolclube.com`.
- [x] **First auth round-trip smoke test passed** — fresh signup at the prod URL, confirmation email arrived from the verified domain in inbox (not spam), confirmation link landed authenticated on `/`.
- [x] **First UAT bug found and fixed** — colleague hit "Código não encontrado" on a valid invite code because the pool table's SELECT policy blocks non-members. Added `0012_find_pool_by_invite_code.sql` (SECURITY DEFINER RPC returning only the pool id, granted to `authenticated`) and collapsed the 30-line workaround in the join action to a single `supabase.rpc()` call. Verified fixed by the colleague after Vercel auto-redeploy. Commit `eded48e`.

### Pending (next session)

- [ ] **Complete the colleague's test pass** — pool join now works; they still need to predict 3 matches, see ranking, see perfil. The remaining smoke-test items from the test spec we sent them.
- [ ] **Admin score entry on prod** — fake-finish a match via SQL Editor + watch `/ranking` reorder (LAUNCH.md §4d).
- [ ] **Cron route prod smoke** — fake-shift a match into the next 24h + manually `curl` the cron route from a terminal + confirm an email lands + verify `reminder_sent` row created + second run returns `sent: 0` (LAUNCH.md §4e).
- [ ] **Reset the fake-shifted matches** before broader invites (LAUNCH.md §4f).
- [ ] **Branch protection on `main`** — require PR + status checks. CI has been stable for a while; safe to enable (LAUNCH.md §5).
- [ ] **Custom domain on Vercel** (optional) — point `bolaofutebolfutebolclube.com` (or a subdomain) at the Vercel project so the user-visible URL drops the `.vercel.app` suffix. If done, also update `APP_URL` env var and Supabase Site URL to match (LAUNCH.md §3).
- [ ] **Doc-auditor pre-launch sweep** — final read-only audit of the founding docs against the live code (LAUNCH.md §6).
- [ ] **Broader friend invites** — once the above is done, share the invite code with the rest of the friend group via WhatsApp using the message template prepared 2026-05-29 (PT-BR convite + roteiro de teste).
- [ ] **Set a personal reminder** to monitor the cron and ranking during the first WC match (2026-06-11) — the admin SLA is "enter score within 12h of full time".

### Carry-over from earlier phases that's still open

- [ ] **Apply migration 0012 in Supabase SQL Editor** — already applied 2026-05-29 by the user, verified working in prod. Listed here only for the audit trail.

**Verify (gate to declaring the WC pool "live"):**
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
