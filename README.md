# Bolão Copa 2026

A private prediction pool web app for friends to bet on FIFA World Cup 2026 results. UI is in Portuguese (PT-BR); code and docs are in English.

## Documentation

- [requirements.md](./requirements.md) — what the app does and the business rules.
- [architecture.md](./architecture.md) — stack, infra, data model, RLS policies.
- [implementation.md](./implementation.md) — phased roadmap with checkpoints.

## Stack

- **Next.js** App Router + TypeScript
- **Tailwind CSS** + shadcn/ui
- **Supabase** (Postgres + Auth + Realtime)
- **Vercel** (hosting + cron)
- **Resend** (transactional email)

Match scores are entered manually by pool admins — no external sports API. See [architecture.md §5](./architecture.md).

## Local development

```sh
pnpm install
cp .env.example .env.local   # then fill in real values
pnpm dev                     # http://localhost:3000
```

### Scripts

- `pnpm dev` — start the dev server
- `pnpm build` — production build
- `pnpm lint` — ESLint
- `pnpm typecheck` — TypeScript no-emit check
- `pnpm test` — vitest run (one-shot)
- `pnpm test:watch` — vitest watch mode

## Conventions

- All user-facing UI strings are in PT-BR; code identifiers in English.
- Timestamps stored as UTC; rendered in the browser's local TZ via `components/local-time.tsx`.
- Every new table must have RLS enabled (see `architecture.md` §4.2).
- Every pool-scoped server action must call `lib/pool.ts:assertMember()`.

## Doc audits

A read-only `doc-auditor` subagent is defined in `.claude/agents/doc-auditor.md`. Run it at the end of each implementation phase to surface drift between the three founding docs and the code.
