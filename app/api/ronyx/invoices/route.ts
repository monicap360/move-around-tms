import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function buildInvoiceNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `RNYX-INV-${stamp}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("ronyx_invoices").select("*").order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invoices: data || [] });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const action = payload?.action;
  const supabase = createSupabaseServerClient();

  if (action === "generate_from_tickets") {
    const { data: tickets, error: ticketsError } = await supabase
      .from("aggregate_tickets")
      .select("id, customer_name, quantity, bill_rate, status, payment_status")
      .eq("status", "approved")
      .neq("payment_status", "paid");

    if (ticketsError) {
      return NextResponse.json({ error: ticketsError.message }, { status: 500 });
    }

    const grouped = (tickets || []).reduce<Record<string, typeof tickets>>((acc, ticket) => {
      const key = ticket.customer_name || "Unassigned Customer";
      acc[key] = acc[key] || [];
      acc[key].push(ticket);
      return acc;
    }, {});

    const created = [];
    for (const [customer, items] of Object.entries(grouped)) {
      const total = items.reduce((sum, t) => {
        const qty = Number(t.quantity || 0);
        const rate = Number(t.bill_rate || 0);
        return sum + qty * rate;
      }, 0);
      const invoiceNumber = buildInvoiceNumber();
      const { data: invoice, error: invoiceError } = await supabase
        .from("ronyx_invoices")
        .insert({
          invoice_number: invoiceNumber,
          customer_name: customer,
          status: "open",
          payment_status: "unpaid",
          accounting_status: "not_exported",
          issued_date: new Date().toISOString().slice(0, 10),
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          total_amount: total,
          ticket_ids: items.map((t) => t.id),
        })
        .select("*")
        .single();

      if (invoiceError) {
        return NextResponse.json({ error: invoiceError.message }, { status: 500 });
      }

      await supabase
        .from("aggregate_tickets")
        .update({ status: "invoiced", invoice_number: invoiceNumber })
        .in(
          "id",
          items.map((t) => t.id),
        );

      created.push(invoice);
    }

    return NextResponse.json({ invoices: created });
  }

  const { data, error } = await supabase.from("ronyx_invoices").insert(payload).select("*").single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invoice: data });
}

export async function PUT(request: Request) {
  const payload = await request.json();
  const { id, ...updates } = payload || {};

  if (!id) {
    return NextResponse.json({ error: "Missing invoice id" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ronyx_invoices")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invoice: data });
}
