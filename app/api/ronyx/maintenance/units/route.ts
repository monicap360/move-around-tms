import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("maintenance_units")
    .select("*")
    .order("unit_number", { ascending: true });

  if (error) return NextResponse.json({ units: [], error: error.message });
  return NextResponse.json({ units: data || [] });
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("maintenance_units")
    .insert({
      unit_number:               body.unit_number,
      unit_type:                 body.unit_type || "Truck",
      vin:                       body.vin || null,
      plate:                     body.plate || null,
      assigned_driver_id:        body.assigned_driver_id || null,
      odometer:                  body.odometer || 0,
      last_service_date:         body.last_service_date || null,
      next_service_date:         body.next_service_date || null,
      next_service_miles:        body.next_service_miles || 0,
      registration_expires:      body.registration_expires || null,
      insurance_expires:         body.insurance_expires || null,
      annual_inspection_expires: body.annual_inspection_expires || null,
      status:                    body.status || "Ready",
      dispatch_eligible:         body.dispatch_eligible ?? true,
      notes:                     body.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ unit: data }, { status: 201 });
}
