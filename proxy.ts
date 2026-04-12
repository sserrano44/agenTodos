import { type NextRequest, NextResponse } from "next/server";

import { resolveAdminRouteAccess } from "@/lib/core/admin-guard";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { supabase, response } = await updateSession(request);

  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;

  if (user) {
    const { data: membership } = await supabase
      .from("workspace_memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .in("role", ["owner", "admin"])
      .maybeSingle();

    isAdmin = Boolean(membership);
  }

  const access = resolveAdminRouteAccess({
    pathname: request.nextUrl.pathname,
    hasSession: Boolean(user),
    isAdmin,
  });

  if (access.allow) {
    return response;
  }

  return NextResponse.redirect(new URL(access.redirectTo, request.url));
}

export const config = {
  matcher: ["/admin/:path*"],
};
