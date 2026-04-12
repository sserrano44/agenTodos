"use client";

import { useActionState } from "react";

import { loginAction, type LoginActionState } from "@/app/login/actions";
import { SocialLoginButtons } from "@/app/login/social-login-buttons";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ initialError = null }: { initialError?: string | null }) {
  const initialState: LoginActionState = {
    error: initialError,
  };
  const [state, action] = useActionState(loginAction, initialState);

  return (
    <Card className="w-full max-w-md border-border/70 bg-background/90">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Use social login or email and password to access your Agent Todos workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-5">
          <SocialLoginButtons />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span className="bg-background px-3">or continue with email</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {state.error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {state.error}
            </div>
          ) : null}
          <SubmitButton className="w-full" pendingText="Signing in...">
            Sign in
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
