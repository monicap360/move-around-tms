import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { evaluateApprovalWorkflow } from "@/lib/workflows/ticket-approval-rules";

// POST: Evaluate workflow rules for a ticket
export async function POST(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { ticketId } = params;
    const body = await request.json();
    const { execute = false } = body; // If true, actually execute the action

    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Get ticket with all related data
    const { data: ticket, error: ticketError } = await supabase
      .from("aggregate_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Get confidence scores if available
    const { data: confidenceEvents } = await supabase
      .from("data_confidence_events")
      .select("*")
      .eq("entity_type", "ticket")
      .eq("entity_id", ticketId)
      .order("created_at", { ascending: false });

    const confidenceByField: Record<string, any> = {};
    confidenceEvents?.forEach((event: any) => {
      if (
        !confidenceByField[event.field_name] ||
        new Date(event.created_at) >
          new Date(confidenceByField[event.field_name].created_at)
      ) {
        confidenceByField[event.field_name] = {
          score: event.confidence_score,
          reason: event.reason,
        };
      }
    });

    const ticketWithConfidence = {
      ...ticket,
      confidence: confidenceByField,
    };

    // Evaluate workflow rules
    const workflowResult = evaluateApprovalWorkflow(ticketWithConfidence);

    // If execute is true, perform the action
    if (execute && workflowResult.action !== "no_action") {
      if (workflowResult.action === "auto_approve") {
        // Auto-approve the ticket
        const { error: updateError } = await supabase
          .from("aggregate_tickets")
          .update({
            status: "approved",
            updated_at: new Date().toISOString(),
          })
          .eq("id", ticketId);

        if (updateError) {
          console.error("Error auto-approving ticket:", updateError);
          return NextResponse.json(
            { error: "Failed to auto-approve ticket" },
            { status: 500 }
          );
        }

        // Log workflow execution
        await supabase.from("ticket_workflow_executions").insert({
          ticket_id: ticketId,
          action_taken: "auto_approve",
          reason: workflowResult.reason,
          executed_at: new Date().toISOString(),
        });
      }
      // Other actions (require_manager, require_admin, flag_for_review) are handled by UI/notifications
    }

    return NextResponse.json({
      workflow: workflowResult,
      ticket: ticketWithConfidence,
    });
  } catch (err: any) {
    console.error("Error in ticket workflow POST:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Get workflow evaluation for a ticket
export async function GET(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { ticketId } = params;

    const supabase = createSupabaseServerClient();

    // Get ticket
    const { data: ticket } = await supabase
      .from("aggregate_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Get confidence scores
    const { data: confidenceEvents } = await supabase
      .from("data_confidence_events")
      .select("*")
      .eq("entity_type", "ticket")
      .eq("entity_id", ticketId)
      .order("created_at", { ascending: false });

    const confidenceByField: Record<string, any> = {};
    confidenceEvents?.forEach((event: any) => {
      if (
        !confidenceByField[event.field_name] ||
        new Date(event.created_at) >
          new Date(confidenceByField[event.field_name].created_at)
      ) {
        confidenceByField[event.field_name] = {
          score: event.confidence_score,
          reason: event.reason,
        };
      }
    });

    const ticketWithConfidence = {
      ...ticket,
      confidence: confidenceByField,
    };

    // Evaluate workflow
    const workflowResult = evaluateApprovalWorkflow(ticketWithConfidence);

    return NextResponse.json({
      workflow: workflowResult,
    });
  } catch (err: any) {
    console.error("Error in ticket workflow GET:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
