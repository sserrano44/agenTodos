import { createHash, randomBytes } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { API_KEY_SCOPES } from "@/lib/constants";
import { getServerEnv } from "@/lib/env";
import { ApiError } from "@/lib/http/api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "@/lib/types/database";

type ServiceClient = SupabaseClient<Database>;
type AuthorizationCodeRow = Database["public"]["Tables"]["oauth_authorization_codes"]["Row"];
type RefreshTokenRow = Database["public"]["Tables"]["oauth_refresh_tokens"]["Row"];
type AccessTokenRow = Database["public"]["Tables"]["oauth_access_tokens"]["Row"];

export const OAUTH_SUPPORTED_SCOPES = [...API_KEY_SCOPES] as const;

const AUTHORIZATION_CODE_TTL_MS = 10 * 60 * 1000;
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function handleDataError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

function base64UrlSha256(input: string) {
  return createHash("sha256").update(input).digest("base64url");
}

function generateOpaqueSecret(prefix: string) {
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}

export function getOAuthIssuerUrl() {
  return getServerEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}

export function getMcpResourceUrl() {
  return `${getOAuthIssuerUrl()}/api/mcp`;
}

export function getOAuthProtectedResourceMetadataUrl() {
  return `${getOAuthIssuerUrl()}/.well-known/oauth-protected-resource`;
}

export function getOAuthAuthorizationEndpoint() {
  return `${getOAuthIssuerUrl()}/oauth/authorize`;
}

export function getOAuthTokenEndpoint() {
  return `${getOAuthIssuerUrl()}/oauth/token`;
}

export function parseOAuthScope(scope: string | null | undefined) {
  if (!scope?.trim()) {
    return [...OAUTH_SUPPORTED_SCOPES];
  }

  const requested = Array.from(new Set(scope.trim().split(/\s+/)));
  const invalid = requested.filter(
    (entry) => !OAUTH_SUPPORTED_SCOPES.includes(entry as (typeof OAUTH_SUPPORTED_SCOPES)[number]),
  );

  if (invalid.length > 0) {
    throw new ApiError({
      code: "invalid_scope",
      message: `Unsupported scopes requested: ${invalid.join(", ")}`,
      status: 400,
    });
  }

  return requested;
}

export function formatOAuthScope(scope: string[]) {
  return scope.join(" ");
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function isValidOAuthRedirectUri(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") {
      return true;
    }

    return url.protocol === "http:" && url.hostname === "localhost";
  } catch {
    return value.startsWith("claude://");
  }
}

export function verifyPkceCodeVerifier(codeVerifier: string, codeChallenge: string, method: string) {
  if (method !== "S256") {
    throw new ApiError({
      code: "invalid_request",
      message: "Only S256 PKCE challenges are supported.",
      status: 400,
    });
  }

  if (base64UrlSha256(codeVerifier) !== codeChallenge) {
    throw new ApiError({
      code: "invalid_grant",
      message: "The PKCE code verifier is invalid.",
      status: 400,
    });
  }
}

export function getOAuthProtectedResourceMetadata() {
  return {
    resource: getMcpResourceUrl(),
    authorization_servers: [getOAuthIssuerUrl()],
    bearer_methods_supported: ["header"],
    scopes_supported: [...OAUTH_SUPPORTED_SCOPES],
  };
}

export function getOAuthAuthorizationServerMetadata() {
  return {
    issuer: getOAuthIssuerUrl(),
    authorization_endpoint: getOAuthAuthorizationEndpoint(),
    token_endpoint: getOAuthTokenEndpoint(),
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: [...OAUTH_SUPPORTED_SCOPES],
    client_id_metadata_document_supported: true,
  };
}

export function buildMcpOauthChallengeResponse(message = "Authorization required.") {
  return new Response(
    JSON.stringify({
      error: "invalid_token",
      error_description: message,
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": `Bearer realm="Agent Todos MCP", resource_metadata="${getOAuthProtectedResourceMetadataUrl()}"`,
      },
    },
  );
}

export async function createOAuthAuthorizationCode(
  input: {
    userId: string;
    workspaceId: string;
    clientId: string;
    redirectUri: string;
    scope: string[];
    resource: string;
    codeChallenge: string;
    codeChallengeMethod: string;
  },
  client: ServiceClient = createSupabaseServiceRoleClient(),
) {
  const rawCode = generateOpaqueSecret("atc");
  const { error } = await client.from("oauth_authorization_codes").insert({
    code_hash: hashSecret(rawCode),
    user_id: input.userId,
    workspace_id: input.workspaceId,
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    scope: input.scope,
    resource: input.resource,
    code_challenge: input.codeChallenge,
    code_challenge_method: input.codeChallengeMethod,
    expires_at: new Date(Date.now() + AUTHORIZATION_CODE_TTL_MS).toISOString(),
  });

  handleDataError(error);
  return rawCode;
}

export async function consumeOAuthAuthorizationCode(
  input: {
    code: string;
    clientId: string;
    redirectUri: string;
    resource: string;
  },
  client: ServiceClient = createSupabaseServiceRoleClient(),
) {
  const { data, error } = await client
    .from("oauth_authorization_codes")
    .select("*")
    .eq("code_hash", hashSecret(input.code))
    .maybeSingle();

  handleDataError(error);
  const record = data as AuthorizationCodeRow | null;

  if (!record) {
    throw new ApiError({
      code: "invalid_grant",
      message: "Authorization code not found.",
      status: 400,
    });
  }

  if (record.used_at || new Date(record.expires_at).getTime() < Date.now()) {
    throw new ApiError({
      code: "invalid_grant",
      message: "Authorization code is expired or already used.",
      status: 400,
    });
  }

  if (
    record.client_id !== input.clientId ||
    record.redirect_uri !== input.redirectUri ||
    record.resource !== input.resource
  ) {
    throw new ApiError({
      code: "invalid_grant",
      message: "Authorization code parameters do not match the original request.",
      status: 400,
    });
  }

  const { error: updateError } = await client
    .from("oauth_authorization_codes")
    .update({
      used_at: new Date().toISOString(),
    })
    .eq("id", record.id);

  handleDataError(updateError);

  return record;
}

export async function issueOAuthTokens(
  input: {
    userId: string;
    workspaceId: string;
    clientId: string;
    scope: string[];
    resource: string;
  },
  client: ServiceClient = createSupabaseServiceRoleClient(),
) {
  const rawAccessToken = generateOpaqueSecret("ata");
  const rawRefreshToken = generateOpaqueSecret("atr");

  const refreshInsert = await client
    .from("oauth_refresh_tokens")
    .insert({
      refresh_token_hash: hashSecret(rawRefreshToken),
      user_id: input.userId,
      workspace_id: input.workspaceId,
      client_id: input.clientId,
      scope: input.scope,
      resource: input.resource,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString(),
    })
    .select("*")
    .single();

  handleDataError(refreshInsert.error);
  const refreshRecord = refreshInsert.data as RefreshTokenRow | null;

  if (!refreshRecord) {
    throw new Error("Refresh token insert returned no row.");
  }

  const accessInsert = await client
    .from("oauth_access_tokens")
    .insert({
      access_token_hash: hashSecret(rawAccessToken),
      refresh_token_id: refreshRecord.id,
      user_id: input.userId,
      workspace_id: input.workspaceId,
      client_id: input.clientId,
      scope: input.scope,
      resource: input.resource,
      expires_at: new Date(Date.now() + ACCESS_TOKEN_TTL_MS).toISOString(),
    })
    .select("*")
    .single();

  handleDataError(accessInsert.error);
  const accessRecord = accessInsert.data as AccessTokenRow | null;

  if (!accessRecord) {
    throw new Error("Access token insert returned no row.");
  }

  return {
    accessToken: rawAccessToken,
    refreshToken: rawRefreshToken,
    accessTokenExpiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    scope: input.scope,
  };
}

export async function exchangeOAuthRefreshToken(
  input: {
    refreshToken: string;
    clientId: string;
    scope?: string[];
  },
  client: ServiceClient = createSupabaseServiceRoleClient(),
) {
  const { data, error } = await client
    .from("oauth_refresh_tokens")
    .select("*")
    .eq("refresh_token_hash", hashSecret(input.refreshToken))
    .maybeSingle();

  handleDataError(error);
  const record = data as RefreshTokenRow | null;

  if (!record) {
    throw new ApiError({
      code: "invalid_grant",
      message: "Refresh token not found.",
      status: 400,
    });
  }

  if (
    record.revoked_at ||
    new Date(record.expires_at).getTime() < Date.now() ||
    record.client_id !== input.clientId
  ) {
    throw new ApiError({
      code: "invalid_grant",
      message: "Refresh token is expired, revoked, or invalid for this client.",
      status: 400,
    });
  }

  const requestedScope = input.scope?.length ? input.scope : record.scope;
  const unauthorizedScopes = requestedScope.filter((entry) => !record.scope.includes(entry));
  if (unauthorizedScopes.length > 0) {
    throw new ApiError({
      code: "invalid_scope",
      message: `Requested scopes exceed the original grant: ${unauthorizedScopes.join(", ")}`,
      status: 400,
    });
  }

  const { error: updateError } = await client
    .from("oauth_refresh_tokens")
    .update({
      last_used_at: new Date().toISOString(),
    })
    .eq("id", record.id);

  handleDataError(updateError);

  return issueOAuthTokens(
    {
      userId: record.user_id,
      workspaceId: record.workspace_id,
      clientId: record.client_id,
      scope: requestedScope,
      resource: record.resource,
    },
    client,
  );
}

export async function authenticateOAuthAccessToken(
  rawAccessToken: string,
  requiredScopes: readonly string[] = [],
  client: ServiceClient = createSupabaseServiceRoleClient(),
) {
  const { data, error } = await client
    .from("oauth_access_tokens")
    .select("*")
    .eq("access_token_hash", hashSecret(rawAccessToken))
    .maybeSingle();

  handleDataError(error);
  const record = data as AccessTokenRow | null;

  if (!record) {
    return null;
  }

  if (record.revoked_at || new Date(record.expires_at).getTime() < Date.now()) {
    throw new ApiError({
      code: "unauthorized",
      message: "The OAuth access token is expired or revoked.",
      status: 401,
    });
  }

  const missingScopes = requiredScopes.filter((scope) => !record.scope.includes(scope));
  if (missingScopes.length > 0) {
    throw new ApiError({
      code: "forbidden",
      message: `Missing required scopes: ${missingScopes.join(", ")}`,
      status: 403,
    });
  }

  if (record.resource !== getMcpResourceUrl()) {
    throw new ApiError({
      code: "unauthorized",
      message: "The access token audience does not match this MCP resource.",
      status: 401,
    });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await client
    .from("oauth_access_tokens")
    .update({
      last_used_at: now,
    })
    .eq("id", record.id);

  handleDataError(updateError);

  return {
    userId: record.user_id,
    workspaceId: record.workspace_id,
    scope: record.scope,
    clientId: record.client_id,
    lastUsedAt: now,
  };
}
