"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/lib/types/database";

type AgentApiKey = Database["public"]["Tables"]["agent_api_keys"]["Row"];

export function AgentKeyManager({
  agentId,
  keys,
}: {
  agentId: string;
  keys: AgentApiKey[];
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState<string[]>(["todos:read", "todos:write", "mcp:use"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createKey() {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/agents/${agentId}/keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ label, scopes }),
      });

      const json = (await response.json()) as {
        data?: { key: string };
        error?: { message: string };
      };

      if (!response.ok || !json.data) {
        throw new Error(json.error?.message ?? "Unable to create API key.");
      }

      setGeneratedKey(json.data.key);
      setLabel("");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to create API key.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function revokeKey(keyId: string) {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/keys/${keyId}/revoke`, {
        method: "POST",
      });

      const json = (await response.json()) as {
        error?: { message: string };
      };

      if (!response.ok) {
        throw new Error(json.error?.message ?? "Unable to revoke API key.");
      }

      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to revoke API key.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleScope(scope: string) {
    setScopes((current) =>
      current.includes(scope)
        ? current.filter((entry) => entry !== scope)
        : [...current, scope],
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {generatedKey ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
          <div className="font-semibold">API key created</div>
          <div className="mt-2 break-all font-[var(--font-mono)] text-xs">{generatedKey}</div>
          <div className="mt-3 flex items-center gap-3">
            <CopyButton value={generatedKey} label="Copy key" />
            <span className="text-xs text-emerald-800/80">
              This full secret is shown only once.
            </span>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-background/70 p-4">
        <input
          className="h-10 rounded-2xl border border-border bg-background px-4 text-sm outline-none"
          placeholder="Key label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {["todos:read", "todos:write", "mcp:use"].map((scope) => (
            <label
              key={scope}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium"
            >
              <input
                type="checkbox"
                checked={scopes.includes(scope)}
                onChange={() => toggleScope(scope)}
              />
              {scope}
            </label>
          ))}
        </div>
        <Button
          type="button"
          onClick={createKey}
          disabled={isSubmitting || !label.trim() || scopes.length === 0}
        >
          {isSubmitting ? "Working..." : "Generate API key"}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {keys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
            No API keys for this agent yet.
          </div>
        ) : (
          keys.map((key) => (
            <div
              key={key.id}
              className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-background/70 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{key.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {key.key_prefix}••••{key.key_last4}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {key.scopes.map((scope) => (
                    <Badge key={scope} variant="outline">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <div>
                  Created {new Date(key.created_at).toLocaleString()}
                  {key.last_used_at ? ` • Last used ${new Date(key.last_used_at).toLocaleString()}` : ""}
                </div>
                {key.revoked_at ? (
                  <Badge variant="danger">Revoked</Badge>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => revokeKey(key.id)}
                    disabled={isSubmitting}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
