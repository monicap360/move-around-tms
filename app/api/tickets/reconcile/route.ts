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

    // Calculate net if not provided but gross and tare are
    if (updateData.recon_net === undefined && updateData.recon_gross !== undefined && updateData.recon_tare !== undefined) {
      updateData.recon_net = Number(updateData.recon_gross) - Number(updateData.recon_tare);
    }

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
