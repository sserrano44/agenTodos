import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SOCIAL_AUTH_PROVIDERS: z.string().default("google,github"),
});

const serverEnvSchema = clientEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  API_KEY_PREFIX: z.string().default("atd"),
  API_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),
  MCP_SERVER_NAME: z.string().default("agent-todos"),
});

export function getClientEnv() {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "development-anon-key",
    NEXT_PUBLIC_SOCIAL_AUTH_PROVIDERS:
      process.env.NEXT_PUBLIC_SOCIAL_AUTH_PROVIDERS ?? "google,github",
  });
}

export function getServerEnv() {
  return serverEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SOCIAL_AUTH_PROVIDERS: process.env.NEXT_PUBLIC_SOCIAL_AUTH_PROVIDERS,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    API_KEY_PREFIX: process.env.API_KEY_PREFIX,
    API_RATE_LIMIT_PER_MINUTE: process.env.API_RATE_LIMIT_PER_MINUTE,
    MCP_SERVER_NAME: process.env.MCP_SERVER_NAME,
  });
}
