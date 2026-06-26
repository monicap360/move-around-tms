import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sb = supabaseAdmin;
  const body = await req.json();

  if (!body.truck_number || !String(body.truck_number).trim()) {
    return NextResponse.json({ error: "Truck number is required" }, { status: 400 });
  }

  // Upsert on (oo_id, truck_number) so re-adding the same number updates the truck
  // instead of throwing "duplicate key violation" (unique index enforces one number
  // per company). Makes the Add Truck button idempotent.
  const { data, error } = await sb
    .from("ronyx_oo_trucks")
    .upsert(
      {
        oo_id:             params.id,
        truck_number:      String(body.truck_number).trim(),
        year:              body.year              || null,
        make:              body.make              || null,
        model:             body.model             || null,
        vin:               body.vin               || null,
        last_inspection:   body.last_inspection   || null,
        inspection_result: body.inspection_result || null,
        status:            body.status            || "active",
      },
      { onConflict: "oo_id,truck_number" },
    )
    .select("*")
    .single();

  if (error) {
    const friendly = /duplicate key|unique/i.test(error.message)
      ? `A truck numbered "${body.truck_number}" already exists for this company.`
      : error.message;
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
  return NextResponse.json({ truck: data });
}
