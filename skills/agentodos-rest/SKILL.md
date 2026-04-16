---
name: agentodos_rest
description: Use the Agent Todos REST API at https://agentodos.vercel.app to list todos, create todos, complete todos, and delete todos for OpenClaw work that should sync with the shared todo system.
metadata: {"openclaw":{"homepage":"https://agentodos.vercel.app/admin/settings","primaryEnv":"AGENTODOS_API_KEY","requires":{"bins":["curl"],"env":["AGENTODOS_API_KEY"]}}}
---

# Agent Todos REST

Use this skill when the user wants OpenClaw to read or mutate shared todos in Agent Todos.

Base URL:

`https://agentodos.vercel.app/api`

Auth:

- Read the API key from `AGENTODOS_API_KEY`
- Send `Authorization: Bearer $AGENTODOS_API_KEY`
- Send `Content-Type: application/json` on write requests

Rules:

- For OpenClaw-created todos, use `source: "openclaw"`
- If the task has a stable upstream identifier, include it as `external_id`
- Prefer `priority: "medium"` unless the task clearly needs `low`, `high`, or `urgent`
- If the todo id is unknown, list todos first and identify the target before completing or deleting
- Fail fast if the API key is missing or the API returns a non-2xx response

Use `exec` with `curl` for API calls.

## List todos

List all todos:

```bash
curl -sS "https://agentodos.vercel.app/api/todos" \
  -H "Authorization: Bearer $AGENTODOS_API_KEY"
```

List only OpenClaw todos:

```bash
curl -sS "https://agentodos.vercel.app/api/todos?source=openclaw" \
  -H "Authorization: Bearer $AGENTODOS_API_KEY"
```

List filtered todos:

```bash
curl -sS "https://agentodos.vercel.app/api/todos?status=todo&source=openclaw&search=inbox" \
  -H "Authorization: Bearer $AGENTODOS_API_KEY"
```

## Create todo

Create a new OpenClaw todo:

```bash
curl -sS -X POST "https://agentodos.vercel.app/api/todos" \
  -H "Authorization: Bearer $AGENTODOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Investigate failing OpenClaw worker",
    "description": "Check retries, logs, and queue health.",
    "status": "todo",
    "priority": "medium",
    "source": "openclaw",
    "external_id": "openclaw-task-123",
    "metadata": {
      "origin": "openclaw",
      "queue": "default"
    }
  }'
```

If the task already has a stable upstream id and you want idempotent create/update behavior, use the upsert endpoint instead:

```bash
curl -sS -X POST "https://agentodos.vercel.app/api/todos/upsert" \
  -H "Authorization: Bearer $AGENTODOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Investigate failing OpenClaw worker",
    "description": "Check retries, logs, and queue health.",
    "status": "todo",
    "priority": "medium",
    "source": "openclaw",
    "external_id": "openclaw-task-123",
    "metadata": {
      "origin": "openclaw",
      "queue": "default"
    }
  }'
```

## Complete todo

Complete a todo by id:

```bash
curl -sS -X PATCH "https://agentodos.vercel.app/api/todos/TODO_ID" \
  -H "Authorization: Bearer $AGENTODOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "done"
  }'
```

If you need to find the id first, list todos and match by `external_id`, title, or current status.

## Delete todo

Delete a todo by id:

```bash
curl -sS -X DELETE "https://agentodos.vercel.app/api/todos/TODO_ID" \
  -H "Authorization: Bearer $AGENTODOS_API_KEY"
```

## Expected responses

- `GET /api/todos` returns `{ "data": { "todos": [...] } }`
- `POST /api/todos` returns `{ "data": { "todo": { ... } } }`
- `PATCH /api/todos/:id` returns `{ "data": { "todo": { ... } } }`
- `DELETE /api/todos/:id` returns `{ "data": { "success": true } }`

## Workflow

1. Confirm the operation: list, create, complete, or delete.
2. If completing or deleting and no todo id is given, list todos first.
3. Run the matching `curl` command with `exec`.
4. Summarize the result using the returned todo id, title, and status.
