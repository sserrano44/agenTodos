import { redirect } from "next/navigation";

import { ApiError } from "@/lib/http/api";
import {
  ensureUserAccountSetup,
  getPreferredWorkspaceMembership,
  listWorkspaceMemberships,
} from "@/lib/data/workspaces";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAdminSession(requestedWorkspaceId?: string | null) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const serviceClient = createSupabaseServiceRoleClient();

  await ensureUserAccountSetup(user, serviceClient);

  const memberships = await listWorkspaceMemberships(user.id, serviceClient);
  const activeMembership = getPreferredWorkspaceMembership(
    memberships,
    requestedWorkspaceId,
  );

  if (!activeMembership) {
    return null;
  }

  return {
    user,
    activeMembership,
    activeWorkspace: activeMembership.workspace,
    memberships,
    supabase,
  };
}

export async function requireAdminSession(requestedWorkspaceId?: string | null) {
  const session = await getAdminSession(requestedWorkspaceId);

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireAdminApiSession(requestedWorkspaceId?: string | null) {
  const session = await getAdminSession(requestedWorkspaceId);

  if (!session) {
    throw new ApiError({
      code: "forbidden",
      message: "Workspace admin access is required.",
      status: 403,
    });
  }

  return session;
}
