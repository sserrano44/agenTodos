import { todoListFiltersSchema } from "@/lib/domain";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeDateTime(value: string | undefined) {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

export function parseTodoFiltersInput(
  input: Record<string, string | string[] | undefined>,
) {
  return todoListFiltersSchema.parse({
    status: firstValue(input.status),
    source: firstValue(input.source),
    priority: firstValue(input.priority),
    due_before: normalizeDateTime(firstValue(input.due_before)),
    due_after: normalizeDateTime(firstValue(input.due_after)),
    search: firstValue(input.search),
    sort: firstValue(input.sort),
  });
}

export function getSearchParam(
  input: Record<string, string | string[] | undefined>,
  key: string,
) {
  return firstValue(input[key]);
}
