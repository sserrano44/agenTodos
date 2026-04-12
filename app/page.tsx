import Link from "next/link";
import { ArrowRightIcon, KeySquareIcon, ShieldCheckIcon, WorkflowIcon } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const mcpEndpoint = `${appUrl}/api/mcp`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-16 px-6 py-10 md:px-10 lg:px-12">
      <section className="grid gap-10 rounded-[2rem] border border-border/60 bg-card/70 px-8 py-12 shadow-[0_40px_120px_-64px_rgba(8,47,73,0.35)] md:grid-cols-[1.2fr_0.8fr] md:px-12">
        <div className="flex flex-col gap-6">
          <div className="inline-flex w-fit items-center rounded-full border border-border/70 bg-background/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Agent Todos MVP
          </div>
          <div className="max-w-2xl space-y-4">
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
              One todo surface for humans, APIs, and MCP agents.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              Normalize incoming tasks from named sources, manage them in a protected admin UI,
              and expose the same workspace over secure REST and MCP interfaces.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/login">
                Open admin
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/admin/settings">View API and MCP examples</Link>
            </Button>
          </div>
        </div>
        <Card className="border-border/70 bg-background/85">
          <CardHeader>
            <CardTitle>Remote MCP endpoint</CardTitle>
            <CardDescription>Use Streamable HTTP with the same agent API keys used for the REST API.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-border bg-muted/50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Endpoint
              </div>
              <div className="mt-2 break-all font-[var(--font-mono)] text-sm">{mcpEndpoint}</div>
            </div>
            <CopyButton value={mcpEndpoint} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <FeatureCard
          icon={<ShieldCheckIcon className="size-5" />}
          title="Workspace auth"
          description="Supabase Auth supports email and social sign-in, with server-side workspace admin checks."
        />
        <FeatureCard
          icon={<KeySquareIcon className="size-5" />}
          title="Scoped API keys"
          description="Agents authenticate with one-way hashed keys and least-privilege scopes for REST and MCP access."
        />
        <FeatureCard
          icon={<WorkflowIcon className="size-5" />}
          title="Normalized ingestion"
          description="Tasks from Claude Cowork, OpenClaw, manual entry, API, or MCP all land in the same todo model."
        />
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
