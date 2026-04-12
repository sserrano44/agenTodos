import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

import { ensureUserAccountSetup } from "../lib/data/workspaces";
import { getServerEnv } from "../lib/env";
import { generateApiKey } from "../lib/security/api-keys";
import type { Database } from "../lib/types/database";

const env = getServerEnv();
const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required.");
}

const seedAdminEmail = adminEmail;
const seedAdminPassword = adminPassword;

const client = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

function handleDataError(error: { message: string } | null) {
  if (error) {
    throw error;
  }
}

async function ensureAdminUser() {
  const existingUsers = await client.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  const existingUser = existingUsers.data.users.find((user) => user.email === seedAdminEmail);

  const user =
    existingUser ??
    (
      await client.auth.admin.createUser({
        email: seedAdminEmail,
        password: seedAdminPassword,
        email_confirm: true,
      })
    ).data.user;

  if (!user) {
    throw new Error("Unable to create seed admin user.");
  }

  await ensureUserAccountSetup(user, client);
  return user;
}

async function getPrimaryWorkspaceId(userId: string) {
  const { data, error } = await client
    .from("workspace_memberships")
    .select("workspace_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  handleDataError(error);
  if (!data?.workspace_id) {
    throw new Error("Seed admin user has no active workspace membership.");
  }

  return data.workspace_id;
}

async function ensureAgent(
  workspaceId: string,
  input: {
    name: string;
    source_type: Database["public"]["Enums"]["agent_source_type"];
    description: string;
  },
) {
  const existing = await client
    .from("agents")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("name", input.name)
    .maybeSingle();

  handleDataError(existing.error);
  if (existing.data) return existing.data;

  const created = await client
    .from("agents")
    .insert({
      workspace_id: workspaceId,
      ...input,
    })
    .select("*")
    .single();

  handleDataError(created.error);
  if (!created.data) {
    throw new Error("Unable to create seed agent.");
  }

  return created.data;
}

async function ensureApiKey(input: {
  workspaceId: string;
  agentId: string;
  label: string;
  scopes: Database["public"]["Tables"]["agent_api_keys"]["Row"]["scopes"];
}) {
  const existing = await client
    .from("agent_api_keys")
    .select("*")
    .eq("workspace_id", input.workspaceId)
    .eq("agent_id", input.agentId)
    .eq("label", input.label)
    .maybeSingle();

  handleDataError(existing.error);
  if (existing.data) {
    console.log(
      `Existing key kept for ${input.label}: ${existing.data.key_prefix}••••${existing.data.key_last4}`,
    );
    return null;
  }

  const generated = generateApiKey(env.API_KEY_PREFIX);
  const created = await client
    .from("agent_api_keys")
    .insert({
      workspace_id: input.workspaceId,
      agent_id: input.agentId,
      label: input.label,
      scopes: input.scopes,
      key_hash: generated.keyHash,
      key_last4: generated.keyLast4,
      key_prefix: generated.keyPrefix,
    })
    .select("*")
    .single();

  handleDataError(created.error);

  console.log(`Created API key for ${input.label}: ${generated.rawKey}`);
  return created.data;
}

async function seedTodos(input: {
  workspaceId: string;
  claudeAgentId: string;
  openClawAgentId: string;
}) {
  const todos: Database["public"]["Tables"]["todos"]["Insert"][] = [
    {
      workspace_id: input.workspaceId,
      title: "Review Monday Claude Cowork schedule import",
      description: "Validate that the next schedule block was normalized correctly.",
      priority: "high",
      status: "todo",
      source: "claude_cowork",
      external_id: "cw_sched_demo_01",
      agent_id: input.claudeAgentId,
      due_at: new Date(Date.now() + 86_400_000).toISOString(),
      scheduled_for: new Date(Date.now() + 86_400_000).toISOString(),
      metadata: {
        schedule_title: "Planning block",
        demo: true,
      },
      tags: ["claude", "schedule"],
    },
    {
      workspace_id: input.workspaceId,
      title: "Investigate failing OpenClaw run",
      description: "Check retry loop and requeue if needed.",
      priority: "urgent",
      status: "in_progress",
      source: "openclaw",
      external_id: "oc_task_demo_01",
      agent_id: input.openClawAgentId,
      metadata: {
        queue: "primary",
        demo: true,
      },
      tags: ["openclaw", "ops"],
    },
    {
      workspace_id: input.workspaceId,
      title: "Confirm first production deployment",
      description: "Verify Vercel env vars and MCP connectivity after deployment.",
      priority: "medium",
      status: "todo",
      source: "manual",
      metadata: {
        demo: true,
      },
      tags: ["manual", "launch"],
    },
  ];

  for (const todo of todos) {
    if (todo.external_id) {
      const { error } = await client.from("todos").upsert(todo, {
        onConflict: "workspace_id,source,external_id",
      });

      handleDataError(error);
      continue;
    }

    const existing = await client
      .from("todos")
      .select("id")
      .eq("workspace_id", input.workspaceId)
      .eq("title", todo.title)
      .eq("source", todo.source ?? "manual")
      .maybeSingle();

    handleDataError(existing.error);
    if (existing.data) continue;

    const inserted = await client.from("todos").insert(todo);
    handleDataError(inserted.error);
  }
}

async function main() {
  const adminUser = await ensureAdminUser();
  const workspaceId = await getPrimaryWorkspaceId(adminUser.id);
  const claudeAgent = await ensureAgent(workspaceId, {
    name: "Claude Cowork Scheduler",
    source_type: "claude_cowork",
    description: "Demo agent for imported Claude Cowork schedule items.",
  });
  const openClawAgent = await ensureAgent(workspaceId, {
    name: "OpenClaw Worker",
    source_type: "openclaw",
    description: "Demo agent for OpenClaw-originated tasks.",
  });

  await ensureApiKey({
    workspaceId,
    agentId: claudeAgent.id,
    label: "Claude Cowork default",
    scopes: ["todos:read", "todos:write", "mcp:use"],
  });
  await ensureApiKey({
    workspaceId,
    agentId: openClawAgent.id,
    label: "OpenClaw default",
    scopes: ["todos:read", "todos:write", "mcp:use"],
  });

  await seedTodos({
    workspaceId,
    claudeAgentId: claudeAgent.id,
    openClawAgentId: openClawAgent.id,
  });

  console.log(`Seed complete for ${adminUser.email} in workspace ${workspaceId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
