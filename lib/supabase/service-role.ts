import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

let serviceClient: ReturnType<typeof createClient<Database>> | null = null;

export function createSupabaseServiceRoleClient() {
  if (serviceClient) return serviceClient;
  const env = getServerEnv();

  serviceClient = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return serviceClient;
}
