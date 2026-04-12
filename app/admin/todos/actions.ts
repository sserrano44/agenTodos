"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/admin";
import {
  completeTodo,
  createTodo,
  deleteTodo,
  reopenTodo,
  updateTodo,
} from "@/lib/data/todos";
import { parseTodoCreateFormData, parseTodoUpdateFormData } from "@/lib/forms";
import { ApiError } from "@/lib/http/api";

function redirectWithError(message: string): never {
  redirect(`/admin/todos?error=${encodeURIComponent(message)}`);
}

export async function saveTodoAction(formData: FormData) {
  const session = await requireAdminSession();
  const workspaceId = session.activeWorkspace.id;
  const actor = { actorType: "admin" as const, actorId: session.user.id };
  const todoId = formData.get("id")?.toString();

  try {
    if (todoId) {
      const input = parseTodoUpdateFormData(formData);
      await updateTodo(workspaceId, todoId, input, actor);
    } else {
      const input = parseTodoCreateFormData(formData);
      await createTodo(workspaceId, input, actor);
    }
  } catch (error) {
    const message =
      error instanceof ApiError || error instanceof Error
        ? error.message
        : "Unable to save the todo.";

    redirectWithError(message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/todos");
  redirect("/admin/todos");
}

export async function toggleTodoCompletionAction(formData: FormData) {
  const session = await requireAdminSession();
  const workspaceId = session.activeWorkspace.id;
  const actor = { actorType: "admin" as const, actorId: session.user.id };
  const todoId = formData.get("id")?.toString();
  const currentStatus = formData.get("current_status")?.toString();

  if (!todoId || !currentStatus) {
    redirectWithError("Todo action is missing required fields.");
  }

  try {
    if (currentStatus === "done") {
      await reopenTodo(workspaceId, todoId, actor);
    } else {
      await completeTodo(workspaceId, todoId, actor);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update todo completion state.";
    redirectWithError(message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/todos");
  redirect("/admin/todos");
}

export async function deleteTodoAction(formData: FormData) {
  const session = await requireAdminSession();
  const workspaceId = session.activeWorkspace.id;
  const actor = { actorType: "admin" as const, actorId: session.user.id };
  const todoId = formData.get("id")?.toString();

  if (!todoId) {
    redirectWithError("Missing todo id.");
  }

  try {
    await deleteTodo(workspaceId, todoId, actor);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete todo.";
    redirectWithError(message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/todos");
  redirect("/admin/todos");
}
