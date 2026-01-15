import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function resolveOrganizationId(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
  requestedOrgId?: string | null,
) {
  if (!requestedOrgId) {
    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .single();
    return orgMember?.organization_id || null;
  }

  const { data: orgMember } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("organization_id", requestedOrgId)
    .single();

  return orgMember?.organization_id || null;
}

function minutesBetween(arrivedAt: string, departedAt: string) {
  const start = new Date(arrivedAt).getTime();
  const end = new Date(departedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 0;
  }
  return Math.round((end - start) / 60000);
}

function calculateClaimAmount(
  totalMinutes: number,
  freeMinutes: number,
  ratePerHour: number,
) {
  const billableMinutes = Math.max(totalMinutes - freeMinutes, 0);
  const amount = (billableMinutes / 60) * ratePerHour;
  return {
    billableMinutes,
    amount: Math.round(amount * 100) / 100,
  };
}

async function loadPolicy(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  organizationId: string,
) {
  const { data } = await supabase
    .from("detention_policies")
    .select("free_minutes, rate_per_hour")
    .eq("organization_id", organizationId)
    .single();

  return {
    free_minutes: data?.free_minutes ?? 60,
    rate_per_hour: data?.rate_per_hour ?? 75,
  };
}

export async function GET(req: NextRequest) {
  try {
    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    if (demoMode) {
      return NextResponse.json({
        events: [
          {
            id: "demo-event-1",
            facility_name: "Border Freight Hub",
            arrived_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            departed_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            total_minutes: 90,
            status: "closed",
            source: "geofence",
            load_reference: "MX-4521",
          },
        ],
      });
    }

    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = await resolveOrganizationId(
      supabase,
      user.id,
      searchParams.get("organization_id"),
    );

    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { data: events, error } = await supabase
      .from("detention_events")
      .select("*")
      .eq("organization_id", organizationId)
      .order("arrived_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ events: events || [] });
  } catch (error: any) {
    console.error("Detention events error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    if (demoMode) {
      return NextResponse.json({ success: true });
    }

    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const organizationId = await resolveOrganizationId(
      supabase,
      user.id,
      body.organization_id,
    );

    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (!body.facility_name || !body.arrived_at) {
      return NextResponse.json(
        { error: "facility_name and arrived_at are required" },
        { status: 400 },
      );
    }

    const totalMinutes =
      body.departed_at && body.arrived_at
        ? minutesBetween(body.arrived_at, body.departed_at)
        : null;
    const status = body.departed_at ? "closed" : "open";

    const { data: event, error } = await supabase
      .from("detention_events")
      .insert({
        organization_id: organizationId,
        facility_name: body.facility_name,
        arrived_at: body.arrived_at,
        departed_at: body.departed_at || null,
        total_minutes: totalMinutes,
        status,
        source: body.source || "manual",
        geofence_id: body.geofence_id || null,
        load_reference: body.load_reference || null,
        ticket_id: body.ticket_id || null,
        carrier_id: body.carrier_id || null,
        driver_id: body.driver_id || null,
        truck_id: body.truck_id || null,
        metadata: body.metadata || {},
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    let claim = null;
    if (status === "closed" && body.create_claim) {
      const policy = await loadPolicy(supabase, organizationId);
      const minutes = totalMinutes || 0;
      const claimCalc = calculateClaimAmount(
        minutes,
        policy.free_minutes,
        policy.rate_per_hour,
      );

      const { data: claimData, error: claimError } = await supabase
        .from("detention_claims")
        .insert({
          organization_id: organizationId,
          detention_event_id: event.id,
          carrier_id: body.carrier_id || null,
          load_reference: body.load_reference || null,
          ticket_id: body.ticket_id || null,
          status: "draft",
          claimed_minutes: claimCalc.billableMinutes,
          free_minutes: policy.free_minutes,
          rate_per_hour: policy.rate_per_hour,
          claim_amount: claimCalc.amount,
          evidence: body.evidence || {},
          photo_urls: body.photo_urls || [],
          created_by: user.id,
        })
        .select("*")
        .single();

      if (claimError) {
        return NextResponse.json({ error: claimError.message }, { status: 400 });
      }
      claim = claimData;
    }

    return NextResponse.json({ event, claim });
  } catch (error: any) {
    console.error("Create detention event error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    if (demoMode) {
      return NextResponse.json({ success: true });
    }

    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (!body.id || !body.departed_at) {
      return NextResponse.json(
        { error: "id and departed_at are required" },
        { status: 400 },
      );
    }

    const { data: existing, error: fetchError } = await supabase
      .from("detention_events")
      .select("organization_id, arrived_at, load_reference, carrier_id, ticket_id")
      .eq("id", body.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const totalMinutes = minutesBetween(existing.arrived_at, body.departed_at);

    const { error: updateError } = await supabase
      .from("detention_events")
      .update({
        departed_at: body.departed_at,
        total_minutes: totalMinutes,
        status: "closed",
      })
      .eq("id", body.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    let claim = null;
    if (body.create_claim) {
      const policy = await loadPolicy(supabase, existing.organization_id);
      const claimCalc = calculateClaimAmount(
        totalMinutes,
        policy.free_minutes,
        policy.rate_per_hour,
      );

      const { data: claimData, error: claimError } = await supabase
        .from("detention_claims")
        .insert({
          organization_id: existing.organization_id,
          detention_event_id: body.id,
          carrier_id: existing.carrier_id || null,
          load_reference: existing.load_reference || null,
          ticket_id: existing.ticket_id || null,
          status: "draft",
          claimed_minutes: claimCalc.billableMinutes,
          free_minutes: policy.free_minutes,
          rate_per_hour: policy.rate_per_hour,
          claim_amount: claimCalc.amount,
          evidence: body.evidence || {},
          photo_urls: body.photo_urls || [],
          created_by: user.id,
        })
        .select("*")
        .single();

      if (claimError) {
        return NextResponse.json({ error: claimError.message }, { status: 400 });
      }
      claim = claimData;
    }

    return NextResponse.json({ success: true, total_minutes: totalMinutes, claim });
  } catch (error: any) {
    console.error("Update detention event error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
