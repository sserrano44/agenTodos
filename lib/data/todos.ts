import type { SupabaseClient } from "@supabase/supabase-js";

import {
  completeTodo as completeTodoService,
  createTodo as createTodoService,
  deleteTodo as deleteTodoService,
  getTodo as getTodoService,
  listTodos as listTodosService,
  reopenTodo as reopenTodoService,
  type TodoEventActor,
  type TodoStore,
  updateTodo as updateTodoService,
  upsertTodoFromSource as upsertTodoFromSourceService,
} from "@/lib/core/todo-service";
import type {
  CreateTodoInput,
  TodoListFilters,
  UpdateTodoInput,
  UpsertTodoInput,
} from "@/lib/domain";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "@/lib/types/database";
import { compactObject } from "@/lib/utils";

type ServiceClient = SupabaseClient<Database>;
type TodoRow = Database["public"]["Tables"]["todos"]["Row"];

function sanitizeSearchTerm(value: string) {
  return value.replaceAll(",", " ").trim();
}

function handleDataError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

export function createSupabaseTodoStore(
  workspaceId: string,
  client: ServiceClient = createSupabaseServiceRoleClient(),
): TodoStore {
  return {
    async list(filters) {
      let query = client.from("todos").select("*").eq("workspace_id", workspaceId);

      if (filters.status) query = query.eq("status", filters.status);
      if (filters.source) query = query.eq("source", filters.source);
      if (filters.priority) query = query.eq("priority", filters.priority);
      if (filters.due_before) query = query.lte("due_at", filters.due_before);
      if (filters.due_after) query = query.gte("due_at", filters.due_after);
      if (filters.search) {
        const search = sanitizeSearchTerm(filters.search);
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      switch (filters.sort) {
        case "created_at_asc":
          query = query.order("created_at", { ascending: true });
          break;
        case "due_at_asc":
          query = query.order("due_at", { ascending: true, nullsFirst: false });
          break;
        case "due_at_desc":
          query = query.order("due_at", { ascending: false, nullsFirst: false });
          break;
        case "created_at_desc":
        default:
          query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query.limit(100);
      handleDataError(error);
      return data ?? [];
    },
    async get(id) {
      const { data, error } = await client
        .from("todos")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .maybeSingle();

      handleDataError(error);
      return data;
    },
    async create(input) {
      const { data, error } = await client
        .from("todos")
        .insert({
          workspace_id: workspaceId,
          ...input,
        })
        .select("*")
        .single();

      handleDataError(error);
      if (!data) {
        throw new Error("Todo insert returned no row.");
      }
      return data;
    },
    async update(id, patch) {
      const { data, error } = await client
        .from("todos")
        .update(compactObject(patch))
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .select("*")
        .single();

      handleDataError(error);
      if (!data) {
        throw new Error("Todo update returned no row.");
      }
      return data;
    },
    async remove(id) {
      const { error } = await client
        .from("todos")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("id", id);
      handleDataError(error);
    },
    async findBySourceExternalId(source, externalId) {
      const { data, error } = await client
        .from("todos")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("source", source)
        .eq("external_id", externalId)
        .maybeSingle();

      handleDataError(error);
      return data;
    },
    async recordEvent(input) {
      const { error } = await client.from("todo_events").insert({
        workspace_id: workspaceId,
        todo_id: input.todoId,
        actor_type: input.actor.actorType,
        actor_id: input.actor.actorId ?? null,
        event_type: input.eventType,
        payload:
          (input.payload ?? {}) as Database["public"]["Tables"]["todo_events"]["Insert"]["payload"],
      });

      handleDataError(error);
    },
  };
}

export async function listTodos(
  workspaceId: string,
  filters: TodoListFilters,
  store = createSupabaseTodoStore(workspaceId),
) {
  return listTodosService(store, filters);
}

export async function getTodo(
  workspaceId: string,
  id: string,
  store = createSupabaseTodoStore(workspaceId),
) {
  return getTodoService(store, id);
}

export async function createTodo(
  workspaceId: string,
  input: CreateTodoInput & { agent_id?: string | null },
  actor: TodoEventActor,
  store = createSupabaseTodoStore(workspaceId),
) {
  return createTodoService(store, input, actor);
}

export async function updateTodo(
  workspaceId: string,
  id: string,
  patch: UpdateTodoInput,
  actor: TodoEventActor,
  store = createSupabaseTodoStore(workspaceId),
) {
  return updateTodoService(store, id, patch, actor);
}

export async function completeTodo(
  workspaceId: string,
  id: string,
  actor: TodoEventActor,
  store = createSupabaseTodoStore(workspaceId),
) {
  return completeTodoService(store, id, actor);
}

export async function reopenTodo(
  workspaceId: string,
  id: string,
  actor: TodoEventActor,
  store = createSupabaseTodoStore(workspaceId),
) {
  return reopenTodoService(store, id, actor);
}

export async function deleteTodo(
  workspaceId: string,
  id: string,
  actor: TodoEventActor,
  store = createSupabaseTodoStore(workspaceId),
) {
  return deleteTodoService(store, id, actor);
}

export async function upsertTodoFromSource(
  workspaceId: string,
  input: UpsertTodoInput & { agent_id?: string | null },
  actor: TodoEventActor,
  store = createSupabaseTodoStore(workspaceId),
) {
  return upsertTodoFromSourceService(store, input, actor);
}

export async function getTodoDashboardSummary(
  workspaceId: string,
  client: ServiceClient = createSupabaseServiceRoleClient(),
) {
  const totalPromise = client
    .from("todos")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  const recentPromise = client
    .from("todos")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(5);

  const [total, recent] = await Promise.all([totalPromise, recentPromise]);
  handleDataError(total.error);
  handleDataError(recent.error);

  const statusCounts = await Promise.all(
    ["todo", "in_progress", "done", "blocked", "archived"].map(async (status) => {
      const { count, error } = await client
        .from("todos")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", status as TodoRow["status"]);

      handleDataError(error);
      return [status, count ?? 0] as const;
    }),
  );

  const sourceCounts = await Promise.all(
    ["claude_cowork", "openclaw", "manual", "api", "mcp"].map(async (source) => {
      const { count, error } = await client
        .from("todos")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("source", source as TodoRow["source"]);

      handleDataError(error);
      return [source, count ?? 0] as const;
    }),
  );

  return {
    total: total.count ?? 0,
    recent: recent.data ?? [],
    byStatus: Object.fromEntries(statusCounts) as Record<TodoRow["status"], number>,
    bySource: Object.fromEntries(sourceCounts) as Record<TodoRow["source"], number>,
  };
}
