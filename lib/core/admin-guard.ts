export function resolveAdminRouteAccess(input: {
  pathname: string;
  hasSession: boolean;
  isAdmin: boolean;
}) {
  const { pathname, hasSession, isAdmin } = input;

  if (!pathname.startsWith("/admin")) {
    return { allow: true as const };
  }

  if (!hasSession) {
    return {
      allow: false as const,
      redirectTo: "/login",
    };
  }

  if (!isAdmin) {
    return {
      allow: false as const,
      redirectTo: "/?error=admin_required",
    };
  }

  return { allow: true as const };
}

