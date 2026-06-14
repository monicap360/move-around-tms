import { createClient } from "@supabase/supabase-js";

function createSupabaseServerClient() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const roleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
                || process.env.SUPABASE_SERVICE_KEY!;
  return createClient(url, roleKey);
}

export { createSupabaseServerClient };
