import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET: Get a specific saved view
export async function GET(
  request: NextRequest,
  { params }: { params: { viewId: string } }
) {
  try {
    const { viewId } = params;

    if (!viewId) {
      return NextResponse.json(
        { error: "viewId is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("saved_ticket_views")
      .select("*")
      .eq("id", viewId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "View not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ view: data });
  } catch (err: any) {
    console.error("Error in view GET:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update a saved view
export async function PUT(
  request: NextRequest,
  { params }: { params: { viewId: string } }
) {
  try {
    const { viewId } = params;
    const body = await request.json();

    const { name, description, is_shared, filters } = body;

    if (!viewId) {
      return NextResponse.json(
        { error: "viewId is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (is_shared !== undefined) updateData.is_shared = is_shared;
    if (filters !== undefined) updateData.filters = filters;

    const { data, error } = await supabase
      .from("saved_ticket_views")
      .update(updateData)
      .eq("id", viewId)
      .select()
      .single();

    if (error) {
      console.error("Error updating saved view:", error);
      return NextResponse.json(
        { error: "Failed to update saved view" },
        { status: 500 }
      );
    }

    return NextResponse.json({ view: data });
  } catch (err: any) {
    console.error("Error in view PUT:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a saved view
export async function DELETE(
  request: NextRequest,
  { params }: { params: { viewId: string } }
) {
  try {
    const { viewId } = params;

    if (!viewId) {
      return NextResponse.json(
        { error: "viewId is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { error } = await supabase
      .from("saved_ticket_views")
      .delete()
      .eq("id", viewId);

    if (error) {
      console.error("Error deleting saved view:", error);
      return NextResponse.json(
        { error: "Failed to delete saved view" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error in view DELETE:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
