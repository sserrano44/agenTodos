import { createAgentAction, toggleAgentAction } from "@/app/admin/agents/actions";
import { AgentKeyManager } from "@/app/admin/agents/agent-key-manager";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdminSession } from "@/lib/auth/admin";
import { AGENT_SOURCE_TYPES } from "@/lib/constants";
import { listAgents } from "@/lib/data/agents";
import { getSearchParam } from "@/lib/query-parsers";
import { formatDateTime } from "@/lib/utils";

export default async function AdminAgentsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdminSession();
  const resolvedSearchParams = (await searchParams) ?? {};
  const agents = await listAgents(session.activeWorkspace.id);
  const errorMessage = getSearchParam(resolvedSearchParams, "error");

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Create agent</CardTitle>
          <CardDescription>
            Register a named source integration or custom agent for{" "}
            {session.activeWorkspace.name} and generate scoped API keys for it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}
          <form action={createAgentAction} className="flex flex-col gap-4">
            <Field label="Name" htmlFor="name">
              <Input id="name" name="name" placeholder="Claude Cowork Scheduler" required />
            </Field>
            <Field label="Source type" htmlFor="source_type">
              <select
                id="source_type"
                name="source_type"
                className="h-10 rounded-2xl border border-border bg-background px-4 text-sm outline-none"
                defaultValue="custom"
              >
                {AGENT_SOURCE_TYPES.map((sourceType) => (
                  <option key={sourceType} value={sourceType}>
                    {sourceType}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description" htmlFor="description">
              <textarea
                id="description"
                name="description"
                className="min-h-28 rounded-3xl border border-border bg-background px-4 py-3 text-sm outline-none"
                placeholder="Optional notes about the upstream source or responsibilities."
              />
            </Field>
            <label className="inline-flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="is_active" defaultChecked />
              Start active
            </label>
            <SubmitButton pendingText="Creating...">Create agent</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {agents.length === 0 ? (
          <Card>
            <CardContent className="px-6 py-12 text-center text-sm text-muted-foreground">
              No agents yet. Create one to issue scoped API keys for REST and MCP access.
            </CardContent>
          </Card>
        ) : (
          agents.map((agent) => (
            <Card key={agent.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>{agent.name}</CardTitle>
                    <CardDescription>
                      {agent.description || "No description provided."}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={agent.is_active ? "success" : "warning"}>
                      {agent.is_active ? "Active" : "Disabled"}
                    </Badge>
                    <Badge variant="outline">{agent.source_type}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                  <div>Created {formatDateTime(agent.created_at)}</div>
                  <div>Last used {formatDateTime(agent.last_used_at)}</div>
                </div>
                <form action={toggleAgentAction}>
                  <input type="hidden" name="id" value={agent.id} />
                  <input type="hidden" name="next_active" value={String(!agent.is_active)} />
                  <SubmitButton variant="outline" pendingText="Updating...">
                    {agent.is_active ? "Disable agent" : "Enable agent"}
                  </SubmitButton>
                </form>
                <AgentKeyManager agentId={agent.id} keys={agent.agent_api_keys} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
