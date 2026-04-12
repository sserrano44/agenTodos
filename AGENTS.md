# AGENTS.md

## Project purpose

Agent Todos is a shared todo workspace for one or more human users plus external agents. The app intentionally does not assume any proprietary Claude Cowork or OpenClaw API details. Those systems integrate by pushing normalized tasks through REST or MCP.

## Architecture summary

- `app/`
  - App Router pages, layouts, route handlers, and server actions
- `components/`
  - UI primitives and small client helpers
- `lib/auth/`
  - Admin session helpers
- `lib/core/`
  - Small, testable domain logic used outside of Supabase-specific code
- `lib/data/`
  - Supabase-backed data access and auth flows
- `lib/mcp/`
  - MCP tool handlers and MCP server wiring
- `lib/supabase/`
  - Browser, server, middleware, and service-role client factories
- `supabase/migrations/`
  - Database schema and RLS migrations
- `scripts/seed.ts`
  - Bootstrap admin, agents, demo keys, and sample todos
- `tests/`
  - Lightweight unit tests for guards, todo logic, API key auth, and MCP handlers

## Key conventions

- Server components by default.
- Client components only when browser APIs or interaction state are necessary.
- Supabase service role usage is restricted to server-only code.
- Users are mapped into `profiles`, `workspaces`, and `workspace_memberships`.
- Each authenticated user gets a private workspace automatically.
- The current admin UI uses the first owner/admin membership as the active workspace.
- Bearer token auth is shared by REST and MCP.
- Todos are normalized with explicit `source` values:
  - `claude_cowork`
  - `openclaw`
  - `manual`
  - `api`
  - `mcp`

## Commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm seed
```

## Security model

- Admin login uses Supabase Auth with email/password or configured social providers.
- `/admin` routes are protected by middleware and server-side admin checks.
- Agent secrets are shown once and stored only as one-way hashes.
- API scopes are enforced at request time.
- RLS is enabled across the public schema.

## MCP notes

- Transport: Streamable HTTP
- Mode: stateless JSON response mode
- Endpoint: `/api/mcp`
- Auth: `Authorization: Bearer <AGENT_API_KEY>`

## Implementation notes

- `todo_events` keeps audit history simple and survives todo deletion because it stores `todo_id` without a foreign key.
- `api_rate_limit_buckets` provides a Vercel-compatible per-key rate limiter backed by Postgres.
- Seed output is intentionally the only place newly-created plaintext API keys are printed.
