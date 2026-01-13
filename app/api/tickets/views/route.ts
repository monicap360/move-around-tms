import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET: List saved views for user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const organizationId = searchParams.get("organization_id");
    const includeShared = searchParams.get("include_shared") === "true";

    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    let query = supabase
      .from("saved_ticket_views")
      .select("*")
      .eq("user_id", userId)
      .order("is_quick_filter", { ascending: false })
      .order("created_at", { ascending: false });

    if (includeShared && organizationId) {
      query = query.or(`user_id.eq.${userId},and(is_shared.eq.true,organization_id.eq.${organizationId})`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching saved views:", error);
      return NextResponse.json(
        { error: "Failed to fetch saved views" },
        { status: 500 }
      );
    }

    return NextResponse.json({ views: data || [] });
  } catch (err: any) {
    console.error("Error in views GET:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create a new saved view
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      organization_id,
      name,
      description,
      is_shared,
      filters,
      quick_filter_type,
    } = body;

    if (!user_id || !name || !filters) {
      return NextResponse.json(
        { error: "user_id, name, and filters are required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("saved_ticket_views")
      .insert({
        user_id,
        organization_id,
        name,
        description,
        is_shared: is_shared || false,
        is_quick_filter: !!quick_filter_type,
        quick_filter_type: quick_filter_type || null,
        filters,
        created_by: user_id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating saved view:", error);
      return NextResponse.json(
        { error: "Failed to create saved view" },
        { status: 500 }
      );
    }

    return NextResponse.json({ view: data });
  } catch (err: any) {
    console.error("Error in views POST:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
