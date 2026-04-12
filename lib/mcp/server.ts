import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { createSupabaseTodoStore } from "@/lib/data/todos";
import {
  completeTodoInputSchema,
  createMcpToolHandlers,
  createTodoInputSchema,
  deleteTodoInputSchema,
  getTodoInputSchema,
  listTodosInputSchema,
  mcpTodoSchema,
  updateTodoInputSchema,
  upsertTodoInputSchema,
} from "@/lib/mcp/handlers";
import type { Database } from "@/lib/types/database";

const todoResponseSchema = z.object({
  todo: mcpTodoSchema,
});

const listTodosResponseSchema = z.object({
  todos: z.array(mcpTodoSchema),
});

function asText(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function buildMcpServer(agent: Database["public"]["Tables"]["agents"]["Row"]) {
  const env = getServerEnv();
  const server = new McpServer(
    {
      name: env.MCP_SERVER_NAME,
      version: "0.1.0",
    },
    {
      capabilities: {
        logging: {},
      },
    },
  );

  const handlers = createMcpToolHandlers(createSupabaseTodoStore(agent.workspace_id), {
    actorType: "agent",
    actorId: agent.id,
  });

  server.registerTool(
    "list_todos",
    {
      description: "List todos with filters for status, source, priority, due date, and search.",
      inputSchema: listTodosInputSchema,
      outputSchema: listTodosResponseSchema,
    },
    async (args) => {
      const result = await handlers.listTodos(args);
      return {
        structuredContent: result,
        content: [{ type: "text", text: asText(result) }],
      };
    },
  );

  server.registerTool(
    "get_todo",
    {
      description: "Fetch one todo by UUID.",
      inputSchema: getTodoInputSchema,
      outputSchema: todoResponseSchema,
    },
    async (args) => {
      const result = await handlers.getTodo(args);
      return {
        structuredContent: result,
        content: [{ type: "text", text: asText(result) }],
      };
    },
  );

  server.registerTool(
    "create_todo",
    {
      description: "Create a new todo item.",
      inputSchema: createTodoInputSchema,
      outputSchema: todoResponseSchema,
    },
    async (args) => {
      const result = await handlers.createTodo(args);
      return {
        structuredContent: result,
        content: [{ type: "text", text: asText(result) }],
      };
    },
  );

  server.registerTool(
    "update_todo",
    {
      description: "Apply a partial update to an existing todo.",
      inputSchema: updateTodoInputSchema,
      outputSchema: todoResponseSchema,
    },
    async (args) => {
      const result = await handlers.updateTodo(args);
      return {
        structuredContent: result,
        content: [{ type: "text", text: asText(result) }],
      };
    },
  );

  server.registerTool(
    "complete_todo",
    {
      description: "Mark a todo as done and set completed_at.",
      inputSchema: completeTodoInputSchema,
      outputSchema: todoResponseSchema,
    },
    async (args) => {
      const result = await handlers.completeTodo(args);
      return {
        structuredContent: result,
        content: [{ type: "text", text: asText(result) }],
      };
    },
  );

  server.registerTool(
    "delete_todo",
    {
      description: "Delete a todo permanently.",
      inputSchema: deleteTodoInputSchema,
      outputSchema: z.object({ success: z.boolean() }),
    },
    async (args) => {
      const result = await handlers.deleteTodo(args);
      return {
        structuredContent: result,
        content: [{ type: "text", text: asText(result) }],
      };
    },
  );

  server.registerTool(
    "upsert_todo_from_source",
    {
      description:
        "Create or update a todo idempotently using source + external_id.",
      inputSchema: upsertTodoInputSchema,
      outputSchema: todoResponseSchema,
    },
    async (args) => {
      const result = await handlers.upsertTodoFromSource(args);
      return {
        structuredContent: result,
        content: [{ type: "text", text: asText(result) }],
      };
    },
  );

  return server;
}

export function createMcpTransport() {
  return new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
}
