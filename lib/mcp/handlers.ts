import { z } from "zod";

import {
  completeTodo,
  createTodo,
  deleteTodo,
  getTodo,
  listTodos,
  type TodoRecord,
  type TodoEventActor,
  type TodoStore,
  updateTodo,
  upsertTodoFromSource,
} from "@/lib/core/todo-service";
import {
  createTodoSchema,
  todoListFiltersSchema,
  todoPrioritySchema,
  todoSourceSchema,
  todoStatusSchema,
  updateTodoSchema,
  upsertTodoSchema,
} from "@/lib/domain";

export const mcpTodoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: todoStatusSchema,
  priority: todoPrioritySchema,
  source: todoSourceSchema,
  external_id: z.string().nullable(),
  agent_id: z.string().uuid().nullable(),
  due_at: z.string().nullable(),
  scheduled_for: z.string().nullable(),
  tags: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  updated_at: z.string(),
  completed_at: z.string().nullable(),
});

export const listTodosInputSchema = todoListFiltersSchema;
export const getTodoInputSchema = z.object({
  id: z.string().uuid(),
});
export const createTodoInputSchema = createTodoSchema.omit({ source: true }).extend({
  source: todoSourceSchema.default("mcp"),
});
export const updateTodoInputSchema = z.object({
  id: z.string().uuid(),
  patch: updateTodoSchema,
});
export const completeTodoInputSchema = z.object({
  id: z.string().uuid(),
});
export const deleteTodoInputSchema = z.object({
  id: z.string().uuid(),
});
export const upsertTodoInputSchema = upsertTodoSchema;

function toMcpTodo(todo: TodoRecord) {
  return {
    id: todo.id,
    title: todo.title,
    description: todo.description,
    status: todo.status,
    priority: todo.priority,
    source: todo.source,
    external_id: todo.external_id,
    agent_id: todo.agent_id,
    due_at: todo.due_at,
    scheduled_for: todo.scheduled_for,
    tags: todo.tags ?? [],
    metadata: (todo.metadata ?? {}) as Record<string, unknown>,
    created_at: todo.created_at,
    updated_at: todo.updated_at,
    completed_at: todo.completed_at,
  };
}

export function createMcpToolHandlers(store: TodoStore, actor: TodoEventActor) {
  return {
    async listTodos(input: z.infer<typeof listTodosInputSchema>) {
      const todos = await listTodos(store, listTodosInputSchema.parse(input));
      return { todos: todos.map(toMcpTodo) };
    },
    async getTodo(input: z.infer<typeof getTodoInputSchema>) {
      const todo = await getTodo(store, input.id);
      if (!todo) {
        throw new Error("Todo not found.");
      }

      return { todo: toMcpTodo(todo) };
    },
    async createTodo(input: z.infer<typeof createTodoInputSchema>) {
      const todo = await createTodo(store, createTodoInputSchema.parse(input), actor);
      return { todo: toMcpTodo(todo) };
    },
    async updateTodo(input: z.infer<typeof updateTodoInputSchema>) {
      const todo = await updateTodo(
        store,
        input.id,
        updateTodoInputSchema.shape.patch.parse(input.patch),
        actor,
      );
      return { todo: toMcpTodo(todo) };
    },
    async completeTodo(input: z.infer<typeof completeTodoInputSchema>) {
      const todo = await completeTodo(store, input.id, actor);
      return { todo: toMcpTodo(todo) };
    },
    async deleteTodo(input: z.infer<typeof deleteTodoInputSchema>) {
      await deleteTodo(store, input.id, actor);
      return { success: true };
    },
    async upsertTodoFromSource(input: z.infer<typeof upsertTodoInputSchema>) {
      const todo = await upsertTodoFromSource(store, upsertTodoInputSchema.parse(input), actor);
      return { todo: toMcpTodo(todo) };
    },
  };
}
