
import { createClient } from "@supabase/supabase-js";

function createSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const supabase = createSupabaseServerClient();

export default supabase;
export { createSupabaseServerClient };
