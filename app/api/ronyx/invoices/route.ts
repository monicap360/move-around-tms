import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateInvoiceFromTickets } from "@/lib/ronyx/phase1/invoiceEngine";

function buildInvoiceNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `RNYX-INV-${stamp}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");
  const customerId = searchParams.get("customer_id");
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "User organization not found" }, { status: 400 });
  }

  let invoicesQuery = supabase
    .from("ronyx_invoices")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  if (projectId) {
    invoicesQuery = invoicesQuery.eq("project_id", projectId);
  }
  if (customerId) {
    invoicesQuery = invoicesQuery.eq("customer_id", customerId);
  }

  const { data, error } = await invoicesQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invoices: data || [] });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const action = payload?.action;
  const projectId = payload?.project_id;
  const customerId = payload?.customer_id;
  const supabase = createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "User organization not found" }, { status: 400 });
  }

  if (action === "generate_from_tickets") {
    let ticketsQuery = supabase
      .from("aggregate_tickets")
      .select(
        "id, customer_name, quantity, bill_rate, status, payment_status, material, ticket_number, unit_type",
      )
      .eq("organization_id", profile.organization_id)
      .eq("status", "approved")
      .neq("payment_status", "paid");

    if (projectId) {
      ticketsQuery = ticketsQuery.eq("project_id", projectId);
    }
    if (customerId) {
      ticketsQuery = ticketsQuery.eq("customer_id", customerId);
    }

    const { data: tickets, error: ticketsError } = await ticketsQuery;

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
          organization_id: profile.organization_id,
        })
        .select("*")
        .single();

      if (invoiceError) {
        return NextResponse.json({ error: invoiceError.message }, { status: 500 });
      }

      const itemRows = items.map((ticket) => {
        const qty = Number(ticket.quantity || 0);
        const rate = Number(ticket.bill_rate || 0);
        return {
          invoice_id: invoice.id,
          ticket_id: ticket.id,
          description: `${ticket.material || "Material"} ticket ${ticket.ticket_number || ticket.id}`,
          quantity: qty,
          unit: ticket.unit_type || "Load",
          unit_price: rate,
          total_amount: qty * rate,
        };
      });

      const { error: itemError } = await supabase
        .from("ronyx_invoice_items")
        .insert(itemRows);

      if (itemError) {
        return NextResponse.json({ error: itemError.message }, { status: 500 });
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

  if (action === "generate_phase1_invoice") {
    const ticketIds = payload?.ticket_ids as string[] | undefined;
    if (!ticketIds || ticketIds.length === 0) {
      return NextResponse.json({ error: "ticket_ids required" }, { status: 400 });
    }
    try {
      const invoice = await generateInvoiceFromTickets(ticketIds);
      return NextResponse.json({ invoice });
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || "Invoice generation failed" },
        { status: 500 },
      );
    }
  }

  const { data, error } = await supabase
    .from("ronyx_invoices")
    .insert({ ...payload, organization_id: profile.organization_id })
    .select("*")
    .single();
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
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "User organization not found" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ronyx_invoices")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invoice: data });
}
