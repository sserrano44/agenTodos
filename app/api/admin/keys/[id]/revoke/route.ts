import { requireAdminApiSession } from "@/lib/auth/admin";
import { revokeAgentApiKey } from "@/lib/data/agents";
import { jsonData, jsonError } from "@/lib/http/api";

async function resolveId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return id;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminApiSession();
    const record = await revokeAgentApiKey(
      session.activeWorkspace.id,
      await resolveId(context),
    );
    return jsonData({ apiKey: record });
  } catch (error) {
    return jsonError(error);
  }
}
