import { describe, expect, it } from "vitest";

import { createMcpToolHandlers, mcpTodoSchema } from "@/lib/mcp/handlers";
import { MemoryTodoStore } from "@/tests/helpers/memory-todo-store";

describe("MCP todo handlers", () => {
  it("completes a todo through the shared MCP handler layer", async () => {
    const store = new MemoryTodoStore();
    const handlers = createMcpToolHandlers(store, {
      actorType: "agent",
      actorId: "agent-1",
    });

    const created = await handlers.createTodo({
      title: "MCP task",
      description: null,
      priority: "medium",
      source: "mcp",
      status: "todo",
      external_id: null,
      due_at: null,
      scheduled_for: null,
      tags: [],
      metadata: {},
    });

    const completed = await handlers.completeTodo({ id: created.todo.id });

    expect(completed.todo.status).toBe("done");
    expect(completed.todo.completed_at).not.toBeNull();
  });

  it("returns the public MCP todo shape without internal workspace fields", async () => {
    const store = new MemoryTodoStore();
    const handlers = createMcpToolHandlers(store, {
      actorType: "agent",
      actorId: "agent-1",
    });

    const created = await handlers.createTodo({
      title: "Schema-safe MCP task",
      description: "Should not leak workspace internals.",
      priority: "medium",
      source: "mcp",
      status: "todo",
      external_id: "mcp-safe-1",
      due_at: null,
      scheduled_for: null,
      tags: ["triage"],
      metadata: { upstream: "claude" },
    });

    expect(mcpTodoSchema.parse(created.todo)).toEqual(created.todo);
    expect(created.todo).not.toHaveProperty("workspace_id");
  });
});
