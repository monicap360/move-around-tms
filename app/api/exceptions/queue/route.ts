import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET: Get exception queue
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "5");
    const status = searchParams.get("status") || "open";
    const severity = searchParams.get("severity");

    const supabase = createSupabaseServerClient();

    let query = supabase
      .from("exception_queue")
      .select("*")
      .eq("status", status)
      .order("priority_rank", { ascending: false })
      .limit(limit);

    if (severity) {
      query = query.eq("severity", severity);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching exception queue:", error);
      return NextResponse.json(
        { error: "Failed to fetch exception queue" },
        { status: 500 }
      );
    }

    return NextResponse.json({ exceptions: data || [] });
  } catch (err: any) {
    console.error("Error in exception queue GET:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Resolve exception
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { exception_id, action, resolution_notes, user_id } = body;

    if (!exception_id || !action) {
      return NextResponse.json(
        { error: "exception_id and action are required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (action === "resolve") {
      updateData.status = "resolved";
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = user_id || null;
      updateData.resolution_notes = resolution_notes || null;
    } else if (action === "dismiss") {
      updateData.status = "dismissed";
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = user_id || null;
      updateData.resolution_notes = resolution_notes || "Dismissed";
    } else if (action === "assign") {
      updateData.status = "in_review";
      updateData.assigned_to = user_id;
    }

    const { data, error } = await supabase
      .from("exception_queue")
      .update(updateData)
      .eq("id", exception_id)
      .select()
      .single();

    if (error) {
      console.error("Error resolving exception:", error);
      return NextResponse.json(
        { error: "Failed to resolve exception" },
        { status: 500 }
      );
    }

    return NextResponse.json({ exception: data });
  } catch (err: any) {
    console.error("Error in exception queue POST:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
