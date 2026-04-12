import { describe, expect, it } from "vitest";

import {
  completeTodo,
  createTodo,
  deleteTodo,
  getTodo,
  listTodos,
  reopenTodo,
  updateTodo,
  upsertTodoFromSource,
} from "@/lib/core/todo-service";
import { MemoryTodoStore } from "@/tests/helpers/memory-todo-store";

const actor = {
  actorType: "agent" as const,
  actorId: "agent-1",
};

describe("todo service", () => {
  it("supports the CRUD happy path", async () => {
    const store = new MemoryTodoStore();

    const created = await createTodo(
      store,
      {
        title: "Initial todo",
        description: "From test",
        status: "todo",
        priority: "medium",
        source: "api",
        external_id: null,
        due_at: null,
        scheduled_for: null,
        tags: ["test"],
        metadata: {},
      },
      actor,
    );

    expect(created.title).toBe("Initial todo");
    expect((await listTodos(store, { sort: "created_at_desc" })).length).toBe(1);

    const updated = await updateTodo(
      store,
      created.id,
      {
        title: "Updated todo",
        status: "in_progress",
      },
      actor,
    );

    expect(updated.title).toBe("Updated todo");
    expect(updated.status).toBe("in_progress");

    const completed = await completeTodo(store, created.id, actor);
    expect(completed.status).toBe("done");
    expect(completed.completed_at).not.toBeNull();

    const reopened = await reopenTodo(store, created.id, actor);
    expect(reopened.status).toBe("todo");
    expect(reopened.completed_at).toBeNull();

    await deleteTodo(store, created.id, actor);
    expect(await getTodo(store, created.id)).toBeNull();
  });

  it("upserts by source and external id", async () => {
    const store = new MemoryTodoStore();

    const first = await upsertTodoFromSource(
      store,
      {
        title: "Import task",
        description: null,
        status: "todo",
        priority: "high",
        source: "openclaw",
        external_id: "oc-1",
        due_at: null,
        scheduled_for: null,
        tags: [],
        metadata: { run: 1 },
      },
      actor,
    );

    const second = await upsertTodoFromSource(
      store,
      {
        title: "Import task updated",
        description: "Changed",
        status: "blocked",
        priority: "urgent",
        source: "openclaw",
        external_id: "oc-1",
        due_at: null,
        scheduled_for: null,
        tags: ["ops"],
        metadata: { run: 2 },
      },
      actor,
    );

    expect(second.id).toBe(first.id);
    expect(second.title).toBe("Import task updated");
    expect(second.status).toBe("blocked");
    expect((await listTodos(store, { sort: "created_at_desc" })).length).toBe(1);
  });
});
