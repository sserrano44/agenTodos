import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth/admin";
import { PRIORITY_LABELS, SOURCE_LABELS, STATUS_LABELS } from "@/lib/constants";
import { getAdminSummary } from "@/lib/data/agents";
import { getTodoDashboardSummary } from "@/lib/data/todos";
import { formatDateTime } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  const workspaceId = session.activeWorkspace.id;
  const [todoSummary, adminSummary] = await Promise.all([
    getTodoDashboardSummary(workspaceId),
    getAdminSummary(workspaceId),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="max-w-3xl text-muted-foreground">
          Shared visibility for {session.activeWorkspace.name} across manual work, API ingestion,
          and MCP-enabled agents.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <SummaryCard label="Total todos" value={todoSummary.total.toString()} />
        <SummaryCard label="Active agents" value={adminSummary.activeAgents.toString()} />
        <SummaryCard label="Active API keys" value={adminSummary.activeKeys.toString()} />
        <SummaryCard label="Workspace members" value={adminSummary.activeMembers.toString()} />
        <SummaryCard label="Blocked todos" value={todoSummary.byStatus.blocked.toString()} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent todos</CardTitle>
            <CardDescription>Latest work items across all supported sources.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {todoSummary.recent.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-muted/40 px-5 py-6 text-sm text-muted-foreground">
                No todos yet. Add one from the admin UI or push one in through the REST API.
              </div>
            ) : (
              todoSummary.recent.map((todo) => (
                <div
                  key={todo.id}
                  className="flex flex-col gap-2 rounded-3xl border border-border/70 bg-background/80 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{STATUS_LABELS[todo.status]}</Badge>
                    <Badge variant="outline">{SOURCE_LABELS[todo.source]}</Badge>
                    <Badge variant="outline">{PRIORITY_LABELS[todo.priority]}</Badge>
                  </div>
                  <div className="font-medium">{todo.title}</div>
                  <div className="text-sm text-muted-foreground">
                    Created {formatDateTime(todo.created_at)}
                  </div>
                </div>
              ))
            )}
            <Button asChild variant="outline">
              <Link href="/admin/todos">Manage todos</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>By status</CardTitle>
              <CardDescription>Distribution of current work state.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {Object.entries(todoSummary.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span>{STATUS_LABELS[status as keyof typeof STATUS_LABELS]}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>By source</CardTitle>
              <CardDescription>Where tasks are currently entering the system.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {Object.entries(todoSummary.bySource).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between text-sm">
                  <span>{SOURCE_LABELS[source as keyof typeof SOURCE_LABELS]}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
