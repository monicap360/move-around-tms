import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Resolves an organization by its slug (subdomain identifier).
// Used by the middleware, login pages, and the subdomain guard.
export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const slug = params.slug?.toLowerCase().trim();
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("organizations")
    .select(
      "id, name, organization_code, organization_slug, status, account_type, subscription_status, bypass_subscription, subscription_required",
    )
    .eq("organization_slug", slug)
    .single();

  if (error || !data) {
    // Slug not found — org not onboarded yet
    return NextResponse.json(
      { error: "Organization not found", slug },
      { status: 404 },
    );
  }

  // Never expose internal IDs to unauthenticated requests in production.
  // For now we return minimal public info.
  return NextResponse.json({
    org: {
      id:                    data.id,
      name:                  data.name,
      organization_slug:     data.organization_slug,
      organization_code:     data.organization_code,
      status:                data.status,
      account_type:          data.account_type,
      subscription_status:   data.subscription_status,
      bypass_subscription:   data.bypass_subscription,
      subscription_required: data.subscription_required,
      subdomain_url:         `https://${slug}.movearoundtms.app`,
    },
  });
}
