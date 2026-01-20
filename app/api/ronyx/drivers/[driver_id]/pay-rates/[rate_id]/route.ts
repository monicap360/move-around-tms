import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export async function PUT(
  req: Request,
  { params }: { params: { driver_id: string; rate_id: string } },
) {
  const body = await req.json();
  const { driver_id, rate_id } = params;

  if (body.is_default) {
    await supabaseAdmin
      .from("driver_pay_rates")
      .update({ is_default: false })
      .eq("driver_id", driver_id);
  }

  const { data, error } = await supabaseAdmin
    .from("driver_pay_rates")
    .update({
      ...body,
      is_default: body.is_default ?? undefined,
    })
    .eq("id", rate_id)
    .eq("driver_id", driver_id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rate: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { driver_id: string; rate_id: string } },
) {
  const { driver_id, rate_id } = params;
  const { error } = await supabaseAdmin
    .from("driver_pay_rates")
    .delete()
    .eq("id", rate_id)
    .eq("driver_id", driver_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
