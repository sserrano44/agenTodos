"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/admin";
import { createAgent, updateAgent } from "@/lib/data/agents";
import { parseAgentCreateFormData } from "@/lib/forms";

function redirectWithError(message: string): never {
  redirect(`/admin/agents?error=${encodeURIComponent(message)}`);
}

export async function createAgentAction(formData: FormData) {
  const session = await requireAdminSession();

  try {
    const input = parseAgentCreateFormData(formData);
    await createAgent(session.activeWorkspace.id, input);
  } catch (error) {
    redirectWithError(error instanceof Error ? error.message : "Unable to create agent.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/agents");
  redirect("/admin/agents");
}

export async function toggleAgentAction(formData: FormData) {
  const session = await requireAdminSession();

  const agentId = formData.get("id")?.toString();
  const nextActive = formData.get("next_active")?.toString();

  if (!agentId || !nextActive) {
    redirectWithError("Missing agent action fields.");
  }

  try {
    await updateAgent(session.activeWorkspace.id, agentId, {
      is_active: nextActive === "true",
    });
  } catch (error) {
    redirectWithError(error instanceof Error ? error.message : "Unable to update agent.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/agents");
  redirect("/admin/agents");
}
