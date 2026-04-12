import { describe, expect, it } from "vitest";

import { assertApiKeyAccess, generateApiKey, hashApiKey, type ApiKeyRecord } from "@/lib/security/api-keys";

function buildRecord(overrides: Partial<ApiKeyRecord> = {}): ApiKeyRecord {
  return {
    id: "key-1",
    agent_id: "agent-1",
    workspace_id: "workspace-1",
    label: "Default",
    key_prefix: "atd_abcd",
    key_last4: "wxyz",
    key_hash: "hash",
    scopes: ["todos:read", "todos:write", "mcp:use"],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_used_at: null,
    revoked_at: null,
    agent: {
      id: "agent-1",
      workspace_id: "workspace-1",
      name: "Agent",
      source_type: "custom",
      description: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_used_at: null,
    },
    ...overrides,
  };
}

describe("API key auth helpers", () => {
  it("generates hashable API keys", () => {
    const generated = generateApiKey("atd");
    expect(generated.rawKey.startsWith("atd_")).toBe(true);
    expect(hashApiKey(generated.rawKey)).toBe(generated.keyHash);
  });

  it("accepts valid active keys with required scopes", () => {
    const record = buildRecord();
    expect(assertApiKeyAccess(record, ["todos:read"])).toBe(record);
  });

  it("rejects missing scopes", () => {
    const record = buildRecord({ scopes: ["todos:read"] });
    expect(() => assertApiKeyAccess(record, ["todos:write"])).toThrow(
      "Missing required scopes",
    );
  });

  it("rejects revoked or inactive keys", () => {
    expect(() =>
      assertApiKeyAccess(buildRecord({ revoked_at: new Date().toISOString() }), []),
    ).toThrow("inactive");
    expect(() =>
      assertApiKeyAccess(
        buildRecord({ agent: { ...buildRecord().agent, is_active: false } }),
        [],
      ),
    ).toThrow("Agent is inactive");
  });
});
