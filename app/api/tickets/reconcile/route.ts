import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

function buildInvoiceNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `RNYX-INV-${stamp}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export async function POST(req: Request) {
  try {
    const supabase = createServerAdmin();
    const body = await req.json();
    const { ticketId, reconciliationData } = body;

    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId is required" },
        { status: 400 },
      );
    }

    // Get the ticket - try aggregate_tickets first, then tickets table
    let ticket: any = null;
    let ticketError: any = null;

    const { data: aggregateTicket, error: aggregateError } = await supabase
      .from("aggregate_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (!aggregateError && aggregateTicket) {
      ticket = aggregateTicket;
    } else {
      // Try tickets table as fallback
      const { data: regularTicket, error: regularError } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", ticketId)
        .single();

      if (!regularError && regularTicket) {
        ticket = regularTicket;
      } else {
        ticketError = regularError || aggregateError;
      }
    }

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 },
      );
    }

    // Update ticket with reconciliation data
    const updateData: any = {
      reconciled: true,
      reconciled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Map reconciliation data fields with type conversion
    if (reconciliationData?.gross !== undefined) updateData.recon_gross = Number(reconciliationData.gross);
    if (reconciliationData?.tare !== undefined) updateData.recon_tare = Number(reconciliationData.tare);
    if (reconciliationData?.net !== undefined) updateData.recon_net = Number(reconciliationData.net);
    if (reconciliationData?.material) updateData.recon_material = reconciliationData.material;
    if (reconciliationData?.plant) updateData.recon_plant = reconciliationData.plant;
    if (reconciliationData?.matched_by) updateData.recon_matched_by = reconciliationData.matched_by;
    if (reconciliationData?.status) updateData.recon_status = reconciliationData.status;

    if (reconciliationData?.action === "approve_for_billing") {
      updateData.status = "approved";
      updateData.payment_status = ticket.payment_status || "unpaid";
      updateData.recon_status = "approved_queue";
    }

    if (reconciliationData?.action === "use_plan_value" && reconciliationData?.plan_values) {
      const plan = reconciliationData.plan_values;
      if (plan.quantity !== undefined) updateData.quantity = Number(plan.quantity);
      if (plan.material) updateData.material = plan.material;
      if (plan.unit_type) updateData.unit_type = plan.unit_type;
    }

    if (reconciliationData?.action === "use_ticket_value" && reconciliationData?.ticket_values) {
      const tv = reconciliationData.ticket_values;
      if (tv.quantity !== undefined) updateData.quantity = Number(tv.quantity);
      if (tv.material) updateData.material = tv.material;
      if (tv.unit_type) updateData.unit_type = tv.unit_type;
    }

    if (reconciliationData?.set_fields) {
      Object.assign(updateData, reconciliationData.set_fields);
    }

    // Calculate net if not provided but gross and tare are
    if (updateData.recon_net === undefined && updateData.recon_gross !== undefined && updateData.recon_tare !== undefined) {
      updateData.recon_net = Number(updateData.recon_gross) - Number(updateData.recon_tare);
    }

    const updatedFields = Object.keys(updateData).filter(
      (field) => updateData[field] !== undefined && String(updateData[field] ?? "") !== String(ticket?.[field] ?? ""),
    );

    // Try to update in aggregate_tickets first, then tickets table
    let updateError: any = null;
    const { error: aggregateUpdateError } = await supabase
      .from("aggregate_tickets")
      .update(updateData)
      .eq("id", ticketId);

    if (aggregateUpdateError) {
      // Try tickets table as fallback
      const { error: regularUpdateError } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("id", ticketId);

      if (regularUpdateError) {
        updateError = regularUpdateError;
      }
    }

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to update ticket" },
        { status: 500 },
      );
    }

    if (updatedFields.length > 0) {
      const auditRows = updatedFields.map((field) => ({
        ticket_id: ticketId,
        action: reconciliationData?.action || "reconciled",
        field_name: field,
        old_value: ticket?.[field] !== undefined ? String(ticket?.[field]) : null,
        new_value: updateData?.[field] !== undefined ? String(updateData?.[field]) : null,
        description: `Reconciliation updated ${field}`,
        metadata: {
          matched_by: reconciliationData?.matched_by || null,
          recon_status: updateData?.recon_status || null,
          action: reconciliationData?.action || null,
        },
      }));
      await supabase.from("ticket_audit_log").insert(auditRows);
    }

    if (reconciliationData?.action === "approve_for_billing" && reconciliationData?.auto_invoice) {
      const invoiceNumber = buildInvoiceNumber();
      const total = Number(updateData.quantity ?? ticket.quantity ?? 0) * Number(ticket.bill_rate ?? 0);
      const { data: invoice, error: invoiceError } = await supabase
        .from("ronyx_invoices")
        .insert({
          invoice_number: invoiceNumber,
          customer_name: ticket.customer_name,
          status: "open",
          issued_date: new Date().toISOString().slice(0, 10),
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          total_amount: total,
          ticket_ids: [ticketId],
          payment_status: "unpaid",
          accounting_status: "not_exported",
        })
        .select("*")
        .single();

      if (invoiceError) {
        return NextResponse.json({ error: invoiceError.message }, { status: 500 });
      }

      await supabase
        .from("aggregate_tickets")
        .update({ status: "invoiced", invoice_number: invoice.invoice_number })
        .eq("id", ticketId);
    }

    return NextResponse.json({
      success: true,
      ticketId,
      reconciled: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Reconciliation failed" },
      { status: 500 },
    );
  }
}
