import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// POST: Perform bulk operations on tickets
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ticket_ids } = body;

    if (!action || !ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
      return NextResponse.json(
        { error: "action and ticket_ids array are required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    let result;
    let updatedStatus: string | null = null;

    switch (action) {
      case "approve":
        updatedStatus = "approved";
        break;
      case "reject":
      case "cancel":
        updatedStatus = "cancelled";
        break;
      case "invoice":
        updatedStatus = "invoiced";
        break;
      case "mark_paid":
        updatedStatus = "paid";
        break;
      case "status_update":
        updatedStatus = body.new_status;
        if (!updatedStatus) {
          return NextResponse.json(
            { error: "new_status is required for status_update action" },
            { status: 400 }
          );
        }
        break;
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    if (updatedStatus) {
      // Validate: Get current ticket states to prevent invalid transitions
      const { data: currentTickets, error: fetchError } = await supabase
        .from("aggregate_tickets")
        .select("id, status")
        .in("id", ticket_ids);

      if (fetchError) {
        console.error("Error fetching tickets:", fetchError);
        return NextResponse.json(
          { error: "Failed to fetch tickets for validation" },
          { status: 500 }
        );
      }

      // Business logic: Prevent invalid state transitions
      const invalidTransitions: string[] = [];
      currentTickets?.forEach((ticket: any) => {
        // Can't approve already-approved tickets
        if (updatedStatus === "approved" && ticket.status === "approved") {
          invalidTransitions.push(ticket.id);
        }
        // Can't cancel already-cancelled tickets
        if (updatedStatus === "cancelled" && ticket.status === "cancelled") {
          invalidTransitions.push(ticket.id);
        }
        // Can't invoice already-invoiced tickets (unless going to paid)
        if (updatedStatus === "invoiced" && ticket.status === "invoiced" && updatedStatus !== "paid") {
          invalidTransitions.push(ticket.id);
        }
        // Can't pay already-paid tickets
        if (updatedStatus === "paid" && ticket.status === "paid") {
          invalidTransitions.push(ticket.id);
        }
      });

      // Filter out invalid transitions
      const validTicketIds = ticket_ids.filter(
        (id: string) => !invalidTransitions.includes(id)
      );

      if (validTicketIds.length === 0) {
        return NextResponse.json(
          { error: "No valid tickets to update. All tickets are already in the target state." },
          { status: 400 }
        );
      }

      // Update valid tickets
      const { data, error } = await supabase
        .from("aggregate_tickets")
        .update({ 
          status: updatedStatus,
          updated_at: new Date().toISOString(),
        })
        .in("id", validTicketIds)
        .select();

      if (error) {
        console.error("Error updating tickets:", error);
        return NextResponse.json(
          { error: "Failed to update tickets" },
          { status: 500 }
        );
      }

      // Log bulk operation to audit trail
      if (data && data.length > 0) {
        const auditLogs = data.map((ticket: any) => ({
          ticket_id: ticket.id,
          user_id: body.user_id || null,
          action: `bulk_${action}`,
          field_name: "status",
          old_value: currentTickets?.find((t: any) => t.id === ticket.id)?.status || "",
          new_value: updatedStatus,
          description: `Bulk ${action} operation`,
          metadata: {
            bulk_operation: true,
            total_tickets: ticket_ids.length,
            valid_tickets: validTicketIds.length,
            invalid_tickets: invalidTransitions.length,
          },
        }));

        // Insert audit logs (non-blocking)
        supabase.from("ticket_audit_log").insert(auditLogs).then(({ error: auditError }) => {
          if (auditError) {
            console.error("Error logging bulk operation:", auditError);
          }
        });
      }

      result = { 
        updated_count: data?.length || 0, 
        tickets: data,
        skipped_count: invalidTransitions.length,
        skipped_ids: invalidTransitions,
      };
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error in bulk operations POST:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Bulk export tickets to CSV
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticket_ids, format = "csv" } = body;

    if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
      return NextResponse.json(
        { error: "ticket_ids array is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data: tickets, error } = await supabase
      .from("aggregate_tickets")
      .select("*")
      .in("id", ticket_ids);

    if (error) {
      console.error("Error fetching tickets:", error);
      return NextResponse.json(
        { error: "Failed to fetch tickets" },
        { status: 500 }
      );
    }

    if (format === "csv") {
      // Generate CSV
      const headers = [
        "Ticket Number",
        "Driver",
        "Customer",
        "Material",
        "Quantity",
        "Rate",
        "Total Amount",
        "Status",
        "Date",
      ];

      const rows = (tickets || []).map((ticket: any) => [
        ticket.ticket_number || "",
        ticket.driver_name || "",
        ticket.customer_name || "",
        ticket.material_type || ticket.material || "",
        ticket.quantity || 0,
        ticket.rate || 0,
        ticket.total_amount || 0,
        ticket.status || "",
        ticket.ticket_date || ticket.created_at || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      return NextResponse.json({
        format: "csv",
        content: csvContent,
        filename: `tickets_export_${new Date().toISOString().split("T")[0]}.csv`,
      });
    }

    return NextResponse.json({ tickets });
  } catch (err: any) {
    console.error("Error in bulk export:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
