import { NextRequest } from "next/server";

import { createTodoSchema, todoListFiltersSchema, todoSourceSchema } from "@/lib/domain";
import { authenticateAgentRequest } from "@/lib/data/agents";
import { createTodo, listTodos } from "@/lib/data/todos";
import { ApiError, jsonData, jsonError, parseJsonBody } from "@/lib/http/api";

const apiCreateTodoSchema = createTodoSchema.omit({ source: true }).extend({
  source: todoSourceSchema.default("api"),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAgentRequest(request, ["todos:read"]);
    const filters = todoListFiltersSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    const todos = await listTodos(auth.workspaceId, filters);
    return jsonData({ todos });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateAgentRequest(request, ["todos:write"]);
    const body = await parseJsonBody(request, apiCreateTodoSchema);
    const todo = await createTodo(
      auth.workspaceId,
      {
        ...body,
        agent_id: auth.agent.id,
      },
      { actorType: "agent", actorId: auth.agent.id },
    );

    return jsonData({ todo }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
