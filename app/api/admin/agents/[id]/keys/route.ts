import { createAgentApiKeySchema } from "@/lib/domain";
import { requireAdminApiSession } from "@/lib/auth/admin";
import { createAgentApiKey } from "@/lib/data/agents";
import { jsonData, jsonError, parseJsonBody } from "@/lib/http/api";

async function resolveId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return id;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminApiSession();
    const body = await parseJsonBody(request, createAgentApiKeySchema);
    const result = await createAgentApiKey(
      session.activeWorkspace.id,
      await resolveId(context),
      body,
    );
    return jsonData({
      key: result.key,
      apiKey: result.record,
    });
  } catch (error) {
    return jsonError(error);
  }
}
