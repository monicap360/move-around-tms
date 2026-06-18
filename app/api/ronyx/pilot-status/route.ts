import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkPilotAccess } from "@/lib/ronyx/pilotAccess";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const orgId = process.env.RONYX_ORG_ID || "00000000-0000-0000-0000-000000000001";

  let org: Record<string, unknown> | null = null;
  try {
    const { data } = await supabase
      .from("organizations")
      .select("id, name, status, account_type, subscription_status, bypass_subscription, subscription_required, pilot_started_at, pilot_ends_at, pilot_notes")
      .or(`id.eq.${orgId},organization_code.eq.RONYX`)
      .limit(1)
      .single();
    org = data;
  } catch { /* org not found or columns not migrated yet — treated as no pilot */ }

  const pilot = checkPilotAccess(org);

  return NextResponse.json({
    org_id:       org?.id ?? orgId,
    org_name:     org?.name ?? "Ronyx",
    ...pilot,
    pilot_ends_at: pilot.pilotEndsAt?.toISOString() ?? null,
    pilotEndsAt:   undefined,
  });
}
