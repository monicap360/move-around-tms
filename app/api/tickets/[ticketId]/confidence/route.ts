import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET: Get confidence scores for a ticket
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

    // Get latest confidence events for this ticket
    const { data: confidenceEvents, error } = await supabase
      .from("data_confidence_events")
      .select("*")
      .eq("entity_type", "ticket")
      .eq("entity_id", ticketId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching confidence events:", error);
      return NextResponse.json(
        { error: "Failed to fetch confidence events" },
        { status: 500 }
      );
    }

    // Group by field_name and get latest for each
    const confidenceByField: Record<string, any> = {};
    confidenceEvents?.forEach((event: any) => {
      if (!confidenceByField[event.field_name] || 
          new Date(event.created_at) > new Date(confidenceByField[event.field_name].created_at)) {
        confidenceByField[event.field_name] = event;
      }
    });

    return NextResponse.json({ confidence: confidenceByField });
  } catch (err: any) {
    console.error("Error in ticket confidence GET:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
