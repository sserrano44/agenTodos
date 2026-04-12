import { describe, expect, it } from "vitest";

import {
  getPreferredWorkspaceMembership,
  isWorkspaceAdminRole,
  type WorkspaceMembershipWithWorkspace,
} from "@/lib/data/workspaces";

function membership(
  overrides: Partial<WorkspaceMembershipWithWorkspace>,
): WorkspaceMembershipWithWorkspace {
  return {
    id: overrides.id ?? "membership-1",
    workspace_id: overrides.workspace_id ?? "workspace-1",
    user_id: overrides.user_id ?? "user-1",
    role: overrides.role ?? "owner",
    is_active: overrides.is_active ?? true,
    created_at: overrides.created_at ?? "2026-04-12T00:00:00.000Z",
    updated_at: overrides.updated_at ?? "2026-04-12T00:00:00.000Z",
    workspace: overrides.workspace ?? {
      id: overrides.workspace_id ?? "workspace-1",
      name: "Primary Workspace",
      slug: "primary-workspace",
      created_by_user_id: "user-1",
      created_at: "2026-04-12T00:00:00.000Z",
      updated_at: "2026-04-12T00:00:00.000Z",
    },
  };
}

describe("workspace helpers", () => {
  it("treats owner and admin roles as workspace admins", () => {
    expect(isWorkspaceAdminRole("owner")).toBe(true);
    expect(isWorkspaceAdminRole("admin")).toBe(true);
    expect(isWorkspaceAdminRole("member")).toBe(false);
  });

  it("prefers a requested admin workspace when available", () => {
    const memberships = [
      membership({
        id: "membership-a",
        workspace_id: "workspace-a",
        role: "member",
        workspace: {
          id: "workspace-a",
          name: "Viewer Workspace",
          slug: "viewer-workspace",
          created_by_user_id: "user-1",
          created_at: "2026-04-12T00:00:00.000Z",
          updated_at: "2026-04-12T00:00:00.000Z",
        },
      }),
      membership({
        id: "membership-b",
        workspace_id: "workspace-b",
        role: "admin",
        workspace: {
          id: "workspace-b",
          name: "Admin Workspace",
          slug: "admin-workspace",
          created_by_user_id: "user-1",
          created_at: "2026-04-12T00:00:00.000Z",
          updated_at: "2026-04-12T00:00:00.000Z",
        },
      }),
    ];

    expect(getPreferredWorkspaceMembership(memberships, "workspace-b")?.workspace_id).toBe(
      "workspace-b",
    );
    expect(getPreferredWorkspaceMembership(memberships, "workspace-a")?.workspace_id).toBe(
      "workspace-b",
    );
  });
});
