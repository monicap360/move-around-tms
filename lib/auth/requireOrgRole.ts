import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OrgRecord = {
  id: string;
  name: string;
  organization_code?: string;
  status?: string;
  account_type?: string;
  subscription_status?: string;
  bypass_subscription?: boolean;
  subscription_required?: boolean;
  pilot_ends_at?: string;
};

export type ProfileRecord = {
  id: string;
  organization_id: string;
  role: string;
  email?: string;
  full_name?: string;
};

export type RequireOrgRoleResult =
  | {
      ok: true;
      supabase: ReturnType<typeof createSupabaseServerClient>;
      user: { id: string; email?: string };
      profile: ProfileRecord;
      organization: OrgRecord;
    }
  | { ok: false; response: NextResponse };

const DEFAULT_ALLOWED_ROLES = ["owner", "super_admin", "admin", "manager"];

// When RONYX_AUTH_REQUIRED=true in Render env, real user auth is enforced.
// Until then, demo bypass is active so existing routes keep working.
const AUTH_REQUIRED = process.env.RONYX_AUTH_REQUIRED === "true";

export async function requireOrgRole(
  allowedRoles: string[] = DEFAULT_ALLOWED_ROLES
): Promise<RequireOrgRoleResult> {
  const supabase = createSupabaseServerClient();

  // ── Demo / single-tenant bypass ──────────────────────────────────────────────
  // Remove this block and set RONYX_AUTH_REQUIRED=true in Render once login is stable.
  if (!AUTH_REQUIRED) {
    const envOrgId = process.env.RONYX_ORG_ID;
    const orFilter = envOrgId
      ? `id.eq.${envOrgId},organization_code.eq.RONYX`
      : `organization_code.eq.RONYX`;

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select(
        "id, name, organization_code, status, account_type, subscription_status, bypass_subscription, subscription_required, pilot_ends_at"
      )
      .or(orFilter)
      .limit(1)
      .single();

    if (orgErr || !org) {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: "Organization not found." },
          { status: 403 }
        ),
      };
    }

    return {
      ok: true,
      supabase,
      user:    { id: "demo", email: "demo@ronyx.movearoundtms.com" },
      profile: {
        id:              "demo",
        organization_id: org.id,
        role:            "owner",
        email:           "demo@ronyx.movearoundtms.com",
        full_name:       "Ronyx Demo",
      },
      organization: org,
    };
  }

  // ── Real auth path ────────────────────────────────────────────────────────────
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: { user }, error: userError } = await authClient.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Not authenticated." },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, organization_id, role, email, full_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.organization_id) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "User profile or organization not found." },
        { status: 403 }
      ),
    };
  }

  const role = String(profile.role || "").toLowerCase();
  const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

  if (!normalizedAllowed.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "You do not have permission to perform this action." },
        { status: 403 }
      ),
    };
  }

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select(
      "id, name, organization_code, status, account_type, subscription_status, bypass_subscription, subscription_required, pilot_ends_at"
    )
    .eq("id", profile.organization_id)
    .single();

  if (orgError || !organization) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Organization not found." },
        { status: 403 }
      ),
    };
  }

  return { ok: true, supabase, user: { id: user.id, email: user.email }, profile, organization };
}
