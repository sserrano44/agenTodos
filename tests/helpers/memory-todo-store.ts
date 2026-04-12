import { randomUUID } from "node:crypto";

import type { TodoStore, TodoRecord, TodoInsert, TodoUpdate } from "@/lib/core/todo-service";
import type { TodoListFilters } from "@/lib/domain";

export class MemoryTodoStore implements TodoStore {
  todos = new Map<string, TodoRecord>();
  events: Array<{
    todoId: string;
    eventType: string;
    actorType: string;
  }> = [];

  async list(filters: TodoListFilters) {
    const items = Array.from(this.todos.values()).filter((todo) => {
      if (filters.status && todo.status !== filters.status) return false;
      if (filters.source && todo.source !== filters.source) return false;
      if (filters.priority && todo.priority !== filters.priority) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const haystack = `${todo.title} ${todo.description ?? ""}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (filters.due_before && todo.due_at && todo.due_at > filters.due_before) return false;
      if (filters.due_after && todo.due_at && todo.due_at < filters.due_after) return false;
      return true;
    });

    const sorted = [...items].sort((left: TodoRecord, right: TodoRecord) => {
      switch (filters.sort) {
        case "created_at_asc":
          return left.created_at.localeCompare(right.created_at);
        case "due_at_asc":
          return (left.due_at ?? "9999").localeCompare(right.due_at ?? "9999");
        case "due_at_desc":
          return (right.due_at ?? "").localeCompare(left.due_at ?? "");
        case "created_at_desc":
        default:
          return right.created_at.localeCompare(left.created_at);
      }
    });

    return sorted;
  }

  async get(id: string) {
    return this.todos.get(id) ?? null;
  }

  async create(input: TodoInsert) {
    const now = new Date().toISOString();
    const todo: TodoRecord = {
      id: input.id ?? randomUUID(),
      workspace_id: "test-workspace",
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "todo",
      priority: input.priority ?? "medium",
      source: input.source ?? "manual",
      external_id: input.external_id ?? null,
      agent_id: input.agent_id ?? null,
      due_at: input.due_at ?? null,
      scheduled_for: input.scheduled_for ?? null,
      tags: input.tags ?? [],
      metadata: input.metadata ?? {},
      created_at: input.created_at ?? now,
      updated_at: input.updated_at ?? now,
      completed_at: input.completed_at ?? null,
    };

    this.todos.set(todo.id, todo);
    return todo;
  }

  async update(id: string, patch: TodoUpdate) {
    const existing = this.todos.get(id);
    if (!existing) {
      throw new Error("Todo not found.");
    }

    const updated: TodoRecord = {
      ...existing,
      ...patch,
      updated_at: new Date().toISOString(),
    };

    this.todos.set(id, updated);
    return updated;
  }

  async remove(id: string) {
    this.todos.delete(id);
  }

  async findBySourceExternalId(source: TodoRecord["source"], externalId: string) {
    return (
      Array.from(this.todos.values()).find(
        (todo) => todo.source === source && todo.external_id === externalId,
      ) ?? null
    );
  }

  async recordEvent(input: {
    todoId: string;
    eventType: string;
    actor: { actorType: "admin" | "agent" | "system"; actorId?: string | null };
  }) {
    this.events.push({
      todoId: input.todoId,
      eventType: input.eventType,
      actorType: input.actor.actorType,
    });
  }
}
