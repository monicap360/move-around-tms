import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/* ── POST /api/ronyx/owner-operators/[id]/drivers ── add driver to OO */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const sb = createSupabaseServerClient();
  const body = await req.json();

  const { data, error } = await sb
    .from("ronyx_oo_drivers")
    .insert({
      oo_id:               params.id,
      name:                body.name,
      phone:               body.phone               || null,
      cdl_number:          body.cdl_number          || null,
      cdl_state:           body.cdl_state           || "TX",
      cdl_expiration:      body.cdl_expiration      || null,
      med_card_expiration: body.med_card_expiration || null,
      med_card_number:     body.med_card_number     || null,
      truck_number:        body.truck_number        || null,
      job_assignment:      body.job_assignment      || null,
      notes:               body.notes               || null,
      status:              body.status              || "active",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ driver: data });
}

/* ── PUT /api/ronyx/owner-operators/[id]/drivers ── bulk upsert (import) */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const sb = createSupabaseServerClient();
  const { drivers } = await req.json();

  if (!Array.isArray(drivers)) return NextResponse.json({ error: "drivers must be an array" }, { status: 400 });

  const rows = drivers.map((d: Record<string, string>) => ({
    oo_id:               params.id,
    name:                d.name,
    phone:               d.phone               || null,
    cdl_number:          d.cdl_number          || null,
    cdl_state:           d.cdl_state           || "TX",
    cdl_expiration:      d.cdl_expiration      || null,
    med_card_expiration: d.med_card_expiration || null,
    med_card_number:     d.med_card_number     || null,
    truck_number:        d.truck_number        || null,
    job_assignment:      d.job_assignment      || null,
    notes:               d.notes               || null,
    status:              "active",
  }));

  const { data, error } = await sb.from("ronyx_oo_drivers").insert(rows).select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drivers: data, count: data?.length || 0 });
}
