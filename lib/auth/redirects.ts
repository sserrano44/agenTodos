import { getServerEnv } from "@/lib/env";

export function getSafeAppRedirect(candidate: string | null | undefined, fallback = "/admin/todos") {
  if (!candidate) {
    return fallback;
  }

  if (candidate.startsWith("/") && !candidate.startsWith("//")) {
    return candidate;
  }

  try {
    const baseUrl = new URL(getServerEnv().NEXT_PUBLIC_APP_URL);
    const url = new URL(candidate);

    if (url.origin !== baseUrl.origin) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
