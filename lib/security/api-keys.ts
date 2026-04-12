import { createHash, randomBytes } from "node:crypto";

import type { Database } from "@/lib/types/database";

export type ApiKeyRecord = Database["public"]["Tables"]["agent_api_keys"]["Row"] & {
  agent: Database["public"]["Tables"]["agents"]["Row"];
};

export function hashApiKey(rawKey: string) {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function generateApiKey(prefix = "atd") {
  const publicPart = randomBytes(4).toString("hex");
  const secret = randomBytes(24).toString("base64url");
  const rawKey = `${prefix}_${publicPart}_${secret}`;

  return {
    rawKey,
    keyHash: hashApiKey(rawKey),
    keyPrefix: rawKey.slice(0, 12),
    keyLast4: rawKey.slice(-4),
  };
}

export function assertApiKeyAccess(
  record: ApiKeyRecord | null,
  requiredScopes: readonly string[],
) {
  if (!record) {
    throw new Error("API key not found.");
  }

  if (!record.is_active || record.revoked_at) {
    throw new Error("API key is inactive.");
  }

  if (!record.agent.is_active) {
    throw new Error("Agent is inactive.");
  }

  const missingScopes = requiredScopes.filter(
    (scope) => !record.scopes.includes(scope as (typeof record.scopes)[number]),
  );

  if (missingScopes.length > 0) {
    throw new Error(`Missing required scopes: ${missingScopes.join(", ")}`);
  }

  return record;
}

