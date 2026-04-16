import type { Route } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/login-form";
import { getSafeAppRedirect } from "@/lib/auth/redirects";
import { getAdminSession } from "@/lib/auth/admin";
import { getSearchParam } from "@/lib/query-parsers";

function resolveLoginError(code: string | undefined) {
  switch (code) {
    case "oauth_callback":
      return "Unable to complete social sign-in. Check your Supabase OAuth provider settings and callback URL.";
    case "admin_required":
      return "You need an active workspace admin membership to access this area.";
    default:
      return null;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getAdminSession();
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialError = resolveLoginError(getSearchParam(resolvedSearchParams, "error"));
  const next = getSafeAppRedirect(getSearchParam(resolvedSearchParams, "next"), "/admin/todos");

  if (session) {
    redirect(next as Route);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <LoginForm initialError={initialError} next={next} />
    </main>
  );
}
