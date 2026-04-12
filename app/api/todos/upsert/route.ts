import { upsertTodoSchema, todoSourceSchema } from "@/lib/domain";
import { authenticateAgentRequest } from "@/lib/data/agents";
import { upsertTodoFromSource } from "@/lib/data/todos";
import { jsonData, jsonError, parseJsonBody } from "@/lib/http/api";

const apiUpsertTodoSchema = upsertTodoSchema.omit({ source: true }).extend({
  source: todoSourceSchema.default("api"),
});

export async function POST(request: Request) {
  try {
    const auth = await authenticateAgentRequest(request, ["todos:write"]);
    const body = await parseJsonBody(request, apiUpsertTodoSchema);
    const todo = await upsertTodoFromSource(
      auth.workspaceId,
      {
        ...body,
        agent_id: auth.agent.id,
      },
      { actorType: "agent", actorId: auth.agent.id },
    );

    return jsonData({ todo });
  } catch (error) {
    return jsonError(error);
  }
}
