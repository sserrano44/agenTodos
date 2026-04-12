import { z } from "zod";

import {
  AGENT_SOURCE_TYPES,
  API_KEY_SCOPES,
  TODO_PRIORITIES,
  TODO_SOURCES,
  TODO_STATUSES,
} from "@/lib/constants";

const nullableTrimmedString = z
  .string()
  .trim()
  .min(1)
  .optional()
  .nullable()
  .transform((value) => value ?? null);

const metadataSchema = z.record(z.string(), z.unknown()).default({});

export const todoStatusSchema = z.enum(TODO_STATUSES);
export const todoPrioritySchema = z.enum(TODO_PRIORITIES);
export const todoSourceSchema = z.enum(TODO_SOURCES);
export const agentSourceTypeSchema = z.enum(AGENT_SOURCE_TYPES);
export const apiKeyScopeSchema = z.enum(API_KEY_SCOPES);

export const todoListFiltersSchema = z.object({
  status: todoStatusSchema.optional(),
  source: todoSourceSchema.optional(),
  priority: todoPrioritySchema.optional(),
  due_before: z.string().datetime().optional(),
  due_after: z.string().datetime().optional(),
  search: z.string().trim().min(1).optional(),
  sort: z
    .enum(["created_at_desc", "created_at_asc", "due_at_asc", "due_at_desc"])
    .default("created_at_desc"),
});

export const createTodoSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: nullableTrimmedString,
  status: todoStatusSchema.default("todo"),
  priority: todoPrioritySchema.default("medium"),
  source: todoSourceSchema.default("manual"),
  external_id: nullableTrimmedString,
  due_at: z.string().datetime().optional().nullable().transform((value) => value ?? null),
  scheduled_for: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .transform((value) => value ?? null),
  tags: z.array(z.string().trim().min(1)).default([]),
  metadata: metadataSchema,
});

export const updateTodoSchema = createTodoSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one todo field must be provided.",
);

export const upsertTodoSchema = createTodoSchema.extend({
  source: todoSourceSchema,
  external_id: z.string().trim().min(1),
});

export const createAgentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  source_type: agentSourceTypeSchema,
  description: nullableTrimmedString,
  is_active: z.boolean().default(true),
});

export const updateAgentSchema = createAgentSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one agent field must be provided.",
);

export const createAgentApiKeySchema = z.object({
  label: z.string().trim().min(1).max(120),
  scopes: z.array(apiKeyScopeSchema).min(1),
});

export type TodoListFilters = z.infer<typeof todoListFiltersSchema>;
export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
export type UpsertTodoInput = z.infer<typeof upsertTodoSchema>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type CreateAgentApiKeyInput = z.infer<typeof createAgentApiKeySchema>;

