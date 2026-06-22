import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = supabaseAdmin;
  const { data, error } = await supabase
    .from("pit_invoices")
    .select("*")
    .order("invoice_date", { ascending: false })
    .limit(200);

  if (error) {
    if (error.message.includes("relation") || error.message.includes("does not exist")) {
      return NextResponse.json({ invoices: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ invoices: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = supabaseAdmin;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { data, error } = await supabase
    .from("pit_invoices")
    .insert({
      vendor_name:    body.vendor_name    || null,
      invoice_number: body.invoice_number || null,
      invoice_date:   body.invoice_date   || new Date().toISOString().slice(0, 10),
      total_tons:     body.total_tons     ? Number(body.total_tons)   : null,
      total_amount:   body.total_amount   ? Number(body.total_amount) : null,
      pit_location:   body.pit_location   || null,
      material:       body.material       || null,
      po_number:      body.po_number      || null,
      file_url:       body.file_url       || null,
      status:         body.status         || "pending",
      notes:          body.notes          || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoice: data }, { status: 201 });
}
