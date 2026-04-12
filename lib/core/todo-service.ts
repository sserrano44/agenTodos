import type { CreateTodoInput, TodoListFilters, UpdateTodoInput, UpsertTodoInput } from "@/lib/domain";
import type { Database } from "@/lib/types/database";

export type TodoRecord = Database["public"]["Tables"]["todos"]["Row"];
export type TodoInsert = Omit<Database["public"]["Tables"]["todos"]["Insert"], "workspace_id">;
export type TodoUpdate = Omit<Database["public"]["Tables"]["todos"]["Update"], "workspace_id">;

export type TodoEventActor = {
  actorType: "admin" | "agent" | "system";
  actorId?: string | null;
};

export interface TodoStore {
  list(filters: TodoListFilters): Promise<TodoRecord[]>;
  get(id: string): Promise<TodoRecord | null>;
  create(input: TodoInsert): Promise<TodoRecord>;
  update(id: string, patch: TodoUpdate): Promise<TodoRecord>;
  remove(id: string): Promise<void>;
  findBySourceExternalId(source: TodoRecord["source"], externalId: string): Promise<TodoRecord | null>;
  recordEvent(input: {
    todoId: string;
    eventType: string;
    actor: TodoEventActor;
    payload?: Record<string, unknown>;
  }): Promise<void>;
}

function normalizeCompletedAt(status: TodoRecord["status"], currentCompletedAt?: string | null) {
  if (status === "done") {
    return currentCompletedAt ?? new Date().toISOString();
  }

  return null;
}

export async function listTodos(store: TodoStore, filters: TodoListFilters) {
  return store.list(filters);
}

export async function getTodo(store: TodoStore, id: string) {
  return store.get(id);
}

export async function createTodo(
  store: TodoStore,
  input: CreateTodoInput & { agent_id?: string | null },
  actor: TodoEventActor,
) {
  const created = await store.create({
    ...input,
    metadata: (input.metadata ?? {}) as Database["public"]["Tables"]["todos"]["Insert"]["metadata"],
    tags: input.tags ?? [],
    completed_at: normalizeCompletedAt(input.status),
  });

  await store.recordEvent({
    todoId: created.id,
    eventType: "created",
    actor,
    payload: { source: created.source },
  });

  return created;
}

export async function updateTodo(
  store: TodoStore,
  id: string,
  patch: UpdateTodoInput,
  actor: TodoEventActor,
) {
  const existing = await store.get(id);
  if (!existing) {
    throw new Error("Todo not found.");
  }

  const nextStatus = patch.status ?? existing.status;
  const updated = await store.update(id, {
    ...patch,
    metadata: patch.metadata as Database["public"]["Tables"]["todos"]["Update"]["metadata"],
    completed_at: normalizeCompletedAt(nextStatus, existing.completed_at),
  });

  await store.recordEvent({
    todoId: updated.id,
    eventType: "updated",
    actor,
    payload: { fields: Object.keys(patch) },
  });

  return updated;
}

export async function completeTodo(store: TodoStore, id: string, actor: TodoEventActor) {
  const existing = await store.get(id);
  if (!existing) {
    throw new Error("Todo not found.");
  }

  const updated = await store.update(id, {
    status: "done",
    completed_at: normalizeCompletedAt("done", existing.completed_at),
  });

  await store.recordEvent({
    todoId: updated.id,
    eventType: "completed",
    actor,
    payload: {},
  });

  return updated;
}

export async function reopenTodo(store: TodoStore, id: string, actor: TodoEventActor) {
  const existing = await store.get(id);
  if (!existing) {
    throw new Error("Todo not found.");
  }

  const updated = await store.update(id, {
    status: "todo",
    completed_at: null,
  });

  await store.recordEvent({
    todoId: updated.id,
    eventType: "reopened",
    actor,
    payload: {},
  });

  return updated;
}

export async function deleteTodo(store: TodoStore, id: string, actor: TodoEventActor) {
  const existing = await store.get(id);
  if (!existing) {
    throw new Error("Todo not found.");
  }

  await store.remove(id);
  await store.recordEvent({
    todoId: id,
    eventType: "deleted",
    actor,
    payload: { title: existing.title },
  });
}

export async function upsertTodoFromSource(
  store: TodoStore,
  input: UpsertTodoInput & { agent_id?: string | null },
  actor: TodoEventActor,
) {
  const existing = await store.findBySourceExternalId(input.source, input.external_id);

  if (!existing) {
    const created = await createTodo(store, input, actor);

    await store.recordEvent({
      todoId: created.id,
      eventType: "upsert_created",
      actor,
      payload: {
        source: created.source,
        external_id: created.external_id,
      },
    });

    return created;
  }

  const updated = await updateTodo(
    store,
    existing.id,
    {
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      due_at: input.due_at,
      scheduled_for: input.scheduled_for,
      tags: input.tags,
      metadata: input.metadata,
    },
    actor,
  );

  await store.recordEvent({
    todoId: updated.id,
    eventType: "upsert_updated",
    actor,
    payload: {
      source: updated.source,
      external_id: updated.external_id,
    },
  });

  return updated;
}
