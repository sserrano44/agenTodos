"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { getSafeAppRedirect } from "@/lib/auth/redirects";
import { ApiError } from "@/lib/http/api";
import { signInAdmin, signOutAdmin } from "@/lib/data/agents";

export type LoginActionState = {
  error: string | null;
};

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const next = getSafeAppRedirect(formData.get("next")?.toString(), "/admin/todos");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    await signInAdmin(email, password);
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }

    return { error: "Unable to sign in right now." };
  }

  redirect(next as Route);
}

export async function logoutAction() {
  await signOutAdmin();
  redirect("/login");
}
