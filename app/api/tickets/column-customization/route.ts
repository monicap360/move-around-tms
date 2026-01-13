import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET: Get column customization for user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const viewName = searchParams.get("view_name") || "default";

    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("ticket_view_customizations")
      .select("*")
      .eq("user_id", userId)
      .eq("view_name", viewName)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found, which is OK (use defaults)
      console.error("Error fetching column customization:", error);
      return NextResponse.json(
        { error: "Failed to fetch customization" },
        { status: 500 }
      );
    }

    return NextResponse.json({ customization: data || null });
  } catch (err: any) {
    console.error("Error in column customization GET:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Save column customization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, view_name = "default", visible_columns, column_widths } = body;

    if (!user_id || !visible_columns) {
      return NextResponse.json(
        { error: "user_id and visible_columns are required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("ticket_view_customizations")
      .upsert(
        {
          user_id,
          view_name,
          visible_columns,
          column_widths: column_widths || {},
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,view_name",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error saving column customization:", error);
      return NextResponse.json(
        { error: "Failed to save customization" },
        { status: 500 }
      );
    }

    return NextResponse.json({ customization: data });
  } catch (err: any) {
    console.error("Error in column customization POST:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
