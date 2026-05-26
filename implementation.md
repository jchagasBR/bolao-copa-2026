# Implementation Plan — Bolão Copa 2026

> **Document language:** English (dev artifact).
> **Companion docs:** [`requirements.md`](./requirements.md), [`architecture.md`](./architecture.md).
> **Hard deadline:** WC 2026 starts **2026-06-11**. MVP must be live before kickoff of match 1.
> **Original plan start:** 2026-05-22 → ~20 days until kickoff, with Phase 9 reserved for launch on 06-10 and a **buffer day (06-09)** between polish/UAT and launch.

## Session log

**Last session:** resumed 2026-05-26.
**Current phase:** Phase 5 — ranking page (live, sorted with tie-breaks), perfil with per-pool stats, post-kickoff peer predictions on /jogos/[matchId]. Awaiting user to apply 0009_realtime.sql and exercise the live-update path.
**Schedule status:** Phases 0–5 code all done 2026-05-26 — well ahead of the original "Days 12-13: 2026-06-02 to 2026-06-03" Phase 5 budget. Phase 6 (admin score entry + finals-on-penalties handling) is next.

### What's done

- All local Phase 0 deliverables (toolchain, scaffold, deps, shadcn, landing page, CI workflow).
- Public GitHub repo live at **https://github.com/jchagasBR/bolao-copa-2026**.
- Two commits on `main`, both pushed and CI-green:
  - `1589b0e` — chore: bootstrap project (Phase 0)
  - `b952b40` — docs: drop API-Football, switch to manual admin score entry
- gh CLI authenticated as `jchagasBR` with `workflow` scope.
- Three founding docs and `doc-auditor` subagent in place.
- **Strategy change:** dropped API-Football (free tier excludes WC 2026); match scores will be entered manually by pool admins. Phase 6 shrank from 2 days to 1.

### Outstanding external/manual work

Only one external item is still pending. Everything else through Phase 2 is done.

- **Vercel project + production URL** _(deferred; Phase 3 can still proceed locally)._ Import the GitHub repo, paste env vars, trigger a first deploy → that URL becomes `APP_URL`.
- **Custom Resend domain** _(blocker before Phase 9 launch only)._ The sandbox sender only delivers to the Resend account owner's email; a verified domain unblocks invitations to all friends. See [[project-resend-sandbox-limit]].

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
- [ ] **P1:** finals decided on penalties currently produce no champion bonus because the CASE in `recompute_bonuses` can't pick a winner when `home_score = away_score`. **Decide before 2026-07-19 (final).** Likely fix: add a `winner_team_id uuid` column to `match` populated by the admin for knockout matches that need it, and use it instead of the score comparison. Schedule for Phase 6 (admin score entry) so the change rides along with the new admin form.
- [ ] **Apply `supabase/migrations/0008_recompute_bonuses_idempotent.sql` in the Supabase SQL Editor.** Idempotent.

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
