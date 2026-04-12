"use client";

import { useMemo, useState, useTransition } from "react";
import type { Provider } from "@supabase/supabase-js";
import { ChromeIcon, GithubIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getClientEnv } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const SOCIAL_PROVIDER_CONFIG = {
  github: {
    label: "Continue with GitHub",
    icon: GithubIcon,
  },
  google: {
    label: "Continue with Google",
    icon: ChromeIcon,
  },
} as const;

type SupportedProvider = keyof typeof SOCIAL_PROVIDER_CONFIG;

function isSupportedProvider(value: string): value is SupportedProvider {
  return value in SOCIAL_PROVIDER_CONFIG;
}

export function SocialLoginButtons({ next = "/admin" }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const providers = useMemo(() => {
    return getClientEnv()
      .NEXT_PUBLIC_SOCIAL_AUTH_PROVIDERS.split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(isSupportedProvider);
  }, []);

  if (providers.length === 0) {
    return null;
  }

  function handleOAuthSignIn(provider: SupportedProvider) {
    startTransition(async () => {
      setError(null);

      const redirectTo = new URL("/auth/callback", window.location.origin);
      redirectTo.searchParams.set("next", next);

      const { error: signInError } = await createSupabaseBrowserClient().auth.signInWithOAuth({
        provider: provider as Provider,
        options: {
          redirectTo: redirectTo.toString(),
        },
      });

      if (signInError) {
        setError(signInError.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {providers.map((provider) => {
        const config = SOCIAL_PROVIDER_CONFIG[provider];
        const Icon = config.icon;

        return (
          <Button
            key={provider}
            type="button"
            variant="outline"
            className="w-full justify-center gap-2"
            disabled={isPending}
            onClick={() => handleOAuthSignIn(provider)}
          >
            <Icon className="size-4" />
            {isPending ? "Redirecting..." : config.label}
          </Button>
        );
      })}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
