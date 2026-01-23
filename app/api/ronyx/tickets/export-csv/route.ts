import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function parseUploadSource(notes?: string | null) {
  if (!notes) return "Office";
  const match = notes.match(/source:\s*([a-z\s]+)/i);
  return match ? match[1].trim() : "Office";
}

export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "start and end are required" }, { status: 400 });
  }

  const { data: tickets, error } = await supabase
    .from("aggregate_tickets")
    .select(
      "ticket_number,ticket_date,driver_name,driver_id,material,quantity,unit_type,gross_weight,tare_weight,net_weight,bill_rate,customer_name,delivery_location,status,ticket_notes",
    )
    .gte("ticket_date", start)
    .lte("ticket_date", end)
    .order("ticket_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (tickets || []).map((ticket) => ({
    ticket_number: ticket.ticket_number || "",
    ticket_date: ticket.ticket_date || "",
    driver_name: ticket.driver_name || "",
    driver_id: ticket.driver_id || "",
    upload_source: parseUploadSource(ticket.ticket_notes),
    material: ticket.material || "",
    quantity: ticket.quantity ?? "",
    unit_type: ticket.unit_type || "",
    gross_weight: ticket.gross_weight ?? "",
    tare_weight: ticket.tare_weight ?? "",
    net_weight: ticket.net_weight ?? "",
    bill_rate: ticket.bill_rate ?? "",
    customer_name: ticket.customer_name || "",
    delivery_location: ticket.delivery_location || "",
    status: ticket.status || "",
  }));

  const csv = Papa.unparse(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ronyx-tickets-${start}-to-${end}.csv"`,
    },
  });
}
