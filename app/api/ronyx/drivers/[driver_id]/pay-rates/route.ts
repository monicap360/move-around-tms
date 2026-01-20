import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export async function GET(
  _req: Request,
  { params }: { params: { driver_id: string } },
) {
  const driverId = params.driver_id;
  const { data, error } = await supabaseAdmin
    .from("driver_pay_rates")
    .select("*")
    .eq("driver_id", driverId)
    .order("effective_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rates: data || [] });
}

export async function POST(
  req: Request,
  { params }: { params: { driver_id: string } },
) {
  const driverId = params.driver_id;
  const body = await req.json();

  if (!body?.rate_name || !body?.rate_type || !body?.rate_value) {
    return NextResponse.json(
      { error: "rate_name, rate_type, and rate_value are required" },
      { status: 400 },
    );
  }

  if (body.is_default) {
    await supabaseAdmin
      .from("driver_pay_rates")
      .update({ is_default: false })
      .eq("driver_id", driverId);
  }

  const { data, error } = await supabaseAdmin
    .from("driver_pay_rates")
    .insert({
      driver_id: driverId,
      rate_name: body.rate_name,
      rate_type: body.rate_type,
      rate_value: body.rate_value,
      material_type: body.material_type || null,
      customer_id: body.customer_id || null,
      job_id: body.job_id || null,
      equipment_type: body.equipment_type || null,
      is_default: Boolean(body.is_default),
      effective_date: body.effective_date,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rate: data });
}
