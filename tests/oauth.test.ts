import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { getSafeAppRedirect } from "@/lib/auth/redirects";
import {
  buildMcpOauthChallengeResponse,
  formatOAuthScope,
  getOAuthProtectedResourceMetadataUrl,
  OAUTH_SUPPORTED_SCOPES,
  parseOAuthScope,
  verifyPkceCodeVerifier,
} from "@/lib/auth/oauth";

function toS256Challenge(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}

process.env.NEXT_PUBLIC_APP_URL = "https://agentodos.vercel.app";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "service-role-key";

describe("OAuth helpers", () => {
  it("parses and formats supported scopes", () => {
    const scope = parseOAuthScope("todos:read mcp:use todos:read");

    expect(scope).toEqual(["todos:read", "mcp:use"]);
    expect(formatOAuthScope(scope)).toBe("todos:read mcp:use");
  });

  it("defaults to all supported scopes when omitted", () => {
    expect(parseOAuthScope(undefined)).toEqual([...OAUTH_SUPPORTED_SCOPES]);
  });

  it("rejects unsupported scopes", () => {
    expect(() => parseOAuthScope("todos:read admin:root")).toThrow(
      "Unsupported scopes requested: admin:root",
    );
  });

  it("verifies a valid PKCE code verifier", () => {
    const verifier = "pkce-verifier-123";

    expect(() =>
      verifyPkceCodeVerifier(verifier, toS256Challenge(verifier), "S256"),
    ).not.toThrow();
  });

  it("rejects invalid PKCE values and methods", () => {
    expect(() => verifyPkceCodeVerifier("wrong", "mismatch", "S256")).toThrow(
      "The PKCE code verifier is invalid.",
    );
    expect(() =>
      verifyPkceCodeVerifier("verifier", toS256Challenge("verifier"), "plain"),
    ).toThrow("Only S256 PKCE challenges are supported.");
  });

  it("builds an MCP auth challenge response with resource metadata", async () => {
    const response = buildMcpOauthChallengeResponse("Use OAuth.");
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toContain(
      getOAuthProtectedResourceMetadataUrl(),
    );
    expect(body).toEqual({
      error: "invalid_token",
      error_description: "Use OAuth.",
    });
  });
});

describe("safe app redirects", () => {
  it("allows local app-relative and same-origin redirects", () => {
    expect(getSafeAppRedirect("/admin/settings")).toBe("/admin/settings");
    expect(
      getSafeAppRedirect("https://agentodos.vercel.app/admin/todos?view=list"),
    ).toBe(
      "/admin/todos?view=list",
    );
  });

  it("rejects external or malformed redirects", () => {
    expect(getSafeAppRedirect("https://evil.example.com/steal")).toBe("/admin/todos");
    expect(getSafeAppRedirect("javascript:alert(1)")).toBe("/admin/todos");
  });
});
