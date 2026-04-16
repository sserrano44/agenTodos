import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/lib/http/api";
import { getServerEnv } from "@/lib/env";
import {
  assertApiKeyAccess,
  generateApiKey,
  hashApiKey,
  type ApiKeyRecord,
} from "@/lib/security/api-keys";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUserAccountSetup, getWorkspaceMemberCount } from "@/lib/data/workspaces";
import type { CreateAgentApiKeyInput, CreateAgentInput, UpdateAgentInput } from "@/lib/domain";
import type { Database } from "@/lib/types/database";

type ServiceClient = SupabaseClient<Database>;

type AgentWithKeys = Database["public"]["Tables"]["agents"]["Row"] & {
  agent_api_keys: Database["public"]["Tables"]["agent_api_keys"]["Row"][];
};

function handleDataError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

export async function listAgents(
  workspaceId: string,
  client: ServiceClient = createSupabaseServiceRoleClient(),
) {
  const { data, error } = await client
    .from("agents")
    .select("*, agent_api_keys(*)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  handleDataError(error);
  return (data ?? []) as AgentWithKeys[];
}

export async function createAgent(
  workspaceId: string,
  input: CreateAgentInput,
  client: ServiceClient = createSupabaseServiceRoleClient(),
) {
  const { data, error } = await client
    .from("agents")
    .insert({
      workspace_id: workspaceId,
      ...input,
    })
    .select("*")
    .single();

  handleDataError(error);
  if (!data) {
    throw new Error("Agent insert returned no row.");
  }
  return data;
}

export async function updateAgent(
  workspaceId: string,
  id: string,
  patch: UpdateAgentInput,
  client: ServiceClient = createSupabaseServiceRoleClient(),
) {
  const { data, error } = await client
    .from("agents")
    .update(patch)
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .select("*")
    .single();

  handleDataError(error);
  if (!data) {
    throw new Error("Agent update returned no row.");
  }
  return data;
}

export async function createAgentApiKey(
  workspaceId: string,
  agentId: string,
  input: CreateAgentApiKeyInput,
  client: ServiceClient = createSupabaseServiceRoleClient(),
) {
  const env = getServerEnv();
  const generated = generateApiKey(env.API_KEY_PREFIX);
  const { data: agent, error: agentError } = await client
    .from("agents")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("id", agentId)
    .maybeSingle();

  handleDataError(agentError);
  if (!agent) {
    throw new ApiError({
      code: "not_found",
      message: "Agent not found in this workspace.",
      status: 404,
    });
  }

  const { data, error } = await client
    .from("agent_api_keys")
    .insert({
      workspace_id: workspaceId,
      agent_id: agentId,
      label: input.label,
      scopes: input.scopes,
      key_hash: generated.keyHash,
      key_last4: generated.keyLast4,
      key_prefix: generated.keyPrefix,
    })
    .select("*")
    .single();

  handleDataError(error);
  if (!data) {
    throw new Error("API key insert returned no row.");
  }

  return {
    key: generated.rawKey,
    record: data,
  };
}

export async function revokeAgentApiKey(
  workspaceId: string,
  apiKeyId: string,
  client: ServiceClient = createSupabaseServiceRoleClient(),
) {
  const { data, error } = await client
    .from("agent_api_keys")
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId)
    .eq("id", apiKeyId)
    .select("*")
    .single();

  handleDataError(error);
  if (!data) {
    throw new Error("API key revoke returned no row.");
  }
  return data;
}

export async function authenticateAgentRequest(
  request: Request,
  requiredScopes: readonly string[] = [],
  client: ServiceClient = createSupabaseServiceRoleClient(),
) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    throw new ApiError({
      code: "unauthorized",
      message: "Missing Bearer token.",
      status: 401,
    });
  }

  const rawKey = authorization.slice(7).trim();
  return authenticateAgentToken(rawKey, requiredScopes, client);
}

export async function authenticateAgentToken(
  rawKey: string,
  requiredScopes: readonly string[] = [],
  client: ServiceClient = createSupabaseServiceRoleClient(),
) {
  const keyHash = hashApiKey(rawKey);

  const { data, error } = await client
    .from("agent_api_keys")
    .select("*, agent:agents(*)")
    .eq("key_hash", keyHash)
    .maybeSingle();

  handleDataError(error);

  const record = data as ApiKeyRecord | null;

  try {
    assertApiKeyAccess(record, requiredScopes);
  } catch (authError) {
    throw new ApiError({
      code: "unauthorized",
      message:
        authError instanceof Error ? authError.message : "The API key is not authorized.",
      status: 401,
    });
  }

  const env = getServerEnv();
  const { data: withinLimit, error: rateLimitError } = await client.rpc(
    "consume_api_rate_limit",
    {
      p_api_key_id: record!.id,
      p_limit: env.API_RATE_LIMIT_PER_MINUTE,
    },
  );

  handleDataError(rateLimitError);
  if (!withinLimit) {
    throw new ApiError({
      code: "rate_limited",
      message: "Rate limit exceeded for this API key.",
      status: 429,
    });
  }

  const now = new Date().toISOString();

  await Promise.all([
    client.from("agent_api_keys").update({ last_used_at: now }).eq("id", record!.id),
    client.from("agents").update({ last_used_at: now }).eq("id", record!.agent.id),
  ]);

  return {
    workspaceId: record!.workspace_id,
    agent: record!.agent,
    apiKey: {
      id: record!.id,
      label: record!.label,
      scopes: record!.scopes,
      keyPrefix: record!.key_prefix,
      keyLast4: record!.key_last4,
      lastUsedAt: now,
    },
  };
}

export async function getAdminSummary(
  workspaceId: string,
  client: ServiceClient = createSupabaseServiceRoleClient(),
) {
  const [agentCount, activeAgentCount, keyCount, memberCount] = await Promise.all([
    client
      .from("agents")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    client
      .from("agents")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("is_active", true),
    client
      .from("agent_api_keys")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("is_active", true),
    getWorkspaceMemberCount(workspaceId, client),
  ]);

  handleDataError(agentCount.error);
  handleDataError(activeAgentCount.error);
  handleDataError(keyCount.error);

  return {
    totalAgents: agentCount.count ?? 0,
    activeAgents: activeAgentCount.count ?? 0,
    activeKeys: keyCount.count ?? 0,
    activeMembers: memberCount,
  };
}

export async function signInAdmin(email: string, password: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    throw new ApiError({
      code: "invalid_login",
      message: "Invalid email or password.",
      status: 401,
    });
  }

  await ensureUserAccountSetup(data.user);
  return data.user;
}

export async function signOutAdmin() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
