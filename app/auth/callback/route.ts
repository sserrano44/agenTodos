import { NextRequest, NextResponse } from "next/server";

import { getSafeAppRedirect } from "@/lib/auth/redirects";
import { ensureUserAccountSetup } from "@/lib/data/workspaces";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = getSafeAppRedirect(request.nextUrl.searchParams.get("next"), "/admin/todos");
  const loginUrl = new URL("/login?error=oauth_callback", request.url);

  if (!code) {
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(loginUrl);
  }

  await ensureUserAccountSetup(data.user, createSupabaseServiceRoleClient());

  return NextResponse.redirect(new URL(next, request.url));
}
