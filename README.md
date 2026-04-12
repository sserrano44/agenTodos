# Agent Todos

Agent Todos is a production-oriented MVP for managing todos shared between admins and multiple agents. It provides:

- a Next.js App Router frontend
- Supabase Auth-backed email/password and social login
- multi-user workspace-ready data model
- admin-managed agents and scoped API keys
- a secure REST API for agent ingestion and access
- a remote MCP endpoint using Streamable HTTP
- a normalized todo model for `claude_cowork`, `openclaw`, `manual`, `api`, and `mcp`

No private Claude Cowork or OpenClaw integrations are assumed. External systems are expected to push normalized payloads into Agent Todos over REST or MCP.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- shadcn-style UI components
- Supabase Postgres + Auth
- Zod validation
- Vercel-compatible route handlers and MCP transport
- pnpm

## Required environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
API_KEY_PREFIX=atd
API_RATE_LIMIT_PER_MINUTE=120
MCP_SERVER_NAME=agent-todos
NEXT_PUBLIC_SOCIAL_AUTH_PROVIDERS=google,github
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=change-me-now
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it to the browser.
- `NEXT_PUBLIC_APP_URL` should match the deployed app URL in Vercel.
- `NEXT_PUBLIC_SOCIAL_AUTH_PROVIDERS` controls which Supabase OAuth providers are shown on `/login`.
- `SEED_ADMIN_*` are used only by the seed script.

## Local development

1. Install dependencies:

```bash
pnpm install
```

2. Apply both SQL migrations in `supabase/migrations/`.

Recommended with Supabase CLI:

```bash
supabase db push
```

If you are targeting a hosted project directly, you can also run the migration through the Supabase SQL editor.

3. If you want Google or GitHub sign-in, enable those providers in Supabase Auth and add these redirect URLs in Auth URL configuration:

```text
http://localhost:3000/auth/callback
https://your-production-domain.com/auth/callback
```

4. Seed the first workspace owner, demo agents, demo API keys, and example todos:

```bash
pnpm seed
```

5. Start the app:

```bash
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000), then sign in at `/login`.

## Creating the first workspace owner

The simplest path is:

1. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.
2. Run `pnpm seed`.
3. The script creates a Supabase Auth user, ensures a private workspace plus owner membership, seeds demo agents and todos into that workspace, and prints any newly-created agent API keys exactly once.

If you prefer manual setup:

1. Create a user in Supabase Auth.
2. Sign in once through `/login`, or call the database helper/trigger path so `profiles`, `workspaces`, and `workspace_memberships` are created.
3. Confirm the user has an active `owner` or `admin` row in `public.workspace_memberships`.

Each authenticated user gets a private workspace automatically. Shared team workspaces are supported by the schema, but this MVP does not yet include workspace invites or a workspace switcher UI.

## Database model

Core tables:

- `profiles`
- `workspaces`
- `workspace_memberships`
- `agents`
- `agent_api_keys`
- `todos`
- `todo_events`
- `api_rate_limit_buckets`

Key database characteristics:

- Row Level Security is enabled.
- Workspace members can read their own workspace data; workspace owners/admins can manage todos, agents, and keys.
- API keys are stored as one-way SHA-256 hashes only.
- `todos(workspace_id, source, external_id)` is unique when `external_id` is present, enabling idempotent per-workspace upserts.
- The legacy `admin_users` table remains only for backfill compatibility with the original migration.

## Admin UI

Routes:

- `/`
- `/login`
- `/admin`
- `/admin/todos`
- `/admin/agents`
- `/admin/settings`

Highlights:

- `/admin` shows counts by status and source, plus recent todos.
- `/admin/todos` supports create, edit, delete, complete, reopen, filter, search, and sorting.
- `/admin/agents` supports agent creation, enable/disable, API key generation, and revocation.
- `/admin/settings` includes copyable REST and MCP endpoint examples.
- The active workspace currently defaults to the first admin-capable membership for the signed-in user.

## REST API

Public health route:

- `GET /api/health`

Bearer-authenticated agent routes:

- `GET /api/todos`
- `POST /api/todos`
- `GET /api/todos/:id`
- `PATCH /api/todos/:id`
- `DELETE /api/todos/:id`
- `POST /api/todos/upsert`
- `GET /api/agents/me`

Scope rules:

- `todos:read` for listing and fetching todos
- `todos:write` for create, update, delete, complete, and upsert
- `mcp:use` for remote MCP access

Example create request:

```bash
curl http://localhost:3000/api/todos \
  -H "Authorization: Bearer <AGENT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Review weekly schedule sync",
    "priority": "high",
    "source": "api",
    "external_id": "sync-123",
    "metadata": {
      "upstream": "custom-cron"
    }
  }'
```

Example upsert request:

```bash
curl http://localhost:3000/api/todos/upsert \
  -H "Authorization: Bearer <AGENT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix failing inbox worker",
    "source": "openclaw",
    "external_id": "oc_task_4421",
    "priority": "urgent",
    "status": "in_progress",
    "metadata": {
      "queue": "primary"
    }
  }'
```

JSON errors use this shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed.",
    "details": {}
  }
}
```

## MCP endpoint

Remote MCP is exposed at:

```text
https://your-app.example.com/api/mcp
```

Transport:

- Streamable HTTP
- stateless
- JSON response mode
- authenticated with `Authorization: Bearer <AGENT_API_KEY>`

The MCP server exposes:

- `list_todos`
- `get_todo`
- `create_todo`
- `update_todo`
- `complete_todo`
- `delete_todo`
- `upsert_todo_from_source`

Generic remote MCP config example:

```json
{
  "transport": "streamable_http",
  "url": "https://your-app.example.com/api/mcp",
  "headers": {
    "Authorization": "Bearer <AGENT_API_KEY>"
  }
}
```

Exact MCP client configuration syntax varies by client. The important pieces are the Streamable HTTP transport, the `/api/mcp` URL, and the Bearer token header.

## Source mapping examples

Claude Cowork schedule item mapped into the normalized schema:

```json
{
  "title": "Prepare Thursday research session",
  "description": "Pulled from Claude Cowork schedule block",
  "source": "claude_cowork",
  "external_id": "cw_sched_0189",
  "scheduled_for": "2026-04-14T14:00:00Z",
  "due_at": "2026-04-14T14:00:00Z",
  "priority": "medium",
  "metadata": {
    "schedule_title": "Research session",
    "workspace": "default",
    "raw_payload": {
      "start": "2026-04-14T14:00:00Z",
      "duration_minutes": 60
    }
  }
}
```

OpenClaw task mapped into the normalized schema:

```json
{
  "title": "Fix failing inbox worker",
  "description": "OpenClaw task mirrored into Agent Todos",
  "source": "openclaw",
  "external_id": "oc_task_4421",
  "priority": "urgent",
  "status": "in_progress",
  "metadata": {
    "task_type": "repair",
    "workspace": "ops",
    "raw_payload": {
      "attempt": 3,
      "assigned_queue": "inbox"
    }
  }
}
```

## API key generation

Generate API keys from `/admin/agents`:

1. Create or open an agent.
2. Enter a key label and select scopes.
3. Click `Generate API key`.
4. Copy the returned secret immediately. Only the hashed form is stored.

You can revoke keys from the same screen. Revoked or disabled keys are rejected by REST and MCP authentication.

## Verification commands

Run the project checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Deployment to Vercel

1. Create a Supabase project.
2. Run the migration in `supabase/migrations`.
3. Seed the first workspace owner with `pnpm seed`, or create a Supabase Auth user and let the app bootstrap its private workspace on first sign-in.
4. Create a Vercel project from this repo.
5. Set the required environment variables in Vercel.
6. Set `NEXT_PUBLIC_APP_URL` to the Vercel production URL.
7. If using social login, configure Google/GitHub in Supabase Auth and allow the production `/auth/callback` URL.
8. Deploy.

Operational notes:

- All admin and agent writes happen server-side.
- The Supabase service role key is used only in server code, route handlers, and the seed script.
- The MCP endpoint is safe for serverless deployment because it uses the stateless Web Standard Streamable HTTP transport in JSON response mode.
