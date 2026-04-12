import { getTodo, updateTodo, deleteTodo } from "@/lib/data/todos";
import { authenticateAgentRequest } from "@/lib/data/agents";
import { ApiError, jsonData, jsonError, parseJsonBody } from "@/lib/http/api";
import { updateTodoSchema } from "@/lib/domain";

async function resolveId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return id;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateAgentRequest(request, ["todos:read"]);
    const todo = await getTodo(auth.workspaceId, await resolveId(context));

    if (!todo) {
      throw new ApiError({
        code: "not_found",
        message: "Todo not found.",
        status: 404,
      });
    }

    return jsonData({ todo });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateAgentRequest(request, ["todos:write"]);
    const patch = await parseJsonBody(request, updateTodoSchema);
    const todo = await updateTodo(
      auth.workspaceId,
      await resolveId(context),
      patch,
      { actorType: "agent", actorId: auth.agent.id },
    );
    return jsonData({ todo });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateAgentRequest(request, ["todos:write"]);
    await deleteTodo(auth.workspaceId, await resolveId(context), {
      actorType: "agent",
      actorId: auth.agent.id,
    });
    return jsonData({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
