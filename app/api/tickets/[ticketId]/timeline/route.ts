import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET: Get ticket timeline/audit log
export async function GET(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { ticketId } = params;

    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Get ticket basic info
    const { data: ticket } = await supabase
      .from("aggregate_tickets")
      .select("created_at, updated_at, status")
      .eq("id", ticketId)
      .single();

    // Get audit log entries
    const { data: auditLogs } = await supabase
      .from("ticket_audit_log")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    // Build timeline from audit log and ticket data
    const timeline = [];

    // Add creation event
    if (ticket) {
      timeline.push({
        id: "created",
        status: "created",
        timestamp: ticket.created_at,
        description: "Ticket created",
        type: "creation",
        user: null,
      });
    }

    // Add audit log events
    if (auditLogs) {
      auditLogs.forEach((log: any) => {
        timeline.push({
          id: log.id,
          status: log.action,
          timestamp: log.created_at,
          description: log.description || log.action,
          type: "status_change",
          user: log.user_id,
        });
      });
    }

    // Add current status if different from created
    if (ticket && ticket.updated_at !== ticket.created_at) {
      timeline.push({
        id: "current",
        status: ticket.status,
        timestamp: ticket.updated_at,
        description: `Ticket ${ticket.status}`,
        type: "status_change",
        user: null,
      });
    }

    return NextResponse.json({ timeline });
  } catch (err: any) {
    console.error("Error in ticket timeline GET:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
