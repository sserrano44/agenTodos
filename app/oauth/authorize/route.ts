import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSession } from "@/lib/auth/admin";
import {
  createOAuthAuthorizationCode,
  escapeHtml,
  formatOAuthScope,
  getMcpResourceUrl,
  isValidOAuthRedirectUri,
  parseOAuthScope,
} from "@/lib/auth/oauth";
import { getSafeAppRedirect } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const authorizationRequestSchema = z.object({
  response_type: z.literal("code"),
  client_id: z.string().min(1),
  redirect_uri: z.string().min(1),
  state: z.string().optional(),
  scope: z.string().optional(),
  code_challenge: z.string().min(1),
  code_challenge_method: z.string().default("S256"),
  resource: z.string().optional(),
});

function getNormalizedAuthorizationRequest(input: Record<string, string>) {
  const parsed = authorizationRequestSchema.parse(input);

  if (!isValidOAuthRedirectUri(parsed.redirect_uri)) {
    throw new Response("Invalid redirect_uri", { status: 400 });
  }

  const resource = parsed.resource ?? getMcpResourceUrl();
  if (resource !== getMcpResourceUrl()) {
    throw new Response("Invalid resource", { status: 400 });
  }

  return {
    ...parsed,
    resource,
  };
}

function buildAuthorizeLoginRedirect(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "next",
    getSafeAppRedirect(`${request.nextUrl.pathname}${request.nextUrl.search}`, "/admin/todos"),
  );
  return NextResponse.redirect(loginUrl, {
    status: request.method === "POST" ? 303 : 307,
  });
}

function buildClientRedirect(
  redirectUri: string,
  params: Record<string, string | undefined>,
) {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  return NextResponse.redirect(url, 303);
}

function renderConsentPage(input: {
  clientId: string;
  redirectUri: string;
  state?: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  resource: string;
  workspaceName: string;
  email: string;
}) {
  const scopeLabels = formatOAuthScope(parseOAuthScope(input.scope)).replaceAll(" ", ", ");

  const hiddenFields = [
    ["response_type", "code"],
    ["client_id", input.clientId],
    ["redirect_uri", input.redirectUri],
    ["state", input.state ?? ""],
    ["scope", input.scope],
    ["code_challenge", input.codeChallenge],
    ["code_challenge_method", input.codeChallengeMethod],
    ["resource", input.resource],
  ]
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Authorize Agent Todos MCP</title>
    <style>
      :root { color-scheme: light; font-family: ui-sans-serif, system-ui, sans-serif; }
      body { margin: 0; background: #f6f8fb; color: #0f172a; }
      main { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      .card { width: min(100%, 620px); background: white; border: 1px solid #dbe3ef; border-radius: 24px; box-shadow: 0 24px 80px -48px rgba(15, 23, 42, 0.35); padding: 28px; }
      h1 { margin: 0 0 12px; font-size: 32px; line-height: 1.1; }
      p { margin: 0 0 16px; color: #475569; font-size: 16px; line-height: 1.6; }
      dl { margin: 20px 0; display: grid; grid-template-columns: 120px 1fr; gap: 10px 16px; }
      dt { color: #64748b; font-weight: 600; }
      dd { margin: 0; word-break: break-word; }
      .actions { margin-top: 28px; display: flex; gap: 12px; flex-wrap: wrap; }
      button { border: 0; border-radius: 999px; padding: 12px 18px; font: inherit; font-weight: 600; cursor: pointer; }
      .approve { background: #0f766e; color: white; }
      .deny { background: #e2e8f0; color: #0f172a; }
      .muted { font-size: 14px; color: #64748b; margin-top: 18px; }
    </style>
  </head>
  <body>
    <main>
      <div class="card">
        <h1>Connect Agent Todos</h1>
        <p>Authorize this MCP client to use your Agent Todos workspace tools.</p>
        <dl>
          <dt>Workspace</dt>
          <dd>${escapeHtml(input.workspaceName)}</dd>
          <dt>Signed in as</dt>
          <dd>${escapeHtml(input.email)}</dd>
          <dt>Client</dt>
          <dd>${escapeHtml(input.clientId)}</dd>
          <dt>Scopes</dt>
          <dd>${escapeHtml(scopeLabels)}</dd>
        </dl>
        <form method="POST">
          ${hiddenFields}
          <div class="actions">
            <button class="approve" type="submit" name="decision" value="approve">Allow access</button>
            <button class="deny" type="submit" name="decision" value="deny">Deny</button>
          </div>
        </form>
        <p class="muted">Agent Todos will issue an OAuth token scoped to the currently active admin workspace.</p>
      </div>
    </main>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  const session = await getAdminSession();

  if (!user) {
    return buildAuthorizeLoginRedirect(request);
  }

  if (!session) {
    return new Response("Workspace admin access is required to authorize this connector.", {
      status: 403,
    });
  }

  const input = getNormalizedAuthorizationRequest(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );

  return renderConsentPage({
    clientId: input.client_id,
    redirectUri: input.redirect_uri,
    state: input.state,
    scope: input.scope ?? "",
    codeChallenge: input.code_challenge,
    codeChallengeMethod: input.code_challenge_method,
    resource: input.resource,
    workspaceName: session.activeWorkspace.name,
    email: session.user.email ?? "unknown",
  });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const session = await getAdminSession();

  if (!session) {
    return buildAuthorizeLoginRedirect(request);
  }

  const decision = formData.get("decision")?.toString();
  const input = getNormalizedAuthorizationRequest(
    Object.fromEntries(
      Array.from(formData.entries()).map(([key, value]) => [key, value.toString()]),
    ),
  );

  if (decision !== "approve") {
    return buildClientRedirect(input.redirect_uri, {
      error: "access_denied",
      state: input.state,
    });
  }

  const scope = parseOAuthScope(input.scope);
  const code = await createOAuthAuthorizationCode({
    userId: session.user.id,
    workspaceId: session.activeWorkspace.id,
    clientId: input.client_id,
    redirectUri: input.redirect_uri,
    scope,
    resource: input.resource,
    codeChallenge: input.code_challenge,
    codeChallengeMethod: input.code_challenge_method,
  });

  return buildClientRedirect(input.redirect_uri, {
    code,
    state: input.state,
  });
}
