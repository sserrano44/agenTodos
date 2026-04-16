import { describe, expect, it } from "vitest";

import { parseTodoCreateFormData } from "@/lib/forms";

describe("todo form parsing", () => {
  it("normalizes blank optional string fields to null", () => {
    const formData = new FormData();
    formData.set("title", "Review schedule drift");
    formData.set("description", "");
    formData.set("status", "todo");
    formData.set("priority", "medium");
    formData.set("source", "manual");
    formData.set("external_id", "");
    formData.set("due_at", "");
    formData.set("scheduled_for", "");
    formData.set("tags", "");
    formData.set("metadata", "");

    const parsed = parseTodoCreateFormData(formData);

    expect(parsed.description).toBeNull();
    expect(parsed.external_id).toBeNull();
  });
});
