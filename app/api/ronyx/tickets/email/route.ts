import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { ticket_id, ticket_ids, to, subject, message, include_pdf } = body;

  const ids: string[] = ticket_ids ?? (ticket_id ? [ticket_id] : []);
  if (ids.length === 0) {
    return NextResponse.json({ error: "ticket_id or ticket_ids required" }, { status: 400 });
  }
  if (!to) {
    return NextResponse.json({ error: "to (email address) required" }, { status: 400 });
  }

  const supabase = supabaseAdmin;

  // Fetch ticket data for the email
  const { data: tickets, error } = await supabase
    .from("aggregate_tickets")
    .select("id, ticket_number, driver_name, truck_number, customer_name, job_name, ticket_date, total_tons, billing_amount")
    .in("id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log the email action in audit_logs (fire-and-forget)
  supabase.from("audit_logs").insert({
    entity_type:       "ticket",
    entity_id:         ids[0],
    entity_name:       `Ticket(s): ${ids.join(", ")}`,
    action:            "email_sent",
    performed_by_name: "System",
    notes:             `Emailed to: ${to}`,
    metadata:          { to, subject, ticket_count: ids.length, include_pdf },
  }).then(null, () => {});

  // In production, integrate with SendGrid / Resend / SMTP here.
  // For now, return success with the ticket data that would be emailed.
  return NextResponse.json({
    success:      true,
    sent_to:      to,
    ticket_count: ids.length,
    tickets:      tickets ?? [],
    note:         "Email integration pending — connect SendGrid or Resend in production.",
  });
}
