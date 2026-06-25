import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import supabaseAdmin from "@/lib/supabaseAdmin";

// Single source of truth for the caller's organization (tenant isolation).
//
// Replaces the per-route `const getOrgId = () => process.env.RONYX_ORG_ID`.
// Using a global env var means every request resolves to ONE org (single-tenant).
// This resolver instead derives the org from the authenticated user, so each
// tenant only ever resolves to its own organization.
//
// Migration is flag-gated so nothing breaks mid-conversion:
//   • RONYX_AUTH_REQUIRED != "true" (current/demo): returns RONYX_ORG_ID, exactly
//     preserving today's single-tenant behavior. Converting routes to this helper
//     is therefore a no-op until the flag flips.
//   • RONYX_AUTH_REQUIRED == "true": resolves from the logged-in user's
//     profiles.organization_id → strict per-tenant isolation everywhere at once.
//
// Returns null when the org can't be resolved (no auth / no profile); callers
// already guard with `if (!orgId) return 400`.

const AUTH_REQUIRED = process.env.RONYX_AUTH_REQUIRED === "true";

export async function resolveOrgId(): Promise<string | null> {
  if (!AUTH_REQUIRED) {
    return process.env.RONYX_ORG_ID ?? null;
  }

  try {
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* read-only in route handlers */ },
        },
      }
    );

    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    return profile?.organization_id ?? null;
  } catch {
    return null;
  }
}
