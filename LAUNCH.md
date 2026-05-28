# Launch checklist — Phase 9

A step-by-step plan for taking Bolão Copa 2026 from "code on `main`" to "real friends predicting matches."

**Order matters.** Most steps depend on the one before. Resend domain → Vercel deploy → Supabase Auth config → smoke tests → branch protection → invite friends.

**Estimated time:** ~45-60 minutes end-to-end, gated on DNS propagation for the Resend domain (often <5 min, sometimes hours).

---

## 1. Resend domain verification

**Why it has to be first:** until a custom domain is verified, the Resend sandbox sender (`onboarding@resend.dev`) only delivers to your own Resend account email. You cannot invite anyone else, cannot test multi-user reminders, and the auth confirmation emails Supabase sends through Resend SMTP will also fail to land in other inboxes.

### Steps

1. Pick a domain you control. If you don't have one, register a cheap `.com` / `.app` (~$10/yr) — or use a subdomain of something you already own (e.g. `bolao.your-name.com`).
2. In the Resend dashboard → **Domains** → **Add Domain**, enter the domain.
3. Resend gives you DNS records to add (typically MX, TXT for SPF, TXT for DMARC, CNAME for DKIM).
4. Add those records at your DNS provider (Cloudflare, Namecheap, Route53, whatever).
5. In Resend, click **Verify**. Wait — DNS can be near-instant or take hours, depends on the provider.
6. Once verified, you can use any `<anything>@your-domain` as the `from` address.

### Capture for later steps

- [ ] Verified domain (e.g. `bolao.your-name.com`)
- [ ] Decided `from` address (suggested: `bolao@<domain>` or `noreply@<domain>`)

---

## 2. Supabase Auth config update

The Supabase Auth settings have URLs hard-coded to `localhost:3000` from local dev. Update them to point at the new domain before deploy — or you'll deploy and immediately have broken confirmation links.

### Steps

1. Supabase dashboard → **Authentication** → **URL Configuration**.
   - **Site URL:** `https://<your-domain-or-vercel-url>` (no trailing slash). We don't know the Vercel URL yet — set it after step 3 below, OR set it to the eventual custom domain now if you already plan to use one.
   - **Redirect URLs:** add `https://<your-domain>/**` so all callback paths under it are allowed.
2. **Authentication** → **Email Templates** → for each of the three templates we use (Confirm signup, Reset Password, Magic Link if relevant), make sure the link template still points at `{{ .SiteURL }}/auth/confirm?token_hash=...&type=...&next=...` — the templates we customized in Phase 1 already use `{{ .SiteURL }}`, which auto-fills with the Site URL above.
3. **Authentication** → **SMTP Settings**.
   - The current SMTP is already wired to Resend via the sandbox sender. Update the **Sender email** to the verified domain address from step 1 (e.g. `bolao@your-domain`).
   - **Host:** `smtp.resend.com`, **Port:** `465`, **Username:** `resend`, **Password:** the same `RESEND_API_KEY` value already in the field.

---

## 3. Vercel project creation

### Steps

1. [vercel.com/new](https://vercel.com/new) → import the `jchagasBR/bolao-copa-2026` GitHub repo.
2. **Framework preset:** Next.js (auto-detected). Leave build/output settings at defaults.
3. **Environment variables** — add all seven from [.env.example](./.env.example). Reuse the values from your local `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL` — use the verified-domain `from` address from §1
   - `CRON_SECRET` — generate a **new** one for production (don't reuse the local dev secret); `openssl rand -base64 32`
   - `APP_URL` — you don't know the final URL yet; leave blank or set to a placeholder; update after first deploy
4. Click **Deploy**.
5. After the first deploy succeeds, capture the production URL (e.g. `https://bolao-copa-2026.vercel.app`).
6. Go back to env vars and set `APP_URL` to the production URL. Redeploy.

### Connect a custom domain (optional but recommended)

If you want `bolao.your-name.com` instead of `bolao-copa-2026.vercel.app`:

1. Vercel project → **Settings** → **Domains** → **Add**.
2. Enter the domain. Vercel gives you a DNS record (usually `CNAME → cname.vercel-dns.com`).
3. Add the record at your DNS provider.
4. Once Vercel says **"Valid Configuration"**, update `APP_URL` env var to the custom domain and redeploy.
5. Go back to **Supabase → Auth → URL Configuration** and update the **Site URL** to the custom domain.

---

## 4. Post-deploy smoke tests

After the first successful Vercel deploy with all env vars set, walk through these in order. If any step fails, fix before continuing.

### 4a. Public pages load

- [ ] `<APP_URL>/entrar` — login form renders.
- [ ] `<APP_URL>/cadastro` — signup form renders.
- [ ] `<APP_URL>/regras` — rules page renders with the footer.

### 4b. Auth round-trip

- [ ] Sign up with a fresh email (one that isn't your Resend account email — to verify the custom domain works).
- [ ] Confirmation email lands in the inbox (check spam, but it shouldn't be there with a verified domain).
- [ ] Clicking the confirm link lands on `<APP_URL>/?` and you're logged in.
- [ ] Logout works. Re-login works.
- [ ] Password recovery works (request from `/entrar`, click email, set new password).

### 4c. Pool create / join

- [ ] Create a pool. Confirm the invite code is shown.
- [ ] Open an incognito window, sign up as a second user, join the pool with the invite code.
- [ ] Both users see the pool on their dashboard.

### 4d. Prediction + scoring

- [ ] Both users predict a future match (a real WC fixture).
- [ ] In the Supabase SQL Editor, fake-finish that match (see README → Operations → "Forcing a re-test of the cron").
- [ ] One of you (the admin) hits **"Editar resultado / horário →"** and submits a real score.
- [ ] `/ranking` reorders within ~1s via the realtime channel.

### 4e. Cron route

- [ ] In Supabase SQL Editor, fake-shift another match into the next 24h (see README → Operations).
- [ ] Vercel will fire the cron automatically at the next 12:00 UTC (= 09:00 BRT). OR manually trigger from your terminal:
  ```sh
  curl.exe -H "Authorization: Bearer <prod CRON_SECRET>" https://<APP_URL>/api/cron/send-reminders
  ```
- [ ] Email lands in the second user's inbox (the one who didn't predict).
- [ ] Vercel → Project → **Logs** shows a `200` for the cron run.
- [ ] Second run returns `sent: 0` (dedup'd via `reminder_sent`).

### 4f. Reset the fake-shifted matches

```sql
update public.match
set kickoff_at = <original UTC timestamp from the seed>,
    status = 'scheduled', home_score = null, away_score = null, winner_team_id = null
where external_id in (1, 2);

delete from public.reminder_sent;
delete from public.score;
delete from public.bonus;
```

(If you used the actual MEX-RSA match `external_id = 1` for testing, the original kickoff is `2026-06-11T18:00:00Z` per `0005_seed_matches.sql`.)

---

## 5. Branch protection

Now that CI has run green for weeks of code changes, protect `main` against accidental direct pushes.

1. GitHub repo → **Settings** → **Branches** → **Add branch protection rule**.
2. **Branch name pattern:** `main`.
3. Tick:
   - **Require a pull request before merging** (with 0 approvals required since you're a solo author).
   - **Require status checks to pass before merging** → select the **CI** workflow (or whatever the GitHub Actions check is named).
   - **Require branches to be up to date before merging**.
   - **Do not allow bypassing the above settings**.
4. Save.

Future workflow: branch → PR → CI green → merge. Direct pushes to `main` will be rejected.

---

## 6. Doc-auditor pre-launch sweep

The final Phase 8 verify gate. Read-only audit of the three founding docs against the live code, looking for any drift introduced since the Phase 7 audit.

Run from inside a Claude Code session:

> Launch the doc-auditor subagent for the final pre-launch sweep. Focus on anything that drifted since Phase 7 and verify the README + LAUNCH.md content matches what's actually in the code.

Address any P0 items; defer P1+ to post-launch.

---

## 7. Invite friends

The actual launch. By now you have:

- A verified Resend domain → emails work.
- A production deploy → real URL.
- Smoke tests green → core flows confirmed.
- Branch protection → no accidental main push during the tournament.
- Docs current → future-you can navigate the codebase.

**To invite friends:**

1. Create a real pool from your production account.
2. Capture the invite code (`COPA-XXXX`).
3. Send via WhatsApp (or whatever your group uses) with a short intro:

   ```
   Galera, fiz um bolão pra Copa 2026. É de graça e tem ranking ao vivo.
   Entra aqui → https://<APP_URL>/cadastro
   Depois usa o código: COPA-XXXX
   Qualquer dúvida sobre pontos: https://<APP_URL>/regras
   ```

4. Set a personal reminder to monitor the cron and ranking during the **first WC match** on 2026-06-11 — that's when the admin SLA (enter scores within 12h of full time) kicks in.

---

## Post-launch monitoring

For the duration of the WC (2026-06-11 through 2026-07-19):

- **Once daily**: check Vercel **Logs** for any `5xx` from `/api/cron/send-reminders`.
- **After each match day**: enter scores via `/admin/jogos/<matchId>` within 12h of full time per the SLA.
- **If the cron seems off**: manually hit the route with curl + your `CRON_SECRET` to inspect the JSON response.
- **If realtime is laggy** for everyone (not just you): check Supabase Realtime metrics — free tier has connection limits that you might bump at 30 simultaneously-watching users.

---

## What's deferred to post-tournament

These are intentional non-goals for the launch (per [requirements.md §6](./requirements.md)):

- Real-money entry, prizes, payments
- Native mobile apps
- Multi-language UI
- Co-admins / admin transfer
- Pool deletion via UI (do it via Supabase dashboard if needed)
- Third-place playoff predictions

Post-WC (Phase 10 in [implementation.md](./implementation.md)): final results page, "Exportar meus palpites" JSON export, retrospective. Not blockers — handle in July 2026.
