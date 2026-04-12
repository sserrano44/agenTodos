import type { SupabaseClient, User } from "@supabase/supabase-js";

import { WORKSPACE_ROLES } from "@/lib/constants";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "@/lib/types/database";

type ServiceClient = SupabaseClient<Database>;

export type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];
export type WorkspaceRow = Database["public"]["Tables"]["workspaces"]["Row"];
export type WorkspaceMembershipRow =
  Database["public"]["Tables"]["workspace_memberships"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type WorkspaceMembershipWithWorkspace = WorkspaceMembershipRow & {
  workspace: WorkspaceRow;
};

export function isWorkspaceAdminRole(role: WorkspaceRole) {
  return role === "owner" || role === "admin";
}

export function getPreferredWorkspaceMembership(
  memberships: WorkspaceMembershipWithWorkspace[],
  requestedWorkspaceId?: string | null,
) {
  if (requestedWorkspaceId) {
    const requested = memberships.find(
      (membership) =>
        membership.workspace_id === requestedWorkspaceId &&
        isWorkspaceAdminRole(membership.role),
    );

    if (requested) {
      return requested;
    }
  }

  return memberships.find((membership) => isWorkspaceAdminRole(membership.role)) ?? null;
}

function handleDataError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function getUserDisplayName(user: User) {
  return (
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.user_metadata?.user_name ??
    user.email?.split("@")[0] ??
    "Workspace"
  );
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function ensureUserAccountSetup(
  user: User,
  client: ServiceClient = createSupabaseServiceRoleClient(),
) {
  const email = user.email ?? "";
  const displayName = getUserDisplayName(user);
  const avatarUrl =
    user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null;

  const { error: profileError } = await client.from("profiles").upsert({
    user_id: user.id,
    email,
    display_name: displayName,
    avatar_url: avatarUrl,
    last_sign_in_at: new Date().toISOString(),
  });

  handleDataError(profileError);

  const { data: existingMembership } = await client
    .from("workspace_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (existingMembership) {
    return;
  }

  const slugBase = slugify(`${displayName}-workspace`) || "workspace";
  const workspace = await client
    .from("workspaces")
    .insert({
      name: `${displayName} Workspace`,
      slug: `${slugBase}-${user.id.slice(0, 8)}`,
      created_by_user_id: user.id,
    })
    .select("*")
    .single();

  handleDataError(workspace.error);
  if (!workspace.data) {
    throw new Error("Workspace insert returned no row.");
  }

  const { error: membershipError } = await client
    .from("workspace_memberships")
    .insert({
      workspace_id: workspace.data.id,
      user_id: user.id,
      role: "owner",
      is_active: true,
    });

  handleDataError(membershipError);
}

export async function listWorkspaceMemberships(
  userId: string,
  client: ServiceClient = createSupabaseServiceRoleClient(),
) {
  const { data, error } = await client
    .from("workspace_memberships")
    .select("*, workspace:workspaces(*)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .in("role", [...WORKSPACE_ROLES])
    .order("created_at", { ascending: true });

  handleDataError(error);

  return (data ?? []) as WorkspaceMembershipWithWorkspace[];
}

export async function getWorkspaceMemberCount(
  workspaceId: string,
  client: ServiceClient = createSupabaseServiceRoleClient(),
) {
  const { count, error } = await client
    .from("workspace_memberships")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("is_active", true);

  handleDataError(error);
  return count ?? 0;
}

export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
  client: ServiceClient = createSupabaseServiceRoleClient(),
) {
  const { error } = await client.from("workspace_memberships").upsert({
    workspace_id: workspaceId,
    user_id: userId,
    role,
    is_active: true,
  });

  handleDataError(error);
}
