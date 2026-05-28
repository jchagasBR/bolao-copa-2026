# Requirements — Bolão Copa 2026

> **Document language:** English (dev artifact).
> **App UI language:** Portuguese (PT-BR).

## 1. Overview

`Bolão Copa 2026` is a private web app where small groups of friends (5-30 people per group) predict the results of FIFA World Cup 2026 matches and compete in a points-based ranking. **Each "bolão" is a self-contained pool** — a user typically belongs to a few different pools (e.g., one with college friends, one with work colleagues). No money is involved — the only currency is bragging rights.

**Philosophy:**
- Private and invite-only — not a public product.
- **Multi-pool from day one** — a user can join up to **10** pools and can be admin of any pool they create.
- **Works across time zones** — many users will be in Brazil; some in Europe.
- Mobile-first — most usage will be on phones, often right before kickoff.
- Low operational burden for the admin.
- Fun before formality — minimum required to pick winners and trash-talk.

## 2. Personas and roles

### Admin (pool creator)
- **Any authenticated user can create a pool** — they automatically become its admin.
- A user may admin multiple pools they created.
- An admin can:
  - Edit the pool's name.
  - Regenerate the invite code.
  - **Enter and edit match scores** — admin entry is the canonical source of match results (there is no external sports data API in the MVP; see `architecture.md` §5).
  - Inspect pool state (counts, missing predictions).
- **One admin per pool** in the MVP — the user who created it. No co-admin or transfer.

### Participant (player)
- Signs up with email + password.
- Joins one or more pools using invite codes (max **10 active memberships** per user).
- Switches between pools using a selector in the header.
- Submits and edits predictions per pool — bets in one pool are independent from bets in another.
- Sees per-pool ranking, personal history, and other players' bets in the same pool after each match starts.

## 3. Main user flows

All flows assume the user is using the web app in PT-BR.

### 3.1 Sign up / log in
1. User opens the public landing page and clicks **"Criar conta"**.
2. Provides full name, email, and password (min 8 chars).
3. Receives a confirmation email and clicks the link.
4. Logs in. If they have an invite code, they can paste it on the next screen; otherwise they land on an empty dashboard with a prompt to enter a code.

### 3.1b Password recovery
1. From `/entrar`, user clicks **"Esqueci minha senha"**.
2. Lands on `/recuperar`, enters their email, submits.
3. Receives a "Redefinir senha" email with a magic link (delivered through the same Resend SMTP wired in §3.1).
4. Clicks the link → lands on `/recuperar/redefinir` with an authenticated short-lived session.
5. Sets a new password (min 8 chars) → redirected to `/` (dashboard) as a logged-in user.

To avoid leaking which emails are registered, the request form always returns a success message ("Se o email estiver cadastrado, você receberá um link") regardless of whether the email exists.

### 3.2 Create a pool (admin path)
1. Any authenticated user clicks **"Criar bolão"** from the dashboard.
2. Provides a pool name (e.g., "Bolão da firma 2026", "Galera da facul").
3. App generates a unique invite code (`COPA-XXXX`) and creates the pool with the user as its admin.
4. User lands on the new pool's home and can share the invite code via WhatsApp.

### 3.3 Join a pool (participant path)
1. Admin shares an invite code (e.g., `COPA-3FK9`) out-of-band (WhatsApp).
2. Logged-in participant pastes the code on **"Entrar em bolão"** and confirms.
3. App validates: code exists AND user is not already a member of that pool AND user has fewer than 10 active memberships.
4. Membership is created; the joined pool becomes the user's **active pool** and they land on its home (matches list).

### 3.4 Switch active pool
1. The header shows the active pool name with a dropdown chevron.
2. Tapping it lists all of the user's memberships plus a **"+ Criar/Entrar em bolão"** entry.
3. Selecting another pool stores the new active pool ID in a cookie (`active_pool_id`) and navigates to that pool's matches page.
4. All app pages (jogos, palpites, ranking, admin) read the active pool from the cookie; if missing, the middleware sets it to the user's first membership.

### 3.4b Score entry (admin path)
1. After a match's full time, any user who admins at least one pool can click **"Editar resultado / horário →"** on the match's detail page (or hit `/admin/jogos/[matchId]` directly).
2. The form has two number inputs for `home` and `away` regulation-time goals (0-20 each).
3. For **knockout matches that end level in regulation**, a "vencedor" selector appears with three options: "decidido pelo placar", "[home] avançou", "[away] avançou". When the score is level, picking a winner is **required** (penalties or coin toss). The selector is also visible for non-level knockouts but can stay on "decidido pelo placar" — the score is decisive.
4. Submitting writes the score, sets the match status to `finished`, and triggers a per-match recompute plus a fan-out across every pool's group/champion bonuses (idempotent, so corrections work the same way).
5. A separate "Reagendar jogo" form on the same page lets the admin change `kickoff_at` for a postponed fixture without touching the score.

The trust model is that all pool admins are trusted friends; any pool admin can edit any match's score (match data is global).

### 3.5 Match prediction (most-used flow)
1. Participant opens **"Jogos"** — list grouped by date, scoped to the active pool.
2. Taps a match before kickoff.
3. Enters predicted score (two number inputs, 0-20 each).
4. Saves. Edits are allowed any number of times up to the match's kickoff time.
5. After kickoff, the form is locked and the prediction is shown as read-only.

### 3.6 Group-stage standings prediction
1. Available from sign-up until the start of the first WC match.
2. Participant opens **"Palpites — Fase de grupos"**.
3. For each of the 12 groups, picks 1st place and 2nd place from the four teams in the group.
4. All 12 groups must be filled to save the bet (partial drafts are allowed locally but the final submission must be complete).

### 3.7 Knockout bracket prediction
1. Available after **all 72 group-stage matches conclude** (12 groups × 6 matches each) and the **32 qualifiers** are determined (top 2 of each group + 8 best third-placed teams in WC 2026).
2. Participant fills the bracket across the knockout phases:
   - R32 → picks the 16 winners (16 slots)
   - R16 → picks the 8 winners (8 slots)
   - QF → picks the 4 winners (4 slots)
   - SF → picks the 2 winners — the two finalists (2 slots)
   - Final → picks the 1 winner (1 slot, the champion)
3. **Deadline: kickoff of the first R32 match.**
4. The **third-place playoff is out of scope** — no bet table, no scoring. See §6.

### 3.8 Champion prediction
1. Available from sign-up until the start of the first WC match.
2. Participant picks one team as the champion.
3. Can be changed any number of times until the deadline.

### 3.9 Ranking and history
1. **Ranking page:** ordered list of the **active pool's** members with total points, updates live during matches.
2. **Profile page:** participant's own bets across **all pools they belong to**, with a per-pool filter; points per match and totals shown for the filtered pool.
3. **Match detail (after kickoff):** the actual score (live or final) plus every participant's prediction and points earned, **scoped to the active pool**.

## 4. Business rules

### 4.1 Per-match scoring (classic Brazilian "bolão")

| Outcome | Points |
|---|---|
| Exact score (both teams' goals correct) | **10** |
| Correct winner **and** correct goal difference | **7** |
| Correct winner / draw only | **5** |
| Wrong result | **0** |

Example with actual result `Brasil 2-1 Argentina`:
- Prediction `Brasil 2-1 Argentina` → 10 pts (exact score)
- Prediction `Brasil 3-2 Argentina` → 7 pts (correct winner + diff of 1)
- Prediction `Brasil 1-0 Argentina` → 5 pts (correct winner only)
- Prediction `Argentina 1-0 Brasil` → 0 pts

**Per-match scoring uses regulation-time results only.** A knockout match that ended `1-1` in regulation and was decided `4-2` on penalties is scored against `1-1` — a participant who predicted `Brasil 2-1 Argentina` scores 0, not 5, even if Brasil advanced. Extra-time and penalty results only matter for the **champion bonus** in §4.2 (so that a final decided on pens still awards +20 to the participant who picked the right champion).

### 4.2 Bonus scoring (group / knockout / champion)

These bonuses are awarded after the relevant phase ends.

| Bet | Bonus per correct pick |
|---|---|
| 1st place in a group | +5 pts |
| 2nd place in a group | +3 pts |
| Team qualified to R16 | +3 pts |
| Team qualified to QF | +5 pts |
| Team qualified to SF | +8 pts |
| Team in the final | +12 pts |
| Champion | +20 pts |

These bonus values are **confirmed by the admin in Phase 0** of `implementation.md` (a checkbox in the setup phase) and **applied in Phase 4** when the bonus scoring SQL function is written. The defaults above stand unless explicitly changed.

### 4.3 Deadlines and time zones
- All match kickoff timestamps are stored in **UTC** in the database.
- Displayed to the user in the **browser's time zone** (no `profile.timezone` column in the MVP). A small Client Component reformats every UTC instant into the local zone using `Intl.DateTimeFormat`. Users in São Paulo see Brasília time; users in Lisbon, Berlin, or anywhere else see their local time automatically.
- Server-side rendering shows UTC as a fallback before client hydration; the rerender on hydration is acceptable for the MVP.
- Once `now() >= kickoff_at` (compared in UTC, server-side), predictions for that match are immutable. The locking decision is timezone-independent.
- A grace period of **0 seconds** — kickoff is a hard cutoff.
- **Emails** (see §3 reminder flow) cannot know the recipient's browser TZ, so they use **São Paulo time** as a labeled default plus a relative phrase ("começa em ~12h") to remove ambiguity. A link in the email opens the app in the user's browser where times render locally.

### 4.4 Missing predictions
- A participant with no prediction at kickoff scores **0** for that match.
- No additional penalty. Missing is simply zero.

### 4.5 Tie-breakers for ranking
In order:
1. Total points (descending)
2. Number of exact scores (descending)
3. Number of correct winners (descending)
4. Alphabetical by display name

### 4.6 Invite codes and pool membership
- Format: `COPA-XXXX` where `XXXX` is 4 uppercase alphanumeric characters, globally unique.
- One code per pool, reusable until the admin regenerates it.
- Anyone with the code can join — there is no per-invite limit in the MVP.
- **A user can belong to at most 10 active pools.** Attempting an 11th join returns a clear PT-BR error ("Você já participa do número máximo de bolões — 10").

## 5. Non-functional requirements

- **Responsive:** mobile-first; layout must work down to 360px width.
- **Performance:** Lighthouse Performance ≥ 85 on mobile for the landing and matches pages.
- **Availability:** no scheduled maintenance windows on match days (2026-06-11 through 2026-07-19).
- **Language:** UI 100% in PT-BR for MVP. No i18n infrastructure.
- **Accessibility:** WCAG 2.1 AA for color contrast and keyboard navigation on the main flows (sign-up, login, prediction).
- **Privacy (LGPD basic):**
  - Collect only: name, email, predictions, login timestamps.
  - Provide a basic privacy policy page.
  - Allow the user to delete their account (cascades to their predictions) from the profile page.
- **Security:**
  - Passwords hashed by Supabase Auth (bcrypt).
  - All endpoints behind authenticated session.
  - Row-Level Security on every table.

## 6. Out of scope (explicit)

The following are **intentionally excluded** from this MVP and any near-term iteration:
- Real-money entry fees, payments, or prize processing.
- Native iOS or Android apps (web only, PWA optional later).
- In-app chat or per-match comments.
- Tournaments other than FIFA World Cup 2026.
- Multi-language UI.
- Per-user time zone preference stored in the database (the MVP relies on the browser's TZ; emails use São Paulo time as a labeled default).
- Co-admins, admin transfer, or admin removal of a member (one admin per pool, set at creation; out of MVP).
- Pool deletion via the UI (admin would ask via Supabase dashboard if needed).
- Custom scoring per pool (the rules in §4.1 and §4.2 are global).
- Social login (Google, etc.).
- **Third-place playoff prediction** — the match still happens in WC 2026 but no bet table or scoring rule covers it.

## 7. MVP acceptance criteria

The MVP is considered complete when **all** of the following are demonstrably true:

1. 10+ friends can sign up, confirm email, and log in within 5 minutes each.
2. **At least 2 distinct pools** exist with different members and different names; the admin of each is a different user.
3. At least one user is a member of **both** pools and can switch between them via the header without losing state.
4. A user in **Europe** (e.g., Lisbon) and a user in **São Paulo** see the same match kickoff displayed in their own local time, both correctly.
5. Each member can submit predictions for **every** group-stage match (72 matches in WC 2026), the group standings, and the champion **per pool they belong to**.
6. After an admin enters a match score via the admin panel, all participants' points update within 60 seconds (via the realtime channel or page refresh) — independently per pool.
7. The ranking page of each pool reflects the correct order per §4.5 for that pool only.
8. Any pool admin can enter or edit a match score via the admin panel; because match data is global (the score of Brazil vs Argentina is one fact), the update applies to every pool's bets on that match and points across all pools recalculate within 60 seconds. The trust model is that all pool admins are trusted friends.
9. A user attempting to join an 11th pool is blocked with the PT-BR error in §4.6.
10. A user who forgot their password can request a recovery email from `/recuperar`, click the link, set a new password, and log in — all within ~2 minutes.

## 8. Glossary

| Term | Definition |
|---|---|
| Bolão | Brazilian Portuguese for a betting pool, typically for sports. |
| Pool | English term used in this codebase for `bolão`. |
| Palpite | PT-BR UI term for a single prediction. |
| Jogo / Match | A single fixture in the tournament. |
| Fase de grupos | Group stage (12 groups of 4 teams in WC 2026). |
| Mata-mata / Knockout | Single-elimination phase starting at Round of 32. |
