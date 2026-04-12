export const TODO_STATUSES = [
  "todo",
  "in_progress",
  "done",
  "blocked",
  "archived",
] as const;

export const TODO_PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent",
] as const;

export const TODO_SOURCES = [
  "claude_cowork",
  "openclaw",
  "manual",
  "api",
  "mcp",
] as const;

export const AGENT_SOURCE_TYPES = [
  "claude_cowork",
  "openclaw",
  "custom",
] as const;

export const API_KEY_SCOPES = [
  "todos:read",
  "todos:write",
  "mcp:use",
] as const;

export const WORKSPACE_ROLES = ["owner", "admin", "member"] as const;

export const STATUS_LABELS: Record<(typeof TODO_STATUSES)[number], string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  blocked: "Blocked",
  archived: "Archived",
};

export const PRIORITY_LABELS: Record<(typeof TODO_PRIORITIES)[number], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const SOURCE_LABELS: Record<(typeof TODO_SOURCES)[number], string> = {
  claude_cowork: "Claude Cowork",
  openclaw: "OpenClaw",
  manual: "Manual",
  api: "API",
  mcp: "MCP",
};
