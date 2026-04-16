import { CopyButton } from "@/components/copy-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const apiBase = `${appUrl}/api`;
const mcpUrl = `${appUrl}/api/mcp`;

const restExample = `curl ${apiBase}/todos \\
  -H "Authorization: Bearer <AGENT_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Review weekly schedule sync",
    "priority": "high",
    "source": "api",
    "external_id": "sync-123",
    "metadata": {
      "upstream": "custom-cron"
    }
  }'`;

const mcpExample = `{
  "transport": "streamable_http",
  "url": "${mcpUrl}"
}`;

const claudeExample = `{
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
}`;

const openClawExample = `{
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
}`;

export default function AdminSettingsPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
          <CardDescription>
            These URLs are what agents need for direct REST calls and remote MCP connections.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <EndpointBlock label="REST API base" value={apiBase} />
          <EndpointBlock label="MCP endpoint" value={mcpUrl} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage examples</CardTitle>
          <CardDescription>
            REST uses agent API keys. Remote MCP clients can either complete the OAuth connector flow or send an API key manually if the client supports custom headers.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <CodeBlock title="REST create todo" value={restExample} />
          <CodeBlock title="Generic MCP client config" value={mcpExample} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remote MCP auth</CardTitle>
          <CardDescription>
            Agent Todos exposes OAuth discovery plus an authorization code + PKCE flow for hosted MCP clients such as Claude connectors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Resource URL:</strong> {mcpUrl}</p>
          <p><strong className="text-foreground">Protected resource metadata:</strong> {appUrl}/.well-known/oauth-protected-resource</p>
          <p><strong className="text-foreground">Authorization server metadata:</strong> {appUrl}/.well-known/oauth-authorization-server</p>
          <p>Use OAuth when the MCP client shows a Connect flow. Use an agent API key only for clients that support manual Bearer headers.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Normalized source mapping</CardTitle>
          <CardDescription>
            Example payloads showing how upstream systems should map into the normalized todo model.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <CodeBlock title="Claude Cowork schedule item" value={claudeExample} />
          <CodeBlock title="OpenClaw task" value={openClawExample} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scopes</CardTitle>
          <CardDescription>
            API keys and OAuth tokens both use the same least-privilege scope model.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p><strong className="text-foreground">todos:read</strong> lets an agent list or fetch todos.</p>
          <p><strong className="text-foreground">todos:write</strong> lets an agent create, update, complete, delete, or upsert todos.</p>
          <p><strong className="text-foreground">mcp:use</strong> allows access to the remote MCP endpoint and its toolset.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function EndpointBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 break-all font-[var(--font-mono)] text-sm">{value}</div>
      <div className="mt-3">
        <CopyButton value={value} />
      </div>
    </div>
  );
}

function CodeBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-medium">{title}</div>
        <CopyButton value={value} label="Copy" />
      </div>
      <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
        <code>{value}</code>
      </pre>
    </div>
  );
}
