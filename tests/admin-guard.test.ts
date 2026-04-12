import { describe, expect, it } from "vitest";

import { resolveAdminRouteAccess } from "@/lib/core/admin-guard";

describe("resolveAdminRouteAccess", () => {
  it("redirects unauthenticated admin requests to login", () => {
    expect(
      resolveAdminRouteAccess({
        pathname: "/admin/todos",
        hasSession: false,
        isAdmin: false,
      }),
    ).toEqual({
      allow: false,
      redirectTo: "/login",
    });
  });

  it("redirects non-admin users away from admin routes", () => {
    expect(
      resolveAdminRouteAccess({
        pathname: "/admin",
        hasSession: true,
        isAdmin: false,
      }),
    ).toEqual({
      allow: false,
      redirectTo: "/?error=admin_required",
    });
  });

  it("allows authenticated admins through", () => {
    expect(
      resolveAdminRouteAccess({
        pathname: "/admin/settings",
        hasSession: true,
        isAdmin: true,
      }),
    ).toEqual({
      allow: true,
    });
  });
});
