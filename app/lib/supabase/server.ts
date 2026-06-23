// All 171 server-side API routes call createSupabaseServerClient().
// Previously this created its own client using SUPABASE_SERVICE_ROLE_KEY,
// which could diverge from supabaseAdmin's SUPABASE_SERVICE_KEY resolution
// and produce "Invalid API key" if those two env vars held different values.
// Now we delegate to supabaseAdmin so there is exactly one client and one
// env var resolution path across the entire codebase.
import supabaseAdmin from "@/lib/supabaseAdmin";

function createSupabaseServerClient() {
  return supabaseAdmin;
}

export { createSupabaseServerClient };
