import { ApiError } from "@/lib/http/api";
import { createAgentSchema, createTodoSchema, updateTodoSchema } from "@/lib/domain";
import { parseCommaSeparatedTags } from "@/lib/utils";

function parseOptionalIsoDateTime(value: FormDataEntryValue | null) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError({
      code: "validation_error",
      message: `Invalid datetime value: ${raw}`,
      status: 422,
    });
  }

  return date.toISOString();
}

function parseOptionalJson(value: FormDataEntryValue | null) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return {};

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new ApiError({
      code: "validation_error",
      message: "Metadata must be valid JSON.",
      status: 422,
    });
  }
}

export function parseTodoCreateFormData(formData: FormData) {
  return createTodoSchema.parse({
    title: formData.get("title"),
    description: formData.get("description"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    source: formData.get("source"),
    external_id: formData.get("external_id"),
    due_at: parseOptionalIsoDateTime(formData.get("due_at")),
    scheduled_for: parseOptionalIsoDateTime(formData.get("scheduled_for")),
    tags: parseCommaSeparatedTags(formData.get("tags")?.toString()),
    metadata: parseOptionalJson(formData.get("metadata")),
  });
}

export function parseTodoUpdateFormData(formData: FormData) {
  return updateTodoSchema.parse({
    title: formData.get("title"),
    description: formData.get("description"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    source: formData.get("source"),
    external_id: formData.get("external_id"),
    due_at: parseOptionalIsoDateTime(formData.get("due_at")),
    scheduled_for: parseOptionalIsoDateTime(formData.get("scheduled_for")),
    tags: parseCommaSeparatedTags(formData.get("tags")?.toString()),
    metadata: parseOptionalJson(formData.get("metadata")),
  });
}

export function parseAgentCreateFormData(formData: FormData) {
  return createAgentSchema.parse({
    name: formData.get("name"),
    source_type: formData.get("source_type"),
    description: formData.get("description"),
    is_active: formData.get("is_active") === "on",
  });
}
