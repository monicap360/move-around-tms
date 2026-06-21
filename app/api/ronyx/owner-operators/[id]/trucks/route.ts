import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const sb = supabaseAdmin;
  const body = await req.json();

  const { data, error } = await sb
    .from("ronyx_oo_trucks")
    .insert({
      oo_id:             params.id,
      truck_number:      body.truck_number,
      year:              body.year              || null,
      make:              body.make              || null,
      model:             body.model             || null,
      vin:               body.vin               || null,
      last_inspection:   body.last_inspection   || null,
      inspection_result: body.inspection_result || null,
      status:            body.status            || "active",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ truck: data });
}
